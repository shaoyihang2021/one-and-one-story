import { input } from "./input.js";
import { assetUrl } from "./embedded.js";

const CHAPTER_BUTTONS = [
  { width: 192, height: 19 },
  { width: 260, height: 20 },
  { width: 202, height: 23 },
  { width: 263, height: 20 },
  { width: 216, height: 23 },
  { width: 264, height: 24 },
  { width: 118, height: 19 },
  { width: 181, height: 23 },
];
const LOCKED_BUTTON = { width: 29, height: 19 };
const SMOKE_SIZES = { 1: [501, 422], 2: [573, 417], 3: [476, 397] };

const SPONSORS = [
  { cls: "shield", key: "ag-shield", url: "http://www.armorgames.com" },
  { cls: "ag-text", key: "ag-text", url: "http://www.armorgames.com" },
  { cls: "like-us", key: "like-us", url: "http://www.facebook.com/ArmorGames" },
];

const SKIP_KEYS = ["Space", "Enter", "NumpadEnter"];

function external(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export class UI {
  constructor(app) {
    this.app = app;
    this.overlay = document.getElementById("overlay");
    this.hud = document.getElementById("hud");
    this.narrativeEl = document.getElementById("narrative");
    this.touchEl = document.getElementById("touch");
    this.focusPause = document.getElementById("focusPause");
    this.fadeEl = document.getElementById("fade");

    this.hudQuit = document.getElementById("hudQuit");
    this.hudAudio = document.getElementById("hudAudio");
    this.hudAudioIcon = document.getElementById("hudAudioIcon");
    this.hudRestart = document.getElementById("hudRestart");
    this.hudSwitch = document.getElementById("hudSwitch");
    this.hudSwitchIcon = document.getElementById("hudSwitchIcon");
    this.hudHelp = document.getElementById("hudHelp");
    this.hudLevel = document.getElementById("hudLevel");

    this.screen = null;
    this.screenName = "";
    this.timers = [];
    this.cleanup = [];
    this.touchLayout = null;
    this.touchEnabled = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches || false;
    this.gameHudVisible = false;
    this.muted = false;
    this.menuBonusUnlocked = false;
    this.achievementTimers = [];

    this.bindHud();
    this.bindTouchActivation();
    this.focusPause.addEventListener("click", () => this.app.resumeFromFocus?.());
  }

  bindHud() {
    this.hudQuit.addEventListener("click", () => this.app.leaveToMenu());
    this.hudRestart.addEventListener("click", () => this.app.restartCurrentLevel());
    this.hudAudio.addEventListener("click", () => this.app.toggleMute());
    this.hudSwitch.addEventListener("click", () => this.app.scene?.switchPlayer());
    this.hudHelp.addEventListener("click", () => this.app.openGuide());
  }

  bindTouchActivation() {
    const enable = (event) => {
      if (event.pointerType !== "touch") return;
      this.touchEnabled = true;
      if (this.gameHudVisible && this.app.mode === "game") {
        this.buildTouch(this.touchLayout);
        this.touchEl.classList.remove("is-hidden");
      }
    };
    window.addEventListener("pointerdown", enable, { passive: true });
  }

  setTouchEnabled(value) {
    this.touchEnabled = Boolean(value);
    if (this.gameHudVisible) {
      this.buildTouch(this.touchLayout);
      this.touchEl.classList.toggle("is-hidden", !this.touchEnabled);
    }
  }

  addTimer(fn, ms) {
    const id = setTimeout(fn, ms);
    this.timers.push(id);
    return id;
  }

  clearTimers() {
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
  }

  clearCleanup() {
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
  }

  clearScreen() {
    this.clearTimers();
    this.clearCleanup();
    if (this.screen) this.screen.remove();
    this.screen = null;
    this.screenName = "";
    this.overlay.replaceChildren();
  }

  audioMarkup(cls = "menu-audio") {
    const icon = assetUrl(`assets/img/ui/${this.muted ? "icon-audio-off" : "icon-audio-on"}.png`);
    return `<button class="${cls} js-audio" type="button" aria-label="Toggle sound"><img src="${icon}" alt=""></button>`;
  }

  screenHudMarkup() {
    return `<div class="screen-hud">
      <button class="js-quit" type="button" aria-label="Quit to menu"><img src="${assetUrl("assets/img/ui/icon-exit.png")}" alt=""></button>
      ${this.audioMarkup("screen-audio")}
    </div>`;
  }

  sponsorMarkup() {
    return SPONSORS.map(({ cls, key, url }) => `
      <button class="menu-sponsor ${cls}" type="button" data-url="${url}" aria-label="Armor Games">
        <img src="${assetUrl(`assets/img/ui/${key}.png`)}" alt="">
      </button>`).join("");
  }

  showScreen(name, className, html) {
    document.getElementById("bootFallback")?.classList.add("is-hidden");
    this.clearScreen();
    this.hideGameLayer();
    const screen = document.createElement("div");
    screen.className = `screen ${className}`;
    screen.innerHTML = html;
    this.overlay.append(screen);
    this.screen = screen;
    this.screenName = name;
    screen.classList.add("is-visible");
    this.refreshAudioButtons();
    this.bindAudioButtons(screen);
    return screen;
  }

  bindAudioButtons(screen) {
    for (const button of screen.querySelectorAll(".js-audio")) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.app.toggleMute();
      });
    }
  }

  bindSponsors(screen) {
    for (const button of screen.querySelectorAll("[data-url]")) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        external(button.dataset.url);
      });
    }
  }

  bindQuit(screen, onBack) {
    const quit = screen.querySelector(".js-quit");
    if (quit && onBack) {
      quit.addEventListener("click", (event) => {
        event.stopPropagation();
        onBack();
      });
    }
  }

  bindKey(handler) {
    window.addEventListener("keydown", handler);
    this.cleanup.push(() => window.removeEventListener("keydown", handler));
  }

  hideGameLayer() {
    this.gameHudVisible = false;
    this.hud.classList.add("is-hidden");
    this.hud.setAttribute("aria-hidden", "true");
    this.touchEl.classList.add("is-hidden");
    this.touchEl.setAttribute("aria-hidden", "true");
    this.narrativeEl.classList.remove("is-visible");
  }

  setNarrative(text, align = "center") {
    this.narrativeEl.classList.toggle("is-left", align === "left");
    if (!text) {
      this.narrativeEl.classList.remove("is-visible");
      this.narrativeEl.textContent = "";
      return;
    }
    if (this.narrativeEl.textContent !== text) this.narrativeEl.textContent = text;
    this.narrativeEl.classList.add("is-visible");
  }

  showGameHUD(config) {
    this.gameHudVisible = true;
    this.applyHUD(config);
    this.hud.classList.remove("is-hidden");
    this.hud.setAttribute("aria-hidden", "false");
    if (config?.narrative) this.setNarrative(config.narrative, config.narrativeAlign);
    this.buildTouch(config?.touchLayout || "single");
    this.touchEl.classList.toggle("is-hidden", !this.touchEnabled);
    this.touchEl.setAttribute("aria-hidden", String(!this.touchEnabled));
  }

  applyHUD(config = {}) {
    const {
      label = "",
      switchVisible = false,
      switchToRosie = true,
      restartVisible = true,
      helpVisible = true,
      levelRight = 10,
      touchLayout = "single",
    } = config;

    this.hudLevel.textContent = label;
    this.hudLevel.style.right = `calc(var(--u) * ${levelRight})`;
    this.hudSwitch.classList.toggle("is-hidden", !switchVisible);
    this.hudRestart.classList.toggle("is-hidden", !restartVisible);
    this.hudHelp.classList.toggle("is-hidden", !helpVisible);
    this.hudSwitchIcon.src = assetUrl(`assets/img/ui/${switchToRosie ? "icon-switch-j2r" : "icon-switch-r2j"}.png`);
    this.touchLayout = touchLayout;
    this.buildTouch(touchLayout);
  }

  buildTouch(layout) {
    if (!layout) return;
    if (this.touchLayout === layout && this.touchEl.childElementCount) return;
    this.touchLayout = layout;
    const iconLeft = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5L8 12l7 7V5z"/></svg>';
    const iconRight = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7V5z"/></svg>';
    const iconUp = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l7 8h-4v8H9v-8H5l7-8z"/></svg>';
    if (layout === "coop") {
      this.touchEl.innerHTML = `
        <div class="touch-coop">
          <div class="coop-side rosie">
            <span class="coop-name">Rosie</span>
            <div class="coop-buttons">
              <button class="touch-btn" data-code="KeyA" type="button" aria-label="Rosie left">${iconLeft}</button>
              <button class="touch-btn" data-code="KeyD" type="button" aria-label="Rosie right">${iconRight}</button>
              <button class="touch-btn" data-code="KeyW" type="button" aria-label="Rosie jump">${iconUp}</button>
            </div>
          </div>
          <div class="coop-side josh">
            <span class="coop-name">Josh</span>
            <div class="coop-buttons">
              <button class="touch-btn" data-code="ArrowLeft" type="button" aria-label="Josh left">${iconLeft}</button>
              <button class="touch-btn" data-code="ArrowRight" type="button" aria-label="Josh right">${iconRight}</button>
              <button class="touch-btn" data-code="ArrowUp" type="button" aria-label="Josh jump">${iconUp}</button>
            </div>
          </div>
        </div>`;
    } else {
      this.touchEl.innerHTML = `
        <div class="touch-single">
          <div class="touch-move">
            <button class="touch-btn" data-code="ArrowLeft" type="button" aria-label="Move left">${iconLeft}</button>
            <button class="touch-btn" data-code="ArrowRight" type="button" aria-label="Move right">${iconRight}</button>
          </div>
          <div class="touch-actions">
            <button class="touch-btn jump" data-code="KeyX" type="button" aria-label="Jump">${iconUp}</button>
          </div>
        </div>`;
    }
    this.bindTouchButtons();
  }

  bindTouchButtons() {
    for (const button of this.touchEl.querySelectorAll(".touch-btn")) {
      const code = button.dataset.code;
      const press = (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.classList.add("is-pressed");
        input.setVirtual(code, true);
        button.setPointerCapture?.(event.pointerId);
      };
      const release = (event) => {
        event?.preventDefault?.();
        button.classList.remove("is-pressed");
        input.setVirtual(code, false);
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", (event) => {
        if (button.hasPointerCapture?.(event.pointerId)) return;
        release(event);
      });
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    }
  }

  refreshAudioButtons() {
    for (const img of document.querySelectorAll(".js-audio img")) {
      img.src = assetUrl(`assets/img/ui/${this.muted ? "icon-audio-off" : "icon-audio-on"}.png`);
    }
    this.hudAudioIcon.src = assetUrl(`assets/img/ui/${this.muted ? "icon-audio-off" : "icon-audio-on"}.png`);
    this.hudAudio.setAttribute("aria-label", this.muted ? "Turn sound on" : "Turn sound off");
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.refreshAudioButtons();
  }

  showFocusPause() {
    document.getElementById("stage").classList.add("is-focus-paused");
    this.focusPause.classList.remove("is-hidden");
    this.focusPause.setAttribute("aria-hidden", "false");
  }

  hideFocusPause() {
    document.getElementById("stage").classList.remove("is-focus-paused");
    this.focusPause.classList.add("is-hidden");
    this.focusPause.setAttribute("aria-hidden", "true");
  }

  showLoading(progress = 0) {
    const logo = assetUrl("assets/img/ui/logo.png");
    const blur = assetUrl("assets/img/ui/logo-blur.png");
    const screen = this.showScreen("loading", "loading", `
      <div class="loading-inner">
        <div class="loading-logo-wrap">
          <img class="loading-logo-blur" src="${blur}" alt="">
          <img src="${logo}" alt="One and One Story">
        </div>
        <div class="loading-bar"><span></span></div>
        <div class="loading-label"></div>
      </div>`);
    screen.classList.add("is-static");
    this.updateLoading(progress);
  }

  updateLoading(progress = 0) {
    if (!this.screen || this.screenName !== "loading") return;
    const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
    const bar = this.screen.querySelector(".loading-bar span");
    const label = this.screen.querySelector(".loading-label");
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${pct < 100 ? "loading" : "ready"} ${pct}%`;
  }

  showError(message) {
    this.showScreen("error", "loading", `
      <div class="loading-inner">
        <div class="loading-logo-wrap">
          <img class="loading-logo-blur" src="${assetUrl("assets/img/ui/logo-blur.png")}" alt="">
          <img src="${assetUrl("assets/img/ui/logo.png")}" alt="One and One Story">
        </div>
        <div class="loading-label">${message}</div>
      </div>`);
  }

  showMenu({ bonus = false, falling = false, onStart, onChapters, onBonus, onCredits, onSecret }) {
    this.menuBonusUnlocked = Boolean(bonus);
    const screen = this.showScreen("menu", "menu", `
      <div class="screen-bg"></div>
      <img class="menu-logo-blur" src="${assetUrl("assets/img/ui/logo-blur.png")}" alt="">
      <img class="menu-logo" src="${assetUrl("assets/img/ui/logo.png")}" alt="One and One Story">
      <button class="menu-option start is-selected" type="button" data-action="start">
        <img src="${assetUrl("assets/img/ui/menu-btn-start.png")}" alt="Start">
      </button>
      <button class="menu-option chapters" type="button" data-action="chapters">
        <img src="${assetUrl("assets/img/ui/menu-btn-chapters.png")}" alt="Chapter Selection">
      </button>
      <button class="menu-option bonus" type="button" data-action="bonus">
        <img src="${assetUrl("assets/img/ui/menu-btn-bonus.png")}" alt="Bonus Mode">
      </button>
      <button class="menu-option credits" type="button" data-action="credits">
        <img src="${assetUrl("assets/img/ui/menu-btn-credits.png")}" alt="Credits">
      </button>
      <div class="menu-box"><img src="${assetUrl("assets/img/ui/box.png")}" alt="Finish the game to unlock this game mode."></div>
      ${this.sponsorMarkup()}
      ${this.audioMarkup()}
      ${falling ? '<div class="falling-character josh"></div><div class="falling-character rosie"></div>' : ""}
    `);
    this.bindSponsors(screen);

    const options = [...screen.querySelectorAll(".menu-option")];
    let selected = 0;
    const update = () => {
      options.forEach((option, index) => option.classList.toggle("is-selected", index === selected));
    };
    update();

    options.forEach((option, index) => {
      option.addEventListener("pointerenter", () => {
        selected = index;
        update();
      });
      option.addEventListener("focus", () => {
        selected = index;
        update();
      });
      option.addEventListener("click", () => {
        selected = index;
        update();
        this.activateMenuItem(option.dataset.action, { onStart, onChapters, onBonus, onCredits });
      });
    });

    this.bindKey((event) => {
      if (event.repeat) return;
      if (event.code === "ArrowUp") {
        event.preventDefault();
        selected = Math.max(0, selected - 1);
        update();
        options[selected].focus({ preventScroll: true });
      } else if (event.code === "ArrowDown") {
        event.preventDefault();
        selected = Math.min(options.length - 1, selected + 1);
        update();
        options[selected].focus({ preventScroll: true });
      } else if (["KeyX", "Enter", "NumpadEnter", "Space"].includes(event.code)) {
        const active = document.activeElement;
        if (active && screen.contains(active) && active.tagName === "BUTTON"
          && !active.classList.contains("menu-option")) {
          if (event.code === "KeyX") {
            event.preventDefault();
            active.click();
          }
          return;
        }
        event.preventDefault();
        this.activateMenuItem(options[selected].dataset.action, { onStart, onChapters, onBonus, onCredits });
      }
    });

    let clicks = 0;
    const logo = screen.querySelector(".menu-logo");
    logo.addEventListener("click", () => {
      clicks += 1;
      if (clicks === 3) {
        this.menuBonusUnlocked = true;
        onSecret?.();
      }
    });
    options[0].focus({ preventScroll: true });
  }

  activateMenuItem(action, callbacks) {
    if (action === "start") return callbacks.onStart?.();
    if (action === "chapters") return callbacks.onChapters?.();
    if (action === "credits") return callbacks.onCredits?.();
    if (action === "bonus") {
      if (this.menuBonusUnlocked) return callbacks.onBonus?.();
      return this.showLockedBox();
    }
  }

  showLockedBox() {
    if (!this.screen || this.screenName !== "menu") return;
    const box = this.screen.querySelector(".menu-box");
    if (!box) return;
    box.style.transitionDuration = "1.8s";
    box.classList.add("is-visible");
    this.addTimer(() => {
      box.style.transitionDuration = "2.2s";
      box.classList.remove("is-visible");
    }, 1850);
  }

  showMenuTip({ onDone }) {
    const screen = this.showScreen("disclaimer", "disclaimer", `
      <div class="screen-bg"></div>
      <div class="menu-tip"><img src="${assetUrl("assets/img/ui/tip.png")}" alt=""></div>
      ${this.sponsorMarkup()}
      ${this.audioMarkup()}
    `);
    this.bindSponsors(screen);
    const tip = screen.querySelector(".menu-tip");
    this.addTimer(() => tip.classList.add("is-visible"), 80);

    let clickable = false;
    this.addTimer(() => { clickable = true; }, 1080);
    let finished = false;
    const finish = () => {
      if (finished || !clickable) return;
      finished = true;
      onDone();
    };
    screen.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      finish();
    });
    this.bindKey((event) => {
      if (event.repeat) return;
      if (["KeyX", "Enter", "NumpadEnter", "Space"].includes(event.code)) {
        const active = document.activeElement;
        if (active && screen.contains(active) && active.tagName === "BUTTON" && event.code !== "KeyX") return;
        event.preventDefault();
        finish();
      }
    });
  }

  showChapters({ unlocked = 0, onSelect, onBack }) {
    let y = 85;
    let previousHeight = 0;
    const items = [];
    for (let i = 0; i < 8; i += 1) {
      y += 15;
      if (i > 0) y += previousHeight;
      const available = i < unlocked;
      const button = available ? CHAPTER_BUTTONS[i] : LOCKED_BUTTON;
      items.push({
        index: i,
        available,
        top: y,
        width: button.width,
        height: button.height,
        src: assetUrl(`assets/img/ui/${available ? `chapter-btn-${i + 1}` : "chapter-btn-locked"}.png`),
      });
      previousHeight = button.height;
    }

    const buttons = items.map((item) => `
      <button class="chapter-option ${item.available ? "" : "is-locked"}"
        type="button"
        data-chapter="${item.index + 1}"
        style="top:calc(var(--u) * ${item.top});width:calc(var(--u) * ${item.width})"
        ${item.available ? "" : "disabled"}>
        <img src="${item.src}" alt="Chapter ${item.index + 1}">
      </button>`).join("");

    const screen = this.showScreen("chapters", "chapters", `
      <div class="screen-bg"></div>
      <div class="chapter-list ${unlocked === 0 ? "is-empty" : ""}">${buttons}</div>
      ${this.screenHudMarkup()}
    `);
    this.bindQuit(screen, onBack);

    const options = [...screen.querySelectorAll(".chapter-option")];
    let selected = unlocked > 0 ? 1 : 0;
    const update = () => {
      for (const option of options) {
        option.classList.toggle("is-selected", Number(option.dataset.chapter) === selected);
      }
    };
    update();

    const select = (chapter) => {
      if (!chapter) return;
      selected = chapter;
      update();
    };

    for (const option of options) {
      if (option.disabled) continue;
      option.addEventListener("pointerenter", () => select(Number(option.dataset.chapter)));
      option.addEventListener("focus", () => select(Number(option.dataset.chapter)));
      option.addEventListener("click", () => {
        const chapter = Number(option.dataset.chapter);
        if (chapter > unlocked) return;
        select(chapter);
        onSelect?.(chapter);
      });
    }

    this.bindKey((event) => {
      if (event.repeat) return;
      if (event.code === "Escape") {
        event.preventDefault();
        onBack?.();
        return;
      }
      if (!unlocked) return;
      if (event.code === "ArrowUp" || event.code === "ArrowDown") {
        event.preventDefault();
        selected = Math.max(1, Math.min(unlocked, selected + (event.code === "ArrowDown" ? 1 : -1)));
        update();
        const current = options[selected - 1];
        current?.focus({ preventScroll: true });
      } else if (["KeyX", "Enter", "NumpadEnter", "Space"].includes(event.code)) {
        const active = document.activeElement;
        if (active && screen.contains(active) && active.tagName === "BUTTON"
          && !active.classList.contains("chapter-option")) {
          if (event.code === "KeyX") {
            event.preventDefault();
            active.click();
          }
          return;
        }
        event.preventDefault();
        onSelect?.(selected);
      }
    });

    if (unlocked > 0) options[0]?.focus({ preventScroll: true });
  }

  showCredits({ achievement = false, onBack }) {
    const screen = this.showScreen("credits", "credits", `
      <div class="screen-bg"></div>
      <button class="credits-hot author" type="button" data-url="http://www.mattiatraverso.com" aria-label="Mattia Traverso">
        <img src="${assetUrl("assets/img/ui/icon-home.png")}" alt="">
      </button>
      <button class="credits-hot artist" type="button" data-url="http://www.gabrielebonis.com" aria-label="Gabriele Bonis">
        <img src="${assetUrl("assets/img/ui/icon-home.png")}" alt="">
      </button>
      <button class="credits-music" type="button" data-url="http://dvgmusic.bandcamp.com/" aria-label="David Carney">
        <img class="idle-icon" src="${assetUrl("assets/img/ui/btn-snd-idl.png")}" alt="">
        <img class="hover-icon" src="${assetUrl("assets/img/ui/btn-snd.png")}" alt="">
      </button>
      <div class="credits-version">1.04</div>
      ${this.screenHudMarkup()}
      ${achievement ? `<div class="achievement-layer"><img src="${assetUrl("assets/img/ui/achievement.png")}" alt="Bonus Mode Unlocked"></div>` : ""}
    `);
    this.bindQuit(screen, onBack);
    for (const button of screen.querySelectorAll("[data-url]")) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (screen.querySelector(".achievement-layer")) return;
        external(button.dataset.url);
      });
    }
    this.bindKey((event) => {
      if (event.code === "Escape") {
        event.preventDefault();
        onBack?.();
      }
    });

    if (achievement) {
      const layer = screen.querySelector(".achievement-layer");
      this.addTimer(() => layer.classList.add("is-visible"), 40);
      this.addTimer(() => {
        layer.style.transitionDuration = "1.4s";
        layer.classList.remove("is-visible");
        this.addTimer(() => layer.remove(), 1400);
      }, 40 + 600 + 1500);
    }
  }

  smokeMarkup(kind = "title") {
    const index = 1 + Math.floor(Math.random() * 3);
    const [width, height] = SMOKE_SIZES[index];
    const top = Math.floor(Math.random() * 40);
    return `<img class="title-smoke" src="${assetUrl(`assets/img/ui/smoke${index}.png`)}"
      style="top:calc(var(--u) * ${top});width:calc(var(--u) * ${width});height:calc(var(--u) * ${height})" alt="">`;
  }

  skipMarkup() {
    return `<button class="skip-hud" type="button" aria-label="Skip">
      <img src="${assetUrl("assets/img/ui/icon-skip.png")}" alt="">
    </button>`;
  }

  showTitle({ texts, onDone }) {
    const screen = this.showScreen("title", "title", `
      <div class="title-text"></div>
      ${this.smokeMarkup("title")}
      ${this.skipMarkup()}
    `);
    const textEl = screen.querySelector(".title-text");
    let finished = false;
    let index = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      this.clearTimers();
      onDone();
    };
    screen.querySelector(".skip-hud").addEventListener("click", (event) => {
      event.stopPropagation();
      finish();
    });
    this.bindKey((event) => {
      if (event.repeat) return;
      if (SKIP_KEYS.includes(event.code)) {
        event.preventDefault();
        finish();
      }
    });

    const step = () => {
      if (finished) return;
      if (index >= texts.length) {
        finish();
        return;
      }
      textEl.textContent = texts[index];
      this.addTimer(() => textEl.classList.add("is-visible"), 40);
      this.addTimer(() => {
        textEl.classList.remove("is-visible");
        this.addTimer(() => {
          index += 1;
          step();
        }, 1020);
      }, 40 + 1000 + 1667);
    };
    step();
  }

  showQuote({ onDone }) {
    const screen = this.showScreen("quote", "quote", `
      <img class="quote-img" src="${assetUrl("assets/img/ui/aristotle.png")}" alt="Love is one soul in two bodies. Aristotle.">
      ${this.smokeMarkup("quote")}
      ${this.skipMarkup()}
    `);
    const img = screen.querySelector(".quote-img");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.clearTimers();
      onDone();
    };
    screen.querySelector(".skip-hud").addEventListener("click", (event) => {
      event.stopPropagation();
      finish();
    });
    this.bindKey((event) => {
      if (event.repeat) return;
      if (SKIP_KEYS.includes(event.code)) {
        event.preventDefault();
        finish();
      }
    });
    this.addTimer(() => img.classList.add("is-visible"), 40);
    this.addTimer(finish, 40 + 1000 + 1667 + 1000);
  }

  showEndTitle({ onDone }) {
    const screen = this.showScreen("endcard", "endcard", `
      <img class="endcard-img" src="${assetUrl("assets/img/ui/end-title.png")}" alt="The End">
    `);
    const img = screen.querySelector(".endcard-img");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    this.addTimer(() => img.classList.add("is-visible"), 40);
    this.addTimer(finish, 40 + 2000 + 1667 + 2000);
  }

  async fadeOut() { this.fadeEl.style.opacity = "0"; }
  async fadeIn() { this.fadeEl.style.opacity = "0"; }
  setFade() {}
}
