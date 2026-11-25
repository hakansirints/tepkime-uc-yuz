/* Deney masası: laboratuvar yalnızca masadan oluşur (oda, dolap, raf ve posterler yüklenmez).
   Daha az nesne ve doku: hızlı açılış, az bellek, telefonda akıcı görüntü ve daha az ısınma. */
(function (T) {
  'use strict';
  const P = T.Props, Tex = T.Tex;

  const BENCH_Y = 0.92; // masa üst yüzeyi
  // masa ölçüleri (m): beherler ortada, defter solda
  const DESK = { w: 1.6, d: 0.9, cx: 0, cz: 0.12 };

  function buildRoom(scene) {
    const g = new THREE.Group();
    g.name = 'room';
    g.add(buildDesk());

    // zeminde masanın yumuşak gölgesi (boşlukta asılı durmasın)
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const grd = x.createRadialGradient(128, 128, 10, 128, 128, 128);
    grd.addColorStop(0, 'rgba(40,48,52,0.55)');
    grd.addColorStop(0.55, 'rgba(40,48,52,0.22)');
    grd.addColorStop(1, 'rgba(40,48,52,0)');
    x.fillStyle = grd; x.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(DESK.w * 1.9, DESK.d * 2.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(DESK.cx, 0.001, DESK.cz);
    g.add(shadow);

    scene.add(g);
    return g;
  }

  function buildDesk() {
    const M = P.M;
    const g = new THREE.Group();
    g.name = 'island';
    const { w: L, d: D, cx, cz } = DESK;
    const topT = 0.035;
    const epoxy = new THREE.MeshStandardMaterial({ map: Tex.epoxy(), roughnessMap: Tex.epoxyRough(), roughness: 0.42, metalness: 0.0, envMapIntensity: 0.9 });
    const top = P.roundBox(L, topT, D, 0.02, epoxy);
    top.position.set(cx, BENCH_Y - topT / 2, cz);
    top.name = 'benchTop';
    g.add(top);

    // gövde: tek parça dolap, önünde kapak çizgileri ve kulplar
    const lam = new THREE.MeshStandardMaterial({ map: Tex.laminate('#dfe3e2'), roughness: 0.55 });
    const lamDark = new THREE.MeshStandardMaterial({ color: 0x3d4a52, roughness: 0.6 });
    const bodyH = BENCH_Y - topT - 0.1;
    g.add(P.box(L - 0.08, bodyH, D - 0.12, lam, [cx, 0.1 + bodyH / 2, cz]));
    g.add(P.box(L - 0.12, 0.1, D - 0.18, lamDark, [cx, 0.05, cz]));
    const zf = cz + (D - 0.12) / 2 + 0.011;
    const n = 4, dw = (L - 0.12) / n;
    for (let i = 0; i < n; i++) {
      const xx = cx - (L - 0.12) / 2 + dw * (i + 0.5);
      g.add(P.box(dw - 0.012, bodyH - 0.012, 0.018, lam, [xx, 0.1 + bodyH / 2, zf], { cast: false }));
      g.add(P.box(0.012, 0.13, 0.02, M.brushed, [xx + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), 0.1 + bodyH - 0.12, zf + 0.018], { cast: false }));
    }

    // açık laboratuvar defteri ve tükenmez kalem
    const nb = P.notebook(); nb.position.set(-0.55, BENCH_Y, 0.36); nb.rotation.y = 0.22; g.add(nb);
    const pen = P.pen(); pen.position.set(0.1, 0.0125, 0.02); pen.rotation.y = 0.5; nb.add(pen);
    return g;
  }

  T.Room = { buildRoom, BENCH_Y, DESK };
})(window.TUY);
