import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import PlayScene from './scenes/PlayScene.js';
import { RISE_GRAVITY } from './systems/Player.js';

const WORLD_W = 1672;
const WORLD_H = 941;

if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
  try {
    tg.disableVerticalSwipes?.();
  } catch (_) {
    /* older clients */
  }
}

const debugPhysics = new URLSearchParams(location.search).has('debug');

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: WORLD_W,
  height: WORLD_H,
  backgroundColor: '#f3ead5',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: RISE_GRAVITY },
      debug: debugPhysics,
    },
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, MenuScene, LevelSelectScene, PlayScene],
};

const game = new Phaser.Game(config);
window.__DUNDEE__ = game;

window.__runPlaytest = async (levels) => {
  const { runPlaytest } = await import('./debug/playtest.js');
  return runPlaytest(game, { levels });
};

export { WORLD_W, WORLD_H };
