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
  "mood-daylight": "bg/mood-daylight.jpg",
  "houses0": "bg/houses0.png",
  "houses1": "bg/houses1.png",
  "houses2": "bg/houses2.png",
  "houses0-light": "bg/houses0-light.png",
  "houses1-light": "bg/houses1-light.png",
  "houses2-light": "bg/houses2-light.png",
  "hill0": "bg/hill0.png",
  "hill1": "bg/hill1.png",
  "hill0-snow": "bg/hill0-snow.png",
  "hill1-snow": "bg/hill1-snow.png",
  "tree0": "bg/tree0.png",
  "tree1": "bg/tree1.png",
  "tree2": "bg/tree2.png",
  "tree0-snow": "bg/tree0-snow.png",
  "tree1-snow": "bg/tree1-snow.png",
  "tree2-snow": "bg/tree2-snow.png",
  "tree0-leaves": "bg/tree0-leaves.png",
  "tree1-leaves": "bg/tree1-leaves.png",
  "tree2-leaves": "bg/tree2-leaves.png",
  "tree0-leaves-color": "bg/tree0-leaves-color.png",
  "tree1-leaves-color": "bg/tree1-leaves-color.png",
  "tree2-leaves-color": "bg/tree2-leaves-color.png",
  "lamp": "bg/lamp.png",
  "lamp-snow": "bg/lamp-snow.png",
  "lamp-light": "bg/lamp-light.png",
  "lamp-light-white": "bg/lamp-light-white.png",
  "can": "bg/can.png",
  "can-snow": "bg/can-snow.png",
  "window0": "bg/window0.png",
  "window1": "bg/window1.png",
  "window2": "bg/window2.png",

  logo: "ui/logo-cream.png",
  "logo-blur": "ui/logo-cream-blur.png",
  "menu-bg": "ui/menu-bg.png",
  "title-bg": "ui/title-bg.png",
  "smoke1": "ui/smoke1.png",
  "smoke2": "ui/smoke2.png",
  "smoke3": "ui/smoke3.png",
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
  "icon-restart": "ui/icon-restart.png",
  "icon-switch-j2r": "ui/icon-switch-j2r.png",
  "icon-switch-r2j": "ui/icon-switch-r2j.png",
  "coop-controls-rosie": "ui/coop-controls-rosie.png",
  "coop-controls-josh": "ui/coop-controls-josh.png",
};

export async function loadImages(onProgress) {
  const entries = Object.entries(IMAGE_MANIFEST);
  const images = {};
  let done = 0;

  await Promise.all(entries.map(([key, path]) => new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      images[key] = img;
      done += 1;
      onProgress?.(done / entries.length);
      resolve();
    };
    img.onerror = () => {
      // Keep the game launchable even if an optional flourish is missing.
      console.warn(`Could not load image: ${path}`);
      done += 1;
      onProgress?.(done / entries.length);
      resolve();
    };
    img.src = EMBEDDED?.files?.[`assets/img/${path}`] || new URL(path, IMAGE_ROOT).href;
  })));

  return images;
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
