import Phaser from "phaser";
import { BOSSES, type BossId, isBossId } from "../boss/bossDefs";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { DPR, fontPx } from "../ui/dpr";

/** Stick-trick sheets: 8 frames @ 384×384, grid 4×2, 8 FPS. */
export const TRICK_FRAME_W = 384;
export const TRICK_FRAME_H = 384;
export const TRICK_FRAME_RATE = 8;
/** Feet anchor from pack (176, 340) → normalized origin */
export const TRICK_ORIGIN_X = 176 / 384;
export const TRICK_ORIGIN_Y = 340 / 384;

const TRICK_RU: Record<BossId, string> = {
  bear: "Перекладывание шайбы с клюшки в ловушку и обратно",
  shark: "Восьмёрка шайбой перед собой",
  boar: "Балансировка шайбы на ребре",
  octopus: "Перекладывание шайбы между двумя клюшками",
  robot: "Обвод клюшкой неподвижной шайбы",
};

export function bossTrickKey(bossId: BossId) {
  return `boss-trick-${bossId}`;
}

export function bossTrickAnimKey(bossId: BossId) {
  return `boss-trick-anim-${bossId}`;
}

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

  preload() {
    queueBossTrickAssets(this);
  }

  create() {
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
        repeat: 1, // ~2 seconds preview
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

    const scale = Math.min((height * 0.48) / TRICK_FRAME_H, (width * 0.72) / TRICK_FRAME_W);
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

/** Preload all boss trick sheets (boot / intro). */
export function queueBossTrickAssets(scene: Phaser.Scene) {
  const base = `${import.meta.env.BASE_URL}assets/boss-battles`;
  for (const boss of BOSSES) {
    const key = bossTrickKey(boss.id);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, `${base}/${boss.id}/trick.png`, {
      frameWidth: TRICK_FRAME_W,
      frameHeight: TRICK_FRAME_H,
    });
  }
}
