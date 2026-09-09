import Phaser from "phaser";
import {
  applyBossTextureFilters,
  queueBossBattleAssets,
  queueBossTrickAssets,
} from "../boss/bossAssets";

/**
 * Runs in parallel with menu/play and downloads boss packs in the background,
 * so fights start without a hitch after ~1 minute of browsing/running.
 */
export class WarmAssetsScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super("warm-assets");
  }

  create() {
    if (this.started) return;
    this.started = true;
    this.warm();
  }

  private warm() {
    queueBossBattleAssets(this);
    queueBossTrickAssets(this);

    this.load.once("complete", () => {
      applyBossTextureFilters(this);
      this.registry.set("bossAssetsWarm", true);
    });
    this.load.start();
  }
}
