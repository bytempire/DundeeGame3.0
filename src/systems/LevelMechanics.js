import Phaser from 'phaser';
import { MANIFEST } from '../data/manifest.js';

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Creates and updates all interactive level objects from config.
 * States: idle | warning | active | cooldown
 */
export default class LevelMechanics {
  /**
   * @param {Phaser.Scene} scene
   * @param {object[]} objects
   * @param {{ debugColliders?: boolean }} opts
   */
  constructor(scene, objects, opts = {}) {
    this.scene = scene;
    this.debug = !!opts.debugColliders;
    this.solids = scene.physics.add.staticGroup();
    this.movers = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.hazards = scene.physics.add.group({ allowGravity: false });
    this.items = [];
    this.dartPool = [];
    this.time = 0;

    for (const cfg of objects) {
      this._spawn(cfg);
    }
  }

  _tex(type) {
    if (type === 'finish_door') return 'finish_door_closed';
    return type;
  }

  _spawn(cfg) {
    const type = cfg.type;
    const meta = MANIFEST[type] || {};
    const size = meta.size || meta.frameSize || [64, 64];

    if (type === 'finish_door') {
      const spr = this.scene.add.image(cfg.x, cfg.y, 'finish_door_closed').setOrigin(0.5, 1);
      spr.setDisplaySize(size[0], size[1]);
      const zone = this.scene.add.zone(cfg.x, cfg.y - 40, 60, 80);
      this.scene.physics.add.existing(zone, true);
      this.items.push({ type, cfg, spr, zone, state: 'idle' });
      return;
    }

    if (type === 'spikes_3' || type === 'spikes_5') {
      const spr = this.scene.physics.add.image(cfg.x, cfg.y, type);
      spr.setOrigin(0.5, 1);
      spr.setDisplaySize(size[0], size[1]);
      spr.body.allowGravity = false;
      spr.body.setImmovable(true);
      this._applyNormCollider(spr, size, meta.collider, 0.5, 1);
      this.hazards.add(spr);
      this.items.push({ type, cfg, spr, state: 'active', damage: true });
      return;
    }

    if (type === 'spike_trap') {
      const spr = this.scene.physics.add.sprite(cfg.x, cfg.y, 'spike_trap_sheet', 0);
      spr.setOrigin(0.5, 1);
      spr.setDisplaySize(96, 36);
      spr.body.allowGravity = false;
      spr.body.setImmovable(true);
      spr.body.enable = false;
      spr.play('spike_trap_anim');
      this.hazards.add(spr);
      this.items.push({
        type,
        cfg,
        spr,
        state: 'idle',
        phase: 0,
        timer: 0,
        cycle: { warn: 300, active: 420, cool: 900 },
      });
      return;
    }

    if (type === 'saw_blade') {
      const spr = this.scene.physics.add.image(cfg.x, cfg.y, type);
      spr.setDisplaySize(size[0], size[1]);
      spr.body.allowGravity = false;
      spr.body.setCircle(size[0] * 0.39, size[0] * 0.11, size[1] * 0.11);
      this.hazards.add(spr);
      this.items.push({
        type,
        cfg,
        spr,
        state: 'active',
        damage: true,
        rotSpeed: (Math.PI * 2) / 0.7,
        anim: cfg.anim || null,
        t: 0,
      });
      return;
    }

    if (type === 'platform_moving' || type === 'platform_disappearing' || type === 'platform_breakable') {
      const spr = this.scene.physics.add.image(cfg.x, cfg.y, type);
      const w = cfg.width || size[0];
      const h = size[1];
      spr.setDisplaySize(w, h);
      spr.body.allowGravity = false;
      spr.body.setImmovable(true);
      spr.body.setSize(w, h * 0.65);
      spr.body.setOffset(0, h * 0.1);
      this.movers.add(spr);
      this.items.push({
        type,
        cfg,
        spr,
        state: 'idle',
        anim: cfg.anim || null,
        t: 0,
        broken: false,
        timer: 0,
        touched: false,
        visiblePhase: true,
      });
      return;
    }

    if (type === 'falling_block') {
      const spr = this.scene.physics.add.image(cfg.x, cfg.y, type);
      spr.setDisplaySize(size[0], size[1]);
      spr.body.allowGravity = false;
      spr.body.setImmovable(true);
      this.hazards.add(spr);
      // also solid when idle
      this.movers.add(spr);
      if (cfg.chain) {
        const chain = this.scene.add.image(cfg.x, cfg.y - size[1] / 2 - 24, 'chain_tile');
        chain.setDisplaySize(24, 48);
        chain.setOrigin(0.5, 1);
        this.items.push({ type: 'chain_tile', spr: chain, parent: spr });
      }
      this.items.push({
        type,
        cfg,
        spr,
        state: 'idle',
        homeY: cfg.y,
        dropTo: cfg.dropTo ?? cfg.y + 280,
        timer: 0,
        damage: false,
      });
      return;
    }

    if (type === 'crusher_spiked' || type === 'ceiling_spike_panel') {
      const spr = this.scene.physics.add.image(cfg.x, cfg.y, type);
      spr.setOrigin(0.5, 0);
      spr.setDisplaySize(size[0], size[1]);
      spr.body.allowGravity = false;
      spr.body.setImmovable(true);
      this._applyNormCollider(spr, size, meta.collider, 0.5, 0);
      this.hazards.add(spr);
      this.items.push({
        type,
        cfg,
        spr,
        state: 'idle',
        homeY: cfg.y,
        dropTo: cfg.dropTo ?? cfg.y + 200,
        timer: 0,
        damage: true,
      });
      return;
    }

    if (type === 'rising_wall' || type === 'vertical_gate') {
      const spr = this.scene.physics.add.image(cfg.x, cfg.y, type);
      spr.setOrigin(0.5, type === 'rising_wall' ? 1 : 0);
      spr.setDisplaySize(size[0], size[1]);
      spr.body.allowGravity = false;
      spr.body.setImmovable(true);
      this.movers.add(spr);
      this.hazards.add(spr);
      this.items.push({
        type,
        cfg,
        spr,
        state: 'active',
        anim: cfg.anim || { type: 'moveY', from: cfg.y, to: cfg.y - 100, duration: 2000 },
        t: 0,
        damage: true,
      });
      return;
    }

    if (type === 'dart_launcher_left' || type === 'dart_launcher_right') {
      const spr = this.scene.add.image(cfg.x, cfg.y, type);
      spr.setDisplaySize(size[0], size[1]);
      const dir = type === 'dart_launcher_left' ? -1 : 1;
      const muzzle = meta.muzzle || [0.5, 0.5];
      this.items.push({
        type,
        cfg,
        spr,
        state: 'idle',
        dir,
        muzzle,
        size,
        timer: cfg.delay || 400,
        interval: cfg.interval || 1600,
      });
      return;
    }

    if (type === 'pendulum_spiked_ball' || type === 'pendulum_blade') {
      const pivot = meta.pivot || [0.5, 0.033];
      const spr = this.scene.add.image(cfg.x, cfg.y, type);
      spr.setDisplaySize(size[0], size[1]);
      spr.setOrigin(pivot[0], pivot[1]);
      // hazard body at ball tip — updated each frame
      const hit = this.scene.physics.add.image(cfg.x, cfg.y + size[1] * 0.8, type);
      hit.setVisible(false);
      hit.body.allowGravity = false;
      hit.body.setSize(size[0] * 0.55, size[1] * 0.28);
      this.hazards.add(hit);
      this.items.push({
        type,
        cfg,
        spr,
        hit,
        size,
        pivot,
        state: 'active',
        damage: true,
        angle: 0,
        amp: Phaser.Math.DegToRad(cfg.amp || 38),
        period: cfg.period || 1900,
        t: 0,
      });
      return;
    }
  }

