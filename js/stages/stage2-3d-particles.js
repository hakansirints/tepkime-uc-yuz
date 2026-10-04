/**
 * 3B (3D) TANECİK, İYON VE MOLEKÜL MOTORU
 * Three.js tabanlı, MEBİ Tasarım Sistemi standartlarına ve kimyasal bağ açılarına tam uyumlu 3D modelleme motoru.
 * 
 * Özellikler:
 * 1. Gerçek kimyasal geometri (H2O bükülmüş 104.5°, CO2 doğrusal 180°, NH3 üçgen piramit, HCO3- düzlemsel vb.)
 * 2. 3B Katı Çökelti Kristal Kafesleri (NaCl 2x2x2 küp, CaCO3, PbI2, AgCl kristalleri)
 * 3. CPK Standart Renkleri & Parlak Metalik/Plastik 3D Gölgelendirme
 * 4. Tek Master WebGLRenderer ile bellek dostu, WebGL context limitini aşmayan thumbnail üretimi
 * 5. Etkileşimli (döndürülebilir, yaklaştırılabilir) 3B Molekül İnceleme Sahnesi (Inspector)
 */

window.ATOM_COLORS = window.ATOM_COLORS || {
  H: '#0ea5e9',
  C: '#475569',
  O: '#ef4444',
  Na: '#9333ea',
  Cl: '#16a34a',
  Ca: '#ea580c',
  N: '#2563eb',
  Pb: '#475569',
  K: '#a855f7',
  I: '#c026d3',
  Ag: '#94a3b8',
  Cu: '#0284c7'
};

window.ELEMENT_NAMES = window.ELEMENT_NAMES || {
  H: 'Hidrojen',
  C: 'Karbon',
  O: 'Oksijen',
  Na: 'Sodyum',
  Cl: 'Klor',
  Ca: 'Kalsiyum',
  N: 'Azot',
  Pb: 'Kurşun',
  K: 'Potasyum',
  I: 'İyot',
  Ag: 'Gümüş',
  Cu: 'Bakır'
};

var ATOM_COLORS = window.ATOM_COLORS;
var ELEMENT_NAMES = window.ELEMENT_NAMES;

class Stage2Particle3DManager {
  constructor() {
    this.thumbnailCache = new Map();
    this.inspectorScene = null;
    this.inspectorCamera = null;
    this.inspectorRenderer = null;
    this.inspectorControls = null;
    this.currentInspectedMesh = null;
    this.animationFrameId = null;
    this.autoRotate = true;

    // Tekil offscreen renderer (Thumbnail'lar için)
    this.initOffscreenRenderer();
  }

