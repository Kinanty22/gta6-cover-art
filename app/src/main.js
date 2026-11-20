// main.js — wires the Vice Coast editor: uploads, panel picking, crop
// controls, caption, PNG export, and the ?shot= scene mode for screenshots.

import { drawCover, SIZES, LAYOUTS, GRADES, layoutPanels } from './cover.js';
import { scenes } from './shots.js';

const $ = (id) => document.getElementById(id);

const state = {
  layout: 'hero',
  grade: 'sunset',
  size: 'square',
  title: 'VICE COAST',
  subtitle: 'Sunset over the bay',
  photos: [],
  panels: [],
  selected: 0,
};

const preview = $('preview');
const pctx = preview.getContext('2d');

/** Fresh per-layout panels, keeping each photo where it still fits. */
function resetPanels() {
  const count = LAYOUTS[state.layout].panels;
  const old = state.panels;
  state.panels = Array.from({ length: count }, (_, i) => ({
    ...(old[i] ?? { photo: 0, zoom: 1, x: 0.5, y: 0.5 }),
  }));
  if (state.selected >= count) state.selected = 0;
}

/** Preview canvas size: the chosen cover aspect, fitted in a 960 x 640 box. */
function previewSize() {
  const [w, h] = SIZES[state.size];
  const scale = Math.min(960 / w, 640 / h);
  return [Math.round(w * scale), Math.round(h * scale)];
}

function renderPreview() {
  const [w, h] = previewSize();
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  drawCover(pctx, w, h, state);
  updatePanelLabel();
}

function updatePanelLabel() {
  const crop = state.panels[state.selected];
  const label = $('panel-label');
  if (!label || !crop) return;
  label.textContent = `Panel ${state.selected + 1} of ${state.panels.length} — photo ${crop.photo + 1}, zoom ${crop.zoom.toFixed(2)}x`;
  const zoom = $('zoom');
  const panx = $('panx');
  const pany = $('pany');
  if (zoom) zoom.value = crop.zoom;
  if (panx) panx.value = crop.x;
  if (pany) pany.value = crop.y;
}

function renderThumbnails() {
  const strip = $('photos');
  strip.innerHTML = '';
  state.photos.forEach((img, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'thumb';
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    thumb.title = `Use photo ${i + 1} in the selected panel`;
    thumb.addEventListener('click', () => {
      const crop = state.panels[state.selected];
      if (crop) {
        crop.photo = i;
        renderPreview();
      }
    });
    const remove = document.createElement('button');
    remove.className = 'thumb-remove';
    remove.textContent = '×';
    remove.title = `Remove photo ${i + 1}`;
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto(i);
    });
    wrap.append(thumb, remove);
    strip.append(wrap);
  });
  $('photo-count').textContent = `${state.photos.length} / 6 photos`;
}

function removePhoto(index) {
  state.photos.splice(index, 1);
  for (const crop of state.panels) {
    if (crop.photo === index) crop.photo = 0;
    else if (crop.photo > index) crop.photo -= 1;
  }
  renderThumbnails();
  renderPreview();
}

/** Load an image from a URL (sample or object URL) and return it when decoded. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  return img;
}

async function addFiles(files) {
  const room = 6 - state.photos.length;
  const picked = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room);
  for (const file of picked) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photos.push(img);
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  renderThumbnails();
  renderPreview();
}

/** Click on the preview selects the panel under the pointer. */
function pickPanel(event) {
  const rect = preview.getBoundingClientRect();
  const scaleX = preview.width / rect.width;
  const scaleY = preview.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const panels = layoutPanels(state.layout, preview.width, preview.height);
  const hit = panels.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  if (hit >= 0) {
    state.selected = hit;
    updatePanelLabel();
    preview.classList.add('panel-picked');
    setTimeout(() => preview.classList.remove('panel-picked'), 250);
  }
}

function nudgeSelected(dx, dy) {
  const crop = state.panels[state.selected];
  if (!crop) return;
  crop.x = Math.min(1, Math.max(0, crop.x + dx));
  crop.y = Math.min(1, Math.max(0, crop.y + dy));
  renderPreview();
}

/** Render one cover at full export size and download it as a PNG. */
function exportCover(sizeName) {
  const [w, h] = SIZES[sizeName];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-coast-${sizeName}-${w}x${h}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      resolve(blob);
    }, 'image/png');
  });
}

async function exportAllSizes() {
  for (const name of Object.keys(SIZES)) {
    // eslint-disable-next-line no-await-in-loop
    await exportCover(name);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 350));
  }
}

function bindPicker(containerId, attr, apply) {
  const container = $(containerId);
  container.addEventListener('click', (event) => {
    const button = event.target.closest(`[data-${attr}]`);
    if (!button) return;
    apply(button.dataset[attr]);
    container.querySelectorAll('.active').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    renderPreview();
  });
}

function bindControls() {
  $('photo-input').addEventListener('change', (e) => addFiles(e.target.files));
  const zone = $('dropzone');
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragging');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragging');
    addFiles(e.dataTransfer.files);
  });

  bindPicker('layout-picker', 'layout', (v) => {
    state.layout = v;
    resetPanels();
  });
  bindPicker('grade-picker', 'grade', (v) => {
    state.grade = v;
  });
  bindPicker('size-picker', 'size', (v) => {
    state.size = v;
  });

  $('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    renderPreview();
  });
  $('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    renderPreview();
  });
  $('zoom').addEventListener('input', (e) => {
    const crop = state.panels[state.selected];
    if (crop) {
      crop.zoom = Number(e.target.value);
      renderPreview();
    }
  });
  $('panx').addEventListener('input', (e) => {
    const crop = state.panels[state.selected];
    if (crop) {
      crop.x = Number(e.target.value);
      renderPreview();
    }
  });
  $('pany').addEventListener('input', (e) => {
    const crop = state.panels[state.selected];
    if (crop) {
      crop.y = Number(e.target.value);
      renderPreview();
    }
  });

  $('fill-all').addEventListener('click', () => {
    for (const crop of state.panels) crop.photo = 0;
    renderPreview();
  });
  $('export').addEventListener('click', () => exportCover(state.size));
  $('export-all').addEventListener('click', exportAllSizes);

  preview.addEventListener('click', pickPanel);
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    const step = e.shiftKey ? 0.08 : 0.02;
    if (e.key === 'ArrowLeft') {
      nudgeSelected(-step, 0);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      nudgeSelected(step, 0);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      nudgeSelected(0, -step);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      nudgeSelected(0, step);
      e.preventDefault();
    }
  });
}

async function boot() {
  resetPanels();
  bindControls();
  // Preload the two free sample photos so the app is usable at once.
  try {
    const [pier, boulevard] = await Promise.all([loadSample('pier'), loadSample('boulevard')]);
    state.photos.push(pier, boulevard);
    state.panels.forEach((crop, i) => {
      crop.photo = i % state.photos.length;
    });
  } catch {
    // Samples are a convenience; the app still works with uploads.
  }
  renderThumbnails();

  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  const api = { state, params, loadSample, renderPreview, preview, resetPanels, coverRendered: false };
  if (shot && scenes[shot]) {
    await scenes[shot](api);
  }
  await Promise.all([
    document.fonts.load('80px Anton'),
    document.fonts.load('40px Pacifico'),
    document.fonts.ready,
  ]);
  if (!api.coverRendered) renderPreview();
  window.__shotReady = true;
}

boot();
