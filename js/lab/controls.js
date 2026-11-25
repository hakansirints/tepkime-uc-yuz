/* Sınırlı, sönümlemeli yörünge kamera kontrolü (fare + dokunmatik).
   Tek parmak / sol tuş: döndür.  İki parmak: kaydır + yakınlaş.  Sağ tuş veya Shift + sol tuş: kaydır.
   Tekerlek: yakınlaş. Kaydırma masanın sınırları içinde kalır. */
(function (T) {
  'use strict';
  const U = T.U;

  class OrbitLite {
    constructor(camera, dom) {
      this.camera = camera;
      this.dom = dom;
      this.target = new THREE.Vector3(0, 1, 0);
      this.theta = 0;      // yatay açı
      this.phi = 1.1;      // dikey açı (0 = tepeden)
      this.radius = 1;
      this.goal = { theta: 0, phi: 1.1, radius: 1, target: new THREE.Vector3(0, 1, 0) };
      this.limits = { thetaMin: -1.3, thetaMax: 1.3, phiMin: 0.45, phiMax: 1.45, rMin: 0.25, rMax: 4.2 };
      this.enabled = true;
      this.focus = null;   // yakınlaşmanın çekildiği nokta (kapların ortası)
      this.pointers = new Map();
      this.blockers = []; // (event) => true ise kamera sürüklenmez (ör. beher sürükleme)
      this._bind();
    }
    _bind() {
      const d = this.dom;
      d.addEventListener('pointerdown', (e) => {
        if (!this.enabled) return;
        if (this.blockers.some((b) => b(e))) return;
        d.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this._pinch = null; this._mid = null;
        this._panBtn = e.pointerType === 'mouse' && (e.button === 2 || e.shiftKey);
      });
      d.addEventListener('pointermove', (e) => {
        const p = this.pointers.get(e.pointerId);
        if (!p || !this.enabled) return;
        this.userMoved = true;
        if (this.pointers.size === 1) {
          const dx = e.clientX - p.x, dy = e.clientY - p.y;
          if (this._panBtn) this._pan(dx, dy);
          else {
            this.goal.theta -= dx * 0.0055;
            this.goal.phi -= dy * 0.0045;
            this._clamp();
          }
        } else if (this.pointers.size === 2) {
          p.x = e.clientX; p.y = e.clientY;
          const pts = [...this.pointers.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          if (this._pinch) this._zoom(this._pinch / Math.max(1, dist));
          if (this._mid) this._pan(mid.x - this._mid.x, mid.y - this._mid.y);
          this._pinch = dist; this._mid = mid;
          return;
        }
        p.x = e.clientX; p.y = e.clientY;
      });
      const up = (e) => { this.pointers.delete(e.pointerId); this._pinch = null; this._mid = null; };
      d.addEventListener('pointerup', up);
      d.addEventListener('pointercancel', up);
      d.addEventListener('wheel', (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this._zoom(Math.exp(e.deltaY * 0.0011));
      }, { passive: false });
      d.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    /** Yakınlaşırken hedef kaplara (focus) doğru çekilir: kaplar kenara ya da düğme şeridinin altına kaymaz */
    _zoom(f) {
      this.userMoved = true;
      const g = this.goal, before = g.radius;
      g.radius *= f;
      this._clamp();
      if (this.focus && g.radius < before) g.target.lerp(this.focus, Math.min(1, (1 - g.radius / before) * 2.5));
      this._clamp();
    }
    /** Ekranda sürükleme kadar hedefi masa düzleminde kaydır (tutup çekme hissi) */
    _pan(dx, dy) {
      const h = this.dom.clientHeight || 600;
      const k = (2 * this.radius * Math.tan((this.camera.fov * Math.PI / 180) / 2)) / h;
      const s = Math.sin(this.theta), c = Math.cos(this.theta);
      // sağ: (cos θ, 0, -sin θ); ileri (masa düzleminde, kameradan uzağa): (-sin θ, 0, -cos θ)
      const t = this.goal.target;
      t.x += (-dx * c + dy * -s) * k;
      t.z += (dx * s + dy * -c) * k;
      this._clamp();
    }
    _clamp() {
      const g = this.goal, L = this.limits;
      g.theta = U.clamp(g.theta, L.thetaMin, L.thetaMax);
      g.phi = U.clamp(g.phi, L.phiMin, L.phiMax);
      g.radius = U.clamp(g.radius, L.rMin, L.rMax);
      if (L.xMin != null) g.target.x = U.clamp(g.target.x, L.xMin, L.xMax);
      if (L.zMin != null) g.target.z = U.clamp(g.target.z, L.zMin, L.zMax);
    }
    /** Görünüme yumuşak geçiş */
    setView(v, instant) {
      this.goal.theta = v.theta; this.goal.phi = v.phi; this.goal.radius = v.radius;
      this.goal.target.copy(v.target);
      if (v.limits) Object.assign(this.limits, v.limits);
      this._clamp();
      if (instant) {
        this.theta = this.goal.theta; this.phi = this.goal.phi; this.radius = this.goal.radius;
        this.target.copy(this.goal.target);
      }
    }
    update(dt) {
      const k = 1 - Math.exp(-dt * 6.5);
      this.theta += (this.goal.theta - this.theta) * k;
      this.phi += (this.goal.phi - this.phi) * k;
      this.radius += (this.goal.radius - this.radius) * k;
      this.target.lerp(this.goal.target, k);
      const sp = Math.sin(this.phi);
      this.camera.position.set(
        this.target.x + this.radius * sp * Math.sin(this.theta),
        this.target.y + this.radius * Math.cos(this.phi),
        this.target.z + this.radius * sp * Math.cos(this.theta)
      );
      this.camera.lookAt(this.target);
    }
  }
  T.OrbitLite = OrbitLite;
})(window.TUY);
