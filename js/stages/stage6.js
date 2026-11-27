/* AŞAMA 6 — Temsil değiştir: iki gösterim verilir, eksik olan üçüncüsünü öğrenci oluşturur.
   Görev 1: makro + sembolik → tanecik modeli
   Görev 2: tanecik modeli + sembolik → makroskobik gözlem
   Görev 3: makro + tanecik modeli → denklem (katsayı + hâl) */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State, V = () => T.Viewer;

  const TASKS = [
    { key: 'micro', miss: 'mic', title: 'Görev 1', sub: 'Tanecik modelini kur', ids: ['pbno32_ki', 'agno3_ki', 'cacl2_na2co3'] },
    { key: 'macro', miss: 'mac', title: 'Görev 2', sub: 'Gözlemi tahmin et', ids: ['cuno32_naoh', 'cacl2_na2co3', 'agno3_hcl'] },
    { key: 'sym', miss: 'sym', title: 'Görev 3', sub: 'Denklemi tamamla', ids: ['na2co3_hcl', 'caco3_hcl', 'nahco3_hcl'] }
  ];
  // öğretmenin kartındaki üç kutu: "verilen · verilen · ?"
  const REPS = [{ k: 'mac', n: 'Makroskobik', d: 'deneyde görülen' }, { k: 'mic', n: 'Tanecik', d: 'model' }, { k: 'sym', n: 'Sembolik', d: 'denklem' }];
  const COLOR_WORDS = ['sarı', 'beyaz', 'mavi', 'turkuaz', 'yeşil', 'krem', 'kahve', 'turuncu', 'siyah', 'kırmızı', 'gri', 'mor', 'pembe'];
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
        // küçük üçlü simge: makro · tanecik · sembolik; eksik olan "?" (üretilince ✓)
        const tri = h('span.s6-tri', { 'aria-hidden': 'true' }, ...REPS.map((rp) => h('i.' + (rp.k === t.miss ? (done ? 'd' : 'q') : 'g'), { text: rp.k === t.miss ? (done ? '✓' : '?') : '' })));
        const b = h('button.task-tab' + (i === this.idx ? '.on' : '') + (done ? '.done' : ''), null, tri,
          h('span.s6-tt', null, h('b', { text: t.title + ' · ' + t.sub }), h('span.muted', { text: this.rx[i].name })));
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
      this.stripEl = h('div.s6-strip');
      this.area.appendChild(this.stripEl);
      this.renderStrip();
      if (t.key === 'micro') this.taskMicro(r);
      else if (t.key === 'macro') this.taskMacro(r);
      else this.taskSym(r);
    },
    /** "verilen · verilen · ? sen üret" şeridi (üretilince ✓ üretildi) */
    renderStrip() {
      if (!this.stripEl) return;
      const t = TASKS[this.idx], done = S.data.tasks6[t.key] && S.data.tasks6[t.key].ok;
      this.stripEl.innerHTML = '';
      REPS.forEach((rp) => {
        const q = rp.k === t.miss;
        this.stripEl.appendChild(h('div.s6-chip.' + rp.k + (q ? '.q' : '') + (q && done ? '.done' : ''), null,
          h('span.dot'), h('b', { text: rp.n }), h('span.d', { text: ' · ' + rp.d }),
          h('span.st', { text: q ? (done ? '✓ üretildi' : '? sen üret') : 'verilen' })));
      });
    },
    record(ok) {
      const t = TASKS[this.idx];
      const rec = S.data.tasks6[t.key] || { id: this.r.id, tries: 0, ok: false };
      rec.id = this.r.id; rec.tries = (rec.tries || 0) + 1;
      if (ok) rec.ok = true;
      S.data.tasks6[t.key] = rec;
      S.save();
      this.renderTabs();
      this.renderStrip();
      return rec;
    },
    /** Görev şeridi (hedef alan, görev cümlesi, ayrıntı) */
    taskBar(target, text, hint) {
      this._tb = { target, text, hint };
      T.App.task({ step: [this.idx + 1, TASKS.length], target, text, hint });
    },
    afterSuccess(fbEl) {
      const allDone = TASKS.every((t) => S.data.tasks6[t.key] && S.data.tasks6[t.key].ok);
      T.App.task({ step: [this.idx + 1, TASKS.length], target: this._tb && this._tb.target,
        text: allDone ? 'Üç görev de tamam!' : 'Doğru! Sıradaki göreve geç',
        hint: allDone ? '<b>Son aşama: Bozuk modeli onar</b> düğmesiyle devam et.' : '<b>Sıradaki göreve geç</b> düğmesine bas ya da üstteki görev sekmelerinden birini seç.' });
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
      const m = this.colMacro(r, 'after', false, true), s = this.colSym(r);
      s.col.querySelector('.sym-panel').appendChild(h('div.small', { style: { textAlign: 'center', color: 'var(--macro-ink)' }, text: '👁 ' + macroSentence(r) }));
      const strip = h('div.given-strip', null, m.col, s.col);
      A.appendChild(strip);
      m.mount();
      const holder = h('div', { style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' } });
      A.appendChild(holder);
      // Yeni oluşan katı (kristal) havuzda hazır gelmez: öğrenci iyonlarını ekler, "Kristal yap" ile birleştirir.
      // Çözeltide kalan (seyirci) iyonlar Sonra bölümünde hazır durur.
      const crys = Object.keys(r.after).find((sid) => T.SPECIES[sid].kind === 'crystal');
      const need = {};
      if (crys) T.SPECIES[crys].comps.forEach(([sid]) => { need[sid] = (need[sid] || 0) + 1; });
      const spect = Object.assign({}, r.after);
      if (crys) delete spect[crys];
      const model = { before: Object.assign({}, r.before), after: crys ? Object.assign({}, spect) : {} };
      const prev = S.data.tasks6.micro && S.data.tasks6.micro.model;
      if (prev && prev.id === r.id) model.after = Object.assign({}, prev.after);
      let touched = !!(prev && prev.id === r.id);
      let pool = r.pool.slice();
      if (crys) {
        pool = pool.filter((sid) => T.SPECIES[sid].kind !== 'crystal');
        Object.keys(need).concat(Object.keys(spect)).forEach((sid) => { if (pool.indexOf(sid) < 0) pool.push(sid); });
      }
      this.builder = new T.Builder(holder, {
        reaction: r, pool: T.shuffleSeed(pool, r.no + 7), model, lockBefore: true, showCounter: true,
        counterIdle: () => crys && !touched,
        onChange: () => {
          touched = true;
          S.data.tasks6.micro = Object.assign(S.data.tasks6.micro || {}, { model: { id: r.id, after: model.after } }); S.save();
          updCrys();
        }
      });
      const fb = h('div');
      this.builder.rightSlot.appendChild(fb);
      const lbl = crys ? T.speciesLabel(crys) : '';
      this.taskBar(this.builder.regEl.after, crys ? 'Yeni oluşan katıyı iyonlardan kur' : 'Tepkime sonrasındaki tanecikleri yerleştir',
        crys ? `<b>${r.name}</b>: deneyin sonucu ve denklem verildi; tepkime öncesi ve çözeltide kalan iyonlar hazır. Havuzdan katıyı oluşturan iyonları <b>Tepkime sonrası</b> bölümüne ekle, <b>⬚ Kristal yap</b> ile birleştir, sonra <b>Modelimi kontrol et</b>.`
          : `<b>${r.name}</b>: deneyin sonucu ve denklem verildi, tepkime öncesi tanecikler hazır. Bitince sağdaki <b>Modelimi kontrol et</b> düğmesine bas.`);
      // ⬚ Kristal yap: iyonlar doğru oranda olunca açılır; oran yanlışsa yük dengesine yönlendirir
      const crysBox = h('div.s6-crys');
      const crysBtn = h('button.btn.block.s6-crys-btn', { type: 'button', text: '⬚ Kristal yap' });
      const crysNote = h('p.s6-crys-note');
      crysBox.append(crysBtn, crysNote);
      const ionNames = Object.keys(need).map((s) => T.speciesLabel(s));
      const units = () => Math.min(...Object.keys(need).map((s) => Math.floor((model.after[s] || 0) / need[s])));
      const updCrys = () => {
        if (!crys) return;
        const u = units(), anyIon = Object.keys(need).some((s) => model.after[s]), hasCrys = !!model.after[crys];
        crysBtn.classList.toggle('primary', u >= 1);
        crysBtn.classList.toggle('ghost', u < 1);
        crysNote.innerHTML = u >= 1 ? `İyonlar hazır: <b>⬚ Kristal yap</b> ile ${lbl} katısına dönüştür.`
          : hasCrys ? `✓ ${lbl} kristali oluştu.`
            : anyIon ? `Kristal yüksüzdür: artı ve eksi yükler eşitlenmeli. ${ionNames.join(' ve ')} iyonlarından kaçar tane gerekir?`
              : `Kapta yeni oluşan katı hangi iyonlardan oluşur? Denklemde <b>(k)</b> ile yazılan maddeye bak.`;
      };
      crysBtn.addEventListener('click', () => {
        const u = units();
        if (u < 1) { T.Audio.error(); crysNote.classList.remove('shake'); void crysNote.offsetWidth; crysNote.classList.add('shake'); return; }
        Object.keys(need).forEach((s) => { model.after[s] -= need[s] * u; if (!model.after[s]) delete model.after[s]; });
        model.after[crys] = (model.after[crys] || 0) + u;
        T.Audio.success();
        this.builder._changed('after');
        U.toast(`İyonlar ${u > 1 ? u + ' × ' : ''}${lbl} kristaline dönüştü.`, 1800);
      });
      // sayaçın hemen altında (ipucu kutusunun üstünde): kaydırmadan görünsün
      if (crys) { this.builder.rightEl.insertBefore(crysBox, this.builder.hintEl.isConnected ? this.builder.hintEl : this.builder.rightSlot); updCrys(); }
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

    /* ---------- Görev 2: makroskobik eksik ----------
       Öğrenci gözlemi kendi cümlesiyle yazar (üretim). Ölçütler: Ne oluşur? · Rengi? (çökeltide) · Nerede? (isteğe bağlı).
       İki denemeden sonra "Seçeneklerden seç" açılır; kimse takılı kalmaz. */
    predictCheck(text, r) {
      const ev = r.evidence || { need: [], wrong: [] }, type = r.obs.type;
      const pos = (spec) => spec.split('|').some((g) => T.Eval.mention(text, g) === 'pos');
      const norm = U.normTR(text);
      const wrongSaid = (ev.wrong || []).filter((g) => pos(g) && !(g === 'GAS' && type === 'gas'));
      // "katı bir madde oluşur" gibi serbest ifadeler de çökelti sayılır
      const solidSaid = type === 'precipitate' && /katı[^.,;!?]*?(oluş|meydana|birik|görül|çök)/.test(norm) && !/katı[^.,;!?]*?(oluşmaz|oluşmadı|görülmez|yok)/.test(norm);
      const kind = wrongSaid.length ? 'n' : ((ev.need.length && ev.need.every(pos)) || solidSaid ? 'y' : 'n');
      const res = { kind, wrongSaid, color: null, where: null, words: U.wordCount(text) };
      if (type === 'precipitate') {
        const pn = U.normTR(precipName(r) || '');
        const right = COLOR_WORDS.filter((c) => pn.includes(c));
        if (right.length) {
          const said = COLOR_WORDS.filter((c) => norm.includes(c));
          const ok = right.some((c) => norm.includes(c)) || (right.indexOf('beyaz') >= 0 && norm.includes('süt'));
          res.color = ok ? 'y' : said.length ? 'x' : 'n';
        }
        res.where = /dib|dipte|çök/.test(norm) ? 'y' : null;
      }
      res.pass = res.words >= 3 && res.kind === 'y' && (res.color === null || res.color === 'y');
      return res;
    },
    taskMacro(r) {
      const A = this.area;
      const q = this.qCol('Makroskobik gözlem', 'Kapta ne görürsün?');
      const mi = this.colMicro(r), s = this.colSym(r);
      const grid = h('div.grid-tasks', null, q.col, mi.col, s.col);
      A.appendChild(grid);
      mi.mount();
      const type = r.obs.type, correct = macroSentence(r);
      const rec0 = S.data.tasks6.macro;
      const fb = h('div');
      const showResult = () => {
        const el = h('div.mpanel', { style: { minHeight: '170px', flex: '1' } }, h('div.pempty', { text: '' }));
        q.box.innerHTML = '';
        q.box.classList.add('s6-done');
        q.box.appendChild(h('div.rep-h.macro', null, h('b', { text: '👁 Makroskobik' }), h('span', { text: 'Deneyin sonucu' })));
        q.box.appendChild(el);
        q.box.appendChild(fb);
        const p = V().addPanel(el, { near: 0.005, minDist: 0.1, labelRoom: 0, fitPad: 1.05 });
        this.panels.push(p); this.macros.push(new T.MacroView(p, r, 'after'));
      };
      const success = (msg) => {
        T.Audio.success();
        fb.innerHTML = '';
        fb.appendChild(h('div.feedback.ok', { html: '<b>✓ Doğru tahmin</b>' + msg + ' İşte deneyin sonucu:' }));
        showResult();
        this.afterSuccess(fb);
      };
      // daha önce doğru yapıldıysa sonucu göster
      if (rec0 && rec0.ok && rec0.id === r.id) {
        this.taskBar(q.box, 'Gözlem tahmini tamam', `<b>${r.name}</b>: tahminin doğruydu.`);
        fb.appendChild(h('div.feedback.ok', { html: '<b>✓ Doğru tahmin</b>' + correct }));
        showResult();
        this.afterSuccess(fb);
        return;
      }
      this.taskBar(q.box, 'Kapta ne gözlenir? Kendi cümlenle yaz',
        `<b>${r.name}</b>: tanecik modeli ve denklem verildi. Bu iki çözelti karışınca kapta ne görürsün? Yaz ve <b>Tahminimi kontrol et</b>.`);
      q.box.innerHTML = '';
      q.box.classList.add('s6-pred');
      const ta = h('textarea.s6-ta', { rows: 3, placeholder: 'Bu iki çözelti karışınca kapta ne görürsün? Kendi cümlenle yaz…', 'aria-label': 'Gözlem tahminin' });
      if (rec0 && rec0.id === r.id && rec0.text) ta.value = rec0.text;
      ta.addEventListener('input', () => {
        const rc = S.data.tasks6.macro && S.data.tasks6.macro.id === r.id ? S.data.tasks6.macro : { id: r.id, tries: 0, ok: false };
        rc.text = ta.value; S.data.tasks6.macro = rc; S.save();
      });
      const crit = h('div.s6-crit');
      const chips = [{ k: 'kind', t: 'Ne oluşur?' }];
      if (type === 'precipitate' && precipName(r)) chips.push({ k: 'color', t: 'Rengi?' });
      if (type === 'precipitate') chips.push({ k: 'where', t: 'Nerede?', opt: true });
      const renderCrit = (res) => {
        crit.innerHTML = '';
        chips.forEach((c) => {
          const v = res ? res[c.k] : null;
          const cls = v === 'y' ? '.y' : (v === 'n' || v === 'x') && !c.opt ? '.n' : c.opt ? '.opt' : '';
          const txt = v === 'y' ? '✓ ' + (c.k === 'kind' ? 'Ne oluşur' : c.k === 'color' ? 'Rengi' : 'Nerede') : v === 'x' ? '✗ Rengi' : c.t + (c.opt ? ' (isteğe bağlı)' : '');
          crit.appendChild(h('span' + cls, { text: txt }));
        });
      };
      renderCrit(null);
      const chk = h('button.btn.primary.s6-chk', { text: 'Tahminimi kontrol et' });
      const alt = h('button.s6-alt', { type: 'button', text: 'Seçeneklerden seç', hidden: true });
      const optWrap = h('div.opt-list.s6-opts', { hidden: true });
      q.box.append(
        h('div.rep-h.macro', null, h('b', { text: '👁 Makroskobik' }), h('span', { text: 'Sen yaz' })),
        h('div.s6-qt', { text: 'Bu iki çözelti karışınca kapta ne görürsün?' }),
        ta, crit, fb, optWrap, h('div.s6-row', null, chk, alt));
      const KIND_HINT = {
        precipitate: 'Tanecik modelinde tepkime sonrası bir kristal var. Denklemde <b>(k)</b> ile yazılan madde kapta nasıl görünür?',
        gas: 'Tepkime sonrası modelde bir gaz molekülü var. Denklemde <b>(g)</b> ile yazılan madde kapta nasıl görünür?',
        heat: 'Denklemde ne katı ne gaz var. Gözle görülmeyen bir değişimi hangi ölçüm aracı gösterir?',
        smoke: 'Denklemde katı hâlde oluşan madde kabın ağzında nasıl görünür?'
      };
      chk.addEventListener('click', () => {
        const res = this.predictCheck(ta.value, r);
        fb.innerHTML = '';
        if (res.words < 3) {
          fb.appendChild(h('div.feedback.warn', { html: '<b>Biraz daha ayrıntı</b>Tahminini tam bir cümleyle yaz: Karışınca kapta ne oluşur?' }));
          return;
        }
        renderCrit(res);
        const rec = this.record(res.pass);
        rec.text = ta.value; S.save();
        if (res.pass) { success(res.where === 'y' ? 'Ne oluştuğunu, rengini ve nereye çöktüğünü doğru yazdın.' : 'Modelde ve denklemde gördüğünü kapta gözlenecek değişime çevirdin.'); return; }
        T.Audio.error();
        const msg = res.kind !== 'y' ? (KIND_HINT[type] || 'Modelde tepkime öncesi ve sonrası aynı mı? Yeni bir tür oluşuyor mu?')
          : res.color === 'x' ? 'Katı oluştuğu doğru ama renk tutmuyor. Kristali oluşturan iyonlara bak: bu iyonu içeren katılar laboratuvarda hangi renkte görünür?'
            : 'Katı oluştuğu doğru. Peki rengi ne? Tanecik modelinde kristali oluşturan iyonlara bak.';
        fb.appendChild(h('div.feedback.warn', { html: '<b>Tekrar düşün</b>' + msg }));
        if (rec.tries >= 2) alt.hidden = false;
      });
      // yedek: seçenekler (2 denemeden sonra)
      const opts = [correct, 'Karışımda gaz kabarcıkları oluşur.', 'Karışım berrak kalır; termometre sıcaklığın arttığını gösterir.', 'Hiçbir değişim olmaz; çözeltiler yalnızca birbirine karışır.'];
      if (type === 'precipitate') opts.splice(1, 0, `Karışımda ${precipName(r) === 'beyaz' ? 'sarı' : 'beyaz'} bir katı oluşur ve dibe çöker.`);
      T.shuffleSeed(opts, r.no + 11).forEach((txt) => {
        const b = h('button.opt', { text: txt });
        b.addEventListener('click', () => {
          optWrap.querySelectorAll('.opt').forEach((x) => x.classList.remove('wrong'));
          const ok = txt === correct;
          this.record(ok);
          if (ok) { success('Modelde ve denklemde <b>(k)</b> ile gösterilen kristal, kapta gözle görülen katıdır.'); return; }
          b.classList.add('wrong'); T.Audio.error();
        });
        optWrap.appendChild(b);
      });
      alt.addEventListener('click', () => { optWrap.hidden = false; alt.hidden = true; ta.hidden = true; crit.hidden = true; chk.hidden = true; fb.innerHTML = ''; });
      if (rec0 && rec0.id === r.id && rec0.tries >= 2) alt.hidden = false;
    },

    /* ---------- Görev 3: sembolik eksik ---------- */
    taskSym(r) {
      const A = this.area;
      const m = this.colMacro(r, 'after', true), mi = this.colMicro(r);
      const q = this.qCol('Sembolik gösterim', 'Katsayı ve hâl seç');
      this.taskBar(q.box, 'Denklemdeki katsayıları ve fiziksel hâlleri seç',
        `<b>${r.name}</b>: deneyin sonucu ve tanecik modeli verildi. Katsayıları tanecik modelindeki sayılardan bulabilirsin.`);
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
