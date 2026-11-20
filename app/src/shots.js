// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the exported cover alone, edge to edge.
// `photo` / `photo2` pick samples, `layout`, `look`, `size`, `title` and
// `subtitle` set the scene. window.__shotReady is set once painted.
import { panelCount, panelRects, defaultOffsets, SIZES } from './cover.js';

export async function runShot(shot, query, ctx) {
  const { state, loadImage, redraw } = ctx;
  const layout = query.get('layout') || 'trio';
  const look = query.get('look') || 'sunset';
  const size = query.get('size') || '1080x1080';
  const title = query.get('title');
  const subtitle = query.get('subtitle');

  // Apply the scene's choices to the matching controls so the editor shot
  // shows the same state the cover was made from.
  state.layout = layout;
  state.look = look;
  state.size = size;
  if (title !== null) {
    state.title = title;
    const titleInput = document.getElementById('title');
    if (titleInput) titleInput.value = title;
  }
  if (subtitle !== null) {
    state.subtitle = subtitle;
    const subtitleInput = document.getElementById('subtitle');
    if (subtitleInput) subtitleInput.value = subtitle;
  }
  document.querySelectorAll('#layoutRow .choice').forEach((b) => b.classList.toggle('is-active', b.dataset.layout === layout));
  document.querySelectorAll('#lookRow .choice').forEach((b) => b.classList.toggle('is-active', b.dataset.look === look));
  document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.size === size));

  const count = panelCount(layout);
  const first = query.get('photo') || 'boulevard';
  const second = query.get('photo2') || 'pier';
  const photos = [];
  for (let i = 0; i < count; i++) {
    // Alternate the two samples so multi-panel scenes show variety.
    const name = i % 2 === 0 ? first : second;
    try {
      photos.push(await loadImage(`samples/${name}.jpg`));
    } catch {
      photos.push(null);
    }
  }
  state.panels = photos.map((photo, i) => {
    if (!photo) return { photo: null, zoom: 100, ox: 0, oy: 0 };
    const [w, h] = SIZES[size] || SIZES['1080x1080'];
    const rect = panelRects(layout, w, h)[i];
    const { ox, oy } = rect ? defaultOffsets(photo, rect) : { ox: 0, oy: 0 };
    return { photo, zoom: 100, ox, oy };
  });

  if (shot === 'cover') document.body.classList.add('shot-cover');
  const status = document.getElementById('status');
  if (status) status.textContent = 'Sample photos loaded — pick a size and export.';
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
