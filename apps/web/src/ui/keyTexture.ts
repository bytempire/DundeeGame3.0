import Phaser from "phaser";
import { NOTEBOOK_INK } from "./notebookBg";

const KEY = "pickup-key";

/** Simple pen-ink key icon (canvas — iOS-safe). */
export function ensureKeyTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(KEY)) return;

  const w = 48;
  const h = 28;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.strokeStyle = NOTEBOOK_INK;
  ctx.fillStyle = "#e8c86a";
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // bow (head of key)
  ctx.beginPath();
  ctx.arc(12, 14, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 14, 4, 0, Math.PI * 2);
  ctx.stroke();

  // shaft
  ctx.beginPath();
  ctx.moveTo(20, 14);
  ctx.lineTo(42, 14);
  ctx.stroke();

  // teeth
  ctx.beginPath();
  ctx.moveTo(34, 14);
  ctx.lineTo(34, 20);
  ctx.moveTo(40, 14);
  ctx.lineTo(40, 22);
  ctx.stroke();

  scene.textures.addCanvas(KEY, canvas);
}

export const KEY_TEXTURE = KEY;
