import {
  VIEW_W, VIEW_H,
  STORY_NUMBERS, COOP_NUMBERS,
  BACKGROUND_BY_LEVEL, BACKGROUND_BY_COOP,
  LEVEL_TEXT,
} from "./data.js";
import { Background } from "./background.js";
import {
  Player, Heart, rectsOverlap, playerBox, spikeHitsPlayer,
  PUSH_SPEED, FALL_GRAVITY,
} from "./entities.js";
import { input } from "./input.js";

const SWITCH_KEYS = ["KeyZ", "KeyC"];

export class LevelScene {
  constructor(app, options) {
    this.app = app;
    this.kind = options.kind;
    this.index = options.index;
    this.mode = options.mode;
    this.data = options.data;
    this.images = app.images;
    this.input = input;
    this.tutorialJumped = Boolean(options.tutorialJumped);

    this.state = "play";
    this.completed = false;
    this.transitioning = false;
    this.deathTimer = 0;
    this.deadPlayer = null;
    this.narrativeText = "";

    this.josh = null;
    this.rosie = null;
    this.players = [];
    this.crates = [];
    this.spikes = [];
    this.floors = (this.data.floors || []).map(([x, y, w, h]) => ({ x, y, w, h, kind: "floor" }));
    this.textSolids = [];
    this.endTexts = [];
    this.decorations = [];
    this.thanks = null;

    this.switchAvailable = false;
    this.tutorialRevealed = false;
    this.tutorialPut = 0;
    this.followState = null;
    this.lightInitialDistance = 1;
    this.lightCanvas = null;
    this.endState = null;

    this.build();
  }

  get isTutorial() {
    return this.kind === "story" && this.index === 0;
  }

  get hudLabel() {
    if (this.kind === "coop") {
      return this.index === 10 ? "" : COOP_NUMBERS[this.index] || "";
    }
    return STORY_NUMBERS[this.index] || "";
  }

  get hudSwitchVisible() {
    return this.switchAvailable;
  }

  get hudSwitchToRosie() {
    return Boolean(this.josh?.controlled);
  }

  get hudRestartVisible() {
    return !this.isTutorial;
  }

  get hudTouchLayout() {
    return this.kind === "coop" ? "coop" : "single";
  }

  build() {
    this.buildBackground();
    this.buildPlayers();
    this.buildObjects();
    this.buildTiles();
    this.configureMode();
    this.configureDecorations();
    this.applyLevelText();

    this.app.refreshHUD();
    this.app.ui.setNarrative(this.narrativeText);
  }

  buildBackground() {
    const mapping = this.kind === "coop"
      ? BACKGROUND_BY_COOP[this.index] || BACKGROUND_BY_COOP[0]
      : BACKGROUND_BY_LEVEL[this.index] || BACKGROUND_BY_LEVEL[0];
    this.background = new Background(this.data, mapping, this.images);
    this.app.audio.playAmbience(this.background.ambience);
  }

  buildPlayers() {
    const [jx, jy] = this.data.josh;
    const [rx, ry] = this.data.rosie;
    let joshY = jy;
    let rosieY = ry;
    if (this.kind === "coop" && (this.index === 4 || this.index === 10)) {
      joshY -= 32;
      rosieY -= 32;
    }

    this.rosie = new Player("rosie", rx, rosieY, this.images, this);
    this.josh = new Player("josh", jx, joshY, this.images, this);
    this.players = [this.rosie, this.josh];

    this.rosie.direction = true;
    this.josh.direction = true;
  }

  buildObjects() {
    this.crates = (this.data.crates || []).map(([x, y]) => ({
      x, y, w: 32, h: 32,
      kind: "crate",
      gravity: 0,
      active: true,
      pusher: null,
      pushDir: 0,
      wasFalling: false,
      moveSoundTimer: 0,
    }));
    this.spikes = (this.data.spikes || []).map(([x, y]) => ({ x, y }));
  }

