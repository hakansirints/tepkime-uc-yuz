/* Beher (dökme ağızlı, dereceli cam) + kesme düzlemli gerçekçi sıvı + dijital termometre. */
(function (T) {
  'use strict';
  const P = T.Props, Tex = T.Tex, U = T.U;

  const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _q = new THREE.Quaternion();

  /** Ağız (spout) bükümü: üst kenardaki köşeleri dışa ve yukarı it */
  function deformSpout(geo, H, dirAngle, amount) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const zone = 0.016;
      if (y < H - zone) continue;
      const ang = Math.atan2(z, x);
      let d = Math.abs(((ang - dirAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const w = Math.pow(Math.max(0, 1 - d / 0.5), 2) * U.smooth((y - (H - zone)) / zone);
      if (w <= 0) continue;
      const r = Math.hypot(x, z);
      const nr = r + amount * w;
      pos.setXYZ(i, Math.cos(ang) * nr, y + amount * 0.35 * w, Math.sin(ang) * nr);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  class Beaker {
    /**
     * o: {capacity, R, H, spoutAngle, label, scene}
     */
    constructor(o) {
      this.o = o;
      this.capacity = o.capacity;
      this.R = o.R; this.H = o.H;
      this.Ri = o.R - 0.0013;
      this.y0 = 0.0032;        // iç taban yüksekliği
      this.volume = 0;          // mL
      this.spoutAngle = o.spoutAngle || 0;
      this.group = new THREE.Group();
      this.group.name = o.name || 'beaker';
      this.scene = o.scene;
      this.tilt = 0;
      this._build();
    }
    _build() {
      const { R, H } = this;
      const prof = [[0.0, 0.0018], [R - 0.004, 0.0], [R - 0.0012, 0.0008], [R, 0.0035], [R, H]];
      const geo = P.lathe(prof, 64);
      deformSpout(geo, H, this.spoutAngle, R * 0.17);
      const shell = P.glassShell(geo, { env: 1.6 });
      this.group.add(shell);
      // ağız kenarı (kalınlık hissi)
      const tg = new THREE.TorusGeometry(R + 0.0004, 0.0021, 10, 72); // biraz kalın: uzaktan tırtıklı görünmesin
      tg.rotateX(Math.PI / 2);
      tg.translate(0, H, 0);
      deformSpout(tg, H + 0.004, this.spoutAngle, R * 0.17);
      const rim = new THREE.Mesh(tg, P.glass({ env: 2.2, opacity: 0.22, color: 0x1a2328 }));
      rim.renderOrder = 11;
      this.group.add(rim);
      // kalın cam taban
      const base = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.0025, R - 0.004, 0.003, 48), P.glass({ env: 1.8, opacity: 0.18, color: 0x15201f }));
      base.position.y = 0.0016; base.renderOrder = 9;
      this.group.add(base);
      // yumuşak temas gölgesi (cam keskin gölge yapmaz)
      if (!Beaker._shadowTex) {
        const c = Tex.canvas(128, 128), x = c.getContext('2d');
        const gr = x.createRadialGradient(64, 64, 10, 64, 64, 64);
        gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
        Beaker._shadowTex = new THREE.CanvasTexture(c);
      }
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.0, R * 3.0), new THREE.MeshBasicMaterial({ map: Beaker._shadowTex, transparent: true, depthWrite: false, opacity: 0.6 }));
      sh.rotation.x = -Math.PI / 2; sh.position.set(R * 0.25, 0.0006, -R * 0.15); sh.renderOrder = 0;
      this.contactShadow = sh;
      this.group.add(sh);
      // dereceler
      this.hPerMl = 1e-6 / (Math.PI * this.Ri * this.Ri); // gerçek: m / mL
      const cap = this.capacity;
      const step = cap >= 500 ? 50 : cap >= 250 ? 25 : 10, label = cap >= 500 ? 100 : cap >= 250 ? 50 : 20;
      // Gerçek Griffin beherlerinde çizgiler ağza kadar çıkmaz: tabanın hemen üstünden başlar,
      // tam hacmin altında biter (600 mL → 100–500 mL, 250 mL → 50–200 mL). Tam hacim yalnızca etikette yazar.
      const first = cap >= 500 ? 100 : cap >= 250 ? 50 : 20;
      const top = Math.floor((cap * 0.85) / label) * label;
      const gt = Tex.graduations(top, step, label, this.hPerMl, this.H, this.capacity + ' mL', first, cap);
      const grad = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0003, R + 0.0003, H, 40, 1, true, -0.55, 1.1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: gt, transparent: true, depthWrite: false, roughness: 0.55 }));
      grad.position.y = H / 2; grad.renderOrder = 12;
      this.group.add(grad);
      // kâğıt bant etiket
      if (this.o.label) this.setLabel(this.o.label);

      // sıvı gövdesi (kesme düzlemli)
      this.levelPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
      this.rimPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
      const lh = H - this.y0 - 0.001;
      const lgeo = new THREE.CylinderGeometry(this.Ri, this.Ri, lh, 64, 1, false);
      lgeo.translate(0, this.y0 + lh / 2, 0);
      this.liqMat = P.liquid(0xeef6fb, 0.2);
      this.liqMat.clippingPlanes = [this.levelPlane];
      this.liquid = new THREE.Mesh(lgeo, this.liqMat);
      this.liquid.renderOrder = 4;
      this.group.add(this.liquid);
      // sıvı yüzeyi (dünya uzayında)
      const cgeo = new THREE.CircleGeometry(this.Ri, 64);
      cgeo.rotateX(-Math.PI / 2);
      this.capMat = P.liquid(0xeef6fb, 0.28);
      // taban düzlemi: beher eğikken yüzey elipsi tabanın altına taşmasın
      this.basePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.capMat.clippingPlanes = [this.rimPlane, this.basePlane];
      this.capMat.envMapIntensity = 1.8;
      this.capMat.roughness = 0.02;
      this.cap = new THREE.Mesh(cgeo, this.capMat);
      this.cap.renderOrder = 5;
      this.scene.add(this.cap);
      this.setLiquid(0xeef6fb, 0.2);
    }
    setLabel(text) {
      if (this.labelMesh) { this.group.remove(this.labelMesh); this.labelMesh.material.map.dispose(); }
      const R = this.R, H = this.H;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0006, R + 0.0006, H * 0.2, 32, 1, true, 0.7, 1.15),
        new THREE.MeshStandardMaterial({ map: Tex.tapeLabel(text), roughness: 0.85 }));
      m.position.y = H * 0.18; m.renderOrder = 12;
      this.labelMesh = m;
      this.group.add(m);
    }
    setLiquid(color, opacity) {
      this.liqColor = new THREE.Color(color);
      this.liqOpacity = opacity;
      this._applyLiquid();
    }
    _applyLiquid() {
      this.liqMat.color.copy(this.liqColor);
      this.liqMat.opacity = this.liqOpacity;
      this.capMat.color.copy(this.liqColor).lerp(new THREE.Color(0xffffff), 0.15);
      this.capMat.opacity = Math.min(0.95, this.liqOpacity + 0.08);
    }
    /** Eksen boyunca sıvı yüksekliği (m) */
    axisHeight(vol) { return vol * this.hPerMl; }
    /** Dünya uzayında ağız ucu */
    spoutWorld(target) {
      const r = this.R + this.R * 0.17;
      return this.group.localToWorld(target.set(Math.cos(this.spoutAngle) * r, this.H + 0.002, Math.sin(this.spoutAngle) * r));
    }
    /** Sıvı yüzey yüksekliği (dünya y) */
    surfaceY() { return this._levelY || 0; }
    /** Her karede: kesme düzlemleri ve yüzeyi güncelle. Dökülmesi gereken hacmi (mL) döndürür. */
    update(dt, maxFlow) {
      this.group.updateMatrixWorld(true);
      const axis = _a.set(0, 1, 0).applyQuaternion(this.group.getWorldQuaternion(_q)).normalize();
      const baseW = this.group.getWorldPosition(new THREE.Vector3());
      if (this.contactShadow) this.contactShadow.visible = axis.y > 0.995 && baseW.y < (T.Room.BENCH_Y + 0.01);
      let overflow = 0;
      let hAx = this.axisHeight(this.volume);
      const cosT = Math.max(0.05, axis.y);
      let centerY = baseW.y + axis.y * (this.y0 + hAx);
      // taşma kontrolü (ağız ucu)
      if (this.volume > 0.5 && axis.y < 0.985) {
        const sp = this.spoutWorld(new THREE.Vector3());
        // düzlem ağız ucunu aşıyorsa sıvı akar
        const lowY = sp.y - 0.0008;
        if (centerY > lowY) {
          const hMax = (lowY - baseW.y) / axis.y - this.y0;
          const vMax = Math.max(0, hMax / this.hPerMl);
          overflow = Math.min(this.volume - vMax, (maxFlow || 90) * dt);
          overflow = Math.max(0, overflow);
          this.volume -= overflow;
          hAx = this.axisHeight(this.volume);
          centerY = baseW.y + axis.y * (this.y0 + hAx);
        }
      }
      this._levelY = centerY;
      this.levelPlane.constant = centerY;
      // kenar düzlemi: eksen yönünde ağız seviyesinin altında kal
      const rimPt = baseW.clone().addScaledVector(axis, this.H + 0.0005);
      this.rimPlane.normal.copy(axis).negate();
      this.rimPlane.constant = axis.dot(rimPt);
      const basePt = baseW.clone().addScaledVector(axis, this.y0);
      this.basePlane.normal.copy(axis);
      this.basePlane.constant = -axis.dot(basePt);
      // yüzey elipsi
      const vis = this.volume > 0.6;
      this.cap.visible = vis;
      this.liquid.visible = vis;
      if (vis) {
        const c = baseW.clone().addScaledVector(axis, this.y0 + hAx);
        // eksen yatay kaymasını düzlem yüksekliğine göre ayarla (c zaten düzlemde)
        this.cap.position.copy(c);
        const hx = axis.x, hz = axis.z;
        const hl = Math.hypot(hx, hz);
        this.cap.rotation.set(0, hl > 1e-4 ? Math.atan2(hx, hz) : 0, 0);
        this.cap.scale.set(1, 1, 1 / cosT);
        // dalgalanma
        if (this._wobble) {
          this._wobble = Math.max(0, this._wobble - dt * 0.6);
          const t = performance.now() * 0.012;
          this.cap.position.y += Math.sin(t) * 0.0006 * this._wobble;
        }
      }
      return overflow;
    }
    wobble(a) { this._wobble = Math.max(this._wobble || 0, a); }
    dispose() { this.scene.remove(this.cap); }
  }

  /* ---------- Dijital termometre (okul laboratuvarı tipi: el ölçer + kablolu paslanmaz çelik prob) ---------- */

  /** 7 segmentli rakam çizer. on: yanan segment rengi, off: sönük (hayalet) segment rengi */
  const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', '': '' };
  function drawDigit(x, ch, x0, y0, w, h, t, on, off) {
    const g = t * 0.18;
    const hseg = (cx, cy, len) => { const l = len / 2, k = t / 2; x.moveTo(cx - l, cy); x.lineTo(cx - l + k, cy - k); x.lineTo(cx + l - k, cy - k); x.lineTo(cx + l, cy); x.lineTo(cx + l - k, cy + k); x.lineTo(cx - l + k, cy + k); x.closePath(); };
    const vseg = (cx, cy, len) => { const l = len / 2, k = t / 2; x.moveTo(cx, cy - l); x.lineTo(cx + k, cy - l + k); x.lineTo(cx + k, cy + l - k); x.lineTo(cx, cy + l); x.lineTo(cx - k, cy + l - k); x.lineTo(cx - k, cy - l + k); x.closePath(); };
    const segs = {
      a: () => hseg(x0 + w / 2, y0, w - 2 * g), g: () => hseg(x0 + w / 2, y0 + h / 2, w - 2 * g), d: () => hseg(x0 + w / 2, y0 + h, w - 2 * g),
      f: () => vseg(x0, y0 + h / 4, h / 2 - 2 * g), b: () => vseg(x0 + w, y0 + h / 4, h / 2 - 2 * g),
      e: () => vseg(x0, y0 + 3 * h / 4, h / 2 - 2 * g), c: () => vseg(x0 + w, y0 + 3 * h / 4, h / 2 - 2 * g)
    };
    const lit = SEG[ch] || '';
    for (const k of 'abcdefg') { x.beginPath(); segs[k](); x.fillStyle = lit.includes(k) ? on : off; x.fill(); }
  }

  /** Yansıtmalı gri-yeşil LCD: siyah segment rakamlar, küçük °C ve sönük gösterge yazıları */
  function makeLcdTex() {
    const W = 512, H = 282;
    const c = Tex.canvas(W, H), x = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const ON = '#1c221d', OFF = 'rgba(30,45,32,0.075)';
    tex.draw = (val) => {
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#c3cdb9'); g.addColorStop(1, '#a9b5a0');
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      // camın iç gölgesi
      const sh = x.createLinearGradient(0, 0, 0, 26); sh.addColorStop(0, 'rgba(0,0,0,0.22)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = sh; x.fillRect(0, 0, W, 26);
      // sönük gösterge yazıları
      x.font = '700 24px Arial, sans-serif'; x.textBaseline = 'middle';
      x.fillStyle = OFF.replace('0.075', '0.12'); x.textAlign = 'left';
      x.fillText('HOLD', 30, 36); x.fillText('MAX', 112, 36); x.fillText('MIN', 178, 36);
      // pil simgesi (yanık)
      x.strokeStyle = ON; x.lineWidth = 3; x.strokeRect(W - 74, 26, 38, 20); x.fillStyle = ON; x.fillRect(W - 36, 31, 4, 10); x.fillRect(W - 70, 30, 26, 12);
      // rakamlar: 4 hane, sondan bir önceki hanede ondalık nokta
      const s = String(val), neg = s[0] === '-';
      const digits = s.replace('-', '').replace('.', '').split('');
      if (neg) digits.unshift('-');
      while (digits.length < 4) digits.unshift('');
      const dw = 66, dh = 150, t = 17, pitch = 94, y0 = 78, xs = 34;
      x.setTransform(1, 0, -0.09, 1, 0.09 * (y0 + dh / 2), 0); // hafif italik, gerçek LCD gibi
      digits.slice(-4).forEach((ch, i) => drawDigit(x, ch, xs + i * pitch, y0, dw, dh, t, ON, OFF));
      x.fillStyle = ON; x.beginPath(); x.arc(xs + 2 * pitch + dw + 14, y0 + dh - 4, 11, 0, Math.PI * 2); x.fill();
      x.setTransform(1, 0, 0, 1, 0, 0);
      // °C
      x.fillStyle = ON; x.font = '700 46px Arial, sans-serif'; x.textAlign = 'left';
      x.fillText('°C', 418, 112);
      tex.needsUpdate = true;
    };
    tex.draw('22.0');
    return tex;
  }

  /** Ön panel: koyu plastik yüzey, LCD penceresi, düğme etiketleri */
  function makeFaceTex() {
    const W = 368, H = 640;
    const c = Tex.canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#30363d'; x.fillRect(0, 0, W, H);
    const gl = x.createLinearGradient(0, 0, W, H); gl.addColorStop(0, 'rgba(255,255,255,0.06)'); gl.addColorStop(1, 'rgba(0,0,0,0.08)');
    x.fillStyle = gl; x.fillRect(0, 0, W, H);
    // LCD penceresi çerçevesi
    x.fillStyle = '#0d1013'; x.beginPath(); x.roundRect(12, 34, W - 24, 204, 14); x.fill();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(235,240,245,0.85)'; x.font = '700 21px Arial, sans-serif';
    x.fillText('DİJİTAL TERMOMETRE', W / 2, 272);
    x.fillStyle = 'rgba(235,240,245,0.55)'; x.font = '600 15px Arial, sans-serif';
    x.fillText('−50 … +200 °C   ·   0,1 °C', W / 2, 300);
    // düğme yuvaları ve etiketleri
    [80, 184, 288].forEach((bx, i) => {
      x.fillStyle = '#1b1f24'; x.beginPath(); x.arc(bx, 384, 42, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(235,240,245,0.8)'; x.font = '700 19px Arial, sans-serif';
      x.fillText(['ON/OFF', '°C/°F', 'HOLD'][i], bx, 452);
    });
    // prob soketi bilgisi
    x.fillStyle = 'rgba(235,240,245,0.4)'; x.font = '600 14px Arial, sans-serif';
    x.fillText('PROBE ▲', W / 2, 590);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return tex;
  }

  /**
   * Dijital termometre: ölçer gövdesi beherin solunda tezgâhta, hafif geriye yaslanmış durur;
   * paslanmaz çelik prob beherin kenarına klipsle tutturulur, ikisini siyah kablo bağlar.
   */
  class Thermometer {
    /** probeTip: prob ucunun dünya konumu; rim: {y: ağız yüksekliği, x: sol duvarın x'i}; meterAt: ölçerin tezgâhtaki konumu */
    constructor(scene, probeTip, rim, meterAt) {
      const M = P.M;
      this.group = new THREE.Group();
      this.temp = 22.0;
      this.shown = '';
      // kenar klipsi
      const clipMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.5, metalness: 0.2 });
      const cy = rim.y - 0.006;
      this.group.add(P.box(0.0016, 0.014, 0.011, clipMat, [rim.x - 0.0022, cy, probeTip.z]));
      this.group.add(P.box(0.0016, 0.014, 0.011, clipMat, [rim.x + 0.0026, cy, probeTip.z]));
      this.group.add(P.box(0.0064, 0.0018, 0.011, clipMat, [rim.x + 0.0002, rim.y + 0.0012, probeTip.z]));
      const armLen = Math.abs(probeTip.x - rim.x);
      this.group.add(P.box(armLen, 0.004, 0.006, clipMat, [(probeTip.x + rim.x) / 2 + 0.0015, cy, probeTip.z]));
      this.group.add(P.cyl(0.0042, 0.0042, 0.012, clipMat, [probeTip.x, cy, probeTip.z], 16));
      // paslanmaz çelik prob + sivri uç + siyah sap
      const rodTop = rim.y + 0.012;
      const rodLen = rodTop - probeTip.y;
      this.group.add(P.cyl(0.0018, 0.0018, rodLen, M.steel, [probeTip.x, probeTip.y + rodLen / 2, probeTip.z], 16));
      this.group.add(P.cyl(0.0018, 0.0004, 0.004, M.steel, [probeTip.x, probeTip.y - 0.002, probeTip.z], 16).rotateX(Math.PI));
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x1a1d21, roughness: 0.55 });
      this.group.add(P.cyl(0.0034, 0.0046, 0.006, handleMat, [probeTip.x, rodTop + 0.003, probeTip.z], 20));
      this.group.add(P.cyl(0.0046, 0.0046, 0.022, handleMat, [probeTip.x, rodTop + 0.017, probeTip.z], 20));
      this.group.add(P.cyl(0.0046, 0.0024, 0.007, handleMat, [probeTip.x, rodTop + 0.0315, probeTip.z], 20));
      const handleTop = new THREE.Vector3(probeTip.x, rodTop + 0.035, probeTip.z);

      // ---- el tipi ölçer ----
      const mw = 0.052, mh = 0.088, md = 0.02, tilt = 0.27;
      const meter = new THREE.Group();
      meter.position.copy(meterAt);
      meter.rotation.y = meterAt.yaw || 0.2;
      // ölçer, beherin ölçeğine göre biraz küçültüldü (taban noktası sabit kalır)
      meter.scale.setScalar(meterAt.scale || 0.8);
      const tiltG = new THREE.Group();
      tiltG.rotation.x = -tilt; // arka alt kenarı üzerinde geriye yaslanır
      meter.add(tiltG);
      const shellMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e7, roughness: 0.5 });
      // roundBox kenar yumuşatması dış ölçüye ~6 mm ekler
      const shell = P.roundBox(mw - 0.012, mh, md - 0.0115, 0.002, shellMat);
      // roundBox dikeyde ortalıdır: tabanı y=0'a oturt (önceden yarısı tezgâhın içindeydi,
      // ön panelin üst yarısının arkası boş kalıyordu)
      shell.position.set(0, mh / 2, md / 2);
      tiltG.add(shell);
      const faceW = mw - 0.006, faceH = mh - 0.008, fz = md + 0.0004;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(faceW, faceH), new THREE.MeshStandardMaterial({ map: makeFaceTex(), roughness: 0.6 }));
      face.position.set(0, mh / 2, fz);
      tiltG.add(face);
      // LCD (yansıtmalı, hafif aydınlatmalı) ve koruyucu camı
      this.lcd = makeLcdTex();
      const lcdW = 0.0385, lcdH = 0.0212, lcdY = mh / 2 + faceH / 2 - 0.0035 - 0.0128;
      const lcd = new THREE.Mesh(new THREE.PlaneGeometry(lcdW, lcdH),
        new THREE.MeshStandardMaterial({ map: this.lcd, emissive: 0xffffff, emissiveMap: this.lcd, emissiveIntensity: 0.32, roughness: 0.4 }));
      lcd.position.set(0, lcdY, fz + 0.0003);
      tiltG.add(lcd);
      const cover = new THREE.Mesh(new THREE.PlaneGeometry(lcdW + 0.002, lcdH + 0.002), P.glass({ env: 1.4, opacity: 0.05, edge: 0.04 }));
      cover.position.set(0, lcdY, fz + 0.0009); cover.renderOrder = 12;
      tiltG.add(cover);
      // düğmeler
      const btnY = mh / 2 + faceH / 2 - 0.048;
      [[-0.013, 0xb23a32], [0, 0x6d757d], [0.013, 0x6d757d]].forEach(([bx, col]) => {
        const b = P.cyl(0.0037, 0.0041, 0.0022, new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 }), [0, 0, 0], 24);
        b.rotation.x = Math.PI / 2; b.position.set(bx, btnY, fz + 0.0011);
        tiltG.add(b);
      });
      // üstte prob soketi
      const sockX = 0, sockTop = mh + 0.006;
      tiltG.add(P.cyl(0.0042, 0.0042, 0.006, M.blackPlastic, [sockX, mh + 0.003, md / 2], 18));
      tiltG.add(P.cyl(0.0024, 0.0034, 0.008, handleMat, [sockX, mh + 0.009, md / 2], 18));
      // sırt: koyu pil kapağı (gövdenin arka yüzü z≈0'da)
      const backMat = new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.55 });
      tiltG.add(P.box(mw - 0.018, mh * 0.42, 0.0012, backMat, [0, mh * 0.3, -0.0009], { cast: false }));
      [0.62, 0.68, 0.74].forEach((k) => tiltG.add(P.box(mw * 0.4, 0.0012, 0.001, M.blackPlastic, [0, mh * k, -0.0007], { cast: false })));
      // açılır destek ayağı: sırttaki menteşeden tezgâha inen siyah plaka
      const hingeY = mh * 0.62, hingeZ = -0.0022;
      tiltG.add(P.box(mw * 0.7, 0.006, 0.003, M.blackPlastic, [0, hingeY, -0.0012], { cast: false })); // menteşe yuvası
      const hinge = P.cyl(0.0021, 0.0021, mw * 0.66, M.blackPlastic, [0, hingeY, hingeZ], 12);
      hinge.rotation.z = Math.PI / 2; tiltG.add(hinge);
      const back = new THREE.Vector3(0, hingeY * Math.cos(tilt) + hingeZ * Math.sin(tilt), -hingeY * Math.sin(tilt) + hingeZ * Math.cos(tilt));
      const foot = new THREE.Vector3(0, 0.0016, back.z - 0.03);
      const leg = P.box(mw * 0.62, back.distanceTo(foot), 0.0028, M.blackPlastic, [0, 0, 0]);
      leg.position.copy(back).add(foot).multiplyScalar(0.5);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), back.clone().sub(foot).normalize());
      meter.add(leg);
      // ayağın ucunda kauçuk şerit
      const pad = P.box(mw * 0.6, 0.0022, 0.005, new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 }), [0, 0.0011, foot.z + 0.0012], { cast: false });
      meter.add(pad);
      // kauçuk ayaklar
      [-0.018, 0.018].forEach((fx) => meter.add(P.box(0.008, 0.002, 0.005, M.blackPlastic, [fx, 0.001, md * 0.25])));
      this.group.add(meter);
      this.meter = meter;

      // ---- kablo: prob sapından ölçerin soketine yumuşak bir kavisle ----
      meter.updateMatrixWorld(true);
      const sock = tiltG.localToWorld(new THREE.Vector3(sockX, sockTop + 0.007, md / 2));
      const sockUp = tiltG.localToWorld(new THREE.Vector3(sockX, sockTop + 0.03, md / 2));
      const mid = handleTop.clone().lerp(sock, 0.5);
      mid.y = (handleTop.y + sock.y) / 2 + 0.004; mid.z += 0.014; // kablo hafifçe sarkar
      sockUp.y = sock.y + 0.008;
      const curve = new THREE.CatmullRomCurve3([
        handleTop.clone(), handleTop.clone().add(new THREE.Vector3(-0.006, 0.009, 0.004)), mid, sockUp, sock
      ], false, 'centripetal');
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.0015, 10, false), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.45 }));
      cable.castShadow = true;
      this.group.add(cable);

      scene.add(this.group);
      this.set(22.0);
    }
    set(t) {
      this.temp = t;
      const s = t.toFixed(1);
      if (s !== this.shown) { this.shown = s; this.lcd.draw(s); }
    }
  }

  T.Beaker = Beaker;
  T.Thermometer = Thermometer;
})(window.TUY);
