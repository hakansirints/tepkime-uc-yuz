class StudentAtomTraceManager {
  constructor(state, container) {
    this.state = state; this.container = container; this.reaction = state.getReaction();
    const data = state.stages[2].completedData;
    if (!data?.frames) { container.textContent = 'Önce modelini doğrula.'; return; }
    this.frames = [data.frames[0].items, data.frames[2].items].map(FormulaChemistry.clone);
    const atoms = this.frames[0].flatMap(p => p.atoms);
    this.target = atoms.find(a => a.e === 'C') || atoms.find(a => !['Na', 'Cl', 'K'].includes(a.e)) || atoms[0];
    this.source = this.frames[0].find(p => p.atoms.some(a => a.id === this.target.id));
    this.product = this.frames[1].find(p => p.atoms.some(a => a.id === this.target.id));
    this.mode = 'inquiry'; this.marked = false; this.selected = null; this.reason = null;
    this.inquiryDone = this.watched = this.done = false; this.feedback = 'İşaretlenecek atomu içeren başlangıç formülünü seç.';
    const saved = state.atomTraceDraft;
    if (saved?.reactionId === this.reaction.id && saved.targetId === this.target.id) Object.assign(this, saved);
    container.innerHTML = `<div id="student-atom-trace" class="liquid-workshop" lang="tr">
      <header class="workshop-header"><div><div class="eyebrow">AŞAMA 3 · ATOMUN İZİNİ SÜR</div><h2>Bir atom, iki formül</h2><p class="muted" id="trace-reaction"></p></div><button type="button" id="trace-reset">Yeniden dene</button></header>
      <div class="trace-steps liquid-segments"><span id="trace-inquiry-step">01 · Tahmin ve gerekçe</span><span id="trace-guided-step">02 · Aynı atomun izi</span></div>
      <div class="trace-prompt glass-panel"><span id="trace-target" class="atom-symbol"></span><div><h3 id="trace-task"></h3><p id="trace-mode" class="muted"></p></div></div>
      <div id="trace-view-nav" class="landscape-only task-view-nav"><button id="trace-view-source" type="button">Başlangıç türleri</button><button id="trace-view-product" type="button">Son türler</button><button id="trace-view-reason" type="button">Gerekçem</button></div>
      <div class="trace-scenes"><section class="glass-panel trace-stage"><div class="panel-heading"><span class="step-dot">01</span><h3>Tepkime öncesi</h3></div><div id="trace-sources" class="trace-species"></div></section>
        <section class="glass-panel trace-stage"><div class="panel-heading"><span class="step-dot">02</span><h3>Tepkime sonrası</h3></div><div id="trace-products" class="trace-species"></div></section></div>
      <div id="trace-path" class="trace-path" hidden role="status"></div>
      <section id="trace-reasons" class="glass-panel reason-panel"><h3>Neden bu formülü seçtin?</h3><div class="workshop-actions"><button type="button" data-reason="rearranged">Atomlar yeniden düzenlendi</button><button type="button" data-reason="created">Yeni atom oluştu</button><button type="button" data-reason="lost">Atom kayboldu</button></div></section>
      <div class="workshop-footer"><button id="trace-check" type="button" class="liquid-primary">Eşleştirmemi kontrol et</button><button id="trace-continue" type="button" class="liquid-primary" hidden>Atomun izini takip et</button><button id="trace-watch" type="button" class="liquid-primary" hidden>İşaretli atomu izle</button><button id="trace-finish" type="button" class="liquid-primary" hidden>Son formülü doğrula</button></div>
      <div id="trace-feedback" class="workshop-feedback" role="status"></div><p id="trace-count" class="trace-count" hidden></p><p class="workshop-note">İşaret aynı atomun kimliğini gösterir. Atom kaybolmaz; yeni atom oluşmaz.</p>
    </div>`;
    this.root = container.querySelector('#student-atom-trace'); this.el = id => this.root.querySelector('#trace-' + id);
    this.el('reaction').textContent = this.reaction.fixedVessel.name + ' + ' + this.reaction.addedVessel.name[0].toLocaleLowerCase('tr') + this.reaction.addedVessel.name.slice(1); this.el('target').textContent = this.target.e;
    this.el('reset').onclick = () => this.reset();
    this.phoneView = this.mode === 'inquiry' ? (this.selected ? 'reason' : this.marked ? 'product' : 'source') : this.watched ? 'product' : 'source';
    for (const view of ['source', 'product', 'reason']) this.el('view-' + view).onclick = () => { this.phoneView = view; this.renderPhone(); };
    this.unsubscribeViewport = LandscapeTasks.subscribe(() => { if (!this.disposed) this.renderPhone(); });
    this.root.querySelectorAll('[data-reason]').forEach(b => b.onclick = () => { this.edit(); this.reason = b.dataset.reason; this.inquiryDone = this.done = false; this.render(); this.save(); });
    this.el('check').onclick = () => {
      this.inquiryDone = this.selected === this.product.id && this.reason === 'rearranged';
      this.feedback = this.inquiryDone ? 'Formül ve gerekçe tutarlı. Şimdi aynı atomun izini takip et.' : this.selected !== this.product.id ? 'Seçtiğin son formülde başlangıçtaki işaretli atom bulunuyor mu?' : 'Bu atom başlangıçta da vardı. Formüllerin atomları nasıl yeniden kullandığını düşün.';
      this.render(); this.save();
    };
    this.el('continue').onclick = () => { if (!this.inquiryDone) return; this.phoneView = 'source'; this.mode = 'guided'; this.marked = this.watched = this.done = false; this.selected = null; this.feedback = 'Başlangıç formülünü tekrar seç; işaretli atomu izle.'; this.render(); this.save(); };
    this.el('watch').onclick = () => this.watch(); this.el('finish').onclick = () => this.finish(); this.render();
  }
  edit() {
    if (this.state.stages[3].status === 'completed') { this.state.stages[3].status = 'active'; this.state.stages[3].completedData = null; this.state.emit('stageChange', { currentStage: 3, stages: this.state.stages }); }
  }
  reset() {
    this.testMode = false;
    clearTimeout(this.timer); this.animating = false; this.edit(); this.mode = 'inquiry'; this.marked = this.inquiryDone = this.watched = this.done = false;
    this.phoneView = 'source';
    this.selected = this.reason = null; this.feedback = 'İşaretlenecek atomu içeren başlangıç formülünü seç.'; this.render(); this.save();
  }
  chooseSource(id) {
    if (this.animating) return;
    this.edit(); this.done = false; this.marked = id === this.source.id;
    this.inquiryDone = this.mode === 'guided' && this.inquiryDone; this.selected = null; this.reason = null;
    this.feedback = this.marked ? 'Atom işaretlendi. Aynı atomun yer aldığı son formülü seç.' : 'Bu başlangıç formülünde görev atomu bulunmuyor. Formülleri yeniden incele.';
    if (this.marked && this.mode === 'inquiry') this.phoneView = 'product';
    this.render(); this.save();
  }
  chooseProduct(id) {
    if (!this.marked || this.animating || this.mode === 'guided' && !this.watched) return;
    this.edit(); this.selected = id; this.done = false; if (this.mode === 'inquiry') this.inquiryDone = false;
    this.feedback = this.mode === 'inquiry' ? 'Şimdi seçiminin gerekçesini belirt.' : 'Son formülü seçtin. Seçimini doğrula.'; this.render(); this.save();
    if (this.mode === 'inquiry') { this.phoneView = 'reason'; this.renderPhone(); }
  }
  watch() {
    if (!this.marked || this.animating) return;
    this.animating = true; this.watched = this.done = false; this.selected = null; this.feedback = 'Aynı atomun iki formülde de kullanıldığını takip et.'; this.render();
    this.timer = setTimeout(() => { if (this.disposed) return; this.animating = false; this.watched = true; this.phoneView = 'product'; this.feedback = 'İşaretli atomun yer aldığı son formülü seç ve doğrula.'; this.render(); this.save(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100);
  }
  finish() {
    if (!this.watched || !this.selected) return;
    this.done = this.selected === this.product.id; this.feedback = this.done ? 'Aynı atom son formülde yeniden kullanıldı. Atomun izini başarıyla takip ettin.' : 'İşaretli atomun yer aldığı son formülü yeniden incele.';
    this.render(); this.save();
    if (this.done) this.state.completeStage(3, { targetId: this.target.id, element: this.target.e, source: this.source.id, product: this.product.id, inquiry: true, guided: true, testMode: Boolean(this.testMode) });
  }
  autoComplete() {
    this.testMode = true;
    clearTimeout(this.timer); this.animating = false; this.mode = 'guided'; this.marked = this.inquiryDone = this.watched = true; this.selected = this.product.id; this.finish();
  }
  render() {
    const el = this.el; el('task').textContent = `${this.target.e} atomu hangi son formülde kullanıldı?`;
    el('mode').textContent = this.mode === 'inquiry' ? 'Önce tahmin et, sonra gerekçeni seç.' : 'Aynı atomun başlangıçtan sonuca geçişini takip et.';
    el('inquiry-step').classList.toggle('active', this.mode === 'inquiry'); el('guided-step').classList.toggle('active', this.mode === 'guided');
    el('reasons').hidden = el('check').hidden = this.mode !== 'inquiry'; el('check').disabled = !this.selected || !this.reason;
    el('continue').hidden = !this.inquiryDone || this.mode !== 'inquiry'; el('watch').hidden = el('finish').hidden = this.mode !== 'guided';
    el('watch').disabled = !this.marked || this.animating || this.done; el('finish').disabled = !this.watched || !this.selected || this.done;
    this.root.querySelectorAll('[data-reason]').forEach(b => { b.disabled = !this.selected; b.setAttribute('aria-pressed', String(b.dataset.reason === this.reason)); });
    const build = (host, items, before) => {
      host.replaceChildren(); items.forEach(p => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'trace-formula-card';
        const formula = document.createElement('strong'); formula.className = 'chemical-formula'; FormulaChemistry.renderFormula(formula, p.formula);
        const symbols = document.createElement('span'); symbols.className = 'trace-atom-list';
        p.atoms.forEach(a => { const token = document.createElement('span'); token.textContent = a.e;
          const marked = a.id === this.target.id && this.marked && (before || this.watched || this.inquiryDone);
          if (marked) { token.className = 'marked-atom'; token.setAttribute('aria-label', a.e + ' · işaretli atom'); } symbols.append(token); });
        b.append(formula, symbols); b.setAttribute('aria-pressed', String(before ? this.marked && p.id === this.source.id : p.id === this.selected));
        b.disabled = !before && (!this.marked || this.mode === 'guided' && !this.watched || this.animating);
        b.onclick = () => before ? this.chooseSource(p.id) : this.chooseProduct(p.id); host.append(b);
      });
    };
    build(el('sources'), this.frames[0], true); build(el('products'), this.frames[1], false);
    el('path').hidden = this.mode !== 'guided' || !this.marked || (!this.animating && !this.watched);
    el('path').replaceChildren();
    [this.source.formula, this.target.e, this.product.formula].forEach((value, index) => {
      if (index) el('path').append(document.createTextNode('  →  '));
      const label = document.createElement('span'); label.className = 'chemical-formula';
      FormulaChemistry.renderFormula(label, value); el('path').append(label);
    }); el('path').classList.toggle('tracking', this.animating);
    el('feedback').textContent = this.feedback; el('feedback').classList.toggle('good', this.inquiryDone || this.done);
    el('count').hidden = !(this.mode === 'inquiry' && this.inquiryDone || this.done);
    const count = items => items.flatMap(p => p.atoms).filter(a => a.e === this.target.e).length;
    el('count').textContent = `${this.target.e} atom sayısı: önce ${count(this.frames[0])} · sonra ${count(this.frames[1])}`;
    MebiDesignSystem.applyActivity(this.root);
    this.renderPhone();
  }
  renderPhone() {
    const phone = LandscapeTasks.active();
    if (this.mode === 'guided' && this.phoneView === 'reason') this.phoneView = 'source';
    this.root.dataset.view = this.phoneView;
    this.root.querySelector('.workshop-header h2').textContent = phone ? (this.mode === 'inquiry' ? 'Tahmin et ve gerekçeni seç' : 'Aynı atomun izini takip et') : 'Bir atom, iki formül';
    this.root.classList.toggle('is-tracking', Boolean(this.animating));
    this.root.classList.toggle('is-done', Boolean(this.done));
    this.el('sources').parentElement.hidden = phone && this.phoneView !== 'source';
    this.el('products').parentElement.hidden = phone && this.phoneView !== 'product';
    this.el('view-product').disabled = !this.marked || this.mode === 'guided' && !this.watched;
    this.el('view-reason').hidden = this.mode !== 'inquiry'; this.el('view-reason').disabled = !this.selected;
    for (const view of ['source', 'product', 'reason']) this.el('view-' + view).setAttribute('aria-pressed', String(this.phoneView === view));
    LandscapeTasks.paginate(this.el('sources'), 3); LandscapeTasks.paginate(this.el('products'), 3);
    if (phone) this.container.scrollTop = 0;
  }
  save() { this.state.atomTraceDraft = { reactionId: this.reaction.id, targetId: this.target.id, mode: this.mode, marked: this.marked, selected: this.selected, reason: this.reason, inquiryDone: this.inquiryDone, watched: this.watched, done: this.done, feedback: this.feedback }; }
  dispose() { this.disposed = true; this.unsubscribeViewport?.(); clearTimeout(this.timer); }
}
window.StudentAtomTraceManager = StudentAtomTraceManager;
