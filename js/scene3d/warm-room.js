/** Warm classroom geometry derived from sicak-sinif-laboratuvari/lab.js. */
function buildWarmClassroom(scene) {
  const room=new THREE.Group(); room.name='warm-classroom'; scene.add(room);
  const t={wall:'#efe1c8',floor:'#c6ad8b',cabinet:'#a6b69a',wood:'#aa7a49',tile:'#eee7d9',metal:'#76664f'};
  const mat=(color,roughness=.7)=>{
    const material=new THREE.MeshStandardMaterial({color,roughness});
    material.color.convertSRGBToLinear(); return material;
  };
  const M=Object.fromEntries(Object.entries(t).map(([k,v])=>[k,mat(v)]));
  function box(w,h,d,x,y,z,m) {
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z);
    o.castShadow=true; o.receiveShadow=true; room.add(o); return o;
  }
  function cabinet(x,z,w) {
    box(w,1.13,.64,x,.62,z,M.cabinet); box(w+.08,.1,.76,x,1.23,z,mat('#f0e8d7',.45));
    const n=Math.round(w/.85);
    for(let i=0;i<n;i++) {const cx=x-w/2+(i+.5)*w/n; box(w/n-.025,.96,.026,cx,.66,z+.334,M.cabinet); box(.24,.032,.045,cx,1.02,z+.369,M.wood);}
    box(w,.09,.6,x,.095,z,M.metal);
  }
  box(12,.12,12,0,-.06,0,M.floor);
  const grout=mat('#b79b79');
  for(let x=-6;x<=6;x+=1.2) box(.012,.002,12,x,.003,0,grout);
  for(let z=-6;z<=6;z+=1.2) box(12,.002,.012,0,.004,z,grout);
  box(12,4.8,.15,0,2.4,-4.8,M.wall); box(.15,4.8,10,-6,2.4,.1,M.wall); box(12,.11,.12,0,.1,-4.68,M.metal);
  box(9.2,1.55,.035,0,2.03,-4.69,M.tile);
  const tileGrout=mat('#c2c9c4');
  for(let x=-4.6;x<4.7;x+=.32) box(.009,1.55,.01,x,2.03,-4.663,tileGrout);
  for(let y=1.3;y<2.8;y+=.32) box(9.2,.009,.01,0,y,-4.66,tileGrout);
  for(const x of [-3,0,3]) cabinet(x,-4.25,2.8);
  for(const y of [2.85,3.5]) {box(7.8,.075,.36,0,y,-4.48,M.wood); for(const x of [-3.2,3.2]) box(.035,.28,.035,x,y-.15,-4.57,M.metal);}
  for(let i=0;i<16;i++) box(.07,2.9,.06,4.75+i*.064,2.45,-4.65,M.wood);
  box(.03,2.05,3.1,-5.905,2.82,-1.2,new THREE.MeshBasicMaterial({color:'#e9f2e4'}));
  const frame=mat('#f9f8f0');
  for(const z of [-2.79,.39]) box(.19,2.22,.085,-5.83,2.82,z,frame);
  for(const y of [1.72,3.91]) box(.19,.085,3.25,-5.83,y,-1.2,frame);
  box(.19,2.17,.055,-5.81,2.82,-1.2,frame); box(.19,.055,3.16,-5.81,2.8,-1.2,frame); box(.38,.09,3.4,-5.76,1.68,-1.2,frame);
  const c=document.createElement('canvas'); c.width=2048; c.height=256;
  const ctx=c.getContext('2d'); ctx.fillStyle=t.wall; ctx.fillRect(0,0,c.width,c.height);
  const signText='MEBİ KİMYA LABORATUVARI';
  ctx.fillStyle='#536a53'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='600 92px Segoe UI'; ctx.fillText(signText,1024,128);
  const signTexture=new THREE.CanvasTexture(c); signTexture.encoding=THREE.sRGBEncoding;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.39),new THREE.MeshBasicMaterial({map:signTexture}));
  sign.name='laboratory-sign'; sign.userData.label=signText;
  sign.position.set(0,4.23,-4.7); room.add(sign);
  const tableMaterial=mat('#315e50',.78),table=box(7,.15,2.2,0,1.34,0,tableMaterial); table.name='experiment-table';
  box(6.95,.035,2.16,0,1.255,0,M.wood); box(6.5,1.13,1.75,0,.65,0,M.wood);
  for(let i=0;i<7;i++) {const x=-2.79+i*.93; box(.89,.96,.025,x,.69,.889,M.cabinet); box(.28,.025,.04,x,1.03,.918,M.wood);}
  box(6.28,.1,1.56,0,.13,0,M.metal);
  for(const x of [-2,2]) {box(.022,.7,.022,x,4.4,.05,M.metal); box(1.45,.065,.38,x,4.04,.05,M.metal); box(1.34,.012,.3,x,4,.05,new THREE.MeshBasicMaterial({color:'#fff9dc'}));}
  return {room,tableMaterial};
}
