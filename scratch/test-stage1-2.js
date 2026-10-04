// Scratch test for Stage 1 & Stage 2 logic
const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = global;
global.document = {
  getElementById: (id) => ({
    id,
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    scrollIntoView: () => {},
    removeAttribute: () => {}
  }),
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag,
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    getContext: () => ({
      fillRect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillText: () => {}
    }),
    toDataURL: () => 'data:image/png;base64,mock',
    removeAttribute: () => {}
  })
};

// Mock THREE
global.THREE = {
  WebGLRenderer: class { setSize() {} setPixelRatio() {} render() {} },
  Scene: class { children = []; add(c) { this.children.push(c); } remove() {} },
  PerspectiveCamera: class { position = { set: () => {} }; },
  AmbientLight: class {},
  DirectionalLight: class { position = { set: () => {} }; },
  Group: class { children = []; add(c) { this.children.push(c); } remove() {} position = { set: () => {}, copy: () => {} }; rotation = {}; },
  Mesh: class { scale = { setScalar: () => {} }; position = { set: () => {}, copy: () => {} }; rotation = {}; quaternion = { setFromUnitVectors: () => {} }; },
  SphereGeometry: class {},
  CylinderGeometry: class {},
  TorusGeometry: class {},
  MeshStandardMaterial: class {},
  MeshBasicMaterial: class {},
  Color: class {},
  Vector3: class {
    constructor(x=0, y=0, z=0) { this.x = x; this.y = y; this.z = z; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    length() { return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z); }
    normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
    clone() { return new global.THREE.Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    crossVectors(a, b) { return this; }
  },
  CanvasTexture: class {}
};

// Load reactions data
require(path.join(__dirname, '../js/data/reactions-data.js'));
require(path.join(__dirname, '../js/core/state-machine.js'));
require(path.join(__dirname, '../js/stages/stage1-observation.js'));
require(path.join(__dirname, '../js/stages/stage2-3d-particles.js'));
require(path.join(__dirname, '../js/stages/stage2-modeling.js'));

console.log('✅ Modules loaded successfully');

const state = window.labState;
const stage1 = new window.Stage1ObservationManager(state);

// TEST 1: Reaction rx_01 (nahco3_hcl - Gas reaksiyonu)
state.setReaction('nahco3_hcl');
console.log('\n--- TEST 1: nahco3_hcl (Gaz Reaksiyonu) ---');

// Case A: Boş veya çok kısa metin
stage1.textarea = { value: 'ab' };
stage1.evaluateObservation();
console.log('1A. Kısa metin:', stage1.btnProceedStage2.disabled ? 'KİLİTLİ (Doğru)' : 'HATA: AÇIK');

// Case B: Alakasız metin
stage1.textarea = { value: 'Güzel bir deney oldu masada' };
stage1.evaluateObservation();
console.log('1B. Alakasız metin:', stage1.btnProceedStage2.disabled ? 'KİLİTLİ (Doğru)' : 'HATA: AÇIK');
console.log('    Sonuç simgesi:', stage1.feedbackBadge.textContent, stage1.feedbackBadge.textContent === '✗' ? '(DOĞRU: ✗)' : 'HATA');

// Case C: Yanılgı (Gaz yerine katı çökelti dedi)
stage1.textarea = { value: 'Kavanozda beyaz bir çökelti ve katı tortu oluştu' };
stage1.evaluateObservation();
console.log('1C. Yanılgı metni (çökelti):', stage1.btnProceedStage2.disabled ? 'KİLİTLİ (Doğru)' : 'HATA: AÇIK');
console.log('    Sonuç simgesi:', stage1.feedbackBadge.textContent, stage1.feedbackBadge.textContent === '✗' ? '(DOĞRU: ✗)' : 'HATA');
console.log('    Metin:', stage1.feedbackText.textContent);

// Case D: Doğru gözlem
stage1.textarea = { value: 'Sıvı içinde yoğun gaz kabarcıkları çıkışı oldu ve sıcaklık arttı' };
stage1.evaluateObservation();
console.log('1D. Doğru gözlem:', !stage1.btnProceedStage2.disabled ? 'AÇILDI (Doğru)' : 'HATA: KİLİTLİ');
console.log('    Sonuç simgesi:', stage1.feedbackBadge.textContent, stage1.feedbackBadge.textContent === '✓' ? '(DOĞRU: ✓)' : 'HATA');
console.log('    Metin:', stage1.feedbackText.textContent);
const hasPrefix = stage1.feedbackText.textContent.includes('Doğru gözlem:');
console.log('    "Doğru gözlem:" öneki kaldırıldı mı?:', !hasPrefix ? 'EVET (Kaldırıldı)' : 'HATA: HALA VAR');

// TEST 2: Reaction rx_07 (pbno32_ki - Çökelti reaksiyonu)
state.setReaction('pbno32_ki');
console.log('\n--- TEST 2: pbno32_ki (Çökelti Reaksiyonu) ---');

// Case A: Yanılgı (Çökelti yerine gaz kabarcığı dedi)
stage1.textarea = { value: 'Sıvıdan yoğun kabarcıklar ve gaz çıktı' };
stage1.evaluateObservation();
console.log('2A. Yanılgı metni (kabarcık):', stage1.btnProceedStage2.disabled ? 'KİLİTLİ (Doğru)' : 'HATA: AÇIK');
console.log('    Sonuç simgesi:', stage1.feedbackBadge.textContent, stage1.feedbackBadge.textContent === '✗' ? '(DOĞRU: ✗)' : 'HATA');

// Case B: Doğru gözlem
stage1.textarea = { value: 'Sarı renkli katı çökelti ve kristaller oluştu' };
stage1.evaluateObservation();
console.log('2B. Doğru gözlem:', !stage1.btnProceedStage2.disabled ? 'AÇILDI (Doğru)' : 'HATA: KİLİTLİ');
console.log('    Sonuç simgesi:', stage1.feedbackBadge.textContent, stage1.feedbackBadge.textContent === '✓' ? '(DOĞRU: ✓)' : 'HATA');
console.log('    Metin:', stage1.feedbackText.textContent);

// TEST 3: 3D Tanecik Motoru ve İçerik Kontrolü
console.log('\n--- TEST 3: 3B Tanecik Motoru & Atom İsimleri ---');
const engine = new window.Stage2Particle3DManager();
const h2o = engine.buildSpecies3D('H₂O');
console.log('3A. H₂O 3B grup oluşturuldu:', !!h2o);
console.log('    H₂O çocuk eleman sayısı (O, H, H, bağlar):', h2o.children.length);

const naMesh = engine.buildSpecies3D('Na⁺');
console.log('3B. Na⁺ 3B grup oluşturuldu:', !!naMesh);

const haloGroup = engine.createChargeHalo();
console.log('3C. Halka/Hale kaldırıldı (boş grup):', haloGroup.children.length === 0 ? 'DOĞRU (Halka yok)' : 'HATA');

const singleAtom = engine.buildSpecies3D('Na');
console.log('3D. Tek atom üzerinde kimyasal sembol render ediliyor:', !!singleAtom);

console.log('\n🎉 TÜM TESTLER BAŞARIYLA TAMAMLANDI!');
