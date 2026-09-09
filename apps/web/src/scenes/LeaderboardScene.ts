import Phaser from "phaser";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { addPenTextButton } from "../ui/penControls";
import { fetchLeaderboard } from "../leaderboard";
import { fontPx, px } from "../ui/dpr";

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("leaderboard");
  }

  create() {
    const { width, height } = this.scale;
    addNotebookBackground(this);

    this.add
      .text(width / 2, height * 0.1, "Рекорды", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(32),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.17, "Топ-10 · дистанция", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(16),
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    const listText = this.add
      .text(width / 2, height * 0.26, "Загрузка…", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(18),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
        align: "left",
        lineSpacing: 10,
      })
      .setOrigin(0.5, 0);

    addPenTextButton(this, width / 2, height * 0.9, "В меню", () => {
      this.scene.start("menu");
    });

    void fetchLeaderboard()
      .then((entries) => {
        if (!entries.length) {
          listText.setText("Пока пусто —\nпробеги первый забег!");
          listText.setAlign("center");
          listText.setOrigin(0.5, 0);
          return;
        }
        listText.setText(
          entries.map((e) => `${e.rank}. ${e.name} — ${e.distance} м`).join("\n"),
        );
      })
      .catch(() => {
        listText.setText("Не удалось загрузить рекорды");
        listText.setAlign("center");
      });
  }
}
