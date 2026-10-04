/**
 * 3D Laboratuvar Sahnesi Parçacık Simülasyon Motoru
 * - Gaz Kabarcıkları (CO2, O2 köpürmesi)
 * - Çökelek Kristalleri (PbI2, AgCl, Cu(OH)2 vb. çökeltileri ve dibe yerleşme)
 * - Duman ve Buhar (NH4Cl sisi, su buharı)
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
    this.bubbleGeo = new THREE.SphereBufferGeometry(0.007, 8, 8);
    this.precipitateGeo = new THREE.BoxBufferGeometry(0.006, 0.006, 0.006);
    this.smokeGeo = new THREE.DodecahedronBufferGeometry(0.035, 1);
    this.sedimentGeo = new THREE.CylinderGeometry(this.vessel.insideRadius * 0.94, this.vessel.insideRadius * 0.94, 1, 48);
  }

  // 1. Gaz Kabarcığı Efektini Başlat
  startBubbles(options = {}) {
    this.stopBubbles();
    this.isBubbling = true;
    this.bubbleOptions = {
      color: options.color || 0xffffff,
      intensity: options.intensity || "high",
      speed: options.speed || 1.5,
      liquidRadius: this.vessel.insideRadius,
      liquidBottom: this.vessel.bottom,
      liquidTop: this.vessel.bottom + this.glassware.beaker250LiquidHeight
    };

    const count = this.bubbleOptions.intensity === "high" ? 65 : 30;
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: this.bubbleOptions.color,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      ior: 1.1
    });

    for (let i = 0; i < count; i++) {
      const scale = 0.5 + Math.random() * 0.9;
      const mesh = new THREE.Mesh(this.bubbleGeo, bubbleMat);
      mesh.scale.set(scale, scale, scale);

      const r = Math.sqrt(Math.random()) * this.bubbleOptions.liquidRadius * 0.85;
      const theta = Math.random() * Math.PI * 2;
      mesh.position.set(
        Math.cos(theta) * r,
        this.bubbleOptions.liquidBottom +
          Math.random() * (this.bubbleOptions.liquidTop - this.bubbleOptions.liquidBottom),
        Math.sin(theta) * r
      );

      mesh.userData = {
        vy: (0.0022 + Math.random() * 0.0035) * this.bubbleOptions.speed,
        wobbleSpeed: 2 + Math.random() * 4,
        wobbleDist: 0.0012 + Math.random() * 0.0018,
        seed: Math.random() * 100
      };

      this.bubbleGroup.add(mesh);
      this.bubbles.push(mesh);
    }
  }

  stopBubbles() {
    this.isBubbling = false;
    this.disposeMaterials(this.bubbleGroup);
    while (this.bubbleGroup.children.length > 0) {
      this.bubbleGroup.remove(this.bubbleGroup.children[0]);
    }
    this.bubbles = [];
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
    this.stopSmoke();
    this.isSmoking = true;
    this.smokeOptions = options;
  }

  emitSmokePuff() {
    if (!this.isSmoking) return;
    if (this.smokePuffs.length > 40) return;

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    const r = Math.random() * 0.08;
    const theta = Math.random() * Math.PI * 2;
    mesh.position.set(
      Math.cos(theta) * r,
      this.vessel.height + Math.random() * 0.04,
      Math.sin(theta) * r
    );

    mesh.scale.setScalar(0.4 + Math.random() * 0.4);
    mesh.userData = {
      vy: 0.0022 + Math.random() * 0.0035,
      vx: (Math.random() - 0.5) * 0.0015,
      vz: (Math.random() - 0.5) * 0.0015,
      growth: 0.0022 + Math.random() * 0.002,
      life: 1.0,
      decay: 0.008 + Math.random() * 0.006
    };

    this.smokeGroup.add(mesh);
    this.smokePuffs.push(mesh);
  }

  stopSmoke() {
    this.isSmoking = false;
    this.disposeMaterials(this.smokeGroup);
    while (this.smokeGroup.children.length > 0) {
      this.smokeGroup.remove(this.smokeGroup.children[0]);
    }
    this.smokePuffs = [];
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
      mesh.userData = {
        shrink: 0.0025 + Math.random() * 0.0045
      };
      this.dissolveGroup.add(mesh);
      this.dissolveParticles.push(mesh);
    }
  }

  clearDissolveParticles() {
    this.disposeMaterials(this.dissolveGroup);
    while (this.dissolveGroup.children.length > 0) {
      this.dissolveGroup.remove(this.dissolveGroup.children[0]);
    }
    this.dissolveParticles = [];
  }

  update(time, delta) {
    if (this.isBubbling) {
      this.bubbleOptions.liquidTop = this.vessel.bottom + this.glassware.beaker250LiquidHeight;
      const top = this.bubbleOptions.liquidTop;
      const bottom = this.bubbleOptions.liquidBottom;

      this.bubbles.forEach((b) => {
        b.position.y += b.userData.vy;
        b.position.x +=
          Math.sin(time * b.userData.wobbleSpeed + b.userData.seed) * b.userData.wobbleDist;
        b.position.z +=
          Math.cos(time * b.userData.wobbleSpeed + b.userData.seed) * b.userData.wobbleDist;

        if (b.position.y >= top) {
          b.position.y = bottom;
          const r = Math.sqrt(Math.random()) * this.bubbleOptions.liquidRadius * 0.85;
          const theta = Math.random() * Math.PI * 2;
          b.position.x = Math.cos(theta) * r;
          b.position.z = Math.sin(theta) * r;
        }
      });
    }

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

    if (this.isSmoking) {
      if (Math.random() < 0.35) {
        this.emitSmokePuff();
      }

      for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
        const puff = this.smokePuffs[i];
        puff.position.y += puff.userData.vy;
        puff.position.x += puff.userData.vx;
        puff.position.z += puff.userData.vz;
        puff.scale.addScalar(puff.userData.growth);
        puff.userData.life -= puff.userData.decay;
        puff.material.opacity = Math.max(0, puff.userData.life * 0.45);

        if (puff.userData.life <= 0) {
          this.smokeGroup.remove(puff);
          puff.material.dispose();
          this.smokePuffs.splice(i, 1);
        }
      }
    }

    if (this.dissolveParticles.length > 0) {
      for (let i = this.dissolveParticles.length - 1; i >= 0; i--) {
        const dp = this.dissolveParticles[i];
        dp.scale.subScalar(dp.userData.shrink);
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
