class LabReagentTables {
  constructor(lab) {
    this.lab = lab;
    this.panel = document.getElementById('reagentTables');
    this.labels = document.getElementById('reagentTableLabels');
    this.tabs = [...this.panel.querySelectorAll('[data-reagent-table]')];
    this.worktops = lab.environment.rearWorktops;
    this.pairs = [];
    this.point = new THREE.Vector3();
    this.labelWidth = .64;
    this.labelHeight = .37;
    const reactions = Object.values(window.REACTIONS_DATA);
    const perTable = Math.ceil(reactions.length / this.worktops.length);
    const liquidGeometry = new THREE.CylinderGeometry(1, 1, 1, 24);
    const solidGeometry = new THREE.IcosahedronGeometry(1, 0);
    const hitGeometry = new THREE.BoxGeometry(.64, .41, .32);
    const hitMaterial = new THREE.MeshBasicMaterial({visible: false});
    const labelGeometry = new THREE.PlaneGeometry(this.labelWidth, this.labelHeight);
    const tileFace = lab.environment.tileWall.getObjectByName('graphite-tile-0-0');
    const wallZ = tileFace.position.z + tileFace.geometry.parameters.depth / 2 + .003;
    const scale = .65;

    reactions.forEach((reaction, index) => {
      const table = Math.floor(index / perTable), worktop = this.worktops[table];
      const group = new THREE.Group();
      group.name = `reagent-pair-${reaction.id}`;
      const {height, depth} = worktop.geometry.parameters;
      group.position.copy(worktop.position);
      group.position.x += (index % perTable - (perTable - 1) / 2) * .68;
      group.position.y += height / 2;
      group.position.z += depth * .10;
      lab.scene.add(group);

      const vessels = [lab.glassware.main, lab.glassware.added].map((vessel, role) => {
        const data = role ? reaction.addedVessel : reaction.fixedVessel;
        const shell = vessel.group.getObjectByName('borosilicate-shell').clone();
        shell.position.x = role ? .151 : -.128;
        shell.scale.setScalar(scale);
        group.add(shell);
        const fill = lab.glassware.heightForVolume(vessel, data.volume);
        const material = new THREE.MeshStandardMaterial({
          color: data.color, roughness: .24, transparent: true,
          opacity: data.liquidOpacity ?? .55, depthWrite: false
        });
        const liquid = new THREE.Mesh(liquidGeometry, material);
        liquid.position.set(shell.position.x, scale * (vessel.bottom + fill / 2), 0);
        liquid.scale.set(vessel.insideRadius * scale, fill * scale, vessel.insideRadius * scale);
        liquid.renderOrder = 1;
        group.add(liquid);
        if (data.hasPrecipitate) {
          const grains = new THREE.Group();
          grains.name = 'reagent-solid';
          shell.add(grains);
          const solid = new THREE.MeshStandardMaterial({color: data.precipitateColor ?? 0xffffff});
          for (let i = 0; i < 7; i++) {
            const grain = new THREE.Mesh(solidGeometry, solid);
            const angle = i * 2.4, radius = (.028 + i * .009) / scale;
            grain.position.set(radius * Math.cos(angle),
              vessel.bottom + .015 / scale, radius * Math.sin(angle));
            grain.rotation.set(i * .62, angle, i * .17);
            grain.scale.set(.022 + .003 * (i % 3), .016, .019).divideScalar(scale);
            grains.add(grain);
          }
        }
        return shell;
      });
      const hit = new THREE.Mesh(hitGeometry, hitMaterial);
      hit.position.set(0, .205, 0);
      group.add(hit);

      const names = [reaction.fixedVessel.name, reaction.addedVessel.name];
      const plate = new THREE.Mesh(labelGeometry, this.makeLabelMaterial(names));
      plate.name = `reagent-label-${reaction.id}`;
      plate.position.set(group.position.x, group.position.y + .59, wallZ);
      lab.scene.add(plate);

      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'reagent-pair-label';
      label.dataset.reagentPair = reaction.id;
      label.setAttribute('aria-label', names.join(' ve '));
      const pair = {id: reaction.id, table, group, hit, plate, label, vessels, scale};
      hit.userData.pair = pair;
      plate.userData.pair = pair;
      label.onclick = () => lab.selectReagentPair(pair);
      label.hidden = true;
      this.labels.append(label);
      this.pairs.push(pair);
    });
    this.hits = this.pairs.flatMap(pair => [pair.hit, pair.plate]);
    this.deskBlockers = [
      lab.scene.getObjectByName('experiment-table'),
      ...[lab.glassware.main, lab.glassware.added].map(vessel=>vessel.group.getObjectByName('borosilicate-shell'))
    ];
    this.tabs.forEach(button => button.onclick = () => lab.showReagentTable(Number(button.dataset.reagentTable)));
  }

