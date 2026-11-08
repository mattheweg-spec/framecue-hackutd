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

window.frameCue3D = { setCue };

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
    viewer.setAttribute('aria-label', 'Interactive 3D Fusion assembly. The active segmented claw presses toward the shoe for left, center, or right cues.');
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
    for (const name of cueNames) updateActuator(actuators.get(name), targets[name], delta);
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