  buildTiles() {
    this.tileCanvas = document.createElement("canvas");
    this.tileCanvas.width = VIEW_W;
    this.tileCanvas.height = VIEW_H;
    const ctx = this.tileCanvas.getContext("2d");
    const tileset = this.images.tileset;
    for (const [x, y, tx, ty] of this.data.tiles || []) {
      ctx.drawImage(tileset, tx, ty, 32, 32, x, y, 32, 32);
    }
    if (this.kind === "coop" && this.index === 5) {
      ctx.clearRect(0, 64, 32, 32);
    }
  }

  configureMode() {
    const josh = this.josh;
    const rosie = this.rosie;

    switch (this.mode) {
      case "tutorial":
        josh.controlled = true;
        josh.alpha = 1;
        josh.jumpValue = this.tutorialJumped ? 400 : 0;
        rosie.controlled = false;
        rosie.alpha = 0.5;
        rosie.visible = false;
        rosie.following = false;
        this.switchAvailable = false;
        this.setNarrative(this.tutorialJumped
          ? "I died when i fell... I don't like dying.\nI tried again, pressing X or UP"
          : "And there I was, moving thanks to the arrow keys.");
        break;

      case "follow":
        josh.controlled = true;
        josh.alpha = 1;
        rosie.controlled = false;
        rosie.alpha = 0.5;
        rosie.isDrawing = false;
        rosie.following = true;
        this.switchAvailable = false;
        this.followState = {
          time: 0,
          cooldown: 1.2,
          isTurnedLeft: true,
          follow: false,
          velo: this.index === 6 ? 54 : 63,
        };
        rosie.direction = true;
        rosie.face(true);
        break;

      case "runaway":
        josh.controlled = true;
        josh.alpha = 1;
        rosie.controlled = false;
        rosie.alpha = 0.5;
        rosie.isDrawing = false;
        rosie.following = true;
        rosie.autoDirection = 1;
        this.switchAvailable = false;
        break;

      case "both":
        josh.controlled = true;
        rosie.controlled = true;
        josh.alpha = 1;
        rosie.alpha = 1;
        this.switchAvailable = false;
        break;

      case "mirror":
        josh.controlled = true;
        rosie.controlled = true;
        josh.alpha = 1;
        rosie.alpha = 1;
        rosie.keys.left = ["ArrowRight"];
        rosie.keys.right = ["ArrowLeft"];
        rosie.keys.jump = ["KeyX", "ArrowUp"];
        this.switchAvailable = false;
        break;

      case "nojump":
        josh.jumpValue = 0;
        josh.controlled = true;
        josh.alpha = 1;
        rosie.controlled = false;
        rosie.alpha = 0.5;
        this.switchAvailable = true;
        break;

      case "light": {
        josh.controlled = true;
        josh.alpha = 1;
        rosie.controlled = false;
        rosie.alpha = 0.5;
        this.switchAvailable = true;
        this.lightInitialDistance = Math.max(1, Math.abs(josh.x - rosie.x));
        this.lightCanvas = document.createElement("canvas");
        this.lightCanvas.width = VIEW_W;
        this.lightCanvas.height = VIEW_H;
        break;
      }

      case "end":
        josh.controlled = true;
        josh.alpha = 1;
        rosie.controlled = false;
        rosie.alpha = 1;
        rosie.isDrawing = false;
        rosie.face(true);
        this.switchAvailable = false;
        this.endState = {
          theEnd: false,
          bool: false,
          bool2: false,
        };
        this.addEndText(0, 128, 96, 0);
        break;

      case "coop":
        josh.controlled = true;
        rosie.controlled = true;
        josh.alpha = 1;
        rosie.alpha = 1;
        josh.keys.left = ["ArrowLeft"];
        josh.keys.right = ["ArrowRight"];
        josh.keys.jump = ["ArrowUp", "KeyX"];
        rosie.keys.left = ["KeyA"];
        rosie.keys.right = ["KeyD"];
        rosie.keys.jump = ["KeyW"];
        this.switchAvailable = false;
        break;

      case "switch":
      default:
        josh.controlled = true;
        josh.alpha = 1;
        rosie.controlled = false;
        rosie.alpha = 0.5;
        this.switchAvailable = true;
        break;
    }
  }

