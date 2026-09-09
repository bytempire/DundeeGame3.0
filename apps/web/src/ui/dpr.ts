/** Cap DPR so canvas memory stays reasonable on 3x phones. */
export const DPR = Math.min(window.devicePixelRatio || 1, 3);

/** Convert CSS-pixel design sizes into HiDPI world units. */
export function px(cssPx: number): number {
  return Math.round(cssPx * DPR);
}

export function fontPx(cssPx: number): string {
  return `${px(cssPx)}px`;
}
