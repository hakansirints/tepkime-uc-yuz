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
    return (s || '')
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

  /** Element rengini CSS hex olarak döndür */
  U.hex = (n) => '#' + n.toString(16).padStart(6, '0');

  T.U = U;
})(window.TUY);
