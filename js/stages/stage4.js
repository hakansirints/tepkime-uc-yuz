/* AŞAMA 4 — Modeli çalıştır ve test et: hatalar görünür olur, öğrenci modeli düzeltir. */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State, V = () => T.Viewer;

  const Stage4 = {
    enter(body) {
      this.body = body;
      this.showRun();
    },
    showRun() {
      const body = this.body;
      this.cleanup();
      body.innerHTML = '';
      const r = S.reaction;
      // kırmızı halka açıklaması yalnızca kayıp / yoktan çıkan atom varsa görünür
      this.redEl = h('span.t4-red', { hidden: true }, h('i'), 'Kırmızı halka: yok olan ya da yoktan çıkan atom');
      this.panelEl = h('div.mpanel', null,
        h('div.ptitle', null, h('span.n', { text: '▶' }), h('span.ptxt', { text: 'Modelinin çalıştırılması' }), this.redEl),
        h('div.pempty', { text: '“Modeli çalıştır” düğmesine bas.' }));
      this.side = h('div.side-card.t4-side');
      body.appendChild(h('div.grid-track', null, this.panelEl, this.side));
      this.panel = V().addPanel(this.panelEl, { fitPad: 1.08 });
      this.panel.onUpdate((dt) => { if (this.rearr) this.rearr.update(dt); });

      // A modeli: başlık · tek satır sonuç · kontrol listesi · (kısa açıklama) · tek ana düğme + küçük bağlantı
      this.statEl = h('div.t4-stat');
      this.critEl = h('div.t4-chk');
      this.fbEl = h('div');
      this.countEl = this.critEl; // eski adla erişen öğretici adımları için
      this.actEl = h('div.t4-act');
      this.runBtn = h('button.btn.primary.block', { text: '▶ Modeli çalıştır' });
      this.runBtn.addEventListener('click', () => this.run());
      this.side.appendChild(h('h3', { html: '🧪 Test' }));
      this.side.appendChild(this.statEl);
      this.side.appendChild(this.critEl);
      this.side.appendChild(this.fbEl);
      this.side.appendChild(this.actEl);
      this.renderCriteria(null);
      this.showStart();
      T.App.task({ target: this.side, text: 'Modelini çalıştır ve test et', hint: 'Sağdaki <b>▶ Modeli çalıştır</b> düğmesine bas; sonra hangi ölçütlerin geçtiğine bak.' });
      if (S.data.done[4]) {
        this.setStat('ok', '✓ Bu aşamayı tamamladın');
        this.setActions(this.nextButton(), this.rerunLink());
      } else {
        this.setStat('idle', 'Henüz test edilmedi');
        this.setActions(this.runBtn);
      }
      void r;
    },
    setStat(kind, text) { this.statEl.className = 't4-stat ' + kind; this.statEl.textContent = text; },
    setActions(...els) { this.actEl.innerHTML = ''; els.forEach((e) => e && this.actEl.appendChild(e)); },
    rerunLink() {
      this.runBtn = h('button.t4-link', { text: '↺ Yeniden çalıştır' });
      this.runBtn.addEventListener('click', () => this.run());
      return this.runBtn;
    },
    /* Açılışta modelin başlangıç hâlini (tepkime öncesi) göster; canlandırma düğmeyle başlar */
    showStart() {
      const m = S.data.model;
      if (!m || !Object.keys(m.before || {}).length) return;
      if (this.rearr) this.rearr.dispose();
      this.rearr = new T.Rearranger(this.panel, m.before, m.after || {}, { duration: 6 });
      this.panel.fit(true, this.rearr.fitBoth());
      this.panelEl.querySelector('.pempty').textContent = '';
    },
    /** res: null (boş), 'run' (çalışıyor: daireler döner) ya da checkModel sonucu */
    renderCriteria(res) {
      const names = ['Atom türleri', 'Atom sayıları', 'İyon / kristal gösterimi', 'Türler ve sayılar'];
      const full = ['Atom türleri korunuyor.', 'Atom sayıları korunuyor.', 'Sulu iyonlar ayrı, katı çökeltiler kristal olarak gösteriliyor.', 'Kimyasal türler ve tanecik sayıları tepkimeye uygun.'];
      const done = res && res !== 'run' && res.fb && res.fb.title !== 'Model eksik';
      this.critEl.innerHTML = '';
      names.forEach((nm, i) => {
        const c = done ? res.criteria[i] : null;
        const st = res === 'run' ? 'w' : c ? (c.pass ? 'p' : 'f') : '';
        const row = h('div.t4-row' + (st ? '.' + st : ''), { title: full[i] },
          h('span.ic', { 'aria-hidden': 'true', text: st === 'p' ? '✓' : st === 'f' ? '✗' : '' }),
          h('span.tx', null, nm, st === 'f' ? h('small', { html: this._why(c.key, res) }) : null),
          h('span.sr-only', { text: st === 'p' ? 'geçti' : st === 'f' ? 'geçmedi' : '' }));
        this.critEl.appendChild(row);
      });
    },
    /** Geçmeyen ölçüt için kısa neden */
    _why(key, res) {
      const c = res.counts, nm = (e) => T.ELEMENTS[e].name;
      if (key === 'types') {
        const extra = c.els.filter((e) => c.after[e] && !c.before[e]);
        const miss = c.els.filter((e) => c.before[e] && !c.after[e]);
        return extra.length ? 'Sonrada yeni atom: ' + extra.map(nm).join(', ') : 'Sonrada kaybolan: ' + miss.map(nm).join(', ');
      }
      if (key === 'counts') return (c.mismatch || []).map((e) => `${e}: önce ${c.before[e] || 0}, sonra ${c.after[e] || 0}`).join(' · ');
      if (key === 'rep') return 'Çözünen madde iyon, çökelti kristal olmalı';
      return 'Tanecik türlerini ya da sayılarını kontrol et';
    },
    run() {
      const m = S.data.model;
      this.fbEl.innerHTML = '';
      this.redEl.hidden = true;
      this.renderCriteria('run');
      this.setStat('run', 'Model çalışıyor… atomları izle');
      const busy = h('button.btn.primary.block', { text: 'Çalışıyor…', disabled: true });
      this.runBtn = busy;
      this.setActions(busy);
      this.panelEl.querySelector('.pempty').textContent = '';
      if (this.rearr) this.rearr.dispose();
      this.rearr = new T.Rearranger(this.panel, m.before, m.after, { duration: 6 });
      this.panel.fit(true, this.rearr.fitBoth());
      S.data.testRuns = (S.data.testRuns || 0) + 1; S.save();
      T.App.task({ target: this.panelEl, text: 'Atomların nereye gittiğini izle', hint: 'Kırmızı halkalı atom var mı? Varsa o atom yok oluyor ya da yoktan ortaya çıkıyor demektir.' });
      this.rearr.play(() => this.showResult());
    },
    showResult() {
      const r = S.reaction, m = S.data.model;
      const res = T.Eval.checkModel(m, { before: r.before, after: r.after });
      this.renderCriteria(res);
      const failN = res.criteria.filter((c) => !c.pass).length;
      const incomplete = res.fb.title === 'Model eksik';
      this.redEl.hidden = res.criteria[0].pass && res.criteria[1].pass;
      // kısa açıklama (öğreticinin yönlendiren sorusu) — kutusuz, küçük yazı
      this.fbEl.innerHTML = '';
      if (!res.pass) this.fbEl.appendChild(h('p.t4-note', { html: res.fb.text }));
      if (res.pass) {
        this.setStat('ok', '✓ Testi geçti');
        T.Audio.success();
        T.App.complete(4);
        this.setActions(this.nextButton(), this.rerunLink());
        T.App.task({ target: this.side, text: 'Modelin testi geçti', hint: 'Sağdaki <b>Üç gösterime geç</b> düğmesiyle devam et.' });
      } else {
        this.setStat('bad', incomplete ? '✗ Model eksik' : `✗ ${failN} ölçüt geçmedi`);
        T.Audio.error();
        T.App.task({ target: this.side, text: 'Modelinde sorun var: hatayı bul', hint: 'Kırmızı ✗ ölçütlere ve altlarındaki nedene bak, sonra <b>✎ Modeli düzenle</b> düğmesine bas.' });
        const edit = h('button.btn.primary.block', { text: '✎ Modeli düzenle' });
        edit.addEventListener('click', () => this.showEdit());
        this.setActions(edit, this.rerunLink());
      }
    },
    nextButton() {
      const b = h('button.btn.success.block.pulse', { text: 'Üç gösterime geç →' });
      b.addEventListener('click', () => T.App.go(5));
      return b;
    },
    showEdit() {
      const body = this.body;
      this.cleanup();
      body.innerHTML = '';
      const r = S.reaction;
      this.builder = new T.Builder(body, {
        reaction: r, pool: T.shuffleSeed(r.pool, r.no), model: S.data.model, showCounter: true,
        onChange: () => S.save()
      });
      const back = h('button.btn.primary', { text: '▶ Düzenlenmiş modeli test et' });
      back.addEventListener('click', () => { this.showRun(); setTimeout(() => this.run(), 200); });
      body.appendChild(h('div.ws-footer', null, h('span.grow'), back));
      T.App.task({ target: this.builder.regionsEl, text: 'Modelini düzelt ve yeniden test et',
        hint: 'Taneciklere dokunarak çıkar, havuzdan ekle. <b>Atom sayacı</b> yardımcı olur; türlerin tepkimeye uygunluğunu sen düşün. Bitince <b>▶ Düzenlenmiş modeli test et</b>.' });
    },
    cleanup() {
      if (this.rearr) { this.rearr.dispose(); this.rearr = null; }
      if (this.builder) { this.builder.destroy(); this.builder = null; }
      if (this.panel) { V().removePanel(this.panel); this.panel = null; }
    },
    leave() { this.cleanup(); }
  };
  T.Stage4 = Stage4;
})(window.TUY);
