/**
 * 3D Laboratuvar Sahnesi Parçacık Simülasyon Motoru
 * - Gaz Kabarcıkları (CO2, O2 köpürmesi)
 * - Çökelek Kristalleri (PbI2, AgCl, Cu(OH)2 vb. çökeltileri ve dibe yerleşme)
 * - Gaz fazında temas sonucu NH4Cl katı aerosolü
 * - 250 mL beher boyutlarına göre orantılanmış parçacık ölçeği
 */

class LabParticleManager {
  constructor(scene, glassware) {
    this.scene = scene;
    this.glassware = glassware;
    this.vessel = glassware.main;

    // Aktif parçacık grupları (250 mL beher tabanına konumlandırılır)
    this.bubbleGroup = new THREE.Group();
    this.precipitateGroup = new THREE.Group();
    this.smokeGroup = new THREE.Group();
    this.dissolveGroup = new THREE.Group();

    this.beakerPos = glassware.beaker250RestPos.clone();

    this.bubbleGroup.position.copy(this.beakerPos);
    this.precipitateGroup.position.copy(this.beakerPos);
    this.smokeGroup.position.copy(this.beakerPos);
    this.dissolveGroup.position.copy(this.beakerPos);

    this.scene.add(this.bubbleGroup);
    this.scene.add(this.precipitateGroup);
    this.scene.add(this.smokeGroup);
    this.scene.add(this.dissolveGroup);

    this.bubbles = [];
    this.precipitates = [];
    this.smokePuffs = [];
    this.dissolveParticles = [];

    this.isBubbling = false;
    this.isPrecipitating = false;
    this.isSmoking = false;

    // Orantılı geometriler
    this.precipitateGeo = new THREE.BoxBufferGeometry(0.006, 0.006, 0.006);
    this.sedimentGeo = new THREE.CylinderGeometry(this.vessel.insideRadius * 0.94, this.vessel.insideRadius * 0.94, 1, 48);
    this.gasEffects = new LabReactionGasEffects(this);
  }

  // 1. Gaz Kabarcığı Efektini Başlat
  startBubbles(options = {}) {
    this.gasEffects.startBubbles(options);
  }

  stopBubbles() {
    this.gasEffects.stopBubbles();
  }

  // 2. Çökelek Parçacık Efektini Başlat
  startPrecipitate(options = {}) {
    this.stopPrecipitate();
    this.isPrecipitating = true;
    const color = options.color || 0xfacc15;
    const count = 110;

    const precipMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    });
    this.precipitateGrowth = 0;
    this.sedimentHeight = 0.026 * (options.finalAmount ?? 0.7);
    const sedimentMaterial = new THREE.MeshStandardMaterial({color, roughness:0.9, transparent:true, opacity:0.98, depthWrite:false});
    sedimentMaterial.color.convertSRGBToLinear();
    this.precipitateBed = new THREE.Mesh(this.sedimentGeo, sedimentMaterial);
    this.precipitateBed.renderOrder = 3;
    this.precipitateBed.scale.y = 0.0001;
    this.precipitateBed.position.y = this.vessel.bottom;
    this.precipitateGroup.add(this.precipitateBed);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.precipitateGeo, precipMat);
      const scale = 0.6 + Math.random() * 1.2;
      mesh.scale.set(scale, scale, scale);

      const r = Math.sqrt(Math.random()) * this.vessel.insideRadius * 0.85;
      const theta = Math.random() * Math.PI * 2;
      mesh.position.set(
        Math.cos(theta) * r,
        this.vessel.bottom + Math.random() * this.glassware.beaker250LiquidHeight,
        Math.sin(theta) * r
      );

      mesh.userData = {
        vy: -(0.001 + Math.random() * 0.002),
        settledY: this.vessel.bottom + 0.005 + Math.random() * 0.02,
        isSettled: false,
        rotSpeed: (Math.random() - 0.5) * 0.08
      };

      this.precipitateGroup.add(mesh);
      this.precipitates.push(mesh);
    }
  }

  stopPrecipitate() {
    this.isPrecipitating = false;
    this.disposeMaterials(this.precipitateGroup);
    while (this.precipitateGroup.children.length > 0) {
      this.precipitateGroup.remove(this.precipitateGroup.children[0]);
    }
    this.precipitates = [];
    this.precipitateBed = null;
  }

  // 3. Duman / Sis Efekti
  startSmoke(options = {}) {
    this.gasEffects.startSmoke(options);
  }

  emitSmokePuff() {
    this.gasEffects.emitSmokePuff();
  }

  stopSmoke() {
    this.gasEffects.stopSmoke();
  }

  // 4. Katı Çözünme Efekti
  spawnDissolveParticles(color = 0xffffff, count = 50) {
    this.clearDissolveParticles();
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.precipitateGeo, mat);
      const r = Math.sqrt(Math.random()) * this.vessel.insideRadius * 0.85;
      const theta = Math.random() * Math.PI * 2;
      mesh.position.set(
        Math.cos(theta) * r,
        this.vessel.bottom + 0.005 + Math.random() * 0.022,
        Math.sin(theta) * r
      );
      mesh.scale.setScalar(0.6 + Math.random() * 0.7);
      mesh.userData = { initialScale: mesh.scale.x, elapsed: 0, lifetime: 22 };
      this.dissolveGroup.add(mesh);
      this.dissolveParticles.push(mesh);
    }
  }

  clearDissolveParticles() {
    this.isDissolving = false;
    this.disposeMaterials(this.dissolveGroup);
    while (this.dissolveGroup.children.length > 0) {
      this.dissolveGroup.remove(this.dissolveGroup.children[0]);
    }
    this.dissolveParticles = [];
  }

  beginDissolution(duration) {
    this.isDissolving = true;
    this.dissolveParticles.forEach(mesh => { mesh.userData.lifetime = duration * (.8 + Math.random() * .2); });
  }

  update(time, delta) {
    this.gasEffects.update(delta);

    if (this.isPrecipitating) {
      this.precipitateGrowth = Math.min(1, this.precipitateGrowth + delta * 0.55);
      const height = this.sedimentHeight * this.precipitateGrowth;
      this.precipitateBed.scale.y = Math.max(0.0001, height);
      this.precipitateBed.position.y = this.vessel.bottom + height / 2;
      this.precipitates.forEach((p) => {
        if (!p.userData.isSettled) {
          p.position.y += p.userData.vy;
          p.rotation.x += p.userData.rotSpeed;
          p.rotation.y += p.userData.rotSpeed;

          if (p.position.y <= p.userData.settledY) {
            p.position.y = p.userData.settledY;
            p.userData.isSettled = true;
          }
        }
      });
    }

    if (this.isDissolving && this.dissolveParticles.length > 0) {
      for (let i = this.dissolveParticles.length - 1; i >= 0; i--) {
        const dp = this.dissolveParticles[i];
        dp.userData.elapsed += delta;
        dp.scale.setScalar(dp.userData.initialScale * Math.max(0, 1 - dp.userData.elapsed / dp.userData.lifetime));
        if (dp.scale.x <= 0.05) {
          this.dissolveGroup.remove(dp);
          this.dissolveParticles.splice(i, 1);
          if (this.dissolveParticles.length === 0) dp.material.dispose();
        }
      }
    }
  }

  disposeMaterials(group) {
    const materials = new Set(group.children.map(child => child.material));
    materials.forEach(material => material?.dispose());
  }

  clearAll() {
    this.stopBubbles();
    this.stopPrecipitate();
    this.stopSmoke();
    this.clearDissolveParticles();
  }
}

if (typeof window !== "undefined") {
  window.LabParticleManager = LabParticleManager;
}
