/* ============================================================
   TEST MODU — yalnızca geliştirme ve deneme için. Bu dosya yüklü olduğu sürece hep açıktır.
   ⚙️ menüsünün altında "Geliştirici" bölümü çıkar:
   🧪 Bu aşamayı çöz → bulunduğun aşamanın işlemlerini seçtiğin tepkimeye göre DOĞRU yapar.
   ↺ Bu aşamayı sıfırla → tamamlanmış aşamanın yanıtlarını siler (1–2. aşamada sonrakileri kilitler).
   Sonraki aşamaya kendin geçersin; aşama atlama yoktur.

   YAYINDAN ÖNCE KALDIRMAK: bu dosyayı sil ve index.html'deki
   <script src="js/dev.js"></script> satırını kaldır. Başka iz yoktur.
   ============================================================ */
(function () {
  'use strict';
  const T = window.TUY;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, timeout) {
    const t0 = Date.now();
    for (;;) {
      try { if (fn()) return true; } catch (e) { /* henüz hazır değil */ }
      if (Date.now() - t0 > (timeout || 20000)) return false;
      await wait(120);
    }
  }
  const $ = (s, r) => (r || document).querySelector(s);
  const byText = (sel, re, root) => Array.from((root || document).querySelectorAll(sel)).find((e) => re.test(e.textContent));
  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
  const setMS = (target, src) => { Object.keys(target).forEach((k) => delete target[k]); Object.assign(target, src); };
  const sameMS = (a, b) => {
    const ka = Object.keys(a || {}).filter((k) => a[k] > 0), kb = Object.keys(b || {}).filter((k) => b[k] > 0);
    return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
  };
  const S = () => T.State;
  const R = () => T.State.reaction;
  const toast = (t) => T.U && T.U.toast ? T.U.toast(t) : console.log('[test]', t);

  const JUST = 'Modelde suda çözünen tuzlar katı kristal gibi gösterilmişti; bunlar suda ayrı iyonlar olarak gösterilmeli. ' +
    'Çökelti ise katı olarak kalır. Atom türleri ve atom sayıları korunur; atomlar yok olmaz, yeniden düzenlenir.';

  /* 2. aşamadaki modeli doğru modele çevir (3. ve 4. aşama bu modelle çalışır) */
  function fixModel() {
    const d = S().data, r = R();
    d.model = d.model || { before: {}, after: {} };
    if (sameMS(d.model.before, r.before) && sameMS(d.model.after, r.after)) return false;
    d.model.before = Object.assign({}, r.before);
    d.model.after = Object.assign({}, r.after);
    S().save();
    return true;
  }

  const SOLVE = {
    async 1() {
      const L = T.Lab;
      if (!S().data.reaction || L.state === 'idle') { toast('🧪 Test: önce soldan bir tepkime seç.'); return; }
      if (L.state === 'ready') {
        if (!L.safetyWorn()) { if (T.Stage1.wear) T.Stage1.wear(); else L.wearSafety(); }
        await wait(300);
        L.pour();
      }
      toast('🧪 Test: deney yapılıyor, gözlem süresi bekleniyor…');
      if (!(await until(() => L.state === 'done', 90000))) { toast('🧪 Test: deney bitmedi.'); return; }
      const ta = $('#obs-text');
      ta.disabled = false;
      ta.value = R().okText || 'Karışımda gözle görülür bir değişim oldu.';
      fire(ta, 'input');
      await wait(300);
      await until(() => !$('#btn-check-obs').disabled, 15000);
      $('#btn-check-obs').click();
    },
    async 2() {
      const st = T.Stage2, b = st.builder;
      if (!b) return;
      b.setTarget('before'); setMS(b.model.before, R().before); b.refresh(); b.o.onChange(b.model);
      await wait(400);
      b.setTarget('after'); setMS(b.model.after, R().after); b.refresh(); b.o.onChange(b.model);
      await wait(400);
      if (b.playMid) b.playMid();
    },
    async 3() {
      if (fixModel()) { T.App.go(3); await wait(600); }
      const st = T.Stage3;
      for (let guard = 0; guard < 12 && !S().data.done[3]; guard++) {
        const t = st.tasks[st.ti];
        if (st.step === 1) {
          const g = st.bGroups.find((x) => x.userData.sid === t.from) ||
            st.bGroups.find((x) => T.SPECIES[x.userData.sid].atoms.some((a) => a.el === t.el));
          st.pickBefore({ group: g });
          await wait(500);
        }
        if (st.step === 2) { st.play(); await until(() => st.step >= 3, 20000); await wait(300); }
        if (st.step === 3) {
          const i = st.mapInfo ? st.mapInfo.afterIndex : -1;
          if (i < 0) { toast('🧪 Test: atom izlenemedi.'); return; }
          const g = st.aGroups.find((x) => x.userData.index === i) || st.aGroups[i];
          st.pickAfter({ group: g });
          await wait(700);
        }
        if (st.step === 4) { st.finishTask(true); await wait(500); }
      }
    },
    async 4() {
      if (fixModel()) { T.App.go(4); await wait(600); }
      const st = T.Stage4;
      if (!st.runBtn || !st.runBtn.isConnected) { st.showRun(); await wait(400); }
      st.run();
      await until(() => !!S().data.done[4], 20000);
    },
    async 5() {
      const st = T.Stage5;
      for (const k of Object.keys(st.termEls || {})) { st.termEls[k].click(); await wait(450); }
      await until(() => st.quizShown, 5000);
      const label = T.speciesLabel(R().quiz.ans);
      const b = Array.from(st.quizEl.querySelectorAll('.opt')).find((x) => { const f = x.querySelector('b'); return f && f.textContent === label; });
      if (b && !b.disabled) b.click();
    },
    async 6() {
      const st = T.Stage6, keys = ['micro', 'macro', 'sym'];
      for (let i = 0; i < 3; i++) {
        const rec = S().data.tasks6 && S().data.tasks6[keys[i]];
        if (rec && rec.ok) continue;
        if (st.idx !== i) { st.show(i); await wait(450); }
        if (keys[i] === 'micro') {
          const b = st.builder;
          setMS(b.model.after, st.r.after); b.refresh(); b.o.onChange(b.model);
          await wait(400);
          byText('button', /Modelimi kontrol et/, b.rightSlot).click();
        } else if (keys[i] === 'macro') {
          const ta = st.area.querySelector('.s6-ta');
          if (ta) { ta.value = T.macroSentence(st.r); fire(ta, 'input'); await wait(300); byText('button', /Tahminimi kontrol et/, st.area).click(); }
        } else {
          const terms = T.eqTerms(st.r).filter((t) => !t.cat);
          const els = st.area.querySelectorAll('.eq-fill .term');
          terms.forEach((t, j) => {
            const c = els[j].querySelector('select.coef'), s = els[j].querySelector('select.state');
            c.value = String(t.c); fire(c, 'change'); s.value = t.s; fire(s, 'change');
          });
          await wait(400);
          byText('button', /Denklemi kontrol et/, st.area).click();
        }
        await wait(900);
      }
    },
    async 7() {
      const st = T.Stage7, d = S().data;
      if (!(d.s7 && d.s7.fixed)) {
        if (!st.builder || !st.builder.rightSlot.isConnected) { st.showFix(); await wait(400); }
        const b = st.builder;
        setMS(b.model.before, st.r.before); setMS(b.model.after, st.r.after); b.refresh(); b.o.onChange(b.model);
        await wait(400);
        byText('button', /çalıştır/, b.rightSlot).click();
        if (!(await until(() => d.s7 && d.s7.fixed, 20000))) { toast('🧪 Test: model onarılamadı.'); return; }
        await wait(600);
      }
      if (!(d.s7 && d.s7.justified)) {
        if (!$('.justify-box')) { st.showJustify(); await wait(400); }
        const ta = $('.justify-box');
        ta.value = JUST; fire(ta, 'input');
        await wait(300);
        byText('#ws-body button', /Gerekçemi değerlendir/).click();
      }
    }
  };

  /* ---------- tek aşamayı sıfırla ---------- */
  const STAGE_NAMES = { 1: 'Gözlem', 2: 'Modelle', 3: 'Atom Takibi', 4: 'Test Et', 5: 'Üç Gösterim', 6: 'Temsil Değiştir', 7: 'Bozuk Model' };
  function resetStage(n) {
    const d = S().data;
    if (n === 1) {
      d.observation = ''; d.obsTries = 0;
      if (T.Stage1) T.Stage1.passed = false;
      const fb = $('#obs-feedback'); if (fb) fb.classList.add('hidden');
    } else if (n === 2) {
      d.model = { before: {}, after: {} }; d.hintsUsed = { before: 0, after: 0 };
    } else if (n === 3) d.trackLog = [];
    else if (n === 4) d.testRuns = 0;
    else if (n === 6) d.tasks6 = {};
    else if (n === 7) { d.justification = ''; delete d.s7; }
    d.done = d.done || {};
    d.done[n] = false;
    if (n <= 2) { for (let k = n + 1; k <= 7; k++) d.done[k] = false; d.maxStage = n; }
    S().save();
    T.App.renderStepper();
    T.App.go(n, true);
    toast('↺ ' + n + '. aşama sıfırlandı.');
  }
  function askReset() {
    const n = T.App.current || 1, U = T.U;
    if (T.Tutorial && T.Tutorial.active) { toast('Öğretici açıkken aşama sıfırlanamaz.'); return; }
    if (!(S().data.done || {})[n]) { toast('Bu aşama henüz tamamlanmadı.'); return; }
    const lock = n <= 2 ? ' ' + (n + 1) + '–7. aşamalar yeniden kilitlenecek.' : ' Diğer aşamalar etkilenmez.';
    const close = U.modal(U.h('div', null,
      U.h('h2', { text: n + '. aşamayı sıfırla?' }),
      U.h('p', { text: '“' + STAGE_NAMES[n] + '” aşamasındaki yanıtların silinir ve aşama yeniden başlar.' + lock }),
      U.h('div.modal-actions', null,
        U.h('button.btn.ghost', { text: 'Vazgeç', onclick: () => close() }),
        U.h('button.btn.primary', { text: 'Sıfırla', onclick: () => { close(); resetStage(n); } }))));
  }

  /* ---------- ⚙️ menüsünde "Geliştirici" bölümü ---------- */
  const css = document.createElement('style');
  css.textContent = `
    .sm-dev-h { padding: 4px 10px 2px; font-size: 10.5px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; color: #ea580c; }
    #dev-test .sm-ic { background: rgba(249,115,22,.16); }
    #dev-test.busy { cursor: progress; opacity: .7; }
    .sm-item:disabled { opacity: .45; cursor: not-allowed; background: none; }
  `;
  document.head.appendChild(css);

  function item(id, ic, lbl, cls) {
    const b = document.createElement('button');
    b.className = 'sm-item' + (cls ? ' ' + cls : '');
    b.id = id; b.type = 'button'; b.setAttribute('role', 'menuitem');
    b.innerHTML = '<span class="sm-ic" aria-hidden="true">' + ic + '</span><span class="sm-lbl">' + lbl + '</span>';
    return b;
  }
  function closeMenu() {
    const m = $('#settings-menu'), s = $('#btn-settings');
    if (m) m.classList.add('hidden');
    if (s) { s.classList.remove('on'); s.setAttribute('aria-expanded', 'false'); }
  }
  function mount() {
    const menu = $('#settings-menu');
    if (!menu || $('#dev-test')) return;
    const sep = document.createElement('div'); sep.className = 'sm-sep'; sep.setAttribute('role', 'separator');
    const head = document.createElement('div'); head.className = 'sm-dev-h'; head.textContent = 'Geliştirici';
    const test = item('dev-test', '🧪', 'Bu aşamayı çöz (test)');
    const reset = item('dev-reset', '↺', 'Bu aşamayı sıfırla', 'danger');
    let busy = false;
    test.addEventListener('click', async () => {
      if (busy) return;
      const n = T.App.current || 1;
      closeMenu();
      if (T.Tutorial && T.Tutorial.active) { toast('🧪 Test: öğretici açıkken çalışmaz.'); return; }
      if (n > 1 && !S().data.reaction) { toast('🧪 Test: önce tepkime seç.'); return; }
      busy = true; test.classList.add('busy'); test.querySelector('.sm-lbl').textContent = 'Test çalışıyor…';
      try { await SOLVE[n](); }
      catch (e) { console.error('[test]', e); toast('🧪 Test hata verdi: ' + e.message); }
      finally { busy = false; test.classList.remove('busy'); test.querySelector('.sm-lbl').textContent = 'Bu aşamayı çöz (test)'; }
    });
    reset.addEventListener('click', () => { closeMenu(); askReset(); });
    menu.append(sep, head, test, reset);
    // menü her açıldığında: sıfırlama yalnızca tamamlanmış aşamada etkin
    const sb = $('#btn-settings');
    if (sb) sb.addEventListener('click', () => {
      const n = T.App.current || 1;
      reset.disabled = !(S().data.done || {})[n];
      reset.title = reset.disabled ? 'Bu aşama henüz tamamlanmadı' : n + '. aşamanın yanıtlarını siler';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  T.Dev = { solve: (n) => SOLVE[n || T.App.current]() };
})();
