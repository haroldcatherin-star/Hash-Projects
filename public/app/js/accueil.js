/* ============================================================================
   MODULE : ACCUEIL — planning de la journée
   ============================================================================ */
(function(){
"use strict";
try { localStorage.removeItem("hashprojects_unlocked_v1"); } catch(e) {}
var $ = function(id){ return document.getElementById(id); };
var esc = escapeHtml;
var H0 = 7, H1 = 23, PX = 52;           // 7h → 23h, 52 px par heure
var sel = todayStr();
var fullDay = {};                       // jours où l'on a demandé d'afficher la grille complète
var JOURS = ["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];
var JOURS_LONG = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
var MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

function pad(n){ return String(n).padStart(2,"0"); }
function toMin(t){ var p = String(t).split(":"); return (+p[0])*60 + (+p[1]||0); }
function hhmm(m){ return pad(Math.floor(m/60)) + ":" + pad(m%60); }
function dur(min){ var h = Math.floor(min/60), m = min%60; return h ? (m ? h+"h"+pad(m) : h+"h") : m+" min"; }
function mondayOf(ds){ var d = parseDate(ds), ws = window.hpWeekStart ? window.hpWeekStart() : 1; return addDays(ds, -((d.getDay()+7-ws)%7)); }
function planner(){ return window.plannerExportState ? window.plannerExportState() : { sessions:[], events:[] }; }

function layoutLanes(items){
    // items triés par début ; assigne une colonne à chaque bloc qui se chevauche
    var groups = [], cur = null;
    items.forEach(function(it){
        if (!cur || it.s >= cur.end) { cur = { items:[], end:0, lanes:[] }; groups.push(cur); }
        var lane = 0; while (cur.lanes[lane] != null && cur.lanes[lane] > it.s) lane++;
        cur.lanes[lane] = it.e; it.lane = lane; cur.items.push(it); cur.end = Math.max(cur.end, it.e);
    });
    groups.forEach(function(g){ g.items.forEach(function(it){ it.nl = g.lanes.length; }); });
}

function renderWeek(pl){
    var mon = mondayOf(sel), today = todayStr(), html = "";
    for (var i = 0; i < 7; i++) {
        var ds = addDays(mon, i), d = parseDate(ds);
        var min = 0, nses = 0;
        (pl.sessions||[]).forEach(function(s){ if (s.date === ds && s.status !== "todo") { nses++; if (s.kind !== "pause") min += s.duration||0; } });
        var ntk = tasks.filter(function(t){ return t.date === ds && t.status !== "done"; }).length;
        var has = nses || ntk, lvl = min >= 240 ? " l3" : min >= 120 ? " l2" : "";
        var tip = has ? (min ? dur(min) + " de séances" : "") + (min && ntk ? " · " : "") + (ntk ? ntk + " tâche" + (ntk>1?"s":"") : "") : "Rien de prévu";
        html += '<button type="button" class="hm-day'+(ds===today?" today":"")+(ds===sel?" sel":"")+'" data-day="'+ds+'" aria-pressed="'+(ds===sel)+'" title="'+tip+'">'+
            '<span class="w">'+JOURS[d.getDay()]+'</span><span class="n">'+d.getDate()+'</span><span class="d'+(has?" on":"")+lvl+'"></span></button>';
    }
    $("hm-week").innerHTML = '<button type="button" class="hm-arrow" data-week="-7" aria-label="Semaine précédente">‹</button>'+
        '<div class="days">'+html+'</div>'+
        '<button type="button" class="hm-arrow" data-week="7" aria-label="Semaine suivante">›</button>';
}

function renderStats(pl){
    var comp = dayCompletion(sel) || { checked:0, total:0 };
    var fo = window.focusExportState ? window.focusExportState() : { history:{} };
    var fh = (fo.history||{})[sel] || { n:0, min:0 };
    var planned = 0, done = 0;
    (pl.sessions||[]).forEach(function(s){ if (s.date === sel && s.status !== "todo" && s.kind !== "pause") { planned += s.duration||0; if (s.status === "done") done += s.duration||0; } });
    var cn = window.carnetExportState ? window.carnetExportState() : { subjects:[] };
    var w = 0, t = 0;
    (cn.subjects||[]).forEach(function(s){ var sw = 0, st = 0;
        (s.grades||[]).forEach(function(g){ var c = +g.coef||0; if (!(+g.max>0) || c<=0) return; st += (+g.value/+g.max)*c; sw += c; });
        var c = +s.coef||0; if (sw>0 && c>0) { t += (st/sw)*c; w += c; } });
    var sc = cn.scale || 20;
    var wk = 0, mon = mondayOf(sel);
    for (var i = 0; i < 7; i++) wk += ((fo.history||{})[addDays(mon, i)] || { min:0 }).min || 0;
    var show = (window.hpPref && window.hpPref("stats")) || {}, parts = [];
    if (show.habits !== false) parts.push(isSkipped(sel) ? '<span>habitudes : <b>jour ignoré</b></span>' : '<span><b>'+comp.checked+'/'+comp.total+'</b> habitudes</span>');
    if (show.focus !== false) parts.push('<span><b>'+fh.n+'</b> pomodoro'+(fh.n>1?"s":"")+' · <b>'+dur(wk)+'</b> de focus cette semaine</span>');
    if (show.sessions !== false) parts.push('<span><b>'+dur(done)+'</b> / '+dur(planned)+' de séances</span>');
    if (w > 0 && show.avg !== false) parts.push('<span>moyenne <b>'+(Math.round(t/w*sc*10)/10).toLocaleString("fr-FR")+'</b>/'+sc+'</span>');
    $("hm-stats").innerHTML = parts.join('<span aria-hidden="true">·</span>') +
        (sel !== todayStr() ? '<button type="button" class="back" data-today="1">Revenir à aujourd\'hui</button>' : '');
}

function renderTimeline(pl){
    var H0 = window.hpPref ? window.hpPref("dayStart") : 7;   // début de journée choisi dans « Personnaliser »
    var d = parseDate(sel);
    $("hm-dayTitle").textContent = (sel === todayStr() ? "Aujourd'hui · " : "") + JOURS_LONG[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()];
    $("hm-events").innerHTML = (pl.events||[]).filter(function(e){ return e.start <= sel && (e.end||e.start) >= sel; })
        .map(function(e){ return '<span class="hm-ev">'+esc(e.title)+'</span>'; }).join("");

    var items = (pl.sessions||[]).filter(function(s){ return s.date === sel && s.time && s.status !== "todo"; })
        .map(function(s){ var st = toMin(s.time); return { s:st, e:st + Math.max(15, s.duration||60), ses:s }; })
        .sort(function(a,b){ return a.s - b.s || b.e - a.e; });
    renderNext(items);
    var tl = $("hm-tl");

    // journée vide : un message plutôt qu'une grille vide
    if (!items.length && !fullDay[sel]) {
        tl.style.height = ""; $("hm-earlierWrap").innerHTML = "";
        tl.innerHTML = '<div class="hm-free"><b>Rien de prévu '+(sel === todayStr() ? "aujourd'hui" : "ce jour-là")+'</b>'+
            '<span>Ajoute une séance ou colle un planning.</span><div class="row">'+
            '<button type="button" data-newsess="1">+ Séance</button>'+
            '<button type="button" class="btn-ghost" data-paste="1">Coller un planning</button>'+
            '<button type="button" class="btn-ghost" data-full="1">Voir la journée</button></div></div>';
        return;
    }
    // la grille commence à la première séance (et va au moins jusqu'à 23h)
    var firstH = items.length ? Math.floor(items[0].s/60) : H0;
    var lastE = items.reduce(function(a,it){ return Math.max(a, it.e); }, 0);
    var A = fullDay[sel] ? Math.min(H0, firstH) : firstH;
    var B = Math.min(24, Math.max(H1, Math.ceil(lastE/60)));
    if (B <= A) B = Math.min(24, A + 1);

    var html = "";
    for (var h = A; h <= B; h++) {
        html += '<div class="hm-hour" style="top:'+((h-A)*PX)+'px"><span>'+pad(h % 24)+':00</span></div>';
        if (h < B) html += '<div class="hm-hour half" style="top:'+((h-A)*PX+PX/2)+'px"></div>';
    }
    for (var m = A*60; m < B*60; m += 30)
        html += '<button type="button" class="hm-slot" data-time="'+hhmm(m % 1440)+'" style="top:'+((m-A*60)/60*PX+1)+'px;height:'+(PX/2-2)+'px" aria-label="Ajouter une séance à '+hhmm(m % 1440)+'">+ '+hhmm(m % 1440)+'</button>';
    layoutLanes(items);
    items.forEach(function(it){
        var top = (Math.max(it.s, A*60) - A*60)/60*PX;
        var bot = (Math.min(it.e, B*60) - A*60)/60*PX;
        if (bot <= 0 || top >= (B-A)*PX) { top = it.s < A*60 ? 0 : (B-A)*PX - 24; bot = top + 24; }
        var hgt = Math.max(13, bot - top - 2), s = it.ses, isDone = s.status === "done";
        var left = 'calc(52px + (100% - 52px) * '+(it.lane/it.nl)+')', width = 'calc((100% - 52px) / '+it.nl+' - 3px)';
        var sc = s.kind !== "pause" && !isDone && window.hpSubjectColor ? window.hpSubjectColor(s.name) : null;
        var cst = sc ? ';border-left-color:'+sc+';background:'+window.hpRgba(sc, .18) : '';
        html += '<div class="hm-blk'+(isDone?" done":"")+(s.kind==="pause"?" pause":"")+(hgt < 40?" short":"")+(hgt < 22?" tiny":"")+'" data-sess="'+s.id+'" style="top:'+(top+1)+'px;height:'+hgt+'px;left:'+left+';width:'+width+cst+'" title="'+esc(s.name)+'">'+
            '<button type="button" class="hm-check'+(isDone?" on":"")+'" data-sdone="'+s.id+'" aria-label="Valider">'+(isDone?"✓":"")+'</button>'+
            '<div class="bt"><b>'+esc(s.name)+'</b><span>'+s.time+' – '+hhmm(it.e % 1440)+' · '+dur(s.duration||0)+'</span></div></div>';
    });
    if (sel === todayStr()) {
        var now = new Date(), nm = now.getHours()*60 + now.getMinutes();
        if (nm >= A*60 && nm <= B*60) html += '<div class="hm-now" style="top:'+((nm-A*60)/60*PX)+'px"></div>';
    }
    var earlier = A > Math.min(H0, firstH) ? '<button type="button" class="hm-earlier" data-full="1">↑ Afficher depuis '+H0+'h</button>' : '';
    tl.style.height = ((B-A)*PX) + "px";
    tl.innerHTML = html;
    $("hm-earlierWrap").innerHTML = earlier;
}

/* carte « séance en cours / prochaine séance » (aujourd'hui seulement) */
function renderNext(items){
    var el = $("hm-next");
    if (sel !== todayStr()) { el.innerHTML = ""; return; }
    var now = new Date(), nm = now.getHours()*60 + now.getMinutes();
    var list = items.filter(function(it){ return it.ses.kind !== "pause" && it.ses.status !== "done"; });
    var cur = list.filter(function(it){ return it.s <= nm && nm < it.e; })[0];
    var nxt = cur || list.filter(function(it){ return it.s > nm; })[0];
    if (!nxt) { el.innerHTML = ""; return; }
    var s = nxt.ses, w;
    if (cur) w = "jusqu'à " + hhmm(nxt.e % 1440) + " · encore " + dur(nxt.e - nm);
    else w = s.time + " · dans " + dur(nxt.s - nm);
    el.innerHTML = '<button type="button" class="hm-next'+(cur?" now":"")+'" data-sess="'+s.id+'">'+
        '<span class="k">'+(cur?"En cours":"Prochaine")+'</span><span class="nm">'+esc(s.name)+'</span><span class="w">'+w+'</span></button>';
}

function renderSide(pl){
    var today = todayStr();
    var rows = [];
    (pl.sessions||[]).filter(function(s){ return s.date === sel && !s.time && s.status !== "todo"; }).forEach(function(s){
        rows.push('<div class="hm-item'+(s.status==="done"?" done":"")+(s.kind==="pause"?" pause":"")+'"><button type="button" class="hm-check" data-sdone="'+s.id+'" aria-label="Valider">'+(s.status==="done"?"✓":"")+'</button>'+
            '<span class="t">'+esc(s.name)+'</span><span class="m">'+(s.kind==="pause"?"pause":"séance")+' · '+dur(s.duration||0)+'</span></div>');
    });
    var list = tasks.filter(function(t){ return t.date === sel; });
    if (sel === today) list = tasks.filter(function(t){ return t.date && t.date < today && t.status !== "done"; }).concat(list);
    list.sort(function(a,b){ return (a.status==="done") - (b.status==="done"); });
    list.forEach(function(t){
        var late = t.date < sel, tag = late ? '<span class="m" style="color:var(--rose)">en retard</span>' : t.status === "doing" ? '<span class="m" style="color:var(--amber)">en cours</span>' : '<span class="m"></span>';
        rows.push('<div class="hm-item'+(t.status==="done"?" done":"")+'"><button type="button" class="hm-check" data-task="'+t.id+'" aria-label="Terminer">'+(t.status==="done"?"✓":"")+'</button>'+
            '<span class="t">'+esc(t.text)+'</span>'+tag+'</div>');
    });
    $("hm-list").innerHTML = rows.length ? rows.join("") : '<div class="hm-empty">Rien sans horaire ce jour-là.</div>';
    $("hm-sideCount").textContent = rows.length ? rows.length : "";
    var d = parseDate(sel);
    $("hm-taskInput").placeholder = sel === today ? "Ajouter une tâche pour aujourd'hui…" : "Ajouter une tâche pour le " + JOURS[d.getDay()] + " " + d.getDate() + "…";
}


function renderUpcoming(pl){
    var today = todayStr(), lim = addDays(today, 60);
    var evs = (pl.events||[]).filter(function(e){ return (e.end||e.start) >= today && e.start <= lim; })
        .sort(function(a,b){ return a.start.localeCompare(b.start); }).slice(0, 5);
    var MO = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
    function daysBetween(a,b){ return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
    function fd(ds){ var d = parseDate(ds); return JOURS[d.getDay()]+" "+d.getDate()+" "+MO[d.getMonth()]; }
    $("hm-up").innerHTML = evs.length ? evs.map(function(e){
        var end = e.end || e.start, ongoing = e.start <= today, n = daysBetween(today, e.start), d = parseDate(e.start);
        var cd = ongoing ? "en cours" : n === 1 ? "demain" : "dans " + n + " j";
        var range = e.start === end ? fd(e.start) : fd(e.start) + " → " + fd(end);
        if (ongoing && end !== today) range = "jusqu'au " + fd(end);
        if (ongoing && end === today) range = "dernier jour";
        return '<button type="button" class="hm-upi'+(ongoing?" now":n<=3?" soon":"")+'" data-goday="'+(ongoing?today:e.start)+'">'+
            '<span class="hm-upd"><b>'+d.getDate()+'</b><span>'+MO[d.getMonth()]+'</span></span>'+
            '<span class="hm-upt"><b>'+esc(e.title)+'</b><span>'+range+'</span></span>'+
            '<span class="hm-upc">'+cd+'</span></button>';
    }).join("") : '<div class="hm-empty">Aucun event prévu. Ajoute tes partiels, rendus, matchs…</div>';
}
function renderHomeHabits(){
    var hs = activeHabitsOn(sel), skip = isSkipped(sel);
    var done = hs.filter(function(h){ return isChecked(sel, h.id); }).length;
    $("hm-habCount").textContent = hs.length ? done + "/" + hs.length : "";
    if (skip) { $("hm-habits").innerHTML = '<div class="hm-empty">Jour ignoré.</div>'; return; }
    $("hm-habits").innerHTML = hs.length ? hs.map(function(h){
        var y = isChecked(sel, h.id), n = isNo(sel, h.id);
        return '<div class="hm-item hm-hab'+(y?" done":"")+(n?" no":"")+'"><span class="yn">'+
            '<button type="button" class="hm-check" data-hyes="'+h.id+'" aria-label="Fait" aria-pressed="'+y+'">'+(y?"✓":"")+'</button>'+
            '<button type="button" class="hm-check hm-no" data-hno="'+h.id+'" aria-label="Pas fait" aria-pressed="'+n+'">✕</button></span>'+
            '<span class="t">'+esc(h.name)+'</span><span class="m">'+(habitStreak(h.id) ? habitStreak(h.id)+" j" : "")+'</span></div>';
    }).join("") : '<div class="hm-empty">Aucune habitude active.</div>';
}
function renderHome(){
    if ($("module-home").hidden) return;
    var pl = planner();
    renderWeek(pl); renderStats(pl); renderTimeline(pl); renderSide(pl); renderUpcoming(pl); renderHomeHabits();
}
window.renderHome = renderHome;

var home = $("module-home");
home.addEventListener("click", function(e){
    var b = e.target.closest("button, .hm-blk"); if (!b) return;
    var ds = b.dataset;
    if (b.id === "hm-evAdd") { if (window.plannerNewEvent) window.plannerNewEvent(sel); return; }
    if (ds.goday) { sel = ds.goday; renderHome(); window.scrollTo({ top:0, behavior:"smooth" }); return; }
    if (ds.day) { sel = ds.day; renderHome(); }
    else if (ds.week) { sel = addDays(sel, +ds.week); renderHome(); }
    else if (ds.today) { sel = todayStr(); renderHome(); }
    else if (ds.time) { if (window.plannerNewAt) window.plannerNewAt(sel, ds.time); }
    else if (ds.sdone) { if (window.plannerToggleDone) window.plannerToggleDone(ds.sdone); renderHome(); }
    else if (ds.task) { toggleDone(+ds.task); renderHome(); }
    else if (ds.hyes) { setChecked(sel, ds.hyes, isChecked(sel, ds.hyes) ? null : true); renderHome(); }
    else if (ds.hno) { setChecked(sel, ds.hno, isNo(sel, ds.hno) ? null : "no"); renderHome(); }
    else if (ds.full) { fullDay[sel] = true; renderHome(); }
    else if (ds.paste) { hpOpen(); }
    else if (ds.newsess) {
        var t = "";
        if (sel === todayStr()) { var n = new Date(), m = Math.ceil((n.getHours()*60 + n.getMinutes() + 1)/30)*30; if (m < 1440) t = hhmm(m); }
        if (window.plannerNewAt) window.plannerNewAt(sel, t);
    }
    else if (ds.sess) { if (window.plannerEdit) window.plannerEdit(ds.sess); }
});
home.addEventListener("submit", function(e){
    if (e.target.id !== "hm-addTask") return;
    e.preventDefault();
    var v = $("hm-taskInput").value.trim();
    if (!v) { $("hm-taskInput").focus(); return; }
    addTaskForDay(v, sel);
    $("hm-taskInput").value = "";
    renderHome();
    showToast("Tâche ajoutée");
    $("hm-taskInput").focus();
});

/* ---------- coller un planning (#HASHPLAN) ---------- */
function parseDur(s){
    var m;
    if ((m = /^(\d+)\s*(?:min|mn|m)?$/i.exec(s))) return +m[1];
    if ((m = /^(\d+)h(\d{1,2})?$/i.exec(s))) return (+m[1])*60 + (+(m[2]||0));
    return null;
}
function parseDay(s, def){
    s = (s||"").trim().toLowerCase();
    if (!s) return def;
    if (s === "aujourd'hui" || s === "aujourdhui") return todayStr();
    if (s === "demain") return addDays(todayStr(), 1);
    var m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return m[1]+"-"+pad(+m[2])+"-"+pad(+m[3]);
    if ((m = /^(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?/.exec(s))) {
        var y = m[3] ? (m[3].length === 2 ? "20"+m[3] : m[3]) : String(new Date().getFullYear());
        return y+"-"+pad(+m[2])+"-"+pad(+m[1]);
    }
    return null;
}
function parsePlan(text, def){
    var cur = def, out = { sessions:[], tasks:[], errors:[], days:[] };
    function seen(d){ if (out.days.indexOf(d) < 0) out.days.push(d); }
    text.split(/\r?\n/).forEach(function(raw, i){
        var l = raw.replace(/\s*\|\s*/g, " ").trim();
        if (!l || /^```/.test(l) || /^\/\//.test(l)) return;
        var m;
        if ((m = /^#\s*HASHPLAN\b\s*(.*)$/i.exec(l))) {
            var d = parseDay(m[1], def);
            if (!d) { out.errors.push("Ligne "+(i+1)+" : date illisible « "+m[1]+" »"); return; }
            cur = d; return;
        }
        if ((m = /^(?:t[âa]che|todo)\s*:?\s+(.+)$/i.exec(l))) { out.tasks.push({ date:cur, text:m[1].trim().slice(0,120) }); seen(cur); return; }
        var time = null, rest;
        // plage horaire : « 14:00-16:00 Maths » ou « 14h à 16h30 Maths »
        if ((m = /^(\d{1,2})[:hH](\d{2})?\s*(?:-|–|—|à|a)\s*(\d{1,2})[:hH]?(\d{2})?\s+(.+)$/i.exec(l))) {
            var h1 = +m[1], m1 = +(m[2]||0), h2 = +m[3], m2 = +(m[4]||0);
            if (h1 > 23 || m1 > 59 || h2 > 24 || m2 > 59) { out.errors.push("Ligne "+(i+1)+" : heure invalide"); return; }
            var du2 = (h2*60+m2) - (h1*60+m1); if (du2 <= 0) du2 += 1440;
            if (du2 > 720) { out.errors.push("Ligne "+(i+1)+" : plage trop longue"); return; }
            var nm2 = m[5].trim().slice(0,100);
            out.sessions.push({ date:cur, time:pad(h1)+":"+pad(m1), duration:du2, name:nm2, kind: /^pause\b/i.test(nm2) ? "pause" : undefined });
            seen(cur); return;
        }
        if ((m = /^(\d{1,2})[:hH](\d{2})?\s+(.+)$/.exec(l))) {
            var h = +m[1], mi = +(m[2]||0);
            if (h > 23 || mi > 59) { out.errors.push("Ligne "+(i+1)+" : heure invalide"); return; }
            time = pad(h)+":"+pad(mi); rest = m[3];
        } else if ((m = /^[-–—]\s+(.+)$/.exec(l))) { rest = m[1]; }
        else { out.errors.push("Ligne "+(i+1)+" ignorée : « "+raw.trim().slice(0,60)+" »"); return; }
        var p = /^(\S+)\s+(.+)$/.exec(rest), du = p ? parseDur(p[1]) : null;
        if (!p || !du || du > 720) { out.errors.push("Ligne "+(i+1)+" : durée manquante ou invalide"); return; }
        var name = p[2].trim().slice(0,100);
        out.sessions.push({ date:cur, time:time, duration:du, name:name, kind: /^pause\b/i.test(name) ? "pause" : undefined });
        seen(cur);
    });
    out.days.sort();
    return out;
}
var hpParsed = null;
function hpRender(){
    var r = hpParsed = parsePlan($("hp-text").value, sel);
    var html = "";
    r.days.forEach(function(d){
        var dt = parseDate(d);
        var ses = r.sessions.filter(function(s){ return s.date === d; }).sort(function(a,b){ return (a.time||"99:99").localeCompare(b.time||"99:99"); });
        var tk = r.tasks.filter(function(t){ return t.date === d; });
        html += '<div class="hp-day"><h3>'+JOURS_LONG[dt.getDay()]+' '+dt.getDate()+' '+MOIS[dt.getMonth()]+'</h3>' +
            ses.map(function(s){ return '<div class="hp-row'+(s.kind==="pause"?" pause":"")+'"><span class="tm">'+(s.time||"—")+'</span><span class="nm">'+esc(s.name)+'</span><span class="du">'+dur(s.duration)+'</span></div>'; }).join("") +
            tk.map(function(t){ return '<div class="hp-row task"><span class="tm">tâche</span><span class="nm">'+esc(t.text)+'</span><span class="du"></span></div>'; }).join("") + '</div>';
    });
    html += r.errors.map(function(e){ return '<div class="hp-err">'+esc(e)+'</div>'; }).join("");
    var n = r.sessions.length + r.tasks.length;
    if (n) html += '<div class="hp-sum">'+n+' élément'+(n>1?"s":"")+' sur '+r.days.length+' jour'+(r.days.length>1?"s":"")+'</div>';
    $("hp-preview").innerHTML = html;
    $("hp-ok").disabled = !n;
    $("hp-ok").textContent = n ? "Ajouter "+n+" élément"+(n>1?"s":"") : "Ajouter";
}
function hpOpen(){ $("hp-overlay").hidden = false; hpRender(); setTimeout(function(){ $("hp-text").focus(); }, 30); }
function hpClose(){ $("hp-overlay").hidden = true; }
$("hm-pasteBtn").addEventListener("click", hpOpen);
$("hp-close").addEventListener("click", hpClose);
$("hp-cancel").addEventListener("click", hpClose);
$("hp-overlay").addEventListener("click", function(e){ if (e.target === this) hpClose(); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape" && !$("hp-overlay").hidden) hpClose(); });
$("hp-text").addEventListener("input", hpRender);
$("hp-clip").addEventListener("click", function(){
    try {
        navigator.clipboard.readText().then(function(t){ $("hp-text").value = t; hpRender(); })
            .catch(function(){ showToast("Accès au presse-papiers refusé — colle à la main"); });
    } catch(e) { showToast("Colle à la main (appui long → Coller)"); }
});
$("hp-ok").addEventListener("click", function(){
    var r = hpParsed; if (!r) return;
    var res = window.plannerAddSessions ? window.plannerAddSessions(r.sessions) : { added:0, skipped:0 };
    var nt = 0;
    r.tasks.forEach(function(t){
        if (tasks.some(function(x){ return x.date === t.date && x.text === t.text; })) { res.skipped++; return; }
        tasks.unshift({ id: Date.now() + nt, text: t.text, status: "todo", date: t.date });
        addHistory("Tâche ajoutée : " + t.text); nt++;
    });
    if (nt) { saveTasks(); renderTasksModule(); if (window.plannerRefreshWeek) window.plannerRefreshWeek(); }
    if (r.days.length) sel = r.days[0];
    hpClose(); $("hp-text").value = "";
    renderHome();
    var tot = res.added + nt;
    showToast(tot + " élément" + (tot>1?"s":"") + " ajouté" + (tot>1?"s":"") + (res.skipped ? " · " + res.skipped + " doublon" + (res.skipped>1?"s":"") + " ignoré" + (res.skipped>1?"s":"") : ""));
});
var lastDay = todayStr();
function tick(){
    var t = todayStr();
    if (t !== lastDay) { if (sel === lastDay) sel = t; lastDay = t; }
    renderHome();
}
setInterval(tick, 60000);
document.addEventListener("visibilitychange", function(){ if (!document.hidden) tick(); });

switchModule("home");
// fait défiler jusqu'à l'heure actuelle si elle est sous la ligne de flottaison
setTimeout(function(){
    var n = home.querySelector(".hm-now");
    if (n) { var r = n.getBoundingClientRect(); if (r.top > window.innerHeight - 80) window.scrollTo({ top: window.scrollY + r.top - window.innerHeight/2 }); }
}, 50);
})();
