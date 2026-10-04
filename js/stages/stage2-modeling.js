/**
 * AŞAMA 2: MODELLE (3B TANECİK LABORATUVARI MOTORU)
 * MEBİ Tasarım Sistemi Standartları ve Pedagojik Yönerge (Sayfa 9-18) ile tam uyumludur.
 * 
 * Mimari Özellikler:
 * 1. Sol Panel (285px): 3B Tanecik, İyon ve Atom Havuzu (Gerçek zamanlı 3D modeller, 3 Kademeli Destek)
 * 2. Orta Panel (1fr): 3B Molekül İnceleme Sahnesi (Inspector) + 3 Evreli Çalışma Masası
 * 3. Sağ Kenardan Açılan Çekmece Kartı (Slide-out Drawer): Korunma Kontrolü, Canlı HUD ve Modeli Test Et
 */

// Tanecik ve İyon Özellikleri Veritabanı
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

// CPK Atom Renkleri ve İsimleri
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

class Stage2ModelingManager {
  constructor(stateMachine, containerEl) {
    this.state = stateMachine;
    this.container = containerEl || document.getElementById('stageScaffoldView');

    this.activePhase = 1; // 1: Tepkime Öncesi, 2: Etkileşirken, 3: Tepkime Sonrası
    this.modelState = {
      phase1: [], // Öncesi
      phase2: [], // Etkileşirken
      phase3: []  // Sonrası
    };

    this.scaffoldLevel = 1;
    this.isTested = false;
    this.isSuccess = false;

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.updateLiveAnalysis();

    // Otomatik test parametresi denetimi
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const testMode = urlParams.get('test_autofill');
      if (testMode === 'success') {
        this.autoFillPhase(1);
        this.autoFillPhase(2);
        this.autoFillPhase(3);
        this.evaluateModel();
      } else if (testMode === 'missing_o') {
        this.autoFillPhase(1);
        this.autoFillPhase(2);
        this.modelState.phase3 = ['Na⁺', 'Cl⁻', 'CO₂'];
        this.renderPhaseSlots();
        this.updateLiveAnalysis();
        this.evaluateModel();
      } else if (testMode === 'nacl_error') {
        this.autoFillPhase(1);
        this.autoFillPhase(2);
        this.modelState.phase3 = ['NaCl', 'H₂O', 'CO₂'];
        this.renderPhaseSlots();
        this.updateLiveAnalysis();
        this.evaluateModel();
      }
      if (urlParams.get('drawer') === 'open') {
        this.openDrawer();
      }
    } catch (e) {}
  }

  getCurrentReaction() {
    return this.state.getReaction();
  }

  // 1. Şablonu Oluştur ve Çiz
  render() {
    if (!this.container) return;
    const reaction = this.getCurrentReaction();
    if (!reaction) {
      this.container.innerHTML = `
        <div class="stage2-scaffold-card" style="padding: 40px; text-align: center;">
          <h2 style="color: var(--mebi-text-main);">Önce bir tepkime seçiniz.</h2>
          <p style="color: var(--mebi-text-secondary);">Soldaki menüden bir kimyasal tepkime seçerek gözlem aşamasını tamamlayınız.</p>
        </div>
      `;
      return;
    }

    const micro = reaction.microscopic || {};
    const reactants = micro.reactants || [];
    const products = micro.products || [];

    // Bu tepkimede kullanılan kimyasal türlerin havuzu (Reaktifler + Ürünler + İlgili türler)
    const poolSymbols = Array.from(new Set([
      ...reactants.map(r => r.symbol),
      ...products.map(p => p.symbol),
      'H₂O', 'CO₂', 'NaCl'
    ])).filter(s => SPECIES_REGISTRY[s]);

    // Bu tepkimedeki element kümesi
    const elementSet = new Set();
    poolSymbols.forEach(sym => {
      const reg = SPECIES_REGISTRY[sym];
      if (reg && reg.elements) {
        Object.keys(reg.elements).forEach(el => elementSet.add(el));
      }
    });
    const elementsList = Array.from(elementSet);

    this.container.innerHTML = `
      <div class="stage2-scaffold-card">
        <!-- 1. ÜST BAŞLIK BARI (Aşama 2/2) -->
        <div class="stage2-header">
          <div class="stage2-header-left">
            <div class="stage2-header-icon">🔬</div>
            <div class="stage2-title-group">
              <h2>
                <span>AŞAMA 2 / 2 — Modelini Kur: 3B Tanecik Laboratuvarı</span>
                <span class="mebi-badge mebi-badge-indigo">${reaction.title}</span>
              </h2>
              <p>Makroskobik deney kanıtlarını 3B alt-mikroskobik tanecik ve molekül modeliyle inşa ediniz.</p>
            </div>
          </div>
          <div class="stage2-header-right">
            <button id="btnResetModel" class="mebi-btn mebi-btn-secondary" style="height: 38px; padding: 0 14px; font-size: 11.5px;">
              <span class="mebi-btn-text">↺ MODELİ SIFIRLA</span>
            </button>
            <button id="btnCloseStage2" class="mebi-btn mebi-btn-secondary" style="height: 38px; padding: 0 14px; font-size: 11.5px;">
              <span class="mebi-btn-text">✕ LABORATUVARA DÖN</span>
            </button>
          </div>
        </div>

        <!-- 2. ANA ÇALIŞMA ALANI (Sol Havuz + Orta Çalışma Masası + Sağdan Açılan Çekmece) -->
        <div class="stage2-grid-body">
          
          <!-- SOL PANEL: 3B TANECİK VE ATOM HAVUZU -->
          <div class="stage2-panel stage2-left-panel">
            <div class="stage2-panel-head">
              <h3 class="stage2-panel-title">🧪 3B Tanecik Havuzu</h3>
              <span class="mebi-badge mebi-badge-indigo" style="font-size: 10px;">Palet</span>
            </div>
            
            <div class="stage2-panel-scroll">
              <!-- Kimyasal Türler / İyonlar (3B) -->
              <div>
                <div class="pool-section-title">
                  <span>Kimyasal Türler & İyonlar (3B)</span>
                  <span style="font-size: 10px; color: var(--mebi-primary);">+ Tıkla veya Sürükle</span>
                </div>
                <div class="species-tokens-grid" id="poolSpeciesGrid">
                  ${poolSymbols.map(sym => {
                    const info = SPECIES_REGISTRY[sym] || {};
                    const thumbUrl = window.stage2Particle3DEngine ? window.stage2Particle3DEngine.getThumbnailUrl(sym) : '';
                    // İçeriği oluşturan atomların isimleri
                    const atomNames = info.elements 
                      ? Object.keys(info.elements).map(el => ELEMENT_NAMES[el] || el).join(', ')
                      : '';
                    return `
                      <div class="species-token-card" draggable="true" data-symbol="${sym}" title="${info.name || sym}">
                        <div class="species-card-thumb-box">
                          ${thumbUrl ? `<img class="species-3d-thumb" src="${thumbUrl}" alt="${sym}" />` : `<div class="species-token-badge" style="background: ${info.color || '#64748b'};">${sym}</div>`}
                        </div>
                        <div class="species-card-meta">
                          <span class="species-formula-badge">${sym}</span>
                          <span class="species-atoms-desc" title="İçerdiği Atomlar: ${atomNames}">
                            <strong>Atomlar:</strong> ${atomNames}
                          </span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Atom Parçaları (3B Küre üzerinde kimyasal gösterimi yazan) -->
              <div>
                <div class="pool-section-title">
                  <span>Atom Parçaları (3B)</span>
                </div>
                <div class="atom-spheres-row">
                  ${elementsList.map(el => {
                    const thumbUrl = window.stage2Particle3DEngine ? window.stage2Particle3DEngine.getThumbnailUrl(el) : '';
                    const atomName = ELEMENT_NAMES[el] || el;
                    return `
                      <div class="atom-sphere-chip" data-atom="${el}" title="${atomName} (${el})">
                        <div class="atom-sphere-visual">
                          ${thumbUrl 
                            ? `<img class="atom-3d-img" src="${thumbUrl}" alt="${el}" />` 
                            : `<span class="atom-sphere-dot" style="background: ${ATOM_COLORS[el] || '#64748b'};">${el}</span>`}
                          <span class="atom-on-sphere-label">${el}</span>
                        </div>
                        <span class="atom-name-label">${atomName}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- ORTA PANEL: 3 EVRELİ MODELLEME MASASI -->
          <div class="stage2-panel stage2-center-panel">
            <div class="stage2-panel-head">
              <h3 class="stage2-panel-title">📋 Modelini Oluştur (3 Evreli Çalışma Masası)</h3>
              <span id="activePhaseIndicator" class="mebi-badge mebi-badge-indigo" style="font-size: 10px;">
                Aktif Alan: 1. Tepkime Öncesi
              </span>
            </div>

            <div class="stage2-center-body">
              <!-- Evre 1: Tepkime Öncesi -->
              <div class="timeline-phase-card is-active-phase" data-phase="1">
                <div class="phase-header">
                  <div class="phase-title-left">
                    <span class="phase-num-pill">1</span>
                    <div>
                      <h4 class="phase-title">Tepkime Öncesi</h4>
                      <span class="phase-subtitle">Sulu çözeltideki başlangıç iyon ve reaktif tanecikleri</span>
                    </div>
                  </div>
                  <div class="phase-quick-bar">
                    <button class="phase-mini-btn btn-auto-fill" data-phase="1" title="Reaktifleri otomatik yerleştir">⚡ Doldur</button>
                    <button class="phase-mini-btn btn-clear-phase" data-phase="1" title="Bu alanı temizle">↺ Temizle</button>
                  </div>
                </div>
                <div class="phase-workspace-slot" id="slotPhase1" data-phase="1">
                  <div class="phase-empty-placeholder">Sol havuzdan reaktif taneciklerini buraya tıklayarak veya sürükleyerek ekleyiniz.</div>
                </div>
              </div>

              <!-- Evre 2: Tanecikler Etkileşirken -->
              <div class="timeline-phase-card" data-phase="2">
                <div class="phase-header">
                  <div class="phase-title-left">
                    <span class="phase-num-pill">2</span>
                    <div>
                      <h4 class="phase-title">Tanecikler Etkileşirken</h4>
                      <span class="phase-subtitle">Çarpışma, bağların kopması ve yeni bağların oluşum anı</span>
                    </div>
                  </div>
                  <div class="phase-quick-bar">
                    <button class="phase-mini-btn btn-auto-fill" data-phase="2" title="Etkileşim halini doldur">⚡ Doldur</button>
                    <button class="phase-mini-btn btn-clear-phase" data-phase="2" title="Bu alanı temizle">↺ Temizle</button>
                  </div>
                </div>
                <div class="phase-workspace-slot" id="slotPhase2" data-phase="2">
                  <div class="phase-empty-placeholder">Taneciklerin etkileşme ve çarpışma halini buraya ekleyiniz.</div>
                </div>
              </div>

              <!-- Evre 3: Tepkime Sonrası -->
              <div class="timeline-phase-card" data-phase="3">
                <div class="phase-header">
                  <div class="phase-title-left">
                    <span class="phase-num-pill">3</span>
                    <div>
                      <h4 class="phase-title">Tepkime Sonrası</h4>
                      <span class="phase-subtitle">Oluşan yeni maddeler (gaz/çökelti/sıvı) ve çözeltideki seyirci iyonlar</span>
                    </div>
                  </div>
                  <div class="phase-quick-bar">
                    <button class="phase-mini-btn btn-auto-fill" data-phase="3" title="Ürünleri otomatik yerleştir">⚡ Doldur</button>
                    <button class="phase-mini-btn btn-clear-phase" data-phase="3" title="Bu alanı temizle">↺ Temizle</button>
                  </div>
                </div>
                <div class="phase-workspace-slot" id="slotPhase3" data-phase="3">
                  <div class="phase-empty-placeholder">Oluşan ürünleri ve kalan serbest iyonları buraya ekleyiniz.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ÇEKMECE KARARTMA PERDESİ (BACKDROP) -->
          <div id="stage2DrawerBackdrop" class="stage2-drawer-backdrop"></div>

          <!-- SAĞDAN AÇILAN ÇEKMECE KARTI (SLIDE-OUT DRAWER) -->
          <aside id="stage2ConservationDrawer" class="stage2-conservation-drawer">
            <!-- DİKEY AÇILIR KART KULAKÇIĞI (Çekmecenin sol kenarına bitişik) -->
            <button id="btnToggleConservationDrawer" class="stage2-drawer-vtab" title="Korunma Kontrolü Çekmecesini Aç/Kapat" aria-label="Korunma Kontrolü">
              <span class="vtab-icon">⚖️</span>
              <span class="vtab-title">KORUNMA KONTROLÜ</span>
              <span id="drawerRuleCountBadge" class="vtab-badge">4 Kural</span>
              <span id="drawerArrowIcon" class="vtab-arrow">◀</span>
            </button>

            <div class="stage2-drawer-head">
              <div class="stage2-drawer-title-wrap">
                <h3 class="stage2-drawer-title">
                  <span>⚖️</span>
                  <span>Korunma Kontrolü</span>
                </h3>
                <span class="stage2-drawer-sub">Kütle & Atom Korunumu Denetimi</span>
              </div>
              <button id="btnCloseConservationDrawer" class="stage2-drawer-close-btn" title="Çekmeceyi Kapat">✕</button>
            </div>

            <div class="stage2-panel-scroll">
              <!-- 4 Temel Kimyasal Kural Kontrolü -->
              <div>
                <div class="pool-section-title">
                  <span>Temel Kimyasal Kurallar</span>
                </div>
                <div class="rules-checklist-group">
                  <div class="rule-check-item" id="ruleTypePreserved">
                    <div class="rule-check-icon is-pending">○</div>
                    <div class="rule-check-text">
                      <strong>Atom Türü Korunumu:</strong>
                      <span>Yeni atom türemez veya var olan yok edilemez.</span>
                    </div>
                  </div>
                  <div class="rule-check-item" id="ruleCountPreserved">
                    <div class="rule-check-icon is-pending">○</div>
                    <div class="rule-check-text">
                      <strong>Atom Sayısı Korunumu:</strong>
                      <span>Giren ve ürün atom sayıları eşit olmalıdır.</span>
                    </div>
                  </div>
                  <div class="rule-check-item" id="ruleAqueousDissociation">
                    <div class="rule-check-icon is-pending">○</div>
                    <div class="rule-check-text">
                      <strong>Sulu Ortam Kuralı:</strong>
                      <span>Tuzlar sulu çözeltide kristal değil bağımsız iyonlardır.</span>
                    </div>
                  </div>
                  <div class="rule-check-item" id="rulePrecipitateLattice">
                    <div class="rule-check-icon is-pending">○</div>
                    <div class="rule-check-text">
                      <strong>Katı Çökelti Kuralı:</strong>
                      <span>Oluşan çökelek katı kristal kafes olarak modellenir.</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Canlı Atom Sayacı HUD Tablosu -->
              <div>
                <div class="pool-section-title">
                  <span>Canlı Atom Sayacı (HUD)</span>
                  <span id="hudOverallBadge" class="mebi-badge mebi-badge-secondary" style="font-size: 9.5px;">Eşitlik Bekleniyor</span>
                </div>
                <div class="atom-counter-hud">
                  <div class="hud-table-head">
                    <span>Atom</span>
                    <span>Öncesi</span>
                    <span>Sonrası</span>
                    <span>Durum</span>
                  </div>
                  <div id="hudRowsContainer">
                    <!-- Dinamik HUD satırları buraya basılır -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Modeli Test Et ve Sokratik Dönüt Alanı (Kullanıcı Talebi: Yalnızca Modeli Test Et denildiğinde dönüt verilir) -->
            <div class="stage2-eval-box">
              <!-- Sonuç Kutusu (Başlangıçta gizli) -->
              <div id="stage2FeedbackBanner" class="stage2-feedback-banner">
                <strong id="stage2FeedbackTitle">Sonuç:</strong>
                <div id="stage2FeedbackMsg" style="margin-top: 4px;"></div>
              </div>

              <!-- Büyük MEBİ 3D Eylem Butonu -->
              <button id="btnTestModel" class="mebi-btn mebi-btn-success" style="width: 100%; height: 44px;">
                <span class="mebi-btn-text">✓ MODELİ TEST ET</span>
              </button>
            </div>
          </aside>

        </div>
      </div>
    `;
  }

  // 2. Olay Dinleyicileri
  bindEvents() {
    const rx = this.getCurrentReaction();
    const micro = rx ? rx.microscopic : null;
    const poolSymbols = rx ? Array.from(new Set([
      ...(micro.reactants || []).map(r => r.symbol),
      ...(micro.products || []).map(p => p.symbol),
      'H₂O', 'CO₂', 'NaCl'
    ])).filter(s => SPECIES_REGISTRY[s]) : [];

    // Kapat butonu
    const btnClose = document.getElementById('btnCloseStage2');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (window.labAudio) window.labAudio.playClick();
        this.container.style.display = 'none';
        this.state.setStage(1);
      });
    }

    // Modeli sıfırla butonu
    const btnReset = document.getElementById('btnResetModel');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (window.labAudio) window.labAudio.playWarning();
        this.modelState = { phase1: [], phase2: [], phase3: [] };
        this.isTested = false;
        this.isSuccess = false;
        this.renderPhaseSlots();
        this.updateLiveAnalysis();
        this.hideFeedback();
      });
    }

    // 3B Molekül İnceleme Sahnesini Başlat
    // Sağ Çekmece Kartı (Drawer) Açma / Kapatma Olayları
    const btnToggleDrawer = document.getElementById('btnToggleConservationDrawer');
    if (btnToggleDrawer) {
      btnToggleDrawer.addEventListener('click', () => {
        this.toggleDrawer();
      });
    }

    const btnCloseDrawer = document.getElementById('btnCloseConservationDrawer');
    if (btnCloseDrawer) {
      btnCloseDrawer.addEventListener('click', () => {
        this.closeDrawer();
      });
    }

    const drawerBackdrop = document.getElementById('stage2DrawerBackdrop');
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', () => {
        this.closeDrawer();
      });
    }

    // Sol Havuzdaki Tür Kartları (Tıklama ile Aktif Alana Ekleme)
    const speciesCards = document.querySelectorAll('.species-token-card');
    speciesCards.forEach(card => {
      card.addEventListener('click', () => {
        const sym = card.getAttribute('data-symbol');
        this.addTokenToPhase(sym, this.activePhase);
      });

      // Sürükle-bırak desteği
      card.addEventListener('dragstart', (e) => {
        const sym = card.getAttribute('data-symbol');
        e.dataTransfer.setData('text/plain', sym);
        if (window.labAudio) window.labAudio.playHover();
      });
    });

    // Atom parçalarına tıklandığında bilgilendirme sesi
    const atomChips = document.querySelectorAll('.atom-sphere-chip');
    atomChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (window.labAudio) window.labAudio.playClick();
      });
    });

    // Orta Panel: Evre Seçimi ve Bırakma Alanları
    const phaseCards = document.querySelectorAll('.timeline-phase-card');
    phaseCards.forEach(pCard => {
      pCard.addEventListener('click', (e) => {
        if (e.target.closest('.btn-clear-phase') || e.target.closest('.btn-auto-fill') || e.target.closest('.placed-particle-remove')) return;
        const pNum = parseInt(pCard.getAttribute('data-phase'), 10);
        this.setActivePhase(pNum);
      });
    });

    // Dropzone Dinleyicileri (Drag & Drop)
    [1, 2, 3].forEach(phaseNum => {
      const slot = document.getElementById(`slotPhase${phaseNum}`);
      if (!slot) return;

      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });

      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        const sym = e.dataTransfer.getData('text/plain');
        if (sym && SPECIES_REGISTRY[sym]) {
          this.addTokenToPhase(sym, phaseNum);
        }
      });
    });

    // Hızlı Doldur ve Temizle Butonları
    const fillBtns = document.querySelectorAll('.btn-auto-fill');
    fillBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pNum = parseInt(btn.getAttribute('data-phase'), 10);
        this.autoFillPhase(pNum);
      });
    });

    const clearBtns = document.querySelectorAll('.btn-clear-phase');
    clearBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pNum = parseInt(btn.getAttribute('data-phase'), 10);
        this.clearPhase(pNum);
      });
    });

    // Modeli Test Et Butonu (Çekmece içindedir)
    const btnTest = document.getElementById('btnTestModel');
    if (btnTest) {
      btnTest.addEventListener('click', () => {
        this.evaluateModel();
      });
    }
  }

  // 3B İnceleme Sahnesine Tanecik Yükleme
  inspectSpecies(symbol) {
    if (!symbol) return;
    this.currentInspectedSymbol = symbol;

    if (window.stage2Particle3DEngine) {
      window.stage2Particle3DEngine.inspectSpecies(symbol);
    }

    const badge = document.getElementById('inspectorSymbolBadge');
    if (badge) {
      const info = SPECIES_REGISTRY[symbol] || {};
      badge.textContent = `${symbol} — ${info.name || symbol}`;
    }
  }

  // Çekmece Kontrolleri
  toggleDrawer() {
    const drawer = document.getElementById('stage2ConservationDrawer');
    if (!drawer) return;
    const isOpen = drawer.classList.contains('is-open');
    if (isOpen) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  openDrawer() {
    const drawer = document.getElementById('stage2ConservationDrawer');
    const backdrop = document.getElementById('stage2DrawerBackdrop');
    const arrow = document.getElementById('drawerArrowIcon');
    if (drawer) drawer.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-visible');
    if (arrow) arrow.textContent = '▶';
    if (window.labAudio) window.labAudio.playHover();
  }

  closeDrawer() {
    const drawer = document.getElementById('stage2ConservationDrawer');
    const backdrop = document.getElementById('stage2DrawerBackdrop');
    const arrow = document.getElementById('drawerArrowIcon');
    if (drawer) drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-visible');
    if (arrow) arrow.textContent = '◀';
    if (window.labAudio) window.labAudio.playClick();
  }

  // Aktif Evreyi Değiştir
  setActivePhase(phaseNum) {
    this.activePhase = phaseNum;
    const cards = document.querySelectorAll('.timeline-phase-card');
    cards.forEach(c => {
      const p = parseInt(c.getAttribute('data-phase'), 10);
      c.classList.toggle('is-active-phase', p === phaseNum);
    });

    const ind = document.getElementById('activePhaseIndicator');
    if (ind) {
      const names = { 1: '1. Tepkime Öncesi', 2: '2. Tanecikler Etkileşirken', 3: '3. Tepkime Sonrası' };
      ind.textContent = `Aktif Alan: ${names[phaseNum]}`;
    }
    if (window.labAudio) window.labAudio.playHover();
  }

  // Tanecik Ekle
  addTokenToPhase(symbol, phaseNum) {
    if (!SPECIES_REGISTRY[symbol]) return;
    this.modelState[`phase${phaseNum}`].push(symbol);
    if (window.labAudio) window.labAudio.playClick();
    this.renderPhaseSlots();
    this.updateLiveAnalysis();
  }

  // Tanecik Sil
  removeTokenFromPhase(index, phaseNum) {
    this.modelState[`phase${phaseNum}`].splice(index, 1);
    if (window.labAudio) window.labAudio.playHover();
    this.renderPhaseSlots();
    this.updateLiveAnalysis();
  }

  // Evreyi Temizle
  clearPhase(phaseNum) {
    this.modelState[`phase${phaseNum}`] = [];
    if (window.labAudio) window.labAudio.playWarning();
    this.renderPhaseSlots();
    this.updateLiveAnalysis();
  }

  // Evreyi Otomatik Doğru Doldur (Öğrenciye kolaylaştırıcı akıllı iskele)
  autoFillPhase(phaseNum) {
    const rx = this.getCurrentReaction();
    if (!rx) return;
    const micro = rx.microscopic;

    if (phaseNum === 1) {
      // Reaktifler
      this.modelState.phase1 = micro.reactants.map(r => r.symbol);
    } else if (phaseNum === 2) {
      // Etkileşim hali
      if (rx.id.includes('hcl') && rx.id.includes('nahco3')) {
        this.modelState.phase2 = ['Na⁺', '[H⁺...HCO₃⁻]', 'Cl⁻'];
      } else if (rx.id.includes('naoh')) {
        this.modelState.phase2 = ['Na⁺', 'Cl⁻', '[H⁺ + OH⁻ → H₂O]'];
      } else if (rx.id.includes('pbno32')) {
        this.modelState.phase2 = ['2 K⁺', '2 NO₃⁻', '[Pb²⁺ + 2 I⁻]'];
      } else if (rx.id.includes('agno3')) {
        this.modelState.phase2 = ['H⁺', 'NO₃⁻', '[Ag⁺ + Cl⁻]'];
      } else {
        this.modelState.phase2 = micro.reactants.map(r => r.symbol);
      }
    } else if (phaseNum === 3) {
      // Ürünler
      this.modelState.phase3 = micro.products.map(p => p.symbol);
    }

    if (window.labAudio) window.labAudio.playSuccess();
    this.renderPhaseSlots();
    this.updateLiveAnalysis();
  }

  // 3. Çalışma Masası Slotlarını Yeniden Çiz (3B Küçük Görseller ile)
  renderPhaseSlots() {
    [1, 2, 3].forEach(phaseNum => {
      const slot = document.getElementById(`slotPhase${phaseNum}`);
      if (!slot) return;

      const list = this.modelState[`phase${phaseNum}`];
      if (list.length === 0) {
        const placeholders = {
          1: 'Sol havuzdan reaktif taneciklerini buraya tıklayarak veya sürükleyerek ekleyiniz.',
          2: 'Taneciklerin etkileşme ve çarpışma halini buraya ekleyiniz.',
          3: 'Oluşan ürünleri ve kalan serbest iyonları buraya ekleyiniz.'
        };
        slot.innerHTML = `<div class="phase-empty-placeholder">${placeholders[phaseNum]}</div>`;
      } else {
        slot.innerHTML = list.map((sym, idx) => {
          const info = SPECIES_REGISTRY[sym] || { color: '#64748b' };
          const thumbUrl = window.stage2Particle3DEngine ? window.stage2Particle3DEngine.getThumbnailUrl(sym) : '';
          return `
            <div class="placed-particle-token" data-symbol="${sym}" title="${sym} (3B İncelemek için tıkla)">
              ${thumbUrl ? `<img class="placed-3d-thumb" src="${thumbUrl}" alt="${sym}" />` : `<span class="placed-particle-badge" style="background: ${info.color};">${sym}</span>`}
              <span>${sym}</span>
              <button class="placed-particle-remove" data-index="${idx}" data-phase="${phaseNum}" title="Kaldır">✕</button>
            </div>
          `;
        }).join('');

        // Tıklanınca 3B sahnede inceleme
        const placedTokens = slot.querySelectorAll('.placed-particle-token');
        placedTokens.forEach(tok => {
          tok.addEventListener('click', (e) => {
            if (e.target.closest('.placed-particle-remove')) return;
            const sym = tok.getAttribute('data-symbol');
            this.inspectSpecies(sym);
          });
        });

        // Silme butonlarına olay bağla
        const rmBtns = slot.querySelectorAll('.placed-particle-remove');
        rmBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'), 10);
            const p = parseInt(btn.getAttribute('data-phase'), 10);
            this.removeTokenFromPhase(idx, p);
          });
        });
      }
    });
  }

  // 4. Destek Düzeylerini Değiştir
  setScaffoldLevel(lvl) {
    this.scaffoldLevel = lvl;
    if (window.labAudio) window.labAudio.playHint();

    const items = document.querySelectorAll('.scaffold-level-item');
    items.forEach(it => {
      const l = parseInt(it.getAttribute('data-level'), 10);
      const isActive = l === lvl;
      it.classList.toggle('is-active', isActive);
      const b = it.querySelector('.scaffold-level-badge');
      if (b) b.textContent = isActive ? 'Aktif' : 'Aç';
    });

    const bannerContent = document.getElementById('scaffoldHintContent');
    if (!bannerContent) return;

    const rx = this.getCurrentReaction();
    if (lvl === 1) {
      bannerContent.innerHTML = `
        <strong>1. Düzey — Serbest Keşif:</strong> İpuçlarına başvurmadan tanecikleri ilgili evrelere yerleştirip modelinizi oluşturun.
      `;
    } else if (lvl === 2) {
      let hintText = rx.pedagogy.guidancePrompt || 'Maddelerin tanecik yapılarını ve iyon ayrışmalarını düşününüz.';
      if (rx.result.primaryType === 'gas') {
        hintText = 'Gözlemde gaz kabarcığı gördünüz; asit iyonları (H⁺) karbonat köküne hücum ettiğinde CO₂ gazı ve su oluşur. Seyirci iyonları da ortama eklemeyi unutmayın.';
      } else if (rx.result.primaryType === 'precipitate') {
        hintText = 'Gözlemde çökelti oluştuğunu gördünüz; çöken katı maddede zıt yüklü iyonlar bir kristal kafes oluşturur. Çözeltide kalan iyonlar serbest hareket etmeye devam eder.';
      } else if (rx.result.primaryType === 'neutralization') {
        hintText = 'Asit ve baz karışımında H⁺ ve OH⁻ birleşerek H₂O oluşturur. Çözeltide kalan tuz iyonları bağımsız yüzer.';
      }
      bannerContent.innerHTML = `
        <strong>2. Düzey — Tanecik İpucu:</strong> ${hintText}
      `;
    } else if (lvl === 3) {
      bannerContent.innerHTML = `
        <strong>3. Düzey — Kimyasal Formül İpucu:</strong><br/>
        <code style="font-weight: 800; color: var(--mebi-primary);">${rx.microscopic.equation}</code>
      `;
    }
  }

  // 5. Canlı Atom Analizi ve HUD Güncelleme
  updateLiveAnalysis() {
    const rx = this.getCurrentReaction();
    if (!rx) return;

    const beforeCounts = {};
    const afterCounts = {};

    this.modelState.phase1.forEach(sym => {
      const reg = SPECIES_REGISTRY[sym];
      if (reg && reg.elements) {
        Object.entries(reg.elements).forEach(([el, cnt]) => {
          beforeCounts[el] = (beforeCounts[el] || 0) + cnt;
        });
      }
    });

    this.modelState.phase3.forEach(sym => {
      const reg = SPECIES_REGISTRY[sym];
      if (reg && reg.elements) {
        Object.entries(reg.elements).forEach(([el, cnt]) => {
          afterCounts[el] = (afterCounts[el] || 0) + cnt;
        });
      }
    });

    const allEls = Array.from(new Set([
      ...Object.keys(beforeCounts),
      ...Object.keys(afterCounts)
    ]));

    const hudContainer = document.getElementById('hudRowsContainer');
    let isAllBalanced = allEls.length > 0;

    if (hudContainer) {
      if (allEls.length === 0) {
        hudContainer.innerHTML = `
          <div style="padding: 12px; text-align: center; font-size: 11px; color: var(--mebi-text-secondary);">
            Model alanına tanecik eklendiğinde atom sayaçları burada anlık görünecektir.
          </div>
        `;
        isAllBalanced = false;
      } else {
        hudContainer.innerHTML = allEls.map(el => {
          const b = beforeCounts[el] || 0;
          const a = afterCounts[el] || 0;
          const balanced = (b === a) && b > 0;
          if (!balanced) isAllBalanced = false;

          return `
            <div class="hud-row">
              <span class="hud-atom-pill" style="background: ${ATOM_COLORS[el] || '#64748b'};">${el}</span>
              <span>${b}</span>
              <span>${a}</span>
              <span class="hud-status-badge ${balanced ? 'is-balanced' : 'is-unbalanced'}">
                ${balanced ? 'Dengede ✓' : (b > a ? `-${b - a}` : `+${a - b}`)}
              </span>
            </div>
          `;
        }).join('');
      }
    }

    const overallBadge = document.getElementById('hudOverallBadge');
    if (overallBadge) {
      if (isAllBalanced) {
        overallBadge.className = 'mebi-badge mebi-badge-success';
        overallBadge.textContent = 'Kütle & Atom Korundu ✓';
      } else {
        overallBadge.className = 'mebi-badge mebi-badge-secondary';
        overallBadge.textContent = 'Eşitlik Bekleniyor';
      }
    }

    // 4 Temel Kuralı Denetle ve Arayüzü Güncelle
    this.updateRulesStatus(beforeCounts, afterCounts, isAllBalanced);
  }

  // Kuralların Görsel Durumunu Güncelle
  updateRulesStatus(beforeCounts, afterCounts, isAllBalanced) {
    const p1 = this.modelState.phase1;
    const p3 = this.modelState.phase3;

    // Kural 1: Atom türleri değişmez
    const bKeys = Object.keys(beforeCounts);
    const aKeys = Object.keys(afterCounts);
    const sameTypes = bKeys.length > 0 && aKeys.length > 0 && bKeys.every(k => aKeys.includes(k)) && aKeys.every(k => bKeys.includes(k));
    this.setRuleStatus('ruleTypePreserved', sameTypes ? 'success' : (bKeys.length > 0 ? 'warning' : 'pending'));

    // Kural 2: Atom sayıları korunur
    this.setRuleStatus('ruleCountPreserved', isAllBalanced ? 'success' : (p1.length > 0 && p3.length > 0 ? 'warning' : 'pending'));

    // Kural 3: Sulu ortam iyonik ayrışma kuralı
    const hasAqueousMisconception = p1.includes('NaCl') || p3.includes('NaCl');
    this.setRuleStatus('ruleAqueousDissociation', hasAqueousMisconception ? 'warning' : ((p1.length > 0 || p3.length > 0) ? 'success' : 'pending'));

    // Kural 4: Katı çökelti kristal kuralı
    const rx = this.getCurrentReaction();
    if (rx && rx.result.primaryType === 'precipitate') {
      const hasPrecipitateCrystal = p3.some(sym => sym.includes('(k)'));
      this.setRuleStatus('rulePrecipitateLattice', hasPrecipitateCrystal ? 'success' : (p3.length > 0 ? 'warning' : 'pending'));
    } else {
      this.setRuleStatus('rulePrecipitateLattice', 'success');
    }
  }

  setRuleStatus(ruleId, status) {
    const el = document.getElementById(ruleId);
    if (!el) return;
    const icon = el.querySelector('.rule-check-icon');
    if (!icon) return;

    icon.className = 'rule-check-icon';
    if (status === 'success') {
      icon.classList.add('is-success');
      icon.textContent = '✓';
    } else if (status === 'warning') {
      icon.classList.add('is-warning');
      icon.textContent = '!';
    } else {
      icon.classList.add('is-pending');
      icon.textContent = '○';
    }
  }

  // 6. Modeli Test Et ve Sokratik Pedagojik Değerlendirme (Madde 5: Geri dönütler yalnızca burada verilir)
  evaluateModel() {
    // Çekmeceyi otomatik aç (kullanıcı görsün)
    this.openDrawer();

    const p1 = this.modelState.phase1;
    const p2 = this.modelState.phase2;
    const p3 = this.modelState.phase3;
    const rx = this.getCurrentReaction();

    // 1. Kontrol: Herhangi bir evre boş mu?
    if (p1.length === 0) {
      if (window.labAudio && typeof window.labAudio.playWarning === 'function') window.labAudio.playWarning();
      this.showFeedback('<strong>Tepkime Öncesi Boş:</strong> Reaksiyon kabında başlangıçta bulunan reaktif taneciklerini yerleştirmediniz.', 'warning');
      return;
    }
    if (p2.length === 0) {
      if (window.labAudio && typeof window.labAudio.playWarning === 'function') window.labAudio.playWarning();
      this.showFeedback('<strong>Etkileşim Evresi Eksik:</strong> Taneciklerin çarpışma veya bağ kopma/oluşum ara durumunu ekleyiniz.', 'warning');
      return;
    }
    if (p3.length === 0) {
      if (window.labAudio && typeof window.labAudio.playWarning === 'function') window.labAudio.playWarning();
      this.showFeedback('<strong>Tepkime Sonrası Boş:</strong> Tepkime tamamlandıktan sonra oluşan ürünleri ve kalan seyirci iyonları ekleyiniz.', 'warning');
      return;
    }

    // 2. Kontrol: Sulu çözeltide tuz yanılgısı (NaCl katı kristal olarak çizilmiş mi?)
    if (p1.includes('NaCl') || p3.includes('NaCl')) {
      if (window.labAudio && typeof window.labAudio.playWarning === 'function') window.labAudio.playWarning();
      this.showFeedback('<strong>Kritik Kural Uyarısı (Yönerge S.10):</strong> Sulu çözeltilerde sodyum klorür tuzu katı kristal örgü olarak bir arada kalmaz; Na⁺ ve Cl⁻ bağımsız serbest iyonlar olarak ayrışır. Modelinizi serbest iyonlarla güncelleyiniz.', 'warning');
      return;
    }

    // 3. Kontrol: Atom ve kütle korunumu (Girenler vs Ürünler)
    const beforeCounts = {};
    const afterCounts = {};

    p1.forEach(sym => {
      const reg = SPECIES_REGISTRY[sym];
      if (reg && reg.elements) {
        Object.entries(reg.elements).forEach(([el, cnt]) => {
          beforeCounts[el] = (beforeCounts[el] || 0) + cnt;
        });
      }
    });

    p3.forEach(sym => {
      const reg = SPECIES_REGISTRY[sym];
      if (reg && reg.elements) {
        Object.entries(reg.elements).forEach(([el, cnt]) => {
          afterCounts[el] = (afterCounts[el] || 0) + cnt;
        });
      }
    });

    const allEls = Array.from(new Set([...Object.keys(beforeCounts), ...Object.keys(afterCounts)]));
    for (const el of allEls) {
      const b = beforeCounts[el] || 0;
      const a = afterCounts[el] || 0;
      if (b !== a) {
        if (window.labAudio && typeof window.labAudio.playWarning === 'function') window.labAudio.playWarning();
        if (b > a) {
          this.showFeedback(`<strong>Atom Korunumu Uyarısı:</strong> Girenlerde ${b} adet ${el} atomu varken ürünlerde ${a} adet ${el} atomu var. Eksik olan ${b - a} adet ${el} atomu nereye gitmiş olabilir? Ürün moleküllerini tekrar inceleyiniz.`, 'warning');
        } else {
          this.showFeedback(`<strong>Atom Korunumu Uyarısı:</strong> Ürünlerde ${a} adet ${el} atomu varken başlangıçta sadece ${b} adet ${el} atomu vardı. Yoktan yeni ${el} atomu türeyemez; fazladan eklediğiniz tanecikleri gözden geçiriniz.`, 'warning');
        }
        return;
      }
    }

    // 4. Kontrol: Çökelti tepkimesinde katı kafes oluşumu var mı?
    if (rx.result.primaryType === 'precipitate') {
      const hasCrystal = p3.some(sym => sym.includes('(k)'));
      if (!hasCrystal) {
        if (window.labAudio && typeof window.labAudio.playWarning === 'function') window.labAudio.playWarning();
        this.showFeedback('<strong>Katı Çökelti Eksik:</strong> Deneyde açıkça gözlemlediğiniz katı çökelti maddesini ürünler alanına kristal kafes olarak eklemelisiniz.', 'warning');
        return;
      }
    }

    // TÜM KONTROLLER BAŞARILI!
    this.isTested = true;
    this.isSuccess = true;
    if (window.labAudio && typeof window.labAudio.playSuccess === 'function') window.labAudio.playSuccess();

    this.showFeedback(
      `🎉 <strong>TEBRİKLER! MODELİNİZ KUSURSUZ DOĞRULANDI.</strong><br/>
      Tanecik modelini kütle ve atom korunumu yasalarına tam uygun olarak başarıyla kurdunuz. Gözlem aşamasında gördüğünüz makroskobik değişimin, alt-mikroskobik düzeyde atomların yeniden düzenlenmesiyle gerçekleştiğini kanıtladınız.<br/><br/>
      <span style="display: inline-block; padding: 4px 10px; border-radius: 8px; background: rgba(34, 197, 94, 0.2); font-weight: 800; color: #15803d;">✓ 2. AŞAMA MODELLEME TAMAMLANDI</span>`,
      'success'
    );

    // State machine üzerinde Aşama 2'yi tamamlandı olarak işaretle
    if (this.state && typeof this.state.completeStage === 'function') {
      this.state.completeStage(2, { model: this.modelState });
    }
  }

  showFeedback(message, type) {
    const banner = document.getElementById('stage2FeedbackBanner');
    const msg = document.getElementById('stage2FeedbackMsg');
    const title = document.getElementById('stage2FeedbackTitle');
    if (!banner || !msg) return;

    banner.className = 'stage2-feedback-banner';
    banner.classList.add(type === 'success' ? 'is-success' : 'is-warning');
    if (title) title.textContent = type === 'success' ? '✓ DOĞRULAMA BAŞARILI' : '✗ İNCELEME GEREKLİ';
    msg.innerHTML = message;
    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  hideFeedback() {
    const banner = document.getElementById('stage2FeedbackBanner');
    if (banner) banner.style.display = 'none';
  }
}

// Global nesneye aktar
if (typeof window !== 'undefined') {
  window.Stage2ModelingManager = Stage2ModelingManager;
}
