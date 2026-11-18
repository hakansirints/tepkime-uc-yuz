/* Sentezlenmiş laboratuvar sesleri (dosya gerekmez). */
(function (T) {
  'use strict';
  let ctx = null, master = null, enabled = true;
  let noiseBuf = null;
  const loops = {};

  function init() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function noiseSource() {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    return s;
  }

  /** Sürekli ses: 'pour' | 'fizz' | 'hiss' */
  function startLoop(name, level) {
    if (!enabled || !init()) return;
    resume();
    stopLoop(name, 0.05);
    const src = noiseSource();
    const g = ctx.createGain();
    g.gain.value = 0;
    let chain = src;
    let extra = null;
    if (name === 'pour') {
      /* Gerçekçi döküm: (1) sıvı yüzeyine çarpan akışın parlak sıçrama hışırtısı,
         (2) kabın içindeki hava boşluğunun rezonansı (kap doldukça incelir),
         (3) düşük frekanslı gürgürtü, (4) akışın sürüklediği küçük hava kabarcıklarının
         yukarı kayan "plop" sesleri (Minnaert rezonansı). Genlik düzensiz dalgalanır. */
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420;
      const splash = ctx.createBiquadFilter(); splash.type = 'bandpass'; splash.frequency.value = 3200; splash.Q.value = 0.55;
      const res = ctx.createBiquadFilter(); res.type = 'peaking'; res.frequency.value = 620; res.Q.value = 3.2; res.gain.value = 11;
      const mod = ctx.createGain(); mod.gain.value = 0.7;
      chain.connect(hp); hp.connect(splash); splash.connect(res); res.connect(mod); chain = mod;
      // düşük gürgürtü (ayrı gürültü kaynağı, ağır süzgeç)
      const src2 = noiseSource();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
      const lowG = ctx.createGain(); lowG.gain.value = 0.55;
      src2.connect(lp); lp.connect(lowG); lowG.connect(g); src2.start();
      loops[name + '_src2'] = src2;
      extra = { res };
      const iv = setInterval(() => {
        if (!ctx) return;
        const now = ctx.currentTime;
        // akış düzensizliği: sıçrama genliği ve gürgürtü hafifçe dalgalanır
        mod.gain.setTargetAtTime(0.45 + Math.random() * 0.55, now, 0.03);
        lowG.gain.setTargetAtTime(0.35 + Math.random() * 0.4, now, 0.06);
        // kabarcık "plop"ları: kısa, frekansı yukarı kayan sinüsler
        const n = Math.random() < 0.7 ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const fill = (loops.pour && loops.pour.fill) || 0;
          const f0 = (380 + Math.random() * 900) * (1 + fill * 0.8);
          const o = ctx.createOscillator(), og = ctx.createGain();
          const t0 = now + Math.random() * 0.03, d = 0.025 + Math.random() * 0.05;
          o.type = 'sine';
          o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (1.5 + Math.random() * 0.6), t0 + d);
          og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.09, t0 + 0.004);
          og.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
          o.connect(og); og.connect(g); o.start(t0); o.stop(t0 + d + 0.02);
        }
      }, 38);
      loops[name + '_iv'] = iv;
    } else if (name === 'fizz') {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
      chain.connect(hp); chain = hp;
      // çıtırtı: genliği rastgele değişen kazanç
      const crackle = ctx.createGain(); crackle.gain.value = 0.6;
      chain.connect(crackle); chain = crackle;
      const iv = setInterval(() => { if (ctx) crackle.gain.setTargetAtTime(0.25 + Math.random() * 0.9, ctx.currentTime, 0.01); }, 45);
      loops[name + '_iv'] = iv;
    } else {
      const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 2200; lp.Q.value = 0.5;
      chain.connect(lp); chain = lp;
    }
    chain.connect(g); g.connect(master);
    src.start();
    g.gain.setTargetAtTime(level == null ? 0.25 : level, ctx.currentTime, 0.15);
    loops[name] = Object.assign({ src, g }, extra || {});
  }
  function setLoop(name, level) {
    const l = loops[name];
    if (l && ctx) l.g.gain.setTargetAtTime(level, ctx.currentTime, 0.3);
  }
  function stopLoop(name, fade) {
    const l = loops[name];
    if (!l || !ctx) return;
    const t = fade == null ? 0.4 : fade;
    l.g.gain.setTargetAtTime(0, ctx.currentTime, t / 3);
    const src = l.src;
    setTimeout(() => { try { src.stop(); } catch (e) { /* */ } }, t * 1000 + 200);
    if (loops[name + '_lfo']) { try { loops[name + '_lfo'].stop(); } catch (e) { /* */ } delete loops[name + '_lfo']; }
    if (loops[name + '_src2']) { const s2 = loops[name + '_src2']; setTimeout(() => { try { s2.stop(); } catch (e) { /* */ } }, t * 1000 + 200); delete loops[name + '_src2']; }
    if (loops[name + '_iv']) { clearInterval(loops[name + '_iv']); delete loops[name + '_iv']; }
    delete loops[name];
  }
  function tone(freq, dur, type, vol, when) {
    if (!enabled || !init()) return;
    resume();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const t0 = ctx.currentTime + (when || 0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.15, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const Audio = {
    init, resume,
    startLoop, setLoop, stopLoop,
    click() { tone(1400, 0.06, 'triangle', 0.08); },
    glass() { tone(2637, 0.5, 'sine', 0.06); tone(3951, 0.35, 'sine', 0.03, 0.01); },
    success() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, i * 0.09)); },
    error() { tone(220, 0.25, 'square', 0.05); tone(196, 0.3, 'square', 0.04, 0.12); },
    pop() { tone(600 + Math.random() * 400, 0.08, 'sine', 0.05); },
    /** Dökülen sıvının sesi kap doldukça incelir (hava boşluğu küçülür): f = 0..1 doluluk */
    pourFill(f) {
      const l = loops.pour;
      if (!l || !ctx || !l.res) return;
      const k = Math.max(0, Math.min(1, f));
      l.res.frequency.setTargetAtTime(620 + k * 1300, ctx.currentTime, 0.25);
      l.fill = k;
    },
    toggle() { enabled = !enabled; if (!enabled) Object.keys(loops).forEach((k) => { if (!k.includes('_')) stopLoop(k, 0.1); }); return enabled; },
    get enabled() { return enabled; }
  };
  T.Audio = Audio;
})(window.TUY);
