/* ============================================================================
   MODULE : CARNET — moyennes pondérées (adapté de "Carnet de notes")
   Encapsulé ; expose seulement carnetExportState / carnetImportState.
   ============================================================================ */
(function(){
"use strict";
var KEY = "hashprojects_carnet_v1";
var SCALES = [20, 10, 4, 100];
var state = { subjects:[], scale:20 };
var pendingDelete = null;
var root = document.getElementById("module-carnet");
var $ = function(id){ return document.getElementById(id); };
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function fmt(v){ return v == null ? "—" : (Math.round(v*100)/100).toLocaleString("fr-FR", { maximumFractionDigits:2 }); }
function toast(m){ if (window.showToast) window.showToast(m); }

function load(d){ if (d && Array.isArray(d.subjects)) state = { subjects:d.subjects, scale:SCALES.indexOf(d.scale) >= 0 ? d.scale : 20 }; }
try { load(JSON.parse(localStorage.getItem(KEY) || localStorage.getItem("carnet-notes") || "null")); } catch(e) {}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} }

function subjectAvg(s){ // résultat entre 0 et 1
    var w = 0, t = 0;
    s.grades.forEach(function(g){ var c = +g.coef || 0; if (!(+g.max > 0) || c <= 0) return; t += (+g.value/+g.max)*c; w += c; });
    return w > 0 ? t/w : null;
}
function overallAvg(){
    var w = 0, t = 0;
    state.subjects.forEach(function(s){ var a = subjectAvg(s), c = +s.coef || 0; if (a == null || c <= 0) return; t += a*c; w += c; });
    return w > 0 ? t/w : null;
}
function tone(r){ return r == null ? "n" : r >= .7 ? "g" : r >= .5 ? "m" : "b"; }
function show(r){ return r == null ? "—" : fmt(r*state.scale); }

function render(){
    var sc = state.scale;
    $("cn-scale").innerHTML = SCALES.map(function(x){ return '<button type="button" aria-pressed="'+(sc===x)+'" data-cnscale="'+x+'">/'+x+'</button>'; }).join("");
    var o = overallAvg(), nGrades = state.subjects.reduce(function(n,s){ return n+s.grades.length; }, 0);
    $("cn-big").innerHTML = show(o) + "<small>/"+sc+"</small>";
    $("cn-big").style.color = o == null ? "" : "var(--" + ({g:"green",m:"amber",b:"rose"})[tone(o)] + ")";
    $("cn-hint").textContent = state.subjects.length + " matière" + (state.subjects.length>1?"s":"") + " · " + nGrades + " note" + (nGrades>1?"s":"") + " · pondérée par coefficients";
    $("cn-count").textContent = state.subjects.length ? state.subjects.length + " matière" + (state.subjects.length>1?"s":"") : "";
    $("cn-bars").innerHTML = state.subjects.map(function(s){ var a = subjectAvg(s);
        return '<div class="cn-bar"><span title="'+esc(s.name)+'">'+esc(s.name)+'</span><div class="cn-track"><i class="f-'+tone(a)+'" style="width:'+(a==null?0:Math.min(100,a*100))+'%"></i><b></b></div><span class="num r">'+show(a)+'</span></div>';
    }).join("");

    var box = $("cn-subjects");
    if (!state.subjects.length){
        box.innerHTML = '<div class="empty cn-empty"><div>Aucune matière pour l\'instant.<br>Crée tes matières avec leur coefficient, puis ajoute tes notes.</div><button type="button" data-cndemo="1">Charger un exemple</button></div>';
        return;
    }
    box.innerHTML = state.subjects.map(function(s){
        var a = subjectAvg(s);
        var rows = s.grades.map(function(g){
            return '<tr><td>'+esc(g.label||"Test")+'</td><td class="r num">'+fmt(+g.value)+' / '+fmt(+g.max)+'</td>'+
                '<td class="r num">'+fmt(+g.value/+g.max*sc)+'</td><td class="r num">×'+fmt(+g.coef)+'</td>'+
                '<td class="r"><button class="delete" type="button" title="Supprimer la note" data-cndelgrade="'+s.id+':'+g.id+'">×</button></td></tr>';
        }).join("") || '<tr class="cn-emptyrow"><td colspan="5">Pas encore de note dans cette matière.</td></tr>';
        var del = pendingDelete === s.id
            ? '<span class="cn-confirm">Supprimer ?<button type="button" data-cndelyes="'+s.id+'">Oui</button><button type="button" class="no" data-cndelno="1">Non</button></span>'
            : '<button class="delete" type="button" title="Supprimer la matière" data-cndelsub="'+s.id+'">×</button>';
        return '<article class="cn-card">'+
            '<div class="cn-head"><h3>'+esc(s.name)+'</h3><div class="cn-meta">'+
                '<label class="cn-coef">Coef. <input type="number" min="0" step="0.5" value="'+s.coef+'" id="cn-coef-'+s.id+'" data-cncoef="'+s.id+'"></label>'+
                '<span class="cn-pill t-'+tone(a)+'">'+show(a)+' /'+sc+'</span>'+del+
            '</div></div>'+
            '<div class="cn-tbl"><table><thead><tr><th>Évaluation</th><th class="r">Note</th><th class="r">Sur '+sc+'</th><th class="r">Coef.</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
            '<form class="cn-add" data-cnadd="'+s.id+'">'+
                '<input class="lab" type="text" id="cn-lab-'+s.id+'" placeholder="Nom (ex. Partiel 1)" aria-label="Nom de l\'évaluation">'+
                '<input type="number" id="cn-val-'+s.id+'" step="any" min="0" placeholder="Note" aria-label="Note obtenue">'+
                '<span class="slash">/</span>'+
                '<input type="number" id="cn-max-'+s.id+'" step="any" min="0.01" value="20" aria-label="Barème" title="Barème" list="cn-baremes">'+
                '<input type="number" id="cn-gc-'+s.id+'" step="0.5" min="0" value="1" aria-label="Coefficient de la note" title="Coefficient de la note">'+
                '<button type="submit">Ajouter</button>'+
            '</form></article>';
    }).join("") + '<datalist id="cn-baremes"><option value="20"><option value="10"><option value="4"><option value="5"><option value="100"></datalist>';
}
function change(){ save(); render(); }

