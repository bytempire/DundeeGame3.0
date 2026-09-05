import Phaser from 'phaser';

/**
 * On-screen D-pad: left / right / up / down
 */
export default class VirtualPad {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.state = { left: false, right: false, up: false, down: false };
    this.keys = scene.input.keyboard?.addKeys({
      left: 'A',
      right: 'D',
      up: 'W',
      down: 'S',
      left2: 'LEFT',
      right2: 'RIGHT',
      up2: 'UP',
      down2: 'DOWN',
      space: 'SPACE',
    });

    const { width, height } = scene.scale;
    this.layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    const mk = (x, y, label, key) => {
      const r = scene.add
        .circle(x, y, 48, 0x262626, 0.35)
        .setStrokeStyle(3, 0x262626, 0.7)
        .setInteractive();
      const t = scene.add
        .text(x, y, label, {
          fontFamily: 'Georgia, serif',
          fontSize: '28px',
          color: '#262626',
        })
        .setOrigin(0.5);
      this.layer.add([r, t]);
      const set = (v) => {
        this.state[key] = v;
        r.setFillStyle(0x262626, v ? 0.55 : 0.35);
      };
      r.on('pointerdown', (p) => {
        p.event.stopPropagation();
        set(true);
      });
      r.on('pointerup', () => set(false));
      r.on('pointerout', () => set(false));
      return r;
    };

    // left cluster
    mk(110, height - 110, '←', 'left');
    mk(230, height - 110, '→', 'right');
    // right cluster
    mk(width - 230, height - 110, '↓', 'down');
    mk(width - 110, height - 110, '↑', 'up');
  }

  update() {
    const k = this.keys;
    if (!k) return this.state;
    return {
      left: this.state.left || k.left.isDown || k.left2.isDown,
      right: this.state.right || k.right.isDown || k.right2.isDown,
      up: this.state.up || k.up.isDown || k.up2.isDown || k.space.isDown,
      down: this.state.down || k.down.isDown || k.down2.isDown,
    };
  }
}
