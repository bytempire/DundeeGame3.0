import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { PlayScene } from "./scenes/PlayScene";
import { LeaderboardScene } from "./scenes/LeaderboardScene";
import { AdminScene } from "./scenes/AdminScene";
import { BossSelectScene } from "./scenes/BossSelectScene";
import { BossBattleScene } from "./scenes/BossBattleScene";
import { getWebApp } from "./api";
import { DPR, px } from "./ui/dpr";

const tg = getWebApp();
tg?.ready();
tg?.expand();

function gameSize() {
  return {
    width: Math.max(1, Math.round(window.innerWidth * DPR)),
    height: Math.max(1, Math.round(window.innerHeight * DPR)),
  };
}

const initial = gameSize();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#f4f1e8",
  roundPixels: true,
  render: {
    antialias: true,
    pixelArt: false,
    transparent: false,
  },
  scale: {
    // HiDPI: draw at device pixels, CSS-zoom back so layout stays in CSS units × DPR
    mode: Phaser.Scale.NONE,
    width: initial.width,
    height: initial.height,
    zoom: 1 / DPR,
    autoRound: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: px(1600) },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    PlayScene,
    LeaderboardScene,
    AdminScene,
    BossSelectScene,
    BossBattleScene,
  ],
};

const game = new Phaser.Game(config);

const refit = () => {
  const { width, height } = gameSize();
  game.scale.resize(width, height);
  game.scale.setZoom(1 / DPR);
};
window.addEventListener("resize", refit);
window.addEventListener("orientationchange", refit);
try {
  // Telegram viewport changes (expand / orientation)
  (tg as { onEvent?: (e: string, cb: () => void) => void } | null)?.onEvent?.(
    "viewportChanged",
    refit,
  );
} catch {
  /* ignore */
}
