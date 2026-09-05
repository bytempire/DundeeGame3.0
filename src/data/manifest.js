export const WORLD = { w: 1672, h: 941 };
export const FRAME = { x: 96, y: 88, w: 1480, h: 760 };

/** Normalized colliders from asset-manifest: [x,y,w,h] 0..1 */
export const MANIFEST = {
  platform_static: { size: [160, 24], collider: [0, 0.08, 1, 0.84] },
  platform_moving: { size: [160, 28], collider: [0, 0.08, 1, 0.65] },
  platform_breakable: { size: [160, 24], collider: [0, 0.08, 1, 0.84] },
  platform_disappearing: { size: [160, 24], collider: [0, 0.08, 1, 0.84] },
  spikes_3: { size: [92, 34], collider: [0.07, 0.12, 0.86, 0.82], hazard: true },
  spikes_5: { size: [148, 34], collider: [0.04, 0.12, 0.92, 0.82], hazard: true },
  spike_trap: { frameSize: [96, 36], hazardFromFrame: 2 },
  saw_blade: { size: [96, 96], collider: [0.11, 0.11, 0.78, 0.78], hazard: true },
  falling_block: { size: [64, 64], collider: [0.06, 0.06, 0.88, 0.88] },
  rising_wall: { size: [48, 128], collider: [0.12, 0.03, 0.76, 0.94] },
  vertical_gate: { size: [48, 160], collider: [0.16, 0.02, 0.68, 0.96] },
  dart_launcher_left: { size: [80, 52], muzzle: [0.03, 0.5] },
  dart_launcher_right: { size: [80, 52], muzzle: [0.97, 0.5] },
  dart_projectile: { size: [64, 24], collider: [0.08, 0.22, 0.84, 0.56], hazard: true },
  crusher_spiked: { size: [128, 96], collider: [0.04, 0.03, 0.92, 0.94], hazard: true },
  ceiling_spike_panel: { size: [160, 104], collider: [0.03, 0.03, 0.94, 0.92], hazard: true },
  pendulum_spiked_ball: { size: [96, 210], pivot: [0.5, 0.033], collider: [0.18, 0.66, 0.64, 0.31], hazard: true },
  pendulum_blade: { size: [96, 210], pivot: [0.5, 0.033], collider: [0.1, 0.72, 0.8, 0.25], hazard: true },
  finish_door: { size: [96, 96] },
  chain_tile: { size: [24, 48] },
};

export function absCollider(size, norm, scaleX = 1, scaleY = 1) {
  const [sw, sh] = size;
  const [nx, ny, nw, nh] = norm;
  const w = sw * scaleX;
  const h = sh * scaleY;
  return {
    offsetX: nx * w,
    offsetY: ny * h,
    width: nw * w,
    height: nh * h,
  };
}
