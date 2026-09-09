import Phaser from "phaser";
import { BOSSES, type BossId, isBossId } from "../boss/bossDefs";
import {
  TRICK_FRAME_H,
  TRICK_FRAME_RATE,
  TRICK_FRAME_W,
  TRICK_ORIGIN_X,
  TRICK_ORIGIN_Y,
  bossTrickAnimKey,
  bossTrickKey,
  isBossBundleReady,
  queueBossBattleAssets,
  queueBossTrickAssets,
} from "../boss/bossAssets";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { DPR, fontPx, px } from "../ui/dpr";

const TRICK_RU: Record<BossId, string> = {
  bear: "Перекладывание шайбы с клюшки в ловушку и обратно",
  shark: "Восьмёрка шайбой перед собой",
  boar: "Балансировка шайбы на ребре",
  octopus: "Перекладывание шайбы между двумя клюшками",
  robot: "Обвод клюшкой неподвижной шайбы",
};

type IntroData = { bossId?: string; fromRun?: boolean };

/** Short stick-trick preview before every boss fight. */
export class BossIntroScene extends Phaser.Scene {
  private bossId: BossId = "bear";
  private fromRun = false;
  private entered = false;

  constructor() {
    super("boss-intro");
  }

  init(data: IntroData) {
    this.bossId =
      data.bossId && isBossId(data.bossId) ? data.bossId : "bear";
    this.fromRun = !!data.fromRun;
    this.entered = false;
  }

  create() {
    const { width, height } = this.scale;
    addNotebookBackground(this);

    if (isBossBundleReady(this, this.bossId)) {
      this.showTrick();
      return;
    }

    // Warm didn't finish yet — load just this boss with a visible bar
    const barW = Math.min(width * 0.62, px(280));
    const barY = height * 0.55;
    const ink = Phaser.Display.Color.HexStringToColor(NOTEBOOK_INK).color;
    this.add
      .text(width / 2, height * 0.42, "Готовим бой…", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(18),
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    this.add
      .rectangle(width / 2, barY, barW + px(4), px(12))
      .setStrokeStyle(px(2), ink, 0.85)
      .setFillStyle(0xf4f1e8, 1);
    const fill = this.add
      .rectangle(width / 2 - barW / 2, barY, 1, px(8), ink, 0.9)
      .setOrigin(0, 0.5);

    queueBossTrickAssets(this, this.bossId);
    queueBossBattleAssets(this, this.bossId);

    this.load.on("progress", (v: number) => {
      fill.width = Math.max(1, barW * v);
    });
    this.load.once("complete", () => this.showTrick());
    this.load.start();
  }

  private showTrick() {
    // Clear interim loading UI
    this.children.removeAll(true);

    const { width, height } = this.scale;
    addNotebookBackground(this);

    const texKey = bossTrickKey(this.bossId);
    const animKey = bossTrickAnimKey(this.bossId);
    this.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.LINEAR);

    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(texKey, {
          start: 0,
          end: 7,
        }),
        frameRate: TRICK_FRAME_RATE,
        repeat: 1,
      });
    }

    const def = BOSSES.find((b) => b.id === this.bossId);

    this.add
      .text(width / 2, height * 0.12, def?.name ?? this.bossId, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(28),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.18, TRICK_RU[this.bossId], {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(15),
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: width * 0.86 },
      })
      .setOrigin(0.5);

    const groundY = height * 0.72;
    this.add
      .tileSprite(width / 2, groundY + 12 * DPR, width + 4, 24 * DPR, "platform")
      .setScrollFactor(0)
      .setDepth(2)
      .setTileScale(DPR, DPR);

    const scale = Math.min(
      (height * 0.48) / TRICK_FRAME_H,
      (width * 0.72) / TRICK_FRAME_W,
    );
    const sprite = this.add
      .sprite(width * 0.55, groundY, texKey, 0)
      .setOrigin(TRICK_ORIGIN_X, TRICK_ORIGIN_Y)
      .setScale(scale)
      .setFlipX(true)
      .setDepth(10);

    sprite.play(animKey);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.time.delayedCall(200, () => this.enterBattle());
    });

    this.input.once("pointerdown", () => this.enterBattle());

    this.add
      .text(width / 2, height * 0.9, "Нажми, чтобы пропустить", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(13),
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setDepth(20);
  }

  private enterBattle() {
    if (this.entered) return;
    this.entered = true;
    this.scene.start("boss-battle", {
      bossId: this.bossId,
      fromRun: this.fromRun,
    });
  }
}
