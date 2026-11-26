/* AŞAMA 3 — Atomun izini sür: işaretlenen atom tepkime sonrasında hangi taneciktedir?
   Düzen (öğretmenin tasarımı, A2): solda görev kartı · Önce → Sonra.
   Canlandırma ayrı bir kartta değil, Önce kartında oynar; bitince kart başlangıç hâline döner. */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State, Mol = T.Mol, V = () => T.Viewer;

  function expand(ms) { const o = []; Object.keys(ms).forEach((s) => { for (let i = 0; i < ms[s]; i++) o.push(s); }); return o; }
  const LAY = { gap: 0.9, aspect: 1.6 }; // canlandırmanın (Rearranger) yerleşimiyle aynı: geçişte tanecikler yerinden oynamaz

  const Stage3 = {
    enter(body) {
      const r = S.reaction;
      this.r = r;
      this.model = S.data.model;
      this.tasks = r.track;
      this.ti = 0;
      this.results = [];
      const mk = (title, sub, n, reg) => h('div.mpanel.aq', null,
        h('div.ptitle', null, h('span.n.r-' + reg, { text: n }), title, h('span.psub', { text: sub })), h('div.pempty'));
      this.pBefore = mk('Önce', '· karıştırmadan önce', '1', 'before');
      this.pAfter = mk('Sonra', '· tepkime bitince', '2', 'after');
      this.playBtn = h('button.btn.sm.primary', { text: '▶ Oynat' });
      this.slider = h('input', { type: 'range', min: 0, max: 1000, value: 0, style: { width: '140px' }, 'aria-label': 'Zaman' });
      this.pbtns = h('div.pbtns', null, this.slider, this.playBtn);
      this.pbtns.hidden = true; // atom işaretlenince görünür
      this.pBefore.appendChild(this.pbtns);
      this.capB = h('div.pnote.trk-cap');
      this.capA = h('div.pnote.trk-cap');
      this.pBefore.appendChild(this.capB);
      this.pAfter.appendChild(this.capA);
      // Önce → Sonra oku: canlandırma sırasında sarı, görev bitince yeşil
      this.arrow = h('div.trk-arrow', { 'aria-hidden': 'true' }, h('span.sh', { text: '→' }), h('small', { text: 'tepkime' }));
      this.side = h('div.side-card.trk-side');
      body.appendChild(h('div.grid-track.track-a', null, h('div.track-main', null, this.pBefore, this.arrow, this.pAfter), this.side));
      this.footer = h('div.ws-footer', null, h('span.grow', { html: 'Atomların izini sürerek <b>atomların yok olmadığını, yeniden düzenlendiğini</b> göreceksin.' }));
      body.appendChild(this.footer);

      this.vb = V().addPanel(this.pBefore, { fitPad: 1.2, onPick: (hit) => this.pickBefore(hit) });
      this.va = V().addPanel(this.pAfter, { fitPad: 1.2, onPick: (hit) => this.pickAfter(hit) });
      this.vb.onUpdate((dt) => this._tick(dt));
      this.playBtn.addEventListener('click', () => this.play());
      this.slider.addEventListener('input', () => {
        if (!this.rearr) return;
        this.rewinding = false; clearTimeout(this._backTmr);
        this.rearr.pause();
        const t = this.slider.value / 1000;
        this.showAnim(t > 0);
        this.rearr.seek(t);
        this.paintCaps();
        if (t >= 1 && this.step === 2) this.onPlayed();
      });
      this.buildStatic();
      this.startTask();
    },
    buildStatic() {
      this.bIds = expand(this.model.before);
      this.aIds = expand(this.model.after);
      const add = (panel, ids) => {
        const gs = ids.map((sid, i) => { const g = Mol.build(sid, { labelH: 0.55 }); g.userData.pickable = true; g.userData.index = i; return g; });
        const pos = Mol.layout(gs, LAY);
        gs.forEach((g, i) => { g.position.copy(pos[i]); panel.root.add(g); });
        return gs;
      };
      this.bGroups = add(this.vb, this.bIds);
      this.aGroups = add(this.va, this.aIds);
      this.va.fit(true);
      // canlandırma Önce kartında: kadraj baştan hem önce hem sonra konumlarını kapsar (oynarken kamera zıplamaz)
      this.rearr = new T.Rearranger(this.vb, this.model.before, this.model.after, { duration: 6.5 });
      this.rearr.group.visible = false;
      this.vb.fit(true, this.rearr.fitBoth());
    },
    /** Önce kartında durağan tanecikler ↔ canlandırma */
    showAnim(on) {
      this.rearr.group.visible = on;
      this.bGroups.forEach((g) => { g.visible = !on; });
    },
    _tick(dt) {
      const R = this.rearr;
      if (!R) return;
      if (this.rewinding) {
        // canlandırma bitti: kart kısa bir geri sarmayla başlangıç hâline döner
        R.seek(Math.max(0, R.t - dt * 1.6));
        this.slider.value = Math.round(R.t * 1000);
        if (R.t <= 0) {
          this.rewinding = false;
          this.showAnim(false);
          this.arrow.classList.remove('on');
          if (this.step === 2) { this.step = 3; this.renderSide(); this._afterFirstPlay(); }
          else if (this.step === 3) this.arrow.classList.remove('on');
          this.paintCaps();
        }
        return;
      }
      R.update(dt);
      if (R.playing) this.slider.value = Math.round(R.t * 1000);
    },
    startTask() {
      const t = this.tasks[this.ti];
      this.step = 1;
      this.chosenB = null;
      this.mapInfo = null;
      this.rewinding = false; clearTimeout(this._backTmr);
      if (this.rearr) { this.rearr.pause(); this.rearr.untrack(); this.rearr.seek(0); this.showAnim(false); this.slider.value = 0; }
      this.pbtns.hidden = true;
      this.playBtn.textContent = '▶ Oynat';
      this.arrow.className = 'trk-arrow';
      this.pAfter.classList.remove('trk-done');
      this.clearMarks();
      this.renderSide();
      // modelde bu atom var mı?
      const has = this.bIds.some((sid) => T.SPECIES[sid].atoms.some((a) => a.el === t.el));
      if (!has) {
        this.fb('bad', 'Modelinde bu atom yok', `Tepkime öncesi modelinde <b>${t.name}</b> atomu içeren bir tanecik bulunmuyor. Kaplardaki maddeleri düşün ve modelini düzelt.`,
          [{ text: '← Modeline dön (Aşama 2)', cls: '.primary', onclick: () => T.App.go(2) }]);
      }
    },
    /* Görev kartı (solda): küçük başlık + büyük görev cümlesi + 3 adım + dönüt + renk anahtarı.
       Telefonda aynı kart "Görev" sekmesidir. */
    renderSide() {
      const t = this.tasks[this.ti];
      const steps = [
        `Başlangıçta <b>${t.name}</b> atomu içeren taneciğe dokun.`,
        'İşaretlenen atomu takip et: <b>▶ Oynat</b> ile izle.',
        'Son durumda aynı atomun hangi tanecikte olduğunu seç.'
      ];
      this.side.innerHTML = '';
      this.side.appendChild(h('h3', { text: `🎯 Görev ${this.ti + 1}/${this.tasks.length}` }));
      // renk noktası son kelimeyle aynı satırda kalsın
      this.side.appendChild(h('div.trk-title', null, `${cap(t.name)} atomunun izini `,
        h('span.nw', null, 'sür.', h('span.wt-dot', { style: { background: U.hex(T.ELEMENTS[t.el].color) } }))));
      if (t.spectator) this.side.appendChild(h('p.small.muted', { style: { margin: '-4px 0 2px' }, text: 'Bu atom bir iyonun içinde: tepkimede değişip değişmediğine bak.' }));
      const ol = h('ul.track-steps');
      steps.forEach((s, i) => {
        const li = h('li', { 'data-n': String(i + 1), html: s });
        if (i + 1 < this.step) li.classList.add('done');
        if (i + 1 === this.step) li.classList.add('now');
        ol.appendChild(li);
      });
      this.side.appendChild(ol);
      this.fbEl = h('div');
      this.side.appendChild(this.fbEl);
      const leg = h('div.legend.trk-keys');
      const els = new Set(); this.bIds.concat(this.aIds).forEach((sid) => T.SPECIES[sid].atoms.forEach((a) => els.add(a.el)));
      T.EL_ORDER.filter((e) => els.has(e)).forEach((e) => leg.appendChild(h('span', null, h('i', { style: { background: U.hex(T.ELEMENTS[e].color) } }), h('b', { text: e }), ' ' + T.ELEMENTS[e].name)));
      leg.appendChild(h('span.tk', null, h('i'), 'Takip edilen atom'));
      this.side.appendChild(leg);
      this.fbState = null;
      this.paintCaps();
      this.strip();
    },
    /** Kartların altındaki kısa yönlendirme yazıları */
    paintCaps() {
      const t = this.tasks[this.ti];
      const R = this.rearr;
      let b = '', a = '';
      if (this.step === 1) { b = `İzlenecek atomu içeren taneciğe <b>dokun</b>.`; a = 'Tepkime bitince kapta bulunan tanecikler.'; }
      else if (this.step === 2) {
        b = R && (R.playing || R.t > 0) ? 'Sarı halkalı atomu gözünle takip et…' : `${cap(t.name)} atomu işaretlendi. <b>▶ Oynat</b>'a bas.`;
        a = 'Tepkime bitince kapta bulunan tanecikler.';
        if (this._played && R && R.t >= 0.98) b = '<span class="ev">✓ Atomlar yeniden düzenlendi. Şimdi <b>Sonra</b> kartına bak.</span>';
      } else if (this.step === 3) {
        const moving = R && (R.playing || R.t > 0);
        b = !moving ? 'Tekrar izlemek için <b>↺ Tekrar izle</b>.'
          : R.t >= 0.98 && !R.playing ? '<span class="ev">✓ Atomlar yeniden düzenlendi.</span>' : 'Sarı halkalı atomu gözünle takip et…';
        a = `Aynı ${t.name} atomu şimdi hangi tanecikte? <b>Dokun.</b>`;
      } else { b = ''; a = this._doneCap || ''; }
      this.capB.innerHTML = b;
      this.capA.innerHTML = a;
    },
    /* Görev şeridi: masaüstünde görev başlığı + ilerleme (adımlar soldaki kartta).
       Telefonda şerit üst barda tek satırdır: orada metin o anki eylemi söyler. */
    strip() {
      const t = this.tasks[this.ti];
      const st = [this.ti + 1, this.tasks.length];
      const phone = T.Mobile && T.Mobile.on;
      const dot = `<span class="wt-dot" style="background:${U.hex(T.ELEMENTS[t.el].color)}"></span>`;
      const f = this.fbState;
      if (this.step >= 4 && f && f.kind === 'ok') {
        // telefonda Görev sekmesine geçilsin diye kart hedeflenir; masaüstünde düğme zaten şeritte
        T.App.task({ step: st, kind: 'ok', kicker: 'Görev tamamlandı', target: phone ? this.side : null, tag: false,
          text: f.title, hint: f.text, actions: (f.actions || []).map((x) => this._btn(x)) });
        return;
      }
      const P = [
        { target: this.pBefore, act: `${cap(t.name)} atomunu içeren taneciğe dokun` },
        { target: this.pBefore, act: '▶ Oynat: işaretli atomu gözünle takip et' },
        { target: this.pAfter, act: 'Atom şimdi hangi tanecikte? Ona dokun' }
      ][Math.min(2, this.step - 1)];
      T.App.task({ step: st, target: P.target,
        text: phone ? P.act : `${cap(t.name)} atomunun izini sür ${dot}`,
        hint: 'Adımlar soldaki görev kartında.' });
    },
    _btn(a) {
      const b = h('button.btn.sm' + (a.cls || ''), { text: a.text });
      b.addEventListener('click', a.onclick);
      return b;
    },
    /** Dönüt görev kartında. actions: [{text, cls, onclick}].
        Doğru takipte düğme masaüstünde yeşil şeritte; kartta yalnızca telefonda görünür. */
    fb(kind, title, text, actions) {
      this.fbEl.innerHTML = '';
      const d = h('div.feedback.' + kind, { html: (title ? '<b>' + title + '</b>' : '') + text });
      this.fbEl.appendChild(d);
      if (actions && actions.length) this.fbEl.appendChild(h('div.trk-acts' + (kind === 'ok' ? '.in-strip' : ''), null, ...actions.map((a) => this._btn(a))));
      this.fbState = { kind, title, text, actions };
      this.strip();
    },
    clearMarks() {
      (this.bGroups || []).concat(this.aGroups || []).forEach((g) => {
        Mol.setHighlight(g, false);
        g.traverse((o) => { if (o.userData && o.userData.ring) o.parent.remove(o); });
        g.userData.atoms.forEach((m) => { if (m.userData.prevMat) { m.material = Mol.atomMaterial(m.userData.el); m.userData.prevMat = null; } m.children.slice().forEach((c) => { if (c.userData.ring) m.remove(c); }); });
      });
    },
    pickBefore(hit) {
      if (this.step !== 1 || !hit || !hit.group) return;
      const t = this.tasks[this.ti];
      const g = hit.group;
      const sp = T.SPECIES[g.userData.sid];
      const idx = sp.atoms.findIndex((a) => a.el === t.el);
      if (idx < 0) {
        T.Audio.error();
        this.fb('warn', 'Bu tanecikte yok', `<b>${T.speciesLabel(g.userData.sid)}</b> taneciğinde ${t.name} atomu yok. Renk anahtarına bak ve ${t.name} atomu içeren taneciği bul.`);
        return;
      }
      T.Audio.click();
      this.chosenB = g.userData.index;
      Mol.markAtom(g.userData.atoms[idx], 0xffd84a);
      this.mapInfo = this.rearr.track({ bi: this.chosenB, el: t.el });
      this.step = 2;
      this._played = false;
      this.pbtns.hidden = false;
      this.renderSide();
      // oynatma çubuğu belirdi: kadraj alttaki çubuk ve yazı için yer açsın
      requestAnimationFrame(() => this.vb.fit(false, this.rearr.fitBoth()));
      this.fb('info', 'Atom işaretlendi', `${T.speciesLabel(g.userData.sid)} içindeki ${t.name} atomu sarı halkayla işaretlendi. Şimdi aynı kartta <b>▶ Oynat</b> düğmesine bas ve onu gözünle takip et.`);
      this.playBtn.classList.add('pulse');
    },
    play() {
      if (!this.rearr) return;
      this.playBtn.classList.remove('pulse');
      this.rewinding = false; clearTimeout(this._backTmr);
      if (this.rearr.t >= 1) this.rearr.seek(0);
      this.showAnim(true);
      this.arrow.classList.add('on');
      this.rearr.play(() => this.onPlayed());
      this.paintCaps();
    },
    /** Canlandırma sona ulaştı: sonuç bir an görünür, sonra kart geri sarılır */
    onPlayed() {
      this._played = true;
      this.paintCaps();
      clearTimeout(this._backTmr);
      this._backTmr = setTimeout(() => { if (this.rearr && this.rearr.t >= 0.98 && !this.rearr.playing) this.rewinding = true; }, 1300);
    },
    /** İlk izlemeden sonra: sıra Sonra kartında */
    _afterFirstPlay() {
      this.playBtn.textContent = '↺ Tekrar izle';
      if (this.mapInfo && this.mapInfo.lost) {
        this.fb('bad', 'Atom kayboldu mu?', 'İşaretli atom tepkime sonrasında hiçbir taneciğe gitmedi ve kayboldu. Gerçekte <b>atomlar yok olamaz</b>! Modelinin tepkime sonrası bölümünde bu atomu içeren bir tanecik eksik. Bunu 4. aşamada test edip düzelteceksin.',
          [{ text: '← Modelini düzelt', onclick: () => T.App.go(2) }, { text: 'Devam et', cls: '.primary', onclick: () => this.finishTask(false) }]);
      } else this.fb('info', 'Şimdi sen bul', 'Animasyonu istediğin kadar tekrar izleyebilir ya da kaydırıcıyla ileri geri sarabilirsin. Sonra <b><span class="sn r-after">2</span>Sonra</b> kartında atomun bulunduğu taneciğe dokun.');
    },
    pickAfter(hit) {
      if (this.step !== 3 || !hit || !hit.group) return;
      const t = this.tasks[this.ti];
      const g = hit.group;
      const target = this.mapInfo ? this.mapInfo.afterIndex : -1;
      if (target < 0) return;
      const ok = g.userData.index === target || g.userData.sid === this.aIds[target];
      if (ok) {
        T.Audio.success();
        Mol.setHighlight(g, true, 0x34d399);
        const idx = T.SPECIES[g.userData.sid].atoms.findIndex((a) => a.el === t.el);
        if (idx >= 0) Mol.markAtom(g.userData.atoms[idx], 0xffd84a);
        const lb = T.speciesLabel(g.userData.sid), lb0 = T.speciesLabel(this.bIds[this.chosenB]);
        // şeritte: başlık = ne oldu, alt satır = ne öğrendin
        const title = t.spectator
          ? `${cap(t.name)} atomu tepkime boyunca ${lb} olarak kaldı.`
          : `Aynı ${t.name} atomu şimdi ${lb} taneciğinde.`;
        const txt = t.spectator
          ? 'Bu iyon tepkimede değişmedi; çözeltide serbest kaldı.'
          : 'Atom yok olmadı, yeni atom oluşmadı; atomlar <b>yeniden düzenlendi</b>.';
        this._doneCap = `<span class="ev"><b>${lb}</b> içindeki ${t.name}, başlangıçta <b>${lb0}</b> içindeydi.</span>`;
        this.step = 4;
        this.arrow.className = 'trk-arrow ok';
        this.arrow.querySelector('small').textContent = 'aynı atom';
        this.pAfter.classList.add('trk-done');
        this.renderSide();
        this.fb('ok', title, txt, [{ text: this.ti + 1 < this.tasks.length ? 'Sonraki görev →' : 'Aşamayı tamamla →', cls: '.success', onclick: () => this.finishTask(true) }]);
      } else {
        T.Audio.error();
        const has = T.SPECIES[g.userData.sid].atoms.some((a) => a.el === t.el);
        this.fb('warn', 'Tekrar izle', has
          ? `<b>${T.speciesLabel(g.userData.sid)}</b> taneciğinde de ${t.name} var ama işaretli atom buraya gitmedi. <b>↺ Tekrar izle</b> ile sarı halkayı takip et.`
          : `<b>${T.speciesLabel(g.userData.sid)}</b> taneciğinde hiç ${t.name} atomu yok. İşaretli atomun nereye gittiğini tekrar izle.`);
      }
    },
    finishTask(ok) {
      this.results.push(ok);
      S.data.trackLog = this.results; S.save();
      this._doneCap = '';
      this.arrow.querySelector('small').textContent = 'tepkime';
      if (this.ti + 1 < this.tasks.length) { this.ti++; this.startTask(); return; }
      T.App.complete(3);
      this.side.innerHTML = '';
      this.side.appendChild(h('h3', { html: '✅ Atom takibi tamamlandı' }));
      this.side.appendChild(h('div.feedback.ok', { html: '<b>Ne öğrendin?</b>Kimyasal tepkimede atomlar yok olmaz ve yoktan var olmaz. Tanecikler arasındaki bağlar kırılır, atomlar <b>yeniden düzenlenerek</b> yeni tanecikler oluşturur. Bazı iyonlar ise hiç değişmeden çözeltide kalır.' }));
      const nb = h('button.btn.success.block.pulse.trk-acts.in-strip', { text: 'Modelimi test et →' });
      nb.addEventListener('click', () => T.App.go(4));
      this.side.appendChild(nb);
      this.arrow.className = 'trk-arrow ok';
      this.capB.innerHTML = ''; this.capA.innerHTML = '';
      const go4 = h('button.btn.sm.success', { text: 'Modelimi test et →' });
      go4.addEventListener('click', () => T.App.go(4));
      T.App.task({ step: [this.tasks.length, this.tasks.length], kind: 'ok', kicker: 'Aşama tamamlandı', target: T.Mobile && T.Mobile.on ? this.side : null, tag: false,
        text: 'Atom takibi tamamlandı: atomlar yok olmadı, yeniden düzenlendi.',
        hint: 'Tanecikler arasındaki bağlar kırılır, atomlar yeni tanecikler oluşturur. Bazı iyonlar hiç değişmeden çözeltide kalır.',
        actions: [go4] });
    },
    leave() { clearTimeout(this._backTmr); if (this.rearr) { this.rearr.dispose(); this.rearr = null; } }
  };
  function cap(s) { return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1); }
  T.Stage3 = Stage3;
})(window.TUY);
