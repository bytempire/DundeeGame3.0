import Phaser from 'phaser';

/**
 * 2D follow camera — camera-systems skill:
 * deadzone + look-ahead + exponential smoothing + bounds + trauma shake.
 */
export default class FollowCamera {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.GameObject} target
   * @param {{ width: number, height: number }} bounds
   */
  constructor(scene, target, bounds) {
    this.scene = scene;
    this.target = target;
    this.bounds = bounds;
    this.focus = new Phaser.Math.Vector2(target.x, target.y);
    this.deadzone = new Phaser.Math.Vector2(70, 50);
    this.lookAhead = 90;
    this.rate = 8; // exp smoothing
    this.trauma = 0;
    this.traumaDecay = 1.4;
    this.maxOffset = new Phaser.Math.Vector2(14, 10);

    const cam = scene.cameras.main;
    cam.setBounds(0, 0, bounds.width, bounds.height);
    cam.centerOn(target.x, target.y);
  }

  addTrauma(amount) {
    this.trauma = Phaser.Math.Clamp(this.trauma + amount, 0, 1);
  }

  /**
   * Call after physics (scene update end).
   * @param {number} delta ms
   */
  update(delta) {
    const dt = delta / 1000;
    const cam = this.scene.cameras.main;
    const tx = this.target.x;
    const ty = this.target.y;
    const body = this.target.body;

    // Deadzone focus
    const dx = tx - this.focus.x;
    const dy = ty - this.focus.y;
    if (Math.abs(dx) > this.deadzone.x) {
      this.focus.x += (Math.abs(dx) - this.deadzone.x) * Math.sign(dx);
    }
    if (Math.abs(dy) > this.deadzone.y) {
      this.focus.y += (Math.abs(dy) - this.deadzone.y) * Math.sign(dy);
    }

    // Look-ahead from velocity
    let leadX = 0;
    if (body && Math.abs(body.velocity.x) > 40) {
      leadX = Math.sign(body.velocity.x) * this.lookAhead;
    }
    const desiredX = this.focus.x + leadX;
    const desiredY = this.focus.y;

    const t = 1 - Math.exp(-this.rate * dt);
    const cx = Phaser.Math.Linear(cam.scrollX + cam.width / 2, desiredX, t);
    const cy = Phaser.Math.Linear(cam.scrollY + cam.height / 2, desiredY, t);

    // Trauma shake (visual only)
    let ox = 0;
    let oy = 0;
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);
      const shake = this.trauma * this.trauma;
      ox = (Math.random() * 2 - 1) * this.maxOffset.x * shake;
      oy = (Math.random() * 2 - 1) * this.maxOffset.y * shake;
    }

    cam.centerOn(cx + ox, cy + oy);
  }
}