  initOffscreenRenderer() {
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = 160;
    this.offscreenCanvas.height = 160;

    try {
      this.offscreenRenderer = new THREE.WebGLRenderer({
        canvas: this.offscreenCanvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
      });
      this.offscreenRenderer.setSize(160, 160);
      this.offscreenRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.offscreenScene = new THREE.Scene();
      this.offscreenCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      this.offscreenCamera.position.set(0, 0, 4.5);

      // Aydınlatma
      const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
      this.offscreenScene.add(ambLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.1);
      dirLight1.position.set(4, 5, 6);
      this.offscreenScene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.5);
      dirLight2.position.set(-4, -3, -4);
      this.offscreenScene.add(dirLight2);
    } catch (e) {
      console.warn("Offscreen 3D Renderer oluşturulamadı:", e);
    }
  }

  // CPK Renkleri ve Malzeme Yardımcısı
  createAtomMaterial(colorHex, isMetal = false) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: isMetal ? 0.2 : 0.3,
      metalness: isMetal ? 0.4 : 0.05
    });
  }

  createBondMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.35,
      metalness: 0.15
    });
  }

  // İki nokta arasına silindir bağ yerleştirme
  createBondCylinder(vStart, vEnd, radius = 0.08) {
    const dir = new THREE.Vector3().subVectors(vEnd, vStart);
    const length = dir.length();
    const center = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);

    const geom = new THREE.CylinderGeometry(radius, radius, length, 16);
    const mat = this.createBondMaterial();
    const cylinder = new THREE.Mesh(geom, mat);

    cylinder.position.copy(center);
    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return cylinder;
  }

  // İkili bağ (Double Bond)
  createDoubleBond(vStart, vEnd, radius = 0.06, offsetDist = 0.12) {
    const group = new THREE.Group();
    const dir = new THREE.Vector3().subVectors(vEnd, vStart).normalize();
    const length = new THREE.Vector3().subVectors(vEnd, vStart).length();
    const center = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);

    // Dikey eksen belirle
    let up = new THREE.Vector3(0, 0, 1);
    if (Math.abs(dir.z) > 0.8) up = new THREE.Vector3(0, 1, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(offsetDist);

    const geom = new THREE.CylinderGeometry(radius, radius, length, 14);
    const mat = this.createBondMaterial();

    const c1 = new THREE.Mesh(geom, mat);
    c1.position.copy(center).add(perp);
    c1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(c1);

    const c2 = new THREE.Mesh(geom, mat);
    c2.position.copy(center).sub(perp);
    c2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(c2);

    return group;
  }

  // Yük Halesi / Yörünge Halkası: Kullanıcı talebi doğrultusunda kaldırıldı (halka yok)
  createChargeHalo() {
    return new THREE.Group();
  }

  // Atom veya İyon: Madde üzerinde kimyasal gösterimini net olarak yazan 3B küre
  createAtomWithSymbol(symbol, colorHex, radius = 0.85) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Arka plan rengi
    ctx.fillStyle = colorHex || '#64748b';
    ctx.fillRect(0, 0, 512, 256);

    // 3D küresel ışık gölge efekti
    const grad = ctx.createRadialGradient(256, 128, 40, 256, 128, 256);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Madde üzerindeki kimyasal sembol
    ctx.fillStyle = '#ffffff';
    const symLen = (symbol || '').length;
    let fontSize = 140;
    if (symLen === 2) fontSize = 115;
    else if (symLen >= 3) fontSize = 85;

    ctx.font = `900 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Hem ön (256, 128) hem arka (0 ve 512, 128) yüzeyine yaz (küre her açıdan okunaklı kalsın)
    ctx.fillText(symbol, 256, 128);
    ctx.fillText(symbol, 0, 128);
    ctx.fillText(symbol, 512, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.22,
      metalness: 0.12
    });

    const geom = new THREE.SphereGeometry(radius, 32, 28);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.y = -Math.PI / 2;
    return mesh;
  }

  // =========================================================================
  // 3B MOLEKÜL VE İYON OLUŞTURUCULARI (Her atom etiketli ve %25-30 daha büyük)
  // =========================================================================

  buildSpecies3D(symbol) {
    const group = new THREE.Group();

    switch (symbol) {
      // 1. TEK ATOM VE İYONLAR
      case 'Na⁺': {
        group.add(this.createAtomWithSymbol('Na⁺', '#9333ea', 0.88));
        break;
      }
      case '2 Na⁺': {
        const m1 = this.createAtomWithSymbol('Na⁺', '#9333ea', 0.72);
        m1.position.set(-0.75, 0, 0);
        group.add(m1);
        const m2 = this.createAtomWithSymbol('Na⁺', '#9333ea', 0.72);
        m2.position.set(0.75, 0, 0);
        group.add(m2);
        break;
      }
      case 'Cl⁻': {
        group.add(this.createAtomWithSymbol('Cl⁻', '#16a34a', 0.98));
        break;
      }
      case '2 Cl⁻': {
        const m1 = this.createAtomWithSymbol('Cl⁻', '#16a34a', 0.82);
        m1.position.set(-0.85, 0, 0);
        group.add(m1);
        const m2 = this.createAtomWithSymbol('Cl⁻', '#16a34a', 0.82);
        m2.position.set(0.85, 0, 0);
        group.add(m2);
        break;
      }
      case 'H⁺': {
        group.add(this.createAtomWithSymbol('H⁺', '#0ea5e9', 0.68));
        break;
      }
      case '2 H⁺': {
        const m1 = this.createAtomWithSymbol('H⁺', '#0ea5e9', 0.58);
        m1.position.set(-0.55, 0, 0);
        group.add(m1);
        const m2 = this.createAtomWithSymbol('H⁺', '#0ea5e9', 0.58);
        m2.position.set(0.55, 0, 0);
        group.add(m2);
        break;
      }
      case 'Ca²⁺': {
        group.add(this.createAtomWithSymbol('Ca²⁺', '#ea580c', 0.98));
        break;
      }
      case 'Pb²⁺': {
        group.add(this.createAtomWithSymbol('Pb²⁺', '#475569', 1.05));
        break;
      }
      case 'K⁺': {
        group.add(this.createAtomWithSymbol('K⁺', '#a855f7', 0.98));
        break;
      }
      case '2 K⁺': {
        const m1 = this.createAtomWithSymbol('K⁺', '#a855f7', 0.78);
        m1.position.set(-0.8, 0, 0);
        group.add(m1);
        const m2 = this.createAtomWithSymbol('K⁺', '#a855f7', 0.78);
        m2.position.set(0.8, 0, 0);
        group.add(m2);
        break;
      }
      case 'I⁻': {
        group.add(this.createAtomWithSymbol('I⁻', '#c026d3', 1.05));
        break;
      }
      case '2 I⁻': {
        const m1 = this.createAtomWithSymbol('I⁻', '#c026d3', 0.85);
        m1.position.set(-0.9, 0, 0);
        group.add(m1);
        const m2 = this.createAtomWithSymbol('I⁻', '#c026d3', 0.85);
        m2.position.set(0.9, 0, 0);
        group.add(m2);
        break;
      }
      case 'Ag⁺': {
        group.add(this.createAtomWithSymbol('Ag⁺', '#94a3b8', 0.92));
        break;
      }
      case 'Cu²⁺': {
        group.add(this.createAtomWithSymbol('Cu²⁺', '#0284c7', 0.95));
        break;
      }

      // 2. BÜKÜLMÜŞ SU MOLEKÜLÜ (H₂O — 104.5°)
      case 'H₂O':
      case '2 H₂O': {
        const oMesh = this.createAtomWithSymbol('O', '#ef4444', 0.78);
        oMesh.position.set(0, 0.18, 0);
        group.add(oMesh);

        const hDist = 0.95;
        const halfAngle = (104.5 / 2) * (Math.PI / 180);
        const h1Pos = new THREE.Vector3(hDist * Math.sin(halfAngle), 0.18 - hDist * Math.cos(halfAngle), 0);
        const h2Pos = new THREE.Vector3(-hDist * Math.sin(halfAngle), 0.18 - hDist * Math.cos(halfAngle), 0);

        const h1 = this.createAtomWithSymbol('H', '#0ea5e9', 0.48);
        h1.position.copy(h1Pos);
        group.add(h1);

        const h2 = this.createAtomWithSymbol('H', '#0ea5e9', 0.48);
        h2.position.copy(h2Pos);
        group.add(h2);

        group.add(this.createBondCylinder(oMesh.position, h1Pos, 0.08));
        group.add(this.createBondCylinder(oMesh.position, h2Pos, 0.08));
        break;
      }

      // 3. DOĞRUSAL KARBONDİOKSİT (CO₂ — 180°)
      case 'CO₂': {
        const cMesh = this.createAtomWithSymbol('C', '#334155', 0.70);
        group.add(cMesh);

        const o1Pos = new THREE.Vector3(1.25, 0, 0);
        const o2Pos = new THREE.Vector3(-1.25, 0, 0);

        const o1 = this.createAtomWithSymbol('O', '#ef4444', 0.64);
        o1.position.copy(o1Pos);
        group.add(o1);

        const o2 = this.createAtomWithSymbol('O', '#ef4444', 0.64);
        o2.position.copy(o2Pos);
        group.add(o2);

        group.add(this.createDoubleBond(cMesh.position, o1Pos, 0.06, 0.12));
        group.add(this.createDoubleBond(cMesh.position, o2Pos, 0.06, 0.12));
        break;
      }

      // 4. OKSİJEN GAZI (O₂)
      case 'O₂': {
        const p1 = new THREE.Vector3(-0.7, 0, 0);
        const p2 = new THREE.Vector3(0.7, 0, 0);

        const o1 = this.createAtomWithSymbol('O', '#ef4444', 0.68);
        o1.position.copy(p1);
        group.add(o1);

        const o2 = this.createAtomWithSymbol('O', '#ef4444', 0.68);
        o2.position.copy(p2);
        group.add(o2);

        group.add(this.createDoubleBond(p1, p2, 0.07, 0.14));
        break;
      }

      // 5. BİKARBONAT KÖKÜ (HCO₃⁻)
      case 'HCO₃⁻': {
        const cMesh = this.createAtomWithSymbol('C', '#334155', 0.64);
        group.add(cMesh);

        const o1Pos = new THREE.Vector3(0, 1.05, 0);
        const o2Pos = new THREE.Vector3(0.95, -0.5, 0);
        const o3Pos = new THREE.Vector3(-0.95, -0.5, 0);

        const o1 = this.createAtomWithSymbol('O', '#ef4444', 0.58);
        o1.position.copy(o1Pos);
        group.add(o1);

        const o2 = this.createAtomWithSymbol('O', '#ef4444', 0.58);
        o2.position.copy(o2Pos);
        group.add(o2);

        const o3 = this.createAtomWithSymbol('O', '#ef4444', 0.58);
        o3.position.copy(o3Pos);
        group.add(o3);

        const hPos = new THREE.Vector3(-1.45, -0.2, 0);
        const h = this.createAtomWithSymbol('H', '#0ea5e9', 0.44);
        h.position.copy(hPos);
        group.add(h);

        group.add(this.createDoubleBond(cMesh.position, o1Pos, 0.05, 0.1));
        group.add(this.createBondCylinder(cMesh.position, o2Pos, 0.08));
        group.add(this.createBondCylinder(cMesh.position, o3Pos, 0.08));
        group.add(this.createBondCylinder(o3Pos, hPos, 0.07));
        break;
      }

      // 6. KARBONAT KÖKÜ (CO₃²⁻)
      case 'CO₃²⁻': {
        const cMesh = this.createAtomWithSymbol('C', '#334155', 0.66);
        group.add(cMesh);

        for (let i = 0; i < 3; i++) {
          const ang = (i * 120 * Math.PI) / 180;
          const oPos = new THREE.Vector3(1.05 * Math.sin(ang), 1.05 * Math.cos(ang), 0);
          const o = this.createAtomWithSymbol('O', '#ef4444', 0.58);
          o.position.copy(oPos);
          group.add(o);
          group.add(this.createBondCylinder(cMesh.position, oPos, 0.08));
        }
        break;
      }

      // 7. AMONYAK GAZI (NH₃)
      case 'NH₃': {
        const nMesh = this.createAtomWithSymbol('N', '#2563eb', 0.70);
        nMesh.position.set(0, 0.38, 0);
        group.add(nMesh);

        for (let i = 0; i < 3; i++) {
          const ang = (i * 120 * Math.PI) / 180;
          const hPos = new THREE.Vector3(0.82 * Math.cos(ang), -0.28, 0.82 * Math.sin(ang));
          const h = this.createAtomWithSymbol('H', '#0ea5e9', 0.44);
          h.position.copy(hPos);
          group.add(h);
          group.add(this.createBondCylinder(nMesh.position, hPos, 0.07));
        }
        break;
      }

      // 8. AMONYUM İYONU (NH₄⁺)
      case 'NH₄⁺': {
        const nMesh = this.createAtomWithSymbol('N', '#2563eb', 0.70);
        group.add(nMesh);

        const tet = [
          new THREE.Vector3(0.65, 0.65, 0.65),
          new THREE.Vector3(-0.65, -0.65, 0.65),
          new THREE.Vector3(-0.65, 0.65, -0.65),
          new THREE.Vector3(0.65, -0.65, -0.65)
        ];
        tet.forEach(pos => {
          const h = this.createAtomWithSymbol('H', '#0ea5e9', 0.44);
          h.position.copy(pos);
          group.add(h);
          group.add(this.createBondCylinder(nMesh.position, pos, 0.07));
        });
        break;
      }

      // 9. HİDROKSİT İYONU (OH⁻ / 2 OH⁻)
      case 'OH⁻':
      case '2 OH⁻': {
        const o = this.createAtomWithSymbol('O', '#ef4444', 0.68);
        o.position.set(-0.4, 0, 0);
        group.add(o);

        const h = this.createAtomWithSymbol('H', '#0ea5e9', 0.48);
        h.position.set(0.5, 0, 0);
        group.add(h);

        group.add(this.createBondCylinder(o.position, h.position, 0.08));
        break;
      }

      // 10. KATILAR VE KRİSTAL KAFESLER (NaCl, CaCO₃, PbI₂, AgCl vb.)
      case 'NaCl': {
        // 2x2x2 Kübik Kristal Kafes (Alternatif Na ve Cl)
        const d = 0.65;
        for (let x = -1; x <= 1; x += 2) {
          for (let y = -1; y <= 1; y += 2) {
            for (let z = -1; z <= 1; z += 2) {
              const isNa = (x + y + z + 3) % 4 === 0;
              const sym = isNa ? 'Na' : 'Cl';
              const col = isNa ? '#9333ea' : '#16a34a';
              const r = isNa ? 0.44 : 0.52;
              const sphere = this.createAtomWithSymbol(sym, col, r);
              sphere.position.set(x * d, y * d, z * d);
              group.add(sphere);
            }
          }
        }
        const wireBox = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(2 * d, 2 * d, 2 * d)), 0xa1a1aa);
        group.add(wireBox);
        break;
      }

      case 'CaCO₃(k)': {
        // Kireçtaşı Kristal Kümesi (Ca, C, O etiketli)
        const ca1 = this.createAtomWithSymbol('Ca', '#ea580c', 0.64);
        ca1.position.set(-0.7, -0.45, 0);
        group.add(ca1);

        const ca2 = this.createAtomWithSymbol('Ca', '#ea580c', 0.64);
        ca2.position.set(0.7, 0.45, 0);
        group.add(ca2);

        const cCenter = this.createAtomWithSymbol('C', '#334155', 0.48);
        cCenter.position.set(0, 0, 0);
        group.add(cCenter);

        for (let i = 0; i < 3; i++) {
          const ang = (i * 120 * Math.PI) / 180;
          const o = this.createAtomWithSymbol('O', '#ef4444', 0.46);
          const pos = new THREE.Vector3(0.65 * Math.cos(ang), 0.65 * Math.sin(ang), 0);
          o.position.copy(pos);
          group.add(o);
          group.add(this.createBondCylinder(cCenter.position, pos, 0.06));
        }
        break;
      }

      case 'PbI₂(k)': {
        // Kurşun İyodür Altıgen Kristal (Pb ve I etiketli)
        const pb = this.createAtomWithSymbol('Pb', '#475569', 0.75);
        group.add(pb);

        const i1 = this.createAtomWithSymbol('I', '#c026d3', 0.65);
        i1.position.set(-0.85, 0.5, 0.2);
        group.add(i1);

        const i2 = this.createAtomWithSymbol('I', '#c026d3', 0.65);
        i2.position.set(0.85, -0.5, -0.2);
        group.add(i2);

        group.add(this.createBondCylinder(pb.position, i1.position, 0.08));
        group.add(this.createBondCylinder(pb.position, i2.position, 0.08));
        break;
      }

      case 'AgCl(k)': {
        // Beyaz Gümüş Klorür Kristal Kümesi (Ag ve Cl etiketli)
        const ag1 = this.createAtomWithSymbol('Ag', '#94a3b8', 0.58);
        ag1.position.set(-0.55, 0.45, 0);
        group.add(ag1);

        const cl1 = this.createAtomWithSymbol('Cl', '#16a34a', 0.62);
        cl1.position.set(0.55, 0.45, 0);
        group.add(cl1);

        const ag2 = this.createAtomWithSymbol('Ag', '#94a3b8', 0.58);
        ag2.position.set(0.55, -0.45, 0);
        group.add(ag2);

        const cl2 = this.createAtomWithSymbol('Cl', '#16a34a', 0.62);
        cl2.position.set(-0.55, -0.45, 0);
        group.add(cl2);

        group.add(this.createBondCylinder(ag1.position, cl1.position, 0.06));
        group.add(this.createBondCylinder(cl1.position, ag2.position, 0.06));
        group.add(this.createBondCylinder(ag2.position, cl2.position, 0.06));
        group.add(this.createBondCylinder(cl2.position, ag1.position, 0.06));
        break;
      }

      case 'AgI(k)': {
        // Sarı Gümüş İyodür Kristal Kümesi (Ag ve I etiketli)
        const ag1 = this.createAtomWithSymbol('Ag', '#94a3b8', 0.58);
        ag1.position.set(-0.55, 0.45, 0);
        group.add(ag1);

        const i1 = this.createAtomWithSymbol('I', '#c026d3', 0.65);
        i1.position.set(0.55, 0.45, 0);
        group.add(i1);

        const ag2 = this.createAtomWithSymbol('Ag', '#94a3b8', 0.58);
        ag2.position.set(0.55, -0.45, 0);
        group.add(ag2);

        const i2 = this.createAtomWithSymbol('I', '#c026d3', 0.65);
        i2.position.set(-0.55, -0.45, 0);
        group.add(i2);

        group.add(this.createBondCylinder(ag1.position, i1.position, 0.06));
        group.add(this.createBondCylinder(i1.position, ag2.position, 0.06));
        group.add(this.createBondCylinder(ag2.position, i2.position, 0.06));
        group.add(this.createBondCylinder(i2.position, ag1.position, 0.06));
        break;
      }

      case 'Cu(OH)₂(k)': {
        // Bakır(II) Hidroksit Mavi Çökelti (Cu, O, H etiketli)
        const cu = this.createAtomWithSymbol('Cu', '#0284c7', 0.75);
        group.add(cu);

        const o1Pos = new THREE.Vector3(-0.85, 0.35, 0);
        const o2Pos = new THREE.Vector3(0.85, -0.35, 0);
        const o1 = this.createAtomWithSymbol('O', '#ef4444', 0.55);
        o1.position.copy(o1Pos);
        group.add(o1);
        const o2 = this.createAtomWithSymbol('O', '#ef4444', 0.55);
        o2.position.copy(o2Pos);
        group.add(o2);

        const h1Pos = new THREE.Vector3(-1.35, 0.55, 0);
        const h2Pos = new THREE.Vector3(1.35, -0.55, 0);
        const h1 = this.createAtomWithSymbol('H', '#0ea5e9', 0.44);
        h1.position.copy(h1Pos);
        group.add(h1);
        const h2 = this.createAtomWithSymbol('H', '#0ea5e9', 0.44);
        h2.position.copy(h2Pos);
        group.add(h2);

        group.add(this.createBondCylinder(cu.position, o1Pos, 0.07));
        group.add(this.createBondCylinder(cu.position, o2Pos, 0.07));
        group.add(this.createBondCylinder(o1Pos, h1Pos, 0.06));
        group.add(this.createBondCylinder(o2Pos, h2Pos, 0.06));
        break;
      }

      case 'CuCO₃(k)': {
        // Bakır(II) Karbonat Yeşil Çökelti (Cu, C, O etiketli)
        const cu = this.createAtomWithSymbol('Cu', '#0284c7', 0.75);
        cu.position.set(-0.7, -0.4, 0);
        group.add(cu);

        const c = this.createAtomWithSymbol('C', '#334155', 0.52);
        c.position.set(0.4, 0.2, 0);
        group.add(c);

        for (let i = 0; i < 3; i++) {
          const ang = (i * 120 * Math.PI) / 180;
          const o = this.createAtomWithSymbol('O', '#ef4444', 0.48);
          const pos = new THREE.Vector3(c.position.x + 0.65 * Math.cos(ang), c.position.y + 0.65 * Math.sin(ang), 0);
          o.position.copy(pos);
          group.add(o);
          group.add(this.createBondCylinder(c.position, pos, 0.06));
        }
        break;
      }

      case '2 H₂O₂': {
        const o1Pos = new THREE.Vector3(-0.55, 0, 0);
        const o2Pos = new THREE.Vector3(0.55, 0, 0);
        const o1 = this.createAtomWithSymbol('O', '#ef4444', 0.64);
        o1.position.copy(o1Pos);
        group.add(o1);
        const o2 = this.createAtomWithSymbol('O', '#ef4444', 0.64);
        o2.position.copy(o2Pos);
        group.add(o2);

        const h1Pos = new THREE.Vector3(-1.05, 0.5, 0);
        const h2Pos = new THREE.Vector3(1.05, -0.5, 0);
        const h1 = this.createAtomWithSymbol('H', '#0ea5e9', 0.46);
        h1.position.copy(h1Pos);
        group.add(h1);
        const h2 = this.createAtomWithSymbol('H', '#0ea5e9', 0.46);
        h2.position.copy(h2Pos);
        group.add(h2);

        group.add(this.createBondCylinder(o1Pos, o2Pos, 0.08));
        group.add(this.createBondCylinder(o1Pos, h1Pos, 0.07));
        group.add(this.createBondCylinder(o2Pos, h2Pos, 0.07));
        break;
      }

      case 'KI': {
        const k = this.createAtomWithSymbol('K', '#a855f7', 0.78);
        k.position.set(-0.55, 0, 0);
        group.add(k);

        const i = this.createAtomWithSymbol('I', '#c026d3', 0.82);
        i.position.set(0.55, 0, 0);
        group.add(i);

        group.add(this.createBondCylinder(k.position, i.position, 0.08));
        break;
      }

      // 11. ETKİLEŞİRKEN EVRESİ ARA TÜRLERİ VE TEK ATOM PARÇALARI
      default: {
        if (symbol.startsWith('[')) {
          // Çarpışma ve Etkileşim çifti (Ara tür)
          const core = this.createAtomWithSymbol('⚡', '#f59e0b', 0.72);
          group.add(core);
        } else {
          // Madde üzerinde kimyasal gösterimi yazan 3B Tek Atom Küresi
          const colorHex = (window.ATOM_COLORS && window.ATOM_COLORS[symbol]) || '#64748b';
          const atomMesh = this.createAtomWithSymbol(symbol, colorHex, 0.88);
          group.add(atomMesh);
        }
        break;
      }
    }

    return group;
  }

  // =========================================================================
  // THUMBNAIL (ÖNİZLEME) OLUŞTURUCU (Hızlı & Bellek Tasarruflu)
  // =========================================================================

  getThumbnailUrl(symbol) {
    if (this.thumbnailCache.has(symbol)) {
      return this.thumbnailCache.get(symbol);
    }

    if (!this.offscreenRenderer) return '';

    // Sahneyi temizle
    while (this.offscreenScene.children.length > 3) {
      this.offscreenScene.remove(this.offscreenScene.children[this.offscreenScene.children.length - 1]);
    }

    const meshGroup = this.buildSpecies3D(symbol);
    if (ATOM_COLORS[symbol]) {
      meshGroup.rotation.x = 0;
      meshGroup.rotation.y = 0;
    } else {
      meshGroup.rotation.x = 0.20;
      meshGroup.rotation.y = 0.35;
    }
    this.offscreenScene.add(meshGroup);

    this.offscreenRenderer.render(this.offscreenScene, this.offscreenCamera);
    const dataUrl = this.offscreenCanvas.toDataURL('image/png');
    this.thumbnailCache.set(symbol, dataUrl);
    return dataUrl;
  }

  // =========================================================================
  // ETKİLEŞİMLİ 3B MOLEKÜL İNCELEME SAHNESİ (INSPECTOR)
  // =========================================================================

  initInspector(containerElement) {
    if (!containerElement) return;
    this.inspectorContainer = containerElement;

    const width = containerElement.clientWidth || 320;
    const height = containerElement.clientHeight || 180;

    this.inspectorScene = new THREE.Scene();
    this.inspectorCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.inspectorCamera.position.set(0, 0, 4.5);

    this.inspectorRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.inspectorRenderer.setSize(width, height);
    this.inspectorRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    containerElement.innerHTML = '';
    containerElement.appendChild(this.inspectorRenderer.domElement);

    // OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.inspectorControls = new THREE.OrbitControls(this.inspectorCamera, this.inspectorRenderer.domElement);
      this.inspectorControls.enableDamping = true;
      this.inspectorControls.dampingFactor = 0.08;
      this.inspectorControls.enableZoom = true;
      this.inspectorControls.minDistance = 2.5;
      this.inspectorControls.maxDistance = 8;
    }

    // Aydınlatma
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    this.inspectorScene.add(amb);

    const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
    light1.position.set(4, 5, 5);
    this.inspectorScene.add(light1);

    const light2 = new THREE.DirectionalLight(0x93c5fd, 0.6);
    light2.position.set(-4, -4, -3);
    this.inspectorScene.add(light2);

    // Animasyon döngüsü
    this.startInspectorLoop();
  }

  inspectSpecies(symbol) {
    if (!this.inspectorScene) return;

    if (this.currentInspectedMesh) {
      this.inspectorScene.remove(this.currentInspectedMesh);
      this.currentInspectedMesh = null;
    }

    const mesh = this.buildSpecies3D(symbol);
    mesh.rotation.x = 0.2;
    mesh.rotation.y = 0.4;
    this.inspectorScene.add(mesh);
    this.currentInspectedMesh = mesh;

    // Kamera ve kontrolleri sıfırla
    if (this.inspectorControls) {
      this.inspectorControls.reset();
    }
    this.inspectorCamera.position.set(0, 0, 4.5);
  }

  startInspectorLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (this.currentInspectedMesh && this.autoRotate) {
        this.currentInspectedMesh.rotation.y += 0.012;
      }

      if (this.inspectorControls) {
        this.inspectorControls.update();
      }

      if (this.inspectorRenderer && this.inspectorScene && this.inspectorCamera) {
        this.inspectorRenderer.render(this.inspectorScene, this.inspectorCamera);
      }
    };
    animate();
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.inspectorRenderer) {
      this.inspectorRenderer.dispose();
    }
  }
}

// Global nesneye bağla
if (typeof window !== 'undefined') {
  window.Stage2Particle3DManager = Stage2Particle3DManager;
  window.stage2Particle3DEngine = new Stage2Particle3DManager();
}
