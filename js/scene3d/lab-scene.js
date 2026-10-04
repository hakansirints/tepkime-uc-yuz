class LabSceneEngine {
  constructor(containerId,stateMachine) {
    this.container=document.getElementById(containerId); this.state=stateMachine;
    this.initThree(); this.initLights(); this.environment=buildWarmClassroom(this.scene);
    this.glassware=new LabGlassware(this.scene); this.particles=new LabParticleManager(this.scene,this.glassware);
    this.thermometer=new LabThermometer(this.scene);
    const main=LAB_VESSELS.main;
    this.thermometer.group.position.set(main.x-main.radius*.7,LAB_VESSELS.tableY+main.height+.03,main.z-.03);
    this.thermometer.group.rotation.set(0,0,0); this.thermometer.group.scale.setScalar(main.height/.38);
    this.pourController=new LabPourController(this.glassware,this.thermometer,this.particles,this.state);
    this.createTableLabels(); this.createMaterialPreview();
    this.initEvents(); this.lastTime=performance.now(); this.animate=this.animate.bind(this); requestAnimationFrame(this.animate);
    this.startOpeningTour();
  }

  initThree() {
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color('#e7e6dd');
    this.camera=new THREE.PerspectiveCamera(40,1,.05,80);
    this.cameraPresets={
      desk:{pos:new THREE.Vector3(.10,2.40,2.90),target:new THREE.Vector3(0,1.84,.25),fov:40},
      closeup:{pos:new THREE.Vector3(-.03,2.07,1.85),target:new THREE.Vector3(-.02,1.7,.34),fov:38},
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
    this.scene.add(new THREE.HemisphereLight('#f2f7ff','#b5aa8b',.95));
    const sun=new THREE.DirectionalLight('#fff4dc',1.35); sun.position.set(-4,7,4); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-9; sun.shadow.camera.right=9;
    sun.shadow.camera.top=8; sun.shadow.camera.bottom=-8; sun.shadow.normalBias=.02; sun.shadow.bias=-.0002; this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#edf6ff',.50); fill.position.set(3,4,1); this.scene.add(fill);
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
    for(const [id,value] of [['btnCamDesk','desk'],['btnCamCloseup','closeup'],['btnCamWide','wide']]) {
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

  createTableLabels() {
    this.tableLabels=[this.glassware.main,this.glassware.added].map((vessel,index)=>{
      const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=512;
      const texture=new THREE.CanvasTexture(canvas); texture.encoding=THREE.sRGBEncoding; texture.anisotropy=this.renderer.capabilities.getMaxAnisotropy();
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.46,.36),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));
      mesh.rotation.x=-Math.PI/2; mesh.position.set(vessel.x,LAB_VESSELS.tableY+.005,.82);
      mesh.userData.materialIndex=index; this.scene.add(mesh);
      return {mesh,canvas,texture,index,lastText:''};
    });
  }

  updateTableLabels() {
    for(const label of this.tableLabels) {
      const prefix=label.index===0?'fixed':'added';
      const lines=[document.getElementById(prefix+'BeakerLabel').textContent,
        document.getElementById(prefix+'BeakerSub').textContent,document.getElementById(prefix+'Volume').textContent];
      const key=lines.join('|'); if(key===label.lastText) continue; label.lastText=key;
      const ctx=label.canvas.getContext('2d'); ctx.fillStyle='#f8f4e7'; ctx.fillRect(0,0,1024,512);
      ctx.strokeStyle='#d5d0bc'; ctx.lineWidth=8; ctx.strokeRect(8,8,1008,496);
      // Quiet paper grain, deterministic so repainting volumes doesn't shimmer.
      ctx.fillStyle='#ded8c528'; for(let i=0;i<350;i++) ctx.fillRect((i*127)%1000,(i*73)%500,3,2);
      ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillStyle='#74826c'; ctx.font='500 30px Segoe UI';
      ctx.fillText(label.index===0?'01 / REAKSİYON KABI':'02 / EKLEYEN BEHER',55,65);
      ctx.fillStyle='#2c4438'; ctx.font='600 60px Segoe UI';
      const words=lines[0].split(' '); let row='',y=150;
      for(const word of words) {
        const next=(row+' '+word).trim();
        if(ctx.measureText(next).width>905&&row) {ctx.fillText(row,55,y); y+=68; row=word;} else row=next;
      }
      ctx.fillText(row,55,y);
      ctx.font='40px Segoe UI'; ctx.fillStyle='#68735e'; ctx.fillText(lines[1],55,350,910);
      ctx.font='600 52px Segoe UI'; ctx.fillStyle='#315e50'; ctx.fillText(lines[2],55,430);
      label.texture.needsUpdate=true;
    }
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
    const hint=document.querySelector('.lab-scene-caption>span:last-child'); hint.textContent='Beheri tut ve sola, yukarı sürükle · Tekerlek: yakınlaş';
    if(!cancel&&progress>=.20) this.pourController.startAutomaticPour(progress);
    else this.glassware.setPourProgress(0);
  }

  presetFov(preset) {
    const aspect=this.container.clientWidth/this.container.clientHeight;
    return aspect<.65?Math.max(preset.fov,60):preset.fov;
  }

  initEvents() {
    window.addEventListener('resize',()=>this.onResize());
    document.getElementById('btnAutoPour').addEventListener('click',()=>this.pourController.startAutomaticPour());
    document.getElementById('btnResetPour').addEventListener('click',()=>this.state.setReaction(this.state.selectedReactionId));
    document.getElementById('btnCamReset').addEventListener('click',()=>this.resetCamera());
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
        const progress=Math.min(.22,distance/(Math.min(this.container.clientWidth,this.container.clientHeight)*.22)*.22);
        this.drag.progress=progress; this.glassware.setPourProgress(progress);
        this.readyRing.visible=progress>=.20; document.body.dataset.pourReady=String(this.readyRing.visible);
        document.querySelector('.lab-scene-caption>span:last-child').textContent=this.readyRing.visible?'Dökme açısı hazır · Bırakarak dök':'Beheri sola ve yukarı taşı';
        return;
      }
      const ray=this.pointerRay(e),hit=ray.intersectObjects(this.tableLabels.map(label=>label.mesh))[0];
      const liquids=[this.glassware.main.liquid,this.glassware.added.liquid];
      const liquidHit=ray.intersectObjects(liquids.filter(mesh=>mesh.visible))[0];
      this.setMaterialHover(hit?hit.object.userData.materialIndex:liquidHit?liquids.indexOf(liquidHit.object):null);
      canvas.style.cursor=hit?'pointer':ray.intersectObject(this.glassware.beaker80Group,true).length?'grab':'default';
    });
    canvas.addEventListener('pointerup',e=>{if(this.drag) {e.stopImmediatePropagation(); this.endDrag();}},true);
    canvas.addEventListener('pointercancel',()=>this.endDrag(true));
    canvas.addEventListener('lostpointercapture',()=>this.endDrag(true));
    canvas.addEventListener('pointerleave',()=>this.setMaterialHover(null));
    canvas.addEventListener('click',e=>{const hit=this.pointerRay(e).intersectObjects(this.tableLabels.map(label=>label.mesh))[0]; if(hit) this.previewMaterial(hit.object.userData.materialIndex);});
    canvas.addEventListener('wheel',()=>{clearTimeout(this.openingTimer); this.cameraVersion=(this.cameraVersion||0)+1;},{passive:true});
    this.state.on('reactionChange',reaction=>{
      this.endDrag(true); this.setMaterialHover(null); this.setCameraPreset('desk'); this.glassware.setupReaction(reaction,!window.__skipFillAnimation);
      this.thermometer.reset(reaction?.fixedVessel.initialTemp??22); this.particles.clearAll();
      if(reaction?.fixedVessel.hasPrecipitate) this.particles.spawnDissolveParticles(reaction.fixedVessel.precipitateColor??0xffffff,35);
      this.onResize();
    });
    this.state.on('stageChange',()=>{document.body.dataset.stage=String(this.state.currentStage);});
  }

  onResize() {
    if(!this.renderer) return;
    const w=this.container.clientWidth,h=this.container.clientHeight;
    this.renderer.setSize(w,h); this.camera.aspect=w/h;
    this.camera.fov=this.presetFov(this.cameraPresets[this.currentPreset]);
    if(w>1000) {
      const left=document.getElementById('reactionExpandCard').getBoundingClientRect().right+18;
      const right=document.getElementById('stage1Container').getBoundingClientRect().left-18;
      this.camera.setViewOffset(w,h,w/2-(left+right)/2,0,w,h);
    } else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  projectLabels() {
    if(this.state.currentStage!==1) return;
    this.updateTableLabels();
    const w=this.container.clientWidth,h=this.container.clientHeight;
    const project=(id,position,offset)=>{
      const el=document.getElementById(id),p=position.clone().project(this.camera);
      el.style.visibility=p.z<-1||p.z>1||Math.abs(p.x)>1.1||Math.abs(p.y)>1.1?'hidden':'visible';
      el.style.left=`${(p.x+1)*w/2}px`; el.style.top=`${(1-p.y)*h/2+offset}px`;
    };
    project('digitalTempBadge',this.thermometer.group.position,-52);
    this.glassware.updateVolumeLabels();
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    const delta=Math.min(.1,(time-this.lastTime)/1000); this.lastTime=time;
    this.pourController.update(time); this.updateMaterialPreview(time); this.thermometer.update(delta); this.particles.update(time/1000,delta); this.controls.update();
    this.camera.position.y=Math.max(1.52,this.camera.position.y);
    this.camera.position.x=THREE.MathUtils.clamp(this.camera.position.x,-5.4,5.4); this.camera.position.z=THREE.MathUtils.clamp(this.camera.position.z,-4.2,8.5);
    this.projectLabels(); if(this.state.currentStage===1) this.renderer.render(this.scene,this.camera);
  }
}
window.LabSceneEngine=LabSceneEngine;
