import Phaser from 'phaser';

const DISPLAY = 0.28;
const BODY_W = 40;
const BODY_H = 64;
const LIE_W = 64;
const LIE_H = 32;
const RUN_SPEED = 360;
const JUMP_V = -920;
const COYOTE = 100;
const JUMP_BUFFER = 120;

export default class Player {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x center x
   * @param {number} feetY platform top (where feet should rest)
   */
  constructor(scene, x, feetY) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, feetY, 'hero', 0);
    this.sprite.setScale(DISPLAY);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.body.setMaxVelocity(520, 1600);
    this.sprite.body.setDragX(1800);
    this.sprite.body.setBounce(0);
    this.sprite.body.setFriction(1, 0);

    this.facing = 1;
    this.lying = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumpHold = 0;
    this.wasUp = false;
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
    // keep body bottom flush with sprite bottom (feet)
    this.sprite.body.setSize(bw, bh, false);
    this.sprite.body.setOffset((320 - bw) / 2, 320 - bh);
  }

  _setLyingBody() {
    const bw = LIE_W / DISPLAY;
    const bh = LIE_H / DISPLAY;
    this.sprite.body.setSize(bw, bh, false);
    this.sprite.body.setOffset((320 - bw) / 2, 320 - bh);
  }

  /**
   * Place sprite so after Arcade syncs body from offset, feet sit on feetY.
   * Do NOT call body.reset(x,y) with sprite-center coords — it desyncs offset for 1 frame
   * and tunnels through thin platforms.
   */
  _placeFeetAt(x, feetY) {
    const targetBottom = feetY - 2;
    // first guess: feet ≈ sprite bottom
    this.sprite.setPosition(x, targetBottom - this.sprite.displayHeight / 2);
    this.sprite.body.velocity.set(0, 0);
    this.sprite.body.setAcceleration(0, 0);
    // sync AABB from game object + offset
    if (typeof this.sprite.body.updateFromGameObject === 'function') {
      this.sprite.body.updateFromGameObject();
    } else {
      // fallback: manually match body top-left
      this.sprite.body.x = this.sprite.x - this.sprite.displayOriginX + this.sprite.body.offset.x * this.sprite.scaleX;
      this.sprite.body.y = this.sprite.y - this.sprite.displayOriginY + this.sprite.body.offset.y * this.sprite.scaleY;
    }
    const dy = targetBottom - this.sprite.body.bottom;
    this.sprite.y += dy;
    if (typeof this.sprite.body.updateFromGameObject === 'function') {
      this.sprite.body.updateFromGameObject();
    } else {
      this.sprite.body.x = this.sprite.x - this.sprite.displayOriginX + this.sprite.body.offset.x * this.sprite.scaleX;
      this.sprite.body.y = this.sprite.y - this.sprite.displayOriginY + this.sprite.body.offset.y * this.sprite.scaleY;
    }
    this.sprite.body.velocity.set(0, 0);
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
  }

  update(delta) {
    if (this.dead) return;
    const body = this.sprite.body;
    const onFloor = body.blocked.down || body.touching.down;

    if (this.invuln > 0) this.invuln -= delta;

    if (onFloor) this.coyote = COYOTE;
    else this.coyote -= delta;

    if (this.input.upJust) this.jumpBuf = JUMP_BUFFER;
    else this.jumpBuf -= delta;
    this.input.upJust = false;

    if (this.input.down && onFloor) {
      if (!this.lying) {
        this.lying = true;
        this._setLyingBody();
        this.sprite.anims.play('hero_lie', true);
      }
      body.setVelocityX(0);
      return;
    }
    if (this.lying && (!this.input.down || !onFloor)) {
      this.lying = false;
      this._setStandingBody();
    }

    let ax = 0;
    if (this.input.left) ax -= 1;
    if (this.input.right) ax += 1;

    if (ax !== 0) {
      body.setVelocityX(ax * RUN_SPEED);
      this.facing = ax;
      this.sprite.setFlipX(ax < 0);
    } else if (onFloor) {
      body.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, 0.35));
    }

    if (this.jumpBuf > 0 && this.coyote > 0 && !this.lying) {
      body.setVelocityY(JUMP_V);
      this.jumpBuf = 0;
      this.coyote = 0;
      this.jumpHold = 0;
      this.sprite.anims.play('hero_jump', true);
    }

    if (!onFloor && body.velocity.y < 0) this.jumpHold += delta;

    // Variable jump: cut only on release after a short hold (tap = full hop)
    if (this.wasUp && !this.input.up && body.velocity.y < -200 && this.jumpHold > 100) {
      body.setVelocityY(body.velocity.y * 0.5);
    }
    this.wasUp = this.input.up;

    if (!onFloor) {
      if (this.sprite.anims.currentAnim?.key !== 'hero_jump' || this.sprite.anims.isPlaying === false) {
        this.sprite.anims.play('hero_jump', true);
        const frames = this.sprite.anims.currentAnim?.frames;
        if (frames?.length) {
          this.sprite.anims.setCurrentFrame(frames[body.velocity.y < 0 ? 2 : Math.min(3, frames.length - 1)]);
        }
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