root.addEventListener("click", function(e){
    var t = e.target.closest("button"); if (!t) return;
    var d = t.dataset;
    if (d.cnscale){ state.scale = +d.cnscale; change(); }
    else if (d.cndelgrade){ var p = d.cndelgrade.split(":"), s = state.subjects.find(function(x){ return x.id === p[0]; });
        if (s){ s.grades = s.grades.filter(function(g){ return g.id !== p[1]; }); change(); } }
    else if (d.cndelsub){ pendingDelete = d.cndelsub; render(); }
    else if (d.cndelyes){ state.subjects = state.subjects.filter(function(s){ return s.id !== d.cndelyes; }); pendingDelete = null; change(); }
    else if (d.cndelno){ pendingDelete = null; render(); }
    else if (d.cndemo){ state.subjects = [
        { id:uid(), name:"Mathématiques (exemple)", coef:3, grades:[{id:uid(),label:"Test 1",value:15,max:20,coef:1},{id:uid(),label:"Quiz",value:3,max:4,coef:.5},{id:uid(),label:"Partiel",value:12.5,max:20,coef:2}] },
        { id:uid(), name:"Physique (exemple)", coef:2, grades:[{id:uid(),label:"TP",value:7,max:10,coef:1},{id:uid(),label:"Contrôle",value:9,max:20,coef:2}] },
        { id:uid(), name:"Anglais (exemple)", coef:1, grades:[{id:uid(),label:"Oral",value:82,max:100,coef:1}] }]; change(); }
});
root.addEventListener("change", function(e){
    var c = e.target.dataset && e.target.dataset.cncoef; if (!c) return;
    var s = state.subjects.find(function(x){ return x.id === c; }); if (!s) return;
    s.coef = Math.max(0, +e.target.value || 0); change();
});
root.addEventListener("submit", function(e){
    e.preventDefault();
    var f = e.target;
    if (f.id === "cn-newSub"){ var n = $("cn-subName").value.trim(); if (!n){ $("cn-subName").focus(); return; }
        state.subjects.push({ id:uid(), name:n, coef:Math.max(0, +$("cn-subCoef").value || 1), grades:[] });
        $("cn-subName").value = ""; $("cn-subCoef").value = 1; change(); toast("Matière ajoutée"); return; }
    var sid = f.dataset.cnadd; if (!sid) return;
    var vRaw = $("cn-val-"+sid).value, v = +vRaw, m = +$("cn-max-"+sid).value, gcRaw = $("cn-gc-"+sid).value, gc = +gcRaw;
    if (vRaw === ""){ $("cn-val-"+sid).focus(); return; }
    if (!(m > 0)){ toast("Le barème doit être supérieur à 0."); return; }
    if (v < 0 || v > m){ toast("La note doit être comprise entre 0 et " + fmt(m) + "."); return; }
    var s = state.subjects.find(function(x){ return x.id === sid; }); if (!s) return;
    s.grades.push({ id:uid(), label:$("cn-lab-"+sid).value.trim() || "Test " + (s.grades.length+1), value:v, max:m, coef:(gcRaw !== "" && gc >= 0) ? gc : 1 });
    change();
    setTimeout(function(){ var el = $("cn-val-"+sid); if (el) el.focus(); }, 0);
});

window.carnetExportState = function(){ return JSON.parse(JSON.stringify(state)); };
window.carnetImportState = function(d){ load(d); save(); render(); };
render();
})();
