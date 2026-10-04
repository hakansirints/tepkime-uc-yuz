const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
global.THREE = require('../js/vendor/three.min.js');
const ctx = new Proxy({}, {get: () => () => {}});
global.document = {createElement: () => ({width:0,height:0,getContext:()=>ctx}), getElementById:()=>null};
global.requestAnimationFrame = () => {};
global.labState = {simulationState:'waiting_pour'};
for (const file of ['js/data/reactions-data.js','js/scene3d/glassware.js','js/scene3d/particle-system.js']) {
  vm.runInThisContext(fs.readFileSync(file,'utf8'), {filename:file});
}
const scene = new THREE.Scene();
const glass = new LabGlassware(scene);
const particles = new LabParticleManager(scene,glass);
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
near(glass.main.radius*2/glass.main.height,67/92);
near(glass.added.radius*2/glass.added.height,67/92);
near((glass.added.height/glass.main.height)**3,80/250);
assert.ok(glass.beaker80RestPos.x-glass.beaker250RestPos.x>glass.main.radius+glass.added.radius);
let checks=0;
for (const reaction of Object.values(REACTIONS_DATA)) {
  assert.ok(reaction.fixedVessel.volume<=250);
  assert.ok(reaction.addedVessel.volume<=80);
  assert.ok(reaction.fixedVessel.volume+reaction.addedVessel.volume<=250);
  glass.setupReaction(reaction,false);
  near(glass.main.volume,reaction.fixedVessel.volume);
  near(glass.added.volume,reaction.addedVessel.volume);
  for (const progress of [0,.1,.22,.35,.5,.65,.8,.9,1]) {
    glass.setPourProgress(progress);
    near(glass.main.volume+glass.added.volume,reaction.fixedVessel.volume+reaction.addedVessel.volume);
    assert.ok(glass.main.bottom+glass.beaker250LiquidHeight<glass.main.height);
    assert.ok(glass.added.group.position.y>=LAB_VESSELS.tableY-1e-8);
    assert.ok(Number.isFinite(glass.streamMesh.scale.y)); checks++;
  }
  near(glass.added.volume,0);
  near(glass.added.group.rotation.z,0);
  near(glass.added.group.position.distanceTo(glass.beaker80RestPos),0);
  if(reaction.result.bubbles) particles.startBubbles(reaction.result.bubbles);
  if(reaction.result.precipitate) particles.startPrecipitate(reaction.result.precipitate);
  particles.update(1,.016);
  particles.clearAll();
  assert.equal(particles.bubbleGroup.children.length,0);
  assert.equal(particles.precipitateGroup.children.length,0);
}
glass.setEmptyState();
assert.equal(glass.isFilled,false); assert.equal(glass.main.liquid.visible,false);
glass.setupReaction(Object.values(REACTIONS_DATA)[0],false);
// Sample the moving outer wall at 101 positions; it must clear the main rim/wall.
for(let k=0;k<=100;k++) {
  glass.setPourProgress(k/100); glass.added.group.updateMatrixWorld(true);
  for(let i=0;i<40;i++) for(let j=0;j<30;j++) {
    const angle=i/40*Math.PI*2;
    const p=new THREE.Vector3(glass.added.radius*Math.cos(angle),glass.added.height*j/29,glass.added.radius*Math.sin(angle));
    glass.added.group.localToWorld(p);
    const radius=Math.hypot(p.x-glass.main.x,p.z-glass.main.z);
    const inWall=p.y>LAB_VESSELS.tableY&&p.y<LAB_VESSELS.tableY+glass.main.height&&radius>glass.main.insideRadius&&radius<glass.main.radius+.002;
    assert.equal(inWall,false,`Moving vessel intersects main wall at ${k}%`);
  }
}
console.log(`PASS: ${Object.keys(REACTIONS_DATA).length} local reactions, ${checks} volume-conservation/geometry checks, particle reset, 67:92 shape and 80:250 capacity scaling.`);
console.log('PASS: Moving vessel clears the main wall at 101 sampled pour positions.');
