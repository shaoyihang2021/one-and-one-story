import { isZh } from "./i18n.js";

const ZH_UI_ASSETS = {
  "assets/img/ui/menu-btn-start.png": "assets/img/zh/menu-btn-start.png",
  "assets/img/ui/menu-btn-chapters.png": "assets/img/zh/menu-btn-chapters.png",
  "assets/img/ui/menu-btn-bonus.png": "assets/img/zh/menu-btn-bonus.png",
  "assets/img/ui/menu-btn-credits.png": "assets/img/zh/menu-btn-credits.png",
  "assets/img/ui/tip.png": "assets/img/zh/tip.png",
  "assets/img/ui/box.png": "assets/img/zh/box.png",
  "assets/img/ui/achievement.png": "assets/img/zh/achievement.png",
  "assets/img/ui/end-title.png": "assets/img/zh/end-title.png",
  "assets/img/ui/aristotle.png": "assets/img/zh/aristotle.png",
  "assets/img/ui/like-us.png": "assets/img/zh/like-us.png",
  "assets/img/ui/btn-snd-idl.png": "assets/img/zh/btn-snd-idl.png",
  "assets/img/ui/btn-snd.png": "assets/img/zh/btn-snd.png",
  "assets/img/ui/icon-skip.png": "assets/img/zh/icon-skip.png",
};

for (let index = 1; index <= 8; index += 1) {
  ZH_UI_ASSETS[`assets/img/ui/chapter-btn-${index}.png`] = `assets/img/zh/chapter-btn-${index}.png`;
}

/**
 * Resolve a workspace asset path. The standalone build injects a `files` map
 * with data URIs; the regular web build returns a root-relative URL.
 * In the Chinese edition, text-bearing interface images get a localized
 * counterpart while gameplay art stays shared with the original.
 */
export function assetUrl(path) {
  const localized = isZh && ZH_UI_ASSETS[path] ? ZH_UI_ASSETS[path] : path;
  const embedded = globalThis.__ONE_AND_ONE_EMBEDDED__;
  return embedded?.files?.[localized] || localized;
}
