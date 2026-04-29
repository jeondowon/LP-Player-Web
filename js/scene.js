// ── THREE SETUP ──
const canvas = document.getElementById("three-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1008);
scene.fog = new THREE.FogExp2(0x1a1008, 0.022);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
const orb = { p: Math.PI / 3.5, a: 0, r: 10, tp: Math.PI / 3.5, ta: 0, tr: 10, drag: false, lx: 0, ly: 0 };

function camUpdate() {
  camera.position.set(
    orb.r * Math.sin(orb.p) * Math.sin(orb.a),
    orb.r * Math.cos(orb.p) + 0.5,
    orb.r * Math.sin(orb.p) * Math.cos(orb.a)
  );
  camera.lookAt(0, 0.5, 0);
}

// ── LIGHTS ──
scene.add(new THREE.AmbientLight(0x3d2010, 1.4));
const b1 = new THREE.PointLight(0xffcc77, 2.5, 18);
b1.position.set(-1.5, 5, -0.5); b1.castShadow = true; scene.add(b1);
const b2 = new THREE.PointLight(0xffaa44, 1.8, 14);
b2.position.set(2.5, 4.8, 0.5); scene.add(b2);
const spot = new THREE.SpotLight(0xffd27f, 3, 12, Math.PI / 6, 0.4);
spot.position.set(0, 6, 1); spot.castShadow = true; scene.add(spot); scene.add(spot.target);

const woodMat = (c = 0x5a3010, r = 0.85) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });

// ── TABLE ──
const tg = new THREE.Group();
const ttop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.0), woodMat(0x6b3d1a, 0.72));
ttop.receiveShadow = ttop.castShadow = true;
tg.add(ttop);
[[-1.3, -0.75], [1.3, -0.75], [-1.3, 0.75], [1.3, 0.75]].forEach(([lx, lz]) => {
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), woodMat(0x4a2810, 0.85));
  l.position.set(lx, -0.86, lz); l.castShadow = true; tg.add(l);
});
tg.position.set(0, -0.2, 0);
scene.add(tg);

// ── TURNTABLE ──
const TT = new THREE.Group();
TT.position.set(0, 0.08, 0);
scene.add(TT);

const ttBase = new THREE.Mesh(
  new THREE.BoxGeometry(2.6, 0.18, 1.9),
  new THREE.MeshStandardMaterial({ color: 0x4a2c12, roughness: 0.6, metalness: 0.1 })
);
ttBase.castShadow = true; TT.add(ttBase);

const PLATTER_Y = 0.125;
const platter = new THREE.Mesh(
  new THREE.CylinderGeometry(0.72, 0.72, 0.07, 64),
  new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.25, metalness: 0.5 })
);
platter.position.set(0, PLATTER_Y, 0); platter.castShadow = true; TT.add(platter);

for (let r = 0; r < 10; r++) {
  const rg = new THREE.Mesh(
    new THREE.TorusGeometry(0.18 + r * 0.05, 0.003, 6, 100),
    new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.1, metalness: 0.7 })
  );
  rg.rotation.x = Math.PI / 2;
  rg.position.set(0, PLATTER_Y + 0.038, 0);
  TT.add(rg);
}

const spindle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.018, 0.018, 0.1, 12),
  new THREE.MeshStandardMaterial({ color: 0xccaa55, metalness: 0.9, roughness: 0.1 })
);
spindle.position.set(0, PLATTER_Y + 0.088, 0); TT.add(spindle);

// ── VINYL ──
const VINYL_Y = PLATTER_Y + 0.055;
const VG = new THREE.Group();
VG.position.set(0, VINYL_Y, 0);
TT.add(VG);

VG.add(new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.7, 0.03, 128),
  new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.12, metalness: 0.55 })
));

for (let r = 0; r < 12; r++) {
  const rg = new THREE.Mesh(
    new THREE.TorusGeometry(0.16 + r * 0.044, 0.0025, 6, 120),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.08, metalness: 0.65 })
  );
  rg.rotation.x = Math.PI / 2; rg.position.y = 0.016; VG.add(rg);
}

