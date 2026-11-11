/* ============================================================================
   ÎLE ZEN — le monde du module Focus.
   Les pomodoros rapportent des briques (1 min = 1 brique, bonus de série et de cycle).
   On les dépense dans l'île : vitrine sous les réglages, éditeur plein écran au clic.
   ============================================================================ */
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };
var KEY = "hashprojects_island_v1";
var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function rnd(a, b){ return a + Math.random() * (b - a); }
function fmt(n){ return Math.floor(n).toLocaleString("fr-FR"); }
function toast(m){ if (window.showToast) window.showToast(m); }

/* ---------- catalogue (prix en briques = minutes de focus) ---------- */
var CAT = [
  { id:"bambou", name:"Bambous", cost:60 }, { id:"lanterne", name:"Lanterne", cost:75 }, { id:"pin", name:"Pin bonsaï", cost:90 },
  { id:"cerisier", name:"Cerisier", cost:120 }, { id:"karesansui", name:"Jardin sec", cost:150 }, { id:"potager", name:"Potager", cost:180 },
  { id:"torii", name:"Torii", cost:240 }, { id:"the", name:"Maison de thé", cost:360 }, { id:"minka", name:"Minka", cost:480 },
  { id:"cloche", name:"Cloche", cost:600 }, { id:"sanctuaire", name:"Sanctuaire", cost:900 }, { id:"pagode", name:"Pagode", cost:1400 },
  { id:"chateau", name:"Château", cost:2200 }, { id:"bouddha", name:"Grand Bouddha", cost:3000 } ];
var BY = {}; CAT.forEach(function(b){ BY[b.id] = b; });
var GROW = { 6:500, 7:900, 8:1400 };   // prix pour agrandir l'île (6×6 → 9×9)

/* ---------- état ---------- */
function norm(d){ d = (d && typeof d === "object") ? d : {};
  var tiles = {}; Object.keys(d.tiles || {}).forEach(function(k){ var v = d.tiles[k]; if (v && BY[v.id]) tiles[k] = { id:v.id, r:+v.r || 0 }; });
  return { N:Math.min(9, Math.max(6, +d.N || 6)), bricks:Math.max(0, +d.bricks || 0), earned:Math.max(0, +d.earned || 0), tiles:tiles,
           light:["auto","morning","golden","night"].indexOf(d.light) >= 0 ? d.light : "auto" }; }
var S;
try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch(e) { S = null; }
if (!S) { // reprise des briques gagnées avec l'ancienne île en cubes
  var old = null; try { old = JSON.parse(localStorage.getItem("hashprojects_world_v1") || "null"); } catch(e) {}
  S = norm(old ? { bricks:old.total, earned:old.total } : null);
} else S = norm(S);
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} }

/* ---------- gains : appelé à la fin de chaque pomodoro ---------- */
function streak(){ var h = (window.focusExportState ? window.focusExportState().history : {}) || {}, d = new Date(), n = 0;
  function k(x){ return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); }
  if (!(h[k(d)] && h[k(d)].n)) d.setDate(d.getDate()-1);
  while (h[k(d)] && h[k(d)].n) { n++; d.setDate(d.getDate()-1); } return n; }
function mult(){ return 1 + 0.1 * Math.min(5, Math.max(0, streak() - 1)); }
window.worldAward = function(min, cycleDone){
  var gain = Math.round(min * mult()) + (cycleDone ? 10 : 0);
  S.bricks += gain; S.earned += gain; save(); labels();
  setTimeout(function(){ toast("+" + gain + " briques pour ton île" + (cycleDone ? " (dont +10 cycle complet)" : "")); }, 900);
};
// persist : true pour un import de fichier. La synchro, elle, a déjà écrit le localStorage
// (réenregistrer ici la ferait renvoyer l'île au serveur).
window.islandImport = function(d, persist){ S = norm(d); if (persist) save(); labels(); if (ready) { rebuildAll(); if (!$("isl-ov").hidden) renderShop(); } };
window.islandExportState = function(){ return JSON.parse(JSON.stringify(S)); };

function labels(){
  var st = streak(), m = mult();
  $("isl-bal").textContent = fmt(S.bricks); $("isl-bal2").textContent = fmt(S.bricks);
  $("isl-earn").textContent = "1 minute de focus = 1 brique" + (st > 1 ? " · série de " + st + " jours : ×" + m.toFixed(1).replace(".", ",") : "") + " · " + fmt(S.earned) + " gagnées au total";
  var g = GROW[S.N]; $("isl-grow").textContent = g ? "Agrandir l'île en " + (S.N+1) + "×" + (S.N+1) + " · " + fmt(g) + " briques" : "Île à sa taille maximale";
  $("isl-grow").disabled = !g;
}

/* ---------- mode lumière (auto = selon l'heure) ---------- */
function lightMode(){ if (S.light !== "auto") return S.light; var h = new Date().getHours(); return h >= 6 && h < 16 ? "morning" : h >= 16 && h < 20 ? "golden" : "night"; }
function skyClass(){ var m = lightMode(); ["isl-card","isl-stage"].forEach(function(id){ var el = $(id); el.classList.toggle("morning", m === "morning"); el.classList.toggle("night", m === "night"); }); }

/* ---------- interface hors 3D (fonctionne même sans réseau) ---------- */
var ready = false, inBig = false, mode = null, selected = null, demoArm = false;
$("isl-card").addEventListener("click", openIsland);
$("isl-close").addEventListener("click", closeIsland);
document.addEventListener("keydown", function(e){
  if (e.key !== "Escape" || $("isl-ov").hidden) return;
  if (mode || selected) { mode = null; selected = null; renderShop(); renderChip(); return; }
  closeIsland(); });
function openIsland(){
  if (!window.THREE) { toast("L'île a besoin d'internet pour s'afficher"); return; }
  $("isl-ov").hidden = false; document.body.style.overflow = "hidden"; init(); inBig = true; mount(); renderShop(); renderChip(); labels(); skyClass();
  setTimeout(function(){ $("isl-close").focus(); }, 30); }
function closeIsland(){ $("isl-ov").hidden = true; document.body.style.overflow = ""; inBig = false; mode = null; selected = null; renderChip(); if (ready) mount(); }
$("isl-grow").addEventListener("click", function(){ var g = GROW[S.N]; if (!g) return;
  if (S.bricks < g) { toast("Il te manque " + fmt(g - S.bricks) + " briques"); return; }
  S.bricks -= g; S.N++; save(); buildIsland(); relocate(); syncSheep(); labels(); renderShop(); toast("Ton île passe à " + S.N + "×" + S.N); });
(function(){ var box = $("isl-light"); [["auto","Auto"],["morning","Matin"],["golden","Golden"],["night","Nuit"]].forEach(function(o){
  var b = document.createElement("button"); b.type = "button"; b.dataset.v = o[0]; b.textContent = o[1]; b.onclick = function(){ S.light = o[0]; save(); applyLight(); }; box.appendChild(b); }); })();
