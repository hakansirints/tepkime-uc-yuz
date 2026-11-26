/* Model kurucu: tanecik havuzu + "Tepkime öncesi / Etkileşirken / Tepkime sonrası" 3B bölgeleri
   + canlı atom sayacı + kademeli destek (ipucu) düzeyleri. Aşama 2, 4, 6 ve 7'de kullanılır. */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, Mol = T.Mol, V = () => T.Viewer;

  const REG = {
    before: { n: 1, title: 'Tepkime öncesi', note: 'Başlangıçta kaplarda bulunan tanecikler.' },
    mid: { n: 2, title: 'Tanecikler etkileşirken', note: 'Bağlar kırılır, atomlar yeniden düzenlenir.' },
    after: { n: 3, title: 'Tepkime sonrası', note: 'Oluşan tanecikler ve ortamda kalanlar.' }
  };

  class Builder {
    /**
     * opts: {reaction, pool:[sid], model:{before,after}, lockBefore, showCounter, hints:true,
     *        onChange(model), rightTop(el)}
     */
    constructor(container, opts) {
      this.o = opts;
      this.model = opts.model;
      this.target = opts.lockBefore ? 'after' : (opts.startTarget || 'before');
      // twoCard: "Etkileşirken" kartı yok; Önce → Sonra arasında ok, canlandırma Önce kartında oynar (Aşama 2)
      this.two = !!opts.twoCard;
      this.hintLevel = { before: 0, after: 0 };
      this.panels = {};
      this.groups = { before: [], after: [] };
      this._build(container);
      this.refresh();
    }
    _build(container) {
      const o = this.o;
      const pool = h('div.pool',
        null,
        h('h3', { text: 'Tanecik havuzu' }),
        h('div.pool-hint', { html: 'Bir karta <b>tıkla</b>: seçili bölüme eklenir. Ya da kartı bölüme <b>sürükle</b>.' }),
        this.switchEl = o.lockBefore ? null : h('div.target-switch', null,
          h('button.btn.sm.ghost', { 'data-t': 'before', title: 'Tıkladığın kartlar “Tepkime öncesi” bölümüne eklenir' }, h('span.sn.r-before', { text: '1' }), 'Öncesine'),
          h('button.btn.sm.ghost', { 'data-t': 'after', title: 'Tıkladığın kartlar “Tepkime sonrası” bölümüne eklenir' }, h('span.sn.r-after', { text: this.two ? '2' : '3' }), 'Sonrasına')),
        this.gridEl = h('div.pool-grid', { style: { marginTop: '8px' } }));
      if (this.switchEl) this.switchEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.setTarget(b.dataset.t)));

      // havuz kartları
      o.pool.forEach((sid) => {
        const sp = T.SPECIES[sid];
        const card = h('div.pcard', { draggable: 'true', title: sp.name + ' — eklemek için tıkla', 'data-sid': sid },
          h('img', { alt: '', src: V().thumb(sid) }),
          h('div.f', { text: T.speciesLabel(sid) }),
          h('div.nm', { text: sp.name }));
        card.addEventListener('click', () => this.add(this.target, sid));
        card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', sid); e.dataTransfer.effectAllowed = 'copy'; });
        this.gridEl.appendChild(card);
      });

      // bölgeler
      const mk = (key, aq) => {
        const r = REG[key];
        const focusBtn = h('button.pbtn', { title: 'Bu bölümü büyüt (diğerlerini gizle)', 'aria-label': 'Büyüt', text: '⤢' });
        const hideBtn = h('button.pbtn', { title: 'Bu bölümü gizle', 'aria-label': 'Gizle', text: '−' });
        focusBtn.addEventListener('click', (e) => { e.stopPropagation(); this.focusRegion(key); });
        hideBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleRegion(key, false); });
        const strip = h('button.pstrip', { title: r.title + ' — göster' }, h('span.n', { text: String(r.n) }), h('span.vt', { text: r.title }));
        strip.addEventListener('click', (e) => { e.stopPropagation(); this.toggleRegion(key, true); });
        // kısa yönlendirme sorusu (yalnızca yatay telefonda görünür)
        const q = key === 'before' ? (o.lockBefore ? null : 'Karıştırmadan önce kaplarda hangi tanecikler vardı?')
          : key === 'mid' ? 'Bağlar kırılır, atomlar yeniden düzenlenir. ▶ Canlandır ile izle.'
            : 'Tepkime bitince kapta hangi tanecikler var?';
        const num = String(this.two && key === 'after' ? 2 : r.n);
        strip.querySelector('.n').textContent = num;
        const el = h('div.mpanel' + (aq ? '.aq' : ''), { 'data-region': key },
          h('div.ptitle', null, h('span.n', { text: num }), r.title, h('span.pctl', null, focusBtn, hideBtn), q ? h('div.m-q', { text: q }) : null),
          h('div.pempty', { text: '' }),
          strip);
        return el;
      };
      this.regEl = this.two ? { before: mk('before', true), after: mk('after', true) } : { before: mk('before', true), mid: mk('mid', false), after: mk('after', true) };
      this.open = this.two ? { before: true, after: true } : { before: true, mid: true, after: true };
      ['before', 'after'].forEach((k) => {
        const el = this.regEl[k];
        el.addEventListener('dragover', (e) => { if (k === 'before' && this.o.lockBefore) return; e.preventDefault(); el.classList.add('drop-on'); });
        el.addEventListener('dragleave', () => el.classList.remove('drop-on'));
        el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drop-on'); const sid = e.dataTransfer.getData('text/plain'); if (sid && T.SPECIES[sid]) this.add(k, sid); });
        el.addEventListener('click', (e) => { if (e.target === el || e.target.classList.contains('pempty')) { if (!(k === 'before' && this.o.lockBefore)) this.setTarget(k); } });
      });
      this.playBtn = h('button.btn.sm.primary', { text: '▶ Canlandır' });
      if (this.two) {
        // Önce kartında: kaydırıcı + Canlandır (iki bölüm de dolunca görünür), üstünde kısa alt yazı
        this.playBtn.addEventListener('click', () => this.playTwo());
        this.slider = h('input', { type: 'range', min: 0, max: 1000, value: 0, style: { width: '140px' }, 'aria-label': 'Zaman' });
        this.slider.addEventListener('input', () => this._seekTwo(this.slider.value / 1000));
        this.pbtns = h('div.pbtns', null, this.slider, this.playBtn);
        this.cap = h('div.pnote.trk-cap');
        this.regEl.before.append(this.pbtns, this.cap);
        this.arrow = h('div.trk-arrow', { 'aria-hidden': 'true' }, h('span.sh', { text: '→' }), h('small', { text: 'tepkime' }));
        this.regionsEl = h('div.three-regions.two-regions', null, this.regEl.before, this.arrow, this.regEl.after);
      } else {
        this.playBtn.addEventListener('click', () => this.playMid());
        this.regEl.mid.appendChild(h('div.pbtns', null, this.playBtn));
        this.regionsEl = h('div.three-regions', null, this.regEl.before, this.regEl.mid, this.regEl.after);
      }
      const center = h('div.build-center', null, this.regionsEl);

      // sağ kart
      this.counterEl = h('div');
      this.hintEl = h('div.hint-box');
      this.rightSlot = h('div');
      const right = h('div.side-card', null,
        h('h3', { html: '⚖️ Korunma kontrolü' }),
        h('ul.rules', null,
          h('li', { text: 'Atom türleri değişmez.' }),
          h('li', { text: 'Atom sayıları korunur.' }),
          h('li', { text: 'Suda çözünen maddeler sulu ortamda ayrı iyonlar olarak gösterilir.' }),
          h('li', { text: 'Katı çökeltiler düzenli kristal yapı olarak gösterilir.' })),
        o.showCounter === false ? null : h('div', null, h('h3', { html: '🔢 Atom sayacı' }), this.counterEl),
        o.hints === false ? null : this.hintEl,
        this.rightSlot);
      this.rightEl = right;
      this.el = h('div.grid-build', null, pool, center, right);
      container.appendChild(this.el);

      // 3B paneller
      ['before', 'after'].forEach((k) => {
        this.panels[k] = V().addPanel(this.regEl[k], {
          fitPad: 1.18,
          // panel en-boy oranı belirgin değişince tanecikleri yeniden diz
          onResize: (w, hh) => {
            const a = U.clamp(w / hh, 0.45, 2.2), old = this._asp && this._asp[k];
            if (old && Math.abs(Math.log(a / old)) < 0.25) return false;
            if (!this.groups[k].length) { if (this._asp) this._asp[k] = a; return false; }
            this._renderRegion(k);
            return true;
          },
          onPick: (hit) => {
            if (!hit || !hit.group) return;
            if (k === 'before' && this.o.lockBefore) { U.toast('Bu bölüm bu görevde hazır verildi.'); return; }
            this.remove(k, hit.group.userData.sid);
          },
          onHover: (hit) => this._hover(k, hit)
        });
        this.panels[k].onUpdate((dt, t) => this._bob(k, t));
      });
      if (this.two) this.panels.before.onUpdate((dt) => this._tickTwo(dt));
      else {
        this.panels.mid = V().addPanel(this.regEl.mid, { fitPad: 1.1 });
        this.panels.mid.onUpdate((dt) => { if (this.rearr) this.rearr.update(dt); });
      }
      this.setTarget(this.target);
      if (o.hints !== false) this._renderHints();
    }
    /** Bölüm göster/gizle: gizlenen bölüm ince bir şeride dönüşür, kalanlar alanı paylaşır */
    toggleRegion(key, on) {
      if (!on && Object.keys(this.open).filter((k) => this.open[k]).length <= 1) { U.toast('En az bir bölüm açık kalmalı.'); return; }
      this.open[key] = on;
      this._applyLayout();
    }
    /** Yalnızca bu bölümü göster; zaten tek açıksa hepsini geri aç */
    focusRegion(key) {
      const only = Object.keys(this.open).every((k) => this.open[k] === (k === key));
      Object.keys(this.open).forEach((k) => { this.open[k] = only ? true : k === key; });
      this._applyLayout();
    }
    _applyLayout() {
      const fr = this.two ? 'minmax(0,1fr)' : '1fr';
      const w = { before: fr, mid: '0.8fr', after: fr };
      const keys = Object.keys(this.open);
      const cols = keys.map((k) => (this.open[k] ? w[k] : '42px'));
      if (this.two) cols.splice(1, 0, '60px'); // ok sütunu
      this.regionsEl.style.gridTemplateColumns = cols.join(' ');
      keys.forEach((k) => {
        this.regEl[k].classList.toggle('collapsed', !this.open[k]);
        const only = Object.keys(this.open).every((x) => this.open[x] === (x === k));
        const fb = this.regEl[k].querySelector('.pbtn');
        fb.textContent = only ? '⤡' : '⤢';
        fb.title = only ? 'Tüm bölümleri göster' : 'Bu bölümü büyüt (diğerlerini gizle)';
      });
      // kameralar, panel boyutu değişince görüntüleyici tarafından yeniden sığdırılır
    }
    setTarget(t) {
      if (this.o.lockBefore && t === 'before') return;
      this.target = t;
      ['before', 'after'].forEach((k) => this.regEl[k].classList.toggle('target', k === t));
      if (this.switchEl) this.switchEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      if (this.o.hints !== false) this._renderHints();
      this._renderCounts();
    }
    /** Havuz kartlarında seçili bölümdeki adet (×1, ×2…; rozet yatay telefonda görünür) */
    _renderCounts() {
      const ms = this.model[this.target] || {};
      this.gridEl.querySelectorAll('.pcard').forEach((c) => {
        const n = ms[c.dataset.sid];
        if (n) c.dataset.cnt = n; else delete c.dataset.cnt;
      });
    }
    add(region, sid) {
      if (region === 'before' && this.o.lockBefore) return;
      const ms = this.model[region];
      const total = Object.values(ms).reduce((a, b) => a + b, 0);
      if (total >= 10) { U.toast('Bir bölüme en fazla 10 tanecik koyabilirsin.'); return; }
      ms[sid] = (ms[sid] || 0) + 1;
      T.Audio.click();
      this._changed(region);
    }
    remove(region, sid) {
      const ms = this.model[region];
      if (!ms[sid]) return;
      ms[sid]--;
      if (!ms[sid]) delete ms[sid];
      T.Audio.click();
      U.toast(T.speciesLabel(sid) + ' havuza geri alındı.', 1400);
      this._changed(region);
    }
    _changed(region) {
      this._renderRegion(region);
      this._renderChips();
      this._renderCounter();
      this._renderCounts();
      this._resetMid();
      if (this.o.onChange) this.o.onChange(this.model);
    }
    refresh() {
      this._renderRegion('before');
      this._renderRegion('after');
      this._renderChips();
      this._renderCounter();
      this._renderCounts();
      this._resetMid();
    }
    _renderRegion(k) {
      const p = this.panels[k];
      this.groups[k].forEach((g) => p.root.remove(g));
      this.groups[k] = [];
      const ids = [];
      Object.keys(this.model[k]).forEach((sid) => { for (let i = 0; i < this.model[k][sid]; i++) ids.push(sid); });
      const gs = ids.map((sid) => { const g = Mol.build(sid, { labelH: 0.55 }); g.userData.pickable = true; return g; });
      // dizilim panelin en-boy oranına uysun: dar-uzun panelde tanecikler alt alta gelir, küçülmez
      const rr = this.regEl[k].getBoundingClientRect();
      const asp = rr.width > 60 && rr.height > 60 ? U.clamp(rr.width / rr.height, 0.45, 2.2) : 1;
      this._asp = this._asp || {};
      this._asp[k] = asp;
      const pos = Mol.layout(gs, { gap: 0.7, aspect: asp, jitter: true });
      // canlandırma Önce kartında oynuyorsa (iki kart düzeni) yeni tanecikler gizli kalır
      const hide = this.two && k === 'before' && this.rearr && this.rearr.group.visible;
      gs.forEach((g, i) => { g.position.copy(pos[i]); g.userData.home = pos[i].clone(); g.userData.ph = Math.random() * 6.28; if (hide) g.visible = false; p.root.add(g); });
      this.groups[k] = gs;
      if (hide) p.fit(true, this.rearr.fitBoth()); else p.fit();
      const empty = this.regEl[k].querySelector('.pempty');
      empty.textContent = ids.length ? '' : (k === 'before' ? 'Boş. Havuzdan tepkime öncesindeki tanecikleri ekle.' : 'Boş. Havuzdan tepkime sonrasındaki tanecikleri ekle.');
    }
    _bob(k, t) {
      this.groups[k].forEach((g) => {
        const ph = g.userData.ph;
        const amp = T.SPECIES[g.userData.sid].kind === 'crystal' ? 0.02 : 0.09;
        g.position.set(g.userData.home.x + Math.sin(t * 0.9 + ph) * amp, g.userData.home.y + Math.sin(t * 1.3 + ph * 2) * amp, g.userData.home.z + Math.cos(t * 0.7 + ph) * amp);
        if (T.SPECIES[g.userData.sid].kind !== 'crystal') g.rotation.y = Math.sin(t * 0.4 + ph) * 0.5;
      });
    }
    _hover(k, hit) {
      const sid = hit && hit.group ? hit.group.userData.sid : null;
      this.groups[k].forEach((g) => {
        const on = hit && hit.group === g;
        if (!!g.userData._hov !== on) { g.userData._hov = on; g.scale.setScalar(on ? 1.08 : 1); }
      });
      this.regEl[k].title = sid ? T.speciesLabel(sid) + ' — geri almak için tıkla' : '';
    }
    /* Bölümlerin altındaki tanecik çipleri kaldırıldı; tanecikler 3B görünümde eklenip (havuz) çıkarılır (dokunma). */
    _renderChips() {}
    _renderCounter() {
      if (this.o.showCounter === false) return;
      const cb = T.countAtoms(this.model.before), ca = T.countAtoms(this.model.after);
      const els = T.EL_ORDER.filter((e) => cb[e] || ca[e]);
      if (!els.length) { this.counterEl.innerHTML = '<p class="muted small">Tanecik ekledikçe atomlar burada sayılır.</p>'; return; }
      const rows = els.map((e) => {
        const b = cb[e] || 0, a = ca[e] || 0, ok = b === a;
        const status = this.o.counterStatus === false ? '' : (ok ? '✓' : '≠');
        return `<tr class="${this.o.counterStatus === false ? '' : (ok ? 'okr' : 'mis')}"><td class="el"><span class="dot" style="background:${U.hex(T.ELEMENTS[e].color)}"></span>${e} <span class="muted" style="font-weight:500;font-size:11px">${T.ELEMENTS[e].name}</span></td><td>${b}</td><td>${a}</td><td class="st">${status}</td></tr>`;
      }).join('');
      this.counterEl.innerHTML = `<table class="counter-table"><thead><tr><th style="text-align:left">Atom</th><th>Önce</th><th>Sonra</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    _renderHints() {
      const r = this.o.reaction;
      if (!r) { this.hintEl.innerHTML = ''; return; }
      const side = this.target;
      const lv = this.hintLevel[side];
      const ref = side === 'before' ? r.before : r.after;
      const texts = [
        side === 'before'
          ? `Kaplarda <b>${r.fixed.name.toLocaleLowerCase('tr-TR')}</b> ve <b>${r.added.name.toLocaleLowerCase('tr-TR')}</b> vardı. Suda çözünen tuzlar, asitler ve bazlar suda <b>iyonlarına ayrılır</b>. Katı maddeler <b>kristal</b> hâlinde kalır.`
          : r.afterHint,
        'Bu bölümde bulunması gereken tanecikler: ' + Object.keys(ref).map((s) => '<b>' + T.SPECIES[s].name.toLocaleLowerCase('tr-TR') + '</b>').join(', ') + '.',
        'Formül ipucu: ' + Object.keys(ref).map((s) => `<b>${T.speciesLabel(s)}</b> ×${ref[s]}`).join(', ')
      ];
      const names = ['Yönlendirme', 'Tanecik ipucu', 'Formül ipucu'];
      this.hintEl.innerHTML = '';
      this.hintEl.appendChild(h('h3', { html: '💡 Destek (' + (side === 'before' ? 'öncesi' : 'sonrası') + ')' }));
      // akordeon: aynı anda tek ipucu açık; açık olana tekrar dokununca kapanır.
      // İpuçları sırayla açılır (bir sonraki, öncekini görmeden kullanılamaz).
      this.hintOpen = this.hintOpen || { before: -1, after: -1 };
      const open = this.hintOpen[side];
      const row = h('div.hint-row');
      names.forEach((nm, i) => {
        const b = h('button.btn.sm' + (i === open ? '.primary' : (i < lv ? '.ghost' : '')), {
          text: (i + 1) + '. ' + nm, disabled: i > lv ? true : null, 'aria-expanded': String(i === open) });
        b.addEventListener('click', () => {
          if (i >= lv) {
            this.hintLevel[side] = i + 1;
            T.State.data.hintsUsed[side] = Math.max(T.State.data.hintsUsed[side] || 0, i + 1);
            T.State.save();
          }
          this.hintOpen[side] = this.hintOpen[side] === i ? -1 : i;
          this._renderHints();
        });
        row.appendChild(b);
      });
      this.hintEl.appendChild(row);
      if (open >= 0 && open < lv) {
        this.hintEl.appendChild(h('div.feedback.info', { style: { margin: '6px 0 0', fontSize: '13px' }, html: texts[open] }));
      }
    }
    _resetMid() {
      if (this.two) return this._resetTwo();
      if (this.rearr) { this.rearr.dispose(); this.rearr = null; }
      const tb = Object.keys(this.model.before).length, ta = Object.keys(this.model.after).length;
      const empty = this.regEl.mid.querySelector('.pempty');
      this.playBtn.disabled = !(tb && ta);
      empty.textContent = tb && ta ? 'Modelin hazır. ▶ Canlandır ile atomların yeniden düzenlenmesini izle.' : 'Her iki bölüme de tanecik ekleyince burada atomların yeniden düzenlenmesini izleyebilirsin.';
    }
    /* ---- İki kart düzeni: canlandırma Önce kartında oynar, bitince kısa geri sarmayla başa döner ---- */
    get ready() { return !!(Object.keys(this.model.before).length && Object.keys(this.model.after).length); }
    _resetTwo() {
      clearTimeout(this._backTmr); this.rewinding = false;
      if (this.rearr) { this.rearr.dispose(); this.rearr = null; this.panels.before.fit(true); }
      this.groups.before.forEach((g) => { g.visible = true; });
      this.played = false;
      const ok = this.ready;
      this.pbtns.hidden = !ok;
      this.slider.value = 0;
      this.playBtn.disabled = false;
      this.playBtn.textContent = '▶ Canlandır';
      this.playBtn.classList.toggle('pulse', ok);
      this.arrow.className = 'trk-arrow' + (ok ? ' on' : '');
      this.cap.textContent = '';
    }
    _ensureRearr() {
      if (this.rearr) return this.rearr;
      const p = this.panels.before;
      this.rearr = new T.Rearranger(p, this.model.before, this.model.after, { duration: 5.5 });
      this.rearr.group.visible = false;
      return this.rearr;
    }
    /** Önce kartında durağan tanecikler ↔ canlandırma. Kapatınca canlandırma kaldırılır
        (görüntüleyici kadrajı gizli grupları da sayar). */
    _showAnim(on) {
      if (on) {
        const R = this._ensureRearr();
        if (!R.group.visible) this.panels.before.fit(false, R.fitBoth());
        R.group.visible = true;
        this.groups.before.forEach((g) => { g.visible = false; });
      } else {
        if (this.rearr) { this.rearr.dispose(); this.rearr = null; }
        this.groups.before.forEach((g) => { g.visible = true; });
        this.panels.before.fit(false);
      }
    }
    playTwo(onDone) {
      if (!this.ready) return;
      const R = this._ensureRearr();
      clearTimeout(this._backTmr); this.rewinding = false;
      if (R.t >= 1) R.seek(0);
      this._showAnim(true);
      this.playBtn.classList.remove('pulse');
      this.arrow.className = 'trk-arrow on';
      this.cap.textContent = 'Bağlar kopuyor, atomlar yeni düzenine geçiyor…';
      R.play(() => this._playedTwo(onDone));
    }
    _playedTwo(onDone) {
      this.cap.innerHTML = '<span class="ev">✓ Atomlar yeniden düzenlendi.</span>';
      this.arrow.className = 'trk-arrow ok';
      const first = !this.played;
      this.played = true;
      this.playBtn.textContent = '↺ Tekrar izle';
      if (typeof onDone === 'function') onDone();
      if (first && this.o.onPlayed) this.o.onPlayed();
      this._backTmr = setTimeout(() => { if (this.rearr && this.rearr.t >= 0.98 && !this.rearr.playing) this.rewinding = true; }, 1300);
    }
    _seekTwo(t) {
      if (!this.ready) return;
      clearTimeout(this._backTmr); this.rewinding = false;
      if (t <= 0) { if (this.rearr) this._showAnim(false); this.cap.textContent = ''; return; }
      this._showAnim(true);
      const R = this.rearr;
      R.pause();
      R.seek(t);
      if (t >= 1 && !this.played) this._playedTwo();
    }
    _tickTwo(dt) {
      const R = this.rearr;
      if (!R) return;
      if (this.rewinding) {
        R.seek(Math.max(0, R.t - dt * 1.6));
        this.slider.value = Math.round(R.t * 1000);
        if (R.t <= 0) { this.rewinding = false; this._showAnim(false); this.cap.textContent = ''; }
        return;
      }
      R.update(dt);
      if (R.playing) this.slider.value = Math.round(R.t * 1000);
    }
    playMid(onDone, track) {
      if (this.two) return this.playTwo(onDone);
      if (this.rearr) this.rearr.dispose();
      const empty = this.regEl.mid.querySelector('.pempty');
      empty.textContent = '';
      this.rearr = new T.Rearranger(this.panels.mid, this.model.before, this.model.after, { duration: 5.5 });
      this.panels.mid.fit(true, this.rearr.fitBoth());
      let info = null;
      if (track) info = this.rearr.track(track);
      this.rearr.play(onDone);
      return info;
    }
    destroy() {
      clearTimeout(this._backTmr);
      if (this.rearr) { this.rearr.dispose(); this.rearr = null; }
      Object.values(this.panels).forEach((p) => V().removePanel(p));
      this.el.remove();
    }
  }

  T.Builder = Builder;
  T.REGION_META = REG;
})(window.TUY);
