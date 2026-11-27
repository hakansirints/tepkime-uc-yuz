/* Tanecik (atom/iyon/molekül/kristal) 3B modelleri — CPK renkleri, yumuşak plastik görünüm. */
(function (T) {
  'use strict';
  const Mol = {};
  let sphereGeo = null;
  const matCache = {};

  function geo() {
    if (!sphereGeo) sphereGeo = new THREE.SphereGeometry(1, 40, 28);
    return sphereGeo;
  }
  Mol.atomMaterial = function (el, opts) {
    const key = el + (opts ? JSON.stringify(opts) : '');
    if (matCache[key]) return matCache[key];
    const E = T.ELEMENTS[el];
    const m = new THREE.MeshPhysicalMaterial({
      color: E.color, roughness: 0.32, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.25,
      sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 1.1
    });
    if (opts && opts.ghost) { m.transparent = true; m.opacity = 0.16; m.depthWrite = false; m.clearcoat = 0; }
    matCache[key] = m;
    return m;
  };

  /** Metinli sprite (etiket) */
  Mol.label = function (text, opts) {
    opts = opts || {};
    const c = document.createElement('canvas');
    const fs = 64;
    const x = c.getContext('2d');
    x.font = `700 ${fs}px "Segoe UI", system-ui, Arial`;
    const w = Math.ceil(x.measureText(text).width) + 40;
    c.width = w; c.height = fs + 34;
    x.font = `700 ${fs}px "Segoe UI", system-ui, Arial`;
    const bg = opts.bg || 'rgba(6,18,34,0.78)';
    const r = 26;
    x.fillStyle = bg;
    x.beginPath(); x.moveTo(r, 0); x.lineTo(w - r, 0); x.quadraticCurveTo(w, 0, w, r); x.lineTo(w, c.height - r); x.quadraticCurveTo(w, c.height, w - r, c.height);
    x.lineTo(r, c.height); x.quadraticCurveTo(0, c.height, 0, c.height - r); x.lineTo(0, r); x.quadraticCurveTo(0, 0, r, 0); x.fill();
    if (opts.border) { x.strokeStyle = opts.border; x.lineWidth = 5; x.stroke(); }
    x.fillStyle = opts.color || '#eaf6ff';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, w / 2, c.height / 2 + 3);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    const sm = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false });
    const s = new THREE.Sprite(sm);
    const h = opts.h || 0.42;
    s.scale.set(h * (w / c.height), h, 1);
    s.renderOrder = 50;
    s.userData.isLabel = true;
    return s;
  };

  /**
   * Bir türün 3B modeli.
   * Döndürür: Group (userData: {sid, atoms:[Mesh], radius})
   */
  Mol.build = function (sid, opts) {
    opts = opts || {};
    const S = T.SPECIES[sid];
    const g = new THREE.Group();
    g.userData.sid = sid;
    const atoms = [];
    S.atoms.forEach((a, i) => {
      const E = T.ELEMENTS[a.el];
      const m = new THREE.Mesh(geo(), Mol.atomMaterial(a.el));
      m.scale.setScalar(E.r);
      m.position.set(a.p[0], a.p[1], a.p[2]);
      m.userData = { el: a.el, idx: i, sid, base: m.position.clone() };
      g.add(m);
      atoms.push(m);
    });
    // kristal örgü (soluk komşular + çerçeve)
    if (S.kind === 'crystal') {
      const lat = new THREE.Group();
      const A = S.lattice.a;
      const occupied = S.comps.map((c) => c[1]);
      const o0 = occupied[0];
      const cat = S.lattice.cation, an = S.lattice.anion;
      const xs = occupied.map((o) => Math.round((o[0] - o0[0]) / A));
      const gmat = {};
      const ghostMat = (el) => (gmat[el] = gmat[el] || Mol.atomMaterial(el, { ghost: true }).clone());
      const span = Math.max(...xs) - Math.min(...xs);
      const iMin = Math.min(...xs) - (span < 2 ? 1 : 0), iMax = Math.max(...xs);
      for (let i = iMin; i <= iMax; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 0; k++) {
        const p = [o0[0] + i * A, o0[1] + j * A, o0[2] + k * A];
        if (occupied.some((o) => Math.abs(o[0] - p[0]) < 0.3 && Math.abs(o[1] - p[1]) < 0.3 && Math.abs(o[2] - p[2]) < 0.3)) continue;
        const el = (Math.abs(i + j + k) % 2 === 0) ? cat : an;
        const m = new THREE.Mesh(geo(), ghostMat(el));
        m.scale.setScalar(T.ELEMENTS[el].r * 0.85);
        m.position.set(p[0], p[1], p[2]);
        m.userData.ghost = true;
        lat.add(m);
      }
      const bw = (iMax - iMin + 1) * A, cxm = o0[0] + ((iMin + iMax) / 2) * A;
      const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bw, A * 3, A * 2)),
        new THREE.LineBasicMaterial({ color: 0x9ccff0, transparent: true, opacity: 0.3 }));
      box.position.set(cxm, 0, -A / 2);
      lat.add(box);
      lat.position.x = 0;
      lat.userData.lattice = true;
      g.add(lat);
      g.userData.lattice = lat;
    }
    g.userData.atoms = atoms;
    // yarıçap (yerleşim için)
    let rad = 0;
    atoms.forEach((m) => { rad = Math.max(rad, m.position.length() + m.scale.x); });
    if (S.kind === 'crystal') rad = Math.max(rad, S.lattice.a * 1.6);
    g.userData.radius = rad;
    if (opts.label !== false) {
      const lbl = Mol.label(T.speciesLabel(sid), { h: opts.labelH || 0.5 });
      lbl.position.set(0, -rad - 0.38, 0.4);
      g.add(lbl);
      g.userData.label = lbl;
      g.userData.labelH = opts.labelH || 0.5;
    }
    return g;
  };

  /* Vurgulama (B+A): element rengi hiç değişmez. Seçilen taneciğin çevresinde kameraya dönük
     ince bir halka çıkar, etiket rozeti vurgu rengine döner. Diğerlerini soluklaştırmak için Mol.setDim. */
  Mol.HL = 0x0a84ff;       // seçim (mavi)
  Mol.HL_TRACK = 0x1fa24a; // atom takibi doğru sonuç (yeşil)
  const _q = new THREE.Quaternion();
  function faceCamera(renderer, scene, camera) {
    // halka, grubun dönüşünden bağımsız olarak hep kameraya bakar
    this.parent.getWorldQuaternion(_q);
    this.quaternion.copy(_q.invert().multiply(camera.quaternion));
    this.updateMatrixWorld(true);
  }
  const hexCss = (c) => '#' + new THREE.Color(c).getHexString();
  Mol.setHighlight = function (g, on, color) {
    const col = color || Mol.HL;
    g.userData.hl = on ? col : null;
    let ring = g.userData.hlRing;
    if (on && !ring) {
      ring = new THREE.Mesh(new THREE.TorusGeometry(g.userData.radius + 0.24, 0.032, 8, 80),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
      ring.renderOrder = 45;
      ring.userData.ghost = true; ring.userData.noPick = true; ring.userData.noFit = true; ring.userData.hlRing = true;
      ring.onBeforeRender = faceCamera;
      g.add(ring);
      g.userData.hlRing = ring;
    }
    if (ring) { ring.visible = !!on; if (on) ring.material.color.set(col); }
    // etiket rozeti: seçiliyken vurgu renginde
    const lbl = g.userData.label;
    if (lbl) {
      let hl = g.userData.labelHl;
      if (on && (!hl || hl.userData.col !== col)) {
        if (hl) g.remove(hl);
        hl = Mol.label(T.speciesLabel(g.userData.sid), { h: g.userData.labelH || 0.5, bg: hexCss(col), color: '#ffffff' });
        hl.position.copy(lbl.position); hl.userData.col = col; hl.userData.noFit = true;
        g.add(hl); g.userData.labelHl = hl;
      }
      if (hl) hl.visible = !!on;
      lbl.visible = !on;
    }
  };
  /** Soluklaştır: odak dışında kalan tanecik saydamlaşır (dokunulabilir kalır) */
  Mol.setDim = function (g, on) {
    on = !!on;
    if (!!g.userData.dim === on) return;
    g.userData.dim = on;
    g.traverse((o) => {
      if (!o.material || o.userData.hlRing || o === g.userData.labelHl) return;
      if (on) {
        if (!o.userData.dimMat || o.userData.dimBase !== o.material) {
          const m = o.material.clone();
          m.transparent = true; m.opacity = (o.material.opacity == null ? 1 : o.material.opacity) * 0.28; m.depthWrite = false;
          o.userData.dimMat = m; o.userData.dimBase = o.material;
        }
        o.material = o.userData.dimMat;
      } else if (o.userData.dimBase) {
        o.material = o.userData.dimBase;
      }
    });
  };
  /** Tek atomu işaretle (atom takibi): ince halka; atomun rengi değişmez */
  Mol.markAtom = function (mesh, color) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 10, 56), new THREE.MeshBasicMaterial({ color: color || 0xffd84a, transparent: true, opacity: 0.95, depthTest: false }));
    ring.renderOrder = 40;
    ring.userData.ring = true; ring.userData.noPick = true; ring.userData.ghost = true;
    ring.onBeforeRender = faceCamera;
    mesh.add(ring);
    return ring;
  };

  /** Basit sayısal yerleşim: türleri dairesel/ızgara düzende dağıt */
  Mol.layout = function (items, opts) {
    opts = opts || {};
    const n = items.length;
    if (!n) return [];
    const gap = opts.gap || 0.55;
    // satır sayısı
    const cols = opts.cols || Math.ceil(Math.sqrt(n * (opts.aspect || 1.4)));
    const rows = Math.ceil(n / cols);
    const cellW = Math.max(...items.map((g) => g.userData.radius)) * 2 + gap;
    const cellH = cellW * 0.95 + 0.4;
    const out = [];
    items.forEach((g, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = Math.min(cols, n - r * cols);
      const x = (c - (inRow - 1) / 2) * cellW;
      const y = ((rows - 1) / 2 - r) * cellH;
      const jitter = opts.jitter ? (Math.sin(i * 12.9898) * 0.25) : 0;
      out.push(new THREE.Vector3(x + jitter, y + (opts.jitter ? Math.cos(i * 78.233) * 0.2 : 0), opts.jitter ? Math.sin(i * 3.1) * 0.6 : 0));
    });
    return out;
  };

  T.Mol = Mol;
})(window.TUY);
