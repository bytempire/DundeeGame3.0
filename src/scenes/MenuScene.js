import Phaser from 'phaser';
import { getUnlockedLevel } from '../data/storage.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#f3ead5');

    // paper grid
    const g = this.add.graphics();
    g.lineStyle(1, 0xb8c4c8, 0.35);
    for (let x = 0; x < width; x += 40) g.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 40) g.lineBetween(0, y, width, y);

    this.add
      .text(width / 2, height * 0.28, 'DUNDEE', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '96px',
        color: '#262626',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.4, 'Крокодил против ловушек', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#5a5a5a',
      })
      .setOrigin(0.5);

    const unlocked = getUnlockedLevel();

    this.makeBtn(width / 2, height * 0.58, 'Играть', () => {
      this.scene.start('play', { level: unlocked });
    });
    this.makeBtn(width / 2, height * 0.7, 'Уровни', () => {
      this.scene.start('levelSelect');
    });
  }

  makeBtn(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, 280, 64, 0xf3ead5)
      .setStrokeStyle(3, 0x262626)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#262626',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0xe8dcc4));
    bg.on('pointerout', () => bg.setFillStyle(0xf3ead5));
    return { bg, txt };
  }
}
