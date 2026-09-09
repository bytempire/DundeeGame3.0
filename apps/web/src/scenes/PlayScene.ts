import Phaser from "phaser";
import { api, getInitData, getWebApp, isApiEnabled } from "../api";
import { BOSSES } from "../boss/bossDefs";
import { addNotebookBackground, NOTEBOOK_INK } from "../ui/notebookBg";
import { addPenButton, addPenTextButton } from "../ui/penControls";
import { recordLocalScore } from "../leaderboard";
import { DPR, fontPx, px } from "../ui/dpr";

/** Story bosses every N meters through the roster once (ends at robot). */
const BOSS_EVERY_M = 100;

type RunSnapshot = {
  distance: number;
  pickupCoins: number;
  reviveCount: number;
  extraRevives: number;
  freeRevivesPerRun: number;
  scrollSpeed: number;
  runId: string | null;
  seed: string;
  maxSpeedSeen: number;
  maxPackSize: number;
  starsPerAttempt: number;
  vpnBotUsername: string;
  obstacleIdx: number;
  spikes5Count: number;
  /** Bosses already beaten this run (next fight uses this index). */
  bossesCleared: number;
};

type PlayData = {
  resume?: boolean;
  bossDefeat?: boolean;
};

type StartResponse = {
  runId: string;
  seed: string;
  freeRevives?: number;
  maxPackSize?: number;
  starsPerAttempt?: number;
  maxRevives?: number; // legacy
  vpnBotUsername: string;
};

type FinishResponse = {
  rewardCoins: number;
  coinBalance: number;
  vpnBotUsername: string;
};

const FREE_REVIVES = 5;
const MAX_PACK = 5;
const STARS_PER_ATTEMPT = 5;

type Obstacle = {
  go: Phaser.GameObjects.Image;
  kind: "saw" | "spikes" | "pendulum" | "spikes5";
  r: number; // saw / pendulum ball radius
  hw: number; // spikes half-width
  hh: number; // spikes half-height
  spin: number; // deg/sec (saws only)
  // pendulum swing
  phase: number;
  amp: number; // max angle deg
  freq: number; // rad/sec
  arm: number; // pivot → ball center (world px)
};

const OBSTACLE_CYCLE: Array<"saw" | "spikes" | "pendulum" | "spikes5"> = [
  "saw",
  "spikes",
  "pendulum",
  "spikes5",
];

type Pickup = {
  go: Phaser.GameObjects.Image;
  r: number;
  taken: boolean;
  /** Bait before wide spikes — must jump; standing run-under doesn't count */
  bait?: boolean;
};

const GROUND_Y_RATIO = 0.82;
/** Full-res clean sheet (384) — same PNG that looks sharp when opened */
const FRAME = 384;
/** ~92 CSS px tall; HiDPI multiplies world scale so texels stay dense */
const PLAYER_SCALE = (92 * DPR) / FRAME;
const JUMP_VELOCITY = -560 * DPR;
const COYOTE_MS = 100;
const JUMP_BUFFER_MS = 120;
/** Hitbox near the skates (source px on 384 frame) */
const BODY_W = 112;
const BODY_H = 152;
const BODY_OX = Math.round((FRAME - BODY_W) / 2);
const BODY_OY = FRAME - BODY_H - 8;
const DUCK_W = 200;
const DUCK_H = 72;
const DUCK_OX = Math.round((FRAME - DUCK_W) / 2);
const DUCK_OY = FRAME - DUCK_H - 8;
const BASE_SPEED = 280 * DPR;
const SPEED_GAIN = 8 * DPR;
/** One platform tile width in px = 1 meter of run distance */
const METERS_PER_TILE_PX = 160 * DPR;
/** Duck collect — under pendulum (low, near the path) */
const KEY_CHEST_OFF = 22 * DPR;
/** Jump collect — above ground traps; standing cannot reach */
const KEY_JUMP_OFF = 92 * DPR;
/** Bait jump-key before every N-th wide spike strip */
const BAIT_EVERY_SPIKES5 = 3;
/** How far before the trap the bait key sits (px).
 *  Must exceed jump air-scroll so a late jump for the spikes cannot still grab it. */
const BAIT_LEAD_PX = 200 * DPR;

