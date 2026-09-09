import Phaser from "phaser";
import { ensureKeyTexture } from "../ui/keyTexture";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const base = import.meta.env.BASE_URL;
    // Hi-res for menu
    this.load.spritesheet(
      "crocodile",
      `${base}assets/crocodile-hero/crocodile-hockey-clean.png`,
      { frameWidth: 384, frameHeight: 384 },
    );
    // Baked to on-screen size (1:1) for sharp edges
    this.load.spritesheet(
      "crocodile-game",
      `${base}assets/crocodile-hero/crocodile-hockey-game-v2.png`,
      { frameWidth: 80, frameHeight: 80 },
    );
    this.load.spritesheet(
      "crocodile-trick",
      `${base}assets/crocodile-hero/crocodile-stick-trick-spritesheet.png`,
      { frameWidth: 384, frameHeight: 384 },
    );
    this.load.image("platform", `${base}assets/platform_static.png`);
    this.load.image("saw", `${base}assets/saw_blade.png`);
    this.load.image("spikes", `${base}assets/spike_trap.png`);
    this.load.image("spikes5", `${base}assets/spikes_5.png`);
    this.load.image("pendulum", `${base}assets/pendulum.png`);
  }

  create() {
    ensureKeyTexture(this);
    this.textures.get("crocodile").setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures
      .get("crocodile-game")
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures
      .get("crocodile-trick")
      .setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.anims.create({
      key: "menu-idle",
      frames: this.anims.generateFrameNumbers("crocodile", { start: 0, end: 3 }),
      frameRate: 5,
      repeat: -1,
    });
    // Menu stick-trick loop (durations from trick-animation.json)
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
    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers("crocodile-game", {
        start: 0,
        end: 3,
      }),
      frameRate: 5,
      repeat: -1,
    });
    this.anims.create({
      key: "run",
      frames: this.anims.generateFrameNumbers("crocodile-game", {
        start: 4,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "jump",
      frames: this.anims.generateFrameNumbers("crocodile-game", {
        start: 8,
        end: 11,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: "lie",
      frames: this.anims.generateFrameNumbers("crocodile-game", {
        start: 12,
        end: 15,
      }),
      frameRate: 8,
      repeat: 0,
    });

    this.scene.start("menu");
  }
}
