/* ============================================================================
   MODULE : FOCUS — minuteur Pomodoro + session "lock in"
   Encapsulé ; expose seulement focusExportState / focusImportState.
   ============================================================================ */
(function(){
"use strict";
var KEY = "hashprojects_focus_v1";
var $ = function(id){ return document.getElementById(id); };
var root = $("module-focus");

var DEFAULTS = { focus:25, short:5, long:15, every:4, auto:false, sound:true, tick:false };
var st = { settings:Object.assign({}, DEFAULTS), history:{}, cycle:0, plan:null };
try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && typeof p === "object") {
    st.settings = Object.assign({}, DEFAULTS, p.settings || {});
    st.history = p.history || {}; st.cycle = p.cycle || 0; st.plan = p.plan || null;
} } } catch(e) {}
if (st.plan && !(st.plan.blocks && st.plan.blocks.length > st.plan.idx)) st.plan = null;
function save(){ try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(e) {} }

var settings = st.settings;
var mode = "focus", running = false, endAt = 0, remaining = settings.focus*60, total = remaining, raf = null, lastSec = -1;
var LABEL = { focus:"Focus", short:"Pause courte", long:"Pause longue" };
var SUB = { focus:"Concentre-toi", short:"Respire un peu", long:"Longue pause méritée" };
var navBtn = document.querySelector('.module-btn[data-module="focus"]');

function dayKey(d){ d = d || new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function fmt(s){ s = Math.max(0, Math.ceil(s)); return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }
function hm(d){ return d.getHours()+"h"+String(d.getMinutes()).padStart(2,"0"); }
function minTxt(m){ return m >= 60 ? Math.floor(m/60)+" h"+(m%60 ? " "+String(m%60).padStart(2,"0") : "") : m+" min"; }
function toast(msg){ if (window.showToast) window.showToast(msg); }

/* ---------- cadran ---------- */
var t = "";
for (var i=0;i<60;i++){ var a=i*6*Math.PI/180, big=i%5===0, r1=big?88:91, r2=96;
    t += '<line x1="'+(100+r1*Math.sin(a))+'" y1="'+(100-r1*Math.cos(a))+'" x2="'+(100+r2*Math.sin(a))+'" y2="'+(100-r2*Math.cos(a))+'" stroke="var(--line-strong)" stroke-width="'+(big?1.6:.8)+'" stroke-linecap="round"/>'; }
$("fo-ticks").innerHTML = t;
var ring = $("fo-ring"), C = 2*Math.PI*78; ring.style.strokeDasharray = C;

function draw(){
    var s = running ? (endAt-Date.now())/1000 : remaining;
    $("fo-time").textContent = fmt(s);
    ring.style.strokeDashoffset = C*(1 - Math.max(0,s)/total);
    document.title = running ? fmt(s)+" · "+LABEL[mode]+" · " + i18n.t("app.name") : i18n.t("app.name");
    navBtn.querySelector(".lbl").textContent = running ? "Focus · "+fmt(s) : "Focus";
    navBtn.classList.toggle("running", running);
}
function loop(){
    var s = (endAt-Date.now())/1000, sec = Math.ceil(s);
    if (sec !== lastSec){ lastSec = sec; if (settings.tick && mode === "focus") beep(1400,.015,.03); }
    draw();
    if (s <= 0){ finish(); return; }
    raf = requestAnimationFrame(loop);
}
var wake = null;
function lockWake(){ try { if (window.Android && window.Android.keepScreenOn) window.Android.keepScreenOn(true); } catch(e) {} try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function(w){ wake = w; }).catch(function(){}); } catch(e) {} }
function releaseWake(){ try { if (window.Android && window.Android.keepScreenOn) window.Android.keepScreenOn(false); } catch(e) {} try { if (wake) wake.release(); } catch(e) {} wake = null; }

