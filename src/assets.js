const EMBEDDED = globalThis.__ONE_AND_ONE_EMBEDDED__;
const IMAGE_ROOT = new URL("assets/img/", document.baseURI);

export const IMAGE_MANIFEST = {
  tileset: "tileset.png",
  josh: "josh.png",
  rosie: "rosie.png",
  crate: "crate.png",
  spike: "spike.png",
  heart: "heart.png",
  light: "light.png",

  "bg-grain": "bg/grain.jpg",
  "bg-frame": "bg/frame.png",
  "bg-tex": "bg/tex.jpg",
  "bg-shading": "bg/shading.png",
  "mood-foggy": "bg/mood-foggy.png",
  "mood-twilight": "bg/mood-twilight.jpg",
  "mood-sunset": "bg/mood-sunset.png",
  "mood-night": "bg/mood-night.jpg",
  "mood-dawn": "bg/mood-dawn.jpg",
  "mood-noir": "bg/mood-noir.png",
  houses0: "bg/houses0.png",
  houses1: "bg/houses1.png",
  houses2: "bg/houses2.png",
  "houses0-light": "bg/houses0-light.png",
  "houses1-light": "bg/houses1-light.png",
  "houses2-light": "bg/houses2-light.png",
  hill0: "bg/hill0.png",
  hill1: "bg/hill1.png",
  "hill0-snow": "bg/hill0-snow.png",
  "hill1-snow": "bg/hill1-snow.png",
  tree0: "bg/tree0.png",
  tree1: "bg/tree1.png",
  tree2: "bg/tree2.png",
  "tree0-snow": "bg/tree0-snow.png",
  "tree1-snow": "bg/tree1-snow.png",
  "tree2-snow": "bg/tree2-snow.png",
  "tree0-leaves": "bg/tree0-leaves.png",
  "tree1-leaves": "bg/tree1-leaves.png",
  "tree2-leaves": "bg/tree2-leaves.png",
  "tree0-leaves-color": "bg/tree0-leaves-color.png",
  "tree1-leaves-color": "bg/tree1-leaves-color.png",
  "tree2-leaves-color": "bg/tree2-leaves-color.png",
  lamp: "bg/lamp.png",
  "lamp-snow": "bg/lamp-snow.png",
  "lamp-light": "bg/lamp-light.png",
  "lamp-light-white": "bg/lamp-light-white.png",
  can: "bg/can.png",
  "can-snow": "bg/can-snow.png",
  window0: "bg/window0.png",
  window1: "bg/window1.png",
  window2: "bg/window2.png",

  logo: "ui/logo.png",
  "logo-blur": "ui/logo-blur.png",
  "menu-bg": "ui/menu-bg.png",
  "menu-btn-start": "ui/menu-btn-start.png",
  "menu-btn-chapters": "ui/menu-btn-chapters.png",
  "menu-btn-bonus": "ui/menu-btn-bonus.png",
  "menu-btn-credits": "ui/menu-btn-credits.png",
  "menu-select": "ui/menu-select.png",
  "menu-credits": "ui/menu-credits.png",
  "pause-screen": "ui/pause-screen.png",
  box: "ui/box.png",
  tip: "ui/tip.png",
  "ag-shield": "ui/ag-shield.png",
  "ag-text": "ui/ag-text.png",
  "like-us": "ui/like-us.png",
  smoke1: "ui/smoke1.png",
  smoke2: "ui/smoke2.png",
  smoke3: "ui/smoke3.png",
  aristotle: "ui/aristotle.png",
  "end-title": "ui/end-title.png",
  thanks: "ui/thanks.png",
  achievement: "ui/achievement.png",
  "end-text-0": "ui/end-text-0.png",
  "end-text-1": "ui/end-text-1.png",
  "end-text-2": "ui/end-text-2.png",
  "end-text-3": "ui/end-text-3.png",
  "end-text-4": "ui/end-text-4.png",
  "icon-audio-on": "ui/icon-audio-on.png",
  "icon-audio-off": "ui/icon-audio-off.png",
  "icon-exit": "ui/icon-exit.png",
  "icon-home": "ui/icon-home.png",
  "icon-help": "ui/icon-help.png",
  "icon-skip": "ui/icon-skip.png",
  "icon-restart": "ui/icon-restart.png",
  "btn-snd-idl": "ui/btn-snd-idl.png",
  "btn-snd": "ui/btn-snd.png",
  "icon-switch-j2r": "ui/icon-switch-j2r.png",
  "icon-switch-r2j": "ui/icon-switch-r2j.png",
  "chapter-btn-1": "ui/chapter-btn-1.png",
  "chapter-btn-2": "ui/chapter-btn-2.png",
  "chapter-btn-3": "ui/chapter-btn-3.png",
  "chapter-btn-4": "ui/chapter-btn-4.png",
  "chapter-btn-5": "ui/chapter-btn-5.png",
  "chapter-btn-6": "ui/chapter-btn-6.png",
  "chapter-btn-7": "ui/chapter-btn-7.png",
  "chapter-btn-8": "ui/chapter-btn-8.png",
  "chapter-btn-locked": "ui/chapter-btn-locked.png",
  "coop-controls-rosie": "ui/coop-controls-rosie.png",
  "coop-controls-josh": "ui/coop-controls-josh.png",
};

