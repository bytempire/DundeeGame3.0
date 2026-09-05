import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import PlayScene from './scenes/PlayScene.js';

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
      gravity: { x: 0, y: 2200 },
      debug: false,
    },
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, MenuScene, LevelSelectScene, PlayScene],
};

new Phaser.Game(config);

export { WORLD_W, WORLD_H };
