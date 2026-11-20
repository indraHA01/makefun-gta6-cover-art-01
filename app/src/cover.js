// Vice City Nights — cover renderer. Draws the multi-panel poster onto any
// 2D canvas: photos in comic panels, a gradient sky band with a retro sun and
// procedural palm silhouettes, and bold outlined caption lettering. No assets
// are fetched here; everything is drawn in code from the state passed in.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUTS = ['trio', 'quad', 'bleed'];
export const LOOKS = ['sunset', 'neon', 'vicepink'];

/** How many panels each layout shows. */
export function panelCount(layout) {
  if (layout === 'quad') return 4;
  if (layout === 'bleed') return 1;
  return 3;
}

/** Colour grades: sky stops, sun colours, caption ink and glow per look. */
export const LOOK_DEFS = {
  sunset: {
    sky: ['#2b1055', '#7597de'],
    band: ['#ff9a3d', '#ff5e62', '#c81d7a'],
    sun: ['#ffe259', '#ff7e2e'],
    title: '#ffffff',
    titleOutline: '#1c0b2e',
    titleShadow: '#ff2e88',
    subtitle: '#ffd166',
    frame: '#ffffff',
    empty: ['#3b1d5e', '#8a2f6d'],
  },
  neon: {
    sky: ['#04122b', '#0b3d5c'],
    band: ['#0affef', '#2de2c5', '#ff2e88'],
    sun: ['#a7fff4', '#ff2e88'],
    title: '#eafffb',
    titleOutline: '#031018',
    titleShadow: '#0affef',
    subtitle: '#ff9ad5',
    frame: '#eafffb',
    empty: ['#062a3a', '#123a5c'],
  },
  vicepink: {
    sky: ['#2a0a3d', '#6d1e6e'],
    band: ['#ff7ac8', '#ff2e88', '#7b2ff7'],
    sun: ['#ffe3f2', '#ff5eb0'],
    title: '#ffffff',
    titleOutline: '#2a0a3d',
    titleShadow: '#ff7ac8',
    subtitle: '#ffe259',
    frame: '#ffffff',
    empty: ['#4a1160', '#8a2f8a'],
  },
};

/** Panel rectangles for a layout, in canvas pixels. The caption band is the bottom strip. */
export function panelRects(layout, w, h) {
  const g = Math.max(6, Math.round(w * 0.012));
  const bandH = Math.round(h * 0.24);
  const top = g;
  const bottom = h - bandH;
  const innerW = w - g * 2;
  const innerH = bottom - top;
  if (layout === 'bleed') return [{ x: 0, y: 0, w, h }];
  if (layout === 'quad') {
    const pw = (innerW - g) / 2;
    const ph = (innerH - g) / 2;
    return [
      { x: g, y: top, w: pw, h: ph },
      { x: g + pw + g, y: top, w: pw, h: ph },
      { x: g, y: top + ph + g, w: pw, h: ph },
      { x: g + pw + g, y: top + ph + g, w: pw, h: ph },
    ];
  }
  // trio: one tall hero panel, two stacked on the right.
  const heroW = innerW * 0.56;
  const rightX = g + heroW + g;
  const rightW = w - g - rightX;
  const halfH = (innerH - g) / 2;
  return [
    { x: g, y: top, w: heroW, h: innerH },
    { x: rightX, y: top, w: rightW, h: halfH },
    { x: rightX, y: top + halfH + g, w: rightW, h: halfH },
  ];
}

/** A tiny deterministic PRNG so the grain is identical on every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The retro sun: horizontal slices of a disc, gaps widening toward the bottom. */
export function drawRetroSun(ctx, cx, cy, r, topColor, bottomColor) {
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  const rows = 26;
  const step = (r * 2) / rows;
  for (let i = 0; i < rows; i++) {
    const y = cy - r + i * step;
    const dy = (y + step / 2 - cy) / r;
    if (Math.abs(dy) > 1) continue;
    const half = Math.sqrt(1 - dy * dy) * r;
    // Skip a widening gap on the lower half for the slit look.
    if (dy > 0.05 && i % 2 === 0 && dy > 0.15 + (i / rows) * 0.35) continue;
    ctx.fillRect(cx - half, y, half * 2, step * 0.92);
  }
}