const lc = document.createElement("canvas");
lc.width = lc.height = 512;
const lctx = lc.getContext("2d");
lctx.fillStyle = "#2a1408";
lctx.beginPath(); lctx.arc(256, 256, 256, 0, Math.PI * 2); lctx.fill();
const lTex = new THREE.CanvasTexture(lc);

const LM = new THREE.Mesh(
  new THREE.CylinderGeometry(0.2, 0.2, 0.035, 64),
  [
    new THREE.MeshStandardMaterial({ color: 0x111 }),
    new THREE.MeshBasicMaterial({ map: lTex }),
    new THREE.MeshStandardMaterial({ color: 0x111 }),
  ]
);
LM.position.y = 0.016; VG.add(LM);

const vHole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.016, 0.016, 0.05, 16),
  new THREE.MeshStandardMaterial({ color: 0x050302 })
);
vHole.position.set(0, 0.016, 0); VG.add(vHole);

// ── TONEARM ──
const PIVOT_X = 0.9, PIVOT_Z = -0.62;
const PIVOT_Y = PLATTER_Y + 0.09;
const taBaseH = 0.18;

const taBase = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.06, taBaseH, 16),
  new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 })
);
taBase.position.set(PIVOT_X, PIVOT_Y - taBaseH / 2, PIVOT_Z); TT.add(taBase);

const TAG = new THREE.Group();
TAG.position.set(PIVOT_X, PIVOT_Y, PIVOT_Z);
TT.add(TAG);

const ARM_LEN = 1.05;
const armMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.012, 0.012, ARM_LEN, 12),
  new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.88, roughness: 0.12 })
);
armMesh.rotation.z = Math.PI / 2;
armMesh.position.set(-ARM_LEN / 2, 0, 0);
TAG.add(armMesh);

const pivotJoint = new THREE.Mesh(
  new THREE.SphereGeometry(0.025, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.88, roughness: 0.12 })
);
TAG.add(pivotJoint);

const hsMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.13, 0.045, 0.055),
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 })
);
hsMesh.position.set(-ARM_LEN, 0, 0); TAG.add(hsMesh);

const ndlMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.004, 0.001, 0.09, 8),
  new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.05 })
);
ndlMesh.position.set(-ARM_LEN, -0.06, 0); TAG.add(ndlMesh);

const cwMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.028, 0.028, 0.12, 12),
  new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 })
);
cwMesh.rotation.z = Math.PI / 2;
cwMesh.position.set(0.12, 0, 0);
TAG.add(cwMesh);

const ARM_ANGLE_PLAY = 0.2;
const ARM_ANGLE_LIFTED = -0.52;
TAG.rotation.y = ARM_ANGLE_LIFTED;

