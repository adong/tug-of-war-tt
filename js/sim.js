/* TT Tug of War: the rules, with no drawing (it runs in node too, for tools/check.js).

   Two teams on one rope: lane 0 pulls to the left (-x), lane 1 to the right (+x). Each lane is a captain (a player
   or the CPU) with two animal teammates. A drum beats every BEAT seconds; a captain's tap near a beat is a heave, and
   his teammates heave with him a moment later, as strong as his timing was good. Pull the red ribbon (the rope's
   middle, W.x) over your own line, LINE metres from the middle, to win the round.

   Fair tapping:
   - every tap is judged by the time it happened (its stamp), not by the frame it arrived in;
   - a held key's auto-repeat ('tapR') never counts, and two events closer than DEBOUNCE are one tap;
   - each captain gets at most one heave per beat: on EASY extra taps are ignored, on NORMAL they slip (the heave stops);
   - both lanes use the same numbers, so the same taps pull exactly as hard from either side.

   Rope physics: the ribbon is a mass on a damped line, pushed by the two teams' heave forces (each heave is a
   half-sine pulse). Everything runs in fixed 1/120 s steps, so any frame rate gives the same result. The drawn rope
   is a Verlet chain pinned at every puller's hands, stepped in the same fixed steps. */
(function () {
  'use strict';
  const TW = (window.TW = window.TW || {});

  const DT = 1 / 120;
  const BEAT = 0.7;            // seconds between drum beats
  const FIRST = 0.7;           // the first beat after GO; beat k is at FIRST + k * BEAT
  const COUNT = 3;             // READY, HEAVE, PULL! before GO (time runs from -COUNT)
  const LINE = 2.0;            // pull the ribbon this far over to your side to win
  const LIMIT = 30;            // a round ends after this many seconds (the ribbon's side wins, or a draw)
  const GAP = 2.8, SP = 1.0;   // the captain's hands are GAP from the ribbon, each teammate SP further back
  const POWER = [1, 0.6, 0.6]; // the captain, then his two animal teammates
  const BRO = 0.8;             // the brother, when he joins your rope (the anchor, at the back)
  const PULSE = 0.45;          // one heave lasts this long
  const DELAY = 0.07;          // each teammate heaves this long after the one in front of him
  const ACC = 2, DAMP = 3, VMAX = 2.5;
  const DEBOUNCE = 0.04;
  const COMBO = 5, COMBO_UP = 0.05; // in-a-row good heaves, up to +25 %
  const YANK = 1.6;            // after a win the losers get yanked this many m/s for a second (just for show)

  // how a tap is graded: [how far from the beat (s), strength, word]
  const LEVEL = {
    // EASY: every tap counts for the nearest beat (even one right after GO), the first one per beat, the rest are ignored
    easy: { win: Infinity, late: BEAT / 2, grades: [[0.12, 1, 'PERFECT'], [0.24, 0.9, 'GREAT'], [Infinity, 0.75, 'GOOD']], extra: 'ignore' },
    // NORMAL: tap with the drum; far off the beat is a miss, a second tap on the same beat slips
    normal: { win: 0.24, late: 0.24, grades: [[0.07, 1, 'PERFECT'], [0.15, 0.8, 'GOOD'], [0.24, 0.5, 'OK']], extra: 'slip' },
  };
  // the CPU captains (Foxy): how often they skip a beat, and how far off the beat they tap
  const CPU = { easy: { miss: 0.3, sd: 0.2 }, normal: { miss: 0.14, sd: 0.1 } };

  const beatT = (k) => FIRST + k * BEAT;
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
  const shape = (u) => (u <= 0 || u >= PULSE ? 0 : Math.sin((Math.PI * u) / PULSE));

  // opts: { lanes: [{ level, cpu, seed, members }, { ... }], rope: true, handY: [[...], [...]], fail }
  function make(opts = {}) {
    const W = {
      t: -COUNT, acc: 0, x: 0, v: 0, over: false, res: null, tOver: 0,
      q: [], ev: [], log: [], fail: opts.fail || null, steps: 0,
      lanes: [0, 1].map((i) => {
        const o = (opts.lanes && opts.lanes[i]) || {};
        return {
          i, side: i ? 1 : -1, level: o.level === 'normal' ? 'normal' : 'easy', cpu: !!o.cpu, members: o.members || 3,
          r: rng(o.seed == null ? 12345 : o.seed), plan: -1, bro: false, broNext: 0,
          used: -1, missed: -1, lastRaw: -1e9, combo: 0, heave: 0, lastGrade: '',
          stats: { taps: 0, strokes: 0, perfect: 0, slips: 0, misses: 0, ignored: 0, power: 0 },
        };
      }),
      rope: opts.rope ? makeRope(opts.handY) : null,
    };
    return W;
  }

  // a tap (or 'tapR', a held key repeating; or 'B+' / 'B-', the brother grabbing on or letting go) at time t
  function input(W, lane, key, t) {
    W.q.push({ lane, key, t });
    W.qDirty = true;
  }
  const now = (W) => W.t + W.acc;

  function judge(W, L, t) {
    const lv = LEVEL[L.level], s = L.stats;
    s.taps++;
    if (t < 0 || W.over) { s.ignored++; return; }
    if (t - L.lastRaw < DEBOUNCE) { L.lastRaw = t; s.ignored++; return; }
    L.lastRaw = t;
    const k = Math.max(0, Math.round((t - FIRST) / BEAT));
    const err = t - beatT(k);
    const mash = W.fail === 'mash' && L.level === 'easy';
    if (Math.abs(err) > lv.win) {
      // NORMAL: far off the beat
      L.combo = 0;
      s.slips++;
      cut(W, L, t);
      W.log.push({ t, lane: L.i, kind: 'off', grade: err < 0 ? 'TOO SOON' : 'TOO LATE' });
      return;
    }
    if (L.used === k && !mash) {
      if (lv.extra === 'ignore') { s.ignored++; return; }
      // NORMAL: a second tap on the same beat slips: the heave stops
      L.combo = 0;
      s.slips++;
      cut(W, L, t);
      W.log.push({ t, lane: L.i, kind: 'slip', grade: 'SLIP' });
      return;
    }
    L.used = k;
    const a = Math.abs(err);
    const [, q, grade] = lv.grades.find((g) => a <= g[0]);
    L.combo = q >= 0.8 ? Math.min(COMBO, L.combo + 1) : 0;
    const mult = q * (1 + COMBO_UP * L.combo);
    for (let j = 0; j < L.members; j++) heave(W, L, t + j * DELAY, mult * POWER[j], k);
    s.strokes++;
    if (grade === 'PERFECT') s.perfect++;
    s.power += mult;
    L.heave = t;
    L.lastGrade = grade;
    W.log.push({ t, lane: L.i, kind: 'heave', grade, q, combo: L.combo });
  }
  function heave(W, L, t0, amp, beat, who) {
    if (W.fail === 'lopsided' && L.i === 1) amp *= 1.05;
    W.ev.push({ lane: L.i, t0, amp, beat, who: who || 'team', cut: Infinity });
  }
  // a slip: this captain's team heave stops now (the brother keeps his own beat)
  function cut(W, L, t) { for (const e of W.ev) if (e.lane === L.i && e.who === 'team' && e.cut > t) e.cut = t; }

  function force(W, lane, t) {
    let f = 0;
    for (const e of W.ev) if (e.lane === lane && t < e.cut) f += e.amp * shape(t - e.t0);
    return f;
  }

  // one fixed step
  function step(W, dt) {
    const t1 = W.t + dt;
    if (W.q.length) {
      if (W.qDirty) { W.q.sort((a, b) => a.t - b.t || a.lane - b.lane || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)); W.qDirty = false; }
      let n = 0;
      while (n < W.q.length && W.q[n].t <= t1 + 1e-9) n++;
      const due = W.q.splice(0, n);
      for (const m of due) {
        const L = W.lanes[m.lane];
        if (m.key === 'tap') judge(W, L, m.t);
        else if (m.key === 'tapR') L.stats.ignored++;
        else if (m.key === 'B+') { L.bro = true; L.broNext = Math.max(0, Math.ceil((m.t - FIRST) / BEAT - 1e-9)); }
        else if (m.key === 'B-') L.bro = false;
      }
    }
    for (const L of W.lanes) {
      // the CPU captain decides each beat just before its window opens
      if (L.cpu) {
        while (beatT(L.plan + 1) - BEAT / 2 <= t1 && !W.over) {
          L.plan++;
          const c = CPU[L.level];
          const skip = L.r() < c.miss;
          const off = Math.max(-0.33, Math.min(0.33, gauss(L.r) * c.sd));
          if (!skip) input(W, L.i, 'tap', beatT(L.plan) + off);
        }
      }
      // the brother on the rope heaves on every beat by himself
      if (L.bro && !W.over) {
        while (beatT(L.broNext) <= t1) { heave(W, L, beatT(L.broNext) + 0.03, BRO, L.broNext, 'bro'); L.broNext++; }
      }
      // a beat with no heave: the combo is gone
      const lv = LEVEL[L.level];
      while (t1 > 0 && beatT(L.missed + 1) + lv.late < t1 && !W.over) {
        L.missed++;
        if (L.used < L.missed) { L.combo = 0; L.stats.misses++; W.log.push({ t: beatT(L.missed), lane: L.i, kind: 'miss' }); }
      }
    }
    if (W.ev.length > 40) W.ev = W.ev.filter((e) => t1 < e.t0 + PULSE && t1 < e.cut);

    if (!W.over) {
      const net = force(W, 1, t1) - force(W, 0, t1);
      W.v += (ACC * net - DAMP * W.v) * dt;
      if (W.v > VMAX) W.v = VMAX;
      if (W.v < -VMAX) W.v = -VMAX;
      W.x += W.v * dt;
      W.t = t1;
      if (W.x <= -LINE) finish(W, 0);
      else if (W.x >= LINE) finish(W, 1);
      else if (W.t >= LIMIT) finish(W, Math.abs(W.x) > 0.05 ? (W.x < 0 ? 0 : 1) : -1);
    } else {
      // after the win: the winners yank the losers into the mud, then everyone stops
      W.tOver += dt;
      const dir = W.res.winner === 0 ? -1 : W.res.winner === 1 ? 1 : 0;
      W.v = W.tOver < 1 ? dir * YANK : 0;
      W.x += W.v * dt;
      W.t = t1;
    }
    W.steps++;
    if (W.trace && !W.over && W.steps % 30 === 0) W.trace.push(W.x);
    if (W.rope) ropeStep(W, dt);
    if (W.hook) W.hook(W); // tests watch every step
  }
  function finish(W, winner) {
    W.over = true;
    W.tOver = 0;
    W.res = { winner, t: +W.t.toFixed(4), x: W.x, strokes: W.lanes.map((L) => L.stats.strokes), slips: W.lanes.map((L) => L.stats.slips) };
    W.log.push({ t: W.t, kind: 'win', winner });
  }

  // advance by a frame's dt: whole fixed steps, the rest carried over (W.acc)
  function advance(W, dt) {
    if (W.fail === 'fps') { step(W, dt); return; } // broken on purpose: one step per frame
    W.acc += dt;
    while (W.acc >= DT - 1e-12) { W.acc -= DT; step(W, DT); }
  }

  // ---------------------------------------------------------------- the drawn rope: a Verlet chain
  const NODE = 0.2, TAIL = 1.4;
  const SMAX = GAP + 3 * SP + TAIL;   // rope coordinate: 0 is the ribbon, +-SMAX the two loose ends
  const NN = Math.round((2 * SMAX) / NODE) + 1;
  const SLACK = 0.006;               // the hands hold the rope a little closer together than its length: it sags
  const ITER = 32, GRAV = 9.8, AIR = 0.992, FLOOR = 0.035;
  const pinS = (side, j) => side * (GAP + j * SP); // j = 0, 1, 2 the team, 3 the brother (anchor)
  const nodeOf = (s) => Math.round((s + SMAX) / NODE);
  function makeRope(handY) {
    // handY: how high each puller holds the rope; handDX: the game nudges each pin to where the drawn hands are
    const R = { x: new Float64Array(NN), y: new Float64Array(NN), px: new Float64Array(NN), py: new Float64Array(NN), pin: new Int8Array(NN), handY: handY || [[0.95, 0.85, 0.85, 0.8], [0.95, 0.85, 0.85, 0.8]], handDX: null };
    // start at rest, so nothing whips about: straight from hands to hands, and each loose end running down from the
    // last puller's hands to the grass and along it (every segment exactly NODE long)
    const hy = R.handY, out = GAP + 2 * SP;
    const at = (s) => {
      const li = s < 0 ? 0 : 1, a = Math.abs(s);
      if (a <= GAP) return hy[0][0] + ((s + GAP) / (2 * GAP)) * (hy[1][0] - hy[0][0]);
      const j = Math.min(1, Math.floor((a - GAP) / SP)), u = (a - GAP - j * SP) / SP;
      return hy[li][j] + u * (hy[li][j + 1] - hy[li][j]);
    };
    for (let i = 0; i < NN; i++) {
      const s = -SMAX + i * NODE;
      if (Math.abs(s) <= out + 1e-9) { R.x[i] = s * (1 - SLACK); R.y[i] = at(s); }
    }
    for (const side of [-1, 1]) {
      let k = nodeOf(side * out), x = R.x[k], y = R.y[k];
      for (k += side; k >= 0 && k < NN; k += side) {
        if (y > FLOOR + 1e-9) { const dy = Math.min(y - FLOOR, NODE * 0.87); x += side * Math.sqrt(NODE * NODE - dy * dy); y -= dy; } else x += side * NODE;
        R.x[k] = x;
        R.y[k] = y;
      }
    }
    R.px.set(R.x);
    R.py.set(R.y);
    return R;
  }
  function pinsOf(W) {
    const R = W.rope, list = [];
    W.lanes.forEach((L, li) => {
      for (let j = 0; j < 4; j++) {
        if (j < 3 ? j >= L.members : !L.bro) continue;
        const s = pinS(L.side, j);
        list.push({ i: nodeOf(s), x: W.x + s * (1 - SLACK) + (R.handDX ? R.handDX[li][j] : 0), y: R.handY[li][j] });
      }
    });
    return list;
  }
  function ropeStep(W, dt) {
    const R = W.rope;
    R.pin.fill(0);
    const pins = pinsOf(W);
    for (const p of pins) R.pin[p.i] = 1;
    const g = GRAV * dt * dt;
    for (let i = 0; i < NN; i++) {
      if (R.pin[i]) continue;
      const vx = (R.x[i] - R.px[i]) * AIR, vy = (R.y[i] - R.py[i]) * AIR;
      R.px[i] = R.x[i];
      R.py[i] = R.y[i];
      R.x[i] += vx;
      R.y[i] += vy - g;
    }
    for (const p of pins) { R.px[p.i] = R.x[p.i]; R.py[p.i] = R.y[p.i]; R.x[p.i] = p.x; R.y[p.i] = p.y; }
    const iters = W.fail === 'stretchy' ? 1 : ITER;
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < NN - 1; i++) {
        const j = i + 1;
        const dx = R.x[j] - R.x[i], dy = R.y[j] - R.y[i];
        const d = Math.sqrt(dx * dx + dy * dy) || 1e-9;
        const diff = (d - NODE) / d;
        const a = R.pin[i], b = R.pin[j];
        if (a && b) continue;
        const wi = a ? 0 : b ? 1 : 0.5, wj = b ? 0 : a ? 1 : 0.5;
        R.x[i] += dx * diff * wi; R.y[i] += dy * diff * wi;
        R.x[j] -= dx * diff * wj; R.y[j] -= dy * diff * wj;
      }
      for (let i = 0; i < NN; i++) if (!R.pin[i] && R.y[i] < FLOOR) { R.y[i] = FLOOR; R.px[i] = R.x[i] - (R.x[i] - R.px[i]) * 0.6; }
    }
  }

  TW.sim = {
    DT, BEAT, FIRST, COUNT, LINE, LIMIT, GAP, SP, POWER, BRO, PULSE, DELAY, ACC, DAMP, VMAX, DEBOUNCE, LEVEL, CPU, NODE, SMAX, NN, SLACK, TAIL,
    beatT, make, input, now, step, advance, force, rng, gauss, pinS, nodeOf, pinsOf,
    // the beat clock: which beat is nearest to time t, and how far through the current beat we are (0..1)
    nearBeat: (t) => Math.max(0, Math.round((t - FIRST) / BEAT)),
    phase: (t) => { const u = (t - FIRST) / BEAT; return u - Math.floor(u); },
    side: (lane) => (lane ? 1 : -1),
  };
})();
