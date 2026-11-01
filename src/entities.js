const PLAYER_W = 12;
const PLAYER_H = 24;
const PLAYER_OX = 10;
const PLAYER_OY = 8;
const FALL_LIMIT = 125;

export const SPEED = 150;
export const PUSH_SPEED = 120;
export const GRAVITY = 438;
export const FALL_GRAVITY = 750;

const ANIMS = {
  josh: {
    stand: { frames: [0, 1, 2], delay: 0.2, loop: true },
    walk: { frames: [3, 4, 5, 6, 7, 8, 9, 10], delay: 0.1, loop: true },
    push: { frames: [11, 12, 13, 14, 15, 16], delay: 0.1, loop: true },
    pushStand: { frames: [11], delay: 0.1, loop: false },
    jump: { frames: [17, 18, 19], delay: 0.1, loop: true },
    fall: { frames: [20, 21, 22], delay: 0.2, loop: true },
  },
  rosie: {
    stand: { frames: [0, 1, 2], delay: 0.2, loop: true },
    walk: { frames: [3, 4, 5], delay: 0.1, loop: true },
    push: { frames: [6, 7, 8], delay: 0.1, loop: true },
    pushStand: { frames: [6], delay: 0.1, loop: false },
    jump: { frames: [9, 10, 11], delay: 0.1, loop: true },
    fall: { frames: [12, 13, 14], delay: 0.2, loop: true },
  },
};

const SHEETS = {
  josh: { cols: 8, rows: 4, frameW: 32, frameH: 32 },
  rosie: { cols: 7, rows: 3, frameW: 32, frameH: 32 },
};

