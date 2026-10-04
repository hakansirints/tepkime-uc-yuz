/** Shell adapted from Tepkime Arenası. All experiment data belongs to this project. */
const LAB_VESSELS = (() => {
  const height = 0.38 * 1.5, radius = height * (67 / 92) / 2, ratio = Math.cbrt(80 / 250);
  return Object.freeze({tableY: 1.425,
    main: Object.freeze({capacity:250,height,radius,x:-0.23,z:0.34}),
    added: Object.freeze({capacity:80,height:height*ratio,radius:radius*ratio,x:0.245,z:0.34})});
})();
window.LAB_VESSELS = LAB_VESSELS;

class LabGlassware {
  constructor(scene) {
    this.scene=scene; this.fillVersion=0;
    this.main=this.createBeaker(LAB_VESSELS.main); this.added=this.createBeaker(LAB_VESSELS.added);
    this.beaker250Group=this.main.group; this.beaker80Group=this.added.group;
    this.beaker250RestPos=this.main.group.position.clone(); this.beaker80RestPos=this.added.group.position.clone();
    this.liquid250Mat=this.main.liquid.material; this.liquid80Mat=this.added.liquid.material;
    this.liquid250Mesh=this.main.liquid; this.liquid80Mesh=this.added.liquid;
    this.meniscusGroup250=this.main.surface; this.meniscusGroup80=this.added.surface;
    this.streamMat=new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.6,roughness:.2});
    this.streamMesh=new THREE.Mesh(new THREE.CylinderGeometry(.008,.011,1,12,20),this.streamMat);
    this.streamBase=this.streamMesh.geometry.attributes.position.array.slice();
    this.streamMesh.renderOrder=3; scene.add(this.streamMesh);
    this.ripples=Array.from({length:3},()=>{
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.03,.0018,6,48),new THREE.MeshBasicMaterial({color:'#e5f0e9',transparent:true,opacity:.3,depthWrite:false}));
      ring.rotation.x=-Math.PI/2; ring.renderOrder=3; scene.add(ring); return ring;
    });
    this.drops=Array.from({length:4},()=>{const drop=new THREE.Mesh(new THREE.SphereGeometry(.006,8,6),this.streamMat); scene.add(drop); return drop;});
    this.setEmptyState();
  }

  createBeaker(config) {
    const {radius,height,capacity}=config, unit=height/1.1;
    const group=new THREE.Group(); group.name=`beaker-${capacity}ml`;
    group.position.set(config.x,LAB_VESSELS.tableY,config.z); this.scene.add(group);
    // Arena's lathed inner/outer profile, with a common scale for every dimension.
    const points=[[0,.02],[radius-.05*unit,.02],[radius,.07],[radius,1.1],
      [radius-.022*unit,1.1],[radius-.022*unit,.075],[0,.075]].map(([x,y])=>new THREE.Vector2(x,y*unit));
    const glass=new THREE.MeshPhysicalMaterial({color:'#ffffff',metalness:0,roughness:.12,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false});
    const shell=new THREE.Mesh(new THREE.LatheGeometry(points,64),glass); shell.renderOrder=4; group.add(shell);
    const edge=new THREE.MeshStandardMaterial({color:'#d4e6e7',roughness:.22,transparent:true,opacity:.65,metalness:.1});
    for(const y of [.07*unit,height]) {
      const rim=new THREE.Mesh(new THREE.TorusGeometry(radius-.011*unit,.012*unit,8,64),edge);
      rim.rotation.x=Math.PI/2; rim.position.y=y; rim.renderOrder=5; group.add(rim);
    }
    const lip=new THREE.Mesh(new THREE.SphereGeometry(.035*unit,20,12),glass);
    lip.scale.set(1.6,.35,1.1); lip.position.set(-radius,height,0); group.add(lip);
    const bottom=.075*unit, usable=height*.80;
    const c=document.createElement('canvas'); c.width=512; c.height=1024;
    const ctx=c.getContext('2d'); ctx.strokeStyle='#274d46'; ctx.fillStyle='#274d46'; ctx.lineWidth=5;
    ctx.font='600 47px Segoe UI'; ctx.textBaseline='middle';
    const step=capacity===250?50:20;
    for(let ml=step/2;ml<=capacity;ml+=step/2) {
      const y=(1-(bottom+usable*ml/capacity)/height)*1024, major=ml%step===0;
      ctx.beginPath(); ctx.moveTo(28,y); ctx.lineTo(major?170:100,y); ctx.stroke();
      if(major) ctx.fillText(String(ml),190,y);
    }
    ctx.font='500 34px Segoe UI'; ctx.fillText(`${capacity} mL`,28,920);
    ctx.font='26px Segoe UI'; ctx.fillText('BORO 3.3',28,968);
    const marks=new THREE.Mesh(new THREE.CylinderGeometry(radius+.001,radius+.001,height,48,1,true,-.58,1.16),
      new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,side:THREE.FrontSide,depthWrite:false}));
    marks.position.y=height/2; marks.renderOrder=6; group.add(marks);
    const material=new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.4,roughness:.21,metalness:0,side:THREE.DoubleSide,depthWrite:false});
    const insideRadius=radius-.027*unit;
    const liquid=new THREE.Mesh(new THREE.CylinderGeometry(insideRadius,insideRadius,1,64),material);
    const positions=liquid.geometry.attributes.position;
    const topVertices=Array.from({length:positions.count},(_,i)=>positions.getY(i)>0);
    liquid.renderOrder=1; group.add(liquid);
    const surface=new THREE.Group(), disc=new THREE.Mesh(new THREE.CircleGeometry(insideRadius,64),material);
    disc.rotation.x=-Math.PI/2; surface.add(disc);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(insideRadius-.002,.0025,8,64),edge);
    ring.rotation.x=Math.PI/2; surface.add(ring); surface.renderOrder=2; group.add(surface);
    return {...config,group,bottom,usable,insideRadius,liquid,surface,topVertices,volume:0};
  }

  heightForVolume(vessel,volume) { return vessel.usable*THREE.MathUtils.clamp(volume/vessel.capacity,0,1); }

  setVolume(vessel,volume,angle=0) {
    vessel.volume=Math.max(0,volume);
    const height=this.heightForVolume(vessel,volume);
    vessel.liquid.visible=volume>.05;
    vessel.surface.visible=volume>.05&&angle<.05;
    // The top follows gravity in the tilted vessel's local coordinates.
    // Clamp to the interior so the visual mesh cannot pass through the rim/base.
    const positions=vessel.liquid.geometry.attributes.position;
    for(let i=0;i<positions.count;i++) {
      positions.setY(i,vessel.bottom+(vessel.topVertices[i]
        ?THREE.MathUtils.clamp(height-positions.getX(i)*Math.tan(angle),.0001,vessel.height-vessel.bottom-.012):0));
    }
    positions.needsUpdate=true;
    vessel.liquid.geometry.computeVertexNormals();
    vessel.liquid.geometry.computeBoundingSphere();
    vessel.liquid.scale.y=1; vessel.liquid.position.y=0;
    vessel.surface.position.y=vessel.bottom+height; vessel.surface.rotation.z=-angle;
    const surfaceScale=angle?Math.min(1,Math.sqrt(height/Math.max(.001,vessel.insideRadius*Math.tan(Math.min(angle,1.2))))):1;
    vessel.surface.scale.set(surfaceScale,1,surfaceScale);
    if(vessel===this.main) this.beaker250LiquidHeight=height; else this.beaker80LiquidHeight=height;
  }

  setEmptyState() {
    this.fillVersion++; this.isFilled=false;
    this.setVolume(this.main,0); this.setVolume(this.added,0);
    this.added.group.position.copy(this.beaker80RestPos); this.added.group.rotation.set(0,0,0);
    this.streamMesh.visible=false;
    this.ripples.forEach(ring=>ring.visible=false); this.drops.forEach(drop=>drop.visible=false);
  }

  setupReaction(reaction,animate=true) {
    this.setEmptyState(); if(!reaction) return;
    this.reaction=reaction; this.initialMainVolume=reaction.fixedVessel.volume; this.initialAddedVolume=reaction.addedVessel.volume;
    for(const [vessel,data] of [[this.main,reaction.fixedVessel],[this.added,reaction.addedVessel]]) {
      vessel.liquid.material.color.setHex(data.color); vessel.liquid.material.opacity=data.liquidOpacity??.55;
      vessel.liquid.material.emissive.setHex(0x000000);
    }
    this.streamMat.color.setHex(reaction.addedVessel.color);
    const version=this.fillVersion,start=performance.now();
    const fill=now=>{
      if(version!==this.fillVersion) return;
      const p=animate?Math.min(1,(now-start)/1100):1, eased=.5-Math.cos(p*Math.PI)/2;
      this.setVolume(this.main,this.initialMainVolume*eased); this.setVolume(this.added,this.initialAddedVolume*eased);
      this.updateVolumeLabels();
      if(p<1) requestAnimationFrame(fill);
      else {
        this.isFilled=true;
        const button=document.getElementById('btnAutoPour');
        if(window.labState.simulationState==='waiting_pour') {
          if(button) button.disabled=false;
          const description=document.getElementById('obsWaitingDesc');
          if(description) description.textContent="İki beher de hazır. 'Beheri dök ve karıştır' düğmesini kullan veya küçük beheri sola ve yukarı sürükleyip uygun açıda bırak; karışımda oluşan değişimleri gözlemle.";
        }
      }
    };
    fill(start);
  }

  updateVolumeLabels() {
    for(const [id,vessel] of [['fixedVolume',this.main],['addedVolume',this.added]]) {
      const el=document.getElementById(id); if(el) el.textContent=`${Math.round(vessel.volume)} / ${vessel.capacity} mL`;
    }
  }

  setPourProgress(progress) {
    if(!this.isFilled) return;
    progress=THREE.MathUtils.clamp(progress,0,1);
    const {radius:r,height:h}=this.added;
    const rest=this.beaker80RestPos.clone().add(new THREE.Vector3(-r,h,0));
    const target=this.beaker250RestPos.clone().add(new THREE.Vector3(this.main.radius*.30,this.main.height+.18,0));
    const mix=THREE.MathUtils.clamp((progress-.22)/.58,0,1), ease=p=>.5-Math.cos(p*Math.PI)/2;
    let theta,spout;
    if(progress<.22) {
      const p=ease(progress/.22); theta=.80*p; spout=rest.clone().lerp(target,p); spout.y+=Math.sin(p*Math.PI)*.16;
    } else if(progress<.80) {theta=THREE.MathUtils.lerp(.80,1.32,ease(mix)); spout=target.clone();}
    else {
      const p=ease((progress-.8)/.2); theta=1.32*(1-p); spout=target.clone().lerp(rest,p); spout.y+=Math.sin(p*Math.PI)*.12;
    }
    this.added.group.position.set(spout.x+r*Math.cos(theta)+h*Math.sin(theta),spout.y+r*Math.sin(theta)-h*Math.cos(theta),spout.z);
    this.added.group.rotation.z=theta;
    this.setVolume(this.added,this.initialAddedVolume*(1-mix),theta);
    this.setVolume(this.main,this.initialMainVolume+this.initialAddedVolume*mix);
    this.streamMesh.visible=progress>.22&&progress<.80;
    if(this.streamMesh.visible) {
      const end=this.beaker250RestPos.clone().add(new THREE.Vector3(this.main.radius*.3,this.main.bottom+this.beaker250LiquidHeight,0));
      const direction=end.clone().sub(spout);
      this.streamMesh.position.copy(spout).add(end).multiplyScalar(.5); this.streamMesh.scale.y=direction.length();
      this.streamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
      const positions=this.streamMesh.geometry.attributes.position;
      const strength=Math.sin(mix*Math.PI)**.4;
      for(let i=0;i<positions.count;i++) {
        const x=this.streamBase[i*3],y=this.streamBase[i*3+1],z=this.streamBase[i*3+2],t=.5-y;
        const taper=(.45+.55*strength)*(1-.25*t);
        positions.setXYZ(i,x*taper+Math.sin(t*Math.PI)*.008*Math.sin(progress*65+t*8),y,z*taper);
      }
      positions.needsUpdate=true; this.streamMesh.geometry.computeVertexNormals();
      this.streamMesh.geometry.computeBoundingSphere();
    }
    const active=progress>.22&&progress<.84;
    this.ripples.forEach((ring,i)=>{
      ring.visible=active;
      if(!active) return;
      const phase=(progress*12+i/3)%1;
      ring.position.set(this.main.x+this.main.radius*.3,LAB_VESSELS.tableY+this.main.bottom+this.beaker250LiquidHeight+.003,this.main.z);
      ring.scale.setScalar(.3+phase*3.2); ring.material.opacity=(1-phase)*.32;
    });
    this.drops.forEach((drop,i)=>{
      drop.visible=progress>.765&&progress<.83;
      if(!drop.visible) return;
      const t=THREE.MathUtils.clamp((progress-.765-i*.009)/.035,0,1);
      const end=this.beaker250RestPos.clone().add(new THREE.Vector3(this.main.radius*.3,this.main.bottom+this.beaker250LiquidHeight,0));
      drop.position.copy(target).lerp(end,t*t); drop.scale.set(1,1.5,1);
      drop.visible=t>0&&t<1;
    });
    if(active) this.main.surface.rotation.set(.006*Math.sin(progress*95),0,.008*Math.cos(progress*80));
    else this.main.surface.rotation.set(0,0,0);
    this.updateVolumeLabels();
  }

  lerpLiquidColor(targetHex,progress,targetOpacity=.8) {
    this.liquid250Mat.color.lerp(new THREE.Color(targetHex),progress);
    this.liquid250Mat.opacity=THREE.MathUtils.lerp(this.liquid250Mat.opacity,targetOpacity,progress);
  }
}
window.LabGlassware=LabGlassware;
