import Phaser from 'phaser';

const DISPLAY = 0.32; // 320 * 0.32 ≈ 102px
const RUN_SPEED = 360;
const JUMP_V = -920;
const COYOTE = 100;
const JUMP_BUFFER = 120;

export default class Player {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'hero', 0);
    this.sprite.setScale(DISPLAY);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.body.setMaxVelocity(520, 1600);
    this.sprite.body.setDragX(1800);
    this._setStandingBody();

    this.facing = 1;
    this.lying = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.invuln = 0;
    this.dead = false;
    this.input = { left: false, right: false, up: false, down: false, upJust: false };

    this.sprite.anims.play('hero_idle');
  }

  _setStandingBody() {
    const w = 48;
    const h = 72;
    this.sprite.body.setSize(w / DISPLAY, h / DISPLAY);
    this.sprite.body.setOffset((320 - w / DISPLAY) / 2, 320 - h / DISPLAY - 8);
  }

  _setLyingBody() {
    const w = 72;
    const h = 36;
    this.sprite.body.setSize(w / DISPLAY, h / DISPLAY);
    this.sprite.body.setOffset((320 - w / DISPLAY) / 2, 320 - h / DISPLAY - 4);
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

    // lie only on ground
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
      this.sprite.anims.play('hero_jump', true);
    }

    // variable jump cut
    if (!this.input.up && body.velocity.y < -200) {
      body.setVelocityY(body.velocity.y * 0.55);
    }

    // fall gravity boost via world gravity; animate
    if (!onFloor) {
      if (this.sprite.anims.currentAnim?.key !== 'hero_jump' || this.sprite.anims.isPlaying === false) {
        this.sprite.anims.play('hero_jump', true);
        this.sprite.anims.setCurrentFrame(this.sprite.anims.currentAnim.frames[body.velocity.y < 0 ? 2 : 3]);
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
