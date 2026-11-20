// shots.js — reproducible screenshot scenes for ?shot= mode.
// Each scene sets the editor state from the URL params, renders, and
// returns true when it already drew the final frame (cover scenes).

import { drawCover } from './cover.js';

/** Apply the scene params (?layout= ?grade= ?size= ?title= ?caption= ?subtitle=). */
function applyParams(state, params) {
  const layout = params.get('layout');
  if (layout) state.layout = layout;
  const grade = params.get('grade');
  if (grade) state.grade = grade;
  const size = params.get('size');
  if (size) state.size = size;
  const title = params.get('title') ?? params.get('caption');
  if (title) state.title = title;
  const subtitle = params.get('subtitle');
  if (subtitle) state.subtitle = subtitle;
}

/** Spread the loaded photos across the panels, alternating, for variety. */
function alternatePhotos(state) {
  const n = state.photos.length;
  if (n === 0) return;
  state.panels.forEach((crop, i) => {
    crop.photo = i % n;
  });
}

export const scenes = {
  /** A full-bleed exported cover filling the whole viewport. */
  async cover(api) {
    const { state, params, preview, resetPanels } = api;
    applyParams(state, params);
    resetPanels();
    alternatePhotos(state);
    document.body.classList.add('shot-cover');
    preview.width = window.innerWidth;
    preview.height = window.innerHeight;
    drawCover(preview.getContext('2d'), preview.width, preview.height, state);
    api.coverRendered = true;
    return true;
  },

  /** The editor with photos loaded, ready to edit. */
  async editor(api) {
    const { state, params, resetPanels, renderPreview } = api;
    applyParams(state, params);
    resetPanels();
    alternatePhotos(state);
    const titleInput = document.getElementById('title');
    if (titleInput) titleInput.value = state.title;
    const subtitleInput = document.getElementById('subtitle');
    if (subtitleInput) subtitleInput.value = state.subtitle;
    renderPreview();
    return false;
  },
};
