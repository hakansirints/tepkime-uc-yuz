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
    this.btnProceedStage2 = document.getElementById("btnProceedStage2");
  }

  initListeners() {
    // 1. Simülasyon durumu değişimleri
    this.state.on("simulationChange", (simState) => {
      this.updateUI();
    });

    // 2. Tepkime değişimi
    this.state.on("reactionChange", () => {
      this.resetInput();
      this.updateUI();
    });

    // 3. Metin girişi ve sayaçlar
    if (this.textarea) {
      this.textarea.addEventListener("input", () => {
        this.updateCounters();
      });
    }

    // 4. Gözlemi Gönder Butonu (Kontrol Et)
    if (this.btnSubmit) {
      this.btnSubmit.addEventListener("click", () => {
        this.evaluateObservation();
      });
    }

    // 5. Aşama 2'ye Geç Butonu (Sıkı Kilit: Doğru gözlem onaylanmadan geçilemez)
    if (this.btnProceedStage2) {
      this.btnProceedStage2.addEventListener("click", () => {
        if (this.btnProceedStage2.disabled) {
          if (window.labAudio && typeof window.labAudio.playWarning === "function") {
            window.labAudio.playWarning();
          }
          return;
        }
        this.state.setStage(2);
      });
    }
  }

  updateUI() {
    const simState = this.state.simulationState;
    const stage = this.state.stages[1];

    if (stage.status === "completed") {
      if (this.waitingStateBox) this.waitingStateBox.style.display = "none";
      if (this.activeStateBox) this.activeStateBox.style.display = "none";
      if (this.completedStateBox) this.completedStateBox.style.display = "block";
      return;
    }

    if (simState === "no_reaction") {
      if (this.waitingStateBox) this.waitingStateBox.style.display = "block";
      if (this.activeStateBox) this.activeStateBox.style.display = "none";
      if (this.completedStateBox) this.completedStateBox.style.display = "none";
      if (this.obsWaitingTitle) this.obsWaitingTitle.textContent = "Tepkime Bekleniyor";
      if (this.obsWaitingDesc) {
        this.obsWaitingDesc.textContent = "Deney masası başlangıçta boştur. Soldaki karttan bir tepkime seçtiğinizde reaktifler beherlere yerleştirilecek ve karışımdan sonra gözlem paneli aktifleşecektir.";
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
      if (this.completedStateBox) this.completedStateBox.style.display = "none";
      this.updateSubmitButtonState();
    }
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
    this.btnSubmit.disabled = text.length < 3;
  }

  // Akıllı Gözlem ve Kanıt Analizörü (Metindeki kimyasal gözlem kanıtlarını arar)
  evaluateObservation() {
    const reaction = this.state.getReaction();
    if (!reaction) return;

    const pedagogy = reaction.pedagogy || {};
    const rawText = this.textarea ? this.textarea.value.trim() : "";
    if (rawText.length < 3) return;

    // Türkçe karakterleri normalize et
    const norm = (str) => {
      return (str || "")
        .toLocaleLowerCase("tr-TR")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .trim();
    };

    const text = norm(rawText);

    // 1. Yanılgı (Misconception) Denetimi: Örn. Gaz reaksiyonuna çökelti / katı dedi mi?
    if (pedagogy.misconceptions) {
      for (const [key, mis] of Object.entries(pedagogy.misconceptions)) {
        const matchesMis = (mis.keywords || []).some((kw) => text.includes(norm(kw)));
        if (matchesMis) {
          this.showFeedback(mis.feedback, "warning");
          if (window.labAudio && typeof window.labAudio.playWarning === "function") {
            window.labAudio.playWarning();
          } else if (window.labAudio) {
            window.labAudio.playHint();
          }
          this.lockStage2Transition();
          return;
        }
      }
    }

    // 2. Kimyasal Reaksiyon Gözlem Kanıtı Eşleşmesi
    const primaryType = reaction.result ? reaction.result.primaryType : "";
    const typeKeywords = {
      gas: ["kabarcik", "gaz", "kopurme", "kaynama", "hava", "baloncuk", "uctu", "cikis", "buhar"],
      precipitate: ["cokelti", "cokelek", "cokme", "bulanma", "bulandi", "bulanık", "katilasma", "kati", "tortu", "dibinde", "parcacik"],
      smoke: ["duman", "beyaz duman", "sis", "gaz", "buhar"],
      neutralization: ["sicaklik", "isinma", "isi", "derece", "artti", "termo"]
    };

    const expectedKeys = (pedagogy.expectedKeyEvidence || []).map(norm);
    if (typeKeywords[primaryType]) {
      typeKeywords[primaryType].forEach(kw => {
        if (!expectedKeys.includes(kw)) expectedKeys.push(kw);
      });
    }

    const hasKeyEvidence = expectedKeys.some((kw) => text.includes(kw));

    if (hasKeyEvidence) {
      // Doğru gözlem!
      this.showFeedback(pedagogy.correctFeedback || "Tebrikler! Doğru gözlem yaptınız.", "success");
      if (window.labAudio && typeof window.labAudio.playSuccess === "function") {
        window.labAudio.playSuccess();
      }

      this.state.completeStage(1, {
        userObservation: rawText,
        timestamp: new Date().toISOString()
      });
      this.state.unlockStage(2);
      this.unlockStage2Transition();
    } else {
      // Yanlış / Eksik gözlem: Amber uyarı kutusu ve tepkimeye özel rehber soru
      const guideMsg = pedagogy.guidancePrompt 
        ? `Gözleminizi deneydeki somut fiziksel değişime göre yeniden inceleyiniz: ${pedagogy.guidancePrompt}`
        : "Gözleminizi kapta gerçekleşen fiziksel duruma (gaz kabarcıkları, katı çökelti veya sıcaklık değişimi) odaklanarak yeniden inceleyiniz.";
      
      this.showFeedback(guideMsg, "warning");
      if (window.labAudio && typeof window.labAudio.playWarning === "function") {
        window.labAudio.playWarning();
      } else if (window.labAudio) {
        window.labAudio.playHint();
      }
      this.lockStage2Transition();
    }
  }

  unlockStage2Transition() {
    if (this.btnProceedStage2) {
      this.btnProceedStage2.disabled = false;
      this.btnProceedStage2.removeAttribute("title");
      this.btnProceedStage2.classList.add("is-pulse-ready");
    }
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
    if (this.btnProceedStage2) {
      this.btnProceedStage2.disabled = true;
      this.btnProceedStage2.title = "Önce gerçekleşen tepkimeyle ilgili gözleminizi yazıp 'Kontrol Et' ile doğrulayınız";
      this.btnProceedStage2.classList.remove("is-pulse-ready");
    }
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
    this.feedbackText.textContent = cleanMessage;

    this.feedbackBox.className = "mebi-observation-feedback";
    if (type === "success") {
      this.feedbackBox.classList.add("is-success");
      if (this.feedbackBadge) this.feedbackBadge.textContent = "✓";
    } else {
      this.feedbackBox.classList.add("is-warning");
      if (this.feedbackBadge) this.feedbackBadge.textContent = "✗";
    }

    this.feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  resetInput() {
    if (this.textarea) this.textarea.value = "";
    if (this.feedbackBox) this.feedbackBox.style.display = "none";
    this.lockStage2Transition();
    this.updateCounters();
  }
}

if (typeof window !== "undefined") {
  window.Stage1ObservationManager = Stage1ObservationManager;
}
