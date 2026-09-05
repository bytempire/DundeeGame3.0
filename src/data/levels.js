/**
 * Level layouts — world 1672×941.
 * platforms: invisible colliders matching hatched platforms on backgrounds.
 * objects: overlay sprites / hazards (Variant A).
 */

const L = {};

L[1] = {
  spawn: { x: 220, y: 620 },
  platforms: [
    { x: 320, y: 700, w: 380, h: 36 },
    { x: 780, y: 560, w: 280, h: 36 },
    { x: 1280, y: 420, w: 320, h: 36 },
  ],
  objects: [{ type: 'finish_door', x: 1380, y: 402 }],
};

L[2] = {
  spawn: { x: 200, y: 720 },
  platforms: [
    // bottom
    { x: 260, y: 800, w: 280, h: 32 },
    { x: 700, y: 800, w: 160, h: 32 },
    { x: 1200, y: 800, w: 320, h: 32 },
    // mid
    { x: 300, y: 580, w: 300, h: 32 },
    { x: 780, y: 580, w: 280, h: 32 },
    { x: 1280, y: 580, w: 260, h: 32 },
    // top
    { x: 420, y: 360, w: 360, h: 32 },
    { x: 1180, y: 360, w: 300, h: 32 },
  ],
  objects: [
    { type: 'spikes_3', x: 500, y: 800 },
    { type: 'spikes_5', x: 940, y: 800 },
    { type: 'spikes_3', x: 540, y: 580 },
    { type: 'spikes_5', x: 1020, y: 580 },
    { type: 'spikes_3', x: 760, y: 360 },
    { type: 'finish_door', x: 1280, y: 342 },
  ],
};

L[3] = {
  spawn: { x: 220, y: 620 },
  platforms: [
    { x: 280, y: 700, w: 360, h: 36 },
    { x: 1400, y: 700, w: 360, h: 36 },
    { x: 836, y: 860, w: 500, h: 28 }, // pit floor under spikes visual
  ],
  objects: [
    { type: 'spikes_5', x: 700, y: 860 },
    { type: 'spikes_5', x: 860, y: 860 },
    { type: 'spikes_5', x: 1020, y: 860 },
    {
      type: 'platform_moving',
      x: 836,
      y: 520,
      width: 260,
      anim: { type: 'moveX', from: 560, to: 1120, duration: 2400 },
    },
    { type: 'finish_door', x: 1480, y: 682 },
  ],
};

L[4] = {
  spawn: { x: 200, y: 680 },
  platforms: [
    { x: 240, y: 760, w: 220, h: 32 },
    { x: 560, y: 640, w: 200, h: 32 },
    { x: 1100, y: 520, w: 240, h: 32 },
    { x: 1420, y: 400, w: 220, h: 32 },
  ],
  objects: [
    { type: 'platform_breakable', x: 820, y: 580, width: 200 },
    { type: 'spikes_5', x: 820, y: 780 },
    { type: 'finish_door', x: 1480, y: 382 },
  ],
};

L[5] = {
  spawn: { x: 220, y: 700 },
  platforms: [
    { x: 260, y: 780, w: 260, h: 32 },
    { x: 560, y: 640, w: 200, h: 32 },
    { x: 900, y: 720, w: 220, h: 32 },
    { x: 1220, y: 560, w: 220, h: 32 },
    { x: 1480, y: 440, w: 200, h: 32 },
  ],
  objects: [
    { type: 'spikes_3', x: 420, y: 780 },
    { type: 'falling_block', x: 700, y: 220, dropTo: 640, chain: true, period: 2000 },
    { type: 'falling_block', x: 860, y: 200, dropTo: 700, chain: true, period: 2600 },
    { type: 'falling_block', x: 1020, y: 220, dropTo: 640, chain: true, period: 3200 },
    { type: 'finish_door', x: 1520, y: 422 },
  ],
};

L[6] = {
  spawn: { x: 200, y: 700 },
  platforms: [
    { x: 260, y: 780, w: 280, h: 32 },
    { x: 700, y: 780, w: 200, h: 32 },
    { x: 1100, y: 620, w: 240, h: 32 },
    { x: 1440, y: 480, w: 220, h: 32 },
  ],
  objects: [
    { type: 'spikes_3', x: 500, y: 780 },
    {
      type: 'rising_wall',
      x: 900,
      y: 780,
      anim: { type: 'moveY', from: 900, to: 620, duration: 1800 },
    },
    { type: 'finish_door', x: 1500, y: 462 },
  ],
};

