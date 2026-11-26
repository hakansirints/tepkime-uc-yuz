/* Tam ekran (adres çubuğu olmadan):
   - Android ve tam ekranı destekleyen dokunmatik cihazlar: üst barda ⛶ düğmesi; ilk dokunuşta
     kendiliğinden tam ekrana geçer ve yatayda kilitler (tarayıcılar bir dokunuş şart koşar).
   - iPhone: Safari sitelerin adres çubuğunu gizlemesine izin vermez. Bir kez "Ana Ekrana Ekle"
     ipucu gösterilir; ana ekrandan açılan site adres çubuğu olmadan açılır.
   Masaüstünde (fare ile) hiçbir şey eklenmez. */
(function () {
  'use strict';
  const d = document, html = d.documentElement;
  const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone === true;
  const ios = html.classList.contains('ios');
  const req = html.requestFullscreen || html.webkitRequestFullscreen;
  const canFs = !!req && !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  const fsEl = () => d.fullscreenElement || d.webkitFullscreenElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* yok */ } }
  };
  if (standalone) html.classList.add('pwa');
  if (!touch || standalone) return;

  /* ---------- Android: tam ekran ---------- */
  if (canFs) {
    const enter = () => {
      if (fsEl()) return Promise.resolve();
      let p;
      try { p = req.call(html, { navigationUI: 'hide' }); } catch (e) { p = null; }
      return Promise.resolve(p).then(() => {
        try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* */ }
      }).catch(() => {});
    };
    const exit = () => { const f = d.exitFullscreen || d.webkitExitFullscreen; if (f && fsEl()) f.call(d); };

    const btn = d.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-fullscreen';
    btn.className = 'icon-btn';
    const sync = () => {
      const on = !!fsEl();
      btn.textContent = on ? '🗗' : '⛶';
      btn.title = on ? 'Tam ekrandan çık' : 'Tam ekran';
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      html.classList.toggle('is-fs', on);
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); if (fsEl()) { userExit = true; exit(); } else enter(); });
    let userExit = false;
    const place = () => {
      const acts = d.querySelector('#topbar .top-actions');
      if (!acts) return;
      acts.insertBefore(btn, acts.querySelector('.settings-wrap'));
    };
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', place); else place();
    d.addEventListener('fullscreenchange', sync);
    d.addEventListener('webkitfullscreenchange', sync);
    sync();
    // sayfa açıldıktan sonraki ilk dokunuşta bir kez kendiliğinden tam ekran
    const first = (e) => {
      d.removeEventListener('pointerup', first, true);
      if (userExit || fsEl() || e.target.closest('#btn-fullscreen')) return;
      enter();
    };
    d.addEventListener('pointerup', first, true);
    return;
  }

  /* ---------- iPhone: "Ana Ekrana Ekle" ipucu (bir kez) ---------- */
  if (!ios || store.get('tuy-a2hs-kapali')) return;
  const show = () => {
    const card = d.createElement('div');
    card.id = 'a2hs-card';
    card.setAttribute('role', 'note');
    card.innerHTML = '<span class="a2-ic" aria-hidden="true">📲</span>' +
      '<div class="a2-txt"><b>Tam ekran için ana ekrana ekle</b>' +
      '<span>Paylaş <span class="a2-share" aria-hidden="true">⬆︎</span> düğmesine dokun, sonra <b>Ana Ekrana Ekle</b>. Ana ekrandaki simgeden açınca adres çubuğu görünmez.</span>' +
      '<span class="a2-note">Not: Ana ekrandan açılan uygulamada ilerleme ayrı tutulur.</span></div>' +
      '<button type="button" class="a2-x" aria-label="Kapat">✕</button>';
    card.querySelector('.a2-x').addEventListener('click', () => {
      store.set('tuy-a2hs-kapali', '1');
      card.classList.remove('show');
      setTimeout(() => card.remove(), 400);
    });
    d.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add('show'));
  };
  const later = () => setTimeout(show, 2500);
  if (d.readyState === 'complete') later(); else window.addEventListener('load', later);
})();
