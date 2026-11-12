/* Reaction-specific, bounded 3D emitters. Velocities are world units/second.
 * Gas in a liquid is rendered as a transparent interface; the only visible
 * cloud in the current twelve-reaction set is solid NH4Cl aerosol. */
class LabReactionGasEffects {
  constructor(owner) {
    this.owner = owner;
    this.glassware = owner.glassware;
    this.vessel = owner.vessel;
    this.bubblePool = []; this.capPool = []; this.ripplePool = []; this.puffPool = [];
    this.caps = []; this.ripples = [];
    this.surfaceGroup = new THREE.Group();
    this.surfaceGroup.position.copy(owner.beakerPos); owner.scene.add(this.surfaceGroup);
    this.bubbleGeometry = new THREE.SphereBufferGeometry(1, 12, 8);
    this.capGeometry = new THREE.SphereBufferGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    this.rippleGeometry = new THREE.TorusBufferGeometry(1, .014, 4, 28);
    this.bubbleMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.FrontSide,
      uniforms: {},
      vertexShader: `varying vec3 bubbleNormal; varying vec3 bubbleView;
        void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
          bubbleNormal = normalize(normalMatrix * normal); bubbleView = -p.xyz;
          gl_Position = projectionMatrix * p; }`,
      fragmentShader: `varying vec3 bubbleNormal; varying vec3 bubbleView;
        void main() { vec3 n = normalize(bubbleNormal), v = normalize(bubbleView);
          float rim = pow(1.0 - abs(dot(n,v)), 1.7);
          float glint = pow(max(0.0, dot(reflect(-normalize(vec3(-.45,.8,.65)),n),v)), 52.0);
          float upper = smoothstep(-.05,.5,n.y + n.x*.25);
          vec3 tint = mix(vec3(.035,.095,.105), vec3(.88,.99,.97),upper);
          gl_FragColor = vec4(mix(tint,vec3(.98,1.0,.98),glint), .006 + rim*.82 + glint*.38);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`
    });
    this.aerosolTextures = this.createAerosolTextures();
    this.stats = { spawned: 0, bursts: 0, merges: 0 };
  }

  createAerosolTextures() {
    let seed = 671;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    return Array.from({ length: 6 }, () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const c = canvas.getContext('2d');
      for (let i = 0; i < 17; i++) {
        const angle = random() * Math.PI * 2, distance = random() * 25;
        const x = 64 + Math.cos(angle) * distance, y = 64 + Math.sin(angle) * distance, r = 15 + random() * 23;
        const gradient = c.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, 'rgba(255,255,255,.19)'); gradient.addColorStop(.4, 'rgba(255,255,255,.11)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gradient; c.fillRect(x-r, y-r, r*2, r*2);
      }
      const texture = new THREE.CanvasTexture(canvas); texture.encoding = THREE.sRGBEncoding; return texture;
    });
  }

  envelope(profile, elapsed) {
    if (!profile || elapsed >= profile.duration) return 0;
    const attack = Math.min(1, elapsed / Math.max(.01, profile.attack));
    const decline = Math.max(0, (elapsed - profile.sustain) / Math.max(.01, profile.duration - profile.sustain));
    return attack * (profile.tail + (1-profile.tail) * Math.pow(1-decline, 1.5));
  }

  startBubbles(options) {
    this.stopBubbles();
    if (!options.species || !Array.isArray(options.radius) || !Array.isArray(options.riseSpeed) || !(options.rate > 0)) return;
    this.gas = { ...options, duration: options.duration ?? (options.durationMs ?? 15000) / 1000 };
    this.gasTime = 0; this.gasAccumulator = 0; this.mergeAccumulator = 0;
    this.stats = { spawned: 0, bursts: 0, merges: 0 };
    this.owner.bubbleOptions = this.gas; this.owner.isBubbling = true;
  }

  stopBubbles() {
    for (const mesh of this.owner.bubbles) { this.owner.bubbleGroup.remove(mesh); this.bubblePool.push(mesh); }
    for (const mesh of this.caps) { this.surfaceGroup.remove(mesh); this.capPool.push(mesh); }
    for (const mesh of this.ripples) { this.surfaceGroup.remove(mesh); this.ripplePool.push(mesh); }
    this.owner.bubbles = []; this.caps = []; this.ripples = []; this.gas = null;
    this.owner.isBubbling = false; this.gasAccumulator = 0;
    this.owner.bubbleOptions = null; this.gasTime = 0;
    this.stats = { spawned: 0, bursts: 0, merges: 0 };
  }

  birthPosition(radius) {
    const R = this.vessel.insideRadius - radius * 1.5;
    const bottom = this.vessel.bottom + radius;
    const top = this.vessel.bottom + this.glassware.beaker250LiquidHeight - radius;
    let x, y, z, source = this.gas.source, solid = null;
    if (source === 'mixing-zone' && Math.random() < Math.min(1, this.gasTime / this.gas.mixingSeconds)) source = this.gas.mixedSource;
    if (source === 'solid-surface') {
      const solids = this.owner.dissolveParticles.filter(p => p.scale.x > .05);
      if (!solids.length) return null;
      solid = solids[Math.floor(Math.random() * solids.length)];
      const theta = Math.random() * Math.PI * 2, size = .003 * solid.scale.x;
      x = solid.position.x + Math.cos(theta) * size;
      z = solid.position.z + Math.sin(theta) * size;
      y = solid.position.y + size + radius;
    } else if (source === 'mixing-zone') {
      const depth = Math.random() * .88;
      y = top - depth * (top-bottom);
      x = this.vessel.radius * .3 + (Math.random()-.5) * R * (.12 + depth*.65);
      z = (Math.random()-.5) * R * (.12 + depth*.65);
    } else {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * R * (Math.random() < .16 ? .98 : .83);
      x = Math.cos(theta)*r; z = Math.sin(theta)*r; y = bottom + Math.random() * Math.max(0, top-bottom);
    }
    const r = Math.hypot(x,z); if (r > R) { x *= R/r; z *= R/r; }
    return { x, y: THREE.MathUtils.clamp(y,bottom,Math.max(bottom,top)), z, source, solid };
  }

  emitBubble() {
    if (this.owner.bubbles.length >= 150) return;
    const p = this.gas, radius = p.radius[0] + Math.pow(Math.random(),1.45)*(p.radius[1]-p.radius[0]);
    const birth = this.birthPosition(radius); if (!birth) return;
    const mesh = this.bubblePool.pop() || new THREE.Mesh(this.bubbleGeometry,this.bubbleMaterial);
    mesh.renderOrder = 3; mesh.position.set(birth.x,birth.y,birth.z); mesh.scale.setScalar(radius*.1);
    mesh.userData = { age:0, radius, initialRadius:radius, birth:{x:birth.x,y:birth.y,z:birth.z,source:birth.source},
      solid:birth.solid, anchorX:birth.x, anchorZ:birth.z, velocity:.003,
      target:p.riseSpeed[0]+Math.random()*(p.riseSpeed[1]-p.riseSpeed[0]), phase:Math.random()*Math.PI*2 };
    this.owner.bubbleGroup.add(mesh); this.owner.bubbles.push(mesh); this.stats.spawned++;
  }

  releaseBubble(index) {
    const mesh = this.owner.bubbles[index]; this.owner.bubbleGroup.remove(mesh);
    this.owner.bubbles.splice(index,1); this.bubblePool.push(mesh);
  }

  burst(bubble) {
    const d = bubble.userData, cap = this.capPool.pop() || new THREE.Mesh(this.capGeometry,this.bubbleMaterial);
    cap.position.copy(bubble.position); cap.position.y = this.vessel.bottom + this.glassware.beaker250LiquidHeight;
    cap.scale.set(d.radius,d.radius*.7,d.radius); cap.renderOrder = 3;
    cap.userData = { radius:d.radius, age:0, life:this.gas?.surfaceHold ?? .1 };
    if (this.caps.length < 24) { this.caps.push(cap); this.surfaceGroup.add(cap); } else this.capPool.push(cap);
    const space = this.vessel.insideRadius - Math.hypot(cap.position.x,cap.position.z) - .001;
    if (space > d.radius*1.2 && this.ripples.length < 32) {
      const ring = this.ripplePool.pop() || new THREE.Mesh(this.rippleGeometry,new THREE.MeshBasicMaterial({color:0xe4f4ed,transparent:true,opacity:.2,depthWrite:false}));
      ring.rotation.x = -Math.PI/2; ring.position.copy(cap.position); ring.position.y += .0008; ring.renderOrder = 3;
      ring.scale.setScalar(d.radius); ring.userData = {age:0, life:.45+d.radius*20, radius:d.radius, maxRadius:Math.min(d.radius*5,space)};
      this.ripples.push(ring); this.surfaceGroup.add(ring);
    }
    this.stats.bursts++;
  }

  updateBubbles(dt) {
    if (!this.gas) return;
    this.gasTime += dt;
    this.gasAccumulator += dt * this.gas.rate * this.envelope(this.gas,this.gasTime);
    while (this.gasAccumulator >= 1) { this.emitBubble(); this.gasAccumulator--; }
    const top = this.vessel.bottom + this.glassware.beaker250LiquidHeight;
    for (let i=this.owner.bubbles.length-1;i>=0;i--) {
      const mesh=this.owner.bubbles[i], d=mesh.userData; d.age+=dt;
      d.radius=d.initialRadius*(1+.13*Math.min(1,Math.max(0,(mesh.position.y-d.birth.y)/Math.max(.001,top-d.birth.y))));
      d.velocity+=(d.target-d.velocity)*(1-Math.exp(-dt*3.2)); mesh.position.y+=d.velocity*dt;
      const amplitude=(.0006+d.radius*.4)*Math.min(1,d.age*2);
      mesh.position.x=d.anchorX+Math.sin(d.age*4.2+d.phase)*amplitude;
      mesh.position.z=d.anchorZ+Math.cos(d.age*3.3+d.phase)*amplitude;
      const maxR=this.vessel.insideRadius-d.radius*1.5,r=Math.hypot(mesh.position.x,mesh.position.z);
      if(r>maxR){mesh.position.x*=maxR/r;mesh.position.z*=maxR/r;}
      const grow=Math.min(1,d.age/.14), oval=d.radius>.003?.93+.07*Math.sin(d.age*7+d.phase):1;
      mesh.scale.set(d.radius*grow/Math.sqrt(oval),d.radius*grow*oval,d.radius*grow/Math.sqrt(oval));
      if(mesh.position.y>=top-d.radius*.1){this.burst(mesh);this.releaseBubble(i);}
    }
    this.mergeAccumulator+=dt;
    if(this.mergeAccumulator>=.08){
      this.mergeAccumulator=0;
      for(let i=0;i<this.owner.bubbles.length;i++)for(let j=i+1;j<this.owner.bubbles.length;j++){
        const a=this.owner.bubbles[i],b=this.owner.bubbles[j],u=a.userData,v=b.userData;
        if(u.age<.2||v.age<.2||u.radius>.006||v.radius>.006)continue;
        if(a.position.distanceToSquared(b.position)<Math.pow((u.radius+v.radius)*.68,2)){
          const va=Math.pow(u.radius,3),vb=Math.pow(v.radius,3);a.position.lerp(b.position,vb/(va+vb));
          u.radius=Math.cbrt(va+vb);u.initialRadius=u.radius/(1+.13*Math.min(1,Math.max(0,(a.position.y-u.birth.y)/Math.max(.001,top-u.birth.y))));
          u.anchorX=a.position.x;u.anchorZ=a.position.z;this.releaseBubble(j--);this.stats.merges++;
        }
      }
    }
    for(let i=this.caps.length-1;i>=0;i--){const mesh=this.caps[i],d=mesh.userData;d.age+=dt;mesh.position.y=top;
      if(d.age>=d.life){this.surfaceGroup.remove(mesh);this.capPool.push(mesh);this.caps.splice(i,1);}}
    for(let i=this.ripples.length-1;i>=0;i--){const mesh=this.ripples[i],d=mesh.userData;d.age+=dt;const q=Math.min(1,d.age/d.life);
      mesh.position.y=top+.0008;mesh.scale.setScalar(THREE.MathUtils.lerp(d.radius,d.maxRadius,q));mesh.material.opacity=Math.pow(1-q,2)*.25;
      if(q>=1){this.surfaceGroup.remove(mesh);this.ripplePool.push(mesh);this.ripples.splice(i,1);}}
    if(this.gasTime>=this.gas.duration&&!this.owner.bubbles.length&&!this.caps.length&&!this.ripples.length){this.gas=null;this.owner.isBubbling=false;}
  }

  startSmoke(options) {
    this.stopSmoke();
    if (options.kind !== 'solid-aerosol') return; // No temperature-only or generic smoke.
    this.aerosol={...options};this.aerosolTime=0;this.aerosolAccumulator=0;
    this.owner.smokeOptions=this.aerosol;this.owner.isSmoking=true;
  }

  emitSmokePuff() {
    if(!this.aerosol||this.owner.smokePuffs.length>=80)return;
    const sprite=this.puffPool.pop()||new THREE.Sprite(new THREE.SpriteMaterial({map:this.aerosolTextures[Math.floor(Math.random()*6)],
      color:this.aerosol.color,transparent:true,opacity:0,depthWrite:false}));
    const R=this.vessel.insideRadius;
    sprite.position.set(R*.3+(Math.random()-.5)*R*.24,this.vessel.height+.010+(Math.random()-.5)*.012,(Math.random()-.5)*R*.28);
    const size=.022+Math.random()*.025;sprite.scale.setScalar(size);sprite.material.rotation=Math.random()*Math.PI*2;sprite.renderOrder=3;
    sprite.userData={age:0,life:this.aerosol.life[0]+Math.random()*(this.aerosol.life[1]-this.aerosol.life[0]),size,
      vx:(Math.random()-.5)*.025,vy:.028+Math.random()*.025,vz:(Math.random()-.5)*.02,phase:Math.random()*Math.PI*2};
    this.owner.smokeGroup.add(sprite);this.owner.smokePuffs.push(sprite);
  }

  stopSmoke() {
    for(const sprite of this.owner.smokePuffs){this.owner.smokeGroup.remove(sprite);this.puffPool.push(sprite);}
    this.owner.smokePuffs=[];this.aerosol=null;this.owner.isSmoking=false;this.aerosolAccumulator=0;
    this.owner.smokeOptions=null;
  }

  updateSmoke(dt) {
    if(!this.aerosol)return;
    this.aerosolTime+=dt;
    this.aerosolAccumulator+=dt*this.aerosol.rate*this.envelope(this.aerosol,this.aerosolTime);
    while(this.aerosolAccumulator>=1){this.emitSmokePuff();this.aerosolAccumulator--;}
    for(let i=this.owner.smokePuffs.length-1;i>=0;i--){const sprite=this.owner.smokePuffs[i],d=sprite.userData;d.age+=dt;
      const q=Math.min(1,d.age/d.life);sprite.position.x+=(d.vx+Math.sin(d.age*2+d.phase)*.007)*dt;
      sprite.position.z+=(d.vz+Math.cos(d.age*1.6+d.phase)*.005)*dt;sprite.position.y+=d.vy*dt;
      sprite.scale.setScalar(d.size+d.age*.047);sprite.material.rotation+=dt*.12;
      sprite.material.opacity=Math.min(1,d.age*4)*Math.pow(1-q,.8)*.40;
      if(q>=1){this.owner.smokeGroup.remove(sprite);this.puffPool.push(sprite);this.owner.smokePuffs.splice(i,1);}}
    if(this.aerosolTime>=this.aerosol.duration&&!this.owner.smokePuffs.length){this.aerosol=null;this.owner.isSmoking=false;}
  }

  update(delta) {
    if(!Number.isFinite(delta)||delta<=0)return;
    const duration=Math.min(delta,.1),steps=Math.ceil(duration*90);
    for(let i=0;i<steps;i++){this.updateBubbles(duration/steps);this.updateSmoke(duration/steps);}
  }
}
window.LabReactionGasEffects=LabReactionGasEffects;
