import Phaser from 'phaser';
import { getUnlockedLevel, getBestTimes, formatTime } from '../data/storage.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('levelSelect');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#f3ead5');

    this.add
      .text(width / 2, 60, 'Выбор уровня', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#262626',
      })
      .setOrigin(0.5);

    const unlocked = getUnlockedLevel();
    const best = getBestTimes();
    const cols = 5;
    const startX = 180;
    const startY = 160;
    const gapX = 280;
    const gapY = 140;

    for (let i = 1; i <= 20; i++) {
      const col = (i - 1) % cols;
      const row = Math.floor((i - 1) / cols);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      const open = i <= unlocked;
      const bg = this.add
        .rectangle(x, y, 120, 88, open ? 0xf3ead5 : 0xd9d0bc)
        .setStrokeStyle(3, 0x262626);
      this.add
        .text(x, y - 10, String(i), {
          fontFamily: 'Georgia, serif',
          fontSize: '36px',
          color: open ? '#262626' : '#888',
        })
        .setOrigin(0.5);
      const t = best[String(i)];
      if (t) {
        this.add
          .text(x, y + 28, formatTime(t), {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#5a5a5a',
          })
          .setOrigin(0.5);
      }
      if (open) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.scene.start('play', { level: i }));
      }
    }

    const back = this.add
      .rectangle(width / 2, height - 70, 200, 56, 0xf3ead5)
      .setStrokeStyle(3, 0x262626)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height - 70, 'Назад', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#262626',
      })
      .setOrigin(0.5);
    back.on('pointerdown', () => this.scene.start('menu'));
  }
}
