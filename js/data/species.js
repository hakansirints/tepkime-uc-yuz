/* Atomlar ve kimyasal türler (tanecikler).
   Renkler sunumdaki "Maddelerin Modelleri" renk anahtarına göre seçildi. */
(function (T) {
  'use strict';

  const ELEMENTS = {
    H:  { name: 'Hidrojen', color: 0xf4f6f8, r: 0.30 },
    C:  { name: 'Karbon',   color: 0x2a2d31, r: 0.50 },
    N:  { name: 'Azot',     color: 0x2f5fe0, r: 0.48 },
    O:  { name: 'Oksijen',  color: 0xe32630, r: 0.46 },
    Na: { name: 'Sodyum',   color: 0x9b4fe0, r: 0.74 },
    K:  { name: 'Potasyum', color: 0x7c3aed, r: 0.86 },
    Cl: { name: 'Klor',     color: 0x3fc04a, r: 0.70 },
    I:  { name: 'İyot',     color: 0x5b1a8f, r: 0.88 },
    Ca: { name: 'Kalsiyum', color: 0x1e6b2c, r: 0.78 },
    Pb: { name: 'Kurşun',   color: 0xdb6fbf, r: 0.86 },
    Ag: { name: 'Gümüş',    color: 0xcfc8a6, r: 0.76 },
    Cu: { name: 'Bakır',    color: 0xc4794a, r: 0.66 }
  };
  // Sayaçlarda gösterim sırası
  const EL_ORDER = ['H', 'C', 'N', 'O', 'Na', 'K', 'Ca', 'Cu', 'Ag', 'Pb', 'Cl', 'I'];

  // --- geometri yardımcıları ---
  const d2r = Math.PI / 180;
  function trig(r, startDeg) {
    const s = startDeg || 90;
    return [0, 120, 240].map((a) => [Math.cos((s + a) * d2r) * r, Math.sin((s + a) * d2r) * r, 0]);
  }
  const at = (el, x, y, z) => ({ el, p: [x || 0, y || 0, z || 0] });

  /* Tür tanımları
     kind: 'ion' | 'molecule' | 'crystal'
     aq: sulu ortamda iyon/molekül olarak bulunur mu (bilgi amaçlı)
     atoms: [{el, p:[x,y,z]}] */
  const S = {};
  function def(id, o) { o.id = id; S[id] = o; }

  // Tek atomlu iyonlar
  def('Na+',  { f: 'Na⁺',  name: 'Sodyum iyonu',      kind: 'ion', charge: +1, atoms: [at('Na')] });
  def('K+',   { f: 'K⁺',   name: 'Potasyum iyonu',    kind: 'ion', charge: +1, atoms: [at('K')] });
  def('Ag+',  { f: 'Ag⁺',  name: 'Gümüş iyonu',       kind: 'ion', charge: +1, atoms: [at('Ag')] });
  def('H+',   { f: 'H⁺',   name: 'Hidrojen iyonu',    kind: 'ion', charge: +1, atoms: [at('H')] });
  def('Ca2+', { f: 'Ca²⁺', name: 'Kalsiyum iyonu',    kind: 'ion', charge: +2, atoms: [at('Ca')] });
  def('Cu2+', { f: 'Cu²⁺', name: 'Bakır(II) iyonu',   kind: 'ion', charge: +2, atoms: [at('Cu')] });
  def('Pb2+', { f: 'Pb²⁺', name: 'Kurşun(II) iyonu',  kind: 'ion', charge: +2, atoms: [at('Pb')] });
  def('Cl-',  { f: 'Cl⁻',  name: 'Klorür iyonu',      kind: 'ion', charge: -1, atoms: [at('Cl')] });
  def('I-',   { f: 'I⁻',   name: 'İyodür iyonu',      kind: 'ion', charge: -1, atoms: [at('I')] });

  // Çok atomlu iyonlar
  def('OH-', { f: 'OH⁻', name: 'Hidroksit iyonu', kind: 'ion', charge: -1,
    atoms: [at('O', -0.18, 0, 0), at('H', 0.42, 0.28, 0)] });
  {
    const o = trig(0.9, 90);
    def('CO3 2-', { f: 'CO₃²⁻', name: 'Karbonat iyonu', kind: 'ion', charge: -2,
      atoms: [at('C'), at('O', ...o[0]), at('O', ...o[1]), at('O', ...o[2])] });
    def('NO3-', { f: 'NO₃⁻', name: 'Nitrat iyonu', kind: 'ion', charge: -1,
      atoms: [at('N'), at('O', ...o[0]), at('O', ...o[1]), at('O', ...o[2])] });
    // HCO3-: bir oksijene H bağlı (C–O–H açısı ≈ 109°)
    const ha = (30 - 109.5) * d2r; // O[1]'den C'ye yön 30°; O–H bağı bundan 109,5° döner
    const hx = o[1][0] + Math.cos(ha) * 0.68, hy = o[1][1] + Math.sin(ha) * 0.68;
    def('HCO3-', { f: 'HCO₃⁻', name: 'Hidrojen karbonat iyonu', kind: 'ion', charge: -1,
      atoms: [at('C'), at('O', ...o[0]), at('O', ...o[1]), at('O', ...o[2]), at('H', hx, hy, 0.05)] });
  }
  def('NH4+', { f: 'NH₄⁺', name: 'Amonyum iyonu', kind: 'ion', charge: +1,
    atoms: [at('N'), at('H', 0.42, 0.42, 0.42), at('H', -0.42, -0.42, 0.42), at('H', -0.42, 0.42, -0.42), at('H', 0.42, -0.42, -0.42)] });

  // Moleküller
  def('H2O', { f: 'H₂O', name: 'Su molekülü', kind: 'molecule',
    // H–O–H ≈ 104,5°
    atoms: [at('O', 0, 0.1, 0), at('H', -0.57, -0.34, 0), at('H', 0.57, -0.34, 0)] });
  def('CO2', { f: 'CO₂', name: 'Karbon dioksit molekülü', kind: 'molecule', gas: true,
    atoms: [at('C'), at('O', -0.86, 0, 0), at('O', 0.86, 0, 0)] });
  def('O2', { f: 'O₂', name: 'Oksijen molekülü', kind: 'molecule', gas: true,
    atoms: [at('O', -0.4, 0, 0), at('O', 0.4, 0, 0)] });
  def('H2', { f: 'H₂', name: 'Hidrojen molekülü', kind: 'molecule', gas: true,
    atoms: [at('H', -0.27, 0, 0), at('H', 0.27, 0, 0)] });
  def('H2O2', { f: 'H₂O₂', name: 'Hidrojen peroksit molekülü', kind: 'molecule',
    // O–O–H ≈ 100°, dihedral ≈ 115° (açık kitap biçimi)
    atoms: [at('O', -0.42, 0, 0), at('O', 0.42, 0, 0), at('H', -0.524, 0.498, 0.318), at('H', 0.524, -0.498, 0.318)] });
  // üçgen piramit, H–N–H ≈ 107°
  def('NH3', { f: 'NH₃', name: 'Amonyak molekülü', kind: 'molecule',
    atoms: [at('N', 0, 0.1, 0), at('H', 0, -0.14, 0.6), at('H', 0.52, -0.14, -0.3), at('H', -0.52, -0.14, -0.3)] });
  def('HCl', { f: 'HCl', name: 'Hidrojen klorür molekülü', kind: 'molecule',
    atoms: [at('Cl', 0.18, 0, 0), at('H', -0.58, 0, 0)] });
  def('Cl2', { f: 'Cl₂', name: 'Klor molekülü', kind: 'molecule', gas: true,
    atoms: [at('Cl', -0.6, 0, 0), at('Cl', 0.6, 0, 0)] });

  /* Kristaller: bir "formül birimi" iyonlar tam opak, çevresi soluk kristal örgü olarak çizilir.
     comps: [türId, [x,y,z]] — atomlar bileşenlerden türetilir. */
  const A = 1.75; // örgü aralığı
  function crystal(id, f, name, comps, cationEl, anionEl, extra) {
    const atoms = [];
    comps.forEach(([sid, off]) => {
      S[sid].atoms.forEach((a) => atoms.push(at(a.el, a.p[0] + off[0], a.p[1] + off[1], a.p[2] + off[2])));
    });
    def(id, Object.assign({ f, name, kind: 'crystal', comps, lattice: { a: A, cation: cationEl, anion: anionEl }, atoms }, extra || {}));
  }
  crystal('CaCO3(k)', 'CaCO₃', 'Kalsiyum karbonat (katı)', [['Ca2+', [-A / 2, 0, 0]], ['CO3 2-', [A / 2, 0, 0]]], 'Ca', 'O', { precip: true });
  crystal('PbI2(k)', 'PbI₂', 'Kurşun(II) iyodür (katı)', [['Pb2+', [0, 0, 0]], ['I-', [-A, 0, 0]], ['I-', [A, 0, 0]]], 'Pb', 'I', { precip: true });
  crystal('AgCl(k)', 'AgCl', 'Gümüş klorür (katı)', [['Ag+', [-A / 2, 0, 0]], ['Cl-', [A / 2, 0, 0]]], 'Ag', 'Cl', { precip: true });
  crystal('AgI(k)', 'AgI', 'Gümüş iyodür (katı)', [['Ag+', [-A / 2, 0, 0]], ['I-', [A / 2, 0, 0]]], 'Ag', 'I', { precip: true });
  crystal('Cu(OH)2(k)', 'Cu(OH)₂', 'Bakır(II) hidroksit (katı)', [['Cu2+', [0, 0, 0]], ['OH-', [-A, 0, 0]], ['OH-', [A, 0, 0]]], 'Cu', 'O', { precip: true });
  crystal('CuCO3(k)', 'CuCO₃', 'Bakır(II) karbonat (katı)', [['Cu2+', [-A / 2, 0, 0]], ['CO3 2-', [A / 2, 0, 0]]], 'Cu', 'O', { precip: true });
  // Suda çözünen tuzların kristal hâlleri (yanılgı seçenekleri)
  crystal('NaCl(k)', 'NaCl', 'Sodyum klorür kristali', [['Na+', [-A / 2, 0, 0]], ['Cl-', [A / 2, 0, 0]]], 'Na', 'Cl', { soluble: true });
  crystal('KNO3(k)', 'KNO₃', 'Potasyum nitrat kristali', [['K+', [-A / 2, 0, 0]], ['NO3-', [A / 2, 0, 0]]], 'K', 'O', { soluble: true });
  crystal('NaNO3(k)', 'NaNO₃', 'Sodyum nitrat kristali', [['Na+', [-A / 2, 0, 0]], ['NO3-', [A / 2, 0, 0]]], 'Na', 'O', { soluble: true });
  crystal('CaCl2(k)', 'CaCl₂', 'Kalsiyum klorür kristali', [['Ca2+', [0, 0, 0]], ['Cl-', [-A, 0, 0]], ['Cl-', [A, 0, 0]]], 'Ca', 'Cl', { soluble: true });
  crystal('NH4Cl(k)', 'NH₄Cl', 'Amonyum klorür kristali', [['NH4+', [-A / 2, 0, 0]], ['Cl-', [A / 2, 0, 0]]], 'N', 'Cl', { soluble: true });

  /** Bir türün atom sayımı: {H:2, O:1} */
  function atomCount(id) {
    const c = {};
    S[id].atoms.forEach((a) => { c[a.el] = (c[a.el] || 0) + 1; });
    return c;
  }
  /** {türId: adet} çokluğu için toplam atom sayımı */
  function countAtoms(multiset) {
    const c = {};
    for (const id in multiset) {
      const n = multiset[id];
      if (!n) continue;
      const ac = atomCount(id);
      for (const el in ac) c[el] = (c[el] || 0) + ac[el] * n;
    }
    return c;
  }
  function label(id) {
    const s = S[id];
    return s.kind === 'crystal' ? s.f + '(k)' : s.f;
  }

  T.ELEMENTS = ELEMENTS;
  T.EL_ORDER = EL_ORDER;
  T.SPECIES = S;
  T.atomCount = atomCount;
  T.countAtoms = countAtoms;
  T.speciesLabel = label;
})(window.TUY);
