class LabSceneEngine {
  constructor(containerId,stateMachine) {
    this.container=document.getElementById(containerId); this.state=stateMachine;
    this.initThree(); this.initLights(); this.environment=buildWarmClassroom(this.scene);
    this.initLaboratoryLighting();
    this.glassware=new LabGlassware(this.scene); this.particles=new LabParticleManager(this.scene,this.glassware);
    this.thermometer=new LabThermometer(this.scene);
    const main=LAB_VESSELS.main;
    this.thermometer.group.position.set(main.x-main.radius*.7,LAB_VESSELS.tableY+main.height+.085,main.z-.03);
    this.thermometer.group.rotation.set(0,0,0); this.thermometer.group.scale.setScalar(main.height/.38);
    this.pourController=new LabPourController(this.glassware,this.thermometer,this.particles,this.state);
    this.createMaterialPreview();
    this.initEvents(); this.lastTime=performance.now(); this.animate=this.animate.bind(this); requestAnimationFrame(this.animate);
    this.startOpeningTour();
  }

  initThree() {
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color('#e7e6dd');
    this.camera=new THREE.PerspectiveCamera(40,1,.05,80);
    this.cameraPresets={
      desk:{pos:new THREE.Vector3(.10,2.40,3.20),target:new THREE.Vector3(0,1.78,.34),fov:40},
      wide:{pos:new THREE.Vector3(3.8,3.45,5.5),target:new THREE.Vector3(0,1.6,-.9),fov:52}
    };
    const initial=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'desk':'wide';
    this.currentPreset=initial; this.camera.position.copy(this.cameraPresets[initial].pos); this.camera.lookAt(this.cameraPresets[initial].target);
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75)); this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap; this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.92; this.renderer.outputEncoding=THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement); this.renderer.domElement.setAttribute('aria-label','İki beherli üç boyutlu deney masası');
    this.controls=new THREE.OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true; this.controls.dampingFactor=.07; this.controls.enablePan=false;
    this.controls.target.copy(this.cameraPresets[initial].target); this.controls.minDistance=1.2; this.controls.maxDistance=9;
    this.controls.maxPolarAngle=Math.PI*.47; this.controls.minPolarAngle=.35;
    this.controls.update(); this.onResize();
  }

  initLights() {
    const ambient=new THREE.HemisphereLight('#f2f7ff','#b5aa8b',.95); this.scene.add(ambient);
    const sun=new THREE.DirectionalLight('#fff4dc',1.35); sun.position.set(-4,7,4); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-9; sun.shadow.camera.right=9;
    sun.shadow.camera.top=8; sun.shadow.camera.bottom=-8; sun.shadow.normalBias=.02; sun.shadow.bias=-.0002; this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#edf6ff',.50); fill.position.set(3,4,1); this.scene.add(fill);
    this.roomLights=[ambient,sun,fill];
  }

  initLaboratoryLighting() {
    const seen=new Set(); this.roomMaterialColors=[];
    this.environment.room.traverse(object=>{
      const materials=Array.isArray(object.material)?object.material:[object.material];
      materials.filter(Boolean).forEach(material=>{
        if(!material.color||seen.has(material)||material===this.environment.tableMaterial)return;
        seen.add(material); this.roomMaterialColors.push({material,color:material.color.clone()});
      });
    });
    const button=document.getElementById('btnLabLighting');
    button.addEventListener('click',()=>this.setLaboratoryLighting(this.laboratoryLighting==='dark'?'light':'dark'));
    let mode='light'; try{mode=localStorage.getItem('three-faces-laboratory-lighting')||'light';}catch{}
    this.setLaboratoryLighting(mode);
  }

  setLaboratoryLighting(mode) {
    const dark=mode==='dark'; this.laboratoryLighting=dark?'dark':'light';
    this.roomMaterialColors.forEach(({material,color})=>{material.color.copy(color);if(dark)material.color.multiplyScalar(.30);});
    this.scene.background.set(dark?'#181b21':'#e7e6dd');
    this.roomLights[0].intensity=dark?.65:.95; this.roomLights[1].intensity=dark?.50:1.35; this.roomLights[2].intensity=dark?.35:.50;
    this.renderer.toneMappingExposure=dark?.80:.92;
    const button=document.getElementById('btnLabLighting');
    button.textContent=dark?'☾ Ortam: Karanlık':'☀ Ortam: Aydınlık';
    button.setAttribute('aria-pressed',String(dark)); button.setAttribute('aria-label',dark?'Laboratuvarı aydınlık yap':'Laboratuvarı karanlık yap');
    try{localStorage.setItem('three-faces-laboratory-lighting',this.laboratoryLighting);}catch{}
  }

  setCameraPreset(key, duration=600) {
    clearTimeout(this.openingTimer);
    const preset=this.cameraPresets[key]; if(!preset) return;
    this.currentPreset=key;
    const version=this.cameraVersion=(this.cameraVersion||0)+1;
    const position=this.camera.position.clone(),target=this.controls.target.clone(),fov=this.camera.fov,start=performance.now();
    const step=now=>{
      if(version!==this.cameraVersion) return;
      const p=Math.min(1,(now-start)/duration),ease=.5-Math.cos(p*Math.PI)/2;
      this.camera.position.lerpVectors(position,preset.pos,ease); this.controls.target.lerpVectors(target,preset.target,ease);
      this.camera.fov=THREE.MathUtils.lerp(fov,this.presetFov(preset),ease); this.camera.updateProjectionMatrix(); this.controls.update();
      if(p<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    for(const [id,value] of [['btnCamDesk','desk'],['btnCamWide','wide']]) {
      const button=document.getElementById(id); button.classList.toggle('is-active',key===value); button.setAttribute('aria-pressed',String(key===value));
    }
  }

  resetCamera() {this.setCameraPreset('desk');}

  startOpeningTour() {
    if(this.currentPreset!=='wide') return;
    document.getElementById('btnCamDesk').classList.remove('is-active');
    document.getElementById('btnCamDesk').setAttribute('aria-pressed','false');
    document.getElementById('btnCamWide').classList.add('is-active');
    document.getElementById('btnCamWide').setAttribute('aria-pressed','true');
    this.openingTimer=setTimeout(()=>this.setCameraPreset('desk',2500),1100);
  }

  createMaterialPreview() {
    this.previewGroup=new THREE.Group(); this.scene.add(this.previewGroup); this.hoverIndex=null;
    const material=new THREE.MeshBasicMaterial({color:'#b69842',transparent:true,opacity:.9,depthWrite:false});
    this.previewDots=Array.from({length:8},()=>{const dot=new THREE.Mesh(new THREE.SphereGeometry(.011,8,6),material); dot.renderOrder=7; this.previewGroup.add(dot); return dot;});
    this.previewGroup.visible=false;
    this.readyRing=new THREE.Mesh(new THREE.TorusGeometry(.043,.004,8,48),new THREE.MeshBasicMaterial({color:'#e2bf70',transparent:true,opacity:.85,depthWrite:false}));
    this.readyRing.position.set(-this.glassware.added.radius,this.glassware.added.height,0);
    this.glassware.added.group.add(this.readyRing); this.readyRing.visible=false;
  }

  setMaterialHover(index) {this.hoverIndex=this.state.getReaction()?index:null;}
  previewMaterial(index) {this.setMaterialHover(index); clearTimeout(this.previewTimer); this.previewTimer=setTimeout(()=>this.setMaterialHover(null),1500);}

  updateMaterialPreview(time) {
    this.previewGroup.visible=this.hoverIndex!==null&&this.state.simulationState==='waiting_pour'&&!this.drag;
    if(this.previewGroup.visible) {
      const vessel=this.hoverIndex===0?this.glassware.main:this.glassware.added;
      this.previewGroup.position.copy(vessel.group.position);
      this.previewDots.forEach((dot,i)=>{const a=time*.001+i*Math.PI/4;
        dot.position.set(Math.cos(a)*vessel.insideRadius*.65,vessel.bottom+this.glassware.heightForVolume(vessel,vessel.volume)*(.4+.18*Math.sin(a*1.8+i)),Math.sin(a)*vessel.insideRadius*.65);});
    }
    if(this.readyRing.visible) {this.readyRing.scale.setScalar(1+.12*Math.sin(time*.008));}
  }

  pointerRay(event) {
    const rect=this.renderer.domElement.getBoundingClientRect();
    const ray=new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),this.camera); return ray;
  }

  endDrag(cancel=false) {
    if(!this.drag) return;
    const {progress,id}=this.drag; this.drag=null; this.controls.enabled=true;
    document.body.removeAttribute('data-grabbing'); document.body.removeAttribute('data-pour-ready'); this.readyRing.visible=false;
    const canvas=this.renderer.domElement; if(canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    document.getElementById('obsWaitingDesc').textContent='Küçük beheri sola ve yukarı sürükle veya dökme düğmesini kullan.';
    if(!cancel&&progress>=.20) this.pourController.startAutomaticPour(progress);
    else this.glassware.setPourProgress(0);
  }

  presetFov(preset) {
    const aspect=this.container.clientWidth/this.container.clientHeight;
    return aspect<.65?Math.max(preset.fov,60):preset.fov;
  }

  initEvents() {
    window.addEventListener('resize',()=>this.onResize());
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
    this.resizeObserver.observe(document.querySelector('.lab-scene-window'));
    document.getElementById('observationLayout').addEventListener('scroll', () => this.onResize(), { passive: true });
    document.getElementById('btnAutoPour').addEventListener('click',()=>this.pourController.startAutomaticPour());
    document.getElementById('btnResetPour').addEventListener('click',()=>this.state.setReaction(this.state.selectedReactionId,{restart:true}));
    document.querySelectorAll('[data-table-color]').forEach(button=>button.addEventListener('click',()=>{
      this.environment.tableMaterial.color.set(button.dataset.tableColor).convertSRGBToLinear();
      document.querySelectorAll('[data-table-color]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      try{localStorage.setItem('three-faces-table-color',button.dataset.tableColor);}catch{}
    }));
    try{
      const saved=localStorage.getItem('three-faces-table-color');
      const button=Array.from(document.querySelectorAll('[data-table-color]')).find(b=>b.dataset.tableColor===saved);
      if(button) button.click();
    }catch{}
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{
      clearTimeout(this.openingTimer); this.cameraVersion=(this.cameraVersion||0)+1;
      if(e.button!==0||this.state.simulationState!=='waiting_pour'||!this.glassware.isFilled) return;
      if(!this.pointerRay(e).intersectObject(this.glassware.beaker80Group,true).length) return;
      e.stopImmediatePropagation(); this.controls.enabled=false; canvas.setPointerCapture(e.pointerId);
      this.drag={x:e.clientX,y:e.clientY,id:e.pointerId,progress:0}; document.body.dataset.grabbing='true';
    },true);
    canvas.addEventListener('pointermove',e=>{
      if(this.drag&&e.pointerId===this.drag.id) {
        const distance=Math.max(0,(this.drag.x-e.clientX)*.65+(this.drag.y-e.clientY)*.8);
        const progress=Math.min(.22,distance/Math.min(this.container.clientWidth,this.container.clientHeight,520));
        this.drag.progress=progress; this.glassware.setPourProgress(progress);
        this.readyRing.visible=progress>=.20; document.body.dataset.pourReady=String(this.readyRing.visible);
        document.getElementById('obsWaitingDesc').textContent=this.readyRing.visible?'Dökme açısı hazır. Beheri bırakarak dök.':'Beheri sola ve yukarı taşı.';
        return;
      }
      const ray=this.pointerRay(e);
      const liquids=[this.glassware.main.liquid,this.glassware.added.liquid];
      const liquidHit=ray.intersectObjects(liquids.filter(mesh=>mesh.visible))[0];
      this.setMaterialHover(liquidHit?liquids.indexOf(liquidHit.object):null);
      canvas.style.cursor=ray.intersectObject(this.glassware.beaker80Group,true).length?'grab':'default';
    });
    canvas.addEventListener('pointerup',e=>{if(this.drag) {e.stopImmediatePropagation(); this.endDrag();}},true);
    canvas.addEventListener('pointercancel',()=>this.endDrag(true));
    canvas.addEventListener('lostpointercapture',()=>this.endDrag(true));
    canvas.addEventListener('pointerleave',()=>this.setMaterialHover(null));
    canvas.addEventListener('wheel',()=>{clearTimeout(this.openingTimer); this.cameraVersion=(this.cameraVersion||0)+1;},{passive:true});
    this.state.on('reactionChange',reaction=>{
      this.endDrag(true); this.setMaterialHover(null); this.setCameraPreset('desk'); this.glassware.setupReaction(reaction,!window.__skipFillAnimation);
      this.thermometer.reset(reaction?.fixedVessel.initialTemp??22); this.particles.clearAll();
      if(reaction?.fixedVessel.hasPrecipitate) this.particles.spawnDissolveParticles(reaction.fixedVessel.precipitateColor??0xffffff,35);
      this.onResize();
    });
    this.state.on('stageChange',()=>{
      document.body.dataset.stage=String(this.state.currentStage);
      if (this.state.currentStage !== 1) this.endDrag(true);
      this.controls.enabled = this.state.currentStage === 1;
      requestAnimationFrame(() => this.onResize());
    });
  }

  onResize() {
    if(!this.renderer) return;
    const w=this.container.clientWidth,h=this.container.clientHeight;
    if (!w || !h) return;
    if (this.renderWidth !== w || this.renderHeight !== h) {
      this.renderer.setSize(w,h); this.renderWidth = w; this.renderHeight = h;
    }
    this.camera.aspect=w/h;
    this.camera.fov=this.presetFov(this.cameraPresets[this.currentPreset]);
    const area = document.querySelector('.lab-scene-window').getBoundingClientRect();
    const header = document.querySelector('.m3-top-app-bar').getBoundingClientRect();
    if (this.state.currentStage === 1 && area.width && area.height) {
      const top = Math.max(area.top, header.bottom + 8), bottom = Math.min(area.bottom, h - 12);
      this.observationView = { x: (area.left + area.width / 2) / w, y: (bottom > top ? (top + bottom) / 2 : h * .58) / h };
    }
    const centre = this.observationView || { x: .5, y: .58 };
    this.camera.setViewOffset(w,h,w*(.5-centre.x),h*(.5-centre.y),w,h);
    this.camera.updateProjectionMatrix();
  }

  projectLabels() {
    this.glassware.updateVolumeLabels();
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    const delta=Math.min(.1,(time-this.lastTime)/1000); this.lastTime=time;
    this.pourController.update(time); this.updateMaterialPreview(time); this.thermometer.update(delta); this.particles.update(time/1000,delta); this.controls.update();
    this.camera.position.y=Math.max(1.52,this.camera.position.y);
    this.camera.position.x=THREE.MathUtils.clamp(this.camera.position.x,-5.4,5.4); this.camera.position.z=THREE.MathUtils.clamp(this.camera.position.z,-4.2,8.5);
    this.projectLabels(); this.renderer.render(this.scene,this.camera);
  }
}
window.LabSceneEngine=LabSceneEngine;
