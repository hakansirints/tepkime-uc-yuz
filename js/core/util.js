/* Ortak yardımcılar — tüm modüller window.TUY ad alanını kullanır. */
window.TUY = window.TUY || {};
(function (T) {
  'use strict';

  const U = {};

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /** Küçük DOM üretici: U.h('div.cls#id', {attrs}, children...) */
  U.h = function (tag, attrs, ...kids) {
    const m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) {
      m[2].replace(/([.#])([\w-]+)/g, (_, t, v) => {
        if (t === '.') el.classList.add(v); else el.id = v;
      });
    }
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const k of kids.flat()) {
      if (k == null || k === false) continue;
      el.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    }
    return el;
  };

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (t) => { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.easeInOut = (t) => { t = U.clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  U.easeOut = (t) => 1 - Math.pow(1 - U.clamp(t, 0, 1), 3);
  U.rand = (a, b) => a + Math.random() * (b - a);

  /** Deterministik rastgele (desenler her açılışta aynı olsun) */
  U.rng = function (seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  /** Türkçe metni karşılaştırma için normalleştir */
  U.normTR = function (s) {
    return U.plainChem(s || '')
      .replace(/İ/g, 'i').replace(/I/g, 'ı')
      .toLocaleLowerCase('tr-TR')
      .replace(/[’'`´]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  U.wordCount = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;

  let toastTimer = null;
  U.toast = function (msg, ms) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
  };

  U.modal = function (html, opts) {
    const m = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    m.querySelector('.modal-card').className = 'modal-card' + (opts && opts.cls ? ' ' + opts.cls : '');
    if (typeof html === 'string') body.innerHTML = html; else body.appendChild(html);
    m.classList.remove('hidden');
    const close = () => { m.classList.add('hidden'); if (opts && opts.onClose) opts.onClose(); };
    document.getElementById('modal-x').onclick = close;
    m.onclick = (e) => { if (e.target === m) close(); };
    return close;
  };
  U.closeModal = () => document.getElementById('modal').classList.add('hidden');

  U.feedback = function (el, kind, title, text) {
    el.className = 'feedback ' + kind;
    el.innerHTML = (title ? '<b>' + title + '</b>' : '') + (text || '');
    el.classList.remove('hidden');
  };

  /** Önce → Sonra kartları arasındaki denklem oku (Aşama 2 ve 3): "TEPKİME" + ince ok.
   *  Durum yalnızca renkle: bekliyor gri · hazır mavi · oynuyor sarı (çizgi akar) · tamam yeşil.
   *  el.set(durum, metin): metin yalnızca ekran okuyucu için (görünmez). */
  U.trkArrow = function () {
    const sr = U.h('span.sr-only');
    const el = U.h('div.trk-arrow', { role: 'status', 'aria-live': 'polite' },
      U.h('span.ta-top', { text: 'tepkime' }), U.h('span.ta-line', { 'aria-hidden': 'true' }), sr);
    el.set = (state, text) => {
      el.className = 'trk-arrow' + (state && state !== 'wait' ? ' ' + state : '');
      sr.textContent = text || '';
    };
    el.set('wait', '');
    return el;
  };

  /** Kaydırılabilir kapta `first`ten `last`a kadar olan alan görünmüyorsa yumuşakça kaydır.
   *  İkisi birden sığmazsa `first`in üstü görünür kalır (dönüt metni düğmeden önemlidir). */
  U.revealRange = function (first, last) {
    last = last || first;
    let sc = first.parentElement;
    while (sc && sc !== document.body) {
      const cs = getComputedStyle(sc);
      if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 1) break;
      sc = sc.parentElement;
    }
    if (!sc || sc === document.body) { first.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    const box = sc.getBoundingClientRect(), pad = 10;
    const top = first.getBoundingClientRect().top - box.top + sc.scrollTop - pad;
    const bottom = last.getBoundingClientRect().bottom - box.top + sc.scrollTop + pad;
    let y = sc.scrollTop;
    if (bottom > y + sc.clientHeight) y = bottom - sc.clientHeight;
    if (top < y) y = top;
    if (y !== sc.scrollTop) sc.scrollTo({ top: y, behavior: 'smooth' });
  };

  /** Element rengini CSS hex olarak döndür */
  U.hex = (n) => '#' + n.toString(16).padStart(6, '0');

  /* ---------------- Kimya yazımı: alt / üst simge ---------------- */
  const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const ELS = new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
    'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pt Au Hg Tl Pb Bi Po At Rn Fr Ra U').split(' '));
  const toSub = (d) => d.replace(/\d/g, (c) => SUB[+c]);
  const toSup = (d) => d.replace(/\d/g, (c) => SUP[+c]).replace(/\+/g, '⁺').replace(/-/g, '⁻');

  /** Alt/üst simgeleri düz yazıya çevir (karşılaştırma için): CO₂ → CO2, Ca²⁺ → Ca2+ */
  U.plainChem = (s) => String(s)
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[⁰¹²³⁴-⁹]/g, (c) => String(SUP.indexOf(c)))
    .replace(/⁺/g, '+').replace(/⁻/g, '-');

  /**
   * Tek bir sözcüğü kimyasal formül gibi biçimlendir; formül değilse null döner.
   * "CO2" → CO₂, "Ca2+" → Ca²⁺, "SO42-" → SO₄²⁻, "2H2O" → 2H₂O, "Cu(OH)2" → Cu(OH)₂, "CO2'yi" → CO₂'yi
   * Sıradan sözcüklere ("5", "pH", "Su") dokunmaz: tüm parçalar gerçek element sembolü olmalı
   * ve en az bir rakam ya da yük işareti bulunmalı.
   */
  U.chemToken = function (tok) {
    const ap = tok.search(/['’]/);
    const suffix = ap >= 0 ? tok.slice(ap) : '';
    const core = ap >= 0 ? tok.slice(0, ap) : tok;
    const m = core.match(/^(\d*)([A-Z][A-Za-z0-9()]*?)(\d?[+-]|[+-]\d)?(\((?:k|s|g|suda|aq)\))?$/);
    if (!m) return null;
    let [, coef, body, charge, state] = m;
    // "NO3-", "NH4+": çok atomlu iyonda tek rakam alt simgedir (NO₃⁻). Tek elementte (Ca2+) veya
    // iki rakam varsa (SO42-) son rakam yüktür.
    if (charge && /^\d/.test(charge) && /[a-zA-Z)]$/.test(body) && (body.match(/[A-Z]/g) || []).length > 1) {
      body += charge[0]; charge = charge.slice(1);
    }
    const parts = body.match(/[A-Z][a-z]?|\(|\)|\d+/g);
    if (!parts || parts.join('') !== body) return null;
    let depth = 0, prev = '';
    for (const p of parts) {
      if (/^[A-Z]/.test(p) && !ELS.has(p)) return null;
      if (p === '(') depth++;
      if (p === ')' && --depth < 0) return null;
      if (/^\d/.test(p) && !(/^[A-Z]/.test(prev) || prev === ')')) return null;
      prev = p;
    }
    if (depth !== 0 || (!/\d/.test(body) && !charge)) return null;
    let ch = '';
    if (charge) { const d = charge.replace(/[+-]/, ''), s = charge.replace(/\d/, ''); ch = toSup((d === '1' ? '' : d) + s); }
    const out = coef + body.replace(/(\)|[a-zA-Z])(\d+)/g, (x, a, d) => a + toSub(d)) + ch + (state || '') + suffix;
    return out === tok ? null : out;
  };
  U.chemText = (s) => s.replace(/[^\s.,;:!?]+/g, (t) => U.chemToken(t) || t);

  /**
   * Bir metin kutusuna kimya yazım desteği ekle: sözcük bitince (boşluk/noktalama) formülü dönüştürür,
   * Ctrl+Z ile geri alınabilir; altına ₂ ²⁺ (k) gibi simgeler için düğme şeridi döndürür.
   */
  U.chemInput = function (ta) {
    let busy = false;
    const insert = (start, end, text) => {
      ta.focus();
      ta.setSelectionRange(start, end);
      let ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
      if (!ok) { ta.setRangeText(text, start, end, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
    };
    ta.addEventListener('input', (e) => {
      if (busy || e.inputType !== 'insertText' || !e.data || !/[\s.,;:!?]/.test(e.data.slice(-1))) return;
      const caret = ta.selectionStart, before = ta.value.slice(0, caret - 1);
      const tok = (before.match(/[^\s.,;:!?]+$/) || [''])[0];
      const conv = tok && U.chemToken(tok);
      if (!conv) return;
      busy = true;
      const s = caret - 1 - tok.length;
      insert(s, caret - 1, conv);
      const pos = s + conv.length + 1;
      ta.setSelectionRange(pos, pos);
      busy = false;
    });
    const SYM = [['₂', 'alt simge 2'], ['₃', 'alt simge 3'], ['₄', 'alt simge 4'], ['⁺', 'artı yük'], ['⁻', 'eksi yük'],
      ['²⁺', '2+ yük'], ['³⁺', '3+ yük'], ['²⁻', '2− yük'], ['→', 'ok'], ['(k)', 'katı'], ['(s)', 'sıvı'], ['(g)', 'gaz'], ['(suda)', 'suda çözünmüş']];
    const bar = U.h('div.chem-bar', { role: 'toolbar', 'aria-label': 'Kimya simgeleri' },
      SYM.map(([t, title]) => U.h('button', { type: 'button', 'data-ins': t, html: (/[₀-₉⁰-⁹⁺⁻²³¹]/.test(t) ? '<i>x</i>' : '') + t, title: title + ' ekle', 'aria-label': title + ' ekle' })),
      U.h('span.chem-tip', { html: 'İpucu: <b>CO2</b>, <b>Ca2+</b> yazıp boşluk bırakınca <b>CO₂</b>, <b>Ca²⁺</b> olur.' }));
    bar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      busy = true;
      insert(ta.selectionStart, ta.selectionEnd, b.dataset.ins);
      busy = false;
    });
    return bar;
  };

  T.U = U;
})(window.TUY);
