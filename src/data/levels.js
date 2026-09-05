/**
 * Level layouts — world 1672×941.
 * platforms: invisible colliders (x,y = center).
 * objects: overlay sprites / hazards (Variant A).
 * Tuned from visual analysis of level backgrounds (±20px).
 */

function plat(x, y, width, height = 32) {
  return { x, y, w: width, h: height };
}

const L = {};

L[1] = {
  spawn: { x: 280, y: 595 },
  platforms: [
    plat(455, 611, 437),
    plat(868, 559, 349),
    plat(1260, 509, 349),
  ],
  objects: [{ type: 'finish_door', x: 1408, y: 493 }],
};

L[2] = {
  spawn: { x: 250, y: 718 },
  platforms: [
    plat(365, 734, 310),
    plat(735, 734, 130),
    plat(1215, 734, 490),
    plat(535, 534, 190),
    plat(915, 534, 350),
    plat(1330, 534, 260),
    plat(950, 364, 360),
    plat(1355, 364, 210),
  ],
  objects: [
    { type: 'spikes_3', x: 580, y: 750 },
    { type: 'spikes_5', x: 895, y: 750 },
    { type: 'spikes_3', x: 690, y: 550 },
    { type: 'spikes_5', x: 1150, y: 550 },
    { type: 'spikes_3', x: 1195, y: 380 },
    { type: 'finish_door', x: 1420, y: 348 },
  ],
};

L[3] = {
  spawn: { x: 250, y: 594 },
  platforms: [plat(460, 610, 500), plat(1210, 610, 500), plat(835, 780, 420, 28)],
  objects: [
    { type: 'spikes_5', x: 700, y: 780 },
    { type: 'spikes_5', x: 860, y: 780 },
    { type: 'spikes_5', x: 1020, y: 780 },
    {
      type: 'platform_moving',
      x: 835,
      y: 498,
      width: 280,
      anim: { type: 'moveX', from: 590, to: 1080, duration: 2400 },
    },
    { type: 'finish_door', x: 1375, y: 594 },
  ],
};

L[4] = {
  spawn: { x: 290, y: 580 },
  platforms: [
    plat(292, 640, 165, 40),
    plat(460, 631, 140),
    plat(780, 541, 140),
    plat(940, 496, 140),
    plat(1100, 451, 140),
    plat(1260, 406, 140),
    plat(1392, 415, 135, 40),
  ],
  objects: [
    { type: 'platform_breakable', x: 620, y: 586, width: 140 },
    { type: 'spikes_5', x: 850, y: 748 },
    { type: 'finish_door', x: 1390, y: 243 },
  ],
};

L[5] = {
  spawn: { x: 240, y: 564 },
  platforms: [
    plat(285, 580, 150),
    plat(700, 515, 240),
    plat(1040, 605, 220),
    plat(1365, 510, 190),
  ],
  objects: [
    { type: 'falling_block', x: 500, y: 220, dropTo: 640, chain: true, period: 2000 },
    { type: 'falling_block', x: 835, y: 220, dropTo: 700, chain: true, period: 2600 },
    { type: 'falling_block', x: 1170, y: 220, dropTo: 640, chain: true, period: 3200 },
    { type: 'spikes_3', x: 500, y: 748 },
    { type: 'spikes_3', x: 835, y: 748 },
    { type: 'spikes_3', x: 1170, y: 748 },
    { type: 'finish_door', x: 1385, y: 494 },
  ],
};

L[6] = {
  spawn: { x: 250, y: 634 },
  platforms: [
    plat(285, 650, 160),
    plat(490, 510, 285),
    plat(935, 570, 135),
    plat(1080, 400, 310),
    plat(1340, 485, 135),
    plat(1350, 345, 160),
  ],
  objects: [
    {
      type: 'rising_wall',
      x: 835,
      y: 700,
      anim: { type: 'moveY', from: 760, to: 520, duration: 1800 },
    },
    { type: 'spikes_3', x: 605, y: 496 },
    { type: 'spikes_3', x: 965, y: 386 },
    { type: 'finish_door', x: 1375, y: 329 },
  ],
};

