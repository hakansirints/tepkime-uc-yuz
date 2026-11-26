/* Çoklu panel 3B görüntüleyici: tek WebGL bağlamı, her DOM paneli kendi sahnesini çizer (scissor). */
(function (T) {
  'use strict';
  const U = T.U;

  const Viewer = { ready: false, panels: [] };

  Viewer.init = function (canvas) {
    if (Viewer.ready) { Viewer.resize(); return; }
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.localClippingEnabled = true;
    r.setClearColor(0x000000, 0);
    Viewer.renderer = r;
    Viewer.env = T.makeEnvironment(r);
    Viewer.ready = true;
    Viewer.resize();
    window.addEventListener('resize', () => Viewer.resize());
    Viewer._loop();
  };
  // Tuvalin ekrandaki ölçüsü kullanılır (iOS döndürmede innerWidth/innerHeight geç güncellenir)
  Viewer.resize = function () {
    const el = Viewer.renderer.domElement;
    const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
    Viewer._cw = w; Viewer._ch = h;
    Viewer.renderer.setSize(w, h, false);
  };

  /** Panel oluştur. opts: {onPick(obj, hit), onHover, rotate:true, fitPad, autoRotate} */
  Viewer.addPanel = function (el, opts) {
    opts = opts || {};
    const scene = new THREE.Scene();
    scene.environment = Viewer.env;
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd3ff, 0.8); rim.position.set(-4, 2, -5); scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const camera = new THREE.PerspectiveCamera(opts.fov || 32, 1, opts.near || 0.05, opts.far || 500);
    camera.position.set(0, 0, 12);
    const root = new THREE.Group();
    scene.add(root);
    const p = {
      el, scene, camera, root, opts,
      yaw: opts.yaw || 0, pitch: opts.pitch || 0.12, gYaw: opts.yaw || 0, gPitch: opts.pitch || 0.12,
      dist: 12, gDist: 12, center: new THREE.Vector3(), gCenter: new THREE.Vector3(),
      updaters: [], visible: true, minDist: opts.minDist || 4
    };
    p.onUpdate = (fn) => { p.updaters.push(fn); return fn; };
    p.fit = (instant, box) => { p._fitArgs = { box: box || null, fitted: true }; Viewer.fit(p, instant, box); };
    // panel boyutu değişince (pencere, bölüm gizleme, yerleşim) kamerayı yeniden sığdır
    if (window.ResizeObserver) {
      let lastW = 0, lastH = 0;
      p._ro = new ResizeObserver((ents) => {
        const r = ents[0].contentRect;
        if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 2) return;
        lastW = r.width; lastH = r.height;
        if (p.opts.onResize && r.width > 60 && p.opts.onResize(r.width, r.height)) return; // yeniden dizildi (fit içeride yapıldı)
        if (p._fitArgs && r.width > 60) Viewer.fit(p, false, p._fitArgs.box);
      });
      p._ro.observe(el);
    }
    Viewer._bindPanel(p);
    Viewer.panels.push(p);
    return p;
  };

  Viewer.removePanel = function (p) {
    const i = Viewer.panels.indexOf(p);
    if (i >= 0) Viewer.panels.splice(i, 1);
    if (p._unbind) p._unbind();
    if (p._ro) { p._ro.disconnect(); p._ro = null; }
  };
  Viewer.clear = function () {
    Viewer.panels.slice().forEach((p) => Viewer.removePanel(p));
    if (Viewer.renderer) { Viewer.renderer.setScissorTest(false); Viewer.renderer.clear(); }
  };

  /** İçeriğe göre kamerayı ayarla */
  Viewer.fit = function (p, instant, boxOverride) {
    const box = new THREE.Box3();
    let any = false;
    p.root.updateMatrixWorld(true);
    if (boxOverride) { box.copy(boxOverride); any = true; }
    else {
      // her üst düzey tanecik için ayrı kutu: tanecikler kendi ekseninde döner/salınır, kamera da
      // sağa-sola çevrilebilir. Bu yüzden yatayda (xz) dönmeden bağımsız bir daire payı ayrılır.
      const spin = p.opts.fitSpin != null ? p.opts.fitSpin : p.opts.labelRoom !== 0;
      p.root.children.forEach((top) => {
        const gb = new THREE.Box3();
        let has = false;
        top.traverse((o) => {
          // soluk (ghost) kristal komşuları da görünür: kadraja dahil edilir
          if (o.isMesh && !o.userData.noFit && o.visible) {
            o.geometry.computeBoundingBox();
            gb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); has = true;
          }
        });
        if (!has) return;
        any = true;
        if (spin) {
          const c = gb.getCenter(new THREE.Vector3()), s = gb.getSize(new THREE.Vector3());
          const r = Math.hypot(s.x, s.z) / 2 + 0.12; // +salınım payı
          gb.min.x = c.x - r; gb.max.x = c.x + r; gb.min.z = c.z - r; gb.max.z = c.z + r;
          gb.min.y -= 0.1; gb.max.y += 0.1;
        }
        box.union(gb);
      });
    }
    if (!any) { p.gCenter.set(0, 0, 0); p.gDist = 12; return; }
    const size = box.getSize(new THREE.Vector3());
    box.getCenter(p.gCenter);
    const rect = p.el.getBoundingClientRect();
    const aspect = Math.max(0.3, rect.width / Math.max(1, rect.height));
    const pad = p.opts.fitPad || 1.25;
    const vfov = (p.camera.fov * Math.PI) / 180;
    const hNeed = (size.y + (p.opts.labelRoom != null ? p.opts.labelRoom : 0.9)) * pad;
    const wNeed = size.x * pad;
    // panel başlığı (üstte) ve not/düğme şeridi (altta) modeli örtmesin: serbest dikey alana sığdır
    let hTop = 0, hBot = 0;
    if (rect.height > 0) {
      const tEl = p.el.querySelector(':scope > .ptitle');
      if (tEl && tEl.offsetParent) hTop = Math.max(0, tEl.getBoundingClientRect().bottom - rect.top - 8);
      p.el.querySelectorAll(':scope > .pnote, :scope > .pbtns').forEach((b) => {
        if (b.offsetParent && b.textContent.trim()) hBot = Math.max(hBot, rect.bottom - b.getBoundingClientRect().top - 8);
      });
      const maxCut = rect.height * 0.4;
      hTop = Math.min(hTop, maxCut); hBot = Math.min(hBot, maxCut);
    }
    const freeK = rect.height > 0 ? rect.height / Math.max(1, rect.height - hTop - hBot) : 1;
    const dH = hNeed / 2 / Math.tan(vfov / 2) * freeK;
    const dW = wNeed / 2 / Math.tan(vfov / 2) / aspect;
    p.gDist = Math.max(p.minDist, dH, dW) + size.z * 0.5;
    p.gCenter.y -= p.opts.labelRoom != null ? 0 : 0.15;
    if (hTop || hBot) p.gCenter.y += (hTop - hBot) / 2 / rect.height * 2 * p.gDist * Math.tan(vfov / 2);
    if (instant) { p.dist = p.gDist; p.center.copy(p.gCenter); }
  };

  const ray = new THREE.Raycaster();
  function pick(p, e) {
    const r = p.el.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, p.camera);
    const hits = ray.intersectObject(p.root, true).filter((h) => h.object.isMesh && !h.object.userData.ghost && h.object.visible && !h.object.userData.noPick);
    if (!hits.length) return null;
    for (const h of hits) {
      let o = h.object;
      while (o && o !== p.root) { if (o.userData && o.userData.pickable) return { group: o, mesh: h.object, point: h.point }; o = o.parent; }
    }
    return { group: null, mesh: hits[0].object, point: hits[0].point };
  }

  Viewer._bindPanel = function (p) {
    const el = p.el;
    let down = null, pinch = null;
    const onDown = (e) => {
      if (pinch) return;
      if (e.target !== el && !e.target.classList.contains('pempty') && e.target.closest('button,select,input,textarea')) return;
      down = { x: e.clientX, y: e.clientY, yaw: p.gYaw, pitch: p.gPitch, moved: false, id: e.pointerId };
      try { el.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    };
    const onMove = (e) => {
      if (down && down.id === e.pointerId) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) down.moved = true;
        if (down.moved && p.opts.rotate !== false) {
          p.gYaw = U.clamp(down.yaw + dx * 0.008, -1.2, 1.2);
          p.gPitch = U.clamp(down.pitch + dy * 0.006, -0.6, 0.8);
        }
        return;
      }
      if (e.pointerType !== 'mouse') return;
      const h = pick(p, e);
      el.style.cursor = h && h.group && p.opts.onPick ? 'pointer' : (p.opts.rotate !== false ? 'grab' : '');
      if (p.opts.onHover) p.opts.onHover(h);
    };
    const onUp = (e) => {
      if (!down || down.id !== e.pointerId) return;
      const moved = down.moved;
      down = null;
      if (moved) Viewer._syncZoom(p);
      if (!moved && p.opts.onPick) {
        const h = pick(p, e);
        p.opts.onPick(h, e);
      }
    };
    const zoomOn = p.opts.zoom !== false;
    const onWheel = (e) => {
      if (!zoomOn) return;
      e.preventDefault();
      Viewer.zoom(p, Math.exp(e.deltaY * 0.0012));
    };
    // iki parmakla sıkıştırma (pinch) ile yakınlaştırma
    const touches = new Map();
    const tDown = (e) => {
      if (e.pointerType !== 'touch' || !zoomOn) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: p.zoomMul || 1 };
        down = null; // döndürmeyi bırak
      }
    };
    const tMove = (e) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        p.zoomMul = U.clamp(pinch.z * pinch.d / d, Viewer.ZMIN, Viewer.ZMAX);
        Viewer._syncZoom(p);
      }
    };
    const tUp = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
    el.addEventListener('pointerdown', tDown, true);
    el.addEventListener('pointermove', tMove, true);
    el.addEventListener('pointerup', tUp, true);
    el.addEventListener('pointercancel', tUp, true);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    // yakınlaştırma düğmeleri kaldırıldı: tekerlek / iki parmak yakınlaştırır, çift tıklama görünümü sıfırlar
    const onDbl = (e) => { if (!zoomOn) return; e.preventDefault(); Viewer.resetView(p); };
    if (zoomOn) {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.style.touchAction = 'pan-y'; // dikey kaydırma sayfada kalır; iki parmak panelde yakınlaştırır
      el.addEventListener('dblclick', onDbl);
    }
    p._unbind = () => {
      el.removeEventListener('dblclick', onDbl);
      el.removeEventListener('pointerdown', tDown, true);
      el.removeEventListener('pointermove', tMove, true);
      el.removeEventListener('pointerup', tUp, true);
      el.removeEventListener('pointercancel', tUp, true);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  };

  /* ---------------- Yakınlaştırma ---------------- */
  Viewer.ZMIN = 0.4;  // en yakın (uzaklık × 0.4)
  Viewer.ZMAX = 2.2;  // en uzak
  Viewer.zoom = function (p, mul) {
    p.zoomMul = U.clamp((p.zoomMul || 1) * mul, Viewer.ZMIN, Viewer.ZMAX);
    Viewer._syncZoom(p);
  };
  Viewer._syncZoom = function () { /* yakınlaştırma düğmeleri kaldırıldı */ };
  /** Yakınlaştırma ve döndürmeyi başlangıca al (panele çift tıklama) */
  Viewer.resetView = function (p) {
    p.zoomMul = 1; p.gYaw = p.opts.yaw || 0; p.gPitch = p.opts.pitch != null ? p.opts.pitch : 0.12;
  };

  Viewer._loop = function () {
    const clock = new THREE.Clock();
    const r = Viewer.renderer;
    let time = 0;
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      time += dt;
      if (!Viewer.panels.length) {
        // son panel kaldırıldıysa tuvaldeki eski kareyi sil (aksi hâlde atomlar ekranda asılı kalır)
        if (Viewer._drawn) { r.setScissorTest(false); r.clear(); Viewer._drawn = false; }
        return;
      }
      if (r.domElement.style.display === 'none') return;
      Viewer._drawn = true;
      const cv = r.domElement;
      if (cv.clientWidth && (cv.clientWidth !== Viewer._cw || cv.clientHeight !== Viewer._ch)) Viewer.resize();
      const H = Viewer._ch;
      r.setScissorTest(false);
      r.clear();
      r.setScissorTest(true);
      for (const p of Viewer.panels) {
        const rect = p.el.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4 || rect.bottom < 0 || rect.top > H) continue;
        if (p.el.classList.contains('collapsed')) continue;
        // klip: kartın görünür alanı
        const k = 1 - Math.exp(-dt * 6);
        if (p.opts.autoRotate && !p._dragging) p.gYaw += 0;
        p.yaw += (p.gYaw - p.yaw) * k;
        p.pitch += (p.gPitch - p.pitch) * k;
        p.dist += (p.gDist * (p.zoomMul || 1) - p.dist) * k;
        p.center.lerp(p.gCenter, k);
        p.updaters.forEach((fn) => fn(dt, time));
        const cp = Math.cos(p.pitch);
        p.camera.position.set(
          p.center.x + p.dist * Math.sin(p.yaw) * cp,
          p.center.y + p.dist * Math.sin(p.pitch),
          p.center.z + p.dist * Math.cos(p.yaw) * cp);
        p.camera.lookAt(p.center);
        p.camera.aspect = rect.width / rect.height;
        p.camera.updateProjectionMatrix();
        const y = H - rect.bottom;
        r.setViewport(rect.left, y, rect.width, rect.height);
        r.setScissor(rect.left, y, rect.width, rect.height);
        r.render(p.scene, p.camera);
      }
    };
    loop();
  };

  /* ---------------- Küçük resimler (havuz kartları) ---------------- */
  const thumbCache = {};
  let thumbR = null, thumbScene = null, thumbCam = null;
  Viewer.thumb = function (sid) {
    if (thumbCache[sid]) return thumbCache[sid];
    if (!thumbR) {
      const c = document.createElement('canvas'); c.width = 192; c.height = 192;
      thumbR = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
      thumbR.outputColorSpace = THREE.SRGBColorSpace;
      thumbR.toneMapping = THREE.ACESFilmicToneMapping;
      thumbR.setClearColor(0x000000, 0);
      thumbScene = new THREE.Scene();
      thumbScene.environment = T.makeEnvironment(thumbR);
      const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(3, 5, 6); thumbScene.add(l);
      thumbScene.add(new THREE.AmbientLight(0xffffff, 0.3));
      thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    }
    const g = T.Mol.build(sid, { label: false });
    if (g.userData.lattice) g.userData.lattice.scale.setScalar(1);
    thumbScene.add(g);
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const rad = Math.max(size.x, size.y) * 0.62 + 0.2;
    thumbCam.position.set(ctr.x + rad * 0.5, ctr.y + rad * 0.55, ctr.z + rad / Math.tan(15 * Math.PI / 180) * 0.95);
    thumbCam.lookAt(ctr);
    thumbR.render(thumbScene, thumbCam);
    const url = thumbR.domElement.toDataURL('image/png');
    thumbScene.remove(g);
    thumbCache[sid] = url;
    return url;
  };

  T.Viewer = Viewer;
})(window.TUY);