function applyLight(){ document.querySelectorAll("#isl-light button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.v === S.light)); }); skyClass(); if (ready) setMode(lightMode()); }
labels(); applyLight();
if (!window.THREE) $("isl-mini").innerHTML = '<span class="isl-off">L\'île s\'affiche quand tu es connecté à internet. Tes briques sont bien comptées.</span>';

/* ============================================================================
   3D (Three.js) — initialisée la première fois que le module Focus s'affiche
   ============================================================================ */
var renderer, scene, camera, controls, hemi, sun, sc, clock, cur, tgt = {}, PRE, C;
var island = null, placed = {}, clouds = [], koi = [], drifters = [], cranes = [], sheep = [], petals = [], puffs = [], flies = [];
var river = {}, riverPath = [], bridgeKey = null, lip = null, fall = null, bank = null, marker, ring;
var M, mesh, prism, hip, windowMat, shojiMat, lampMat, waterMat, bedMat, softTex, makers, mistCol, white, tmp, ray, ndc, plane, hit;
var miniAngle = .8, visibleMini = false;

function init(){
  if (ready || !window.THREE) return; ready = true;
  C = function(hex){ return new THREE.Color(hex).convertSRGBToLinear(); };
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  scene = new THREE.Scene(); scene.fog = new THREE.Fog(C(0xf0b487), 17, 38);
  camera = new THREE.PerspectiveCamera(34, 1, .1, 200); camera.position.set(10, 7.6, 10.5);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 40;
  controls.maxPolarAngle = 1.36; controls.target.set(0, -.2, 0); controls.enabled = false;
  hemi = new THREE.HemisphereLight(C(0xffcf9a), C(0x5a3a2c), .6); scene.add(hemi);
  sun = new THREE.DirectionalLight(C(0xffa75a), 1.9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
  sc = sun.shadow.camera; sc.near = .5; sc.far = 50; scene.add(sun); scene.add(sun.target);
  clock = new THREE.Clock(); mistCol = new THREE.Color(); white = new THREE.Color(1,1,1); tmp = new THREE.Vector3();
  PRE = {
    morning:{ sun:[6,10,5],   sunC:0xfff2de, sunI:1.25, hs:0xdcecff, hg:0x6b5a40, hi:.8,  exp:1.12, fog:0xdcebf3, fall:0xeaf7ff, night:0 },
    golden: { sun:[8,3.4,-5], sunC:0xffa257, sunI:2.0,  hs:0xffc994, hg:0x5a382a, hi:.62, exp:1.08, fog:0xf0b487, fall:0xffe2c2, night:.12 },
    night:  { sun:[-6,9,4],   sunC:0x8ea6ff, sunI:.3,   hs:0x3a4a85, hg:0x1a1622, hi:.38, exp:1.0,  fog:0x1b2446, fall:0xa7bbef, night:1 } };
  var p0 = PRE[lightMode()];
  cur = { sun:new THREE.Vector3().fromArray(p0.sun), sunC:C(p0.sunC), sunI:p0.sunI, hs:C(p0.hs), hg:C(p0.hg), hi:p0.hi, exp:p0.exp, fog:C(p0.fog), fall:C(p0.fall), night:p0.night };
  setMode(lightMode());
  materials(); makers = buildMakers();
  marker = new THREE.Mesh(new THREE.RingGeometry(.4, .47, 4, 1).rotateZ(Math.PI/4).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({ color:C(0x6fcf6a), transparent:true, opacity:.9 }));
  marker.visible = false; scene.add(marker);
  ring = new THREE.Mesh(new THREE.RingGeometry(.44, .5, 4, 1).rotateZ(Math.PI/4).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({ color:C(0xffffff), transparent:true, opacity:.9 }));
  ring.visible = false; scene.add(ring);
  ray = new THREE.Raycaster(); ndc = new THREE.Vector2(); plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0); hit = new THREE.Vector3();
  buildIsland(); relocate(); makeClouds(); makeCranes(); makeFlies(); rebuildAll(); pointer();
  if (window.ResizeObserver) { var ro = new ResizeObserver(resize); ro.observe($("isl-card")); ro.observe($("isl-big")); } window.addEventListener("resize", resize);
  if (window.IntersectionObserver) new IntersectionObserver(function(es){ visibleMini = es[0].isIntersecting; }).observe($("isl-card")); else visibleMini = true;
  mount(); requestAnimationFrame(frame);
}
function setMode(m){ var p = PRE[m];
  tgt = { sun:new THREE.Vector3().fromArray(p.sun), sunC:C(p.sunC), sunI:p.sunI, hs:C(p.hs), hg:C(p.hg), hi:p.hi, exp:p.exp, fog:C(p.fog), fall:C(p.fall), night:p.night }; }
function mount(){ if (!ready) return; var host = inBig ? $("isl-big") : $("isl-mini"); if (renderer.domElement.parentNode !== host) host.appendChild(renderer.domElement);
  controls.enabled = inBig; if (!inBig) { marker.visible = false; ring.visible = false; } resize();
  if (inBig) { camera.position.setLength(camDist()); controls.update(); } }
// recul de la caméra : plus loin sur un écran étroit pour que l'île entière reste visible
function camDist(){ return (12.5 + S.N * .55) * Math.max(1, 1.25 / (camera.aspect || 1)); }
function resize(){ if (!ready) return; var host = renderer.domElement.parentNode; if (!host) return; var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix(); }

/* ---------- matières et formes ---------- */
function materials(){
  var cache = {};
  function lin(m){ m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); return m; }
  M = function(c, o){ var k = c + JSON.stringify(o || {}); if (!cache[k]) cache[k] = lin(new THREE.MeshStandardMaterial(Object.assign({ color:c, roughness:.85, metalness:0, flatShading:true }, o || {}))); return cache[k]; };
  windowMat = lin(new THREE.MeshStandardMaterial({ color:0xd9cdb2, roughness:.6, emissive:0xffb35c, emissiveIntensity:0 }));
  shojiMat = lin(new THREE.MeshStandardMaterial({ color:0xf4ecda, roughness:.9, emissive:0xffb35c, emissiveIntensity:0, flatShading:true }));
  lampMat = lin(new THREE.MeshStandardMaterial({ color:0xfff0c4, emissive:0xffc061, emissiveIntensity:.25 }));
  waterMat = lin(new THREE.MeshStandardMaterial({ color:0x4f9fbd, roughness:.12, metalness:.1, transparent:true, opacity:.9, emissive:0x2c7896, emissiveIntensity:.18 }));
  bedMat = lin(new THREE.MeshStandardMaterial({ color:0xb7aa8c, roughness:1, flatShading:true }));
  mesh = function(g, m, x, y, z){ var e = new THREE.Mesh(g, m); e.position.set(x || 0, y || 0, z || 0); e.castShadow = true; e.receiveShadow = true; return e; };
  prism = function(w, h, d, m){ var s = new THREE.Shape(); s.moveTo(-w/2, 0); s.lineTo(w/2, 0); s.lineTo(0, h); s.lineTo(-w/2, 0);
    var g = new THREE.ExtrudeGeometry(s, { depth:d, bevelEnabled:false }); g.translate(0, 0, -d/2); return mesh(g, m); };
  hip = function(w, d, h, c){ var g = new THREE.ConeGeometry(Math.SQRT1_2, h, 4, 1); g.rotateY(Math.PI/4); g.scale(w, 1, d); return mesh(g, M(c)); };
  softTex = (function(){ var c = document.createElement("canvas"); c.width = c.height = 64; var x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c); })();
}
function buildMakers(){
  var ROOF = 0x454b53, RED = 0xc2402c, WOOD = 0x7d5638, DARKWOOD = 0x3d2d24, STONE = 0xb7b0a3, STONE2 = 0x989184;
  return {
  bambou:function(){ var g = new THREE.Group(), st = [];
    for (var i = 0; i < 6; i++) { var h = rnd(.75, 1.2), s = new THREE.Group(); s.position.set(rnd(-.22,.22), 0, rnd(-.22,.22));
      s.add(mesh(new THREE.CylinderGeometry(.024,.03,h,6), M(0x8bbb5c), 0, h/2, 0));
      for (var y = .2; y < h - .05; y += .2) s.add(mesh(new THREE.CylinderGeometry(.031,.031,.014,6), M(0x5f8f42), 0, y, 0));
      for (var l = 0; l < 3; l++) { var lf = mesh(new THREE.ConeGeometry(.035,.22,3), M(0x6fa84d), 0, h - .05 - l*.09, 0); lf.rotation.set(0, rnd(0,6), (l % 2 ? 1 : -1) * 1.15); s.add(lf); }
      s.userData.ph = rnd(0, 6); st.push(s); g.add(s); }
    g.userData.tick = function(t){ st.forEach(function(s){ s.rotation.z = Math.sin(t*1.2 + s.userData.ph) * .045; s.rotation.x = Math.cos(t + s.userData.ph) * .03; }); }; return g; },
  pin:function(){ var g = new THREE.Group(), tr = M(0x6b4a33);
    var a = mesh(new THREE.CylinderGeometry(.05,.08,.48,6), tr, .03, .23, 0); a.rotation.z = .22; g.add(a);
    var b = mesh(new THREE.CylinderGeometry(.035,.05,.42,6), tr, -.1, .56, 0); b.rotation.z = -.55; g.add(b);
    var c = mesh(new THREE.CylinderGeometry(.025,.035,.32,6), tr, .1, .5, .04); c.rotation.z = .95; g.add(c);
    [[-.25,.74,0,.27],[.24,.58,.05,.22],[-.03,.95,-.02,.2],[.2,.84,-.1,.14]].forEach(function(p){ var f = mesh(new THREE.IcosahedronGeometry(p[3], 1), M(0x3d6a38), p[0], p[1], p[2]); f.scale.set(1.3,.42,1.05); g.add(f); });
    return g; },
  cerisier:function(){ var g = new THREE.Group(), tr = M(0x5b3b2c);
    g.add(mesh(new THREE.CylinderGeometry(.05,.08,.5,6), tr, 0, .25, 0));
    var b1 = mesh(new THREE.CylinderGeometry(.024,.04,.36,5), tr, .1, .6, 0); b1.rotation.z = -.6; g.add(b1);
    var b2 = mesh(new THREE.CylinderGeometry(.024,.04,.32,5), tr, -.08, .6, .06); b2.rotation.set(.3, 0, .6); g.add(b2);
    var pinks = [0xf3b3c7, 0xf8cad7, 0xec9ab5];
    [[0,.88,0,.3],[.25,.77,.05,.22],[-.23,.79,.08,.22],[.05,.79,-.23,.2],[-.04,1.08,.02,.18]].forEach(function(p, i){ g.add(mesh(new THREE.IcosahedronGeometry(p[3], 1), M(pinks[i % 3]), p[0], p[1], p[2])); });
    var carpet = new THREE.Mesh(new THREE.CircleGeometry(.43, 20).rotateX(-Math.PI/2), M(0xf2c0ce, { flatShading:false })); carpet.position.y = .006; carpet.receiveShadow = true; g.add(carpet);
    g.userData.cherry = true; return g; },
  lanterne:function(){ var g = new THREE.Group(), st = M(STONE), st2 = M(STONE2);
    g.add(mesh(new THREE.CylinderGeometry(.16,.19,.08,6), st2, 0, .04, 0)); g.add(mesh(new THREE.CylinderGeometry(.05,.06,.34,6), st, 0, .25, 0));
    g.add(mesh(new THREE.CylinderGeometry(.14,.12,.05,6), st2, 0, .44, 0)); g.add(mesh(new THREE.BoxGeometry(.15,.15,.15), lampMat, 0, .54, 0));
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(function(p){ g.add(mesh(new THREE.BoxGeometry(.03,.15,.03), st2, p[0]*.075, .54, p[1]*.075)); });
    g.add(mesh(new THREE.ConeGeometry(.25,.15,6), st, 0, .69, 0)); g.add(mesh(new THREE.SphereGeometry(.04, 8, 6), st2, 0, .79, 0)); return g; },
  karesansui:function(){ var g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(.88,.04,.88), M(0xe8dfca, { flatShading:false }), 0, .02, 0));
    for (var i = 0; i < 8; i++) g.add(mesh(new THREE.BoxGeometry(.86,.01,.016), M(0xd5c9af), 0, .044, -.37 + i * .106));
    [[-.18,.09,-.1,.14],[.21,.07,.17,.1],[.14,.06,-.22,.07]].forEach(function(p){ var r = mesh(new THREE.DodecahedronGeometry(p[3], 0), M(0x77716a), p[0], p[1], p[2]); r.scale.y = .72; g.add(r);
      g.add(mesh(new THREE.CylinderGeometry(p[3]*1.35, p[3]*1.45, .014, 12), M(0x6c9748), p[0], .046, p[2])); }); return g; },
  potager:function(){ var g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(.84,.07,.84), M(0x6e4c33), 0, .035, 0));
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) { var x = (c - 1.5) * .19, z = (r - 1) * .25;
      if (r === 1) { g.add(mesh(new THREE.ConeGeometry(.04,.12,5).rotateX(Math.PI), M(0xf1ece0), x, .12, z)); g.add(mesh(new THREE.ConeGeometry(.035,.1,4), M(0x6fae4f), x, .2, z)); }
      else g.add(mesh(new THREE.IcosahedronGeometry(.072, 0), M(r ? 0x5e9b45 : 0x82c160), x, .11, z)); }
    for (var k = 0; k < 9; k++) g.add(mesh(new THREE.CylinderGeometry(.012,.012,.18,5), M(0xc6ad6b), -.42 + k * .105, .09, .44));
    g.add(mesh(new THREE.CylinderGeometry(.008,.008,.86,4).rotateZ(Math.PI/2), M(0xc6ad6b), 0, .15, .44)); return g; },
  torii:function(){ var g = new THREE.Group(), red = M(RED), blk = M(0x2a2624);
    [-.3, .3].forEach(function(x){ g.add(mesh(new THREE.CylinderGeometry(.04,.05,.9,8), red, x, .45, 0)); g.add(mesh(new THREE.CylinderGeometry(.06,.06,.07,8), blk, x, .035, 0)); });
    g.add(mesh(new THREE.BoxGeometry(.78,.06,.07), red, 0, .7, 0)); g.add(mesh(new THREE.BoxGeometry(.06,.13,.06), red, 0, .8, 0));
    g.add(mesh(new THREE.BoxGeometry(.9,.07,.1), red, 0, .9, 0)); g.add(mesh(new THREE.BoxGeometry(.96,.06,.13), blk, 0, .965, 0));
    var l = mesh(new THREE.BoxGeometry(.14,.05,.13), blk, -.53, .99, 0); l.rotation.z = .35; g.add(l);
    var r = mesh(new THREE.BoxGeometry(.14,.05,.13), blk, .53, .99, 0); r.rotation.z = -.35; g.add(r); g.scale.setScalar(.88); return g; },
  the:function(){ var g = new THREE.Group(), dark = M(DARKWOOD);
    g.add(mesh(new THREE.BoxGeometry(.8,.08,.72), M(WOOD), 0, .04, 0)); g.add(mesh(new THREE.BoxGeometry(.58,.36,.5), shojiMat, 0, .26, 0));
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(function(p){ g.add(mesh(new THREE.BoxGeometry(.04,.38,.04), dark, p[0]*.29, .27, p[1]*.25)); });
    for (var i = -2; i <= 2; i++) { g.add(mesh(new THREE.BoxGeometry(.012,.34,.008), dark, i*.11, .26, .253)); g.add(mesh(new THREE.BoxGeometry(.008,.34,.012), dark, .292, .26, i*.09)); }
    [.17, .33].forEach(function(y){ g.add(mesh(new THREE.BoxGeometry(.56,.01,.008), dark, 0, y, .253)); g.add(mesh(new THREE.BoxGeometry(.008,.01,.48), dark, .292, y, 0)); });
    var roof = hip(.92, .84, .3, ROOF); roof.position.y = .59; g.add(roof); g.add(mesh(new THREE.BoxGeometry(.32,.04,.05), M(0x34393f), 0, .74, 0));
    g.add(mesh(new THREE.CylinderGeometry(.08,.09,.03,8), M(STONE2), .14, .015, .47)); g.add(mesh(new THREE.CylinderGeometry(.07,.08,.03,8), M(STONE2), -.06, .015, .5)); return g; },
  minka:function(){ var g = new THREE.Group(), dark = M(DARKWOOD);
    g.add(mesh(new THREE.BoxGeometry(.72,.14,.62), dark, 0, .07, 0)); g.add(mesh(new THREE.BoxGeometry(.7,.3,.6), shojiMat, 0, .29, 0));
    for (var i = -3; i <= 3; i++) g.add(mesh(new THREE.BoxGeometry(.014,.3,.008), dark, i*.1, .29, .303));
    g.add(mesh(new THREE.BoxGeometry(.16,.24,.01), dark, -.2, .24, .306));
    var roof = hip(.96, .86, .5, 0xc29a5c); roof.position.y = .69; g.add(roof); g.add(mesh(new THREE.BoxGeometry(.4,.06,.08), M(0x5a4632), 0, .95, 0)); return g; },
  cloche:function(){ var g = new THREE.Group(), red = M(RED), bronze = M(0x8b6b3a, { metalness:.55, roughness:.4 });
    g.add(mesh(new THREE.BoxGeometry(.66,.1,.66), M(STONE), 0, .05, 0));
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(function(p){ g.add(mesh(new THREE.CylinderGeometry(.035,.04,.62,6), red, p[0]*.23, .41, p[1]*.23)); });
    g.add(mesh(new THREE.BoxGeometry(.56,.04,.56), red, 0, .7, 0)); var roof = hip(.82, .82, .3, ROOF); roof.position.y = .87; g.add(roof);
    var piv = new THREE.Group(); piv.position.y = .68; piv.add(mesh(new THREE.CylinderGeometry(.006,.006,.08,4), M(0x2a2624), 0, -.04, 0));
    piv.add(mesh(new THREE.CylinderGeometry(.08,.12,.24,12), bronze, 0, -.2, 0)); piv.add(mesh(new THREE.SphereGeometry(.08, 10, 6, 0, Math.PI*2, 0, Math.PI/2), bronze, 0, -.08, 0));
    g.add(piv); g.userData.tick = function(t){ piv.rotation.x = Math.sin(t*1.1) * .07; }; return g; },
  sanctuaire:function(){ var g = new THREE.Group(), red = M(RED);
    g.add(mesh(new THREE.BoxGeometry(.5,.05,.18), M(STONE), 0, .025, .38)); g.add(mesh(new THREE.BoxGeometry(.5,.05,.12), M(STONE), 0, .075, .3));
    g.add(mesh(new THREE.BoxGeometry(.74,.14,.6), M(WOOD), 0, .07, -.04)); g.add(mesh(new THREE.BoxGeometry(.52,.3,.42), shojiMat, 0, .29, -.04));
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(function(p){ g.add(mesh(new THREE.BoxGeometry(.045,.34,.045), red, p[0]*.27, .3, p[1]*.22 - .04)); });
    var roof = prism(.86, .3, .74, M(0x5a8a79)); roof.position.set(0, .45, -.04); roof.rotation.y = Math.PI/2; g.add(roof);
    [-.37, .37].forEach(function(x){ var a = mesh(new THREE.BoxGeometry(.03,.2,.03), M(0x3e5f54), x, .78, -.04); a.rotation.z = .5; g.add(a); var b = a.clone(); b.rotation.z = -.5; g.add(b); });
    g.add(mesh(new THREE.CylinderGeometry(.025,.025,.5,8).rotateZ(Math.PI/2), M(0xe7d6a5), 0, .43, .2));
    g.add(mesh(new THREE.CylinderGeometry(.04,.04,.07,10), M(0xd8b24a, { metalness:.5, roughness:.4 }), 0, .38, .2)); return g; },
  pagode:function(){ var g = new THREE.Group(), gold = M(0xd8b24a, { metalness:.6, roughness:.35 }); g.add(mesh(new THREE.BoxGeometry(.62,.08,.62), M(STONE), 0, .04, 0));
    var y = .08; for (var k = 0; k < 5; k++) { var w = .42 - k * .055, h = .18;
      g.add(mesh(new THREE.BoxGeometry(w, h, w), M(k ? 0xc4562f : 0xb9502c), 0, y + h/2, 0)); var r = hip(w + .3, w + .3, .1, ROOF); r.position.y = y + h + .05; g.add(r); y += h + .08; }
    g.add(mesh(new THREE.CylinderGeometry(.012,.018,.4,6), gold, 0, y + .2, 0));
    for (var i = 0; i < 4; i++) g.add(mesh(new THREE.TorusGeometry(.035 - i*.004, .008, 5, 14).rotateX(Math.PI/2), gold, 0, y + .08 + i*.06, 0)); return g; },
  chateau:function(){ var g = new THREE.Group(), gold = M(0xd8b24a, { metalness:.6, roughness:.35 });
    g.add(mesh(new THREE.CylinderGeometry(.34, .47, .34, 4).rotateY(Math.PI/4), M(0x9b958a), 0, .17, 0));
    var y = .34; [[.5,.26,.74],[.4,.22,.6],[.3,.2,.46]].forEach(function(t){
      g.add(mesh(new THREE.BoxGeometry(t[0], t[1], t[0]), M(0xf3f0e8), 0, y + t[1]/2, 0));
      g.add(mesh(new THREE.BoxGeometry(.05,.06,.01), M(0x2a2624), -.1, y + t[1]*.55, t[0]/2 + .003)); g.add(mesh(new THREE.BoxGeometry(.05,.06,.01), M(0x2a2624), .1, y + t[1]*.55, t[0]/2 + .003));
      var r = hip(t[2], t[2], .15, 0x3c434b); r.position.y = y + t[1] + .07; g.add(r); y += t[1] + .12; });
    g.add(mesh(new THREE.BoxGeometry(.2,.05,.05), M(0x3c434b), 0, y + .02, 0));
    [-.11, .11].forEach(function(x){ g.add(mesh(new THREE.ConeGeometry(.025,.08,4), gold, x, y + .08, 0)); }); return g; },
  bouddha:function(){ var g = new THREE.Group(), br = M(0x7d8a68, { metalness:.45, roughness:.5 }), gold = M(0xd8b24a, { metalness:.6, roughness:.35 });
    g.add(mesh(new THREE.CylinderGeometry(.36,.4,.1,12), M(STONE), 0, .05, 0));
    for (var i = 0; i < 12; i++) { var a = i/12 * Math.PI * 2, p = mesh(new THREE.IcosahedronGeometry(.08, 0), M(0xe9b9c6), Math.cos(a)*.26, .14, Math.sin(a)*.26); p.scale.set(1, .5, 1); g.add(p); }
    var legs = mesh(new THREE.CylinderGeometry(.1,.1,.46,10).rotateZ(Math.PI/2), br, 0, .22, .05); legs.scale.set(1, 1, 1.5); g.add(legs);
    var body = mesh(new THREE.IcosahedronGeometry(.2, 1), br, 0, .42, -.02); body.scale.set(1, 1.2, .85); g.add(body);
    g.add(mesh(new THREE.IcosahedronGeometry(.1, 1), br, 0, .72, 0)); g.add(mesh(new THREE.IcosahedronGeometry(.045, 0), br, 0, .83, 0));
    g.add(mesh(new THREE.TorusGeometry(.17, .014, 6, 28), gold, 0, .72, -.1)); return g; }
  };
}

