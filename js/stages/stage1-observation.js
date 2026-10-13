/**
 * AŞAMA 1 — GÖZLEMLE BAŞLA (Makroskobik Gözlem Motoru)
 * Yönerge Sayfa 3, 4, 5, 8 ve 18 standartlarına tam uyumludur.
 * Formül ve denklem verilmez; madde adları ve deney kanıtı üzerinden yönlendirici dönüt üretilir.
 */

class Stage1ObservationManager {
  constructor(stateMachine) {
    this.state = stateMachine;
    this.container = document.getElementById("stage1Container");

    this.selectedChips = new Set();
    this.initElements();
    this.initListeners();
    this.updateUI();
    LandscapeTasks.subscribe(() => this.updateUI());
  }

  initElements() {
    this.waitingStateBox = document.getElementById("obsWaitingState");
    this.activeStateBox = document.getElementById("obsActiveState");
    this.completedStateBox = document.getElementById("obsCompletedState");

    this.obsWaitingTitle = document.getElementById("obsWaitingTitle");
    this.obsWaitingDesc = document.getElementById("obsWaitingDesc");

    this.textarea = document.getElementById("obsTextarea");
    this.charCounter = document.getElementById("obsCharCounter");
    this.wordCounter = document.getElementById("obsWordCounter");
    this.btnSubmit = document.getElementById("btnSubmitObservation");
    this.feedbackBox = document.getElementById("obsFeedbackBox");
    this.feedbackText = document.getElementById("obsFeedbackText");
    this.feedbackBadge = document.getElementById("obsFeedbackBadge");
  }

  initListeners() {
    // 1. Simülasyon durumu değişimleri
    this.state.on("simulationChange", (simState) => {
      this.updateUI();
    });

    // 2. Tepkime değişimi
    this.state.on('stageChange', () => this.updateUI());
    this.state.on("reactionChange", () => {
      this.resetInput();
      this.updateUI();
    });

    // 3. Metin girişi ve sayaçlar
    if (this.textarea) {
      this.textarea.addEventListener("input", () => {
        this.container.dataset.status = 'neutral';
        this.feedbackBox.style.display = 'none';
        this.container.dataset.hasFeedback = 'false';
        if (this.state.stages[1].status === 'completed' && this.textarea.value.trim() !== this.state.stages[1].completedData?.userObservation) {
          this.state.invalidateObservation(); this.lockStage2Transition();
          this.feedbackBox.style.display = 'none';
        }
        this.updateCounters();
      });
    }

    // 4. Gözlemi Gönder Butonu (Kontrol Et)
    if (this.btnSubmit) {
      this.btnSubmit.addEventListener("click", () => {
        if (this.hasApprovedObservation()) this.state.setStage(2);
        else this.evaluateObservation();
      });
    }

  }

