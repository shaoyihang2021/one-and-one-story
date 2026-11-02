import {
  CHAPTERS, TITLE_LEVELS, TITLE_TEXT, chapterForLevel, modeForStoryLevel,
  STEP,
} from "./data.js";
import { SaveData } from "./save.js";
import { AudioManager } from "./audio.js";
import { loadImages, loadLevels, loadFont } from "./assets.js";
import { UI } from "./ui.js";
import { LevelScene } from "./level.js";
import { input } from "./input.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class App {
  constructor() {
    this.save = new SaveData();
    this.audio = new AudioManager({ muted: this.save.muted });
    this.ui = new UI(this);
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = true;

    this.images = null;
    this.levels = null;
    this.scene = null;
    this.mode = "boot";
    this.paused = false;
    this.focusPaused = false;
    this.transitioning = false;
    this.tutorialJumped = false;
    this.secretFalling = false;
    this.accumulator = 0;
    this.lastFrame = 0;
    this.running = false;

    this.frame = this.frame.bind(this);
    this.bindGlobalEvents();
    window.__oao = this;
  }

  bindGlobalEvents() {
    const unlock = () => {
      this.audio.unlock();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.code === "KeyM") {
        event.preventDefault();
        this.toggleMute();
        return;
      }
      if (event.code === "Escape" && !this.focusPaused) {
        if (this.mode === "title" || this.mode === "quote" || this.mode === "endcard") {
          event.preventDefault();
          this.presentMenu({ falling: false });
          return;
        }
      }
      if (this.mode !== "game") return;
      if (event.code === "KeyR" && !this.paused && !this.transitioning) {
        event.preventDefault();
        this.restartCurrentLevel();
      }
    });

    window.addEventListener("blur", () => this.pauseForFocus());
    window.addEventListener("focus", () => this.resumeFromFocus());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pauseForFocus();
      else this.resumeFromFocus();
    });
  }

  async boot() {
    this.ui.showLoading(0);
    try {
      const levelsPromise = loadLevels();
      const fontPromise = loadFont();
      const audioPromise = this.audio.load();

      this.images = await loadImages((progress) => {
        this.ui.updateLoading(progress * 0.7);
      });
      this.levels = await levelsPromise;
      await fontPromise;
      this.ui.updateLoading(0.82);
      await audioPromise;
      this.ui.updateLoading(0.98);

      this.audio.setMuted(this.save.muted);
      this.ui.setMuted(this.save.muted);
      this.audio.playMusic("menu");

      this.startLoop();
      this.ui.updateLoading(1);
      await wait(500);

      const params = new URLSearchParams(window.location.search);
      if (params.get("touch") === "1") this.ui.setTouchEnabled(true);
      const touchParam = params.get("touch");
      if (touchParam === "0") this.ui.setTouchEnabled(false);

      await this.ui.fadeOut();
      const storyJump = params.get("level");
      const coopJump = params.get("coop");
      if (storyJump !== null && /^\d+$/.test(storyJump)) {
        this.presentStoryEntry(Math.max(0, Math.min(19, Number(storyJump))), { showTitle: false });
      } else if (coopJump !== null && /^\d+$/.test(coopJump)) {
        this.presentCoopEntry(Math.max(0, Math.min(10, Number(coopJump))));
      } else {
        this.presentMenu({ falling: false });
      }
      await this.ui.fadeIn();
    } catch (error) {
      console.error(error);
      const hint = window.location.protocol === "file:"
        ? "Serve this folder over HTTP (npm start) and reload."
        : "The game could not load. Please reload.";
      this.ui.showError(hint);
    }
  }

  startLoop() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.frame);
  }

  frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    if (this.mode === "game" && this.scene && !this.paused && !this.transitioning && !this.ui.screenName) {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= STEP && steps < 6) {
        this.scene.update(STEP);
        input.endStep();
        this.accumulator -= STEP;
        steps += 1;
        if (this.transitioning) break;
      }
      if (steps === 0 && this.accumulator > 0) {
        // Keep the accumulator bounded while catching up.
      }
    } else {
      this.accumulator = 0;
    }

    this.audio.update(dt);

    if (this.mode === "game" && this.scene) {
      this.scene.render(this.ctx);
    }

    requestAnimationFrame(this.frame);
  }

  hudConfig(scene) {
    return {
      label: scene.hudLabel,
      switchVisible: scene.hudSwitchVisible,
      switchToRosie: scene.hudSwitchToRosie,
      restartVisible: scene.hudRestartVisible,
      touchLayout: scene.hudTouchLayout,
      narrative: scene.narrativeText,
      narrativeAlign: scene.narrativeAlign,
      levelRight: scene.hudLevelRight,
      helpVisible: scene.hudHelpVisible,
    };
  }

  refreshHUD() {
    if (this.mode === "game" && this.scene && !this.paused && !this.ui.screenName) {
      this.ui.applyHUD(this.hudConfig(this.scene));
    }
  }

  presentMenu({ falling = false } = {}) {
    this.mode = "menu";
    this.scene = null;
    this.paused = false;
    this.focusPaused = false;
    this.secretFalling = Boolean(falling);
    input.clear();
    input.setCapturing(false);
    this.audio.stopAmbience(true);
    this.audio.setDucked(false);
    this.audio.playMusic("menu");

    this.ui.showMenu({
      bonus: this.save.bonus,
      falling: this.secretFalling,
      onStart: () => this.startFromMenu(),
      onChapters: () => this.presentChapters(),
      onBonus: () => this.startCoop(0),
      onCredits: () => this.presentCredits({ achievement: false }),
      onSecret: () => this.unlockBonusBySecret(),
    });
  }

  startFromMenu() {
    if (this.save.chapter === 0) {
      this.mode = "menu";
      this.audio.playMusic("menu");
      this.ui.showMenuTip({ onDone: () => this.startStoryIntro() });
    } else {
      this.startStoryIntro();
    }
  }

  presentChapters() {
    this.mode = "chapters";
    this.scene = null;
    this.secretFalling = false;
    this.audio.stopAmbience(true);
    this.audio.setDucked(false);
    this.audio.playMusic("menu");
    input.clear();
    input.setCapturing(false);
    this.ui.showChapters({
      unlocked: this.save.chapter,
      onSelect: (chapterNumber) => this.enterChapter(chapterNumber),
      onBack: () => this.presentMenu({ falling: false }),
    });
  }

  enterChapter(chapterNumber) {
    const chapter = CHAPTERS.find((entry) => entry.number === chapterNumber);
    if (!chapter || chapter.number > this.save.chapter) return;
    this.secretFalling = false;
    this.audio.playMusic("game");
    this.goToStoryEntry(chapter.start, { showTitle: true });
  }

  presentCredits({ achievement = false } = {}) {
    this.mode = "credits";
    this.scene = null;
    this.secretFalling = false;
    this.audio.stopAmbience(true);
    this.audio.setDucked(false);
    this.audio.playMusic("menu");
    input.clear();
    input.setCapturing(false);
    this.ui.showCredits({
      achievement,
      onBack: () => this.presentMenu({ falling: false }),
    });
  }

  startStoryIntro() {
    this.save.patch({ complete: false, level: 0 });
    this.tutorialJumped = false;
    this.secretFalling = false;
    this.mode = "quote";
    this.scene = null;
    this.paused = false;
    this.focusPaused = false;
    input.clear();
    input.setCapturing(false);
    this.audio.stopAmbience(true);
    this.audio.setDucked(false);
    this.audio.playMusic("game");
    this.ui.showQuote({
      onDone: () => this.loadStoryLevelNow(0),
    });
  }

  goToStoryEntry(index, { showTitle = false } = {}) {
    this.secretFalling = false;
    this.transitionTo(() => this.presentStoryEntry(index, { showTitle }));
  }

  presentStoryEntry(index, { showTitle = false } = {}) {
    const safeIndex = Math.max(0, Math.min(19, Number(index) || 0));
    this.save.setLevel(safeIndex);
    this.save.unlockChapter(chapterForLevel(safeIndex));
    this.save.setComplete(false);
    this.paused = false;
    this.secretFalling = false;
    this.audio.setDucked(false);
    this.audio.stopAmbience(true);
    this.audio.playMusic("game");
    input.clear();
    input.setCapturing(false);
    this.ui.clearScreen();

    if (showTitle && TITLE_TEXT[safeIndex]) {
      this.mode = "title";
      this.scene = null;
      this.ui.showTitle({
        texts: TITLE_TEXT[safeIndex],
        onDone: () => {
          this.transitionTo(() => this.loadStoryLevelNow(safeIndex));
        },
      });
    } else {
      this.loadStoryLevelNow(safeIndex);
    }
  }

  loadStoryLevelNow(index) {
    const safeIndex = Math.max(0, Math.min(19, Number(index) || 0));
    this.mode = "game";
    this.scene = null;
    this.paused = false;
    this.secretFalling = false;
    this.audio.setDucked(false);
    this.audio.playMusic("game");
    this.save.setLevel(safeIndex);
    this.save.unlockChapter(chapterForLevel(safeIndex));
    this.ui.clearScreen();

    this.scene = new LevelScene(this, {
      kind: "story",
      index: safeIndex,
      data: this.levels.story[safeIndex],
      mode: modeForStoryLevel(safeIndex),
      tutorialJumped: this.tutorialJumped,
    });

    this.ui.showGameHUD(this.hudConfig(this.scene));
    input.clear();
    input.setCapturing(true);
    this.accumulator = 0;
  }

  presentCoopEntry(index) {
    if (index > 10) {
      this.showCoopCredits();
      return;
    }
    const safeIndex = Math.max(0, Math.min(10, Number(index) || 0));
    this.mode = "game";
    this.scene = null;
    this.paused = false;
    this.secretFalling = false;
    this.audio.setDucked(false);
    this.audio.stopAmbience(true);
    this.audio.playMusic("game");
    input.clear();
    input.setCapturing(false);
    this.ui.clearScreen();

    this.scene = new LevelScene(this, {
      kind: "coop",
      index: safeIndex,
      data: this.levels.coop[safeIndex],
      mode: "coop",
      tutorialJumped: false,
    });

    this.ui.showGameHUD(this.hudConfig(this.scene));
    input.clear();
    input.setCapturing(true);
    this.accumulator = 0;
  }

  goToCoopEntry(index) {
    this.transitionTo(() => this.presentCoopEntry(index));
  }

  startCoop(index = 0) {
    if (!this.save.bonus) return;
    this.secretFalling = false;
    this.audio.playMusic("game");
    this.goToCoopEntry(index);
  }

  advanceCoop(index) {
    if (index > 10) this.showCoopCredits();
    else this.goToCoopEntry(index);
  }

  showCoopCredits() {
    this.transitionTo(() => {
      this.mode = "credits";
      this.scene = null;
      this.paused = false;
      this.audio.stopAmbience(true);
      this.audio.playMusic("menu");
      input.setCapturing(false);
      this.ui.showCredits({
        achievement: false,
        onBack: () => this.presentMenu({ falling: false }),
      });
    });
  }

  onLevelComplete(scene) {
    if (scene.kind === "story") {
      if (scene.index === 19) {
        this.save.setBonus(true);
        this.save.setComplete(true);
        this.save.unlockChapter(8);
        this.goToEndTitle();
        return;
      }
      const next = scene.index + 1;
      this.save.setLevel(next);
      this.save.unlockChapter(chapterForLevel(next));
      this.goToStoryEntry(next, { showTitle: TITLE_LEVELS.has(next) });
      return;
    }

    if (scene.kind === "coop") {
      if (scene.index >= 10) {
        this.showCoopCredits();
      } else {
        this.goToCoopEntry(scene.index + 1);
      }
    }
  }

  goToEndTitle() {
    this.transitionTo(() => {
      this.mode = "endcard";
      this.scene = null;
      this.audio.stopAmbience(true);
      this.audio.setDucked(false);
      input.setCapturing(false);
      this.ui.showEndTitle({
        onDone: () => this.goToFinalCredits(),
      });
    });
  }

  goToFinalCredits() {
    this.transitionTo(() => {
      this.mode = "credits";
      this.audio.playMusic("menu");
      this.ui.showCredits({
        achievement: true,
        onBack: () => this.presentMenu({ falling: false }),
      });
    });
  }

  secretEnding() {
    this.save.setBonus(true);
    this.save.unlockChapter(8);
    this.save.setLevel(19);
    this.transitionTo(() => {
      this.mode = "title";
      this.scene = null;
      this.audio.stopAmbience(true);
      this.audio.playMusic("menu");
      input.setCapturing(false);
      this.ui.showTitle({
        texts: TITLE_TEXT[111],
        onDone: () => {
          this.secretFalling = true;
          this.transitionTo(() => this.presentMenu({ falling: true }));
        },
      });
    });
  }

  pauseForFocus() {
    if (this.mode === "boot" || this.focusPaused) return;
    if (this.ui.screenName === "loading" || this.ui.screenName === "error") return;
    this.focusPaused = true;
    this.paused = true;
    this.accumulator = 0;
    input.clear();
    input.setCapturing(false);
    this.audio.setSuspended(true);
    this.ui.showFocusPause();
  }

  resumeFromFocus() {
    if (!this.focusPaused) return;
    this.focusPaused = false;
    this.paused = false;
    this.audio.setSuspended(false);
    this.ui.hideFocusPause();
    input.clear();
    input.setCapturing(this.mode === "game" && !this.transitioning && !this.ui.screenName);
    if (this.mode === "game" && this.scene && !this.ui.screenName) {
      this.ui.showGameHUD(this.hudConfig(this.scene));
    }
    this.accumulator = 0;
  }

  openGuide() {
    window.open(
      "http://armorgames.com/guide/one-and-one-story-video-guide",
      "_blank",
      "noopener,noreferrer",
    );
  }

  restartCurrentLevel() {
    if (!this.scene) return;
    const info = {
      kind: this.scene.kind,
      index: this.scene.index,
      tutorialJumped: this.scene.tutorialJumped,
    };
    this.paused = false;
    this.audio.setDucked(false);
    this.secretFalling = false;
    input.clear();
    this.transitionTo(() => this.reloadScene(info));
  }

  restartLevel({ tutorialJumped = this.tutorialJumped } = {}) {
    if (!this.scene) return;
    const info = {
      kind: this.scene.kind,
      index: this.scene.index,
    };
    this.tutorialJumped = tutorialJumped;
    this.paused = false;
    this.audio.setDucked(false);
    input.clear();
    this.transitionTo(() => this.reloadScene(info));
  }

  reloadScene(info) {
    if (info.kind === "coop") {
      this.presentCoopEntry(info.index);
    } else {
      this.loadStoryLevelNow(info.index);
    }
  }

  leaveToMenu() {
    this.scene = null;
    this.paused = false;
    input.clear();
    input.setCapturing(false);
    this.audio.stopAmbience(true);
    this.audio.setDucked(false);
    this.audio.playMusic("menu");
    this.transitionTo(() => this.presentMenu({ falling: false }));
  }

  toggleMute() {
    this.audio.unlock();
    const next = !this.save.muted;
    this.save.setMuted(next);
    this.audio.setMuted(next);
    this.ui.setMuted(next);
  }

  unlockBonusBySecret() {
    if (this.mode !== "menu") return;
    this.save.setBonus(true);
    this.audio.playSfx("kiss", { volume: 1 });
  }

  async transitionTo(build) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.accumulator = 0;
    input.setCapturing(false);
    this.audio.setDucked(false);
    await this.ui.fadeOut();
    this.ui.clearScreen();
    await build();
    this.transitioning = false;
    input.setCapturing(this.mode === "game" && !this.paused && !this.ui.screenName);
    await this.ui.fadeIn();
  }
}