  makeLabelMaterial(names) {
    const canvas = document.createElement('canvas');
    const width = 512, height = 296;
    canvas.width = width * .75;
    canvas.height = height * .75;
    const ctx = canvas.getContext('2d');
    ctx.scale(.75, .75);
    ctx.fillStyle = '#f7f6ee';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#9ca7a2';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, width - 6, height - 6);
    ctx.font = '600 51px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const groups = names.map(name => {
      const lines = [];
      let line = '';
      for (const word of name.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > width - 30) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      lines.push(line);
      return lines;
    });
    const lineHeight = Math.min(56, 248 / (groups[0].length + groups[1].length));
    let y = (height - (groups[0].length + groups[1].length) * lineHeight - 16) / 2;
    ctx.fillStyle = '#213438';
    groups.forEach((lines, index) => {
      if (index) {
        ctx.fillRect(24, y + 7, width - 48, 2);
        y += 16;
      }
      for (const line of lines) {
        ctx.fillText(line, width / 2, y + lineHeight / 2);
        y += lineHeight;
      }
    });
    const map = new THREE.CanvasTexture(canvas);
    map.encoding = THREE.sRGBEncoding;
    map.anisotropy = Math.min(8, this.lab.glassware.maxAnisotropy);
    return new THREE.MeshBasicMaterial({map, toneMapped: false});
  }

  preset(index) {
    if (index === -1) return this.lab.cameraPresets.wide;
    const {x, y, z} = this.worktops[index].position;
    const target = new THREE.Vector3(x, y + .57, z);
    const pos = new THREE.Vector3(x, y + 1.06, z + 3.75);
    const distance = pos.distanceTo(target);
    const aspect = this.lab.camera.aspect;
    const verticalSize = Math.max(1.83, 3.45 / aspect);
    return {pos, target, fov: THREE.MathUtils.radToDeg(2 * Math.atan(verticalSize / (2 * distance)))};
  }

  show(index) {
    this.index = index;
    this.panel.hidden = index === null;
    document.body.toggleAttribute('data-reagent-tables', index !== null);
    this.tabs.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.reagentTable) === index)));
    this.activePairs = this.pairs.filter(pair => pair.table === index);
    this.pairs.forEach(pair => pair.label.hidden = true);
  }

  get canSelect() {
    return this.lab.state.currentStage === 1 && !this.lab.reagentTransfer && !this.lab.drag &&
      !['pouring', 'reacting'].includes(this.lab.state.simulationState);
  }

  hit(ray) {
    if (!this.canSelect) return null;
    const hit = ray.intersectObjects(this.hits)[0];
    if (!hit?.object.userData.pair.group.visible) return null;
    const blocker = ray.intersectObjects(this.deskBlockers.filter(object=>object.parent.visible))[0];
    return blocker && blocker.distance < hit.distance ? null : hit.object.userData.pair;
  }

  project(camera, width, height) {
    if (this.index == null) return;
    camera.updateMatrixWorld();
    for (const {plate, label, group} of this.activePairs) {
      label.hidden = false;
      label.disabled = !this.canSelect || !group.visible;
      const {x, y, z} = plate.position;
      const corner = (dx, dy) => {
        const p = this.point.set(x + dx * this.labelWidth / 2, y + dy * this.labelHeight / 2, z).project(camera);
        return {x:(p.x + 1) * width / 2, y:(1 - p.y) * height / 2};
      };
      const corners = [corner(-1,-1), corner(-1,1), corner(1,-1), corner(1,1)];
      const left = Math.min(...corners.map(p=>p.x)), right = Math.max(...corners.map(p=>p.x));
      const top = Math.min(...corners.map(p=>p.y)), bottom = Math.max(...corners.map(p=>p.y));
      label.style.left = `${left}px`;
      label.style.top = `${top}px`;
      label.style.width = `${right-left}px`;
      label.style.height = `${bottom-top}px`;
    }
  }
}
window.LabReagentTables = LabReagentTables;