L[7] = {
  spawn: { x: 220, y: 680 },
  platforms: [
    { x: 280, y: 760, w: 300, h: 32 },
    { x: 700, y: 640, w: 240, h: 32 },
    { x: 1100, y: 520, w: 240, h: 32 },
    { x: 1440, y: 400, w: 220, h: 32 },
  ],
  objects: [
    { type: 'dart_launcher_left', x: 980, y: 580, interval: 1500, speed: 640 },
    { type: 'dart_launcher_left', x: 1320, y: 460, interval: 1800, speed: 600, delay: 700 },
    { type: 'finish_door', x: 1500, y: 382 },
  ],
};

L[8] = {
  spawn: { x: 200, y: 700 },
  platforms: [
    { x: 240, y: 780, w: 220, h: 32 },
    { x: 1400, y: 480, w: 240, h: 32 },
  ],
  objects: [
    { type: 'platform_disappearing', x: 520, y: 700, width: 180 },
    { type: 'platform_disappearing', x: 780, y: 600, width: 180 },
    { type: 'platform_disappearing', x: 1040, y: 520, width: 180 },
    { type: 'spikes_3', x: 650, y: 860 },
    { type: 'spikes_3', x: 900, y: 860 },
    { type: 'finish_door', x: 1480, y: 462 },
  ],
};

L[9] = {
  spawn: { x: 220, y: 620 },
  platforms: [
    { x: 280, y: 700, w: 280, h: 36 },
    { x: 836, y: 700, w: 360, h: 36 },
    { x: 1400, y: 700, w: 280, h: 36 },
  ],
  objects: [
    {
      type: 'saw_blade',
      x: 836,
      y: 620,
      anim: { type: 'moveX', from: 680, to: 1000, duration: 2000 },
    },
    { type: 'finish_door', x: 1480, y: 682 },
  ],
};

L[10] = {
  spawn: { x: 200, y: 720 },
  platforms: [
    { x: 240, y: 800, w: 200, h: 32 },
    { x: 480, y: 680, w: 180, h: 32 },
    { x: 720, y: 560, w: 180, h: 32 },
    { x: 720, y: 760, w: 180, h: 32 },
    { x: 980, y: 640, w: 180, h: 32 },
    { x: 980, y: 800, w: 180, h: 32 },
    { x: 1240, y: 520, w: 180, h: 32 },
    { x: 1480, y: 400, w: 200, h: 32 },
  ],
  objects: [
    { type: 'spikes_3', x: 480, y: 680 },
    { type: 'spikes_3', x: 720, y: 760 },
    { type: 'spikes_3', x: 980, y: 800 },
    { type: 'spikes_3', x: 1240, y: 520 },
    { type: 'dart_launcher_right', x: 640, y: 520, interval: 1600 },
    { type: 'dart_launcher_right', x: 900, y: 600, interval: 1900, delay: 800 },
    { type: 'finish_door', x: 1540, y: 382 },
  ],
};

L[11] = {
  spawn: { x: 220, y: 700 },
  platforms: [
    { x: 260, y: 780, w: 240, h: 32 },
    { x: 1400, y: 500, w: 240, h: 32 },
  ],
  objects: [
    {
      type: 'platform_moving',
      x: 700,
      y: 700,
      width: 180,
      anim: { type: 'moveY', from: 720, to: 360, duration: 2600 },
    },
    {
      type: 'ceiling_spike_panel',
      x: 1000,
      y: 120,
      dropTo: 420,
      period: 2200,
    },
    { type: 'finish_door', x: 1480, y: 482 },
  ],
};

L[12] = {
  spawn: { x: 200, y: 700 },
  platforms: [
    { x: 240, y: 780, w: 200, h: 32 },
    { x: 1440, y: 500, w: 220, h: 32 },
  ],
  objects: [
    { type: 'platform_breakable', x: 480, y: 720, width: 160 },
    { type: 'platform_breakable', x: 680, y: 660, width: 160 },
    { type: 'platform_breakable', x: 880, y: 600, width: 160 },
    { type: 'platform_breakable', x: 1080, y: 540, width: 160 },
    { type: 'spikes_5', x: 680, y: 860 },
    { type: 'spikes_5', x: 900, y: 860 },
    { type: 'finish_door', x: 1500, y: 482 },
  ],
};

L[13] = {
  spawn: { x: 220, y: 680 },
  platforms: [
    { x: 280, y: 760, w: 280, h: 32 },
    { x: 836, y: 760, w: 200, h: 32 },
    { x: 1400, y: 760, w: 280, h: 32 },
  ],
  objects: [
    { type: 'pendulum_spiked_ball', x: 836, y: 160, amp: 40, period: 2000 },
    { type: 'finish_door', x: 1480, y: 742 },
  ],
};

