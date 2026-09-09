import Phaser from "phaser";
import { ensureKeyTexture } from "../ui/keyTexture";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { DPR, fontPx, px } from "../ui/dpr";
import {
  BB_FX_KEY,
  BB_HERO_KEY,
  bossTextureKey,
  queueBossBattleAssets,
} from "../boss/bossAssets";
import { BOSSES } from "../boss/bossDefs";
import { queueBossTrickAssets } from "./BossIntroScene";

/** Splash stays on screen this long so the load screen is always visible. */
const BOOT_MIN_MS = 5000;

export class BootScene extends Phaser.Scene {
  private barFill!: Phaser.GameObjects.Rectangle;
  private barWidth = 0;
  private assetsReady = false;
  private splashDone = false;

  constructor() {
    super("boot");
  }

  /** Phase 1 — only the menu hero, so the splash can show immediately. */
  preload() {
    const base = import.meta.env.BASE_URL;
    this.load.spritesheet(
      "crocodile-trick",
      `${base}assets/crocodile-hero/crocodile-stick-trick-spritesheet.png`,
      { frameWidth: 384, frameHeight: 384 },
    );
  }

  create() {
    const { width, height } = this.scale;
    addNotebookBackground(this);
    this.assetsReady = false;
    this.splashDone = false;

    this.textures
      .get("crocodile-trick")
      .setFilter(Phaser.Textures.FilterMode.LINEAR);

    if (!this.anims.exists("stick_trick")) {
      this.anims.create({
        key: "stick_trick",
        frames: [
          { key: "crocodile-trick", frame: 0, duration: 240 },
          { key: "crocodile-trick", frame: 1, duration: 140 },
          { key: "crocodile-trick", frame: 2, duration: 140 },
          { key: "crocodile-trick", frame: 3, duration: 140 },
          { key: "crocodile-trick", frame: 4, duration: 180 },
          { key: "crocodile-trick", frame: 5, duration: 240 },
          { key: "crocodile-trick", frame: 6, duration: 180 },
          { key: "crocodile-trick", frame: 7, duration: 280 },
        ],
        repeat: -1,
      });
    }

    this.add
      .text(width / 2, height * 0.14, "DUNDEE RUNNER", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(34),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .sprite(width / 2, height * 0.42, "crocodile-trick")
      .setOrigin(0.5, 0.9375)
      .setScale(0.52 * DPR)
      .setDepth(5)
      .play("stick_trick");

    this.add
      .text(width / 2, height * 0.62, "Загрузка…", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(16),
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.barWidth = Math.min(width * 0.62, px(280));
    const barH = px(8);
    const barY = height * 0.68;
    const ink = Phaser.Display.Color.HexStringToColor(NOTEBOOK_INK).color;

    this.add
      .rectangle(width / 2, barY, this.barWidth + px(4), barH + px(4))
      .setStrokeStyle(px(2), ink, 0.85)
      .setFillStyle(0xf4f1e8, 1);

    this.barFill = this.add
      .rectangle(width / 2 - this.barWidth / 2, barY, 1, barH, ink, 0.9)
      .setOrigin(0, 0.5);

    // Smooth 5s fill so the splash always reads clearly (even with cached assets)
    this.tweens.add({
      targets: this.barFill,
      width: this.barWidth,
      duration: BOOT_MIN_MS,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.splashDone = true;
        this.tryEnterMenu();
      },
    });

    this.loadRest();
  }

  /** Phase 2 — runner + all boss-battle assets while the bar animates. */
  private loadRest() {
    const base = import.meta.env.BASE_URL;

    this.load.spritesheet(
      "crocodile",
      `${base}assets/crocodile-hero/crocodile-hockey-clean.png`,
      { frameWidth: 384, frameHeight: 384 },
    );
    this.load.spritesheet(
      "crocodile-game",
      `${base}assets/crocodile-hero/crocodile-hockey-clean.png`,
      { frameWidth: 384, frameHeight: 384 },
    );
    this.load.image("platform", `${base}assets/platform_static.png`);
    this.load.image("puck-hit-button", `${base}assets/ui/puck-hit-button.png`);
    this.load.image("saw", `${base}assets/saw_blade.png`);
    this.load.image("spikes", `${base}assets/spike_trap.png`);
    this.load.image("spikes5", `${base}assets/spikes_5.png`);
    this.load.image("pendulum", `${base}assets/pendulum.png`);
    queueBossBattleAssets(this);
    queueBossTrickAssets(this);

    this.load.once("complete", () => {
      this.assetsReady = true;
      this.tryEnterMenu();
    });

    this.load.start();
  }

  private tryEnterMenu() {
    if (!this.assetsReady || !this.splashDone) return;
    this.finishBoot();
  }

  private finishBoot() {
    ensureKeyTexture(this);
    this.textures.get("crocodile").setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures
      .get("crocodile-game")
      .setFilter(Phaser.Textures.FilterMode.LINEAR);

    if (this.textures.exists(BB_HERO_KEY)) {
      this.textures.get(BB_HERO_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    if (this.textures.exists(BB_FX_KEY)) {
      this.textures.get(BB_FX_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    for (const boss of BOSSES) {
      const key = bossTextureKey(boss.id);
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }

    if (!this.anims.exists("menu-idle")) {
      this.anims.create({
        key: "menu-idle",
        frames: this.anims.generateFrameNumbers("crocodile", {
          start: 0,
          end: 3,
        }),
        frameRate: 5,
        repeat: -1,
      });
    }
    if (!this.anims.exists("idle")) {
      this.anims.create({
        key: "idle",
        frames: this.anims.generateFrameNumbers("crocodile-game", {
          start: 0,
          end: 3,
        }),
        frameRate: 5,
        repeat: -1,
      });
    }
    if (!this.anims.exists("run")) {
      this.anims.create({
        key: "run",
        frames: this.anims.generateFrameNumbers("crocodile-game", {
          start: 4,
          end: 7,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!this.anims.exists("jump")) {
      this.anims.create({
        key: "jump",
        frames: this.anims.generateFrameNumbers("crocodile-game", {
          start: 8,
          end: 11,
        }),
        frameRate: 8,
        repeat: 0,
      });
    }
    if (!this.anims.exists("lie")) {
      this.anims.create({
        key: "lie",
        frames: this.anims.generateFrameNumbers("crocodile-game", {
          start: 12,
          end: 15,
        }),
        frameRate: 8,
        repeat: 0,
      });
    }

    this.barFill.width = this.barWidth;
    this.scene.start("menu");
  }
}
