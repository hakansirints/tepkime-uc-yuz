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
  window.labScaffold = scaffoldMgr;
  window.labObservation = stage1Mgr;

  const advanceButton = document.getElementById('btnDevAdvance');
  const devStatus = document.getElementById('devStatus');
  document.querySelector('.development-controls').hidden = new URLSearchParams(location.search).get('dev') !== '1';
  function syncDevelopmentControls() {
    const state = window.labState;
    advanceButton.disabled = !state.getReaction() || (state.currentStage === 3 && state.stages[3].status === 'completed');
    advanceButton.textContent = state.currentStage === 3 ? 'Otomatik tamamla' : 'Otomatik tamamla ve ilerle';
    devStatus.textContent = !state.getReaction() ? 'Önce bir tepkime seç.' : state.currentStage === 3 && state.stages[3].status === 'completed' ? 'Tüm aşamalar tamamlandı.' : `Aşama ${state.currentStage} için test kısayolu`;
  }
  advanceButton.addEventListener('click', () => {
    const state = window.labState, reaction = state.getReaction(); if (!reaction) return;
    try {
      if (state.currentStage === 1) {
        labScene.glassware.setupReaction(reaction, false);
        labScene.pourController.instantReact();
        stage1Mgr.textarea.value = reaction.pedagogy.correctFeedback;
        stage1Mgr.updateCounters(); stage1Mgr.evaluateObservation();
        if (state.stages[1].status !== 'completed') throw new Error('Otomatik gözlem doğrulanamadı.');
        state.stages[1].completedData.testMode = true;
        state.setStage(2);
      } else if (state.currentStage === 2) {
        scaffoldMgr.stage2Manager.api.autoComplete();
        state.stages[2].completedData.testMode = true;
        state.setStage(3);
      } else if (state.currentStage === 3) {
        scaffoldMgr.stage3Manager.autoComplete();
        state.stages[3].completedData.testMode = true;
      }
      syncDevelopmentControls();
    } catch (error) { console.error(error); devStatus.textContent = error.message; }
  });
  window.labState.on('reactionChange', syncDevelopmentControls);
  window.labState.on('stageChange', syncDevelopmentControls);
  syncDevelopmentControls();

  const settingsButton = document.getElementById('btnLabSettings');
  const settingsPanel = document.getElementById('labSettingsPanel');
  function setSettingsOpen(open, returnFocus = false) {
    settingsPanel.hidden = !open;
    settingsButton.setAttribute('aria-expanded', String(open));
    if (returnFocus) settingsButton.focus();
  }
  settingsButton.addEventListener('click', () => setSettingsOpen(settingsPanel.hidden));
  document.getElementById('btnCloseLabSettings').addEventListener('click', () => setSettingsOpen(false, true));
  const dismissSettingsOutside = event => {
    if (!settingsPanel.hidden && !event.target.closest('.lab-settings-wrap')) setSettingsOpen(false);
  };
  // Capture before the 3D canvas takes over touch/drag events.
  document.addEventListener('pointerdown', dismissSettingsOutside, true);
  document.addEventListener('click', dismissSettingsOutside, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !settingsPanel.hidden) setSettingsOpen(false, true);
  });
  window.labState.on('stageChange', () => setSettingsOpen(false));

  // 3. Tepkime Seçim Kartı (Madde 2 - Tıklanınca aşağı doğru uzayan Material kart)
  const reactionExpandCard = document.getElementById("reactionExpandCard");
  const btnReactionToggle = document.getElementById("btnReactionToggle");
  const reactionListContent = document.getElementById("reactionListContent");
  const reactionStatusBadge = document.getElementById("reactionStatusBadge");

  // Material colors describe the reactants without revealing the experiment's result.
  function materialCard(vessel, role) {
    const name = vessel.name.toLocaleLowerCase('tr');
    let kind = 'salt', label = 'Tuz çözeltisi';
    if (vessel.state.includes('Katı')) { kind = 'solid'; label = 'Katı'; }
    else if (name.includes('asit')) { kind = 'acid'; label = 'Asit'; }
    else if (name.includes('hidroksit') || name.includes('amonyak')) { kind = 'base'; label = 'Baz'; }
    else if (name.includes('peroksit')) { kind = 'peroxide'; label = 'Peroksit'; }
    if (vessel.state.includes('Katalizör')) { kind = 'catalyst'; label = 'Katalizör'; }
    return `<span class="reaction-material" data-material-kind="${kind}">
      <span class="reaction-material-name">${vessel.name}</span>
      <span class="reaction-material-details"><span class="reaction-material-role">${role}<span class="reaction-material-kind">${label}</span></span><span class="reaction-material-state">${vessel.state}</span></span>
    </span>`;
  }

  const picker = document.getElementById('reactionPicker');
  function setReactionCardExpanded(expanded) {
    if (["pouring", "reacting"].includes(window.labState.simulationState)) return;
    btnReactionToggle.setAttribute('aria-expanded', String(expanded));
    picker.hidden = !expanded;
    reactionExpandCard.classList.toggle('is-expanded', expanded);
    document.getElementById('selectedReactionPair').hidden = expanded;
  }
  const experimentTitle = document.getElementById('experimentTitle');
  const observationLayout = document.getElementById('observationLayout');
  const titleObserver = new ResizeObserver(() => observationLayout.style.setProperty('--experiment-title-height', experimentTitle.offsetHeight + 8 + 'px'));
  titleObserver.observe(experimentTitle);
  function refreshCompletion() {
    const completed = window.labState.completedReactions;
    document.getElementById('reactionCompletionCount').textContent = `${Object.keys(completed).length} / 12 tamamlandı`;
    reactionListContent.querySelectorAll('[data-reaction-id]').forEach(tile => {
      tile.querySelector('.reaction-completion').hidden = !completed[tile.dataset.reactionId];
    });
    const pinned = document.querySelector('#selectedReactionPair .reaction-completion');
    if (pinned) pinned.hidden = !completed[window.labState.selectedReactionId];
  }
  window.labState.on('completionChange', refreshCompletion);

  if (reactionListContent && window.REACTIONS_DATA) {
    let index = 1;
    for (const [id, reaction] of Object.entries(window.REACTIONS_DATA)) {
      const tileBtn = document.createElement("button");
      tileBtn.className = "m3-reaction-tile mebi-card mebi-card-hoverable";
      tileBtn.setAttribute("data-reaction-id", id);
      tileBtn.setAttribute("aria-pressed", "false");

      tileBtn.innerHTML = `
        <span class="m3-tile-name">${index}. ${reaction.title}</span>
        <span class="reaction-materials-pair">
          ${materialCard(reaction.fixedVessel, '01 · Sabit kap')}
          ${materialCard(reaction.addedVessel, '02 · Eklenen')}
          <span class="reaction-completion" hidden>Tamamlandı</span>
        </span>
      `;

      tileBtn.addEventListener("click", () => {
        if (["pouring", "reacting"].includes(window.labState.simulationState)) return;
        if (window.labAudio) window.labAudio.playClick();
        window.labState.setReaction(id);
        setReactionCardExpanded(false);

        btnReactionToggle.focus({ preventScroll: true });
      });

      tileBtn.addEventListener("mouseenter", () => {
        if (window.labAudio) window.labAudio.playHover();
      });

      reactionListContent.appendChild(tileBtn);
      index++;
    }
  }

  refreshCompletion();
  btnReactionToggle.addEventListener('click', () => {
    window.labAudio?.playClick(); setReactionCardExpanded(picker.hidden);
    if (!picker.hidden) reactionListContent.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  });

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
    experimentTitle.hidden = !reaction; observationLayout.classList.toggle('has-reaction', Boolean(reaction));
    document.getElementById('experimentMaterials').textContent = reaction ? reaction.fixedVessel.name + ' + ' + reaction.addedVessel.name + ' deneyi' : '';
    updateGlasswareLabels(reaction);
    reactionExpandCard.classList.toggle('needs-selection', !reaction);
    reactionListContent.querySelectorAll('.m3-reaction-tile').forEach(tile => {
      const selected = tile.dataset.reactionId === reaction?.id;
      tile.classList.toggle('is-active', selected);
      tile.setAttribute('aria-pressed', String(selected));
    });
    reactionStatusBadge.textContent = reaction ? 'Reaktifler Masada' : 'Masa Boş';
    document.querySelector('.m3-reaction-card-title').textContent = reaction ? 'Tepkimeyi değiştir' : 'Tepkime seç';
    document.getElementById('selectedReactionPair').innerHTML = reaction
      ? `<span class="selected-pair-label">✓ Seçili madde çifti</span><div class="reaction-materials-pair">${materialCard(reaction.fixedVessel, '01 · Sabit kap')}${materialCard(reaction.addedVessel, '02 · Eklenen')}<span class="reaction-completion" hidden>Tamamlandı</span></div>`
      : '<p>Bir madde çifti seçerek başla.</p>';
    refreshCompletion();
    setReactionCardExpanded(false);
  });
  reactionExpandCard.classList.toggle('needs-selection', !window.labState.getReaction());
  setReactionCardExpanded(!window.labState.getReaction());

  function syncMobileTools() {
    document.getElementById("btnMobileReactions").setAttribute("aria-expanded", String(document.body.dataset.mobilePanel === "reactions"));
    document.getElementById("btnMobileNotebook").setAttribute("aria-expanded", String(document.body.dataset.mobilePanel === "notebook"));
  }
  for (const [id, panel] of [["btnMobileReactions", "reactions"], ["btnMobileNotebook", "notebook"]]) {
    document.getElementById(id).addEventListener("click", () => {
      if (document.body.dataset.mobilePanel === panel) document.body.removeAttribute("data-mobile-panel");
      else document.body.dataset.mobilePanel = panel;
      if (panel === "reactions") {
        setReactionCardExpanded(true);
      }
      syncMobileTools();
    });
  }
  window.labState.on("simulationChange", () => {
    const busy = ["pouring", "reacting"].includes(window.labState.simulationState);
    btnReactionToggle.disabled = busy;
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
      setReactionCardExpanded(true);
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
    const syncAudio = () => {
      const enabled = !window.labAudio.isMuted;
      audioIcon.textContent = enabled ? '🔊' : '🔇'; document.getElementById('audioLabel').textContent = enabled ? 'Ses açık' : 'Ses kapalı';
      btnToggleAudio.setAttribute('aria-pressed', String(enabled)); btnToggleAudio.setAttribute('aria-label', enabled ? 'Sesi kapat' : 'Sesi aç');
    };
    syncAudio();
    btnToggleAudio.addEventListener("click", () => {
      const enabled = window.labAudio.toggleMute(); syncAudio();
      if (enabled) window.labAudio.playClick();
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
  const btnCamWide = document.getElementById("btnCamWide");
  const camSegmentButtons = [btnCamDesk, btnCamWide].filter(Boolean);

  function setActiveCameraSegment(activeBtn, presetName) {
    camSegmentButtons.forEach(btn => btn.classList.remove("is-active"));
    if (activeBtn) activeBtn.classList.add("is-active");
    if (window.labAudio) window.labAudio.playClick();
    labScene.setCameraPreset(presetName);
  }

  if (btnCamDesk) {
    btnCamDesk.addEventListener("click", () => setActiveCameraSegment(btnCamDesk, "desk"));
  }
  if (btnCamWide) {
    btnCamWide.addEventListener("click", () => setActiveCameraSegment(btnCamWide, "wide"));
  }
  const fullscreenButton = document.getElementById('btnFullscreen');
  const syncFullscreen = () => { const enabled = Boolean(document.fullscreenElement || document.webkitFullscreenElement); fullscreenButton.setAttribute('aria-pressed', String(enabled)); document.getElementById('fullscreenLabel').textContent = enabled ? 'Ekrandan çık' : 'Tam ekran'; fullscreenButton.setAttribute('aria-label', enabled ? 'Tam ekrandan çık' : 'Tam ekranı aç'); };
  fullscreenButton.disabled = !document.documentElement.requestFullscreen && !document.documentElement.webkitRequestFullscreen;
  if (fullscreenButton.disabled) fullscreenButton.title = 'Bu tarayıcı tam ekranı desteklemiyor.';
  fullscreenButton.onclick = async () => {
    try { if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement); }
    catch { document.getElementById('fullscreenLabel').textContent = 'Kullanılamıyor'; }
    syncFullscreen();
  };
  document.addEventListener('fullscreenchange', syncFullscreen); document.addEventListener('webkitfullscreenchange', syncFullscreen);
  syncFullscreen();

  // 8. Butonlara Genel Hover ve Klik Sesleri
  document.querySelectorAll("button, .mebi-btn, .m3-step-btn, .m3-chip").forEach(el => {
    el.addEventListener("mouseenter", () => {
      if (window.labAudio) window.labAudio.playHover();
    });
  });

  console.log("✅ 3D Sanal Kimya Laboratuvarı ve Deney Masası hazır.");
});
