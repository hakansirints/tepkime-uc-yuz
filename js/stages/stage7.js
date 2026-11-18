/* AŞAMA 7 — Bozuk model: başka bir öğrencinin hatalı modeli verilir. Hatalar baştan söylenmez.
   Öğrenci modeli çalıştırır, hataları bulur, düzeltir ve düzeltmesini gerekçelendirir (model eleştirme). */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State;

  /* Kanıt türleri: tamamlanan tepkimelerden "kanıt koleksiyonu" oluşur */
  const EV = {
    GAS: { ic: '💨', t: 'Gaz' }, PRECIP: { ic: '🧊', t: 'Çökelti' }, HEAT: { ic: '🔥', t: 'Isınma' },
    SMOKE: { ic: '🌫', t: 'Duman' }, COLOR: { ic: '🎨', t: 'Renk değişimi' }
  };
  function evidenceOf(r) {
    const o = r.obs || {}, out = [];
    if (o.type === 'gas') out.push('GAS');
    if (o.type === 'precipitate') out.push('PRECIP');
    if (o.type === 'smoke') out.push('SMOKE');
    if (o.type === 'heat' || (o.temp || 0) >= 27) out.push('HEAT');
    const pc = o.precip && o.precip.color;   // renkli çökelti de bir renk değişimidir
    const tinted = pc != null && Math.min(pc >> 16 & 255, pc >> 8 & 255, pc & 255) < 0xc0;
    if (o.tint || tinted) out.push('COLOR');
    return out;
  }
  /* Gözlenen kanıtı denklemdeki hâl sembolüne bağlayan kısa not */
  const STATE_LINK = {
    gas: '<b>(g)</b>: gördüğün kabarcıklar',
    precipitate: '<b>(k)</b>: kapta oluşan çökelti',
    smoke: '<b>(k)</b>: duman, havada asılı katı tanecikler',
    heat: 'Isınma denklemde yazmaz; enerji değişimidir'
  };

  const Stage7 = {
    enter(body) {
      this.body = body;
      const main = S.data.reaction;
      this.broken = T.Tutorial && T.Tutorial.active ? T.TUTORIAL.broken
        : main === 'caco3_hcl' ? T.BROKEN.cacl2_na2co3 : T.BROKEN.caco3_hcl;
      this.r = T.REACTIONS[this.broken.reaction];
      const st = S.data.s7 || {};
      if (st.fixed && st.justified) this.showSummary();
      else if (st.fixed) this.showJustify();
      else this.showFix();
    },

    showFix() {
      this.cleanup();
      const body = this.body, r = this.r, B = this.broken;
      body.innerHTML = '';
      S.data.s7 = S.data.s7 || {};
      if (!S.data.s7.model) S.data.s7.model = { before: Object.assign({}, B.before), after: Object.assign({}, B.after) };
      const model = S.data.s7.model;
      this.runs = 0;
      body.appendChild(h('div.feedback.info', { style: { margin: '0' }, html: B.story + ' Model doğru mu? <b>Önce çalıştır ve izle</b>, sonra gerekiyorsa düzelt.' }));
      const holder = h('div', { style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' } });
      body.appendChild(holder);
      this.builder = new T.Builder(holder, {
        reaction: null, pool: T.shuffleSeed(r.pool, r.no + 21), model, hints: false, showCounter: true, counterStatus: false,
        onChange: () => { S.save(); }
      });
      const slot = this.builder.rightSlot;
      slot.appendChild(h('h3', { style: { marginTop: '10px' }, html: '🛠 Görevin' }));
      slot.appendChild(h('ol.track-steps', null,
        h('li', { text: 'Modeli çalıştır, atomları izle.' }),
        h('li', { text: 'Modelde yanlış olanları bul ve düzelt.' }),
        h('li', { text: 'Neden değiştirdiğini açıkla.' })));
      const run = h('button.btn.primary.block', { text: '▶ Modeli çalıştır ve test et' });
      const fb = h('div');
      slot.appendChild(run);
      slot.appendChild(fb);
      run.addEventListener('click', () => {
        run.disabled = true;
        fb.innerHTML = '';
        fb.appendChild(h('div.feedback.info', { html: '<b>Model çalışıyor…</b>Ortadaki bölümü izle. Kırmızı atomlar yok olan ya da yoktan ortaya çıkan atomlardır.' }));
        this.builder.playMid(() => {
          run.disabled = false;
          run.textContent = '▶ Yeniden çalıştır';
          this.runs++;
          const res = T.Eval.checkModel(model, { before: r.before, after: r.after });
          fb.innerHTML = '';
          if (res.pass) {
            T.Audio.success();
            S.data.s7.fixed = true; S.data.s7.runs = this.runs; S.save();
            fb.appendChild(h('div.feedback.ok', { html: '<b>✓ Model onarıldı</b>Artık atomlar korunuyor ve türler deneyle uyumlu.' }));
            const nb = h('button.btn.success.block.pulse', { text: 'Düzeltmeni gerekçelendir →', style: { marginTop: '6px' } });
            nb.addEventListener('click', () => this.showJustify());
            fb.appendChild(nb);
          } else {
            T.Audio.error();
            const first = this.runs === 1 && Object.keys(B.before).every((k) => model.before[k] === B.before[k]) && Object.keys(B.after).every((k) => model.after[k] === B.after[k]);
            const lead = first ? '<b>Bu modelde sorun var.</b>Canlandırmada ne fark ettin? Aşağıdaki ölçütlere bak.' : '<b>' + res.fb.title + '</b>';
            fb.appendChild(h('div.feedback.' + (first ? 'warn' : res.fb.kind), { html: lead + res.fb.text }));
            const ul = h('ul.rules');
            res.criteria.forEach((c) => ul.appendChild(h('li.' + (c.pass ? 'pass' : 'fail'), { text: c.label })));
            fb.appendChild(ul);
          }
        });
      });
    },

    showJustify() {
      this.cleanup();
      const body = this.body, B = this.broken, r = this.r;
      body.innerHTML = '';
      const m = S.data.s7.model;
      const fmt = (ms) => Object.keys(ms).map((s) => (ms[s] > 1 ? ms[s] + ' ' : '') + T.speciesLabel(s)).join(' + ');
      const card = h('div.side-card', { style: { maxWidth: '860px', margin: '0 auto', width: '100%', overflowY: 'auto' } });
      card.appendChild(h('h3', { html: '✍️ Model eleştirisi: düzeltmeni gerekçelendir' }));
      card.appendChild(h('div.summary-grid', null,
        h('div.sum-card', { html: '<b style="color:var(--bad)">Arkadaşının modeli</b>Önce: ' + fmt(B.before) + '<br>Sonra: ' + fmt(B.after) }),
        h('div.sum-card', { html: '<b style="color:var(--ok)">Senin düzelttiğin model</b>Önce: ' + fmt(m.before) + '<br>Sonra: ' + fmt(m.after) })));
      card.appendChild(h('p', { style: { margin: '12px 0 6px' }, html: 'Arkadaşına bir not yaz: <b>Modelde neyi neden değiştirdin?</b> Bilimsel bir gerekçe kullan (atomlar, iyonlar, katılar…).' }));
      const ta = h('textarea.justify-box', { placeholder: 'Örnek başlangıç: “Modelinde … yanlıştı, çünkü …”' });
      ta.value = S.data.justification || '';
      const cnt = h('div.small.muted', { text: '' });
      const ideas = h('div.idea-list');
      const IDEA_Q = {
        'tür': 'Tepkimede atom türleri değişir mi?',
        'sayı': 'Atom sayıları önce ve sonra eşit mi?',
        'korun': 'Atomlar yok olur mu, yoksa yeniden mi düzenlenir?',
        'iyon': 'Suda çözünen maddeler ve katı çökeltiler nasıl gösterilir?'
      };
      const upd = () => {
        const ev = T.Eval.evaluateJustification(ta.value);
        cnt.textContent = ev.words + ' kelime';
        ideas.innerHTML = '';
        ev.hits.concat(ev.missing).forEach((i) => ideas.appendChild(h('span.idea' + (ev.hits.includes(i) ? '.hit' : ''), { text: (ev.hits.includes(i) ? '✓ ' : '○ ') + i.label })));
        return ev;
      };
      ta.addEventListener('input', () => { S.data.justification = ta.value; S.save(); upd(); });
      card.appendChild(ta);
      card.appendChild(cnt);
      card.appendChild(h('div.small.muted', { style: { marginTop: '6px' }, text: 'Gerekçende yer alan düşünceler:' }));
      card.appendChild(ideas);
      const fb = h('div');
      const chk = h('button.btn.primary', { text: 'Gerekçemi değerlendir' });
      const back = h('button.btn.ghost', { text: '← Modele dön' });
      back.addEventListener('click', () => { S.data.s7.fixed = false; S.save(); this.showFix(); });
      card.appendChild(h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } }, back, chk));
      card.appendChild(fb);
      body.appendChild(card);
      upd();
      chk.addEventListener('click', () => {
        const ev = upd();
        fb.innerHTML = '';
        if (ev.words < 12) {
          fb.appendChild(h('div.feedback.warn', { html: '<b>Biraz daha açıkla</b>Gerekçen çok kısa. Neyi değiştirdiğini <b>ve nedenini</b> yaz.' }));
          return;
        }
        if (ev.hits.length < 2) {
          const qs = ev.missing.slice(0, 2).map((i) => '• ' + IDEA_Q[i.key]).join('<br>');
          fb.appendChild(h('div.feedback.warn', { html: '<b>Gerekçeni bilimsel fikirlerle güçlendir</b>Şu soruları düşünerek yazını geliştir:<br>' + qs }));
          return;
        }
        T.Audio.success();
        S.data.s7.justified = true; S.save();
        const extra = ev.missing.length ? '<br><span class="small">Daha da güçlendirmek için: ' + ev.missing.map((i) => IDEA_Q[i.key]).join(' ') + '</span>' : '';
        fb.appendChild(h('div.feedback.ok', { html: '<b>✓ Güçlü bir gerekçe</b>Bir modeli eleştirip bilimsel gerekçeyle düzelttin.' + extra }));
        const nb = h('button.btn.success.pulse', { text: 'Öğrenme özetini gör →', style: { marginTop: '6px' } });
        nb.addEventListener('click', () => this.showSummary());
        fb.appendChild(nb);
        void r;
      });
    },

    showSummary() {
      this.cleanup();
      const body = this.body, d = S.data, r = S.reaction;
      T.App.complete(7);
      const rec = d.completedReactions[r.id] = Object.assign({}, d.completedReactions[r.id], { at: new Date().toISOString().slice(0, 10) });
      S.save();
      body.innerHTML = '';
      U.$('#ws-title').textContent = 'Tepkime tamamlandı';
      U.$('#ws-sub').textContent = 'Üç yüzü yan yana gör, kendini değerlendir ve sıradaki keşfini seç.';
      const SP = T.SPECIES, esc = T.escapeHtml;
      const t6 = d.tasks6 || {};
      const tries = (k) => (t6[k] ? t6[k].tries : 0);
      const hints = Math.max(d.hintsUsed.before || 0, d.hintsUsed.after || 0);
      const sec = (title, note) => h('div.fin-sec', null, h('b', { text: title }), note ? h('span', { text: note }) : null);
      const wrap = h('div.summary-wrap.fin');

      /* --- başlık: 7/7 halkası, tepkime adı, açılan kanıt rozeti --- */
      const cats = evidenceOf(r);
      const before = new Set();
      Object.keys(d.completedReactions).forEach((id) => { if (id !== r.id && T.REACTIONS[id]) evidenceOf(T.REACTIONS[id]).forEach((c) => before.add(c)); });
      const fresh = cats.filter((c) => !before.has(c));
      const badgeCat = EV[fresh[0] || cats[0]];
      wrap.appendChild(h('div.fin-head', null,
        h('div.fin-ring', { html: '<div><b>7/7</b><small>aşama</small></div>' }),
        h('div.fin-title', null,
          h('div.fin-kicker', { text: '🎉 Tebrikler' }),
          h('h3', { html: 'Bu tepkimenin <b>üç yüzünü</b> de gördün' }),
          h('p.fin-lead', { text: 'Gözlemledin, taneciklerle modelledin, sembollerle yazdın ve hatalı bir modeli onardın.' })),
        badgeCat ? h('div.fin-badge', null, h('i', { text: badgeCat.ic }), h('b', { text: badgeCat.t + ' kanıtı' }), h('small', { text: fresh.length ? 'Koleksiyonuna eklendi' : 'Koleksiyonunda vardı' })) : null));

      const grid = h('div.fin-grid');
      const main = h('div.fin-col'), side = h('div.fin-col');
      grid.append(main, side);
      wrap.appendChild(grid);

      /* --- üç yüz yan yana: öğrencinin kendi gözlemi, modeli ve denklem --- */
      const tr = (r.track || []).find((t) => !t.spectator), spec = (r.track || []).find((t) => t.spectator);
      let microTxt = 'Atomlar yeniden düzenlendi; türleri ve sayıları korundu.';
      if (tr && SP[tr.from]) {
        const to = Object.keys(r.after || {}).find((k) => k !== tr.from && SP[k] && SP[k].atoms.some((a) => a.el === tr.el));
        microTxt = '<b>' + tr.el + '</b> atomu ' + SP[tr.from].f + ' taneciğinden' + (to ? ' ' + SP[to].f + ' taneciğine geçti.' : ' ürünlere geçti.');
        if (spec && SP[spec.from]) microTxt += ' ' + SP[spec.from].f + ' değişmeden kaldı.';
      }
      const eqEl = h('div.fin-eq');
      T.renderEquation(eqEl, r, null);
      main.appendChild(sec('Üç yüz yan yana', 'Aynı olay, üç farklı dil'));
      main.appendChild(h('div.fin-tri', null,
        h('div.fin-lv.macro', null, h('b', { text: '👁 Gördüğün' }),
          h('p.fin-quote', { text: d.observation ? '“' + d.observation + '”' : r.okText }),
          h('small', { text: d.observation ? 'Senin gözlem cümlen' : 'Gözlem' })),
        h('div.fin-lv.micro', null, h('b', { text: '⚛ Modellediğin' }), h('p', { html: microTxt }), h('small', { text: 'Tanecik düzeyi' })),
        h('div.fin-lv.sym', null, h('b', { text: '✎ Yazdığın' }), eqEl, h('small', { html: STATE_LINK[r.obs.type] || 'Denklem' }))));

      /* --- yolculuk: puan değil, nasıl öğrendiğin --- */
      const tagT = (n, txt, grow) => ({ n, txt, grow });
      const steps = [
        tagT(1, d.obsTries > 1 ? d.obsTries + '. deneme' : 'ilk deneme', d.obsTries > 1),
        tagT(2, hints ? hints + ' ipucu' : 'ipucusuz', !!hints),
        tagT(3, d.trackLog.length ? d.trackLog.length + ' atom' : 'izlendi', false),
        tagT(4, (d.testRuns || 1) + ' test', (d.testRuns || 1) > 1),
        tagT(5, 'eşleşti', false),
        tagT(6, (tries('micro') + tries('macro') + tries('sym')) > 3 ? 'denedin' : 'hızlı', (tries('micro') + tries('macro') + tries('sym')) > 3),
        tagT(7, 'gerekçeli', false)
      ];
      main.appendChild(sec('Yolculuğun', 'Puan değil, nasıl öğrendiğin'));
      main.appendChild(h('ol.fin-path', null, steps.map((s) => h('li', null,
        h('span.dot', { text: '✓' }), h('b', { text: S.STAGES[s.n - 1].short }), h('em' + (s.grow ? '.grow' : ''), { text: s.txt })))));

      /* --- öz değerlendirme (üstbiliş) --- */
      const CAN = [
        'Bir tepkimeyi gaz, çökelti, ısı ya da renk gibi <b>kanıtlarla</b> tanırım.',
        'Atomların <b>türünün ve sayısının korunduğunu</b> modelle gösteririm.',
        'Aynı tepkimeyi <b>üç gösterim</b> arasında çevirebilirim.'
      ];
      const LV = ['Henüz değil', 'Biraz', 'Eminim'];
      rec.self = rec.self || [];
      main.appendChild(sec('Artık bunları yapabiliyor musun?', 'Kendini değerlendir'));
      main.appendChild(h('ul.fin-can', null, CAN.map((txt, i) => {
        const btns = LV.map((l, j) => {
          const b = h('button' + (rec.self[i] === j ? '.on' : ''), { type: 'button', text: l, 'aria-pressed': String(rec.self[i] === j) });
          b.addEventListener('click', () => {
            rec.self[i] = j; S.save();
            b.parentNode.querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
          });
          return b;
        });
        return h('li', null, h('span', { html: txt }), h('span.fin-rate', { role: 'group', 'aria-label': 'Kendi değerlendirmen' }, btns));
      })));

      /* --- yan sütun: kendine sor, koleksiyon, öneri --- */
      const atomName = tr ? tr.name : 'atom';
      const ta = h('textarea', { rows: 2, maxlength: 240, placeholder: (tr ? tr.el : 'Atom') + ' atomu önce…', 'aria-label': 'Kendine sor cevabın' });
      ta.value = rec.reflect || '';
      ta.addEventListener('input', () => { rec.reflect = ta.value; S.save(); });
      side.appendChild(h('div.fin-reflect', null,
        h('b', { text: '🤔 Kendine sor' }),
        h('p', { html: 'Ürünlerdeki <b>' + atomName + '</b> atomu karışımdan önce neredeydi? Bir arkadaşına <b>tek cümleyle</b> anlatır gibi yaz.' }),
        ta));

      const doneIds = Object.keys(d.completedReactions).filter((id) => T.REACTIONS[id]);
      const got = new Set();
      doneIds.forEach((id) => evidenceOf(T.REACTIONS[id]).forEach((c) => got.add(c)));
      const total = T.REACTION_LIST.length;
      side.appendChild(sec('Kanıt koleksiyonun', doneIds.length + ' / ' + total + ' tepkime'));
      side.appendChild(h('div.fin-meter', null, h('i', { style: { width: Math.round(doneIds.length / total * 100) + '%' } })));
      side.appendChild(h('div.fin-ev', null, Object.keys(EV).map((k) => h('span' + (got.has(k) ? '.got' : ''), { text: EV[k].ic + ' ' + EV[k].t }))));

      const left = T.REACTION_LIST.filter((x) => !d.completedReactions[x.id]);
      const next = left.find((x) => evidenceOf(x).some((c) => !got.has(c))) || left[0];
      const tut = T.Tutorial && T.Tutorial.active;
      const startWith = (id) => {
        S.reset();
        if (id) { S.data.reaction = id; S.save(); }
        T.Lab.setReaction(id ? T.REACTIONS[id] : null);
        T.Stage1.passed = false; T.Stage1.panelOpen = !id;
        U.$('#obs-feedback').classList.add('hidden');
        U.$('#obs-text').value = '';
        T.App.renderStepper();
        T.App.go(1, true);
      };
      if (next) {
        const nc = evidenceOf(next).find((c) => !got.has(c));
        side.appendChild(h('div.fin-next', null, h('i', { text: '🧪' }), h('div', null,
          h('b', { text: 'Sıradaki öneri: ' + next.name }),
          h('span', { html: nc ? 'Henüz <b>' + EV[nc].t.toLowerCase() + '</b> kanıtı görmedin. Bu tepkimede ne olacağını tahmin edebilir misin?' : 'Yeni bir tepkimede aynı üç yüzü bulabilir misin?' }))));
      } else {
        side.appendChild(h('div.fin-next', null, h('i', { text: '🏆' }), h('div', null, h('b', { text: 'Tüm tepkimeleri tamamladın!' }), h('span', { text: 'İstediğin tepkimeyi yeniden inceleyebilirsin.' }))));
      }
      if (!tut) {
        const cta = h('div.fin-cta');
        if (next) cta.appendChild(h('button.btn.primary', { text: 'Önerilen tepkimeye geç →', onclick: () => startWith(next.id) }));
        cta.appendChild(h('button.btn' + (next ? '.ghost' : '.primary'), { text: next ? 'Başka seç' : '🧪 Tepkime seç', onclick: () => startWith(null) }));
        side.appendChild(cta);
      }

      /* --- ayrıntılı öğrenme özeti (açılır) --- */
      const det = h('details.fin-more');
      det.appendChild(h('summary', { text: '📄 Ayrıntılı öğrenme özeti ve kazanımlar' }));
      det.appendChild(h('div.summary-grid', null,
        h('div.sum-card', { html: '<b>1 · Gözlem</b>“' + esc(d.observation || '') + '”<br><span class="muted">' + d.obsTries + ' denemede tamamlandı</span>' }),
        h('div.sum-card', { html: '<b>2 · Model kurma</b>Kullanılan en yüksek destek düzeyi: ' + (hints ? hints + '. düzey' : 'destek kullanılmadı') }),
        h('div.sum-card', { html: '<b>3 · Atom takibi</b>' + (d.trackLog.length ? d.trackLog.length + ' atom izlendi' : 'Tamamlandı') }),
        h('div.sum-card', { html: '<b>4 · Test</b>Model ' + (d.testRuns || 1) + ' kez çalıştırıldı' }),
        h('div.sum-card', { html: '<b>5 · Üç gösterim</b>Makroskobik, tanecik ve sembolik gösterimler ilişkilendirildi' }),
        h('div.sum-card', { html: `<b>6 · Temsil değiştirme</b>Model: ${tries('micro')} · Gözlem: ${tries('macro')} · Denklem: ${tries('sym')} deneme` }),
        h('div.sum-card', { html: '<b>7 · Bozuk model</b>' + esc((d.justification || '').slice(0, 220)) + ((d.justification || '').length > 220 ? '…' : '') })));
      det.appendChild(h('ul.rules', null,
        h('li.pass', { text: 'Kimyasal tepkimeyi gözlenebilir kanıtlarla (gaz, çökelti, ısı, renk, duman) tanırım.' }),
        h('li.pass', { text: 'Kimyasal tepkimede atomların türünün ve sayısının korunduğunu, atomların yeniden düzenlendiğini açıklarım.' }),
        h('li.pass', { text: 'Sulu çözeltideki maddeleri ayrı iyonlar, katı çökeltileri kristal yapı olarak modellerim.' }),
        h('li.pass', { text: 'Bir tepkimeyi makroskobik, tanecik ve sembolik düzeyde gösterir; gösterimler arasında geçiş yaparım.' }),
        h('li.pass', { text: 'Fiziksel hâl sembollerini ve katsayıları tanecik modeliyle ilişkilendiririm.' }),
        h('li.pass', { text: 'Bir modeli ölçütlere göre eleştirir, düzeltir ve düzeltmemi gerekçelendiririm.' })));
      const names = doneIds.map((id) => T.REACTIONS[id].name);
      det.appendChild(h('p.small.muted', { text: 'Tamamladığın tepkimeler (' + names.length + ' / ' + total + '): ' + names.join(', ') }));
      main.appendChild(det);

      body.appendChild(wrap);
    },
    cleanup() {
      if (this.builder) { this.builder.destroy(); this.builder = null; }
    },
    leave() { this.cleanup(); }
  };
  T.Stage7 = Stage7;
})(window.TUY);
