import Phaser from "phaser";
import { BOSSES, type BossId } from "../boss/bossDefs";
import {
  applyBossTextureFilters,
  isBossBundleReady,
  queueBossBattleAssets,
  queueBossTrickAssets,
} from "../boss/bossAssets";

/**
 * Background warmer: one boss pack at a time (shared hero/fx first with bear).
 * Does not blast all ~19MB at once — that made menu/run feel slow after a fast boot.
 */
export class WarmAssetsScene extends Phaser.Scene {
  private started = false;
  private busy = false;
  private idx = 0;

  constructor() {
    super("warm-assets");
  }

  create() {
    if (this.started) return;
    this.started = true;
    // Be gentle on mobile networks / main-thread decode
    this.load.maxParallelDownloads = 2;
    this.registry.events.on("setdata", this.onRegistry, this);
    this.registry.events.on("changedata", this.onRegistry, this);
    this.pump();
  }

  private onRegistry(
    _parent: Phaser.Data.DataManager,
    key: string,
    _value: unknown,
  ) {
    if (key === "warmBossPriority") this.pump();
  }

  /** Prefer a specific boss (e.g. next story fight), else walk the roster. */
  private nextId(): BossId | null {
    const pri = this.registry.get("warmBossPriority") as BossId | undefined;
    if (pri && !isBossBundleReady(this, pri)) return pri;

    while (this.idx < BOSSES.length) {
      const id = BOSSES[this.idx]!.id;
      this.idx += 1;
      if (!isBossBundleReady(this, id)) return id;
    }
    return null;
  }

  private pump() {
    if (this.busy || this.load.isLoading()) return;

    const id = this.nextId();
    if (!id) {
      applyBossTextureFilters(this);
      this.registry.set("bossAssetsWarm", true);
      return;
    }

    this.busy = true;
    this.registry.set("bossAssetsWarm", false);
    queueBossBattleAssets(this, id);
    queueBossTrickAssets(this, id);

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      applyBossTextureFilters(this);
      this.busy = false;
      // Yield so run/menu stay responsive between packs
      this.time.delayedCall(350, () => this.pump());
    });
    this.load.start();
  }
}
