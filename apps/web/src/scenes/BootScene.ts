import Phaser from "phaser";
import { ensureKeyTexture } from "../ui/keyTexture";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { DPR, fontPx, px } from "../ui/dpr";

/** Keep splash up so the stick-trick loop is actually visible (~3 loops). */
const BOOT_MIN_MS = 5000;

export class BootScene extends Phaser.Scene {
  private barFill!: Phaser.GameObjects.Rectangle;
  private barWidth = 0;
  private status!: Phaser.GameObjects.Text;
  private assetsReady = false;
  private splashDone = false;
  private bootStartedAt = 0;
  private loadP = 0;
  private shownP = 0;
  private finished = false;

  constructor() {
    super("boot");
  }

  /** Phase 1 — splash hero only, so UI appears immediately. */
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
    this.finished = false;
    this.loadP = 0;
    this.shownP = 0;
    this.bootStartedAt = this.time.now;

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

    this.status = this.add
      .text(width / 2, height * 0.62, "Загрузка… 0%", {
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

    this.time.delayedCall(BOOT_MIN_MS, () => {
      this.splashDone = true;
      this.tryEnterMenu();
    });

    this.loadRunner();
  }

  update() {
    if (this.finished) return;
    const timeP = Phaser.Math.Clamp(
      (this.time.now - this.bootStartedAt) / BOOT_MIN_MS,
      0,
      1,
    );
    // Cached assets finish instantly — still ease the bar over the splash window.
    // Slow networks: never claim 100% until files are in and the min time passed.
    const target = this.assetsReady
      ? timeP
      : Math.min(this.loadP, timeP, 0.97);
    this.shownP = Math.max(this.shownP, target);
    this.barFill.width = Math.max(1, this.barWidth * this.shownP);
    this.status.setText(`Загрузка… ${Math.round(this.shownP * 100)}%`);
  }

  /** Phase 2 — only what menu + run need. Boss packs warm in the background later. */
  private loadRunner() {
    const base = import.meta.env.BASE_URL;

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

    this.load.on("progress", (value: number) => {
      this.loadP = Math.max(0, Math.min(1, value));
    });

    this.load.once("complete", () => {
      this.loadP = 1;
      this.assetsReady = true;
      this.tryEnterMenu();
    });

    this.load.start();
  }

  private tryEnterMenu() {
    if (!this.assetsReady || !this.splashDone || this.finished) return;
    this.shownP = 1;
    this.barFill.width = this.barWidth;
    this.status.setText("Загрузка… 100%");
    this.finishBoot();
  }

  private finishBoot() {
    this.finished = true;
    ensureKeyTexture(this);
    this.textures
      .get("crocodile-game")
      .setFilter(Phaser.Textures.FilterMode.LINEAR);

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

    this.scene.launch("warm-assets");
    this.scene.start("menu");
  }
}
