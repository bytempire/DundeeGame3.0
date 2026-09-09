import type Phaser from "phaser";
import { BOSSES } from "./bossDefs";

export const BB_HERO_KEY = "bb-hero";
export const BB_FX_KEY = "bb-fx";

export function bossTextureKey(bossId: string) {
  return `bb-boss-${bossId}`;
}

export function bossConfigKey(bossId: string) {
  return `bb-cfg-${bossId}`;
}

/** Queue shared + all boss battle assets (safe to call if already cached). */
export function queueBossBattleAssets(scene: Phaser.Scene) {
  const base = `${import.meta.env.BASE_URL}assets/boss-battles`;
  const { load, textures, cache } = scene;

  if (!textures.exists(BB_HERO_KEY)) {
    load.spritesheet(BB_HERO_KEY, `${base}/shared/hero/spritesheet.png`, {
      frameWidth: 384,
      frameHeight: 384,
    });
  }
  if (!textures.exists(BB_FX_KEY)) {
    load.spritesheet(BB_FX_KEY, `${base}/shared/fx/spritesheet.png`, {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  for (const boss of BOSSES) {
    const tex = bossTextureKey(boss.id);
    if (!textures.exists(tex)) {
      load.spritesheet(tex, `${base}/${boss.id}/spritesheet.png`, {
        frameWidth: 512,
        frameHeight: 512,
      });
    }
    const cfg = bossConfigKey(boss.id);
    if (!cache.json.exists(cfg)) {
      load.json(cfg, `${base}/${boss.id}/battle.json?v=atk2`);
    }
  }
}
