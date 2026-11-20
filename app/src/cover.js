// cover.js — draws multi-panel GTA-style cover art onto a canvas.
// Everything here is original: no Rockstar logo, artwork or fonts.
// Anton (titles) and Pacifico (script subtitle) are SIL OFL fonts in app/fonts/.

/** Export sizes in pixels: name -> [width, height]. */
export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  landscape: [1920, 1080],
};

/** Layouts: name -> panel count. Panel rects come from layoutPanels(). */
export const LAYOUTS = {
  hero: { panels: 3, label: 'Hero + 2' },
  grid: { panels: 4, label: 'Grid 2x2' },
  strip: { panels: 3, label: 'Strip of 3' },
  full: { panels: 1, label: 'Full bleed' },
};

/**
 * Colour grades. filter is a canvas filter applied to each photo;
 * wash is a diagonal gradient drawn over the whole cover with 'overlay';
 * glow is a radial tint drawn with 'soft-light';
 * title is the gradient for the Anton title.
 */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.3) sepia(0.28) contrast(1.06) brightness(1.03)',
    wash: ['rgba(255, 122, 26, 0.55)', 'rgba(255, 77, 109, 0.42)', 'rgba(124, 58, 237, 0.30)'],
    glow: 'rgba(255, 176, 66, 0.5)',
    title: ['#fff7d6', '#ffd166', '#ff7b54', '#ff4d6d'],
  },
  neon: {
    label: 'Neon nights',
    filter: 'saturate(1.55) contrast(1.14) brightness(1.02)',
    wash: ['rgba(255, 92, 225, 0.5)', 'rgba(64, 224, 255, 0.42)', 'rgba(124, 58, 237, 0.34)'],
    glow: 'rgba(0, 229, 255, 0.45)',
    title: ['#e0fbff', '#7df9ff', '#ff5ce1', '#b967ff'],
  },
  purple: {
    label: 'Vice purple',
    filter: 'saturate(1.35) hue-rotate(18deg) contrast(1.08)',
    wash: ['rgba(168, 85, 247, 0.5)', 'rgba(124, 58, 237, 0.45)', 'rgba(236, 72, 153, 0.3)'],
    glow: 'rgba(192, 132, 252, 0.5)',
    title: ['#f3e8ff', '#d8b4fe', '#c084fc', '#7c3aed'],
  },
  noir: {
    label: 'Palm noir',
    filter: 'saturate(0.12) contrast(1.22) brightness(0.96)',
    wash: ['rgba(10, 10, 30, 0.35)', 'rgba(60, 60, 90, 0.22)', 'rgba(0, 0, 0, 0.3)'],
    glow: 'rgba(148, 163, 184, 0.35)',
    title: ['#ffffff', '#e2e8f0', '#94a3b8'],
  },
  original: {
    label: 'Original',
    filter: 'none',
    wash: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0)'],
    glow: 'rgba(255, 255, 255, 0)',
    title: ['#ffffff', '#ffe9a8', '#ffb347'],
  },
};

/** Panel rectangles for a layout inside a w x h cover, separated by white gutters. */
export function layoutPanels(layout, w, h) {
  const g = Math.max(6, Math.round(w * 0.011));
  switch (layout) {
    case 'hero': {
      const heroW = Math.round(w * 0.6);
      const rightX = heroW + g;
      const rightW = w - rightX;
      const halfH = Math.floor((h - g) / 2);
      return [
        { x: 0, y: 0, w: heroW, h },
        { x: rightX, y: 0, w: rightW, h: halfH },
        { x: rightX, y: halfH + g, w: rightW, h: h - halfH - g },
      ];
    }
    case 'grid': {
      const halfW = Math.floor((w - g) / 2);
      const halfH = Math.floor((h - g) / 2);
      return [
        { x: 0, y: 0, w: halfW, h: halfH },
        { x: halfW + g, y: 0, w: w - halfW - g, h: halfH },
        { x: 0, y: halfH + g, w: halfW, h: h - halfH - g },
        { x: halfW + g, y: halfH + g, w: w - halfW - g, h: h - halfH - g },
      ];
    }
    case 'strip': {
      const thirdW = Math.floor((w - 2 * g) / 3);
      return [
        { x: 0, y: 0, w: thirdW, h },
        { x: thirdW + g, y: 0, w: thirdW, h },
        { x: 2 * (thirdW + g), y: 0, w: w - 2 * (thirdW + g), h },
      ];
    }
    case 'full':
    default:
      return [{ x: 0, y: 0, w, h }];
  }
}

