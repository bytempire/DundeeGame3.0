import Phaser from "phaser";
import { NOTEBOOK_INK } from "./notebookBg";
import { DPR, fontPx, px } from "./dpr";

const INK = Phaser.Display.Color.HexStringToColor(NOTEBOOK_INK).color;

/** Slightly uneven circle — looks hand-inked, not UI chrome. */
function strokeWobblyCircle(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
) {
  const steps = 28;
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const wobble = 1 + Math.sin(i * 2.3) * 0.04 + Math.cos(i * 1.7) * 0.03;
    const x = cx + Math.cos(t) * r * wobble;
    const y = cy + Math.sin(t) * r * wobble;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.strokePath();
}

/** Hand-inked rounded rectangle outline. */
function strokeWobblyRoundRect(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
) {
  const left = cx - w / 2;
  const right = cx + w / 2;
  const top = cy - h / 2;
  const bottom = cy + h / 2;
  const rr = Math.min(r, w / 2, h / 2);

  const point = (x: number, y: number, i: number) => {
    const wobble = 1 + Math.sin(i * 1.9) * 0.012 + Math.cos(i * 2.4) * 0.01;
    return {
      x: cx + (x - cx) * wobble,
      y: cy + (y - cy) * wobble,
    };
  };

  const pts: Array<{ x: number; y: number }> = [];
  const pushArc = (ax: number, ay: number, a0: number, a1: number) => {
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = a0 + ((a1 - a0) * i) / steps;
      pts.push(
        point(ax + Math.cos(t) * rr, ay + Math.sin(t) * rr, pts.length),
      );
    }
  };
  const pushLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    n: number,
  ) => {
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push(point(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, pts.length));
    }
  };

  pushArc(left + rr, top + rr, Math.PI, Math.PI * 1.5);
  pushLine(left + rr, top, right - rr, top, 12);
  pushArc(right - rr, top + rr, -Math.PI / 2, 0);
  pushLine(right, top + rr, right, bottom - rr, 6);
  pushArc(right - rr, bottom - rr, 0, Math.PI / 2);
  pushLine(right - rr, bottom, left + rr, bottom, 12);
  pushArc(left + rr, bottom - rr, Math.PI / 2, Math.PI);
  pushLine(left, bottom - rr, left, top + rr, 6);

  g.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  });
  g.closePath();
  g.strokePath();
}

function strokeChevron(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  dir: "up" | "down",
) {
  const tipY = dir === "up" ? cy - px(12) : cy + px(12);
  const baseY = dir === "up" ? cy + px(10) : cy - px(10);
  const wing = px(16);
  g.beginPath();
  g.moveTo(cx - wing, baseY);
  g.lineTo(cx, tipY);
  g.lineTo(cx + wing, baseY);
  g.strokePath();
  g.beginPath();
  g.moveTo(cx - px(14), baseY - (dir === "up" ? 1 : -1) * DPR);
  g.lineTo(cx, tipY + (dir === "up" ? 2 : -2) * DPR);
  g.lineTo(cx + px(14), baseY + (dir === "up" ? 1 : -1) * DPR);
  g.strokePath();
}

/** Small hockey puck glyph for the strike button. */
function strokePuck(g: Phaser.GameObjects.Graphics, cx: number, cy: number) {
  const r = px(11);
  g.lineStyle(2.8 * DPR, INK, 0.95);
  strokeWobblyCircle(g, cx, cy, r);
  g.lineStyle(2.2 * DPR, INK, 0.75);
  strokeWobblyCircle(g, cx, cy, r * 0.45);
  // motion marks
  g.lineStyle(2.4 * DPR, INK, 0.85);
  g.beginPath();
  g.moveTo(cx + r + px(4), cy - px(6));
  g.lineTo(cx + r + px(14), cy - px(6));
  g.moveTo(cx + r + px(6), cy);
  g.lineTo(cx + r + px(16), cy);
  g.moveTo(cx + r + px(4), cy + px(6));
  g.lineTo(cx + r + px(14), cy + px(6));
  g.strokePath();
}

export type PenButton = {
  root: Phaser.GameObjects.Container;
  hit: Phaser.GameObjects.Zone;
};

export type PenButtonKind = "up" | "down" | "hit";

/**
 * Round control drawn like ballpoint ink on notebook paper.
 */
export function addPenButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  kind: PenButtonKind,
  depth = 30,
): PenButton {
  const root = scene.add.container(x, y).setScrollFactor(0).setDepth(depth);
  const g = scene.add.graphics();
  const r = px(34);
  g.lineStyle(2.5 * DPR, INK, 0.92);
  strokeWobblyCircle(g, 0, 0, r);
  g.lineStyle(2.2 * DPR, INK, 0.88);
  strokeWobblyCircle(g, 0.8 * DPR, -0.6 * DPR, r);
  if (kind === "hit") {
    strokePuck(g, -px(2), 0);
  } else {
    g.lineStyle(3 * DPR, INK, 0.95);
    strokeChevron(g, 0, 0, kind);
  }
  root.add(g);

  const hit = scene.add
    .zone(0, 0, px(76), px(76))
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  root.add(hit);

  hit.on("pointerover", () => root.setAlpha(0.85));
  hit.on("pointerout", () => root.setAlpha(1));
  hit.on("pointerdown", () => root.setScale(0.94));
  hit.on("pointerup", () => root.setScale(1));
  hit.on("pointerupoutside", () => root.setScale(1));

  return { root, hit };
}

/**
 * Menu / CTA button: ink outline + handwritten-looking label.
 */
export function addPenTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts?: {
    width?: number;
    height?: number;
    depth?: number;
    paperFill?: boolean;
    /** CSS px size (HiDPI-scaled inside). Number or CSS string like "20px". */
    fontSize?: number | string;
  },
): PenButton {
  const bw = px(opts?.width ?? 230);
  const bh = px(opts?.height ?? 46);
  const depth = opts?.depth ?? 10;
  const root = scene.add.container(x, y).setDepth(depth);
  const fs =
    typeof opts?.fontSize === "number"
      ? fontPx(opts.fontSize)
      : opts?.fontSize
        ? fontPx(parseInt(String(opts.fontSize), 10) || 20)
        : fontPx(20);

  const g = scene.add.graphics();
  if (opts?.paperFill) {
    g.fillStyle(0xf4f1e8, 0.94);
    g.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, px(12));
  }
  g.lineStyle(2.4 * DPR, INK, 0.9);
  strokeWobblyRoundRect(g, 0, 0, bw, bh, px(14));
  g.lineStyle(1.8 * DPR, INK, 0.55);
  strokeWobblyRoundRect(g, 1.2 * DPR, -0.8 * DPR, bw, bh, px(14));
  root.add(g);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: fs,
      color: NOTEBOOK_INK,
      fontStyle: "italic",
      align: "center",
    })
    .setOrigin(0.5);
  root.add(text);

  const hit = scene.add
    .zone(0, 0, bw + px(8), bh + px(8))
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  root.add(hit);

  hit.on("pointerover", () => root.setAlpha(0.82));
  hit.on("pointerout", () => root.setAlpha(1));
  hit.on("pointerdown", () => {
    root.setScale(0.96);
    onClick();
  });
  hit.on("pointerup", () => root.setScale(1));
  hit.on("pointerupoutside", () => root.setScale(1));

  return { root, hit };
}