  _applyNormCollider(spr, size, norm, originX, originY) {
    if (!norm) return;
    const [nx, ny, nw, nh] = norm;
    const w = spr.displayWidth;
    const h = spr.displayHeight;
    const bw = nw * w;
    const bh = nh * h;
    spr.body.setSize(bw, bh);
    // offset relative to texture top-left in unscaled space is messy with display size;
    // Arcade uses source size — set size in display pixels after setDisplaySize via scale trick:
    const sx = spr.scaleX;
    const sy = spr.scaleY;
    spr.body.setSize(bw / sx, bh / sy);
    const ox = (nx * w) / sx;
    const oy = (ny * h) / sy;
    spr.body.setOffset(ox, oy);
  }

  _lerpAnim(item, dt) {
    const anim = item.anim;
    if (!anim) return;
    const dur = anim.duration || 2200;
    item.t += dt;
    const cycle = (item.t % (dur * 2)) / dur;
    const ping = cycle <= 1 ? cycle : 2 - cycle;
    const e = easeInOutSine(ping);
    const v = Phaser.Math.Linear(anim.from, anim.to, e);
    if (anim.type === 'moveX') item.spr.x = v;
    else if (anim.type === 'moveY') item.spr.y = v;
    if (item.spr.body) {
      item.spr.body.reset(item.spr.x, item.spr.y);
    }
  }

