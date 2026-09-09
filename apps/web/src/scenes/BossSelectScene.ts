import Phaser from "phaser";
import { BOSSES, type BossId } from "../boss/bossDefs";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { addPenTextButton } from "../ui/penControls";
import { DPR, fontPx, px } from "../ui/dpr";

export class BossSelectScene extends Phaser.Scene {
  constructor() {
    super("boss-select");
  }

  preload() {
    const base = import.meta.env.BASE_URL;
    if (!this.textures.exists("boss-five")) {
      this.load.image(
        "boss-five",
        `${base}assets/boss-battles/five-bosses.png`,
      );
    }
  }

  create() {
    const { width, height } = this.scale;
    addNotebookBackground(this);

    this.add
      .text(width / 2, height * 0.07, "Босс-битвы", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(30),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.125, "Прыгай · приседай · бей шайбой", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(14),
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    if (this.textures.exists("boss-five")) {
      const banner = this.add
        .image(width / 2, height * 0.24, "boss-five")
        .setOrigin(0.5);
      const maxW = Math.min(width * 0.92, 520);
      banner.setScale(maxW / banner.width);
    }

    const startY = height * 0.38;
    const gap = Math.min(px(52), (height * 0.48) / BOSSES.length);

    BOSSES.forEach((boss, i) => {
      addPenTextButton(
        this,
        width / 2,
        startY + i * gap,
        boss.name,
        () => this.openBattle(boss.id),
        { width: Math.min(300, (width / DPR) * 0.86), height: 42, fontSize: 17 },
      );
    });

    addPenTextButton(this, width / 2, height * 0.93, "В меню", () => {
      this.scene.start("menu");
    });
  }

  private openBattle(bossId: BossId) {
    this.scene.start("boss-intro", { bossId });
  }
}
