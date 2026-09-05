import Phaser from 'phaser';
import Player from '../systems/Player.js';
import VirtualPad from '../systems/VirtualPad.js';
import LevelMechanics from '../systems/LevelMechanics.js';
import { getLevel } from '../data/levels.js';
import { unlockLevel, saveBestTime, formatTime } from '../data/storage.js';
import { WORLD } from '../data/manifest.js';

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super('play');
  }

  init(data) {
    this.levelNum = data.level || 1;
    this.lives = 5;
    this.elapsed = 0;
    this.finished = false;
    this.hurtLock = false;
  }

  create() {
    const level = getLevel(this.levelNum);
    const id = String(this.levelNum).padStart(2, '0');

    this.add.image(WORLD.w / 2, WORLD.h / 2, `level_${id}`).setDisplaySize(WORLD.w, WORLD.h);

    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h + 200);

    // invisible platform colliders from level data
    this.platforms = this.physics.add.staticGroup();
    for (const p of level.platforms) {
      const plat = this.add.rectangle(p.x, p.y, p.w, p.h, 0xff0000, 0);
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);
    }

    // kill zone at bottom
    this.killZone = this.add.rectangle(WORLD.w / 2, WORLD.h + 80, WORLD.w, 100, 0, 0);
    this.physics.add.existing(this.killZone, true);

    this.mechanics = new LevelMechanics(this, level.objects, { debugColliders: false });

    this.player = new Player(this, level.spawn.x, level.spawn.y);
    this.physics.add.collider(this.player.sprite, this.platforms);
    this.physics.add.collider(this.player.sprite, this.mechanics.movers);
    this.physics.add.overlap(this.player.sprite, this.mechanics.hazards, () => this.onHurt());
    this.physics.add.overlap(this.player.sprite, this.killZone, () => this.onHurt(true));

    const finish = this.mechanics.getFinishZone();
    if (finish) {
      this.physics.add.overlap(this.player.sprite, finish, () => this.onFinish());
    }

    this.pad = new VirtualPad(this);
    this._buildHud();

    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
  }

  _buildHud() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(900);
    this.livesText = this.add
      .text(24, 18, this._livesLabel(), {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#262626',
        backgroundColor: '#f3ead5aa',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(900);
    this.timeText = this.add
      .text(WORLD.w / 2, 18, '00:00.00', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#262626',
        backgroundColor: '#f3ead5aa',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(900);
    this.levelText = this.add
      .text(WORLD.w - 24, 18, `Ур. ${this.levelNum}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#262626',
        backgroundColor: '#f3ead5aa',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(900);

    const pause = this.add
      .rectangle(WORLD.w - 24, 70, 44, 44, 0xf3ead5, 0.9)
      .setStrokeStyle(2, 0x262626)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(900)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(WORLD.w - 46, 92, '||', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#262626',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(901);
    pause.on('pointerdown', () => this.showPause());
  }

  _livesLabel() {
    return `♥ ${this.lives}`;
  }

  showPause() {
    if (this.pauseOverlay) return;
    this.physics.pause();
    const { width, height } = this.scale;
    this.pauseOverlay = this.add.container(0, 0).setDepth(2000).setScrollFactor(0);
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);
    const panel = this.add.rectangle(width / 2, height / 2, 360, 280, 0xf3ead5).setStrokeStyle(3, 0x262626);
    const title = this.add
      .text(width / 2, height / 2 - 90, 'Пауза', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#262626',
      })
      .setOrigin(0.5);
    this.pauseOverlay.add([dim, panel, title]);

    const mk = (y, label, fn) => {
      const b = this.add
        .rectangle(width / 2, y, 240, 52, 0xf3ead5)
        .setStrokeStyle(2, 0x262626)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(width / 2, y, label, { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#262626' })
        .setOrigin(0.5);
      b.on('pointerdown', fn);
      this.pauseOverlay.add([b, t]);
    };
    mk(height / 2 - 10, 'Продолжить', () => {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
      this.physics.resume();
    });
    mk(height / 2 + 60, 'В меню', () => this.scene.start('menu'));
    mk(height / 2 + 120, 'Заново', () => this.scene.restart({ level: this.levelNum }));
  }

  onHurt(fall = false) {
    if (this.finished || this.hurtLock || this.player.invuln > 0) return;
    this.hurtLock = true;
    this.lives -= 1;
    this.livesText.setText(this._livesLabel());

    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    this.player.hurtFlash();
    const level = getLevel(this.levelNum);
    this.player.sprite.setVelocity(0, 0);
    this.player.sprite.setPosition(level.spawn.x, level.spawn.y);
    this.time.delayedCall(200, () => {
      this.hurtLock = false;
    });
  }

  onFinish() {
    if (this.finished) return;
    this.finished = true;
    this.mechanics.openDoor();
    this.physics.pause();
    const ms = Math.floor(this.elapsed);
    const isBest = saveBestTime(this.levelNum, ms);
    unlockLevel(this.levelNum + 1);

    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(2000).setScrollFactor(0);
    overlay.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4));
    overlay.add(
      this.add.rectangle(width / 2, height / 2, 420, 300, 0xf3ead5).setStrokeStyle(3, 0x262626)
    );
    overlay.add(
      this.add
        .text(width / 2, height / 2 - 90, `Уровень ${this.levelNum}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '36px',
          color: '#262626',
        })
        .setOrigin(0.5)
    );
    overlay.add(
      this.add
        .text(width / 2, height / 2 - 30, formatTime(ms), {
          fontFamily: 'monospace',
          fontSize: '40px',
          color: '#262626',
        })
        .setOrigin(0.5)
    );
    if (isBest) {
      overlay.add(
        this.add
          .text(width / 2, height / 2 + 20, 'Новый рекорд!', {
            fontFamily: 'Georgia, serif',
            fontSize: '22px',
            color: '#c95b50',
          })
          .setOrigin(0.5)
      );
    }

    const next = this.levelNum < 20;
    const btn = this.add
      .rectangle(width / 2, height / 2 + 90, 260, 56, 0xf3ead5)
      .setStrokeStyle(2, 0x262626)
      .setInteractive({ useHandCursor: true });
    overlay.add(btn);
    overlay.add(
      this.add
        .text(width / 2, height / 2 + 90, next ? 'Дальше' : 'В меню', {
          fontFamily: 'Georgia, serif',
          fontSize: '28px',
          color: '#262626',
        })
        .setOrigin(0.5)
    );
    btn.on('pointerdown', () => {
      if (next) this.scene.restart({ level: this.levelNum + 1 });
      else this.scene.start('menu');
    });
  }

  gameOver() {
    this.finished = true;
    this.physics.pause();
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(2000).setScrollFactor(0);
    overlay.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45));
    overlay.add(
      this.add.rectangle(width / 2, height / 2, 400, 240, 0xf3ead5).setStrokeStyle(3, 0x262626)
    );
    overlay.add(
      this.add
        .text(width / 2, height / 2 - 50, 'Попытки закончились', {
          fontFamily: 'Georgia, serif',
          fontSize: '30px',
          color: '#262626',
        })
        .setOrigin(0.5)
    );
    const again = this.add
      .rectangle(width / 2, height / 2 + 40, 240, 52, 0xf3ead5)
      .setStrokeStyle(2, 0x262626)
      .setInteractive({ useHandCursor: true });
    overlay.add(again);
    overlay.add(
      this.add
        .text(width / 2, height / 2 + 40, 'Заново', {
          fontFamily: 'Georgia, serif',
          fontSize: '26px',
          color: '#262626',
        })
        .setOrigin(0.5)
    );
    again.on('pointerdown', () => this.scene.restart({ level: this.levelNum }));
  }

  update(_t, delta) {
    if (this.finished || this.pauseOverlay) return;
    this.elapsed += delta;
    this.timeText.setText(formatTime(this.elapsed));

    const input = this.pad.update();
    this.player.setInput(input);
    this.player.update(delta);
    this.mechanics.update(delta, this.player.sprite);

    if (this.player.y > WORLD.h + 40) this.onHurt(true);
  }
}