  configureDecorations() {
    if (this.kind !== "coop") return;
    if (this.index === 0) {
      this.decorations.push({
        image: this.images["coop-controls-rosie"],
        x: this.rosie.x + 64,
        y: 120,
      });
      this.decorations.push({
        image: this.images["coop-controls-josh"],
        x: this.josh.x - 128,
        y: 120,
      });
    }
    if (this.index === 10) {
      this.thanks = { image: this.images.thanks, x: 240, y: 260 };
    }
  }

  applyLevelText() {
    if (this.kind !== "story") return;
    if (LEVEL_TEXT[this.index]) this.setNarrative(LEVEL_TEXT[this.index]);
  }

  setNarrative(text) {
    if (this.narrativeText === text) return;
    this.narrativeText = text;
    this.app.ui.setNarrative(text);
  }

  refreshSwitchHud() {
    this.app.refreshHUD();
  }

  switchPlayer() {
    if (!this.switchAvailable || this.state !== "play") return;
    if (this.josh.dead || this.rosie.dead) return;
    if (this.josh.controlled) {
      this.josh.controlled = false;
      this.rosie.controlled = true;
      this.josh.alpha = 0.5;
      this.rosie.alpha = 1;
    } else {
      this.josh.controlled = true;
      this.rosie.controlled = false;
      this.josh.alpha = 1;
      this.rosie.alpha = 0.5;
    }
    this.app.audio.playSfx("switch", { volume: 1.1, pan: this.panFor(this.rosie.x) });
    this.refreshSwitchHud();
  }

  handleSwitchInput() {
    if (!this.switchAvailable || this.state !== "play") return;
    if (this.input.wasPressedAny(SWITCH_KEYS)) this.switchPlayer();
  }

  update(dt) {
    this.background.update(dt);
    if (this.mode === "light") this.updateLightPositions();

    if (this.state === "play") this.updatePlay(dt);
    else if (this.state === "dying") this.updateDying(dt);
    else if (this.state === "kiss") this.updateKiss(dt);
  }

  updatePlay(dt) {
    this.checkVictory();
    if (this.state !== "play") return;

    this.levelAI(dt);
    if (this.state !== "play") return;

    this.handleSwitchInput();
    if (this.state !== "play") return;

    this.updateSpikes();
    if (this.state !== "play") return;

    this.updateCrates(dt);
    if (this.state !== "play") return;

    this.players.forEach((player) => player.update(dt));
    if (this.state !== "play") return;

    this.checkOutOfBounds();
    this.clearPushing();
  }

  updateDying(dt) {
    this.deathTimer += dt;
    if (this.deadPlayer) {
      this.deadPlayer.alpha = Math.max(0, this.deadPlayer.alpha - dt * 3);
      this.deadPlayer.updateAnimation(dt);
    }
    if (this.deathTimer >= 0.55) {
      this.deathTimer = 0;
      const player = this.deadPlayer;
      this.deadPlayer = null;
      this.resolveDeath(player);
    }
  }

  updateKiss(dt) {
    this.heart?.update(dt);
    this.josh.updateAnimation(dt);
    this.rosie.updateAnimation(dt);
  }

  levelAI(dt) {
    if (this.isTutorial) {
      this.tutorialAI(dt);
      return;
    }
    if (this.mode === "follow") {
      this.followAI(dt);
      return;
    }
    if (this.mode === "runaway") {
      this.runawayAI(dt);
      return;
    }
    if (this.mode === "coop") {
      this.coopAI(dt);
      return;
    }
    if (this.mode === "end") {
      this.endAI(dt);
    }
  }

