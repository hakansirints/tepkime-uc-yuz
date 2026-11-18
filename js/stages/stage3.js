/* AŞAMA 3 — Atomun izini sür: işaretlenen atom tepkime sonrasında hangi taneciktedir? */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State, Mol = T.Mol, V = () => T.Viewer;

  function expand(ms) { const o = []; Object.keys(ms).forEach((s) => { for (let i = 0; i < ms[s]; i++) o.push(s); }); return o; }

  const Stage3 = {
    enter(body) {
      const r = S.reaction;
      this.r = r;
      this.model = S.data.model;
      this.tasks = r.track;
      this.ti = 0;
      this.results = [];
      const mk = (title, n, note, aq) => h('div.mpanel' + (aq ? '.aq' : ''), null,
        h('div.ptitle', null, h('span.n', { text: n }), title), h('div.pempty'));
      this.pBefore = mk('Önce', '1', 'İzlenecek atomu içeren taneciğe dokun.', true);
      this.pMid = mk('Atom hareket ederken', '2', 'Sarı halkalı atomu izle.', false);
      this.pAfter = mk('Sonra', '3', 'Aynı atom şimdi hangi tanecikte? Dokun.', true);
      this.playBtn = h('button.btn.sm.primary', { text: '▶ Oynat' });
      this.slider = h('input', { type: 'range', min: 0, max: 1000, value: 0, style: { width: '120px' }, 'aria-label': 'Zaman' });
      this.pMid.appendChild(h('div.pbtns', null, this.slider, this.playBtn));
      this.side = h('div.side-card');
      body.appendChild(h('div.grid-track', null, h('div.track-main', null, this.pBefore, this.pMid, this.pAfter), this.side));
      this.footer = h('div.ws-footer', null, h('span.grow', { html: 'Atomların izini sürerek <b>atomların yok olmadığını, yeniden düzenlendiğini</b> göreceksin.' }));
      body.appendChild(this.footer);

      this.vb = V().addPanel(this.pBefore, { fitPad: 1.2, onPick: (hit) => this.pickBefore(hit) });
      this.va = V().addPanel(this.pAfter, { fitPad: 1.2, onPick: (hit) => this.pickAfter(hit) });
      this.vm = V().addPanel(this.pMid, { fitPad: 1.05 });
      this.vm.onUpdate((dt) => {
        if (this.rearr) {
          this.rearr.update(dt);
          if (this.rearr.playing) this.slider.value = Math.round(this.rearr.t * 1000);
        }
      });
      this.playBtn.addEventListener('click', () => this.play());
      this.slider.addEventListener('input', () => { if (this.rearr) { this.rearr.pause(); this.rearr.seek(this.slider.value / 1000); } });
      this.buildStatic();
      this.startTask();
    },
    buildStatic() {
      const add = (panel, ids) => {
        const gs = ids.map((sid, i) => { const g = Mol.build(sid, { labelH: 0.55 }); g.userData.pickable = true; g.userData.index = i; return g; });
        const pos = Mol.layout(gs, { gap: 0.9, aspect: 1.6 });
        gs.forEach((g, i) => { g.position.copy(pos[i]); panel.root.add(g); });
        panel.fit(true);
        return gs;
      };
      this.bIds = expand(this.model.before);
      this.aIds = expand(this.model.after);
      this.bGroups = add(this.vb, this.bIds);
      this.aGroups = add(this.va, this.aIds);
      this.rearr = new T.Rearranger(this.vm, this.model.before, this.model.after, { duration: 6.5 });
      this.vm.fit(true, this.rearr.fitBoth());
    },
    startTask() {
      const t = this.tasks[this.ti];
      this.step = 1;
      this.chosenB = null;
      this.mapInfo = null;
      if (this.rearr) { this.rearr.untrack(); this.rearr.seek(0); this.slider.value = 0; }
      this.clearMarks();
      this.renderSide();
      // modelde bu atom var mı?
      const has = this.bIds.some((sid) => T.SPECIES[sid].atoms.some((a) => a.el === t.el));
      if (!has) {
        this.fb('bad', 'Modelinde bu atom yok', `Tepkime öncesi modelinde <b>${t.name}</b> atomu içeren bir tanecik bulunmuyor. Kaplardaki maddeleri düşün ve modelini düzelt.`,
          h('button.btn.primary.sm', { text: '← Modeline dön (Aşama 2)', onclick: () => T.App.go(2) }));
      }
    },
    renderSide() {
      const t = this.tasks[this.ti];
      const steps = [
        `Başlangıçta <b>${t.name}</b> atomu içeren taneciğe dokun.`,
        'İşaretlenen atomu takip et: <b>▶ Oynat</b> ile izle.',
        'Son durumda aynı atomun hangi tanecikte olduğunu seç.'
      ];
      this.side.innerHTML = '';
      this.side.appendChild(h('h3', { html: `🎯 Görev ${this.ti + 1}/${this.tasks.length}: ${t.spectator ? 'Bir iyonu izle' : 'Atomun izini sür'}` }));
      this.side.appendChild(h('p.small', { style: { margin: '0 0 8px', lineHeight: 1.45 }, html: `<b>${cap(t.name)}</b> atomunun izini sür. <span class="dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:-1px;background:${U.hex(T.ELEMENTS[t.el].color)}"></span> ${t.el}` }));
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
      const leg = h('div.legend', { style: { marginTop: '10px' } });
      const els = new Set(); this.bIds.concat(this.aIds).forEach((sid) => T.SPECIES[sid].atoms.forEach((a) => els.add(a.el)));
      T.EL_ORDER.filter((e) => els.has(e)).forEach((e) => leg.appendChild(h('span', null, h('i', { style: { background: U.hex(T.ELEMENTS[e].color) } }), e + ' ' + T.ELEMENTS[e].name)));
      this.side.appendChild(leg);
    },
    fb(kind, title, text, extra) {
      this.fbEl.innerHTML = '';
      const d = h('div.feedback.' + kind, { html: (title ? '<b>' + title + '</b>' : '') + text });
      this.fbEl.appendChild(d);
      if (extra) this.fbEl.appendChild(extra);
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
      this.renderSide();
      this.fb('info', 'Atom işaretlendi', `${T.speciesLabel(g.userData.sid)} içindeki ${t.name} atomu sarı halkayla işaretlendi. Şimdi <b>▶ Oynat</b> düğmesine bas ve onu gözünle takip et.`);
      this.playBtn.classList.add('pulse');
    },
    play() {
      if (!this.rearr) return;
      this.playBtn.classList.remove('pulse');
      this.rearr.play(() => {
        if (this.step === 2) {
          this.step = 3;
          this.renderSide();
          if (this.mapInfo && this.mapInfo.lost) {
            this.fb('bad', 'Atom kayboldu mu?', 'İşaretli atom tepkime sonrasında hiçbir taneciğe gitmedi ve kayboldu. Gerçekte <b>atomlar yok olamaz</b>! Modelinin tepkime sonrası bölümünde bu atomu içeren bir tanecik eksik. Bunu 4. aşamada test edip düzelteceksin.',
              h('div', { style: { display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' } },
                h('button.btn.sm', { text: '← Modelini düzelt', onclick: () => T.App.go(2) }),
                h('button.btn.sm.primary', { text: 'Devam et', onclick: () => this.finishTask(false) })));
          } else this.fb('info', 'Şimdi sen bul', 'Animasyonu istediğin kadar tekrar izleyebilir ya da kaydırıcıyla ileri geri sarabilirsin. Sonra <b>Sonra</b> panelinde atomun bulunduğu taneciğe dokun.');
        }
      });
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
        const txt = t.spectator
          ? `Doğru! ${cap(t.name)} atomu tepkime boyunca <b>${T.speciesLabel(g.userData.sid)}</b> olarak kaldı. Bu iyon tepkimede değişmedi; çözeltide serbest kaldı.`
          : `Doğru! Aynı ${t.name} atomu şimdi <b>${T.speciesLabel(g.userData.sid)}</b> taneciğinde. Atom yok olmadı, yeni atom oluşmadı; atomlar <b>yeniden düzenlendi</b>.`;
        this.step = 4;
        this.renderSide();
        this.fb('ok', 'Doğru takip', txt, h('button.btn.success.sm', { style: { marginTop: '6px' }, text: this.ti + 1 < this.tasks.length ? 'Sonraki görev →' : 'Aşamayı tamamla →', onclick: () => this.finishTask(true) }));
      } else {
        T.Audio.error();
        const has = T.SPECIES[g.userData.sid].atoms.some((a) => a.el === t.el);
        this.fb('warn', 'Tekrar izle', has
          ? `<b>${T.speciesLabel(g.userData.sid)}</b> taneciğinde de ${t.name} var ama işaretli atom buraya gitmedi. Animasyonu yavaşça sarıp sarı halkayı takip et.`
          : `<b>${T.speciesLabel(g.userData.sid)}</b> taneciğinde hiç ${t.name} atomu yok. İşaretli atomun nereye gittiğini tekrar izle.`);
      }
    },
    finishTask(ok) {
      this.results.push(ok);
      S.data.trackLog = this.results; S.save();
      if (this.ti + 1 < this.tasks.length) { this.ti++; this.startTask(); return; }
      T.App.complete(3);
      this.side.innerHTML = '';
      this.side.appendChild(h('h3', { html: '✅ Atom takibi tamamlandı' }));
      this.side.appendChild(h('div.feedback.ok', { html: '<b>Ne öğrendin?</b>Kimyasal tepkimede atomlar yok olmaz ve yoktan var olmaz. Tanecikler arasındaki bağlar kırılır, atomlar <b>yeniden düzenlenerek</b> yeni tanecikler oluşturur. Bazı iyonlar ise hiç değişmeden çözeltide kalır.' }));
      const nb = h('button.btn.success.block.pulse', { text: 'Modelimi test et →' });
      nb.addEventListener('click', () => T.App.go(4));
      this.side.appendChild(nb);
    },
    leave() { if (this.rearr) { this.rearr.dispose(); this.rearr = null; } }
  };
  function cap(s) { return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1); }
  T.Stage3 = Stage3;
})(window.TUY);