/* ---------- rivière ---------- */
function computeRiver(){ river = {}; riverPath = []; var N = S.N, x0 = Math.floor(N/2) - 1, mid = Math.floor(N/2);
  for (var j = 0; j <= mid; j++) riverPath.push(x0 + "," + j);
  riverPath.push((x0 + 1) + "," + mid);
  for (var j2 = mid + 1; j2 < N; j2++) riverPath.push((x0 + 1) + "," + j2);
  riverPath.forEach(function(k){ river[k] = true; }); bridgeKey = (x0 + 1) + "," + Math.min(N - 2, mid + 1); }
computeRiverPlain();
function computeRiverPlain(){ var N = S.N, x0 = Math.floor(N/2) - 1, mid = Math.floor(N/2); river = {};
  for (var j = 0; j <= mid; j++) river[x0 + "," + j] = true; river[(x0 + 1) + "," + mid] = true; for (var j2 = mid + 1; j2 < N; j2++) river[(x0 + 1) + "," + j2] = true; }
function tilePos(k){ var p = k.split(","), o = (S.N - 1)/2; return new THREE.Vector3(+p[0] - o, 0, +p[1] - o); }
function inside(k){ var p = k.split(","); return +p[0] >= 0 && +p[1] >= 0 && +p[0] < S.N && +p[1] < S.N; }
function freeTiles(){ var out = [], o = (S.N - 1)/2; for (var i = 0; i < S.N; i++) for (var j = 0; j < S.N; j++) { var k = i + "," + j; if (!S.tiles[k] && !river[k]) out.push(k); }
  return out.sort(function(a, b){ var A = a.split(","), B = b.split(","); return (Math.abs(A[0]-o) + Math.abs(A[1]-o)) - (Math.abs(B[0]-o) + Math.abs(B[1]-o)); }); }
