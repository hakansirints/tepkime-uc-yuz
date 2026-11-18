/* Uygulama akışı: yükleme, 7 aşamalı ilerleme çubuğu, aşamalar arası geçiş. */
(function (T) {
  'use strict';
  const U = T.U, S = T.State;

  const META = {
    2: { title: 'Modelini kur', sub: 'Ürünleri hazır vermek yerine sen kuruyorsun: tepkime öncesindeki ve sonrasındaki tanecikleri havuzdan seçip yerleştir.' },
    3: { title: 'Atomun izini sür', sub: 'Seçtiğin atomun tepkime öncesinden sonrasına nasıl taşındığını izle ve sonunda hangi tanecikte olduğunu bul.' },
    4: { title: 'Modeli çalıştır ve test et', sub: 'Modelin çalıştırılır. Sistem doğru cevabı söylemez; hatanın hangi atom ya da tanecikte olduğunu görünür kılar.' },
    5: { title: 'Üç gösterimi ilişkilendir', sub: 'Bir öğeye dokun: aynı öğe diğer iki gösterimde de aynı anda vurgulanır.' },
    6: { title: 'Temsil değiştir', sub: 'Her görevde bir gösterim eksik. Eksik olanı sen üreteceksin.' },
    7: { title: 'Bozuk modeli onar', sub: 'Hata türleri verilmez. Modeli bilimsel açıdan incele, düzelt, yeniden çalıştır ve gerekçelendir.' }
  };

  const App = {
    current: 0,
    stages: {},
    async start() {
      const fill = U.$('#loader-fill');
      const progress = (p) => { fill.style.width = p + '%'; };
      if (typeof THREE === 'undefined') {
        U.$('#loader .loader-card p').innerHTML = '3B kütüphane yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.';
        return;
      }
      S.load();
      try {
        await T.Lab.init(U.$('#lab-canvas'), progress);
      } catch (err) {
        console.error(err);
        U.$('#loader .loader-card p').innerHTML = 'Laboratuvar başlatılamadı: tarayıcın WebGL desteklemiyor olabilir.';
        return;
      }
      this.stages = { 1: T.Stage1, 2: T.Stage2, 3: T.Stage3, 4: T.Stage4, 5: T.Stage5, 6: T.Stage6, 7: T.Stage7 };
      this.bindTop();
      this.renderStepper();
      const d = S.data;
      if (d.reaction) T.Lab.setReaction(T.REACTIONS[d.reaction]);
      U.$('#loader').classList.add('done');
      setTimeout(() => U.$('#loader').remove(), 800);
      this.go(Math.min(d.stage || 1, d.maxStage || 1), true);
      // #ogretici bağlantısıyla açılırsa öğretici doğrudan başlar
      const wantTut = () => /^#(ogretici|öğretici)$/i.test(decodeURIComponent(location.hash));
      window.addEventListener('hashchange', () => { if (wantTut() && !T.Tutorial.active) T.Tutorial.start(); });
      // Açılış doğrudan masa görünümünde (tepkime seçiliyse yakın görünümde)
      if (this.current === 1 && S.data.reaction && T.Lab.viewName === 'bench') T.Lab.setView('close');
      if (wantTut()) setTimeout(() => T.Tutorial.start(), 600);
      else if (!d.reaction && !this._welcomed) { this._welcomed = true; setTimeout(() => this.help(true), 350); }
    },
    bindTop() {
      // açık / koyu tema
      const root = document.documentElement;
      const themeBtn = U.$('#btn-theme');
      const paintTheme = () => {
        const dark = root.getAttribute('data-theme') !== 'light';
        themeBtn.querySelector('.sm-ic').textContent = dark ? '🌙' : '☀️';
        themeBtn.querySelector('.sm-val').textContent = dark ? 'Koyu' : 'Açık';
        themeBtn.title = dark ? 'Açık temaya geç' : 'Koyu temaya geç';
        const mc = document.querySelector('meta[name="theme-color"]');
        if (mc) mc.setAttribute('content', dark ? '#05070c' : '#eef1f6');
      };
      themeBtn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('tuy-tema', next); } catch (e) { /* yok */ }
        paintTheme();
      });
      // kullanıcı seçim yapmadıysa sistem değişimini izle
      if (window.matchMedia) {
        matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
          let saved = null;
          try { saved = localStorage.getItem('tuy-tema'); } catch (er) { /* yok */ }
          if (!saved) { root.setAttribute('data-theme', e.matches ? 'light' : 'dark'); paintTheme(); }
        });
      }
      paintTheme();
      U.$('#btn-sound').addEventListener('click', () => {
        const on = T.Audio.toggle();
        U.$('#btn-sound .sm-ic').textContent = on ? '🔊' : '🔇';
        U.$('#btn-sound .sm-val').textContent = on ? 'Açık' : 'Kapalı';
      });
      // ⚙ ayarlar menüsü: tema / ses yerinde değişir, menü açık kalır; diğerleri menüyü kapatır
      const setBtn = U.$('#btn-settings'), menu = U.$('#settings-menu');
      const openMenu = (open) => {
        menu.classList.toggle('hidden', !open);
        setBtn.classList.toggle('on', open);
        setBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      setBtn.addEventListener('click', (e) => { e.stopPropagation(); openMenu(menu.classList.contains('hidden')); });
      menu.addEventListener('click', (e) => {
        const it = e.target.closest('.sm-item');
        if (it && (it.id === 'btn-help' || it.id === 'btn-restart')) openMenu(false);
      });
      document.addEventListener('pointerdown', (e) => { if (!menu.classList.contains('hidden') && !e.target.closest('.settings-wrap')) openMenu(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.classList.contains('hidden')) { openMenu(false); setBtn.focus(); } });
      U.$('#btn-help').addEventListener('click', () => this.help());
      U.$('#btn-tutorial').addEventListener('click', (e) => {
        e.preventDefault();
        if (T.Tutorial.active) T.Tutorial.confirmStop(); else T.Tutorial.start();
      });
      U.$('#btn-restart').addEventListener('click', () => {
        if (T.Tutorial.active) { U.toast('Öğretici açıkken ilerleme sıfırlanamaz. Önce öğreticiden çık.'); return; }
        const close = U.modal(U.h('div', null,
          U.h('h2', { text: 'Baştan başla?' }),
          U.h('p', { text: 'Tüm aşamalardaki ilerlemen silinir ve tepkime seçiminden yeniden başlarsın.' }),
          U.h('div.modal-actions', null,
            U.h('button.btn.ghost', { text: 'Vazgeç', onclick: () => close() }),
            U.h('button.btn.primary', { text: 'Baştan başla', onclick: () => { close(); S.reset(); T.Lab.resetSafety(); T.Lab.setReaction(null); T.Stage1.passed = false; U.$('#obs-feedback').classList.add('hidden'); this.renderStepper(); this.go(1, true); } }))));
      });
      U.$('#btn-to-lab').addEventListener('click', () => this.peekLab(true));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') U.closeModal(); });
      window.addEventListener('pointerdown', () => { T.Audio.init(); T.Audio.resume(); }, { once: true });
    },
    help(first) {
      const cur = this.current || 1, done = S.data.done || {};
      // 7 aşama, 4 durakta: öğrencinin bilişsel yükünü azaltır
      const PHASES = [
        { t: 'Keşfet', v: 'Deneyi yap, gördüğünü yaz', n: [1] },
        { t: 'Modelle', v: 'Taneciklerle açıkla', n: [2, 3, 4] },
        { t: 'Bağla', v: 'Üç yüzü birleştir', n: [5, 6] },
        { t: 'Eleştir', v: 'Hatalı modeli onar', n: [7] }
      ];
      const stepLi = (n) => `<li class="${n === cur ? 'on' : done[n] ? 'done' : ''}"><span>${done[n] && n !== cur ? '✓' : n}</span>${S.STAGES[n - 1].short}</li>`;
      const map = PHASES.map((p) => `<div class="wl-ph${p.n.includes(cur) ? ' on' : ''}"><span class="wl-ph-t">${p.t}</span><b>${p.v}</b><ol>${p.n.map(stepLi).join('')}</ol></div>`).join('');
      const html = `
        <div class="wl">
          <header class="wl-head">
            <div class="wl-mark" aria-hidden="true"><span></span><span></span><span></span></div>
            <div>
              <div class="wl-kicker">${first ? 'Hoş geldin, araştırmacı' : 'Yardım'} · Sanal kimya laboratuvarı</div>
              <h2>Tepkimenin Üç Yüzü</h2>
            </div>
          </header>
          <div class="wl-grid">
            <div class="wl-col">
              <div class="wl-hook">
                <h3 class="wl-q">İki madde karışınca <em>gerçekte ne olur?</em></h3>
                <p class="wl-lead">Kimyacılar bir tepkimeye üç farklı gözle bakar. Sen de aynı tepkimeyi önce gözlemleyecek, sonra taneciklerle modelleyecek, en sonunda sembollerle yazacaksın.</p>
              </div>
              <div class="wl-levels" aria-label="Bir tepkimenin üç yüzü">
                <div class="wl-lv macro"><em>Ne görüyorum?</em><i>👁</i><b>Makroskobik</b><small>Gaz, çökelti, ısı, renk</small></div>
                <div class="wl-lv micro"><em>Neden oluyor?</em><i>⚛</i><b>Tanecik</b><small>Atom, iyon, molekül</small></div>
                <div class="wl-lv sym"><em>Nasıl yazarım?</em><i>✎</i><b>Sembolik</b><small>Formül ve denklem</small></div>
              </div>
              <div class="wl-note"><i aria-hidden="true">⚖️</i><span><b>Tek büyük fikir:</b> Tepkimede atomlar yok olmaz, yoktan var olmaz; yalnızca <b>yeniden düzenlenir</b>.</span></div>
            </div>
            <div class="wl-col">
              <div class="wl-sec"><b>Yol haritan</b><span>Her tepkime 7 aşama · 4 durak</span></div>
              <div class="wl-map">${map}</div>
              <div class="wl-sec"><b>Her aşamada nasıl çalışırsın?</b></div>
              <ol class="wl-cycle">
                <li><b>Düşün</b><span>Önce kendi tahminini yap.</span></li>
                <li><b>Dene</b><span>Modeli kur, deneyi çalıştır.</span></li>
                <li><b>Açıkla</b><span>Gördüğünü kendi cümlenle yaz.</span></li>
              </ol>
              <ul class="wl-tips">
                <li>🧪 Küçük beheri büyük kaba <b>sürükle</b></li>
                <li>🖱 Sürükle: <b>döndür</b> · tekerlek: <b>yakınlaştır</b></li>
                <li>💡 Dönütler cevabı değil, <b>ipucu</b> verir</li>
                <li>🔁 Yanılmak serbest, istediğin kadar dene</li>
              </ul>
            </div>
          </div>
          <div class="wl-cta">
            <button class="btn primary wl-go" id="help-tut"><span>🎓</span><span><b>${first ? 'İlk kez mi? Öğreticiyle başla' : 'Öğreticiyi aç'}</b><small>Örnek bir tepkimeyle 7 aşamayı birlikte gezelim · ilerlemen etkilenmez</small></span></button>
            <button class="btn ghost" id="help-ok">${first ? 'Kendim keşfedeyim →' : 'Tamam'}</button>
          </div>
        </div>`;
      const close = U.modal(html, { cls: 'welcome' });
      U.$('#help-ok').onclick = close;
      U.$('#help-tut').onclick = () => { close(); if (!T.Tutorial.active) T.Tutorial.start(); };
    },
    renderStepper() {
      const nav = U.$('#stepper');
      nav.innerHTML = '';
      const d = S.data;
      S.STAGES.forEach((s) => {
        const locked = s.n > d.maxStage;
        const b = U.h('button.step', { title: locked ? 'Önceki aşamayı tamamla' : s.short },
          U.h('span.num', { text: d.done[s.n] ? '✓' : String(s.n) }), U.h('span.lbl', { text: s.short }));
        if (d.done[s.n]) b.classList.add('done');
        if (s.n === this.current) b.classList.add('active');
        if (locked) b.classList.add('locked');
        b.addEventListener('click', () => {
          if (locked) { U.toast('🔒 Bu aşama, önceki aşamalar tamamlanınca açılır.'); return; }
          this.go(s.n);
        });
        nav.appendChild(b);
      });
      U.$('#stage-counter').textContent = `Aşama ${this.current || 1}/7`;
    },
    go(n, force) {
      const d = S.data;
      if (!force && n > d.maxStage) { U.toast('🔒 Önce bu aşamayı tamamla.'); return; }
      if (n > 1 && !d.reaction) n = 1;
      const prev = this.stages[this.current];
      if (prev && prev.leave) prev.leave();
      if (T.Viewer && T.Viewer.ready) T.Viewer.clear();
      this.task(null);
      this.current = n;
      d.stage = n; S.save();
      this.peekLab(false);
      if (n === 1) {
        U.$('#workspace').classList.add('hidden');
        U.$('#model-canvas').style.display = 'none';
        T.Stage1.enter();
      } else {
        T.Stage1.leave();
        T.Lab.setPaused(true);
        U.$('#workspace').classList.remove('hidden');
        U.$('#model-canvas').style.display = '';
        T.Viewer.init(U.$('#model-canvas'));
        const m = META[n];
        U.$('#ws-kicker').textContent = `Aşama ${n}/7 — ${S.STAGES[n - 1].short}`;
        U.$('#ws-title').textContent = m.title;
        U.$('#ws-sub').textContent = m.sub;
        U.$('#ws-reaction').textContent = S.reaction ? S.reaction.name : '';
        const body = U.$('#ws-body');
        body.innerHTML = '';
        this.stages[n].enter(body);
      }
      this.renderStepper();
    },
    /** Aşama tamamlandı: bir sonrakini aç */
    complete(n) {
      S.complete(n);
      this.renderStepper();
    },
    next() { this.go(Math.min(7, this.current + 1)); },
    /**
     * Görev şeridi: her aşamada sayfa başlığının altında aynı yerde duran tek görev cümlesi.
     * o: {text, hint?, step?:[i,n], target?: Element}  —  null: şeridi gizle
     * target verilirse o alan vurgulanır ve "Burada çalış" etiketi alır.
     */
    task(o) {
      const box = U.$('#ws-task');
      if (this._taskTarget) {
        this._taskTarget.classList.remove('work-here');
        this._taskTarget.querySelectorAll(':scope > .here-tag, :scope > .ptitle > .here-tag').forEach((e) => e.remove());
        this._taskTarget = null;
      }
      if (!o) { box.classList.add('hidden'); this._taskKey = ''; return; }
      U.$('#wt-text').innerHTML = o.text;
      U.$('#wt-hint').innerHTML = o.hint || '';
      U.$('#wt-step').textContent = o.step ? ' · ' + o.step[0] + ' / ' + o.step[1] : '';
      const bars = U.$('#wt-bars');
      bars.innerHTML = '';
      if (o.step) for (let i = 1; i <= o.step[1]; i++) bars.appendChild(U.h('i' + (i < o.step[0] ? '.done' : i === o.step[0] ? '.on' : '')));
      box.classList.remove('hidden');
      // görev değişince şerit bir kez parlar
      const key = (o.step ? o.step.join('/') : '') + '|' + o.text;
      if (key !== this._taskKey) {
        this._taskKey = key;
        box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
      }
      const t = o.target;
      // hedef henüz sayfaya eklenmediyse bir sonraki karede yeniden dene
      if (t && !t.isConnected && !o._retry) { requestAnimationFrame(() => { if (this._taskKey === key) this.task(Object.assign({}, o, { _retry: true })); }); return; }
      if (t && t.isConnected) {
        t.classList.add('work-here');
        const tag = U.h('span.here-tag', { text: o.tag || 'Burada çalış' });
        const pt = t.querySelector(':scope > .ptitle');
        if (o.tag === false || t.matches('textarea,input,select,button,.three-regions')) { /* form öğesine etiket eklenemez: yalnızca vurgu */ }
        else if (pt) { const ctl = pt.querySelector('.pctl'); pt.insertBefore(tag, ctl); }
        else { if (getComputedStyle(t).position === 'static') t.style.position = 'relative'; t.appendChild(tag); }
        this._taskTarget = t;
      }
    },
    /** Çalışma kartından laboratuvara göz at */
    peekLab(on) {
      let btn = U.$('#peek-back');
      if (!on) { if (btn) btn.remove(); if (this.current > 1) { U.$('#workspace').classList.remove('hidden'); U.$('#model-canvas').style.display = ''; T.Lab.setPaused(true); } return; }
      U.$('#workspace').classList.add('hidden');
      U.$('#model-canvas').style.display = 'none';
      T.Lab.setPaused(false);
      T.Lab.setView('close');
      btn = U.h('button.btn.primary#peek-back', { text: '← Aşamaya dön', style: { position: 'fixed', left: '50%', bottom: '18px', transform: 'translateX(-50%)', zIndex: 70 } });
      btn.addEventListener('click', () => this.peekLab(false));
      document.body.appendChild(btn);
    }
  };
  T.App = App;
  window.addEventListener('DOMContentLoaded', () => App.start());
})(window.TUY);
