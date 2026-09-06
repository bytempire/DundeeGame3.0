import Phaser from "phaser";

const TEXTURE_KEY = "notebook-grid-cell";
const CELL = 28;

/** Classic school notebook paper (клетка) — canvas texture, iOS-safe. */
export function ensureNotebookTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEY)) return;

  const canvas = document.createElement("canvas");
  canvas.width = CELL;
  canvas.height = CELL;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // warm paper
  ctx.fillStyle = "#f4f1e8";
  ctx.fillRect(0, 0, CELL, CELL);

  // blue grid lines
  ctx.strokeStyle = "#9eb6d4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CELL - 0.5, 0);
  ctx.lineTo(CELL - 0.5, CELL);
  ctx.moveTo(0, CELL - 0.5);
  ctx.lineTo(CELL, CELL - 0.5);
  ctx.stroke();

  scene.textures.addCanvas(TEXTURE_KEY, canvas);
}

/**
 * Full-screen notebook background.
 * Returns tileSprite so play scene can scroll it.
 */
export function addNotebookBackground(
  scene: Phaser.Scene,
  depth = -20,
): Phaser.GameObjects.TileSprite {
  ensureNotebookTexture(scene);
  const { width, height } = scene.scale;

  const paper = scene.add
    .tileSprite(0, 0, Math.max(width, 1), Math.max(height, 1), TEXTURE_KEY)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(depth);

  const onResize = (gameSize: Phaser.Structs.Size) => {
    paper.setSize(gameSize.width, gameSize.height);
  };
  scene.scale.on("resize", onResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off("resize", onResize);
  });

  return paper;
}

export const NOTEBOOK_INK = "#1f2a44";
export const NOTEBOOK_MUTED = "#4a5a78";
