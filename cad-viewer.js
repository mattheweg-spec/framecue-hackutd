import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { MTLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';

const viewer = document.querySelector('#assemblyViewer');
const canvas = document.querySelector('#assemblyCanvas');
const fallback = document.querySelector('#wearableFallback');
const loading = document.querySelector('#assemblyLoading');
const readout = document.querySelector('#assemblyReadout');
const cueNames = ['left', 'center', 'right'];
const activeCueColor = '#ff343d';
const activeCueThreeColor = new THREE.Color(activeCueColor);
const targets = Object.fromEntries(cueNames.map(name => [name, 0]));
const actuators = new Map();
const navigationTargets = Object.fromEntries(cueNames.map(name => [name, 0]));
const navigationMotors = new Map();
const navigationColor = new THREE.Color('#63e2d1');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setCue(cue) {
  const active = cueNames.includes(cue) ? cue : 'clear';
  for (const name of cueNames) targets[name] = name === active ? 1 : 0;
  if (readout) readout.textContent = active === 'clear'
    ? 'PRESSURE STATE · CLEAR'
    : `PRESSURE STATE · ${active.toUpperCase()}`;
  if (reduceMotion.matches) {
    for (const name of cueNames) updateActuator(actuators.get(name), targets[name], 1);
  }
}

function setNavigationCue(cue) {
  const active = cueNames.includes(cue) ? cue : 'clear';
  for (const name of cueNames) navigationTargets[name] = name === active ? 1 : 0;
  if (reduceMotion.matches) {
    for (const name of cueNames) updateNavigationMotor(navigationMotors.get(name), navigationTargets[name], 1);
  }
}

window.frameCue3D = { setCue, setNavigationCue };

function showFallback(error) {
  console.warn('FrameCue CAD viewer could not load:', error);
  viewer.hidden = true;
  fallback.hidden = false;
}

function updateActuator(actuator, amount, delta) {
  if (!actuator) return;
  const blend = reduceMotion.matches ? 1 : 1 - Math.exp(-9 * Math.max(delta, 0));
  actuator.amount += (amount - actuator.amount) * blend;
  const restingAngles = [0, 0.5, 1];
  const cueAngles = [2, 3.5, 5];
  actuator.joints.forEach((joint, index) => {
    joint.rotation.y = THREE.MathUtils.degToRad(restingAngles[index] + cueAngles[index] * actuator.amount);
  });
  for (const { material, baseColor } of actuator.materials) {
    if (!material?.emissive) continue;
    material.color.copy(baseColor).lerp(activeCueThreeColor, actuator.amount * 0.85);
    material.emissive.copy(activeCueThreeColor);
    material.emissiveIntensity = 0.3 * actuator.amount;
  }
}

function updateNavigationMotor(motor, amount, delta) {
  if (!motor) return;
  const blend = reduceMotion.matches ? 1 : 1 - Math.exp(-10 * Math.max(delta, 0));
  motor.amount += (amount - motor.amount) * blend;
  motor.cap.material.color.copy(motor.baseColor).lerp(navigationColor, motor.amount * 0.9);
  motor.cap.material.emissive.copy(navigationColor);
  motor.cap.material.emissiveIntensity = 0.12 + 0.55 * motor.amount;
  motor.cap.scale.setScalar(1 + motor.amount * 0.12);
  motor.ring.material.color.copy(motor.ringBaseColor).lerp(navigationColor, motor.amount * 0.9);
  motor.ring.material.emissive.copy(navigationColor);
  motor.ring.material.emissiveIntensity = 0.45 * motor.amount;
}

function addNavigationCuff(object) {
  const cuff = new THREE.Group();
  cuff.name = 'QuickRelease_Ankle_Cuff';
  const shell = new THREE.MeshStandardMaterial({ color: '#27373e', metalness: 0.72, roughness: 0.38 });
  const edge = new THREE.MeshStandardMaterial({ color: '#73878b', metalness: 0.82, roughness: 0.3 });
  const ringX = 3.25, ringY = 4.05, centerX = 4.2;
  const rearX = centerX - ringX, gapAngle = 0.34;
  for (const z of [8.25, 10.75]) {
    const geometry = new THREE.TorusGeometry(1, 0.18, 10, 80, Math.PI * 2 - gapAngle);
    geometry.rotateZ(Math.PI + gapAngle / 2);
    const band = new THREE.Mesh(geometry, shell);
    band.name = 'Split_Ankle_Cuff_Rail';
    band.scale.set(ringX, ringY, 1);
    band.position.set(centerX, 0, z);
    cuff.add(band);
  }
  const addRod = (start, end, radius, material, name) => {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), direction = b.clone().sub(a);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
    rod.name = name;
    rod.position.copy(a).add(b).multiplyScalar(0.5);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    cuff.add(rod);
  };
  for (const [x, y] of [[centerX + ringX, 0], [centerX, ringY], [centerX, -ringY]]) {
    addRod([x, y, 8.25], [x, y, 10.75], 0.16, edge, 'Cuff_Rib');
  }
  // Rear hinge and over-center clasp make the cuff visibly openable for entry and removal.
  addRod([centerX, ringY, 8.25], [centerX, ringY, 10.75], 0.24, edge, 'Cuff_Hinge_Pin');
  for (const z of [8.25, 10.75]) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.38), shell);
    lug.name = 'Cuff_Latch_Lug';
    lug.position.set(rearX, -0.43, z);
    cuff.add(lug);
    const secondLug = lug.clone();
    secondLug.position.y = 0.43;
    cuff.add(secondLug);
  }
  const latch = new THREE.Group();
  latch.name = 'Rear_Over_Center_Cuff_Latch';
  const latchBridge = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.65, 0.42), edge);
  latchBridge.position.set(rearX - 0.02, 0, 9.5);
  latch.add(latchBridge);
  const latchLever = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.42, 0.16), shell);
  latchLever.position.set(rearX + 0.24, 0.03, 9.63);
  latchLever.rotation.z = -0.19;
  latch.add(latchLever);
  const latchPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.25, 16), edge);
  latchPivot.position.set(rearX + 0.28, 0, 9.5);
  latchPivot.rotation.x = Math.PI / 2;
  latch.add(latchPivot);
  cuff.add(latch);

  const podMaterial = new THREE.MeshStandardMaterial({ color: '#35464c', metalness: 0.68, roughness: 0.32 });
  const directions = {
    left: { position: [centerX, -ringY - 0.16, 9.5], normal: [0, -1, 0] },
    center: { position: [centerX + ringX + 0.16, 0, 9.5], normal: [1, 0, 0] },
    right: { position: [centerX, ringY + 0.16, 9.5], normal: [0, 1, 0] }
  };
  for (const name of cueNames) {
    const { position, normal } = directions[name];
    const pod = new THREE.Group();
    pod.name = `Navigation_Motor_${name}`;
    pod.position.set(...position);
    pod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...normal));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.42, 24), podMaterial);
    base.name = `Navigation_Motor_Carrier_${name}`;
    pod.add(base);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: '#6f8588', metalness: 0.76, roughness: 0.28, emissive: '#63e2d1', emissiveIntensity: 0 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.09, 8, 24), ringMaterial);
    ring.name = `Navigation_Motor_Ring_${name}`;
    ring.position.y = 0.25;
    pod.add(ring);
    const capMaterial = new THREE.MeshStandardMaterial({ color: '#53686c', metalness: 0.3, roughness: 0.32, emissive: '#63e2d1', emissiveIntensity: 0.12 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), capMaterial);
    cap.name = `Navigation_Motor_Cap_${name}`;
    cap.position.y = 0.28;
    pod.add(cap);
    cuff.add(pod);
    const motor = { cap, ring, baseColor: capMaterial.color.clone(), ringBaseColor: ringMaterial.color.clone(), amount: 0 };
    navigationMotors.set(name, motor);
    updateNavigationMotor(motor, navigationTargets[name], 1);
  }

  // Each removable binding grips the existing side rail and supports the cuff with two indexed links.
  for (const side of [-1, 1]) {
    const binding = new THREE.Group();
    binding.name = `Crampon_Rail_Binding_${side < 0 ? 'Left' : 'Right'}`;
    const dockMaterial = new THREE.MeshStandardMaterial({ color: '#3b4a50', metalness: 0.78, roughness: 0.3 });
    const pinMaterial = new THREE.MeshStandardMaterial({ color: '#a5b1b2', metalness: 0.88, roughness: 0.25 });
    const supportPairs = [
      { cuff: [3.25, side * 3.35, 8.25], rail: [3.8, side * 5.15, 4.55] },
      { cuff: [6.15, side * 2.8, 8.25], rail: [6.9, side * 5.15, 5.65] }
    ];
    for (let index = 0; index < supportPairs.length; index++) {
      const { cuff: upper, rail: lower } = supportPairs[index];
      const lerp = amount => lower.map((value, axis) => value + (upper[axis] - value) * amount);
      addRod(lower, lerp(0.64), 0.3, shell, `Cuff_Link_Sleeve_${index + 1}`);
      addRod(lerp(0.48), upper, 0.18, edge, `Indexed_Cuff_Link_Bar_${index + 1}`);
      const dock = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.05, 0.82), dockMaterial);
      dock.name = `Crampon_Rail_Dock_${index + 1}`;
      dock.position.set(lower[0], lower[1], lower[2]);
      binding.add(dock);
      const toeLip = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.22, 0.18), edge);
      toeLip.position.set(lower[0] + 0.05, lower[1], lower[2] + 0.43);
      binding.add(toeLip);
      // An exposed pin and captive pull-ring indicate the actual detach action.
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.25, 16), pinMaterial);
      pin.position.set(lower[0], lower[1] + side * 0.64, lower[2]);
      binding.add(pin);
      const pullRing = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.055, 8, 16), pinMaterial);
      pullRing.rotation.x = Math.PI / 2;
      pullRing.position.set(lower[0], lower[1] + side * 0.72, lower[2]);
      binding.add(pullRing);
      // Three index heads on the exposed slider show the standoff adjustment range.
      for (let mark = 0; mark < 3; mark++) {
        const t = 0.58 + mark * 0.12;
        const position = lerp(t);
        const indexMark = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), edge);
        indexMark.position.set(position[0], position[1] + side * 0.18, position[2]);
        binding.add(indexMark);
      }
    }
    cuff.add(binding);
  }
  object.add(cuff);
}

