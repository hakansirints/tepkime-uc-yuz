/* AŞAMA 5 — Üç gösterim: makroskobik, tanecik (mikroskobik) ve sembolik gösterim birbirine bağlı.
   Bir gösterimde bir öğe seçilince diğer iki gösterimde karşılığı vurgulanır. */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State, Mol = T.Mol, V = () => T.Viewer;

  const STATE_TEXT = { k: 'katı', s: 'sıvı', g: 'gaz', suda: 'suda çözünmüş (sulu çözelti)' };

  /** Bir panele "tepkime öncesi → tepkime sonrası" tanecik görünümü yerleştirir; grupları döndürür. */
  function microPair(p, before, after) {
    const groups = [];
    const expand = (ms) => { const o = []; Object.keys(ms).forEach((s) => { for (let i = 0; i < ms[s]; i++) o.push(s); }); return o; };
    const mk = (ms, side) => {
      const gs = expand(ms).map((sid) => { const g = Mol.build(sid, { labelH: 0.5 }); g.userData.pickable = true; g.userData.side = side; return g; });
      const pos = Mol.layout(gs, { gap: 0.6, aspect: 1.8, jitter: false });
      let mn = 1e9, mx = -1e9, bot = 1e9, top = -1e9;
      pos.forEach((q, i) => { const rr = gs[i].userData.radius; mn = Math.min(mn, q.x - rr); mx = Math.max(mx, q.x + rr); bot = Math.min(bot, q.y - rr - 0.5); top = Math.max(top, q.y + rr); });
      if (!pos.length) { mn = 0; mx = 0; top = 0; bot = 0; }
      return { gs, pos, mn, mx, top, bot };
    };
    // Dikey düzen: üstte tepkime öncesi, altta tepkime sonrası, arada aşağı ok
    const B = mk(before, 'r'), A = mk(after, 'p');
    const gap = 2.0;
    const offB = new THREE.Vector3(-(B.mn + B.mx) / 2, gap / 2 - B.bot, 0);
    const offA = new THREE.Vector3(-(A.mn + A.mx) / 2, -gap / 2 - A.top - 0.55, 0);
    B.gs.forEach((g, i) => { g.position.copy(B.pos[i]).add(offB); p.root.add(g); groups.push(g); });
    A.gs.forEach((g, i) => { g.position.copy(A.pos[i]).add(offA); p.root.add(g); groups.push(g); });
    const mat = new THREE.MeshBasicMaterial({ color: 0x9fb7d4 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 12), mat);
    shaft.position.y = 0.3; shaft.userData.noPick = true;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 16), mat);
    head.rotation.z = Math.PI; head.position.y = -0.22; head.userData.noPick = true;
    p.root.add(shaft); p.root.add(head);
    const lb = Mol.label('Tepkime öncesi', { h: 0.38, bg: 'rgba(30,60,100,0.85)' }); lb.position.set(0, offB.y + B.top + 0.4, 0); p.root.add(lb);
    const la = Mol.label('Tepkime sonrası', { h: 0.38, bg: 'rgba(30,60,100,0.85)' }); la.position.set(0, offA.y + A.top + 0.4, 0); p.root.add(la);
    // vurgu (Mol.setHighlight/setDim): seçilen tanecik yumuşakça %7 büyür, nabız yok
    p.onUpdate((dt, t) => {
      groups.forEach((g, i) => {
        if (T.SPECIES[g.userData.sid].kind !== 'crystal') g.rotation.y = Math.sin(t * 0.5 + i) * 0.4;
        const s = g.scale.x, want = g.userData.hl ? 1.07 : 1;
        if (Math.abs(want - s) > 0.001) g.scale.setScalar(s + (want - s) * Math.min(1, dt * 10));
      });
    });
    const box = new THREE.Box3();
    groups.forEach((g) => box.expandByPoint(g.position.clone().addScalar(g.userData.radius)).expandByPoint(g.position.clone().addScalar(-g.userData.radius)));
    box.expandByPoint(lb.position.clone().add(new THREE.Vector3(0, 0.35, 0)));
    box.expandByPoint(new THREE.Vector3(box.min.x, box.min.y - 0.5, 0));
    p.fit(true, box);
    return groups;
  }

  /** Denklem terimleri listesi (katalizör dahil) */
  function eqTerms(r) {
    const e = r.eq;
    const out = [];
    e.r.forEach((t, i) => out.push(Object.assign({ side: 'r', i, key: 'r' + i }, t)));
    e.p.forEach((t, i) => out.push(Object.assign({ side: 'p', i, key: 'p' + i }, t)));
    if (e.cat) out.push(Object.assign({ side: 'r', i: 0, key: 'cat', cat: true, c: 1, s: 'suda' }, e.cat));
    return out;
  }

  /** Statik denklem öğesi (tıklanabilir terimler). onPick(term) */
  function renderEquation(el, r, onPick) {
    el.innerHTML = '';
    const termEls = {};
    const terms = eqTerms(r);
    const term = (t) => {
      const b = h('button.eq-term', { title: onPick ? 'Dokun: diğer gösterimlerde karşılığını gör' : '' },
        t.c > 1 ? h('span.c', { text: String(t.c) }) : null, t.f, h('span.st', { text: '(' + t.s + ')', title: '(' + t.s + '): ' + (STATE_TEXT[t.s] || '') }));
      if (onPick) b.addEventListener('click', () => onPick(t)); else b.disabled = true;
      termEls[t.key] = b;
      return b;
    };
    const rs = terms.filter((t) => t.side === 'r' && !t.cat), ps = terms.filter((t) => t.side === 'p');
    rs.forEach((t, i) => { if (i) el.appendChild(h('span.eq-op', { text: '+' })); el.appendChild(term(t)); });
    const arrow = h('span.eq-arrow', null, '→');
    const catT = terms.find((t) => t.cat);
    if (catT) {
      const cb = h('button.eq-term.eq-cat', { title: 'Tepkimeyi hızlandıran ama harcanmayan madde (katalizör)' }, catT.f);
      if (onPick) cb.addEventListener('click', () => onPick(catT)); else cb.disabled = true;
      termEls.cat = cb;
      arrow.insertBefore(cb, arrow.firstChild);
    }
    el.appendChild(arrow);
    ps.forEach((t, i) => { if (i) el.appendChild(h('span.eq-op', { text: '+' })); el.appendChild(term(t)); });
    return termEls;
  }

  const Stage5 = {
    enter(body) {
      this.body = body;
      const r = S.reaction;
      this.r = r;
      this.seen = new Set();
      this.sel = null;
      this.quizShown = false;

      this.macroEl = h('div.mpanel', null, h('div.pempty', { text: '' }));
      this.microEl = h('div.mpanel.aq', null, h('div.pempty', { text: '' }));
      // Önce / Sonra seçimi makro kartın sağ üst köşesinde küçük bir anahtar
      this.macroBtns = h('div.target-switch.s5-ms', null,
        h('button.btn.sm.ghost', { 'data-s': 'before', text: 'Önce', title: 'Karıştırmadan önce' }),
        h('button.btn.sm.ghost', { 'data-s': 'after', text: 'Sonra', title: 'Karıştırdıktan sonra' }));
      this.macroBtns.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.setMacroState(b.dataset.s)));
      this.eqEl = h('div.equation');
      this.infoEl = h('div.sel-info', { html: 'Bir terime, kaptaki bir bölgeye ya da bir taneciğe dokun.' });
      this.progressEl = h('div.s5-prog');
      // Soru: Sembolik kartın altında çerçeveli blok (soru aşamasına kadar gizli)
      this.quizEl = h('div.s5-q', { hidden: true });
      this.wrongs = 0;

      // Sade başlıklar: kartın sol üstünde renkli noktalı küçük etiket (rep-h; telefonda sekme adı da buradan)
      const lbl = (cls, t) => h('div.rep-h.' + cls, null, h('b', { text: t }));
      const colMacro = h('div.rep-col', null, lbl('macro', 'Makroskobik'), this.macroBtns, this.macroEl);
      const colMicro = h('div.rep-col', null, lbl('micro', 'Tanecik'), this.microEl);
      const colSym = h('div.rep-col', null, lbl('sym', 'Sembolik'),
        h('div.sym-panel', null, this.eqEl, this.progressEl, this.infoEl, this.quizEl));
      body.appendChild(h('div.grid-three.s5', null, colMacro, colMicro, colSym));

      this.macroPanel = V().addPanel(this.macroEl, {
        near: 0.005, minDist: 0.1, labelRoom: 0, fitPad: 1.05,
        onPick: (hit) => {
          const key = this.macro.pickKey(hit);
          if (!key) return;
          const side = this.macro.state === 'before' ? 'r' : 'p';
          const t = eqTerms(r).find((x) => x.side === side && x.m === key);
          this.select(t || { side, m: key, onlyMacro: true });
        }
      });
      this.macro = new T.MacroView(this.macroPanel, r, 'before');

      this.microPanel = V().addPanel(this.microEl, {
        fitPad: 1.08,
        onPick: (hit) => {
          if (!hit || !hit.group) return;
          const side = hit.group.userData.side, sid = hit.group.userData.sid;
          const t = eqTerms(r).find((x) => x.side === side && x.sp.indexOf(sid) >= 0);
          this.select(t || { side, sp: [sid], onlyMicro: true });
        }
      });
      this.microGroups = microPair(this.microPanel, r.before, r.after);

      this.termEls = renderEquation(this.eqEl, r, (t) => this.select(t));
      this.setMacroState('before');
      this.renderProgress();
    },

    setMacroState(s) {
      this.macro.setState(s);
      this.macroBtns.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.s === s));
      if (this.sel) this.macro.highlight(this.sel.side === (s === 'before' ? 'r' : 'p') ? this.sel.m : null);
    },

    select(t) {
      this.sel = t;
      T.Audio.click();
      Object.keys(this.termEls).forEach((k) => this.termEls[k].classList.toggle('sel', t.key === k));
      if (t.key) { this.seen.add(t.key); this.termEls[t.key].classList.add('seen'); }
      const want = t.side === 'r' ? 'before' : 'after';
      if (this.macro.state !== want) this.setMacroState(want);
      this.macro.highlight(t.m || null);
      const sp = t.sp || [];
      this.focusMicro((g) => g.userData.side === t.side && sp.indexOf(g.userData.sid) >= 0);
      this.infoEl.innerHTML = this.describe(t);
      this.renderProgress();
    },

    /* Sade bilgi: ad + Hâl + Kapta. Soru çıkınca (quizShown) tek satırlık hap olur. */
    describe(t) {
      const MT = T.MACRO_TEXT, one = this.quizShown;
      const pill = (parts) => `<div class="s5-info1">${parts.join('<span class="sep">·</span>')}</div>`;
      if (t.onlyMacro) return one ? pill([`<b>${MT[t.m] || t.m}</b>`, 'denklemde ayrı terim yok'])
        : `<div class="s5-nm">${MT[t.m] || t.m}</div><div class="s5-ln">Bu bölge denklemde ayrı bir terimle gösterilmez.</div>`;
      if (t.onlyMicro) return one ? pill([`<b>${T.speciesLabel(t.sp[0])}</b>`, 'denklemde ayrı terim yok'])
        : `<div class="s5-nm">${T.speciesLabel(t.sp[0])} <span>${T.SPECIES[t.sp[0]].name}</span></div><div class="s5-ln">Bu tanecik denklemde ayrı bir terim olarak yazılmaz.</div>`;
      const name = `${t.c > 1 ? t.c + ' ' : ''}${t.f}`;
      if (t.cat) return one ? pill([`<b>${name}</b>`, 'katalizör'])
        : `<div class="s5-nm">${name}</div><div class="s5-ln"><b>Katalizör:</b> tepkimeyi hızlandırır ama harcanmaz; bu yüzden okun üstüne yazılır.</div>`;
      const kap = t.m ? (MT[t.m] || t.m) : null;
      if (one) return pill([`<b>${name} (${t.s})</b>`, t.s === 'suda' ? 'sulu çözelti' : STATE_TEXT[t.s]].concat(kap ? [`Kapta: <b>${kap}</b>`] : []));
      let txt = `<div class="s5-nm">${name} <span>(${t.s})</span></div>`;
      txt += `<div class="s5-ln">Hâl: <b>${STATE_TEXT[t.s]}</b> · ${t.side === 'r' ? 'tepkimeye giren' : 'tepkimede oluşan / ortamda kalan'} madde</div>`;
      if (kap) txt += `<div class="s5-ln">👁 Kapta: <b>${kap}</b></div>`;
      return txt;
    },

    renderProgress() {
      const keys = Object.keys(this.termEls || {});
      const n = keys.filter((k) => this.seen.has(k)).length;
      this.progressEl.innerHTML = `<span>${n < keys.length ? 'Terimlere dokun' : 'Terimler incelendi'}</span><span class="dots" aria-label="${n} / ${keys.length} terim incelendi">`
        + keys.map((k) => `<i class="${this.seen.has(k) ? 'on' : ''}"></i>`).join('') + '</span>';
      if (!this.quizShown && n < keys.length && !S.data.done[5]) {
        T.App.task({ target: this.eqEl.parentNode, step: [1, 2], text: `Denklemdeki bütün terimlere dokun (${n} / ${keys.length})`,
          hint: 'Dokunduğun terim kapta ve tanecik modelinde de vurgulanır. Üç gösterimin aynı şeyi nasıl anlattığına bak.' });
      }
      if ((n >= keys.length || S.data.done[5]) && !this.quizShown) this.showQuiz();
    },

    /* Soru: Sembolik kartın altında çerçeveli blok. Bilgi tek satıra iner, ilerleme noktaları gizlenir.
       İpucu iki basamaklı: 1. yanlışta cevabın kaptaki bölgesinin adı, 2. yanlıştan sonra "Bana göster". */
    showQuiz() {
      this.quizShown = true;
      this.wrongs = 0;
      const r = this.r, q = r.quiz;
      const el = this.quizEl;
      const phone = () => T.Mobile && T.Mobile.on;
      el.innerHTML = '';
      el.hidden = false;
      el.classList.remove('done');
      this.progressEl.hidden = true;
      this.infoEl.innerHTML = this.sel ? this.describe(this.sel) : '';
      const opts = [];
      Object.keys(r.after).concat(Object.keys(r.before)).forEach((s) => { if (opts.indexOf(s) < 0) opts.push(s); });
      let list = opts.slice(0, 5);
      if (list.indexOf(q.ans) < 0) list[0] = q.ans;
      list = T.shuffleSeed(list, r.no + 3);
      // cevabın denklemdeki terimi ve kaptaki bölgesi (ipucu bunu söyler)
      const ansT = eqTerms(r).find((t) => t.side === 'p' && (t.sp || []).indexOf(q.ans) >= 0);
      const region = ansT && ansT.m ? (T.MACRO_TEXT[ansT.m] || ansT.m) : null;
      const hint = region
        ? `Sonra kabında <b>“${region}”</b> bölgesine dokun; tanecik kartında halkayla işaretlenen tanecik cevaptır.`
        : 'Okun sağındaki terimlere dokun; tepkimeden önce olmayan, yeni oluşan tanecik hangisi?';
      const kick = h('div.s5-qk', { text: 'Soru' });
      const qtxt = h('div.s5-qt', { text: q.q });
      const wrap = h('div.opt-list.s5-opts', { role: 'group', 'aria-label': 'Seçenekler' });
      const fb = h('div.s5-fb', { hidden: true, 'aria-live': 'polite' });
      el.append(kick, qtxt, wrap, fb);
      const next = () => { const nb = h('button.btn.success.pulse.s5-next', { text: 'Temsil değiştirmeye geç →' }); nb.addEventListener('click', () => T.App.go(6)); return nb; };
      const markDone = (b) => {
        b.classList.add('right');
        wrap.querySelectorAll('.opt').forEach((x) => { x.disabled = true; x.classList.remove('wrong'); });
        el.classList.add('done');
        kick.textContent = '✓ Doğru bağlantı · ' + T.speciesLabel(q.ans);
        qtxt.textContent = 'Aynı tepkimeyi üç farklı yolla gösterebiliyorsun.';
        fb.hidden = true;
        el.appendChild(next());
      };
      list.forEach((s) => {
        const b = h('button.opt', { title: T.SPECIES[s].name }, h('b', { text: T.speciesLabel(s) }));
        b.addEventListener('click', () => {
          wrap.querySelectorAll('.opt').forEach((x) => x.classList.remove('wrong'));
          if (s === q.ans) {
            T.Audio.success();
            markDone(b);
            T.App.complete(5);
            T.App.task({ target: el, step: [2, 2], text: 'Doğru bağlantı!', hint: 'Gözle gördüğün değişimi taneciklerle ve formüllerle ilişkilendirdin. <b>Temsil değiştirmeye geç</b> düğmesiyle devam et.' });
          } else {
            void b.offsetWidth; // sallanma her yanlışta yeniden oynasın
            b.classList.add('wrong');
            T.Audio.error();
            this.wrongs++;
            fb.hidden = false;
            fb.innerHTML = `<b class="x">${this.wrongs > 1 ? '✗ Yine olmadı.' : '✗ Tekrar düşün.'}</b> ${hint}`;
            if (this.wrongs > 1 && ansT) {
              const sb = h('button.s5-show', { type: 'button', text: '👁 Bana göster' });
              sb.addEventListener('click', () => this.showAnswer(ansT, q.ans));
              fb.appendChild(sb);
            }
            T.App.task({ target: el, step: [2, 2], text: phone() ? '✗ Tekrar düşün' : 'Gösterimleri birleştir', hint });
          }
        });
        wrap.appendChild(b);
      });
      if (S.data.done[5]) {
        const rb = Array.from(wrap.querySelectorAll('.opt')).find((x) => x.textContent === T.speciesLabel(q.ans));
        if (rb) markDone(rb);
        T.App.task({ target: el, step: [2, 2], text: 'Doğru bağlantı!', hint: '<b>Temsil değiştirmeye geç</b> düğmesiyle devam et.' });
      } else {
        T.App.task({ target: el, step: [2, 2], text: phone() ? '❓ Soruyu cevapla' : 'Gösterimleri birleştir',
          hint: 'Sembolik karttaki soruyu cevapla. Takılırsan ipucu kapta hangi bölgeye bakacağını söyler.' });
        // telefonda soru Sembolik sekmesinde: kullanıcı başka sekmedeyse oraya geç
        if (phone()) this.phoneTab('Sembolik');
      }
      window.dispatchEvent(new Event('resize'));
    },

    /* "Bana göster": kap Sonra'ya geçer, cevabın bölgesi ve yalnızca cevap taneciği parlar; seçimi öğrenci yapar */
    showAnswer(t, ans) {
      this.sel = null;
      Object.keys(this.termEls).forEach((k) => this.termEls[k].classList.remove('sel'));
      this.setMacroState('after');
      this.macro.highlight(t.m || null);
      this.focusMicro((g) => g.userData.side === 'p' && g.userData.sid === ans);
      this.infoEl.innerHTML = `<div class="s5-info1">👁 Kapta işaretli:<b>${T.MACRO_TEXT[t.m] || t.m}</b><span class="sep">·</span>tanecik kartına bak</div>`;
      T.Audio.click();
      if (T.Mobile && T.Mobile.on) this.phoneTab('Tanecik');
    },

    /* Odak + ince halka: eşleşenler halkalı, diğerleri soluk; hiçbiri eşleşmezse hepsi normal */
    focusMicro(match) {
      const on = this.microGroups.map((g) => !!match(g));
      const any = on.some(Boolean);
      this.microGroups.forEach((g, i) => {
        if (!!g.userData.hl !== on[i]) Mol.setHighlight(g, on[i]);
        Mol.setDim(g, any && !on[i]);
      });
    },

    phoneTab(name) {
      const b = Array.from(document.querySelectorAll('.m-tabs button')).find((x) => x.textContent.indexOf(name) >= 0);
      if (b && !b.classList.contains('on')) b.click();
    },

    leave() {
      if (T.Mobile && T.Mobile.closeTip) T.Mobile.closeTip();
      this.quizShown = false;
      if (this.macro) { this.macro.dispose(); this.macro = null; }
      if (this.macroPanel) { V().removePanel(this.macroPanel); this.macroPanel = null; }
      if (this.microPanel) { V().removePanel(this.microPanel); this.microPanel = null; }
    }
  };

  T.microPair = microPair;
  T.eqTerms = eqTerms;
  T.renderEquation = renderEquation;
  T.Stage5 = Stage5;
})(window.TUY);
