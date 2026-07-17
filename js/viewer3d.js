import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PARTS = [
  { key: 'hub',    file: 'hub.stl',    color: 0x8f959b },
  { key: 'ring',   file: 'ring.stl',   color: 0xb2b8bd },
  { key: 'arm1',   file: 'arm1.stl',   color: 0xbec3c8 },
  { key: 'arm2',   file: 'arm2.stl',   color: 0xbec3c8 },
  { key: 'arm3',   file: 'arm3.stl',   color: 0xbec3c8 },
  { key: 'arm4',   file: 'arm4.stl',   color: 0xbec3c8 },
  { key: 'mount1', file: 'mount1.stl', color: 0x3a8cb3 },
  { key: 'mount2', file: 'mount2.stl', color: 0x3a8cb3 },
  { key: 'mount3', file: 'mount3.stl', color: 0x3a8cb3 },
  { key: 'mount4', file: 'mount4.stl', color: 0x3a8cb3 }
];

async function init() {
  const stage = document.getElementById('heroStage3d');
  const container = document.getElementById('viewer3d');
  const loadingEl = document.getElementById('stlLoading');
  if (!stage || !container) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (e) {
    stage.classList.add('no-webgl');
    if (loadingEl) loadingEl.style.display = 'none';
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0a0c0d, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(2.1, 1.7, 2.6);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x34c3ff, 0.6);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.6;
  controls.maxDistance = 6;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI - 0.25;

  let autoRotate = !reduced;
  let idleTimer = null;
  controls.addEventListener('start', () => {
    autoRotate = false;
    stage.classList.add('dragging');
    if (idleTimer) clearTimeout(idleTimer);
  });
  controls.addEventListener('end', () => {
    stage.classList.remove('dragging');
    idleTimer = setTimeout(() => { autoRotate = !reduced; }, 3200);
  });

  const group = new THREE.Group();
  scene.add(group);

  const loader = new STLLoader();
  const box = new THREE.Box3();
  let anyLoaded = false;

  await Promise.all(PARTS.map(async (p) => {
    try {
      const geometry = await loader.loadAsync(`assets/stl/${p.file}`);
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: 0.55,
        metalness: 0.18
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
      anyLoaded = true;
    } catch (e) {
      console.error('STL load failed:', p.file, e);
    }
  }));

  if (!anyLoaded) {
    stage.classList.add('no-webgl');
    if (loadingEl) loadingEl.style.display = 'none';
    return;
  }

  // recenter + scale the assembled group so it fills the view consistently
  box.setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.1 / extent;
  group.children.forEach((mesh) => {
    mesh.position.sub(center);
  });
  group.scale.setScalar(scale);
  controls.target.set(0, 0, 0);

  function resize() {
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let lastScrollFrac = 0;
  let firstFrame = true;

  renderer.setAnimationLoop(() => {
    if (autoRotate) group.rotation.y += 0.0025;
    const frac = window.scrollFrac || 0;
    group.rotation.y += (frac - lastScrollFrac) * 2.4;
    lastScrollFrac = frac;

    controls.update();
    renderer.render(scene, camera);

    if (firstFrame && loadingEl) { loadingEl.classList.add('hidden'); firstFrame = false; }
  });
}

init().catch((e) => {
  console.error('3D viewer failed to initialize:', e);
  const stage = document.getElementById('heroStage3d');
  const loadingEl = document.getElementById('stlLoading');
  if (stage) stage.classList.add('no-webgl');
  if (loadingEl) loadingEl.style.display = 'none';
});

/* ---- side-by-side viewers comparing the arm across generative-design iterations ---- */
function initIterationCell(cell) {
  const container = cell.querySelector('.iter-canvas');
  const loadingEl = cell.querySelector('.iter-loading');
  const stlKey = cell.dataset.stl;
  if (!container || !stlKey) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    cell.style.display = 'none';
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x14181a, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(1.8, 1.4, 2.2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x34c3ff, 0.55);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // full free orbit, same feel as the hero viewer; vertical drags still
  // scroll the page thanks to touch-action: pan-y on the canvas
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.0;
  controls.maxDistance = 5;

  let autoRotate = true;
  let idleTimer = null;
  controls.addEventListener('start', () => {
    autoRotate = false;
    if (idleTimer) clearTimeout(idleTimer);
  });
  controls.addEventListener('end', () => {
    idleTimer = setTimeout(() => { autoRotate = true; }, 3200);
  });

  function resize() {
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let mesh = null;
  renderer.setAnimationLoop(() => {
    if (autoRotate && mesh) mesh.rotation.y += 0.003;
    controls.update();
    renderer.render(scene, camera);
  });

  async function load() {
    const loader = new STLLoader();
    const geometry = await loader.loadAsync(`assets/stl/${stlKey}.stl`);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0x74b8d6, roughness: 0.5, metalness: 0.15 });
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.7 / extent;
    mesh.position.sub(center.multiplyScalar(scale));
    mesh.scale.setScalar(scale);

    if (loadingEl) loadingEl.classList.add('hidden');
  }

  return { load };
}

function initIterationViewer() {
  const root = document.getElementById('iterViewer');
  if (!root) return;
  const track = root.querySelector('.iter-grid');
  const cells = Array.prototype.slice.call(root.querySelectorAll('.iter-cell'));
  const viewers = cells.map(initIterationCell).filter(Boolean);

  const prevBtn = root.querySelector('.iter-nav.prev');
  const nextBtn = root.querySelector('.iter-nav.next');
  function scrollByCell(dir) {
    if (!track || !cells[0]) return;
    const step = cells[0].getBoundingClientRect().width + 18; // + gap
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  }
  if (prevBtn) prevBtn.addEventListener('click', () => scrollByCell(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => scrollByCell(1));

  let started = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !started) {
        started = true;
        viewers.forEach((v) => v.load().catch((err) => console.error('iteration STL load failed:', err)));
        io.disconnect();
      }
    });
  }, { rootMargin: '200px' });
  io.observe(root);
}

initIterationViewer();