/** Draw one photo into a panel rect, cover-fit, with zoom and focal point crop. */
export function drawPhotoCover(ctx, img, rect, crop) {
  const zoom = crop?.zoom ?? 1;
  const fx = crop?.x ?? 0.5;
  const fy = crop?.y ?? 0.5;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) * fx;
  const dy = rect.y + (rect.h - dh) * fy;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** A tiny deterministic PRNG so grain looks the same on every render. */
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

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Film grain: sparse dark and light specks, seeded by the cover's text. */
function drawGrain(ctx, w, h, seedText) {
  const rand = mulberry32(hashString(seedText));
  const count = Math.floor((w * h) / 260);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const light = rand() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${0.05 + rand() * 0.07})` : `rgba(0,0,0,${0.05 + rand() * 0.07})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

/** A dark radial vignette that pulls the eye to the middle. */
function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The small original corner tag, top right. */
function drawCornerTag(ctx, w) {
  const pad = Math.round(w * 0.02);
  const text = 'VICE COAST';
  const size = Math.round(w * 0.022);
  ctx.save();
  ctx.font = `${size}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + pad * 1.4;
  const bh = size + pad * 0.9;
  const bx = w - bw - pad;
  const by = pad;
  ctx.fillStyle = 'rgba(10, 10, 16, 0.72)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + pad * 0.7, by + bh / 2 + 1);
  ctx.restore();
}

/** The Anton title with a gradient fill, heavy outline and drop shadow. */
function drawTitle(ctx, w, h, title, subtitle, grade) {
  const padX = Math.round(w * 0.045);
  const size = Math.round(w * 0.115);
  const subSize = Math.round(w * 0.042);
  const titleY = h - Math.round(h * 0.075) - subSize - Math.round(size * 0.35);
  ctx.save();
  // Dark scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, h - Math.round(h * 0.34), 0, h);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - Math.round(h * 0.34), w, Math.round(h * 0.34));

  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const grad = ctx.createLinearGradient(padX, titleY - size, padX, titleY + size * 0.15);
  grade.title.forEach((stop, i) => grad.addColorStop(i / (grade.title.length - 1), stop));
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(size * 0.14);
  ctx.shadowOffsetY = Math.round(size * 0.05);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14060a';
  ctx.lineWidth = Math.round(size * 0.16);
  ctx.strokeText(title, padX, titleY);
  ctx.strokeText(title, padX, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, padX, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (subtitle) {
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = Math.round(subSize * 0.2);
    ctx.shadowOffsetY = Math.round(subSize * 0.06);
    ctx.fillText(subtitle, padX + Math.round(size * 0.06), titleY + subSize + Math.round(size * 0.12));
  }
  ctx.restore();
}

/**
 * Render a cover onto ctx at w x h.
 * state: { layout, grade, title, subtitle, photos: Image[], panels: [{photo, zoom, x, y}] }
 * A panel with no photo draws a deep purple placeholder with its number.
 */
export function drawCover(ctx, w, h, state) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const panels = layoutPanels(state.layout, w, h);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.filter = grade.filter;
  panels.forEach((rect, i) => {
    const crop = state.panels?.[i] ?? { photo: 0, zoom: 1, x: 0.5, y: 0.5 };
    const img = state.photos?.[crop.photo];
    if (img && img.naturalWidth > 0) {
      drawPhotoCover(ctx, img, rect, crop);
    } else {
      ctx.save();
      ctx.fillStyle = i % 2 ? '#2a1245' : '#3b1d5e';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${Math.round(rect.w * 0.16)}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PANEL ${i + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.restore();
    }
  });
  ctx.filter = 'none';

  // Grade wash + glow over the whole cover.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const wash = ctx.createLinearGradient(0, 0, w, h);
  grade.wash.forEach((stop, i) => wash.addColorStop(i / (grade.wash.length - 1), stop));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  const glow = ctx.createRadialGradient(w * 0.72, h * 0.2, 0, w * 0.72, h * 0.2, Math.max(w, h) * 0.8);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  drawVignette(ctx, w, h);
  drawGrain(ctx, w, h, `${state.title}|${state.subtitle}|${state.grade}|${state.layout}`);
  drawCornerTag(ctx, w);
  drawTitle(ctx, w, h, (state.title || 'VICE COAST').toUpperCase(), state.subtitle || '', grade);
  ctx.restore();
}
