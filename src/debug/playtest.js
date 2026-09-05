/**
 * Automated playtest harness — run in browser via window.__DUNDEE__
 * Returns a report of bugs found across levels.
 */
export async function runPlaytest(game, opts = {}) {
  const levels = opts.levels || [1, 2, 3, 9, 5, 8];
  const report = { ok: [], bugs: [], notes: [] };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function startLevel(n) {
    game.scene.start('play', { level: n });
    await wait(80);
    const scene = game.scene.getScene('play');
    if (!scene?.player) throw new Error(`no play scene for level ${n}`);
    scene.hurtLock = true; // isolate physics from life drain during checks
    scene.physics.resume();
    scene.finished = false;
    return scene;
  }

  function snap(scene) {
    const p = scene.player.sprite;
    const plats = scene.platforms?.getChildren?.() || [];
    return {
      x: +p.x.toFixed(1),
      y: +p.y.toFixed(1),
      bottom: +p.body.bottom.toFixed(1),
      vy: +p.body.velocity.y.toFixed(1),
      onFloor: !!(p.body.blocked.down || p.body.touching.down),
      lives: scene.lives,
      platTops: plats.slice(0, 3).map((pl) => +pl.body.top.toFixed(1)),
    };
  }

  for (const n of levels) {
    try {
      const scene = await startLevel(n);
      await wait(200);
      const s0 = snap(scene);

      if (!s0.onFloor) {
        report.bugs.push({
          level: n,
          id: 'spawn_not_grounded',
          detail: s0,
        });
      } else {
        report.ok.push(`L${n} spawn grounded`);
      }

      // walk right via VirtualPad state (PlayScene overwrites player.input from pad each frame)
      scene.pad.state.right = true;
      await wait(500);
      scene.pad.state.right = false;
      const sWalk = snap(scene);
      if (sWalk.x <= s0.x + 20) {
        report.bugs.push({ level: n, id: 'cannot_move_right', from: s0.x, to: sWalk.x });
      } else {
        report.ok.push(`L${n} move right Δ=${(sWalk.x - s0.x).toFixed(0)}`);
      }

      // jump
      const beforeJump = snap(scene);
      scene.pad.state.up = true;
      await wait(80);
      scene.pad.state.up = false;
      await wait(200);
      const midJump = snap(scene);
      await wait(600);
      const afterJump = snap(scene);
      if (!(midJump.y < beforeJump.y - 15 || midJump.vy < -80)) {
        report.bugs.push({ level: n, id: 'jump_failed', beforeJump, midJump });
      } else {
        report.ok.push(`L${n} jump`);
      }
      if (afterJump.y > 900 && !afterJump.onFloor) {
        report.bugs.push({ level: n, id: 'fell_after_jump', afterJump });
      }

      // lie
      scene.player._placeFeetAt(s0.x, scene.platforms.getChildren()[0].body.top);
      await wait(100);
      scene.pad.state.down = true;
      await wait(150);
      if (!scene.player.lying) {
        report.bugs.push({ level: n, id: 'lie_failed', onFloor: snap(scene).onFloor });
      } else {
        report.ok.push(`L${n} lie`);
      }
      scene.pad.state.down = false;
      await wait(50);

      // movers / hazards present?
      const movers = scene.mechanics.movers.getChildren().length;
      const hazards = scene.mechanics.hazards.getChildren().filter((h) => h.active).length;
      report.notes.push({ level: n, movers, hazards, spawn: s0 });

      // try reach finish by teleport near door (sanity of win trigger)
      const finish = scene.mechanics.getFinishZone();
      if (finish) {
        scene.hurtLock = true;
        scene.player.sprite.body.reset(finish.x, finish.y);
        scene.player.sprite.setPosition(finish.x, finish.y);
        await wait(300);
        if (!scene.finished) {
          report.bugs.push({ level: n, id: 'finish_zone_no_trigger', fx: finish.x, fy: finish.y });
        } else {
          report.ok.push(`L${n} finish trigger`);
        }
      } else {
        report.bugs.push({ level: n, id: 'no_finish_zone' });
      }
    } catch (e) {
      report.bugs.push({ level: n, id: 'crash', error: String(e.message || e) });
    }
  }

  // Level 1 full auto-run attempt (path along platforms)
  try {
    const scene = await startLevel(1);
    scene.hurtLock = false;
    scene.lives = 5;
    const path = [
      { x: 360, y: 595 },
      { x: 700, y: 595 },
      { x: 780, y: 543 },
      { x: 1100, y: 543 },
      { x: 1260, y: 493 },
      { x: 1408, y: 493 },
    ];
    for (const pt of path) {
      scene.player._placeFeetAt(pt.x, pt.y);
      scene.player.sprite.body.setVelocity(0, 0);
      await wait(100);
    }
    await wait(400);
    if (!scene.finished) {
      // nudge into door
      const f = scene.mechanics.getFinishZone();
      if (f) {
        scene.player.sprite.body.reset(f.x, f.y - 10);
        await wait(200);
      }
    }
    report.notes.push({ level: 1, autoPathFinished: !!scene.finished, lives: scene.lives });
  } catch (e) {
    report.bugs.push({ level: 1, id: 'auto_path_crash', error: String(e.message || e) });
  }

  return report;
}
