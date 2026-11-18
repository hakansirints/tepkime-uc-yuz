/* AŞAMA 6 — Temsil değiştir: iki gösterim verilir, eksik olan üçüncüsünü öğrenci oluşturur.
   Görev 1: makro + sembolik → tanecik modeli
   Görev 2: tanecik modeli + sembolik → makroskobik gözlem
   Görev 3: makro + tanecik modeli → denklem (katsayı + hâl) */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State, V = () => T.Viewer;

  const TASKS = [
    { key: 'micro', title: 'Görev 1', sub: 'Tanecik modelini kur', ids: ['pbno32_ki', 'agno3_ki', 'cacl2_na2co3'] },
    { key: 'macro', title: 'Görev 2', sub: 'Gözlemi tahmin et', ids: ['cuno32_naoh', 'cacl2_na2co3', 'agno3_hcl'] },
    { key: 'sym', title: 'Görev 3', sub: 'Denklemi tamamla', ids: ['na2co3_hcl', 'caco3_hcl', 'nahco3_hcl'] }
  ];
  const PRECIP_COLOR = { pbno32_ki: 'parlak sarı', agno3_hcl: 'beyaz', cuno32_naoh: 'mavi', cacl2_na2co3: 'beyaz', agno3_ki: 'açık sarı', cuno32_na2co3: 'mavi-yeşil' };

  const precipName = (r) => r.precipName || PRECIP_COLOR[r.id];
  function macroSentence(r) {
    const o = r.obs;
    if (o.type === 'precipitate') return `Karışımda ${precipName(r) || 'renkli'} bir katı (çökelti) oluşur ve yavaş yavaş kabın dibine çöker.`;
    if (o.type === 'gas') return r.fixed.solid ? 'Katı parçaların yüzeyinden gaz kabarcıkları çıkar, katı zamanla küçülür.' : 'Karışımda gaz kabarcıkları oluşur.';
    if (o.type === 'smoke') return 'Kabın ağzında beyaz bir duman oluşur, karışım ısınır.';
    return 'Karışım berrak kalır; termometre sıcaklığın arttığını gösterir.';
  }

  const Stage6 = {
    enter(body) {
      this.body = body;
      S.data.tasks6 = S.data.tasks6 || {};
      const main = S.data.reaction;
      // öğreticide yalnızca öğreticiye ayrılmış tepkimeler kullanılır (gerçek görevlerin cevabı verilmez)
      this.rx = T.Tutorial && T.Tutorial.active
        ? T.TUTORIAL.tasks6.map((id) => T.REACTIONS[id])
        : TASKS.map((t) => T.pickOther(t.ids, main));
      this.tabsEl = h('div.task-tabs');
      this.area = h('div', { style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column', gap: '10px' } });
      body.appendChild(this.tabsEl);
      body.appendChild(this.area);
      const first = TASKS.findIndex((t) => !(S.data.tasks6[t.key] && S.data.tasks6[t.key].ok));
      this.show(first < 0 ? 0 : first);
    },
    renderTabs() {
      this.tabsEl.innerHTML = '';
      TASKS.forEach((t, i) => {
        const done = S.data.tasks6[t.key] && S.data.tasks6[t.key].ok;
        const b = h('button.task-tab' + (i === this.idx ? '.on' : '') + (done ? '.done' : ''), null,
          h('b', { text: t.title + ' · ' + t.sub }),
          h('span.muted', { text: this.rx[i].name }));
        b.addEventListener('click', () => this.show(i));
        this.tabsEl.appendChild(b);
      });
    },
    show(i) {
      this.cleanup();
      this.idx = i;
      this.renderTabs();
      this.area.innerHTML = '';
      const t = TASKS[i], r = this.rx[i];
      this.r = r;
      if (t.key === 'micro') this.taskMicro(r);
      else if (t.key === 'macro') this.taskMacro(r);
      else this.taskSym(r);
    },
    record(ok) {
      const t = TASKS[this.idx];
      const rec = S.data.tasks6[t.key] || { id: this.r.id, tries: 0, ok: false };
      rec.id = this.r.id; rec.tries = (rec.tries || 0) + 1;
      if (ok) rec.ok = true;
      S.data.tasks6[t.key] = rec;
      S.save();
      this.renderTabs();
      return rec;
    },
    afterSuccess(fbEl) {
      const allDone = TASKS.every((t) => S.data.tasks6[t.key] && S.data.tasks6[t.key].ok);
      if (allDone) {
        T.App.complete(6);
        const b = h('button.btn.success.block.pulse', { text: 'Son aşama: Bozuk modeli onar →', style: { marginTop: '6px' } });
        b.addEventListener('click', () => T.App.go(7));
        fbEl.appendChild(b);
      } else {
        const nx = TASKS.findIndex((t) => !(S.data.tasks6[t.key] && S.data.tasks6[t.key].ok));
        const b = h('button.btn.primary.block', { text: 'Sıradaki göreve geç →', style: { marginTop: '6px' } });
        b.addEventListener('click', () => this.show(nx));
        fbEl.appendChild(b);
      }
    },

    /* ---------- ortak sütunlar ---------- */
    colMacro(r, state, withToggle, noSentence) {
      const el = h('div.mpanel', null, h('div.pempty', { text: '' }));
      const col = h('div.rep-col', null, h('div.rep-h.macro', null, h('b', { text: '👁 Makroskobik' }), h('span', { text: 'Deneyde görülen' })));
      let tg = null;
      if (withToggle) {
        tg = h('div.target-switch', null,
          h('button.btn.sm.ghost', { 'data-s': 'before', text: 'Önce' }),
          h('button.btn.sm.ghost.on', { 'data-s': 'after', text: 'Sonra' }));
        col.appendChild(tg);
      }
      col.appendChild(el);
      if (!noSentence) col.appendChild(h('div.small', { style: { padding: '2px 4px' }, text: macroSentence(r) }));
      return {
        col,
        mount: () => {
          const p = V().addPanel(el, { near: 0.005, minDist: 0.1, labelRoom: 0, fitPad: 1.05 });
          const mv = new T.MacroView(p, r, state);
          this.panels.push(p); this.macros.push(mv);
          if (tg) tg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
            mv.setState(b.dataset.s);
            tg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
          }));
          return mv;
        }
      };
    },
    colMicro(r) {
      const el = h('div.mpanel.aq', null, h('div.pempty', { text: '' }));
      const col = h('div.rep-col', null, h('div.rep-h.micro', null, h('b', { text: '⚛ Tanecik modeli' }), h('span', { text: 'Atom, iyon, molekül' })), el);
      return {
        col,
        mount: () => { const p = V().addPanel(el, { fitPad: 1.08 }); T.microPair(p, r.before, r.after); this.panels.push(p); }
      };
    },
    colSym(r) {
      const eq = h('div.equation');
      T.renderEquation(eq, r, null);
      const col = h('div.rep-col', null, h('div.rep-h.sym', null, h('b', { text: '✎ Sembolik' }), h('span', { text: 'Kimyasal denklem' })),
        h('div.sym-panel', null, eq, h('div.legend', { html: '(k) katı · (s) sıvı · (g) gaz · (suda) sulu çözelti' })));
      return { col, eq };
    },
    qCol(title, sub) {
      const box = h('div.qmark', null, h('div.big-q', { text: '?' }), h('div', { style: { textAlign: 'center' }, html: '<b>' + title + '</b><br><span class="small muted">' + sub + '</span>' }));
      const col = h('div.rep-col', null, box);
      return { col, box };
    },

    /* ---------- Görev 1: tanecik modeli eksik ---------- */
    taskMicro(r) {
      const A = this.area;
      A.appendChild(h('div.feedback.info', { style: { margin: '0' }, html: `<b>Görev 1 · ${r.name}</b>Deneyin sonucu ve denklemi verildi. <b>Tepkime öncesi</b> tanecikler hazır. Sen <b>tepkime sonrası</b> tanecikleri yerleştir.` }));
      const m = this.colMacro(r, 'after', false, true), s = this.colSym(r);
      s.col.querySelector('.sym-panel').appendChild(h('div.small', { style: { textAlign: 'center', color: 'var(--macro-ink)' }, text: '👁 ' + macroSentence(r) }));
      const strip = h('div.given-strip', null, m.col, s.col);
      A.appendChild(strip);
      m.mount();
      const holder = h('div', { style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' } });
      A.appendChild(holder);
      const model = { before: Object.assign({}, r.before), after: {} };
      const prev = S.data.tasks6.micro && S.data.tasks6.micro.model;
      if (prev && prev.id === r.id) model.after = Object.assign({}, prev.after);
      this.builder = new T.Builder(holder, {
        reaction: r, pool: T.shuffleSeed(r.pool, r.no + 7), model, lockBefore: true, showCounter: true,
        onChange: () => { S.data.tasks6.micro = Object.assign(S.data.tasks6.micro || {}, { model: { id: r.id, after: model.after } }); S.save(); }
      });
      const fb = h('div');
      this.builder.rightSlot.appendChild(fb);
      const chk = h('button.btn.primary.block', { text: '✓ Modelimi kontrol et', style: { marginTop: '8px' } });
      this.builder.rightSlot.insertBefore(chk, fb);
      chk.addEventListener('click', () => {
        const res = T.Eval.checkModel(model, { before: r.before, after: r.after });
        fb.innerHTML = '';
        const rec = this.record(res.pass);
        if (res.pass) {
          T.Audio.success();
          fb.appendChild(h('div.feedback.ok', { html: '<b>✓ Tanecik modeli doğru</b>Makroskobik gözlemi ve denklemi tanecik düzeyine çevirdin.' }));
          this.builder.playMid();
          this.afterSuccess(fb);
        } else {
          T.Audio.error();
          let extra = '';
          if (rec.tries >= 3) extra = '<br><span class="small">İpucu: Denklemde <b>(k)</b> ile gösterilen madde kristal olarak, <b>(suda)</b> ile gösterilenler ayrı iyonlar olarak yer alır.</span>';
          fb.appendChild(h('div.feedback.' + res.fb.kind, { html: '<b>' + res.fb.title + '</b>' + res.fb.text + extra }));
        }
      });
    },

    /* ---------- Görev 2: makroskobik eksik ---------- */
    taskMacro(r) {
      const A = this.area;
      A.appendChild(h('div.feedback.info', { style: { margin: '0' }, html: `<b>Görev 2 · ${r.name}</b>Tanecik modeli ve denklem verildi. İki çözelti karıştırıldığında kapta <b>ne gözlenir</b>? Tahmin et.` }));
      const q = this.qCol('Makroskobik gözlem', 'Kapta ne görürsün?');
      const mi = this.colMicro(r), s = this.colSym(r);
      const grid = h('div.grid-tasks', null, q.col, mi.col, s.col);
      A.appendChild(grid);
      mi.mount();
      // seçenekler
      const correct = macroSentence(r);
      const opts = [
        correct,
        'Karışımda gaz kabarcıkları oluşur.',
        'Karışım berrak kalır; termometre sıcaklığın arttığını gösterir.',
        'Hiçbir değişim olmaz; çözeltiler yalnızca birbirine karışır.'
      ];
      if (r.obs.type === 'precipitate') opts.splice(1, 0, `Karışımda ${precipName(r) === 'beyaz' ? 'sarı' : 'beyaz'} bir katı oluşur ve dibe çöker.`);
      const list = T.shuffleSeed(opts, r.no + 11);
      const wrap = h('div.opt-list');
      const fb = h('div');
      list.forEach((txt) => {
        const b = h('button.opt', { text: txt });
        b.addEventListener('click', () => {
          wrap.querySelectorAll('.opt').forEach((x) => x.classList.remove('wrong'));
          fb.innerHTML = '';
          const ok = txt === correct;
          this.record(ok);
          if (ok) {
            b.classList.add('right');
            wrap.querySelectorAll('.opt').forEach((x) => { x.disabled = true; });
            T.Audio.success();
            fb.appendChild(h('div.feedback.ok', { html: '<b>✓ Doğru tahmin</b>Modelde ve denklemde <b>(k)</b> ile gösterilen kristal, kapta gözle görülen katıdır. İşte deneyin sonucu:' }));
            // makro görünümü ortaya çıkar
            const el = h('div.mpanel', { style: { minHeight: '170px', flex: '1' } }, h('div.pempty', { text: '' }));
            q.box.innerHTML = '';
            q.box.style.borderStyle = 'solid';
            q.box.style.justifyContent = 'flex-start';
            q.box.appendChild(h('div.rep-h.macro', null, h('b', { text: '👁 Makroskobik' }), h('span', { text: 'Deneyin sonucu' })));
            q.box.appendChild(el);
            q.box.appendChild(fb);
            const p = V().addPanel(el, { near: 0.005, minDist: 0.1, labelRoom: 0, fitPad: 1.05 });
            this.panels.push(p); this.macros.push(new T.MacroView(p, r, 'after'));
            this.afterSuccess(fb);
          } else {
            b.classList.add('wrong');
            T.Audio.error();
            const hint = /gaz/.test(txt) ? 'Tepkime sonrası modelde bir gaz molekülü var mı? Denklemde <b>(g)</b> ile gösterilen bir madde var mı?'
              : /Hiçbir/.test(txt) ? 'Modelde tepkime öncesi ve sonrası aynı mı? Yeni bir tür oluşuyor mu?'
                : /berrak/.test(txt) ? 'Denklemde <b>(k)</b> ile gösterilen bir ürün var mı? Katı oluşursa kap berrak kalır mı?'
                  : 'Bir katı oluştuğu doğru. Peki rengi? Tanecik modelinde kristali oluşturan iyonlara bak. Bu iyonu içeren çözeltiler ve katılar laboratuvarda hangi renkte görünür?';
            fb.appendChild(h('div.feedback.warn', { html: '<b>Tekrar düşün</b>' + hint }));
          }
        });
        wrap.appendChild(b);
      });
      q.box.appendChild(wrap);
      q.box.appendChild(fb);
    },

    /* ---------- Görev 3: sembolik eksik ---------- */
    taskSym(r) {
      const A = this.area;
      A.appendChild(h('div.feedback.info', { style: { margin: '0' }, html: `<b>Görev 3 · ${r.name}</b>Deneyin sonucu ve tanecik modeli verildi. Denklemdeki <b>katsayıları</b> ve <b>fiziksel hâlleri</b> seç. Katsayıyı tanecik modelindeki sayılardan bulabilirsin.` }));
      const m = this.colMacro(r, 'after', true), mi = this.colMicro(r);
      const q = this.qCol('Sembolik gösterim', 'Katsayı ve hâl seç');
      A.appendChild(h('div.grid-tasks', null, m.col, mi.col, q.col));
      m.mount(); mi.mount();
      q.box.innerHTML = '';
      q.box.style.justifyContent = 'flex-start';
      q.box.appendChild(h('div.rep-h.sym', null, h('b', { text: '✎ Sembolik' }), h('span', { text: 'Denklemi tamamla' })));
      const fill = h('div.eq-fill');
      const terms = T.eqTerms(r).filter((t) => !t.cat);
      const ctl = {};
      const mkTerm = (t) => {
        const c = h('select.coef', null, ...[1, 2, 3, 4].map((n) => h('option', { value: String(n), text: String(n) })));
        const st = h('select.state', null, h('option', { value: '', text: '(?)' }), ...['k', 's', 'g', 'suda'].map((x) => h('option', { value: x, text: '(' + x + ')' })));
        const el = h('span.term', null, c, h('span', { text: t.f }), st);
        ctl[t.key] = { c, st, el, t };
        c.addEventListener('change', () => el.classList.remove('bad', 'good'));
        st.addEventListener('change', () => el.classList.remove('bad', 'good'));
        return el;
      };
      const rs = terms.filter((t) => t.side === 'r'), ps = terms.filter((t) => t.side === 'p');
      rs.forEach((t, i) => { if (i) fill.appendChild(h('span.eq-op', { text: '+' })); fill.appendChild(mkTerm(t)); });
      fill.appendChild(h('span.eq-arrow', { text: '→' }));
      ps.forEach((t, i) => { if (i) fill.appendChild(h('span.eq-op', { text: '+' })); fill.appendChild(mkTerm(t)); });
      q.box.appendChild(fill);
      q.box.appendChild(h('div.legend', { html: '(k) katı · (s) sıvı · (g) gaz · (suda) sulu çözelti' }));
      const chk = h('button.btn.primary.block', { text: '✓ Denklemi kontrol et' });
      const fb = h('div');
      q.box.appendChild(chk);
      q.box.appendChild(fb);
      chk.addEventListener('click', () => {
        let coefBad = 0, stBad = 0;
        const gcd = (a, b) => (b ? gcd(b, a % b) : a);
        const vals = terms.map((t) => +ctl[t.key].c.value);
        const g = vals.reduce((a, b) => gcd(a, b));
        terms.forEach((t) => {
          const k = ctl[t.key];
          const cOk = +k.c.value / g === t.c;
          const sOk = k.st.value === t.s;
          if (!cOk) coefBad++;
          if (!sOk) stBad++;
          k.el.classList.toggle('bad', !(cOk && sOk));
          k.el.classList.toggle('good', cOk && sOk);
        });
        fb.innerHTML = '';
        const ok = !coefBad && !stBad;
        this.record(ok);
        if (ok) {
          T.Audio.success();
          fb.appendChild(h('div.feedback.ok', { html: '<b>✓ Denklem tamam</b>Gözlemi ve tanecik modelini sembolik gösterime çevirdin. Katsayılar atomların korunduğunu, hâl sembolleri ise kapta ne gördüğünü anlatır.' }));
          this.afterSuccess(fb);
        } else {
          T.Audio.error();
          const msgs = [];
          if (coefBad) msgs.push('Kırmızı çerçeveli terimlerden bazılarının <b>katsayısını</b> tanecik modelindeki sayılarla karşılaştır. Örneğin bir taraftaki klor atomlarını say, öbür taraftakiyle eşit mi?');
          if (stBad) msgs.push('Bazı <b>fiziksel hâl</b> seçimlerini yeniden düşün: Kapta kabarcık olarak gördüğün madde hangi hâldedir? Suda iyonlarına ayrılmış madde nasıl gösterilir?');
          fb.appendChild(h('div.feedback.warn', { html: '<b>Henüz değil</b>' + msgs.join('<br>') }));
        }
      });
    },

    cleanup() {
      (this.macros || []).forEach((m) => m.dispose());
      (this.panels || []).forEach((p) => V().removePanel(p));
      if (this.builder) { this.builder.destroy(); this.builder = null; }
      this.macros = []; this.panels = [];
    },
    leave() { this.cleanup(); }
  };
  T.macroSentence = macroSentence;
  T.Stage6 = Stage6;
})(window.TUY);
