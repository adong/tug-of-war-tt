/* TT Tug of War: the game. The title (1 or 2 players, who, which animal team, EASY or NORMAL), a match (first to 2
   rounds), the countdown, the drum, the PULL pads and keys, the HUD and tug meter, the brother who grabs your rope,
   the high five, the mud splash, the winners' signature moves, the running score, and window.game for tests.
   The rules live in js/sim.js (TW.sim), the park in js/scene.js (TW.scene). */
(function () {
  'use strict';
  const TW = window.TW, S = TW.sim, SC = TW.scene, sfx = TW.sfx, Snd = Kit.sound;
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ttTugOfWar.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ttTugOfWar.' + k, String(v)); } catch (e) { /* storage blocked */ } },
  };
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  const SIZE = { teddy: 0.9, tommy: 0.78, foxy: 0.86, froggy: 0.8 }; // Tommy is 5: he's drawn smaller (the rules don't care)
  const size = (id) => SIZE[id] || 0.9;
  const TO_WIN = 2, MAX_ROUNDS = 5;
  const GRADE = { PERFECT: ['PERFECT!', 'gold'], GREAT: ['GREAT!', 'gold'], GOOD: ['GOOD!', ''], OK: ['OK', ''] };

  let thumbs = {}, PICK = [];
  const G = {
    state: 'loading', prev: null, n: 1,
    slots: [{ id: 'teddy', level: 'easy', team: 'bears' }, { id: 'tommy', level: 'easy', team: 'bunnies' }],
    sides: [], W: null, M: null, held: false, autoPause: true, timer: 0, seed: (Math.random() * 1e9) >>> 0,
    lastBeat: -1, cd: null, five: 0, bots: [null, null], wall: 0, tally: {}, cel: null, props: [], splashed: new Set(),
    hint: -9, idle: [0, 0], slipT: [[], []], demo: false, keyLabels: ['SPACE', '↑'],
  };
  const B = { entry: null, A: null, state: 'away', t: 0, treatN: 0, tossed: false, flying: null, treats: [], x: 0, z: 0, y: 0, ball: null, onRope: false, want: false };

  // ---------------------------------------------------------------- little helpers
  function show(id, on) { $(id).classList.toggle('hidden', !on); }
  function toast(text, cls) {
    const d = document.createElement('div');
    d.className = 'toast' + (cls ? ' ' + cls : '');
    d.textContent = text;
    const box = $('toasts');
    while (box.children.length > 2) box.firstChild.remove();
    box.appendChild(d);
    d.addEventListener('animationend', () => d.remove());
  }
  function pop(text, x, y, z, cls) {
    const p = SC.project(x, y, z);
    if (!p.on) return;
    const d = document.createElement('div');
    d.className = 'pop' + (cls ? ' ' + cls : '');
    d.textContent = text;
    d.style.left = Math.max(60, Math.min(window.innerWidth - 60, p.x)) + 'px';
    d.style.top = Math.max(70, Math.min(window.innerHeight - 40, p.y)) + 'px';
    document.body.appendChild(d);
    d.addEventListener('animationend', () => d.remove());
  }
  function clearPops() { document.querySelectorAll('.pop').forEach((d) => d.remove()); }
  function banner(b1, b2, cls) {
    $('banner').innerHTML = `<div class="b1${cls ? ' ' + cls : ''}"></div>` + (b2 ? '<div class="b2"></div>' : '');
    $('banner').querySelector('.b1').textContent = b1;
    if (b2) $('banner').querySelector('.b2').textContent = b2;
    show('banner', true);
  }
  const live = () => G.state === 'play' || G.state === 'after';
  const teamName = (sd) => `${sd.name}'S TEAM`;

  // ---------------------------------------------------------------- boot
  function boot() {
    SC.init($('game'));
    PICK = Kit.roster.list.filter((e) => !e.cpu);
    thumbs = Kit.portraits(Kit.roster.list);
    G.n = store.get('players', '1') === '2' ? 2 : 1;
    const ok = (id, d) => (Kit.roster.get(id) && !Kit.roster.get(id).cpu ? id : d);
    const okTeam = (id, d) => (TW.TEAMS.some((t) => t.id === id) ? id : d);
    const p1 = ok(store.get('p1', 'teddy'), 'teddy'), p2 = ok(store.get('p2', 'tommy'), 'tommy');
    G.slots = [
      { id: p1, level: lvOf(p1), team: okTeam(store.get('team1', 'bears'), 'bears') },
      { id: p2, level: lvOf(p2), team: okTeam(store.get('team2', 'bunnies'), 'bunnies') },
    ];
    if (G.slots[0].team === G.slots[1].team) G.slots[1].team = TW.TEAMS.find((t) => t.id !== G.slots[0].team).id;
    buildLogo();
    wireUI();
    Kit.lang.onChange(() => buildSlots());
    resize();
    window.addEventListener('resize', resize);
    document.body.classList.toggle('keys', !window.matchMedia('(hover: none) and (pointer: coarse)').matches);
    toTitle();
    show('loading', false);
    requestAnimationFrame(loop);
  }
  const lvOf = (id) => (store.get('level.' + id, 'easy') === 'normal' ? 'normal' : 'easy');
  let lastW = 0, lastH = 0;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w;
    lastH = h;
    SC.fit(w, h);
    if (G.state === 'results' && G.cel && G.cel.x != null) SC.view('win', { x: G.cel.x, side: sideCard() });
  }
  const sideCard = () => window.innerHeight <= 560 && window.innerWidth / window.innerHeight > 1.3;

  function buildLogo() {
    const t = window.TW_TITLE || 'TT Tug of War';
    const i = t.indexOf(' ');
    const l1 = i > 0 ? t.slice(0, i) : t, l2 = i > 0 ? t.slice(i + 1) : '';
    const tt = (s) => s.toUpperCase().replace(/&/g, '&amp;').replace(/TT/g, '<em>T</em><em>T</em>');
    $('logo').innerHTML = `<span class="l1">${tt(l1)}</span>` + (l2 ? `<span class="l2">${tt(l2)}</span>` : '');
  }

  // the player slots on the title: a face with arrows, the animal team, EASY / NORMAL; in 1 player, who you pull against
  function buildSlots() {
    const box = $('slots');
    box.innerHTML = '';
    for (let i = 0; i < G.n; i++) {
      const sl = G.slots[i], c = Kit.roster.get(sl.id), team = TW.team(sl.team);
      const el = document.createElement('div');
      el.className = 'slot';
      el.dataset.id = sl.id;
      el.style.setProperty('--c', team.color);
      const wins = +store.get('wins.' + sl.id, 0);
      el.innerHTML = `<div class="who">${G.n > 1 ? 'PLAYER ' + (i + 1) : 'CAPTAIN'}</div>
        <div class="face"><button class="arrow" data-d="-1" aria-label="Previous captain">◀</button><img alt="${c.name}" src="${thumbs[c.id] || ''}"><button class="arrow" data-d="1" aria-label="Next captain">▶</button></div>
        <div class="nm">${c.name}</div>
        <div class="wins"></div>
        <div class="teams" role="group" aria-label="Animal team">${TW.TEAMS.map((t) => `<button data-team="${t.id}" aria-pressed="${t.id === sl.team}" aria-label="${t.name}">${t.emoji}</button>`).join('')}</div>
        <div class="teamname">TEAM ${team.name}</div>
        <div class="seg" role="group" aria-label="How hard"><button data-level="easy" aria-pressed="${sl.level === 'easy'}">🐣 EASY</button><button data-level="normal" aria-pressed="${sl.level === 'normal'}">🔥 NORMAL</button></div>`;
      el.querySelector('.wins').textContent = wins ? `🏆 × ${wins}` : '';
      el.querySelectorAll('.arrow').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); sfx('click'); cycle(i, +b.dataset.d); }));
      el.querySelectorAll('.teams button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); sfx('click'); setTeam(i, b.dataset.team); }));
      el.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); sfx('click'); setLevel(i, b.dataset.level); }));
      box.appendChild(el);
      if (G.n === 1) {
        const vs = document.createElement('div');
        vs.className = 'vs';
        const ct = TW.team(cpuTeam());
        vs.innerHTML = `<div class="v">VS</div><div class="faces"><img alt="FOXY" src="${thumbs.foxy || ''}"><img alt="FROGGY" src="${thumbs.froggy || ''}"></div><div class="nm"></div>`;
        vs.querySelector('.nm').textContent = `FOXY & FROGGY ${ct.emoji}`;
        box.appendChild(vs);
      }
    }
  }
  function cycle(i, d) {
    const ids = PICK.map((e) => e.id);
    let k = (ids.indexOf(G.slots[i].id) + d + ids.length) % ids.length;
    G.slots[i] = Object.assign({}, G.slots[i], { id: ids[k], level: lvOf(ids[k]) });
    store.set('p' + (i + 1), ids[k]);
    buildSlots();
    if (G.state === 'title') stageTitle();
    buddyReset();
  }
  function setTeam(i, id) {
    const o = 1 - i;
    if (G.n === 2 && G.slots[o].team === id) { G.slots[o].team = G.slots[i].team; store.set('team' + (o + 1), G.slots[o].team); }
    G.slots[i].team = id;
    store.set('team' + (i + 1), id);
    buildSlots();
    if (G.state === 'title') stageTitle();
  }
  function cycleTeam(i, d) {
    const ids = TW.TEAMS.map((t) => t.id);
    let k = ids.indexOf(G.slots[i].team);
    do { k = (k + d + ids.length) % ids.length; } while (G.n === 2 && ids[k] === G.slots[1 - i].team);
    setTeam(i, ids[k]);
  }
  function setLevel(i, level) {
    G.slots[i].level = level;
    store.set('level.' + G.slots[i].id, level);
    buildSlots();
  }
  function setPlayers(n) {
    G.n = n;
    store.set('players', n);
    if (n === 2 && G.slots[0].team === G.slots[1].team) G.slots[1].team = TW.TEAMS.find((t) => t.id !== G.slots[0].team).id;
    document.querySelectorAll('#playersSeg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.n === n)));
    buildSlots();
    if (G.state === 'title') stageTitle();
    buddyReset();
    $('pads').className = n === 2 ? 'two' : 'one';
    document.body.classList.toggle('two', n === 2);
    setKeyLabels();
  }
  // in 1 player Foxy's team is the one across from yours in the list
  const cpuTeam = () => { const ids = TW.TEAMS.map((t) => t.id); return ids[(ids.indexOf(G.slots[0].team) + 2) % ids.length]; };
  function setKeyLabels() {
    G.keyLabels = G.n === 2 ? ['W', '↑'] : ['SPACE', '↑'];
    $('key0').textContent = G.keyLabels[0];
    $('key1').textContent = G.keyLabels[1];
  }

  function wireUI() {
    const tap = (id, f) => $(id).addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); sfx('click'); f(); });
    tap('playBtn', () => startMatch());
    tap('resumeBtn', () => resume());
    tap('quitBtn', () => toTitle());
    tap('pauseBtn', () => pause());
    tap('againBtn', () => startMatch());
    tap('menuBtn', () => toTitle());
    $('muteBtn').addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); Snd.toggleMute(); });
    $('buddyBtn').addEventListener('pointerdown', (e) => e.stopPropagation());
    $('buddyBtn').addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); markTouch(e); callBuddy(); });
    document.querySelectorAll('#playersSeg button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); sfx('click'); setPlayers(+b.dataset.n); b.blur(); }));
    $('muteBtn').textContent = Snd.isMuted() ? '🔇' : '🔊';
    Snd.onMute((m) => { $('muteBtn').textContent = m ? '🔇' : '🔊'; });
    // PULL: only a finger or button going down counts (never a click, never a held key's repeat)
    document.querySelectorAll('.pull').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); Snd.init(); markTouch(e);
      pull(+b.dataset.p, false);
    }));
    // in a round, a tap anywhere on the field pulls too: 1 player anywhere, 2 players your own half
    $('game').addEventListener('pointerdown', (e) => {
      Snd.init();
      if (!live()) return;
      markTouch(e);
      pull(G.n === 2 && e.clientX > window.innerWidth / 2 ? 1 : 0, false);
    });
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', () => Snd.init());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (G.autoPause && live()) pause();
        Snd.suspend();
      } else Snd.resume();
    });
    setPlayers(G.n);
  }
  function markTouch(e) { if (e && e.pointerType === 'touch') document.body.classList.remove('keys'); }

  // ---------------------------------------------------------------- screens
  function setScreen(id) {
    for (const s of ['title', 'pause', 'card']) show(s, s === id);
    const hud = live() || G.state === 'results' || G.state === 'paused';
    show('hud', hud && G.state !== 'paused');
    $('hud').classList.toggle('res', G.state === 'results');
    if (!live()) show('banner', false);
  }

  // the two teams: lane 0 on the left, lane 1 on the right. In 1 player the right team is Foxy's.
  function sidesNow() {
    const out = [];
    for (let lane = 0; lane < 2; lane++) {
      const cpu = G.n === 1 && lane === 1;
      const sl = G.slots[cpu ? 0 : lane];
      const team = TW.team(cpu ? cpuTeam() : sl.team);
      const animal = { id: team.id, name: team.name, look: team.look };
      const captain = Kit.roster.get(cpu ? 'foxy' : sl.id);
      const crew = cpu ? [Kit.roster.get('froggy'), animal] : [animal, animal];
      out.push({
        lane, cpu, human: cpu ? -1 : lane, level: sl.level, team, color: team.color, name: captain.name, captain,
        who: [captain, ...crew], sizes: [size(captain.id), ...crew.map((c) => (c.look === team.look ? team.size : size(c.id)))], A: [],
      });
    }
    return out;
  }
  function stageTeams() {
    const list = sidesNow();
    const sameAs = (a, b) => a && b && a.who.every((w, j) => w.id === b.who[j].id) && a.color === b.color;
    list.forEach((sd, lane) => {
      const old = G.sides[lane];
      if (sameAs(sd, old)) { sd.A = old.A; return; }
      if (old) old.A.forEach((A) => SC.removePuller(A));
      const face = lane ? -1 : 1;
      sd.A = sd.who.map((e, j) => SC.measureHands(SC.makePuller(e, sd.sizes[j], sd.color, { tag: j === 0 }), face));
    });
    G.sides = list;
    SC.teamColors(list[0].color, list[1].color);
    document.documentElement.style.setProperty('--c0', list[0].color);
    document.documentElement.style.setProperty('--c1', list[1].color);
    list.forEach((sd, lane) => {
      $('face' + lane).src = thumbs[sd.captain.id] || '';
      $('name' + lane).textContent = sd.name;
    });
  }
  const handY = () => G.sides.map((sd, lane) => [...sd.A.map((A) => A.handY), lane === 0 && B.A ? B.A.handY : 0.8]);

  function toTitle() {
    clearCelebration();
    G.state = 'title';
    G.M = null;
    setScreen('title');
    stageTitle();
    SC.view('title', { snap: true });
    Snd.music('title');
  }
  // on the title the two teams tug by themselves (both CPU, quietly)
  function stageTitle() {
    stageTeams();
    demo();
  }
  function demo() {
    G.demo = true;
    G.W = S.make({ lanes: [{ level: 'easy', cpu: true, seed: (Math.random() * 1e9) >>> 0 }, { level: 'easy', cpu: true, seed: (Math.random() * 1e9) >>> 0 }], rope: true, handY: handY() });
    G.W.t = -0.5;
    G.lastBeat = -1;
    G.splashed.clear();
    if (B.onRope || B.want) { S.input(G.W, 0, 'B+', -1); B.onRope = true; B.want = false; }
  }

  // ---------------------------------------------------------------- a match: first to 2 rounds
  function startMatch() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    clearCelebration();
    stageTeams();
    G.M = { wins: [0, 0], rounds: [], n: 0 };
    startRound();
  }
  function startRound() {
    G.M.n++;
    G.demo = false;
    clearPops();
    G.splashed.clear();
    G.W = S.make({ lanes: G.sides.map((sd) => ({ level: sd.level, cpu: sd.cpu, seed: (G.seed + G.M.n * 101 + sd.lane * 7919) >>> 0 })), rope: true, handY: handY() });
    if (B.onRope || B.want) { S.input(G.W, 0, 'B+', -S.COUNT); B.onRope = true; B.want = false; }
    G.bots.forEach((b, p) => { if (b && !G.sides[p].cpu) feedBot(p, b); });
    G.state = 'play';
    G.lastBeat = -1;
    G.cd = null;
    G.idle = [0, 0];
    G.slipT = [[], []];
    setScreen(null);
    $('roundTxt').textContent = `ROUND ${G.M.n}`;
    pips();
    SC.view('play', { snap: G.M.n === 1 });
    Snd.music('pause');
  }
  function pips() {
    for (let lane = 0; lane < 2; lane++) $('pips' + lane).innerHTML = Array.from({ length: TO_WIN }, (_, i) => `<i class="${i < G.M.wins[lane] ? 'on' : ''}"></i>`).join('');
  }

  // every moment worth a sound, a pop or a banner
  function watch() {
    const W = G.W;
    if (G.demo) {
      // the title's tug, quietly: the drum bounces, and when someone wins a fresh one starts
      if (W.t >= S.FIRST) { const k = Math.floor((W.t - S.FIRST) / S.BEAT); if (k > G.lastBeat && !W.over) { G.lastBeat = k; SC.beat(); } }
      W.log.length = 0;
      if (W.over && W.tOver > 2.5) demo();
      return;
    }
    const t = W.t;
    if (G.state === 'play') {
      const c = t < -2 ? 0 : t < -1 ? 1 : t < 0 ? 2 : t < 0.8 ? 3 : 4;
      if (c !== G.cd) {
        G.cd = c;
        if (c === 0) { banner(`ROUND ${G.M.n}`, 'READY…'); sfx('round'); }
        else if (c === 1) { banner('GRAB THE ROPE…', howTo()); sfx('beep'); }
        else if (c === 2) { banner('SET…', howTo()); sfx('beep'); }
        else if (c === 3) { banner('PULL!', '', 'go'); sfx('go'); }
        else show('banner', false);
      }
    }
    // the drum
    if (t >= S.FIRST - 1e-9) {
      const k = Math.floor((t - S.FIRST) / S.BEAT + 1e-9);
      if (k > G.lastBeat && !W.over) {
        G.lastBeat = k;
        SC.beat();
        sfx('drum', k % 2 === 0);
        for (let p = 0; p < 2; p++) {
          const sd = G.sides[p];
          if (sd.cpu) continue;
          G.idle[p]++;
          if (G.idle[p] >= 4 && t - G.hint > 6) { G.hint = t; toast(G.n === 2 ? 'TAP PULL ON EVERY BOOM!' : document.body.classList.contains('keys') ? 'PRESS SPACE ON EVERY BOOM!' : 'TAP PULL ON EVERY BOOM!', 'hint'); }
        }
      }
    }
    // what the rules said: heaves, slips, the win
    for (const e of W.log.splice(0)) {
      const sd = G.sides[e.lane];
      if (e.kind === 'win') { roundOver(e.winner); continue; }
      if (!sd || sd.cpu) continue;
      const A = sd.A[0], hp = A.holder.position, top = 2.4 * A.scale;
      if (e.kind === 'heave') {
        G.idle[e.lane] = 0;
        const [txt, cls] = GRADE[e.grade];
        pop(txt, hp.x, top, hp.z, cls);
        sfx('heave', e.q);
        if (e.grade === 'PERFECT') { sfx('perfect'); SC.fx.sparkle(hp.x, top - 0.3, hp.z); }
      } else if (e.kind === 'slip' || e.kind === 'off') {
        G.idle[e.lane] = 0;
        pop(e.kind === 'slip' ? 'SLIP!' : e.grade === 'TOO SOON' ? 'TOO SOON!' : 'TOO LATE!', hp.x, top, hp.z, 'bad');
        sfx('slip');
        const ts = G.slipT[e.lane];
        ts.push(e.t);
        while (ts.length && ts[0] < e.t - 4) ts.shift();
        if (ts.length >= 3 && e.t - G.hint > 6) { G.hint = e.t; toast('ONE TAP ON EACH BOOM!', 'hint'); }
      }
    }
    if (G.state === 'after') {
      G.timer -= G.dtNow;
      if (B.onRope && G.timer < 1.4 && G.M && roundDecides()) buddyBye();
      if (G.timer <= 0) {
        if (G.M.wins[0] >= TO_WIN || G.M.wins[1] >= TO_WIN || G.M.n >= MAX_ROUNDS) results();
        else startRound();
      }
    }
  }
  const roundDecides = () => G.M.wins[0] >= TO_WIN || G.M.wins[1] >= TO_WIN || G.M.n >= MAX_ROUNDS;
  function howTo() {
    const lv = G.sides.filter((sd) => !sd.cpu).map((sd) => sd.level);
    return lv.includes('normal') && !lv.includes('easy') ? 'ONE TAP ON EACH BOOM OF THE DRUM!' : 'TAP PULL WITH THE DRUM: BOOM, BOOM!';
  }
  function roundOver(winner) {
    G.state = 'after';
    G.timer = 3.2;
    G.M.rounds.push(winner);
    if (winner >= 0) G.M.wins[winner]++;
    pips();
    if (winner < 0) { banner('DRAW!', 'NOBODY GETS THIS ONE. PULL AGAIN!'); sfx('pop'); return; }
    const sd = G.sides[winner];
    banner(`${teamName(sd)} WINS!`, roundDecides() ? '' : `ROUND ${G.M.n}`);
    const humanWon = !sd.cpu;
    sfx('cheer', humanWon);
    if (!humanWon) setTimeout(() => sfx('aww'), 400);
  }

  // ---------------------------------------------------------------- the end of the match: the winners celebrate
  function results() {
    G.state = 'results';
    const [a, b] = G.M.wins;
    const win = a > b ? 0 : b > a ? 1 : -1;
    G.M.winner = win;
    setScreen('card');
    show('banner', false);
    clearPops();
    const sd = win >= 0 ? G.sides[win] : null;
    $('cardTitle').textContent = sd ? (sd.cpu ? `${sd.name} WINS! TRY AGAIN!` : `${sd.name} WINS!`) : "IT'S A DRAW!";
    $('cardSub').textContent = sd ? `TEAM ${sd.team.name} ${sd.team.emoji}` : '';
    const who = (s) => `<div class="who" style="--c:${s.color}"><img alt="" src="${thumbs[s.captain.id] || ''}"><span>${s.name}</span></div>`;
    $('scard').innerHTML = `${who(G.sides[0])}<span class="num">${a}</span><span class="dash">–</span><span class="num">${b}</span>${who(G.sides[1])}`;
    // the running score: today's match wins, and every win ever (per captain)
    if (sd) {
      G.tally[sd.captain.id] = (G.tally[sd.captain.id] || 0) + 1;
      if (!sd.cpu) store.set('wins.' + sd.captain.id, +store.get('wins.' + sd.captain.id, 0) + 1);
    }
    const ids = G.sides.map((s) => s.captain);
    $('tally').innerHTML = '';
    const line = document.createElement('div');
    line.textContent = `TODAY: ${ids.map((c) => `${c.name} ${G.tally[c.id] || 0}`).join(' · ')}`;
    $('tally').appendChild(line);
    const humans = G.sides.filter((s) => !s.cpu);
    const all = document.createElement('div');
    all.textContent = humans.map((s) => `🏆 ${s.name}: ${+store.get('wins.' + s.captain.id, 0)}`).join(' · ');
    $('tally').appendChild(all);
    celebrate(win);
    Snd.music('title');
  }
  function celebrate(win) {
    clearCelebration();
    G.cel = { win, t: 0 };
    if (win >= 0) {
      const sd = G.sides[win];
      const xs = sd.A.map((A) => A.holder.position.x);
      const cx = xs.reduce((p, c) => p + c, 0) / xs.length;
      G.cel.x = cx;
      SC.view('win', { x: cx, side: sideCard() });
      SC.fx.confetti(cx, 4.5, 0, 160);
      sfx('fanfare');
      sfx('cheer', true);
    } else SC.view('play');
    if (B.state !== 'away' && B.state !== 'bye') setTimeout(() => { if (G.state === 'results') buddyBye(); }, 2600);
  }
  function clearCelebration() {
    for (const s of G.props) SC.removeObj(s);
    G.props = [];
    G.cel = null;
  }

  // ---------------------------------------------------------------- the brother: call him any time (1 player)
  const buddyEntry = () => Kit.roster.get(Kit.roster.buddyFor(G.slots[0].id)) || Kit.roster.get('tommy');
  function buddyReset() {
    const e = buddyEntry();
    $('buddyFace').src = thumbs[e.id] || '';
    $('buddyName').textContent = e.name;
    $('buddyBtn').classList.toggle('five', G.n === 2);
    $('buddyBtn').title = G.n === 2 ? 'High five (T)' : 'Call your brother (T)';
    $('buddySub').textContent = G.n === 2 ? 'HIGH FIVE!' : 'TAP ME!';
    if (B.A && (G.n === 2 || B.entry !== e)) {
      if (B.onRope && G.W && !G.W.over) S.input(G.W, 0, 'B-', S.now(G.W));
      SC.removePuller(B.A);
      B.A = null;
      B.state = 'away';
      B.onRope = false;
      B.want = false;
      $('buddyBtn').classList.remove('here');
    }
  }
  // where he stands when he's not on the rope: just in front of your team, on the camera's side
  function spot() {
    const sd = G.sides[0], A = sd && sd.A[2];
    const x = A ? A.holder.position.x - 0.4 : -5;
    return { x, z: 1.5 };
  }
  // the anchor's place: the back of your rope
  function anchor() {
    const W = G.W, s = S.pinS(-1, 3);
    const x = (W ? W.x : 0) + s * (1 - S.SLACK);
    return { x: x - (B.A ? B.A.reach : 0.5), z: -(B.A ? B.A.handZ : 0.15) };
  }
  function callBuddy() {
    if (G.n === 2) return highFive();
    if (G.state === 'paused' || G.state === 'loading') return;
    const e = buddyEntry();
    if (!B.A || B.entry !== e) {
      if (B.A) SC.removePuller(B.A);
      B.entry = e;
      B.A = SC.measureHands(SC.makePuller(e, e.buddyScale || 0.8, e.tag || '#ffd27a', { tag: true }), 1);
      B.state = 'away';
    }
    if (G.W && G.W.rope) G.W.rope.handY[0][3] = B.A.handY;
    if (B.onRope && G.W && !G.W.over) S.input(G.W, 0, 'B-', stamp());
    B.onRope = false;
    if (B.state === 'away' || B.state === 'bye') {
      const p = spot();
      B.x = p.x; B.z = p.z; B.y = 0;
      SC.fx.poof(B.x, 0, B.z);
      sfx('poof');
    } else {
      // he lets go of the rope to say hi again
      const p = spot();
      B.x += (p.x - B.x) * 0.5; B.z = p.z;
    }
    B.A.holder.visible = true;
    toast(`${e.name} IS HERE!`, 'buddy');
    B.state = 'hello';
    B.t = 0;
    B.tossed = false;
    B.treatN++;
    $('buddyBtn').classList.add('here');
  }
  function tossTreat() {
    const [emoji, name] = TREATS[(B.treatN - 1) % TREATS.length];
    const s = SC.emojiSprite(emoji, 0.55);
    const from = new THREE.Vector3(B.x, 1.3, B.z);
    const cap = G.sides[0] && G.sides[0].A[0];
    const to = cap ? cap.holder.position.clone().add(new THREE.Vector3(0, 2.1 * cap.scale, 0.3)) : from.clone();
    B.flying = { s, from, to, t: 0, emoji, name };
    sfx('swish');
  }
  // the helper: after his signature move and the treat, he joins your rope (at the back, the anchor)
  function help() {
    toast(`${B.entry.name} SAYS: I'LL PULL WITH YOU! PULL HARD!`, 'buddy');
    sfx('powerup');
    B.state = 'walk';
    B.t = 0;
  }
  // on a rope that's still being pulled he grabs it now; otherwise he's ready for the next round
  function grabRope() {
    B.state = 'rope';
    if (G.W && !G.W.over) {
      S.input(G.W, 0, 'B+', G.demo ? S.now(G.W) : stamp());
      B.onRope = true;
    } else B.want = true;
    sfx('grab');
  }
  function buddyBye() {
    if (!B.A || B.state === 'away' || B.state === 'bye') return;
    if (B.onRope && G.W && !G.W.over) S.input(G.W, 0, 'B-', S.now(G.W));
    else if (G.W && G.W.over) G.W.lanes[0].bro = false; // the round is over: he just lets go of the drawn rope
    B.onRope = false;
    B.want = false;
    B.state = 'bye';
    B.t = 0;
    const p = spot();
    if (G.state === 'results') { B.x = p.x; B.z = p.z; }
  }
  function buddyUpdate(dt) {
    const f = B.flying;
    if (f) {
      f.t += dt / 0.75;
      const u = Math.min(1, f.t);
      f.s.position.lerpVectors(f.from, f.to, u);
      f.s.position.y += Math.sin(u * Math.PI) * 1.4;
      f.s.material.rotation = u * 6;
      if (u >= 1) {
        sfx('treat');
        toast(`${f.emoji} ${f.name} FROM ${B.entry.name}!`, 'buddy');
        f.s.material.rotation = 0;
        B.treats.push({ s: f.s, t: 0 });
        B.flying = null;
      }
    }
    for (let i = B.treats.length - 1; i >= 0; i--) {
      const tr = B.treats[i];
      tr.t += dt;
      if (tr.t > 2.5) { SC.removeObj(tr.s); B.treats.splice(i, 1); }
    }
    if (!B.A || B.state === 'away') return;
    B.t += dt;
    let st = { x: B.x, z: B.z, y: B.y, mode: 'stand', turn: Math.PI * 0.85 };
    if (B.state === 'hello') {
      st.mode = Kit.roster.signature(B.entry, 'hello');
      if (B.t > 0.9 && !B.tossed) { B.tossed = true; tossTreat(); }
      if (B.t > 1.9) help();
    } else if (B.state === 'walk') {
      // he hops over to the back of the rope
      const a = anchor();
      const u = Math.min(1, B.t / 0.6);
      B.x += (a.x - B.x) * Math.min(1, dt * 9);
      B.z += (a.z - B.z) * Math.min(1, dt * 9);
      B.y = Math.sin(u * Math.PI) * 0.5;
      st = { x: B.x, z: B.z, y: B.y, mode: 'jump', face: 1 };
      if (u >= 1) { B.y = 0; grabRope(); }
    } else if (B.state === 'rope') {
      const a = anchor();
      B.x = a.x; B.z = a.z; B.y = 0;
      const W = G.W;
      let heave = 0;
      if (W && B.onRope && W.t >= S.FIRST) {
        const k = Math.floor((W.t - S.FIRST) / S.BEAT);
        const u = W.t - (S.beatT(k) + 0.03);
        heave = u > 0 && u < S.PULSE ? Math.sin((Math.PI * u) / S.PULSE) : 0;
      }
      const v = W ? W.v : 0;
      st = { x: B.x, z: B.z, face: 1, mode: !B.onRope ? 'pull' : v < -0.25 ? 'walk' : v > 0.25 ? 'skid' : 'pull', heave };
      if (G.state === 'results') { const s2 = spot(); B.x = s2.x; B.z = s2.z; st = { x: B.x, z: B.z, mode: 'stand', turn: Math.PI * 0.85 }; }
    } else if (B.state === 'bye') {
      st.mode = Kit.roster.signature(B.entry, 'goodbye');
      if (st.mode === 'jumpshot') {
        B.y = Math.max(0, Math.sin(Math.min(1, B.t / 0.8) * Math.PI)) * 0.6;
        st.y = B.y;
        if (!B.ball && B.t > 0.35) B.ball = SC.emojiSprite('🏀', 0.35);
        if (B.ball) { const u = B.t - 0.35; B.ball.position.set(B.x + u * 1.4, 1.9 + u * 3.2 - u * u * 3.5, B.z); }
      }
      if (B.t > 1.4) {
        if (B.ball) { SC.removeObj(B.ball); B.ball = null; }
        SC.fx.poof(B.x, 0, B.z);
        sfx('poof');
        B.state = 'away';
        B.y = 0;
        B.A.holder.visible = false;
        $('buddyBtn').classList.remove('here');
        return;
      }
    } else {
      st.mode = Math.sin(B.t * 0.9) > 0.85 ? Kit.roster.signature(B.entry, 'hello') : 'stand';
    }
    SC.animPuller(B.A, st, dt);
    if (B.state === 'rope') pinToHands(B.A, 0, 3);
  }

  // 2 players: T (or the 🙌 button) is a high five
  function highFive() {
    if (G.state === 'paused' || G.state === 'loading' || G.five > 0) return;
    G.five = 0.9;
    sfx('five');
    toast('🙌 HIGH FIVE!', 'buddy');
    SC.fx.clap(G.W ? G.W.x : 0, 3.2, 0);
  }

  // ---------------------------------------------------------------- input
  const KEYS1 = new Set([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
  const KEYS2 = { w: 0, a: 0, s: 0, d: 0, arrowup: 1, arrowdown: 1, arrowleft: 1, arrowright: 1 };
  // a tap's time: the rules' clock at the last frame plus the time since (so it doesn't wait for the next frame)
  function stamp() {
    const W = G.W;
    if (!W) return 0;
    const since = G.held ? 0 : Math.max(0, Math.min(0.05, (performance.now() - G.wall) / 1000));
    return S.now(W) + since;
  }
  function pull(p, repeat) {
    if (!live() || !G.W || G.demo) return;
    const sd = G.sides[p];
    if (!sd || sd.cpu) return;
    S.input(G.W, p, repeat ? 'tapR' : 'tap', stamp());
    if (!repeat) {
      const b = $('pull' + p);
      b.classList.add('hit');
      setTimeout(() => b.classList.remove('hit'), 90);
    }
  }
  function onKey(e) {
    const k = e.key.toLowerCase();
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    Snd.init();
    if (!e.repeat) document.body.classList.add('keys');
    if (k === 'm') { Snd.toggleMute(); return; }
    if (k === 'p' || k === 'escape') {
      if (G.state === 'paused') resume();
      else if (live()) pause();
      else if (G.state === 'results' && k === 'escape') toTitle();
      return;
    }
    if (G.state === 'paused') { if (k === 'enter') resume(); return; }
    if (k === 't') { if (!e.repeat) callBuddy(); return; }
    if (G.state === 'title') {
      if (k === 'enter') { e.preventDefault(); sfx('click'); startMatch(); }
      else if (G.n === 1 && (k === 'arrowleft' || k === 'arrowright')) cycle(0, k === 'arrowleft' ? -1 : 1);
      else if (G.n === 1 && (k === 'arrowup' || k === 'arrowdown')) { e.preventDefault(); cycleTeam(0, k === 'arrowup' ? -1 : 1); }
      else if (G.n === 2 && (k === 'a' || k === 'd')) cycle(0, k === 'a' ? -1 : 1);
      else if (G.n === 2 && (k === 'w' || k === 's')) cycleTeam(0, k === 'w' ? -1 : 1);
      else if (G.n === 2 && (k === 'arrowleft' || k === 'arrowright')) cycle(1, k === 'arrowleft' ? -1 : 1);
      else if (G.n === 2 && (k === 'arrowup' || k === 'arrowdown')) { e.preventDefault(); cycleTeam(1, k === 'arrowup' ? -1 : 1); }
      else if (k === 'e') setLevel(0, G.slots[0].level === 'easy' ? 'normal' : 'easy');
      else if (k === '1' || k === '2') setPlayers(+k);
      return;
    }
    if (G.state === 'results') {
      if (k === 'enter' || k === ' ') { e.preventDefault(); startMatch(); }
      return;
    }
    if (live()) {
      const p = G.n === 1 ? (KEYS1.has(k) ? 0 : -1) : k in KEYS2 ? KEYS2[k] : -1;
      if (p >= 0) { e.preventDefault(); pull(p, e.repeat); }
    }
  }

  function pause() {
    if (!live()) return;
    G.prev = G.state;
    G.state = 'paused';
    setScreen('pause');
    Snd.music('pause');
  }
  function resume() {
    if (G.state !== 'paused') return;
    G.state = G.prev || 'play';
    setScreen(null);
    Snd.music('pause');
  }

  // ---------------------------------------------------------------- the frame
  // stand every puller on the rope: feet behind their hands, leaning back; heave with their team's heaves
  function drawTeams(dt) {
    const W = G.W;
    if (!W) return;
    const t = W.t;
    G.sides.forEach((sd, lane) => {
      const L = W.lanes[lane], face = lane ? -1 : 1, side = lane ? 1 : -1;
      const won = W.over && W.res.winner === lane, lost = W.over && W.res.winner === 1 - lane;
      const dragged = W.v * side < -0.25, gaining = W.v * side > 0.25;
      sd.A.forEach((A, j) => {
        const s = S.pinS(side, j);
        const px = W.x + s * (1 - S.SLACK);
        const st = { x: px - face * A.reach, z: -A.handZ, face, mode: 'pull' };
        const u = t - (L.heave + j * S.DELAY);
        st.heave = L.stats.strokes && u > 0 && u < S.PULSE ? Math.sin((Math.PI * u) / S.PULSE) : 0;
        if (G.cel && G.state === 'results') {
          celebratePose(st, sd, A, j, lane);
        } else if (lost && SC.inMud(st.x, st.z)) {
          st.mode = 'fall';
          st.lean = -face * 0.2;
          const key = lane * 10 + j;
          if (!G.splashed.has(key)) {
            G.splashed.add(key);
            SC.fx.splash(st.x, st.z);
            if (!G.demo) sfx('splash');
          }
        } else if (won && W.tOver > 1.1) {
          st.mode = 'jump';
          st.y = Math.abs(Math.sin((W.tOver + j * 0.3) * 6)) * 0.35;
          st.turn = Math.PI * (lane ? 0.9 : 1.1);
        } else {
          st.mode = gaining || won ? 'walk' : dragged || lost ? 'skid' : 'pull';
          if (st.mode === 'skid' && Math.random() < dt * 14) SC.fx.dust(st.x + face * 0.3, st.z);
        }
        SC.animPuller(A, st, dt);
        if (st.mode === 'pull' || st.mode === 'walk' || st.mode === 'skid') pinToHands(A, lane, j);
        else if (W.rope && G.state === 'results') { W.rope.handY[lane][j] = 0.05; if (W.rope.handDX) W.rope.handDX[lane][j] = 0; } // everyone lets go
        else if (W.rope && W.rope.handDX) W.rope.handDX[lane][j] = 0;
      });
    });
    if (W.rope) SC.drawRope(W.rope, 0);
  }
  // the rope's pin for this puller goes where his hands really are this frame (the rules never look at this)
  const hv = new THREE.Vector3(), hw = new THREE.Vector3();
  function pinToHands(A, lane, j) {
    const W = G.W;
    if (!W || !W.rope) return;
    const R = W.rope;
    if (!R.handDX) R.handDX = [[0, 0, 0, 0], [0, 0, 0, 0]];
    A.holder.updateMatrixWorld(true);
    Kit.people.handWorld(A.p, -1, hv);
    Kit.people.handWorld(A.p, 1, hw);
    hv.add(hw).multiplyScalar(0.5);
    const s = S.pinS(lane ? 1 : -1, j);
    R.handDX[lane][j] = Math.max(-0.4, Math.min(0.4, hv.x - (W.x + s * (1 - S.SLACK))));
    R.handY[lane][j] = Math.max(0.3, Math.min(1.6, hv.y));
  }
  function celebratePose(st, sd, A, j, lane) {
    const c = G.cel, win = c.win;
    st.turn = Math.PI * (lane ? 0.92 : 1.08);
    if (win === lane || win < 0) {
      if (j === 0) {
        const sig = sd.captain.signature || ['wave'];
        const idx = Math.floor(c.t / 2.4) % sig.length, lt = c.t % 2.4;
        st.mode = sig[idx];
        if (st.mode === 'jumpshot') {
          st.y = Math.max(0, Math.sin(Math.min(1, lt / 0.8) * Math.PI)) * 0.6;
          if (lt > 0.35 && lt < 1.6) {
            if (!c.ball) { c.ball = SC.emojiSprite('🏀', 0.35); G.props.push(c.ball); }
            const u = lt - 0.35;
            c.ball.visible = true;
            c.ball.position.set(st.x + u * 1.4, 2 * A.scale + u * 3.2 - u * u * 3.5, st.z + 0.3);
          } else if (c.ball) c.ball.visible = false;
        } else if (c.ball) c.ball.visible = false;
      } else {
        st.mode = 'jump';
        st.y = Math.abs(Math.sin((c.t + j * 0.35) * 5)) * 0.3;
      }
    } else {
      st.mode = SC.inMud(st.x, st.z) ? 'fall' : 'stand';
      st.lean = st.mode === 'fall' ? -(lane ? -1 : 1) * 0.2 : 0;
    }
  }

  function hud() {
    const W = G.W;
    if (!W || G.demo) return;
    $('clock').textContent = String(Math.max(0, Math.ceil(S.LIMIT - Math.max(0, W.t))));
    const m = Math.max(0, Math.min(100, 50 + (W.x / S.LINE) * 50));
    $('meterMark').style.left = m + '%';
    const t = stamp();
    const k = Math.max(0, Math.ceil((t - S.FIRST) / S.BEAT - 1e-9));
    const toNext = S.beatT(k) - t, frac = Math.max(0, Math.min(1, toNext / S.BEAT));
    const near = Math.abs(t - S.beatT(S.nearBeat(t))) < 0.09;
    for (let p = 0; p < 2; p++) {
      const sd = G.sides[p];
      if (!sd || sd.cpu) continue;
      const ring = $('ring' + p);
      const on = t > S.FIRST - S.BEAT && !W.over;
      ring.style.opacity = on ? String(0.3 + 0.7 * (1 - frac)) : '0';
      ring.style.transform = `scale(${1 + frac * 1.1})`;
      $('pull' + p).classList.toggle('beat', on && near);
      const L = W.lanes[p];
      $('combo' + p).textContent = L.combo >= 2 && !W.over ? `🔥 × ${L.combo}` : '';
    }
  }

  function tick(dt) {
    G.dtNow = dt;
    if (window.innerWidth !== lastW || window.innerHeight !== lastH) resize(); // a resize event doesn't always come
    if (G.state === 'paused') { SC.update(0, G.W ? G.W.x : 0); return; }
    const W = G.W;
    if (W) {
      S.advance(W, dt);
      G.wall = performance.now();
      watch();
    }
    if (G.cel) G.cel.t += dt;
    if (G.five > 0) G.five = Math.max(0, G.five - dt);
    drawTeams(dt);
    buddyUpdate(dt);
    hud();
    SC.update(dt, G.W ? G.W.x : 0);
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    if (!G.held) tick(dt);
    SC.render();
  }

  // ---------------------------------------------------------------- tests: scripted captains for the human lanes
  function feedBot(p, o) {
    const sc = o.kind === 'masher' ? TW.checks.masher(o) : o.kind === 'held' ? TW.checks.held(o) : TW.checks.drummer(o);
    const from = G.W ? S.now(G.W) : -1e9;
    for (const [key, t] of sc) if (t >= from) S.input(G.W, p, key, t);
  }

  // the check in the page: the rules (js/checks.js), plus the real game loop at 30, 60 and 144 fps giving === results
  function check(opts = {}) {
    const rep = TW.checks.run(opts);
    const keep = { n: G.n, slots: JSON.parse(JSON.stringify(G.slots)), held: G.held, bots: G.bots, seed: G.seed };
    const loopRes = [];
    try {
      G.held = true;
      for (const level of ['easy', 'normal']) {
        const got = [];
        for (const fps of [30, 60, 144]) {
          G.n = 1;
          G.slots[0] = { id: 'tommy', level, team: 'bunnies' };
          G.seed = 4242;
          G.bots = [level === 'easy' ? { kind: 'masher', rate: 4, seed: 9 } : { kind: 'drummer', sd: 0.08, seed: 9 }, null];
          stageTeams();
          startMatch();
          G.W.fail = opts.fail || null;
          G.W.trace = [];
          let n = 0;
          while (!G.W.over && n < 60 * fps) { tick(1 / fps); n++; }
          got.push(JSON.stringify([G.W.res, G.W.trace]));
        }
        loopRes.push({ level, ok: got.every((g) => g === got[0]), got: got.map((g) => g.slice(0, 100)) });
      }
    } catch (e) { loopRes.push({ ok: false, err: String((e && e.stack) || e) }); }
    rep.loop = loopRes;
    rep.loopOk = loopRes.every((l) => l.ok);
    rep.ok = rep.ok && rep.loopOk;
    G.n = keep.n;
    G.slots = keep.slots;
    G.held = keep.held;
    G.bots = keep.bots;
    G.seed = keep.seed;
    setPlayers(G.n);
    toTitle();
    return rep;
  }

  // ---------------------------------------------------------------- testing hooks
  // The Browser pane throttles requestAnimationFrame while hidden, so tests drive time themselves:
  //   game.hold(true); game.start({ players: [{ id: 'tommy', level: 'easy', team: 'bunnies' }] }); game.bot(0, { kind: 'masher', rate: 4 }); game.step(10)
  window.game = {
    get autoPause() { return G.autoPause; },
    set autoPause(v) { G.autoPause = !!v; },
    hold(on) { G.held = on !== false; },
    step(sec) {
      const n = Math.max(1, Math.round((sec || 1 / 60) * 60));
      for (let i = 0; i < n; i++) tick(1 / 60);
      SC.render();
      return this.info();
    },
    stepFps(sec, fps) { const n = Math.round(sec * fps); for (let i = 0; i < n; i++) tick(1 / fps); SC.render(); return this.info(); },
    // opts: { players: [{ id, level, team }], seed }
    start(opts = {}) {
      Snd.init();
      if (opts.players) {
        setPlayers(opts.players.length);
        opts.players.forEach((p, i) => { G.slots[i] = { id: p.id || G.slots[i].id, level: p.level || 'easy', team: p.team || G.slots[i].team }; });
        buildSlots();
        buddyReset();
      }
      if (opts.seed != null) G.seed = opts.seed >>> 0;
      G.bots = [null, null];
      startMatch();
      return this.info();
    },
    // a scripted captain for player p: { kind: 'drummer' | 'masher' | 'held', rate, sd, miss, seed } (see js/checks.js)
    bot(p, o) { G.bots[p] = o || null; if (o && G.W && !G.demo && !G.sides[p].cpu) feedBot(p, o); },
    press(p, repeat) { pull(p, !!repeat); },
    title() { toTitle(); },
    again() { startMatch(); },
    buddy() { callBuddy(); },
    five() { highFive(); },
    pause() { pause(); },
    resume() { resume(); },
    check(opts) { return check(opts); },
    get state() { return G.state; },
    get W() { return G.W; },
    info() {
      const W = G.W;
      return {
        state: G.state, demo: G.demo, round: G.M && G.M.n, wins: G.M && G.M.wins.slice(), t: W && +W.t.toFixed(3), x: W && +W.x.toFixed(3),
        buddy: B.state, onRope: B.onRope, res: W && W.res,
        lanes: W ? W.lanes.map((L) => ({ level: L.level, cpu: L.cpu, bro: L.bro, combo: L.combo, strokes: L.stats.strokes, slips: L.stats.slips, ignored: L.stats.ignored })) : [],
      };
    },
  };
  boot();
})();
