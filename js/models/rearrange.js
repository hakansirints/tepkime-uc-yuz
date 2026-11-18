/* Tepkime canlandırması: tepkime öncesi tanecikler ayrışır, atomlar yer değiştirir, ürünler oluşur.
   Atomlar korunur: her atom bir "oyuncu" küredir ve önceki konumundan sonraki konumuna taşınır. */
(function (T) {
  'use strict';
  const U = T.U, Mol = T.Mol;

  function expand(ms) {
    const out = [];
    Object.keys(ms).forEach((sid) => { for (let i = 0; i < (ms[sid] || 0); i++) out.push(sid); });
    return out;
  }

  class Rearranger {
    /**
     * panel: Viewer paneli; before/after: {türId: adet}
     * opts: {spread, onDone, lostLabel}
     */
    constructor(panel, before, after, opts) {
      this.panel = panel;
      this.opts = opts || {};
      this.group = new THREE.Group();
      panel.root.add(this.group);
      this.t = 0; this.playing = false; this.speed = 1 / (this.opts.duration || 6);
      this.build(before, after);
    }
    build(before, after) {
      const g = this.group;
      while (g.children.length) g.remove(g.children[0]);
      this.beforeIds = expand(before);
      this.afterIds = expand(after);
      // referans modeller (konum hesabı için)
      const bInst = this.beforeIds.map((sid) => Mol.build(sid, { label: false }));
      const aInst = this.afterIds.map((sid) => Mol.build(sid, { label: false }));
      const lay = { gap: 0.9, jitter: false, aspect: 1.6 };
      const bPos = Mol.layout(bInst, lay), aPos = Mol.layout(aInst, lay);
      this.bInst = bInst.map((m, i) => ({ sid: this.beforeIds[i], pos: bPos[i], atoms: T.SPECIES[this.beforeIds[i]].atoms.map((a) => ({ el: a.el, p: new THREE.Vector3(...a.p) })), radius: m.userData.radius }));
      this.aInst = aInst.map((m, i) => ({ sid: this.afterIds[i], pos: aPos[i], atoms: T.SPECIES[this.afterIds[i]].atoms.map((a) => ({ el: a.el, p: new THREE.Vector3(...a.p) })), radius: m.userData.radius }));
      this.map = T.Eval.mapAtoms(this.bInst, this.aInst);
      // oyuncular
      const sg = new THREE.SphereGeometry(1, 32, 24);
      this.actors = [];
      const mk = (el) => { const m = new THREE.Mesh(sg, Mol.atomMaterial(el)); m.scale.setScalar(T.ELEMENTS[el].r); m.userData.el = el; g.add(m); return m; };
      this.map.pairs.forEach((pr) => {
        const bi = this.bInst[pr.b[0]], ai = this.aInst[pr.a[0]];
        const m = mk(bi.atoms[pr.b[1]].el);
        const actor = {
          mesh: m, kind: 'pair', b: pr.b, a: pr.a,
          p0: bi.pos.clone().add(bi.atoms[pr.b[1]].p), c0: bi.pos.clone(),
          p1: ai.pos.clone().add(ai.atoms[pr.a[1]].p), c1: ai.pos.clone(),
          whole: !!(bi.unchanged && ai.unchanged && bi.sid === ai.sid),
          seed: Math.random() * 6.28
        };
        this.actors.push(actor);
      });
      this.lostMat = new THREE.MeshPhysicalMaterial({ color: 0xff4d4d, emissive: 0xff0000, emissiveIntensity: 0.6, transparent: true, opacity: 1, roughness: 0.3 });
      this.map.lostB.forEach(([i, j]) => {
        const bi = this.bInst[i];
        const m = mk(bi.atoms[j].el);
        this.actors.push({ mesh: m, kind: 'lost', b: [i, j], p0: bi.pos.clone().add(bi.atoms[j].p), c0: bi.pos.clone(), seed: Math.random() * 6.28 });
      });
      this.map.newA.forEach(([i, j]) => {
        const ai = this.aInst[i];
        const m = mk(ai.atoms[j].el);
        this.actors.push({ mesh: m, kind: 'new', a: [i, j], p1: ai.pos.clone().add(ai.atoms[j].p), c1: ai.pos.clone(), seed: Math.random() * 6.28 });
      });
      // etiketler
      this.bLabels = this.bInst.map((bi) => { const l = Mol.label(T.speciesLabel(bi.sid), { h: 0.5 }); l.position.copy(bi.pos).add(new THREE.Vector3(0, -bi.radius - 0.35, 0.6)); g.add(l); return l; });
      this.aLabels = this.aInst.map((ai) => { const l = Mol.label(T.speciesLabel(ai.sid), { h: 0.5 }); l.position.copy(ai.pos).add(new THREE.Vector3(0, -ai.radius - 0.35, 0.6)); g.add(l); return l; });
      // kristal örgüler
      this.bLat = []; this.aLat = [];
      bInst.forEach((m, i) => { if (m.userData.lattice) { const l = m.userData.lattice; l.position.copy(this.bInst[i].pos); g.add(l); this.bLat.push(l); } });
      aInst.forEach((m, i) => { if (m.userData.lattice) { const l = m.userData.lattice; l.position.copy(this.aInst[i].pos); g.add(l); this.aLat.push(l); } });
      // iz çizgisi
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 200), 3));
      tg.setDrawRange(0, 0);
      this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9, depthTest: false }));
      this.trail.renderOrder = 45;
      this.trail.frustumCulled = false;
      g.add(this.trail);
      this.trailN = 0;
      this.tracked = null;
      this.seek(0);
    }
    /** Fit için sınır kutusu: hem önce hem sonra konumlarını kapsa */
    fitBoth() {
      const pts = this.actors.map((a) => a.p0 || a.p1).concat(this.actors.map((a) => a.p1 || a.p0));
      const box = new THREE.Box3().setFromPoints(pts);
      box.expandByScalar(0.9);
      return box;
    }
    track(spec) {
      // spec: {el, from} -> önce tarafındaki ilk uygun atom
      this.untrack();
      const bi = spec.bi != null ? spec.bi : this.bInst.findIndex((b) => b.sid === spec.from && b.atoms.some((a) => a.el === spec.el));
      if (bi < 0) return null;
      const aj = this.bInst[bi].atoms.findIndex((a) => a.el === spec.el);
      const actor = this.actors.find((a) => a.b && a.b[0] === bi && a.b[1] === aj);
      if (!actor) return null;
      this.tracked = actor;
      actor.ring = Mol.markAtom(actor.mesh, 0xffd84a);
      this.trailN = 0;
      return { beforeIndex: bi, afterIndex: actor.kind === 'pair' ? actor.a[0] : -1, lost: actor.kind === 'lost' };
    }
    untrack() {
      if (this.tracked) {
        const m = this.tracked.mesh;
        if (this.tracked.ring) m.remove(this.tracked.ring);
        if (m.userData.prevMat) m.material = m.userData.prevMat;
        this.tracked = null;
      }
      this.trailN = 0;
      this.trail.geometry.setDrawRange(0, 0);
    }
    play(onDone) { if (this.t >= 1) this.seek(0); this.playing = true; this._onDone = onDone; }
    pause() { this.playing = false; }
    update(dt) {
      if (!this.playing) return;
      this.seek(Math.min(1, this.t + dt * this.speed));
      if (this.t >= 1) { this.playing = false; if (this._onDone) { const f = this._onDone; this._onDone = null; f(); } }
    }
    seek(t) {
      this.t = t;
      const ph = (a, b) => U.clamp((t - a) / (b - a), 0, 1);
      const brk = U.easeInOut(ph(0.12, 0.32));
      const trv = U.easeInOut(ph(0.32, 0.78));
      const asm = U.easeInOut(ph(0.78, 0.96));
      const tmp = new THREE.Vector3();
      this.actors.forEach((ac) => {
        const m = ac.mesh;
        const wob = Math.sin(t * 40 + ac.seed) * 0.03 * (t > 0.1 && t < 0.9 ? 1 : 0);
        if (ac.kind === 'pair') {
          if (ac.whole) {
            tmp.copy(ac.p0).lerp(ac.p1, trv);
            m.position.copy(tmp);
          } else {
            const e0 = ac.p0.clone().sub(ac.c0).multiplyScalar(0.6 * brk).add(ac.p0);
            const e1 = ac.p1.clone().sub(ac.c1).multiplyScalar(0.6 * (1 - asm)).add(ac.p1);
            if (trv <= 0) m.position.copy(e0);
            else {
              const ctrl = e0.clone().lerp(e1, 0.5); ctrl.z += 1.6; ctrl.y += 0.4;
              const a = e0.clone().lerp(ctrl, trv), b = ctrl.clone().lerp(e1, trv);
              m.position.copy(a.lerp(b, trv));
            }
            m.position.x += wob; m.position.y += wob * 0.6;
          }
        } else if (ac.kind === 'lost') {
          const e0 = ac.p0.clone().sub(ac.c0).multiplyScalar(0.6 * brk).add(ac.p0);
          m.position.copy(e0);
          m.position.z += trv * 1.2;
          if (t > 0.32) {
            m.material = this.lostMat;
            const k = ph(0.32, 0.95);
            m.scale.setScalar(T.ELEMENTS[m.userData.el].r * (1 - k * 0.9));
            m.visible = k < 0.99;
          } else { m.material = Mol.atomMaterial(m.userData.el); m.scale.setScalar(T.ELEMENTS[m.userData.el].r); m.visible = true; }
        } else if (ac.kind === 'new') {
          const k = ph(0.55, 0.92);
          m.position.copy(ac.p1);
          m.visible = k > 0.01;
          m.material = this.lostMat;
          m.scale.setScalar(T.ELEMENTS[m.userData.el].r * Math.max(0.01, k));
        }
      });
      const fadeB = 1 - ph(0.08, 0.26), fadeA = ph(0.8, 0.98);
      this.bLabels.forEach((l) => { l.material.opacity = fadeB; l.visible = fadeB > 0.01; });
      this.aLabels.forEach((l) => { l.material.opacity = fadeA; l.visible = fadeA > 0.01; });
      this.bLat.forEach((l) => { l.visible = fadeB > 0.02; l.traverse((o) => { if (o.material && o.material.transparent) o.material.opacity = (o.isLineSegments ? 0.3 : 0.16) * fadeB; }); });
      this.aLat.forEach((l) => { l.visible = fadeA > 0.02; l.traverse((o) => { if (o.material && o.material.transparent) o.material.opacity = (o.isLineSegments ? 0.3 : 0.16) * fadeA; }); });
      // iz
      if (this.tracked && t > 0) {
        const pos = this.trail.geometry.attributes.position;
        const p = this.tracked.mesh.position;
        if (this.trailN < 200 && (this.trailN === 0 || new THREE.Vector3(pos.getX(this.trailN - 1), pos.getY(this.trailN - 1), pos.getZ(this.trailN - 1)).distanceTo(p) > 0.05)) {
          pos.setXYZ(this.trailN++, p.x, p.y, p.z);
          pos.needsUpdate = true;
          this.trail.geometry.setDrawRange(0, this.trailN);
        }
      }
      if (t === 0) { this.trailN = 0; this.trail.geometry.setDrawRange(0, 0); }
      if (this.tracked && this.tracked.ring) {
        this.tracked.ring.lookAt(this.panel.camera.position);
      }
    }
    /** Sonra tarafındaki tür örneğine ait oyuncu atomlarının merkezi (seçim için) */
    afterGroups() { return this.aInst; }
    dispose() { this.panel.root.remove(this.group); }
  }

  T.Rearranger = Rearranger;
})(window.TUY);
