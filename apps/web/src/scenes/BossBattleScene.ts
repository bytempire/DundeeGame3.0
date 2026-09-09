import Phaser from "phaser";
import {
  type BattleConfig,
  type BossId,
  type Lane,
  isBossId,
} from "../boss/bossDefs";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { addPenButton, addPenTextButton } from "../ui/penControls";
import { DPR, fontPx, px } from "../ui/dpr";

type BattleData = { bossId?: string };

type Puck = {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  fromHero: boolean;
  lane: Lane | "mid";
  r: number;
  prevX: number;
  prevY: number;
};

const HERO_KEY = "bb-hero";
const FX_KEY = "bb-fx";
const BOSS_KEY = "bb-boss";

/** Frame indices for 384×384 hero sheet (row-major). */
const HF = {
  attack: [0, 1, 2, 3],
  hurt: [4, 5, 6, 7],
  death: [8, 9, 10, 11],
  idle: [12, 13, 14, 15],
  jump: [20, 21, 22, 23],
  crouch: [24, 25, 26],
} as const;

/** Frame indices for 512×512 boss sheet. */
const BF = {
  idle: [0, 1, 2, 3],
  attack: [4, 5, 6, 7],
  hurt: [8, 9, 10, 11],
  death: [12, 13, 14, 15],
} as const;

const FX = {
  puck_hero: 0,
  puck_enemy: 1,
  puck_heavy: 2,
  puck_energy: 3,
  impact: [4, 5, 6, 7],
  damage: [8, 9, 10, 11],
} as const;

export class BossBattleScene extends Phaser.Scene {
  private bossId: BossId = "bear";
  private cfg!: BattleConfig;

  private hero!: Phaser.GameObjects.Sprite;
  private boss!: Phaser.GameObjects.Sprite;
  private path!: Phaser.GameObjects.TileSprite;
  private groundY = 0;
  private heroX = 0;
  private bossX = 0;
  private spriteScale = 0.42;
  private lowY = 0;
  private highY = 0;

  private heroHp = 3;
  private bossHp = 5;
  private heroInvuln = 0;
  private heroAtkCd = 0;
  private ducking = false;
  private jumping = false;
  private heroDead = false;
  private bossDead = false;
  private ended = false;
  private heroBusy = false; // attack / hurt lock
  private bossBusy = false;
  private heroVy = 0;
  private heroAirY = 0;

  private patternIdx = 0;
  private nextBossAt = 0;
  private pendingLane: Lane = "low";
  private laneMarker!: Phaser.GameObjects.Graphics;
  private robotShots = 0;
  private robotOverheatUntil = 0;
  private robotArmored = true;

