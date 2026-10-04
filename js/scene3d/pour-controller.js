/**
 * Sıvı Dökme ve Karıştırma Etkileşim Yöneticisi (Pour Controller)
 * - Otomatik Dökme Animasyonu
 * - Fare ve Dokunmatik Sürükle-Bırak Etkileşimi
 * - Sıcaklık, Ses ve Parçacık Tetiklemelerinin Senkronizasyonu
 * - Boş masa ve doldurulmuş masa durum geçişleri
 */

class LabPourController {
  constructor(glassware, thermometer, particleManager, stateMachine) {
    this.glassware = glassware;
    this.thermometer = thermometer;
    this.particleManager = particleManager;
    this.state = stateMachine;

    this.isPouring = false;
    this.pourProgress = 0.0;
    this.animDuration = 5000; // ms: lift, transfer, then gently return.
    this.animStartTime = null;

    // Durum makinesine bağlan
    this.state.on("reactionChange", (reaction) => {
      this.resetPour();
    });
    this.state.on("simulationChange", () => {
      this.updateUIState();
    });

    this.resetPour();
  }

  // 1. Otomatik Dök & Karıştır Eylemi
  startAutomaticPour(initialProgress = 0) {
    if (this.isPouring || !this.glassware.isFilled || this.state.simulationState !== "waiting_pour" || !this.state.getReaction()) return;

    this.isPouring = true;
    this.pourProgress = initialProgress;
    this.animStartTime = performance.now() - initialProgress * this.animDuration;
    if (window.labScene?.currentPreset === "closeup") window.labScene.setCameraPreset("desk");
    this.state.setSimulationState("pouring");

    this.pourSoundStarted = false;

    this.updateUIState();
  }

  // 2. Her Animasyon Karesinde Döküşü Güncelle
  update(time) {
    if (!this.isPouring) return;

    const elapsed = time - this.animStartTime;
    this.pourProgress = Math.min(1.0, elapsed / this.animDuration);

    this.glassware.setPourProgress(this.pourProgress);
    if (!this.pourSoundStarted && this.pourProgress >= .22) {
      this.pourSoundStarted = true;
      if (window.labAudio) window.labAudio.playPour(2.9);
    }

    // Reaksiyon ortasında parçacıkları ve sıcaklığı tetikle
    if (this.pourProgress >= 0.45 && this.state.simulationState === "pouring") {
      this.triggerReactionEffects();
    }

    // Sıvı rengi geçişi (0.4 - 1.0 aralığı)
    if (this.pourProgress >= 0.4) {
      const reaction = this.state.getReaction();
      if (reaction) {
        this.glassware.lerpLiquidColor(
          reaction.result.finalColor,
          0.05,
          reaction.result.finalOpacity || 0.75
        );
      }
    }

    // Dökme tamamlandı
    if (this.pourProgress >= 1.0) {
      this.isPouring = false;
      this.state.setSimulationState("reacted");
      this.updateUIState();
    }
  }

  // Hızlı tepkime durumu (Test / showcase için)
  instantReact() {
    const reaction = this.state.getReaction();
    if (!reaction) return;
    this.isPouring = false;
    this.pourProgress = 1.0;
    this.glassware.setPourProgress(1.0);
    if (reaction.result && reaction.result.finalColor) {
      this.glassware.liquid250Mat.color.setHex(reaction.result.finalColor);
      this.glassware.liquid250Mat.opacity = reaction.result.finalOpacity || 0.75;
    }
    this.triggerReactionEffects();
    this.state.setSimulationState("reacted");
    this.updateUIState();
  }

  // 3. Reaksiyon Efektlerini Tetikle
  triggerReactionEffects() {
    this.state.setSimulationState("reacting");
    const reaction = this.state.getReaction();
    if (!reaction) return;

    const result = reaction.result;

    // Sıcaklık değişimi
    if (result.targetTemp) {
      this.thermometer.setTemperature(result.targetTemp, true);
    }

    // Gaz kabarcığı
    if (result.bubbles) {
      this.particleManager.startBubbles(result.bubbles);
      if (window.labAudio) window.labAudio.playFizz(result.bubbles.durationMs / 1000);
    }

    // Çökelek
    if (result.precipitate && result.precipitate.action === "form") {
      this.particleManager.startPrecipitate(result.precipitate);
    }

    // Katı çözünme (CaCO3)
    if (reaction.id === "caco3_hcl") {
      this.particleManager.spawnDissolveParticles(0xffffff, 45);
    }

    // Duman / Sis
    if (result.vapor) {
      this.particleManager.startSmoke(result.vapor);
    }
  }

