import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 420, 28, 0x262626, 0.25);
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 18, 0xc95b50).setOrigin(0, 0.5);
    this.add
      .text(width / 2, height / 2 - 48, 'DUNDEE', {
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        color: '#262626',
      })
      .setOrigin(0.5);

    this.load.on('progress', (v) => {
      bar.width = 400 * v;
    });

    this.load.spritesheet('hero', 'assets/hero/crocodile-hero-spritesheet.png', {
      frameWidth: 320,
      frameHeight: 320,
    });

    for (let i = 1; i <= 20; i++) {
      const id = String(i).padStart(2, '0');
      this.load.image(`level_${id}`, `assets/levels/level_${id}.png`);
    }

    const traps = [
      'platform_static',
      'platform_moving',
      'platform_breakable',
      'platform_disappearing',
      'spikes_3',
      'spikes_5',
      'falling_block',
      'rising_wall',
      'vertical_gate',
      'dart_launcher_left',
      'dart_launcher_right',
      'dart_projectile',
      'saw_blade',
      'crusher_spiked',
      'ceiling_spike_panel',
      'pendulum_spiked_ball',
      'pendulum_blade',
      'finish_door_closed',
      'finish_door_open',
      'chain_tile',
      'impact_fx',
      'spike_trap_0',
      'spike_trap_1',
      'spike_trap_2',
      'spike_trap_3',
    ];
    for (const t of traps) {
      this.load.image(t, `assets/traps/${t}.png`);
    }

    this.load.spritesheet('spike_trap_sheet', 'assets/spritesheets/spike_trap_sheet.png', {
      frameWidth: 192,
      frameHeight: 72,
    });
  }

  create() {
    this.anims.create({
      key: 'hero_idle',
      frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'hero_run',
      frames: this.anims.generateFrameNumbers('hero', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'hero_jump',
      frames: this.anims.generateFrameNumbers('hero', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'hero_lie',
      frames: this.anims.generateFrameNumbers('hero', { start: 12, end: 15 }),
      frameRate: 5,
      repeat: 0,
    });
    this.anims.create({
      key: 'spike_trap_anim',
      frames: this.anims.generateFrameNumbers('spike_trap_sheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
      yoyo: true,
    });

    this.scene.start('menu');
  }
}