// Everything needed by the title, chapter, credits, pause and intro screens.
// Background textures and character sheets are deliberately excluded: CSS
// loads the menu grain/frame by itself and starting a level waits for gameplay.
export const MENU_IMAGE_KEYS = Object.keys(IMAGE_MANIFEST)
  .filter((key) => IMAGE_MANIFEST[key].startsWith("ui/"));

export const GAMEPLAY_IMAGE_KEYS = Object.keys(IMAGE_MANIFEST)
  .filter((key) => !MENU_IMAGE_KEYS.includes(key));

const CRITICAL_KEYS = new Set([
  "tileset", "josh", "rosie", "crate", "spike", "heart",
]);

function imageUrl(path) {
  return EMBEDDED?.files?.[`assets/img/${path}`] || new URL(path, IMAGE_ROOT).href;
}

function loadImage(path, retries = 1) {
  return new Promise((resolve) => {
    let attempt = 0;
    const start = () => {
      const img = new Image();
      img.decoding = "async";
      img.onload = async () => {
        // Decode before declaring the asset ready so the first level does not
        // stutter while the browser catches up on dozens of images at once.
        try { await img.decode?.(); } catch { /* decode is an optimization */ }
        resolve(img);
      };
      img.onerror = () => {
        attempt += 1;
        if (attempt <= retries) {
          setTimeout(start, 180);
          return;
        }
        console.warn(`Could not load image: ${path}`);
        resolve(null);
      };
      const base = imageUrl(path);
      const url = attempt === 0 || base.startsWith("data:")
        ? base
        : `${base}${base.includes("?") ? "&" : "?"}retry=${attempt}`;
      img.src = url;
    };
    start();
  });
}

/**
 * Load a set of images into a shared image map.
 * Failures are isolated so one optional flourish cannot block the game.
 */
export async function loadImageSet(keys, { images = {}, onProgress, retries = 1 } = {}) {
  if (!keys.length) {
    onProgress?.(1, 0, 0);
    return { images, missing: [] };
  }
  let completed = 0;
  const missing = [];
  await Promise.all(keys.map(async (key) => {
    const image = await loadImage(IMAGE_MANIFEST[key], retries);
    if (image) images[key] = image;
    else missing.push(key);
    completed += 1;
    onProgress?.(completed / keys.length, completed, keys.length);
  }));
  if (missing.length) console.warn(`Images unavailable: ${missing.join(", ")}`);
  return { images, missing };
}

export function missingCriticalKeys(missing = []) {
  return missing.filter((key) => CRITICAL_KEYS.has(key));
}

export async function loadLevels() {
  if (EMBEDDED?.levels) return EMBEDDED.levels;
  const url = new URL("data/levels.json", document.baseURI);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load level data (${response.status})`);
  return response.json();
}

export async function loadFont() {
  if (!document.fonts) return;
  try {
    await document.fonts.load('18px "HandFont"');
    await document.fonts.ready;
  } catch (error) {
    console.warn("HandFont failed to load, using fallback.", error);
  }
}
