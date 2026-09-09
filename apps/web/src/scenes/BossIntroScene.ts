import Phaser from "phaser";
import { type BossId, isBossId } from "../boss/bossDefs";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { DPR, fontPx } from "../ui/dpr";

export const BEAR_FEINT_KEY = "bear-feint-puck";
export const BEAR_FEINT_ANIM = "bear-feint-intro";

type IntroData = { bossId?: string; fromRun?: boolean };

/** Cinematic feint before the first story boss (bear). */
export class BossIntroScene extends Phaser.Scene {
  private bossId: BossId = "bear";
  private fromRun = false;

  constructor() {
    super("boss-intro");
  }

  init(data: IntroData) {
    this.bossId =
      data.bossId && isBossId(data.bossId) ? data.bossId : "bear";
    this.fromRun = !!data.fromRun;
  }

  preload() {
    if (this.bossId !== "bear") return;
    const base = `${import.meta.env.BASE_URL}assets/boss-battles`;
    if (!this.textures.exists(BEAR_FEINT_KEY)) {
      // 48 frames @ 384×256, grid 6×8, 30 FPS (pack README)
      this.load.spritesheet(
        BEAR_FEINT_KEY,
        `${base}/bear/feint_with_puck.png`,
        { frameWidth: 384, frameHeight: 256 },
      );
    }
  }

  create() {
    if (this.bossId !== "bear") {
      this.scene.start("boss-battle", {
        bossId: this.bossId,
        fromRun: this.fromRun,
      });
      return;
    }

    const { width, height } = this.scale;
    addNotebookBackground(this);

    this.textures
      .get(BEAR_FEINT_KEY)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);

    if (!this.anims.exists(BEAR_FEINT_ANIM)) {
      this.anims.create({
        key: BEAR_FEINT_ANIM,
        frames: this.anims.generateFrameNumbers(BEAR_FEINT_KEY, {
          start: 0,
          end: 47,
        }),
        frameRate: 30,
        repeat: 0,
      });
    }

    this.add
      .text(width / 2, height * 0.12, "Медведь «Вратарь»", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(28),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.18, "Ложный замах и подброс", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(15),
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    const groundY = height * 0.72;
    this.add
      .tileSprite(width / 2, groundY + 12 * DPR, width + 4, 24 * DPR, "platform")
      .setScrollFactor(0)
      .setDepth(2)
      .setTileScale(DPR, DPR);

    // Origin (1/3, 0.875) — feet under the stick-side of the 384×256 frame
    const scale = Math.min((height * 0.42) / 256, (width * 0.7) / 384);
    const sprite = this.add
      .sprite(width * 0.58, groundY, BEAR_FEINT_KEY, 0)
      .setOrigin(1 / 3, 0.875)
      .setScale(scale)
      .setFlipX(true)
      .setDepth(10);

    sprite.play(BEAR_FEINT_ANIM);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.time.delayedCall(280, () => {
        this.scene.start("boss-battle", {
          bossId: "bear",
          fromRun: this.fromRun,
        });
      });
    });

    // Tap to skip
    this.input.once("pointerdown", () => {
      this.scene.start("boss-battle", {
        bossId: "bear",
        fromRun: this.fromRun,
      });
    });

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
}

/** Queue bear intro sheet during boot so the cinematic starts without a hitch. */
export function queueBearFeintAsset(scene: Phaser.Scene) {
  const base = `${import.meta.env.BASE_URL}assets/boss-battles`;
  if (!scene.textures.exists(BEAR_FEINT_KEY)) {
    scene.load.spritesheet(
      BEAR_FEINT_KEY,
      `${base}/bear/feint_with_puck.png`,
      { frameWidth: 384, frameHeight: 256 },
    );
  }
}
