// Hero network cube, ESP32 board, section fades and the London clock.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const accent = () => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--p-accent").trim() || "#00e5ff");
const mouse = { x: 0, y: 0 };
addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });

// One renderer per canvas; draws only while on screen, once under reduced motion.
function mount(canvas, build) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  const { group, tick, place, recolour, tilt = 0.25 } = build(scene);
  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    place?.(camera.aspect);
    renderer.render(scene, camera);
  };
  new ResizeObserver(size).observe(canvas);
  let on = false, t = 0;
  const loop = () => {
    if (!on) return;
    t += 1 / 60;
    tick?.(t);
    group.rotation.y += 0.004;
    group.rotation.x += (mouse.y * 0.35 + tilt - group.rotation.x) * 0.04;
    group.rotation.z += (-mouse.x * 0.2 - group.rotation.z) * 0.04;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    on = e.isIntersecting && !still;
    if (on) requestAnimationFrame(loop); else renderer.render(scene, camera);
  }).observe(canvas);
  // the light/dark switch changes --p-accent
  new MutationObserver(() => { recolour?.(accent()); renderer.render(scene, camera); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  group.rotation.set(tilt, -0.6, 0);
  size();
}

// A 3x3x3 lattice of nodes and links, with packets running along random links.
function networkCube(scene) {
  const group = new THREE.Group(); scene.add(group);
  const c = accent();
  const pts = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) pts.push(new THREE.Vector3(x, y, z).multiplyScalar(1.15));
  const nodeMat = new THREE.MeshBasicMaterial({ color: c });
  const node = new THREE.SphereGeometry(0.05, 16, 16);
  for (const p of pts) { const m = new THREE.Mesh(node, nodeMat); m.position.copy(p); group.add(m); }
  const links = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].distanceTo(pts[j]) - 1.15) < 0.01) links.push([pts[i], pts[j]]);
  const lineMat = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.35 });
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(links.flat()), lineMat));
  const shellMat = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.8 });
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 2.3, 2.3)), shellMat));
  const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const packets = Array.from({ length: 10 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), packetMat); group.add(m);
    return { m, link: links[(i * 7) % links.length], off: i / 10 };
  });
  return {
    group,
    tick(t) { for (const p of packets) { const k = (t * 0.5 + p.off) % 1; if (k < 0.02) p.link = links[Math.floor(Math.random() * links.length)]; p.m.position.lerpVectors(p.link[0], p.link[1], k); } },
    place(aspect) { group.position.set(aspect > 1 ? 1.9 : 0, aspect > 1 ? 0.2 : 0.4, 0); group.scale.setScalar(aspect > 1 ? 0.8 : 0.7); },
    recolour(col) { nodeMat.color = col; lineMat.color = col; shellMat.color = col; },
  };
}

// A dev board: dark PCB, metal RF shield, printed antenna, two pin headers, USB port.
function esp32(scene) {
  const group = new THREE.Group(); scene.add(group);
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 3.5); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.PointLight(accent(), 30, 20); rim.position.set(-3, 1.5, -2); scene.add(rim);
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); group.add(m); return m; };
  const pcb = new THREE.MeshStandardMaterial({ color: 0x243142, roughness: 0.55 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.9, roughness: 0.28 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a84a, metalness: 1, roughness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.4 });
  box(3.4, 0.1, 1.5, pcb, 0, 0, 0);
  box(1.4, 0.2, 1.05, metal, 0.65, 0.15, 0);                       // RF shield over the ESP32 chip
  box(0.5, 0.04, 1.05, black, 1.55, 0.07, 0);                      // antenna keep-out area
  const zig = [];
  for (let i = 0; i <= 8; i++) zig.push(new THREE.Vector3(1.38 + (i % 2) * 0.3, 0.1, -0.45 + i * 0.11));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(zig), new THREE.LineBasicMaterial({ color: 0xd4a84a })));
  box(0.45, 0.22, 0.6, metal, -1.55, 0.15, 0);                     // USB port
  box(0.35, 0.08, 0.35, black, -0.65, 0.09, 0.2);                   // USB-serial chip
  box(0.14, 0.1, 0.14, black, -1.05, 0.1, -0.5);                   // reset button
  box(0.14, 0.1, 0.14, black, -1.05, 0.1, 0.5);                    // boot button
  const pin = new THREE.BoxGeometry(0.07, 0.3, 0.07);
  const pins = new THREE.InstancedMesh(pin, gold, 38);
  const mat4 = new THREE.Matrix4();
  for (let i = 0; i < 19; i++) for (const [k, z] of [[0, -0.66], [1, 0.66]]) { mat4.setPosition(-1.45 + i * 0.16, -0.18, z); pins.setMatrixAt(i * 2 + k, mat4); }
  group.add(pins);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), new THREE.MeshBasicMaterial({ color: accent() }));
  led.position.set(-0.3, 0.08, -0.5); group.add(led);
  return {
    group,
    tick(t) { led.visible = Math.sin(t * 3) > -0.2; },               // the board's status LED
    place(aspect) { group.scale.setScalar(aspect > 1 ? 1.6 : 1.2); },
    tilt: 0.75,
    recolour(col) { rim.color = col; led.material.color = col; },
  };
}

const cube = document.querySelector("[data-gl='network']");
const board = document.querySelector("[data-gl='esp32']");
try { cube && mount(cube, networkCube); board && mount(board, esp32); }
catch (err) { console.error("3D scenes off:", err); }   // no WebGL: the CSS glow and the words still show

// Section fades: each block rises once as it comes into view.
if (!still) {
  const items = document.querySelectorAll("main > section:not(.hero):not([data-moment]) .wrap > *, .closing__cta");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  items.forEach((el, i) => { el.classList.add("rise"); el.style.setProperty("--i", i % 3); io.observe(el); });
}

// London time in the hero's foot row.
const clock = document.querySelector("[data-clock]");
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" });
const tickClock = () => { if (clock) clock.textContent = fmt.format(new Date()); };
tickClock(); setInterval(tickClock, 1000);
