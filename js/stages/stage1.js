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
      T.Lab.on('mixStart', () => { U.$('#btn-pour').disabled = true; this.timer('start'); this.graph('start'); });
      T.Lab.on('state', (st) => { if (st === 'idle' || st === 'ready') this.graph('hide'); this.syncSafety(); });
      T.Lab.on('done', () => this.graph('draw'));
      // güvenlik: ilk dökümden önce tek dokunuşla gözlük + eldiven
      T.Lab.beforePour = () => {
        if (T.Lab.safetyWorn()) return true;
        this.safetyCard(true, true);
        return false;
      };
      U.$('#btn-wear').addEventListener('click', () => this.wear());
      T.Lab.on('safetyTap', () => this.wear());
      T.Lab.on('safety', () => this.syncSafety());
      if (T.Lab.safetyWorn() && T.Lab.safetyGear) T.Lab.safetyGear.visible = false;
      this.syncSafety();
      let rz;
      window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { this.graph('draw'); this.placeSafety(); }, 120); });
      new MutationObserver(() => this.graph('draw')).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    },
    /* ---------- Güvenlik adımı ----------
       Cezalandırmaz, uyarı rengi kullanmaz: tek dokunuşluk bir alışkanlık adımı. Takılınca masadan
       kalkar ve alt çubukta 🥽🧤 simgesi olarak kalır. */
    safetyCard(show, wantPour) {
      const c = U.$('#safety-card');
      this._pourAfterWear = !!wantPour || (show && this._pourAfterWear);
      c.classList.toggle('hidden', !show);
      if (show) { this.placeSafety(); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
    },
    /** Kart alt çubuğun hemen üstünde durur (çubuğun yüksekliği ipucu satırıyla değişir) */
    placeSafety() {
      const c = U.$('#safety-card'), dock = U.$('#lab-dock');
      if (c.classList.contains('hidden')) return;
      const top = dock.getBoundingClientRect().top;
      if (top > 0) c.style.bottom = Math.round(window.innerHeight - top + 8) + 'px';
    },
    wear() {
      const go = this._pourAfterWear;
      this._pourAfterWear = false;
      if (!T.Lab.safetyWorn()) { T.Lab.wearSafety(); T.Audio.click(); U.toast('🥽🧤 Gözlük ve eldiven takıldı. İyi deneyler!'); }
      this.safetyCard(false);
      if (go && T.Lab.state === 'ready') setTimeout(() => { if (T.Lab.pour()) T.Audio.click(); }, 450);
    },
    syncSafety() {
      const worn = T.Lab.safetyWorn();
      U.$('#safety-badge').hidden = !worn;
      const want = !worn && !!S.reaction && T.Lab.state === 'ready' && !U.$('#lab-ui').classList.contains('hidden');
      if (want && U.$('#safety-card').classList.contains('hidden')) this.safetyCard(true);
      else if (!want) this.safetyCard(false);
    },
    /* ---------- Canlı sıcaklık–zaman grafiği ----------
       Termometredeki sayıyı eğriye çevirir: "ısındı" gözlemi nicel kanıta dönüşür.
       x: gözlem süresi (hızlandırılmış saat, süre barıyla aynı), y: °C; kesik çizgi = başlangıç (oda) sıcaklığı. */
    graph(cmd) {
      const el = U.$('#temp-graph');
      if (cmd === 'hide') { clearInterval(this._gm); el.classList.remove('show'); return; }
      if (cmd === 'start') {
        el.classList.add('show');
        clearInterval(this._gm);
        this._gm = setInterval(() => {
          this.drawGraph();
          const s = T.Lab.sim;
          if (!s || T.Lab.state === 'done' || s.t > T.Lab.obsDuration() + 4) clearInterval(this._gm);
        }, 150);
      }
      if (el.classList.contains('show')) this.drawGraph();
    },
    drawGraph() {
      const SPEED = 12, T0 = 22;
      const cv = U.$('#tg-canvas'), s = T.Lab.sim;
      const log = (s && s.log) || [];
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (!W || !H) return;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const css = getComputedStyle(document.documentElement);
      const col = (n, f) => (css.getPropertyValue(n).trim() || f);
      const cText = col('--text', '#fff'), cMuted = col('--muted', '#999'), cLine = col('--line-strong', 'rgba(127,127,127,.35)');
      const now = log.length ? log[log.length - 1][1] : T.Lab.thermo.temp;
      U.$('#temp-graph .tg-now').textContent = now.toFixed(1).replace('.', ',') + ' °C';
      // eksen aralıkları: x tüm gözlem süresi; y başlangıç sıcaklığını ve ölçümleri kapsar
      const xMax = T.Lab.obsDuration() * SPEED;
      let lo = T0 - 1, hi = T0 + 1;
      log.forEach((p) => { lo = Math.min(lo, p[1] - 0.6); hi = Math.max(hi, p[1] + 0.6); });
      const span = hi - lo, step = span > 24 ? 10 : span > 10 ? 5 : span > 5 ? 2 : 1;
      lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
      const fs = W < 220 ? 9 : 10;
      g.font = `600 ${fs}px ${col('--font', 'system-ui')}`;
      const L = fs * 2.6, R = 6, Tp = 5, B = fs + 7;
      const px = (x) => L + (x / xMax) * (W - L - R), py = (y) => Tp + (1 - (y - lo) / (hi - lo)) * (H - Tp - B);
      // ızgara + y etiketleri
      g.lineWidth = 1; g.strokeStyle = cLine; g.fillStyle = cMuted; g.textBaseline = 'middle'; g.textAlign = 'right';
      for (let y = lo; y <= hi + 1e-6; y += step) {
        const yy = Math.round(py(y)) + 0.5;
        g.globalAlpha = 0.55; g.beginPath(); g.moveTo(L, yy); g.lineTo(W - R, yy); g.stroke(); g.globalAlpha = 1;
        g.fillText(String(y), L - 4, yy);
      }
      // x etiketleri (dk:ss)
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      // etiketler arası en az ~36 px kalsın
      const xs = [30, 60, 120, 300].find((v) => (W - L - R) / (xMax / v) >= 36) || 300;
      for (let x = 0; x <= xMax + 1e-6; x += xs) {
        const lbl = Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
        g.fillText(lbl, Math.min(W - R - 10, Math.max(L + 8, px(x))), H - 2);
      }
      // başlangıç (oda) sıcaklığı: kesik çizgi
      g.setLineDash([4, 4]); g.strokeStyle = cMuted; g.globalAlpha = 0.8;
      g.beginPath(); g.moveTo(L, py(T0)); g.lineTo(W - R, py(T0)); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
      // ölçüm eğrisi
      if (log.length > 1) {
        g.strokeStyle = cText; g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round';
        g.beginPath();
        log.forEach((p, i) => { const X = px(Math.min(xMax, p[0] * SPEED)), Y = py(p[1]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
        g.stroke();
      }
      if (log.length) {
        const p = log[log.length - 1];
        g.fillStyle = cText; g.beginPath(); g.arc(px(Math.min(xMax, p[0] * SPEED)), py(p[1]), 3, 0, Math.PI * 2); g.fill();
      }
      U.$('#tg-canvas').setAttribute('aria-label', `Sıcaklık ${T0} °C'den ${now.toFixed(1)} °C'ye`);
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
      if (st === 'done' && T.Lab.sim && T.Lab.sim.started) U.$('#temp-graph').classList.add('show');
      if (T.Lab.sim && T.Lab.sim.started) this.graph(st === 'done' ? 'draw' : 'start'); else this.graph('hide');
      this.syncSafety();
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