/* requestAnimationFrame est gelé quand l'onglet / l'écran est caché : un timer de secours déclenche la fin à l'heure */
var endTimer = null;
function armEnd(){ clearTimeout(endTimer); endTimer = setTimeout(function(){ if (running && Date.now() >= endAt - 50) finish(); else if (running) armEnd(); }, Math.max(0, endAt-Date.now())); }
function start(){ if (running) return; ensureAudio(); running = true; endAt = Date.now()+remaining*1000; lastSec = -1; $("fo-start").textContent = "Pause"; $("fo-sub").textContent = SUB[mode]; lockWake(); armEnd(); loop(); }
function pause(){ if (!running) return; running = false; clearTimeout(endTimer); remaining = Math.max(0,(endAt-Date.now())/1000); cancelAnimationFrame(raf); $("fo-start").textContent = "Reprendre"; $("fo-sub").textContent = "En pause"; releaseWake(); draw(); }
function setMode(m, keepAuto, dur){
    cancelAnimationFrame(raf); clearTimeout(endTimer); running = false; mode = m;
    var pb = st.plan && st.plan.blocks[st.plan.idx];
    if (dur == null) dur = (pb && pb.m === m) ? pb.d : settings[m];
    total = remaining = dur*60;
    root.dataset.mode = m;
    document.querySelectorAll("[data-fomode]").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.fomode === m); });
    $("fo-start").textContent = "Démarrer"; $("fo-sub").textContent = m === "focus" ? "Prêt à se concentrer" : "Pause prête";
    draw(); renderCycle();
    if (keepAuto && settings.auto) start();
}
function finish(){
    if (!running) return;
    cancelAnimationFrame(raf); clearTimeout(endTimer); running = false; releaseWake();
    if (settings.sound) chime();
    if (mode === "focus"){
        var k = dayKey(); st.history[k] = st.history[k] || { n:0, min:0 };
        st.history[k].n++; st.history[k].min += Math.round(total/60);
        st.cycle++; save(); renderStats();
        if (window.worldAward) window.worldAward(Math.round(total/60), st.cycle % settings.every === 0);
    } else if (mode === "long"){ st.cycle = 0; save(); }
    if (st.plan){ advancePlan(true, mode === "focus" ? "Bloc de focus terminé, pause !" : "Pause finie, on s'y remet."); return; }
    if (mode === "focus"){
        var next = st.cycle % settings.every === 0 ? "long" : "short";
        toast(next === "long" ? "Pomodoro terminé ! Pause longue." : "Pomodoro terminé ! Petite pause.");
        setMode(next, true);
    } else { toast("Pause finie, on s'y remet."); setMode("focus", true); }
}
function skip(){
    if (st.plan){ var was = running; if (mode === "long"){ st.cycle = 0; save(); } advancePlan(was, "Bloc passé."); return; }
    if (mode === "focus"){ setMode((st.cycle+1) % settings.every === 0 ? "long" : "short"); }
    else { if (mode === "long"){ st.cycle = 0; save(); } setMode("focus"); }
}
function renderCycle(){
    var n = settings.every, c = st.cycle % n, h = "";
    for (var i=0;i<n;i++) h += '<i class="'+(i<c?"on":"")+'"></i>';
    $("fo-cycle").innerHTML = h;
}

