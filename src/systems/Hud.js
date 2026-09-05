import Phaser from 'phaser';

/**
 * Event-driven HUD — game-ui-ux skill (subscribe, don't poll gameplay in widgets).
 */
export default class Hud {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ level: number, lives: number, worldW: number, worldH: number }} opts
   */
  constructor(scene, opts) {
    this.scene = scene;
    const pad = 20;
    const safe = this._safeInset();

    this.livesText = scene.add
      .text(pad + safe.left, pad + safe.top, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#262626',
        backgroundColor: '#f3ead5cc',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(900);

    this.timeText = scene.add
      .text(opts.worldW / 2, pad + safe.top, '00:00.00', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#262626',
        backgroundColor: '#f3ead5cc',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(900);

    this.levelText = scene.add
      .text(opts.worldW - pad - safe.right, pad + safe.top, `Ур. ${opts.level}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#262626',
        backgroundColor: '#f3ead5cc',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(900);

    this.pauseBtn = scene.add
      .rectangle(opts.worldW - pad - safe.right, 70 + safe.top, 44, 44, 0xf3ead5, 0.9)
      .setStrokeStyle(2, 0x262626)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(900)
      .setInteractive({ useHandCursor: true });

    this.pauseIcon = scene.add
      .text(opts.worldW - pad - safe.right - 22, 92 + safe.top, '||', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#262626',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(901);

    this.setLives(opts.lives);

    scene.events.on('hud-lives', this.setLives, this);
    scene.events.on('hud-time', this.setTime, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('hud-lives', this.setLives, this);
      scene.events.off('hud-time', this.setTime, this);
    });
  }

  _safeInset() {
    try {
      const cs = getComputedStyle(document.documentElement);
      const read = (prop) => {
        const v = cs.getPropertyValue(prop).trim();
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      };
      return {
        left: Math.max(0, read('env(safe-area-inset-left)')),
        top: Math.max(8, read('env(safe-area-inset-top)')),
        right: Math.max(0, read('env(safe-area-inset-right)')),
        bottom: Math.max(0, read('env(safe-area-inset-bottom)')),
      };
    } catch {
      return { left: 0, top: 8, right: 0, bottom: 0 };
    }
  }

  setLives(n) {
    this.livesText.setText(`♥ ${n}`);
  }

  setTime(label) {
    this.timeText.setText(label);
  }

  onPause(fn) {
    this.pauseBtn.on('pointerdown', fn);
  }
}
