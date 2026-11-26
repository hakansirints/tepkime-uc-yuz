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
    close: { target: new THREE.Vector3(-0.08, 1.005, 0.18), radius: 0.75, phi: 1.19, theta: 0.04 },
    room: { target: new THREE.Vector3(0.0, 0.98, 0.12), radius: 1.6, phi: 1.0, theta: 0.3 } // bütün masa
  };

  Lab.init = async function (canvas, progress) {
    const say = (p) => progress && progress(p);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // üst sınır 2 (telefonda 1,5 uzaktaki ince çizgileri bulanıklaştırıyordu); döngü yük altında oranı uyarlar
    Lab.prMax = Math.min(window.devicePixelRatio || 1, 2);
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
    // Odak modu sisi: baştan sahnede (yoğunluk 0) — sonradan eklemek tüm gölgelendiricileri yeniden derletir
    scene.fog = new THREE.FogExp2(0x2c3439, 0); // stüdyo arka planıyla aynı ton (temaya göre değişir)
    Lab.scene = scene;
    applyTheme();
    // tema değişince (ayarlar ya da sistem) arka plan da değişir — makroskobik panellerdeki gibi
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.02, 40);
    Lab.camera = camera;
    await tick();
    scene.environment = T.makeEnvironment(renderer);
    scene.environmentIntensity = 1; // r158'de yok sayılır
    say(30);

    // Işıklar
    // ortam ışığı biraz kısık: masadaki gölgeler yıkanıp kaybolmasın
    // oda tavan lambaları kalktı: ortam ışığı onların payını alır
    const hemi = new THREE.HemisphereLight(0xf2f6ff, 0x8b8577, 0.72);
    scene.add(hemi);
    // pencere ışığı nötr ve biraz kısık: masadaki belirgin gölgeyi tavan lambası verir
    const sun = new THREE.DirectionalLight(0xfff6ec, 1.75);
    sun.position.set(-4.2, 3.6, 1.2);
    sun.target.position.set(0, BY(), 0);
    sun.castShadow = true;
    // gölge yalnızca masayı kapsar: küçük harita aynı (hatta daha yüksek) netlik verir
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -1.1; sc.right = 1.1; sc.top = 1.0; sc.bottom = -1.0; sc.near = 1; sc.far = 9;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    // deney masasının üstünde tavan lambası: gün ışığına yakın nötr beyaz (≈5500 K, çözelti renklerini
    // kaydırmaz), dar ve yumuşak kenarlı ışık havuzu; dar açı gölge haritasının çözünürlüğünü masaya toplar
    const ceil = new THREE.SpotLight(0xfffaf4, 16, 6, 0.62, 0.7, 2);
    // lamba öğrencinin biraz önünde-sağında: gölgeler kapların altında kaybolmaz, geriye-sola düşer
    ceil.position.set(0.45, 2.95, 0.95);
    ceil.target.position.set(-0.04, BY(), 0.16);
    ceil.castShadow = true;
    ceil.shadow.mapSize.set(1024, 1024);
    ceil.shadow.bias = -0.0003; ceil.shadow.normalBias = 0.015; ceil.shadow.radius = 6;
    scene.add(ceil, ceil.target);
    const fill = new THREE.PointLight(0xffffff, 3, 8, 2);
    fill.position.set(1.5, 2.6, 2.4);
    scene.add(fill);
    say(40);
    await tick();

    // Oda
    Lab.room = T.Room.buildRoom(scene);
    say(70);
    await tick();

    // güvenlik ekipmanı: gözlük ve eldivenler masada, termometrenin solunda
    {
      const P = T.Props;
      Lab.SAFETY_HOME = new THREE.Vector3(-0.30, BY(), 0.115);
      if (P.safetyGear) { // önbellekte eski props.js kalmışsa laboratuvar yine açılsın
        Lab.safetyGear = P.safetyGear();
        Lab.safetyGear.position.copy(Lab.SAFETY_HOME);
        scene.add(Lab.safetyGear);
      }
    }

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
    // yalnızca masa: önden ±40° dönme, 15–55° arası eğik bakış, masanın içinde kaydırma
    Lab.controls.limits = { thetaMin: -0.7, thetaMax: 0.7, phiMin: 0.61, phiMax: 1.31, rMin: 0.3, rMax: 1.7,
      xMin: -0.55, xMax: 0.55, zMin: -0.12, zMax: 0.42 };
    Lab.DEFAULT_LIMITS = Object.assign({}, Lab.controls.limits);
    Lab.controls.setView(VIEWS.bench, true);
    Lab.viewName = 'bench';
    Lab.controls.blockers.push((e) => Lab._pointerDown(e));
    // aşama değişince kamera kaplara yeniden odaklanır; aradaki sürede kullanıcının kamerasına dokunulmaz
    Lab.on('state', (s) => {
      document.documentElement.classList.toggle('lab-busy', s === 'pouring' || s === 'reacting');
      if (s !== 'idle' && Lab.ready) Lab.autoView(s);
    });
    const camBtn = document.getElementById('btn-cam-reset');
    if (camBtn) camBtn.addEventListener('click', () => { if (Lab.reaction) Lab.autoView(); else Lab.setView('bench'); });

    Lab._bindPointer(canvas);
    Lab._makeTags();
    if (window.ResizeObserver) new ResizeObserver(Lab.resize).observe(canvas);
    else window.addEventListener('resize', Lab.resize);
    // iOS/WebKit döndürmede ve adres çubuğu kayınca ölçüyü geç günceller: biraz bekleyip yeniden ölç
    const later = () => { Lab.resize(); setTimeout(Lab.resize, 250); setTimeout(Lab.resize, 700); };
    window.addEventListener('orientationchange', later);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
    Lab.resize();

    // İlk derleme
    renderer.compile(scene, camera);
    say(100);
    Lab.ready = true;
    Lab._loop();
    return Lab;
  };
  function tick() { return new Promise((r) => setTimeout(r, 16)); }

  /* Stüdyo arka planı: yumuşak kenar karartması; ışık masada toplanır, dikkat kaplarda kalır.
     Koyu temada koyu gri stüdyo, açık temada makroskobik panellerdeki gibi beyazdan açık griye-maviye.
     Tek küçük doku (oda modeli yerine), ek çizim yok. */
  const BACKDROP = {
    dark: { stops: ['#5d6a72', '#2c3439', '#14181b'], fog: 0x2c3439 },
    light: { stops: ['#ffffff', '#e4eaf2', '#c3cedd'], fog: 0xe4eaf2 }
  };
  function makeBackdrop(mode) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(256, 300, 30, 256, 300, 380);
    const s = BACKDROP[mode].stops;
    g.addColorStop(0, s[0]);
    g.addColorStop(0.55, s[1]);
    g.addColorStop(1, s[2]);
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function applyTheme() {
    const scene = Lab.scene;
    if (!scene) return;
    const mode = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    if (Lab._bgMode === mode) return;
    Lab._bgMode = mode;
    if (scene.background && scene.background.dispose) scene.background.dispose();
    scene.background = makeBackdrop(mode);
    if (scene.fog) scene.fog.color.setHex(BACKDROP[mode].fog);
    if (Lab.invalidate) Lab.invalidate();
  }

  Lab.resize = function () {
    // Dönüş sırasında da kamera ve çizim alanı tuvalin ekrandaki ölçülerini kullanır.
    const { clientWidth: w, clientHeight: h } = Lab.renderer.domElement;
    if (!w || !h) return;
    Lab._cw = w; Lab._ch = h;
    Lab.renderer.setSize(w, h, false);
    Lab._fr = Lab.freeRect();
    Lab._updateOffset(0, true);
    Lab.invalidate();
    // setSize tuvali temizler: boş kare görünmesin diye hemen yeniden çiz
    if (Lab.ready) Lab.renderer.render(Lab.scene, Lab.camera);
  };

  Lab.setView = function (name) {
    // 'close': deneyin aşamasına göre kapları ekrana sığdıran görünüm
    if (name === 'close' && Lab.reaction) { Lab.autoView(); Lab.viewName = 'close'; return; }
    if (VIEWS[name]) {
      Lab.controls.focus = null;
      Lab.controls.setView(Object.assign({ limits: Lab.DEFAULT_LIMITS }, VIEWS[name]));
      Lab.viewName = name;
    }
  };

  /* ---------------- Kamera çerçeveleme ----------------
     1) Boş alan: paneller, üst bar ve alttaki düğme şeridinin kapatmadığı dikdörtgen.
        Kameranın görüş merkezi bu alanın ortasına kaydırılır (setViewOffset); kaplar panellerin altında kalmaz.
     2) Aşamaya göre görünüm: kapların kapladığı kutu, boş alanın belli bir oranını dolduracak uzaklıktan gösterilir. */
  const FOV = 40;
  const FRAME = { h: 0.55, w: 0.9 }; // kutu, boş alanın yüksekliğinin %55'ini, genişliğinin %90'ını geçmez
  const COVER = ['#topbar', '#obs-timer', '#reaction-panel', '#m-rail', '#notebook', '#temp-graph', '#lab-dock', '#safety-card'];
  Lab.freeRect = function () {
    const W = Lab._cw || window.innerWidth, H = Lab._ch || window.innerHeight;
    const f = { l: 0, t: 0, r: W, b: H };
    COVER.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.3 || el.classList.contains('hidden')) return;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.right < 0 || r.left > W || r.bottom < 0 || r.top > H) return;
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      const side = cx < W * 0.4 ? -1 : cx > W * 0.6 ? 1 : 0;
      if (side) {
        // köşede kalan kısa panel (ör. üst soldaki seçilen maddeler) kapları örtmez: yok say
        if (r.bottom < H * 0.45 || r.top > H * 0.8) return;
        if (side < 0) f.l = Math.max(f.l, r.right); else f.r = Math.min(f.r, r.left);
      } else if (cy < H / 2) f.t = Math.max(f.t, r.bottom);
      else f.b = Math.min(f.b, r.top);
    });
    // çok daralırsa (ör. iki panel birden açık) panelleri yok say
    if (f.r - f.l < W * 0.3) { f.l = 0; f.r = W; }
    if (f.b - f.t < H * 0.35) { f.t = 0; f.b = H; }
    return { x: (f.l + f.r) / 2, y: (f.t + f.b) / 2, w: f.r - f.l, h: f.b - f.t, W, H };
  };
  Lab._vo = null; // şu anki görüş merkezi (yumuşak geçiş için)
  Lab._updateOffset = function (dt, force) {
    const fr = Lab._fr || (Lab._fr = Lab.freeRect());
    const W = fr.W, H = fr.H;
    if (!Lab._vo || force) Lab._vo = { x: fr.x, y: fr.y };
    else {
      const k = 1 - Math.exp(-dt * 7);
      const nx = Lab._vo.x + (fr.x - Lab._vo.x) * k, ny = Lab._vo.y + (fr.y - Lab._vo.y) * k;
      if (Math.abs(nx - Lab._vo.x) < 0.05 && Math.abs(ny - Lab._vo.y) < 0.05 && Lab._voW === W && Lab._voH === H) return false;
      Lab._vo.x = nx; Lab._vo.y = ny;
    }
    Lab._voW = W; Lab._voH = H;
    const cx = Lab._vo.x, cy = Lab._vo.y;
    const fw = 2 * Math.max(cx, W - cx), fh = 2 * Math.max(cy, H - cy);
    const cam = Lab.camera;
    // ölçek değişmesin: büyütülmüş sanal kadrajın görüş açısı orantılı genişletilir
    cam.fov = 2 * Math.atan(Math.tan(FOV * Math.PI / 360) * fh / H) * 180 / Math.PI;
    cam.aspect = fw / fh;
    cam.setViewOffset(fw, fh, fw / 2 - cx, fh / 2 - cy, W, H);
    cam.updateProjectionMatrix();
    return true;
  };

  /** Deneyin durumuna göre ilgilenilen kutu: [xmin, xmax, ymin, ymax, z] */
  Lab._interest = function (state) {
    const F = Lab.fixedHome, A = Lab.addedHome, by = BY();
    const fx = Lab.fixed, ad = Lab.added;
    const thermoX = F.x - 0.14;
    if (state === 'reacting') return [thermoX, F.x + fx.R + 0.01, by, by + fx.H + 0.02, F.z];
    if (state === 'pouring') return [F.x - fx.R - 0.02, A.x + ad.R + 0.01, by, by + fx.H + 0.09, (F.z + A.z) / 2];
    return [thermoX, A.x + ad.R + 0.01, by, by + fx.H + 0.02, (F.z + A.z) / 2];
  };
  Lab.autoView = function (state, instant) {
    if (!Lab.ready) return;
    state = state || Lab.state;
    if (state === 'idle') { Lab.setView('bench'); return; }
    const [x0, x1, y0, y1, z] = Lab._interest(state);
    const fr = Lab._fr = Lab._fitFr = Lab.freeRect();
    const t = Math.tan(FOV * Math.PI / 360);
    // ekranda 1 m = H / (2·d·tan) piksel; kutu boş alanın FRAME oranını doldursun
    const dh = (y1 - y0) * fr.H / (2 * t * FRAME.h * fr.h);
    const dw = (x1 - x0) * fr.H / (2 * t * FRAME.w * fr.w);
    const L = Lab.DEFAULT_LIMITS;
    const radius = U.clamp(Math.max(dh, dw) * 1.08, L.rMin, 1.2);
    const target = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, z);
    const c = Lab.controls;
    c.focus = target.clone();
    // kaydırma kapların çevresinde kalır: kaplar boş alanın dışına itilemez
    const limits = Object.assign({}, L, { xMin: target.x - 0.28, xMax: target.x + 0.28, zMin: target.z - 0.22, zMax: target.z + 0.22 });
    c.setView({ target, radius, phi: state === 'reacting' ? 1.08 : 1.12, theta: 0.04, limits }, instant);
    c.userMoved = false;
    Lab.viewName = 'close';
    Lab.wake(1.5);
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

  /* ---------------- Güvenlik ekipmanı ----------------
     İlk deneyde gözlük ve eldiven masada durur; "takmak" tek dokunuşluk bir adımdır (ceza yok).
     Takılınca masadan kalkar (kullanıcıya geçer) ve arayüzde simge olarak kalır. */
  const SAFETY_KEY = 'tuy-guvenlik';
  Lab.safetyWorn = function () { try { return localStorage.getItem(SAFETY_KEY) === '1'; } catch (e) { return !!Lab._safetyMem; } };
  /** Dökmeden önce çağrılır: false dönerse döküm başlamaz (arayüz önce güvenlik adımını gösterir). */
  Lab.beforePour = null;
  Lab.wearSafety = function (instant) {
    Lab._safetyMem = true;
    try { localStorage.setItem(SAFETY_KEY, '1'); } catch (e) { /* özel pencere */ }
    const g = Lab.safetyGear;
    if (g && g.visible) {
      if (instant) g.visible = false;
      else Lab.safetyAnim = { t: 0, from: g.position.clone() };
    }
    Lab.emit('safety', true);
  };
  Lab.resetSafety = function () {
    Lab._safetyMem = false;
    try { localStorage.removeItem(SAFETY_KEY); } catch (e) { /* */ }
    const g = Lab.safetyGear;
    if (g) { g.visible = true; g.scale.setScalar(1); g.position.copy(Lab.SAFETY_HOME); }
    Lab.safetyAnim = null;
    Lab.emit('safety', false);
  };
  function updateSafetyAnim(dt) {
    const a = Lab.safetyAnim, g = Lab.safetyGear;
    if (!a) return;
    a.t += dt;
    // kaldırılıp kameraya (kullanıcıya) doğru süzülür ve küçülerek kaybolur
    const k = U.easeInOut(Math.min(1, a.t / 0.7));
    const to = Lab.camera.position.clone().lerp(a.from, 0.55);
    g.position.lerpVectors(a.from, to, k);
    g.scale.setScalar(1 - 0.85 * k);
    if (a.t >= 0.7) { g.visible = false; g.position.copy(a.from); g.scale.setScalar(1); Lab.safetyAnim = null; }
  }

  Lab.pour = function () {
    if (Lab.state !== 'ready') return false;
    if (Lab.beforePour && !Lab.beforePour()) return false;
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
    // sıcaklık–zaman kaydı (grafik için): 0,1 sn simülasyon aralıkla, gözlem penceresi + birkaç sn
    s.log = s.log || [];
    if (t < Lab.obsDuration() + 4 && (!s.log.length || t - s.log[s.log.length - 1][0] >= 0.1)) s.log.push([t, Lab.thermo.temp]);

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
      // ses ipucu: çökelti belirdiği anda yumuşak bir ton (görme dışında ikinci kanal)
      if (t > 0.35 && !s.precipCue && Lab.state === 'reacting') { s.precipCue = true; T.Audio.precipCue(); }
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
    // masadaki gözlük/eldivene dokunmak da onları takar
    if (!Lab.paused && Lab.safetyGear && Lab.safetyGear.visible && !Lab.safetyAnim) {
      setNdc(e);
      if (ray.intersectObject(Lab.safetyGear, true).length) { T.Audio.init(); T.Audio.resume(); Lab.emit('safetyTap'); return true; }
    }
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
      if (!(near && Lab.pour())) {
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
    if (Lab.pourAnim || Lab.dropAnim || Lab.dragging || Lab.safetyAnim) return true;
    if (Math.abs(Lab.focus - Lab._focusTarget()) > 0.002) return true;
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
  /* ---------- Odak modu ----------
     Döküm ve tepkime sürerken oda hafifçe sise gömülür (uzaklıkla artan, masada ~%1) ve ekran kenarları
     bulanıklaşır (#focus-veil); masa ve kaplar net kalır. Gerçekçilik korunur, dikkat kaplara toplanır. */
  Lab.focus = 0;
  const FOCUS_DENSITY = 0.15;
  Lab._focusTarget = function () {
    return !Lab.paused && (Lab.state === 'pouring' || Lab.state === 'reacting') ? 1 : 0;
  };
  function updateFocus(dt) {
    const target = Lab._focusTarget();
    if (Lab.focus === target) return;
    // girişte yumuşak (~0,8 sn), çıkışta biraz daha yavaş
    const k = 1 - Math.exp(-dt / (target > Lab.focus ? 0.28 : 0.45));
    Lab.focus += (target - Lab.focus) * k;
    if (Math.abs(target - Lab.focus) < 0.002) Lab.focus = target;
    Lab.scene.fog.density = FOCUS_DENSITY * Lab.focus;
    document.body.classList.toggle('lab-focus', target === 1);
  }

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
    }
  }

  Lab._loop = function () {
    const clock = new THREE.Clock();
    let frame = 0, renderedLast = false;
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      frame++;
      // güvenlik ağı: tarayıcı boyut değişimini haber vermese de tuval ölçüsü değiştiyse yeniden ayarla
      if (frame % 10 === 0) {
        const el = Lab.renderer.domElement;
        if (el.clientWidth && (el.clientWidth !== Lab._cw || el.clientHeight !== Lab._ch)) Lab.resize();
      }
      // panel açılıp kapanınca boş alan değişir: görüş merkezi yumuşakça yeni alana kayar
      if (!Lab.paused) {
        if (frame % 15 === 0) {
          Lab._fr = Lab.freeRect();
          // panel açılıp kapandı ve kullanıcı kamerayı oynatmadıysa kaplar yeni alana yeniden sığdırılır
          const a = Lab._fitFr, f = Lab._fr;
          if (a && Lab.viewName === 'close' && !Lab.controls.userMoved && Lab.state !== 'idle' &&
              (Math.abs(f.w - a.w) > a.w * 0.12 || Math.abs(f.h - a.h) > a.h * 0.12)) Lab.autoView();
        }
        Lab._updateOffset(dt);
      }
      // başka aşamadayken laboratuvar çalışma kartının arkasında kalır: canlı bir şey yoksa hiç çizme
      if (Lab.paused) {
        const live = Lab._active();
        if (!live && !Lab._needsRender) { renderedLast = false; return; }
        if (live && frame % 5 !== 0) return;
      }
      const ddt = Lab.paused ? dt * 5 : dt;
      Lab.controls.update(ddt);
      updateFocus(dt);
      if (Lab.dropAnim) {
        const a = Lab.dropAnim; a.t += ddt;
        const k = U.easeInOut(a.t / 0.5);
        Lab.added.group.position.lerpVectors(a.from, Lab.addedHome, k);
        if (a.t >= 0.5) Lab.dropAnim = null;
      }
      updateSafetyAnim(ddt);
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
      // yalnızca art arda çizilen karelerde ölç (tek seferlik saat karesi yanıltmasın).
      // Oran değişirse setSize tuvali temizler: bu yüzden ÇİZİMDEN ÖNCE uygulanır; sonra
      // yapılırsa o kare boş tuval olarak ekrana düşer (açık temada beyaz parlama).
      if (busy && renderedLast && !Lab.paused) adaptPixelRatio(dt);
      Lab.renderer.render(Lab.scene, Lab.camera);
      renderedLast = busy;
    };
    loop();
  };

  Lab.setPaused = function (p) {
    Lab.invalidate();
    Lab.paused = p;
    Lab.controls.enabled = !p;
    document.getElementById('lab-tags').style.display = p ? 'none' : '';
    // çalışma kartı açılınca odak modu hemen kalkar (kart zaten sahneyi örter)
    if (p) { Lab.focus = 0; if (Lab.scene) Lab.scene.fog.density = 0; document.body.classList.remove('lab-focus'); }
  };

  T.Lab = Lab;
})(window.TUY);
