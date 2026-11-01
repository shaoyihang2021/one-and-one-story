const KEY = "one-and-one-story.save.v2";

const DEFAULTS = {
  version: 2,
  chapter: 0,
  bonus: false,
  complete: false,
  level: 0,
  muted: false,
};

export class SaveData {
  constructor() {
    this.data = { ...DEFAULTS };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.data = { ...DEFAULTS, ...parsed };
      this.data.chapter = Math.max(0, Math.min(8, Number(this.data.chapter) || 0));
      this.data.level = Math.max(0, Math.min(19, Number(this.data.level) || 0));
      this.data.bonus = Boolean(this.data.bonus);
      this.data.complete = Boolean(this.data.complete);
      this.data.muted = Boolean(this.data.muted);
    } catch (error) {
      console.warn("Save data could not be read.", error);
    }
  }

  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (error) {
      console.warn("Save data could not be written.", error);
    }
  }

  patch(values) {
    this.data = { ...this.data, ...values };
    this.write();
  }

  get chapter() {
    return this.data.chapter;
  }

  get bonus() {
    return this.data.bonus;
  }

  get complete() {
    return this.data.complete;
  }

  get level() {
    return this.data.level;
  }

  get muted() {
    return this.data.muted;
  }

  get hasProgress() {
    return this.data.chapter > 0 || this.data.bonus;
  }

  unlockChapter(chapter) {
    const next = Math.max(this.data.chapter, Math.min(8, Number(chapter) || 0));
    if (next !== this.data.chapter) this.patch({ chapter: next });
  }

  setLevel(level) {
    this.patch({ level: Math.max(0, Math.min(19, Number(level) || 0)) });
  }

  setBonus(value = true) {
    if (this.data.bonus !== value) this.patch({ bonus: value });
  }

  setComplete(value = true) {
    if (this.data.complete !== value) this.patch({ complete: value });
  }

  setMuted(value) {
    if (this.data.muted !== value) this.patch({ muted: value });
  }
}
