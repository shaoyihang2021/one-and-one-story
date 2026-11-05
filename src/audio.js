const EMBEDDED = globalThis.__ONE_AND_ONE_EMBEDDED__;
const AUDIO_ROOT = new URL("assets/audio/", document.baseURI);

const SFX_FILES = {
  "jump-josh": "jump-josh.mp3",
  "jump-rosie": "jump-rosie.mp3",
  "fall-josh": "fall-josh.mp3",
  "fall-rosie": "fall-rosie.mp3",
  "step-josh1": "step-josh1.mp3",
  "step-josh2": "step-josh2.mp3",
  "step-rosie1": "step-rosie1.mp3",
  "step-rosie2": "step-rosie2.mp3",
  "die-josh": "die-josh.mp3",
  "die-rosie": "die-rosie.mp3",
  kiss: "kiss.mp3",
  switch: "switch.mp3",
  "land-stone": "land-stone.mp3",
  "move-stone": "move-stone.mp3",
};

const MUSIC_FILES = {
  menu: "menu-ost.mp3",
  game: "game-ost.mp3",
};

const AMBIENCE_FILES = {
  day: "amb-day.mp3",
  night: "amb-night.mp3",
};

export class AudioManager {
  constructor({ muted = false } = {}) {
    this.context = null;
    this.master = null;
    this.buffers = new Map();
    this.unlocked = false;
    this.muted = Boolean(muted);
    this.suspended = false;
    this.desiredMusic = null;
    this.music = new Map();
    this.currentMusic = null;
    this.previousMusic = null;
    this.ambience = null;
    this.ambienceName = null;
    this.ambienceLevel = 0;
    this.ambienceTarget = 0;
    this.ducked = false;
    this.loading = null;

    this.musicLevel = () => (this.muted || this.suspended ? 0 : this.ducked ? 0.24 : 0.68);
  }

