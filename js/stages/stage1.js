/* AŞAMA 1 — Makroskobik gözlem: deneyi yap, gördüğünü kendi cümlenle yaz. */
(function (T) {
  'use strict';
  const U = T.U, S = T.State;

  const Stage1 = {
    built: false,
    build() {
      if (this.built) return;
      this.built = true;
      const list = U.$('#reaction-list');
      T.REACTION_LIST.forEach((r, i) => {
        const li = U.h('li', { 'data-id': r.id, tabindex: 0, role: 'button', style: { '--i': i } },
          U.h('span.r-no', { text: String(r.no).padStart(2, '0') }),
          U.h('div.r-main', null,
            U.h('div.r-name', { text: r.name }),
            // ad iki maddeyi zaten içerir; altta yalnızca kaplardaki hâlleri kısa etiketle gösterilir
            U.h('div.r-pair', null,
              U.h('span.r-chip', { title: 'Sabit kap: ' + r.fixed.name, text: r.fixed.solid ? 'katı' : 'çözelti' }),
              U.h('span.r-plus', { text: '+' }),
              U.h('span.r-chip', { title: 'Eklenen: ' + r.added.name, text: 'çözelti' }))),
          U.h('span.r-go', { 'aria-hidden': 'true', text: '›' }));
        li.dataset.q = U.normTR(r.name + ' ' + r.fixed.name + ' ' + r.added.name);
        li.addEventListener('click', () => this.choose(r.id));
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.choose(r.id); } });
        list.appendChild(li);
      });
      // arama
      const q = U.$('#rp-q');
      q.addEventListener('input', () => {
        const v = U.normTR(q.value.trim());
        let n = 0;
        U.$$('#reaction-list li').forEach((li) => { const ok = !v || li.dataset.q.includes(v); li.hidden = !ok; if (ok) n++; });
        U.$('#rp-empty').hidden = n > 0;
      });
      // aç / topla
      U.$('#rp-toggle').addEventListener('click', () => this.setPanel(!this.panelOpen));
      U.$('#rp-summary').addEventListener('click', () => this.setPanel(true));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.panelOpen && S.data.reaction && !U.$('#lab-ui').classList.contains('hidden')) this.setPanel(false); });
      window.addEventListener('resize', () => { if (!this.panelOpen) this.measurePanel(); });
      U.$('#btn-pour').addEventListener('click', () => { if (T.Lab.pour()) T.Audio.click(); });
      U.$('#btn-reset-exp').addEventListener('click', () => {
        T.Lab.resetExperiment();
        this.refresh();
      });
      const ta = U.$('#obs-text');
      ta.addEventListener('input', () => {
        const n = U.wordCount(ta.value);
        U.$('#obs-count').textContent = n + ' kelime';
        S.data.observation = ta.value;
        S.save();
        if (this.passed) { this.passed = false; this.setMainButton(); }
        U.$('#btn-check-obs').disabled = !this.canCheck();
      });
      U.$('#btn-check-obs').addEventListener('click', () => this.onMainButton());
      T.Lab.on('state', (st) => { this.refresh(); if (st === 'idle' || st === 'ready') this.timer('hide'); });
      T.Lab.on('done', () => {
        this.timer('done');
        const ta2 = U.$('#obs-text');
        // dokunmatik ekranda klavye açılıp sahneyi kapatmasın
        if (!ta2.disabled && !matchMedia('(pointer: coarse)').matches) ta2.focus({ preventScroll: true });
      });
      T.Lab.on('mixStart', () => { U.$('#btn-pour').disabled = true; this.timer('start'); });
    },
    enter() {
      this.build();
      U.$('#lab-ui').classList.remove('hidden');
      T.Lab.setPaused(false);
      const d = S.data;
      if (d.reaction && T.Lab.reaction !== T.REACTIONS[d.reaction]) T.Lab.setReaction(T.REACTIONS[d.reaction]);
      U.$('#obs-text').value = d.observation || '';
      U.$('#obs-count').textContent = U.wordCount(d.observation) + ' kelime';
      this.passed = !!d.done[1];
      if (this.passed) U.feedback(U.$('#obs-feedback'), 'ok', 'Gözlemin onaylandı', 'Bu aşamayı tamamladın. İstersen deneyi tekrar izleyebilirsin.');
      this.refresh();
      const st = T.Lab.state;
      if (st === 'done') this.timer('done'); else if (st === 'reacting' || (st === 'pouring' && T.Lab.sim && T.Lab.sim.started)) this.timer('start'); else this.timer('hide');
      U.$('#notebook').classList.remove('nb-glow');
    },
    leave() {
      U.$('#lab-ui').classList.add('hidden');
    },
    /* ---------- Gözlem süresi barı ----------
       Tepkimeyi değil, gözlem süresini gösterir: "tepkime" demez, türüne dair ipucu vermez.
       Simülasyon hızlandırıldığı için saat ölçekli akar ve bu açıkça yazılır. */
    timer(cmd) {
      const SPEED = 12; // 1 sn simülasyon ≈ 12 sn gerçek zaman
      const el = U.$('#obs-timer');
      const fill = U.$('.ot-fill', el), time = U.$('.ot-time', el), lbl = U.$('.ot-lbl', el);
      const fmt = (s) => { s = Math.round(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
      clearInterval(this._tm);
      if (cmd === 'hide') { el.classList.remove('show', 'done'); return; }
      if (cmd === 'done') {
        const dur = T.Lab.obsDuration();
        fill.style.transform = 'scaleX(1)';
        time.textContent = fmt(Math.max(dur, (T.Lab.sim && T.Lab.sim.t) || 0) * SPEED);
        lbl.textContent = 'Gözlem süresi doldu · şimdi defterine yaz';
        el.classList.add('show', 'done');
        U.$('#notebook').classList.remove('nb-glow'); void U.$('#notebook').offsetWidth; U.$('#notebook').classList.add('nb-glow');
        return;
      }
      // start
      el.classList.remove('done');
      el.classList.add('show');
      lbl.textContent = 'Gözlem süresi';
      const dur = T.Lab.obsDuration();
      const tick = () => {
        const t = (T.Lab.sim && T.Lab.sim.t) || 0;
        fill.style.transform = `scaleX(${Math.min(0.985, t / dur)})`;
        time.textContent = fmt(t * SPEED);
      };
      tick();
      this._tm = setInterval(tick, 100);
    },
    choose(id) {
      if (T.Tutorial && T.Tutorial.active) { U.toast('Öğreticide örnek tepkime hazır seçildi. Kendi tepkimeni öğreticiden çıkınca seçebilirsin.'); return; }
      const d = S.data;
      const closeView = () => { T.Lab.setView('close'); };
      if (d.reaction === id) { if (T.Lab.state === 'idle') T.Lab.setReaction(T.REACTIONS[id]); closeView(); this.setPanel(false); return; }
      const apply = () => {
        const keepCompleted = d.completedReactions;
        S.reset();
        S.data.completedReactions = keepCompleted;
        S.data.reaction = id;
        S.save();
        T.Lab.setReaction(T.REACTIONS[id]);
        U.$('#obs-text').value = '';
        U.$('#obs-count').textContent = '0 kelime';
        U.$('#obs-feedback').classList.add('hidden');
        this.passed = false;
        this.tries = 0;
        closeView(); // tepkime seçilince deney düzeneğine yaklaş
        T.App.renderStepper();
        this.panelOpen = false;   // seçimden sonra kart yukarı toplanır
        this.refresh();
        T.Audio.click();
      };
      if (d.reaction && (d.done[1] || d.maxStage > 1)) {
        const close = U.modal(U.h('div', null,
          U.h('h2', { text: 'Tepkimeyi değiştir?' }),
          U.h('p', { text: 'Yeni bir tepkime seçersen bu tepkimedeki ilerlemen (model, testler) sıfırlanır ve 1. aşamadan başlarsın.' }),
          U.h('div.modal-actions', null,
            U.h('button.btn.ghost', { text: 'Vazgeç', onclick: () => close() }),
            U.h('button.btn.primary', { text: 'Evet, değiştir', onclick: () => { close(); apply(); } }))));
      } else apply();
    },
    /* ---------- Tepkime kartı: açık (liste) / toplanmış (seçilen maddeler) ---------- */
    syncPanel() {
      const r = S.reaction;
      if (!r) this.panelOpen = true;
      else if (this.panelOpen == null) this.panelOpen = false;
      // özet: seçilen iki madde
      const sum = U.$('#rp-summary');
      if (r && sum.dataset.id !== r.id) {
        sum.dataset.id = r.id;
        sum.innerHTML = `
          <span class="rs-item"><i>${r.fixed.solid ? '🪨' : '🧪'}</i><span><small>Sabit kap</small><b>${r.fixed.name}</b></span></span>
          <span class="rs-plus" aria-hidden="true">+</span>
          <span class="rs-item"><i>⚗️</i><span><small>Eklenen</small><b>${r.added.name}</b></span></span>`;
      }
      this.applyPanel(false);
    },
    setPanel(open) {
      if (!S.reaction) open = true;
      if (open === this.panelOpen) return;
      this.panelOpen = open;
      this.applyPanel(true);
      if (open) {
        const on = U.$('#reaction-list li.on');
        if (on) setTimeout(() => on.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 260);
      }
    },
    applyPanel(animate) {
      const p = U.$('#reaction-panel'), r = S.reaction, open = this.panelOpen;
      const wasOpen = p.classList.contains('open');
      p.classList.toggle('open', open);
      p.classList.toggle('closed', !open);
      U.$('#rp-summary').hidden = open || !r;
      const tg = U.$('#rp-toggle');
      tg.hidden = !r;
      tg.setAttribute('aria-expanded', String(open));
      tg.querySelector('.rp-toggle-txt').textContent = open ? 'Kapat' : 'Değiştir';
      U.$('#rp-kicker').textContent = open ? 'Deney dolabı' : 'Seçilen maddeler';
      U.$('#rp-title').hidden = !open; // toplanınca başlık yerine seçilen maddeler görünür
      if (!open) this.measurePanel();
      if (open && !wasOpen && animate) {
        // kartlar sırayla belirir
        const list = U.$('#reaction-list');
        list.classList.remove('stagger'); void list.offsetWidth; list.classList.add('stagger');
      }
    },
    /** Toplanmış kartın yüksekliği: başlık + özet */
    measurePanel() {
      const p = U.$('#reaction-panel');
      const cs = getComputedStyle(p);
      const h = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + U.$('.rp-head', p).offsetHeight + 10 + U.$('#rp-summary').offsetHeight;
      p.style.setProperty('--rp-ch', Math.ceil(h) + 'px');
    },
    canCheck() {
      return ['reacting', 'done'].includes(T.Lab.state) || S.data.done[1];
    },
    refresh() {
      if (!this.built) return;
      const d = S.data, st = T.Lab.state;
      U.$$('#reaction-list li').forEach((li) => {
        li.classList.toggle('on', li.dataset.id === d.reaction);
        li.classList.toggle('done-mark', !!d.completedReactions[li.dataset.id]);
      });
      const r = S.reaction;
      U.$('#nb-reaction').textContent = r ? r.name : '';
      this.syncPanel();
      const chk = (id, done, now) => { const el = U.$('#' + id); el.classList.toggle('done', done); el.classList.toggle('now', !done && now); };
      const poured = ['reacting', 'done'].includes(st) || st === 'pouring';
      chk('chk-select', !!r, !r);
      chk('chk-pour', ['reacting', 'done'].includes(st) || !!d.done[1], !!r && st === 'ready');
      chk('chk-watch', st === 'done' || !!d.done[1], poured);
      chk('chk-write', !!d.done[1], st === 'done' || st === 'reacting');
      U.$('#btn-pour').disabled = st !== 'ready';
      U.$('#btn-reset-exp').disabled = !r || st === 'ready' || st === 'pouring';
      const ta = U.$('#obs-text');
      ta.disabled = !this.canCheck();
      ta.placeholder = ta.disabled ? 'Önce deneyi yap, sonra gördüklerini buraya yaz…' : 'Örnek başlangıç: “Maddeler karıştırıldığında…”';
      const hint = U.$('#dock-hint');
      if (!r) hint.textContent = '💡 Önce soldan bir tepkime seç.';
      else if (st === 'ready') hint.textContent = '💡 Sağdaki beheri tutup sabit kabın üzerine sürükle ya da “Otomatik dök ve karıştır” düğmesine bas.';
      else if (st === 'pouring') hint.textContent = '👀 Dökülüyor… Kabın içini ve termometreyi izle.';
      else if (st === 'reacting') hint.textContent = '👀 Kabın içini dikkatle izle; termometreyi de unutma. Yakınlaştırmak için tekerleği ya da iki parmağını kullan.';
      else if (st === 'done') hint.textContent = '✍️ Gördüklerini sağdaki deftere yaz. Deneyi tekrar izlemek için “Deneyi yenile”.';
      this.setMainButton();
    },
    setMainButton() {
      const b = U.$('#btn-check-obs');
      if (this.passed) {
        b.textContent = 'Tanecik düzeyine geç →';
        b.className = 'btn success block pulse';
        b.disabled = false;
      } else {
        b.textContent = 'Gözlemi kontrol et';
        b.className = 'btn primary block';
        b.disabled = !this.canCheck() || U.wordCount(U.$('#obs-text').value) < 1;
      }
    },
    onMainButton() {
      if (this.passed) { T.App.go(2); return; }
      const r = S.reaction;
      const text = U.$('#obs-text').value;
      this.tries = (this.tries || 0) + 1;
      S.data.obsTries = this.tries;
      const res = T.Eval.evaluateObservation(text, r, this.tries);
      U.feedback(U.$('#obs-feedback'), res.kind, res.title, res.text);
      if (res.kind === 'ok') {
        this.passed = true;
        S.data.observation = text;
        S.complete(1);
        T.Audio.success();
        T.App.renderStepper();
      } else T.Audio.error();
      this.setMainButton();
    }
  };
  T.Stage1 = Stage1;
})(window.TUY);
