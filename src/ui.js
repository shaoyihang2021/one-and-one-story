import { input } from "./input.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ICON = {
  lock: '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10V7a4 4 0 0 1 8 0v3h1.2c.99 0 1.8.81 1.8 1.8v8.4c0 .99-.81 1.8-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19.2v-8.4C4 9.81 4.81 9 5.8 9H7zm2 0h4V7a2 2 0 0 0-4 0v3z"/></svg>',
  lockTiny: '<svg class="row-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10V7a4 4 0 0 1 8 0v3h1.2c.99 0 1.8.81 1.8 1.8v8.4c0 .99-.81 1.8-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19.2v-8.4C4 9.81 4.81 9 5.8 9H7zm2 0h4V7a2 2 0 0 0-4 0v3z"/></svg>',
  arrow: '<svg class="row-mark arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L4 12l7 7M4 12h16" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  skip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5l8 7-8 7V5zM17 5v14h2V5h-2z"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5L8 12l7 7V5z"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7V5z"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l7 8h-4v8H9v-8H5l7-8z"/></svg>',
};

const THANKS = [
  "Cristopher \"LostTrainDude\" Sacchi",
  "Antonio \"Anfex\" Felaco",
  "Tommaso \"_Tommo_\" Checchi",
  "Giuseppe \"Eclipse\" Navarra",
  "Andrea \"Nedra\" Settimi",
  "Federico \"Tappo\" Bovis",
  "Alessandro \"Hamcha\" Gatti",
  "Nicola \"Alemb\" Fabiani",
  "Mattia \"Goo\" Russomando",
  "Paolo Taje",
  "Federico \"Reolo\" Nejrotti",
  "Davide \"xadavid\" Alessandro Fiandra",
  "Kshiti \"Gbio\" Shatty",
  "Fabio \"DrizzT\" Di Felice",
  "Ciro Continsi",
  "Aurelio \"Aucooi\" Maglione",
  "Alfredo \"Fredo\" Mariani",
  "Gabriele \"Ceppo\" Jerolimo",
  "Stefano \"Napula\" D'Alesio",
  "Francesco \"Baldo\" Baldassarri",
  "Riccardo \"hjelid\" Arena",
  "Vincenzo \"Levin\" Lettera",
];

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export class UI {
  constructor(app) {
    this.app = app;
    this.overlay = document.getElementById("overlay");
    this.hud = document.getElementById("hud");
    this.narrativeEl = document.getElementById("narrative");
    this.touchEl = document.getElementById("touch");
    this.fadeEl = document.getElementById("fade");

    this.hudPause = document.getElementById("hudPause");
    this.hudRestart = document.getElementById("hudRestart");
    this.hudAudio = document.getElementById("hudAudio");
    this.hudAudioIcon = document.getElementById("hudAudioIcon");
    this.hudSwitch = document.getElementById("hudSwitch");
    this.hudSwitchIcon = document.getElementById("hudSwitchIcon");
    this.hudLevel = document.getElementById("hudLevel");

    this.screen = null;
    this.screenName = "";
    this.timers = [];
    this.cleanup = [];
    this.touchLayout = null;
    this.touchEnabled = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches || false;
    this.gameHudVisible = false;
    this.muted = false;
    this.hintTimer = null;

    this.bindHud();
    this.bindTouchActivation();
  }

  bindHud() {
    this.hudPause.addEventListener("click", () => this.app.openPause());
    this.hudRestart.addEventListener("click", () => this.app.restartCurrentLevel());
    this.hudAudio.addEventListener("click", () => this.app.toggleMute());
    this.hudSwitch.addEventListener("click", () => this.app.scene?.switchPlayer());
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
    clearTimeout(this.hintTimer);
    if (this.screen) this.screen.remove();
    this.screen = null;
    this.screenName = "";
    this.overlay.replaceChildren();
  }

  audioMarkup() {
    return `<button class="icon-round js-audio" type="button" aria-label="Toggle sound"><img src="assets/img/ui/${this.muted ? "icon-audio-off" : "icon-audio-on"}.png" alt=""></button>`;
  }

  backMarkup(label = "Back") {
    return `<button class="text-btn js-back" type="button" data-nav>${ICON.back}<span>${label}</span></button>`;
  }

  topbar({ back = null, audio = true } = {}) {
    return `<div class="topbar"><div class="topbar-group">${back ? this.backMarkup(back) : ""}</div><div class="topbar-group">${audio ? this.audioMarkup() : ""}</div></div>`;
  }

  showScreen(name, className, html) {
    this.clearScreen();
    this.hideGameLayer();
    const screen = document.createElement("div");
    screen.className = `screen ${className}`;
    screen.innerHTML = html;
    this.overlay.append(screen);
    this.screen = screen;
    this.screenName = name;
    void screen.offsetWidth;
    screen.classList.add("is-visible");
    this.refreshAudioButtons();
    return screen;
  }

  bindAudioButtons(screen, onAudio = null) {
    for (const button of screen.querySelectorAll(".js-audio")) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (onAudio) onAudio();
        else this.app.toggleMute();
      });
    }
  }

  bindBack(screen, onBack) {
    const button = screen.querySelector(".js-back");
    if (!button || !onBack) return;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onBack();
    });
  }

  bindNav(screen, { onBack = null, focusFirst = false } = {}) {
    const getItems = () => Array.from(screen.querySelectorAll("[data-nav]:not([disabled])"));
    const move = (offset, absolute = false) => {
      const items = getItems();
      if (!items.length) return;
      const current = items.indexOf(document.activeElement);
      let next;
      if (absolute) next = offset < 0 ? items.length - 1 : 0;
      else if (current === -1) next = offset > 0 ? 0 : items.length - 1;
      else next = (current + offset + items.length) % items.length;
      items[next].focus({ preventScroll: true });
    };

    const handler = (event) => {
      if (event.code === "Escape") {
        if (!onBack) return;
        event.preventDefault();
        onBack();
        return;
      }
      if (["ArrowDown", "ArrowRight", "ArrowLeft", "ArrowUp"].includes(event.code)) {
        event.preventDefault();
        move(event.code === "ArrowDown" || event.code === "ArrowRight" ? 1 : -1);
        return;
      }
      if (["Enter", "NumpadEnter", "KeyX", "Space"].includes(event.code)) {
        const items = getItems();
        if (!items.length) return;
        const active = document.activeElement;
        if (active && screen.contains(active) && active.tagName === "BUTTON") {
          if (event.code === "KeyX") {
            event.preventDefault();
            active.click();
          }
          return;
        }
        event.preventDefault();
        items[0].click();
      }
    };

    window.addEventListener("keydown", handler);
    this.cleanup.push(() => window.removeEventListener("keydown", handler));
    if (focusFirst) {
      this.addTimer(() => {
        const items = getItems();
        items[0]?.focus({ preventScroll: true });
      }, 60);
    }
  }

  bindSkipKeys(handler) {
    const listener = (event) => {
      if (event.code === "Escape") {
        event.preventDefault();
        handler();
        return;
      }
      if (["Enter", "NumpadEnter", "Space", "KeyX"].includes(event.code)) {
        if (event.target instanceof Element && event.target.closest("button")) return;
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", listener);
    this.cleanup.push(() => window.removeEventListener("keydown", listener));
  }

  bindClickToSkip(screen, handler) {
    const listener = (event) => {
      if (event.target.closest("button")) return;
      handler();
    };
    screen.addEventListener("click", listener);
    this.cleanup.push(() => screen.removeEventListener("click", listener));
  }

  hideGameLayer() {
    this.gameHudVisible = false;
    this.hud.classList.add("is-hidden");
    this.hud.setAttribute("aria-hidden", "true");
    this.touchEl.classList.add("is-hidden");
    this.touchEl.setAttribute("aria-hidden", "true");
    this.narrativeEl.classList.remove("is-visible");
  }

  setNarrative(text) {
    if (!text) {
      this.narrativeEl.classList.remove("is-visible");
      this.narrativeEl.textContent = "";
      return;
    }
    if (this.narrativeEl.textContent !== text) {
      this.narrativeEl.textContent = text;
    }
    this.narrativeEl.classList.add("is-visible");
  }

  showGameHUD(config) {
    this.hideGameLayer();
    this.gameHudVisible = true;
    this.applyHUD(config);
    this.hud.classList.remove("is-hidden");
    this.hud.setAttribute("aria-hidden", "false");
    if (config?.narrative) this.setNarrative(config.narrative);
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
      touchLayout = "single",
    } = config;

    this.hudLevel.textContent = label;
    this.hudLevel.style.visibility = label ? "visible" : "hidden";
    this.hudSwitch.classList.toggle("is-hidden", !switchVisible);
    this.hudRestart.classList.toggle("is-hidden", !restartVisible);
    this.hudSwitchIcon.src = `assets/img/ui/${switchToRosie ? "icon-switch-j2r" : "icon-switch-r2j"}.png`;
    this.touchLayout = touchLayout;
    this.buildTouch(touchLayout);
  }

  buildTouch(layout) {
    if (!layout) return;
    if (this.touchLayout === layout && this.touchEl.childElementCount) return;
    this.touchLayout = layout;
    if (layout === "coop") {
      this.touchEl.innerHTML = `
        <div class="touch-coop">
          <div class="coop-side rosie">
            <span class="coop-name">Rosie</span>
            <div class="coop-buttons">
              <button class="touch-btn" data-code="KeyA" type="button" aria-label="Rosie left">${ICON.left}</button>
              <button class="touch-btn" data-code="KeyD" type="button" aria-label="Rosie right">${ICON.right}</button>
              <button class="touch-btn" data-code="KeyW" type="button" aria-label="Rosie jump">${ICON.up}</button>
            </div>
          </div>
          <div class="coop-side josh">
            <span class="coop-name">Josh</span>
            <div class="coop-buttons">
              <button class="touch-btn" data-code="ArrowLeft" type="button" aria-label="Josh left">${ICON.left}</button>
              <button class="touch-btn" data-code="ArrowRight" type="button" aria-label="Josh right">${ICON.right}</button>
              <button class="touch-btn" data-code="ArrowUp" type="button" aria-label="Josh jump">${ICON.up}</button>
            </div>
          </div>
        </div>`;
    } else {
      this.touchEl.innerHTML = `
        <div class="touch-single">
          <div class="touch-move">
            <button class="touch-btn" data-code="ArrowLeft" type="button" aria-label="Move left">${ICON.left}</button>
            <button class="touch-btn" data-code="ArrowRight" type="button" aria-label="Move right">${ICON.right}</button>
          </div>
          <div class="touch-actions">
            <button class="touch-btn jump" data-code="KeyX" type="button" aria-label="Jump">${ICON.up}</button>
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
      img.src = `assets/img/ui/${this.muted ? "icon-audio-off" : "icon-audio-on"}.png`;
    }
    this.hudAudioIcon.src = `assets/img/ui/${this.muted ? "icon-audio-off" : "icon-audio-on"}.png`;
    this.hudAudio.setAttribute("aria-label", this.muted ? "Turn sound on" : "Turn sound off");
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.refreshAudioButtons();
  }

  menuHint(text, ms = 2600) {
    if (!this.screen) return;
    const bubble = this.screen.querySelector(".hint-bubble");
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("is-visible");
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => bubble.classList.remove("is-visible"), ms);
  }

  showLoading(progress = 0) {
    const screen = this.showScreen("loading", "loading", `
      <div class="loading-inner">
        <img class="loading-logo" src="assets/img/ui/logo-cream.png" alt="One and One Story">
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
    if (label) label.textContent = `${pct < 100 ? "loading" : "ready"} · ${pct}%`;
  }

  showError(message) {
    this.showScreen("error", "loading", `
      <div class="loading-inner">
        <img class="loading-logo" src="assets/img/ui/logo-cream.png" alt="One and One Story">
        <div class="loading-label">${esc(message)}</div>
      </div>`);
  }

  showMenu({
    primaryLabel = "Begin",
    bonus = false,
    chapterCount = 0,
    falling = false,
    onPrimary,
    onChapters,
    onCoop,
    onCredits,
    onHelp,
    onFullscreen,
  }) {
    const smoke = `assets/img/ui/smoke${1 + Math.floor(Math.random() * 3)}.png`;
    const lock = bonus ? "" : ICON.lock;
    const fallingMarkup = falling
      ? '<div class="falling-layer"><div class="falling-character josh"></div><div class="falling-character rosie"></div></div>'
      : "";
    const screen = this.showScreen("menu", "menu", `
      <div class="screen-bg"></div>
      <div class="screen-shade"></div>
      <img class="menu-smoke" src="${smoke}" alt="">
      ${fallingMarkup}
      <div class="screen-content">
        ${this.topbar()}
        <div class="menu-content">
          <div class="logo-wrap">
            <img class="logo-blur" src="assets/img/ui/logo-cream-blur.png" alt="">
            <img class="logo" src="assets/img/ui/logo-cream.png" alt="One and One Story">
          </div>
          <div class="menu-tagline">a story in eight chapters</div>
          <div class="menu-nav">
            <button class="menu-item is-primary" type="button" data-nav data-action="primary">${esc(primaryLabel)}</button>
            <button class="menu-item" type="button" data-nav data-action="chapters">Chapters<span class="menu-note">${chapterCount ? `${chapterCount}/8` : ""}</span></button>
            <button class="menu-item ${bonus ? "" : "is-locked"}" type="button" data-nav data-action="coop" aria-label="${bonus ? "Two Hearts, two players" : "Two Hearts, locked. Finish the story to unlock"}">Two Hearts${lock}</button>
            <button class="menu-item" type="button" data-nav data-action="credits">Credits</button>
          </div>
        </div>
        <div class="menu-footer">
          <span>Original game by Mattia Traverso · 2011</span>
          <div class="footer-links">
            <button type="button" data-nav data-action="help">Controls</button>
            <button type="button" data-nav data-action="fullscreen">Fullscreen</button>
          </div>
        </div>
        <div class="hint-bubble" role="status"></div>
      </div>
    `);

    this.bindAudioButtons(screen);
    this.bindNav(screen);
    screen.querySelector('[data-action="primary"]').addEventListener("click", onPrimary);
    screen.querySelector('[data-action="chapters"]').addEventListener("click", onChapters);
    screen.querySelector('[data-action="coop"]').addEventListener("click", () => {
      if (bonus) onCoop();
      else this.menuHint("Finish the story to unlock this game mode.");
    });
    screen.querySelector('[data-action="credits"]').addEventListener("click", onCredits);
    screen.querySelector('[data-action="help"]').addEventListener("click", onHelp);
    screen.querySelector('[data-action="fullscreen"]').addEventListener("click", onFullscreen);

    const logo = screen.querySelector(".logo-wrap");
    let logoClicks = 0;
    let logoWindow = 0;
    logo.addEventListener("click", () => {
      const now = performance.now();
      if (now - logoWindow > 1200) logoClicks = 0;
      logoWindow = now;
      logoClicks += 1;
      if (logoClicks >= 3) {
        logoClicks = 0;
        this.app.unlockBonusBySecret();
      }
    });
  }

  showChapters({ unlocked = 0, chapters, onSelect, onBack }) {
    const rows = chapters.map((chapter) => {
      const locked = chapter.number > unlocked;
      return `
        <button class="chapter-row ${locked ? "is-locked" : ""}" type="button"
          ${locked ? "disabled" : "data-nav"} data-chapter="${chapter.number}">
          <span class="roman">${chapter.roman}</span>
          <span class="chapter-title">${locked ? "Locked" : esc(chapter.title)}</span>
          ${locked ? ICON.lockTiny : ICON.arrow}
        </button>`;
    }).join("");

    const sub = unlocked > 0
      ? `${unlocked} of 8 chapters unlocked`
      : "Finish the first chapter to unlock chapter selection.";

    const screen = this.showScreen("chapters", "chapters", `
      <div class="screen-bg"></div>
      <div class="screen-shade"></div>
      <div class="screen-content">
        ${this.topbar({ back: "Back" })}
        <div class="chapters-content">
          <div class="screen-kicker">Story</div>
          <h1 class="screen-heading">Chapters</h1>
          <div class="chapters-sub">${esc(sub)}</div>
          <div class="chapter-list">${rows}</div>
        </div>
      </div>
    `);

    this.bindAudioButtons(screen);
    this.bindBack(screen, onBack);
    this.bindNav(screen, { onBack });
    for (const row of screen.querySelectorAll(".chapter-row:not(.is-locked)")) {
      row.addEventListener("click", () => onSelect(Number(row.dataset.chapter)));
    }
  }

  showCredits({ achievement = false, onBack }) {
    const thanks = THANKS.map((name) => `<div>${esc(name)}</div>`).join("");
    const screen = this.showScreen("credits", "credits", `
      <div class="screen-bg"></div>
      <div class="screen-shade"></div>
      <div class="screen-content">
        ${this.topbar({ back: "Back" })}
        <div class="credits-content">
          <img class="credits-logo" src="assets/img/ui/logo-cream.png" alt="One and One Story">
          <div class="credits-body">
            <div class="credits-row"><dt>Game design & programming</dt><dd>Mattia “MaTX” Traverso</dd></div>
            <div class="credits-row"><dt>Art</dt><dd>Gabriele Bonis</dd></div>
            <div class="credits-row"><dt>Music</dt><dd>David Carney · DVGMusic</dd></div>
            <div class="credits-section">Special thanks</div>
            <div class="credits-thanks">${thanks}</div>
            <div class="credits-note">
              Original Flash game © 2011 Mattia Traverso. All original artwork and music belong to their creators.<br>
              This edition rebuilds the game for the modern web with HTML5 Canvas and the original assets.
            </div>
          </div>
        </div>
        <div class="credits-footer">
          <span>FlashPunk · Armor Games · 2011</span>
          <span>Web edition</span>
        </div>
        ${achievement ? `<div class="achievement"><img src="assets/img/ui/achievement.png" alt="Bonus Mode Unlocked"></div>` : ""}
      </div>
    `);

    this.bindAudioButtons(screen);
    this.bindBack(screen, onBack);
    this.bindNav(screen, { onBack });

    if (achievement) {
      const overlay = screen.querySelector(".achievement");
      this.addTimer(() => overlay.classList.add("is-hidden"), 1900);
      this.addTimer(() => overlay.remove(), 3400);
    }
  }

  showTitle({ texts, onDone }) {
    const smoke = `assets/img/ui/smoke${1 + Math.floor(Math.random() * 3)}.png`;
    const screen = this.showScreen("title", "title", `
      <div class="screen-bg"></div>
      <div class="screen-shade"></div>
      <img class="title-smoke" src="${smoke}" alt="" style="top:18%;left:-18%;">
      <div class="screen-content">
        ${this.topbar()}
        <div class="title-text"></div>
        <button class="skip-btn" type="button">Skip ${ICON.skip}</button>
      </div>
    `);
    this.bindAudioButtons(screen);

    const textEl = screen.querySelector(".title-text");
    let index = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };

    const step = () => {
      if (finished) return;
      if (index >= texts.length) {
        finish();
        return;
      }
      textEl.textContent = texts[index];
      this.addTimer(() => textEl.classList.add("is-visible"), 80);
      this.addTimer(() => {
        textEl.classList.remove("is-visible");
        this.addTimer(() => {
          index += 1;
          step();
        }, 1020);
      }, 80 + 1000 + 1600);
    };

    // Any click or key advances a title card.
    screen.querySelector(".skip-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      finish();
    });
    this.bindClickToSkip(screen, finish);
    this.bindSkipKeys(finish);
    step();
  }

  showQuote({ onDone }) {
    const smoke = `assets/img/ui/smoke${1 + Math.floor(Math.random() * 3)}.png`;
    const screen = this.showScreen("quote", "quote", `
      <div class="screen-bg"></div>
      <div class="screen-shade"></div>
      <img class="title-smoke" src="${smoke}" alt="" style="top:28%;left:-15%;">
      <div class="screen-content">
        ${this.topbar()}
        <img class="quote-img" src="assets/img/ui/aristotle.png" alt="Love is one soul in two bodies. Aristotle.">
        <button class="skip-btn" type="button">Skip ${ICON.skip}</button>
      </div>
    `);
    this.bindAudioButtons(screen);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    const img = screen.querySelector(".quote-img");
    this.addTimer(() => img.classList.add("is-visible"), 80);
    this.addTimer(finish, 80 + 1000 + 1700 + 1000);
    screen.querySelector(".skip-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      finish();
    });
    this.bindClickToSkip(screen, finish);
    this.bindSkipKeys(finish);
  }

  showEndTitle({ onDone }) {
    const screen = this.showScreen("endcard", "endcard", `
      <div class="screen-bg"></div>
      <div class="screen-shade"></div>
      <div class="screen-content">
        ${this.topbar()}
        <img class="endcard-img" src="assets/img/ui/end-title.png" alt="The End">
        <button class="skip-btn" type="button">Skip ${ICON.skip}</button>
      </div>
    `);
    this.bindAudioButtons(screen);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    const img = screen.querySelector(".endcard-img");
    this.addTimer(() => img.classList.add("is-visible"), 80);
    this.addTimer(finish, 80 + 1200 + 1900 + 1200);
    screen.querySelector(".skip-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      finish();
    });
    this.bindClickToSkip(screen, finish);
    this.bindSkipKeys(finish);
  }

  showPause({ label = "", onResume, onRestart, onHelp, onMenu }) {
    const screen = this.showScreen("pause", "pause", `
      <div class="screen-content">
        <div class="pause-panel">
          <div class="panel-kicker">${esc(label || "One and One Story")}</div>
          <h2 class="panel-title">Paused</h2>
          <div class="panel-list">
            <button class="panel-btn" type="button" data-nav data-action="resume">Resume</button>
            <button class="panel-btn" type="button" data-nav data-action="restart">Restart level</button>
            <button class="panel-btn" type="button" data-nav data-action="help">Controls</button>
            <button class="panel-btn panel-danger" type="button" data-nav data-action="menu">Leave to menu</button>
          </div>
          <div class="panel-footer">
            ${this.audioMarkup()}
            <span>Esc resumes · M mutes</span>
          </div>
        </div>
      </div>
    `);
    this.bindAudioButtons(screen);
    this.bindNav(screen, { onBack: onResume });
    screen.querySelector('[data-action="resume"]').addEventListener("click", onResume);
    screen.querySelector('[data-action="restart"]').addEventListener("click", onRestart);
    screen.querySelector('[data-action="help"]').addEventListener("click", onHelp);
    screen.querySelector('[data-action="menu"]').addEventListener("click", onMenu);
  }

  showHelp({ coop = false, onClose }) {
    const controlRows = coop
      ? `
        <div class="help-row"><span>Josh</span><span class="keys"><span class="kbd">←</span><span class="kbd">→</span><span class="kbd">↑</span></span></div>
        <div class="help-row"><span>Rosie</span><span class="keys"><span class="kbd">A</span><span class="kbd">D</span><span class="kbd">W</span></span></div>
        <div class="help-row"><span>Restart</span><span class="keys"><span class="kbd">R</span></span></div>
        <div class="help-row"><span>Pause</span><span class="keys"><span class="kbd">Esc</span></span></div>
        <div class="help-row"><span>Sound</span><span class="keys"><span class="kbd">M</span></span></div>
      `
      : `
        <div class="help-row"><span>Move</span><span class="keys"><span class="kbd">←</span><span class="kbd">→</span></span></div>
        <div class="help-row"><span>Jump</span><span class="keys"><span class="kbd">X</span><span class="kbd">↑</span></span></div>
        <div class="help-row"><span>Switch</span><span class="keys"><span class="kbd">Z</span><span class="kbd">C</span></span></div>
        <div class="help-row"><span>Restart</span><span class="keys"><span class="kbd">R</span></span></div>
        <div class="help-row"><span>Pause</span><span class="keys"><span class="kbd">Esc</span></span></div>
        <div class="help-row"><span>Sound</span><span class="keys"><span class="kbd">M</span></span></div>
      `;

    const screen = this.showScreen("help", "help", `
      <div class="screen-content">
        <div class="help-panel">
          <div class="panel-kicker">${coop ? "Two Hearts" : "Story"}</div>
          <h2 class="panel-title">How to play</h2>
          <div class="help-grid">${controlRows}</div>
          <div class="help-note">
            A fall from too high hurts. Bring the two characters together, standing still, to move on.
            ${this.touchEnabled ? " Touch controls are available on this device." : ""}
          </div>
          <div class="help-actions">
            <button class="panel-btn" type="button" data-nav data-action="close">Close</button>
          </div>
        </div>
      </div>
    `);
    this.bindNav(screen, { onBack: onClose });
    screen.querySelector('[data-action="close"]').addEventListener("click", onClose);
  }

  async fadeOut() {
    this.fadeEl.classList.add("is-active");
    await wait(400);
  }

  async fadeIn() {
    this.fadeEl.classList.remove("is-active");
    await wait(400);
  }

  setFade(active) {
    this.fadeEl.classList.toggle("is-active", active);
  }
}
