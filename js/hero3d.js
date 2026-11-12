/* =====================================================================
   RoseDsigns — hero "bloom" scene (three.js)
   Rose-gold petals, gold rings and ivory pearls drifting in a soft
   burgundy light. Move the pointer to push them, click to scatter.
   Falls back silently to the CSS gradient if WebGL is unavailable.
   ===================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const win = document.getElementById('hmain');
const canvas = document.getElementById('heroCanvas');
if (!win || !canvas) throw new Error('no hero');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = innerWidth < 760;

function canGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!canGL()) throw new Error('no webgl');

const C = { blush: 0xE9C5C8, rose: 0x8E3246, gold: 0xC9A76A, ivory: 0xF9F5EF, burgundy: 0x5A1F2E };

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment(), .04).texture;

const cam = new THREE.PerspectiveCamera(32, 2, .1, 60);
cam.position.set(0, 0, 13);

/* lights: warm key, pink rim, soft fill */
const key = new THREE.DirectionalLight(0xfff3e2, 2.45); key.position.set(4, 6, 8); scene.add(key);
const rim = new THREE.DirectionalLight(0xf0a9b4, 1.55); rim.position.set(-6, -2, -4); scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffe9e2, 0x240b14, .45));
const glow = new THREE.PointLight(C.blush, 30, 20, 2); glow.position.set(-3, 2, 3); scene.add(glow);

/* geometry: a petal is a squashed sphere with a gentle cup */
function petalGeo(s) {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const yy = y * 1.25, zz = z * .18 + (x * x) * .22 + (y > 0 ? y * y * .12 : 0);
    p.setXYZ(i, x * .72 * s, yy * s, zz * s);
  }
  g.computeVertexNormals();
  return g;
}
const S = phone ? .62 : .8;
const GEO = {
  petal: petalGeo(S),
  ring: new THREE.TorusGeometry(.58 * S, .14 * S, 24, 64),
  pearl: new THREE.SphereGeometry(.26 * S, 32, 24),
  bud: (() => { const g = new THREE.SphereGeometry(.42 * S, 32, 24); g.scale(1, 1.25, 1); return g; })()
};
const MAT = {
  blush: new THREE.MeshPhysicalMaterial({ color: C.blush, roughness: .45, clearcoat: .8, clearcoatRoughness: .2, sheen: 1, sheenColor: new THREE.Color(0xffd9d4), sheenRoughness: .5, envMap: env, envMapIntensity: .5, side: THREE.DoubleSide }),
  rose: new THREE.MeshPhysicalMaterial({ color: C.rose, roughness: .5, clearcoat: .7, clearcoatRoughness: .25, sheen: .8, sheenColor: new THREE.Color(0xf6cfcc), envMap: env, envMapIntensity: .5, side: THREE.DoubleSide }),
  gold: new THREE.MeshPhysicalMaterial({ color: C.gold, metalness: 1, roughness: .22, envMap: env, envMapIntensity: 1.3 }),
  ivory: new THREE.MeshPhysicalMaterial({ color: C.ivory, roughness: .18, clearcoat: 1, clearcoatRoughness: .05, envMap: env, envMapIntensity: .8 }),
  burg: new THREE.MeshPhysicalMaterial({ color: C.burgundy, roughness: .4, clearcoat: .9, clearcoatRoughness: .1, envMap: env, envMapIntensity: .7, side: THREE.DoubleSide })
};

/* population */
let seed = 13; const rnd = () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646);
const items = [];
const group = new THREE.Group(); scene.add(group);
const N = phone ? 26 : 46;
const MIX = ['petal', 'petal', 'petal', 'petal', 'ring', 'pearl', 'petal', 'bud', 'petal', 'ring', 'pearl'];
const MATS = { petal: ['blush', 'blush', 'rose', 'blush', 'burg'], ring: ['gold'], pearl: ['ivory', 'gold'], bud: ['rose', 'blush'] };
for (let i = 0; i < N; i++) {
  const shape = MIX[i % MIX.length];
  const mats = MATS[shape]; const mat = MAT[mats[Math.floor(rnd() * mats.length)]];
  const mesh = new THREE.Mesh(GEO[shape], mat);
  const home = new THREE.Vector3((rnd() - .5) * (phone ? 7 : 13), (rnd() - .5) * 7.5, (rnd() - .5) * 4);
  mesh.position.copy(home);
  mesh.quaternion.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
  const sc = .7 + rnd() * .7; mesh.scale.setScalar(sc);
  group.add(mesh);
  items.push({ m: mesh, home, v: new THREE.Vector3(), w: new THREE.Vector3((rnd() - .5) * .6, (rnd() - .5) * .6, (rnd() - .5) * .6), ph: rnd() * 6.28, sp: .4 + rnd() * .6, r: .55 * sc * S });
}

