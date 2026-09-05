import Phaser from 'phaser';
import Player, { RISE_GRAVITY } from '../systems/Player.js';
import VirtualPad from '../systems/VirtualPad.js';
import LevelMechanics from '../systems/LevelMechanics.js';
import FollowCamera from '../systems/FollowCamera.js';
import Hud from '../systems/Hud.js';
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
    this.pauseOverlay = null;
  }

  create() {
    const level = getLevel(this.levelNum);
    const id = String(this.levelNum).padStart(2, '0');

    this.add.image(WORLD.w / 2, WORLD.h / 2, `level_${id}`).setDisplaySize(WORLD.w, WORLD.h);

    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h + 200);
    // Rise gravity from platformer skill derivation (Player adds fall multiplier)
    this.physics.world.gravity.y = RISE_GRAVITY;

    if (!this.textures.exists('solid_px')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('solid_px', 4, 4);
      g.destroy();
    }

    this.platforms = this.physics.add.staticGroup();
    for (const p of level.platforms) {
      const plat = this.platforms.create(p.x, p.y, 'solid_px');
      const h = Math.max(p.h || 32, 32);
      plat.setDisplaySize(p.w, h);
      plat.refreshBody();
      plat.setVisible(false);
    }

    this.killZone = this.add.rectangle(WORLD.w / 2, WORLD.h + 80, WORLD.w, 100, 0, 0);
    this.physics.add.existing(this.killZone, true);

    this.mechanics = new LevelMechanics(this, level.objects);

    this.player = new Player(this, level.spawn.x, level.spawn.y);
    this.physics.add.collider(this.player.sprite, this.platforms);
    this.physics.add.collider(this.player.sprite, this.mechanics.movers);
    this.physics.add.overlap(this.player.sprite, this.mechanics.hazards, (_p, h) => {
      if (h.getData && h.getData('damage') === false) return;
      this.onHurt();
    });
    this.physics.add.overlap(this.player.sprite, this.killZone, () => this.onHurt(true));

    const finish = this.mechanics.getFinishZone();
    if (finish) {
      this.physics.add.overlap(this.player.sprite, finish, () => this.onFinish());
    }

    this.pad = new VirtualPad(this);
    this.followCam = new FollowCamera(this, this.player.sprite, { width: WORLD.w, height: WORLD.h });

    this.hud = new Hud(this, {
      level: this.levelNum,
      lives: this.lives,
      worldW: WORLD.w,
      worldH: WORLD.h,
    });
    this.hud.onPause(() => this.showPause());

    this.events.on('player-land', () => this.followCam.addTrauma(0.12));
    this.events.on('player-jump', () => {});
  }

  showPause() {
    if (this.pauseOverlay || this.finished) return;
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

  onHurt() {
    if (this.finished || this.hurtLock || this.player.invuln > 0) return;
    this.hurtLock = true;
    this.lives -= 1;
    this.events.emit('hud-lives', this.lives);
    this.followCam.addTrauma(0.45);
    this.cameras.main.flash(120, 201, 91, 80, false);

    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    this.player.hurtFlash();
    const level = getLevel(this.levelNum);
    this.player.respawn(level.spawn.x, level.spawn.y);
    this.time.delayedCall(250, () => {
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
    this.events.emit('hud-time', formatTime(this.elapsed));

    const input = this.pad.update();
    this.player.setInput(input);
    this.player.update(delta);
    this.mechanics.update(delta, this.player.sprite);
    this.followCam.update(delta);

    if (this.player.y > WORLD.h + 40) this.onHurt();
  }
}
