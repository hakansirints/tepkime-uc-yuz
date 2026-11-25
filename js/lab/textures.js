/* Prosedürel (kodla çizilen) dokular — dış görsel dosyası gerekmez. */
(function (T) {
  'use strict';
  const U = T.U;
  const Tex = {};
  let maxAniso = 8;
  Tex.setAniso = (n) => { maxAniso = n; };

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function toTex(c, opts) {
    opts = opts || {};
    const t = new THREE.CanvasTexture(c);
    if (opts.color !== false) t.colorSpace = THREE.SRGBColorSpace;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
    t.anisotropy = maxAniso;
    t.needsUpdate = true;
    return t;
  }
  Tex.toTex = toTex;
  Tex.canvas = canvas;

  function noise(ctx, w, h, amount, seed, alpha) {
    const r = U.rng(seed || 7);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * amount;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
      if (alpha) d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  /* Zemin: 60×60 vinil karo, hafif benekli */
  Tex.floor = function () {
    const c = canvas(1024, 1024), x = c.getContext('2d');
    const r = U.rng(11);
    const n = 4, s = 1024 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const base = 196 + Math.floor(r() * 10);
      x.fillStyle = `rgb(${base},${base + 1},${base - 3})`;
      x.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 900; k++) {
        const v = r();
        x.fillStyle = v < 0.5 ? `rgba(120,118,112,${0.15 + r() * 0.25})` : `rgba(255,255,255,${0.2 + r() * 0.3})`;
        const sz = 1 + r() * 3.2;
        x.fillRect(i * s + r() * s, j * s + r() * s, sz, sz * (0.5 + r()));
      }
    }
    x.strokeStyle = 'rgba(90,90,85,0.55)'; x.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 1024); x.stroke();
      x.beginPath(); x.moveTo(0, i * s); x.lineTo(1024, i * s); x.stroke();
    }
    noise(x, 1024, 1024, 10, 3);
    return toTex(c, { repeat: [3, 3] });
  };
  Tex.floorRough = function () {
    const c = canvas(512, 512), x = c.getContext('2d');
    x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, 512, 512);
    const r = U.rng(5);
    for (let k = 0; k < 120; k++) {
      x.strokeStyle = `rgba(${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 60 : 200},0.12)`;
      x.lineWidth = 1 + r() * 4;
      x.beginPath(); const sx = r() * 512, sy = r() * 512; x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 200, sy + (r() - 0.5) * 60); x.stroke();
    }
    noise(x, 512, 512, 40, 9);
    return toTex(c, { color: false, repeat: [6, 6] });
  };

  /* Boyalı duvar */
  Tex.wall = function (hex) {
    const c = canvas(512, 512), x = c.getContext('2d');
    x.fillStyle = hex || '#e9ecea'; x.fillRect(0, 0, 512, 512);
    noise(x, 512, 512, 7, 21);
    return toTex(c, { repeat: [4, 2] });
  };

  /* Seramik duvar fayansı (tezgâh arkası) */
  Tex.wallTiles = function () {
    const c = canvas(1024, 512), x = c.getContext('2d');
    const r = U.rng(31);
    const cols = 8, rows = 4, w = 1024 / cols, h = 512 / rows;
    x.fillStyle = '#b9bdb9'; x.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const b = 236 + Math.floor(r() * 8);
      const g = x.createLinearGradient(i * w, j * h, i * w + w, j * h + h);
      g.addColorStop(0, `rgb(${b},${b + 2},${b + 1})`);
      g.addColorStop(1, `rgb(${b - 8},${b - 6},${b - 6})`);
      x.fillStyle = g;
      x.fillRect(i * w + 3, j * h + 3, w - 6, h - 6);
    }
    noise(x, 1024, 512, 5, 4);
    return toTex(c, { repeat: [3, 1] });
  };

  /* Epoksi tezgâh üstü: koyu antrasit, ince benekli */
  Tex.epoxy = function () {
    const c = canvas(1024, 1024), x = c.getContext('2d');
    x.fillStyle = '#25282b'; x.fillRect(0, 0, 1024, 1024);
    const r = U.rng(77);
    for (let k = 0; k < 9000; k++) {
      x.fillStyle = `rgba(${150 + r() * 80},${150 + r() * 80},${150 + r() * 80},${0.05 + r() * 0.12})`;
      x.fillRect(r() * 1024, r() * 1024, 1 + r() * 1.6, 1 + r() * 1.6);
    }
    noise(x, 1024, 1024, 8, 2);
    return toTex(c, { repeat: [2, 1] });
  };
  Tex.epoxyRough = function () {
    const c = canvas(512, 512), x = c.getContext('2d');
    x.fillStyle = '#5a5a5a'; x.fillRect(0, 0, 512, 512);
    const r = U.rng(8);
    for (let k = 0; k < 60; k++) {
      // silinme izleri
      x.strokeStyle = `rgba(150,150,150,${0.05 + r() * 0.08})`;
      x.lineWidth = 8 + r() * 30;
      x.beginPath(); const cx = r() * 512, cy = r() * 512, rr = 30 + r() * 120;
      x.arc(cx, cy, rr, r() * 6, r() * 6 + 1.5); x.stroke();
    }
    noise(x, 512, 512, 25, 3);
    return toTex(c, { color: false, repeat: [2, 1] });
  };

  /* Dolap laminesi */
  Tex.laminate = function (hex) {
    const c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = hex || '#d9dcd8'; x.fillRect(0, 0, 256, 256);
    noise(x, 256, 256, 6, 13);
    return toTex(c, { repeat: [1, 1] });
  };

  /* Ahşap (tabure oturağı, kapı) */
  Tex.wood = function () {
    const c = canvas(512, 512), x = c.getContext('2d');
    const r = U.rng(19);
    x.fillStyle = '#a8784a'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) {
      x.strokeStyle = `rgba(${90 + r() * 40},${55 + r() * 25},${25 + r() * 15},${0.15 + r() * 0.25})`;
      x.lineWidth = 1 + r() * 3;
      x.beginPath();
      let y = r() * 512;
      x.moveTo(0, y);
      for (let k = 0; k <= 512; k += 32) { y += (r() - 0.5) * 6; x.lineTo(k, y); }
      x.stroke();
    }
    noise(x, 512, 512, 10, 4);
    return toTex(c);
  };

  /* Asma tavan karosu */
  Tex.ceiling = function () {
    const c = canvas(512, 512), x = c.getContext('2d');
    x.fillStyle = '#eceeed'; x.fillRect(0, 0, 512, 512);
    const r = U.rng(42);
    for (let k = 0; k < 2500; k++) {
      x.fillStyle = `rgba(150,150,150,${r() * 0.25})`;
      x.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
    }
    x.strokeStyle = '#c9ccca'; x.lineWidth = 6; x.strokeRect(0, 0, 512, 512);
    return toTex(c, { repeat: [12, 10] });
  };

  /* Floresan armatür (ızgaralı) */
  Tex.lightPanel = function () {
    const c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(170,175,180,0.9)'; x.lineWidth = 5;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke(); }
    for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(256, i * 32); x.stroke(); }
    return toTex(c);
  };

  /* Pencere dışı: gökyüzü, ağaçlar ve okul binası silueti */
  Tex.outside = function () {
    const c = canvas(1024, 512), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#8fc3ec'); g.addColorStop(0.55, '#cfe6f6'); g.addColorStop(1, '#e8f1f4');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    const r = U.rng(3);
    // bulutlar
    for (let i = 0; i < 9; i++) {
      const cx = r() * 1024, cy = 40 + r() * 140;
      for (let k = 0; k < 7; k++) {
        x.fillStyle = 'rgba(255,255,255,0.55)';
        x.beginPath(); x.ellipse(cx + (r() - 0.5) * 120, cy + (r() - 0.5) * 20, 30 + r() * 50, 14 + r() * 14, 0, 0, 7); x.fill();
      }
    }
    // uzak bina
    x.fillStyle = '#c9b8a3'; x.fillRect(560, 250, 380, 190);
    x.fillStyle = '#9fb7c9';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) x.fillRect(578 + i * 40, 270 + j * 52, 24, 32);
    // ağaçlar
    for (let i = 0; i < 26; i++) {
      const tx = r() * 1024, ty = 330 + r() * 70, rr = 35 + r() * 45;
      x.fillStyle = `rgb(${50 + r() * 30},${100 + r() * 40},${50 + r() * 25})`;
      x.beginPath(); x.ellipse(tx, ty, rr, rr * 1.15, 0, 0, 7); x.fill();
    }
    x.fillStyle = '#7f9b6a'; x.fillRect(0, 430, 1024, 82);
    return toTex(c);
  };

  /* Periyodik tablo posteri */
  const PT = [
    'H,,,,,,,,,,,,,,,,,He',
    'Li,Be,,,,,,,,,,,B,C,N,O,F,Ne',
    'Na,Mg,,,,,,,,,,,Al,Si,P,S,Cl,Ar',
    'K,Ca,Sc,Ti,V,Cr,Mn,Fe,Co,Ni,Cu,Zn,Ga,Ge,As,Se,Br,Kr',
    'Rb,Sr,Y,Zr,Nb,Mo,Tc,Ru,Rh,Pd,Ag,Cd,In,Sn,Sb,Te,I,Xe',
    'Cs,Ba,*,Hf,Ta,W,Re,Os,Ir,Pt,Au,Hg,Tl,Pb,Bi,Po,At,Rn',
    'Fr,Ra,*,Rf,Db,Sg,Bh,Hs,Mt,Ds,Rg,Cn,Nh,Fl,Mc,Lv,Ts,Og'
  ].map((r) => r.split(','));
  const LAN = 'La,Ce,Pr,Nd,Pm,Sm,Eu,Gd,Tb,Dy,Ho,Er,Tm,Yb,Lu'.split(',');
  const ACT = 'Ac,Th,Pa,U,Np,Pu,Am,Cm,Bk,Cf,Es,Fm,Md,No,Lr'.split(',');
  function ptColor(p, g, sym) {
    const nonmetal = ['H', 'C', 'N', 'O', 'P', 'S', 'Se'];
    const halogen = ['F', 'Cl', 'Br', 'I', 'At', 'Ts'];
    const noble = ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'];
    const metalloid = ['B', 'Si', 'Ge', 'As', 'Sb', 'Te'];
    if (noble.includes(sym)) return '#b9a6e8';
    if (halogen.includes(sym)) return '#f2df7a';
    if (nonmetal.includes(sym)) return '#9fe0a8';
    if (metalloid.includes(sym)) return '#9fd8d2';
    if (g === 0) return '#f59f8b';
    if (g === 1) return '#f7c58a';
    if (g >= 2 && g <= 11) return '#f3b6c6';
    return '#c7d3dc';
  }
  Tex.periodicTable = function () {
    const W = 1600, H = 1000;
    const c = canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#f8f7f2'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#1d3557'; x.fillRect(0, 0, W, 110);
    x.fillStyle = '#fff'; x.font = 'bold 64px Segoe UI, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('PERİYODİK TABLO', W / 2, 58);
    const cw = 82, chh = 92, ox = 62, oy = 140;
    let z = 0;
    const zOf = {};
    // atom numaraları için sıra
    const order = [];
    PT.forEach((row, p) => row.forEach((s, g) => { if (s && s !== '*') order.push([p, g, s]); }));
    // gerçek atom numarası sırası (lantanit/aktinit araya girer)
    const seq = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba']
      .concat(LAN, ['Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra'], ACT,
        ['Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og']);
    seq.forEach((s, i) => { zOf[s] = i + 1; });
    function cell(cx, cy, s, col) {
      x.fillStyle = col; x.fillRect(cx, cy, cw - 6, chh - 6);
      x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 2; x.strokeRect(cx, cy, cw - 6, chh - 6);
      x.fillStyle = '#1b1b1b'; x.textAlign = 'left'; x.font = '16px Segoe UI, Arial';
      x.fillText(String(zOf[s] || ''), cx + 6, cy + 16);
      x.textAlign = 'center'; x.font = 'bold 34px Segoe UI, Arial';
      x.fillText(s, cx + (cw - 6) / 2, cy + 54);
    }
    order.forEach(([p, g, s]) => cell(ox + g * cw, oy + p * chh, s, ptColor(p, g, s)));
    LAN.forEach((s, i) => cell(ox + (i + 3) * cw, oy + 7.35 * chh, s, '#f8d3a0'));
    ACT.forEach((s, i) => cell(ox + (i + 3) * cw, oy + 8.35 * chh, s, '#f6c0a8'));
    z++;
    return toTex(c);
  };

  /* Güvenlik kuralları posteri */
  Tex.safetyPoster = function () {
    const W = 700, H = 1000, c = canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#fffdf6'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#d62828'; x.fillRect(0, 0, W, 150);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 50px Segoe UI, Arial';
    x.fillText('LABORATUVAR', W / 2, 66); x.fillText('GÜVENLİK KURALLARI', W / 2, 124);
    const rules = [
      ['🥽', 'Koruyucu gözlük tak.'],
      ['🧤', 'Eldiven ve önlük kullan.'],
      ['👃', 'Kimyasalları koklama, tatma.'],
      ['🧪', 'Etiketsiz şişe kullanma.'],
      ['💧', 'Asidi suya ekle, tersini yapma.'],
      ['🚫', 'Laboratuvarda yiyecek yeme.'],
      ['🧯', 'Acil çıkışı ve yangın tüpünü bil.'],
      ['🧼', 'Çıkarken ellerini yıka.']
    ];
    rules.forEach(([ic, t], i) => {
      const y = 205 + i * 98;
      x.fillStyle = i % 2 ? '#fff4e0' : '#ffffff';
      x.fillRect(30, y - 44, W - 60, 88);
      x.font = '46px Segoe UI Emoji, Apple Color Emoji, Segoe UI, Arial'; x.textAlign = 'left'; x.fillStyle = '#000';
      x.fillText(ic, 48, y + 16);
      x.font = 'bold 32px Segoe UI, Arial'; x.fillStyle = '#1d3557';
      x.fillText(t, 120, y + 12);
    });
    return toTex(c);
  };

  /* Beyaz tahta */
  Tex.whiteboard = function () {
    const W = 2048, H = 900, c = canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#fbfcfc'; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(210,220,230,0.25)'); g.addColorStop(0.6, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // silinmiş izler
    x.fillStyle = 'rgba(120,130,150,0.06)';
    for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(300 + i * 280, 600 + (i % 2) * 120, 220, 50, 0.1, 0, 7); x.fill(); }
    x.font = 'italic bold 96px "Segoe Print", "Comic Sans MS", cursive';
    x.fillStyle = '#1f4fa8'; x.textAlign = 'center';
    x.fillText('Tepkimenin Üç Yüzü', W / 2, 150);
    x.font = '64px "Segoe Print", "Comic Sans MS", cursive';
    x.fillStyle = '#c0392b';
    // üçgen
    const cx = W / 2, cy = 520;
    x.strokeStyle = '#2c3e50'; x.lineWidth = 7;
    x.beginPath(); x.moveTo(cx, cy - 210); x.lineTo(cx - 330, cy + 190); x.lineTo(cx + 330, cy + 190); x.closePath(); x.stroke();
    x.fillStyle = '#c0392b'; x.fillText('Makroskobik', cx, cy - 235);
    x.fillStyle = '#1f7a4a'; x.textAlign = 'right'; x.fillText('Alt mikroskobik', cx - 360, cy + 230);
    x.fillStyle = '#6c3fb5'; x.textAlign = 'left'; x.fillText('Sembolik', cx + 360, cy + 230);
    x.textAlign = 'center'; x.fillStyle = '#2c3e50'; x.font = '50px "Segoe Print", "Comic Sans MS", cursive';
    x.fillText('Gözle → Modelle → Gerekçelendir', cx, cy + 40);
    return toTex(c);
  };

  /* Şişe etiketi */
  Tex.bottleLabel = function (title, sub, hazard) {
    const W = 512, H = 256, c = canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#fbfaf5'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#1d3557'; x.fillRect(0, 0, W, 46);
    x.fillStyle = '#fff'; x.font = 'bold 26px Segoe UI, Arial'; x.textAlign = 'center';
    x.fillText('KİMYA LAB.', W / 2, 32);
    x.fillStyle = '#111'; x.font = 'bold 34px Segoe UI, Arial';
    wrapText(x, title, W / 2, 98, W - 150, 38);
    x.font = '24px Segoe UI, Arial'; x.fillStyle = '#444';
    x.fillText(sub || '', W / 2, 215);
    if (hazard) {
      x.save(); x.translate(W - 60, 140); x.rotate(Math.PI / 4);
      x.fillStyle = '#fff'; x.strokeStyle = '#d62828'; x.lineWidth = 7;
      x.fillRect(-34, -34, 68, 68); x.strokeRect(-34, -34, 68, 68);
      x.restore();
      x.fillStyle = '#111'; x.font = 'bold 40px Segoe UI, Arial'; x.fillText('!', W - 60, 154);
    }
    return toTex(c);
  };
  function wrapText(x, text, cx, y, maxW, lh) {
    const words = text.split(' ');
    let line = '', lines = [];
    words.forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((l, i) => x.fillText(l, cx, y + i * lh));
    return lines.length;
  }
  Tex.wrapText = wrapText;

  /* Behere yapıştırılmış kâğıt bant etiket (el yazısı) */
  Tex.tapeLabel = function (text) {
    const W = 512, H = 160, c = canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#f4ecd2'; x.fillRect(0, 0, W, H);
    noise(x, W, H, 10, 5);
    x.fillStyle = '#1e2a6b'; x.textAlign = 'center';
    x.font = 'bold 40px "Segoe Print", "Comic Sans MS", cursive';
    const words = text.split(' ');
    let lines = [], line = '';
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > W - 30 && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    if (lines.length > 2) { x.font = 'bold 32px "Segoe Print", "Comic Sans MS", cursive'; }
    const lh = lines.length > 2 ? 40 : 52;
    const y0 = H / 2 - ((lines.length - 1) * lh) / 2 + 12;
    lines.slice(0, 3).forEach((l, i) => x.fillText(l, W / 2, y0 + i * lh));
    return toTex(c);
  };

  /* Beher derece çizgileri (beyaz emaye baskı) — alfa dokusu */
  /* maxMl: en üst çizgi, minMl: en alt çizgi, capMl: etiketteki tam hacim (başlık bunun üstüne yazılır) */
  Tex.graduations = function (maxMl, stepMl, labelEvery, heightPerMl, totalH, title, minMl, capMl) {
    // 2 kat çözünürlük: uzaktan bakınca ince çizgi ve yazılar daha net kalır (çizim mantığı 512 × 1024 birimde)
    const W = 512, H = 1024, c = canvas(W * 2, H * 2), x = c.getContext('2d');
    x.scale(2, 2);
    x.clearRect(0, 0, W, H);
    x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineCap = 'round';
    const px = (y) => H - (y / totalH) * H;
    const cx = W * 0.5;
    const titleMl = Math.min(capMl || maxMl, maxMl + labelEvery);
    for (let ml = minMl || stepMl; ml <= maxMl; ml += stepMl) {
      const y = px(ml * heightPerMl);
      const major = ml % labelEvery === 0;
      x.lineWidth = major ? 9 : 6;
      x.beginPath(); x.moveTo(cx - (major ? 70 : 40), y); x.lineTo(cx + (major ? 0 : -10), y); x.stroke();
      if (major) {
        x.font = 'bold 52px Segoe UI, Arial'; x.textAlign = 'left'; x.textBaseline = 'middle';
        x.fillText(String(ml), cx + 14, y);
      }
    }
    x.font = 'bold 54px Segoe UI, Arial'; x.textAlign = 'center';
    // etiket: en üst çizginin üstünde, ağızdan taşmadan
    const ty = Math.max(130, px(titleMl * heightPerMl) - 10);
    x.fillText(title, cx - 10, ty - 50);
    x.font = '34px Segoe UI, Arial';
    x.fillText('≈5%', cx - 10, ty - 6);
    // logo dairesi
    x.lineWidth = 5; x.beginPath(); x.arc(cx + 150, H - 120, 34, 0, 7); x.stroke();
    x.font = 'bold 26px Segoe UI'; x.fillText('LAB', cx + 150, H - 118);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = maxAniso;
    return t;
  };

  /* Termometre LCD ekranı */
  Tex.lcd = function () {
    const c = canvas(256, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.draw = function (val, unit) {
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#b9d6a8'); g.addColorStop(1, '#9fc38d');
      x.fillStyle = g; x.fillRect(0, 0, 256, 128);
      x.fillStyle = 'rgba(30,50,20,0.08)'; x.font = 'bold 74px Consolas, monospace'; x.textAlign = 'right';
      x.fillText('88.8', 214, 92);
      x.fillStyle = '#17240f'; x.fillText(val, 214, 92);
      x.font = 'bold 30px Segoe UI, Arial'; x.textAlign = 'left'; x.fillText(unit || '°C', 216, 52);
      x.font = '16px Segoe UI, Arial'; x.fillText('DİJİTAL TERMOMETRE', 10, 20);
      t.needsUpdate = true;
    };
    t.draw('22.0');
    return t;
  };

  /* Saat kadranı */
  Tex.clock = function () {
    const S = 512, c = canvas(S, S), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, 7); x.fill();
    x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 54px Segoe UI, Arial';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      x.fillText(String(i), S / 2 + Math.cos(a) * 190, S / 2 + Math.sin(a) * 190);
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      x.lineWidth = i % 5 ? 3 : 8;
      x.beginPath(); x.moveTo(S / 2 + Math.cos(a) * 232, S / 2 + Math.sin(a) * 232); x.lineTo(S / 2 + Math.cos(a) * (i % 5 ? 220 : 208), S / 2 + Math.sin(a) * (i % 5 ? 220 : 208)); x.stroke();
    }
    return toTex(c);
  };

  /* Basit yazılı tabela */
  Tex.sign = function (lines, bg, fg, w, h) {
    const W = w || 512, H = h || 256, c = canvas(W, H), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((l, i) => {
      x.font = (l.b ? 'bold ' : '') + (l.s || 40) + 'px Segoe UI, Segoe UI Emoji, Arial';
      x.fillText(l.t, W / 2, l.y != null ? l.y : H / 2 + (i - (lines.length - 1) / 2) * ((l.s || 40) * 1.25));
    });
    return toTex(c);
  };

  /* Yumuşak parçacık (duman) */
  Tex.soft = function () {
    const S = 128, c = canvas(S, S), x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(c);
    return t;
  };

  /* Köpük yüzeyi */
  Tex.foam = function () {
    const S = 512, c = canvas(S, S), x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    const r = U.rng(4);
    for (let i = 0; i < 1400; i++) {
      const rr = 3 + r() * 16;
      const cx = r() * S, cy = r() * S;
      x.strokeStyle = `rgba(170,175,180,${0.25 + r() * 0.4})`; x.lineWidth = 1 + r() * 1.5;
      x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.arc(cx - rr * 0.35, cy - rr * 0.35, rr * 0.22, 0, 7); x.fill();
    }
    return toTex(c, { repeat: [1, 1] });
  };

  /* Mermer: kırık beyaz zemin, ince gri damarlar ve kristal benekleri */
  Tex.marble = function (seed) {
    const S = 256, c = canvas(S, S), x = c.getContext('2d');
    const r = U.rng(seed || 31);
    x.fillStyle = '#ece9e2'; x.fillRect(0, 0, S, S);
    // yumuşak ton lekeleri
    for (let i = 0; i < 26; i++) {
      const g = x.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, 30 + r() * 70);
      const v = r() < 0.5 ? '210,205,196' : '250,249,245';
      g.addColorStop(0, `rgba(${v},${0.35 + r() * 0.3})`); g.addColorStop(1, `rgba(${v},0)`);
      x.fillStyle = g; x.fillRect(0, 0, S, S);
    }
    // damarlar: kırık çizgiler
    for (let k = 0; k < 9; k++) {
      let px = r() * S, py = r() * S, a = r() * Math.PI * 2;
      x.strokeStyle = `rgba(${95 + r() * 40},${95 + r() * 35},${92 + r() * 30},${0.45 + r() * 0.4})`;
      x.lineWidth = 1 + r() * 2.2;
      x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 40; s++) { a += (r() - 0.5) * 0.7; px += Math.cos(a) * 7; py += Math.sin(a) * 7; x.lineTo(px, py); }
      x.stroke();
    }
    // kalsit kristal parıltıları
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; x.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5); }
    noise(x, S, S, 18, seed || 31);
    return toTex(c);
  };

  T.Tex = Tex;
})(window.TUY);