  tutorialAI() {
    const josh = this.josh;
    const rosie = this.rosie;

    if (!this.tutorialRevealed) {
      if (josh.x >= 512) {
        this.tutorialRevealed = true;
        rosie.visible = true;
        this.switchAvailable = true;
        this.setNarrative("There she was.\nI Used Z or C to think of her.");
        this.app.refreshHUD();
        return;
      }
      if (josh.x >= 300 && josh.x < 512 && this.tutorialPut !== 3) {
        this.tutorialPut = 3;
        this.setNarrative("I Really Loved pushing boxes.");
      } else if (josh.x >= 0 && josh.x < 60 && this.tutorialPut !== 1) {
        this.tutorialPut = 1;
        this.setNarrative(this.tutorialJumped
          ? "I died when i fell... I don't like dying.\nI tried again, pressing X or UP"
          : "And there I was, moving thanks to the arrow keys.");
      }
      return;
    }

    if (rosie.visible) {
      if (rosie.x >= 100 && rosie.x < 320 && this.tutorialPut !== 5) {
        this.tutorialPut = 5;
        this.setNarrative("She usually jumped over spikes.");
      }
      if (rosie.x >= 320 && this.tutorialPut !== 6) {
        this.tutorialPut = 6;
        this.setNarrative("She Loved me,\n            ...and i loved her. We always met there.");
      }
    }
  }

  followAI(dt) {
    const josh = this.josh;
    const rosie = this.rosie;
    if (!rosie.visible || rosie.dead) return;
    const state = this.followState;
    state.time += 60 * dt;

    if (!josh.onGround && state.follow) {
      this.followHim(dt);
      return;
    }

    const dy = Math.abs(rosie.y - josh.y);
    if (dy < 27) {
      let lineLeft;
      let linePlayer;
      if (josh.x < rosie.x) {
        if (!state.isTurnedLeft) {
          rosie.face(false);
          state.follow = false;
          this.turnRandom(state);
          return;
        }
        linePlayer = josh;
        lineLeft = josh.x + 6;
      } else {
        if (state.isTurnedLeft) {
          rosie.face(true);
          state.follow = false;
          this.turnRandom(state);
          return;
        }
        linePlayer = rosie;
        lineLeft = rosie.x + 6;
      }

      const dist = Math.max(1, Math.abs(rosie.x - josh.x));
      const line = {
        x: lineLeft,
        y: linePlayer.y + 12,
        w: dist,
        h: 10,
      };
      const hits = this.solidsAt(line);
      const bad = hits.find((hit) => hit.kind !== "crate");
      if (bad) {
        state.follow = false;
        this.turnRandom(state);
        rosie.face(state.isTurnedLeft);
      } else {
        state.follow = true;
      }
    } else {
      state.follow = false;
      this.turnRandom(state);
      rosie.face(state.isTurnedLeft);
    }

    if (state.follow) this.followHim(dt);
    else rosie.setAnim("stand", state.isTurnedLeft);
  }

  followHim(dt) {
    const josh = this.josh;
    const rosie = this.rosie;
    const state = this.followState;
    if (!state.follow) return;
    if (josh.x < rosie.x) {
      rosie.walkAnim(true);
      rosie.moveX(-state.velo * dt);
    } else {
      rosie.walkAnim(false);
      rosie.moveX(state.velo * dt);
    }
    if (rosie.onGround) rosie.playStep(dt);
  }

  turnRandom(state) {
    if (Math.random() < 0.2 && state.time >= state.cooldown) {
      state.isTurnedLeft = !state.isTurnedLeft;
      state.time = 0;
      state.cooldown = 1.15 + Math.random() * 0.85;
    }
  }

  runawayAI(dt) {
    const rosie = this.rosie;
    if (!rosie.visible || rosie.dead) return;
    const blocked = Boolean(this.collideSolids(rosie.hitboxAt(rosie.x + 1, rosie.y)));
    if (!blocked) {
      rosie.x += 50 * dt;
      rosie.walkAnim(false);
      if (rosie.onGround) rosie.playStep(dt);
    } else {
      rosie.setAnim("stand", false);
    }
  }

