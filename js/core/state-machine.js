/**
 * TEPKİMENİN ÜÇ YÜZÜ - 7 Aşamalı Pedagojik Durum Makinesi (State Machine)
 * Yönerge Sayfa 2, Sayfa 4 ve Sayfa 18 standartlarına tam uyumlu öğrenme akışı motoru.
 * Başlangıçta deney masası boş olarak bekler; reaksiyon seçildiğinde maddeler beherlere yerleştirilir.
 */

class LabStateMachine {
  constructor() {
    this.currentStage = 1;
    this.selectedReactionId = null; // Başlangıçta boş!
    this.simulationState = "no_reaction"; // 'no_reaction' | 'waiting_pour' | 'pouring' | 'reacting' | 'reacted'
    this.completedReactions = {};
    try {
      const saved = JSON.parse(localStorage.getItem('three-faces-completed-v1') || '{}');
      for (const [id, value] of Object.entries(saved)) {
        if (window.REACTIONS_DATA[id] && typeof value === 'string' && Number.isFinite(Date.parse(value))) this.completedReactions[id] = value;
      }
    } catch {}
    
    this.stages = {
      1: {
        id: 1,
        shortName: "Gözlem",
        title: "Aşama 1 — Gözlemle başla",
        subtitle: "Öğrenciye denklem/formül verilmez; kimyasal adlar ve deney kanıtı kullanılır.",
        status: "active", // 'locked' | 'active' | 'completed'
        completedData: null
      },
      2: {
        id: 2,
        shortName: "Modelle",
        title: "Aşama 2 — Modelini kur",
        subtitle: "Türleri yerleştir, etkileşimi keşfet ve gözlemini tanecik modelinle açıkla.",
        status: "locked",
        completedData: null
      },
      3: {
        id: 3,
        shortName: "Atom Takibi",
        title: "Aşama 3 — Atomun izini sür",
        subtitle: "Öğrenci seçilen atomun tepkime öncesinden sonrasına nasıl taşındığını görür.",
        status: "locked",
        completedData: null
      },
      4: {
        id: 4,
        shortName: "Test Et",
        title: "Aşama 4 — Modeli çalıştır ve test et",
        subtitle: "Sistem hatanın hangi tür atom veya tanecik üzerinden oluştuğunu görünür kılar.",
        status: "locked",
        completedData: null
      },
      5: {
        id: 5,
        shortName: "Üç Gösterim",
        title: "Aşama 5 — Üç gösterimi ilişkilendir",
        subtitle: "Makroskobik, Alt Mikroskobik ve Sembolik temsiller aynı anda senkron vurgulanır.",
        status: "locked",
        completedData: null
      },
      6: {
        id: 6,
        shortName: "Temsil Değiştir",
        title: "Aşama 6 — Temsil değiştirme görevleri",
        subtitle: "Her görevde eksik bir temsil öğrenci tarafından üretilir (üretim görevi).",
        status: "locked",
        completedData: null
      },
      7: {
        id: 7,
        shortName: "Bozuk Model",
        title: "Aşama 7 — Bozuk modeli onar",
        subtitle: "Hatalı model eleştirilir, onarılır ve açık uçlu bilimsel gerekçe yazılır.",
        status: "locked",
        completedData: null
      }
    };

    this.listeners = {
      stageChange: [],
      reactionChange: [],
      simulationChange: [],
      observationSuccess: [],
      completionChange: []
    };
  }

  // Abone olma (Event listeners)
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  getReaction() {
    return this.selectedReactionId ? window.REACTIONS_DATA[this.selectedReactionId] : null;
  }

  setReaction(reactionId, { restart = false } = {}) {
    if (!window.REACTIONS_DATA[reactionId]) return;
    if (["pouring", "reacting"].includes(this.simulationState)) return;
    if (reactionId === this.selectedReactionId && !restart) return;
    this.selectedReactionId = reactionId;
    this.simulationState = "waiting_pour";
    
    // Aşama 1 verisini sıfırla
    this.stages[1].status = "active";
    this.stages[1].completedData = null;
    this.stages[2].status = "locked";
    this.stages[2].completedData = null;
    this.modelingDraft=null;this.atomTraceDraft=null;for(let i=3;i<=7;i++){this.stages[i].status="locked";this.stages[i].completedData=null;}
    this.currentStage=1;
    
    this.emit("reactionChange", this.getReaction());
    this.emit("simulationChange", this.simulationState);
    this.emit("stageChange", { currentStage: this.currentStage, stages: this.stages });
  }

  setSimulationState(newState) {
    this.simulationState = newState;
    this.emit("simulationChange", newState);
  }

  invalidateObservation() {
    this.stages[1].status = 'active'; this.stages[1].completedData = null;
    for (let i = 2; i <= 7; i++) { this.stages[i].status = 'locked'; this.stages[i].completedData = null; }
    this.modelingDraft = this.atomTraceDraft = null;
    this.currentStage = 1;
    this.emit('stageChange', { currentStage: 1, stages: this.stages });
  }

  unlockStage(stageId) {
    if (this.stages[stageId] && this.stages[stageId].status === "locked") {
      this.stages[stageId].status = "unlocked";
      this.emit("stageChange", { currentStage: this.currentStage, stages: this.stages });
    }
  }

  setStage(stageId) {
    if (stageId < 1 || stageId > 3 || this.stages[stageId].status === "locked") return;
    this.currentStage = stageId;
    if (this.stages[stageId].status === "locked" || this.stages[stageId].status === "unlocked") {
      this.stages[stageId].status = "active";
    }
    
    if (window.labAudio) window.labAudio.playClick();
    this.emit("stageChange", { currentStage: this.currentStage, stages: this.stages });
  }

  completeStage(stageId, data = {}) {
    if (this.stages[stageId]) {
      this.stages[stageId].status = "completed";
      this.stages[stageId].completedData = data;

      // Sonraki aşamayı aç (Yalnızca 1 ve 2 aktif olduğu için stage 2 sonrası kilitli kalır)
      const nextStage = stageId + 1;
      if (nextStage <= 3 && this.stages[nextStage]) {
        this.stages[nextStage].status = "active";
      }

      if (window.labAudio) window.labAudio.playSuccess();
      if (stageId === 3 && [1, 2, 3].every(id => this.stages[id].status === 'completed' && !this.stages[id].completedData?.testMode)) {
        this.completedReactions[this.selectedReactionId] = new Date().toISOString();
        try { localStorage.setItem('three-faces-completed-v1', JSON.stringify(this.completedReactions)); } catch {}
        this.emit('completionChange', this.completedReactions);
      }
      this.emit("stageChange", { currentStage: this.currentStage, stages: this.stages });
    }
  }
}

const labState = new LabStateMachine();
if (typeof window !== "undefined") {
  window.labState = labState;
}