function relocate(){ Object.keys(S.tiles).forEach(function(k){ if (river[k] || !inside(k)) { var v = S.tiles[k]; delete S.tiles[k]; var f = freeTiles()[0]; if (f) S.tiles[f] = v; else S.bricks += Math.floor(BY[v.id].cost / 2); } }); save(); if (ready) rebuildAll(); }

/* ---------- construction de l'île ---------- */
function rounded(s, r){ var h = s/2, p = new THREE.Shape(); p.moveTo(-h+r, -h); p.lineTo(h-r, -h); p.quadraticCurveTo(h, -h, h, -h+r); p.lineTo(h, h-r);
  p.quadraticCurveTo(h, h, h-r, h); p.lineTo(-h+r, h); p.quadraticCurveTo(-h, h, -h, h-r); p.lineTo(-h, -h+r); p.quadraticCurveTo(-h, -h, -h+r, -h); return p; }
function ribbonTexture(){ var c = document.createElement("canvas"); c.width = 64; c.height = 256; var x = c.getContext("2d");
  x.fillStyle = "#4f9fc2"; x.fillRect(0, 0, 64, 256);
  var edge = x.createLinearGradient(0, 0, 64, 0); edge.addColorStop(0, "rgba(40,100,140,.55)"); edge.addColorStop(.18, "rgba(40,100,140,0)"); edge.addColorStop(.82, "rgba(40,100,140,0)"); edge.addColorStop(1, "rgba(40,100,140,.55)");
  x.fillStyle = edge; x.fillRect(0, 0, 64, 256);
  for (var i = 0; i < 26; i++) { var px = rnd(4, 60), len = rnd(50, 140), py = Math.random() * 256, light = i % 3 !== 0;
    var col = light ? "214,240,250" : "47,110,150", a = light ? rnd(.25, .5) : rnd(.2, .35);
    var gr = x.createLinearGradient(0, py, 0, py + len); gr.addColorStop(0, "rgba(" + col + ",0)"); gr.addColorStop(.5, "rgba(" + col + "," + a + ")"); gr.addColorStop(1, "rgba(" + col + ",0)");
    x.fillStyle = gr; var wv = rnd(2, 6); x.fillRect(px, py, wv, len); x.fillRect(px, py - 256, wv, len); }
  var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t; }
function soft(size, op){ var s = new THREE.Sprite(new THREE.SpriteMaterial({ map:softTex, color:0xffffff, transparent:true, opacity:op, depthWrite:false, fog:true })); s.scale.setScalar(size); return s; }
function makeKoi(i){ var g = new THREE.Group(), cols = [0xf2772a, 0xf6efe4, 0xe8442e];
  var body = mesh(new THREE.IcosahedronGeometry(.035, 1), M(cols[i % 3]), 0, 0, 0); body.scale.set(2.3, .6, .95); g.add(body);
  var tail = mesh(new THREE.ConeGeometry(.025, .05, 4).rotateZ(Math.PI/2), M(cols[i % 3]), -.09, 0, 0); tail.scale.z = .3; g.add(tail); g.userData.tail = tail; g.position.y = .012; return g; }
