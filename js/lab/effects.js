/* Tepkime görsel efektleri: gaz kabarcıkları, köpük, çökelti, mermer parçaları, duman, döküm akışı. */
(function (T) {
  'use strict';
  const P = T.Props, U = T.U, Tex = T.Tex;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  const ID_Q = new THREE.Quaternion();

  /* ---------------- Gaz kabarcıkları ---------------- */
  class Bubbles {
    constructor(beaker, max) {
      this.b = beaker;
      this.max = max || 700;
      const mat = P.glass({ color: 0x2b3a40, opacity: 0.32, env: 2.6 });
      mat.side = THREE.FrontSide;
      this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), mat, this.max);
      this.mesh.renderOrder = 6;
      this.mesh.frustumCulled = false;
      this.mesh.count = 0;
      beaker.group.add(this.mesh);
      this.items = [];
      this.rate = 0;          // kabarcık/saniye
      this.acc = 0;
      this.sources = null;    // [{x,y,z,r}] katı yüzeyleri
      this.mode = 'volume';
      this.onPop = null;
    }
    spawn() {
      if (this.items.length >= this.max) return;
      const b = this.b;
      const top = b.y0 + b.axisHeight(b.volume);
      if (top < b.y0 + 0.004) return;
      let x, y, z;
      if (this.mode === 'solid' && this.sources && this.sources.length) {
        const s = this.sources[(Math.random() * this.sources.length) | 0];
        const a = Math.random() * Math.PI * 2;
        x = s.x + Math.cos(a) * s.r * 0.8; z = s.z + Math.sin(a) * s.r * 0.8; y = s.y + s.r * (0.2 + Math.random() * 0.6);
      } else if (this.mode === 'mix' && this.mixPoint) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * b.Ri * 0.55;
        x = this.mixPoint.x + Math.cos(a) * rr; z = this.mixPoint.z + Math.sin(a) * rr;
        y = b.y0 + 0.002 + Math.random() * (top - b.y0) * 0.9;
      } else {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * b.Ri * 0.88;
        x = Math.cos(a) * rr; z = Math.sin(a) * rr;
        y = b.y0 + 0.0015 + Math.random() * Math.min(0.012, (top - b.y0) * 0.35);
      }
      // taban ve duvar çekirdeklenmesi daha gerçekçi: bazen duvara yapışık başlar
      if (Math.random() < 0.15) {
        const a = Math.random() * Math.PI * 2;
        x = Math.cos(a) * b.Ri * 0.95; z = Math.sin(a) * b.Ri * 0.95;
      }
      this.items.push({
        x, y, z, r: U.rand(0.00045, 0.0016) * (this.sizeMul || 1), v: U.rand(0.035, 0.075),
        ph: Math.random() * 6.28, wob: U.rand(0.0004, 0.0012), stick: Math.random() < 0.15 ? U.rand(0.2, 1.2) : 0
      });
    }
    update(dt) {
      const b = this.b;
      this.acc += this.rate * dt;
      while (this.acc >= 1) { this.spawn(); this.acc -= 1; }
      const top = b.y0 + b.axisHeight(b.volume);
      let n = 0;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (it.stick > 0) { it.stick -= dt; it.r += dt * 0.0006; }
        else {
          it.v += dt * 0.02;
          it.y += it.v * dt;
          it.r *= 1 + dt * 0.25;
          it.ph += dt * 9;
        }
        const wx = Math.sin(it.ph) * it.wob, wz = Math.cos(it.ph * 0.8) * it.wob;
        if (it.y + it.r > top) {
          this.items.splice(i, 1);
          if (this.onPop) this.onPop(it);
          continue;
        }
        // duvar içinde kal
        const rr = Math.hypot(it.x + wx, it.z + wz), lim = b.Ri - it.r;
        let px = it.x + wx, pz = it.z + wz;
        if (rr > lim) { px *= lim / rr; pz *= lim / rr; }
        _p.set(px, it.y, pz);
        _s.setScalar(it.r);
        _s.y *= 0.92;
        _m.compose(_p, ID_Q, _s);
        if (n < this.max) this.mesh.setMatrixAt(n++, _m);
      }
      this.mesh.count = n;
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    clear() { this.items.length = 0; this.mesh.count = 0; this.rate = 0; }
  }

  /* ---------------- Köpük ---------------- */
  class Foam {
    constructor(beaker) {
      this.b = beaker;
      const tex = Tex.foam();
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      this.mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.85, transparent: true, opacity: 0, depthWrite: false });
      const g = new THREE.CylinderGeometry(beaker.Ri * 0.995, beaker.Ri * 0.995, 1, 48, 1, false);
      g.translate(0, 0.5, 0);
      this.mesh = new THREE.Mesh(g, this.mat);
      this.mesh.renderOrder = 7;
      this.mesh.visible = false;
      beaker.group.add(this.mesh);
      this.level = 0;   // 0..1
      this.height = 0;  // m
      this.target = 0;
      this.maxH = 0.003;
    }
    setColor(c) { this.mat.color.set(c); }
    update(dt) {
      this.level += (this.target - this.level) * (1 - Math.exp(-dt * 1.4));
      const b = this.b;
      const top = b.y0 + b.axisHeight(b.volume);
      const h = Math.max(0.0004, this.level * this.maxH);
      this.mesh.visible = this.level > 0.02 && b.volume > 2;
      this.mesh.position.y = top - h * 0.35;
      this.mesh.scale.y = h;
      this.mat.opacity = U.clamp(this.level * 1.1, 0, 0.92);
      if (this.mat.map) this.mat.map.offset.x += dt * 0.01;
    }
    clear() { this.level = 0; this.target = 0; this.mesh.visible = false; }
  }

  /* ---------------- Çökelti (bulut + dibe çökme + tortu) ---------------- */
  class Precipitate {
    constructor(beaker, max) {
      this.b = beaker;
      this.max = max || 1400;
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0, transparent: true, opacity: 0.95 });
      this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), this.mat, this.max);
      this.mesh.renderOrder = 3;
      this.mesh.frustumCulled = false;
      this.mesh.count = 0;
      beaker.group.add(this.mesh);
      // tortu tümseği
      const Ri = beaker.Ri * 0.985;
      const prof = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const r = Ri * (1 - t);
        prof.push(new THREE.Vector2(r, 0.25 + 0.75 * Math.pow(t, 0.55) * (1 - 0.15 * t)));
      }
      prof.unshift(new THREE.Vector2(Ri, 0));
      const sg = new THREE.LatheGeometry(prof, 64);
      // pürüzlü yüzey
      const pos = sg.attributes.position;
      const r = U.rng(9);
      for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * (0.85 + r() * 0.3));
      sg.computeVertexNormals();
      this.sedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
      this.sediment = new THREE.Mesh(sg, this.sedMat);
      this.sediment.position.y = beaker.y0;
      this.sediment.scale.y = 0.0001;
      this.sediment.visible = false;
      this.sediment.renderOrder = 2;
      beaker.group.add(this.sediment);
      this.items = [];
      this.settled = 0;   // 0..1 tortu miktarı
      this.amount = 1;
      this.turbidity = 0; // bulanıklık 0..1
      this.style = 'fine';
    }
    setup(color, amount, style) {
      this.color = new THREE.Color(color);
      this.mat.color.copy(this.color);
      this.sedMat.color.copy(this.color).multiplyScalar(0.92);
      this.amount = amount; this.style = style || 'fine';
      this.mat.opacity = style === 'gel' ? 0.7 : 0.95;
      this.mat.roughness = style === 'gel' ? 0.3 : 0.8;
    }
    /** Karışma bölgesinde parçacık oluştur */
    emit(n, center, spread) {
      const b = this.b;
      const top = b.y0 + b.axisHeight(b.volume);
      for (let k = 0; k < n && this.items.length < this.max; k++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (spread || b.Ri * 0.6);
        const sMul = this.style === 'curdy' ? 1.8 : this.style === 'gel' ? 2.3 : 1;
        this.items.push({
          x: (center ? center.x : 0) + Math.cos(a) * rr, z: (center ? center.z : 0) + Math.sin(a) * rr,
          y: top - Math.random() * Math.max(0.003, (top - b.y0) * 0.7),
          r: U.rand(0.00025, 0.0007) * sMul, vs: U.rand(0.002, 0.007) * (this.style === 'fine' ? 0.8 : 1.3),
          sw: U.rand(0.6, 1.6), ph: Math.random() * 6.28, rot: Math.random() * 6.28, delay: U.rand(0.6, 2.2)
        });
      }
    }
    update(dt, swirl) {
      const b = this.b;
      const top = b.y0 + b.axisHeight(b.volume);
      const floor = b.y0 + this.sediment.scale.y * 0.6;
      let n = 0;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        // dönme (karıştırma) + yavaş çökme
        const s = (swirl || 0.15) * it.sw;
        const ang = s * dt * 3;
        const c = Math.cos(ang), si = Math.sin(ang);
        const nx = it.x * c - it.z * si, nz = it.x * si + it.z * c;
        it.x = nx; it.z = nz;
        it.ph += dt;
        if (it.delay > 0) { it.delay -= dt; it.y += Math.sin(it.ph * 2) * 0.0006 * dt * 10; }
        else it.y -= it.vs * dt;
        const rr = Math.hypot(it.x, it.z), lim = b.Ri * 0.95;
        if (rr > lim) { it.x *= lim / rr; it.z *= lim / rr; }
        if (it.y > top - 0.001) it.y = top - 0.001;
        if (it.y <= floor + it.r) {
          this.items.splice(i, 1);
          this.settled = Math.min(1, this.settled + 1 / (this.max * 0.55));
          continue;
        }
        _p.set(it.x, it.y, it.z);
        _q.setFromAxisAngle(_s.set(0.3, 1, 0.2).normalize(), it.rot + it.ph * 0.3);
        _s.setScalar(it.r);
        _m.compose(_p, _q, _s);
        if (n < this.max) this.mesh.setMatrixAt(n++, _m);
      }
      this.mesh.count = n;
      this.mesh.instanceMatrix.needsUpdate = true;
      // tortu büyümesi
      const h = 0.0005 + this.settled * 0.0065 * this.amount;
      this.sediment.visible = this.settled > 0.002;
      this.sediment.scale.y += (h - this.sediment.scale.y) * (1 - Math.exp(-dt * 2));
      // bulanıklık = havada asılı parçacık oranı
      const target = U.clamp(this.items.length / (this.max * 0.4), 0, 1);
      this.turbidity += (target - this.turbidity) * (1 - Math.exp(-dt * 1.5));
    }
    clear() {
      this.items.length = 0; this.mesh.count = 0; this.settled = 0; this.turbidity = 0;
      this.sediment.scale.y = 0.0001; this.sediment.visible = false;
    }
  }

  /* ---------------- Mermer parçaları (CaCO3 katısı) ---------------- */
  /* Aynı konumdaki köşeleri birlikte oynatır; böylece yüzeyler kopmadan düzensizleşir. */
  function jitterShared(geo, fn) {
    const pos = geo.attributes.position, map = new Map();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const key = Math.round(x * 1000) + ',' + Math.round(y * 1000) + ',' + Math.round(z * 1000);
      if (!map.has(key)) map.set(key, fn(x, y, z));
      const p = map.get(key);
      pos.setXYZ(k, p[0], p[1], p[2]);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }
  let _marbleTex = null;

  /* ---------------- Katı tepkimeye giren parçalar ----------------
     kind 'marble': köşeli, kırık yüzeyli, damarlı beyaz mermer parçaları (CaCO₃) */
  class Chips {
    constructor(beaker, solid, n) {
      this.b = beaker;
      this.group = new THREE.Group();
      beaker.group.add(this.group);
      this.kind = 'marble';
      const r = U.rng(23);
      this.pieces = [];
      const cnt = n || 11;
      const placed = [];
      const place = (s) => {
        // üst üste binmeyen rastgele konum (birkaç deneme)
        let best = null;
        for (let t = 0; t < 30; t++) {
          const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * (beaker.Ri - s * 1.6);
          const c = [Math.cos(a) * rr, Math.sin(a) * rr];
          const d = placed.reduce((m, p) => Math.min(m, Math.hypot(p[0] - c[0], p[1] - c[1]) - (p[2] + s) * 1.25), 1);
          if (!best || d > best.d) best = { c, d };
          if (d > 0) break;
        }
        placed.push([best.c[0], best.c[1], s]);
        return best.c;
      };
      if (this.kind === 'marble') {
        if (!_marbleTex) _marbleTex = [Tex.marble(31), Tex.marble(77)];
        for (let i = 0; i < cnt; i++) {
          const sx = 0.85 + r() * 0.45, sy = 0.6 + r() * 0.3, sz = 0.7 + r() * 0.4;
          // kırık taş: birkaç düzlemle "kesilmiş" küre → keskin, düz kırık yüzleri
          const planes = Array.from({ length: 5 }, () => { const n = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(); return { n, d: 0.55 + r() * 0.3 }; });
          const geo = jitterShared(new THREE.IcosahedronGeometry(1, 1), (x, y, z) => {
            const v = new THREE.Vector3(x, y, z).multiplyScalar(0.88 + r() * 0.22);
            planes.forEach((p) => { const k = v.dot(p.n); if (k > p.d) v.addScaledVector(p.n, p.d - k); });
            return [v.x * sx, v.y * sy, v.z * sz];
          });
          const tone = 0.8 + r() * 0.12;
          const mat = new THREE.MeshStandardMaterial({ map: _marbleTex[i % 2], color: new THREE.Color(tone, tone * (0.985 + r() * 0.015), tone * (0.95 + r() * 0.04)), roughness: 0.5 + r() * 0.15, metalness: 0, flatShading: true });
          const m = new THREE.Mesh(geo, mat);
          const s = 0.0048 + r() * 0.004;
          const c = place(s);
          m.position.set(c[0], beaker.y0 + s * sy * 0.8, c[1]);
          m.rotation.set((r() - 0.5) * 0.5, r() * 6.28, (r() - 0.5) * 0.5);
          m.scale.setScalar(s);
          m.castShadow = true; m.receiveShadow = true;
          m.userData.s0 = s; m.userData.lift = sy * 0.8;
          this.group.add(m);
          this.pieces.push(m);
        }
      }
      this.frac = 1;
    }
    sources() {
      return this.pieces.map((p) => ({ x: p.position.x, y: p.position.y - p.scale.x * 0.3, z: p.position.z, r: p.scale.x }));
    }
    setFraction(f) {
      this.frac = f;
      this.pieces.forEach((p) => {
        p.scale.setScalar(p.userData.s0 * Math.cbrt(Math.max(0.05, f)));
        p.position.y = this.b.y0 + p.scale.x * p.userData.lift;
        p.visible = f > 0.06;
      });
    }
    dispose() { this.b.group.remove(this.group); }
  }

  /* ---------------- Beyaz duman ---------------- */
  class Smoke {
    constructor(scene) {
      this.scene = scene;
      this.tex = Tex.soft();
      this.items = [];
      this.rate = 0; this.acc = 0;
      this.origin = new THREE.Vector3();
      this.radius = 0.03;
    }
    update(dt) {
      this.acc += this.rate * dt;
      while (this.acc >= 1 && this.items.length < 160) {
        this.acc -= 1;
        const m = new THREE.SpriteMaterial({ map: this.tex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
        const s = new THREE.Sprite(m);
        const a = Math.random() * Math.PI * 2, rr = Math.random() * this.radius;
        s.position.set(this.origin.x + Math.cos(a) * rr, this.origin.y + U.rand(-0.01, 0.005), this.origin.z + Math.sin(a) * rr);
        s.userData = { life: 0, max: U.rand(3.5, 6), v: U.rand(0.02, 0.05), size: U.rand(0.02, 0.04), drift: U.rand(-0.008, 0.008), rot: U.rand(-0.4, 0.4) };
        s.renderOrder = 20;
        this.scene.add(s);
        this.items.push(s);
      }
      for (let i = this.items.length - 1; i >= 0; i--) {
        const s = this.items[i], u = s.userData;
        u.life += dt;
        const t = u.life / u.max;
        if (t >= 1) { this.scene.remove(s); s.material.dispose(); this.items.splice(i, 1); continue; }
        s.position.y += u.v * dt;
        s.position.x += u.drift * dt;
        const sz = u.size * (1 + t * 3.5);
        s.scale.set(sz, sz, 1);
        s.material.rotation += u.rot * dt;
        s.material.opacity = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.42 * (1 - t * 0.4);
      }
    }
    clear() { this.items.forEach((s) => { this.scene.remove(s); s.material.dispose(); }); this.items.length = 0; this.rate = 0; }
  }

  /* ---------------- Döküm akışı ---------------- */
  class Stream {
    constructor(scene) {
      this.scene = scene;
      this.mat = new THREE.MeshPhysicalMaterial({ color: 0xeef6fb, roughness: 0.02, transparent: true, opacity: 0.5, envMapIntensity: 2, clearcoat: 1, depthWrite: false });
      this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
      this.mesh.renderOrder = 8;
      this.mesh.visible = false;
      scene.add(this.mesh);
      // sıçrama damlaları
      this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), this.mat, 60);
      this.drops.count = 0; this.drops.frustumCulled = false; this.drops.renderOrder = 8;
      scene.add(this.drops);
      this.dropItems = [];
      this.time = 0;
    }
    setColor(c, o) { this.mat.color.set(c); this.mat.opacity = Math.max(0.35, Math.min(0.8, (o || 0.2) + 0.32)); }
    show(from, to, flow, dt) {
      this.time += dt;
      if (flow <= 0.001) { this.mesh.visible = false; return; }
      // balistik yörünge: ağızdan küçük yatay hızla çıkar, yerçekimiyle düşer
      const drop = Math.max(0.004, from.y - to.y);
      const tFall = Math.sqrt(2 * drop / 9.8);
      const vx = (to.x - from.x) / tFall, vz = (to.z - from.z) / tFall;
      const pts = [];
      const N = 14;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * tFall;
        pts.push(new THREE.Vector3(from.x + vx * t, from.y - 4.9 * t * t, from.z + vz * t));
      }
      const c = new THREE.CatmullRomCurve3(pts);
      const r = U.clamp(0.0008 + flow * 0.00006, 0.0008, 0.0032);
      const seg = 28, rad = 10;
      const g = new THREE.TubeGeometry(c, seg, r, rad, false);
      // akış hızlandıkça incelir (süreklilik), hafif dalgalanma
      const pos = g.attributes.position;
      const ctr = new THREE.Vector3(), p = new THREE.Vector3();
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        c.getPointAt(u, ctr);
        const f = (1 / Math.sqrt(1 + 6 * u)) * (1 + Math.sin(u * 40 - this.time * 35) * 0.08);
        for (let j = 0; j <= rad; j++) {
          const idx = i * (rad + 1) + j;
          p.fromBufferAttribute(pos, idx).sub(ctr).multiplyScalar(f).add(ctr);
          pos.setXYZ(idx, p.x, p.y, p.z);
        }
      }
      g.computeVertexNormals();
      this.mesh.geometry.dispose();
      this.mesh.geometry = g;
      this.mesh.visible = true;
      // damlalar
      if (Math.random() < flow * 0.02) {
        for (let k = 0; k < 2; k++) this.dropItems.push({ p: to.clone(), v: new THREE.Vector3(U.rand(-0.15, 0.15), U.rand(0.12, 0.3), U.rand(-0.15, 0.15)), life: 0, r: U.rand(0.0005, 0.0011), y0: to.y });
      }
    }
    update(dt) {
      let n = 0;
      for (let i = this.dropItems.length - 1; i >= 0; i--) {
        const d = this.dropItems[i];
        d.life += dt; d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt);
        if (d.p.y < d.y0 || d.life > 0.6) { this.dropItems.splice(i, 1); continue; }
        _m.compose(d.p, ID_Q, _s.setScalar(d.r));
        if (n < 60) this.drops.setMatrixAt(n++, _m);
      }
      this.drops.count = n;
      this.drops.instanceMatrix.needsUpdate = true;
    }
    hide() { this.mesh.visible = false; }
  }

  T.FX = { Bubbles, Foam, Precipitate, Chips, Smoke, Stream };
})(window.TUY);