L[7] = {
  spawn: { x: 260, y: 694 },
  platforms: [
    plat(336, 710, 248),
    plat(585, 460, 430),
    plat(955, 563, 400),
    plat(960, 738, 690),
    plat(1381, 700, 153),
  ],
  objects: [
    { type: 'dart_launcher_left', x: 1445, y: 510, interval: 1500, speed: 640 },
    { type: 'finish_door', x: 1392, y: 684 },
  ],
};

L[8] = {
  spawn: { x: 240, y: 609 },
  platforms: [
    plat(265, 625, 110),
    plat(380, 600, 80),
    plat(565, 510, 90),
    plat(675, 540, 80),
    plat(840, 460, 90),
    plat(930, 510, 80),
    plat(1100, 555, 90),
    plat(1210, 460, 90),
    plat(1400, 400, 120),
    plat(1255, 760, 60),
    plat(1435, 760, 50),
  ],
  objects: [
    { type: 'platform_disappearing', x: 475, y: 555, width: 80 },
    { type: 'platform_disappearing', x: 760, y: 485, width: 80 },
    { type: 'platform_disappearing', x: 1015, y: 485, width: 80 },
    { type: 'platform_disappearing', x: 1300, y: 435, width: 80 },
    { type: 'spikes_3', x: 565, y: 496 },
    { type: 'spikes_3', x: 840, y: 446 },
    { type: 'spikes_3', x: 1100, y: 541 },
    { type: 'spikes_3', x: 1345, y: 776 },
    { type: 'finish_door', x: 1415, y: 384 },
  ],
};

L[9] = {
  spawn: { x: 250, y: 584 },
  platforms: [
    plat(415, 600, 410),
    plat(858, 600, 345),
    plat(1278, 600, 365),
  ],
  objects: [
    {
      type: 'saw_blade',
      x: 858,
      y: 560,
      anim: { type: 'moveX', from: 740, to: 975, duration: 2000 },
    },
    { type: 'finish_door', x: 1380, y: 584 },
  ],
};

L[10] = {
  spawn: { x: 200, y: 724 },
  platforms: [
    plat(275, 740, 170),
    plat(465, 675, 170),
    plat(585, 525, 170),
    plat(795, 550, 170),
    plat(975, 440, 170),
    plat(1035, 610, 240),
    plat(1125, 345, 150),
    plat(1335, 440, 190),
  ],
  objects: [
    { type: 'spikes_3', x: 475, y: 660 },
    { type: 'dart_launcher_right', x: 505, y: 500, interval: 1600 },
    { type: 'spikes_3', x: 805, y: 535 },
    { type: 'dart_launcher_right', x: 890, y: 415, interval: 1900, delay: 800 },
    { type: 'spikes_3', x: 1110, y: 595 },
    { type: 'spikes_3', x: 1135, y: 330 },
    { type: 'finish_door', x: 1345, y: 424 },
  ],
};

L[11] = {
  spawn: { x: 260, y: 664 },
  platforms: [plat(455, 680, 490), plat(1210, 560, 400, 40)],
  objects: [
    {
      type: 'platform_moving',
      x: 835,
      y: 525,
      width: 130,
      anim: { type: 'moveY', from: 220, to: 680, duration: 2600 },
    },
    { type: 'ceiling_spike_panel', x: 1100, y: 120, dropTo: 354, period: 2200 },
    { type: 'finish_door', x: 1410, y: 354 },
  ],
};

