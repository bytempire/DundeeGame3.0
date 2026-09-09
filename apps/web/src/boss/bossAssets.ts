import Phaser from "phaser";
import { BOSSES, type BossId } from "./bossDefs";

export const BB_HERO_KEY = "bb-hero";
export const BB_FX_KEY = "bb-fx";

/** Stick-trick sheets: 8 frames @ 384×384, grid 4×2. */
export const TRICK_FRAME_W = 384;
export const TRICK_FRAME_H = 384;
export const TRICK_FRAME_RATE = 8;
export const TRICK_ORIGIN_X = 176 / 384;
export const TRICK_ORIGIN_Y = 340 / 384;

export function bossTextureKey(bossId: string) {
  return `bb-boss-${bossId}`;
}

export function bossConfigKey(bossId: string) {
  return `bb-cfg-${bossId}`;
}

export function bossTrickKey(bossId: BossId) {
  return `boss-trick-${bossId}`;
}

export function bossTrickAnimKey(bossId: BossId) {
  return `boss-trick-anim-${bossId}`;
}

function bossList(onlyId?: BossId) {
  return onlyId ? BOSSES.filter((b) => b.id === onlyId) : BOSSES;
}

/** Queue shared battle FX/hero + one or all boss sheets (skips cached). */
export function queueBossBattleAssets(scene: Phaser.Scene, onlyId?: BossId) {
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

  for (const boss of bossList(onlyId)) {
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

/** Queue one or all stick-trick preview sheets. */
export function queueBossTrickAssets(scene: Phaser.Scene, onlyId?: BossId) {
  const base = `${import.meta.env.BASE_URL}assets/boss-battles`;
  for (const boss of bossList(onlyId)) {
    const key = bossTrickKey(boss.id);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, `${base}/${boss.id}/trick.png`, {
      frameWidth: TRICK_FRAME_W,
      frameHeight: TRICK_FRAME_H,
    });
  }
}

export function isBossBundleReady(scene: Phaser.Scene, bossId: BossId) {
  return (
    scene.textures.exists(BB_HERO_KEY) &&
    scene.textures.exists(BB_FX_KEY) &&
    scene.textures.exists(bossTextureKey(bossId)) &&
    scene.textures.exists(bossTrickKey(bossId)) &&
    scene.cache.json.exists(bossConfigKey(bossId))
  );
}

export function applyBossTextureFilters(scene: Phaser.Scene) {
  for (const key of [BB_HERO_KEY, BB_FX_KEY]) {
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
  for (const boss of BOSSES) {
    const key = bossTextureKey(boss.id);
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const trick = bossTrickKey(boss.id);
    if (scene.textures.exists(trick)) {
      scene.textures.get(trick).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
}