  updateUI() {
    const simState = this.state.simulationState;
    const stage = this.state.stages[1];
    this.setView();

    if (simState === "no_reaction") {
      if (this.waitingStateBox) this.waitingStateBox.style.display = "block";
      if (this.activeStateBox) this.activeStateBox.style.display = "none";
      if (this.completedStateBox) this.completedStateBox.style.display = "none";
      if (this.obsWaitingTitle) this.obsWaitingTitle.textContent = "Tepkime Bekleniyor";
      if (this.obsWaitingDesc) {
        this.obsWaitingDesc.textContent = "Deney masası başlangıçta boştur. Tepkime seçiminden bir tepkime seçtiğinizde reaktifler beherlere yerleştirilecek ve karışımdan sonra gözlem paneli aktifleşecektir.";
      }
    } else if (simState === "waiting_pour") {
      if (this.waitingStateBox) this.waitingStateBox.style.display = "block";
      if (this.activeStateBox) this.activeStateBox.style.display = "none";
      if (this.completedStateBox) this.completedStateBox.style.display = "none";
      if (this.obsWaitingTitle) this.obsWaitingTitle.textContent = "Reaktifler Masada Hazır";
      if (this.obsWaitingDesc) {
        this.obsWaitingDesc.textContent = window.labScene?.glassware.isFilled
          ? "İki beher de hazır. 'Beheri dök ve karıştır' düğmesini kullan veya küçük beheri sola ve yukarı sürükleyip uygun açıda bırak; karışımda oluşan değişimleri gözlemle."
          : "Maddeler beherlere yerleştiriliyor. Doldurma tamamlandığında 'Beheri dök ve karıştır' düğmesini kullanın veya küçük beheri sola ve yukarı sürükleyip uygun açıda bırakın.";
      }
    } else if (simState === "pouring" || simState === "reacting") {
      if (this.waitingStateBox) this.waitingStateBox.style.display = "block";
      if (this.activeStateBox) this.activeStateBox.style.display = "none";
      if (this.completedStateBox) this.completedStateBox.style.display = "none";
      if (this.obsWaitingTitle) this.obsWaitingTitle.textContent = "Tepkime Gerçekleşiyor...";
      if (this.obsWaitingDesc) {
        this.obsWaitingDesc.textContent = "Maddeler karışıyor. Sıvı rengi, kabarcık veya çökelti oluşumu ve termometredeki sıcaklık değişimini dikkatle inceleyiniz.";
      }
    } else {
      // Reaksiyon gerçekleşti (simState === 'reacted'): Gözlem paneli aktif!
      if (this.waitingStateBox) this.waitingStateBox.style.display = "none";
      if (this.activeStateBox) this.activeStateBox.style.display = "block";
      if (this.completedStateBox) this.completedStateBox.style.display = stage.status === 'completed' ? 'block' : 'none';
      this.updateSubmitButtonState();
    }
    if (LandscapeTasks.active() && simState !== 'reacted') this.obsWaitingDesc.textContent = simState === 'no_reaction'
      ? 'Bir madde çifti seç. Karışımın görünümünü ve sıcaklığını izle.'
      : simState === 'waiting_pour' ? 'Küçük beheri sola ve yukarı sürükle veya dökme düğmesini kullan.'
      : 'Maddeler karışıyor. Kabarcık, katı ve sıcaklık değişimini izle.';
    this.updateSubmitButtonState();
    cancelAnimationFrame(this.layoutFrame); this.layoutFrame = requestAnimationFrame(() => this.fitNotebook());
  }

  updateCounters() {
    if (!this.textarea) return;
    const text = this.textarea.value.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).length : 0;

    if (this.charCounter) this.charCounter.textContent = `${chars} / 300`;
    if (this.wordCounter) this.wordCounter.textContent = `${words} kelime`;