  ensureContext() {
    if (this.context) return this.context;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      this.context = new Ctx();
      this.master = this.context.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(this.context.destination);
      return this.context;
    } catch (error) {
      console.warn("Web Audio is unavailable.", error);
      this.context = null;
      this.master = null;
      return null;
    }
  }

  fileUrl(file) {
    return EMBEDDED?.files?.[`assets/audio/${file}`] || new URL(file, AUDIO_ROOT).href;
  }

  async audioBytes(url) {
    if (url.startsWith("data:")) {
      const comma = url.indexOf(",");
      const header = url.slice(5, comma);
      if (!header.includes("base64")) throw new Error("Expected a base64 audio payload.");
      const binary = atob(url.slice(comma + 1));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
    return response.arrayBuffer();
  }

  async unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      await ctx.resume();
    } catch (error) {
      console.warn("Audio could not resume.", error);
    }
    this.unlocked = true;
    if (this.desiredMusic) this.startMusic(this.desiredMusic);
    if (this.ambience && this.ambience.audio.paused && this.ambienceTarget > 0) {
      const promise = this.ambience.audio.play();
      if (promise?.catch) promise.catch(() => {});
    }
  }

  async load(onProgress) {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const ctx = this.ensureContext();
      if (!ctx) {
        onProgress?.(1);
        return;
      }
      const entries = Object.entries(SFX_FILES);
      let completed = 0;
      await Promise.all(entries.map(async ([name, file]) => {
        try {
          const data = await this.audioBytes(this.fileUrl(file));
          const buffer = await ctx.decodeAudioData(data);
          this.buffers.set(name, buffer);
        } catch (error) {
          console.warn(`Could not load sound ${name}.`, error);
        } finally {
          completed += 1;
          onProgress?.(completed / entries.length);
        }
      }));
    })();
    return this.loading;
  }

  playSfx(name, { volume = 1, pan = 0 } = {}) {
    if (!this.unlocked || this.muted) return;
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(name);
    if (!ctx || !buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = Math.min(1.5, volume);
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    source.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    source.start(0);
  }

  getMusicElement(name) {
    if (!MUSIC_FILES[name]) return null;
    let entry = this.music.get(name);
    if (!entry) {
      const audio = new Audio(this.fileUrl(MUSIC_FILES[name]));
      audio.loop = true;
      audio.preload = "auto";
      entry = { audio, mix: 0, target: 0, name };
      this.music.set(name, entry);
    }
    return entry;
  }

  playMusic(name) {
    this.desiredMusic = name;
    if (this.unlocked) this.startMusic(name);
  }

  startMusic(name) {
    const entry = this.getMusicElement(name);
    if (!entry) return;
    if (this.currentMusic === entry) return;

    const previous = this.currentMusic;
    this.currentMusic = entry;
    this.previousMusic = previous;
    entry.target = 1;
    if (!this.muted && !this.suspended && !this.currentMusicStartedPlay(entry)) {
      entry.audio.currentTime = 0;
      const promise = entry.audio.play();
      if (promise?.catch) promise.catch(() => {});
    }
    if (previous) {
      previous.target = 0;
    }
  }

  currentMusicStartedPlay(entry) {
    if (!entry.audio.paused) return true;
    return false;
  }

  stopMusic(fade = true) {
    this.desiredMusic = null;
    if (this.currentMusic) {
      this.currentMusic.target = fade ? 0 : 0;
      if (!fade) this.currentMusic.audio.pause();
    }
    this.previousMusic = null;
  }

  playAmbience(name) {
    if (!AMBIENCE_FILES[name]) return;
    if (this.ambienceName === name) {
      this.ambienceTarget = 1;
      return;
    }
    this.stopAmbience(true);
    this.ambienceName = name;
    const audio = new Audio(this.fileUrl(AMBIENCE_FILES[name]));
    audio.loop = true;
    audio.preload = "auto";
    if (!this.muted && !this.suspended) {
      const promise = audio.play();
      if (promise?.catch) promise.catch(() => {});
    }
    this.ambience = { audio, level: 0 };
    this.ambienceTarget = 1;
  }

  stopAmbience(immediate = false) {
    if (!this.ambience) return;
    if (immediate) {
      this.ambience.audio.pause();
      this.ambience = null;
    } else {
      this.ambienceTarget = 0;
    }
    this.ambienceName = null;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (!this.muted) return;
    for (const entry of this.music.values()) entry.audio.pause();
    if (this.ambience?.audio) this.ambience.audio.pause();
  }

  setDucked(ducked) {
    this.ducked = Boolean(ducked);
  }

  setSuspended(suspended) {
    this.suspended = Boolean(suspended);
    if (!this.suspended) return;
    // Do not keep decoding or outputting audio behind a paused tab. The
    // update loop restarts the right track when the game resumes.
    for (const entry of this.music.values()) entry.audio.pause();
    if (this.ambience?.audio) this.ambience.audio.pause();
  }

  update(dt) {
    const level = this.musicLevel();
    for (const [name, entry] of this.music) {
      const speed = 1.1;
      if (entry.mix < entry.target) entry.mix = Math.min(entry.target, entry.mix + speed * dt);
      else if (entry.mix > entry.target) entry.mix = Math.max(entry.target, entry.mix - speed * dt);
      entry.audio.volume = Math.max(0, Math.min(1, entry.mix * level));
      if (entry === this.previousMusic && entry.mix <= 0) {
        entry.audio.pause();
        this.previousMusic = null;
      }
      if (entry.mix <= 0 && entry !== this.currentMusic) {
        entry.audio.pause();
      }
      if (this.currentMusic === entry && this.unlocked && !this.suspended && !this.muted
        && entry.audio.paused && entry.target > 0) {
        const promise = entry.audio.play();
        if (promise?.catch) promise.catch(() => {});
      }
    }

    if (this.ambience) {
      if (this.unlocked && !this.suspended && !this.muted && this.ambienceTarget > 0
        && this.ambience.audio.paused) {
        const promise = this.ambience.audio.play();
        if (promise?.catch) promise.catch(() => {});
      }
      const speed = 0.8;
      if (this.ambience.level < this.ambienceTarget) {
        this.ambience.level = Math.min(this.ambienceTarget, this.ambience.level + speed * dt);
      } else if (this.ambience.level > this.ambienceTarget) {
        this.ambience.level = Math.max(this.ambienceTarget, this.ambience.level - speed * dt);
      }
      this.ambience.audio.volume = this.muted || this.ducked || this.suspended ? 0 : this.ambience.level * 0.38;
      if (this.ambienceTarget === 0 && this.ambience.level <= 0.001) {
        this.ambience.audio.pause();
        this.ambience = null;
      }
    }
  }
}
