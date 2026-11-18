/* Lise kimya laboratuvarı: oda, tezgâhlar, dolaplar, raflar, posterler ve eşyalar. */
(function (T) {
  'use strict';
  const P = T.Props, Tex = T.Tex;

  const ROOM = { x0: -4.6, x1: 4.6, z0: -4.2, z1: 4.2, h: 3.0 };
  const BENCH_Y = 0.92; // tezgâh üst yüzeyi

  function buildRoom(scene) {
    const M = P.M;
    const g = new THREE.Group();
    g.name = 'room';
    const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0;

    /* ---------- Zemin ---------- */
    const floorTex = Tex.floor();
    floorTex.repeat.set(W / 2.4, D / 2.4);
    const floorRough = Tex.floorRough();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughnessMap: floorRough, roughness: 0.75, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    g.add(floor);

    /* ---------- Duvarlar ---------- */
    const wallTex = Tex.wall('#e6ebe8');
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 });
    const wallLow = new THREE.MeshStandardMaterial({ color: 0x5f7a86, roughness: 0.7 }); // süpürgelik
    // arka duvar
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, ROOM.h), wallMat);
    back.position.set(0, ROOM.h / 2, ROOM.z0); back.receiveShadow = true; g.add(back);
    // ön duvar
    const front = new THREE.Mesh(new THREE.PlaneGeometry(W, ROOM.h), wallMat);
    front.position.set(0, ROOM.h / 2, ROOM.z1); front.rotation.y = Math.PI; g.add(front);
    // sağ duvar
    const right = new THREE.Mesh(new THREE.PlaneGeometry(D, ROOM.h), wallMat);
    right.position.set(ROOM.x1, ROOM.h / 2, 0); right.rotation.y = -Math.PI / 2; right.receiveShadow = true; g.add(right);
    // sol duvar: pencere boşluklu parçalar
    const winZ = [-2.5, 0, 2.5], winW = 1.7, winY0 = 1.0, winY1 = 2.45;
    const leftParts = [];
    leftParts.push([ROOM.z0, ROOM.z1, 0, winY0]);
    leftParts.push([ROOM.z0, ROOM.z1, winY1, ROOM.h]);
    let zc = ROOM.z0;
    winZ.forEach((z) => { leftParts.push([zc, z - winW / 2, winY0, winY1]); zc = z + winW / 2; });
    leftParts.push([zc, ROOM.z1, winY0, winY1]);
    leftParts.forEach(([za, zb, ya, yb]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(zb - za, yb - ya), wallMat);
      m.position.set(ROOM.x0, (ya + yb) / 2, (za + zb) / 2); m.rotation.y = Math.PI / 2; m.receiveShadow = true;
      g.add(m);
    });
    // süpürgelikler
    g.add(P.box(W, 0.1, 0.015, wallLow, [0, 0.05, ROOM.z0 + 0.008]));
    g.add(P.box(0.015, 0.1, D, wallLow, [ROOM.x1 - 0.008, 0.05, 0]));
    g.add(P.box(0.015, 0.1, D, wallLow, [ROOM.x0 + 0.008, 0.05, 0]));

    // pencereler
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), new THREE.MeshBasicMaterial({ map: Tex.outside(), toneMapped: false }));
    outside.material.color.setScalar(1.05);
    outside.position.set(ROOM.x0 - 1.4, 1.9, 0); outside.rotation.y = Math.PI / 2;
    g.add(outside);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xf0f1ef, roughness: 0.4 });
    winZ.forEach((z) => {
      const fw = 0.05;
      g.add(P.box(0.12, fw, winW, frameMat, [ROOM.x0, winY0, z]));
      g.add(P.box(0.12, fw, winW, frameMat, [ROOM.x0, winY1, z]));
      g.add(P.box(0.12, winY1 - winY0, fw, frameMat, [ROOM.x0, (winY0 + winY1) / 2, z - winW / 2]));
      g.add(P.box(0.12, winY1 - winY0, fw, frameMat, [ROOM.x0, (winY0 + winY1) / 2, z + winW / 2]));
      g.add(P.box(0.08, winY1 - winY0, 0.04, frameMat, [ROOM.x0, (winY0 + winY1) / 2, z]));
      g.add(P.box(0.08, 0.04, winW, frameMat, [ROOM.x0, winY0 + (winY1 - winY0) * 0.68, z]));
      // pervaz
      g.add(P.box(0.26, 0.03, winW + 0.1, new THREE.MeshStandardMaterial({ color: 0xd7d9d6, roughness: 0.35 }), [ROOM.x0 + 0.1, winY0 - 0.02, z]));
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(winW, winY1 - winY0), P.glass({ env: 0.7, opacity: 0.06 }));
      pane.position.set(ROOM.x0 - 0.01, (winY0 + winY1) / 2, z); pane.rotation.y = Math.PI / 2; pane.renderOrder = 10;
      g.add(pane);
      // stor perde (yarı açık)
      const blind = P.box(0.02, 0.32, winW - 0.04, new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.95 }), [ROOM.x0 + 0.07, winY1 - 0.17, z]);
      g.add(blind);
      // radyatör
      const rad = new THREE.Group();
      for (let i = 0; i < 14; i++) rad.add(P.box(0.06, 0.5, 0.05, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.45 }), [0, 0, -0.35 + i * 0.054]));
      rad.position.set(ROOM.x0 + 0.08, 0.42, z);
      g.add(rad);
    });

    /* ---------- Tavan ---------- */
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: Tex.ceiling(), roughness: 1 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; g.add(ceil);
    const lpTex = Tex.lightPanel();
    const lampMat = new THREE.MeshStandardMaterial({ map: lpTex, emissive: 0xffffff, emissiveMap: lpTex, emissiveIntensity: 2.2, roughness: 0.4 });
    [-2.4, 0, 2.4].forEach((x) => [-2.2, 0.4, 2.8].forEach((z) => {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), lampMat);
      l.rotation.x = Math.PI / 2; l.position.set(x, ROOM.h - 0.005, z);
      g.add(l);
      g.add(P.box(0.64, 0.02, 1.24, new THREE.MeshStandardMaterial({ color: 0xdadcdc, roughness: 0.5 }), [x, ROOM.h - 0.003, z], { cast: false }));
    }));

    /* ---------- Orta deney tezgâhı (ada) ---------- */
    g.add(buildIsland());

    /* ---------- Arka duvar tezgâhı + dolaplar ---------- */
    g.add(buildBackCounter());

    /* ---------- Çeker ocak ---------- */
    const hood = buildFumeHood();
    hood.position.set(3.55, 0, ROOM.z0 + 0.42);
    g.add(hood);

    /* ---------- Posterler, tahta, tabelalar ---------- */
    const pt = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), new THREE.MeshStandardMaterial({ map: Tex.periodicTable(), roughness: 0.55 }));
    // çerçeve fayansın (üst kenarı 1,54 m) üstünde kalsın: üst üste binen ince aralık uzaktan titriyordu
    pt.position.set(1.05, 2.05, ROOM.z0 + 0.016); g.add(pt);
    g.add(P.box(1.54, 0.98, 0.012, new THREE.MeshStandardMaterial({ color: 0x2b2f33 }), [1.05, 2.05, ROOM.z0 + 0.004], { cast: false }));

    const wb = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.15), new THREE.MeshStandardMaterial({ map: Tex.whiteboard(), roughness: 0.18, metalness: 0, envMapIntensity: 0.6 }));
    wb.add(board);
    wb.add(P.box(2.66, 0.04, 0.03, M.brushed, [0, 0.595, 0.0]));
    wb.add(P.box(2.66, 0.04, 0.03, M.brushed, [0, -0.595, 0.0]));
    wb.add(P.box(0.03, 1.2, 0.03, M.brushed, [-1.32, 0, 0]));
    wb.add(P.box(0.03, 1.2, 0.03, M.brushed, [1.32, 0, 0]));
    wb.add(P.box(1.4, 0.025, 0.08, M.brushed, [0, -0.62, 0.04]));
    [0xc0392b, 0x1f4fa8, 0x111111].forEach((c, i) => {
      const mk = P.cyl(0.008, 0.008, 0.12, new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }), [-0.2 + i * 0.05, -0.598, 0.05], 12);
      mk.rotation.z = Math.PI / 2; wb.add(mk);
    });
    wb.position.set(ROOM.x1 - 0.02, 1.75, 0.6); wb.rotation.y = -Math.PI / 2;
    g.add(wb);

    const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.8), new THREE.MeshStandardMaterial({ map: Tex.safetyPoster(), roughness: 0.6 }));
    sp.position.set(ROOM.x1 - 0.012, 1.65, -1.75); sp.rotation.y = -Math.PI / 2; g.add(sp);

    const clock = P.clock(Tex.clock());
    clock.position.set(-1.6, 2.55, ROOM.z0 + 0.03);
    g.add(clock);
    g.userData.clock = clock;

    // kapı (sağ duvar, ön)
    const door = new THREE.Group();
    door.add(P.box(1.0, 2.1, 0.05, new THREE.MeshStandardMaterial({ map: Tex.wood(), roughness: 0.6 }), [0, 1.05, 0]));
    door.add(P.box(1.1, 2.16, 0.07, new THREE.MeshStandardMaterial({ color: 0x8d9399, metalness: 0.6, roughness: 0.4 }), [0, 1.08, -0.02]));
    door.add(P.box(0.14, 0.025, 0.03, M.chrome, [-0.36, 1.0, 0.05]));
    const vision = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.6), new THREE.MeshStandardMaterial({ color: 0x9ab, roughness: 0.1, metalness: 0.2 }));
    vision.position.set(0.2, 1.45, 0.027); door.add(vision);
    door.position.set(ROOM.x1 - 0.03, 0, 3.2); door.rotation.y = -Math.PI / 2;
    g.add(door);
    const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshStandardMaterial({ map: Tex.sign([{ t: '🏃 ACİL ÇIKIŞ', b: true, s: 64 }], '#118a43', '#fff', 512, 196), emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.4 }));
    exit.material.emissiveMap = exit.material.map;
    exit.position.set(ROOM.x1 - 0.015, 2.4, 3.2); exit.rotation.y = -Math.PI / 2; g.add(exit);

    const ext = P.extinguisher();
    ext.position.set(ROOM.x1 - 0.14, 0.32, 2.35);
    g.add(ext);
    g.add(P.box(0.2, 0.05, 0.14, M.blackPlastic, [ROOM.x1 - 0.1, 0.3, 2.35]));
    const extSign = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshStandardMaterial({ map: Tex.sign([{ t: '🧯', s: 120, y: 110 }, { t: 'YANGIN TÜPÜ', b: true, s: 34, y: 215 }], '#d62828', '#fff', 256, 256) }));
    extSign.position.set(ROOM.x1 - 0.012, 1.25, 2.35); extSign.rotation.y = -Math.PI / 2; g.add(extSign);

    const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshStandardMaterial({ map: Tex.sign([{ t: '👁️💧', s: 92, y: 100 }, { t: 'GÖZ DUŞU', b: true, s: 40, y: 210 }], '#118a43', '#fff', 256, 256) }));
    eye.position.set(-2.1, 1.75, ROOM.z0 + 0.012); g.add(eye);

    const firstAid = new THREE.Group();
    firstAid.add(P.box(0.36, 0.3, 0.12, new THREE.MeshStandardMaterial({ color: 0x0f8a4a, roughness: 0.4 }), [0, 0, 0]));
    const fa = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.25), new THREE.MeshStandardMaterial({ map: Tex.sign([{ t: '✚', b: true, s: 130, y: 100 }, { t: 'İLK YARDIM', b: true, s: 34, y: 210 }], '#0f8a4a', '#fff', 256, 256) }));
    fa.position.z = 0.061; firstAid.add(fa);
    firstAid.position.set(ROOM.x1 - 0.07, 1.6, -3.1); firstAid.rotation.y = -Math.PI / 2;
    g.add(firstAid);

    // öğrenci tabureleri
    const woodTex = Tex.wood();
    [[-0.85, 0.95], [0.0, 1.0], [0.85, 0.95], [-0.85, -1.05], [0.85, -1.05]].forEach(([x, z], i) => {
      const s = P.stool(woodTex);
      s.position.set(x, 0, z); s.rotation.y = i * 0.7;
      g.add(s);
    });

    scene.add(g);
    return g;
  }

  /* ---------------- Ada tezgâhı ---------------- */
  function buildIsland() {
    const M = P.M;
    const g = new THREE.Group();
    g.name = 'island';
    const L = 2.8, D = 1.3, topT = 0.035;
    const epoxy = new THREE.MeshStandardMaterial({ map: Tex.epoxy(), roughnessMap: Tex.epoxyRough(), roughness: 0.42, metalness: 0.0, envMapIntensity: 0.9 });
    // lavabo yuvası (tabla ve dolabın üst kuşağı bu bölgede açık kalır, hazne görünür)
    const SINK = { x: 1.08, z: 0.16, w: 0.4, d: 0.3 };
    const top = P.roundBox(L, topT, D, 0.02, epoxy, [SINK]);
    top.position.y = BENCH_Y - topT / 2;
    top.name = 'benchTop';
    g.add(top);

    // gövde dolapları: üst kuşak lavabo için delikli, alt gövde haznenin altında
    const lam = new THREE.MeshStandardMaterial({ map: Tex.laminate('#dfe3e2'), roughness: 0.55 });
    const lamDark = new THREE.MeshStandardMaterial({ color: 0x3d4a52, roughness: 0.6 });
    const bodyH = BENCH_Y - topT - 0.1;
    const bandH = 0.2;
    g.add(P.box(L - 0.08, bodyH - bandH, D - 0.12, lam, [0, 0.1 + (bodyH - bandH) / 2, 0]));
    const band = P.roundBox(L - 0.08, bandH, D - 0.12, 0.002, lam, [{ x: SINK.x, z: SINK.z, w: SINK.w + 0.004, d: SINK.d + 0.004 }]);
    band.position.y = 0.1 + bodyH - bandH / 2;
    g.add(band);
    g.add(P.box(L - 0.12, 0.1, D - 0.18, lamDark, [0, 0.05, 0])); // baza
    // kapak ve çekmeceler (iki yüz)
    [1, -1].forEach((side) => {
      const z = side * (D - 0.12) / 2 + side * 0.011;
      const n = 6;
      const w = (L - 0.12) / n;
      for (let i = 0; i < n; i++) {
        const x = -(L - 0.12) / 2 + w * (i + 0.5);
        const isDrawer = i % 3 === 1;
        if (isDrawer) {
          for (let k = 0; k < 3; k++) {
            const hh = bodyH / 3 - 0.012;
            g.add(P.box(w - 0.012, hh, 0.018, lam, [x, 0.1 + bodyH - (k + 0.5) * (bodyH / 3), z], { cast: false }));
            g.add(P.box(0.12, 0.012, 0.02, M.brushed, [x, 0.1 + bodyH - (k + 0.5) * (bodyH / 3) + hh * 0.25, z + side * 0.018], { cast: false }));
          }
        } else {
          g.add(P.box(w - 0.012, bodyH - 0.012, 0.018, lam, [x, 0.1 + bodyH / 2, z], { cast: false }));
          g.add(P.box(0.012, 0.13, 0.02, M.brushed, [x + (i % 3 === 0 ? 1 : -1) * (w / 2 - 0.05), 0.1 + bodyH - 0.12, z + side * 0.018], { cast: false }));
        }
      }
    });

    // tezgâh üstü reaktif rafı (adanın arka yarısı)
    const shelf = new THREE.Group();
    const postMat = M.brushed;
    const sz = -0.47;
    [-1.3, 0, 1.3].forEach((x) => shelf.add(P.box(0.04, 0.72, 0.04, postMat, [x, BENCH_Y + 0.36, sz])));
    const shelfMat = new THREE.MeshStandardMaterial({ map: Tex.laminate('#eef0ee'), roughness: 0.5 });
    [0.33, 0.66].forEach((y) => {
      shelf.add(P.box(2.66, 0.022, 0.24, shelfMat, [0, BENCH_Y + y, sz]));
      shelf.add(P.box(2.66, 0.03, 0.006, postMat, [0, BENCH_Y + y + 0.03, sz + 0.12]));
    });
    // elektrik prizleri ve gaz vanaları raf ayaklarında
    const socketTex = Tex.sign([{ t: '⏚', s: 90 }], '#f5f5f2', '#555', 128, 128);
    [-1.3, 1.3].forEach((x) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.025), new THREE.MeshStandardMaterial({ map: socketTex, roughness: 0.5 }));
      s.position.set(x, BENCH_Y + 0.17, sz + 0.03); shelf.add(s);
    });
    g.add(shelf);

    // raftaki reaktif şişeleri (yalnızca adlar)
    const names = [
      ['Sodyum hidrojen karbonat', false], ['Hidroklorik asit', true], ['Sodyum karbonat', false], ['Hidrojen peroksit', true],
      ['Sodyum hidroksit', true], ['Amonyak çözeltisi', true], ['Kurşun(II) nitrat', true], ['Potasyum iyodür', false],
      ['Gümüş nitrat', true], ['Bakır(II) nitrat', false], ['Kalsiyum klorür', false], ['Kalsiyum karbonat', false],
      ['Damıtık su', false], ['Fenolftalein', true]
    ];
    names.forEach(([n, haz], i) => {
      const row = i < 7 ? 0 : 1;
      const k = i % 7;
      const amber = n.includes('nitrat') || n.includes('peroksit') || n.includes('Gümüş');
      const fill = n.includes('Bakır') ? 0x3aa0e0 : null;
      const b = P.bottle({ amber, h: 0.17 + (k % 2) * 0.02, r: 0.036, label: Tex.bottleLabel(n, haz ? 'Dikkat: tahriş edici' : 'Laboratuvar saflığı', haz), fill: fill || (amber ? null : 0xe8f1f4) });
      b.position.set(-1.12 + k * 0.37 + (row ? 0.12 : 0), BENCH_Y + (row ? 0.682 : 0.352), sz + (k % 2 ? 0.02 : -0.03));
      b.rotation.y = (k % 3 - 1) * 0.25;
      g.add(b);
    });

    // lavabo + musluk (sağ uç)
    const sink = P.sink(SINK.w, SINK.d);
    sink.position.set(SINK.x, BENCH_Y + 0.001, SINK.z);
    g.add(sink);
    const faucet = P.faucet();
    faucet.position.set(1.08, BENCH_Y, -0.06);
    faucet.scale.setScalar(0.9);
    g.add(faucet);

    // Sade masa: deney masasında yalnızca o deneyde kullanılanlar (beherler, termometre) ve kayıt için
    // defter durur. Kullanılmayan cam malzeme arka tezgâhta, reaktif şişeleri rafta (etiketleri okunur).
    const bz = ROOM.z0 + 0.325; // arka tezgâhın orta çizgisi
    const wash = P.washBottle(); wash.position.set(-2.55, BENCH_Y, bz + 0.02); wash.rotation.y = 0.5; g.add(wash);
    const rack = P.testTubeRack(); rack.position.set(-3.2, BENCH_Y, bz - 0.04); rack.rotation.y = 0.05; g.add(rack);
    const er1 = P.erlen({ fill: 0xf3f6f8, op: 0.25 }); er1.position.set(0.95, BENCH_Y, bz + 0.02); g.add(er1);
    const er2 = P.erlen({ s: 0.8 }); er2.position.set(1.12, BENCH_Y, bz - 0.06); g.add(er2);
    const gc = P.gradCylinder(); gc.position.set(2.15, BENCH_Y, bz - 0.04); g.add(gc);
    // açık laboratuvar defteri ve tükenmez kalem
    const nb = P.notebook(); nb.position.set(-0.8, BENCH_Y, 0.33); nb.rotation.y = 0.22; g.add(nb);
    const pen = P.pen(); pen.position.set(0.1, 0.0125, 0.02); pen.rotation.y = 0.5; nb.add(pen);

    return g;
  }

  /* ---------------- Arka tezgâh ---------------- */
  function buildBackCounter() {
    const M = P.M;
    const g = new THREE.Group();
    const x0 = -4.5, x1 = 2.7, Dp = 0.65, z = ROOM.z0 + Dp / 2;
    const L = x1 - x0, cx = (x0 + x1) / 2;
    const lam = new THREE.MeshStandardMaterial({ map: Tex.laminate('#dfe3e2'), roughness: 0.55 });
    const epoxy = new THREE.MeshStandardMaterial({ map: Tex.epoxy(), roughnessMap: Tex.epoxyRough(), roughness: 0.42 });
    // lavabo yuvası (tabla ve gövdenin üst kuşağında delik)
    const BS = { x: -2.1, z: z + 0.04, w: 0.5, d: 0.36 };
    const btop = P.roundBox(L, 0.035, Dp, 0.004, epoxy, [{ x: BS.x - cx, z: BS.z - z, w: BS.w, d: BS.d }]);
    btop.position.set(cx, BENCH_Y - 0.0175, z); g.add(btop);
    const bodyH = BENCH_Y - 0.135, bandH = 0.2;
    g.add(P.box(L - 0.02, bodyH - bandH, Dp - 0.06, lam, [cx, 0.1 + (bodyH - bandH) / 2, z - 0.02]));
    const band = P.roundBox(L - 0.02, bandH, Dp - 0.06, 0.002, lam, [{ x: BS.x - cx, z: BS.z - (z - 0.02), w: BS.w + 0.004, d: BS.d + 0.004 }]);
    band.position.set(cx, 0.1 + bodyH - bandH / 2, z - 0.02); g.add(band);
    g.add(P.box(L - 0.02, 0.1, Dp - 0.1, new THREE.MeshStandardMaterial({ color: 0x3d4a52 }), [cx, 0.05, z - 0.03]));
    const n = Math.floor(L / 0.6);
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.3 + i * (L / n);
      g.add(P.box(L / n - 0.012, BENCH_Y - 0.15, 0.018, lam, [x, 0.1 + (BENCH_Y - 0.15) / 2, z + Dp / 2 - 0.03], { cast: false }));
      g.add(P.box(0.012, 0.12, 0.02, M.brushed, [x + 0.2, BENCH_Y - 0.15, z + Dp / 2 - 0.012], { cast: false }));
    }
    // fayans (tezgâh arkası)
    const tiles = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.62), new THREE.MeshStandardMaterial({ map: Tex.wallTiles(), roughness: 0.25, envMapIntensity: 0.7 }));
    tiles.material.map.repeat.set(L / 1.6, 1);
    tiles.position.set(cx, BENCH_Y + 0.31, ROOM.z0 + 0.006); tiles.receiveShadow = true;
    g.add(tiles);

    // üst dolaplar (cam kapaklı) — sol bölüm
    const cabX0 = -4.4, cabX1 = -0.2, cabY = 1.62, cabH = 0.78, cabD = 0.36;
    const cabL = cabX1 - cabX0, ccx = (cabX0 + cabX1) / 2, cz = ROOM.z0 + cabD / 2;
    const cabMat = new THREE.MeshStandardMaterial({ map: Tex.laminate('#e8ebe9'), roughness: 0.5 });
    g.add(P.box(cabL, 0.02, cabD, cabMat, [ccx, cabY, cz]));
    g.add(P.box(cabL, 0.02, cabD, cabMat, [ccx, cabY + cabH, cz]));
    g.add(P.box(cabL, 0.015, cabD - 0.03, cabMat, [ccx, cabY + cabH / 2, cz - 0.01]));
    const nd = 6, dw = cabL / nd;
    for (let i = 0; i <= nd; i++) g.add(P.box(0.02, cabH, cabD, cabMat, [cabX0 + i * dw, cabY + cabH / 2, cz]));
    g.add(P.box(cabL, cabH, 0.01, new THREE.MeshStandardMaterial({ color: 0xcfd5d3, roughness: 0.8 }), [ccx, cabY + cabH / 2, ROOM.z0 + 0.006]));
    // dolap içi eşyalar
    for (let i = 0; i < nd; i++) {
      for (let s = 0; s < 2; s++) {
        const y = cabY + 0.012 + s * (cabH / 2);
        for (let k = 0; k < 4; k++) {
          const x = cabX0 + i * dw + 0.1 + k * (dw - 0.16) / 3;
          const pick = (i + k + s) % 4;
          let o;
          if (pick === 0) o = P.bottle({ amber: true, h: 0.2, r: 0.04, label: Tex.bottleLabel(['Etanol', 'Aseton', 'Gliserin', 'Sirke'][(i + k) % 4], 'Laboratuvar saflığı') });
          else if (pick === 1) o = P.erlen({ s: 1.1 });
          else if (pick === 2) o = P.bottle({ h: 0.17, r: 0.035, fill: 0xe8f1f4, capMat: P.M.bluePlastic });
          else { o = P.glassShell(P.lathe([[0, 0], [0.04, 0], [0.042, 0.004], [0.042, 0.11], [0.046, 0.115]], 32)); }
          o.position.set(x, y, cz - 0.03 + (k % 2) * 0.05);
          g.add(o);
        }
      }
      // cam kapak
      const door = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.03, cabH - 0.03), P.glass({ env: 1.3, opacity: 0.08 }));
      door.position.set(cabX0 + (i + 0.5) * dw, cabY + cabH / 2, ROOM.z0 + cabD + 0.004);
      door.renderOrder = 10;
      g.add(door);
      // kapak çerçevesi
      const fm = new THREE.MeshStandardMaterial({ color: 0xbfc5c3, metalness: 0.5, roughness: 0.4 });
      const dx = cabX0 + (i + 0.5) * dw;
      g.add(P.box(dw - 0.02, 0.025, 0.012, fm, [dx, cabY + 0.012, ROOM.z0 + cabD + 0.006], { cast: false }));
      g.add(P.box(dw - 0.02, 0.025, 0.012, fm, [dx, cabY + cabH - 0.012, ROOM.z0 + cabD + 0.006], { cast: false }));
      g.add(P.box(0.02, cabH, 0.012, fm, [dx - dw / 2 + 0.012, cabY + cabH / 2, ROOM.z0 + cabD + 0.006], { cast: false }));
      g.add(P.box(0.02, cabH, 0.012, fm, [dx + dw / 2 - 0.012, cabY + cabH / 2, ROOM.z0 + cabD + 0.006], { cast: false }));
      g.add(P.box(0.01, 0.08, 0.018, P.M.chrome, [dx + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), cabY + 0.12, ROOM.z0 + cabD + 0.016], { cast: false }));
    }

    // arka tezgâhta lavabo, kâğıt havlu, mikroskop benzeri cihaz yerine terazi
    const sink = P.sink(BS.w, BS.d); sink.position.set(BS.x, BENCH_Y + 0.001, BS.z); g.add(sink);
    const fc = P.faucet(); fc.position.set(-2.1, BENCH_Y, ROOM.z0 + 0.08); g.add(fc);
    const pt = P.paperTowel(); pt.position.set(-1.45, 1.35, ROOM.z0 + 0.07); g.add(pt);

    // hassas terazi
    const bal = new THREE.Group();
    bal.add(P.box(0.22, 0.07, 0.3, P.M.whitePlastic, [0, 0.035, 0]));
    bal.add(P.cyl(0.07, 0.07, 0.006, P.M.steel, [0, 0.075, -0.03], 32));
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.035), new THREE.MeshStandardMaterial({ map: Tex.sign([{ t: '0.000 g', b: true, s: 70 }], '#1b2a1b', '#7CFC7C', 512, 128), emissive: 0x335533, emissiveIntensity: 0.6 }));
    disp.material.emissiveMap = disp.material.map;
    disp.position.set(0, 0.05, 0.151); disp.rotation.x = -0.4; bal.add(disp);
    bal.position.set(0.4, BENCH_Y, z); bal.rotation.y = -0.15;
    g.add(bal);
    const bot = P.bottle({ amber: true, h: 0.22, r: 0.045, label: Tex.bottleLabel('Damıtık su', 'Laboratuvar saflığı') });
    bot.position.set(-0.9, BENCH_Y, z - 0.1); g.add(bot);
    const er = P.erlen({ s: 1.3, fill: 0x3aa0e0, op: 0.5 }); er.position.set(-0.55, BENCH_Y, z); g.add(er);
    const rack = P.testTubeRack(); rack.position.set(1.6, BENCH_Y, z - 0.05); g.add(rack);
    return g;
  }

  /* ---------------- Çeker ocak ---------------- */
  function buildFumeHood() {
    const M = P.M;
    const g = new THREE.Group();
    const W = 1.5, D = 0.8, H = 2.45;
    const body = new THREE.MeshStandardMaterial({ color: 0xe9ecea, roughness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2f3a40, roughness: 0.6 });
    g.add(P.box(W, 0.82, D, body, [0, 0.47, 0]));
    g.add(P.box(W - 0.02, 0.035, D - 0.04, new THREE.MeshStandardMaterial({ map: Tex.epoxy(), roughness: 0.4 }), [0, 0.9, 0.0]));
    g.add(P.box(0.06, H - 0.9, D, body, [-W / 2 + 0.03, 0.9 + (H - 0.9) / 2, 0]));
    g.add(P.box(0.06, H - 0.9, D, body, [W / 2 - 0.03, 0.9 + (H - 0.9) / 2, 0]));
    g.add(P.box(W - 0.004, 0.4, D - 0.004, body, [0, H - 0.2, 0]));
    g.add(P.box(W - 0.12, H - 0.9, 0.02, new THREE.MeshStandardMaterial({ color: 0xd5dad8, roughness: 0.7 }), [0, 0.9 + (H - 0.9) / 2, -D / 2 + 0.01]));
    // iç ışık
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 0.12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.6 }));
    lamp.position.set(0, H - 0.41, 0); lamp.rotation.x = Math.PI / 2; g.add(lamp);
    // cam kapak (yarı açık)
    const sash = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.14, 0.75), P.glass({ env: 1.4, opacity: 0.1 }));
    sash.position.set(0, 1.62, D / 2 - 0.02); sash.renderOrder = 10; g.add(sash);
    g.add(P.box(W - 0.12, 0.05, 0.04, M.brushed, [0, 1.24, D / 2 - 0.02]));
    g.add(P.box(W - 0.12, 0.03, 0.03, M.brushed, [0, 2.0, D / 2 - 0.02]));
    // etiket
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshStandardMaterial({ map: Tex.sign([{ t: 'ÇEKER OCAK', b: true, s: 70 }], '#1d3557', '#fff', 512, 128) }));
    lab.position.set(0, H - 0.2, D / 2 + 0.003); g.add(lab);
    // içte birkaç şişe
    const b1 = P.bottle({ amber: true, h: 0.22, r: 0.045, label: Tex.bottleLabel('Derişik asit', 'Yalnızca çeker ocakta', true) });
    b1.position.set(-0.35, 0.92, -0.1); g.add(b1);
    const b2 = P.erlen({ s: 1.4 }); b2.position.set(0.2, 0.92, -0.05); g.add(b2);
    // dolap kapakları
    [-0.37, 0.37].forEach((x) => {
      g.add(P.box(0.7, 0.76, 0.02, body, [x, 0.47, D / 2 + 0.01], { cast: false }));
      g.add(P.box(0.012, 0.12, 0.02, M.brushed, [x + (x < 0 ? 0.3 : -0.3), 0.7, D / 2 + 0.025], { cast: false }));
    });
    // baza: gövdenin altında, içeri çekik (yan yüzleri gövdeyle aynı düzlemde olunca titriyordu)
    g.add(P.box(W - 0.04, 0.06, D - 0.06, dark, [0, 0.03, -0.01]));
    return g;
  }

  T.Room = { buildRoom, ROOM, BENCH_Y };
})(window.TUY);
