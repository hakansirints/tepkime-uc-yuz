/* İlerleme durumu — tarayıcıda (localStorage) saklanır; erişilemezse bellekte kalır. */
(function (T) {
  'use strict';
  const KEY = 'tuy-ilerleme-v1';

  const STAGES = [
    { n: 1, key: 'gozlem', short: 'Gözlem' },
    { n: 2, key: 'modelle', short: 'Modelle' },
    { n: 3, key: 'atom', short: 'Atom Takibi' },
    { n: 4, key: 'test', short: 'Test Et' },
    { n: 5, key: 'uc', short: 'Üç Gösterim' },
    { n: 6, key: 'temsil', short: 'Temsil Değiştir' },
    { n: 7, key: 'bozuk', short: 'Bozuk Model' }
  ];

  function fresh() {
    return {
      reaction: null,         // seçilen ana tepkime
      stage: 1,               // şu anki aşama
      maxStage: 1,            // açılmış en yüksek aşama
      done: {},               // {1:true, ...}
      observation: '',        // öğrencinin gözlem metni
      obsTries: 0,
      model: { before: {}, after: {} }, // öğrencinin modeli
      hintsUsed: { before: 0, after: 0 },
      trackLog: [],
      testRuns: 0,
      tasks6: {},
      justification: '',
      completedReactions: {}
    };
  }

  const State = {
    STAGES,
    data: fresh(),
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.data = Object.assign(fresh(), JSON.parse(raw));
      } catch (e) { /* depolama yoksa bellekte devam */ }
      if (this.data.reaction && !T.REACTIONS[this.data.reaction]) this.data = fresh();
      return this.data;
    },
    sandbox: false,         // öğretici açıkken ilerleme kaydedilmez
    save() {
      if (this.sandbox) return;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* yok say */ }
    },
    reset() {
      const keep = this.data.completedReactions;
      this.data = fresh();
      this.data.completedReactions = keep || {};
      this.save();
    },
    complete(n) {
      this.data.done[n] = true;
      this.data.maxStage = Math.max(this.data.maxStage, Math.min(7, n + 1));
      this.save();
    },
    get reaction() { return this.data.reaction ? T.REACTIONS[this.data.reaction] : null; }
  };

  T.State = State;
})(window.TUY);