  coopAI(dt) {
    if (this.index === 3 || this.index === 9) {
      if (this.josh.y > VIEW_H + 24 && this.rosie.y > VIEW_H + 24) {
        this.transitioning = true;
        this.state = "done";
        this.app.advanceCoop(this.index + 1);
      }
      return;
    }

    if (this.index === 4 || this.index === 5) {
      const wrap = this.data.wrap || {};
      this.wrapPlayerCoop(this.josh, "Josh", wrap, this.index === 5);
      this.wrapPlayerCoop(this.rosie, "Rosie", wrap, false);
      return;
    }

    if (this.index >= 6 && this.index <= 8) {
      for (const player of this.players) {
        if (player.y - 12 > VIEW_H) {
          player.y = 0;
          player.gravity = 0;
          player.fallStartY = player.y;
          player.onGround = false;
        }
      }
      return;
    }

    if (this.index === 10) {
      // The last stage is an endless fall: the original keeps refreshing the
      // fall origin so the two can land safely in each other's arms.
      for (const player of this.players) {
        if (!player.onGround) player.fallStartY = player.y;
      }
    }
  }

  wrapPlayerCoop(player, prefix, wrap, extraVertical) {
    const halfWidth = 6;
    const startX = wrap[`Xstart${prefix}`];
    const startY = wrap[`Ystart${prefix}`];
    const endX = wrap[`Xend${prefix}`];
    const endY = wrap[`Yend${prefix}`];

    if (player.x + halfWidth < 0) {
      this.teleportPlayer(player, endX, endY);
    } else if (player.x - halfWidth > VIEW_W) {
      this.teleportPlayer(player, startX, startY);
    } else if (player.y - player.height > VIEW_H) {
      this.teleportPlayer(player, endX, endY);
    }

    if (extraVertical && player.y - 12 > VIEW_H) {
      player.y = 0;
      player.gravity = 0;
      player.fallStartY = 0;
      player.onGround = false;
    }
  }

  teleportPlayer(player, x, y) {
    player.x = Number(x) || 0;
    player.y = Number(y) || 0;
    player.gravity = 0;
    player.onGround = false;
    player.fallStartY = player.y;
  }

  endAI(dt) {
    const josh = this.josh;
    if (this.endState.theEnd) return;

    if (josh.y > VIEW_H) {
      this.endState.theEnd = true;
      this.transitioning = true;
      this.state = "done";
      this.app.secretEnding();
      return;
    }

    for (const text of this.endTexts) {
      if (text.alpha < 1) text.alpha = Math.min(1, text.alpha + dt);
    }

    const first = this.endTexts.find((text) => text.key === 0);
    const second = this.endTexts.find((text) => text.key === 1);
    const third = this.endTexts.find((text) => text.key === 2);
    const fourth = this.endTexts.find((text) => text.key === 3);
    const fifth = this.endTexts.find((text) => text.key === 4);

    if (!second && first && first.alpha >= 1 && josh.x >= 120) {
      this.addEndText(1, 304, 106);
    }
    if (!third && !this.endState.bool && josh.x >= 500) {
      this.addEndText(2, 185, 230);
    }
    if (!fourth && !this.endState.bool && josh.x < 350 && first && second && third) {
      this.addEndText(3, 130, 320);
    }
    if (fourth && fourth.alpha >= 1) {
      this.endState.bool = true;
    }
    if (fourth && this.endState.bool && !this.endState.bool2 && rectsOverlap(playerBox(josh), fourth.solid)) {
      this.endState.bool2 = true;
      if (!fifth) this.addEndText(4, 150, 360);
    }
  }

  addEndText(key, x, y, alpha = 0) {
    if (this.endTexts.some((text) => text.key === key)) return;
    const image = this.images[`end-text-${key}`];
    if (!image) return;
    const solid = {
      x,
      y: y - 11,
      w: image.width,
      h: image.height / 2,
      kind: "text",
    };
    this.textSolids.push(solid);
    this.endTexts.push({ key, x, y, image, solid, alpha });
  }

