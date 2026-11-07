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
const cueColors = { left: '#55dcd2', center: '#efbd4f', right: '#f46d61' };
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
  actuator.pivot.position.z = actuator.basePosition.z + actuator.amount * 0.38;
  actuator.mesh.scale.z = actuator.baseScale.z * (1 + actuator.amount * 0.34);
  const materials = Array.isArray(actuator.mesh.material) ? actuator.mesh.material : [actuator.mesh.material];
  for (const material of materials) {
    if (!material?.emissive) continue;
    material.emissive.set(cueColors[actuator.name]);
    material.emissiveIntensity = 0.38 * actuator.amount;
  }
}

try {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
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

  function prepareBladder(mesh, name) {
    const geometry = mesh.geometry.clone();
    geometry.computeBoundingBox();
    const center = geometry.boundingBox.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    mesh.geometry.dispose();
    mesh.geometry = geometry;

    const pivot = new THREE.Group();
    pivot.name = `${name}_pressure_pivot`;
    pivot.position.copy(center);
    mesh.position.set(0, 0, 0);
    const parent = mesh.parent;
    parent.add(pivot);
    parent.remove(mesh);
    pivot.add(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const actuator = { name, pivot, mesh, basePosition: center.clone(), baseScale: mesh.scale.clone(), amount: 0 };
    actuators.set(name, actuator);
    updateActuator(actuator, targets[name], 1);
  }

  function finishLoad(object) {
    object.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (/^Reference (outsole|shoe upper)/i.test(child.name)) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          material.transparent = true;
          material.opacity = 0.19;
          material.depthWrite = false;
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        }
      }
      for (const name of cueNames) {
        if (child.name.toLowerCase().includes(`cue_module_${name} soft bladder envelope_body`.toLowerCase())) {
          prepareBladder(child, name);
          break;
        }
      }
    });
    modelRoot.add(object);
    modelRoot.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(modelRoot);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    modelRoot.position.sub(center);
    const distance = Math.max(14, Math.max(size.x, size.y, size.z) * 1.35);
    initialCamera.set(distance * 0.98, distance * 0.82, distance * 1.05);
    resetView();
    viewer.classList.add('ready');
    viewer.setAttribute('aria-label', 'Interactive 3D Fusion assembly. The active pressure bladder rises for left, center, or right cues.');
    if (fallback) fallback.hidden = true;
    modelReady = true;
    if (actuators.size !== 3) console.warn(`Expected 3 CAD bladder groups; found ${actuators.size}.`);
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