  _getDart() {
    let d = this.dartPool.find((p) => !p.active);
    if (!d) {
      d = this.scene.physics.add.image(-100, -100, 'dart_projectile');
      d.setDisplaySize(64, 24);
      d.body.allowGravity = false;
      this.hazards.add(d);
      this.dartPool.push(d);
    }
    d.setActive(true).setVisible(true);
    d.body.enable = true;
    return d;
  }

  update(delta, playerSprite) {
    this.time += delta;
    for (const item of this.items) {
      if (item.type === 'chain_tile') {
        if (item.parent) {
          item.spr.x = item.parent.x;
          item.spr.y = item.parent.y - item.parent.displayHeight / 2;
        }
        continue;
      }

      if (item.type === 'saw_blade') {
        item.spr.rotation += item.rotSpeed * (delta / 1000);
        this._lerpAnim(item, delta);
        continue;
      }

      if (item.type === 'platform_moving' || item.type === 'rising_wall' || item.type === 'vertical_gate') {
        this._lerpAnim(item, delta);
        continue;
      }

      if (item.type === 'platform_disappearing') {
        item.timer += delta;
        // visible 1400, blink 400, hidden 900
        const cycle = 1400 + 400 + 900;
        const t = item.timer % cycle;
        if (t < 1400) {
          item.spr.setAlpha(1);
          item.spr.body.enable = true;
        } else if (t < 1800) {
          item.spr.setAlpha(Math.sin(t * 0.04) > 0 ? 1 : 0.2);
          item.spr.body.enable = true;
        } else {
          item.spr.setAlpha(0);
          item.spr.body.enable = false;
        }
        item.spr.body.reset(item.spr.x, item.spr.y);
        continue;
      }

      if (item.type === 'platform_breakable') {
        if (item.broken) {
          item.timer += delta;
          if (item.state === 'warning' && item.timer > 350) {
            item.state = 'active';
            item.timer = 0;
            item.spr.body.enable = false;
            this.scene.tweens.add({
              targets: item.spr,
              y: item.spr.y + 400,
              alpha: 0,
              duration: 450,
              ease: 'Quad.easeIn',
            });
          }
          continue;
        }
        if (
          playerSprite &&
          playerSprite.body.touching.down &&
          item.spr.body.touching.up
        ) {
          item.broken = true;
          item.state = 'warning';
          item.timer = 0;
          this.scene.tweens.add({
            targets: item.spr,
            x: item.spr.x + 3,
            duration: 40,
            yoyo: true,
            repeat: 6,
          });
        }
        continue;
      }

      if (item.type === 'falling_block') {
        item.timer += delta;
        if (item.state === 'idle' && item.timer > (item.cfg.period || 2200)) {
          item.state = 'warning';
          item.timer = 0;
          this.scene.tweens.add({
            targets: item.spr,
            x: item.spr.x + 4,
            duration: 50,
            yoyo: true,
            repeat: 5,
          });
        } else if (item.state === 'warning' && item.timer > 350) {
          item.state = 'active';
          item.timer = 0;
          item.damage = true;
          this.scene.tweens.add({
            targets: item.spr,
            y: item.dropTo,
            duration: 450,
            ease: 'Quad.easeIn',
            onUpdate: () => item.spr.body.reset(item.spr.x, item.spr.y),
            onComplete: () => {
              item.state = 'cooldown';
              item.timer = 0;
              item.damage = false;
            },
          });
        } else if (item.state === 'cooldown' && item.timer > 1200) {
          item.spr.y = item.homeY;
          item.spr.body.reset(item.spr.x, item.spr.y);
          item.state = 'idle';
          item.timer = 0;
        }
        continue;
      }

      if (item.type === 'crusher_spiked' || item.type === 'ceiling_spike_panel') {
        item.timer += delta;
        if (item.state === 'idle' && item.timer > (item.cfg.period || 1800)) {
          item.state = 'warning';
          item.timer = 0;
          item.spr.setTint(0xc95b50);
        } else if (item.state === 'warning' && item.timer > 300) {
          item.state = 'active';
          item.timer = 0;
          item.spr.clearTint();
          this.scene.tweens.add({
            targets: item.spr,
            y: item.dropTo,
            duration: 220,
            ease: 'Quad.easeIn',
            onUpdate: () => item.spr.body.reset(item.spr.x, item.spr.y),
            onComplete: () => {
              item.state = 'hold';
              item.timer = 0;
            },
          });
        } else if (item.state === 'hold' && item.timer > 450) {
          item.state = 'return';
          this.scene.tweens.add({
            targets: item.spr,
            y: item.homeY,
            duration: 800,
            ease: 'Sine.easeInOut',
            onUpdate: () => item.spr.body.reset(item.spr.x, item.spr.y),
            onComplete: () => {
              item.state = 'idle';
              item.timer = 0;
            },
          });
        }
        continue;
      }

      if (item.type === 'spike_trap') {
        item.timer += delta;
        const frame = item.spr.frame.name ?? item.spr.frame.sourceIndex ?? 0;
        const idx = typeof frame === 'number' ? frame : item.spr.anims.currentFrame?.index || 0;
        const dangerous = idx >= 2;
        item.spr.body.enable = dangerous;
        if (dangerous) {
          item.spr.body.reset(item.spr.x, item.spr.y - 10);
          item.damage = true;
        } else {
          item.damage = false;
        }
        continue;
      }

      if (item.type === 'dart_launcher_left' || item.type === 'dart_launcher_right') {
        item.timer -= delta;
        if (item.timer <= 0) {
          item.timer = item.interval;
          const mx = item.cfg.x + (item.muzzle[0] - 0.5) * item.size[0];
          const my = item.cfg.y + (item.muzzle[1] - 0.5) * item.size[1];
          const dart = this._getDart();
          dart.setPosition(mx, my);
          dart.setFlipX(item.dir < 0);
          dart.body.reset(mx, my);
          dart.body.setVelocityX(item.dir * (item.cfg.speed || 620));
          dart.body.setVelocityY(0);
        }
        continue;
      }

      if (item.type === 'pendulum_spiked_ball' || item.type === 'pendulum_blade') {
        item.t += delta;
        const ang = Math.sin((item.t / item.period) * Math.PI * 2) * item.amp;
        item.spr.setRotation(ang);
        const len = item.size[1] * 0.82;
        const hx = item.cfg.x + Math.sin(ang) * len;
        const hy = item.cfg.y + Math.cos(ang) * len;
        item.hit.setPosition(hx, hy);
        item.hit.body.reset(hx, hy);
        continue;
      }
    }

    // recycle darts
    for (const d of this.dartPool) {
      if (!d.active) continue;
      if (d.x < -80 || d.x > 1750 || d.y < -80 || d.y > 1000) {
        d.setActive(false).setVisible(false);
        d.body.enable = false;
        d.body.setVelocity(0, 0);
      }
    }
  }

  getFinishZone() {
    const f = this.items.find((i) => i.type === 'finish_door');
    return f?.zone || null;
  }

  openDoor() {
    const f = this.items.find((i) => i.type === 'finish_door');
    if (f?.spr) f.spr.setTexture('finish_door_open');
  }
}
