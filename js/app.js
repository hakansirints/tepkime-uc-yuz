/**
 * TEPKİMENİN ÜÇ YÜZÜ - Ana Uygulama Başlatıcısı (App Bootstrap)
 * Tam Ekran 3D Laboratuvar Ortamı & Material Design 3 Etkileşimleri
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧪 3D Sanal Kimya Laboratuvarı başlatılıyor...");

  // 1. 3D Sahne Motorunu Başlat (Tam Ekran)
  const labScene = new LabSceneEngine("labCanvasContainer", window.labState);
  window.labScene = labScene;

  // 2. Aşama Yöneticilerini Başlat
  const stage1Mgr = new Stage1ObservationManager(window.labState);
  const scaffoldMgr = new StageScaffoldManager(window.labState);

  // 3. Tepkime Seçim Kartı (Madde 2 - Tıklanınca aşağı doğru uzayan Material kart)
  const reactionExpandCard = document.getElementById("reactionExpandCard");
  const btnReactionToggle = document.getElementById("btnReactionToggle");
  const reactionListContent = document.getElementById("reactionListContent");
  const reactionCardSubtext = document.getElementById("reactionCardSubtext");
  const reactionStatusBadge = document.getElementById("reactionStatusBadge");

  if (reactionListContent && window.REACTIONS_DATA) {
    let index = 1;
    for (const [id, reaction] of Object.entries(window.REACTIONS_DATA)) {
      const reactionNumber = index;
      const tileBtn = document.createElement("button");
      tileBtn.className = "m3-reaction-tile";
      tileBtn.setAttribute("data-reaction-id", id);

      tileBtn.innerHTML = `
        <span class="m3-tile-name">${index}. ${reaction.title}</span>
        <span class="m3-tile-sub">Sabit Kap: ${reaction.fixedVessel.name.split(' (')[0]} | Eklenen: ${reaction.addedVessel.name.split(' (')[0]}</span>
      `;

      tileBtn.addEventListener("click", () => {
        if (["pouring", "reacting"].includes(window.labState.simulationState)) return;
        if (window.labAudio) window.labAudio.playClick();
        window.labState.setReaction(id);

        if (reactionCardSubtext) reactionCardSubtext.textContent = `${reactionNumber}. ${reaction.title}`;
        if (reactionStatusBadge) {
          reactionStatusBadge.textContent = "Reaktifler Masada";
          reactionStatusBadge.className = "mebi-badge mebi-badge-success";
        }

        reactionListContent.querySelectorAll(".m3-reaction-tile").forEach(b => b.classList.remove("is-active"));
        tileBtn.classList.add("is-active");

        fitReactionCard();
      });

      tileBtn.addEventListener("mouseenter", () => {
        if (window.labAudio) window.labAudio.playHover();
      });

      reactionListContent.appendChild(tileBtn);
      index++;
    }
  }

  // Reserve the selected-material summary before allowing the list to scroll.
  function fitReactionCard(keepOpen=false) {
    const bounds = reactionExpandCard.getBoundingClientRect();
    const available = Math.max(120, window.innerHeight - bounds.top - 88);
    const summary = document.getElementById('selectedMaterials');
    const reserved = btnReactionToggle.offsetHeight + summary.offsetHeight +
      reactionExpandCard.querySelector('.lab-selection-status').offsetHeight +
      reactionExpandCard.querySelector('.lab-panel-footer').offsetHeight;
    const listSpace = Math.max(0, available - reserved - 16);
    reactionListContent.style.setProperty('--list-space', `${listSpace}px`);
    if (keepOpen!==true && window.labState.getReaction() && listSpace < 100) {
      reactionExpandCard.classList.remove('is-expanded');
      btnReactionToggle.setAttribute('aria-expanded', 'false');
    }
  }
  window.addEventListener('resize', fitReactionCard);
  requestAnimationFrame(fitReactionCard);

  // Tıklanınca aşağı doğru uzama/kapanma (Accordion)
  if (btnReactionToggle && reactionExpandCard) {
    btnReactionToggle.addEventListener("click", () => {
      if (window.labAudio) window.labAudio.playClick();
      reactionExpandCard.classList.toggle("is-expanded");
      btnReactionToggle.setAttribute("aria-expanded", String(reactionExpandCard.classList.contains("is-expanded")));
      fitReactionCard(true);
    });
  }

  // 4. Masadaki Beher Madde Etiketleri
  function updateGlasswareLabels(reaction) {
    const fixedLabel = document.getElementById("fixedBeakerLabel");
    const fixedSub = document.getElementById("fixedBeakerSub");
    const addedLabel = document.getElementById("addedBeakerLabel");
    const addedSub = document.getElementById("addedBeakerSub");

    if (!reaction) {
      if (fixedLabel) fixedLabel.textContent = "Sabit Reaksiyon Kabı (250 mL)";
      if (fixedSub) fixedSub.textContent = "[Boş — Tepkime Seçiniz]";
      if (addedLabel) addedLabel.textContent = "Ekleyen Beher (80 mL)";
      if (addedSub) addedSub.textContent = "[Boş — Tepkime Seçiniz]";
      return;
    }

    if (fixedLabel) fixedLabel.textContent = reaction.fixedVessel.name;
    if (fixedSub) fixedSub.textContent = `Sabit Reaksiyon Kabı (${reaction.fixedVessel.state.toLowerCase()})`;
    if (addedLabel) addedLabel.textContent = reaction.addedVessel.name;
    if (addedSub) addedSub.textContent = `Ekleyen Beher (${reaction.addedVessel.state.toLowerCase()})`;
  }

  window.labState.on("reactionChange", (reaction) => {
    updateGlasswareLabels(reaction);
    const materials = document.getElementById("selectedMaterials");
    materials.hidden = !reaction;
    reactionExpandCard.classList.toggle('needs-selection', !reaction);
    if (reaction) {
      document.getElementById("selectedFixedName").textContent = reaction.fixedVessel.name;
      document.getElementById("selectedFixedState").textContent = reaction.fixedVessel.state;
      document.getElementById("selectedAddedName").textContent = reaction.addedVessel.name;
      document.getElementById("selectedAddedState").textContent = reaction.addedVessel.state;
    }
    requestAnimationFrame(fitReactionCard);
  });
  reactionExpandCard.classList.toggle('needs-selection', !window.labState.getReaction());
  document.querySelectorAll('#selectedMaterials>div').forEach((card, index) => {
    card.tabIndex = 0;
    card.addEventListener('mouseenter', () => labScene.setMaterialHover(index));
    card.addEventListener('mouseleave', () => labScene.setMaterialHover(null));
    card.addEventListener('focus', () => labScene.setMaterialHover(index));
    card.addEventListener('blur', () => labScene.setMaterialHover(null));
    card.addEventListener('click', () => labScene.previewMaterial(index));
  });

  function syncMobileTools() {
    document.getElementById("btnMobileReactions").setAttribute("aria-expanded", String(document.body.dataset.mobilePanel === "reactions"));
    document.getElementById("btnMobileNotebook").setAttribute("aria-expanded", String(document.body.dataset.mobilePanel === "notebook"));
  }
  for (const [id, panel] of [["btnMobileReactions", "reactions"], ["btnMobileNotebook", "notebook"]]) {
    document.getElementById(id).addEventListener("click", () => {
      if (document.body.dataset.mobilePanel === panel) document.body.removeAttribute("data-mobile-panel");
      else document.body.dataset.mobilePanel = panel;
      if (panel === "reactions") {
        reactionExpandCard.classList.add("is-expanded");
        btnReactionToggle.setAttribute("aria-expanded", "true");
        fitReactionCard(true);
      }
      syncMobileTools();
    });
  }
  window.labState.on("simulationChange", () => {
    const busy = ["pouring", "reacting"].includes(window.labState.simulationState);
    document.body.dataset.simulation = window.labState.simulationState;
    reactionListContent.querySelectorAll("button").forEach(button => { button.disabled = busy; });
    if (reactionStatusBadge && window.labState.getReaction()) {
      reactionStatusBadge.textContent = busy ? "Karıştırılıyor" : window.labState.simulationState === "reacted" ? "Gözlem için hazır" : "Reaktifler Masada";
    }
    if (window.labState.simulationState === "reacted") {
      document.getElementById("fixedBeakerLabel").textContent = "Tepkime karışımı";
      document.getElementById("fixedBeakerSub").textContent = "Reaksiyon kabı";
      document.getElementById("addedBeakerSub").textContent = "Ekleyen beher · Boş";
    }
  });
  window.labState.on("stageChange", () => {
    if (window.labState.currentStage !== 1) document.body.removeAttribute("data-mobile-panel");
    syncMobileTools();
  });

  // İlk boş durum
  updateGlasswareLabels(window.labState.getReaction());

  // URL Parametreleri (Örn: ?reaction=rx_01 veya ?openMenu=true veya ?stage=2)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("theme") === "dark" && window.labTheme) {
      window.labTheme.applyTheme("dark", true);
    }
    if (urlParams.get("openMenu") === "true" && reactionExpandCard) {
      reactionExpandCard.classList.add("is-expanded");
    }
    const hashVal = window.location.hash ? window.location.hash.replace('#', '').trim() : '';
    const initRx = urlParams.get("reaction") || (hashVal ? hashVal : null);
    if (initRx && window.REACTIONS_DATA) {
      const keys = Object.keys(window.REACTIONS_DATA);
      let targetId = initRx;
      if (!window.REACTIONS_DATA[targetId]) {
        const num = parseInt(initRx.replace(/\D/g, ''), 10);
        if (num >= 1 && num <= keys.length) {
          targetId = keys[num - 1];
        }
      }
      if (window.REACTIONS_DATA[targetId]) {
        window.__skipFillAnimation = true;
        window.labState.setReaction(targetId);
        window.__skipFillAnimation = false;
        const idx = keys.indexOf(targetId) + 1;
        if (reactionCardSubtext) reactionCardSubtext.textContent = `${idx}. ${window.REACTIONS_DATA[targetId].title}`;
        if (reactionStatusBadge) {
          reactionStatusBadge.textContent = "Reaktifler Masada";
          reactionStatusBadge.className = "mebi-badge mebi-badge-success";
        }
        if (reactionListContent) {
          const targetTile = reactionListContent.querySelector(`[data-reaction-id="${targetId}"]`);
          if (targetTile) targetTile.classList.add("is-active");
        }

        if (urlParams.get("state") === "reacted" && labScene && labScene.pourController) {
          labScene.pourController.instantReact();
        } else {
          const pourVal = parseFloat(urlParams.get("pour"));
          if (!isNaN(pourVal) && labScene && labScene.glassware) {
            labScene.glassware.setPourProgress(pourVal);
          }
        }
      }
    }

    const initStage = parseInt(urlParams.get("stage"), 10);
    if (initStage >= 1 && initStage <= 7) {
      window.labState.setStage(initStage);
    }
    const initCamera = urlParams.get("camera");
    if (initCamera && labScene && labScene.cameraPresets && labScene.cameraPresets[initCamera]) {
      labScene.setCameraPreset(initCamera);
      const camBtn = document.getElementById(initCamera === "wide" ? "btnCamWide" : initCamera === "closeup" ? "btnCamCloseup" : "btnCamDesk");
      if (camBtn) {
        document.querySelectorAll(".m3-segment-btn").forEach(b => b.classList.remove("is-active"));
        camBtn.classList.add("is-active");
      }
    }
  } catch (err) {
    console.warn("URL params parse skipped:", err);
  }

  // 5. Ses Aç/Kapat Butonu
  const btnToggleAudio = document.getElementById("btnToggleAudio");
  const audioIcon = document.getElementById("audioIcon");
  if (btnToggleAudio && audioIcon) {
    btnToggleAudio.addEventListener("click", () => {
      const isEnabled = window.labAudio.toggleMute();
      audioIcon.textContent = isEnabled ? "🔊" : "🔇";
      btnToggleAudio.setAttribute("title", isEnabled ? "Sesi Kapat" : "Sesi Aç");
    });
  }

  // 6. Tema Değiştir Butonu
  const btnToggleTheme = document.getElementById("btnToggleTheme");
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener("click", () => {
      window.labTheme.toggleTheme();
    });
  }

  // 7. Alt Yatay Şerit: Kamera Segmentli Butonları (Madde 5)
  const btnCamDesk = document.getElementById("btnCamDesk");
  const btnCamCloseup = document.getElementById("btnCamCloseup");
  const btnCamWide = document.getElementById("btnCamWide");
  const camSegmentButtons = [btnCamDesk, btnCamCloseup, btnCamWide].filter(Boolean);

  function setActiveCameraSegment(activeBtn, presetName) {
    camSegmentButtons.forEach(btn => btn.classList.remove("is-active"));
    if (activeBtn) activeBtn.classList.add("is-active");
    if (window.labAudio) window.labAudio.playClick();
    labScene.setCameraPreset(presetName);
  }

  if (btnCamDesk) {
    btnCamDesk.addEventListener("click", () => setActiveCameraSegment(btnCamDesk, "desk"));
  }
  if (btnCamCloseup) {
    btnCamCloseup.addEventListener("click", () => setActiveCameraSegment(btnCamCloseup, "closeup"));
  }
  if (btnCamWide) {
    btnCamWide.addEventListener("click", () => setActiveCameraSegment(btnCamWide, "wide"));
  }

  // 8. Butonlara Genel Hover ve Klik Sesleri
  document.querySelectorAll("button, .mebi-btn, .m3-step-btn, .m3-chip").forEach(el => {
    el.addEventListener("mouseenter", () => {
      if (window.labAudio) window.labAudio.playHover();
    });
  });

  console.log("✅ 3D Sanal Kimya Laboratuvarı ve Deney Masası hazır.");
});