try {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 1000);
  camera.up.set(0, 1, 0);
  scene.add(new THREE.HemisphereLight(0xd8efff, 0x243039, 2.15));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(20, 35, 30);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x7de5d8, 1.0);
  rimLight.position.set(-25, 12, -24);
  scene.add(rimLight);

  const modelRoot = new THREE.Group();
  modelRoot.rotation.x = -Math.PI / 2; // Fusion exports Z-up; the viewer uses Y-up.
  scene.add(modelRoot);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 100;
  const initialCamera = new THREE.Vector3();
  let modelReady = false;
  let frameHandle = 0;
  let lastFrame = 0;

  function resize() {
    const width = Math.max(1, viewer.clientWidth);
    const height = Math.max(1, viewer.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function resetView() {
    camera.position.copy(initialCamera);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  document.querySelector('#assemblyReset')?.addEventListener('click', resetView);
  new ResizeObserver(resize).observe(viewer);
  resize();

  function prepareClaw(object, name, parts) {
    const y = { left: -2.7, center: 0, right: 2.7 }[name];
    const anchors = [[15.85,y,7.57],[18.3475,y,7.45],[20.9125,y,7.24]].map(p => new THREE.Vector3(...p));
    const joints = anchors.map((anchor,index) => {
      const joint = new THREE.Group();
      joint.name = `${name}_joint_${index + 1}`;
      joint.position.copy(anchor).sub(index ? anchors[index-1] : new THREE.Vector3());
      return joint;
    });
    object.add(joints[0]);
    joints[0].add(joints[1]);
    joints[1].add(joints[2]);
    const materials = [];
    for (const { child, segment } of parts) {
      const anchor = anchors[segment];
      child.geometry.translate(-anchor.x, -anchor.y, -anchor.z);
      joints[segment].add(child);
      if (!/Cheek|Bearing|ContactPad|Joint_/i.test(child.name)) {
        const list = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of list) materials.push({ material, baseColor: material.color.clone() });
      }
    }
    const actuator = { name, joints, materials, amount: 0 };
    actuators.set(name, actuator);
    updateActuator(actuator, targets[name], 1);
  }

  function finishLoad(object) {
    const movingParts = [];
    object.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (!/^Reference /i.test(child.name)) {
        const hardware = /Joint_|Bearing|Fastener/i.test(child.name);
        const rubber = /webbing|ContactPad/i.test(child.name);
        const armor = /Finger_/i.test(child.name);
        child.material = new THREE.MeshStandardMaterial({
          color: rubber ? '#202528' : hardware ? '#929b9f' : /Ridge/i.test(child.name) ? '#68747d' : armor ? '#424c54' : '#303a40',
          metalness: rubber ? 0 : hardware ? 0.8 : 0.55,
          roughness: rubber ? 0.85 : hardware ? 0.32 : 0.46
        });
      }
      if (/^Cue_Module_/i.test(child.name) && !/soft bladder envelope_body/i.test(child.name)) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (material?.color) material.color.set('#657176');
          if (material?.emissive) material.emissive.set('#000000');
        }
      }
      if (/^Reference (outsole|shoe upper)/i.test(child.name)) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          material.transparent = true;
          material.opacity = 0.12;
          material.depthWrite = false;
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        }
      }
      for (const name of cueNames) {
        const match = child.name.toLowerCase().match(new RegExp(`^claw_${name}_(finger|joint)_(\\d+)`));
        if (match) {
          const segment = Number(match[2]) - (match[1] === 'finger' ? 1 : 0);
          movingParts.push({ child, name, segment });
          break;
        }
      }
    });
    for (const name of cueNames) prepareClaw(object, name, movingParts.filter(part => part.name === name));
    addNavigationCuff(object);
    modelRoot.add(object);
    modelRoot.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(modelRoot);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    modelRoot.position.sub(center);
    const distance = Math.max(14, Math.max(size.x, size.y, size.z) * 1.05);
    initialCamera.set(distance * 0.98, distance * 0.82, distance * 1.05);
    resetView();
    viewer.classList.add('ready');
    viewer.setAttribute('aria-label', 'Interactive FrameCue assembly. Red instep claws show obstacle location; the split, quick-release ankle cuff connects to the shoe frame through adjustable side links with pull pins and shows left, forward, or right route guidance.');
    if (fallback) fallback.hidden = true;
    modelReady = true;
    if (cueNames.some(name => movingParts.filter(part => part.name === name && /Finger_[123]$/.test(part.child.name)).length !== 3)) console.warn('Missing claw armor segment.');
    render(0);
  }

  const materialLoader = new MTLLoader();
  materialLoader.setPath('/CAD/web-model/');
  materialLoader.load('framecue-assembly.mtl', materials => {
    materials.preload();
    const objectLoader = new OBJLoader();
    objectLoader.setMaterials(materials);
    objectLoader.setPath('/CAD/web-model/');
    objectLoader.load('framecue-assembly.obj', finishLoad, undefined, showFallback);
  }, undefined, showFallback);

  function render(now) {
    if (!modelReady) return;
    frameHandle = requestAnimationFrame(render);
    const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    for (const name of cueNames) {
      updateActuator(actuators.get(name), targets[name], delta);
      updateNavigationMotor(navigationMotors.get(name), navigationTargets[name], delta);
    }
    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frameHandle);
    controls.dispose();
    renderer.dispose();
  }, { once: true });
} catch (error) {
  showFallback(error);
}
