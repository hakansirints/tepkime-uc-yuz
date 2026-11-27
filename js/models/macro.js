/* Makroskobik mini sahne: aynı deneyin kabı (başlangıç ya da sonuç durumu), vurgulanabilir bölgelerle. */
(function (T) {
  'use strict';
  const U = T.U, P = T.Props, FX = T.FX, Mol = T.Mol;

  const KEY_TEXT = {
    fixed: 'Sabit kaptaki çözelti', added: 'Eklenen çözelti', fixedSolid: 'Katı parçalar',
    gas: 'Gaz kabarcıkları', solid: 'Dipteki katı (çökelti)', solution: 'Karışımdaki çözelti', heat: 'Sıcaklık artışı', smoke: 'Beyaz duman'
  };

  class MacroView {
    /** panel: Viewer paneli (near küçük olmalı), r: tepkime, state: 'before'|'after' */
    constructor(panel, r, state) {
      this.panel = panel; this.r = r;
      this.root = new THREE.Group();
      panel.root.add(this.root);
      // tezgâh
      const bench = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 64), new THREE.MeshStandardMaterial({ map: T.Tex.epoxy(), roughness: 0.45 }));
      bench.position.y = -0.005; bench.userData.noFit = true; bench.userData.noPick = true;
      this.root.add(bench);
      this.state = null;
      this.items = {};
      this.hlRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 10, 80), new THREE.MeshBasicMaterial({ color: 0x0a84ff, transparent: true, opacity: 0.95, depthTest: false }));
      this.hlRing.renderOrder = 60; this.hlRing.visible = false; this.hlRing.userData.noFit = true; this.hlRing.userData.noPick = true;
      this.root.add(this.hlRing);
      this.hlLabel = null;
      panel.onUpdate((dt, t) => this.update(dt, t));
      this.setState(state || 'after');
    }
    _clearState() {
      Object.values(this.items).forEach((o) => { if (o && o.dispose) o.dispose(); });
      if (this.stateGroup) this.root.remove(this.stateGroup);
      if (this.beakers) this.beakers.forEach((b) => this.panel.scene.remove(b.cap));
      this.items = {}; this.beakers = [];
    }
    setState(s) {
      if (this.state === s) return;
      this._clearState();
      this.state = s;
      const r = this.r;
      const g = new THREE.Group();
      this.stateGroup = g;
      this.root.add(g);
      const scene = this.panel.scene;
      const mkHit = (key, geo, pos) => {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
        m.position.copy(pos); m.userData.macroKey = key; m.userData.pickable = true; m.userData.noFit = true;
        g.add(m); return m;
      };
      if (s === 'before') {
        const f = new T.Beaker({ capacity: 250, R: 0.035, H: 0.095, spoutAngle: Math.PI * 0.75, scene, label: shortName(r.fixed.name) });
        f.group.position.set(-0.045, 0, 0);
        g.add(f.group);
        f.volume = r.fixed.vol || 0;
        f.setLiquid(r.fixed.color, r.fixed.opacity);
        const a = new T.Beaker({ capacity: 100, R: 0.025, H: 0.07, spoutAngle: Math.PI, scene, label: shortName(r.added.name) });
        a.group.position.set(0.055, 0, 0.01);
        g.add(a.group);
        a.volume = r.added.vol;
        a.setLiquid(r.added.color, r.added.opacity);
        this.beakers = [f, a];
        if (r.fixed.solid) { this.items.chips = new FX.Chips(f, r.fixed.solid); }
        this.anchors = {
          fixed: { pos: new THREE.Vector3(-0.045, f.y0 + f.axisHeight(f.volume) * 0.5 + 0.004, 0), r: 0.045 },
          fixedSolid: { pos: new THREE.Vector3(-0.045, 0.008, 0), r: 0.042 },
          added: { pos: new THREE.Vector3(0.055, a.axisHeight(a.volume) * 0.5 + 0.004, 0.01), r: 0.033 }
        };
        mkHit(r.fixed.solid ? 'fixedSolid' : 'fixed', new THREE.CylinderGeometry(0.036, 0.036, 0.09, 16), new THREE.Vector3(-0.045, 0.045, 0));
        mkHit('added', new THREE.CylinderGeometry(0.026, 0.026, 0.07, 16), new THREE.Vector3(0.055, 0.035, 0.01));
      } else {
        const f = new T.Beaker({ capacity: 250, R: 0.035, H: 0.095, spoutAngle: Math.PI * 0.75, scene, label: 'Karışım' });
        g.add(f.group);
        const vol = (r.fixed.vol || 0) + r.added.vol;
        f.volume = vol;
        const o = r.obs;
        let c = new THREE.Color(r.fixed.vol ? r.fixed.color : r.added.color).lerp(new THREE.Color(r.added.color), r.fixed.vol ? r.added.vol / vol : 1);
        let op = r.fixed.vol ? U.lerp(r.fixed.opacity, r.added.opacity, r.added.vol / vol) : r.added.opacity;
        if (o.tint) { c = new THREE.Color(o.tint.color); op = o.tint.opacity; }
        if (o.precip) { c.lerp(new THREE.Color(o.precip.color), 0.25); op = Math.max(op, 0.35); }
        f.setLiquid(c, op);
        this.beakers = [f];
        const top = f.y0 + f.axisHeight(vol);
        this.anchors = {
          solution: { pos: new THREE.Vector3(0, top * 0.55, 0), r: 0.045 },
          gas: { pos: new THREE.Vector3(0, top * 0.7, 0), r: 0.042 },
          solid: { pos: new THREE.Vector3(0, f.y0 + 0.004, 0), r: 0.042 },
          smoke: { pos: new THREE.Vector3(0, f.H + 0.04, 0), r: 0.05 },
          heat: { pos: new THREE.Vector3(0.075, 0.07, 0.0), r: 0.03 }
        };
        mkHit('solution', new THREE.CylinderGeometry(0.036, 0.036, top, 16), new THREE.Vector3(0, top / 2, 0));
        if (o.gas) {
          const b = new FX.Bubbles(f, 300);
          b.rate = 110 * o.gas.rate; b.mode = o.gas.fromSolid ? 'solid' : 'volume';
          this.items.bubbles = b;
          const fm = new FX.Foam(f); fm.maxH = 0.003 + o.gas.foam * 0.012; fm.target = o.gas.foam * 0.8; if (o.tint) fm.setColor(0xf3e3b5);
          this.items.foam = fm;
          if (r.fixed.solid) { this.items.chips = new FX.Chips(f, r.fixed.solid); this.items.chips.setFraction(1 - (o.dissolveSolid || 0) * 0.8); b.sources = this.items.chips.sources(); }
          mkHit('gas', new THREE.CylinderGeometry(0.03, 0.03, top * 0.6, 12), new THREE.Vector3(0, top * 0.65, 0));
        }
        if (o.precip) {
          const pr = new FX.Precipitate(f, 300);
          pr.setup(o.precip.color, o.precip.amount, o.precip.style);
          pr.settled = 0.75;
          pr.sediment.visible = true;
          pr.sediment.scale.y = 0.0005 + 0.75 * 0.0065 * o.precip.amount;
          this.items.precip = pr;
          this._pEmit = 0;
          mkHit('solid', new THREE.CylinderGeometry(0.036, 0.036, 0.016, 16), new THREE.Vector3(0, f.y0 + 0.006, 0));
        }
        if (o.smoke) {
          const sm = new FX.Smoke(this.root);
          sm.origin.set(0, f.H + 0.004, 0); sm.radius = 0.028; sm.rate = 9;
          this.items.smoke = sm;
          mkHit('smoke', new THREE.SphereGeometry(0.045, 12, 8), new THREE.Vector3(0, f.H + 0.05, 0));
        }
        // termometre okuması
        const tl = Mol.label('🌡 ' + (o.temp || 22).toFixed(1) + ' °C', { h: 0.022, bg: 'rgba(12,30,50,0.85)' });
        tl.position.set(0.075, 0.075, 0); tl.userData.noFit = true;
        g.add(tl);
        this.items.tempLabel = tl;
        mkHit('heat', new THREE.SphereGeometry(0.022, 8, 6), new THREE.Vector3(0.075, 0.075, 0));
      }
      this.highlight(this.hlKey);
      this.panel.fit(true, new THREE.Box3(new THREE.Vector3(-0.1, -0.005, -0.06), new THREE.Vector3(0.1, 0.13, 0.06)));
    }
    /** key: makro anahtar ya da null */
    highlight(key) {
      this.hlKey = key;
      if (this.hlLabel) { this.root.remove(this.hlLabel); this.hlLabel = null; }
      const a = key && this.anchors && this.anchors[key];
      if (!a) { this.hlRing.visible = false; return; }
      this.hlRing.visible = true;
      this.hlRing.position.copy(a.pos);
      this.hlRing.scale.setScalar(a.r);
      const lbl = Mol.label(KEY_TEXT[key] || key, { h: 0.016, bg: '#0a84ff', color: '#ffffff' });
      lbl.position.copy(a.pos).add(new THREE.Vector3(0, a.r + 0.016, 0.02));
      lbl.userData.noFit = true;
      this.hlLabel = lbl;
      this.root.add(lbl);
    }
    update(dt, t) {
      this.beakers.forEach((b) => b.update(dt));
      const it = this.items;
      if (it.bubbles) it.bubbles.update(dt);
      if (it.foam) it.foam.update(dt);
      if (it.precip) {
        this._pEmit += dt;
        if (this._pEmit > 0.25) { this._pEmit = 0; it.precip.emit(2, null, 0.03); }
        it.precip.settled = Math.min(it.precip.settled, 0.8);
        it.precip.update(dt, 0.1);
      }
      if (it.smoke) it.smoke.update(dt);
      if (this.hlRing.visible) {
        this.hlRing.lookAt(this.panel.camera.position);
        this.hlRing.material.opacity = 0.8 + Math.sin(t * 2.4) * 0.15; // yavaş, hafif nefes
      }
    }
    pickKey(hit) {
      let o = hit && hit.mesh;
      while (o) { if (o.userData && o.userData.macroKey) return o.userData.macroKey; o = o.parent; }
      return null;
    }
    dispose() { this._clearState(); this.panel.root.remove(this.root); }
  }
  function shortName(n) { return n.replace(' çözeltisi', '').replace(' (derişik)', '').replace(' (mermer parçaları)', ''); }

  T.MacroView = MacroView;
  T.MACRO_TEXT = KEY_TEXT;
})(window.TUY);