/* pointer -> world point on z=0 plane */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const cur = { p: new THREE.Vector3(0, 0, 99), prev: new THREE.Vector3(0, 0, 99), v: new THREE.Vector3(), on: false };
const tmp = new THREE.Vector3();
function setCursor(e) {
  const r = win.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  if (ray.ray.intersectPlane(plane, tmp)) cur.p.copy(tmp);
}
win.addEventListener('pointermove', e => { setCursor(e); if (!cur.on) { cur.prev.copy(cur.p); cur.on = true; } });
win.addEventListener('pointerleave', () => { cur.on = false; cur.p.set(0, 0, 99); cur.prev.copy(cur.p); });
win.addEventListener('pointerdown', e => { setCursor(e); burst(cur.p); });
function burst(at) {
  for (const it of items) {
    tmp.subVectors(it.m.position, at); const d = tmp.length(); if (d > 6) continue;
    tmp.normalize().multiplyScalar((6 - d) * 1.6); it.v.add(tmp); it.v.z += (Math.random() - .5) * 2;
    it.w.set((Math.random() - .5) * 4, (Math.random() - .5) * 4, (Math.random() - .5) * 4);
  }
}

/* scroll parallax: group drifts up as the hero leaves the viewport */
let scrollY0 = 0;
function onScroll() { scrollY0 = Math.min(1, (scrollY || 0) / Math.max(1, innerHeight)); }
addEventListener('scroll', onScroll, { passive: true });

/* resize */
function resize() {
  const r = win.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
}
resize(); addEventListener('resize', resize);

/* step */
let visible = true, last = performance.now();
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '60px' }).observe(win);
const tq = new THREE.Quaternion(), axis = new THREE.Vector3();
function step(dt, t) {
  cur.v.subVectors(cur.p, cur.prev); cur.prev.copy(cur.p);
  for (const it of items) {
    const m = it.m;
    /* spring to home + gentle bob */
    tmp.copy(it.home); tmp.y += Math.sin(t * it.sp + it.ph) * .35; tmp.x += Math.cos(t * it.sp * .7 + it.ph) * .25;
    tmp.sub(m.position).multiplyScalar(1.6); it.v.addScaledVector(tmp, dt);
    /* pointer push */
    if (cur.on) {
      tmp.subVectors(m.position, cur.p); tmp.z = 0; const d = tmp.length(); const R = 2.6 + it.r;
      if (d < R && d > 1e-4) { tmp.normalize().multiplyScalar((R - d) * 9); it.v.addScaledVector(tmp, dt); it.v.addScaledVector(cur.v, 1.5); it.w.x += (Math.random() - .5) * .4; it.w.y += (Math.random() - .5) * .4; }
    }
    it.v.multiplyScalar(1 - 2.2 * dt);
    m.position.addScaledVector(it.v, dt);
    /* spin */
    const wl = it.w.length();
    if (wl > 1e-4) { axis.copy(it.w).normalize(); tq.setFromAxisAngle(axis, wl * dt); m.quaternion.premultiply(tq); }
    it.w.multiplyScalar(1 - .6 * dt);
    if (wl < .15) { it.w.x += (Math.random() - .5) * .02; it.w.y += (Math.random() - .5) * .02; }
  }
  /* soft camera parallax toward pointer, plus scroll lift */
  const tx = cur.on ? cur.p.x * .06 : 0, ty = cur.on ? cur.p.y * .04 : 0;
  cam.position.x += (tx - cam.position.x) * .04; cam.position.y += (ty - cam.position.y) * .04;
  group.position.y += ((scrollY0 * 3.2) - group.position.y) * .08;
  group.rotation.z += ((scrollY0 * .12) - group.rotation.z) * .08;
  cam.lookAt(0, 0, 0);
  glow.position.x = Math.sin(t * .4) * 4; glow.position.y = Math.cos(t * .3) * 2.5;
}
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!visible || document.hidden) return;
  if (!RM) step(dt, now / 1000);
  renderer.render(scene, cam);
}
if (RM) { step(.016, 0); renderer.render(scene, cam); win.classList.add('live'); }
else { requestAnimationFrame(loop); win.classList.add('live'); }