// ── ALBUM ART ──
function updateAlbumArt(url) {
  if (!url) return;
  const img = new Image(); img.crossOrigin = "anonymous";
  img.onload = () => {
    lctx.clearRect(0, 0, 512, 512);
    lctx.save();
    lctx.beginPath(); lctx.arc(256, 256, 256, 0, Math.PI * 2); lctx.clip();
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(512 / iw, 512 / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (512 - dw) / 2, dy = (512 - dh) / 2;
    lctx.drawImage(img, dx, dy, dw, dh);
    lctx.restore();
    lTex.needsUpdate = true;
  };
  img.onerror = () => {
    lctx.fillStyle = "#2a1408";
    lctx.beginPath(); lctx.arc(256, 256, 256, 0, Math.PI * 2); lctx.fill();
    lTex.needsUpdate = true;
  };
  img.src = url.replace("mqdefault", "maxresdefault").replace("hqdefault", "maxresdefault");
}

// ── TONEARM ANIM ──
let taLifted = true;
function liftArm(cb) {
  if (taLifted) { cb && cb(); return; }
  taLifted = true;
  const sry = TAG.rotation.y, t0 = performance.now();
  (function t() {
    const p = Math.min((performance.now() - t0) / 700, 1), e = 1 - Math.pow(1 - p, 3);
    TAG.rotation.y = sry + (ARM_ANGLE_LIFTED - sry) * e;
    if (p < 1) requestAnimationFrame(t);
    else { TAG.rotation.y = ARM_ANGLE_LIFTED; cb && cb(); }
  })();
}
function dropArm(cb) {
  if (!taLifted) { cb && cb(); return; }
  taLifted = false;
  const sry = TAG.rotation.y, t0 = performance.now();
  (function t() {
    const p = Math.min((performance.now() - t0) / 800, 1), e = 1 - Math.pow(1 - p, 3);
    TAG.rotation.y = sry + (ARM_ANGLE_PLAY - sry) * e;
    if (p < 1) requestAnimationFrame(t);
    else { TAG.rotation.y = ARM_ANGLE_PLAY; cb && cb(); }
  })();
}

// ── CAMERA ANIM ──
function camTopDown(cb) {
  const sp = orb.p, sa = orb.a, tp = Math.PI / 7, ta = 0, t0 = performance.now();
  (function t() {
    const p = Math.min((performance.now() - t0) / 900, 1),
      e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    orb.p = orb.tp = sp + (tp - sp) * e;
    orb.a = orb.ta = sa + (ta - sa) * e;
    camUpdate();
    if (p < 1) requestAnimationFrame(t); else cb && cb();
  })();
}

// ── SWAP VINYL ──
function swapVinyl(track, cb) {
  if (S.isAnimating) { cb && cb(); return; }
  S.isAnimating = true;
  camTopDown(() => liftArm(() => {
    const sx = VG.position.x, t0 = performance.now();
    (function out() {
      const p = Math.min((performance.now() - t0) / 600, 1);
      VG.position.x = sx - 5 * (p * p);
      if (p < 1) requestAnimationFrame(out);
      else {
        updateAlbumArt(track.thumbnail);
        VG.position.x = 5;
        const t1 = performance.now();
        (function inn() {
          const p = Math.min((performance.now() - t1) / 700, 1), e = 1 - Math.pow(1 - p, 3);
          VG.position.x = 5 - 5 * e;
          if (p < 1) requestAnimationFrame(inn);
          else { VG.position.x = 0; dropArm(() => { S.isAnimating = false; cb && cb(); }); }
        })();
      }
    })();
  }));
}

// ── RENDER LOOP ──
let vRot = 0;
const clk = new THREE.Clock();
(function loop() {
  requestAnimationFrame(loop);
  const d = clk.getDelta();
  orb.p += (orb.tp - orb.p) * 0.08;
  orb.a += (orb.ta - orb.a) * 0.08;
  orb.r += (orb.tr - orb.r) * 0.08;
  camUpdate();
  if (S.isPlaying) { vRot += d * 1.8; VG.rotation.y = vRot; }
  b1.intensity = 2.5 + Math.sin(Date.now() * 0.003) * 0.1;
  renderer.render(scene, camera);
})();

// ── DRAG / ZOOM / RESIZE ──
canvas.addEventListener("mousedown", (e) => {
  orb.drag = true; orb.lx = e.clientX; orb.ly = e.clientY;
  document.body.classList.add("dragging");
});
window.addEventListener("mousemove", (e) => {
  if (!orb.drag) return;
  orb.ta -= (e.clientX - orb.lx) * 0.008;
  orb.tp = Math.max(0.12, Math.min(Math.PI / 2.1, orb.tp + (e.clientY - orb.ly) * 0.006));
  orb.lx = e.clientX; orb.ly = e.clientY;
});
window.addEventListener("mouseup", () => { orb.drag = false; document.body.classList.remove("dragging"); });
canvas.addEventListener("touchstart", (e) => {
  orb.drag = true; orb.lx = e.touches[0].clientX; orb.ly = e.touches[0].clientY;
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  if (!orb.drag) return;
  orb.ta -= (e.touches[0].clientX - orb.lx) * 0.008;
  orb.tp = Math.max(0.12, Math.min(Math.PI / 2.1, orb.tp + (e.touches[0].clientY - orb.ly) * 0.006));
  orb.lx = e.touches[0].clientX; orb.ly = e.touches[0].clientY;
}, { passive: true });
window.addEventListener("touchend", () => (orb.drag = false));
window.addEventListener("wheel", (e) => {
  if (e.target.closest("#playlist-panel") || e.target.closest("#lp-shelf") || e.target.closest("#now-playing")) return;
  orb.tr = Math.max(5, Math.min(20, orb.tr + e.deltaY * 0.015));
});
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
