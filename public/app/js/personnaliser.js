/* ============================================================================
   PERSONNALISATION — couleurs, ordre des onglets / blocs, préférences
   Stocké dans hashprojects_prefs_v1 (synchronisé avec le compte).
   ============================================================================ */
(function(){
"use strict";
var KEY = "hashprojects_prefs_v1";
var COLORS = [["Bleu","#0a84ff"],["Indigo","#5e5ce6"],["Violet","#bf5af2"],["Rose","#ff375f"],["Rouge","#ff453a"],
              ["Orange","#ff9f0a"],["Vert","#30d158"],["Menthe","#00c7be"],["Turquoise","#40c8e0"],["Graphite","#8e8e93"]];
var MODS = { tasks:"Tâches", habits:"Habitudes", notes:"Notes", sessions:"Séances", carnet:"Carnet", focus:"Focus" };
var BLOCKS = { up:"À venir", habits:"Habitudes", notime:"Sans heure" };
var STATS = { habits:"Habitudes", focus:"Focus", sessions:"Séances", avg:"Moyenne" };
var DEF = { accent:null, oled:false, subjectColors:{}, navOrder:["tasks","habits","notes","sessions","carnet","focus"], navHidden:[],
            homeOrder:["up","habits","notime"], homeHidden:[], showPlan:true, stats:{ habits:true, focus:true, sessions:true, avg:true },
            start:"home", weekStart:1, textSize:"normal", dayStart:7 };
var P;
function norm(d){
    d = (d && typeof d === "object") ? d : {};
    var p = JSON.parse(JSON.stringify(DEF));
    Object.keys(DEF).forEach(function(k){ if (d[k] !== undefined) p[k] = d[k]; });
    p.stats = Object.assign({}, DEF.stats, d.stats || {});
    p.subjectColors = Object.assign({}, d.subjectColors || {});
    // listes : garder les entrées connues, ajouter celles qui manquent
    function fix(list, all){ list = (Array.isArray(list) ? list : []).filter(function(x){ return all.indexOf(x) >= 0; });
        all.forEach(function(x){ if (list.indexOf(x) < 0) list.push(x); }); return list; }
    p.navOrder = fix(p.navOrder, DEF.navOrder); p.homeOrder = fix(p.homeOrder, DEF.homeOrder);
    if (!Array.isArray(p.navHidden)) p.navHidden = []; if (!Array.isArray(p.homeHidden)) p.homeHidden = [];
    p.weekStart = +p.weekStart === 0 ? 0 : 1;
    p.dayStart = Math.min(12, Math.max(0, parseInt(p.dayStart, 10) || 7));
    return p;
}
try { P = norm(JSON.parse(localStorage.getItem(KEY) || "null")); } catch(e) { P = norm(null); }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(P)); } catch(e) {} }

function rgba(hex, a){ var h = String(hex).replace("#",""); if (h.length === 3) h = h.replace(/./g, "$&$&");
    var n = parseInt(h, 16); if (isNaN(n)) return hex; return "rgba("+(n>>16&255)+","+(n>>8&255)+","+(n&255)+","+a+")"; }