  // 4. Baştan Başlat / Tekrar Dök
  resetPour() {
    this.isPouring = false;
    this.pourProgress = 0.0;
    const reaction = this.state.getReaction();

    if (!reaction) {
      this.glassware.setEmptyState();
      this.thermometer.reset(22.0);
      this.particleManager.clearAll();
      this.state.setSimulationState("no_reaction");
    } else {
      this.state.setSimulationState("waiting_pour");
      this.glassware.setupReaction(reaction, false);
      this.thermometer.reset(reaction.fixedVessel.initialTemp || 22.0);
      this.particleManager.clearAll();

      if (reaction.fixedVessel.hasPrecipitate) {
        this.particleManager.spawnDissolveParticles(
          reaction.fixedVessel.precipitateColor || 0xffffff,
          40
        );
      }
    }

    this.updateUIState();
  }

  updateUIState() {
    const simState = this.state.simulationState;
    const btnAutoPour = document.getElementById("btnAutoPour");
    const btnResetPour = document.getElementById("btnResetPour");
    const labHintText = document.getElementById("labHintText");
    const fixedBeakerLabel = document.getElementById("fixedBeakerLabel");
    const fixedBeakerSub = document.getElementById("fixedBeakerSub");
    const addedBeakerLabel = document.getElementById("addedBeakerLabel");
    const addedBeakerSub = document.getElementById("addedBeakerSub");
    const reaction = this.state.getReaction();

    if (simState === "no_reaction" || !reaction) {
      if (btnAutoPour) {
        btnAutoPour.disabled = true;
        btnAutoPour.style.display = "inline-flex";
      }
      if (btnResetPour) btnResetPour.style.display = "none";
      if (labHintText) {
        labHintText.innerHTML = "💡 <strong>Tepkime Bekleniyor:</strong> Beherlere madde yerleştirmek için soldaki karttan tepkime seçin.";
      }
      if (fixedBeakerLabel) fixedBeakerLabel.textContent = "Sabit Reaksiyon Kabı (250 mL)";
      if (fixedBeakerSub) fixedBeakerSub.textContent = "[Boş — Tepkime Seçiniz]";
      if (addedBeakerLabel) addedBeakerLabel.textContent = "Ekleyen Beher (80 mL)";
      if (addedBeakerSub) addedBeakerSub.textContent = "[Boş — Tepkime Seçiniz]";
    } else if (simState === "waiting_pour") {
      if (btnAutoPour) {
        btnAutoPour.disabled = !this.glassware.isFilled;
        btnAutoPour.style.display = "inline-flex";
      }
      if (btnResetPour) btnResetPour.style.display = "none";
      if (labHintText) {
        labHintText.innerHTML = "💡 <strong>İpucu:</strong> Beheri ana kaba dökün veya butona basın.";
      }
      if (fixedBeakerLabel) fixedBeakerLabel.textContent = reaction.fixedVessel.name;
      if (fixedBeakerSub) fixedBeakerSub.textContent = `Sabit Reaksiyon Kabı (${reaction.fixedVessel.state.toLowerCase()})`;
      if (addedBeakerLabel) addedBeakerLabel.textContent = reaction.addedVessel.name;
      if (addedBeakerSub) addedBeakerSub.textContent = `Ekleyen Beher (${reaction.addedVessel.state.toLowerCase()})`;
    } else if (simState === "pouring" || simState === "reacting") {
      if (btnAutoPour) btnAutoPour.disabled = true;
      if (labHintText) {
        labHintText.innerHTML = "⏳ <strong>Dökülüyor ve Karışıyor...</strong> Değişimi dikkatle izleyin!";
      }
    } else if (simState === "reacted") {
      if (btnAutoPour) btnAutoPour.style.display = "none";
      if (btnResetPour) {
        btnResetPour.style.display = "inline-flex";
        btnResetPour.disabled = false;
      }
      if (labHintText) {
        labHintText.innerHTML = "💡 <strong>Tepkime gerçekleşti!</strong> Sağ panelden gözleminizi yapın veya seçin.";
      }
      if (addedBeakerSub) addedBeakerSub.textContent = "Ekleyen beher · Boş";
    }
  }
}

if (typeof window !== "undefined") {
  window.LabPourController = LabPourController;
}