function buildIsland(){
  if (island) scene.remove(island);
  computeRiver(); koi = []; drifters = [];
  island = new THREE.Group(); var N = S.N, W = N + .6;
  var gTop = new THREE.ExtrudeGeometry(rounded(W, .9), { depth:.2, bevelEnabled:true, bevelThickness:.09, bevelSize:.1, bevelSegments:4, curveSegments:14 });
  gTop.rotateX(-Math.PI/2); var top = mesh(gTop, M(0x86b45e, { flatShading:false, roughness:.95 })); top.position.y = -.29; island.add(top);
  var gE = new THREE.ExtrudeGeometry(rounded(W - .08, .9), { depth:.36, bevelEnabled:true, bevelThickness:.05, bevelSize:.05, bevelSegments:2, curveSegments:14 });
  gE.rotateX(-Math.PI/2); var earth = mesh(gE, M(0xa8784f)); earth.position.y = -.72; island.add(earth);
  var gE2 = new THREE.ExtrudeGeometry(rounded(W - .3, .9), { depth:.3, bevelEnabled:false, curveSegments:14 });
  gE2.rotateX(-Math.PI/2); var earth2 = mesh(gE2, M(0x8c6446)); earth2.position.y = -1.02; island.add(earth2);
  var hR = W * .62, gR = new THREE.ConeGeometry(W * .47, hR, 9, 4); gR.rotateX(Math.PI);
  var pos = gR.attributes.position; for (var i = 0; i < pos.count; i++) { if (pos.getY(i) > hR/2 - .01) continue; pos.setX(i, pos.getX(i) + rnd(-.14,.14)); pos.setZ(i, pos.getZ(i) + rnd(-.14,.14)); pos.setY(i, pos.getY(i) + rnd(-.08,.08)); }
  gR.computeVertexNormals(); var rock = mesh(gR, M(0x7f6b5d)); rock.position.y = -1.0 - hR/2; island.add(rock);
  [[W*.62,-2.0,W*.18,.32],[-W*.6,-2.5,-W*.3,.24],[W*.08,-3.0,-W*.66,.2]].forEach(function(p){ var r = mesh(new THREE.IcosahedronGeometry(p[3], 0), M(0x7f6b5d), p[0], p[1], p[2]);
    var cap = mesh(new THREE.IcosahedronGeometry(p[3]*.75, 0), M(0x86b45e), 0, p[3]*.55, 0); cap.scale.y = .35; r.add(cap); r.userData.base = p[1]; r.userData.ph = rnd(0, 6); island.add(r); });
  for (var t = 0; t < 30; t++) { var a = rnd(0, 6.283), d = W/2 - rnd(.1, .22), x = Math.cos(a) * W, z = Math.sin(a) * W; x = Math.max(-d, Math.min(d, x)); z = Math.max(-d, Math.min(d, z));
    if (Math.abs(x) < d - .01 && Math.abs(z) < d - .01) { if (Math.abs(x) > Math.abs(z)) x = Math.sign(x) * d; else z = Math.sign(z) * d; }
    if (t % 3 === 0) { var st = mesh(new THREE.DodecahedronGeometry(rnd(.05,.09), 0), M(0x8d877d), x, .02, z); st.scale.y = .6; island.add(st); }
    else island.add(mesh(new THREE.ConeGeometry(.03, rnd(.1,.18), 4), M(0x5d8f3f), x, .06, z)); }
  // rivière : étang au fond, coude, puis cascade
  var lastKey = riverPath[riverPath.length - 1], pondKey = riverPath[0];
  riverPath.forEach(function(k){
    var c = tilePos(k), ij = k.split(",").map(Number), arms = [];
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dv){ if (river[(ij[0]+dv[0]) + "," + (ij[1]+dv[1])]) arms.push(dv); });
    if (k === lastKey) arms.push([0, 1, 1]);
    if (k === pondKey) {
      island.add(mesh(new THREE.CircleGeometry(.46, 24).rotateX(-Math.PI/2), bedMat, c.x, .006, c.z));
      var w = new THREE.Mesh(new THREE.CircleGeometry(.4, 28).rotateX(-Math.PI/2), waterMat); w.position.set(c.x, .022, c.z); w.receiveShadow = true; island.add(w);
      for (var s = 0; s < 14; s++) { var an = s/14 * Math.PI * 2; var rk = mesh(new THREE.DodecahedronGeometry(rnd(.045,.075), 0), M(s % 2 ? 0x8d877d : 0x9d978b), c.x + Math.cos(an)*.44, .03, c.z + Math.sin(an)*.44); rk.scale.y = .65; island.add(rk); }
      [[.15,-.12,.06],[-.18,.05,.05],[.02,.2,.045]].forEach(function(l){ var pad = mesh(new THREE.CylinderGeometry(l[2], l[2], .008, 10, 1, false, .4, Math.PI*2 - .4), M(0x5f9a48), c.x + l[0], .03, c.z + l[1]); pad.castShadow = false; island.add(pad); });
      for (var f = 0; f < 3; f++) { var fish = makeKoi(f); island.add(fish); koi.push({ g:fish, c:c.clone(), r:rnd(.14,.27), sp:rnd(.5,.9) * (f % 2 ? 1 : -1), ph:rnd(0,6) }); }
    } else { island.add(mesh(new THREE.PlaneGeometry(.72,.72).rotateX(-Math.PI/2), bedMat, c.x, .006, c.z)); var wc = new THREE.Mesh(new THREE.PlaneGeometry(.56,.56).rotateX(-Math.PI/2), waterMat); wc.position.set(c.x, .022, c.z); wc.receiveShadow = true; island.add(wc); }
    arms.forEach(function(dv){ var len = dv[2] ? (W/2 - c.z) + .04 : .5, half = len/2;
      var gx = dv[0] !== 0 ? len : .56, gz = dv[1] !== 0 ? len : .56, bx = dv[0] !== 0 ? len : .72, bz = dv[1] !== 0 ? len : .72;
      var cx = c.x + dv[0] * half, cz = c.z + dv[1] * half; if (k === pondKey) { cx = c.x + dv[0] * (half + .1); cz = c.z + dv[1] * (half + .1); }
      island.add(mesh(new THREE.PlaneGeometry(bx, bz).rotateX(-Math.PI/2), bedMat, cx, .007, cz));
      var wa = new THREE.Mesh(new THREE.PlaneGeometry(gx, gz).rotateX(-Math.PI/2), waterMat); wa.position.set(cx, .021, cz); wa.receiveShadow = true; island.add(wa); }); });
  // cascade : ruban bleu qui se perd dans la brume
  var lc = tilePos(lastKey), zEdge = W/2 + .1;
  var curve = new THREE.CatmullRomCurve3([ new THREE.Vector3(lc.x, .027, zEdge - .14), new THREE.Vector3(lc.x, .02, zEdge + .02), new THREE.Vector3(lc.x, -.14, zEdge + .13),
    new THREE.Vector3(lc.x, -.6, zEdge + .22), new THREE.Vector3(lc.x, -1.6, zEdge + .32), new THREE.Vector3(lc.x, -2.9, zEdge + .4) ]);
  var segs = 60, vp = [], vu = [], vi = [], L = curve.getLength();
  for (var sg = 0; sg <= segs; sg++) { var uu = sg/segs, cp = curve.getPoint(uu), hw = .28 - uu * .05;
    vp.push(cp.x - hw, cp.y, cp.z, cp.x + hw, cp.y, cp.z); vu.push(0, uu * L * .9, 1, uu * L * .9);
    if (sg < segs) { var a0 = sg * 2; vi.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); } }
  var rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(vp, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(vu, 2)); rg.setIndex(vi); rg.computeVertexNormals();
  var rtex = ribbonTexture();
  var rmat = new THREE.MeshStandardMaterial({ map:rtex, roughness:.18, metalness:.05, emissive:C(0x1f6688), emissiveIntensity:.35, transparent:true, opacity:.96, side:THREE.DoubleSide, depthWrite:false });
  rmat.onBeforeCompile = function(sh){
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vWy;").replace("#include <project_vertex>", "#include <project_vertex>\nvWy = (modelMatrix * vec4(transformed, 1.0)).y;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vWy;").replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(-2.5, -.7, vWy);"); };
  island.add(new THREE.Mesh(rg, rmat));
  fall = { tex:rtex, mat:rmat, curve:curve, foam:[], swirls:[] };
  for (var fo = 0; fo < 6; fo++) { var sp1 = soft(rnd(.16,.26), .75), p1 = curve.getPoint(rnd(.04, .16)); sp1.position.set(p1.x + rnd(-.22,.22), p1.y + .04, p1.z + .03); island.add(sp1); fall.foam.push({ s:sp1, base:sp1.position.clone(), ph:rnd(0,6), sz:sp1.scale.x }); }
  for (var sw = 0; sw < 9; sw++) { var sp2 = soft(.2, 0); island.add(sp2); fall.swirls.push({ s:sp2, u:rnd(0, 1), sp:rnd(.18, .3), dx:rnd(-.18,.18) }); }
  lip = { x:lc.x, z:zEdge };
  // mer de brume sous l'île
  bank = { g:new THREE.Group(), items:[], mats:[.5, .68, .85].map(function(op){ return new THREE.SpriteMaterial({ map:softTex, color:0xffffff, transparent:true, opacity:op, depthWrite:false, fog:false }); }) };
  [[-1.6, .6, 1.6, 2.4], [-2.1, .95, 2.2, 3.4], [-2.8, 1.0, 2.6, 4.0], [-3.8, .9, 2.8, 4.4], [-4.9, .7, 2.6, 4.2]].forEach(function(Lr, li){
    [[0, li ? 2 : 0], [W * .42, 6 + li], [W * .78, 9 + li], [W * 1.08, li > 0 ? 12 : 0]].forEach(function(rg2){ for (var q = 0; q < rg2[1]; q++) { var an2 = q / rg2[1] * Math.PI * 2 + rnd(-.2, .2) + li, rr = rg2[0] * Lr[1] + rnd(-.3, .3);
      var sp = new THREE.Sprite(bank.mats[li === 0 ? 0 : (q + li) % 3]), sz = rnd(Lr[2], Lr[3]); sp.scale.setScalar(sz);
      sp.position.set(Math.cos(an2) * rr, Lr[0] + rnd(-.25, .25), Math.sin(an2) * rr); bank.g.add(sp); bank.items.push({ s:sp, base:sp.position.clone(), sz:sz, ph:rnd(0, 6) }); } }); });
  island.add(bank.g);
  // pont rouge
  var bp = tilePos(bridgeKey), bridge = new THREE.Group(); bridge.position.copy(bp);
  for (var qq = 0; qq <= 8; qq++) { var u = qq/8, plank = mesh(new THREE.BoxGeometry(.11,.025,.36), M(0x8a5a35), -.42 + u*.84, Math.sin(u * Math.PI) * .16 + .05, 0); plank.rotation.z = -Math.cos(u * Math.PI) * .5; bridge.add(plank); }
  [-.17, .17].forEach(function(zz){ for (var q2 = 0; q2 <= 4; q2++) { var u2 = q2/4; bridge.add(mesh(new THREE.CylinderGeometry(.014,.014,.16,6), M(0xc2402c), -.4 + u2*.8, Math.sin(u2 * Math.PI) * .16 + .13, zz)); }
    for (var q3 = 0; q3 < 8; q3++) { var u3 = (q3 + .5)/8, rail = mesh(new THREE.BoxGeometry(.11,.02,.02), M(0xc2402c), -.42 + u3*.84, Math.sin(u3 * Math.PI) * .16 + .2, zz); rail.rotation.z = -Math.cos(u3 * Math.PI) * .5; bridge.add(rail); } });
  island.add(bridge);
  for (var dd = 0; dd < 6; dd++) { var leaf = mesh(new THREE.PlaneGeometry(.05,.035).rotateX(-Math.PI/2), M(dd % 2 ? 0xf3b3c7 : 0xe0a24f, { side:THREE.DoubleSide }), 0, .03, 0); leaf.castShadow = false; island.add(leaf); drifters.push({ g:leaf, s:rnd(0, 1), sp:rnd(.05, .08), fall:0 }); }
  scene.add(island);
  var e = W * 1.25; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.updateProjectionMatrix();
}
function riverPoint(s){ var pts = riverPath.map(tilePos); pts.push(new THREE.Vector3(lip.x, 0, lip.z)); var segs = pts.length - 1, f = s * segs, i = Math.min(segs - 1, Math.floor(f)); return pts[i].clone().lerp(pts[i+1], f - i); }