/** One palm silhouette: a leaning trunk and drooping fronds, all in one colour. */
export function drawPalm(ctx, x, y, s, lean, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  const topX = x + lean * s;
  const topY = y - s;
  ctx.lineWidth = Math.max(2, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.4, y - s * 0.55, topX, topY);
  ctx.stroke();
  // Fronds fan out from the crown and droop.
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84);
    const len = s * (0.42 + 0.1 * Math.sin(i * 2.3));
    const fx = topX + Math.cos(a) * len;
    const fy = topY - Math.sin(a) * len * 0.55 + len * 0.42;
    ctx.lineWidth = Math.max(1.5, s * 0.028);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.6, topY - Math.sin(a) * len * 0.7, fx, fy);
    ctx.stroke();
  }
  ctx.restore();
}

/** A vertical gradient fill over a rectangle. */
function fillGradient(ctx, rect, stops) {
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  stops.forEach((c, i) => grad.addColorStop(i / Math.max(1, stops.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Default pan offsets for a freshly placed photo: when the photo is much
 *  taller than its panel, centre the visible window on the photo's top
 *  quarter (where faces usually are) instead of cropping dead-centre. */
export function defaultOffsets(img, rect) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const ph = img.naturalHeight * base;
  if (ph <= rect.h * 1.15) return { ox: 0, oy: 0 };
  // Window centre in photo fractions is 0.5 - oy * rect.h / ph; aim for 0.25.
  const oy = Math.min(0.85, (0.5 - 0.25) * (ph / rect.h));
  return { ox: 0, oy };
}

/** Draws one panel: the photo cover-fitted with pan/zoom, or a sky fallback. */
export function drawPhotoPanel(ctx, panel, rect, look) {
  const def = LOOK_DEFS[look];
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel && panel.photo) {
    const img = panel.photo;
    const zoom = (panel.zoom ?? 100) / 100;
    const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    const ox = (panel.ox ?? 0) * rect.w;
    const oy = (panel.oy ?? 0) * rect.h;
    ctx.drawImage(img, rect.x + (rect.w - pw) / 2 + ox, rect.y + (rect.h - ph) / 2 + oy, pw, ph);
  } else {
    fillGradient(ctx, rect, def.empty);
    drawRetroSun(ctx, rect.x + rect.w * 0.72, rect.y + rect.h * 0.32, Math.min(rect.w, rect.h) * 0.2, def.sun[0], def.sun[1]);
    drawPalm(ctx, rect.x + rect.w * 0.14, rect.y + rect.h, Math.min(rect.w, rect.h) * 0.5, 0.12, 'rgba(10, 4, 18, 0.85)');
  }
  // Warm grade wash so every photo sits in the same sunset world.
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, 'rgba(255, 122, 61, 0.10)');
  wash.addColorStop(1, 'rgba(200, 29, 122, 0.22)');
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // Comic frame: white border, thin dark keyline.
  ctx.save();
  ctx.lineWidth = Math.max(3, rect.w * 0.008);
  ctx.strokeStyle = def.frame;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(20, 6, 30, 0.9)';
  ctx.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
  ctx.restore();
}

/** The caption band: sky gradient, sun, palms, title and subtitle.
 *  With `floating` true the band is skipped and the title floats over the
 *  photo instead (Full Bleed layout), with a soft dark glow behind it. */
export function drawCaptionBand(ctx, state, w, h, floating = false) {
  const def = LOOK_DEFS[state.look];
  const bandH = Math.round(h * 0.24);
  const band = { x: 0, y: h - bandH, w, h: bandH };
  if (!floating) {
    fillGradient(ctx, band, def.band);
    // Sun low on the horizon, tucked into the lower-right corner clear of
    // the title, half sunk behind the band's bottom edge.
    drawRetroSun(ctx, w * 0.89, band.y + bandH * 0.6, bandH * 0.46, def.sun[0], def.sun[1]);
    // Palm silhouettes along the bottom edge, left and right of the title,
    // kept inside the frame so the whole crown reads.
    drawPalm(ctx, w * 0.06, h - 2, bandH * 0.95, 0.22, 'rgba(16, 4, 26, 0.9)');
    drawPalm(ctx, w * 0.94, h - 2, bandH * 0.85, -0.18, 'rgba(16, 4, 26, 0.9)');
    // Thin gold rule above the band.
    ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
    ctx.fillRect(0, band.y - 2, w, 3);
  }
  // Title: Anton, uppercase, outlined, dropped shadow, slight tilt.
  const title = (state.title || '').trim().toUpperCase();
  const scale = (state.titleScale ?? 100) / 100;
  if (title) {
    let size = bandH * 0.52 * scale;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    while (ctx.measureText(title).width > w * 0.86 && size > 16) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    const cy = band.y + bandH * 0.42;
    if (floating) {
      // Soft dark glow so the floating title reads over any photo.
      const glow = ctx.createRadialGradient(w / 2, cy, 0, w / 2, cy, w * 0.45);
      glow.addColorStop(0, 'rgba(10, 2, 18, 0.55)');
      glow.addColorStop(1, 'rgba(10, 2, 18, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, band.y, w, bandH);
    }
    ctx.translate(w / 2, cy);
    ctx.rotate(-0.022);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = def.titleOutline;
    ctx.shadowColor = def.titleShadow;
    ctx.shadowBlur = size * 0.28;
    ctx.shadowOffsetY = size * 0.06;
    ctx.strokeText(title, 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = def.title;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }
  // Subtitle: Pacifico script under the title.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const size = Math.max(14, bandH * 0.17);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px Pacifico, cursive`;
    ctx.fillStyle = def.subtitle;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = size * 0.25;
    ctx.fillText(sub, w / 2, band.y + bandH * 0.82);
    ctx.restore();
  }
}

/** Film grain + vignette over the whole cover. */
export function drawFinish(ctx, w, h, seed) {
  const rand = mulberry32(seed);
  const dots = Math.floor((w * h) / 2600);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < dots; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rand() * 1.6 + 0.4;
    ctx.fillRect(x, y, r, r);
  }
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < dots / 2; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,2,18,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/** Renders the full cover onto `canvas` at the state's size. */
export function renderCover(canvas, state) {
  const [w, h] = SIZES[state.size] || SIZES['1080x1080'];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const def = LOOK_DEFS[state.look] || LOOK_DEFS.sunset;
  fillGradient(ctx, { x: 0, y: 0, w, h }, def.sky);
  const rects = panelRects(state.layout, w, h);
  if (state.layout === 'bleed') {
    drawPhotoPanel(ctx, state.panels[0], rects[0], state.look);
    // Scrim so the caption stays readable over the photo.
    const scrim = ctx.createLinearGradient(0, h * 0.55, 0, h);
    scrim.addColorStop(0, 'rgba(20,4,30,0)');
    scrim.addColorStop(1, 'rgba(20,4,30,0.55)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
    // In bleed mode the title floats over the photo, not on a band.
    drawCaptionBand(ctx, state, w, h, true);
  } else {
    rects.forEach((rect, i) => drawPhotoPanel(ctx, state.panels[i], rect, state.look));
    drawCaptionBand(ctx, state, w, h);
  }
  const seed = w * 31 + h * 17 + state.look.length * 7;
  drawFinish(ctx, w, h, seed);
  return canvas;
}
