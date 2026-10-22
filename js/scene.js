/* TT Tug of War: the park in Three.js. A sunny field with a mud puddle in the middle, the two teams' lines on the
   grass, a big drum behind the mud that beats the rhythm, trees, a fence, bunting and hills. Plus the pullers (Kit
   people, side-on, leaning back on the rope), the rope itself (the Verlet chain from TW.sim, drawn as instanced
   segments with the red ribbon in the middle), mud splashes, confetti and the camera. */
(function () {
  'use strict';
  const T = THREE, gfx = Kit.gfx, TW = window.TW, S = TW.sim;
  const { std, mesh, makeCanvas, toTexture } = gfx;
  const MUD = { rx: 1.7, rz: 1.25 };
  const DRUM = { x: 0, z: -3.4 };

  let renderer, scene, camera, sun, drum = null, rope = null, ribbon = null, lines = [];
  const fx = [];
  const cam = { mode: 'title', cx: 0, aspect: 1.6, snap: true, wx: 0 };
  let clock = 0, beatFlash = 0;

  // ---------------------------------------------------------------- textures
  function grain(w, h, base, dots, n, size = 2) {
    const [c, g] = makeCanvas(w, h);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = dots[i % dots.length];
      g.fillRect(Math.random() * w, Math.random() * h, size, size * (1 + Math.random() * 2));
    }
    return c;
  }
  const plane = (w, h, mat) => new T.Mesh(new T.PlaneGeometry(w, h), mat);
  function flat(w, d, mat, x, y, z) { const m = plane(w, d, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; }

  // ---------------------------------------------------------------- build
  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    const [sky, sg] = makeCanvas(4, 256);
    const grd = sg.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#4aa8ff');
    grd.addColorStop(0.62, '#a9dcff');
    grd.addColorStop(1, '#eaf7ff');
    sg.fillStyle = grd;
    sg.fillRect(0, 0, 4, 256);
    scene.background = toTexture(sky);
    scene.fog = new T.Fog('#d4ecff', 45, 120);
    camera = new T.PerspectiveCamera(38, 1, 0.1, 400);
    scene.add(new T.HemisphereLight('#eaf6ff', '#4a7a3a', 0.78));
    sun = new T.DirectionalLight('#fff4dc', 1.05);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -16; sc.right = 16; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);
    buildPark();
    buildDrum();
    buildRope();
  }

  function buildPark() {
    const grass = toTexture(grain(256, 256, '#6cc24a', ['#5fb33f', '#7bd156', '#58a83a', '#86d95e'], 2600), 30);
    flat(200, 120, std('#ffffff', { map: grass, roughness: 0.95 }), 0, 0, -20);
    // the mud puddle: a squashed disc with a wet shine, and a darker rim
    const rim = new T.Mesh(new T.CircleGeometry(1, 40), std('#5a3a1e', { roughness: 0.9 }));
    rim.rotation.x = -Math.PI / 2;
    rim.scale.set(MUD.rx + 0.22, MUD.rz + 0.2, 1);
    rim.position.y = 0.012;
    rim.receiveShadow = true;
    scene.add(rim);
    const mudTex = toTexture(grain(128, 128, '#7a4e2a', ['#6b4423', '#8a5a33', '#5e3b1d'], 500, 3));
    const mud = new T.Mesh(new T.CircleGeometry(1, 40), std('#ffffff', { map: mudTex, roughness: 0.22, metalness: 0.05 }));
    mud.rotation.x = -Math.PI / 2;
    mud.scale.set(MUD.rx, MUD.rz, 1);
    mud.position.y = 0.02;
    mud.receiveShadow = true;
    scene.add(mud);
    for (let i = 0; i < 7; i++) {
      const b = mesh(new T.SphereGeometry(0.06 + Math.random() * 0.05, 8, 6), std('#8f6038', { roughness: 0.2 }), (Math.random() - 0.5) * 2.2, 0.02, (Math.random() - 0.5) * 1.6, scene, false);
      b.scale.y = 0.4;
    }
    // the two lines: pull the ribbon over yours (coloured later, per team)
    for (const side of [-1, 1]) {
      const m = flat(0.22, 3.2, std('#ffffff', { roughness: 0.8 }), side * S.LINE, 0.025, 0);
      const flagGroup = new T.Group();
      const pole = mesh(new T.CylinderGeometry(0.035, 0.035, 1.4, 8), std('#ffffff'), 0, 0.7, 0, flagGroup);
      pole.castShadow = true;
      const cloth = new T.Mesh(new T.PlaneGeometry(0.55, 0.36), std('#ffffff', { side: T.DoubleSide, roughness: 0.8 }));
      cloth.position.set(side * -0.29, 1.2, 0);
      flagGroup.add(cloth);
      flagGroup.position.set(side * S.LINE, 0, -1.75);
      scene.add(flagGroup);
      lines.push({ side, strip: m, cloth });
    }
    // a white fence behind, trees, bushes, hills and bunting
    const white = std('#f6f2e8', { roughness: 0.8 });
    const fence = new T.Group();
    for (let x = -30; x <= 30; x += 1.4) mesh(new T.BoxGeometry(0.14, 1.0, 0.1), white, x, 0.5, 0, fence);
    for (const y of [0.4, 0.8]) mesh(new T.BoxGeometry(60.4, 0.1, 0.06), white, 0, y, 0.05, fence);
    fence.position.z = -9;
    scene.add(fence);
    const trunk = std('#8a5a33', { roughness: 0.9 });
    const leafCols = ['#3f9b3a', '#4fb046', '#2f8a3a', '#5cbf50'];
    const tree = (x, z, s) => {
      const g = new T.Group();
      mesh(new T.CylinderGeometry(0.18 * s, 0.24 * s, 1.6 * s, 8), trunk, 0, 0.8 * s, 0, g);
      const lm = std(leafCols[Math.floor(Math.random() * leafCols.length)], { roughness: 0.85, flatShading: true });
      mesh(new T.IcosahedronGeometry(1.15 * s, 0), lm, 0, 2.3 * s, 0, g);
      mesh(new T.IcosahedronGeometry(0.8 * s, 0), lm, 0.5 * s, 2.9 * s, 0.2 * s, g);
      g.position.set(x, 0, z);
      scene.add(g);
    };
    [[-16, -11, 1.3], [-11, -13, 1.6], [-6, -12, 1.1], [7, -12.5, 1.4], [12, -11, 1.2], [17, -13, 1.7], [-22, -10, 1.4], [23, -11, 1.3], [0, -15, 1.5]].forEach((a) => tree(...a));
    const bush = std('#4aa840', { roughness: 0.9, flatShading: true });
    [[-9, -8.3], [-3.5, -8.4], [4, -8.2], [9.5, -8.4], [14, -8.3], [-14, -8.2]].forEach(([x, z]) => { const b = mesh(new T.IcosahedronGeometry(0.6, 0), bush, x, 0.4, z, scene); b.scale.set(1.4, 0.8, 1); });
    const hill = std('#8fd16a', { roughness: 1 });
    [[-30, -45, 22], [8, -55, 30], [40, -48, 24]].forEach(([x, z, r]) => { const h = mesh(new T.SphereGeometry(r, 24, 12), hill, x, -r * 0.62, z, scene, false); h.scale.y = 0.55; });
    // bunting on a string across the back
    const cols = ['#ff3d7f', '#ffd400', '#18d4ff', '#7ed957', '#ff8a1f', '#9b6bff'];
    const tri = new T.BufferGeometry().setFromPoints([new T.Vector3(-0.22, 0, 0), new T.Vector3(0.22, 0, 0), new T.Vector3(0, -0.5, 0)]);
    tri.computeVertexNormals();
    for (let i = 0; i < 34; i++) {
      const x = -17 + i * 1.03, y = 4.6 - Math.sin((i / 33) * Math.PI) * 0.9;
      const f = new T.Mesh(tri, new T.MeshBasicMaterial({ color: cols[i % cols.length], side: T.DoubleSide }));
      f.position.set(x, y, -7.5);
      scene.add(f);
    }
    for (const x of [-17.4, 17.4]) mesh(new T.CylinderGeometry(0.08, 0.08, 4.8, 8), white, x, 2.4, -7.5, scene);
    // clouds
    const cloudMat = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.35 });
    [[-22, 17, -60], [5, 21, -70], [28, 16, -62], [-6, 14, -50]].forEach(([x, y, z]) => {
      const g = new T.Group();
      for (let i = 0; i < 4; i++) mesh(new T.SphereGeometry(2.2 + Math.random() * 1.2, 12, 8), cloudMat, i * 2.2 - 3.3, Math.random(), 0, g, false);
      g.position.set(x, y, z);
      g.scale.y = 0.6;
      scene.add(g);
    });
  }

  // the drum: red shell, white skin, two sticks that hit on every beat
  function buildDrum() {
    const g = new T.Group();
    const shell = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.8, 28), std('#e8323a', { roughness: 0.45 }));
    shell.position.y = 1.0;
    shell.castShadow = true;
    g.add(shell);
    const gold = std('#ffd400', { roughness: 0.3, metalness: 0.4 });
    for (const y of [0.62, 1.38]) { const r = new T.Mesh(new T.TorusGeometry(0.76, 0.05, 8, 28), gold); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
    const skin = new T.Mesh(new T.CircleGeometry(0.72, 28), std('#fff6e0', { roughness: 0.6 }));
    skin.rotation.x = -Math.PI / 2;
    skin.position.y = 1.405;
    g.add(skin);
    const legM = std('#6b4423');
    for (const a of [0.6, 2.6, 4.6]) { const l = mesh(new T.CylinderGeometry(0.04, 0.05, 0.7, 6), legM, Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.55, g); l.rotation.z = Math.cos(a) * 0.2; }
    const sticks = [];
    for (const sx of [-1, 1]) {
      const piv = new T.Group();
      piv.position.set(sx * 0.55, 1.75, 0.35);
      g.add(piv);
      const st = mesh(new T.CylinderGeometry(0.03, 0.035, 0.75, 8), std('#f2d9a6'), 0, 0, 0, piv);
      st.rotation.x = Math.PI / 2;
      st.position.z = -0.32;
      mesh(new T.SphereGeometry(0.07, 10, 8), std('#ffffff'), 0, 0, -0.68, piv);
      sticks.push(piv);
    }
    const glow = new T.Sprite(new T.SpriteMaterial({ map: gfx.glowTexture(), color: '#ffe066', transparent: true, depthWrite: false, opacity: 0 }));
    glow.scale.set(3.2, 3.2, 1);
    glow.position.y = 1.4;
    g.add(glow);
    g.position.set(DRUM.x, 0, DRUM.z);
    scene.add(g);
    drum = { g, shell, skin, sticks, glow, hit: 0, side: 1 };
  }

  // the rope: one cylinder per Verlet segment, plus the red ribbon tied in the middle
  function buildRope() {
    const [c, g] = makeCanvas(64, 16);
    g.fillStyle = '#d8b26a';
    g.fillRect(0, 0, 64, 16);
    g.strokeStyle = '#a8803e';
    g.lineWidth = 3;
    for (let x = -16; x < 80; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 16); g.stroke(); }
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    const geo = new T.CylinderGeometry(0.055, 0.055, 1, 8, 1, true);
    geo.translate(0, 0.5, 0);
    const inst = new T.InstancedMesh(geo, std('#ffffff', { map: tex, roughness: 0.85 }), S.NN - 1);
    inst.castShadow = true;
    inst.frustumCulled = false;
    scene.add(inst);
    rope = { inst, m: new T.Matrix4(), q: new T.Quaternion(), up: new T.Vector3(0, 1, 0), d: new T.Vector3(), p: new T.Vector3(), s: new T.Vector3(1, 1, 1) };
    const rg = new T.Group();
    const red = std('#ff2a4a', { roughness: 0.55, side: T.DoubleSide });
    mesh(new T.BoxGeometry(0.16, 0.16, 0.16), red, 0, 0, 0, rg);
    for (const sx of [-1, 1]) {
      const tail = mesh(new T.BoxGeometry(0.08, 0.42, 0.03), red, sx * 0.07, -0.24, 0, rg);
      tail.rotation.z = sx * 0.25;
      const loop = mesh(new T.BoxGeometry(0.2, 0.12, 0.03), red, sx * 0.14, 0.06, 0, rg);
      loop.rotation.z = sx * 0.5;
    }
    scene.add(rg);
    ribbon = rg;
  }
  // draw the rope from the sim's chain (it lives in the x-y plane; z is where the hands are)
  function drawRope(R, z) {
    const { inst, m, q, up, d, p, s } = rope;
    for (let i = 0; i < S.NN - 1; i++) {
      d.set(R.x[i + 1] - R.x[i], R.y[i + 1] - R.y[i], 0);
      const len = d.length() || 1e-6;
      d.multiplyScalar(1 / len);
      q.setFromUnitVectors(up, d);
      p.set(R.x[i], R.y[i], z);
      s.set(1, len * 1.04, 1);
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    const mid = (S.NN - 1) / 2;
    ribbon.position.set(R.x[mid], R.y[mid], z + 0.02);
    ribbon.rotation.z = Math.sin(clock * 3) * 0.08;
  }
  function teamColors(left, right) {
    for (const l of lines) {
      const col = l.side < 0 ? left : right;
      l.strip.material.color.set(col);
      l.cloth.material.color.set(col);
    }
  }

  // ---------------------------------------------------------------- pullers
  // holder (at the feet) > tilt (leans back, away from the mud) > the person (turned to face the rope, a bit to us)
  function makePuller(entry, scale, tagColor, opts = {}) {
    const holder = new T.Group();
    const tilt = new T.Group();
    holder.add(tilt);
    const p = Kit.people.build(entry.look);
    p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    tilt.add(p.root);
    holder.scale.setScalar(scale);
    scene.add(holder);
    const A = { entry, holder, tilt, p, scale, phase: Math.random() * 6, face: 1, tag: null, reach: 0.55, handY: 1, handZ: 0.15 };
    if (opts.tag) {
      A.tag = gfx.nameTag(entry.name, tagColor || entry.tag || '#ffd400');
      A.tag.position.set(0, 2.55, 0);
      A.tag.scale.multiplyScalar(0.95 / scale);
      holder.add(A.tag);
    }
    return A;
  }
  function removePuller(A) { if (A) scene.remove(A.holder); }
  const TURN = 0.35;
  const hv = new T.Vector3(), hw = new T.Vector3();
  // st: { x, z, face (+1 faces +x), mode: 'pull' | 'walk' | 'skid' | 'fall' | any Kit pose, lean, heave 0..1, turn (override), y }
  function animPuller(A, st, dt) {
    const face = st.face || 1;
    A.face = face;
    A.holder.position.set(st.x, st.y || 0, st.z || 0);
    A.holder.rotation.y = 0;
    A.p.root.rotation.y = st.turn != null ? st.turn : -face * (Math.PI / 2 + TURN);
    const k = dt >= 1 ? 1 : 1 - Math.exp(-16 * dt);
    const mode = st.mode || 'pull';
    const pulling = mode === 'pull' || mode === 'walk' || mode === 'skid';
    A.phase += dt * (mode === 'walk' ? 7 : mode === 'skid' ? 4 : 6);
    Kit.people.pose(A.p, A.phase, pulling ? 'grab' : mode, k);
    let lean = 0;
    if (pulling) {
      // hold the rope low, front foot dug in, and lean back (more on a heave). Set outright, not eased, so the hands
      // are always where the rope's pins expect them, whatever the team is doing
      const hvv = st.heave || 0, P = A.p, sw = Math.sin(A.phase);
      P.armL.rotation.x = P.armR.rotation.x = 1.0 - hvv * 0.2;
      P.armL.rotation.z = -0.12;
      P.armR.rotation.z = 0.12;
      if (mode === 'walk') { P.legL.rotation.x = 0.3 + sw * 0.4; P.legR.rotation.x = -0.1 - sw * 0.4; }
      else if (mode === 'skid') { P.legL.rotation.x = 0.75 + Math.sin(A.phase * 3) * 0.08; P.legR.rotation.x = -0.2; }
      else { P.legL.rotation.x = 0.55; P.legR.rotation.x = -0.3; }
      P.hips.rotation.x = 0.12;
      P.hips.position.y = P.hipY;
      lean = (st.lean == null ? 0.3 : st.lean) + hvv * 0.18;
    } else if (st.lean != null) lean = st.lean;
    const cur = A.tilt.rotation.z, want = face * lean;
    A.tilt.rotation.z = cur + (want - cur) * k;
  }
  // where this puller's hands are, measured once in the pulling pose: how far in front of the feet, and how high
  function measureHands(A, face) {
    animPuller(A, { x: 0, z: 0, face, mode: 'pull', lean: 0.3 }, 1);
    A.holder.updateMatrixWorld(true);
    Kit.people.handWorld(A.p, -1, hv);
    Kit.people.handWorld(A.p, 1, hw);
    hv.add(hw).multiplyScalar(0.5);
    A.reach = Math.abs(hv.x);
    A.handY = hv.y;
    A.handZ = hv.z;
    return A;
  }

  // a sprite with an emoji (treats, the basketball)
  function emojiSprite(e, size = 0.6) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: gfx.emojiTexture(e), depthWrite: false }));
    s.scale.set(size, size, 1);
    scene.add(s);
    return s;
  }
  function removeObj(o) { if (o && o.parent) o.parent.remove(o); }

  // ---------------------------------------------------------------- the drum
  function beat(side) {
    drum.hit = 1;
    drum.side = side || -drum.side;
    beatFlash = 1;
  }
  function drumUpdate(dt) {
    drum.hit = Math.max(0, drum.hit - dt * 5);
    const h = drum.hit;
    drum.shell.scale.set(1 + h * 0.06, 1 - h * 0.05, 1 + h * 0.06);
    drum.sticks.forEach((s, i) => { const on = (i ? 1 : -1) === drum.side; s.rotation.x = on ? -0.9 * (1 - h) + 0.15 : -0.9; });
    beatFlash = Math.max(0, beatFlash - dt * 3);
    drum.glow.material.opacity = beatFlash * 0.85;
  }

  // ---------------------------------------------------------------- effects
  function spawn(n, f) {
    for (let i = 0; i < n; i++) {
      const o = f(i);
      const s = new T.Sprite(new T.SpriteMaterial({ map: gfx.dotTexture(), color: o.color, transparent: true, depthWrite: false }));
      s.position.copy(o.p);
      s.scale.setScalar(o.size);
      scene.add(s);
      fx.push({ s, v: o.v, life: o.life, t: 0, g: o.g == null ? 6 : o.g, grow: o.grow || 0, size: o.size });
    }
  }
  const CONF = ['#ffd400', '#ff3d7f', '#18d4ff', '#7ed957', '#ff8a1f', '#9b6bff', '#ffffff'];
  const fxApi = {
    confetti(x, y, z, n = 140) {
      spawn(n, () => ({ p: new T.Vector3(x + (Math.random() - 0.5) * 3, y, z + (Math.random() - 0.5) * 2), v: new T.Vector3((Math.random() - 0.5) * 7, 4 + Math.random() * 6, (Math.random() - 0.5) * 5), color: CONF[(Math.random() * CONF.length) | 0], size: 0.16, life: 2.6 + Math.random(), g: 4.5 }));
    },
    poof(x, y, z) {
      spawn(14, () => ({ p: new T.Vector3(x + (Math.random() - 0.5) * 0.6, y + 0.6 + Math.random(), z + (Math.random() - 0.5) * 0.6), v: new T.Vector3((Math.random() - 0.5) * 2.5, Math.random() * 1.5, (Math.random() - 0.5) * 2.5), color: '#ffffff', size: 0.45, life: 0.6, g: 0, grow: 1.6 }));
    },
    splash(x, z, n = 26) {
      spawn(n, () => ({ p: new T.Vector3(x + (Math.random() - 0.5) * 0.6, 0.1, z + (Math.random() - 0.5) * 0.6), v: new T.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3.5, (Math.random() - 0.5) * 3), color: Math.random() < 0.5 ? '#6b4423' : '#8a5a33', size: 0.16 + Math.random() * 0.12, life: 1, g: 10 }));
    },
    dust(x, z) {
      spawn(2, () => ({ p: new T.Vector3(x, 0.08, z + (Math.random() - 0.5) * 0.3), v: new T.Vector3((Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6), color: '#c9b27a', size: 0.16, life: 0.45, g: 1, grow: 0.8 }));
    },
    clap(x, y, z) {
      spawn(16, (i) => ({ p: new T.Vector3(x, y, z), v: new T.Vector3(Math.cos(i / 2.5) * 3, Math.sin(i / 2.5) * 3, 0.5), color: '#ffd400', size: 0.18, life: 0.5, g: 0 }));
    },
    sparkle(x, y, z) {
      spawn(8, (i) => ({ p: new T.Vector3(x, y, z), v: new T.Vector3(Math.cos(i * 0.8) * 1.6, 1 + Math.sin(i * 0.8) * 1.6, 0.3), color: '#fff3a0', size: 0.14, life: 0.45, g: 0 }));
    },
  };

  // ---------------------------------------------------------------- camera
  const edge = () => Math.min(0.25, 64 / (cam.w || 1000)); // the kit's round buttons cover about 64 px on the left
  function fit(w, h) {
    cam.w = w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    cam.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  // 'play' follows the ribbon a little; 'win' frames the winning team; 'title' sways gently
  function view(mode, o = {}) { cam.mode = mode; if (o.x != null) cam.wx = o.x; cam.side = !!o.side; if (o.snap) cam.snap = true; }
  const want = { p: new T.Vector3(), l: new T.Vector3() };
  function aim(dt, ropeX) {
    const a = cam.aspect, tanH = Math.tan((camera.fov * Math.PI) / 360);
    const steep = a < 0.8;
    if (cam.mode === 'title') {
      const sw = Math.sin(clock * 0.18) * 1.2;
      const need = steep ? 9 : 13;
      const d = Math.max(9, need / (2 * tanH * a));
      want.p.set(sw, 2.2 + d * 0.2, d + 0.5);
      want.l.set(sw * 0.3, 1.6, -0.5);
    } else if (cam.mode === 'win') {
      // the winners in the top half (the card sits below), or on the left of a short wide screen (the card on the right)
      const need = steep ? 7.5 : 10.5;
      const d = Math.max(7.5, need / (2 * tanH * a));
      const sx = cam.side ? need * 0.3 : 0;
      want.p.set(cam.wx + sx, 1.3 + d * 0.1, d);
      want.l.set(cam.wx + sx, cam.side ? 1.1 : -0.5, -0.3);
    } else {
      // keep both teams in view: about 14.5 m wide (11 m on a phone held upright), in the part of the screen right of
      // the kit's round buttons; on a phone held upright, above them too (the rope sits in the upper middle)
      const need = steep ? 11 : 14.5;
      const free = 1 - edge();
      const d = Math.max(10, need / (2 * tanH * a * free));
      const cx = ropeX * 0.55 - (1 - free) * 0.5 * (2 * tanH * a * d);
      want.p.set(cx, 2.4 + d * (steep ? 0.45 : 0.2), d * (steep ? 0.9 : 1));
      want.l.set(cx, steep ? -2.2 : 0.85, -0.6);
    }
    const k = cam.snap ? 1 : 1 - Math.exp(-3.5 * dt);
    cam.snap = false;
    camera.position.lerp(want.p, k);
    if (!aim.look) aim.look = want.l.clone();
    aim.look.lerp(want.l, k);
    camera.lookAt(aim.look);
    sun.position.set(aim.look.x + 10, 22, aim.look.z + 14);
    sun.target.position.copy(aim.look);
  }

  const tmp = new T.Vector3();
  function project(x, y, z) {
    tmp.set(x, y, z).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((tmp.x + 1) / 2) * r.width, y: r.top + ((1 - tmp.y) / 2) * r.height, on: tmp.z < 1 };
  }

  function update(dt, ropeX) {
    clock += dt;
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt;
      f.v.y -= f.g * dt;
      f.v.multiplyScalar(f.g > 4 ? 1 - 1.2 * dt : 1);
      f.s.position.addScaledVector(f.v, dt);
      if (f.grow) f.s.scale.setScalar(f.size * (1 + (f.grow * f.t) / f.life));
      f.s.material.opacity = Math.min(1, 2.5 * (1 - f.t / f.life));
      if (f.t >= f.life || f.s.position.y < -0.2) { scene.remove(f.s); f.s.material.dispose(); fx.splice(i, 1); }
    }
    drumUpdate(dt);
    aim(dt, ropeX || 0);
  }
  function render() { renderer.render(scene, camera); }
  const inMud = (x, z) => (x * x) / (MUD.rx * MUD.rx) + (z * z) / (MUD.rz * MUD.rz) < 1;

  TW.scene = {
    MUD, init, fit, render, update, makePuller, removePuller, animPuller, measureHands, emojiSprite, removeObj, drawRope, teamColors,
    beat, view, project, inMud, fx: fxApi,
    get camera() { return camera; }, get scene() { return scene; },
  };
})();