/* ---------- nuages, grues, moutons, lucioles ---------- */
function makeClouds(){ for (var c = 0; c < 7; c++) { var g = new THREE.Group(), n = 3 + (c % 3);
    for (var i = 0; i < n; i++) { var s = mesh(new THREE.IcosahedronGeometry(rnd(.35,.6), 1), M(0xfff4ea, { roughness:1 }), i*.45 - n*.2, rnd(-.08,.12), rnd(-.2,.2)); s.castShadow = false; g.add(s); }
    g.userData = { r:rnd(8, 12), a:rnd(0, 6.28), y:rnd(-3.4, 1.4), sp:rnd(.012, .03) }; g.scale.set(1, .6, 1); scene.add(g); clouds.push(g); } }
function wing(sign, w, k){ var g = new THREE.Group(); g.position.set(-.01, .025, sign * .04);
  g.add(mesh(new THREE.BoxGeometry(.16,.012,.26), w, 0, 0, sign * .13)); g.add(mesh(new THREE.BoxGeometry(.13,.013,.12), k, -.01, 0, sign * .31)); return g; }
function makeCranes(){ for (var i = 0; i < 5; i++) { var g = new THREE.Group(), w = M(0xf7f3ec), k = M(0x2b2a2f);
    var body = mesh(new THREE.IcosahedronGeometry(.075, 1), w, 0, 0, 0); body.scale.set(2.1, .8, .85); g.add(body);
    var neck = mesh(new THREE.CylinderGeometry(.012,.018,.2,5), k, .2, .03, 0); neck.rotation.z = -1.3; g.add(neck);
    g.add(mesh(new THREE.IcosahedronGeometry(.026, 0), w, .3, .055, 0)); g.add(mesh(new THREE.BoxGeometry(.018,.01,.018), M(0xd23b2e), .302, .078, 0));
    g.add(mesh(new THREE.ConeGeometry(.01,.07,4).rotateZ(-Math.PI/2), M(0xb8963e), .35, .05, 0));
    var legs = mesh(new THREE.CylinderGeometry(.005,.005,.22,4), k, -.24, -.015, 0); legs.rotation.z = 1.45; g.add(legs);
    var wl = wing(1, w, k), wr = wing(-1, w, k); g.add(wl, wr); g.userData = { wl:wl, wr:wr, i:i, ph:rnd(0, 6) }; scene.add(g); cranes.push(g); } }
function makeSheep(){ var g = new THREE.Group(), wool = M(0xf5f0e4), dark = M(0x2f2b2a);
  var body = mesh(new THREE.IcosahedronGeometry(.1, 1), wool, 0, .12, 0); body.scale.set(1.3, .95, .95); g.add(body);
  [[.07,.055],[.07,-.055],[-.07,.055],[-.07,-.055]].forEach(function(p){ g.add(mesh(new THREE.CylinderGeometry(.013,.013,.08,5), dark, p[0], .04, p[1])); });
  var head = new THREE.Group(); head.position.set(.12, .15, 0); head.add(mesh(new THREE.BoxGeometry(.075,.065,.06), dark, .025, -.01, 0)); head.add(mesh(new THREE.IcosahedronGeometry(.042, 0), wool, -.005, .025, 0));
  [-1, 1].forEach(function(sgn){ var ear = mesh(new THREE.BoxGeometry(.02,.012,.04), dark, .01, .005, sgn * .045); ear.rotation.x = sgn * .4; head.add(ear); });
  g.add(head); g.userData.head = head; return g; }
function syncSheep(){ if (!ready) return; sheep.forEach(function(s){ scene.remove(s.g); }); sheep = [];
  Object.keys(S.tiles).forEach(function(k){ if (S.tiles[k].id !== "potager" || !inside(k)) return; var ij = k.split(",").map(Number), home = tilePos(k);
    var near = [[1,0],[-1,0],[0,1],[0,-1]].map(function(d){ return (ij[0]+d[0]) + "," + (ij[1]+d[1]); }).filter(function(n){ return inside(n) && !S.tiles[n] && !river[n]; })[0];
    if (near) home = tilePos(near).lerp(home, .35);
    for (var i = 0; i < 2 && sheep.length < 8; i++) { var g = makeSheep(); g.position.copy(home).add(new THREE.Vector3(rnd(-.25,.25), 0, rnd(-.25,.25))); g.rotation.y = rnd(0, 6.3); scene.add(g);
      sheep.push({ g:g, home:home.clone(), to:g.position.clone(), wait:rnd(0, 2), ph:rnd(0, 6) }); } }); }
function makeFlies(){ for (var i = 0; i < 26; i++) { var fl = new THREE.Mesh(new THREE.SphereGeometry(.018, 6, 4), new THREE.MeshBasicMaterial({ color:0xffe58a, transparent:true, opacity:0 })); scene.add(fl); flies.push({ g:fl, b:new THREE.Vector3(rnd(-3,3), rnd(.2,.9), rnd(-3,3)), ph:rnd(0, 6) }); } }

