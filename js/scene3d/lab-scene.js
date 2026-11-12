class LabSceneEngine {
  constructor(containerId,stateMachine) {
    this.container=document.getElementById(containerId); this.state=stateMachine;
    this.initThree(); this.initLights(); this.environment=buildWarmClassroom(this.scene);
    this.initGlassEnvironment();
    this.laboratoryLighting='light';
    try{localStorage.removeItem('three-faces-laboratory-lighting');localStorage.removeItem('three-faces-table-color');}catch{}
    this.glassware=new LabGlassware(this.scene,this.glassEnvironment.texture,this.renderer.capabilities.getMaxAnisotropy()); this.particles=new LabParticleManager(this.scene,this.glassware);
    this.thermometer=new LabThermometer(this.scene);
    const main=LAB_VESSELS.main;
    this.thermometer.group.position.set(main.x-main.radius*.7,LAB_VESSELS.tableY+main.height+.085,main.z-.03);
    this.thermometer.group.rotation.set(0,0,0); this.thermometer.group.scale.setScalar(main.height/.38);
    this.thermometer.group.visible=false;
    this.pourController=new LabPourController(this.glassware,this.thermometer,this.particles,this.state);
    this.reagentTables=new LabReagentTables(this);
    this.reagentTableIndex=0;
    this.createPourIndicator();
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
    this.controls.enableDamping=true; this.controls.dampingFactor=.07; this.controls.enablePan=true;
    this.controls.screenSpacePanning=true; this.controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;
    this.controls.target.copy(this.cameraPresets[initial].target); this.controls.minDistance=1.2; this.controls.maxDistance=9;
    this.controls.maxPolarAngle=Math.PI*.47; this.controls.minPolarAngle=.35;
    this.controls.minAzimuthAngle=THREE.MathUtils.degToRad(-75);
    this.controls.maxAzimuthAngle=THREE.MathUtils.degToRad(75);
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

  initGlassEnvironment() {
    // Match antigravity/tepkime-arenasi's dedicated Cam Atolyesi reflection studio.
    const studio=new THREE.Scene(); studio.background=new THREE.Color('#53615f').convertSRGBToLinear();
    for(const [x,y,z,w,h,color,intensity,targetY] of [
      [-12,7,3,8,18,0xffffff,3,4],[10,10,-5,6,19,0xffffff,2.5,4],
      [0,18,0,18,16,0xffffff,2,0],[0,7,16,5,15,0xffffff,1.5,4],
      [-9,6,-7,3,16,0x172321,.7,4],[7,6,9,1.4,17,0x26332e,.6,4]
    ]) {
      const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
      card.material.color.convertSRGBToLinear().multiplyScalar(intensity);
      card.position.set(x,y,z); card.lookAt(0,targetY,0); studio.add(card);
    }
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    this.glassEnvironment=pmrem.fromScene(studio,.025);
    pmrem.dispose();
    studio.traverse(object=>{if(object.isMesh){object.geometry.dispose();object.material.dispose();}});
  }

  setCameraPreset(key, duration=600, table=null) {
    clearTimeout(this.openingTimer);
    const preset=table===null?this.cameraPresets[key]:this.reagentTables.preset(table);
    if(!preset) return;
    this.currentPreset=key;
    this.reagentTables.show(table);
    this.controls.enabled=(table===null||table===-1)&&this.state.currentStage===1;
    this.cameraReady=false;
    const version=this.cameraVersion=(this.cameraVersion||0)+1;
    const position=this.camera.position.clone(),target=this.controls.target.clone(),fov=this.camera.fov,start=performance.now();
    this.onResize();
    const step=now=>{
      if(version!==this.cameraVersion) return;
      const p=Math.min(1,(now-start)/duration),ease=.5-Math.cos(p*Math.PI)/2;
      this.camera.position.lerpVectors(position,preset.pos,ease); this.controls.target.lerpVectors(target,preset.target,ease);
      const destination=table===null?preset:this.reagentTables.preset(table);
      this.camera.fov=THREE.MathUtils.lerp(fov,this.presetFov(destination),ease); this.camera.updateProjectionMatrix(); this.controls.update();
      if(p<1) requestAnimationFrame(step);
      else {
        this.cameraReady=true;
        this.updateReagentLabels();
      }
    };
    requestAnimationFrame(step);
    for(const [id,value] of [['btnCamDesk','desk'],['btnCamWide','wide']]) {
      const button=document.getElementById(id); button.classList.toggle('is-active',key===value); button.setAttribute('aria-pressed',String(key===value));
    }
  }

  showReagentTable(index) {
    if(this.state.currentStage!==1) return;
    this.reagentTableIndex=index;
    this.setCameraPreset('wide',this.prefersReducedMotion()?1:600,index);
  }

  updateReagentLabels() {
    if(this.cameraReady) this.reagentTables?.project(this.camera,this.renderWidth,this.renderHeight);
  }

  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  selectReagentPair(pair) {
    if(!pair||!this.reagentTables.canSelect) return;
    this.reagentTableIndex=pair.table;
    window.labAudio?.playClick();
    if(pair===this.deskPair) {
      if(this.reagentTables.index!=null) this.setCameraPreset('desk',this.prefersReducedMotion()?1:600);
    } else if(this.deskPair&&!this.prefersReducedMotion()&&!window.__skipFillAnimation) {
      this.startReagentTransfer(this.deskPair,pair);
      this.glassware.isFilled=false;
      this.thermometer.group.visible=false;
      this.particles.clearAll();
      this.state.setSimulationState('waiting_pour');
      document.getElementById('obsWaitingTitle').textContent='Beherler değiştiriliyor';
      document.getElementById('obsWaitingDesc').textContent='Önceki çift karşı masadaki yerine dönüyor.';
    } else {
      this.applyReagentPair(pair);
    }
  }

  applyReagentPair(pair) {
    this.pendingReagentPair=pair;
    this.state.setReaction(pair.id);
    this.pendingReagentPair=null;
    document.getElementById('btnReactionToggle').focus({preventScroll:true});
  }

  startReagentTransfer(pair, nextPair=null) {
    const {main,added,beaker250RestPos,beaker80RestPos}=this.glassware;
    const vessels=[main.group,added.group], desk=[beaker250RestPos,beaker80RestPos];
    const shelf=pair.vessels.map(shell=>pair.group.localToWorld(shell.position.clone()));
    const origins=nextPair?desk:shelf, destinations=nextPair?shelf:desk;
    const solid=(!nextPair||this.state.simulationState==='waiting_pour')
      ?pair.vessels[0].getObjectByName('reagent-solid')?.clone():null;
    if(solid) main.group.add(solid);
    document.querySelector('.m3-stepper-pills').inert=true;
    this.reagentTransfer={pair,nextPair,vessels,desk,destinations,origins,solid,start:performance.now()};
    this.updateReagentTransfer(this.reagentTransfer.start);
  }

  updateReagentTransfer(time) {
    const transfer=this.reagentTransfer;
    if(!transfer) return;
    const progress=THREE.MathUtils.clamp((time-transfer.start)/1250,0,1);
    const travel=THREE.MathUtils.smoothstep(progress,.16,.84);
    const lift=THREE.MathUtils.smoothstep(progress,0,.22);
    const lower=THREE.MathUtils.smoothstep(progress,.77,1);
    transfer.vessels.forEach((vessel,i)=>{
      vessel.position.lerpVectors(transfer.origins[i],transfer.destinations[i],travel);
      vessel.position.y+=.51*lift*(1-lower);
      const shelfWeight=transfer.nextPair?travel:1-travel;
      vessel.scale.setScalar(THREE.MathUtils.lerp(1,transfer.pair.scale,shelfWeight));
    });
    if(progress<1) return;
    this.clearReagentTransfer();
    if(transfer.nextPair) {
      this.applyReagentPair(transfer.nextPair);
      return;
    }
    this.glassware.markFilled();
    this.thermometer.group.visible=true;
    this.showInitialSolid(this.state.getReaction());
    this.updateReagentLabels();
  }

  clearReagentTransfer() {
    const transfer=this.reagentTransfer;
    if(!transfer) return;
    if(transfer.solid) transfer.vessels[0].remove(transfer.solid);
    document.querySelector('.m3-stepper-pills').inert=false;
    transfer.vessels.forEach((vessel,i)=>{
      vessel.position.copy(transfer.desk[i]);
      vessel.scale.setScalar(1);
    });
    this.reagentTransfer=null;
  }

  showInitialSolid(reaction) {
    if(reaction?.fixedVessel.hasPrecipitate) {
      this.particles.spawnDissolveParticles(reaction.fixedVessel.precipitateColor??0xffffff,35);
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

  createPourIndicator() {
    this.readyRing=new THREE.Mesh(new THREE.TorusGeometry(.043,.004,8,48),new THREE.MeshBasicMaterial({color:'#e2bf70',transparent:true,opacity:.85,depthWrite:false}));
    this.readyRing.position.set(-this.glassware.added.radius,this.glassware.added.height,0);
    this.glassware.added.group.add(this.readyRing); this.readyRing.visible=false;
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
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{
      const inRoom=this.reagentTables.index!=null;
      if(!inRoom) {clearTimeout(this.openingTimer); this.cameraVersion=(this.cameraVersion||0)+1;}
      if(e.button!==0||this.state.currentStage!==1) return;
      const ray=this.pointerRay(e);
      const pair=this.reagentTables.hit(ray);
      if(pair) {
        this.reagentPress={pair,id:e.pointerId,x:e.clientX,y:e.clientY};
        return;
      }
      if(inRoom||this.state.simulationState!=='waiting_pour'||!this.glassware.isFilled) return;
      if(!ray.intersectObject(this.glassware.beaker80Group,true).length) return;
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
      const canDrag=this.reagentTables.index==null&&this.state.currentStage===1&&
        this.state.simulationState==='waiting_pour'&&this.glassware.isFilled;
      canvas.style.cursor=this.reagentTables.hit(ray)?'pointer':
        canDrag&&ray.intersectObject(this.glassware.beaker80Group,true).length?'grab':'default';
    });
    canvas.addEventListener('pointerup',e=>{
      const press=this.reagentPress;
      this.reagentPress=null;
      if(press&&press.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<12&&
          this.reagentTables.hit(this.pointerRay(e))===press.pair) this.selectReagentPair(press.pair);
      if(this.drag) {e.stopImmediatePropagation(); this.endDrag();}
    },true);
    canvas.addEventListener('pointercancel',()=>{this.reagentPress=null;this.endDrag(true);});
    canvas.addEventListener('lostpointercapture',()=>this.endDrag(true));
    canvas.addEventListener('pointerleave',()=>{this.reagentPress=null;});
    canvas.addEventListener('wheel',()=>{
      if(this.reagentTables.index!=null) return;
      clearTimeout(this.openingTimer); this.cameraVersion=(this.cameraVersion||0)+1;
    },{passive:true});
    this.state.on('reactionChange',reaction=>{
      const pair=this.reagentTables.pairs.find(entry=>entry.id===reaction?.id);
      const fromShelf=pair&&pair===this.pendingReagentPair;
      const move=fromShelf&&!this.prefersReducedMotion()&&!window.__skipFillAnimation;
      this.clearReagentTransfer();
      this.endDrag(true);
      if(this.deskPair) this.deskPair.group.visible=true;
      this.deskPair=pair;
      if(pair) pair.group.visible=false;
      this.setCameraPreset('desk',move?1100:fromShelf?1:600);
      this.glassware.setupReaction(reaction,!fromShelf&&!window.__skipFillAnimation,!move);
      this.thermometer.group.visible=Boolean(reaction)&&!move;
      this.thermometer.reset(reaction?.fixedVessel.initialTemp??22); this.particles.clearAll();
      if(move) this.startReagentTransfer(pair);
      else this.showInitialSolid(reaction);
    });
    this.state.on('simulationChange',()=>this.updateReagentLabels());
    this.state.on('stageChange',()=>{
      document.body.dataset.stage=String(this.state.currentStage);
      if (this.state.currentStage !== 1) this.endDrag(true);
      if(this.state.currentStage!==1&&this.reagentTables.index!=null) this.setCameraPreset('desk');
      const table=this.reagentTables.index;
      this.controls.enabled = this.state.currentStage === 1&&(table==null||table===-1);
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
    const table=this.reagentTables?.index;
    this.camera.fov=this.presetFov(table==null?this.cameraPresets[this.currentPreset]:this.reagentTables.preset(table));
    const area = document.querySelector('.lab-scene-window').getBoundingClientRect();
    const header = document.querySelector('.m3-top-app-bar').getBoundingClientRect();
    if (this.state.currentStage === 1 && area.width && area.height) {
      const top = Math.max(area.top, header.bottom + 8), bottom = Math.min(area.bottom, h - 12);
      this.observationView = { x: (area.left + area.width / 2) / w, y: (bottom > top ? (top + bottom) / 2 : h * .58) / h };
    }
    const centre = table==null?(this.observationView || { x: .5, y: .58 }):{x:.5,y:.5};
    if(table!=null) this.reagentTables.panel.style.setProperty('--reagent-nav-top',`${header.bottom+8}px`);
    this.camera.setViewOffset(w,h,w*(.5-centre.x),h*(.5-centre.y),w,h);
    this.camera.updateProjectionMatrix();
    this.updateReagentLabels();
  }

  projectLabels() {
    this.glassware.updateVolumeLabels();
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    const delta=Math.min(.1,(time-this.lastTime)/1000); this.lastTime=time;
    this.updateReagentTransfer(time);
    if(this.readyRing.visible) this.readyRing.scale.setScalar(1+.12*Math.sin(time*.008));
    this.pourController.update(time); this.thermometer.update(delta); this.particles.update(time/1000,delta); this.controls.update();
    this.camera.position.y=Math.max(1.52,this.camera.position.y);
    this.camera.position.x=THREE.MathUtils.clamp(this.camera.position.x,-5.4,5.4); this.camera.position.z=THREE.MathUtils.clamp(this.camera.position.z,-4.2,8.5);
    this.projectLabels(); this.renderer.render(this.scene,this.camera);
  }
}
window.LabSceneEngine=LabSceneEngine;
