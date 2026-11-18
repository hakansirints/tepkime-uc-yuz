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
      this.panelEl = h('div.mpanel', null,
        h('div.ptitle', null, h('span.n', { text: '▶' }), 'Modelinin çalıştırılması', h('span.tag', { text: 'Kırmızı atomlar: yok olan ya da yoktan ortaya çıkan atomlar' })),
        h('div.pempty', { text: '“Modeli çalıştır” düğmesine bas.' }));
      this.side = h('div.side-card');
      body.appendChild(h('div.grid-track', null, this.panelEl, this.side));
      this.panel = V().addPanel(this.panelEl, { fitPad: 1.08 });
      this.panel.onUpdate((dt) => { if (this.rearr) this.rearr.update(dt); });

      this.critEl = h('ul.rules');
      this.countEl = h('div');
      this.fbEl = h('div');
      this.runBtn = h('button.btn.primary.block', { text: '▶ Modeli çalıştır ve test et' });
      this.runBtn.addEventListener('click', () => this.run());
      this.side.appendChild(h('h3', { html: '🧪 Test ölçütleri' }));
      this.side.appendChild(this.critEl);
      this.side.appendChild(this.runBtn);
      this.side.appendChild(this.fbEl);
      this.side.appendChild(this.countEl);
      this.renderCriteria(null);
      if (S.data.done[4]) {
        this.fbEl.appendChild(h('div.feedback.ok', { html: '<b>Bu aşamayı tamamladın</b>Modelin daha önce doğrulandı. İstersen yeniden çalıştırabilirsin.' }));
        this.fbEl.appendChild(this.nextButton());
      }
      void r;
    },
    renderCriteria(res) {
      const labels = ['Atom türleri korunuyor.', 'Atom sayıları korunuyor.', 'Sulu iyonlar ayrı, katı çökeltiler kristal olarak gösteriliyor.', 'Kimyasal türler ve tanecik sayıları tepkimeye uygun.'];
      this.critEl.innerHTML = '';
      labels.forEach((l, i) => {
        const li = h('li', { text: l });
        if (res) li.classList.add(res.criteria[i].pass ? 'pass' : 'fail');
        this.critEl.appendChild(li);
      });
    },
    run() {
      const m = S.data.model;
      this.runBtn.disabled = true;
      this.fbEl.innerHTML = '';
      this.countEl.innerHTML = '';
      this.renderCriteria(null);
      this.panelEl.querySelector('.pempty').textContent = '';
      if (this.rearr) this.rearr.dispose();
      this.rearr = new T.Rearranger(this.panel, m.before, m.after, { duration: 6 });
      this.panel.fit(true, this.rearr.fitBoth());
      S.data.testRuns = (S.data.testRuns || 0) + 1; S.save();
      this.fbEl.appendChild(h('div.feedback.info', { html: '<b>Model çalışıyor…</b>Atomların nereye gittiğini izle.' }));
      this.rearr.play(() => this.showResult());
    },
    showResult() {
      const r = S.reaction, m = S.data.model;
      const res = T.Eval.checkModel(m, { before: r.before, after: r.after });
      this.runBtn.disabled = false;
      this.runBtn.textContent = '▶ Yeniden çalıştır';
      this.renderCriteria(res);
      this.fbEl.innerHTML = '';
      this.fbEl.appendChild(h('div.feedback.' + res.fb.kind, { html: '<b>' + (res.pass ? '✓ ' : '') + res.fb.title + '</b>' + res.fb.text }));
      // sayaç tablosu
      const c = res.counts;
      const rows = c.els.map((e) => {
        const b = c.before[e] || 0, a = c.after[e] || 0, ok = b === a;
        return `<tr class="${ok ? 'okr' : 'mis'}"><td class="el"><span class="dot" style="background:${U.hex(T.ELEMENTS[e].color)}"></span>${e}</td><td>${b}</td><td>${a}</td><td class="st">${ok ? '✓' : '✗'}</td></tr>`;
      }).join('');
      this.countEl.innerHTML = `<h3 style="margin-top:12px">🔢 Atom sayımı</h3><table class="counter-table"><thead><tr><th style="text-align:left">Atom</th><th>Önce</th><th>Sonra</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
      if (res.pass) {
        T.Audio.success();
        T.App.complete(4);
        this.fbEl.appendChild(this.nextButton());
      } else {
        T.Audio.error();
        const edit = h('button.btn.block', { text: '✎ Modeli düzenle', style: { marginTop: '6px' } });
        edit.addEventListener('click', () => this.showEdit());
        this.fbEl.appendChild(edit);
      }
    },
    nextButton() {
      const b = h('button.btn.success.block.pulse', { text: 'Üç gösterime geç →', style: { marginTop: '6px' } });
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
      body.appendChild(h('div.ws-footer', null, h('span.grow', { html: 'Modelini düzelt. <b>Atom sayacı</b> sana yardımcı olabilir; ama türlerin tepkimeye uygun olup olmadığını sen düşünmelisin.' }), back));
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