    this.updateSubmitButtonState();
  }

  updateSubmitButtonState() {
    if (!this.btnSubmit) return;
    const text = this.textarea ? this.textarea.value.trim() : "";
    const approved = this.hasApprovedObservation();
    this.btnSubmit.dataset.action = approved ? 'proceed' : 'check';
    this.btnSubmit.querySelector('.mebi-btn-text').textContent = approved ? 'Tanecik laboratuvarına geç →' : 'Gözlemi kontrol et ↗';
    this.btnSubmit.disabled = text.length < 3 || this.state.simulationState !== "reacted";
  }

  hasApprovedObservation() {
    const stage = this.state.stages[1], approved = stage.completedData;
    return stage.status === 'completed' && this.state.simulationState === 'reacted'
      && approved?.reactionId === this.state.selectedReactionId
      && approved.userObservation === this.textarea.value.trim();
  }

  evaluateObservation() {
    const reaction = this.state.getReaction();
    const rawText = this.textarea?.value.trim() || '';
    if (!reaction || this.state.simulationState !== 'reacted') {
      this.showFeedback('Önce maddeleri karıştır ve deneyi tamamla.', 'incomplete');
      return;
    }
    const result = ObservationEvaluator.evaluate(reaction.id, rawText);
    this.lastEvaluation = result;
    this.showFeedback(result.message, result.status);
    if (result.status === 'correct') {
      const approved = this.state.stages[1].completedData;
      if (approved?.userObservation !== rawText) this.state.completeStage(1, {
        reactionId: reaction.id, userObservation: rawText, timestamp: new Date().toISOString()
      });
      this.unlockStage2Transition();
    } else {
      this.state.invalidateObservation();
      this.lockStage2Transition();
      window.labAudio?.playHint();
    }
    this.updateUI();
  }

  unlockStage2Transition() {
    this.updateSubmitButtonState();
    const stepBtn2 = document.getElementById("stepBtnStage2");
    if (stepBtn2) {
      stepBtn2.disabled = false;
      stepBtn2.classList.remove("is-locked");
      stepBtn2.classList.add("is-unlocked");
      stepBtn2.removeAttribute("title");
      const lockIcon = document.getElementById("step2LockIcon");
      if (lockIcon) lockIcon.textContent = "🔓";
    }
  }

  lockStage2Transition() {
    this.updateSubmitButtonState();
    const stepBtn2 = document.getElementById("stepBtnStage2");
    if (stepBtn2) {
      stepBtn2.disabled = true;
      stepBtn2.classList.add("is-locked");
      stepBtn2.classList.remove("is-unlocked");
      stepBtn2.title = "Önce gerçekleşen tepkimeyle ilgili gözleminizi yazıp 'Kontrol Et' ile doğrulayınız";
      const lockIcon = document.getElementById("step2LockIcon");
      if (lockIcon) lockIcon.textContent = "🔒";
    }
  }

  showFeedback(message, type = "info") {
    if (!this.feedbackBox || !this.feedbackText) return;

    // "Doğru gözlem:" veya benzeri önekleri temizle
    const cleanMessage = (message || "").replace(/^Doğru\s*gözlem\s*:\s*/i, "").trim();

    this.feedbackBox.style.display = "flex";
    const labels = { correct: 'Doğru', incorrect: 'Hatalı', incomplete: 'Eksik' };
    this.feedbackBox.dataset.status = type;
    this.container.dataset.hasFeedback = 'true';
    this.container.dataset.status = type;
    this.setView('feedback');
    this.feedbackBox.setAttribute('role', 'status');
    this.feedbackText.textContent = (labels[type] ? labels[type] + ' · ' : '') + cleanMessage;

    this.feedbackBox.className = "mebi-observation-feedback";
    if (type === "correct" || type === "success") {
      this.feedbackBox.classList.add("is-success");
      if (this.feedbackBadge) this.feedbackBadge.textContent = "✓";
    } else {
      this.feedbackBox.classList.add(type === 'incorrect' ? 'is-error' : 'is-warning');
      if (this.feedbackBadge) this.feedbackBadge.textContent = type === 'incorrect' ? '✗' : '!';
    }

    if (!LandscapeTasks.active()) this.feedbackBox.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }

  resetInput() {
    this.container.dataset.status = 'neutral'; this.setView('experiment');
    if (this.textarea) this.textarea.value = "";
    if (this.feedbackBox) this.feedbackBox.style.display = "none";
    this.lockStage2Transition();
    this.updateCounters();
    this.container.dataset.hasFeedback = 'false';
  }
  // The notebook stays in the same source card throughout the observation stage.
  setView() { document.getElementById('observationLayout').dataset.view = 'inline'; }
  fitNotebook() {
    if (!LandscapeTasks.active()) { this.textarea.style.removeProperty('height'); return; }
    if (this.state.currentStage !== 1 || this.state.simulationState !== 'reacted') return;
    const layout = document.getElementById('observationLayout').getBoundingClientRect(), card = this.container.getBoundingClientRect();
    const current = this.textarea.getBoundingClientRect().height;
    const available = layout.bottom - card.top - 4;
    this.textarea.style.height = Math.max(44, Math.min(84, current + available - this.container.scrollHeight)) + 'px';
  }
}

if (typeof window !== "undefined") {
  window.Stage1ObservationManager = Stage1ObservationManager;
}