  updateLightPositions() {
    if (this.mode !== "light") return;
    const josh = this.josh;
    const rosie = this.rosie;
    const current = Math.max(0.001, Math.abs(josh.x - rosie.x));
    const ratio = Math.min(4, this.lightInitialDistance / current);
    this.lightJosh = {
      x: josh.x + 16,
      y: josh.y + 17,
      scale: ratio,
    };
    this.lightRosie = {
      x: rosie.x + 16,
      y: rosie.y + 17,
      scale: ratio,
    };
  }

  checkVictory() {
    if (this.state !== "play") return;
    if (!this.josh.visible || !this.rosie.visible) return;
    if (this.josh.dead || this.rosie.dead) return;
    if (this.josh.gravity !== 0 || this.rosie.gravity !== 0) return;
    if (Math.abs(this.josh.y - this.rosie.y) >= 2.5) return;
    if (!rectsOverlap(playerBox(this.josh), playerBox(this.rosie))) return;
    this.beginKiss();
  }

  beginKiss() {
    if (this.state !== "play") return;
    this.state = "kiss";
    this.josh.controlled = false;
    this.rosie.controlled = false;
    this.josh.alpha = 1;
    this.rosie.alpha = 1;
    this.switchAvailable = false;
    this.clearPushing();
    this.app.refreshHUD();

    this.app.audio.playSfx("kiss", { volume: 1, pan: this.panFor(this.josh.x) });

    this.josh.y = this.rosie.y;
    let heartX;
    if (this.josh.x > this.rosie.x) {
      heartX = this.rosie.x - 2;
      this.josh.face(true);
      this.rosie.face(false);
    } else {
      heartX = this.josh.x - 2;
      this.josh.face(false);
      this.rosie.face(true);
    }

    this.heart = new Heart(heartX, this.josh.y - 17, this.images);
    this.heart.onFinished = () => this.finishLevel();
    this.heart.play(heartX, this.josh.y - 17);
  }

  finishLevel() {
    if (this.completed) return;
    this.completed = true;
    this.state = "done";
    this.app.onLevelComplete(this);
  }

  killPlayer(player, cause) {
    if (this.state !== "play") return;
    if (player.dead) return;
    player.kill();
  }

  onPlayerKilled(player) {
    if (this.state !== "play") return;
    this.state = "dying";
    this.deathTimer = 0;
    this.deadPlayer = player;
    this.josh.controlled = false;
    this.rosie.controlled = false;
    this.josh.pushing = null;
    this.rosie.pushing = null;
    this.app.refreshHUD();
  }

  resolveDeath(player) {
    if (this.isTutorial && player === this.rosie && !this.josh.dead) {
      this.josh.controlled = false;
      this.josh.alpha = 0.5;
      this.rosie = new Player("rosie", 32, 128, this.images, this);
      this.rosie.visible = true;
      this.rosie.alpha = 1;
      this.rosie.controlled = true;
      this.rosie.direction = true;
      this.players = [this.rosie, this.josh];
      this.state = "play";
      this.deathTimer = 0;
      this.switchAvailable = true;
      this.input.endStep();
      this.app.audio.playSfx("switch", { volume: 0.8, pan: this.panFor(this.rosie.x) });
      this.app.refreshHUD();
      return;
    }
    if (this.isTutorial && player === this.josh) {
      this.tutorialJumped = true;
      this.app.restartLevel({ tutorialJumped: true });
      return;
    }
    this.app.restartLevel({ tutorialJumped: this.tutorialJumped });
  }

  requestRestart() {
    if (this.state === "done") return;
    this.app.restartLevel({ tutorialJumped: this.tutorialJumped });
  }

  clearPushing() {
    for (const player of this.players) player.pushing = null;
    for (const crate of this.crates) {
      crate.pusher = null;
      crate.pushDir = 0;
    }
  }

  checkOutOfBounds() {
    if (this.mode === "end") return;
    if (this.kind === "coop" && [3, 4, 5, 6, 7, 8, 9].includes(this.index)) return;
    for (const player of this.players) {
      if (!player.visible || player.dead) continue;
      if (player.y > 560) {
        this.killPlayer(player, "fall");
        return;
      }
    }
  }