/* ---------- objets posés ---------- */
function place(k, pop){ if (placed[k]) { scene.remove(placed[k]); delete placed[k]; } var v = S.tiles[k]; if (!v) return;
  var o = makers[v.id](); o.position.copy(tilePos(k)); o.rotation.y = (v.r || 0) * Math.PI / 2;
  if (pop) { o.userData.pop = clock.elapsedTime; o.scale.setScalar(.01); } scene.add(o); placed[k] = o; }
function rebuildAll(){ if (!ready) return; Object.keys(placed).forEach(function(k){ scene.remove(placed[k]); }); placed = {};
  if (S.N !== currentN) { buildIsland(); }
  Object.keys(S.tiles).forEach(function(k){ if (inside(k) && !river[k]) place(k, false); }); syncSheep(); }
var currentN = 0; var _bi = buildIsland; buildIsland = function(){ _bi(); currentN = S.N; };
function puff(p){ for (var i = 0; i < 14; i++) { var s = mesh(new THREE.IcosahedronGeometry(rnd(.05,.1), 0), M(0xfff6ea, { roughness:1 }).clone(), p.x, .1, p.z);
    s.material.transparent = true; s.castShadow = false; s.userData = { v:new THREE.Vector3(rnd(-1,1), rnd(.8,1.8), rnd(-1,1)), t0:clock.elapsedTime }; scene.add(s); puffs.push(s); } }

/* ---------- boutique et sélection ---------- */
var thumbs = null;
function makeThumbs(){ thumbs = {}; var r = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true }); r.setSize(128, 128); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping;
  var s = new THREE.Scene(); s.add(new THREE.HemisphereLight(C(0xfff1e0), C(0x6b5040), .9)); var d = new THREE.DirectionalLight(C(0xffc690), 1.5); d.position.set(4, 6, 5); s.add(d);
  var cam = new THREE.PerspectiveCamera(30, 1, .1, 50);
  CAT.forEach(function(b){ var o = makers[b.id](); o.rotation.y = -.35; s.add(o); var bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()), m = Math.max(sz.x, sz.y, sz.z);
    cam.position.copy(c).add(new THREE.Vector3(1, .8, 1.15).normalize().multiplyScalar(m * 2.3 + .4)); cam.lookAt(c); r.render(s, cam); thumbs[b.id] = r.domElement.toDataURL(); s.remove(o); });
  r.dispose(); }
function renderShop(){ if (!ready) return; if (!thumbs) makeThumbs(); var box = $("isl-shop"); box.innerHTML = "";
  CAT.forEach(function(b){ var poor = S.bricks < b.cost, btn = document.createElement("button"); btn.type = "button"; btn.className = "isl-item" + (poor ? " poor" : "");
    btn.setAttribute("aria-pressed", String(!!(mode && mode.buy === b.id)));
    btn.innerHTML = '<img alt="" src="' + thumbs[b.id] + '"><span>' + b.name + '</span><span class="c">' + fmt(b.cost) + '</span>';
    btn.title = poor ? "Il te manque " + fmt(b.cost - S.bricks) + " briques" : "Acheter " + b.name;
    btn.onclick = function(){ if (poor) { toast("Il te manque " + fmt(b.cost - S.bricks) + " briques (" + Math.ceil((b.cost - S.bricks) / 25) + " pomodoros)"); return; }
      selected = null; mode = (mode && mode.buy === b.id) ? null : { buy:b.id }; renderShop(); renderChip(); };
    box.appendChild(btn); });
  $("isl-hint").textContent = mode && mode.buy ? "Clique une case libre pour poser : " + BY[mode.buy].name + " (" + fmt(BY[mode.buy].cost) + " briques). Échap pour annuler."
    : mode && mode.move ? "Clique une case libre pour déplacer : " + BY[S.tiles[mode.move].id].name + "." : "Choisis un élément, puis clique une case libre pour le poser. Clique un bâtiment pour le tourner, le déplacer ou le démolir.";
  labels(); }
function renderChip(){ var el = $("isl-chip"); demoArm = false;
  if (!selected || !S.tiles[selected]) { el.hidden = true; ring && (ring.visible = false); return; }
  var b = BY[S.tiles[selected].id], back = Math.floor(b.cost / 2);
  el.innerHTML = '<b>' + b.name + '</b><button type="button" class="btn-ghost" data-a="rot">Tourner</button><button type="button" class="btn-ghost" data-a="move">Déplacer</button>' +
    '<button type="button" class="btn-ghost" data-a="demo">Démolir (+' + fmt(back) + ')</button><button type="button" class="btn-ghost" data-a="x" aria-label="Fermer">×</button>';
  el.hidden = false; if (ring) { ring.position.copy(tilePos(selected)).setY(.016); ring.visible = true; } }
$("isl-chip").addEventListener("click", function(e){ var b = e.target.closest("button"); if (!b || !selected) return; var a = b.dataset.a, v = S.tiles[selected];
  if (a === "x") { selected = null; renderChip(); return; }
  if (a === "rot") { v.r = ((v.r || 0) + 1) % 4; save(); placed[selected].rotation.y = v.r * Math.PI / 2; return; }
  if (a === "move") { mode = { move:selected }; selected = null; renderChip(); renderShop(); return; }
  if (a === "demo") { if (!demoArm) { demoArm = true; b.textContent = "Confirmer ? +" + fmt(Math.floor(BY[v.id].cost / 2)); return; }
    var back = Math.floor(BY[v.id].cost / 2), wasGarden = v.id === "potager"; S.bricks += back; delete S.tiles[selected]; scene.remove(placed[selected]); delete placed[selected];
    puff(tilePos(selected)); selected = null; save(); if (wasGarden) syncSheep(); renderChip(); renderShop(); toast("+" + fmt(back) + " briques récupérées"); } });
function tileFromEvent(e){ var r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left)/r.width*2 - 1, -(e.clientY - r.top)/r.height*2 + 1);
  ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(plane, hit)) return null; var o = (S.N - 1)/2, i = Math.round(hit.x + o), j = Math.round(hit.z + o);
  return (i >= 0 && j >= 0 && i < S.N && j < S.N) ? i + "," + j : null; }
