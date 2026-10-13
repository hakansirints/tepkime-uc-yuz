/**
 * MEBİ Web Audio API Prosedürel Ses Motoru
 * Harici ses dosyası (.mp3 / .wav) indirmesi olmadan, tamamen tarayıcı ses osilatörleri
 * ve filtreleri ile üretilen sıfır bağımlılıklı ses motoru.
 */

class LabAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.activeNodes = [];

    // Kayıtlı ses tercihini oku
    try {
      const saved = localStorage.getItem('mebi-sound-enabled');
      if (saved !== null) {
        this.isMuted = saved === 'false';
      }
    } catch (e) {
      this.isMuted = false;
    }
    // Touch devices have no hover; unlock within a real user gesture.
    const unlockFromGesture = event => {
      if (event.isTrusted && !this.isMuted && this.ctx?.state !== 'running') this.unlock();
    };
    document.addEventListener('pointerup', unlockFromGesture, true);
    document.addEventListener('click', unlockFromGesture, true);
    document.addEventListener('keydown', unlockFromGesture, true);
  }

  getAudioContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try { this.ctx = new AudioCtx(); } catch { return null; }
      }
    }
    return this.ctx;
  }

  unlock() {
    if (this.isMuted) return Promise.resolve(false);
    const ctx = this.getAudioContext();
    if (!ctx) return Promise.resolve(false);
    if (ctx.state === 'running') return Promise.resolve(true);
    try {
      // Resume both suspended and interrupted contexts (e.g. after backgrounding).
      const resumed = ctx.resume();
      const silent = ctx.createBufferSource();
      silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      silent.connect(ctx.destination); silent.onended = () => silent.disconnect();
      silent.start();
      return Promise.resolve(resumed).then(() => ctx.state === 'running', () => false);
    } catch { return Promise.resolve(false); }
  }

  readyContext(retry) {
    const ctx = this.getAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'running') return ctx;
    // Schedule the effect only after resuming, using the new currentTime.
    this.unlock().then(ready => { if (ready && !this.isMuted) retry(); });
    return null;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('mebi-sound-enabled', (!this.isMuted).toString());
    } catch (e) {}
    return !this.isMuted;
  }

  // 1. Hover Blip Sesi (520Hz -> 720Hz)
  playHover() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.045);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  // 2. Tıklama Sesi (3D Dokunsal Pop)
  playClick() {
    if (this.isMuted) return;
    const ctx = this.readyContext(() => this.playClick());
    if (!ctx) return;

    const now = ctx.currentTime;
    // Gövde osilatörü
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.065);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Çıtırtı / Transient
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'sine';
    snap.frequency.setValueAtTime(640, now);
    snap.frequency.exponentialRampToValueAtTime(220, now + 0.025);
    snapGain.gain.setValueAtTime(0.08, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    snap.connect(snapGain);
    snapGain.connect(ctx.destination);

    osc.start(now);
    snap.start(now);
    osc.stop(now + 0.07);
    snap.stop(now + 0.03);
  }

  // 3. Sıvı Dökme Sesi (Filtrelenmiş Beyaz Gürültü Uğultusu)
  playPour(durationSec = 2.0) {
    if (this.isMuted) return;
    const ctx = this.readyContext(() => this.playPour(durationSec));
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.linearRampToValueAtTime(850, now + durationSec * 0.8);
    filter.Q.value = 4.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
    gain.gain.linearRampToValueAtTime(0.12, now + durationSec - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + durationSec);
  }

  // 4. Gaz Kabarcığı ve Köpürme Sesi (Fizz / Effervescence)
  playFizz(durationSec = 4.0) {
    if (this.isMuted) return;
    const ctx = this.readyContext(() => this.playFizz(durationSec));
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Çatırtılı / kabarcıklı pembe gürültü yaklaşımı
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.08;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
    gain.gain.linearRampToValueAtTime(0.1, now + durationSec * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + durationSec);
  }

  // 5. Başarı / Onay Akordu (C5 - E5 - G5 - C6 Majör Akor)
  playSuccess() {
    if (this.isMuted) return;
    const ctx = this.readyContext(() => this.playSuccess());
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + idx * 0.08;
      const dur = 0.6;

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + dur);
    });
  }

  // 6. İpucu / Düşünme Sesi (Yumuşak Marimba)
  playHint() {
    if (this.isMuted) return;
    const ctx = this.readyContext(() => this.playHint());
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 7. Uyarı / Yanılgı Sesi (Yumuşak Düşük Tonlu Çift Ton)
  playWarning() {
    if (this.isMuted) return;
    const ctx = this.readyContext(() => this.playWarning());
    if (!ctx) return;

    const now = ctx.currentTime;
    const tones = [350, 260];
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.18);
    });
  }
}

// Global Audio Engine Instance
const labAudio = new LabAudioEngine();
if (typeof window !== "undefined") {
  window.labAudio = labAudio;
}