  updateSpikes() {
    for (const spike of this.spikes) {
      for (const player of this.players) {
        if (!player.visible || player.dead) continue;
        if (spikeHitsPlayer(spike, player, this.images)) {
          this.killPlayer(player, "spikes");
          return;
        }
      }
    }
  }

  updateCrates(dt) {
    for (const crate of this.crates) {
      if (!crate.active) continue;

      if (crate.gravity > 10) {
        const crushed = this.playerTouchingCrate(crate);
        if (crushed) {
          this.killPlayer(crushed, "crate");
          crate.active = false;
          continue;
        }
      }

      const grounded = this.crateGrounded(crate);
      if (!grounded) {
        crate.gravity += FALL_GRAVITY * dt;
        const cap = 18750 * dt;
        if (crate.gravity > cap) crate.gravity = cap;
        const dy = crate.gravity * dt * 1.24;
        const moved = this.moveCrateVertical(crate, dy);
        if (moved) {
          crate.wasFalling = true;
          if (crate.gravity > 10) {
            const crushed = this.playerTouchingCrate(crate);
            if (crushed) {
              this.killPlayer(crushed, "crate");
              crate.active = false;
              continue;
            }
          }
        } else {
          if (crate.wasFalling && crate.gravity > 10) {
            this.playSfx("land-stone", {
              volume: 0.7,
              pan: this.panFor(crate.x),
            });
          }
          crate.gravity = 0;
          crate.wasFalling = false;
        }
      } else {
        if (crate.wasFalling) {
          this.playSfx("land-stone", {
            volume: 0.7,
            pan: this.panFor(crate.x),
          });
        }
        crate.gravity = 0;
        crate.wasFalling = false;
      }

      if (crate.y - 16 > VIEW_H) {
        crate.y = 0;
        crate.gravity = 0;
        crate.wasFalling = false;
      }

      crate.moveSoundTimer = Math.max(0, crate.moveSoundTimer - dt);
      if (crate.gravity === 0 && this.crateGrounded(crate)) {
        this.tryPushCrate(crate, dt);
      }
    }
  }

  playerTouchingCrate(crate) {
    const crateBox = { x: crate.x, y: crate.y, w: 32, h: 32 };
    for (const player of this.players) {
      if (!player.visible || player.dead) continue;
      if (rectsOverlap(playerBox(player), crateBox)) return player;
    }
    return null;
  }

  crateGrounded(crate) {
    return this.solidsAt({ x: crate.x, y: crate.y + 1, w: 32, h: 32 }, crate).length > 0;
  }

  tryPushCrate(crate, dt) {
    const candidate = this.findPusher(crate);
    if (!candidate) return;
    const { player, dir } = candidate;
    player.pushing = crate;
    crate.pusher = player;
    crate.pushDir = dir;

    let delta = dir * PUSH_SPEED * dt;
    if (player === this.rosie && player.following) delta *= 0.5;

    const moved = this.moveCrateHorizontal(crate, delta);
    if (!moved) return;

    player.x += delta;
    if (crate.moveSoundTimer <= 0) {
      crate.moveSoundTimer = 0.24;
      this.playSfx("move-stone", {
        volume: 0.9,
        pan: this.panFor(crate.x),
      });
    }
  }

  findPusher(crate) {
    const crateBox = { x: crate.x, y: crate.y, w: 32, h: 32 };
    for (const player of this.players) {
      if (!player.visible || player.dead) continue;
      if (!player.onGround || player.gravity !== 0 || player.isJumping) continue;
      if (Math.abs(player.y - crate.y) > 2) continue;
      const box = playerBox(player);
      const leftSide = box.x + box.w >= crateBox.x - 5 && box.x + box.w <= crateBox.x + 3;
      const rightSide = box.x >= crateBox.x + crateBox.w - 3 && box.x <= crateBox.x + crateBox.w + 5;

      if (player.controlled) {
        if (leftSide && player.inputRight) return { player, dir: 1 };
        if (rightSide && player.inputLeft) return { player, dir: -1 };
      } else if (player === this.rosie && player.following) {
        if (leftSide && player.autoDirection > 0) return { player, dir: 1 };
        if (rightSide && player.autoDirection < 0) return { player, dir: -1 };
      }
    }
    return null;
  }

