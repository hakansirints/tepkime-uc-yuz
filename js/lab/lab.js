/* 3B laboratuvar denetleyicisi: sahne, ışıklar, kamera, döküm etkileşimi ve tepkime simülasyonu. */
(function (T) {
  'use strict';
  const U = T.U, FX = T.FX;
  const BY = () => T.Room.BENCH_Y;
  const VOL_K = 2;   // tepkime verisindeki hacimler (mL) bu katsayıyla dökülür: büyük beherlerde dolum oranı korunur

  const Lab = {
    ready: false,
    state: 'idle',  // idle | ready | pouring | reacting | done
    paused: false,
    listeners: {},
    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    emit(ev, d) { this.wake(1.5); (this.listeners[ev] || []).forEach((f) => f(d)); }
  };

  const VIEWS = {
    bench: { target: new THREE.Vector3(0.02, 1.0, 0.14), radius: 1.05, phi: 1.17, theta: 0.0 },
    close: { target: new THREE.Vector3(-0.035, 1.005, 0.17), radius: 0.68, phi: 1.3, theta: 0.04 },
    room: { target: new THREE.Vector3(0.0, 1.25, 0.0), radius: 3.7, phi: 1.28, theta: 0.32 }
  };

  Lab.init = async function (canvas, progress) {
    const say = (p) => progress && progress(p);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // dokunmatik telefonda üst sınır 1,5 (antialias açıkken 2 ile farkı görünmez); döngü yük altında oranı uyarlar
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    Lab.prMax = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    Lab.prMin = Lab.prMax > 1 ? 1 : Math.max(0.8, Lab.prMax * 0.85);
    Lab.pr = Lab.prMax;
    renderer.setPixelRatio(Lab.pr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    T.Tex.setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
    Lab.renderer = renderer;
    T.Props.initMaterials();
    say(15);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd8dedd);
    Lab.scene = scene;
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.02, 40);
    Lab.camera = camera;
    await tick();
    scene.environment = T.makeEnvironment(renderer);
    scene.environmentIntensity = 1; // r158'de yok sayılır
    say(30);

    // Işıklar
    const hemi = new THREE.HemisphereLight(0xf2f6ff, 0x8b8577, 0.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0dc, 2.2);
    sun.position.set(-4.2, 3.6, 1.2);
    sun.target.position.set(0, BY(), 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -2.2; sc.right = 2.2; sc.top = 2.0; sc.bottom = -2.0; sc.near = 1; sc.far = 12;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    const ceil = new THREE.SpotLight(0xf6f9ff, 9, 6, 1.0, 1, 2);
    ceil.position.set(0.2, 2.95, 0.4);
    ceil.target.position.set(0, BY(), 0.05);
    ceil.castShadow = true;
    ceil.shadow.mapSize.set(1024, 1024);
    ceil.shadow.bias = -0.0003; ceil.shadow.normalBias = 0.015; ceil.shadow.radius = 6;
    scene.add(ceil, ceil.target);
    const fill = new THREE.PointLight(0xffffff, 3, 8, 2);
    fill.position.set(1.5, 2.6, 2.4);
    scene.add(fill);
    [[-2.4, -2.2], [2.4, -2.2], [-2.4, 2.8], [2.4, 2.8]].forEach(([x, z]) => {
      const p = new THREE.PointLight(0xf4f7ff, 3.2, 7, 2); p.position.set(x, 2.85, z); scene.add(p);
    });
    say(40);
    await tick();

    // Oda
    Lab.room = T.Room.buildRoom(scene);
    say(70);
    await tick();

    // Beherler + termometre
    const by = BY();
    Lab.fixedHome = new THREE.Vector3(-0.11, by, 0.16);
    Lab.addedHome = new THREE.Vector3(0.03, by, 0.19);
    // Griffin beherleri gerçek ölçülerde: 600 mL (Ø90 × 125 mm) sabit kap, 250 mL (Ø70 × 95 mm) eklenen kap.
    // Ada tezgâhı 2,8 m olduğundan küçük beherler masada kayboluyordu; hacimler de VOL_K ile orantılı büyütülür.
    Lab.fixed = new T.Beaker({ capacity: 600, R: 0.045, H: 0.125, spoutAngle: Math.PI * 0.75, scene, name: 'fixed' });
    Lab.fixed.group.position.copy(Lab.fixedHome);
    scene.add(Lab.fixed.group);
    Lab.added = new T.Beaker({ capacity: 250, R: 0.035, H: 0.095, spoutAngle: Math.PI, scene, name: 'added' });
    Lab.added.group.position.copy(Lab.addedHome);
    Lab.added.group.rotation.y = 0;
    scene.add(Lab.added.group);
    const F = Lab.fixedHome;
    // termometre büyük beherin sol duvarına klipsle tutturulur (prob kabın içinde, sol kenarda)
    const fxR = Lab.fixed.R;
    Lab.thermo = new T.Thermometer(scene, new THREE.Vector3(F.x - fxR + 0.0085, by + 0.012, F.z + 0.004), { y: by + Lab.fixed.H, x: F.x - fxR },
      Object.assign(new THREE.Vector3(F.x - 0.105, by, F.z + 0.016), { yaw: 0.24, scale: 0.9 }));

    // Efektler
    Lab.bubbles = new FX.Bubbles(Lab.fixed, 750);
    Lab.foam = new FX.Foam(Lab.fixed);
    Lab.precip = new FX.Precipitate(Lab.fixed, 1400);
    Lab.smoke = new FX.Smoke(scene);
    Lab.stream = new FX.Stream(scene);
    Lab.bubbles.onPop = () => { if (Math.random() < 0.04) T.Audio.pop(); };
    say(85);

    // Kamera
    Lab.controls = new T.OrbitLite(camera, canvas);
    Lab.controls.limits = { thetaMin: -1.31, thetaMax: 1.31, phiMin: 0.5, phiMax: 1.47, rMin: 0.28, rMax: 4.0 };
    Lab.DEFAULT_LIMITS = Object.assign({}, Lab.controls.limits);
    Lab.controls.setView(VIEWS.bench, true);
    Lab.viewName = 'bench';
    Lab.controls.blockers.push((e) => Lab._pointerDown(e));

    Lab._bindPointer(canvas);
    Lab._makeTags();
    window.addEventListener('resize', () => Lab.resize());
    Lab.resize();

    // İlk derleme
    renderer.compile(scene, camera);
    say(100);
    Lab.ready = true;
    Lab._loop();
    return Lab;
  };
  function tick() { return new Promise((r) => setTimeout(r, 16)); }

  Lab.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    Lab.renderer.setSize(w, h, false);
    Lab.camera.aspect = w / h;
    // dar ekranlarda biraz uzaklaş
    Lab.camera.fov = w / h < 1.2 ? 52 : 40;
    Lab.camera.updateProjectionMatrix();
    Lab.invalidate();   // setSize tuvali temizler: en az bir kare çiz
  };

  Lab.setView = function (name) {
    if (VIEWS[name]) { Lab.controls.setView(VIEWS[name]); Lab.viewName = name; }
  };

  /* ---------------- Etiketler (HTML) ---------------- */
  Lab._makeTags = function () {
    const root = document.getElementById('lab-tags');
    const mk = (cls) => { const d = document.createElement('div'); d.className = 'lab-tag ' + (cls || ''); root.appendChild(d); return d; };
    Lab.tags = {
      fixed: { el: mk(), at: () => new THREE.Vector3(Lab.fixedHome.x, BY() - 0.005, Lab.fixedHome.z + 0.06) },
      added: { el: mk('drag'), at: () => { const p = Lab.added.group.position; return new THREE.Vector3(p.x + 0.02, p.y - 0.005, p.z + 0.05); } },
      temp: { el: mk(), at: () => Lab.thermo.meter.position.clone().add(new THREE.Vector3(0, 0.05, 0)) }
    };
  };
  Lab.SHOW_TAGS = false; // termometre ve madde etiketleri şimdilik kapalı
  Lab._updateTags = function () {
    if (!Lab.SHOW_TAGS) { if (!Lab._tagsHidden) { document.getElementById('lab-tags').style.visibility = 'hidden'; Lab._tagsHidden = true; } return; }
    const w = window.innerWidth, h = window.innerHeight;
    const r = Lab.reaction;
    const v = new THREE.Vector3();
    for (const k in Lab.tags) {
      const t = Lab.tags[k];
      let html = '';
      if (k === 'fixed') html = r ? `Sabit kap<small>${r.fixed.name}</small>` : 'Sabit kap<small>boş</small>';
      if (k === 'added') html = r ? (Lab.state === 'ready' ? `Eklenen beher<small>${r.added.name}</small>` : `Eklenen beher<small>${r.added.name}</small>`) : '';
      if (k === 'temp') html = `🌡 ${Lab.thermo.temp.toFixed(1)} °C`;
      if (t.html !== html) { t.el.innerHTML = html; t.html = html; }
      t.el.classList.toggle('drag', k === 'added' && Lab.state === 'ready');
      v.copy(t.at()).project(Lab.camera);
      const vis = html && v.z < 1 && Lab.controls.radius < 2.2 && !(k === 'added' && (Lab.state === 'pouring'));
      t.el.style.opacity = vis ? 1 : 0;
      t.el.style.left = ((v.x + 1) / 2 * w) + 'px';
      t.el.style.top = ((1 - v.y) / 2 * h) + 'px';
    }
  };

  /* ---------------- Tepkime seçimi / sıfırlama ---------------- */
  Lab.setReaction = function (r) {
    Lab.reaction = r;
    Lab.resetExperiment();
  };

  Lab.resetExperiment = function () {
    const r = Lab.reaction;
    Lab._cancelPour();
    Lab.bubbles.clear(); Lab.foam.clear(); Lab.precip.clear(); Lab.smoke.clear(); Lab.stream.hide();
    T.Audio.stopLoop('fizz', 0.1); T.Audio.stopLoop('pour', 0.1); T.Audio.stopLoop('hiss', 0.1);
    if (Lab.chips) { Lab.chips.dispose(); Lab.chips = null; }
    Lab.added.group.position.copy(Lab.addedHome);
    Lab.added.group.rotation.set(0, 0, 0);
    Lab.thermo.set(22.0);
    Lab.sim = null;
    if (!r) {
      Lab.fixed.volume = 0; Lab.added.volume = 0;
      Lab.fixed.setLabel('Sabit kap'); Lab.added.setLabel('Eklenen');
      Lab.state = 'idle';
      Lab.emit('state', Lab.state);
      return;
    }
    Lab.fixed.volume = (r.fixed.vol || 0) * VOL_K;
    Lab.added.volume = r.added.vol * VOL_K;
    Lab.fixed.setLabel(shortName(r.fixed.name));
    Lab.added.setLabel(shortName(r.added.name));
    if (r.fixed.vol) Lab.fixed.setLiquid(r.fixed.color, r.fixed.opacity); else Lab.fixed.setLiquid(r.added.color, r.added.opacity);
    Lab.added.setLiquid(r.added.color, r.added.opacity);
    Lab.stream.setColor(r.added.color, r.added.opacity);
    if (r.fixed.solid) {
      Lab.chips = new FX.Chips(Lab.fixed, r.fixed.solid);
    }
    if (r.obs.precip) Lab.precip.setup(r.obs.precip.color, r.obs.precip.amount, r.obs.precip.style);
    Lab.state = 'ready';
    Lab.emit('state', Lab.state);
  };
  function shortName(n) {
    return n.replace(' çözeltisi', '').replace(' (derişik)', '').replace(' (mermer parçaları)', '');
  }

  /* ---------------- Döküm ---------------- */
  const _tip = new THREE.Vector3();
  /** Beheri, ağız ucu 'tip' konumunda ve 'tilt' eğimiyle yerleştir */
  function setPose(b, tip, tilt) {
    b.group.rotation.set(0, 0, tilt);
    b.group.updateMatrix();
    const r = b.R + b.R * 0.17;
    const local = new THREE.Vector3(Math.cos(b.spoutAngle) * r, b.H + 0.002, Math.sin(b.spoutAngle) * r);
    local.applyEuler(b.group.rotation);
    b.group.position.copy(tip).sub(local);
  }
  function tipOf(b) { return b.spoutWorld(new THREE.Vector3()); }

  /* Gerçekçi döküm: el beheri kaldırır, kavisle sabit kabın yanına getirir, ağzını kabın kenarına
     dayar (pivot), akış sabit kalacak şekilde yavaşça eğer; bitince hafifçe geri çevirip damlamayı
     keser, kaldırır ve yerine yumuşakça bırakır. */
  function bez(p0, p1, p2, k) { const a = p0.clone().lerp(p1, k), b = p1.clone().lerp(p2, k); return a.lerp(b, k); }

  Lab.pour = function () {
    if (Lab.state !== 'ready') return false;
    T.Audio.init(); T.Audio.resume();
    const b = Lab.added;
    b.group.updateMatrixWorld(true);
    const F = Lab.fixedHome, fx = Lab.fixed;
    const startTip = tipOf(b);
    const startTilt = b.group.rotation.z;
    // ağız ucu sabit kabın kenarına, biraz içeride dayanır
    const rimTip = new THREE.Vector3(F.x + fx.R * 0.8, F.y + fx.H + 0.0045, F.z);
    const approachTip = rimTip.clone().add(new THREE.Vector3(0.028, 0.032, 0));
    Lab.pourAnim = { t: 0, phase: 'lift', startTip, startTilt, rimTip, approachTip, tilt: 0, poured: 0, total: b.volume, rate: 0 };
    Lab.state = 'pouring';
    Lab.emit('state', Lab.state);
    Lab.sim = { t: -1, mixed: 0, started: false };
    return true;
  };
  Lab._cancelPour = function () { Lab.pourAnim = null; Lab.dragging = null; };

  const DUR = { lift: 0.55, move: 1.05, settle: 0.6, stop: 0.55, back: 1.35, place: 0.35 };
  Lab._updatePour = function (dt) {
    const a = Lab.pourAnim;
    if (!a) return;
    const b = Lab.added;
    a.t += dt;
    let flow = 0;
    const tremor = (amp) => Math.sin(a.t * 7.3) * amp + Math.sin(a.t * 12.1 + 1) * amp * 0.5;
    if (a.phase === 'lift') {
      const k = U.easeInOut(a.t / DUR.lift);
      const tip = a.startTip.clone(); tip.y += 0.055 * k;
      a.tilt = U.lerp(a.startTilt, 0.06, k);
      setPose(b, tip, a.tilt);
      if (a.t >= DUR.lift) { a.phase = 'move'; a.t = 0; a.from = tip; }
    } else if (a.phase === 'move') {
      const k = U.easeInOut(a.t / DUR.move);
      const ctrl = a.from.clone().lerp(a.approachTip, 0.5); ctrl.y = Math.max(a.from.y, a.approachTip.y) + 0.04;
      a.tilt = U.lerp(0.06, 0.28, U.smooth(k));
      setPose(b, bez(a.from, ctrl, a.approachTip, k), a.tilt + tremor(0.004));
      if (a.t >= DUR.move) { a.phase = 'settle'; a.t = 0; }
    } else if (a.phase === 'settle') {
      // ağzı kenara indir ve dayamadan önce eğimi artır
      const k = U.easeInOut(a.t / DUR.settle);
      a.tilt = U.lerp(0.28, 0.62, k);
      setPose(b, a.approachTip.clone().lerp(a.rimTip, k), a.tilt);
      if (a.t >= DUR.settle) { a.phase = 'pour'; a.t = 0; T.Audio.glass(); }
    } else if (a.phase === 'pour') {
      // akış hızı ~16 mL/s civarında kalsın: hızlıysa eğimi neredeyse durdur, yavaşsa artır
      const rate = a.rate;
      const speed = rate > 18 * VOL_K ? 0.02 : rate > 10 * VOL_K ? 0.12 : 0.42;
      if (b.volume > 0.5) a.tilt = Math.min(2.1, a.tilt + speed * dt);
      setPose(b, a.rimTip, a.tilt + tremor(0.006));
      if (b.volume <= 0.5 || a.t > 12) { a.phase = 'stop'; a.t = 0; a.stopFrom = a.tilt; }
    } else if (a.phase === 'stop') {
      // son damlaları kesmek için hafifçe geri çevir, ağız hâlâ kenarda
      const k = U.easeInOut(a.t / DUR.stop);
      a.tilt = a.stopFrom - 0.45 * k;
      setPose(b, a.rimTip, a.tilt);
      if (a.t >= DUR.stop) { a.phase = 'back'; a.t = 0; a.backFrom = a.rimTip.clone(); a.backTilt = a.tilt; }
    } else if (a.phase === 'back') {
      const k = U.easeInOut(a.t / DUR.back);
      b.group.rotation.set(0, 0, 0); b.group.position.copy(Lab.addedHome); b.group.updateMatrixWorld(true);
      const homeTip = tipOf(b).add(new THREE.Vector3(0, 0.012, 0));
      const ctrl = a.backFrom.clone().lerp(homeTip, 0.5); ctrl.y = Math.max(a.backFrom.y, homeTip.y) + 0.06;
      a.tilt = a.backTilt * (1 - U.smooth(Math.min(1, k * 1.5)));
      setPose(b, bez(a.backFrom, ctrl, homeTip, k), a.tilt + tremor(0.003) * (1 - k));
      if (a.t >= DUR.back) { a.phase = 'place'; a.t = 0; a.placeFrom = homeTip; }
    } else if (a.phase === 'place') {
      const k = U.easeOut(a.t / DUR.place);
      const tip = a.placeFrom.clone(); tip.y -= 0.012 * k;
      setPose(b, tip, 0);
      if (a.t >= DUR.place) {
        b.group.position.copy(Lab.addedHome); b.group.rotation.set(0, 0, 0);
        Lab.pourAnim = null;
        T.Audio.glass();
        Lab.state = 'reacting';
        Lab.emit('state', Lab.state);
        Lab.emit('poured');
      }
    }
    // sıvı fiziği (eğimle taşma)
    flow = b.update(dt, 30 * VOL_K);
    a.rate = U.lerp(a.rate, flow / Math.max(1e-4, dt), Math.min(1, dt * 8));
    a.lastFlow = flow;
    if (flow > 0) {
      const from = tipOf(b);
      from.y -= 0.002;
      const to = new THREE.Vector3(Lab.fixedHome.x + Lab.fixed.R * 0.55, Lab.fixed.surfaceY() || (BY() + 0.004), Lab.fixedHome.z + 0.002);
      if (!Lab.fixed.volume) to.y = BY() + Lab.fixed.y0;
      Lab.stream.show(from, to, flow / dt, dt);
      Lab.fixed.volume += flow;
      Lab.fixed.wobble(1);
      a.poured += flow;
      Lab._onMix(flow, to);
      if (!a.pourSound) { T.Audio.startLoop('pour', 0.3); a.pourSound = true; }
      T.Audio.setLoop('pour', U.clamp(0.12 + (a.rate || 0) / (40 * VOL_K), 0.12, 0.42)); // akış arttıkça ses güçlenir
      T.Audio.pourFill(Lab.fixed.volume / Lab.fixed.capacity);
    } else {
      Lab.stream.hide();
      if (a && a.pourSound && a.phase !== 'pour') { T.Audio.stopLoop('pour'); a.pourSound = false; }
    }
  };

  /* ---------------- Tepkime simülasyonu ---------------- */
  Lab._onMix = function (flow, at) {
    const r = Lab.reaction, s = Lab.sim;
    if (!r || !s) return;
    if (!s.started) { s.started = true; s.t = 0; Lab.emit('mixStart'); }
    s.mixed = U.clamp(s.mixed + flow / (r.added.vol * VOL_K), 0, 1);
    // karışık renk (hacim ağırlıklı)
    const fv = r.fixed.vol || 0;
    const cur = fv + r.added.vol * s.mixed;
    const wA = (r.added.vol * s.mixed) / Math.max(1, cur);
    s.baseColor = new THREE.Color(r.fixed.vol ? r.fixed.color : r.added.color).lerp(new THREE.Color(r.added.color), r.fixed.vol ? wA : 1);
    s.baseOpacity = U.lerp(r.fixed.vol ? r.fixed.opacity : r.added.opacity, r.added.opacity, r.fixed.vol ? wA : 1);
    // çökelti anında oluşur
    if (r.obs.precip) {
      const local = Lab.fixed.group.worldToLocal(at.clone());
      Lab.precip.emit(Math.ceil(flow * 9 * r.obs.precip.amount), new THREE.Vector3(local.x, 0, local.z), Lab.fixed.Ri * 0.5);
    }
    if (r.obs.gas) { Lab.bubbles.mixPoint = Lab.fixed.group.worldToLocal(at.clone()); }
  };

  Lab._updateSim = function (dt) {
    const r = Lab.reaction, s = Lab.sim;
    if (!r || !s || !s.started) return;
    s.t += dt;
    const t = s.t, o = r.obs, m = s.mixed;
    // sıcaklık
    const T0 = 22.0, Tf = o.temp || 22;
    const temp = T0 + (Tf - T0) * Math.pow(m, 0.9) * (1 - Math.exp(-t / 2.4));
    Lab.thermo.set(temp + (Math.random() - 0.5) * 0.02);

    let liqC = s.baseColor ? s.baseColor.clone() : new THREE.Color(r.fixed.color);
    let liqO = s.baseOpacity != null ? s.baseOpacity : r.fixed.opacity;

    // renk değişimi
    if (o.tint) {
      const k = U.smooth((t - 0.8) / 4) * m;
      liqC.lerp(new THREE.Color(o.tint.color), k);
      liqO = U.lerp(liqO, o.tint.opacity, k);
    }

    // gaz
    if (o.gas) {
      const g = o.gas, dur = g.dur;
      const env = Math.min(1, t / 0.5) * (t < dur * 0.4 ? 1 : Math.exp(-(t - dur * 0.4) / (dur * 0.28)));
      const e = env * Math.pow(m, 0.6);
      Lab.bubbles.mode = g.fromSolid ? 'solid' : (t < 2.5 ? 'mix' : 'volume');
      if (g.fromSolid && Lab.chips) Lab.bubbles.sources = Lab.chips.sources();
      Lab.bubbles.sizeMul = g.foam > 0.8 ? 0.8 : 1;
      Lab.bubbles.rate = 420 * g.rate * e;
      Lab.foam.maxH = 0.003 + g.foam * 0.016;
      Lab.foam.target = g.foam * e;
      if (o.tint) Lab.foam.setColor(new THREE.Color(0xffffff).lerp(new THREE.Color(o.tint.color), 0.35));
      if (Lab.chips && o.dissolveSolid) Lab.chips.setFraction(1 - o.dissolveSolid * U.smooth(t / (dur * 1.1)) * m);
      if (e > 0.05 && !s.fizz) { T.Audio.startLoop('fizz', 0.22 * g.rate); s.fizz = true; }
      if (s.fizz) T.Audio.setLoop('fizz', 0.22 * g.rate * e);
      if (s.fizz && e < 0.03) { T.Audio.stopLoop('fizz', 1); s.fizz = false; }
      if (t > dur + 3 && !s.doneEmitted && Lab.state === 'reacting') { s.doneEmitted = true; Lab._done(); }
    }
    // çökelti
    if (o.precip) {
      if (t < 1.2 && Lab.state === 'reacting') Lab.precip.emit(Math.ceil(dt * 120 * o.precip.amount), null, Lab.fixed.Ri * 0.8);
      const tb = Lab.precip.turbidity;
      const pc = new THREE.Color(o.precip.color);
      liqC.lerp(pc, U.clamp(tb * 0.9, 0, 0.9));
      liqO = U.lerp(liqO, o.precip.style === 'gel' ? 0.78 : 0.9, U.clamp(tb * 1.1, 0, 1));
      if (t > 13 && !s.doneEmitted && Lab.state === 'reacting') { s.doneEmitted = true; Lab._done(); }
    }
    // duman
    if (o.smoke) {
      const dur = o.smoke.dur;
      const e = Math.min(1, t / 0.6) * (t < dur * 0.5 ? 1 : Math.exp(-(t - dur * 0.5) / (dur * 0.3))) * m;
      Lab.smoke.origin.set(Lab.fixedHome.x, BY() + Lab.fixed.H + 0.004, Lab.fixedHome.z);
      Lab.smoke.radius = Lab.fixed.R * 0.8;
      Lab.smoke.rate = 26 * e;
      if (e > 0.1 && !s.hiss) { T.Audio.startLoop('hiss', 0.05); s.hiss = true; }
      if (s.hiss && e < 0.1) { T.Audio.stopLoop('hiss', 1); s.hiss = false; }
      if (t > dur + 3 && !s.doneEmitted && Lab.state === 'reacting') { s.doneEmitted = true; Lab._done(); }
    }
    if (o.type === 'heat') {
      if (t > 8 && !s.doneEmitted && Lab.state === 'reacting') { s.doneEmitted = true; Lab._done(); }
    }
    Lab.fixed.setLiquid(liqC, liqO);
  };
  /** Gözlem penceresi (sn): _updateSim'deki bitiş koşullarıyla aynı. Tepkimenin türünü değil, yalnızca süreyi verir. */
  Lab.obsDuration = function (r) {
    r = r || Lab.reaction;
    if (!r) return 10;
    const o = r.obs;
    let d = 0;
    if (o.gas) d = Math.max(d, o.gas.dur + 3);
    if (o.precip) d = Math.max(d, 13);
    if (o.smoke) d = Math.max(d, o.smoke.dur + 3);
    if (o.type === 'heat') d = Math.max(d, 8);
    return d || 10;
  };
  Lab._done = function () {
    Lab.state = 'done';
    Lab.emit('state', Lab.state);
    Lab.emit('done');
  };

  /* ---------------- İşaretçi: sürükle-bırak ---------------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function setNdc(e) {
    const r = Lab.renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, Lab.camera);
  }
  function hitAdded(e) {
    setNdc(e);
    const hits = ray.intersectObject(Lab.added.group, true);
    return hits.length > 0;
  }
  Lab._pointerDown = function (e) {
    if (Lab.state !== 'ready' || Lab.paused) return false;
    if (!hitAdded(e)) return false;
    T.Audio.init(); T.Audio.resume();
    Lab.dragging = { id: e.pointerId };
    Lab.renderer.domElement.setPointerCapture(e.pointerId);
    Lab.renderer.domElement.style.cursor = 'grabbing';
    return true;
  };
  Lab._bindPointer = function (dom) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(BY() + 0.05));
    const hit = new THREE.Vector3();
    dom.addEventListener('pointermove', (e) => {
      if (Lab.dragging && Lab.dragging.id === e.pointerId) {
        setNdc(e);
        if (ray.ray.intersectPlane(plane, hit)) {
          const x = U.clamp(hit.x, -0.6, 0.65), z = U.clamp(hit.z, -0.1, 0.5);
          // sabit beherin içine girmesin
          const g = Lab.added.group;
          g.position.set(x, BY() + 0.05, z);
          const dx = x - Lab.fixedHome.x, dz = z - Lab.fixedHome.z;
          Lab.dragging.near = Math.hypot(dx, dz) < 0.15;
          if (Math.hypot(dx, dz) < 0.09) { const k = 0.09 / Math.max(0.001, Math.hypot(dx, dz)); g.position.x = Lab.fixedHome.x + dx * k; g.position.z = Lab.fixedHome.z + dz * k; }
        }
        return;
      }
      if (Lab.state === 'ready' && !Lab.paused && e.pointerType === 'mouse' && !Lab.controls.pointers.size) {
        dom.style.cursor = hitAdded(e) ? 'grab' : '';
      }
    });
    const up = (e) => {
      if (!Lab.dragging || Lab.dragging.id !== e.pointerId) return;
      const near = Lab.dragging.near;
      Lab.dragging = null;
      dom.style.cursor = '';
      if (near) { Lab.pour(); }
      else {
        // geri bırak (hafif animasyon)
        const g = Lab.added.group;
        const from = g.position.clone();
        Lab.dropAnim = { t: 0, from };
      }
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
  };

  /* ---------------- Döngü ---------------- */
  /* İsteğe bağlı çizim: sahne yalnızca bir şey değiştiğinde çizilir.
     Boştayken (kamera durgun, tepkime yok) yalnızca saat saniyede bir atlar. */
  Lab._wakeUntil = 0;
  Lab._needsRender = true;
  /** Önümüzdeki `sec` saniye boyunca her kare çiz (olay sonrası yumuşak geçişler için). */
  Lab.wake = function (sec) { Lab._wakeUntil = Math.max(Lab._wakeUntil, performance.now() + (sec || 0.5) * 1000); Lab._needsRender = true; };
  /** Bir sonraki karede bir kez çiz. */
  Lab.invalidate = function () { Lab._needsRender = true; };
  /** Canlandırılan bir şey var mı? (efektler, döküm, sürükleme, tanıtım kamerası) */
  Lab._active = function () {
    if (Lab.pourAnim || Lab.dropAnim || Lab.dragging) return true;
    if (Lab.state === 'pouring' || Lab.state === 'reacting') return true;
    const b = Lab.bubbles, f = Lab.foam, p = Lab.precip, sm = Lab.smoke, st = Lab.stream, s = Lab.sim;
    if (b.items.length || b.rate > 0.3) return true;
    if (f.mesh.visible || Math.abs(f.target - f.level) > 0.004) return true;
    if (p.items.length || p.turbidity > 0.004) return true;
    if (sm.items.length || sm.rate > 0.05) return true;
    if (st.mesh.visible || st.dropItems.length) return true;
    // bitişten sonra sıcaklık ve renk birkaç saniye daha oturur
    if (s && s.started && s.t < Lab.obsDuration() + 6) return true;
    return false;
  };
  const _lastCam = new THREE.Matrix4(), _lastProj = new THREE.Matrix4();
  // kamera yumuşak yaklaşımı sonsuza dek ~1e-16 kıpırdar: gözle görülmeyen farkı yok say
  function nearEq(a, b) {
    const x = a.elements, y = b.elements;
    for (let i = 0; i < 16; i++) if (Math.abs(x[i] - y[i]) > 1e-6) return false;
    return true;
  }
  /** Yük altında piksel oranını uyarla: yavaşsa düşür, rahatsa geri yükselt (histerezisli). */
  let _frameAvg = 1 / 60, _slow = 0, _fast = 0;
  function adaptPixelRatio(dt) {
    _frameAvg += (dt - _frameAvg) * 0.08;
    if (_frameAvg > 1 / 42) { _slow += dt; _fast = 0; } else if (_frameAvg < 1 / 56) { _fast += dt; _slow = 0; } else { _slow = 0; _fast = 0; }
    let next = Lab.pr;
    if (_slow > 1.2 && Lab.pr > Lab.prMin) next = Math.max(Lab.prMin, Lab.pr - 0.25);
    else if (_fast > 4 && Lab.pr < Lab.prMax) next = Math.min(Lab.prMax, Lab.pr + 0.25);
    if (next !== Lab.pr) {
      Lab.pr = next; _slow = 0; _fast = 0;
      Lab.renderer.setPixelRatio(next);
      Lab.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  }

  Lab._loop = function () {
    const clock = new THREE.Clock();
    let frame = 0, renderedLast = false;
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      frame++;
      // başka aşamadayken laboratuvar çalışma kartının arkasında kalır: canlı bir şey yoksa hiç çizme
      if (Lab.paused) {
        const live = Lab._active();
        if (!live && !Lab._needsRender) { renderedLast = false; return; }
        if (live && frame % 5 !== 0) return;
      }
      const ddt = Lab.paused ? dt * 5 : dt;
      Lab.controls.update(ddt);
      if (Lab.dropAnim) {
        const a = Lab.dropAnim; a.t += ddt;
        const k = U.easeInOut(a.t / 0.5);
        Lab.added.group.position.lerpVectors(a.from, Lab.addedHome, k);
        if (a.t >= 0.5) Lab.dropAnim = null;
      }
      Lab._updatePour(ddt);
      if (!Lab.pourAnim) Lab.added.update(ddt);
      Lab._updateSim(ddt);
      Lab.fixed.update(ddt);
      Lab.bubbles.update(ddt);
      Lab.foam.update(ddt);
      Lab.precip.update(ddt, Lab.sim && Lab.sim.started ? Math.max(0.05, 0.6 * Math.exp(-Lab.sim.t / 3)) : 0.1);
      Lab.smoke.update(ddt);
      Lab.stream.update(ddt);
      const clockTicked = !Lab.paused && Lab.room.userData.clock && Lab.room.userData.clock.userData.tick();
      // kamera kıpırdadı mı?
      const cam = Lab.camera;
      cam.updateMatrixWorld();
      const camMoved = !nearEq(_lastCam, cam.matrixWorld) || !nearEq(_lastProj, cam.projectionMatrix);
      const busy = Lab.paused || camMoved || Lab._active() || performance.now() < Lab._wakeUntil;
      if (!busy && !Lab._needsRender && !clockTicked) { renderedLast = false; return; }
      _lastCam.copy(cam.matrixWorld); _lastProj.copy(cam.projectionMatrix);
      Lab._needsRender = false;
      Lab._updateTags();
      Lab.renderer.render(Lab.scene, Lab.camera);
      // yalnızca art arda çizilen karelerde ölç (tek seferlik saat karesi yanıltmasın)
      if (busy && renderedLast && !Lab.paused) adaptPixelRatio(dt);
      renderedLast = busy;
    };
    loop();
  };

  Lab.setPaused = function (p) {
    Lab.invalidate();
    Lab.paused = p;
    Lab.controls.enabled = !p;
    document.getElementById('lab-tags').style.display = p ? 'none' : '';
  };

  T.Lab = Lab;
})(window.TUY);
