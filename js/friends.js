/* TT Tug of War: the CPU friends, 🦊 Foxy and 🐸 Froggy (copied from TT Track & Field, which copied them from TT Bowling),
   and the four animal teams that pull with the captains: 🐻 BEARS, 🐼 PANDAS, 🐰 BUNNIES and 🐷 PIGLETS, all our own.
   The kit has no animals but the bear, so they're all built on the kit's bear head: Kit.people.build is wrapped so
   anything with look.fox / frog / panda / bunny / piggy gets its own ears, face and snout (the menu portraits too).
   Move this into the kit if more games want them. */
(function () {
  'use strict';
  const T = THREE, TW = window.TW;
  const add = (entry) => { if (!Kit.roster.get(entry.id)) Kit.roster.list.push(entry); };
  add({
    id: 'foxy', name: 'FOXY', tag: '#ff8a1f', cpu: true, emoji: '🦊', signature: ['wave'], buddyScale: 0.85,
    look: { head: 'bear', fox: true, skin: '#f07a2a', muzzle: '#fff4e6', shirt: 'hoodie', top: '#3fbf8a', print: 'star', bottom: '#2b3a63', shorts: true, shoes: '#ffd400' },
  });
  add({
    id: 'froggy', name: 'FROGGY', tag: '#57d16a', cpu: true, emoji: '🐸', signature: ['jump'], buddyScale: 0.78,
    look: { head: 'bear', frog: true, skin: '#57c94a', muzzle: '#b8f0a0', shirt: 'tee', top: '#ffd400', print: 'bolt', bottom: '#3d6ad6', shorts: true, shoes: '#ff3d7f' },
  });

  // the animal teams: each team's two pullers wear the team's shirt
  TW.TEAMS = [
    { id: 'bears', emoji: '🐻', name: 'BEARS', color: '#2a7bd6', size: 0.88, look: { head: 'bear', skin: '#8b5a2b', muzzle: '#d9b48a', shirt: 'tee', top: '#2a7bd6', print: 'paw', bottom: '#2b3a63', shorts: true, shoes: '#ffd400' } },
    { id: 'pandas', emoji: '🐼', name: 'PANDAS', color: '#2fb36a', size: 0.86, look: { head: 'bear', panda: true, skin: '#f4f4f4', muzzle: '#ffffff', shirt: 'tee', top: '#2fb36a', print: 'star', bottom: '#1b1a22', shorts: true, shoes: '#ff3d7f' } },
    { id: 'bunnies', emoji: '🐰', name: 'BUNNIES', color: '#9b6bff', size: 0.78, look: { head: 'bear', bunny: true, skin: '#f2ece4', muzzle: '#ffffff', shirt: 'tee', top: '#9b6bff', print: 'bolt', bottom: '#2b3a63', shorts: true, shoes: '#18d4ff' } },
    { id: 'piglets', emoji: '🐷', name: 'PIGLETS', color: '#ff8a1f', size: 0.8, look: { head: 'bear', piggy: true, skin: '#ffb3c7', muzzle: '#ff8fab', shirt: 'tee', top: '#ff8a1f', print: 'star', bottom: '#3d6ad6', shorts: true, shoes: '#7ed957' } },
  ];
  TW.team = (id) => TW.TEAMS.find((t) => t.id === id) || TW.TEAMS[0];

  // panda: black ears and eye patches; bunny: long ears, pink nose, buck teeth; piglet: little ears and a snout
  function animalHead(p, look, std) {
    const T = THREE, h = p.head;
    const box = (w, hh, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); m.castShadow = true; h.add(m); return m; };
    const black = std('#1b1a22', { roughness: 0.7 }), white = std('#ffffff', { roughness: 0.5 }), pink = std('#ff8fab', { roughness: 0.6 }), fur = std(look.skin, { roughness: 0.7 });
    const ears = h.children.filter((m) => m.position.y > 0.25);
    const nose = h.children.find((m) => m.position.z < -0.3 && m.position.y > -0.06 && m.position.y < -0.02);
    if (look.panda) {
      ears.forEach((m) => { m.material = black; });
      for (const sx of [-1, 1]) {
        const patch = box(0.14, 0.15, 0.012, black, sx * 0.12, 0.06, -0.243);
        patch.rotation.z = sx * -0.35;
        box(0.03, 0.03, 0.01, white, sx * 0.105, 0.09, -0.262);
      }
    } else if (look.bunny) {
      ears.forEach((m) => { m.visible = false; });
      for (const sx of [-1, 1]) {
        const ear = new T.Group();
        ear.position.set(sx * 0.13, 0.22, 0.02);
        ear.rotation.z = sx * -0.14;
        h.add(ear);
        const e = new T.Mesh(new T.BoxGeometry(0.11, 0.44, 0.08), fur);
        e.position.y = 0.22;
        e.castShadow = true;
        ear.add(e);
        const inner = new T.Mesh(new T.BoxGeometry(0.06, 0.32, 0.02), std('#ffb3c7', { roughness: 0.6 }));
        inner.position.set(0, 0.22, -0.042);
        ear.add(inner);
      }
      if (nose) nose.material = pink;
      box(0.09, 0.07, 0.02, white, 0, -0.2, -0.31);
    } else {
      ears.forEach((m) => { m.visible = false; });
      for (const sx of [-1, 1]) {
        const ear = box(0.15, 0.15, 0.05, fur, sx * 0.18, 0.27, -0.06);
        ear.rotation.set(-0.6, 0, sx * -0.3);
      }
      if (nose) nose.visible = false;
      const snout = box(0.24, 0.16, 0.08, pink, 0, -0.07, -0.29);
      snout.castShadow = false;
      for (const sx of [-1, 1]) box(0.04, 0.05, 0.01, std('#a0405a'), sx * 0.05, -0.07, -0.335);
    }
  }

  const build = Kit.people.build;
  Kit.people.build = function (look) {
    const p = build(look);
    if (!look || !(look.fox || look.frog || look.panda || look.bunny || look.piggy)) return p;
    const std = Kit.gfx.std;
    const fur = std(look.skin, { roughness: 0.7 }), white = std('#fff4e6', { roughness: 0.7 }), dark = std('#2a1a12', { roughness: 0.7 });
    // hide the bear's round ears (the boxes sitting on top of the head)
    p.head.children.forEach((m) => { if (m.position.y > 0.25) m.visible = false; });
    if (look.panda || look.bunny || look.piggy) { animalHead(p, look, std); return p; }
    if (look.fox) {
      for (const sx of [-1, 1]) {
        const ear = new T.Mesh(new T.ConeGeometry(0.12, 0.3, 4), fur);
        ear.position.set(sx * 0.18, 0.36, 0.02);
        ear.rotation.set(0, Math.PI / 4, sx * -0.18);
        p.head.add(ear);
        const tip = new T.Mesh(new T.ConeGeometry(0.06, 0.12, 4), dark);
        tip.position.set(sx * 0.2, 0.47, 0.02);
        tip.rotation.set(0, Math.PI / 4, sx * -0.18);
        p.head.add(tip);
      }
      const chin = new T.Mesh(new T.BoxGeometry(0.36, 0.12, 0.06), white);
      chin.position.set(0, -0.2, -0.23);
      p.head.add(chin);
      // the tail: three puffy segments curling up behind, the last one white
      const tail = new T.Group();
      tail.position.set(0, 0.08, 0.22);
      p.hips.add(tail);
      [[0, 0, 0.12, 0.13, fur], [0, 0.12, 0.3, 0.15, fur], [0, 0.3, 0.42, 0.12, white]].forEach(([x, y, z, r, m]) => {
        const s = new T.Mesh(new T.SphereGeometry(r, 10, 8), m);
        s.position.set(x, y, z);
        s.scale.set(1, 1, 1.4);
        tail.add(s);
      });
      tail.rotation.x = -0.3;
    } else {
      // a frog: the bear's own eyes and nose go, big eyes sit on top, and a wide smile
      p.head.children.forEach((m) => { if (m.position.z < -0.24 && m.position.y > -0.08) m.visible = false; });
      const eyeW = std('#ffffff', { roughness: 0.3 }), pupil = std('#14121f', { roughness: 0.3 });
      for (const sx of [-1, 1]) {
        const bulb = new T.Mesh(new T.SphereGeometry(0.12, 12, 10), fur);
        bulb.position.set(sx * 0.15, 0.27, -0.08);
        p.head.add(bulb);
        const eye = new T.Mesh(new T.SphereGeometry(0.085, 12, 10), eyeW);
        eye.position.set(sx * 0.15, 0.29, -0.15);
        p.head.add(eye);
        const pu = new T.Mesh(new T.SphereGeometry(0.042, 10, 8), pupil);
        pu.position.set(sx * 0.15, 0.3, -0.225);
        p.head.add(pu);
      }
      const smile = new T.Mesh(new T.BoxGeometry(0.34, 0.03, 0.03), std('#2a5a20'));
      smile.position.set(0, -0.08, -0.315);
      p.head.add(smile);
      for (const sx of [-1, 1]) {
        const cheek = new T.Mesh(new T.BoxGeometry(0.06, 0.04, 0.02), std('#ff9db0'));
        cheek.position.set(sx * 0.2, -0.02, -0.25);
        p.head.add(cheek);
      }
    }
    return p;
  };
})();
