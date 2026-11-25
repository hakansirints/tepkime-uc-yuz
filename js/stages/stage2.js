/* AŞAMA 2 — Modelini kur: tepkime öncesi ve sonrası tanecikleri öğrenci yerleştirir. */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State;

  const Stage2 = {
    enter(body) {
      const r = S.reaction;
      const d = S.data;
      d.model = d.model || { before: {}, after: {} };
      this.builder = new T.Builder(body, {
        reaction: r,
        pool: shuffle(r.pool, r.no),
        model: d.model,
        showCounter: true,
        onChange: () => { S.save(); this.updateFooter(); }
      });
      // gözlem hatırlatması
      this.builder.rightSlot.appendChild(h('div.feedback.info', { style: { fontSize: '13px' }, html: '<b>Gözlemin</b>“' + escapeHtml(d.observation || '') + '”' }));
      this.status = h('span.grow');
      this.nextBtn = h('button.btn.primary', { text: 'Modeli kaydet, atom takibine geç →' });
      this.nextBtn.addEventListener('click', () => {
        T.App.complete(2);
        T.App.go(3);
      });
      const reset = h('button.btn.ghost', { text: '↺ Modeli temizle' });
      reset.addEventListener('click', () => {
        d.model.before = {}; d.model.after = {};
        S.save();
        this.builder.refresh();
        this.updateFooter();
      });
      body.appendChild(h('div.ws-footer', null, this.status, reset, this.nextBtn));
      this.updateFooter();
    },
    updateFooter() {
      const m = S.data.model;
      const nb = Object.keys(m.before).length, na = Object.keys(m.after).length;
      this.nextBtn.disabled = !(nb && na);
      this.status.innerHTML = nb && na ? 'Modelin 4. aşamada test edilecek.' : '';
      const R = this.builder.regEl;
      if (!nb) T.App.task({ step: [1, 3], target: R.before, text: 'Tepkime öncesindeki tanecikleri yerleştir',
        hint: 'Havuzdan kartları <b><span class="sn r-before">1</span>Tepkime öncesi</b> bölümüne ekle. Karıştırmadan önce kaplarda hangi tanecikler vardı?' });
      else if (!na) T.App.task({ step: [2, 3], target: R.after, text: 'Tepkime sonrasındaki tanecikleri yerleştir',
        hint: 'Havuzun üstünden <b><span class="sn r-after">3</span>Sonrasına</b> seçeneğini seç, oluşan ve ortamda kalan tanecikleri ekle.' });
      else T.App.task({ step: [3, 3], target: R.mid, text: 'Modelini canlandır, sonra kaydet',
        hint: '<b>▶ Canlandır</b> ile atomların yeniden düzenlenmesini izle. Hazırsan sağ alttaki <b>Modeli kaydet</b> düğmesine bas.' });
    },
    leave() { if (this.builder) { this.builder.destroy(); this.builder = null; } }
  };

  function shuffle(arr, seed) {
    const a = arr.slice();
    const r = U.rng(seed * 977 + 13);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  T.shuffleSeed = shuffle;
  T.escapeHtml = escapeHtml;
  T.Stage2 = Stage2;
})(window.TUY);