L[14] = {
  spawn: { x: 200, y: 700 },
  platforms: [
    { x: 260, y: 780, w: 260, h: 32 },
    { x: 700, y: 780, w: 220, h: 32 },
    { x: 1100, y: 640, w: 220, h: 32 },
    { x: 1440, y: 500, w: 220, h: 32 },
  ],
  objects: [
    { type: 'spikes_3', x: 500, y: 780 },
    {
      type: 'vertical_gate',
      x: 900,
      y: 200,
      anim: { type: 'moveY', from: 200, to: 520, duration: 2200 },
    },
    { type: 'finish_door', x: 1500, y: 482 },
  ],
};

L[15] = {
  spawn: { x: 200, y: 700 },
  platforms: [
    { x: 240, y: 780, w: 220, h: 32 },
    { x: 1440, y: 560, w: 220, h: 32 },
  ],
  objects: [
    {
      type: 'platform_moving',
      x: 700,
      y: 680,
      width: 180,
      anim: { type: 'moveX', from: 480, to: 1100, duration: 2800 },
    },
    { type: 'crusher_spiked', x: 900, y: 120, dropTo: 520, period: 2000 },
    { type: 'spikes_5', x: 836, y: 860 },
    { type: 'finish_door', x: 1500, y: 542 },
  ],
};

L[16] = {
  spawn: { x: 220, y: 700 },
  platforms: [
    { x: 260, y: 780, w: 240, h: 32 },
    { x: 700, y: 780, w: 280, h: 32 },
    { x: 1400, y: 480, w: 240, h: 32 },
  ],
  objects: [
    { type: 'spike_trap', x: 700, y: 780 },
    {
      type: 'platform_moving',
      x: 1050,
      y: 700,
      width: 160,
      anim: { type: 'moveY', from: 720, to: 400, duration: 2400 },
    },
    { type: 'finish_door', x: 1480, y: 462 },
  ],
};

L[17] = {
  spawn: { x: 200, y: 700 },
  platforms: [
    { x: 260, y: 780, w: 260, h: 32 },
    { x: 620, y: 660, w: 180, h: 32 },
    { x: 980, y: 540, w: 180, h: 32 },
    { x: 1340, y: 420, w: 220, h: 32 },
  ],
  objects: [
    { type: 'falling_block', x: 500, y: 180, dropTo: 660, chain: true, period: 1800 },
    { type: 'falling_block', x: 820, y: 160, dropTo: 540, chain: true, period: 2400 },
    { type: 'falling_block', x: 1140, y: 180, dropTo: 420, chain: true, period: 3000 },
    { type: 'finish_door', x: 1420, y: 402 },
  ],
};

L[18] = {
  spawn: { x: 200, y: 700 },
  platforms: [
    { x: 240, y: 780, w: 200, h: 32 },
    { x: 1440, y: 500, w: 220, h: 32 },
  ],
  objects: [
    { type: 'platform_disappearing', x: 500, y: 700, width: 160 },
    { type: 'platform_disappearing', x: 760, y: 600, width: 160 },
    { type: 'platform_disappearing', x: 1020, y: 520, width: 160 },
    { type: 'ceiling_spike_panel', x: 760, y: 100, dropTo: 380, period: 2100 },
    { type: 'finish_door', x: 1500, y: 482 },
  ],
};

L[19] = {
  spawn: { x: 220, y: 700 },
  platforms: [
    { x: 280, y: 780, w: 280, h: 32 },
    { x: 836, y: 780, w: 200, h: 32 },
    { x: 1400, y: 780, w: 280, h: 32 },
  ],
  objects: [
    { type: 'pendulum_spiked_ball', x: 700, y: 160, amp: 36, period: 1800 },
    { type: 'ceiling_spike_panel', x: 1100, y: 120, dropTo: 500, period: 2400 },
    { type: 'finish_door', x: 1480, y: 762 },
  ],
};

L[20] = {
  spawn: { x: 200, y: 700 },
  platforms: [
    { x: 240, y: 780, w: 200, h: 32 },
    { x: 700, y: 780, w: 220, h: 32 },
    { x: 1440, y: 520, w: 220, h: 32 },
  ],
  objects: [
    { type: 'pendulum_blade', x: 500, y: 140, amp: 42, period: 1700 },
    { type: 'falling_block', x: 900, y: 180, dropTo: 620, chain: true, period: 2200 },
    {
      type: 'platform_moving',
      x: 1100,
      y: 640,
      width: 160,
      anim: { type: 'moveX', from: 920, to: 1280, duration: 2200 },
    },
    { type: 'spike_trap', x: 700, y: 780 },
    { type: 'finish_door', x: 1500, y: 502 },
  ],
};

export function getLevel(n) {
  const level = L[n];
  if (!level) throw new Error(`Level ${n} missing`);
  return level;
}

export const LEVEL_COUNT = 20;
