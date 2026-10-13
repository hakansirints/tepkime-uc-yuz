/* Read-only inspection of the student's validated initial model.
 * Screen-space forces are qualitative; no species, bonds, charges or atom IDs are changed.
 */
(function () {
  function mount(host, items, sourceNames) {
    const T=window.THREE, catalog=window.CPKSpecies;
    host.innerHTML=`<section class="cpk-viewer" aria-label="Doğru başlangıç modelinin üç boyutlu görünümü"><div class="cpk-stage"><section class="cpk-source"><h4></h4><div class="cpk-field"></div></section><section class="cpk-source"><h4></h4><div class="cpk-field"></div></section></div><div class="cpk-legend" aria-label="CPK element renkleri"></div><div class="cpk-controls"><button type="button" class="mebi-btn mebi-btn-secondary cpk-play" aria-pressed="false">Etkileşimi başlat</button><button type="button" class="mebi-btn mebi-btn-secondary cpk-touch-mode" aria-pressed="false">Dokunarak taşı</button><button type="button" class="mebi-btn mebi-btn-secondary cpk-zoom" data-zoom="out" aria-label="Seçili modeli uzaklaştır">−</button><button type="button" class="mebi-btn mebi-btn-secondary cpk-zoom" data-zoom="in" aria-label="Seçili modeli yakınlaştır">+</button><span class="cpk-help">Sol: döndür · Sağ: taşı · Tekerlek: yakınlaş / uzaklaş</span><div class="cpk-pages" hidden><button type="button" class="mebi-btn mebi-btn-secondary" data-page="previous" aria-label="Önceki başlangıç türleri">←</button><span></span><button type="button" class="mebi-btn mebi-btn-secondary" data-page="next" aria-label="Sonraki başlangıç türleri">→</button></div></div><p class="cpk-status" role="status" aria-live="polite"></p></section>`;
    const root=host.firstElementChild,stage=root.querySelector('.cpk-stage'),sources=[...root.querySelectorAll('.cpk-source')],fields=sources.map(s=>s.querySelector('.cpk-field')),status=root.querySelector('.cpk-status'),play=root.querySelector('.cpk-play'),mode=root.querySelector('.cpk-touch-mode'),pages=root.querySelector('.cpk-pages');
    sources.forEach((s,i)=>s.querySelector('h4').textContent=sourceNames[i]);
    function unavailable(message) { status.textContent=message;root.querySelector('.cpk-controls').hidden=true;stage.hidden=true;root.querySelector('.cpk-legend').hidden=true;return {dispose(){host.replaceChildren();}}; }
    if (!T||!catalog) return unavailable('3B görünüm yüklenemedi. Modelime dönerek etkinliğe devam edebilirsin.');
    let renderer;
    try { renderer=new T.WebGLRenderer({antialias:true,alpha:true}); }
    catch { return unavailable('Bu cihaz 3B görünümü açamadı. Modelime dönerek veya sonraki adıma geçerek devam edebilirsin.'); }
    renderer.outputEncoding=T.sRGBEncoding;renderer.autoClear=false;renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.5),2));renderer.domElement.setAttribute('aria-hidden','true');stage.append(renderer.domElement);
    const sphere=new T.SphereGeometry(1,128,96),rod=new T.CylinderGeometry(1,1,1,32),bondMaterial=new T.MeshPhongMaterial({color:'#a9b9c5',specular:'#343c44',shininess:32});bondMaterial.color.convertSRGBToLinear();
    const materials={},textures={},units=[];let disposed=false,playing=false,touchMode='rotate',selected=null,page=0,pageCount=1,pageSize=Infinity,layer=0,raf=0,last=performance.now(),time=0;
    function atomMaterial(e) {
      if(materials[e])return materials[e];
      const m=new T.MeshPhongMaterial({color:catalog.colors[e],specular:'#10151a',shininess:20});m.color.convertSRGBToLinear();if(e==='C')m.color.multiplyScalar(.42);materials[e]=m;
      const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.font='400 360px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=e==='H'?'#536477':'#f5f8fc';ctx.shadowColor=e==='H'?'#fff':'#17232b';ctx.shadowBlur=1;ctx.fillText(e,256,266,464);const texture=new T.CanvasTexture(c);texture.encoding=T.sRGBEncoding;textures[e]=texture;
      return m;
    }
    function connector(group,a,b,r) {const delta=b.clone().sub(a),mesh=new T.Mesh(rod,bondMaterial);mesh.scale.set(r,delta.length(),r);mesh.position.copy(a.clone().add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());group.add(mesh);}
    function note(u) { return u.spec.note||(u.item.phase==='k'?'Katı tür tabanda kalır.':u.item.formula==='H⁺'?'H⁺, sulu protonun sadeleştirilmiş simgesidir.':'Yalnız görünüm değişir; tür ve atomlar korunur.'); }
    for(const item of items) {
      const spec=catalog.matchAtoms(item),source=item.source,cell=document.createElement('div'),hit=document.createElement('button'),formula=document.createElement('span');
      cell.className='cpk-unit';cell.dataset.speciesId=item.id;hit.type='button';hit.className='cpk-hit';hit.setAttribute('aria-label',item.formula+' modelini sol tuşla döndür, sağ tuşla taşı, tekerlekle yakınlaştır');formula.className='cpk-formula';formula.textContent=item.formula;cell.append(hit,formula);fields[source].append(cell);
      const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,20),model=new T.Group();scene.add(model);camera.position.set(0,0,6);camera.lookAt(0,0,0);
      scene.add(new T.AmbientLight('#edf6ff',.55));const key=new T.DirectionalLight('#fff',.95);key.position.set(-3,4,6);scene.add(key);const fill=new T.DirectionalLight('#b8d8ff',.32);fill.position.set(4,-1,3);scene.add(fill);const shine=new T.PointLight('#fff7e5',.18);shine.position.set(-2,2,4);scene.add(shine);
      const atoms=spec.atoms.map(a=>{const mesh=new T.Mesh(sphere,atomMaterial(a.e));mesh.position.set(a.x,a.y,a.z);mesh.scale.setScalar(a.r);mesh.userData.atomId=a.id;model.add(mesh);const label=new T.Sprite(new T.SpriteMaterial({map:textures[a.e],transparent:true,depthTest:true,depthWrite:false}));label.renderOrder=10;scene.add(label);return{...a,mesh,label};});
      spec.bonds.forEach(([a,b,n])=>{const start=atoms[a].mesh.position,end=atoms[b].mesh.position;if(n===1)connector(model,start,end,.035);else{const offset=new T.Vector3().crossVectors(end.clone().sub(start).normalize(),new T.Vector3(0,0,1)).normalize().multiplyScalar(.052);connector(model,start.clone().add(offset),end.clone().add(offset),.027);connector(model,start.clone().sub(offset),end.clone().sub(offset),.027);}});
      if(spec.rotation)model.rotation.set(...spec.rotation);
      const u={item,spec,source,cell,hit,formula,scene,camera,model,atoms,zoom:1,offset:{x:0,y:0},velocity:{x:0,y:0},base:{x:0,y:0,w:0,h:0},center:{x:0,y:0},radius:0,scale:1,visible:true,drag:null,layer:0,touched:false};units.push(u);
      hit.addEventListener('contextmenu',e=>e.preventDefault());
      hit.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;e.preventDefault();selected=u;u.touched=true;u.layer=++layer;cell.style.zIndex=String(layer+3);u.velocity={x:0,y:0};u.drag={mode:e.button===2||(e.pointerType!=='mouse'&&touchMode==='move')?'move':'rotate',x:e.clientX,y:e.clientY,q:model.quaternion.clone(),offset:{...u.offset}};hit.setPointerCapture(e.pointerId);status.textContent=item.formula+' · '+note(u);});
      hit.addEventListener('pointermove',e=>{if(!u.drag)return;const dx=e.clientX-u.drag.x,dy=e.clientY-u.drag.y;if(u.drag.mode==='move')move(u,u.drag.offset.x+dx,u.drag.offset.y+dy);else{const yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),dx*.011),pitch=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),dy*.011);model.quaternion.copy(yaw.multiply(pitch).multiply(u.drag.q));}paint();});
      const release=()=>{u.drag=null;move(u,u.offset.x,u.offset.y);paint();};hit.addEventListener('pointerup',release);hit.addEventListener('pointercancel',release);hit.addEventListener('lostpointercapture',()=>{if(u.drag)release();});
      hit.addEventListener('wheel',e=>{if(e.ctrlKey||!e.deltaY)return;e.preventDefault();selected=u;const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?u.base.h:1);zoom(u,Math.exp(-Math.max(-500,Math.min(500,delta))*.0014));},{passive:false});
      hit.addEventListener('focus',()=>{selected=u;});
      hit.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='||e.key==='-'){e.preventDefault();zoom(u,e.key==='-'?.85:1.15);return;}const horizontal=['ArrowLeft','ArrowRight'].includes(e.key),vertical=['ArrowUp','ArrowDown'].includes(e.key);if(!horizontal&&!vertical)return;e.preventDefault();selected=u;u.touched=true;const sign=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;if(e.shiftKey)move(u,u.offset.x+(horizontal?sign*12:0),u.offset.y+(vertical?sign*12:0));else model.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(vertical?1:0,horizontal?1:0,0),sign*.17));paint();});
    }
    const elements=[...new Set(items.flatMap(p=>p.atoms.map(a=>a.e)))];elements.forEach(e=>{const entry=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=catalog.colors[e];entry.append(swatch,e+' · '+catalog.names[e]);root.querySelector('.cpk-legend').append(entry);});
    function extent(u) {return Math.max(...u.atoms.map(a=>Math.hypot(a.x,a.y,a.z)+a.r));}
    function move(u,x,y) {
      if(!u.visible)return;const field=fields[u.source],width=field.clientWidth,height=field.clientHeight,ex=extent(u),baseScale=Math.min(u.base.w,u.base.h)/2.6;
      const maxZoom=Math.min(1.85,(width-16)/(2*ex*baseScale),(height-30)/(2*ex*baseScale));u.zoom=Math.max(.35,Math.min(maxZoom,u.zoom));u.scale=baseScale*u.zoom;u.radius=ex*u.scale;
      const minX=u.radius+5,maxX=width-u.radius-5,minY=u.radius+3,maxY=height-u.radius-24;
      const cx=Math.max(minX,Math.min(maxX,u.base.x+u.base.w/2+x)),cy=u.item.phase==='k'&&!u.drag?maxY:Math.max(minY,Math.min(maxY,u.base.y+u.base.h/2+y));
      if(Math.abs(cx-u.base.x-u.base.w/2-x)>.01)u.velocity.x*=-.18;if(Math.abs(cy-u.base.y-u.base.h/2-y)>.01)u.velocity.y*=-.18;
      u.offset.x=cx-u.base.x-u.base.w/2;u.offset.y=cy-u.base.y-u.base.h/2;u.center={x:cx,y:cy};u.cell.style.left=(u.base.x+u.offset.x)+'px';u.cell.style.top=(u.base.y+u.offset.y)+'px';const diameter=Math.max(44,2*u.radius+12);u.hit.style.position='absolute';u.hit.style.width=diameter+'px';u.hit.style.height=diameter+'px';u.hit.style.left=(u.base.w-diameter)/2+'px';u.hit.style.top=(u.base.h-diameter)/2+'px';u.hit.style.clipPath='circle(50% at 50% 50%)';
    }
    function zoom(u,factor) {u.zoom*=factor;move(u,u.offset.x,u.offset.y);paint();status.textContent=u.item.formula+' · '+Math.round(u.zoom*100)+'%';}
    function layout() {
      if(disposed||!stage.clientWidth||!stage.clientHeight)return;
      sources.forEach((source,i)=>fields[i].style.top=(source.querySelector('h4').offsetHeight+4)+'px');
      const maxCount=Math.max(...sources.map((_,i)=>units.filter(u=>u.source===i).length));pageSize=Math.min(...fields.map(f=>f.clientHeight))<260?2:maxCount;pageCount=Math.max(1,Math.ceil(maxCount/pageSize));page=Math.min(page,pageCount-1);
      sources.forEach((_,i)=>{const own=units.filter(u=>u.source===i),groups=[...new Set(own.map(u=>u.item.formula))].map(formula=>own.filter(u=>u.item.formula===formula)),ordered=[];for(let n=0;n<own.length;n++)groups.forEach(group=>{if(group[n])ordered.push(group[n]);});const visible=ordered.slice(page*pageSize,(page+1)*pageSize),cols=Math.min(2,Math.max(1,visible.length)),rows=Math.max(1,Math.ceil(visible.length/cols)),w=fields[i].clientWidth/cols,h=fields[i].clientHeight/rows;own.forEach(u=>{u.visible=visible.includes(u);u.cell.hidden=!u.visible;});visible.forEach((u,j)=>{u.base={x:(j%cols)*w,y:Math.floor(j/cols)*h,w,h};u.cell.style.width=w+'px';u.cell.style.height=h+'px';move(u,u.offset.x,u.offset.y);});});
      if(!selected?.visible)selected=units.find(u=>u.visible);pages.hidden=pageCount===1;pages.querySelector('span').textContent=(page+1)+' / '+pageCount;pages.querySelector('[data-page="previous"]').disabled=page===0;pages.querySelector('[data-page="next"]').disabled=page===pageCount-1;
      renderer.setSize(stage.clientWidth,stage.clientHeight,false);paint();
    }
    function paint() {
      if(disposed)return;const bounds=stage.getBoundingClientRect();renderer.setScissorTest(false);renderer.setViewport(0,0,bounds.width,bounds.height);renderer.clear();renderer.setScissorTest(true);
      units.filter(u=>u.visible).sort((a,b)=>a.layer-b.layer).forEach(u=>{const s=sources[u.source].getBoundingClientRect(),f=fields[u.source].getBoundingClientRect(),scale=u.scale,cx=f.left-s.left+u.center.x,cy=s.bottom-f.top-u.center.y;
        u.camera.left=-cx/scale;u.camera.right=(s.width-cx)/scale;u.camera.top=(s.height-cy)/scale;u.camera.bottom=-cy/scale;u.camera.updateProjectionMatrix();u.scene.updateMatrixWorld(true);let bottom=-Infinity;
        u.atoms.forEach(a=>{const p=a.mesh.getWorldPosition(new T.Vector3());bottom=Math.max(bottom,(a.r-p.y)*scale);const size=Math.max(11,Math.min(32,a.r*2*scale*.85))/scale;a.label.position.copy(p).add(new T.Vector3(0,0,a.r*1.025));a.label.scale.set(size,size,1);});u.formula.style.top=(u.base.h/2+bottom+8)+'px';
        renderer.setViewport(s.left-bounds.left,bounds.bottom-s.bottom,s.width,s.height);renderer.setScissor(f.left-bounds.left,bounds.bottom-f.bottom,f.width,f.height);renderer.clearDepth();renderer.render(u.scene,u.camera);
      });renderer.setScissorTest(false);
    }
    function forces() {
      const out=units.map(()=>({x:0,y:0}));for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){const a=units[i],b=units[j];if(!a.visible||!b.visible||a.source!==b.source||a.item.phase==='k'||b.item.phase==='k')continue;const dx=b.center.x-a.center.x,dy=b.center.y-a.center.y,d=Math.max(.01,Math.hypot(dx,dy)),nx=d>.02?dx/d:1,ny=d>.02?dy/d:0,contact=a.radius+b.radius+12;
        const electric=-a.spec.charge*b.spec.charge*900000*Math.exp(-d/220)/(d*d+3600),repel=Math.max(0,contact-d)*35,magnitude=electric-repel;out[i].x+=nx*magnitude;out[i].y+=ny*magnitude;out[j].x-=nx*magnitude;out[j].y-=ny*magnitude;
      }return out;
    }
    function step(dt,noise=true) {dt=Math.min(1/60,Math.max(0,dt));const force=forces();units.forEach((u,i)=>{if(!u.visible||u.drag||u.item.phase==='k'){u.velocity={x:0,y:0};return;}const damp=Math.exp(-1.45*dt),jitter=noise?5*Math.sqrt(dt):0;u.velocity.x=(u.velocity.x+force[i].x*dt)*damp+(Math.random()-.5)*jitter;u.velocity.y=(u.velocity.y+force[i].y*dt)*damp+(Math.random()-.5)*jitter;const speed=Math.hypot(u.velocity.x,u.velocity.y);if(speed>38){u.velocity.x*=38/speed;u.velocity.y*=38/speed;}move(u,u.offset.x+u.velocity.x*dt,u.offset.y+u.velocity.y*dt);if(noise&&!u.touched&&u.spec.bonds.length)u.model.rotation.y+=Math.sin(time*.6+i)*dt*.025;});}
    function loop(now) {if(disposed)return;const visible=!document.hidden&&!document.body.classList.contains('portrait-blocked')&&host.checkVisibility();if(playing&&visible){const dt=Math.min(.05,(now-last)/1000);time+=dt;const n=Math.max(1,Math.ceil(dt*60));for(let i=0;i<n;i++)step(dt/n);paint();}last=now;raf=requestAnimationFrame(loop);}
    play.onclick=()=>{playing=!playing;play.textContent=playing?'Etkileşimi durdur':'Etkileşimi başlat';play.setAttribute('aria-pressed',String(playing));status.textContent=playing?'Yakınlaşma yeni bağ oluşturmaz; hareket ve mesafeler temsilîdir.':'Etkileşim durdu. Türleri inceleyebilirsin.';};
    mode.onclick=()=>{touchMode=touchMode==='rotate'?'move':'rotate';mode.textContent=touchMode==='move'?'Dokunarak döndür':'Dokunarak taşı';mode.setAttribute('aria-pressed',String(touchMode==='move'));};
    root.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{if(selected)zoom(selected,b.dataset.zoom==='in'?1.15:.85);});
    pages.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page+=b.dataset.page==='next'?1:-1;units.forEach(u=>u.velocity={x:0,y:0});layout();});
    status.textContent=items.some(p=>p.phase==='g')?'Kaynak çözeltilerin üstündeki gaz türleri gösteriliyor.':items.some(p=>p.phase==='k')?'Katı örgünün temsilî birimi tabanda kalır.':'Hareket ve mesafeler temsilîdir; yakınlaşma yeni bağ oluşturmaz.';
    const observer=new ResizeObserver(layout);observer.observe(stage);const unsubscribe=window.LandscapeTasks?.subscribe(layout)||(()=>{});layout();raf=requestAnimationFrame(loop);
    return {get units(){return units;},get playing(){return playing;},get disposed(){return disposed;},get page(){return page;},get pageCount(){return pageCount;},renderer,forces,step,paint,layout,
      dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();unsubscribe();units.forEach(u=>u.atoms.forEach(a=>a.label.material.dispose()));Object.values(materials).forEach(m=>m.dispose());Object.values(textures).forEach(t=>t.dispose());sphere.dispose();rod.dispose();bondMaterial.dispose();renderer.dispose();renderer.forceContextLoss();host.replaceChildren();}
    };
  }
  window.CPKModelViewer={mount};
})();
