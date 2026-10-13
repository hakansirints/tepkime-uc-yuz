/**
 * AŞAMA 2 - 7 İSKELETLERİ VE PEDAGOJİK DURUM YÖNETİCİSİ
 * Yönerge Sayfa 9-18 aralığındaki tüm aşamaların arayüz iskeletleri,
 * durum denetimleri ve geleceğe hazır veri akış mimarisi.
 */

class StageScaffoldManager {
  constructor(stateMachine) {
    this.state = stateMachine;
    this.container = document.getElementById("stageScaffoldView");
    this.stageNavPills = document.querySelectorAll(".mebi-stage-pill, .m3-step-btn");
    this.stageTitle = document.getElementById("activeStageTitle");
    this.stageSubtitle = document.getElementById("activeStageSubtitle");
    this.stageProgressBadge = document.getElementById("activeStageBadge");

    this.initListeners();
    this.renderActiveStage();
  }

  initListeners() {
    // Aşama geçişi dinleyicisi
    this.state.on("stageChange", ({ currentStage, stages }) => {
      this.updateNavigationUI(currentStage, stages);
      this.renderActiveStage();
    });

    // Tepkime değişimi dinleyicisi
    this.state.on("reactionChange", () => {
      this.stage2Manager?.dispose?.();
      this.stage2Manager = null;this.stage3Manager?.dispose?.();this.stage3Manager=null;
      this.stage2ManagerReactionId = null;this.state.modelingDraft=null;this.state.atomTraceDraft=null;
      this.renderActiveStage();
    });

    // Üst bar / Stepper hap butonları
    this.stageNavPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const stageId = parseInt(pill.getAttribute("data-stage-id"), 10);
        const stageData = this.state.stages[stageId];
        if (stageData && (stageData.status === "locked" || pill.disabled)) {
          if (window.labAudio && typeof window.labAudio.playWarning === "function") {
            window.labAudio.playWarning();
          } else if (window.labAudio) {
            window.labAudio.playHint();
          }
          return;
        }
        this.state.setStage(stageId);
      });
      pill.addEventListener("mouseenter", () => {
        if (window.labAudio) window.labAudio.playHover();
      });
    });
  }

  updateNavigationUI(currentStage, stages) {
    this.stageNavPills.forEach((pill) => {
      const stageId = parseInt(pill.getAttribute("data-stage-id"), 10);
      const stageData = stages[stageId];
      if (!stageData) return;

      pill.classList.remove("is-active", "is-completed", "is-locked", "is-unlocked");

      if (stageId === currentStage) {
        pill.classList.add("is-active");
      } else if (stageData.status === "completed") {
        pill.classList.add("is-completed");
      } else if (stageData.status === "locked") {
        pill.classList.add("is-locked");
      } else if (stageData.status === "unlocked") {
        pill.classList.add("is-unlocked");
      }

      pill.disabled=stageData.status==="locked";
      if (stageId === 2) {
        const lockIcon = document.getElementById("step2LockIcon");
        const isLocked = stageData.status === "locked";
        pill.disabled = isLocked;
        if (lockIcon) {
          lockIcon.textContent = isLocked ? "🔒" : "🔓";
        }
      }
    });

    const activeStage = stages[currentStage];
    if (this.stageTitle) this.stageTitle.textContent = activeStage.title;
    if (this.stageSubtitle) this.stageSubtitle.textContent = activeStage.subtitle;
    if (this.stageProgressBadge) this.stageProgressBadge.textContent = `Aşama ${currentStage}/3`;
  }

  renderActiveStage() {
    const stageId = this.state.currentStage;
    if(this.renderedStage!==stageId)this.container.scrollTop=0;
    this.renderedStage=stageId;
    if(stageId!==2&&this.stage2Manager){this.stage2Manager.dispose();this.stage2Manager=null;}
    if(stageId!==3&&this.stage3Manager){this.stage3Manager.dispose();this.stage3Manager=null;}
    if (this.state.stages[2].status === 'locked') this.state.modelingDraft = null;
    if (this.state.stages[3].status === 'locked') this.state.atomTraceDraft = null;
    const stage1Container = document.getElementById("stage1Container");
    const reactionCard = document.getElementById("reactionExpandCard");
    const scaffoldView = document.getElementById("stageScaffoldView");
    const bottomStrip = document.querySelector(".m3-bottom-actions-strip");
    const beakerLabels = document.querySelector(".m3-beaker-labels-strip");
    const tempBadge = document.getElementById("digitalTempBadge");

    if (stageId === 1) {
      if (stage1Container) stage1Container.style.display = "";
      if (reactionCard) reactionCard.style.display = "";
      if (bottomStrip) bottomStrip.style.display = "";
      if (beakerLabels) beakerLabels.style.display = "";
      if (tempBadge) tempBadge.style.display = "";
      if (scaffoldView) scaffoldView.style.display = "none";
    } else if (stageId === 2) {
      if (stage1Container) stage1Container.style.display = "none";
      if (reactionCard) reactionCard.style.display = "none";
      if (bottomStrip) bottomStrip.style.display = "none";
      if (beakerLabels) beakerLabels.style.display = "none";
      if (tempBadge) tempBadge.style.display = "none";
      if (scaffoldView) {
        scaffoldView.style.display = "flex";
        if (window.Stage2ModelingManager) {
          if (!this.stage2Manager || this.stage2ManagerReactionId !== this.state.selectedReactionId) {
            this.stage2ManagerReactionId = this.state.selectedReactionId;
            this.stage2Manager = new window.Stage2ModelingManager(this.state, scaffoldView);
          }
        } else {
          scaffoldView.innerHTML = this.getStageTemplate(stageId);
          this.bindScaffoldEvents(stageId);
        }
      }
    } else if(stageId===3&&window.StudentAtomTraceManager){
      if(stage1Container)stage1Container.style.display="none";if(reactionCard)reactionCard.style.display="none";if(bottomStrip)bottomStrip.style.display="none";if(beakerLabels)beakerLabels.style.display="none";if(tempBadge)tempBadge.style.display="none";scaffoldView.style.display="flex";if(!this.stage3Manager)this.stage3Manager=new window.StudentAtomTraceManager(this.state,scaffoldView);
    } else {
      if (stage1Container) stage1Container.style.display = "none";
      if (reactionCard) reactionCard.style.display = "none";
      if (bottomStrip) bottomStrip.style.display = "none";
      if (beakerLabels) beakerLabels.style.display = "none";
      if (tempBadge) tempBadge.style.display = "none";
      if (scaffoldView) {
        scaffoldView.style.display = "flex";
        scaffoldView.innerHTML = this.getStageTemplate(stageId);
        this.bindScaffoldEvents(stageId);
      }
    }
  }

  getStageTemplate(stageId) {
    const reaction = this.state.getReaction();
    const micro = reaction.microscopic;

    switch (stageId) {
      case 2:
        return `
          <div class="mebi-scaffold-card">
            <div class="mebi-card-header">
              <span class="mebi-badge mebi-badge-indigo">AŞAMA 2 / 7</span>
              <h2 class="mebi-card-title">Modelini Kur — Alt Mikroskobik Tanecik Havuzu</h2>
              <p class="mebi-card-subtitle">Ürünleri hazır ezberlemek yerine taneciklerden reaksiyon modelini üretin.</p>
            </div>
            
            <div class="mebi-scaffold-body">
              <div class="mebi-scaffold-grid-2">
                <!-- Sol: Tanecik Paleti -->
                <div class="mebi-scaffold-box">
                  <h3 class="mebi-box-title">🧪 Tanecik & İyon Havuzu</h3>
                  <p class="mebi-box-desc">Sulu ortamdaki serbest iyonlar ve molekül parçaları:</p>
                  <div class="mebi-particle-pool">
                    ${micro.reactants.map(r => `
                      <div class="mebi-particle-item" style="border-color: ${r.color || '#3b82f6'};">
                        <span class="mebi-particle-symbol">${r.symbol}</span>
                        <span class="mebi-particle-type">${r.type === 'ion' ? 'İyon' : (r.type === 'crystal' ? 'Kristal Kafes' : 'Molekül')}</span>
                      </div>
                    `).join('')}
                  </div>
                  <div class="mebi-rule-callout">
                    <strong>⚠️ Kritik Kural (Sayfa 10 & 16):</strong>
                    Sulu çözeltilerde NaCl kristal örgü olarak çizilmez; Na⁺ ve Cl⁻ bağımsız serbest iyonlar olarak yer alır.
                  </div>
                </div>

                <!-- Sağ: 3 Bölmeli Modelleme Çalışma Masası -->
                <div class="mebi-scaffold-box">
                  <h3 class="mebi-box-title">📋 Reaksiyon İlerleme Aşamaları</h3>
                  <div class="mebi-timeline-steps">
                    <div class="mebi-timeline-step">
                      <span class="mebi-step-num">1</span>
                      <div>
                        <strong>Tepkime Öncesi:</strong> Reaktif tanecikleri sulu ortamda ayrı konumlanır.
                      </div>
                    </div>
                    <div class="mebi-timeline-step">
                      <span class="mebi-step-num">2</span>
                      <div>
                        <strong>Etkileşirken:</strong> Bağlar kopar ve tanecikler çarpışarak yeniden düzenlenir.
                      </div>
                    </div>
                    <div class="mebi-timeline-step">
                      <span class="mebi-step-num">3</span>
                      <div>
                        <strong>Tepkime Sonrası:</strong> Ürünler oluşur (${reaction.result.evidenceSummary}).
                      </div>
                    </div>
                  </div>
                  <div class="mebi-action-row" style="margin-top: 24px;">
                    <button id="btnMockStage2Test" class="mebi-btn mebi-btn-primary">
                      <span class="mebi-btn-text">MODELİ TEST ET (AŞAMA 4'E GEÇ) ➔</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

      case 3:
        return `
          <div class="mebi-scaffold-card">
            <div class="mebi-card-header">
              <span class="mebi-badge mebi-badge-purple">AŞAMA 3 / 7</span>
              <h2 class="mebi-card-title">Atomun İzini Sür (Atom Takibi)</h2>
              <p class="mebi-card-subtitle">Seçilen atomun tepkime öncesinden tepkime sonrasına nasıl korunduğunu keşfedin.</p>
            </div>
            <div class="mebi-scaffold-body">
              <div class="mebi-atom-tracking-banner">
                <div class="mebi-atom-focus-circle">
                  <span class="mebi-atom-huge">C / Fe / Pb</span>
                  <span>Hedef Atom</span>
                </div>
                <div class="mebi-atom-tracking-text">
                  <h3>Atom Korunumu Görevi:</h3>
                  <p>1. Başlangıçta hedef atomu içeren reaktife dokunun.</p>
                  <p>2. Tepkime boyunca işaretlenen atomun hareketini izleyin.</p>
                  <p>3. Son durumda aynı atomun hangi üründe yer aldığını belirleyin.</p>
                  <div class="mebi-pedagogical-quote">
                    <em>"Bilgi: Atom yok olmadı, yeni atom oluşmadı; atomlar yeniden düzenlendi." (Yönerge S.11)</em>
                  </div>
                </div>
              </div>
              <div class="mebi-action-row" style="margin-top: 20px;">
                <button id="btnMockNextStage" class="mebi-btn mebi-btn-success">
                  <span class="mebi-btn-text">GÖREVİ ONAYLA VE İLERLE ➔</span>
                </button>
              </div>
            </div>
          </div>
        `;

      case 4:
        return `
          <div class="mebi-scaffold-card">
            <div class="mebi-card-header">
              <span class="mebi-badge mebi-badge-warning">AŞAMA 4 / 7</span>
              <h2 class="mebi-card-title">Modeli Çalıştır ve Test Et</h2>
              <p class="mebi-card-subtitle">Sistem cevabı söylemez; atom türü ve sayısı korunumunu denetletir.</p>
            </div>
            <div class="mebi-scaffold-body">
              <div class="mebi-test-panels-grid">
                <div class="mebi-test-panel is-fail">
                  <h4>❌ Hatalı Model Uyarısı (Sayfa 12):</h4>
                  <p><em>"Modelindeki atomları yeniden say. Tepkime öncesi ve sonrası sayıların aynı olup olmadığını karşılaştır."</em></p>
                  <small>Öğrenciye ürün adı söylenmez; sayma ve karşılaştırma işlemine yönlendirilir.</small>
                </div>
                <div class="mebi-test-panel is-pass">
                  <h4>✅ Başarılı Model Onayı:</h4>
                  <p><em>"Modeliniz atom türlerinin ve atom sayılarının korunması açısından bilimsel olarak tutarlıdır."</em></p>
                  <small>Sulu iyonlar ve katı çökeltiler doğru temsil edilmiştir.</small>
                </div>
              </div>
              <div class="mebi-action-row" style="margin-top: 20px;">
                <button id="btnMockNextStage" class="mebi-btn mebi-btn-primary">
                  <span class="mebi-btn-text">AŞAMA 5: ÜÇ GÖSTERİME GEÇ ➔</span>
                </button>
              </div>
            </div>
          </div>
        `;

      case 5:
        return `
          <div class="mebi-scaffold-card">
            <div class="mebi-card-header">
              <span class="mebi-badge mebi-badge-cyan">AŞAMA 5 / 7</span>
              <h2 class="mebi-card-title">Üç Gösterimi İlişkilendir (Johnstone Üçgeni)</h2>
              <p class="mebi-card-subtitle">Makroskobik, Alt Mikroskobik ve Sembolik temsiller aynı anda senkron vurgulanır.</p>
            </div>
            <div class="mebi-scaffold-body">
              <div class="mebi-triplet-grid">
                <div class="mebi-triplet-col">
                  <div class="mebi-triplet-header">👁️ MAKROSKOBİK</div>
                  <div class="mebi-triplet-content">
                    <strong>Deney Masası Kanıtı:</strong>
                    <p>${reaction.result.evidenceSummary}</p>
                    <span class="mebi-badge mebi-badge-primary">Termometre: ${reaction.result.targetTemp} °C</span>
                  </div>
                </div>
                <div class="mebi-triplet-col">
                  <div class="mebi-triplet-header">🔬 ALT MİKROSKOBİK</div>
                  <div class="mebi-triplet-content">
                    <strong>Tanecik Düzeni:</strong>
                    <p>Sulu çözeltide serbest iyonlar ve oluşan kararlı ürün molekülleri/kristalleri.</p>
                  </div>
                </div>
                <div class="mebi-triplet-col">
                  <div class="mebi-triplet-header">📝 SEMBOLİK</div>
                  <div class="mebi-triplet-content">
                    <strong>Kimyasal Denklem (İlk Kez Açıldı):</strong>
                    <code class="mebi-equation-code">${micro.equation}</code>
                  </div>
                </div>
              </div>
              <div class="mebi-action-row" style="margin-top: 24px;">
                <button id="btnMockNextStage" class="mebi-btn mebi-btn-primary">
                  <span class="mebi-btn-text">AŞAMA 6: TEMSİL DEĞİŞTİR ➔</span>
                </button>
              </div>
            </div>
          </div>
        `;

      case 6:
        return `
          <div class="mebi-scaffold-card">
            <div class="mebi-card-header">
              <span class="mebi-badge mebi-badge-indigo">AŞAMA 6 / 7</span>
              <h2 class="mebi-card-title">Temsil Değiştirme Görevleri (Üretim Modu)</h2>
              <p class="mebi-card-subtitle">Her görevde eksik bir temsil öğrenci tarafından üretilir (Yönerge S.14).</p>
            </div>
            <div class="mebi-scaffold-body">
              <div class="mebi-representation-tasks">
                <div class="mebi-rep-task-card">
                  <h4>Görev 1: Eksik Tanecik Modelini Üret</h4>
                  <p>Makroskobik kanıt (${reaction.result.evidenceSummary}) ve sembolik gösterim verilir ➔ Öğrenci doğru tanecik modelini kurar.</p>
                </div>
                <div class="mebi-rep-task-card">
                  <h4>Görev 2: Eksik Makroskobik Gözlemi Tahmin Et</h4>
                  <p>Tanecik modeli ve denklem verilir ➔ Öğrenci gözlemlenecek sonucu (kabarcık / çökelti / duman) yazar.</p>
                </div>
                <div class="mebi-rep-task-card">
                  <h4>Görev 3: Eksik Sembolik Denklemi Tamamla</h4>
                  <p>Gözlem ve tanecik modeli verilir ➔ Öğrenci kimyasal formül ve katsayıları eşleştirir.</p>
                </div>
              </div>
              <div class="mebi-action-row" style="margin-top: 24px;">
                <button id="btnMockNextStage" class="mebi-btn mebi-btn-danger">
                  <span class="mebi-btn-text">FİNAL AŞAMASI: BOZUK MODELİ ONAR ➔</span>
                </button>
              </div>
            </div>
          </div>
        `;

      case 7:
        return `
          <div class="mebi-scaffold-card">
            <div class="mebi-card-header">
              <span class="mebi-badge mebi-badge-danger">AŞAMA 7 / 7 (FİNAL)</span>
              <h2 class="mebi-card-title">Bozuk Modeli Onar & Gerekçelendir</h2>
              <p class="mebi-card-subtitle">Hatalı kimyasal modeldeki eksiklikleri bulun, düzeltin ve açık uçlu gerekçe yazın.</p>
            </div>
            <div class="mebi-scaffold-body">
              <div class="mebi-broken-model-box">
                <div class="mebi-alert-broken">
                  ⚠️ <strong>Hata Tespiti:</strong> Bu modelde tepkime öncesinde 4 oksijen varken ürünlerde 3 oksijen gösterilmiş ve yük dengesi korunmamıştır!
                </div>
                <div class="mebi-input-group" style="margin-top: 20px;">
                  <label class="mebi-input-label"><strong>Açık Uçlu Bilimsel Gerekçeniz (Yönerge S.15):</strong></label>
                  <p class="mebi-input-hint">Modelde yaptığınız düzeltmelerin atom türü ve sayısının korunumu açısından neden gerekli olduğunu açıklayınız:</p>
                  <div class="mebi-textarea-box">
                    <textarea class="mebi-textarea-field" rows="4" placeholder="Bilimsel açıklamanızı buraya yazınız..."></textarea>
                  </div>
                </div>
              </div>
              <div class="mebi-action-row" style="margin-top: 24px;">
                <button id="btnMockCompleteWorkflow" class="mebi-btn mebi-btn-success">
                  <span class="mebi-btn-text">ÖĞRENME AKIŞINI TAMAMLA ✓</span>
                </button>
                <button id="btnReturnStage1" class="mebi-btn mebi-btn-secondary">
                  <span class="mebi-btn-text">AŞAMA 1 (GÖZLEM)'E DÖN ↺</span>
                </button>
              </div>
            </div>
          </div>
        `;

      default:
        return `<p>Aşama yükleniyor...</p>`;
    }
  }

  bindScaffoldEvents(stageId) {
    const btnNext = document.getElementById("btnMockNextStage");
    if (btnNext) {
      btnNext.addEventListener("click", () => {
        this.state.completeStage(stageId);
        this.state.setStage(stageId + 1);
      });
    }

    const btnStage2Test = document.getElementById("btnMockStage2Test");
    if (btnStage2Test) {
      btnStage2Test.addEventListener("click", () => {
        this.state.setStage(4);
      });
    }

    const btnReturnStage1 = document.getElementById("btnReturnStage1");
    if (btnReturnStage1) {
      btnReturnStage1.addEventListener("click", () => {
        this.state.setStage(1);
      });
    }

    const btnComplete = document.getElementById("btnMockCompleteWorkflow");
    if (btnComplete) {
      btnComplete.addEventListener("click", () => {
        if (window.labAudio) window.labAudio.playSuccess();
        alert("Tebrikler! 7 aşamalı 'Tepkimenin Üç Yüzü' öğrenme akışını başarıyla tamamladınız.");
        this.state.setStage(1);
      });
    }
  }
}

if (typeof window !== "undefined") {
  window.StageScaffoldManager = StageScaffoldManager;
}
