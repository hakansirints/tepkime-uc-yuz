/**
 * 3D Dijital Laboratuvar Termometresi (Digital Laboratory Probe Thermometer)
 * - 250 mL beherin iç sol kenarına dik (eğik değil) olarak yerleştirilmiş
 * - Tabanı veya ucu asla beherin dışına çıkmaz; sıvı içinde güvenle sonlanır
 * - Paslanmaz çelik daldırma probu ve beherin ağzına oturan sabitleme klipsi
 * - Dijital LCD ekranlı ergonomik gövde
 * - Dinamik 512x256 7-segment dijital LCD dokusu (canlı sıcaklık değişimleri)
 * - Sıcaklık yalnızca cihazın LCD ekranında gösterilir
 */

class LabThermometer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "digital-thermometer";
    this.scene.add(this.group);

    this.currentTemp = 22.0;
    this.targetTemp = 22.0;
    this.minTemp = 10.0;
    this.maxTemp = 60.0;

    this.build3DModel();

    // 250 mL beherin (x: -0.28, y: 1.175, z: 0.08) iç sol kenarına dik ve yakın yerleşim
    // Gövde ağız üzerinde, prob beherin dibine veya dışına taşmadan sıvı içine dik dalar
    this.group.position.set(-0.42, 1.585, 0.08);
    this.group.rotation.set(0.10, 0, 0); // Kesinlikle dik (Z=0, Y=0), ekrana rahat bakış için hafif X eğimi
  }

  createLCDTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    this.lcdCanvas = c;
    this.lcdCtx = c.getContext("2d");
    this.lcdTexture = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) this.lcdTexture.colorSpace = THREE.SRGBColorSpace;
    this.updateLCD();
  }

  updateLCD() {
    if (!this.lcdCtx) return;
    const ctx = this.lcdCtx;
    const w = 512;
    const h = 256;

    // Yüksek kontrastlı koyu dijital LCD arka planı
    ctx.fillStyle = "#070c14";
    ctx.fillRect(0, 0, w, h);

    // Çerçeve
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    // Üst durum çubuğu
    ctx.fillStyle = "#38bdf8";
    ctx.font = 'bold 28px "Segoe UI", Arial, monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("DIGITAL TEMP", 28, 22);

    ctx.textAlign = "right";
    ctx.font = 'bold 24px monospace';
    ctx.fillText("REC ●", w - 28, 24);

    // Sıcaklık durumuna göre dinamik renk
    let valColor = "#4ade80"; // Normal yeşil
    if (this.currentTemp > 30) {
      valColor = "#f87171"; // Isınma (kırmızımsı)
    } else if (this.currentTemp < 20) {
      valColor = "#38bdf8"; // Soğuma (mavi)
    }

    // Ana büyük dijital sıcaklık değeri
    ctx.fillStyle = valColor;
    ctx.font = 'bold 100px "Courier New", monospace, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${this.currentTemp.toFixed(1)}°C`, w / 2, 134);

    // Alt model bilgisi
    ctx.font = '600 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = "#64748b";
    ctx.fillText("MEBİ KİMLAB · PROBE-T1", w / 2, 214);

    this.lcdTexture.needsUpdate = true;
  }

  build3DModel() {
    const headGroup = new THREE.Group();
    this.group.add(headGroup);

    // 1. Ana plastik gövde (Ergonomik laboratuvar kasası)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.15
    });
    const bodyGeo = new THREE.BoxBufferGeometry(0.108, 0.070, 0.026);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    headGroup.add(bodyMesh);

    // Ön ekran çerçevesi (Bezel)
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.4
    });
    const bezelGeo = new THREE.BoxBufferGeometry(0.094, 0.056, 0.003);
    bezelGeo.translate(0, 0, 0.0135);
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    headGroup.add(bezelMesh);

    // LCD Ekran Yüzeyi
    this.createLCDTexture();
    const lcdMat = new THREE.MeshStandardMaterial({
      map: this.lcdTexture,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveMap: this.lcdTexture,
      emissiveIntensity: 0.85
    });
    const lcdGeo = new THREE.PlaneBufferGeometry(0.088, 0.050);
    const lcdMesh = new THREE.Mesh(lcdGeo, lcdMat);
    lcdMesh.position.set(0, 0, 0.0152);
    headGroup.add(lcdMesh);

    // Kontrol butonları
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
    const btn1 = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.0045, 0.0045, 0.004, 12), btnMat);
    btn1.rotation.x = Math.PI / 2;
    btn1.position.set(-0.030, -0.030, 0.013);
    headGroup.add(btn1);

    const btn2 = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.0045, 0.0045, 0.004, 12), btnMat);
    btn2.rotation.x = Math.PI / 2;
    btn2.position.set(0.030, -0.030, 0.013);
    headGroup.add(btn2);

    // 2. Paslanmaz Çelik Prob Mili (Orantılı daldırma probu)
    const probeMat = new THREE.MeshStandardMaterial({
      color: 0xd8e0e8,
      metalness: 0.92,
      roughness: 0.16
    });

    // Raised display: extend the probe so its tip remains submerged.
    const probeLength = 0.30;
    const probeGeo = new THREE.CylinderBufferGeometry(0.0035, 0.0035, probeLength, 16);
    probeGeo.translate(0, -probeLength / 2, 0);
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);
    probeMesh.position.set(0, -0.034, 0);
    probeMesh.castShadow = true;
    headGroup.add(probeMesh);

    // Rounded sensor tip stays inside the liquid, clear of the beaker base.
    const tipGeo = new THREE.SphereBufferGeometry(0.0038, 12, 12);
    tipGeo.translate(0, -probeLength - 0.034, 0);
    const tipMesh = new THREE.Mesh(tipGeo, probeMat);
    headGroup.add(tipMesh);

    // Beher Ağzı Klipsi / Derinlik Stoperi (Beherin ağzına oturan bilezik)
    const collarGeo = new THREE.TorusBufferGeometry(0.008, 0.003, 8, 16);
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.translate(0, -0.085 / 1.5, 0);
    const collarMesh = new THREE.Mesh(collarGeo, probeMat);
    headGroup.add(collarMesh);
  }

  setTemperature(temp, animate = true) {
    this.targetTemp = Math.max(this.minTemp, Math.min(this.maxTemp, temp));
    if (!animate) {
      this.currentTemp = this.targetTemp;
      this.updateLCD();
    }
  }

  reset(temp = 22.0) {
    this.setTemperature(temp, false);
  }

  update(delta) {
    if (Math.abs(this.currentTemp - this.targetTemp) > 0.05) {
      const speed = 2.5; // °C / saniye
      if (this.currentTemp < this.targetTemp) {
        this.currentTemp = Math.min(this.targetTemp, this.currentTemp + speed * delta);
      } else {
        this.currentTemp = Math.max(this.targetTemp, this.currentTemp - speed * delta);
      }
      this.updateLCD();
    }
  }
}

if (typeof window !== "undefined") {
  window.LabThermometer = LabThermometer;
}