L[12] = {
  spawn: { x: 250, y: 424 },
  platforms: [plat(255, 440, 90, 40), plat(1385, 430, 150, 40)],
  objects: [
    { type: 'platform_breakable', x: 330, y: 444, width: 60 },
    { type: 'platform_breakable', x: 385, y: 484, width: 60 },
    { type: 'platform_breakable', x: 440, y: 524, width: 60 },
    { type: 'platform_breakable', x: 495, y: 564, width: 60 },
    { type: 'platform_breakable', x: 565, y: 494, width: 80 },
    { type: 'platform_breakable', x: 655, y: 494, width: 80 },
    { type: 'platform_breakable', x: 745, y: 494, width: 80 },
    { type: 'platform_breakable', x: 835, y: 494, width: 80 },
    { type: 'platform_breakable', x: 925, y: 494, width: 80 },
    { type: 'platform_breakable', x: 1015, y: 494, width: 80 },
    { type: 'platform_breakable', x: 1105, y: 494, width: 80 },
    { type: 'platform_breakable', x: 1195, y: 494, width: 80 },
    { type: 'spikes_5', x: 700, y: 720 },
    { type: 'spikes_5', x: 850, y: 720 },
    { type: 'spikes_5', x: 1000, y: 720 },
    { type: 'finish_door', x: 1395, y: 414 },
  ],
};

L[13] = {
  spawn: { x: 260, y: 605 },
  platforms: [
    plat(423, 621, 383),
    plat(836, 516, 363),
    plat(1260, 621, 380),
  ],
  objects: [
    { type: 'pendulum_spiked_ball', x: 590, y: 160, amp: 40, period: 2000 },
    { type: 'pendulum_spiked_ball', x: 1110, y: 160, amp: 36, period: 2200 },
    { type: 'finish_door', x: 1390, y: 605 },
  ],
};

L[14] = {
  spawn: { x: 250, y: 434 },
  platforms: [
    plat(275, 450, 130),
    plat(390, 510, 100),
    plat(500, 450, 100),
    plat(615, 450, 90),
    plat(780, 450, 140),
    plat(980, 450, 140),
    plat(1090, 385, 100),
    plat(1150, 450, 100),
    plat(1270, 485, 80),
    plat(1400, 450, 120),
  ],
  objects: [
    {
      type: 'vertical_gate',
      x: 690,
      y: 200,
      anim: { type: 'moveY', from: 200, to: 520, duration: 2200 },
    },
    {
      type: 'vertical_gate',
      x: 890,
      y: 200,
      anim: { type: 'moveY', from: 200, to: 520, duration: 2400 },
    },
    { type: 'spikes_3', x: 390, y: 496 },
    { type: 'spikes_3', x: 1160, y: 436 },
    { type: 'finish_door', x: 1400, y: 434 },
  ],
};

L[15] = {
  spawn: { x: 250, y: 524 },
  platforms: [plat(345, 540, 270, 40), plat(1325, 540, 270, 40)],
  objects: [
    {
      type: 'platform_moving',
      x: 835,
      y: 505,
      width: 100,
      anim: { type: 'moveX', from: 520, to: 1150, duration: 2800 },
    },
    { type: 'crusher_spiked', x: 670, y: 120, dropTo: 420, period: 2000 },
    { type: 'crusher_spiked', x: 1000, y: 120, dropTo: 420, period: 2400 },
    { type: 'spikes_5', x: 835, y: 684 },
    { type: 'finish_door', x: 1420, y: 524 },
  ],
};

L[16] = {
  spawn: { x: 212, y: 294 },
  platforms: [
    plat(216, 310, 290),
    plat(337, 324, 60),
    plat(398, 347, 60),
    plat(500, 374, 220),
    plat(1100, 390, 270),
    plat(1300, 403, 90),
    plat(216, 512, 240),
    plat(375, 512, 210),
    plat(660, 512, 250),
    plat(820, 530, 110),
    plat(1160, 512, 335),
    plat(1350, 512, 160),
    plat(216, 743, 276),
    plat(550, 700, 85),
    plat(730, 683, 215),
    plat(935, 660, 165),
    plat(1120, 700, 155),
    plat(1240, 665, 100),
    plat(1380, 715, 155),
  ],
  objects: [
    { type: 'spike_trap', x: 1160, y: 512 },
    {
      type: 'platform_moving',
      x: 500,
      y: 440,
      width: 120,
      anim: { type: 'moveY', from: 350, to: 680, duration: 2400 },
    },
    { type: 'finish_door', x: 1160, y: 496 },
  ],
};