function pointer(){ var el = renderer.domElement, down = null;
  el.addEventListener("pointerdown", function(e){ down = { x:e.clientX, y:e.clientY }; });
  el.addEventListener("pointermove", function(e){ if (!inBig) return; var k = tileFromEvent(e), free = k && !S.tiles[k] && !river[k];
    marker.visible = !!(mode && k); if (k) { marker.position.copy(tilePos(k)).setY(.015); marker.material.color.copy(C(free ? 0x6fcf6a : 0xe0533c)); }
    el.style.cursor = k && !river[k] ? "pointer" : "grab"; });
  el.addEventListener("pointerup", function(e){ if (!inBig || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; var k = tileFromEvent(e); if (!k || river[k]) return;
    if (mode && mode.buy) { if (S.tiles[k]) { toast("Case occupée"); return; } var b = BY[mode.buy]; if (S.bricks < b.cost) { mode = null; renderShop(); return; }
      S.bricks -= b.cost; S.tiles[k] = { id:b.id, r:0 }; save(); place(k, true); puff(tilePos(k)); if (b.id === "potager") syncSheep(); mode = null; marker.visible = false; renderShop(); toast(b.name + " posé"); return; }
    if (mode && mode.move) { if (S.tiles[k]) { toast("Case occupée"); return; } var from = mode.move; S.tiles[k] = S.tiles[from]; delete S.tiles[from];
      scene.remove(placed[from]); delete placed[from]; place(k, true); save(); syncSheep(); mode = null; marker.visible = false; renderShop(); return; }
    if (S.tiles[k]) { selected = k; renderChip(); } else { selected = null; renderChip(); } }); }

/* ---------- boucle ---------- */
function frame(){
  requestAnimationFrame(frame);
  var focusVisible = !$("module-focus").hidden && !document.hidden;
  if (!inBig && !(focusVisible && visibleMini)) { clock.getDelta(); return; }
  var dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime, k = 1 - Math.pow(.02, dt);
  if (Math.floor(t) % 30 === 0 && S.light === "auto") { var lm = lightMode(); if (PRE[lm] && !tgt.sun.equals(new THREE.Vector3().fromArray(PRE[lm].sun))) { setMode(lm); skyClass(); } }
  cur.sun.lerp(tgt.sun, k); cur.sunC.lerp(tgt.sunC, k); cur.hs.lerp(tgt.hs, k); cur.hg.lerp(tgt.hg, k); cur.fog.lerp(tgt.fog, k); cur.fall.lerp(tgt.fall, k);
  cur.sunI += (tgt.sunI - cur.sunI) * k; cur.hi += (tgt.hi - cur.hi) * k; cur.exp += (tgt.exp - cur.exp) * k; cur.night += (tgt.night - cur.night) * k;
  sun.position.copy(cur.sun); sun.color.copy(cur.sunC); sun.intensity = cur.sunI; hemi.color.copy(cur.hs); hemi.groundColor.copy(cur.hg); hemi.intensity = cur.hi;
  scene.fog.color.copy(cur.fog); renderer.toneMappingExposure = cur.exp; var n = cur.night;
  windowMat.emissiveIntensity = n * 1.2; shojiMat.emissiveIntensity = n * .9; lampMat.emissiveIntensity = .25 + n * 2.2; waterMat.emissiveIntensity = .14 + Math.sin(t * 1.7) * .03 + n * .05;
  if (fall) { fall.tex.offset.y -= dt * .9; fall.mat.emissiveIntensity = .32 + n * .25;
    fall.foam.forEach(function(f){ f.s.position.y = f.base.y + Math.sin(t * 4 + f.ph) * .02; f.s.scale.setScalar(f.sz * (1 + Math.sin(t * 5 + f.ph) * .15)); f.s.material.color.copy(cur.fall); });
    fall.swirls.forEach(function(w){ w.u += w.sp * dt; if (w.u > 1) { w.u = rnd(.08, .2); w.dx = rnd(-.18,.18); } var p = fall.curve.getPoint(w.u);
      w.s.position.set(p.x + w.dx, p.y, p.z + .04); w.s.scale.setScalar(.12 + w.u * .35); w.s.material.opacity = Math.sin(Math.min(1, w.u) * Math.PI) * .55; w.s.material.color.copy(cur.fall); }); }
  if (bank) { mistCol.copy(cur.fog).lerp(white, .4 - n * .25); bank.mats.forEach(function(m){ m.color.copy(mistCol); }); bank.g.rotation.y = t * .015;
    bank.items.forEach(function(b){ b.s.position.set(b.base.x + Math.sin(t * .25 + b.ph) * .25, b.base.y + Math.sin(t * .35 + b.ph) * .12, b.base.z + Math.cos(t * .22 + b.ph) * .25); b.s.scale.setScalar(b.sz * (1 + Math.sin(t * .4 + b.ph) * .08)); }); }
  if (marker.visible) marker.material.opacity = .55 + Math.sin(t * 3) * .35;
  Object.keys(placed).forEach(function(key){ var o = placed[key];
    if (o.userData.pop != null) { var f = Math.min(1, (t - o.userData.pop) / .55), s = 1 + 2.2 * Math.pow(f - 1, 3) + 1.2 * Math.pow(f - 1, 2); o.scale.setScalar(f >= 1 ? 1 : Math.max(.01, s)); if (f >= 1) o.userData.pop = null; }
    if (o.userData.tick) o.userData.tick(t);
    if (o.userData.cherry && petals.length < 140 && Math.random() < dt * 2) { var p = new THREE.Mesh(petalGeo(), M(0xf6bfd0, { side:THREE.DoubleSide, flatShading:false }));
      p.position.copy(o.position).add(tmp.set(rnd(-.3,.3), rnd(.7,1.05), rnd(-.3,.3))); p.rotation.set(rnd(0,3), rnd(0,3), 0); p.userData = { vy:rnd(.08,.16), ph:rnd(0,6), rest:0 }; scene.add(p); petals.push(p); } });
  for (var i = petals.length - 1; i >= 0; i--) { var pe = petals[i], u = pe.userData;
    if (pe.position.y > .012) { pe.position.y -= u.vy * dt; pe.position.x += Math.sin(t * 1.5 + u.ph) * .12 * dt + .05 * dt; pe.position.z += Math.cos(t * 1.3 + u.ph) * .1 * dt; pe.rotation.x += dt * 2; pe.rotation.y += dt; }
    else { pe.rotation.set(-Math.PI/2, 0, u.ph); u.rest += dt; if (u.rest > 3) { scene.remove(pe); petals.splice(i, 1); } } }
  for (var j = puffs.length - 1; j >= 0; j--) { var pf = puffs[j], a = t - pf.userData.t0; pf.position.addScaledVector(pf.userData.v, dt); pf.userData.v.y -= 1.8 * dt;
    pf.material.opacity = Math.max(0, .9 - a * 1.2); pf.scale.setScalar(1 + a * 1.5); if (a > .8) { scene.remove(pf); puffs.splice(j, 1); } }
  koi.forEach(function(f){ var a2 = t * f.sp + f.ph; f.g.position.set(f.c.x + Math.cos(a2) * f.r, .012, f.c.z + Math.sin(a2) * f.r);
    f.g.rotation.y = Math.atan2(-(Math.cos(a2) * f.sp), -Math.sin(a2) * f.sp); f.g.userData.tail.rotation.y = Math.sin(t * 9 + f.ph) * .5; });
  drifters.forEach(function(d){ if (!lip) return;
    if (!d.fall) { d.s += d.sp * dt; if (d.s >= 1) d.fall = .02; else { var rp = riverPoint(d.s); d.g.position.set(rp.x + Math.sin(t + d.sp * 50) * .08, .03, rp.z); d.g.rotation.y += dt * .6; } }
    else { d.fall += dt * .45; var fp = fall.curve.getPoint(Math.min(1, d.fall)); d.g.position.set(fp.x + Math.sin(d.sp * 80) * .12, fp.y + .01, fp.z + .03); d.g.rotation.x += dt * 3;
      if (d.fall >= 1) { d.fall = 0; d.s = 0; d.g.rotation.set(0, 0, 0); } } });
  cranes.forEach(function(c){ var i2 = c.userData.i, a3 = t * .16 + i2 * .13, r = 6.6 + (i2 % 2) * .35, y = 2.3 + i2 * .12 + Math.sin(t * .6 + i2) * .15;
    c.position.set(Math.cos(a3) * r, y, Math.sin(a3) * r); c.rotation.y = Math.atan2(-Math.cos(a3), -Math.sin(a3)); c.rotation.z = Math.sin(t * .8 + i2) * .06;
    var fl2 = Math.sin(t * 4.2 + c.userData.ph) * .55; c.userData.wl.rotation.x = fl2; c.userData.wr.rotation.x = -fl2; });
  sheep.forEach(function(s){ var g = s.g;
    if (s.wait > 0) { s.wait -= dt; g.userData.head.rotation.z = -.55 + Math.sin(t * 5 + s.ph) * .08; if (s.wait <= 0) s.to = s.home.clone().add(tmp.set(rnd(-.4,.4), 0, rnd(-.4,.4))); }
    else { var dx = s.to.x - g.position.x, dz = s.to.z - g.position.z, dist = Math.hypot(dx, dz);
      if (dist < .02) s.wait = rnd(1.5, 4); else { var st2 = Math.min(dist, .16 * dt); g.position.x += dx/dist * st2; g.position.z += dz/dist * st2;
        var want2 = Math.atan2(-dz, dx), cr = g.rotation.y, dd2 = Math.atan2(Math.sin(want2 - cr), Math.cos(want2 - cr)); g.rotation.y = cr + dd2 * Math.min(1, dt * 5);
        g.userData.head.rotation.z = 0; g.position.y = Math.abs(Math.sin(t * 9 + s.ph)) * .008; } } });
  flies.forEach(function(f){ f.g.position.set(f.b.x + Math.sin(t * .7 + f.ph) * .4, f.b.y + Math.sin(t * 1.3 + f.ph) * .15, f.b.z + Math.cos(t * .6 + f.ph) * .4); f.g.material.opacity = n * (.5 + .5 * Math.sin(t * 3 + f.ph * 3)); });
  clouds.forEach(function(c){ var u2 = c.userData; u2.a += u2.sp * dt * (reduce ? .3 : 1); c.position.set(Math.cos(u2.a) * u2.r, u2.y, Math.sin(u2.a) * u2.r); c.rotation.y = -u2.a; });
  island.children.forEach(function(r){ if (r.userData.base != null) r.position.y = r.userData.base + Math.sin(t * .8 + r.userData.ph) * .08; });
  if (inBig) controls.update();
  else { miniAngle += dt * (reduce ? 0 : .12); var R = camDist(); camera.position.set(Math.cos(miniAngle) * R, 6.4 + S.N * .2, Math.sin(miniAngle) * R); camera.lookAt(0, -.9, 0); controls.target.set(0, -.2, 0); }
  renderer.render(scene, camera);
}
var _pg = null; function petalGeo(){ return _pg || (_pg = new THREE.PlaneGeometry(.04, .028)); }

// la 3D démarre la première fois que le module Focus devient visible
(function watch(){ var mf = $("module-focus");
  function check(){ if (!mf.hidden && window.THREE && !ready) init(); }
  if (window.MutationObserver) new MutationObserver(check).observe(mf, { attributes:true, attributeFilter:["hidden"] }); check(); })();
})();