  private pucks: Puck[] = [];
  private heroHpText!: Phaser.GameObjects.Text;
  private bossHpText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super("boss-battle");
  }

  init(data: BattleData) {
    const id = data.bossId && isBossId(data.bossId) ? data.bossId : "bear";
    this.bossId = id;
    this.pucks = [];
    this.heroDead = false;
    this.bossDead = false;
    this.ended = false;
    this.heroBusy = false;
    this.bossBusy = false;
    this.ducking = false;
    this.jumping = false;
    this.heroVy = 0;
    this.heroAirY = 0;
    this.patternIdx = 0;
    this.robotShots = 0;
    this.robotOverheatUntil = 0;
    this.robotArmored = true;
  }

  preload() {
    const base = `${import.meta.env.BASE_URL}assets/boss-battles`;
    if (!this.textures.exists(HERO_KEY)) {
      this.load.spritesheet(HERO_KEY, `${base}/shared/hero/spritesheet.png`, {
        frameWidth: 384,
        frameHeight: 384,
      });
    }
    if (!this.textures.exists(FX_KEY)) {
      this.load.spritesheet(FX_KEY, `${base}/shared/fx/spritesheet.png`, {
        frameWidth: 128,
        frameHeight: 128,
      });
    }
    // Always (re)load boss sheet for current id
    if (this.textures.exists(BOSS_KEY)) {
      this.textures.remove(BOSS_KEY);
    }
    this.load.spritesheet(BOSS_KEY, `${base}/${this.bossId}/spritesheet.png`, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.json(`bb-cfg-${this.bossId}`, `${base}/${this.bossId}/battle.json`);
  }

  create() {
    addNotebookBackground(this);
    this.cfg = this.cache.json.get(`bb-cfg-${this.bossId}`) as BattleConfig;
    this.ensureAnims();

    const { width, height } = this.scale;
    // World size is CSS×DPR — scale sprites from screen fraction, no tiny 0.32 cap
    const maxByH = (height * 0.42) / 384;
    const maxByW = (width * 0.36) / 512;
    this.spriteScale = Math.min(maxByH, maxByW);

    this.heroHp = this.cfg.hero.hp;
    this.bossHp = this.cfg.boss.hp;
    this.nextBossAt = this.time.now + 1200;

    // Fight floor — same notebook platform strip as the runner
    const pathH = 24 * DPR;
    this.groundY = height * 0.78;
    const pad = px(12);
    const heroHalf = 192 * this.spriteScale;
    const bossHalf = 256 * this.spriteScale;
    this.heroX = pad + heroHalf;
    this.bossX = width - pad - bossHalf;
    const bodyH = 200 * this.spriteScale;
    this.lowY = this.groundY - bodyH * 0.22;
    this.highY = this.groundY - bodyH * 0.7;

    this.path = this.add
      .tileSprite(width / 2, this.groundY + pathH / 2, width + 4, pathH, "platform")
      .setScrollFactor(0)
      .setDepth(2);
    this.path.setTileScale(DPR, DPR);

    this.hero = this.add
      .sprite(this.heroX, this.groundY, HERO_KEY, HF.idle[0])
      .setOrigin(0.5, 0.9375)
      .setScale(this.spriteScale)
      .setDepth(10);
    this.hero.play("bb-hero-idle");

    this.boss = this.add
      .sprite(this.bossX, this.groundY, BOSS_KEY, BF.idle[0])
      .setOrigin(0.5, 0.9375)
      .setScale(this.spriteScale)
      .setFlipX(true)
      .setDepth(10);
    this.boss.play("bb-boss-idle");

    this.laneMarker = this.add.graphics().setDepth(5).setAlpha(0);

    this.add
      .text(width / 2, px(18), this.cfg.name, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(20),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5, 0)
      .setDepth(40);

    this.heroHpText = this.add
      .text(px(16), px(48), "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(16),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setDepth(40);
    this.bossHpText = this.add
      .text(width - px(16), px(48), "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(16),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(1, 0)
      .setDepth(40);
    this.statusText = this.add
      .text(width / 2, px(72), "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(14),
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
      })
      .setOrigin(0.5, 0)
      .setDepth(40);
    this.refreshHud();

    this.createControls(pathH);

    addPenTextButton(
      this,
      width - px(52),
      px(28),
      "✕",
      () => this.scene.start("boss-select"),
      { width: 44, height: 36, fontSize: 18, depth: 50 },
    );

    const kb = this.input.keyboard;
    if (kb) {
      this.keys = {
        up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
      this.keys.up.on("down", () => this.tryJump());
      this.keys.space.on("down", () => this.tryAttack());
      this.keys.down.on("down", () => this.setDuck(true));
      this.keys.down.on("up", () => this.setDuck(false));
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearPucks());
  }

  private createControls(pathH: number) {
    const { width, height } = this.scale;
    // ↑ ↓ left · puck right — vertically centered under the path
    const place = (w: number, h: number, gy: number) => {
      const stripTop = gy + pathH;
      const y = (stripTop + h) / 2;
      const pairGap = Math.min(w * 0.26, px(110));
      return {
        upX: w * 0.22,
        downX: w * 0.22 + pairGap,
        hitX: w * 0.78,
        y,
      };
    };
    const p0 = place(width, height, this.groundY);

    const up = addPenButton(this, p0.upX, p0.y, "up", 50);
    const down = addPenButton(this, p0.downX, p0.y, "down", 50);
    const hit = addPenButton(this, p0.hitX, p0.y, "hit", 50);

    up.hit.on("pointerdown", () => this.tryJump());
    down.hit.on("pointerdown", () => this.setDuck(true));
    down.hit.on("pointerup", () => this.setDuck(false));
    down.hit.on("pointerupoutside", () => this.setDuck(false));
    hit.hit.on("pointerdown", () => this.tryAttack());

    const layout = (gameSize: Phaser.Structs.Size) => {
      this.groundY = gameSize.height * 0.78;
      const pad = px(12);
      this.heroX = pad + 192 * this.spriteScale;
      this.bossX = gameSize.width - pad - 256 * this.spriteScale;
      const bodyH = 200 * this.spriteScale;
      this.lowY = this.groundY - bodyH * 0.22;
      this.highY = this.groundY - bodyH * 0.7;
      this.path.setPosition(
        gameSize.width / 2,
        this.groundY + pathH / 2,
      );
      this.path.width = gameSize.width + 4;
      this.hero?.setPosition(this.heroX, this.groundY);
      this.boss?.setPosition(this.bossX, this.groundY);
      const p = place(gameSize.width, gameSize.height, this.groundY);
      up.root.setPosition(p.upX, p.y);
      down.root.setPosition(p.downX, p.y);
      hit.root.setPosition(p.hitX, p.y);
    };
    this.scale.on("resize", layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", layout);
    });
  }

  update(_t: number, delta: number) {
    if (this.ended) return;
    const dt = delta / 1000;
    this.heroInvuln = Math.max(0, this.heroInvuln - delta);
    this.heroAtkCd = Math.max(0, this.heroAtkCd - delta);

    this.updateHeroMotion(dt);
    this.updateBossAi();
    this.updatePucks(dt);
    this.refreshHud();
  }

  private ensureAnims() {
    const mk = (
      key: string,
      tex: string,
      frames: readonly number[],
      ms: number,
      repeat: number,
    ) => {
      if (this.anims.exists(key)) this.anims.remove(key);
      this.anims.create({
        key,
        frames: frames.map((f) => ({ key: tex, frame: f })),
        frameRate: 1000 / ms,
        repeat,
      });
    };
    mk("bb-hero-idle", HERO_KEY, HF.idle, 180, -1);
    mk("bb-hero-attack", HERO_KEY, HF.attack, 120, 0);
    mk("bb-hero-hurt", HERO_KEY, HF.hurt, 120, 0);
    mk("bb-hero-death", HERO_KEY, HF.death, 180, 0);
    mk("bb-hero-crouch", HERO_KEY, HF.crouch, 90, 0);
    mk("bb-boss-idle", BOSS_KEY, BF.idle, 200, -1);
    mk("bb-boss-attack", BOSS_KEY, BF.attack, 120, 0);
    mk("bb-boss-hurt", BOSS_KEY, BF.hurt, 120, 0);
    mk("bb-boss-death", BOSS_KEY, BF.death, 180, 0);
  }

  private refreshHud() {
    this.heroHpText.setText(`♥ ${this.heroHp}`);
    const armor =
      this.bossId === "robot" && this.robotArmored && !this.bossDead
        ? " 🛡"
        : "";
    this.bossHpText.setText(`${this.bossHp} ♥${armor}`);
    if (this.bossId === "robot" && this.time.now < this.robotOverheatUntil) {
      this.statusText.setText("Перегрев!");
    } else if (!this.ended) {
      this.statusText.setText("");
    }
  }

  private setDuck(on: boolean) {
    if (this.heroDead || this.ended) return;
    if (on && this.jumping) return;
    if (this.ducking === on) return;
    this.ducking = on;
    if (this.heroBusy) return;
    if (on) {
      this.hero.play("bb-hero-crouch");
    } else if (!this.jumping) {
      this.hero.play("bb-hero-idle", true);
    }
  }

  private tryJump() {
    if (this.heroDead || this.ended || this.jumping || this.ducking) return;
    if (this.heroBusy) return;
    this.jumping = true;
    const h = this.cfg.arena.heroJumpHeight * this.spriteScale * 1.2;
    // v^2 = 2gh with g≈1600*scale-feel → use kinematic over ~850ms
    this.heroVy = -Math.sqrt(2 * 1600 * h);
    this.heroAirY = 0;
    this.hero.setFrame(HF.jump[0]);
  }

  private updateHeroMotion(dt: number) {
    if (this.heroDead) return;
    if (!this.jumping) {
      this.hero.y = this.groundY;
      return;
    }
    this.heroVy += 1600 * dt;
    this.heroAirY += this.heroVy * dt;
    if (this.heroAirY >= 0) {
      this.heroAirY = 0;
      this.heroVy = 0;
      this.jumping = false;
      this.hero.y = this.groundY;
      if (!this.heroBusy && !this.ducking) this.hero.play("bb-hero-idle", true);
      return;
    }
    this.hero.y = this.groundY + this.heroAirY;
    if (!this.heroBusy) {
      if (this.heroVy < -120) this.hero.setFrame(HF.jump[1]);
      else if (this.heroVy < 80) this.hero.setFrame(HF.jump[2]);
      else this.hero.setFrame(HF.jump[3]);
    }
  }

  private tryAttack() {
    if (this.heroDead || this.ended || this.heroBusy) return;
    if (this.jumping || this.ducking) return;
    if (this.heroAtkCd > 0) return;
    this.heroBusy = true;
    this.heroAtkCd = this.cfg.hero.attackCooldownMs;
    this.hero.play("bb-hero-attack");
    let emitted = false;
    const onUpdate = (
      _anim: Phaser.Animations.Animation,
      frame: Phaser.Animations.AnimationFrame,
    ) => {
      if (emitted) return;
      if (Number(frame.textureFrame) === HF.attack[2]) {
        emitted = true;
        this.emitHeroPuck();
      }
    };
    this.hero.on("animationupdate", onUpdate);
    this.hero.once("animationcomplete", () => {
      this.hero.off("animationupdate", onUpdate);
      this.heroBusy = false;
      if (!this.heroDead && !this.ducking && !this.jumping) {
        this.hero.play("bb-hero-idle", true);
      }
    });
  }

  private emitHeroPuck() {
    const y = this.groundY - 70 * this.spriteScale;
    const img = this.add
      .image(this.heroX + 40 * this.spriteScale, y, FX_KEY, FX.puck_hero)
      .setOrigin(0.5)
      .setScale(this.spriteScale * 0.95)
      .setDepth(12);
    const dist = Math.abs(this.bossX - this.heroX);
    this.pucks.push({
      sprite: img,
      vx: Math.max(380, dist * 0.9),
      vy: 0,
      fromHero: true,
      lane: "mid",
      r: 22 * this.spriteScale,
      prevX: img.x,
      prevY: img.y,
    });
  }

  private updateBossAi() {
    if (this.bossDead || this.ended || this.bossBusy) return;
    const now = this.time.now;
    if (this.bossId === "robot" && now < this.robotOverheatUntil) {
      this.robotArmored = false;
      return;
    }
    if (this.bossId === "robot" && now >= this.robotOverheatUntil) {
      this.robotArmored = true;
    }
    if (now < this.nextBossAt) return;

    const pattern = this.cfg.boss.lanePattern;
    this.pendingLane = pattern[this.patternIdx % pattern.length]!;
    this.patternIdx += 1;
    this.showLaneHint(this.pendingLane);
    this.bossBusy = true;
    this.boss.play("bb-boss-attack");

    let emitted = false;
    const onUpdate = (
      _a: Phaser.Animations.Animation,
      frame: Phaser.Animations.AnimationFrame,
    ) => {
      if (emitted) return;
      if (Number(frame.textureFrame) === BF.attack[2]) {
        emitted = true;
        this.emitBossPuck(this.pendingLane);
        this.laneMarker.clear();
      }
    };
    this.boss.on("animationupdate", onUpdate);
    this.boss.once("animationcomplete", () => {
      this.boss.off("animationupdate", onUpdate);
      this.bossBusy = false;
      if (!this.bossDead) this.boss.play("bb-boss-idle", true);

      if (this.bossId === "robot") {
        this.robotShots += 1;
        const burst = this.cfg.robot?.shotsPerBurst ?? 3;
        const gap = this.cfg.robot?.shotIntervalMs ?? 1200;
        if (this.robotShots >= burst) {
          this.robotShots = 0;
          this.robotOverheatUntil =
            this.time.now + (this.cfg.robot?.overheatMs ?? 1600);
          this.robotArmored = false;
          this.nextBossAt =
            this.robotOverheatUntil + this.cfg.boss.attackCooldownMs * 0.35;
        } else {
          this.nextBossAt = this.time.now + gap;
        }
      } else {
        this.nextBossAt = this.time.now + this.cfg.boss.attackCooldownMs;
      }
    });

    // Windup already baked into attack frames; schedule next after cooldown from complete
    this.nextBossAt = Number.POSITIVE_INFINITY;
  }

  private showLaneHint(lane: Lane) {
    const y = lane === "low" ? this.lowY : this.highY;
    this.laneMarker.clear();
    this.laneMarker.lineStyle(3, 0xc0392b, 0.55);
    this.laneMarker.strokeCircle(this.heroX + 40, y, 14);
    this.laneMarker.lineStyle(2, 0xc0392b, 0.35);
    this.laneMarker.lineBetween(this.bossX - 40, y, this.heroX + 60, y);
  }

  private emitBossPuck(lane: Lane) {
    const y = lane === "low" ? this.lowY : this.highY;
    const frame =
      FX[this.cfg.boss.projectile as keyof typeof FX] ?? FX.puck_enemy;
    const frameIdx = typeof frame === "number" ? frame : FX.puck_enemy;
    const img = this.add
      .image(this.bossX - 40 * this.spriteScale, y, FX_KEY, frameIdx)
      .setOrigin(0.5)
      .setScale(
        this.spriteScale *
          (this.cfg.boss.projectile === "puck_heavy" ? 1.15 : 0.95),
      )
      .setDepth(12);
    const dist = Math.abs(this.bossX - this.heroX);
    const base = this.cfg.boss.projectileSpeedPxPerSec;
    const speed = Math.max(base * 0.85, dist * (base / 420));
    this.pucks.push({
      sprite: img,
      vx: -speed,
      vy: 0,
      fromHero: false,
      lane,
      r: 24 * this.spriteScale,
      prevX: img.x,
      prevY: img.y,
    });
  }

  private updatePucks(dt: number) {
    const keep: Puck[] = [];
    for (const p of this.pucks) {
      p.prevX = p.sprite.x;
      p.prevY = p.sprite.y;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;

      const off =
        p.sprite.x < -80 ||
        p.sprite.x > this.scale.width + 80 ||
        p.sprite.y < -80 ||
        p.sprite.y > this.scale.height + 80;
      if (off) {
        p.sprite.destroy();
        continue;
      }

      if (p.fromHero) {
        if (!this.bossDead && this.hitBoss(p)) {
          this.onBossHit(p.sprite.x, p.sprite.y);
          p.sprite.destroy();
          continue;
        }
      } else if (!this.heroDead && this.hitHero(p)) {
        this.onHeroHit(p.sprite.x, p.sprite.y);
        p.sprite.destroy();
        continue;
      }
      keep.push(p);
    }
    this.pucks = keep;
  }

  private heroBody(): { x: number; y: number; w: number; h: number } {
    const s = this.spriteScale;
    const w = 70 * s;
    // Standing covers chest/head (high lane); duck drops under high lane
    const h = this.ducking ? 72 * s : 185 * s;
    const x = this.hero.x - w * 0.4;
    const y = this.hero.y - h;
    return { x, y, w, h };
  }

  private bossBody(): { x: number; y: number; w: number; h: number } {
    const s = this.spriteScale;
    const w = 90 * s;
    const h = 140 * s;
    return { x: this.boss.x - w * 0.55, y: this.boss.y - h, w, h };
  }

  private segmentHitsRect(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    rect: { x: number; y: number; w: number; h: number },
  ) {
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (
        x + r > rect.x &&
        x - r < rect.x + rect.w &&
        y + r > rect.y &&
        y - r < rect.y + rect.h
      ) {
        return true;
      }
    }
    return false;
  }

  private hitHero(p: Puck) {
    if (this.heroInvuln > 0) return false;
    // High puck clears ducked head; low puck clears jumped feet
    if (p.lane === "high" && this.ducking) return false;
    if (
      p.lane === "low" &&
      this.jumping &&
      this.heroAirY < -55 * this.spriteScale
    ) {
      return false;
    }
    const body = this.heroBody();
    // Slightly larger puck radius for fair mid-lane contact
    const r = p.r * 1.25;
    return this.segmentHitsRect(
      p.prevX,
      p.prevY,
      p.sprite.x,
      p.sprite.y,
      r,
      body,
    );
  }

  private hitBoss(p: Puck) {
    return this.segmentHitsRect(
      p.prevX,
      p.prevY,
      p.sprite.x,
      p.sprite.y,
      p.r,
      this.bossBody(),
    );
  }

  private playFx(x: number, y: number, frames: readonly number[]) {
    const s = this.add
      .sprite(x, y, FX_KEY, frames[0])
      .setScale(this.spriteScale)
      .setDepth(20);
    let i = 0;
    this.time.addEvent({
      delay: 70,
      repeat: frames.length - 1,
      callback: () => {
        i += 1;
        if (i >= frames.length) s.destroy();
        else s.setFrame(frames[i]!);
      },
    });
  }

  private onHeroHit(x: number, y: number) {
    this.playFx(x, y, FX.impact);
    this.heroHp -= this.cfg.boss.damage;
    this.heroInvuln = this.cfg.hero.invulnerabilityMs;
    if (this.heroHp <= 0) {
      this.heroHp = 0;
      this.killHero();
      return;
    }
    this.heroBusy = true;
    this.hero.play("bb-hero-hurt");
    this.tweens.add({
      targets: this.hero,
      alpha: 0.35,
      yoyo: true,
      repeat: 5,
      duration: 80,
      onComplete: () => this.hero.setAlpha(1),
    });
    this.hero.once("animationcomplete", () => {
      this.heroBusy = false;
      if (!this.heroDead && !this.ducking && !this.jumping) {
        this.hero.play("bb-hero-idle", true);
      }
    });
  }

  private onBossHit(x: number, y: number) {
    this.playFx(x, y, FX.impact);
    const inOverheat = this.time.now < this.robotOverheatUntil;
    const armored =
      this.bossId === "robot" &&
      !!this.cfg.robot?.onlyTakesDamageWhileOverheated &&
      !inOverheat;

    if (armored) {
      // Sparks + flinch, no HP while shield is up
      this.playFx(x, y, FX.damage);
      this.playBossHurt();
      return;
    }

    this.bossHp -= this.cfg.hero.damage;
    if (this.bossHp <= 0) {
      this.bossHp = 0;
      this.killBoss();
      return;
    }
    this.playFx(x, y + 10, FX.damage);
    this.playBossHurt();
  }

  /** Interrupt current boss anim cleanly and play hurt → idle. */
  private playBossHurt() {
    this.boss.off("animationupdate");
    this.boss.removeAllListeners("animationcomplete");
    this.laneMarker.clear();
    if (
      this.cfg.boss.interruptAttackOnHurt ||
      this.bossId === "robot" ||
      this.nextBossAt === Number.POSITIVE_INFINITY
    ) {
      const delay =
        this.bossId === "robot" ? 500 : this.cfg.boss.attackCooldownMs * 0.6;
      this.nextBossAt = this.time.now + delay;
    }
    this.bossBusy = true;
    this.boss.anims.stop();
    this.boss.play("bb-boss-hurt");
    this.boss.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + "bb-boss-hurt",
      () => {
        this.bossBusy = false;
        if (!this.bossDead) this.boss.play("bb-boss-idle", true);
      },
    );
  }

  private killHero() {
    this.heroDead = true;
    this.heroBusy = true;
    this.clearPucks();
    this.hero.play("bb-hero-death");
    this.hero.once("animationcomplete", () => {
      this.hero.setFrame(HF.death[3]);
      this.showEnd(false);
    });
  }

  private killBoss() {
    this.bossDead = true;
    this.bossBusy = true;
    this.clearPucks();
    this.laneMarker.clear();
    this.boss.play("bb-boss-death");
    this.boss.once("animationcomplete", () => {
      this.boss.setFrame(BF.death[3]);
      this.showEnd(true);
    });
  }

  private clearPucks() {
    for (const p of this.pucks) p.sprite.destroy();
    this.pucks = [];
  }

  private showEnd(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.statusText.setText("");
    const { width, height } = this.scale;
    const cy = height * 0.34;
    const panel = this.add.graphics().setDepth(60);
    panel.fillStyle(0xf4f1e8, 0.94);
    panel.fillRoundedRect(
      width / 2 - px(150),
      cy - px(80),
      px(300),
      px(220),
      px(16),
    );
    this.add
      .text(width / 2, cy - px(40), won ? "Победа!" : "Поражение", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(28),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setDepth(61);
    addPenTextButton(
      this,
      width / 2,
      cy + px(30),
      "Ещё раз",
      () => this.scene.restart({ bossId: this.bossId }),
      { depth: 61 },
    );
    addPenTextButton(
      this,
      width / 2,
      cy + px(90),
      "К боссам",
      () => this.scene.start("boss-select"),
      { depth: 61 },
    );
  }
}