/* ---------- session lock in ---------- */
var RHYTHMS = { "25":{f:25,s:5,l:15,every:4}, "50":{f:50,s:10,l:20,every:3}, "90":{f:90,s:20,l:30,every:2} };
function rhythm(){ return RHYTHMS[$("fo-r").value] || { f:settings.focus, s:settings.short, l:settings.long, every:settings.every }; }
function buildPlan(T, r){
    var b = [], t = T, n = 0;
    while (t > 0){
        var f = Math.min(r.f, t); b.push({ m:"focus", d:f }); t -= f; n++;
        if (t <= 0) break;
        var isLong = n % r.every === 0, br = isLong ? r.l : r.s;
        if (t < br+10){ b[b.length-1].d += t; t = 0; break; } // pas la place pour un bloc de plus : on allonge le dernier focus
        b.push({ m:isLong?"long":"short", d:br }); t -= br;
    }
    return b;
}
function planMinutes(){ return Math.round(Math.max(0,+$("fo-h").value||0)*60 + Math.max(0,+$("fo-m").value||0)); }
function renderPreview(){
    var T = planMinutes(), el = $("fo-preview");
    if (T < 10){ el.textContent = "Entre au moins 10 minutes."; return; }
    var b = buildPlan(T, rhythm()), foc = b.filter(function(x){ return x.m === "focus"; });
    var fm = foc.reduce(function(a,x){ return a+x.d; }, 0), nb = b.length-foc.length;
    el.innerHTML = "<b>"+foc.length+" bloc"+(foc.length>1?"s":"")+" de focus</b> ("+minTxt(fm)+") · "+nb+" pause"+(nb>1?"s":"")+" ("+minTxt(T-fm)+") · fin vers <b>"+hm(new Date(Date.now()+T*60000))+"</b>";
}
function planEndTime(){
    var cur = running ? Math.max(0,(endAt-Date.now())/1000) : remaining;
    var rest = st.plan.blocks.slice(st.plan.idx+1).reduce(function(a,x){ return a+x.d*60; }, 0);
    return new Date(Date.now()+(cur+rest)*1000);
}
function renderPlan(){
    var on = !!st.plan;
    $("fo-planForm").hidden = on; $("fo-preview").hidden = on; $("fo-active").hidden = !on;
    document.querySelectorAll("[data-fomode]").forEach(function(b){ b.disabled = on; });
    $("fo-mine").textContent = "Mes réglages ("+settings.focus+" / "+settings.short+")";
    if (!on){ renderPreview(); return; }
    var p = st.plan;
    $("fo-timeline").innerHTML = p.blocks.map(function(b,i){
        return '<span class="fo-seg '+b.m+(i<p.idx?" done":"")+(i===p.idx?" now":"")+'" style="flex:'+b.d+'" title="'+LABEL[b.m]+' · '+b.d+' min"></span>';
    }).join("");
    var b = p.blocks[p.idx];
    var nf = p.blocks.slice(0,p.idx+1).filter(function(x){ return x.m==="focus"; }).length;
    var tf = p.blocks.filter(function(x){ return x.m==="focus"; }).length;
    $("fo-step").innerHTML = b.m === "focus" ? "Focus <b>"+nf+"/"+tf+"</b> · "+b.d+" min" : LABEL[b.m]+" · "+b.d+" min · encore <b>"+(tf-nf)+"</b> focus";
    $("fo-end").textContent = hm(planEndTime());
}
function loadBlock(auto){ var b = st.plan.blocks[st.plan.idx]; setMode(b.m, false, b.d); renderPlan(); if (auto) start(); }
function advancePlan(auto, msg){
    st.plan.idx++;
    if (st.plan.idx >= st.plan.blocks.length){ endPlan(true); return; }
    save(); if (msg) toast(msg); loadBlock(auto);
}
function endPlan(done){
    st.plan = null; save(); resetStop();
    if (done) toast("Lock in terminé. Bien joué !");
    setMode("focus"); renderPlan();
}
$("fo-planForm").addEventListener("submit", function(e){
    e.preventDefault(); var T = planMinutes(); if (T < 10){ renderPreview(); return; }
    st.plan = { blocks:buildPlan(T, rhythm()), idx:0 }; st.cycle = 0; save();
    ensureAudio(); loadBlock(true); toast("Session lancée, c'est parti.");
});
["fo-h","fo-m","fo-r"].forEach(function(id){ $(id).addEventListener("input", renderPreview); });
var stopArm = null;
function resetStop(){ clearTimeout(stopArm); stopArm = null; $("fo-stop").textContent = "Arrêter la session"; $("fo-stop").classList.remove("confirm"); }
$("fo-stop").onclick = function(){
    if (stopArm){ endPlan(false); return; }
    $("fo-stop").textContent = "Confirmer l'arrêt ?"; $("fo-stop").classList.add("confirm");
    stopArm = setTimeout(resetStop, 4000);
};

/* ---------- stats ---------- */
function renderStats(){
    var td = st.history[dayKey()] || { n:0, min:0 };
    $("fo-stToday").textContent = td.n;
    $("fo-stMin").textContent = td.min >= 60 ? Math.floor(td.min/60)+" h "+String(td.min%60).padStart(2,"0") : td.min+" min";
    var streak = 0, d = new Date(); if (!st.history[dayKey(d)]) d.setDate(d.getDate()-1);
    while (st.history[dayKey(d)] && st.history[dayKey(d)].n){ streak++; d.setDate(d.getDate()-1); }
    $("fo-stStreak").textContent = streak+" j";
    var days = [], jours = ["dim","lun","mar","mer","jeu","ven","sam"], wk = 0;
    for (var i=6;i>=0;i--){ var dd = new Date(); dd.setDate(dd.getDate()-i); var h = st.history[dayKey(dd)];
        days.push({ l:jours[dd.getDay()], n:h?h.n:0, today:i===0 }); wk += h ? h.min : 0; }
    $("fo-weekTotal").textContent = wk ? minTxt(wk)+" sur 7 j" : "";
    var max = Math.max.apply(null, [4].concat(days.map(function(x){ return x.n; })));
    $("fo-bars").innerHTML = days.map(function(x){
        return '<div class="fo-bar'+(x.today?" today":"")+'"><span style="height:'+(x.n/max*100)+'%" '+(x.n?'data-v="'+x.n+'"':"")+'></span><small>'+x.l+'</small></div>';
    }).join("");
}

