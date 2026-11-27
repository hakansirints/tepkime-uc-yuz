/* Telefon yatay düzeni (genişlik ≤ 900, yükseklik ≤ 500, yatay).
   Masaüstü ve tablette hiçbir şey değişmez: tüm kurallar html.phone-l altındadır.
   1) Görev şeridi ve "Laboratuvara dön" düğmesi üst bara taşınır (tek ince satır).
   2) Aşama gövdesindeki bölümler sekmelere ayrılır; her seferinde biri tam boy görünür.
      Model kurucuda tanecik havuzu sağda hep açık durur; altta "Sonraki →" sekmeleri sırayla ilerletir.
   3) Laboratuvarda paneller sol simge rafına iner; dokununca yandan açılır.
   4) Yazı alanına odaklanınca yazma alanı büyür. */
(function () {
  'use strict';
  const T = window.TUY || (window.TUY = {});
  const html = document.documentElement;
  const mq = window.matchMedia('(orientation: landscape) and (max-height: 500px) and (max-width: 932px)');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const cap = (t) => t.replace(/\p{L}/u, (c) => c.toLocaleUpperCase('tr'));
  const setCls =(el, c, on) => { if (el && el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); };

  let on = false;
  const moved = []; // [el, parent, next]

  /* ---------- 1) Tek ince üst bar ---------- */
  function moveTo(el, parent, before) {
    if (!el || !parent) return;
    moved.push([el, el.parentNode, el.nextSibling]);
    parent.insertBefore(el, before || null);
  }
  function restoreMoved() {
    while (moved.length) {
      const [el, p, n] = moved.pop();
      if (p) p.insertBefore(el, n && n.parentNode === p ? n : null);
    }
  }
  function setupBar() {
    const top = $('#topbar'), acts = $('#topbar .top-actions');
    moveTo($('#ws-task'), top, acts);
    const lab = $('#btn-to-lab');
    moveTo(lab, acts, acts && acts.firstChild);
    // dar ekranda yalnızca simge kalabilsin diye yazıyı ayır
    if (lab && !lab.dataset.mOrig && /^🔬\s*/.test(lab.textContent)) {
      lab.dataset.mOrig = lab.innerHTML;
      lab.innerHTML = '🔬<span class="m-lbl"> ' + lab.textContent.replace(/^🔬\s*/, '') + '</span>';
    }
  }

  /* ---------- 2) Sekmeler ve havuz çekmecesi ---------- */
  const SEC = '.three-regions > .mpanel, .track-main > .mpanel, .grid-track > .mpanel, .grid-three > .rep-col, .given-strip, .grid-build > .side-card, .grid-track > .side-card';
  let tabsEl = null, secs = [], cur = -1, lastHere = null, userPick = false, busy = false;

  function labelOf(s) {
    if (s.classList.contains('given-strip')) return '📌 Verilen';
    const pt = $(':scope > .ptitle', s);
    if (pt) {
      const n = $('.n', pt);
      let t = '';
      pt.childNodes.forEach((c) => { if (c.nodeType === 3) t += c.textContent; else if (c.classList && !c.classList.contains('n') && !c.classList.contains('here-tag') && !c.classList.contains('pctl') && !c.classList.contains('tag') && !c.classList.contains('m-q') && !c.classList.contains('psub')) t += c.textContent; });
      t = t.trim().replace(/^Tepkime /, '').replace(/^Tanecikler /, '');
      t = cap(t);
      if (/^Etkileşirken/.test(t)) t = 'Etkileşim';
      else if (/hareket/i.test(t)) t = 'Hareket';
      else if (/çalıştırılması/i.test(t)) t = 'Model';
      const nt = n ? n.textContent.trim() : '';
      return (nt ? nt + (/^\d+$/.test(nt) ? ' · ' : ' ') : '') + (t || 'Model');
    }
    const rh = $(':scope > .rep-h b', s) || $(':scope > .rep-h', s);
    if (rh) return cap(rh.textContent.trim().toLocaleLowerCase('tr'));
    const h = $(':scope > h3', s) || $(':scope > div > h3', s);
    if (h) {
      const t = h.textContent.trim();
      if (/Korunma|Atom sayacı/i.test(t)) return '⚖️ Kontrol';
      return t.length > 18 ? t.split(/\s+/).slice(0, 2).join(' ') : t;
    }
    return 'Bölüm';
  }

  // sekme etiketi: "1 · Öncesi" → renkli numara rozeti + ad
  function tabHtml(b, lb, s) {
    const m = lb.match(/^([123]) · (.*)$/);
    if (!m) { b.textContent = lb; return; }
    b.textContent = '';
    const sn = document.createElement('span');
    // renk bölümden gelir (iki kart düzeninde "2" Sonrası olabilir), yoksa numaradan
    const n = s && $(':scope > .ptitle > .n', s);
    const rc = s && s.dataset.region ? 'r-' + s.dataset.region : (n && Array.from(n.classList).find((c) => /^r-/.test(c)));
    sn.className = 'sn ' + (rc || ['r-before', 'r-mid', 'r-after'][+m[1] - 1]);
    sn.textContent = m[1];
    b.append(sn, m[2]);
  }
  const plain = (lb) => lb.replace(/^[^\p{L}]+/u, '');

  /* Model kurucu (havuzlu aşamalar): havuz sağda hep açık; Etkileşim ve Kontrol sekmesinde
     sağ sütunda korunma kartı durur. Altta "Sonraki →" sekmeleri sırayla ilerletir. */
  const TKEY = ['before', 'mid', 'after'];
  function buildOf(s) { const gb = s && s.closest('.grid-build'); return gb && gb.classList.contains('m-build') ? gb : null; }
  function syncBuild(i) {
    const s = secs[i], gb = buildOf(s);
    $$('.grid-build.m-build').forEach((g) => { if (g !== gb) ['m-t-before', 'm-t-mid', 'm-t-after', 'm-t-check', 'm-t-lock'].forEach((c) => setCls(g, c, false)); });
    if (gb) {
      const reg = s.dataset.region, k = s.classList.contains('side-card') ? 'check' : (TKEY.includes(reg) ? reg : 'before');
      ['before', 'mid', 'after', 'check'].forEach((x) => setCls(gb, 'm-t-' + x, x === k));
      const pool = $(':scope > .pool', gb);
      setCls(gb, 'm-t-lock', k === 'before' && !!pool && !$('.target-switch', pool));
      // havuzun ekleme hedefi her zaman açık sekmeyle aynı olsun (sayfa Sonrası sekmesinde açılınca da)
      const sw = pool ? $$('.target-switch button', pool) : [];
      if (sw.length >= 2 && (k === 'before' || k === 'after')) {
        const b = sw[k === 'before' ? 0 : 1];
        if (!b.classList.contains('on')) b.click();
      }
      const to = pool && $('.m-pool-to', pool);
      if (to) to.textContent = '· dokun: ' + (k === 'after' ? 'Sonrasına' : 'Öncesine');
    }
    // alt şerit: son sekmeye kadar "Sonraki →", son sekmede aşamanın kendi düğmesi
    const foot = $('#ws-body .ws-footer');
    if (!foot) return;
    let nx = $('.m-next', foot);
    if (!gb) { if (nx) nx.remove(); $$('.m-hide', foot).forEach((b) => b.classList.remove('m-hide')); return; }
    const last = i >= secs.length - 1;
    if (!nx) {
      nx = document.createElement('button');
      nx.type = 'button';
      nx.className = 'btn primary m-next';
      nx.addEventListener('click', () => show(cur + 1, true));
      foot.appendChild(nx);
    }
    if (!last) nx.textContent = 'Sonraki: ' + plain(labelOf(secs[i + 1])) + ' →';
    setCls(nx, 'm-hide', last);
    $$('.btn.primary:not(.m-next)', foot).forEach((b) => setCls(b, 'm-hide', !last));
  }

  function clearTabs() {
    const body = $('#ws-body');
    if (tabsEl) { tabsEl.remove(); tabsEl = null; }
    $$('.m-sec, .m-wrap, .m-on, .m-path').forEach((e) => e.classList.remove('m-sec', 'm-wrap', 'm-on', 'm-path'));
    $$('.pool.m-drawer').forEach((p) => p.classList.remove('m-drawer', 'm-open'));
    $$('.pool.m-side').forEach((p) => p.classList.remove('m-side'));
    $$('.grid-build.m-build').forEach((g) => g.classList.remove('m-build', 'm-t-before', 'm-t-mid', 'm-t-after', 'm-t-check', 'm-t-lock'));
    $$('.m-pool-btn, .m-pool-to, .m-next').forEach((b) => b.remove());
    $$('.ws-footer .m-hide').forEach((b) => b.classList.remove('m-hide'));
    if (body) body.classList.remove('m-tabbed');
    secs = []; cur = -1;
  }

  function show(i, fromUser) {
    if (i < 0 || i >= secs.length) return;
    cur = i;
    if (fromUser) userPick = true;
    secs.forEach((s, k) => setCls(s, 'm-on', k === i));
    // açık bölüme giden kapları işaretle
    $$('.m-path').forEach((e) => { if (!e.contains(secs[i])) e.classList.remove('m-path'); });
    let p = secs[i].parentElement;
    while (p && p.id !== 'ws-body') { setCls(p, 'm-path', true); p = p.parentElement; }
    if (tabsEl) $$('button', tabsEl).forEach((b, k) => { setCls(b, 'on', k === i); b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    syncBuild(i);
    // havuz hedefi: öncesi / sonrası sekmesi seçilince havuz da oraya ekler
    if (fromUser) {
      const s = secs[i], tr = s.closest('.three-regions');
      if (tr) {
        const reg = s.dataset.region;
        const gb = tr.closest('.grid-build');
        const sw = gb && $$('.pool .target-switch button', gb);
        if (sw && sw.length >= 2 && (reg === 'before' || reg === 'after')) {
          const b = sw[reg === 'before' ? 0 : 1];
          if (!b.classList.contains('on')) b.click();
        }
      }
    }
    window.dispatchEvent(new Event('resize'));
  }

  function build() {
    const body = $('#ws-body');
    const ws = $('#workspace');
    if (!on || !body || !ws || ws.classList.contains('hidden')) { if (secs.length) clearTabs(); return; }
    const found = $$(SEC, body).filter((s) => !s.closest('.hidden') && !s.parentElement.closest('.given-strip'));
    const same = found.length === secs.length && found.every((s, k) => s === secs[k]) && tabsEl && tabsEl.isConnected;
    if (!same) {
      const keepLabel = cur >= 0 && tabsEl ? $$('button', tabsEl)[cur]?.textContent : null;
      clearTabs();
      if (found.length < 2) return;
      secs = found;
      secs.forEach((s) => s.classList.add('m-sec'));
      $$('.m-sec', body).forEach((s) => { let p = s.parentElement; while (p && p !== body) { p.classList.add('m-wrap'); p = p.parentElement; } });
      body.classList.add('m-tabbed');
      tabsEl = document.createElement('div');
      tabsEl.className = 'm-tabs';
      tabsEl.setAttribute('role', 'tablist');
      secs.forEach((s, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        tabHtml(b, labelOf(s), s);
        b.addEventListener('click', () => show(k, true));
        tabsEl.appendChild(b);
      });
      const tt = $(':scope > .task-tabs', body);
      body.insertBefore(tabsEl, tt ? tt.nextSibling : body.firstChild);
      // tanecik havuzu → sağda hep açık sütun
      $$('.grid-build > .pool', body).forEach((pool) => {
        pool.classList.add('m-side');
        pool.parentElement.classList.add('m-build');
        const h = $(':scope > h3', pool);
        if (h && !$('.m-pool-to', h)) {
          const to = document.createElement('small');
          to.className = 'm-pool-to';
          h.appendChild(to);
        }
        // havuz hedefi değişince ilgili sekmeye geç
        $$('.target-switch button', pool).forEach((tb, k) => tb.addEventListener('click', () => {
          const tr = $('.three-regions', pool.parentElement);
          const want = tr ? $(':scope > .mpanel[data-region=' + (k === 0 ? 'before' : 'after') + ']', tr) : null;
          const i = secs.indexOf(want);
          if (i >= 0 && i !== cur) show(i, false);
        }));
      });
      let start = 0;
      if (keepLabel) { const i = $$('button', tabsEl).findIndex((b) => b.textContent === keepLabel); if (i >= 0) start = i; }
      userPick = false; lastHere = null;
      show(start, false);
    }
    // "Burada çalış" işaretinin olduğu bölümü aç
    const here = $('.work-here', body);
    const hs = here ? secs.find((s) => s === here || s.contains(here) || here.contains(s)) : null;
    // model kurucuda yalnızca açılışta: sonra öğrenci "Sonraki →" ya da sekmelerle kendisi geçer
    // (yoksa Sonrasına ilk tanecik eklenir eklenmez Etkileşim sekmesine atlıyordu)
    if (hs && here !== lastHere && lastHere && buildOf(hs)) lastHere = here;
    if (hs && here !== lastHere) {
      lastHere = here;
      const i = secs.indexOf(hs);
      if (i >= 0 && i !== cur) show(i, false);
    }
    // ekleme yapılan sekmede küçük işaret
    if (tabsEl) secs.forEach((s, k) => setCls($$('button', tabsEl)[k], 'here', !!(here && (s === here || s.contains(here)))));
  }

  let tmr = 0;
  function schedule() { if (busy) return; clearTimeout(tmr); tmr = setTimeout(() => { busy = true; try { build(); } finally { busy = false; } }, 60); }

  /* ---------- 3) Laboratuvar simge rafı ---------- */
  let rail = null;
  const PANES = [
    ['mat', '🧪', 'Maddeler'],
    ['nb', '📓', 'Defter'],
    ['graph', '📈', 'Grafik'],
  ];
  function syncRail() {
    if (!rail) return;
    PANES.forEach(([n]) => { const b = $('[data-p=' + n + ']', rail); setCls(b, 'on', html.classList.contains('m-p-' + n)); b.setAttribute('aria-pressed', html.classList.contains('m-p-' + n) ? 'true' : 'false'); });
    const g = $('#temp-graph');
    const gb = $('[data-p=graph]', rail);
    setCls(gb, 'off', !(g && g.classList.contains('show')));
  }
  function setupRail() {
    if (rail) return;
    rail = document.createElement('nav');
    rail.id = 'm-rail';
    rail.className = 'glass-panel';
    rail.setAttribute('aria-label', 'Laboratuvar panelleri');
    PANES.forEach(([n, ic, t]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.p = n;
      b.title = t;
      b.innerHTML = '<span class="ic">' + ic + '</span><span class="t">' + t + '</span>';
      b.addEventListener('click', () => {
        const isOn = html.classList.contains('m-p-' + n);
        if (n === 'nb') setCls(html, 'm-p-nb', !isOn);
        else { setCls(html, 'm-p-' + n, !isOn); if (!isOn) setCls(html, n === 'mat' ? 'm-p-graph' : 'm-p-mat', false); }
        if (!isOn) b.classList.remove('pip');
        syncRail();
        // gizliyken çizilen grafik/panel ölçüleri yeniden hesaplansın
        window.dispatchEvent(new Event('resize'));
      });
      rail.appendChild(b);
    });
    document.body.appendChild(rail);
    // panel dışına dokununca soldaki panel kapanır
    document.addEventListener('pointerdown', (e) => {
      if (!on || !html.classList.contains('m-lab')) return;
      if (e.target.closest('#m-rail, #reaction-panel, #temp-graph, #notebook, #topbar, #modal, #tut-card, #lab-dock, #safety-card, #obs-timer')) return;
      if (html.classList.contains('m-p-mat') && T.Lab && T.Lab.state !== 'idle') { setCls(html, 'm-p-mat', false); syncRail(); }
      if (html.classList.contains('m-p-graph')) { setCls(html, 'm-p-graph', false); syncRail(); }
    }, true);
  }
  let labHooked = false;
  function hookLab() {
    if (labHooked || !T.Lab || !T.Lab.on) return;
    labHooked = true;
    T.Lab.on('state', (st) => {
      if (!on) return;
      if (st === 'idle') { setCls(html, 'm-p-mat', true); setCls(html, 'm-p-graph', false); }
      if (st === 'ready' || st === 'pouring') { setCls(html, 'm-p-mat', false); }
      if (st === 'idle' || st === 'ready') { setCls(html, 'm-p-nb', false); setCls(html, 'm-p-graph', false); }
      syncRail();
    });
    T.Lab.on('done', () => {
      if (!on) return;
      setCls(html, 'm-p-mat', false);
      setCls(html, 'm-p-nb', true);
      syncRail();
      const gb = rail && $('[data-p=graph]', rail);
      if (gb) gb.classList.add('pip');
    });
  }
  function syncLab() {
    const ws = $('#workspace'), ui = $('#lab-ui');
    // laboratuvar arayüzü açıkken (1. aşama); "laboratuvara bak" modunda raf gösterilmez
    const lab = !!ui && !ui.classList.contains('hidden') && (!ws || ws.classList.contains('hidden'));
    if (lab !== html.classList.contains('m-lab')) {
      setCls(html, 'm-lab', lab);
      if (lab && on) {
        const st = T.Lab && T.Lab.state;
        setCls(html, 'm-p-mat', !st || st === 'idle');
        setCls(html, 'm-p-nb', st === 'done');
      }
    }
    syncRail();
  }

  /* ---------- 4) Klavye: yazarken alan büyür ---------- */
  // Yalnızca kullanıcı dokununca: kod ile verilen odak telefonda klavye açmaz
  let lastTap = 0;
  document.addEventListener('pointerdown', () => { lastTap = Date.now(); }, true);
  document.addEventListener('focusin', (e) => {
    if (!on || Date.now() - lastTap > 800) return;
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && /^(text|search|)$/.test(t.type)))) {
      if (t.id === 'rp-search' || t.closest('#reaction-panel')) return;
      html.classList.add('m-typing');
      t.classList.add('m-typing-el');
      fitVisual();
      setTimeout(() => { fitVisual(); keepCaret(t); }, 300);
    }
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t && t.classList) t.classList.remove('m-typing-el');
    setTimeout(() => {
      if (document.querySelector('.m-typing-el')) return;
      html.classList.remove('m-typing');
      resetZoom();
    }, 80);
  });

  /* Klavye açılınca telefonun gördüğü alan (visual viewport) küçülür ve kayar; sabit konumlu
     yazma alanı bu alana oturtulur. Yoksa imleç ekranın üstünde, görünmeyen yerde kalıyordu. */
  const VV = window.visualViewport;
  function fitVisual() {
    if (!VV || !html.classList.contains('m-typing')) return;
    html.style.setProperty('--vvt', Math.round(VV.offsetTop) + 'px');
    html.style.setProperty('--vvh', Math.round(VV.height) + 'px');
  }
  function keepCaret(t) {
    // yazı alanının içinde imlecin olduğu satır görünür kalsın
    try {
      t.scrollIntoView({ block: 'nearest' });
      if (t.selectionStart === t.value.length) t.scrollTop = t.scrollHeight;
    } catch (_) { /* */ }
  }
  if (VV) {
    const onVV = () => { fitVisual(); const t = document.querySelector('.m-typing-el'); if (t) keepCaret(t); };
    VV.addEventListener('resize', onVV);
    VV.addEventListener('scroll', onVV);
  }
  document.addEventListener('input', (e) => { if (e.target && e.target.classList && e.target.classList.contains('m-typing-el')) keepCaret(e.target); });

  /* iOS yine de yakınlaştırdıysa: görünüm ayarını yeniden yazmak yakınlığı sıfırlar */
  function resetZoom() {
    html.style.removeProperty('--vvt');
    html.style.removeProperty('--vvh');
    if (!html.classList.contains('ios')) return;
    const vp = document.querySelector('meta[name=viewport]');
    if (!vp) return;
    const c = vp.getAttribute('content');
    vp.setAttribute('content', c + ', ');
    setTimeout(() => vp.setAttribute('content', c), 30);
  }

  /* ---------- Görev şeridi: telefonda kesilen metin dokununca balonda tam görünür ---------- */
  let tip = null;
  function closeTip() { if (tip) { tip.remove(); tip = null; } }
  document.addEventListener('click', (e) => {
    if (!on) return;
    const wt = e.target.closest && e.target.closest('#topbar #ws-task');
    if (tip) { closeTip(); return; } // açıkken herhangi bir dokunuş kapatır
    if (wt) openTip(wt);
  }, true);
  function openTip(wt) {
    wt = wt || $('#topbar #ws-task');
    if (!on || !wt) return;
    closeTip();
    const tx = $('.wt-text', wt), hn = $('.wt-hint', wt);
    if (!tx || !tx.textContent.trim()) return;
    tip = document.createElement('div');
    tip.className = 'm-wt-tip';
    tip.setAttribute('role', 'status');
    tip.innerHTML = '<b>' + tx.innerHTML + '</b>' + (hn && hn.textContent.trim() ? '<span>' + hn.innerHTML + '</span>' : '');
    document.body.appendChild(tip);
    const r = wt.getBoundingClientRect(), w = Math.min(window.innerWidth - 16, 440);
    tip.style.width = w + 'px';
    tip.style.top = Math.round(r.bottom + 6) + 'px';
    tip.style.left = Math.round(Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8))) + 'px';
  }
  window.addEventListener('resize', closeTip);

  /* ---------- Aç / kapat ---------- */
  let mo = null;
  function apply() {
    const want = mq.matches;
    if (want === on) return;
    on = want;
    setCls(html, 'phone-l', on);
    if (on) {
      setupBar();
      setupRail();
      hookLab();
      const body = $('#ws-body');
      mo = new MutationObserver(() => { schedule(); syncLab(); });
      if (body) mo.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      const ws = $('#workspace');
      if (ws) mo.observe(ws, { attributes: true, attributeFilter: ['class'] });
      const ui = $('#lab-ui');
      if (ui) mo.observe(ui, { attributes: true, attributeFilter: ['class'] });
      const g = $('#temp-graph');
      if (g) mo.observe(g, { attributes: true, attributeFilter: ['class'] });
      html.classList.remove('m-lab');
      syncLab();
      schedule();
    } else {
      if (mo) { mo.disconnect(); mo = null; }
      clearTabs();
      restoreMoved();
      const lab = $('#btn-to-lab');
      if (lab && lab.dataset.mOrig) { lab.innerHTML = lab.dataset.mOrig; delete lab.dataset.mOrig; }
      ['m-lab', 'm-p-mat', 'm-p-nb', 'm-p-graph', 'm-typing'].forEach((c) => html.classList.remove(c));
    }
    window.dispatchEvent(new Event('resize'));
  }
  if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 200));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  T.Mobile = { apply, show: (i) => show(i, true), openTip: () => openTip(), closeTip, get on() { return on; } };
})();
