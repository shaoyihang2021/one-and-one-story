const GAME_KEYS = new Set([
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
  "KeyA", "KeyD", "KeyW", "KeyX", "KeyZ", "KeyC", "KeyR", "KeyM",
  "Space", "Enter", "Escape", "KeyP",
]);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.virtual = new Set();
    this.capturing = false;

    window.addEventListener("keydown", (event) => {
      if (GAME_KEYS.has(event.code) && this.capturing) event.preventDefault();
      if (event.repeat) return;
      const alreadyDown = this.down.has(event.code) || this.virtual.has(event.code);
      if (!alreadyDown) {
        this.down.add(event.code);
        this.pressed.add(event.code);
      }
    });

    window.addEventListener("keyup", (event) => {
      if (this.virtual.has(event.code)) return;
      if (this.down.delete(event.code)) this.released.add(event.code);
    });

    window.addEventListener("blur", () => this.clear());
  }

  reset() {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
    this.virtual.clear();
  }

  clear() {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
    this.virtual.clear();
  }

  setCapturing(value) {
    this.capturing = value;
  }

  setVirtual(code, value) {
    if (value) {
      if (!this.down.has(code) && !this.virtual.has(code)) this.pressed.add(code);
      this.virtual.add(code);
    } else {
      if (this.virtual.delete(code)) this.released.add(code);
    }
  }

  isDown(code) {
    return this.down.has(code) || this.virtual.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  isDownAny(codes) {
    for (const code of codes) if (this.isDown(code)) return true;
    return false;
  }

  wasPressedAny(codes) {
    for (const code of codes) if (this.wasPressed(code)) return true;
    return false;
  }

  endStep() {
    this.pressed.clear();
    this.released.clear();
  }
}

export const input = new Input();