/* ---------- réglages ---------- */
function bindSettings(){
    ["focus","short","long","every"].forEach(function(k){ var el = $("fo-s-"+k); el.value = settings[k];
        el.onchange = function(){ var v = Math.round(+el.value); if (!(v >= +el.min && v <= +el.max)){ el.value = settings[k]; return; }
            settings[k] = v; save(); if (k === mode && !running) setMode(mode); renderCycle(); renderPlan(); }; });
    ["auto","sound","tick"].forEach(function(k){ var el = $("fo-s-"+k); el.checked = settings[k]; el.onchange = function(){ settings[k] = el.checked; save(); }; });
}

/* ---------- son ---------- */
var ac = null;
function ensureAudio(){ try { ac = ac || new (window.AudioContext||window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch(e) {} }
function beep(f, dur, vol, delay){ if (!ac) return; var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime+(delay||0);
    o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(vol,t0+.01); g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0+dur+.05); }
function chime(){
    try { if (navigator.vibrate) navigator.vibrate([300,150,300,150,500]); } catch(e) {}
    ensureAudio(); if (!ac) return;
    /* le contexte audio est souvent suspendu quand l'appli revient du fond : on attend qu'il reprenne avant de jouer */
    function play(){ [0, 1.6].forEach(function(o){ [[784,0],[988,.18],[1175,.36],[1568,.54]].forEach(function(x){ beep(x[0],1.1,.35,o+x[1]); }); }); }
    if (ac.state === "running") play();
    else { var p = ac.resume(); if (p && p.then) p.then(play, play); else play(); }
}

/* ---------- contrôles ---------- */
$("fo-start").onclick = function(){ running ? pause() : start(); };
$("fo-reset").onclick = function(){ setMode(mode); };
$("fo-skip").onclick = skip;
document.querySelectorAll("[data-fomode]").forEach(function(b){ b.onclick = function(){ setMode(b.dataset.fomode); }; });
document.addEventListener("keydown", function(e){
    if (root.hidden) return;
    if (e.target.closest && e.target.closest("input,textarea,select,button")) { if (e.code === "Space") return; }
    if (e.target.matches && e.target.matches("input,textarea,select")) return;
    if (e.code === "Space"){ e.preventDefault(); running ? pause() : start(); }
    else if (e.key === "r" || e.key === "R") setMode(mode);
    else if (e.key === "s" || e.key === "S") skip();
});
document.addEventListener("visibilitychange", function(){ if (!document.hidden && running){ lockWake(); if (endAt <= Date.now()) finish(); } });
setInterval(function(){
    if (running && document.hidden && endAt <= Date.now()) finish();
    if (st.plan) $("fo-end").textContent = hm(planEndTime());
    else if (!(document.activeElement && document.activeElement.closest && document.activeElement.closest("#fo-planForm"))) renderPreview();
}, 15000);

/* ---------- export / import ---------- */
window.focusExportState = function(){ return { settings:settings, history:st.history }; };
/* état en direct pour le monde (chantier qui monte pendant le focus) */
window.focusLive = function(){ var s = running ? (endAt-Date.now())/1000 : remaining;
    return { running:running, mode:mode, doneMin:Math.max(0, (total - Math.max(0, s))/60), totalMin:total/60 }; };
window.focusImportState = function(d){
    if (!d || typeof d !== "object") return;
    if (d.settings) { Object.assign(settings, DEFAULTS, d.settings); }
    if (d.history && typeof d.history === "object") st.history = d.history;
    save(); bindSettings(); if (!running) setMode(mode); renderStats(); renderPlan();
};

bindSettings();
if (st.plan) loadBlock(false); else setMode("focus");
renderStats(); renderPlan();
})();