export function playerBox(player) {
  return {
    x: player.x + PLAYER_OX,
    y: player.y + PLAYER_OY,
    w: PLAYER_W,
    h: PLAYER_H,
  };
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

export class Player {
  constructor(kind, x, y, images, world) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.world = world;
    this.image = images[kind];
    this.width = PLAYER_W;
    this.height = PLAYER_H;

    this.controlled = false;
    this.visible = true;
    this.alpha = 1;
    this.isDrawing = true;
    this.following = false;
    this.dead = false;
    this.pushing = null;
    this.direction = true;
    this.autoDirection = 1;

    this.gravity = 0;
    this.onGround = false;
    this.isJumping = false;
    this.jumping = 16;
    this.jumpSpeed = 400;
    this.jumpValue = 400;
    this.fallStartY = 0;
    this.landedThisFrame = false;

    this.keys = {
      left: ["ArrowLeft"],
      right: ["ArrowRight"],
      jump: ["KeyX", "ArrowUp"],
    };

    this.animName = "stand";
    this.animFlip = false;
    this.animIndex = 0;
    this.animTime = 0;
    this.stepTimer = 0;
    this.stepOdd = false;

    this.setAnim("stand", false, true);
  }

  get inputLeft() {
    return this.world.input.isDownAny(this.keys.left);
  }

  get inputRight() {
    return this.world.input.isDownAny(this.keys.right);
  }

  get inputJumpPressed() {
    return this.world.input.wasPressedAny(this.keys.jump);
  }

  box() {
    return playerBox(this);
  }

  hitboxAt(x, y) {
    return { x: x + PLAYER_OX, y: y + PLAYER_OY, w: PLAYER_W, h: PLAYER_H };
  }

  collidesAt(x, y) {
    return this.world.collideSolids(this.hitboxAt(x, y));
  }

  setControlled(value) {
    this.controlled = value;
  }

  setAlpha(value) {
    this.alpha = value;
  }

  setAnim(name, flip = false, force = false) {
    if (!force && this.animName === name && this.animFlip === flip) return;
    this.animName = name;
    this.animFlip = flip;
    this.animEase = 0;
    this.animIndex = 0;
    this.animTime = 0;
  }

  face(left) {
    this.direction = !left;
    this.setAnim("stand", left);
  }

  walkAnim(left) {
    this.direction = !left;
    this.setAnim("walk", left);
  }

  standStill() {
    this.setAnim("stand", !this.direction);
  }

  get currentAnim() {
    return ANIMS[this.kind][this.animName] || ANIMS[this.kind].stand;
  }

  updateAnimation(dt) {
    const anim = this.currentAnim;
    this.animTime += dt;
    let guard = 0;
    while (this.animTime >= anim.delay && guard < 12) {
      this.animTime -= anim.delay;
      guard += 1;
      if (this.animIndex < anim.frames.length - 1) {
        this.animIndex += 1;
      } else if (anim.loop) {
        this.animIndex = 0;
      } else {
        this.animTime = 0;
        break;
      }
    }
  }

  playStep(dt) {
    if (!this.onGround || this.pushing) return;
    this.stepTimer -= dt;
    if (this.stepTimer > 0) return;
    this.stepTimer = 0.27;
    const which = this.stepOdd ? 2 : 1;
    this.stepOdd = !this.stepOdd;
    const file = this.kind === "josh" ? `step-josh${which}` : `step-rosie${which}`;
    this.world.playSfx(file, {
      volume: 1.2,
      pan: this.world.panFor(this.x),
    });
  }

  update(dt) {
    this.updateAnimation(dt);
    this.landedThisFrame = false;

    if (this.dead) {
      this.alpha = Math.max(0, this.alpha - dt * 3);
      return;
    }

    if (!this.visible) return;

    const previousGround = this.onGround;
    const grounded = Boolean(this.collidesAt(this.x, this.y + 1));

    if (grounded) {
      if (!previousGround) {
        const fall = this.fallStartY !== 0 ? Math.abs(this.y - this.fallStartY) : 0;
        if (fall >= FALL_LIMIT) {
          this.fallStartY = 0;
          this.world.killPlayer(this, "fall");
          return;
        }
        if (fall > 16) {
          this.world.playSfx(this.kind === "josh" ? "fall-josh" : "fall-rosie", {
            volume: 1.15,
            pan: this.world.panFor(this.x),
          });
        }
        this.fallStartY = 0;
        this.landedThisFrame = true;
      }
      this.onGround = true;
      this.isJumping = false;
      this.jumping = 16;
      this.jumpSpeed = this.jumpValue;
      this.gravity = 0;
    } else {
      this.onGround = false;
    }

    if (this.controlled) this.handleInput(dt);
    this.applyGravity(dt);

    if (this.isDrawing) this.pickAnimation();
  }

  handleInput(dt) {
    const left = this.inputLeft;
    const right = this.inputRight;
    const pushing = Boolean(this.pushing);

    if (!pushing) {
      if (left) {
        this.direction = false;
        this.moveX(-SPEED * dt);
        if (this.onGround) this.playStep(dt);
      }
      if (right) {
        this.direction = true;
        this.moveX(SPEED * dt);
        if (this.onGround) this.playStep(dt);
      }
      if (!left && !right) this.stepTimer = 0;
    } else {
      this.stepTimer = 0;
    }

    if (this.inputJumpPressed && this.onGround && this.jumpValue) {
      this.world.playSfx(this.kind === "josh" ? "jump-josh" : "jump-rosie", {
        volume: 1.15,
        pan: this.world.panFor(this.x),
      });
      this.onGround = false;
      this.jumpSpeed = this.jumpValue;
      this.jumping = 16;
      this.fallStartY = this.y;
      this.isJumping = true;
      this.jumping -= 1;
      this.moveY(-Math.ceil(this.jumpSpeed * 0.016));
    }

    if (this.isJumping && this.jumpSpeed > 0 && this.jumping > 0) {
      this.jumpSpeed -= 30;
      this.jumping -= 1;
      if (this.jumpSpeed > 0) {
        this.moveY(-Math.ceil(Math.abs(this.jumpSpeed * 0.016)));
      }
    } else {
      this.isJumping = false;
    }
  }

  applyGravity(dt) {
    if (this.onGround) return;
    if (this.isJumping && this.controlled) return;
    if (this.fallStartY === 0) this.fallStartY = this.y;
    this.gravity += GRAVITY * dt;
    const cap = 18750 * dt;
    if (this.gravity > cap) this.gravity = cap;
    this.moveY(this.gravity * dt * 1.3);
  }

  moveX(dx) {
    if (!dx) return true;
    const steps = Math.max(1, Math.ceil(Math.abs(dx) / 0.5));
    const increment = dx / steps;
    for (let i = 0; i < steps; i += 1) {
      this.x += increment;
      if (this.world.collideSolids(this.box())) {
        this.x -= increment;
        return false;
      }
    }
    return true;
  }

  moveY(dy) {
    if (!dy) return true;
    const steps = Math.max(1, Math.ceil(Math.abs(dy) / 1));
    const increment = dy / steps;
    for (let i = 0; i < steps; i += 1) {
      this.y += increment;
      if (this.world.collideSolids(this.box())) {
        this.y -= increment;
        return false;
      }
    }
    return true;
  }

  pickAnimation() {
    if (this.controlled) {
      if (this.pushing) {
        if (this.inputRight) this.setAnim("push", false);
        else if (this.inputLeft) this.setAnim("push", true);
        else this.setAnim("pushStand", !this.direction);
      } else if (this.onGround) {
        if (this.inputLeft) this.setAnim("walk", true);
        else if (this.inputRight) this.setAnim("walk", false);
        else this.setAnim("stand", !this.direction);
      } else if (this.gravity > 184) {
        this.setAnim("fall", !this.direction);
      } else if (this.jumpValue) {
        if (this.inputRight) this.setAnim("jump", false);
        else if (this.inputLeft) this.setAnim("jump", true);
        else this.setAnim("jump", !this.direction);
      }
    } else {
      this.setAnim("stand", !this.direction);
    }
  }

  kill() {
    if (this.dead) return false;
    this.dead = true;
    this.world.playSfx(this.kind === "josh" ? "die-josh" : "die-rosie", {
      volume: 1,
      pan: this.world.panFor(this.x),
    });
    this.world.onPlayerKilled(this);
    return true;
  }

  render(ctx) {
    if (!this.visible || this.alpha <= 0) return;
    const anim = this.currentAnim;
    const frame = anim.frames[Math.min(this.animIndex, anim.frames.length - 1)];
    const sheet = SHEETS[this.kind];
    const sx = (frame % sheet.cols) * sheet.frameW;
    const sy = Math.floor(frame / sheet.cols) * sheet.frameH;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    if (this.animFlip) {
      ctx.translate(this.x + 32, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, sx, sy, 32, 32, 0, 0, 32, 32);
    } else {
      ctx.drawImage(this.image, sx, sy, 32, 32, this.x, this.y, 32, 32);
    }
    ctx.restore();
  }
}