L[17] = {
  spawn: { x: 150, y: 719 },
  platforms: [
    plat(200, 735, 220),
    plat(580, 550, 240),
    plat(900, 460, 260),
    plat(1300, 427, 280),
  ],
  objects: [
    { type: 'falling_block', x: 510, y: 225, dropTo: 550, chain: true, period: 1800 },
    { type: 'falling_block', x: 860, y: 225, dropTo: 460, chain: true, period: 2400 },
    { type: 'falling_block', x: 1205, y: 225, dropTo: 427, chain: true, period: 3000 },
    { type: 'finish_door', x: 1380, y: 411 },
  ],
};

L[18] = {
  spawn: { x: 240, y: 689 },
  platforms: [
    plat(260, 705, 75),
    plat(325, 675, 75),
    plat(465, 620, 75),
    plat(605, 560, 75),
    plat(745, 500, 75),
    plat(885, 445, 75),
    plat(1025, 385, 75),
    plat(1165, 330, 75),
    plat(1305, 270, 75),
    plat(1445, 215, 75),
  ],
  objects: [
    { type: 'platform_disappearing', x: 395, y: 645, width: 75 },
    { type: 'platform_disappearing', x: 535, y: 590, width: 75 },
    { type: 'platform_disappearing', x: 675, y: 530, width: 75 },
    { type: 'platform_disappearing', x: 815, y: 475, width: 75 },
    { type: 'platform_disappearing', x: 955, y: 415, width: 75 },
    { type: 'platform_disappearing', x: 1095, y: 360, width: 75 },
    { type: 'platform_disappearing', x: 1235, y: 300, width: 75 },
    { type: 'platform_disappearing', x: 1375, y: 240, width: 75 },
    { type: 'ceiling_spike_panel', x: 1025, y: 100, dropTo: 300, period: 2100 },
    { type: 'finish_door', x: 1445, y: 199 },
  ],
};

L[19] = {
  spawn: { x: 250, y: 699 },
  platforms: [
    plat(280, 715, 140),
    plat(585, 715, 130),
    plat(1000, 715, 140),
    plat(1350, 715, 140),
    plat(230, 600, 120),
    plat(1380, 615, 100),
    plat(1220, 415, 100),
    plat(200, 510, 150),
    plat(480, 515, 100),
    plat(850, 520, 550),
    plat(1300, 515, 150),
    plat(300, 335, 450),
    plat(570, 335, 60),
    plat(840, 335, 350),
    plat(1280, 335, 300),
  ],
  objects: [
    { type: 'pendulum_spiked_ball', x: 840, y: 140, amp: 38, period: 1900 },
    { type: 'ceiling_spike_panel', x: 840, y: 100, dropTo: 280, period: 2400 },
    { type: 'finish_door', x: 1370, y: 319 },
  ],
};

L[20] = {
  spawn: { x: 250, y: 704 },
  platforms: [
    plat(275, 720, 130),
    plat(425, 685, 130),
    plat(530, 525, 120),
    plat(635, 655, 170),
    plat(775, 550, 130),
    plat(945, 550, 130),
    plat(860, 655, 180),
    plat(1085, 655, 150),
    plat(1325, 655, 130),
    plat(1085, 470, 150),
    plat(1365, 470, 190),
    plat(1405, 340, 220),
  ],
  objects: [
    { type: 'pendulum_blade', x: 860, y: 140, amp: 42, period: 1700 },
    { type: 'falling_block', x: 1085, y: 220, dropTo: 470, chain: true, period: 2200 },
    {
      type: 'platform_moving',
      x: 1235,
      y: 560,
      width: 80,
      anim: { type: 'moveX', from: 1180, to: 1290, duration: 2200 },
    },
    { type: 'spike_trap', x: 860, y: 550 },
    { type: 'ceiling_spike_panel', x: 530, y: 120, dropTo: 420, period: 2000 },
    { type: 'ceiling_spike_panel', x: 1365, y: 120, dropTo: 380, period: 2400 },
    { type: 'finish_door', x: 1425, y: 324 },
  ],
};

export function getLevel(n) {
  const level = L[n];
  if (!level) throw new Error(`Level ${n} missing`);
  return level;
}

export const LEVEL_COUNT = 20;
