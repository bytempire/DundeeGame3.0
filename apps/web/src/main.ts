import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { PlayScene } from "./scenes/PlayScene";
import { getWebApp } from "./api";

const tg = getWebApp();
tg?.ready();
tg?.expand();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#f4f1e8",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1600 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, PlayScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