export class Heart {
  constructor(x, y, images) {
    this.x = x;
    this.y = y;
    this.image = images.heart;
    this.frame = 0;
    this.time = 0;
    this.visible = false;
    this.finished = false;
    this.onFinished = null;
  }

  play(x, y) {
    this.x = x;
    this.y = y;
    this.visible = true;
    this.frame = 0;
    this.time = 0;
    this.finished = false;
  }

  update(dt) {
    if (!this.visible || this.finished) return;
    this.time += dt;
    const target = Math.min(14, Math.floor(this.time / 0.08));
    this.frame = target;
    if (this.time >= 15 * 0.08) {
      this.finished = true;
      this.onFinished?.();
    }
  }

  render(ctx) {
    if (!this.visible) return;
    ctx.drawImage(this.image, this.frame * 49, 0, 49, 45, this.x, this.y, 49, 45);
  }
}

let cachedSpikeMask = null;

function spikeMask(image) {
  if (cachedSpikeMask) return cachedSpikeMask;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, 32, 32).data;
  const mask = new Uint8Array(32 * 32);
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = data[i * 4 + 3] > 44 ? 1 : 0;
  }
  cachedSpikeMask = mask;
  return mask;
}

export function spikeHitsPlayer(spike, player, images) {
  const mask = spikeMask(images.spike);
  const box = playerBox(player);
  const left = Math.max(0, Math.floor(box.x - spike.x));
  const right = Math.min(31, Math.ceil(box.x + box.w - spike.x));
  const top = Math.max(0, Math.floor(box.y - spike.y));
  const bottom = Math.min(31, Math.ceil(box.y + box.h - spike.y));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (!mask[y * 32 + x]) continue;
      const pixel = { x: spike.x + x, y: spike.y + y, w: 1, h: 1 };
      if (rectsOverlap(box, pixel)) return true;
    }
  }
  return false;
}