function subjectKey(name){ return String(name||"").split(/\s+[—–-]\s+|\s*:\s*|\s*\(/)[0].trim().toLowerCase(); }

/* ---------- API utilisée par les autres modules ---------- */
window.hpPref = function(k){ return P[k]; };
window.hpWeekStart = function(){ return P.weekStart; };
window.hpSubjectColor = function(name){ return P.subjectColors[subjectKey(name)] || null; };
window.hpRgba = rgba;
window.prefsImport = function(d){ P = norm(d); applyAll(); if (!$("pz-overlay").hidden) renderPanel(); };

var $ = function(id){ return document.getElementById(id); };
function applyAll(){
    var root = document.documentElement;
    if (P.accent) { root.style.setProperty("--accent", P.accent); root.style.setProperty("--accent-soft", rgba(P.accent, .16)); }
    else { root.style.removeProperty("--accent"); root.style.removeProperty("--accent-soft"); }
    if (P.oled) root.setAttribute("data-oled", ""); else root.removeAttribute("data-oled");
    document.body.style.zoom = P.textSize === "large" ? "1.12" : P.textSize === "compact" ? "0.92" : "";
    // onglets
    var box = document.querySelector(".topnav .modules");
    if (box) P.navOrder.forEach(function(m){ var b = box.querySelector('[data-module="'+m+'"]'); if (b) { box.appendChild(b); b.hidden = P.navHidden.indexOf(m) >= 0; } });
    // blocs de l'accueil
    var side = document.querySelector("#module-home .hm-side");
    if (side) P.homeOrder.forEach(function(k){ var s = $("hm-sec-"+k); if (s) { side.appendChild(s); s.hidden = P.homeHidden.indexOf(k) >= 0; } });
    var plan = document.querySelector("#module-home .hm-plan");
    if (plan) { plan.hidden = !P.showPlan; plan.parentNode.classList.toggle("noplan", !P.showPlan); }
    if (window.renderHome) window.renderHome();
    if (window.plannerRerender) window.plannerRerender();
}
function set(k, v){ P[k] = v; save(); applyAll(); renderPanel(); }
function toggleIn(listKey, x, on){ var l = P[listKey].filter(function(y){ return y !== x; }); if (!on) l.push(x); set(listKey, l); }
function move(listKey, x, dir){ var l = P[listKey].slice(), i = l.indexOf(x), j = i + dir; if (j < 0 || j >= l.length) return;
    l[i] = l[j]; l[j] = x; set(listKey, l); }

/* ---------- panneau ---------- */
function subjects(){
    var pl = window.plannerExportState ? window.plannerExportState() : { sessions:[] }, seen = {}, out = [];
    (pl.sessions||[]).forEach(function(s){ if (s.kind === "pause") return; var k = subjectKey(s.name); if (!k) return;
        if (!seen[k]) { seen[k] = { k:k, label:String(s.name).split(/\s+[—–-]\s+|\s*:\s*|\s*\(/)[0].trim(), n:0 }; out.push(seen[k]); } seen[k].n++; });
    Object.keys(P.subjectColors).forEach(function(k){ if (!seen[k]) { seen[k] = { k:k, label:k, n:0 }; out.push(seen[k]); } });
    return out.sort(function(a,b){ return b.n - a.n; }).slice(0, 24);
}
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]; }); }
function seg(name, cur, opts){ return '<div class="pz-seg">'+opts.map(function(o){ return '<button type="button" data-seg="'+name+'" data-v="'+o[0]+'" aria-pressed="'+(String(cur)===String(o[0]))+'">'+o[1]+'</button>'; }).join("")+'</div>'; }
function orderList(listKey, hiddenKey, labels){
    var l = P[listKey];
    return l.map(function(x, i){ var on = P[hiddenKey].indexOf(x) < 0;
        return '<div class="pz-row'+(on?"":" off")+'"><input type="checkbox" data-hide="'+hiddenKey+'" data-x="'+x+'" '+(on?"checked":"")+' aria-label="Afficher '+labels[x]+'">'+
            '<span class="t">'+labels[x]+'</span>'+
            '<button type="button" class="mv" data-mv="'+listKey+'" data-x="'+x+'" data-d="-1" '+(i===0?"disabled":"")+' aria-label="Monter">↑</button>'+
            '<button type="button" class="mv" data-mv="'+listKey+'" data-x="'+x+'" data-d="1" '+(i===l.length-1?"disabled":"")+' aria-label="Descendre">↓</button></div>';
    }).join("");
}
function renderPanel(){
    var cur = P.accent || "";
    var sw = '<button type="button" class="pz-def" data-accent="" aria-pressed="'+(!cur)+'">Par défaut</button>' +
        COLORS.map(function(c){ return '<button type="button" style="--c:'+c[1]+'" data-accent="'+c[1]+'" title="'+c[0]+'" aria-label="'+c[0]+'" aria-pressed="'+(cur.toLowerCase()===c[1])+'"></button>'; }).join("") +
        '<label class="pz-custom" title="Couleur libre"><input type="color" id="pz-accentCustom" value="'+(cur || "#0a84ff")+'"><span>Autre</span></label>';
    var subs = subjects();
    var subHtml = subs.length ? subs.map(function(s){ var c = P.subjectColors[s.k];
        return '<div class="pz-row"><input type="color" class="pz-col" data-subj="'+esc(s.k)+'" value="'+(c || "#8e8e93")+'" aria-label="Couleur de '+esc(s.label)+'">'+
            '<span class="t">'+esc(s.label)+'</span><span class="m">'+(c ? "" : "par défaut")+'</span>'+
            (c ? '<button type="button" class="mv" data-subjreset="'+esc(s.k)+'" aria-label="Couleur par défaut">×</button>' : '')+'</div>'; }).join("")
        : '<div class="hm-empty">Crée des séances : leurs matières apparaîtront ici.</div>';
    var startOpts = [["home","Accueil"]].concat(P.navOrder.map(function(m){ return [m, MODS[m]]; }));
    var hours = []; for (var h = 0; h <= 12; h++) hours.push(h);
    $("pz-body").innerHTML =
        '<section class="pz-sec"><h3>Couleur principale</h3><div class="pz-sw">'+sw+'</div>'+
            '<label class="pz-line"><span>Noir pur en thème sombre <small>(écrans OLED)</small></span><input type="checkbox" id="pz-oled" '+(P.oled?"checked":"")+'></label></section>'+
        '<section class="pz-sec"><h3>Couleur par matière</h3><p class="hint">La matière, c\'est le début du nom de la séance (avant « — » ou « : »). « Maths — TD 3 » et « Maths — DM » partagent la même couleur.</p>'+subHtml+'</section>'+
        '<section class="pz-sec"><h3>Onglets</h3><p class="hint">Coche ceux à afficher, change l\'ordre avec les flèches.</p>'+orderList("navOrder","navHidden",MODS)+'</section>'+
        '<section class="pz-sec"><h3>Accueil</h3>'+
            '<label class="pz-row'+(P.showPlan?"":" off")+'"><input type="checkbox" id="pz-plan" '+(P.showPlan?"checked":"")+'><span class="t">Journée (planning)</span></label>'+
            orderList("homeOrder","homeHidden",BLOCKS)+
            '<h3>Stats sous la semaine</h3><div class="pz-chips">'+Object.keys(STATS).map(function(k){
                return '<label class="pz-chip"><input type="checkbox" data-stat="'+k+'" '+(P.stats[k]?"checked":"")+'> '+STATS[k]+'</label>'; }).join("")+'</div></section>'+
        '<section class="pz-sec"><h3>Préférences</h3>'+
            '<div class="pz-line"><span>Page à l\'ouverture</span><select id="pz-start">'+startOpts.map(function(o){ return '<option value="'+o[0]+'"'+(P.start===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></div>'+
            '<div class="pz-line"><span>Premier jour de la semaine</span>'+seg("weekStart", P.weekStart, [[1,"Lundi"],[0,"Dimanche"]])+'</div>'+
            '<div class="pz-line"><span>Taille du texte</span>'+seg("textSize", P.textSize, [["compact","Compact"],["normal","Normal"],["large","Grand"]])+'</div>'+
            '<div class="pz-line"><span>Début de journée par défaut</span><select id="pz-day">'+hours.map(function(h){ return '<option value="'+h+'"'+(P.dayStart===h?" selected":"")+'>'+h+'h</option>'; }).join("")+'</select></div>'+
        '</section>'+
        '<button type="button" class="btn-ghost pz-reset" id="pz-reset">Tout remettre par défaut</button>';
}
function open(){ renderPanel(); $("pz-overlay").hidden = false; }
function close(){ $("pz-overlay").hidden = true; }
$("pzBtn").addEventListener("click", open);
$("pz-close").addEventListener("click", close);
$("pz-overlay").addEventListener("click", function(e){ if (e.target === this) close(); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape" && !$("pz-overlay").hidden) close(); });
$("pz-body").addEventListener("click", function(e){
    var b = e.target.closest("button"); if (!b) return; var d = b.dataset;
    if (d.accent !== undefined) set("accent", d.accent || null);
    else if (d.mv) move(d.mv, d.x, +d.d);
    else if (d.seg) set(d.seg, d.seg === "weekStart" ? +d.v : d.v);
    else if (d.subjreset) { delete P.subjectColors[d.subjreset]; save(); applyAll(); renderPanel(); }
    else if (b.id === "pz-reset") { if (confirm("Remettre toute la personnalisation par défaut ?")) { P = norm(null); save(); applyAll(); renderPanel(); } }
});
$("pz-body").addEventListener("change", function(e){
    var t = e.target, d = t.dataset;
    if (d.hide) toggleIn(d.hide, d.x, t.checked);
    else if (d.stat) { P.stats[d.stat] = t.checked; set("stats", P.stats); }
    else if (d.subj) { P.subjectColors[d.subj] = t.value; save(); applyAll(); renderPanel(); }
    else if (t.id === "pz-accentCustom") set("accent", t.value);
    else if (t.id === "pz-oled") set("oled", t.checked);
    else if (t.id === "pz-plan") set("showPlan", t.checked);
    else if (t.id === "pz-start") set("start", t.value);
    else if (t.id === "pz-day") set("dayStart", +t.value);
});

applyAll();
// page d'ouverture : une fois que tous les modules sont chargés
window.addEventListener("DOMContentLoaded", function(){
    applyAll();
    if (P.start !== "home" && MODS[P.start] && P.navHidden.indexOf(P.start) < 0 && typeof switchModule === "function") switchModule(P.start);
});
})();