  moveCrateHorizontal(crate, dx, visited = new Set()) {
    if (!dx) return false;
    if (visited.has(crate)) return false;
    visited.add(crate);

    // Carry a crate that rests directly on top of this one.
    for (const other of this.crates) {
      if (!other.active || other === crate) continue;
      if (Math.abs(other.x - crate.x) < 2 && Math.abs(other.y - (crate.y - 32)) < 2) {
        if (!this.moveCrateHorizontal(other, dx, visited)) return false;
      }
    }

    const target = { x: crate.x + dx, y: crate.y, w: 32, h: 32 };
    const hits = this.solidsAt(target, crate);
    for (const hit of hits) {
      if (hit.kind === "crate") {
        if (!this.moveCrateHorizontal(hit, dx, visited)) return false;
      } else {
        return false;
      }
    }

    crate.x += dx;
    return true;
  }

  moveCrateVertical(crate, dy) {
    const target = { x: crate.x, y: crate.y + dy, w: 32, h: 32 };
    if (this.solidsAt(target, crate).length) return false;
    crate.y += dy;
    return true;
  }

  solidsAt(box, exclude = null) {
    const hits = [];
    for (const floor of this.floors) {
      if (rectsOverlap(box, floor)) hits.push(floor);
    }
    for (const crate of this.crates) {
      if (!crate.active || crate === exclude) continue;
      if (rectsOverlap(box, crate)) hits.push(crate);
    }
    for (const solid of this.textSolids) {
      if (rectsOverlap(box, solid)) hits.push(solid);
    }
    return hits;
  }

  collideSolids(box) {
    const floats = this.floors;
    for (const floor of floats) {
      if (rectsOverlap(box, floor)) return floor;
    }
    for (const crate of this.crates) {
      if (crate.active && rectsOverlap(box, crate)) return crate;
    }
    for (const solid of this.textSolids) {
      if (rectsOverlap(box, solid)) return solid;
    }
    return null;
  }

  panFor(x) {
    return Math.max(-1, Math.min(1, ((x + 16) / VIEW_W) * 2 - 1));
  }

  playSfx(name, options) {
    this.app.audio.playSfx(name, options);
  }

  render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    this.background.render(ctx);

    for (const spike of this.spikes) {
      ctx.drawImage(this.images.spike, spike.x, spike.y);
    }

    for (const crate of this.crates) {
      ctx.drawImage(this.images.crate, crate.x, crate.y);
    }

    ctx.drawImage(this.tileCanvas, 0, 0);

    for (const text of this.endTexts) {
      if (text.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = text.alpha;
      ctx.drawImage(text.image, text.x, text.y);
      ctx.restore();
    }

    for (const decoration of this.decorations) {
      if (decoration.image) ctx.drawImage(decoration.image, decoration.x, decoration.y);
    }
    if (this.thanks) ctx.drawImage(this.thanks.image, this.thanks.x, this.thanks.y);

    this.rosie.render(ctx);
    this.josh.render(ctx);

    if (this.mode === "light") this.renderLighting(ctx);
    this.heart?.render(ctx);
  }

  renderLighting(ctx) {
    if (!this.lightCanvas || !this.images.light) return;
    const lctx = this.lightCanvas.getContext("2d");
    lctx.clearRect(0, 0, VIEW_W, VIEW_H);
    lctx.fillStyle = "#000";
    lctx.fillRect(0, 0, VIEW_W, VIEW_H);
    lctx.globalCompositeOperation = "destination-out";
    for (const light of [this.lightJosh, this.lightRosie]) {
      if (!light) continue;
      const size = 128 * light.scale;
      lctx.drawImage(this.images.light, light.x - size / 2, light.y - size / 2, size, size);
    }
    lctx.globalCompositeOperation = "source-over";
    ctx.drawImage(this.lightCanvas, 0, 0);
  }
}
