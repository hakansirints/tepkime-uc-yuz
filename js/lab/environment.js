/* Yansımalar için laboratuvar benzeri ortam haritası (PMREM).
   Cam ve sıvı yüzeylerindeki gerçekçi yansımalar buradan gelir. */
(function (T) {
  'use strict';

  function lightMat(intensity, tint) {
    const m = new THREE.MeshBasicMaterial({ color: tint || 0xffffff });
    m.color.multiplyScalar(intensity);
    return m;
  }

  function buildEnvScene() {
    const scene = new THREE.Scene();
    const box = new THREE.BoxGeometry();
    box.deleteAttribute('uv');

    const roomMat = new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: 0xd9dcda, roughness: 1 });
    const room = new THREE.Mesh(box, roomMat);
    room.position.set(0, 4, 0);
    room.scale.set(16, 8, 14);
    scene.add(room);

    // Zemin daha koyu
    const floor = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x8c8e8a, roughness: 1 }));
    floor.position.set(0, 0.02, 0); floor.scale.set(15.8, 0.04, 13.8);
    scene.add(floor);

    const amb = new THREE.PointLight(0xffffff, 60, 30, 2);
    amb.position.set(0, 6, 0);
    scene.add(amb);

    // Tavan floresan panelleri (şerit yansımalar)
    for (let i = -2; i <= 2; i++) {
      for (let j = -1; j <= 1; j++) {
        const p = new THREE.Mesh(box, lightMat(9, 0xf4f8ff));
        p.position.set(i * 2.8, 7.9, j * 3.6);
        p.scale.set(1.1, 0.05, 2.4);
        scene.add(p);
      }
    }
    // Sol duvardaki pencereler (gün ışığı)
    for (let k = -1; k <= 1; k++) {
      const w = new THREE.Mesh(box, lightMat(6, 0xdff0ff));
      w.position.set(-7.95, 3.6, k * 3.6);
      w.scale.set(0.05, 2.6, 2.4);
      scene.add(w);
    }
    // Arkadaki koyu dolaplar ve tahta (kontrast)
    const dark = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.9 }));
    dark.position.set(0, 1.4, -6.9); dark.scale.set(12, 2.8, 0.2);
    scene.add(dark);
    const board = new THREE.Mesh(box, lightMat(1.6, 0xffffff));
    board.position.set(0, 4.2, 6.9); board.scale.set(5, 1.8, 0.1);
    scene.add(board);
    return scene;
  }

  T.makeEnvironment = function (renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const scene = buildEnvScene();
    const rt = pmrem.fromScene(scene, 0.035);
    pmrem.dispose();
    return rt.texture;
  };
})(window.TUY);
