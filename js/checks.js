/* TT Tug of War: the headless rules check (node tools/check.js, or game.check() in the page).
   Two parts, as the brief asks: the rope physics, and fair tapping detection. Each check plays whole rounds with
   scripted captains (drummers who tap with the beat, mashers who tap as fast as they can, a held key...).
   run({ fail }) breaks the rules on purpose to prove the check can fail:
     'fps'       one step per frame instead of fixed steps    -> rope.fps fails
     'lopsided'  the right team pulls 5 % harder              -> rope.balance and rope.mirror fail
     'mash'      on EASY every tap is a heave                 -> tap.one-per-beat fails
     'stretchy'  the drawn rope gets one constraint pass      -> rope.verlet fails */
(function () {
  'use strict';
  const TW = window.TW, S = TW.sim;

  // ---------------------------------------------------------------- scripted captains: lists of [key, t]
  function drummer(o = {}) {
    const r = S.rng(o.seed || 7), out = [];
    for (let k = 0; S.beatT(k) < S.LIMIT + 1; k++) {
      if (o.miss && r() < o.miss) continue;
      const off = (o.offset || 0) + (o.sd ? Math.max(-0.3, Math.min(0.3, S.gauss(r) * o.sd)) : 0);
      out.push(['tap', S.beatT(k) + off]);
      if (o.dup) out.push(['tap', S.beatT(k) + off + o.dup]); // the same tap arriving twice (a touch and a click)
    }
    return out;
  }
  function masher(o = {}) {
    const r = S.rng(o.seed || 11), out = [];
    let t = o.from == null ? r() * 0.5 : o.from;
    const jit = o.jitter == null ? 0.25 : o.jitter;
    while (t < S.LIMIT + 1) { out.push(['tap', t]); t += (1 / o.rate) * (1 + jit * (r() - 0.5)); }
    return out;
  }
  function held(o = {}) {
    const at = o.at == null ? S.beatT(0) : o.at, out = [['tap', at]];
    for (let t = at + 0.5; t < 12; t += 1 / 30) out.push(['tapR', t]);
    return out;
  }

  // play one round. lanes: [{ level, cpu, seed }, ...]; scripts: [list | null, list | null];
  // o: { fps, jitter, rope, fail, extra: [[lane, key, t]], reverse, after }
  function play(lanes, scripts, o = {}) {
    const W = S.make({ lanes, rope: o.rope, fail: o.fail });
    W.trace = [];
    const feed = [];
    scripts.forEach((sc, i) => sc && sc.forEach(([key, t]) => feed.push([i, key, t])));
    if (o.extra) feed.push(...o.extra);
    if (o.reverse) feed.reverse();
    for (const [i, key, t] of feed) S.input(W, i, key, t);
    const r = S.rng(o.jseed || 3);
    let vmax = 0, bad = false, n = 0;
    while (!(W.over && W.tOver >= (o.after || 0)) && n < 2e6) {
      let dt = o.fps ? 1 / o.fps : S.DT;
      if (o.jitter) dt *= 0.35 + 1.3 * r();
      S.advance(W, dt);
      n++;
      if (!W.over) vmax = Math.max(vmax, Math.abs(W.v));
      if (!Number.isFinite(W.x) || !Number.isFinite(W.v)) { bad = true; break; }
    }
    const log = W.log.filter((e) => e.kind !== 'win').map((e) => `${e.lane}${e.kind[0]}${e.grade || ''}@${e.t.toFixed(4)}`);
    return { W, res: W.res, trace: W.trace, vmax, bad, log };
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const E = (lv, more = {}) => [Object.assign({ level: lv }, more), Object.assign({ level: lv }, more)];
  const pct = (v) => `${Math.round(v * 100)} %`;

  function run(opts = {}) {
    const fail = opts.fail || null;
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
    const P = (lanes, scripts, o = {}) => play(lanes, scripts, Object.assign({ fail }, o));

    // ------------------------------------------------------------ rope physics
    {
      const g = P(E('easy'), [[], []]);
      add('rope.still', g.res.winner === -1 && g.W.x === 0 && g.W.v === 0, `nobody pulls for ${S.LIMIT} s: ribbon at ${g.W.x}, a draw`);
    }
    {
      let worst = 0, n = 0;
      for (const lv of ['easy', 'normal']) {
        for (const sc of [drummer(), drummer({ sd: 0.1, miss: 0.2, seed: 4 }), masher({ rate: 7 }), masher({ rate: 3, seed: 9 })]) {
          const g = P(E(lv), [sc, sc]);
          n++;
          worst = Math.max(worst, ...g.trace.map(Math.abs), Math.abs(g.W.x));
        }
      }
      add('rope.balance', worst === 0, `the same taps on both sides (${n} rounds): the ribbon never moves (max ${worst.toExponential(2)} m)`);
    }
    {
      let ok = true, n = 0;
      for (const lv of ['easy', 'normal']) {
        const A = drummer({ sd: 0.08, seed: 1 }), B = masher({ rate: 5, seed: 2 });
        const g1 = P(E(lv), [A, B]), g2 = P(E(lv), [B, A]);
        n += g1.trace.length;
        const mirrored = g1.trace.length === g2.trace.length && g1.trace.every((x, i) => g2.trace[i] === -x);
        const swapped = g1.res.winner === 1 - g2.res.winner && g1.res.t === g2.res.t;
        ok = ok && mirrored && swapped;
      }
      add('rope.mirror', ok, `swap the two captains' taps: the ribbon's path is exactly mirrored and the other side wins at the same time (${n} points)`);
    }
    {
      let wins = 0, toward = true;
      for (let s = 1; s <= 10; s++) {
        const g = P(E('easy'), [drummer(), drummer({ sd: 0.15, miss: 0.3, seed: s })]);
        if (g.res.winner === 0) wins++;
        toward = toward && g.trace.length > 4 && g.trace[g.trace.length - 1] < 0;
      }
      add('rope.stronger', wins === 10 && toward, `a perfect drummer beats a sloppy one in ${wins} of 10, pulling the ribbon his way`);
    }
    {
      const W = S.make({ lanes: E('easy') });
      S.input(W, 1, 'tap', S.beatT(0));
      for (let i = 0; i < (S.COUNT + 5) * 120; i++) S.step(W, S.DT);
      // the exact answer: dv/dt = ACC*F - DAMP*v moves the ribbon ACC/DAMP times the heave's impulse
      const amp = (1 + 0.05) * S.POWER.reduce((a, b) => a + b, 0);
      const want = (S.ACC / S.DAMP) * amp * (2 * S.PULSE / Math.PI);
      const err = Math.abs(W.x - want) / want;
      add('rope.settle', Math.abs(W.v) < 1e-4 && err < 0.02, `one perfect heave alone moves the ribbon ${W.x.toFixed(3)} m (exact ${want.toFixed(3)}), then it stops (v ${W.v.toExponential(1)})`);
    }
    {
      let ok = true, over = 0;
      for (const lv of ['easy', 'normal']) {
        const g = P(E(lv), [drummer(), []]);
        const before = g.trace.slice(0, -1).every((x) => Math.abs(x) < S.LINE);
        over = Math.max(over, Math.abs(g.res.x) - S.LINE);
        ok = ok && g.res.winner === 0 && before && over >= 0 && over < S.VMAX * S.DT + 1e-9 && g.vmax <= S.VMAX && !g.bad;
      }
      add('rope.limits', ok, `the round ends the step the ribbon crosses the line (${(over * 1000).toFixed(1)} mm over), speed never above ${S.VMAX} m/s, no NaN`);
    }
    {
      const cases = [
        ['easy', [drummer({ sd: 0.1, seed: 5 }), masher({ rate: 5, seed: 6 })], null],
        ['normal', [drummer({ sd: 0.09, seed: 8, miss: 0.1 }), masher({ rate: 4, seed: 3 })], null],
        ['easy', [masher({ rate: 4, seed: 12 }), null], [[0, 'B+', 3.1]]],
      ];
      let ok = true, n = 0;
      cases.forEach(([lv, scripts, extra], ci) => {
        const lanes = E(lv);
        if (!scripts[1]) lanes[1] = { level: lv, cpu: true, seed: 77 };
        const base = P(lanes, scripts, { extra });
        const want = JSON.stringify([base.res, base.trace, base.log]);
        for (const fps of [24, 30, 50, 60, 90, 120, 144, 240]) {
          const g = P(lanes, scripts, { extra, fps });
          n++;
          if (JSON.stringify([g.res, g.trace, g.log]) !== want) ok = false;
        }
        for (const jseed of [1, 2]) {
          const g = P(lanes, scripts, { extra, fps: 60, jitter: true, jseed: jseed + ci });
          n++;
          if (JSON.stringify([g.res, g.trace, g.log]) !== want) ok = false;
        }
      });
      add('rope.fps', ok, `the same taps at 24-240 fps and with jittery frames (${n} replays): the same grades, ribbon path and winner (===)`);
    }
    {
      // the drawn rope: settle with nobody pulling, then a hard tug, at two frame rates
      const W = S.make({ lanes: E('easy'), rope: true, fail });
      // it starts at rest: nothing whips up above the hands in the first moments
      let top = 0;
      for (let i = 0; i < 4 * 120; i++) { S.step(W, S.DT); if (i < 120) for (let k = 0; k < S.NN; k++) top = Math.max(top, W.rope.y[k]); }
      const calm = top <= Math.max(...W.rope.handY[0], ...W.rope.handY[1]) + 0.05;
      const R = W.rope;
      const stretch = () => {
        let m = 0;
        for (let i = 0; i < S.NN - 1; i++) {
          if (R.pin[i] && R.pin[i + 1]) continue;
          const d = Math.hypot(R.x[i + 1] - R.x[i], R.y[i + 1] - R.y[i]);
          m = Math.max(m, Math.abs(d - S.NODE) / S.NODE);
        }
        return m;
      };
      const st0 = stretch();
      const a = S.nodeOf(-S.GAP), b = S.nodeOf(S.GAP);
      let low = Infinity;
      for (let i = a; i <= b; i++) low = Math.min(low, R.y[i]);
      const sag = R.handY[0][0] - low;
      const ends = R.y[0] <= 0.05 && R.y[S.NN - 1] <= 0.05;
      // a hard tug at 30, 60 and 144 fps: the rope's stretch every step after GO, and its shape 6 s in
      const tug = (fps) => {
        const W2 = S.make({ lanes: E('normal'), rope: true, fail });
        drummer({ sd: 0.05, seed: 2 }).forEach(([k, t]) => S.input(W2, 0, k, t));
        masher({ rate: 6, seed: 5 }).forEach(([k, t]) => S.input(W2, 1, k, t));
        let st = 0, snap = '';
        const at = Math.round((S.COUNT + 6) / S.DT);
        W2.hook = (w) => {
          if (w.t >= 0) {
            const R2 = w.rope;
            for (let i = 0; i < S.NN - 1; i++) {
              if (R2.pin[i] && R2.pin[i + 1]) continue;
              st = Math.max(st, Math.abs(Math.hypot(R2.x[i + 1] - R2.x[i], R2.y[i + 1] - R2.y[i]) - S.NODE) / S.NODE);
            }
          }
          if (w.steps === at) snap = Array.from(w.rope.x).concat(Array.from(w.rope.y)).map((v) => v.toFixed(9)).join(',');
        };
        while (!snap && W2.steps < at + 10) S.advance(W2, 1 / fps);
        return { st, snap };
      };
      const runs = [30, 60, 144].map(tug);
      const st1 = Math.max(...runs.map((r) => r.st));
      const fpsSame = runs.every((r) => r.snap && r.snap === runs[0].snap);
      add('rope.verlet', calm && st0 < 0.03 && st1 < 0.06 && sag > 0.05 && sag < 0.6 && ends && fpsSame,
        `the drawn rope: starts at rest (top ${top.toFixed(2)} m), ${pct(st0)} stretch at rest and at most ${pct(st1)} in a hard tug, sags ${sag.toFixed(2)} m over the mud, loose ends on the ground, the same at 30 / 60 / 144 fps`);
    }

    // ------------------------------------------------------------ fair tapping detection
    {
      const g = P(E('easy'), [held(), []]);
      const s = g.W.lanes[0].stats;
      add('tap.held-key', s.strokes === 1 && s.ignored > 100, `holding the key down: 1 heave, ${s.ignored} auto-repeats ignored`);
    }
    {
      let ok = true;
      for (const lv of ['easy', 'normal']) {
        const A = drummer({ sd: 0.05, seed: 3 }), Ad = drummer({ sd: 0.05, seed: 3, dup: 0.02 });
        const g = P(E(lv), [A, Ad]);
        ok = ok && g.trace.every((x) => x === 0) && g.W.lanes[1].stats.slips === 0 && g.W.lanes[1].stats.strokes === g.W.lanes[0].stats.strokes;
      }
      add('tap.double-event', ok, 'the same tap arriving twice, 20 ms apart, counts once (no extra pull, no slip)');
    }
    {
      let ok = true, most = 0;
      const detail = [];
      for (const rate of [6, 10, 15, 25]) {
        const g = P(E('easy'), [drummer(), masher({ rate, seed: rate, from: 0.02 })]);
        const m = g.W.lanes[1].stats, beats = g.W.lanes[0].stats.strokes;
        most = Math.max(most, m.strokes / Math.max(1, beats));
        if (g.res.winner === 1 || m.strokes > beats + 1 || m.slips) ok = false;
        detail.push(`${rate}/s ${g.res.winner === 0 ? 'loses' : g.res.winner === 1 ? 'WINS' : 'draws'}`);
      }
      const slow = P(E('easy'), [masher({ rate: 4, seed: 21 }), []]).W.lanes[0].stats;
      const power = slow.power / Math.max(1, slow.strokes);
      ok = ok && power >= 0.74;
      add('tap.one-per-beat', ok, `EASY: tapping as fast as you can never beats tapping with the drum (${detail.join(', ')}; at most ${most.toFixed(2)} heaves per beat, never a slip), and 4 taps a second still pulls at ${pct(power)}`);
    }
    {
      let wins = 0, slips = 0;
      for (let s = 1; s <= 10; s++) {
        const g = P(E('normal'), [drummer({ sd: 0.1, miss: 0.1, seed: s }), masher({ rate: 8, seed: 40 + s })]);
        if (g.res.winner === 0) wins++;
        slips += g.W.lanes[1].stats.slips;
      }
      add('tap.normal-rhythm', wins === 10 && slips > 0, `NORMAL: a so-so drummer beats an 8-taps-a-second masher in ${wins} of 10 (the masher slipped ${slips} times)`);
    }
    {
      const A = drummer({ sd: 0.1, seed: 5 }), B = masher({ rate: 5, seed: 6 });
      let ok = true;
      for (const lv of ['easy', 'normal']) {
        const g1 = P(E(lv), [A, B]), g2 = P(E(lv), [A, B], { reverse: true });
        ok = ok && same([g1.res, g1.trace, g1.log], [g2.res, g2.trace, g2.log]);
        const both = P(E(lv), [A, A]);
        ok = ok && both.W.lanes[0].stats.strokes === both.W.lanes[1].stats.strokes && both.W.lanes[0].stats.strokes > 40;
      }
      add('tap.together', ok, 'two players tapping at the very same moment both count, and the order the taps reach the game doesn\'t matter');
    }
    {
      const W = S.make({ lanes: E('easy') });
      S.input(W, 0, 'tap', -0.5);
      S.input(W, 1, 'tap', -0.01);
      for (let i = 0; i < (S.COUNT + 2) * 120; i++) S.step(W, S.DT);
      add('tap.before-go', W.x === 0 && W.lanes[0].stats.strokes === 0 && W.lanes[1].stats.strokes === 0, 'taps before GO don\'t count (no false starts, no head start)');
    }

    // ------------------------------------------------------------ the kids can win, and the CPU plays fair
    {
      const cpu = (lv, seed) => ({ level: lv, cpu: true, seed });
      let tommy = 0, slowT = 0, teddy = 0, mashN = 0, cpuLv = 0, det = true;
      for (let s = 1; s <= 10; s++) {
        if (P([{ level: 'easy' }, cpu('easy', s)], [masher({ rate: 4, jitter: 0.5, seed: s }), null]).res.winner === 0) tommy++;
        if (P([{ level: 'easy' }, cpu('easy', s + 50)], [masher({ rate: 2.5, jitter: 0.5, seed: s + 9 }), null]).res.winner === 0) slowT++;
        if (P([{ level: 'normal' }, cpu('normal', s)], [drummer({ sd: 0.08, miss: 0.05, seed: s }), null]).res.winner === 0) teddy++;
        if (P([{ level: 'normal' }, cpu('normal', s + 20)], [masher({ rate: 8, seed: s }), null]).res.winner === 1) mashN++;
        if (P([cpu('easy', s), cpu('normal', s + 30)], [null, null]).res.winner === 1) cpuLv++;
      }
      const a = P([{ level: 'easy' }, cpu('easy', 5)], [masher({ rate: 4, seed: 5 }), null]), b = P([{ level: 'easy' }, cpu('easy', 5)], [masher({ rate: 4, seed: 5 }), null]);
      det = same([a.res, a.trace], [b.res, b.trace]);
      add('kids.win', tommy >= 9 && slowT >= 6 && teddy >= 8 && mashN >= 8 && cpuLv >= 8 && det,
        `EASY: tapping 4 a second beats Foxy in ${tommy} of 10 (2.5 a second: ${slowT}); NORMAL: tapping with the drum beats Foxy in ${teddy} of 10, mashing loses in ${mashN} of 10; NORMAL Foxy beats EASY Foxy in ${cpuLv} of 10; the same seed plays the same`);
    }
    {
      let without = 0, withB = 0, tw = 0, tb = 0;
      for (let s = 1; s <= 10; s++) {
        const lanes = [{ level: 'easy' }, { level: 'easy', cpu: true, seed: 300 + s }];
        const sc = masher({ rate: 1, jitter: 0.6, seed: 100 + s });
        const g0 = P(lanes, [sc, null]), g1 = P(lanes, [sc, null], { extra: [[0, 'B+', -1]] });
        if (g0.res.winner === 0) { without++; tw += g0.res.t; } else tw += S.LIMIT;
        if (g1.res.winner === 0) { withB++; tb += g1.res.t; } else tb += S.LIMIT;
      }
      add('brother.helps', withB === 10 && withB >= without && tb < tw, `a very slow tapper (1 a second) vs Foxy: wins ${without} of 10 alone, ${withB} of 10 with his brother on the rope (${(tw / 10).toFixed(1)} s -> ${(tb / 10).toFixed(1)} s)`);
    }

    return { ok: checks.every((c) => c.ok), checks, fail };
  }

  TW.checks = { run, play, drummer, masher, held };
})();
