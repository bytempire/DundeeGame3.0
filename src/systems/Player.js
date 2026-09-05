import Phaser from 'phaser';

/**
 * Platformer controller — knobs from platformer skill (derived gravity/jump).
 * Feel targets: ~160px jump height, 0.35s to apex, coyote + buffer, fall 1.8×.
 */
const DISPLAY = 0.28;
const BODY_W = 40;
const BODY_H = 64;
const LIE_W = 64;
const LIE_H = 32;

const TILE = 48;
const JUMP_HEIGHT = 3.8 * TILE; // ~182px — clear 1–2 platform steps
const TIME_TO_APEX = 0.34;
export const RISE_GRAVITY = (2 * JUMP_HEIGHT) / (TIME_TO_APEX * TIME_TO_APEX);
export const JUMP_VELOCITY = -(2 * JUMP_HEIGHT) / TIME_TO_APEX;
const FALL_MULT = 1.75;
const COYOTE_MS = 110;
const JUMP_BUFFER_MS = 130;
const RUN_SPEED = 380;
const GROUND_ACCEL = 3800;
const AIR_ACCEL = 2400;
const GROUND_DRAG = 2800;

export default class Player {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} feetY platform top
   */
  constructor(scene, x, feetY) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, feetY, 'hero', 0);
    this.sprite.setScale(DISPLAY);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.body.setMaxVelocity(520, 1800);
    this.sprite.body.setBounce(0);
    this.sprite.body.setFriction(0, 0);
    // World supplies rise gravity; we add fall extra in update
    this.sprite.body.setGravityY(0);

    this.facing = 1;
    this.lying = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumpHold = 0;
    this.wasUp = false;
    this.wasOnFloor = false;
    this.invuln = 0;
    this.dead = false;
    this.input = { left: false, right: false, up: false, down: false, upJust: false };

    this._setStandingBody();
    this._placeFeetAt(x, feetY);
    this.sprite.anims.play('hero_idle');
  }

  _setStandingBody() {
    const bw = BODY_W / DISPLAY;
    const bh = BODY_H / DISPLAY;
    this.sprite.body.setSize(bw, bh, false);
    this.sprite.body.setOffset((320 - bw) / 2, 320 - bh);
  }

  _setLyingBody() {
    const bw = LIE_W / DISPLAY;
    const bh = LIE_H / DISPLAY;
    this.sprite.body.setSize(bw, bh, false);
    this.sprite.body.setOffset((320 - bw) / 2, 320 - bh);
  }

  _placeFeetAt(x, feetY) {
    // Slight overlap into platform top so Arcade reports onFloor immediately
    const targetBottom = feetY + 1;
    this.sprite.setPosition(x, targetBottom - this.sprite.displayHeight / 2);
    this.sprite.body.velocity.set(0, 0);
    this.sprite.body.setAcceleration(0, 0);
    this._syncBodyFromSprite();
    const dy = targetBottom - this.sprite.body.bottom;
    this.sprite.y += dy;
    this._syncBodyFromSprite();
    this.sprite.body.velocity.set(0, 0);
  }

  _syncBodyFromSprite() {
    const b = this.sprite.body;
    const s = this.sprite;
    b.x = s.x - s.displayOriginX + b.offset.x * s.scaleX;
    b.y = s.y - s.displayOriginY + b.offset.y * s.scaleY;
  }

  setInput(state) {
    if (state.up && !this.input.up) this.input.upJust = true;
    this.input.left = !!state.left;
    this.input.right = !!state.right;
    this.input.up = !!state.up;
    this.input.down = !!state.down;
  }

  hurtFlash() {
    this.invuln = 1200;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.35,
      duration: 80,
      yoyo: true,
      repeat: 6,
      onComplete: () => this.sprite.setAlpha(1),
    });
  }

  respawn(x, feetY) {
    this.lying = false;
    this._setStandingBody();
    this._placeFeetAt(x, feetY);
    this.sprite.setAlpha(1);
    this.wasOnFloor = true;
  }

  /** Squash on landing — game-feel */
  landJuice() {
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: DISPLAY * 1.15,
      scaleY: DISPLAY * 0.82,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.sprite.setScale(DISPLAY),
    });
  }

  update(delta) {
    if (this.dead) return;
    const body = this.sprite.body;
    const dt = delta / 1000;
    const onFloor = body.blocked.down || body.touching.down || body.onFloor();

    if (this.invuln > 0) this.invuln -= delta;

    if (onFloor) this.coyote = COYOTE_MS;
    else this.coyote -= delta;

    if (this.input.upJust) this.jumpBuf = JUMP_BUFFER_MS;
    else this.jumpBuf -= delta;
    this.input.upJust = false;

    // Asymmetric gravity (platformer skill) — heavier fall, no apex hang (kept simple)
    if (body.velocity.y > 40) {
      body.setGravityY(RISE_GRAVITY * (FALL_MULT - 1));
    } else {
      body.setGravityY(0);
    }

    // Land event
    if (onFloor && !this.wasOnFloor && body.velocity.y >= 0) {
      this.landJuice();
      this.scene.events.emit('player-land');
    }
    this.wasOnFloor = onFloor;

    // Lie / duck
    if (this.input.down && onFloor) {
      if (!this.lying) {
        this.lying = true;
        this._setLyingBody();
        this.sprite.anims.play('hero_lie', true);
      }
      body.setVelocityX(0);
      body.setAccelerationX(0);
      this.wasUp = this.input.up;
      return;
    }
    if (this.lying && (!this.input.down || !onFloor)) {
      this.lying = false;
      this._setStandingBody();
    }

    // Horizontal accel (not instant setVelocity)
    let wish = 0;
    if (this.input.left) wish -= 1;
    if (this.input.right) wish += 1;
    const accel = onFloor ? GROUND_ACCEL : AIR_ACCEL;

    if (wish !== 0) {
      body.setAccelerationX(wish * accel);
      this.facing = wish;
      this.sprite.setFlipX(wish < 0);
      // clamp run speed
      if (Math.abs(body.velocity.x) > RUN_SPEED) {
        body.setVelocityX(Math.sign(body.velocity.x) * RUN_SPEED);
      }
    } else {
      body.setAccelerationX(0);
      if (onFloor) {
        const vx = body.velocity.x;
        const drag = GROUND_DRAG * dt;
        if (Math.abs(vx) <= drag) body.setVelocityX(0);
        else body.setVelocityX(vx - Math.sign(vx) * drag);
      }
    }

    // Jump: coyote + buffer
    if (this.jumpBuf > 0 && this.coyote > 0 && !this.lying) {
      body.setVelocityY(JUMP_VELOCITY);
      this.jumpBuf = 0;
      this.coyote = 0;
      this.jumpHold = 0;
      this.sprite.anims.play('hero_jump', true);
      this.scene.events.emit('player-jump');
    }

    if (!onFloor && body.velocity.y < 0) this.jumpHold += delta;

    // Variable jump cut on release after short hold (tap = full-ish hop)
    if (this.wasUp && !this.input.up && body.velocity.y < -200 && this.jumpHold > 90) {
      body.setVelocityY(body.velocity.y * 0.45);
    }
    this.wasUp = this.input.up;

    // Anims
    if (!onFloor) {
      if (this.sprite.anims.currentAnim?.key !== 'hero_jump') {
        this.sprite.anims.play('hero_jump', true);
      }
    } else if (!this.lying) {
      if (Math.abs(body.velocity.x) > 40) this.sprite.anims.play('hero_run', true);
      else this.sprite.anims.play('hero_idle', true);
    }
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }
}
