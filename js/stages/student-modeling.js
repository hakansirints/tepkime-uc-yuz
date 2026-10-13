function mountStudentModel(container, state) {
  const { clone } = FormulaChemistry;
  const reaction = state.getReaction(), plan = InquiryChemistry.createPlan(reaction);
  const blank = () => ({ items: [], selected: [], ok: false, feedback: '', tone: 'info', interaction: null, proposal: null, eligible: false, trialState: null });
  const emptyAssessment = () => ({ evidence: '', explanation: '', stays: '', transfer: null, transferOK: false });
  const saved = state.modelingDraft, compatible = saved?.version === 7 && saved.reactionId === reaction.id;
  let frames = compatible ? clone(saved.frames) : [blank(), blank(), blank()];
  let active = compatible ? saved.active : 0, reached = compatible ? saved.reached : 0;
  let assessment = compatible ? clone(saved.assessment) : emptyAssessment();
  let records = compatible ? clone(saved.records) : { actions: [], checks: 0, errors: 0, firstAttempt: null, hintUses: 0, transferAttempts: 0 };
  let history = compatible ? clone(saved.history || []) : [], pending = null, disposed = false, touch = null;
  let resultAction = null, nativeDrag = null;
  let phoneView = 'model', question = 0, regionPage = 0;
  const atomNames = { H: 'Hidrojen', C: 'Karbon', O: 'Oksijen', N: 'Azot', Na: 'Sodyum', Cl: 'Klor', Ca: 'Kalsiyum', K: 'Potasyum', I: 'İyot', Pb: 'Kurşun', Ag: 'Gümüş', Cu: 'Bakır' };
  const titles = ['Tepkime öncesi', 'Tanecikler etkileşirken', 'Tepkime sonrası'];
  const tasks = [
    'Havuzdan bir tür seç; sonra ait olduğu kaynak bölgeye yerleştir. Türleri bütün olarak kullan.',
    'Değişime katılacağını düşündüğün türleri seç. Etkileşimini dene; sonra oluşum önerini seçip yeniden dene.',
    'Türleri fiziksel hâllerine uygun bölgelere taşı ve modelini kontrol et.'
  ];
  container.innerHTML = `<div id="formula-modeling" class="liquid-workshop inquiry-workshop" lang="tr">
    <header class="workshop-header"><div><h2>Taneciklerle kur, atomlarla kontrol et</h2><p class="muted" id="fm-reaction"></p></div></header>
    <div class="workshop-layout"><aside class="glass-panel formula-pool"><div class="panel-heading"><h3 id="fm-pool-title">Tanecik havuzu</h3></div><p class="muted" id="fm-pool-help"></p><div id="fm-pool" class="formula-bank"></div>
      <section class="atom-pool"><h3>Bu türlerde bulunan atomlar</h3><div id="fm-atoms" class="atom-name-list"></div></section>
      <details id="fm-properties" class="inquiry-properties" hidden><summary>Madde özelliklerini incele</summary><p id="fm-property-text"></p></details>
      <div id="fm-returned" class="returned-species"></div>
    </aside><section class="glass-panel formula-workspace"><div id="fm-tabs" class="liquid-segments" role="tablist" aria-label="Modelleme adımları"></div>
      <div id="fm-panel" role="tabpanel"><div class="workspace-heading"><h3 id="fm-title"></h3><span class="muted" id="fm-progress"></span></div><p id="fm-task" class="muted"></p>
        <div id="fm-region-nav" class="landscape-only task-view-nav"></div><div id="fm-work" class="inquiry-field"></div>
        <section id="fm-proposals" class="inquiry-proposals" hidden><h4>Hangi oluşum gözlemini açıklayabilir?</h4><div id="fm-proposal-options" class="workshop-actions"></div></section>
        <div id="fm-interaction-preview" class="interaction-preview" hidden></div>
        <div class="workshop-actions phase-actions"><button id="fm-try" type="button" hidden>Etkileşimimi dene</button><button id="fm-liquid" type="button" hidden>Sıvı bölgesine taşı</button><button id="fm-gas" type="button" hidden>Gaz bölgesine taşı</button><button id="fm-solid" type="button" hidden>Katı yapı bölgesine taşı</button></div>
        <div id="fm-feedback" class="workshop-feedback" role="status" aria-live="polite"></div><button id="fm-feedback-open" class="landscape-only" type="button">Dönütü oku</button>
        <section id="fm-explanation" class="inquiry-explanation" hidden><h3>Gözlemimi modelimle açıklarım</h3><label for="fm-evidence">Gözlemimdeki kanıt<select id="fm-evidence"><option value="">Seç…</option><option>Katı oluşumu</option><option>Gaz kabarcıkları</option><option>Sıcaklık / asit-baz değişimi</option></select></label><label for="fm-cause">Modelimdeki açıklama<select id="fm-cause"><option value="">Seç…</option><option>Katı bir yapı oluşması</option><option>Yeni gazın sıvıdan ayrılması</option><option>Yeni su moleküllerinin oluşması</option><option>Amonyum iyonunun oluşması</option></select></label><label for="fm-stays">Değişime doğrudan katılmayan türler<select id="fm-stays"><option value="">Seç…</option><option value="remain">Modelde ve çözeltide kalır</option><option value="lost">Yok olur</option><option value="atoms">Nötr atomlara ayrılır</option></select></label><p id="fm-sentence" class="muted"></p><label for="fm-note">Kendi cümlenle eklemek istersen<textarea id="fm-note" rows="2" maxlength="600" placeholder="Gözlemimle modelim arasındaki ilişki…"></textarea></label><p class="muted">Bu ek açıklama öğrenme kaydında saklanır; otomatik notlandırılmaz.</p></section>
        <section id="fm-transfer" class="inquiry-transfer" hidden><h3>Yeni bir örnekte kendin dene</h3><p id="fm-transfer-task"></p><div id="fm-transfer-options"></div><button id="fm-transfer-check" type="button">Yeni örneği kontrol et</button><p id="fm-transfer-feedback" role="status" aria-live="polite"></p></section>
        <div class="landscape-only task-view-nav" id="fm-question-nav"><button id="fm-view-back" type="button">Modelime dön</button><button id="fm-question-prev" type="button">Önceki alan</button><span id="fm-question-count"></span><button id="fm-question-next" type="button">Sonraki alan</button><button id="fm-write-note" type="button">Cümle ekle</button></div>
        <div class="workshop-footer"><button id="fm-reset" type="button">Yeniden başla</button><button id="fm-next" type="button" class="liquid-primary">Modelimi kontrol et</button><button id="fm-trace" type="button" class="liquid-primary" hidden>Atomun izini sür</button></div>
      </div></section></div>
    <dialog id="fm-result" class="liquid-dialog model-result" aria-labelledby="fm-result-title" aria-describedby="fm-result-message"><div class="model-result-heading"><span id="fm-result-symbol" class="result-symbol" aria-hidden="true"></span><button id="fm-result-close" type="button" aria-label="Sonuç kartını kapat">×</button></div><h3 id="fm-result-title"></h3><p id="fm-result-message"></p><div class="model-result-actions"><button id="fm-result-back" type="button">Modelime dön</button><button id="fm-result-action" type="button" class="liquid-primary"></button></div></dialog>
  </div>`;
  const root = container.querySelector('#formula-modeling'), el = id => root.querySelector('#fm-' + id);
  el('reaction').textContent = reaction.fixedVessel.name + ' + ' + reaction.addedVessel.name;
  el('property-text').textContent = plan.properties;
  const smokeEvidence = document.createElement('option'); smokeEvidence.textContent = 'Beyaz sis / duman'; el('evidence').append(smokeEvidence);
  const smokeCause = document.createElement('option'); smokeCause.textContent = 'Havada asılı katı tanecikler oluşması'; el('cause').append(smokeCause);
  const none = document.createElement('option'); none.value = 'none'; none.textContent = 'İncelenen gazların ikisi de değişir; seyirci tür yok'; el('stays').append(none);
  if (plan.kind === 'smoke') tasks[0] = 'Beher ağzındaki gaz türlerini, çıktıkları kaynak maddeye göre yerleştir.';
  function save() {
    if (state.selectedReactionId === reaction.id) state.modelingDraft = { version: 7, reactionId: reaction.id, frames: clone(frames), active, reached, assessment: clone(assessment), records: clone(records), history: clone(history) };
  }
  function record(action, result) { records.actions.push({ stage: active + 1, action, result, time: new Date().toISOString() }); if (records.actions.length > 200) records.actions.shift(); }
  function revokeCompletion() {
    state.stages[2].status = 'active'; state.stages[2].completedData = null;
    for (let i = 3; i <= 7; i++) { state.stages[i].status = 'locked'; state.stages[i].completedData = null; }
    state.atomTraceDraft = null; state.emit('stageChange', { currentStage: state.currentStage, stages: state.stages });
  }
  function remember() { history.push(clone({ frames, active, reached, assessment })); if (history.length > 25) history.shift(); }
  function invalidate() {
    frames[active].ok = false;
    for (let i = active + 1; i < 3; i++) frames[i] = blank();
    reached = active;
    if (active < 2) assessment = emptyAssessment();
    else assessment.transferOK = false;
    revokeCompletion();
  }
  function feedback(message, tone = 'info') { frames[active].feedback = message; frames[active].tone = tone; }
  function guide(code, message) {
    const f = frames[active]; f.errorCodes ||= {}; f.errorCodes[code] = (f.errorCodes[code] || 0) + 1;
    feedback(message, 'guidance');
  }
  function update() { render(); save(); }
  const remaining = formula => plan.initial.filter(p => (!formula || p.formula === formula) && !frames[0].items.some(x => x.id === p.id));
  function add(formula, source) {
    if (active !== 0) return false;
    if (source === undefined) {
      const selected = frames[0].items.find(p => p.formula === formula && frames[0].selected.includes(p.id));
      if (selected) return returnToPool(selected.id);
    }
    const item = remaining(formula)[0]; if (!item) { feedback('Bu türün tüm kartları modelde. Yeni kart üretmek yerine mevcut yerleştirmeyi incele.'); update(); return false; }
    if (source === undefined) { pending = formula; feedback(formula + ' seçildi. Şimdi hedef kaynak bölgeyi seç.'); update(); return true; }
    remember(); frames[0].items.push({ ...clone(item), source }); invalidate(); pending = null;
    const correct = source === item.source;
    if (correct) feedback(formula + (remaining().length ? ' doğru kaynakta. Türü bütün olarak gösterdin; kalan kartlarla modelini tamamla.' : ' doğru kaynakta. Başlangıç kartlarının tamamını yerleştirdin; şimdi modelini kontrol edebilirsin.'), 'good');
    else guide('source', formula + ' bu kaynak maddeye ait mi? Madde adını ve bu türün atom içeriğini karşılaştır.');
    record('kaynak yerleştirme', correct ? 'doğru' : 'kaynak hatası'); if (!correct) records.errors++; update(); return true;
  }
  function moveSource(source, id) {
    if (active !== 0) return;
    if (pending) return add(pending, source);
    const selected = frames[0].items.filter(p => id ? p.id === id : frames[0].selected.includes(p.id));
    if (!selected.length) { feedback('Önce havuzdan veya modelinden bir kart seç; sonra kaynak bölgeyi seç.'); update(); return; }
    remember(); selected.forEach(p => p.source = source); invalidate(); frames[0].selected = [];
    const correct = selected.every(p => plan.initial.find(x => x.id === p.id).source === source);
    if (correct) feedback('Seçtiğin türler doğru kaynak bölgesinde. Sayıları da kontrol edebilirsin.', 'good');
    else guide('source', 'Bu kaynak maddenin formülünde hangi elementler var? Seçtiğin türlerin atom içeriğiyle karşılaştır.');
    record('kaynak taşıma', correct ? 'doğru' : 'kaynak hatası'); if (!correct) records.errors++; update();
  }
  function select(id) {
    pending = null; const f = frames[active];
    if (active === 1) { remember(); f.interaction = null; f.eligible = false; f.proposal = null; f.trialState = null; invalidate(); }
    f.selected = f.selected.includes(id) ? f.selected.filter(x => x !== id) : [...f.selected, id];
    feedback(f.selected.length ? `${f.selected.length} tür kartı seçtin. ${active === 1 ? 'Etkileşim önerini sınayabilirsin.' : 'Hedef bölgeyi seçebilir veya yerleştirmeyi geri alabilirsin.'}` : 'Seçim temizlendi.'); update();
  }
  function tryInteraction() {
    if (active !== 1) return;
    const f = frames[1], result = plan.tryInteraction(f.items, f.selected, f.proposal);
    remember(); invalidate(); f.eligible = ['proposal', 'proposal-wrong', 'ok'].includes(result[0]); f.interaction = result[2] || null;
    f.trialState = result[0] === 'ok' ? 'correct' : ['proposal', 'selection'].includes(result[0]) ? 'incomplete' : 'incorrect';
    phoneView = f.eligible && !f.interaction ? 'proposals' : 'model';
    if (['ok', 'proposal'].includes(result[0])) feedback(result[1], result[0] === 'ok' ? 'good' : 'info');
    else guide(result[0], result[1]);
    record('etkileşim önerisi', result[0]); if (!['ok', 'proposal'].includes(result[0])) records.errors++; update();
  }
  function chooseProposal(id) {
    if (active !== 1 || !frames[1].eligible) return;
    remember(); invalidate(); frames[1].proposal = id; frames[1].interaction = null; frames[1].trialState = null;
    feedback('Oluşum önerin seçildi. Atom içeriğini ve gözlemini düşünerek etkileşimini yeniden dene.'); update();
  }
  function setPhase(region, id) {
    if (active !== 2) return;
    const f = frames[2], selected = f.items.filter(p => id ? p.id === id : f.selected.includes(p.id));
    if (!selected.length) { feedback('Önce çalışma alanından bir tür seç.'); update(); return; }
    remember(); selected.forEach(p => p.phase = region === 'liquid' ? (p.formula === 'H₂O' ? 's' : 'suda') : region); invalidate(); f.selected = [];
    const correct = selected.every(p => p.phase === plan.finalItems.find(x => x.formula === p.formula).phase);
    if (correct) feedback('Seçtiğin türlerin fiziksel hâli uygun. Diğer türleri de modelde tutarak tamamla.', 'good');
    else guide('phase', 'Bu yerleştirme gözlemini açıklıyor mu? Türün gaz, katı veya çözünmüş hâlini ve madde özelliklerini incele.');
    record('hâl seçimi', correct ? 'doğru' : 'hâl hatası'); if (!correct) records.errors++; update();
  }
  function remove() {
    if (active === 1) return;
    const f = frames[active]; if (!f.selected.length) return;
    remember(); f.items = f.items.filter(p => !f.selected.includes(p.id)); f.selected = []; invalidate();
    feedback(active === 0 ? 'Seçilen türler havuza döndü; atomlar kaybolmadı.' : 'Türleri modelden çıkardın. Tepkimeye katılmayan türler yok olur mu? Soldaki geri alınan kartlarla onları yeniden ekleyebilirsin.', active === 0 ? 'info' : 'guidance'); record('havuza geri al', 'yeniden eklenebilir'); update();
  }
  function returnToPool(id) {
    if (active !== 0 || !frames[0].items.some(p => p.id === id)) return false;
    remember(); frames[0].items = frames[0].items.filter(p => p.id !== id);
    frames[0].selected = frames[0].selected.filter(value => value !== id); pending = null;
    invalidate(); feedback('Tür havuza döndü. Aynı atomlarla yeniden yerleştirebilirsin.');
    record('havuza dönüş', 'aynı atom kimlikleri'); update(); return true;
  }
  function restore(id) {
    if (active !== 2) return;
    const f = frames[2], item = f.baseItems.find(p => p.id === id); if (!item || f.items.some(p => p.id === id)) return;
    remember(); f.items.push({ ...clone(item), phase: 'unplaced' }); invalidate(); feedback('Tür geri geldi; aynı atom kimlikleri korundu. Şimdi fiziksel hâlini belirle.', 'good'); record('türü geri getir', 'doğru'); update();
  }
  function undo() {
    const previous = history.pop(); if (!previous) return;
    ({ frames, active, reached, assessment } = clone(previous)); pending = null; revokeCompletion(); frames[2].ok = false; assessment.transferOK = false;
    feedback('Son anlamlı işlem geri alındı; atomlar ve türler korundu.'); record('geri al', 'geri alındı'); update();
  }
  function next() {
    const f = frames[active]; const result = plan.validate(f, active); records.checks++;
    if (!records.firstAttempt) records.firstAttempt = clone({ stage: active, frames });
    f.ok = result[0] === 'ok';
    record('adım kontrolü', result[0]);
    if (!f.ok) {
      const status = currentModelStatus();
      const message = status === 'incorrect' && active === 0 ? 'Bir tür ait olmadığı kaynak bölgesinde. Kırmızı çerçeveli bölgeyi inceleyip türü uygun kaynağa taşı.'
        : status === 'incorrect' && active === 1 && f.trialState === 'incorrect' ? f.feedback
        : status === 'incomplete' && active === 2 ? 'Bazı türler henüz yerleştirilmemiş. Eksik bölgeleri ve geri alınan türleri tamamla.'
        : result[1];
      if (status === 'incorrect') records.errors++;
      feedback(message, status === 'incorrect' ? 'guidance' : 'info'); update();
      showResult(status, status === 'incorrect' ? 'Modelini yeniden incele' : 'Modelin henüz tamamlanmadı', message, 'fix', 'Modelimi düzelt'); return;
    }
    feedback(result[1], 'good'); update();
    if (active < 2) { showResult('correct', 'Modelin doğru', result[1], 'advance', 'Sonraki adıma geç'); return; }
    if (!explanationOK()) {
      const wrong = assessment.evidence && assessment.evidence !== plan.evidence || assessment.explanation && assessment.explanation !== plan.explanation || assessment.stays && assessment.stays !== plan.staysAnswer;
      showResult(wrong ? 'incorrect' : 'correct', wrong ? 'Açıklamanı gözleminle karşılaştır' : 'Modelin doğru', wrong ? 'Modelindeki türlerle seçtiğin açıklama arasında bir uyumsuzluk var. Gözlem defterinle karşılaştırarak açıklamanı düzelt.' : 'Türleri uygun hâllerde gösterdin. Şimdi gözlemini bu modelle ilişkilendir.', 'explain', wrong ? 'Açıklamamı düzelt' : 'Açıklamaya geç'); return;
    }
    if (!assessment.transferOK) {
      showResult(assessment.transferFeedback ? 'incorrect' : 'correct', assessment.transferFeedback ? 'Yeni örneği yeniden incele' : 'Modelin ve açıklaman doğru', assessment.transferFeedback || 'Aynı düşünceyi yeni bir örnekte kullanarak modellemeyi tamamla.', 'transfer', assessment.transferFeedback ? 'Yeni örneği düzelt' : 'Yeni örneğe geç'); return;
    }
    showResult('correct', 'Modellemeyi başarıyla tamamladın', 'Modelin, gözlem açıklaman ve yeni örnekteki seçimin tutarlı. Aynı atomların izini takip etmeye hazırsın.', 'finish', 'Atomun izini sür');
  }
  function advance() {
    const f = frames[active]; if (active >= 2 || plan.validate(f, active)[0] !== 'ok') return;
    remember();
    if (active === 0) frames[1].items = clone(f.items);
    else {
      const ids = new Set(f.interaction.reactants.map(p => p.id));
      const final = [...clone(f.items.filter(p => !ids.has(p.id))), ...clone(f.interaction.products)];
      frames[2].baseItems = clone(final); frames[2].items = final.map(p => ({ ...p, phase: 'unplaced' }));
    }
    active++; reached = active; pending = null; phoneView = 'model'; regionPage = 0;
    feedback(active === 1 ? 'Gözlemini açıklayan etkileşimi öner.' : 'Oluşan ve değişmeden kalan türleri hâllerine göre yerleştir.'); update();
    el('tabs').scrollIntoView({ block: 'nearest', behavior: 'auto' }); el('tab-' + active).focus({ preventScroll: true });
  }
  function showResult(status, title, message, action, label) {
    const dialog = el('result'); dialog.dataset.status = status;
    el('result-symbol').textContent = status === 'correct' ? '✓' : status === 'incorrect' ? '×' : '!';
    el('result-title').textContent = title; el('result-message').textContent = message;
    el('result-action').textContent = label; el('result-back').hidden = action === 'fix';
    resultAction = { action, stage: active };
    if (!dialog.open) dialog.showModal();
    el('result-action').focus();
  }
  function closeResult() { resultAction = null; el('result').close(); }
  function continueResult() {
    const target = resultAction; closeResult(); if (!target || target.stage !== active) return;
    if (target.action === 'advance') advance();
    else if (target.action === 'finish') { if (checkAll(false)) state.setStage(3); }
    else if (target.action === 'trace') state.setStage(3);
    else if (target.action === 'explain' || target.action === 'transfer') {
      phoneView = target.action === 'explain' ? 'explanation' : 'transfer'; question = 0; update();
      const section = el(target.action === 'explain' ? 'explanation' : 'transfer');
      if (!LandscapeTasks.active()) {
        const heading = section.querySelector('h3');
        container.scrollTo({ top: container.scrollTop + heading.getBoundingClientRect().top - container.getBoundingClientRect().top - 20, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      section.querySelector('select, input, button')?.focus({ preventScroll: true });
    } else if (!LandscapeTasks.active() || phoneView === 'model') { el('work').scrollIntoView({ block: 'nearest', behavior: 'auto' }); el('work').querySelector('[data-item], [data-source]')?.focus({ preventScroll: true }); }
  }
  function explanationOK() { return assessment.evidence === plan.evidence && assessment.explanation === plan.explanation && assessment.stays === plan.staysAnswer; }
  function go(index) {
    if (index > reached || frames.slice(0, index).some((f, i) => plan.validate(f, i)[0] !== 'ok')) return;
    active = index; pending = null; phoneView = 'model'; regionPage = 0; update();
  }
  function checkAll(show = true) {
    const review = frames.map((f, i) => plan.validate(f, i));
    const valid = review.every(([code]) => code === 'ok') && explanationOK() && assessment.transferOK;
    if (!valid) { feedback('Model, gözlem açıklaması ve yeni örnek birlikte tamamlanmalı.', 'guidance'); update(); return false; }
    frames.forEach(f => f.ok = true); feedback('Üç modelin ve gözlem açıklaman tutarlı. Yeni örnekte de atomları ve değişmeden kalan türleri korudun.', 'good');
    save(); state.completeStage(2, { version: 7, reactionId: reaction.id, frames: clone(frames), explanation: clone(assessment), learningRecord: clone(records), assisted: records.hintUses > 0, testMode: Boolean(records.testMode) });
    render(); if (show) showResult('correct', 'Modellemeyi başarıyla tamamladın', 'Modelin ve gözlem açıklaman tutarlı. Aynı atomların izini takip etmeye hazırsın.', 'trace', 'Atomun izini sür'); return true;
  }
  function reset() { frames = [blank(), blank(), blank()]; active = reached = 0; phoneView = 'model'; regionPage = 0; pending = null; history = []; assessment = emptyAssessment(); records = { actions: [], checks: 0, errors: 0, firstAttempt: null, hintUses: 0, transferAttempts: 0 }; revokeCompletion(); update(); }
  function autoComplete() {
    records.testMode = true;
    frames = [blank(), blank(), blank()]; frames[0].items = clone(plan.initial); frames[0].ok = true;
    frames[1].items = clone(plan.initial); frames[1].interaction = plan.tryInteraction(frames[1].items, plan.activeInitial.map(p => p.id), plan.options.find(o => o.correct).id)[2]; frames[1].ok = true;
    frames[2].items = clone(plan.finalItems); frames[2].baseItems = clone(plan.finalItems); active = reached = 2;
    assessment = { evidence: plan.evidence, explanation: plan.explanation, stays: plan.staysAnswer, transfer: plan.transfer.answer, transferOK: true };
    record('geliştirme kısayolu', 'testMode'); if (!checkAll(false)) throw new Error('Model doğrulanamadı.'); return true;
  }
  function token(item) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'formula-token'; b.dataset.item = item.id;
    const formula = document.createElement('strong'); formula.className = 'chemical-formula'; FormulaChemistry.renderFormula(formula, item.formula);
    const phase = document.createElement('small'); phase.textContent = plan.phaseLabels[item.phase] || 'Hâl seç'; if (item.catalyst) phase.textContent += ' · katalizör';
    b.append(formula, phase); b.setAttribute('aria-pressed', String(frames[active].selected.includes(item.id))); b.onclick = () => select(item.id); draggable(b, { id: item.id }); return b;
  }
  function zone(host, region, title, items, source) {
    const section = document.createElement('section'); section.className = 'formula-zone inquiry-zone'; section.dataset.region = region;
    section.dataset.status = zoneStatus(region, items, source);
    const header = document.createElement('div'); header.className = 'inquiry-zone-heading';
    const h = document.createElement('h4'); h.textContent = title;
    const status = document.createElement('span'); status.className = 'zone-status'; status.textContent = { incomplete: 'Eksik', incorrect: 'Hatalı', correct: 'Doğru' }[section.dataset.status];
    header.append(h, status); section.append(header);
    const list = document.createElement('div'); list.className = 'formula-items'; items.forEach(p => list.append(token(p))); section.append(list);
    if (!items.length) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'Türleri buraya yerleştir.'; section.append(empty); }
    if (source !== undefined) { const target = document.createElement('button'); target.type = 'button'; target.className = 'source-target'; target.textContent = 'Seçili türü bu kaynağa yerleştir'; target.dataset.source = source; target.onclick = () => moveSource(source); section.append(target); }
    host.append(section);
  }
  function zoneStatus(region, items, source) {
    const signature = InquiryChemistry.signature;
    if (active === 0) {
      const expected = plan.initial.filter(p => p.source === source);
      if (items.some(p => !expected.some(x => x.id === p.id && x.formula === p.formula && x.phase === p.phase))) return 'incorrect';
      return signature(items) === signature(expected) ? 'correct' : 'incomplete';
    }
    if (active === 1) return frames[1].interaction && plan.validate(frames[1], 1)[0] === 'ok' ? 'correct' : frames[1].trialState === 'incorrect' ? 'incorrect' : 'incomplete';
    if (region === 'unplaced') return 'incomplete';
    const expected = plan.finalItems.filter(p => region === 'liquid' ? ['s', 'suda'].includes(p.phase) : p.phase === region);
    if (items.some(p => !expected.some(x => x.formula === p.formula && x.phase === p.phase))) return 'incorrect';
    return signature(items) === signature(expected) ? 'correct' : 'incomplete';
  }
  function currentModelStatus() {
    const f = frames[active];
    if (active === 0 && [0, 1].some(source => zoneStatus('source-' + source, f.items.filter(p => p.source === source), source) === 'incorrect')) return 'incorrect';
    if (active === 1 && f.trialState === 'incorrect') return 'incorrect';
    if (active === 2 && f.items.some(p => p.phase !== 'unplaced' && p.phase !== plan.finalItems.find(x => x.formula === p.formula)?.phase)) return 'incorrect';
    const code = plan.validate(f, active)[0];
    if (code === 'ok') return 'correct';
    if (['empty', 'interaction'].includes(code)) return 'incomplete';
    if (code === 'inventory') {
      const own = f.items.flatMap(p => p.atoms), ids = new Set(own.map(a => a.id));
      return ids.size === own.length && own.length < plan.atoms.length && own.every(a => plan.atoms.some(b => b.id === a.id && b.e === a.e)) ? 'incomplete' : 'incorrect';
    }
    return active === 2 && f.items.some(p => p.phase === 'unplaced') && ['phase', 'gas'].includes(code) ? 'incomplete' : 'incorrect';
  }
  function draggable(button, payload) {
    button.draggable = true;
    button.addEventListener('dragstart', e => { e.dataTransfer.setData('application/x-chem-species', JSON.stringify({ ...payload, active })); e.dataTransfer.effectAllowed = 'move'; });
    button.addEventListener('dragend', stopNativeDrag);
  }
  function stopNativeDrag() { cancelAnimationFrame(nativeDrag?.scroll); nativeDrag = null; root.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over')); }
  function nativeScroll() {
    if (!nativeDrag || disposed) return;
    const bounds = container.getBoundingClientRect();
    if (nativeDrag.y > bounds.bottom - 55) container.scrollTop += 12;
    else if (nativeDrag.y < bounds.top + 55) container.scrollTop -= 12;
    nativeDrag.scroll = requestAnimationFrame(nativeScroll);
  }
  function drop(payload, region) {
    if (payload.active !== active) return;
    if (active === 0 && region === 'pool' && payload.id) returnToPool(payload.id);
    else if (active === 0 && /^source-[01]$/.test(region)) { const source = Number(region.slice(-1)); payload.formula ? add(payload.formula, source) : moveSource(source, payload.id); }
    else if (active === 2 && ['liquid', 'g', 'k', 'unplaced'].includes(region) && payload.id) setPhase(region, payload.id);
  }
  root.addEventListener('dragover', e => {
    if (!e.dataTransfer.types.includes('application/x-chem-species')) return;
    e.preventDefault();
    if (!nativeDrag) { nativeDrag = { y: e.clientY }; nativeDrag.scroll = requestAnimationFrame(nativeScroll); }
    nativeDrag.y = e.clientY;
    const target = e.target.closest('[data-region]'); if (target) target.classList.add('drag-over');
  });
  root.addEventListener('dragleave', e => e.target.closest('[data-region]')?.classList.remove('drag-over'));
  root.addEventListener('drop', e => { stopNativeDrag(); const target = e.target.closest('[data-region]'); if (!target) return; e.preventDefault(); target.classList.remove('drag-over'); try { drop(JSON.parse(e.dataTransfer.getData('application/x-chem-species')), target.dataset.region); } catch { /* Ignore unrelated drop data. */ } });
  root.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || ![0, 2].includes(active)) return;
    const button = e.target.closest('[data-formula], [data-item]'); if (!button || button.disabled) return;
    touch = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, button, payload: { active, formula: button.dataset.formula, id: button.dataset.item } };
    button.setPointerCapture(e.pointerId);
  });
  function touchScroll() {
    if (!touch?.moved) return;
    const bounds = container.getBoundingClientRect();
    if (touch.yNow > bounds.bottom - 55) container.scrollTop += 12;
    else if (touch.yNow < bounds.top + 55) container.scrollTop -= 12;
    touch.scroll = requestAnimationFrame(touchScroll);
  }
  root.addEventListener('pointermove', e => {
    if (!touch || touch.pointerId !== e.pointerId || !touch.moved && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) < 9) return;
    e.preventDefault(); touch.moved = true; touch.yNow = e.clientY;
    if (!touch.ghost) { touch.ghost = document.createElement('div'); touch.ghost.className = 'formula-drag-ghost'; const item = frames[active].items.find(p => p.id === touch.payload.id); FormulaChemistry.renderFormula(touch.ghost, touch.payload.formula || item.formula); document.body.append(touch.ghost); touch.scroll = requestAnimationFrame(touchScroll); }
    touch.ghost.style.left = e.clientX + 'px'; touch.ghost.style.top = e.clientY + 'px';
  }, { passive: false });
  function suppressClick(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function endTouch(e) {
    if (!touch || touch.pointerId !== e.pointerId) return; const drag = touch; touch = null; drag.ghost?.remove(); cancelAnimationFrame(drag.scroll);
    if (!drag.moved || e.type === 'pointercancel') return;
    root.addEventListener('click', suppressClick, { capture: true, once: true }); setTimeout(() => root.removeEventListener('click', suppressClick, true), 0);
    const region = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-region]'); if (region && root.contains(region)) drop(drag.payload, region.dataset.region);
  }
  root.addEventListener('pointerup', endTouch); root.addEventListener('pointercancel', endTouch);
  function render() {
    if (disposed) return;
    const focused = document.activeElement, focusItem = root.contains(focused) && (focused.dataset.item || focused.dataset.formula);
    const f = frames[active];
    el('tabs').replaceChildren(); titles.forEach((title, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'fm-tab-' + i; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(active === i)); b.setAttribute('aria-controls', 'fm-panel'); b.disabled = i > reached; b.textContent = `${i + 1} · ${title}${frames[i].ok ? ' ✓' : ''}`; b.onclick = () => go(i); el('tabs').append(b);
    });
    el('panel').setAttribute('aria-labelledby', 'fm-tab-' + active); el('title').textContent = titles[active]; el('task').textContent = tasks[active]; el('progress').textContent = `Adım ${active + 1} / 3`;
    el('pool-title').textContent = 'Tanecik havuzu'; el('pool-help').textContent = 'Kartı seç → kaynak bölgeyi seç. Geri dönüş için türü havuza taşı.'; el('pool-help').hidden = active !== 0;
    el('pool').dataset.region = 'pool'; el('pool').classList.toggle('passive-pool', active !== 0);
    el('pool').replaceChildren();
    plan.before.forEach(d => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'formula-card'; b.disabled = active !== 0;
      const label = document.createElement('span'); label.className = 'chemical-formula'; FormulaChemistry.renderFormula(label, d.formula);
      const n = document.createElement('small'); n.textContent = active === 0 ? `${remaining(d.formula).length} / ${d.n} havuzda` : `${d.n} adet · ${plan.phaseLabels[d.phase]}`;
      b.append(label, n); if (active === 0) { b.dataset.formula = d.formula; b.disabled = !remaining(d.formula).length && !f.items.some(p => p.formula === d.formula && f.selected.includes(p.id)); b.setAttribute('aria-pressed', String(pending === d.formula)); b.onclick = () => add(d.formula); if (remaining(d.formula).length) draggable(b, { formula: d.formula }); } el('pool').append(b);
    });
    el('atoms').replaceChildren(); Object.keys(plan.inventory).forEach(symbol => {
      const name = document.createElement('span'); name.textContent = symbol; name.setAttribute('aria-label', atomNames[symbol] || symbol); el('atoms').append(name);
    });
    el('properties').hidden = active !== 1;
    el('returned').replaceChildren(); if (active === 2) {
      const missing = (f.baseItems || []).filter(p => !f.items.some(x => x.id === p.id));
      if (missing.length) { const h = document.createElement('h3'); h.textContent = 'Geri alınan türler'; el('returned').append(h); missing.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.dataset.restore = p.id; b.textContent = p.formula + ' türünü geri getir'; b.onclick = () => restore(p.id); el('returned').append(b); }); }
    }
    el('work').replaceChildren(); el('work').classList.toggle('source-fields', active === 0); el('work').dataset.status = currentModelStatus();
    if (active === 0) { zone(el('work'), 'source-0', plan.sourceNames[0], f.items.filter(p => p.source === 0), 0); zone(el('work'), 'source-1', plan.sourceNames[1], f.items.filter(p => p.source === 1), 1); }
    else if (active === 1) zone(el('work'), 'mixture', reaction.id === 'caco3_hcl' ? 'Karışım · başlangıç katısının yüzeyinde etkileşim' : 'Karışım · etkileşim önerin', f.items);
    else {
      if (f.items.some(p => p.phase === 'unplaced')) zone(el('work'), 'unplaced', 'Hâlini belirleyeceğim türler', f.items.filter(p => p.phase === 'unplaced'));
      if (plan.kind === 'gas' || f.items.some(p => p.phase === 'g')) zone(el('work'), 'g', 'Gaz bölgesi · sıvının üstü', f.items.filter(p => p.phase === 'g'));
      if (plan.kind !== 'smoke' || f.items.some(p => ['s', 'suda'].includes(p.phase))) zone(el('work'), 'liquid', 'Sıvı / çözelti · ayrı iyonlar ve moleküller', f.items.filter(p => ['s', 'suda'].includes(p.phase)));
      if (['solid', 'smoke'].includes(plan.kind) || f.items.some(p => p.phase === 'k')) zone(el('work'), 'k', plan.kind === 'smoke' ? 'Havada asılı katı tanecikler · beyaz sis' : 'Katı yapı · formül birimi (örgü/küme)', f.items.filter(p => p.phase === 'k'));
    }
    el('proposals').hidden = active !== 1 || !f.eligible;
    el('proposal-options').replaceChildren(); if (active === 1 && f.eligible) plan.options.forEach(o => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.proposal = o.id; b.setAttribute('aria-pressed', String(f.proposal === o.id)); b.textContent = (o.formulas.length ? o.formulas.join(' + ') + ' — ' : '') + o.label; b.onclick = () => chooseProposal(o.id); el('proposal-options').append(b);
    });
    el('interaction-preview').hidden = active !== 1 || !f.interaction;
    el('interaction-preview').textContent = f.interaction ? f.interaction.reactants.map(p => p.formula).join(' + ') + ' → ' + f.interaction.products.map(p => p.formula).join(' + ') + (plan.spectators.length ? ' · Değişmeden kalan türler modelde.' : ' · İncelenen iki gaz da değişime katıldı.') + ' Bu gösterim ayrıntılı mekanizma değildir.' : '';
    el('try').hidden = active !== 1; el('try').disabled = !f.selected.length;
    [['liquid', true], ['gas', plan.kind === 'gas'], ['solid', ['solid', 'smoke'].includes(plan.kind)]].forEach(([id, show]) => { el(id).hidden = active !== 2 || !show; el(id).disabled = !f.selected.length; });
    el('feedback').textContent = f.feedback || 'Bir karar ver, modelini kur ve gözleminle karşılaştır.'; el('feedback').classList.toggle('good', f.tone === 'good'); el('feedback').classList.toggle('guidance', f.tone === 'guidance');
    el('feedback-open').textContent = f.tone === 'good' ? '✓ Doğru' : f.tone === 'guidance' ? '! İncele' : 'Dönütü oku';
    el('feedback-open').setAttribute('aria-label', 'İşlem dönütünü oku: ' + el('feedback').textContent);
    el('explanation').hidden = active !== 2 || !f.ok; el('evidence').value = assessment.evidence; el('cause').value = assessment.explanation; el('stays').value = assessment.stays; el('note').value = assessment.note || '';
    el('sentence').textContent = explanationOK() ? `“${assessment.evidence}” gözlemim, modelimde “${assessment.explanation.toLocaleLowerCase('tr')}” ile açıklanır; ${plan.staysAnswer === 'none' ? 'incelenen gazların ikisi de değişime katılır.' : 'değişime katılmayan türler çözeltide kalır.'}` : 'Gözlem, model ve değişmeden kalan türler arasında ilişki kur.';
    el('transfer').hidden = active !== 2 || !f.ok || !explanationOK();
    el('transfer-task').textContent = plan.transfer.prompt; el('transfer-options').replaceChildren();
    plan.transfer.options.forEach((text, i) => { const label = document.createElement('label'); const input = document.createElement('input'); input.type = 'radio'; input.name = 'fm-transfer-answer'; input.value = i; input.checked = assessment.transfer === i; input.onchange = () => { assessment.transfer = i; assessment.transferOK = false; revokeCompletion(); feedback('Yeni örnek için model önerin seçildi; kontrol ederek düşünceni sına.'); update(); }; label.append(input, document.createTextNode(text)); el('transfer-options').append(label); });
    el('transfer-feedback').textContent = assessment.transferOK ? 'Bu yeni örnekte uygun modeli seçtin; türler ve atomlar korundu.' : assessment.transferFeedback || '';
    el('transfer-check').disabled = assessment.transfer === null;
    const complete = state.stages[2].status === 'completed'; el('next').hidden = complete; el('trace').hidden = !complete;
    el('next').textContent = 'Modelimi kontrol et';
    renderPhone();
    MebiDesignSystem.applyActivity(root);
    if (focusItem) { const same = [...root.querySelectorAll('[data-item],[data-formula]')].find(b => (b.dataset.item || b.dataset.formula) === focusItem); same?.focus({ preventScroll: true }); }
  }
  function renderPhone() {
    const phone = LandscapeTasks.active(), f = frames[active];
    if (active !== 2 && ['explanation', 'note', 'transfer'].includes(phoneView)) phoneView = 'model';
    if (active === 2 && !f.ok && ['explanation', 'note', 'transfer'].includes(phoneView)) phoneView = 'model';
    root.dataset.view = phoneView; root.dataset.step = active;
    const nav = el('region-nav'); nav.replaceChildren();
    const regions = [...el('work').children];
    regionPage = Math.min(regionPage, regions.length - 1);
    regions.forEach((section, i) => {
      section.hidden = phone && i !== regionPage;
      if (phone && regions.length > 1) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = active === 0 ? 'Kaynak ' + (i + 1) : ({ unplaced:'Bekleyen', liquid:'Sıvı', g:'Gaz', k:'Katı' }[section.dataset.region]);
        b.setAttribute('aria-pressed', String(i === regionPage)); b.onclick = () => { regionPage = i; renderPhone(); }; nav.append(b);
      }
      LandscapeTasks.paginate(section.querySelector('.formula-items'), 3);
    });
    LandscapeTasks.paginate(el('proposal-options'), 2);
    LandscapeTasks.paginate(el('transfer-options'), 1);
    if (phone && active === 1 && f.eligible) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = phoneView === 'proposals' ? 'Türlere dön' : 'Oluşum önerim';
      b.onclick = () => { phoneView = phoneView === 'proposals' ? 'model' : 'proposals'; renderPhone(); }; nav.append(b);
    }
    const fields = [...el('explanation').querySelectorAll('label')];
    fields.forEach((label, i) => label.hidden = phone && (phoneView === 'note' ? i !== 3 : i !== question));
    el('question-count').textContent = `${question + 1} / 3`;
    el('question-prev').hidden = question === 0 || phoneView !== 'explanation';
    el('question-next').hidden = question === 2 || phoneView !== 'explanation';
    el('write-note').hidden = phoneView !== 'explanation';
    el('question-count').hidden = phoneView !== 'explanation';
    el('question-nav').classList.toggle('show-view-nav', ['explanation', 'note', 'transfer'].includes(phoneView));
    el('question-nav').hidden = !['explanation', 'note', 'transfer'].includes(phoneView);
    el('explanation').querySelector('h3').textContent = phoneView === 'note' && phone ? 'Kendi cümlenle ekle' : 'Gözlemimi modelimle açıklarım';
    if (phone) container.scrollTop = 0;
    root.querySelector('.workshop-footer').prepend(el('feedback-open'));
    const actions = root.querySelector('.phase-actions'), footer = root.querySelector('.workshop-footer');
    const actionMode = phone && ['model', 'proposals'].includes(phoneView) && f.selected.length && (active === 2 || active === 1 && !f.interaction);
    actions.hidden = phone && !actionMode;
    if (actionMode) { footer.append(actions); el('reset').hidden = true; el('next').hidden = true; }
    else { el('panel').insertBefore(actions, el('feedback')); el('reset').hidden = false; }
    if (phone && phoneView === 'transfer') {
      root.querySelector('.workshop-footer').append(el('transfer-check'));
      el('transfer-check').hidden = assessment.transferOK;
      el('next').hidden = !assessment.transferOK;
    } else {
      el('transfer').insertBefore(el('transfer-check'), el('transfer-feedback'));
      el('transfer-check').hidden = false;
      el('next').hidden = actionMode || state.stages[2].status === 'completed';
    }
  }
  const unsubscribeViewport = LandscapeTasks.subscribe(() => { if (!disposed) renderPhone(); });
  el('view-back').onclick = () => { phoneView = 'model'; renderPhone(); };
  el('question-prev').onclick = () => { question = Math.max(0, question - 1); renderPhone(); };
  el('question-next').onclick = () => { question = Math.min(2, question + 1); renderPhone(); };
  el('write-note').onclick = () => { phoneView = 'note'; renderPhone(); el('note').focus({ preventScroll: true }); };
  el('feedback-open').onclick = () => showResult(frames[active].tone === 'good' ? 'correct' : currentModelStatus(), 'İşlemin için dönüt', frames[active].feedback, 'fix', 'Görevime dön');
  el('properties').querySelector('summary').onclick = event => {
    if (!LandscapeTasks.active()) return;
    event.preventDefault(); showResult('incomplete', 'Madde özellikleri', plan.properties, 'fix', 'Görevime dön');
  };
  el('reset').onclick = reset; el('try').onclick = tryInteraction; el('next').onclick = next;
  el('liquid').onclick = () => setPhase('liquid'); el('gas').onclick = () => setPhase('g'); el('solid').onclick = () => setPhase('k');
  el('trace').onclick = () => { closeResult(); state.setStage(3); };
  el('result-close').onclick = closeResult; el('result-back').onclick = closeResult; el('result-action').onclick = continueResult;
  el('result').addEventListener('cancel', () => { resultAction = null; });
  [['evidence', 'evidence'], ['cause', 'explanation'], ['stays', 'stays']].forEach(([id, field]) => el(id).onchange = () => {
    assessment[field] = el(id).value; assessment.transferOK = false; revokeCompletion();
    const correct = assessment[field] === (field === 'evidence' ? plan.evidence : field === 'explanation' ? plan.explanation : plan.staysAnswer);
    feedback(correct ? 'Bu açıklama parçası modelinle uygun; diğer bağlantıları da tamamla.' : 'Seçtiğin açıklamayı gözlem defterinle ve son modelindeki türlerle karşılaştır.', correct ? 'good' : 'guidance'); record('gözlem açıklaması', correct ? 'doğru' : 'açıklama hatası'); if (!correct && assessment[field]) records.errors++; update();
  });
  el('note').oninput = () => { assessment.note = el('note').value; save(); };
  el('transfer-check').onclick = () => {
    if (assessment.transfer === null || !frames[2].ok || !explanationOK()) return;
    records.transferAttempts++; assessment.transferOK = assessment.transfer === plan.transfer.answer;
    assessment.transferFeedback = assessment.transferOK ? '' : plan.transfer.guidance;
    feedback(assessment.transferOK ? 'Yeni örnekte de türleri ve atomları korudun. Modellemeyi tamamlayabilirsin.' : plan.transfer.guidance, assessment.transferOK ? 'good' : 'guidance'); record('bağımsız yeni örnek', assessment.transferOK ? 'doğru' : 'yeniden dene'); update();
    if (LandscapeTasks.active() && !assessment.transferOK) showResult('incorrect', 'Yeni örneği yeniden incele', plan.transfer.guidance, 'fix', 'Seçimimi düzelt');
  };
  render();
  return { frames: () => frames, validate: i => plan.validate(frames[i], i), add, select, moveSource, tryInteraction, chooseProposal, setPhase, remove, restore, undo, next, go, checkAll, reset, autoComplete,
    dispose() { save(); disposed = true; unsubscribeViewport(); stopNativeDrag(); touch?.ghost?.remove(); cancelAnimationFrame(touch?.scroll); touch = null; closeResult(); } };
}
window.StudentStage2ModelingManager = class {
  constructor(state, container) { this.state = state; this.api = mountStudentModel(container, state); }
  dispose() { this.api?.dispose(); }
};
window.Stage2ModelingManager = window.StudentStage2ModelingManager;
