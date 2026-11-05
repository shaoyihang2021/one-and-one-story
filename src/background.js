import { VIEW_W, VIEW_H, MOOD_DEFS, WINDOW_OFFSETS } from "./data.js";

const tintCache = new Map();
const tintIds = new WeakMap();
let nextTintId = 1;

function tinted(img, color) {
  if (!img) return null;
  if (!color || color === "#ffffff") return img;
  let id = tintIds.get(img);
  if (!id) {
    id = nextTintId;
    nextTintId += 1;
    tintIds.set(img, id);
  }
  const key = `${id}|${color}`;
  if (tintCache.has(key)) return tintCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(img, 0, 0);
  tintCache.set(key, canvas);
  return canvas;
}

function drawLayer(ctx, img, x, y, { alpha = 1, mode = "source-over", color = null, width = null, height = null } = {}) {
  if (!img) return;
  const source = color ? tinted(img, color) : img;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  if (width || height) {
    ctx.drawImage(source, x, y, width ?? source.width, height ?? source.height);
  } else {
    ctx.drawImage(source, x, y);
  }
  ctx.restore();
}

export class Background {
  constructor(level, mapping, images) {
    this.images = images;
    this.level = level;
    this.mapping = mapping;
    this.mood = MOOD_DEFS[mapping.mood] ? mapping.mood : "foggy";
    this.def = MOOD_DEFS[this.mood];
    this.season = mapping.season || "other";
    this.lights = mapping.lights ?? true;
    this.windows = [];
    this.windowTimer = 0.08 + Math.random() * 0.26;
    this.base = document.createElement("canvas");
    this.base.width = VIEW_W;
    this.base.height = VIEW_H;
    this.compose();
  }

  get ambience() {
    return this.def.nightAmbience ? "night" : "day";
  }

  compose() {
    const ctx = this.base.getContext("2d");
    const def = this.def;
    const images = this.images;

    ctx.fillStyle = "#7f7f7f";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawLayer(ctx, images[def.image], 0, 0, { alpha: def.alpha });
    drawLayer(ctx, images["bg-shading"], 0, 0, { alpha: 1, mode: "overlay" });
    if (def.tex > 0) {
      drawLayer(ctx, images["bg-tex"], 0, 0, { alpha: def.tex, mode: "overlay" });
    }
    if (def.grain > 0) {
      drawLayer(ctx, images["bg-grain"], 0, 0, { alpha: def.grain, mode: "screen" });
    }
    drawLayer(ctx, images["bg-frame"], 0, 0, { alpha: 1, mode: "multiply" });

    const items = this.level.background || [];

    // The original draws layers by type rather than in XML order.
    for (const [tag, x, y] of items) {
      if (!tag.startsWith("house")) continue;
      const index = Number(tag.slice(5)) || 0;
      drawLayer(ctx, images[`houses${index}`], x, y, { alpha: 0.2, mode: "multiply" });
      if (this.lights) {
        drawLayer(ctx, images[`houses${index}-light`], x, y, {
          alpha: def.windowAlpha,
          mode: "lighter",
        });
        for (const [windowIndex, dx, dy] of WINDOW_OFFSETS[index] || []) {
          this.windows.push({
            x: x + dx,
            y: y + dy,
            kind: windowIndex,
            visible: false,
          });
        }
      }
    }

    for (const [tag, x, y] of items) {
      if (!tag.startsWith("hill")) continue;
      const index = Number(tag.slice(4)) || 0;
      if (this.season === "winter") {
        drawLayer(ctx, images[`hill${index}-snow`], x, y);
      } else {
        drawLayer(ctx, images[`hill${index}`], x, y, {
          mode: "darken",
          color: def.spriteTint,
        });
      }
    }

    for (const [tag, x, y] of items) {
      if (!tag.startsWith("tree")) continue;
      const index = Number(tag.slice(4)) || 0;
      drawLayer(ctx, images[`tree${index}`], x, y, {
        mode: "darken",
        color: def.spriteTint,
      });
      if (this.season === "winter") {
        drawLayer(ctx, images[`tree${index}-snow`], x, y);
      } else if (this.season === "autumn") {
        drawLayer(ctx, images[`tree${index}-leaves-color`], x, y, {
          alpha: this.mood === "night" || this.mood === "twilight" ? 0.9 : 0.95,
          color: def.leavesTint,
        });
      } else {
        drawLayer(ctx, images[`tree${index}-leaves`], x, y, {
          mode: "darken",
          color: def.spriteTint,
        });
      }
    }

    for (const [tag, x, y] of items) {
      if (tag !== "lamp") continue;
      if (this.lights) {
        const lightKey = this.mood === "twilight" ? "lamp-light-white" : "lamp-light";
        drawLayer(ctx, images[lightKey], x - 44, y - 41, {
          alpha: def.lampAlpha,
          mode: "lighter",
        });
      }
      drawLayer(ctx, images.lamp, x, y, {
        mode: "darken",
        color: def.spriteTint,
      });
      if (this.season === "winter") {
        drawLayer(ctx, images["lamp-snow"], x, y);
      }
    }

    for (const [tag, x, y] of items) {
      if (tag !== "can") continue;
      drawLayer(ctx, images.can, x, y, {
        mode: "darken",
        color: def.spriteTint,
      });
      if (this.season === "winter") {
        drawLayer(ctx, images["can-snow"], x, y);
      }
    }
  }

  update(dt) {
    if (!this.lights || !this.windows.length) return;
    this.windowTimer -= dt;
    if (this.windowTimer > 0) return;
    this.windowTimer = 0.05 + Math.random() * 0.3;
    const count = Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i += 1) {
      const window = this.windows[Math.floor(Math.random() * this.windows.length)];
      window.visible = !window.visible;
    }
  }

  render(ctx) {
    ctx.drawImage(this.base, 0, 0);
    if (!this.lights) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = this.def.windowAlpha;
    for (const window of this.windows) {
      if (!window.visible) continue;
      const img = this.images[`window${window.kind}`];
      if (img) ctx.drawImage(img, window.x, window.y);
    }
    ctx.restore();
  }
}
