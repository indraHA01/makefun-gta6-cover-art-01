// Vice City Nights — editor wiring: panels, uploads, drag-to-pan, looks,
// layouts, sizes and PNG export. A `?shot=` query sets up a fixed scene for
// a screenshot instead (./shots.js).
import { renderCover, panelRects, panelCount, defaultOffsets, SIZES } from './cover.js';
import { runShot } from './shots.js';

const stage = document.getElementById('stage');
const status = document.getElementById('status');
const panelLabel = document.getElementById('panelLabel');
const zoomInput = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomVal');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const titleScaleInput = document.getElementById('titleScale');
const titleScaleVal = document.getElementById('titleScaleVal');

/** The editor state: everything renderCover needs. */
const state = {
  layout: 'trio',
  look: 'sunset',
  size: '1080x1080',
  title: titleInput.value,
  subtitle: subtitleInput.value,
  titleScale: 100,
  panels: [blankPanel(), blankPanel(), blankPanel()],
};

function blankPanel() {
  return { photo: null, zoom: 100, ox: 0, oy: 0 };
}

let selected = 0;
let fontsReady = false;

function selectedPanel() {
  return state.panels[selected] || blankPanel();
}

function refreshPanelLabel() {
  const total = panelCount(state.layout);
  panelLabel.textContent = `Panel ${selected + 1} of ${total} selected.`;
  const panel = selectedPanel();
  zoomInput.value = String(panel.zoom ?? 100);
  zoomVal.textContent = `${panel.zoom ?? 100}%`;
}

function redraw() {
  renderCover(stage, state);
  refreshPanelLabel();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Loads a local file (from the file picker) as an image. */
function loadFile(file) {
  return loadImage(URL.createObjectURL(file));
}

/** Resizes the panels array when the layout changes, keeping photos and
 *  re-framing each one for its new panel shape (so a face does not end up
 *  cropped out by a layout switch). */
function applyLayout(layout) {
  const count = panelCount(layout);
  const next = [];
  const [w, h] = SIZES[state.size];
  const rects = panelRects(layout, w, h);
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i] || blankPanel();
    if (panel.photo && rects[i]) {
      const { ox, oy } = defaultOffsets(panel.photo, rects[i]);
      panel.ox = ox;
      panel.oy = oy;
    }
    next.push(panel);
  }
  state.panels = next;
  state.layout = layout;
  if (selected >= count) selected = 0;
}

/** Which panel (if any) a point on the stage canvas falls in. */
function panelAt(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  const [w, h] = SIZES[state.size];
  const x = ((clientX - rect.left) / rect.width) * w;
  const y = ((clientY - rect.top) / rect.height) * h;
  const rects = panelRects(state.layout, w, h);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

// --- controls -----------------------------------------------------------

document.getElementById('layoutRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layout]');
  if (!btn) return;
  document.querySelectorAll('#layoutRow .choice').forEach((b) => b.classList.toggle('is-active', b === btn));
  applyLayout(btn.dataset.layout);
  redraw();
});

document.getElementById('lookRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-look]');
  if (!btn) return;
  document.querySelectorAll('#lookRow .choice').forEach((b) => b.classList.toggle('is-active', b === btn));
  state.look = btn.dataset.look;
  redraw();
});

document.querySelectorAll('.size-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
    state.size = btn.dataset.size;
    redraw();
  });
});

document.getElementById('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const img = await loadFile(file);
    const [w, h] = SIZES[state.size];
    const rect = panelRects(state.layout, w, h)[selected];
    const { ox, oy } = rect ? defaultOffsets(img, rect) : { ox: 0, oy: 0 };
    state.panels[selected] = { photo: img, zoom: 100, ox, oy };
    status.textContent = `Photo loaded into panel ${selected + 1}.`;
    redraw();
  } catch {
    status.textContent = 'That file could not be read as a photo.';
  }
  e.target.value = '';
});

document.getElementById('fillAll').addEventListener('click', () => {
  const src = selectedPanel();
  if (!src.photo) {
    status.textContent = 'Add a photo to the selected panel first.';
    return;
  }
  state.panels = state.panels.map(() => ({ photo: src.photo, zoom: src.zoom, ox: src.ox, oy: src.oy }));
  status.textContent = 'One photo now fills every panel.';
  redraw();
});

document.getElementById('clearPanel').addEventListener('click', () => {
  state.panels[selected] = blankPanel();
  status.textContent = `Panel ${selected + 1} cleared.`;
  redraw();
});

async function loadSample(name, label) {
  try {
    const img = await loadImage(`samples/${name}.jpg`);
    const [w, h] = SIZES[state.size];
    const rect = panelRects(state.layout, w, h)[selected];
    const { ox, oy } = rect ? defaultOffsets(img, rect) : { ox: 0, oy: 0 };
    state.panels[selected] = { photo: img, zoom: 100, ox, oy };
    status.textContent = `Sample photo "${label}" loaded into panel ${selected + 1}.`;
    redraw();
  } catch {
    status.textContent = 'The sample photo could not be loaded.';
  }
}
document.getElementById('sampleBoulevard').addEventListener('click', () => loadSample('boulevard', 'boulevard'));
document.getElementById('samplePier').addEventListener('click', () => loadSample('pier', 'pier'));

zoomInput.addEventListener('input', () => {
  const panel = selectedPanel();
  panel.zoom = Number(zoomInput.value);
  zoomVal.textContent = `${panel.zoom}%`;
  redraw();
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
titleScaleInput.addEventListener('input', () => {
  state.titleScale = Number(titleScaleInput.value);
  titleScaleVal.textContent = `${state.titleScale}%`;
  redraw();
});

// --- drag to pan the selected panel's photo ------------------------------

let drag = null;
stage.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit < 0) return;
  selected = hit;
  const panel = selectedPanel();
  drag = { x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy };
  stage.classList.add('dragging');
  stage.setPointerCapture(e.pointerId);
  refreshPanelLabel();
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = stage.getBoundingClientRect();
  const [w, h] = SIZES[state.size];
  const panel = selectedPanel();
  const rects = panelRects(state.layout, w, h);
  const r = rects[selected];
  if (!r) return;
  panel.ox = drag.ox + ((e.clientX - drag.x) / rect.width) * (w / r.w);
  panel.oy = drag.oy + ((e.clientY - drag.y) / rect.height) * (h / r.h);
  panel.ox = Math.max(-0.9, Math.min(0.9, panel.ox));
  panel.oy = Math.max(-0.9, Math.min(0.9, panel.oy));
  redraw();
});
function endDrag() {
  drag = null;
  stage.classList.remove('dragging');
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

// --- export --------------------------------------------------------------

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportPng() {
  const off = document.createElement('canvas');
  renderCover(off, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        status.textContent = 'Export failed — the browser could not make the PNG.';
        resolve(false);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-city-nights-${state.size}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      status.textContent = `Saved vice-city-nights-${state.size}.png (${state.size.replace('x', ' × ')}).`;
      resolve(true);
    }, 'image/png');
  });
}
document.getElementById('export').addEventListener('click', exportPng);

// --- boot ----------------------------------------------------------------

/** Waits for the poster fonts, then paints the first preview. */
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    fontsReady = true;
  } catch {
    fontsReady = false;
  }
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), { state, loadImage, redraw });
    window.__shotReady = true;
    return;
  }
  redraw();
}

boot();
