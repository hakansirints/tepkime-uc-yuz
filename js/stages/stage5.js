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
    // vurgu halesi
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.BackSide });
    groups.forEach((g) => {
      const halo = new THREE.Mesh(new THREE.SphereGeometry(g.userData.radius + 0.28, 32, 20), haloMat);
      halo.userData.ghost = true; halo.userData.noPick = true; halo.visible = false;
      g.add(halo); g.userData.halo = halo;
    });
    p.onUpdate((dt, t) => {
      haloMat.opacity = 0.2 + Math.sin(t * 5) * 0.08;
      groups.forEach((g, i) => {
        if (T.SPECIES[g.userData.sid].kind !== 'crystal') g.rotation.y = Math.sin(t * 0.5 + i) * 0.4;
        g.scale.setScalar(g.userData.hl ? 1.06 + Math.sin(t * 6) * 0.04 : 1);
        g.userData.halo.visible = !!g.userData.hl;
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
        t.c > 1 ? h('span.c', { text: String(t.c) }) : null, t.f, h('span.st', { text: '(' + t.s + ')' }));
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
      this.macroBtns = h('div.target-switch', null,
        h('button.btn.sm.ghost', { 'data-s': 'before', text: 'Karıştırmadan önce' }),
        h('button.btn.sm.ghost', { 'data-s': 'after', text: 'Karıştırdıktan sonra' }));
      this.macroBtns.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.setMacroState(b.dataset.s)));
      this.eqEl = h('div.equation');
      this.infoEl = h('div.sel-info', { html: 'Denklemdeki bir <b>terime</b>, kaptaki bir <b>bölgeye</b> ya da bir <b>taneciğe</b> dokun.' });
      this.quizEl = h('div');
      this.progressEl = h('div.small.muted', { style: { marginTop: '8px' } });

      const colMacro = h('div.rep-col', null,
        h('div.rep-h.macro', null, h('b', { text: '👁 Makroskobik' }), h('span', { text: 'Gözle görülen' })),
        this.macroBtns, this.macroEl);
      const colMicro = h('div.rep-col', null,
        h('div.rep-h.micro', null, h('b', { text: '⚛ Tanecik' }), h('span', { text: 'Atomlar, iyonlar, moleküller' })),
        this.microEl);
      const colSym = h('div.rep-col', null,
        h('div.rep-h.sym', null, h('b', { text: '✎ Sembolik' }), h('span', { text: 'Kimyasal denklem' })),
        h('div.sym-panel', null, this.eqEl, this.infoEl,
          h('div.legend', { html: '<b>Fiziksel hâl sembolleri:</b> (k) katı · (s) sıvı · (g) gaz · (suda) sulu çözelti' }),
          this.progressEl, this.quizEl));
      body.appendChild(h('div.grid-three', null, colMacro, colMicro, colSym));

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
      this.microGroups.forEach((g) => {
        const on = g.userData.side === t.side && sp.indexOf(g.userData.sid) >= 0;
        if (!!g.userData.hl !== on) Mol.setHighlight(g, on, 0xffc400);
      });
      this.infoEl.innerHTML = this.describe(t);
      this.renderProgress();
    },

    describe(t) {
      const MT = T.MACRO_TEXT;
      if (t.onlyMacro) return `<b>${MT[t.m] || t.m}</b><br>Bu bölge denklemde ayrı bir terimle gösterilmez.`;
      if (t.onlyMicro) return `<b>${T.speciesLabel(t.sp[0])}</b> — ${T.SPECIES[t.sp[0]].name}<br>Bu tanecik denklemde ayrı bir terim olarak yazılmaz.`;
      const parts = (t.sp || []).map((s) => '<b>' + T.speciesLabel(s) + '</b> (' + T.SPECIES[s].name.toLocaleLowerCase('tr-TR') + ')').join(' ve ');
      let txt = `<div style="font-size:16px;font-weight:700;margin-bottom:4px">${t.c > 1 ? t.c + ' ' : ''}${t.f} ${t.cat ? '' : '<span class="muted">(' + t.s + ')</span>'}</div>`;
      if (t.cat) return txt + `<b>Katalizör:</b> tepkimeyi hızlandırır ama harcanmaz; bu yüzden okun üstüne yazılır. Tanecik modelinde ${parts} hem öncesinde hem sonrasında aynen bulunur.`;
      txt += `<div>Hâl: <b>${STATE_TEXT[t.s]}</b> · ${t.side === 'r' ? 'tepkimeye giren' : 'tepkimede oluşan / ortamda kalan'} madde</div>`;
      txt += `<div style="margin-top:4px">⚛ Tanecik gösteriminde: ${parts}.</div>`;
      if (t.s === 'suda' && t.sp.length > 1) txt += '<div class="small muted" style="margin-top:4px">Sulu çözeltide bu madde tek bir “paket” değil, ayrı iyonlar hâlinde bulunur. Denklemde ise formülüyle yazılır.</div>';
      if (t.s === 'k' && /\(k\)$/.test(t.sp[0])) txt += '<div class="small muted" style="margin-top:4px">Katı, düzenli bir kristal yapıdır: iyonlar sıra sıra dizilir.</div>';
      if (t.c > 1) txt += `<div class="small muted" style="margin-top:4px">Katsayı ${t.c}: bu birimden ${t.c} tane vardır. Katsayılar atom sayılarının iki tarafta eşit olmasını sağlar.</div>`;
      if (t.m) txt += `<div style="margin-top:4px">👁 Kapta: <b>${MT[t.m] || t.m}</b></div>`;
      return txt;
    },

    renderProgress() {
      const keys = Object.keys(this.termEls || {});
      const n = keys.filter((k) => this.seen.has(k)).length;
      this.progressEl.innerHTML = `İncelenen terim: <b>${n} / ${keys.length}</b>` + (n < keys.length ? ' — denklemdeki bütün terimlere dokun.' : ' ✓');
      if ((n >= keys.length || S.data.done[5]) && !this.quizShown) this.showQuiz();
    },

    showQuiz() {
      this.quizShown = true;
      const r = this.r, q = r.quiz;
      const el = this.quizEl;
      el.innerHTML = '';
      el.appendChild(h('h3', { style: { marginTop: '12px' }, html: '❓ Gösterimleri birleştir' }));
      el.appendChild(h('p', { style: { margin: '4px 0 8px' }, text: q.q }));
      const opts = [];
      Object.keys(r.after).concat(Object.keys(r.before)).forEach((s) => { if (opts.indexOf(s) < 0) opts.push(s); });
      let list = opts.slice(0, 5);
      if (list.indexOf(q.ans) < 0) list[0] = q.ans;
      list = T.shuffleSeed(list, r.no + 3);
      const fb = h('div');
      const wrap = h('div.opt-list');
      const next = () => { const nb = h('button.btn.success.block.pulse', { text: 'Temsil değiştirmeye geç →', style: { marginTop: '6px' } }); nb.addEventListener('click', () => T.App.go(6)); return nb; };
      list.forEach((s) => {
        const b = h('button.opt', null, h('b', { text: T.speciesLabel(s) }), ' ', h('span.muted', { text: T.SPECIES[s].name }));
        b.addEventListener('click', () => {
          wrap.querySelectorAll('.opt').forEach((x) => x.classList.remove('wrong'));
          fb.innerHTML = '';
          if (s === q.ans) {
            b.classList.add('right');
            wrap.querySelectorAll('.opt').forEach((x) => { x.disabled = true; });
            T.Audio.success();
            fb.appendChild(h('div.feedback.ok', { html: '<b>✓ Doğru bağlantı</b>Gözle gördüğün değişimi taneciklerle ve formüllerle ilişkilendirdin. Aynı tepkimeyi üç farklı yolla gösterebiliyorsun.' }));
            fb.appendChild(next());
            T.App.complete(5);
          } else {
            b.classList.add('wrong');
            T.Audio.error();
            fb.appendChild(h('div.feedback.warn', { html: '<b>Tekrar düşün</b>Kapta o değişimi gösteren bölgeye dokun. Tanecik gösteriminde hangi tanecikler parlıyor? Denklemde hangi terim seçiliyor?' }));
          }
        });
        wrap.appendChild(b);
      });
      el.appendChild(wrap);
      el.appendChild(fb);
      if (S.data.done[5]) fb.appendChild(next());
    },

    leave() {
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
