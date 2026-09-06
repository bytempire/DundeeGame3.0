import Phaser from "phaser";
import { ensureKeyTexture } from "../ui/keyTexture";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const base = import.meta.env.BASE_URL;
    this.load.spritesheet(
      "crocodile",
      `${base}assets/crocodile-hero/crocodile-hero-spritesheet.png`,
      { frameWidth: 320, frameHeight: 320 },
    );
    this.load.image("platform", `${base}assets/platform_static.png`);
    this.load.image("saw", `${base}assets/saw_blade.png`);
    this.load.image("spikes", `${base}assets/spike_trap.png`);
    this.load.image("spikes5", `${base}assets/spikes_5.png`);
    this.load.image("pendulum", `${base}assets/pendulum.png`);
  }

  create() {
    ensureKeyTexture(this);
    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers("crocodile", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "run",
      frames: this.anims.generateFrameNumbers("crocodile", { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "jump",
      frames: this.anims.generateFrameNumbers("crocodile", { start: 8, end: 11 }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: "lie",
      frames: this.anims.generateFrameNumbers("crocodile", {
        start: 12,
        end: 15,
      }),
      frameRate: 6,
      repeat: -1,
    });

    this.scene.start("menu");
  }
}
