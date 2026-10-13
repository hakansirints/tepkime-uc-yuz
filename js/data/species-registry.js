/* Chemical species used by the formula workshop. */
const SPECIES_REGISTRY = {
  // Gaz ve Çözelti İyonları / Türleri
  'Na⁺': { name: 'Sodyum iyonu', type: 'ion', charge: 1, elements: { Na: 1 }, color: '#9333ea', state: 'suda' },
  '2 Na⁺': { name: '2 Sodyum iyonu', type: 'ion', charge: 1, elements: { Na: 2 }, color: '#9333ea', state: 'suda' },
  'HCO₃⁻': { name: 'Bikarbonat kökü', type: 'polyatomic', charge: -1, elements: { H: 1, C: 1, O: 3 }, color: '#ef4444', state: 'suda' },
  'CO₃²⁻': { name: 'Karbonat kökü', type: 'polyatomic', charge: -2, elements: { C: 1, O: 3 }, color: '#dc2626', state: 'suda' },
  'H⁺': { name: 'Hidrojen iyonu (Asit)', type: 'ion', charge: 1, elements: { H: 1 }, color: '#0284c7', state: 'suda' },
  '2 H⁺': { name: '2 Hidrojen iyonu', type: 'ion', charge: 1, elements: { H: 2 }, color: '#0284c7', state: 'suda' },
  'Cl⁻': { name: 'Klorür iyonu', type: 'ion', charge: -1, elements: { Cl: 1 }, color: '#16a34a', state: 'suda' },
  '2 Cl⁻': { name: '2 Klorür iyonu', type: 'ion', charge: -1, elements: { Cl: 2 }, color: '#16a34a', state: 'suda' },
  'H₂O': { name: 'Su molekülü (Bükülmüş 104.5°)', type: 'molecule', charge: 0, elements: { H: 2, O: 1 }, color: '#38bdf8', state: 's' },
  '2 H₂O': { name: '2 Su molekülü', type: 'molecule', charge: 0, elements: { H: 4, O: 2 }, color: '#38bdf8', state: 's' },
  'CO₂': { name: 'Karbondioksit gazı (Doğrusal 180°)', type: 'molecule', charge: 0, elements: { C: 1, O: 2 }, color: '#64748b', state: 'g' },
  'NaCl': { name: 'Sodyum klorür (Kübik Kristal Kafes)', type: 'crystal', charge: 0, elements: { Na: 1, Cl: 1 }, color: '#8b5cf6', state: 'k' },
  'CaCO₃(k)': { name: 'Kalsiyum karbonat (Katı kireçtaşı kafesi)', type: 'crystal', charge: 0, elements: { Ca: 1, C: 1, O: 3 }, color: '#f97316', state: 'k' },
  'Ca²⁺': { name: 'Kalsiyum iyonu', type: 'ion', charge: 2, elements: { Ca: 1 }, color: '#ea580c', state: 'suda' },
  'OH⁻': { name: 'Hidroksit iyonu (Baz)', type: 'ion', charge: -1, elements: { O: 1, H: 1 }, color: '#06b6d4', state: 'suda' },
  '2 OH⁻': { name: '2 Hidroksit iyonu', type: 'ion', charge: -1, elements: { O: 2, H: 2 }, color: '#06b6d4', state: 'suda' },
  '2 H₂O₂': { name: '2 Hidrojen peroksit', type: 'molecule', charge: 0, elements: { H: 4, O: 4 }, color: '#0ea5e9', state: 'suda' },
  'KI': { name: 'Potasyum iyodür (Katalizör)', type: 'ion', charge: 0, elements: { K: 1, I: 1 }, color: '#a855f7', state: 'suda' },
  'O₂': { name: 'Oksijen gazı', type: 'molecule', charge: 0, elements: { O: 2 }, color: '#ef4444', state: 'g' },
  'NH₃': { name: 'Amonyak gazı (Üçgen Piramit)', type: 'molecule', charge: 0, elements: { N: 1, H: 3 }, color: '#2563eb', state: 'g' },
  'NH₄⁺': { name: 'Amonyum iyonu (Dörtyüzlü)', type: 'polyatomic', charge: 1, elements: { N: 1, H: 4 }, color: '#3b82f6', state: 'suda' },
  'Pb²⁺': { name: 'Kurşun(II) iyonu', type: 'ion', charge: 2, elements: { Pb: 1 }, color: '#475569', state: 'suda' },
  'NO₃⁻': { name: 'Nitrat kökü', type: 'polyatomic', charge: -1, elements: { N: 1, O: 3 }, color: '#e11d48', state: 'suda' },
  '2 NO₃⁻': { name: '2 Nitrat kökü', type: 'polyatomic', charge: -1, elements: { N: 2, O: 6 }, color: '#e11d48', state: 'suda' },
  'K⁺': { name: 'Potasyum iyonu', type: 'ion', charge: 1, elements: { K: 1 }, color: '#a855f7', state: 'suda' },
  '2 K⁺': { name: '2 Potasyum iyonu', type: 'ion', charge: 1, elements: { K: 2 }, color: '#a855f7', state: 'suda' },
  'I⁻': { name: 'İyodür iyonu', type: 'ion', charge: -1, elements: { I: 1 }, color: '#c026d3', state: 'suda' },
  '2 I⁻': { name: '2 İyodür iyonu', type: 'ion', charge: -1, elements: { I: 2 }, color: '#c026d3', state: 'suda' },
  'PbI₂(k)': { name: 'Kurşun(II) iyodür (Katı sarı kristal kafes)', type: 'crystal', charge: 0, elements: { Pb: 1, I: 2 }, color: '#eab308', state: 'k' },
  'Ag⁺': { name: 'Gümüş iyonu', type: 'ion', charge: 1, elements: { Ag: 1 }, color: '#94a3b8', state: 'suda' },
  'AgCl(k)': { name: 'Gümüş klorür (Katı beyaz kristal kafes)', type: 'crystal', charge: 0, elements: { Ag: 1, Cl: 1 }, color: '#cbd5e1', state: 'k' },
  'AgI(k)': { name: 'Gümüş iyodür (Katı sarı kristal kafes)', type: 'crystal', charge: 0, elements: { Ag: 1, I: 1 }, color: '#facc15', state: 'k' },
  'Cu²⁺': { name: 'Bakır(II) iyonu', type: 'ion', charge: 2, elements: { Cu: 1 }, color: '#0284c7', state: 'suda' },
  'Cu(OH)₂(k)': { name: 'Bakır(II) hidroksit (Mavi çökelti kafesi)', type: 'crystal', charge: 0, elements: { Cu: 1, O: 2, H: 2 }, color: '#0369a1', state: 'k' },
  'CuCO₃(k)': { name: 'Bakır(II) karbonat (Yeşil çökelti kafesi)', type: 'crystal', charge: 0, elements: { Cu: 1, C: 1, O: 3 }, color: '#059669', state: 'k' },
  // Ara etkileşim türleri (Etkileşirken evresi için)
  '[H⁺...HCO₃⁻]': { name: 'Kararsız ara bileşik (Karbonik asit oluşumu)', type: 'intermediate', charge: 0, elements: { H: 1, C: 1, O: 3 }, color: '#f59e0b', state: 'ara' },
  '[H⁺ + OH⁻ → H₂O]': { name: 'Nötralleşme etkileşimi', type: 'intermediate', charge: 0, elements: { H: 1, O: 1 }, color: '#38bdf8', state: 'ara' },
  '[Pb²⁺ + 2 I⁻]': { name: 'İyon kümeleşmesi / Kristalleşme başlangıcı', type: 'intermediate', charge: 0, elements: { Pb: 1, I: 2 }, color: '#eab308', state: 'ara' },
  '[Ag⁺ + Cl⁻]': { name: 'Kristal çekirdeklenme anı', type: 'intermediate', charge: 0, elements: { Ag: 1, Cl: 1 }, color: '#cbd5e1', state: 'ara' },
  '[Ca²⁺ + CO₃²⁻]': { name: 'Kalsiyum karbonat kafes örgüsü oluşumu', type: 'intermediate', charge: 0, elements: { Ca: 1, C: 1, O: 3 }, color: '#ea580c', state: 'ara' }
};


window.SPECIES_REGISTRY = SPECIES_REGISTRY;