export class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private obstacles: Obstacle[] = [];
  private coins: Pickup[] = [];
  private hud!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;

  private runId: string | null = null;
  private seed = "local";
  private rng: () => number = () => Math.random();
  private dead = false;
  private distance = 0;
  private pickupCoins = 0;
  private reviveCount = 0;
  private extraRevives = 0;
  private freeRevivesPerRun = FREE_REVIVES;
  private maxPackSize = MAX_PACK;
  private starsPerAttempt = STARS_PER_ATTEMPT;
  private scrollSpeed = BASE_SPEED;
  private coyoteMs = 0;
  private jumpBufferMs = 0;
  private spawnAcc = 0;
  private startedAt = 0;
  private maxSpeedSeen = 0;
  private vpnBotUsername = "VpnDundeeBot";
  private paper!: Phaser.GameObjects.TileSprite;
  private path!: Phaser.GameObjects.TileSprite;
  private groundY = 0;
  private jumping = false;
  private obstacleIdx = 0;
  private ducking = false;
  private controls!: Phaser.GameObjects.Container;
  /** Count of spikes5 spawned this run (bait on every N-th) */
  private spikes5Count = 0;
  /** How many story bosses beaten this run */
  private bossesCleared = 0;
  /** Resuming the run after a story boss fight */
  private resumedFromBoss = false;

  constructor() {
    super("play");
  }

  init(data: PlayData = {}) {
    if (data.resume) {
      const s = this.registry.get("runSnapshot") as RunSnapshot | undefined;
      if (s) {
        this.dead = !!data.bossDefeat;
        this.distance = s.distance;
        this.pickupCoins = s.pickupCoins;
        this.reviveCount = s.reviveCount;
        this.extraRevives = s.extraRevives;
        this.freeRevivesPerRun = s.freeRevivesPerRun;
        this.scrollSpeed = s.scrollSpeed;
        this.runId = s.runId;
        this.seed = s.seed;
        this.maxSpeedSeen = s.maxSpeedSeen;
        this.maxPackSize = s.maxPackSize;
        this.starsPerAttempt = s.starsPerAttempt;
        this.vpnBotUsername = s.vpnBotUsername;
        this.obstacleIdx = s.obstacleIdx;
        this.spikes5Count = s.spikes5Count;
        // Win → next boss in 100m; defeat keeps the same checkpoint for game over
        this.bossesCleared = data.bossDefeat
          ? (s.bossesCleared ?? 0)
          : (s.bossesCleared ?? 0) + 1;
        this.resumedFromBoss = true;
        this.coyoteMs = 0;
        this.jumpBufferMs = 0;
        this.spawnAcc = 400;
        this.jumping = false;
        this.ducking = false;
        this.clearWorldObjects();
        this.overlay?.destroy(true);
        this.overlay = undefined;
        const seedNum = Number.parseInt(s.seed.slice(0, 8), 16) || 1;
        this.rng = this.mulberry32(seedNum ^ Math.floor(s.distance));
        return;
      }
    }

    this.dead = false;
    this.distance = 0;
    this.pickupCoins = 0;
    this.reviveCount = 0;
    this.extraRevives = 0;
    this.freeRevivesPerRun = FREE_REVIVES;
    this.scrollSpeed = BASE_SPEED;
    this.coyoteMs = 0;
    this.jumpBufferMs = 0;
    this.spawnAcc = 0; // first obstacle after full gap
    this.maxSpeedSeen = 0;
    this.runId = null;
    this.jumping = false;
    this.obstacleIdx = 0;
    this.ducking = false;
    this.spikes5Count = 0;
    this.bossesCleared = 0;
    this.resumedFromBoss = false;
    this.clearWorldObjects();
    this.overlay?.destroy(true);
    this.overlay = undefined;
    this.rng = this.mulberry32(42);
  }

  create() {
    const { width, height } = this.scale;
    this.groundY = height * GROUND_Y_RATIO;
    this.obstacles = [];
    this.coins = [];

    this.paper = addNotebookBackground(this);

    // Visual running path (notebook platform tile) — one row = texture height
    // Texture is 160×24; under HiDPI scale the tile so we don't stack 3 rows
    const pathH = 24 * DPR;
    this.path = this.add
      .tileSprite(width / 2, this.groundY + pathH / 2, width + 4, pathH, "platform")
      .setScrollFactor(0)
      .setDepth(2);
    this.path.setTileScale(DPR, DPR);

    // Thick static floor: top edge = groundY (feet land here)
    this.ground = this.physics.add.staticGroup();
    const floorH = Math.max(height - this.groundY + px(80), px(120));
    const groundHit = this.add
      .rectangle(width / 2, this.groundY + floorH / 2, width * 4, floorH, 0x000000, 0)
      .setScrollFactor(0);
    this.physics.add.existing(groundHit, true);
    this.ground.add(groundHit);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      this.groundY = gameSize.height * GROUND_Y_RATIO;
      this.path.setPosition(gameSize.width / 2, this.groundY + pathH / 2);
      this.path.width = gameSize.width + 4;
    };
    this.scale.on("resize", onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", onResize);
    });

    // Origin at feet so y = groundY sits on the path
    this.player = this.physics.add.sprite(
      width * 0.22,
      this.groundY,
      "crocodile-game",
    );
    this.player.setOrigin(0.5, 1);
    this.player.setScale(PLAYER_SCALE);
    this.player.setCollideWorldBounds(false);
    this.player.setDepth(10);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_W, BODY_H);
    body.setOffset(BODY_OX, BODY_OY);
    body.setMaxVelocity(px(600), px(1200));
    body.setAllowGravity(true);
    this.player.setBounce(0);
    this.player.play("run");

    this.physics.add.collider(this.player, this.ground);

    this.hud = this.add
      .text(px(16), px(16), "…", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(18),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.createControls();

    this.startedAt = performance.now();
    this.prioritizeNextBossWarm();
    if (this.resumedFromBoss) {
      if (this.dead) {
        this.time.delayedCall(0, () => void this.showGameOver());
      }
    } else {
      void this.beginRun();
    }
  }

  /** Ask the background warmer to fetch the upcoming story boss first. */
  private prioritizeNextBossWarm() {
    if (this.bossesCleared >= BOSSES.length) return;
    const id = BOSSES[this.bossesCleared]!.id;
    if (this.registry.get("warmBossPriority") !== id) {
      this.registry.set("warmBossPriority", id);
    }
    if (!this.scene.isActive("warm-assets")) {
      this.scene.launch("warm-assets");
    }
  }

  private nextBossAtM(): number | null {
    if (this.bossesCleared >= BOSSES.length) return null;
    return (this.bossesCleared + 1) * BOSS_EVERY_M;
  }

  private createControls() {
    const { width, height } = this.scale;
    // As marked in red: both under the path — ↑ left, ↓ right
    const place = (w: number, h: number, groundY: number) => {
      const y = groundY + (h - groundY) * 0.55;
      const gap = Math.min(w * 0.28, px(120));
      return {
        upX: w * 0.5 - gap,
        downX: w * 0.5 + gap,
        y,
      };
    };
    const p0 = place(width, height, this.groundY);

    const up = addPenButton(this, p0.upX, p0.y, "up");
    const down = addPenButton(this, p0.downX, p0.y, "down");
    this.controls = this.add.container(0, 0, [up.root, down.root]).setDepth(30);

    up.hit.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.();
      if (this.dead) return;
      this.jumpBufferMs = JUMP_BUFFER_MS;
      this.setDuck(false);
      this.tryJump();
    });

    down.hit.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.();
      if (this.dead) return;
      this.setDuck(true);
    });
    down.hit.on("pointerup", () => this.setDuck(false));
    down.hit.on("pointerupoutside", () => this.setDuck(false));
    // Don't clear duck on pointerout — finger drift would stand up under the pendulum

    this.input.keyboard?.on("keydown-UP", () => {
      if (this.dead) return;
      this.jumpBufferMs = JUMP_BUFFER_MS;
      this.setDuck(false);
      this.tryJump();
    });
    this.input.keyboard?.on("keydown-SPACE", () => {
      if (this.dead) return;
      this.jumpBufferMs = JUMP_BUFFER_MS;
      this.setDuck(false);
      this.tryJump();
    });
    this.input.keyboard?.on("keydown-DOWN", () => {
      if (!this.dead) this.setDuck(true);
    });
    this.input.keyboard?.on("keyup-DOWN", () => this.setDuck(false));

    const layout = (gameSize: Phaser.Structs.Size) => {
      const gy = gameSize.height * GROUND_Y_RATIO;
      const p = place(gameSize.width, gameSize.height, gy);
      up.root.setPosition(p.upX, p.y);
      down.root.setPosition(p.downX, p.y);
    };
    this.scale.on("resize", layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", layout);
      this.input.keyboard?.removeAllListeners();
    });
  }

  private setDuck(on: boolean) {
    if (this.ducking === on) return;
    if (on && this.jumping) return; // don't lie mid-air
    this.ducking = on;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (on) {
      body.setSize(DUCK_W, DUCK_H);
      body.setOffset(DUCK_OX, DUCK_OY);
      this.player.setScale(PLAYER_SCALE);
      this.player.play("lie", true);
      this.haptic("light");
    } else {
      body.setSize(BODY_W, BODY_H);
      body.setOffset(BODY_OX, BODY_OY);
      this.player.setScale(PLAYER_SCALE);
      if (!this.dead) this.player.play("run", true);
    }
  }

  private clearWorldObjects() {
    for (const o of this.obstacles) o.go.destroy();
    for (const c of this.coins) c.go.destroy();
    this.obstacles = [];
    this.coins = [];
  }

  private haptic(style: "light" | "medium" | "heavy") {
    try {
      getWebApp()?.HapticFeedback?.impactOccurred(style);
    } catch {
      /* ignore */
    }
  }

  private mulberry32(a: number) {
    return () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private freeLeft() {
    return Math.max(0, this.freeRevivesPerRun - this.reviveCount);
  }

  private canContinue() {
    return this.freeLeft() > 0 || this.extraRevives > 0;
  }

  private async beginRun() {
    this.rng = this.mulberry32(42);
    this.runId = "local-dev";
    this.extraRevives = 0;
    // Without a public API (Pages-only deploy) just play offline — never alert.
    if (!isApiEnabled() || !getInitData()) return;
    try {
      const res = await api<StartResponse>("/runs/start", { method: "POST", json: {} });
      this.runId = res.runId;
      this.seed = res.seed;
      this.freeRevivesPerRun = res.freeRevives ?? res.maxRevives ?? FREE_REVIVES;
      this.maxPackSize = res.maxPackSize ?? MAX_PACK;
      this.starsPerAttempt = res.starsPerAttempt ?? STARS_PER_ATTEMPT;
      this.vpnBotUsername = res.vpnBotUsername;
      const seedNum = Number.parseInt(res.seed.slice(0, 8), 16) || 1;
      this.rng = this.mulberry32(seedNum);
    } catch {
      this.runId = "local-dev";
    }
  }

  private tryJump() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    if ((grounded || this.coyoteMs > 0) && this.jumpBufferMs > 0) {
      body.setVelocityY(JUMP_VELOCITY);
      this.coyoteMs = 0;
      this.jumpBufferMs = 0;
      this.jumping = true;
      this.player.play("jump", true);
      this.haptic("medium");
    }
  }

  update(_time: number, delta: number) {
    try {
      this.tick(delta);
    } catch (err) {
      console.error("PlayScene tick error", err);
    }
  }

  private tick(delta: number) {
    if (this.dead) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) {
      this.coyoteMs = COYOTE_MS;
      if (this.ducking) {
        if (this.player.anims.currentAnim?.key !== "lie") {
          this.player.play("lie", true);
        }
      } else if (this.jumping) {
        this.jumping = false;
        this.player.play("run", true);
      } else if (this.player.anims.currentAnim?.key !== "run") {
        this.player.play("run", true);
      }
    } else {
      this.coyoteMs = Math.max(0, this.coyoteMs - delta);
    }

    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - delta);
    if (this.jumpBufferMs > 0) this.tryJump();

    this.scrollSpeed = BASE_SPEED + Math.floor(this.distance / 100) * SPEED_GAIN;
    this.maxSpeedSeen = Math.max(this.maxSpeedSeen, this.scrollSpeed / 10);
    const dx = (this.scrollSpeed * delta) / 1000;
    this.distance += dx / METERS_PER_TILE_PX;
    // tilePosition is in source texels; path tiles are scaled by DPR
    this.paper.tilePositionX += dx / DPR;
    this.path.tilePositionX += dx / DPR;

    const bossAt = this.nextBossAtM();
    if (bossAt !== null && this.distance >= bossAt - 40) {
      this.prioritizeNextBossWarm();
    }
    if (bossAt !== null && this.distance >= bossAt) {
      this.startStoryBoss();
      return;
    }

    this.spawnAcc += delta;

    // Time between obstacles (ms). Keep wide so one jump clears before next.
    const gap = Math.max(1750 - this.distance * 0.2, 1300);
    if (this.spawnAcc > gap) {
      this.spawnAcc = 0;
      this.spawnObstacle();
    }

    this.scrollWorld(dx, delta);
    this.checkCollisions();

    this.player.x = this.scale.width * 0.22;

    if (this.player.y > this.scale.height + px(80)) this.onHit();

    this.hud.setText(
      `Дистанция: ${Math.floor(this.distance)} м` +
        (bossAt !== null
          ? `\nДо босса: ${Math.max(0, Math.ceil(bossAt - this.distance))} м`
          : "") +
        `\nКлючи: ${this.pickupCoins}\nПопытки: ${this.freeLeft()}` +
        (this.extraRevives > 0 ? ` + ${this.extraRevives}` : ""),
    );
  }

  private startStoryBoss() {
    const at = this.nextBossAtM();
    if (at === null) return;
    const boss = BOSSES[this.bossesCleared]!;
    const snap: RunSnapshot = {
      distance: Math.max(this.distance, at),
      pickupCoins: this.pickupCoins,
      reviveCount: this.reviveCount,
      extraRevives: this.extraRevives,
      freeRevivesPerRun: this.freeRevivesPerRun,
      scrollSpeed: this.scrollSpeed,
      runId: this.runId,
      seed: this.seed,
      maxSpeedSeen: this.maxSpeedSeen,
      maxPackSize: this.maxPackSize,
      starsPerAttempt: this.starsPerAttempt,
      vpnBotUsername: this.vpnBotUsername,
      obstacleIdx: this.obstacleIdx,
      spikes5Count: this.spikes5Count,
      bossesCleared: this.bossesCleared,
    };
    this.registry.set("runSnapshot", snap);
    this.scene.start("boss-intro", { bossId: boss.id, fromRun: true });
  }

  private scrollWorld(dx: number, delta: number) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i]!;
      o.go.x -= dx;
      if (o.kind === "saw") {
        o.go.angle += (o.spin * delta) / 1000;
      } else if (o.kind === "pendulum") {
        o.phase += (o.freq * delta) / 1000;
        o.go.setAngle(Math.sin(o.phase) * o.amp);
      }
      // Despawn only once fully past the left edge (HiDPI sprites are wide)
      const leftExtent = Math.max(
        o.go.displayWidth * 0.55,
        o.hw * 2,
        o.arm + o.r,
        o.r * 2,
        px(40),
      );
      if (o.go.x < -leftExtent) {
        o.go.destroy();
        this.obstacles.splice(i, 1);
      }
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i]!;
      c.go.x -= dx;
      if (c.go.x < -(c.go.displayWidth + px(24))) {
        c.go.destroy();
        this.coins.splice(i, 1);
      }
    }
  }

  private spawnObstacle() {
    const { width } = this.scale;
    const kind = OBSTACLE_CYCLE[this.obstacleIdx % OBSTACLE_CYCLE.length]!;
    this.obstacleIdx += 1;

    if (kind === "saw") {
      const scale = (0.55 + this.rng() * 0.35) * DPR;
      const r = 96 * scale * 0.42;
      const y = this.groundY - r - px(2);
      const go = this.add.image(0, y, "saw").setScale(scale).setDepth(5);
      const x = width + go.displayWidth * 0.5 + px(8);
      go.setX(x);
      const spin = 180 + this.rng() * 220;
      this.obstacles.push({
        go,
        kind: "saw",
        r,
        hw: 0,
        hh: 0,
        spin,
        phase: 0,
        amp: 0,
        freq: 0,
        arm: 0,
      });
      this.attachKeyForObstacle(kind, x);
      return;
    }

    if (kind === "spikes") {
      const scale = (0.7 + this.rng() * 0.15) * DPR;
      const hw = 96 * scale * 0.45;
      const hh = 36 * scale * 0.45;
      const go = this.add
        .image(0, this.groundY + px(2), "spikes")
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(5);
      const x = width + go.displayWidth * 0.5 + px(8);
      go.setX(x);
      this.obstacles.push({
        go,
        kind: "spikes",
        r: 0,
        hw,
        hh,
        spin: 0,
        phase: 0,
        amp: 0,
        freq: 0,
        arm: 0,
      });
      this.attachKeyForObstacle(kind, x);
      return;
    }

    if (kind === "spikes5") {
      // Wider 5-spike strip (296×68) — scale down to a jumpable width
      const scale = (0.42 + this.rng() * 0.08) * DPR;
      const hw = 296 * scale * 0.45;
      const hh = 68 * scale * 0.42;
      const go = this.add
        .image(0, this.groundY + px(2), "spikes5")
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(5);
      const x = width + go.displayWidth * 0.5 + px(8);
      go.setX(x);
      this.obstacles.push({
        go,
        kind: "spikes5",
        r: 0,
        hw,
        hh,
        spin: 0,
        phase: 0,
        amp: 0,
        freq: 0,
        arm: 0,
      });
      this.attachKeyForObstacle(kind, x);
      return;
    }

    // Pendulum: must duck (lie) to pass; standing torso gets hit.
    const scale = 0.95 * DPR;
    const arm = 168 * scale;
    const r = 26 * scale;
    // Ball bottom high enough that a lying hitbox fits under it
    const pivotY = this.groundY - arm - r - px(26);
    const go = this.add
      .image(0, pivotY, "pendulum")
      .setOrigin(0.5, 0)
      .setScale(scale)
      .setDepth(5);
    const x = width + go.displayWidth * 0.5 + px(8);
    go.setX(x);
    this.obstacles.push({
      go,
      kind: "pendulum",
      r,
      hw: 0,
      hh: 0,
      spin: 0,
      phase: this.rng() * Math.PI * 2,
      amp: 38 + this.rng() * 12,
      freq: 2.2 + this.rng() * 0.6,
      arm,
    });
    this.attachKeyForObstacle(kind, x);
  }

  private pendulumBall(o: Obstacle) {
    // Phaser angle is clockwise; local "down" (0, arm) → (-sin, cos)
    const rad = Phaser.Math.DegToRad(o.go.angle);
    return {
      x: o.go.x - Math.sin(rad) * o.arm,
      y: o.go.y + Math.cos(rad) * o.arm,
    };
  }

  private spawnKeyAt(x: number, y: number, bait = false) {
    const go = this.add
      .image(x, y, "pickup-key")
      .setDepth(6)
      .setScale((0.95 + this.rng() * 0.15) * DPR);
    this.coins.push({ go, r: px(16), taken: false, bait });
  }

  /**
   * Keys follow traps (no extra traps):
   * - pendulum → safe chest key underneath (duck)
   * - every 3rd spikes5 → bait jump-key just before it (no key above)
   * - other ground traps → safe jump-key above (clear the trap)
   */
  private attachKeyForObstacle(
    kind: "saw" | "spikes" | "pendulum" | "spikes5",
    trapX: number,
  ) {
    if (kind === "pendulum") {
      this.spawnKeyAt(trapX, this.groundY - KEY_CHEST_OFF);
      return;
    }

    if (kind === "spikes5") {
      this.spikes5Count += 1;
      if (this.spikes5Count % BAIT_EVERY_SPIKES5 === 0) {
        this.spawnKeyAt(
          trapX - BAIT_LEAD_PX,
          this.groundY - KEY_JUMP_OFF,
          true,
        );
        return;
      }
    }

    this.spawnKeyAt(trapX, this.groundY - KEY_JUMP_OFF);
  }

  private playerBounds() {
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  }

  /** Collect box: feet → head (sprite height). Higher keys still need a jump. */
  private playerCollectBounds() {
    const h = FRAME * PLAYER_SCALE * 0.95;
    const w = FRAME * PLAYER_SCALE * 0.55;
    return new Phaser.Geom.Rectangle(
      this.player.x - w / 2,
      this.player.y - h,
      w,
      h,
    );
  }

  /** Standing: full height for overhead traps; ducking: feet hitbox only. */
  private playerHazardBounds() {
    if (this.ducking) return this.playerBounds();
    const h = FRAME * PLAYER_SCALE * 0.88;
    const w = FRAME * PLAYER_SCALE * 0.38;
    return new Phaser.Geom.Rectangle(
      this.player.x - w / 2,
      this.player.y - h,
      w,
      h,
    );
  }

  private checkCollisions() {
    const pb = this.playerBounds();
    const collect = this.playerCollectBounds();
    const hazard = this.playerHazardBounds();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    for (const o of this.obstacles) {
      let hit = false;
      if (o.kind === "saw") {
        hit =
          Phaser.Math.Distance.Between(o.go.x, o.go.y, pb.centerX, pb.centerY) <
          o.r + Math.min(pb.width, pb.height) * 0.35;
      } else if (o.kind === "spikes" || o.kind === "spikes5") {
        const left = o.go.x - o.hw;
        const right = o.go.x + o.hw;
        const top = o.go.y - o.hh * 2;
        const bottom = o.go.y;
        hit = Phaser.Geom.Rectangle.Overlaps(
          pb,
          new Phaser.Geom.Rectangle(left, top, right - left, bottom - top),
        );
      } else {
        const ball = this.pendulumBall(o);
        if (this.ducking) {
          // Lying: only die if the ball actually dips into the low hitbox
          const duck = pb;
          const ballBottom = ball.y + o.r * 0.65;
          const nearX =
            Math.abs(ball.x - duck.centerX) < duck.width * 0.5 + o.r * 0.45;
          hit = nearX && ballBottom >= duck.y;
        } else {
          hit =
            Phaser.Math.Distance.Between(
              ball.x,
              ball.y,
              hazard.centerX,
              hazard.centerY,
            ) <
            o.r + Math.min(hazard.width, hazard.height) * 0.28;
        }
      }
      if (hit) {
        this.onHit();
        return;
      }
    }

    for (const c of this.coins) {
      if (c.taken) continue;
      // Bait sits before the spikes with no hazard under it — must jump
      if (c.bait && grounded) continue;
      const keyBox = new Phaser.Geom.Rectangle(
        c.go.x - c.r,
        c.go.y - c.r,
        c.r * 2,
        c.r * 2,
      );
      if (Phaser.Geom.Rectangle.Overlaps(collect, keyBox)) {
        c.taken = true;
        c.go.destroy();
        this.pickupCoins += 1;
        this.haptic("light");
      }
    }
    this.coins = this.coins.filter((c) => !c.taken);
  }

  private onHit() {
    if (this.dead) return;
    this.dead = true;
    this.player.play("lie", true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.haptic("heavy");
    this.time.delayedCall(0, () => void this.showGameOver());
  }

  private async showGameOver() {
    const { width, height } = this.scale;

    this.overlay = this.add.container(0, 0).setDepth(50);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);
    this.overlay.add(bg);

    if (this.canContinue()) {
      this.buildContinueOverlay(width, height);
    } else {
      this.buildTariffOverlay(width, height);
    }
  }

  private buildContinueOverlay(width: number, height: number) {
    if (!this.overlay) return;

    const title = this.add
      .text(width / 2, height * 0.22, "Game Over", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(32),
        color: "#f4f1e8",
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    const info = this.add
      .text(
        width / 2,
        height * 0.34,
        `Дистанция ${Math.floor(this.distance)} м\nКлючи забега: ${this.pickupCoins}`,
        {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: fontPx(16),
          color: "#e8e2d4",
          align: "center",
          fontStyle: "italic",
        },
      )
      .setOrigin(0.5);
    this.overlay.add([title, info]);

    this.addOverlayButton(width / 2, height * 0.5, "Продолжить", () => {
      void this.doContinue();
    });
    this.addOverlayButton(width / 2, height * 0.6, "Забрать ключи", () => {
      void this.finishAndMenu();
    });
    this.addOverlayButton(width / 2, height * 0.7, "В меню", () => {
      void this.finishAndMenu();
    });
    this.addOverlayButton(width / 2, height * 0.8, "VPN-бот", () => {
      const url = `https://t.me/${this.vpnBotUsername}`;
      getWebApp()?.openTelegramLink?.(url) ?? window.open(url, "_blank");
    });
  }

  private buildTariffOverlay(width: number, height: number) {
    if (!this.overlay) return;

    const title = this.add
      .text(width / 2, height * 0.14, "Попытки закончились", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(26),
        color: "#f4f1e8",
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(width / 2, height * 0.22, "Выбери пакет продолжений:", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(15),
        color: "#e8e2d4",
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    this.overlay.add([title, hint]);

    const labels = ["1 попытка", "2 попытки", "3 попытки", "4 попытки", "5 попыток"];
    let y = height * 0.3;
    for (let n = 1; n <= this.maxPackSize; n++) {
      const stars = n * this.starsPerAttempt;
      const label = `${labels[n - 1]} — ${stars}⭐`;
      this.addOverlayButton(width / 2, y, label, () => void this.buyPack(n), {
        width: 260,
        height: 40,
        fontSize: "17px",
      });
      y += height * 0.09;
    }

    this.addOverlayButton(width / 2, y + height * 0.02, "Забрать ключи", () => {
      void this.finishAndMenu();
    });
    this.addOverlayButton(width / 2, y + height * 0.12, "В меню", () => {
      void this.finishAndMenu();
    });
  }

  private addOverlayButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    opts?: { width?: number; height?: number; fontSize?: string },
  ) {
    if (!this.overlay) return;
    const btn = addPenTextButton(this, x, y, label, onClick, {
      depth: 51,
      paperFill: true,
      width: opts?.width,
      height: opts?.height,
      fontSize: opts?.fontSize,
    });
    this.overlay.add(btn.root);
  }

  private async doContinue() {
    if (!this.canContinue()) return;

    if (!this.runId || this.runId === "local-dev") {
      if (this.freeLeft() > 0) {
        this.reviveCount += 1;
      } else if (this.extraRevives > 0) {
        this.extraRevives -= 1;
        this.reviveCount += 1;
      }
      this.resumeAfterRevive();
      return;
    }

    try {
      const res = await api<{
        reviveCount: number;
        freeLeft: number;
        extraRevives: number;
      }>("/runs/continue", { method: "POST", json: { runId: this.runId } });
      this.reviveCount = res.reviveCount;
      this.extraRevives = res.extraRevives;
      this.resumeAfterRevive();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  private async buyPack(count: number) {
    if (!this.runId || this.runId === "local-dev") {
      // Offline: grant pack without Stars so local testing works
      this.extraRevives += count;
      this.overlay?.destroy(true);
      this.overlay = undefined;
      void this.showGameOver();
      return;
    }
    try {
      const inv = await api<{ invoiceLink: string }>(
        "/stars/revive-invoice",
        { method: "POST", json: { runId: this.runId, count } },
      );
      const tg = getWebApp();
      if (!tg?.openInvoice) {
        alert("openInvoice недоступен.");
        return;
      }
      tg.openInvoice(inv.invoiceLink, (status) => {
        if (status === "paid") void this.syncPackPurchase();
        else alert(`Оплата: ${status}`);
      });
    } catch (err) {
      alert((err as Error).message);
    }
  }

  private async syncPackPurchase() {
    if (this.runId && this.runId !== "local-dev") {
      try {
        for (let i = 0; i < 8; i++) {
          const run = await api<{ extraRevives: number; reviveCount: number }>(
            `/runs/${this.runId}`,
          );
          if (run.extraRevives > this.extraRevives) {
            this.extraRevives = run.extraRevives;
            this.reviveCount = run.reviveCount;
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
      } catch {
        /* keep local state */
      }
    }
    this.overlay?.destroy(true);
    this.overlay = undefined;
    void this.showGameOver();
  }

  private resumeAfterRevive() {
    this.overlay?.destroy(true);
    this.overlay = undefined;
    this.dead = false;
    this.clearWorldObjects();
    this.obstacleIdx = 0;
    this.spikes5Count = 0;
    this.setDuck(false);
    this.player.setPosition(this.scale.width * 0.22, this.groundY);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.jumping = false;
    this.player.play("run", true);
  }

  private async finishAndMenu() {
    const durationMs = Math.floor(performance.now() - this.startedAt);
    const dist = Math.floor(this.distance);
    recordLocalScore(dist);
    if (this.runId && this.runId !== "local-dev") {
      try {
        const res = await api<FinishResponse>("/runs/finish", {
          method: "POST",
          json: {
            runId: this.runId,
            distance: dist,
            pickupCoins: this.pickupCoins,
            durationMs,
            clientMaxSpeed: this.maxSpeedSeen,
          },
        });
        alert(`+${res.rewardCoins} ключей. Баланс: ${res.coinBalance}`);
      } catch (err) {
        alert((err as Error).message);
      }
    }
    this.scene.start("menu");
  }
}
