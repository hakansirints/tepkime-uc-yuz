/* Malzemeler ve laboratuvar eşyaları (şişe, erlen, tüp, piset, bek, musluk, tabure…). */
(function (T) {
  'use strict';
  const U = T.U;
  const P = {};

  /* ---------------- Malzemeler ---------------- */
  const M = {};
  P.initMaterials = function () {
    M.steel = new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 1, roughness: 0.28 });
    M.brushed = new THREE.MeshStandardMaterial({ color: 0xb4bac0, metalness: 1, roughness: 0.42 });
    M.chrome = new THREE.MeshStandardMaterial({ color: 0xeef2f5, metalness: 1, roughness: 0.08 });
    M.blackPlastic = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.55 });
    M.whitePlastic = new THREE.MeshStandardMaterial({ color: 0xf1f2ef, roughness: 0.45 });
    M.bluePlastic = new THREE.MeshStandardMaterial({ color: 0x2563b8, roughness: 0.4 });
    M.redPaint = new THREE.MeshStandardMaterial({ color: 0xc8161d, roughness: 0.3, metalness: 0.1 });
    M.rubber = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.85 });
    M.orangeHose = new THREE.MeshStandardMaterial({ color: 0xd9622b, roughness: 0.55 });
    M.brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.3 });
    return M;
  };
  P.M = M;

  /** Gerçekçi cam: yansımalar tam, arka plan hafifçe süzülür (ön-çarpımlı karışım). */
  P.glass = function (opts) {
    opts = opts || {};
    const m = new THREE.MeshPhysicalMaterial({
      color: opts.color != null ? opts.color : 0x0e1316,
      metalness: 0, roughness: opts.roughness != null ? opts.roughness : 0.03,
      transparent: true, opacity: opts.opacity != null ? opts.opacity : 0.1,
      envMapIntensity: opts.env != null ? opts.env : 1.5,
      clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5, specularIntensity: 1,
      side: opts.side || THREE.FrontSide, depthWrite: false
    });
    m.blending = THREE.CustomBlending;
    m.blendEquation = THREE.AddEquation;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = THREE.OneMinusSrcAlphaFactor;
    // Fresnel kenar parlaması: camın kenarları gerçekteki gibi daha belirgin görünür
    const edge = opts.edge != null ? opts.edge : (m.side === THREE.BackSide ? 0.12 : 0.3);
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
        `float frE = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
         gl_FragColor.rgb += vec3(0.78, 0.86, 0.9) * pow(frE, 2.6) * ${edge.toFixed(3)};
         #include <dithering_fragment>`);
    };
    m.customProgramCacheKey = () => 'glass-edge-' + edge.toFixed(3);
    return m;
  };
  /** Renkli cam (amber şişe vb.) */
  P.tintedGlass = function (hex, opacity) {
    return new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.06, metalness: 0, transparent: true, opacity: opacity || 0.8,
      clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4, depthWrite: true });
  };
  /** Sıvı malzemesi */
  P.liquid = function (hex, opacity) {
    return new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.08, metalness: 0, transparent: true, opacity: opacity,
      envMapIntensity: 1.2, clearcoat: 0.6, depthWrite: false, side: THREE.FrontSide });
  };

  /* ---------------- Geometri yardımcıları ---------------- */
  P.lathe = function (pts, seg) {
    return new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg || 48);
  };
  P.mesh = function (geo, mat, opts) {
    const m = new THREE.Mesh(geo, mat);
    if (opts) {
      if (opts.pos) m.position.set(...opts.pos);
      if (opts.rot) m.rotation.set(...opts.rot);
      if (opts.scale) m.scale.set(...opts.scale);
      if (opts.cast !== false) m.castShadow = true;
      if (opts.receive !== false) m.receiveShadow = true;
      if (opts.order != null) m.renderOrder = opts.order;
    } else { m.castShadow = true; m.receiveShadow = true; }
    return m;
  };
  P.box = (w, h, d, mat, pos, opts) => P.mesh(new THREE.BoxGeometry(w, h, d), mat, Object.assign({ pos }, opts || {}));
  P.cyl = (rt, rb, h, mat, pos, seg, opts) => P.mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), mat, Object.assign({ pos }, opts || {}));

  /** Yuvarlatılmış kenarlı kutu (ExtrudeGeometry + bevel) */
  /** holes: [{x, z, w, d}] — üst yüzeyde dikdörtgen delikler (ör. lavabo yuvası), yerel x/z ile */
  P.roundBox = function (w, h, d, r, mat, holes) {
    const s = new THREE.Shape();
    const x = -w / 2 + r, y = -d / 2 + r, ww = w - 2 * r, dd = d - 2 * r;
    s.moveTo(x, y); s.lineTo(x + ww, y); s.quadraticCurveTo(x + ww + r, y, x + ww + r, y + r);
    s.lineTo(x + ww + r, y + dd); s.quadraticCurveTo(x + ww + r, y + dd + r, x + ww, y + dd + r);
    s.lineTo(x, y + dd + r); s.quadraticCurveTo(x - r, y + dd + r, x - r, y + dd); s.lineTo(x - r, y + r);
    s.quadraticCurveTo(x - r, y, x, y);
    const bev = Math.min(0.006, h * 0.3);
    (holes || []).forEach((o) => {
      // döndürmeden sonra şekil y'si dünya -z'sine denk gelir; pah deliği daralttığı için pay bırak
      const hw = o.w / 2 + bev, hd = o.d / 2 + bev, cx = o.x, cy = -o.z;
      const p = new THREE.Path();
      p.moveTo(cx - hw, cy - hd); p.lineTo(cx - hw, cy + hd); p.lineTo(cx + hw, cy + hd); p.lineTo(cx + hw, cy - hd); p.lineTo(cx - hw, cy - hd);
      s.holes.push(p);
    });
    const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -h / 2 + bev, 0);
    return P.mesh(g, mat);
  };

  /** Cam kabın iki geçişli çizimi: arka yüz (iç duvar) ve ön yüz */
  P.glassShell = function (geo, opts) {
    const g = new THREE.Group();
    const back = new THREE.Mesh(geo, P.glass(Object.assign({}, opts, { side: THREE.BackSide, env: 1.1 })));
    back.renderOrder = 1;
    const front = new THREE.Mesh(geo, P.glass(opts));
    front.renderOrder = 10;
    g.add(back, front);
    return g;
  };

  /* ---------------- Eşyalar ---------------- */

  /** Reaktif şişesi */
  P.bottle = function (o) {
    o = o || {};
    const g = new THREE.Group();
    const h = o.h || 0.2, r = o.r || 0.042;
    const prof = [[0, 0], [r * 0.92, 0], [r, 0.006], [r, h * 0.68], [r * 0.82, h * 0.78], [r * 0.4, h * 0.86], [r * 0.38, h * 0.93], [0, h * 0.93]];
    const body = P.mesh(P.lathe(prof, 40), o.amber ? P.tintedGlass(0x6b3410, 0.86) : P.tintedGlass(0xdfe8ea, 0.35));
    g.add(body);
    if (!o.amber && o.fill) {
      const lq = P.mesh(P.lathe([[0, 0.004], [r * 0.9, 0.004], [r * 0.93, h * 0.5], [0, h * 0.5]], 32), new THREE.MeshStandardMaterial({ color: o.fill, roughness: 0.2, transparent: true, opacity: 0.7 }));
      g.add(lq);
    }
    const cap = P.cyl(r * 0.43, r * 0.43, h * 0.11, o.capMat || M.blackPlastic, [0, h * 0.975, 0], 24);
    g.add(cap);
    if (o.label) {
      const lab = P.mesh(new THREE.CylinderGeometry(r * 1.004, r * 1.004, h * 0.34, 32, 1, true, -0.95, 1.9),
        new THREE.MeshStandardMaterial({ map: o.label, roughness: 0.7 }), { cast: false });
      lab.position.y = h * 0.36;
      g.add(lab);
    }
    return g;
  };

  /** Erlenmeyer */
  P.erlen = function (o) {
    o = o || {};
    const s = o.s || 1;
    const prof = [[0, 0.001], [0.036, 0.001], [0.041, 0.006], [0.042, 0.012], [0.016, 0.085], [0.0145, 0.092], [0.0145, 0.118], [0.0165, 0.121], [0.0165, 0.124]].map(([a, b]) => [a * s, b * s]);
    const g = P.glassShell(P.lathe(prof, 48));
    if (o.fill) {
      const lq = new THREE.Mesh(P.lathe([[0, 0.003 * s], [0.039 * s, 0.003 * s], [0.04 * s, 0.012 * s], [0.03 * s, 0.04 * s], [0, 0.04 * s]], 40), P.liquid(o.fill, o.op || 0.55));
      lq.renderOrder = 3; g.add(lq);
    }
    return g;
  };

  /** Dereceli silindir (mezür) */
  P.gradCylinder = function () {
    const g = new THREE.Group();
    const base = P.mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.012, 6), M.bluePlastic, { pos: [0, 0.006, 0] });
    g.add(base);
    const prof = [[0, 0.012], [0.016, 0.012], [0.016, 0.27], [0.019, 0.276], [0.017, 0.28]];
    g.add(P.glassShell(P.lathe(prof, 32)));
    return g;
  };

  /** Deney tüpü ve sporu */
  P.testTubeRack = function () {
    const g = new THREE.Group();
    const mat = M.whitePlastic;
    const W = 0.2, D = 0.06;
    g.add(P.box(W, 0.006, D, mat, [0, 0.003, 0]));
    g.add(P.box(W, 0.006, D, mat, [0, 0.07, 0]));
    g.add(P.box(0.006, 0.07, D, mat, [-W / 2, 0.035, 0]));
    g.add(P.box(0.006, 0.07, D, mat, [W / 2, 0.035, 0]));
    const colors = [0xf7c518, null, 0x3aa0e0, 0xf4f4f0, null, 0x3fb3a3];
    colors.forEach((c, i) => {
      const x = -W / 2 + 0.022 + i * 0.031;
      const tube = new THREE.Group();
      const prof = [];
      for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI / 2; prof.push([Math.sin(a) * 0.0075, 0.0075 - Math.cos(a) * 0.0075]); }
      prof.push([0.0075, 0.15], [0.0085, 0.152]);
      tube.add(P.glassShell(P.lathe(prof, 20)));
      if (c != null) {
        const lq = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.05, 16), P.liquid(c, 0.75));
        lq.position.y = 0.03; lq.renderOrder = 3; tube.add(lq);
      }
      tube.position.set(x, 0.004, 0);
      g.add(tube);
    });
    return g;
  };

  /** Piset (yıkama şişesi) */
  P.washBottle = function () {
    const g = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xeef2f2, roughness: 0.45, transmission: 0, transparent: true, opacity: 0.88 });
    const prof = [[0, 0], [0.036, 0], [0.04, 0.008], [0.04, 0.14], [0.03, 0.165], [0.014, 0.172], [0, 0.172]];
    g.add(P.mesh(P.lathe(prof, 36), mat));
    const water = P.mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.09, 30), new THREE.MeshStandardMaterial({ color: 0xcfe7f3, transparent: true, opacity: 0.35, roughness: 0.2 }), { pos: [0, 0.05, 0] });
    g.add(water);
    g.add(P.cyl(0.016, 0.016, 0.02, M.whitePlastic, [0, 0.18, 0], 20));
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.19, 0), new THREE.Vector3(0, 0.23, 0), new THREE.Vector3(0.02, 0.245, 0), new THREE.Vector3(0.06, 0.24, 0), new THREE.Vector3(0.085, 0.225, 0)]);
    g.add(P.mesh(new THREE.TubeGeometry(curve, 24, 0.0032, 8), M.whitePlastic));
    return g;
  };

  /** Koruyucu gözlük */
  P.goggles = function () {
    const g = new THREE.Group();
    const lens = new THREE.MeshPhysicalMaterial({ color: 0xdfe9ee, roughness: 0.05, transparent: true, opacity: 0.4, clearcoat: 1 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x2a7bd1, roughness: 0.5 });
    const shield = P.mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32, 1, true, -1.1, 2.2), lens);
    shield.rotation.x = Math.PI / 2; shield.rotation.z = Math.PI;
    shield.position.set(0, 0.026, 0.0);
    g.add(shield);
    const rim = P.mesh(new THREE.TorusGeometry(0.075, 0.004, 8, 40, 2.2), frame);
    rim.rotation.x = -Math.PI / 2; rim.rotation.z = -Math.PI / 2 - 1.1 + Math.PI;
    rim.position.y = 0.002; g.add(rim);
    const band = P.mesh(new THREE.TorusGeometry(0.08, 0.006, 6, 40, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.9 }));
    band.rotation.x = -Math.PI / 2; band.rotation.z = Math.PI * 0.4; band.position.y = 0.006;
    g.add(band);
    g.scale.setScalar(0.95);
    return g;
  };

  /** Bunsen beki ve gaz hortumu */
  P.bunsen = function (hoseTo) {
    const g = new THREE.Group();
    g.add(P.cyl(0.04, 0.045, 0.012, M.blackPlastic, [0, 0.006, 0], 32));
    g.add(P.cyl(0.006, 0.006, 0.03, M.brushed, [0, 0.025, 0], 16));
    g.add(P.cyl(0.0085, 0.0085, 0.13, M.chrome, [0, 0.1, 0], 24));
    g.add(P.cyl(0.0105, 0.0105, 0.02, M.brass, [0, 0.045, 0], 24));
    const inlet = P.cyl(0.004, 0.004, 0.04, M.brushed, [0.02, 0.02, 0], 12); inlet.rotation.z = Math.PI / 2; g.add(inlet);
    if (hoseTo) {
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.04, 0.02, 0), new THREE.Vector3(0.12, 0.012, 0.02), hoseTo.clone().add(new THREE.Vector3(-0.05, -0.02, 0)), hoseTo]);
      g.add(P.mesh(new THREE.TubeGeometry(c, 40, 0.006, 10), M.orangeHose));
    }
    return g;
  };

  /** Gaz vanası */
  P.gasValve = function () {
    const g = new THREE.Group();
    g.add(P.cyl(0.012, 0.014, 0.05, M.brushed, [0, 0.025, 0], 16));
    const handle = P.box(0.05, 0.008, 0.012, new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.4 }), [0, 0.054, 0]);
    g.add(handle);
    const noz = P.cyl(0.005, 0.005, 0.04, M.brushed, [0.02, 0.035, 0], 12); noz.rotation.z = Math.PI / 2; g.add(noz);
    return g;
  };

  /** Kuğu boyunlu laboratuvar musluğu */
  P.faucet = function () {
    const g = new THREE.Group();
    g.add(P.cyl(0.022, 0.026, 0.03, M.chrome, [0, 0.015, 0], 24));
    g.add(P.cyl(0.012, 0.012, 0.2, M.chrome, [0, 0.13, 0], 20));
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.23, 0), new THREE.Vector3(0, 0.3, 0.0), new THREE.Vector3(0, 0.33, 0.06), new THREE.Vector3(0, 0.3, 0.13), new THREE.Vector3(0, 0.25, 0.15)]);
    g.add(P.mesh(new THREE.TubeGeometry(c, 40, 0.011, 16), M.chrome));
    [-1, 1].forEach((s) => {
      const arm = P.cyl(0.006, 0.006, 0.05, M.chrome, [s * 0.03, 0.08, 0], 12); arm.rotation.z = Math.PI / 2; g.add(arm);
      g.add(P.box(0.012, 0.05, 0.012, s < 0 ? new THREE.MeshStandardMaterial({ color: 0xc0392b }) : new THREE.MeshStandardMaterial({ color: 0x2471a3 }), [s * 0.058, 0.08, 0]));
    });
    return g;
  };

  /** Lavabo (tezgâha gömülü) */
  P.sink = function (w, d) {
    const g = new THREE.Group();
    // fırçalanmış paslanmaz çelik hazne: iç yüzeyler hafif koyu, taban gidere doğru eğimli görünür
    // Ortam yansıması zayıf olduğu için metallik değer orta tutuldu; aksi hâlde iç duvarlar kararıyor.
    const steel = new THREE.MeshStandardMaterial({ color: 0xaab1b8, metalness: 0.5, roughness: 0.36 });
    const steelIn = new THREE.MeshStandardMaterial({ color: 0x9aa2aa, metalness: 0.45, roughness: 0.42 });
    const depth = 0.17;
    const opt = { cast: false };
    // köşeleri yuvarlatılmış tek parça hazne: yuvarlak dikdörtgen kesitli açık tüp + taban
    const rr = 0.014;
    const shape = new THREE.Shape();
    // hazne, tezgâh deliğinden 3 mm içeride: aynı düzlemde çakışan yüzeyler titreşim (z-fighting) yapıyordu.
    // Aradaki ince boşluk üstteki kenar çerçevesinin altında kalır.
    const e = 0.003;
    const x0 = -w / 2 + e, x1 = w / 2 - e, z0 = -d / 2 + e, z1 = d / 2 - e;
    shape.moveTo(x0 + rr, z0); shape.lineTo(x1 - rr, z0); shape.quadraticCurveTo(x1, z0, x1, z0 + rr);
    shape.lineTo(x1, z1 - rr); shape.quadraticCurveTo(x1, z1, x1 - rr, z1);
    shape.lineTo(x0 + rr, z1); shape.quadraticCurveTo(x0, z1, x0, z1 - rr);
    shape.lineTo(x0, z0 + rr); shape.quadraticCurveTo(x0, z0, x0 + rr, z0);
    const pts = shape.getSpacedPoints(96);
    const wallGeo = new THREE.BufferGeometry();
    const pos = [], idx = [];
    pts.forEach((p) => { pos.push(p.x, 0, p.y, p.x, -depth, p.y); });
    for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    wallGeo.setIndex(idx); wallGeo.computeVertexNormals();
    const wallMat = steel.clone(); wallMat.side = THREE.DoubleSide;
    const walls = P.mesh(wallGeo, wallMat, opt);
    walls.receiveShadow = false; // ince duvarlarda gölge çizgilenmesini önler
    g.add(walls);
    const floor = P.mesh(new THREE.ShapeGeometry(shape, 12), steelIn, opt);
    floor.rotation.x = Math.PI / 2; floor.scale.y = -1; floor.position.y = -depth; floor.material = steelIn.clone(); floor.material.side = THREE.DoubleSide;
    g.add(floor);
    // gider: krom halka + ızgara + koyu delik
    const dz = 0;
    g.add(P.cyl(0.028, 0.028, 0.004, M.chrome, [0, -depth + 0.004, dz], 32));
    g.add(P.cyl(0.022, 0.022, 0.004, new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.8 }), [0, -depth + 0.0045, dz], 28));
    for (let i = -2; i <= 2; i++) g.add(P.box(0.036 - Math.abs(i) * 0.006, 0.002, 0.003, M.chrome, [0, -depth + 0.0068, dz + i * 0.0075]));
    // birkaç su damlası
    // transmission kullanılmaz: tek bir transmission malzemesi bile her karede sahnenin ikinci kez çizilmesine yol açar (~%30)
    const drop = new THREE.MeshPhysicalMaterial({ color: 0xf4f8fb, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.26, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, depthWrite: false });
    [[0.07, 0.06], [-0.09, -0.05], [0.03, -0.08], [-0.05, 0.09]].forEach(([x, z], i) => {
      const m = P.mesh(new THREE.SphereGeometry(0.006 + (i % 2) * 0.003, 12, 8), drop, opt);
      m.scale.y = 0.35; m.position.set(x, -depth + 0.003, z); g.add(m);
    });
    // kenar çerçevesi
    const rim = new THREE.MeshStandardMaterial({ color: 0x9ea4aa, metalness: 1, roughness: 0.3 });
    g.add(P.box(w + 0.03, 0.004, 0.015, rim, [0, 0.002, -d / 2 - 0.007]));
    g.add(P.box(w + 0.03, 0.004, 0.015, rim, [0, 0.002, d / 2 + 0.007]));
    g.add(P.box(0.015, 0.004, d, rim, [-w / 2 - 0.007, 0.002, 0]));
    g.add(P.box(0.015, 0.004, d, rim, [w / 2 + 0.007, 0.002, 0]));
    return g;
  };

  /** Laboratuvar taburesi */
  P.stool = function (woodTex) {
    const g = new THREE.Group();
    const seatMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55 });
    const seat = P.cyl(0.17, 0.17, 0.035, seatMat, [0, 0.66, 0], 40);
    g.add(seat);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = P.cyl(0.011, 0.011, 0.68, M.blackPlastic, [Math.cos(a) * 0.15, 0.33, Math.sin(a) * 0.15], 12);
      leg.rotation.set(Math.sin(a) * -0.12, 0, Math.cos(a) * 0.12);
      g.add(leg);
      g.add(P.cyl(0.016, 0.016, 0.01, M.rubber, [Math.cos(a) * 0.19, 0.005, Math.sin(a) * 0.19], 12));
    }
    const ring = P.mesh(new THREE.TorusGeometry(0.165, 0.008, 8, 40), M.chrome);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.24; g.add(ring);
    return g;
  };

  /** Yangın tüpü */
  P.extinguisher = function () {
    const g = new THREE.Group();
    g.add(P.mesh(P.lathe([[0, 0], [0.075, 0], [0.08, 0.02], [0.08, 0.46], [0.06, 0.52], [0.025, 0.54], [0, 0.54]], 32), M.redPaint));
    g.add(P.cyl(0.02, 0.025, 0.05, M.blackPlastic, [0, 0.56, 0]));
    g.add(P.box(0.11, 0.012, 0.025, M.blackPlastic, [0.03, 0.59, 0]));
    const gauge = P.cyl(0.018, 0.018, 0.01, M.chrome, [0.035, 0.55, 0.0], 20); gauge.rotation.x = Math.PI / 2; g.add(gauge);
    const hc = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.02, 0.57, 0), new THREE.Vector3(-0.09, 0.5, 0.02), new THREE.Vector3(-0.095, 0.3, 0.03), new THREE.Vector3(-0.085, 0.2, 0.02)]);
    g.add(P.mesh(new THREE.TubeGeometry(hc, 30, 0.009, 8), M.blackPlastic));
    const label = P.mesh(new THREE.CylinderGeometry(0.0805, 0.0805, 0.16, 32, 1, true, -0.7, 1.4),
      new THREE.MeshStandardMaterial({ map: T.Tex.sign([{ t: 'YANGIN', b: true, s: 54, y: 70 }, { t: 'SÖNDÜRÜCÜ', b: true, s: 46, y: 140 }, { t: 'KKT 6 kg', s: 34, y: 205 }], '#f5f5f0', '#b00', 512, 256), roughness: 0.5 }), { cast: false });
    label.position.y = 0.3; g.add(label);
    return g;
  };

  /** Duvar saati */
  P.clock = function (tex) {
    const g = new THREE.Group();
    const frame = P.mesh(new THREE.TorusGeometry(0.16, 0.014, 12, 48), M.blackPlastic);
    g.add(frame);
    const face = P.mesh(new THREE.CircleGeometry(0.155, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), { cast: false });
    face.position.z = -0.004; g.add(face);
    const handMat = new THREE.MeshStandardMaterial({ color: 0x111 });
    const now = new Date();
    const hA = -((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2;
    const mA = -(now.getMinutes() / 60) * Math.PI * 2;
    const h = P.box(0.008, 0.08, 0.003, handMat, [0, 0.035, 0.002]); const hp = new THREE.Group(); hp.add(h); hp.rotation.z = hA; g.add(hp);
    const m = P.box(0.005, 0.12, 0.003, handMat, [0, 0.055, 0.004]); const mp = new THREE.Group(); mp.add(m); mp.rotation.z = mA; g.add(mp);
    const sec = P.box(0.0025, 0.13, 0.002, new THREE.MeshStandardMaterial({ color: 0xc0392b }), [0, 0.05, 0.006]);
    const sp = new THREE.Group(); sp.add(sec); g.add(sp);
    // kuvars saat gibi saniyede bir atlar; değiştiyse true döner (sahne yalnızca o an yeniden çizilir)
    let lastSec = -1;
    g.userData.tick = () => {
      const s = new Date().getSeconds();
      if (s === lastSec) return false;
      lastSec = s; sp.rotation.z = -s / 60 * Math.PI * 2;
      return true;
    };
    // cam kapak
    const cover = new THREE.Mesh(new THREE.CircleGeometry(0.156, 48), P.glass({ env: 1.2 }));
    cover.position.z = 0.012; cover.renderOrder = 10; g.add(cover);
    return g;
  };

  /** Kâğıt havlu askısı */
  P.paperTowel = function () {
    const g = new THREE.Group();
    const roll = P.cyl(0.055, 0.055, 0.24, new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.95 }), [0, 0, 0], 32);
    roll.rotation.z = Math.PI / 2; g.add(roll);
    const bar = P.cyl(0.006, 0.006, 0.3, M.chrome, [0, 0, 0], 12); bar.rotation.z = Math.PI / 2; g.add(bar);
    [-0.15, 0.15].forEach((x) => g.add(P.box(0.008, 0.02, 0.08, M.chrome, [x, 0, -0.04])));
    const sheet = P.box(0.23, 0.12, 0.002, new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.95 }), [0, -0.09, 0.055]);
    g.add(sheet);
    return g;
  };

  /** Açık laboratuvar defteri: koyu ciltli kapak, çizgili kâğıt, el yazısı notlar */
  function notebookPage(side) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 720;
    const x = c.getContext('2d');
    x.fillStyle = '#f7f4ea'; x.fillRect(0, 0, 512, 720);
    // cilt tarafına doğru hafif gölge
    const gx = side === 'L' ? x.createLinearGradient(512, 0, 430, 0) : x.createLinearGradient(0, 0, 82, 0);
    gx.addColorStop(0, 'rgba(80,70,50,.22)'); gx.addColorStop(1, 'rgba(80,70,50,0)');
    x.fillStyle = gx; x.fillRect(0, 0, 512, 720);
    // başlık kutusu ve çizgiler
    x.strokeStyle = 'rgba(90,120,160,.38)'; x.lineWidth = 1.4;
    for (let y = 96; y < 700; y += 30) { x.beginPath(); x.moveTo(24, y); x.lineTo(488, y); x.stroke(); }
    x.strokeStyle = 'rgba(200,70,70,.45)'; x.lineWidth = 1.6;
    const mx = side === 'L' ? 70 : 54;
    x.beginPath(); x.moveTo(mx, 20); x.lineTo(mx, 704); x.stroke();
    x.strokeStyle = 'rgba(60,60,60,.45)'; x.lineWidth = 1.2; x.strokeRect(24, 22, 464, 50);
    x.fillStyle = 'rgba(60,60,60,.6)'; x.font = '600 15px Arial, sans-serif';
    x.fillText(side === 'L' ? 'DENEY NO:' : 'TARİH:', 34, 42); x.fillText('KONU:', side === 'L' ? 200 : 210, 42);
    // el yazısı (mavi tükenmez)
    x.fillStyle = '#20366e'; x.font = 'italic 25px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    const L = side === 'L'
      ? [['3', 140, 64], ['Tepkime gözlemi', 270, 64], ['Amaç: iki çözelti karışınca', mx + 10, 122], ['ne değiştiğini gözlemek.', mx + 10, 152],
         ['Malzeme: 2 beher, termometre,', mx + 10, 212], ['dereceli silindir', mx + 10, 242], ['Başlangıç sıcaklığı: 22,0 °C', mx + 10, 302],
         ['Gözlem:', mx + 10, 362], ['– renk değişti mi?', mx + 18, 392], ['– gaz / çökelti?', mx + 18, 422]]
      : [['12.11', 120, 64], ['Sonuçlar', 280, 64], ['Kap', mx + 14, 122], ['Önce', mx + 140, 122], ['Sonra', mx + 290, 122],
         ['A', mx + 20, 152], ['renksiz', mx + 130, 152], ['?', mx + 300, 152], ['B', mx + 20, 182], ['açık mavi', mx + 130, 182],
         ['Not: kabı karıştırma çubuğuyla', mx + 10, 272], ['yavaşça karıştır.', mx + 10, 302]];
    L.forEach(([t, px, py]) => x.fillText(t, px, py < 90 ? py - 6 : py + 1));
    if (side === 'R') { // tablo çizgileri (kurşun kalem)
      x.strokeStyle = 'rgba(70,70,70,.5)'; x.lineWidth = 1.3;
      [mx + 110, mx + 270].forEach((vx) => { x.beginPath(); x.moveTo(vx, 98); x.lineTo(vx, 186); x.stroke(); });
      x.beginPath(); x.moveTo(mx + 6, 128); x.lineTo(470, 128); x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  P.notebook = function (hex) {
    const g = new THREE.Group();
    const cover = new THREE.MeshStandardMaterial({ color: hex || 0x26292e, roughness: 0.7 });
    const edge = new THREE.MeshStandardMaterial({ color: 0xebe6d8, roughness: 0.95 });
    const PW = 0.2, PD = 0.275, CT = 0.003;
    // açık kapak (iki yarım, ortada sırt)
    g.add(P.box(PW * 2 + 0.016, CT, PD + 0.012, cover, [0, CT / 2, 0]));
    g.add(P.box(0.014, 0.0045, PD + 0.012, new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.6 }), [0, 0.0022, 0], { cast: false }));
    // sayfa blokları: üst yüz yazılı kâğıt, kenarlar sayfa kesiti
    [['L', -1, 0.007], ['R', 1, 0.005]].forEach(([s, k, th]) => {
      const top = new THREE.MeshStandardMaterial({ map: notebookPage(s), roughness: 0.92 });
      const geo = new THREE.BoxGeometry(PW, th, PD);
      const m = new THREE.Mesh(geo, [edge, edge, top, edge, edge, edge]);
      m.position.set(k * (PW / 2 + 0.002), CT + th / 2, 0);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    });
    return g;
  };
  /** Tükenmez kalem: siyah gövde, metal klips ve uç */
  P.pen = function () {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.35 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.25 });
    const b = P.cyl(0.0042, 0.0042, 0.112, body, [0, 0, 0], 16); b.rotation.z = Math.PI / 2; g.add(b);
    const grip = P.cyl(0.0045, 0.0045, 0.026, new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.8 }), [-0.04, 0, 0], 16); grip.rotation.z = Math.PI / 2; g.add(grip);
    const cone = P.cyl(0.0042, 0.0012, 0.014, metal, [-0.063, 0, 0], 16); cone.rotation.z = Math.PI / 2; g.add(cone);
    const cap = P.cyl(0.0044, 0.0044, 0.006, metal, [0.059, 0, 0], 16); cap.rotation.z = Math.PI / 2; g.add(cap);
    g.add(P.box(0.034, 0.0012, 0.0024, metal, [0.042, 0.0052, 0], { cast: false }));
    return g;
  };

  /** Blender'dan aktarılan gözlük ve nitril eldivenler. */
  P.safetyGear = function () {
    const g = new THREE.Group();
    g.name = 'safetyGear';
    const { positionUnit, meshes } = T.safetyGearData;
    const bytes = (packed) => Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
    for (const [name, color, roughness, positions, normals, indices] of meshes) {
      const geo = new THREE.BufferGeometry();
      const xyz = Float32Array.from(new Int16Array(bytes(positions).buffer), (value) => value * positionUnit);
      geo.setAttribute('position', new THREE.BufferAttribute(xyz, 3));
      geo.setAttribute('normal', new THREE.Int8BufferAttribute(bytes(normals).buffer, 3, true));
      geo.setIndex(new THREE.BufferAttribute(new Uint16Array(bytes(indices).buffer), 1));

      const lens = name === 'Polycarbonate';
      const mat = lens
        ? P.glass({ color: 0x1a272e, opacity: 0.16, roughness, env: 1.35, side: THREE.DoubleSide, edge: 0.16 })
        : new THREE.MeshStandardMaterial({ color, roughness });
      if (lens) mat.forceSinglePass = true;
      const part = P.mesh(geo, mat, { cast: !lens, order: lens ? 2 : 0 });
      part.name = name;
      g.add(part);
    }
    return g;
  };

  /** Spatül ve saat camı */
  P.watchGlass = function () {
    const geo = new THREE.SphereGeometry(0.05, 32, 8, 0, Math.PI * 2, Math.PI * 0.82, Math.PI * 0.18);
    geo.translate(0, 0.05, 0);
    const g = P.glassShell(geo);
    return g;
  };

  T.Props = P;
})(window.TUY);
