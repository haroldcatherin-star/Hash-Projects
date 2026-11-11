/* ============================================================================
   MODULE : SÉANCES — planificateur (adapté de "Planner — Séances")
   Entièrement encapsulé : ne touche à aucune variable globale du script
   principal, à l'exception des deux hooks exposés en bas (export/import).
   ============================================================================ */
(function(){
"use strict";

var KEY="hashprojects_planner_v1";
var state={ sessions:[], events:[] };
var view="week";
var anchor=new Date();
var editId=null;
var editEventId=null;
var weekSpan=1;

function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} if(window.renderHome) setTimeout(window.renderHome,0); }
function load(){
  try{
    var raw=localStorage.getItem(KEY);
    if(raw){
      var d=JSON.parse(raw);
      if(d && d.sessions) state.sessions=d.sessions;
      if(d && Array.isArray(d.events)) state.events=d.events;
    }
  }catch(e){}
}

function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function parseYmd(s){ var p=s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
function mondayOf(d){
  var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  var day=(x.getDay()+7-(window.hpWeekStart ? window.hpWeekStart() : 1))%7;
  x.setDate(x.getDate()-day);
  return x;
}
function addDays(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
function isoWeek(d){
  var t=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  t.setDate(t.getDate()+3-((t.getDay()+6)%7));
  var first=new Date(t.getFullYear(),0,4);
  return 1+Math.round(((t-first)/86400000-3+((first.getDay()+6)%7))/7);
}
var DAYS=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
var MONTHS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
function longDate(d){ return DAYS[(d.getDay()+6)%7]+" "+d.getDate()+" "+MONTHS[d.getMonth()]; }
function hrs(min){ var h=min/60; return (Math.round(h*10)/10).toString().replace(".",","); }
function durLabel(min){
  var h=Math.floor(min/60), m=min%60;
  if(h && m) return h+"h"+String(m).padStart(2,"0");
  if(h) return h+"h";
  return m+" min";
}

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function byId(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function find(id){ for(var i=0;i<state.sessions.length;i++) if(state.sessions[i].id===id) return state.sessions[i]; return null; }

function complete(id){
  var s=find(id); if(!s) return;
  s.status="done";
  s.doneAt=ymd(new Date());
  if(!s.date) s.date=s.doneAt;
  save(); render();
  if(window.showToast) window.showToast("Séance validée");
}
function uncomplete(id){
  var s=find(id); if(!s) return;
  s.status = s.time ? "planned" : "todo";
  s.doneAt=null;
  save(); render();
}
function remove(id){
  state.sessions=state.sessions.filter(function(s){ return s.id!==id; });
  save(); render();
}

function updateMDateBtn(){
  var v=byId("plMDate").value;
  byId("plMDateBtn").textContent = v ? dpFormat(v) : "Choisir un jour";
}
function openModal(opts){
  opts=opts||{};
  editId=opts.id||null;
  var s=editId?find(editId):null;
  byId("plMTitle").textContent = s ? "Modifier la séance" : "Nouvelle séance";
  byId("plMName").value = s ? s.name : "";
  byId("plMDate").value = s ? (s.date||"") : (opts.date||ymd(new Date()));
  updateMDateBtn();
  byId("plMTime").value = s ? (s.time||"") : (opts.time||"");
  byId("plMDur").value  = s ? s.duration : 60;
  syncEnd();
  byId("plOverlay").hidden=false;
  setTimeout(function(){ byId("plMName").focus(); },30);
}
/* début / fin / durée restent synchronisés : on peut saisir « de 14h à 16h » ou « 14h + 120 min » */
function tMin(t){ var p=String(t).split(":"); return (+p[0])*60+(+p[1]||0); }
function tStr(m){ m=((m%1440)+1440)%1440; return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); }
function syncEnd(){
  var t=byId("plMTime").value, d=parseInt(byId("plMDur").value,10);
  byId("plMEnd").disabled = !t;
  byId("plMEnd").value = (t && d>0) ? tStr(tMin(t)+d) : "";
}
byId("plMTime").addEventListener("input",syncEnd);
byId("plMDur").addEventListener("input",syncEnd);
byId("plMEnd").addEventListener("input",function(){
  var t=byId("plMTime").value, e=byId("plMEnd").value; if(!t||!e) return;
  var d=tMin(e)-tMin(t); if(d<=0) d+=1440;
  byId("plMDur").value=d;
});
function closeModal(){
  byId("plOverlay").hidden=true; editId=null;
  var m=byId("module-sessions");
  if(m.classList.contains("modal-only")){ m.classList.remove("modal-only"); m.hidden=true; if(window.renderHome) window.renderHome(); }
}
function showModalOnly(){ var m=byId("module-sessions"); if(m.hidden){ m.hidden=false; m.classList.add("modal-only"); } }

byId("plMForm").addEventListener("submit",function(e){
  e.preventDefault();
  var name=byId("plMName").value.trim();
  if(!name) return;
  var date=byId("plMDate").value||null;
  var time=byId("plMTime").value||null;
  var dur=parseInt(byId("plMDur").value,10)||60;
  if(editId){
    var s=find(editId);
    s.name=name; s.date=date; s.time=time; s.duration=dur;
    if(/^pause\b/i.test(name)) s.kind="pause"; else delete s.kind;
    if(s.status!=="done") s.status = date ? "planned" : "todo";
  }else{
    state.sessions.push({
      id:uid(), name:name, date:date, time:time,
      duration:dur, status: date?"planned":"todo", doneAt:null, created:Date.now(),
      kind: /^pause\b/i.test(name) ? "pause" : undefined
    });
  }
  save(); closeModal(); render();
});
byId("plMDateBtn").onclick=function(){
  openDatePicker(byId("plMDateBtn"), byId("plMDate").value, function(v){
    byId("plMDate").value = v;
    updateMDateBtn();
  }, {clearable:true});
};
byId("plMCancel").onclick=closeModal;
byId("plOverlay").addEventListener("click",function(e){ if(e.target===this) closeModal(); });
document.addEventListener("keydown",function(e){
  if(e.key!=="Escape") return;
  if(!byId("plOverlay").hidden) closeModal();
  if(!byId("plEventOverlay").hidden) closeEventModal();
});

/* ---------- events (multi-jours, hors séances) ---------- */
function findEvent(id){
  var evs=state.events||[];
  for(var i=0;i<evs.length;i++) if(evs[i].id===id) return evs[i];
  return null;
}
function removeEvent(id){
  state.events=(state.events||[]).filter(function(e){ return e.id!==id; });
  save(); renderWeek();
}
function updateEMDateBtns(){
  var sv=byId("plEMStart").value, ev=byId("plEMEnd").value;
  byId("plEMStartBtn").textContent = sv ? dpFormat(sv) : "Choisir un jour";
  byId("plEMEndBtn").textContent = ev ? dpFormat(ev) : "Choisir un jour";
}
function openEventModal(opts){
  opts=opts||{};
  editEventId=opts.id||null;
  var ev=editEventId?findEvent(editEventId):null;
  byId("plEMTitle").textContent = ev ? "Modifier l'event" : "Nouvel event";
  byId("plEMName").value = ev ? ev.title : "";
  var startDefault = ev ? ev.start : (opts.date||ymd(new Date()));
  var endDefault = ev ? ev.end : (opts.date||startDefault);
  byId("plEMStart").value = startDefault;
  byId("plEMEnd").value = endDefault;
  updateEMDateBtns();
  byId("plEMDelete").hidden = !ev;
  byId("plEventOverlay").hidden=false;
  setTimeout(function(){ byId("plEMName").focus(); },30);
}
function closeEventModal(){
  byId("plEventOverlay").hidden=true; editEventId=null;
  var m=byId("module-sessions");
  if(m.classList.contains("modal-only")){ m.classList.remove("modal-only"); m.hidden=true; if(window.renderHome) window.renderHome(); }
}

byId("plEMStartBtn").onclick=function(){
  openDatePicker(byId("plEMStartBtn"), byId("plEMStart").value, function(v){
    byId("plEMStart").value=v;
    if(v && byId("plEMEnd").value && byId("plEMEnd").value<v){ byId("plEMEnd").value=v; }
    updateEMDateBtns();
  }, {});
};
byId("plEMEndBtn").onclick=function(){
  openDatePicker(byId("plEMEndBtn"), byId("plEMEnd").value, function(v){
    byId("plEMEnd").value=v;
    updateEMDateBtns();
  }, {});
};
byId("plEMForm").addEventListener("submit",function(e){
  e.preventDefault();
  var title=byId("plEMName").value.trim();
  if(!title) return;
  var start=byId("plEMStart").value, end=byId("plEMEnd").value||start;
  if(!start) return;
  if(end<start){ var tmp=start; start=end; end=tmp; }
  if(editEventId){
    var ev=findEvent(editEventId);
    ev.title=title; ev.start=start; ev.end=end;
  }else{
    state.events.push({ id:uid(), title:title, start:start, end:end });
  }
  save(); closeEventModal(); renderWeek();
});
byId("plEMCancel").onclick=closeEventModal;
byId("plEMDelete").onclick=function(){
  if(editEventId) removeEvent(editEventId);
  closeEventModal();
};
byId("plEventOverlay").addEventListener("click",function(e){ if(e.target===this) closeEventModal(); });
byId("plAddEventBtn").onclick=function(){ openEventModal({ date: ymd(mondayOf(anchor)) }); };

function sessionCard(s){
  var el=document.createElement("div");
  el.className="sess"+(s.status==="done"?" done":"")+(s.kind==="pause"?" pause":"");
  var sc = s.kind!=="pause" && window.hpSubjectColor ? window.hpSubjectColor(s.name) : null;
  if(sc) el.style.borderLeftColor = sc;
  var meta = (s.time?esc(s.time)+" · ":"") + durLabel(s.duration);
  el.innerHTML =
    '<div class="name">'+esc(s.name)+'</div>'+
    '<div class="meta"><span>'+meta+'</span></div>'+
    '<div class="acts">'+
      '<button class="ok" title="Valider">'+(s.status==="done"?"↺":"✓")+'</button>'+
      '<button class="ed" title="Modifier">✎</button>'+
      '<button class="rm" title="Supprimer">✕</button>'+
    '</div>';
  var b=el.querySelectorAll("button");
  b[0].onclick=function(){ s.status==="done"?uncomplete(s.id):complete(s.id); };
  b[1].onclick=function(){ openModal({id:s.id}); };
  b[2].onclick=function(){ remove(s.id); };
  makeDraggable(el, s.id);
  return el;
}

/* ---------- glisser-déposer (souris + tactile, via Pointer Events) ---------- */
function makeDraggable(el, id){
  el.addEventListener("pointerdown", function(e){
    if(e.target.closest("button")) return;
    if(e.button !== undefined && e.button !== 0 && e.pointerType==="mouse") return;
    startDrag(e, el, id);
  });
}
function startDrag(e, sourceEl, id){
  var startX=e.clientX, startY=e.clientY;
  var moved=false, ghost=null, lastTarget=null;
  var rect=sourceEl.getBoundingClientRect();
  var offX=startX-rect.left, offY=startY-rect.top;

  function onMove(ev){
    var dx=ev.clientX-startX, dy=ev.clientY-startY;
    if(!moved){
      if(Math.abs(dx)<6 && Math.abs(dy)<6) return;
      moved=true;
      ghost=sourceEl.cloneNode(true);
      ghost.className=sourceEl.className+" pl-drag-ghost";
      ghost.style.width=rect.width+"px";
      document.body.appendChild(ghost);
      sourceEl.classList.add("dragging");
      try{ sourceEl.setPointerCapture(e.pointerId); }catch(err){}
    }
    ev.preventDefault();
    ghost.style.left=(ev.clientX-offX)+"px";
    ghost.style.top=(ev.clientY-offY)+"px";
    ghost.style.pointerEvents="none";
    var under=document.elementFromPoint(ev.clientX, ev.clientY);
    var dayEl = under ? under.closest(".day") : null;
    var todoZone = under ? under.closest("#plDropTodo") : null;
    var target = dayEl || todoZone || null;
    if(target!==lastTarget){
      if(lastTarget) lastTarget.classList.remove("drop-hover");
      if(target) target.classList.add("drop-hover");
      lastTarget=target;
    }
  }
  function onUp(ev){
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    if(ghost) ghost.remove();
    sourceEl.classList.remove("dragging");
    if(lastTarget) lastTarget.classList.remove("drop-hover");
    if(!moved) return;
    var s=find(id); if(!s) return;
    if(lastTarget && lastTarget.classList.contains("day")){
      var ds=lastTarget.dataset.date;
      if(ds && ds!==s.date){
        s.date=ds;
        if(s.status!=="done") s.status="planned";
        save(); render();
      }
    } else if(lastTarget && lastTarget.id==="plDropTodo" && s.status!=="done"){
      if(s.date!==null || s.status!=="todo"){
        s.date=null; s.time=null; s.status="todo";
        save(); render();
      }
    }
  }
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function dayTaskAddControl(ds){
  var wrap=document.createElement("div");
  wrap.className="day-task-add";
  var btn=document.createElement("button");
  btn.className="add"; btn.textContent="+ tâche";
  btn.onclick=function(){
    wrap.innerHTML="";
    var inp=document.createElement("input");
    inp.type="text"; inp.className="day-task-input"; inp.placeholder="Nouvelle tâche…";
    wrap.appendChild(inp);
    inp.focus();
    var handled=false;
    function commit(){
      if(handled) return; handled=true;
      var v=inp.value.trim();
      if(v && typeof addTaskForDay==="function") addTaskForDay(v, ds);
      renderWeek();
    }
    inp.addEventListener("keydown", function(e){
      if(e.key==="Enter"){ e.preventDefault(); commit(); }
      else if(e.key==="Escape"){ handled=true; renderWeek(); }
    });
    inp.addEventListener("blur", function(){ commit(); });
  };
  wrap.appendChild(btn);
  return wrap;
}
function diffDays(a,b){ return Math.round((parseYmd(b)-parseYmd(a))/86400000); }
function eventsForWeek(mon){
  var sun=addDays(mon,6);
  var monS=ymd(mon), sunS=ymd(sun);
  var items=(state.events||[]).filter(function(ev){ return ev.end>=monS && ev.start<=sunS; })
    .map(function(ev){
      var startCol=Math.max(0, diffDays(monS, ev.start));
      var endCol=Math.min(6, diffDays(monS, ev.end));
      return { ev:ev, startCol:startCol, span:(endCol-startCol+1) };
    });
  items.sort(function(a,b){ return a.startCol-b.startCol || b.span-a.span; });
  var laneEnds=[];
  items.forEach(function(it){
    var lane=-1;
    for(var l=0;l<laneEnds.length;l++){ if(laneEnds[l] < it.startCol){ lane=l; break; } }
    if(lane===-1){ lane=laneEnds.length; laneEnds.push(-1); }
    laneEnds[lane]=it.startCol+it.span-1;
    it.lane=lane;
  });
  return items;
}
function buildEventsRow(mon){
  var items=eventsForWeek(mon);
  if(!items.length) return null;
  var maxLane=0;
  items.forEach(function(it){ if(it.lane>maxLane) maxLane=it.lane; });
  var row=document.createElement("div");
  row.className="events-row";
  row.style.gridTemplateRows="repeat("+(maxLane+1)+",22px)";
  items.forEach(function(it){
    var bar=document.createElement("div");
    bar.className="event-bar";
    bar.style.gridColumn=(it.startCol+1)+" / span "+it.span;
    bar.style.gridRow=(it.lane+1);
    bar.textContent=it.ev.title;
    bar.title=it.ev.title;
    bar.onclick=function(){ openEventModal({id:it.ev.id}); };
    row.appendChild(bar);
  });
  return row;
}
function buildDayCell(mon, i, todayStr, agg){
  var d=addDays(mon,i), ds=ymd(d);
  var col=document.createElement("div");
  col.className="day"+(ds===todayStr?" today":"")+(ds<todayStr?" past":"");
  col.dataset.date=ds;
  var list=state.sessions.filter(function(s){ return s.date===ds && s.status!=="todo"; })
    .sort(function(a,b){ return (a.time||"99:99").localeCompare(b.time||"99:99"); });

  var dayMin=0;
  list.forEach(function(s){
    if(s.kind==="pause") return;
    dayMin+=s.duration; agg.planned+=s.duration; agg.count++;
    if(s.status==="done") agg.done+=s.duration;
    agg.bySubject[s.name]=(agg.bySubject[s.name]||0)+s.duration;
  });

  col.innerHTML='<h3>'+DAYS[i]+'</h3><div class="num">'+d.getDate()+'</div>'+
    (dayMin?'<div class="dayh">'+hrs(dayMin)+' h planifiées</div>':'');
  list.forEach(function(s){ col.appendChild(sessionCard(s)); });

  var dayTasks = (typeof tasks!=="undefined" ? tasks : []).filter(function(t){ return t.date===ds; });
  if(dayTasks.length){
    var tasksHtml = '<div class="day-tasks">' + dayTasks.map(function(t){
      return '<div class="day-task'+(t.status==="done"?" done":"")+'">'+
        '<button class="dt-check" onclick="toggleDone('+t.id+')" title="'+(t.status==="done"?"Marquer à faire":"Marquer fait")+'">'+(t.status==="done"?"✓":"")+'</button>'+
        '<span class="dt-text">'+esc(t.text)+'</span>'+
        '<button class="dt-x" onclick="setTaskDate('+t.id+',\'\')" title="Retirer de ce jour">✕</button>'+
      '</div>';
    }).join('') + '</div>';
    col.insertAdjacentHTML('beforeend', tasksHtml);
  }

  var add=document.createElement("button");
  add.className="add"; add.textContent="+ séance";
  (function(ds){ add.onclick=function(){ openModal({date:ds}); }; })(ds);
  col.appendChild(add);
  col.appendChild(dayTaskAddControl(ds));
  return col;
}
function renderWeek(){
  var mon0=mondayOf(anchor);
  var todayStr=ymd(new Date());
  var agg={ planned:0, done:0, count:0, bySubject:{} };

  var grid=byId("plWeekGrid"); grid.innerHTML="";
  for(var w=0; w<weekSpan; w++){
    var mon=addDays(mon0, 7*w);
    var sun=addDays(mon,6);
    var block=document.createElement("div");
    block.className="week-block";

    if(weekSpan>1){
      var lbl=document.createElement("div");
      lbl.className="week-block-label";
      var mAbbr = (typeof DP_MONTHS_ABBR!=="undefined") ? DP_MONTHS_ABBR : MONTHS;
      lbl.textContent="Semaine "+isoWeek(mon)+" · "+mon.getDate()+" "+mAbbr[mon.getMonth()]+" – "+sun.getDate()+" "+mAbbr[sun.getMonth()];
      block.appendChild(lbl);
    }

    var evRow=buildEventsRow(mon);
    if(evRow) block.appendChild(evRow);

    var weekEl=document.createElement("div");
    weekEl.className="week";
    for(var i=0;i<7;i++){ weekEl.appendChild(buildDayCell(mon, i, todayStr, agg)); }
    block.appendChild(weekEl);
    grid.appendChild(block);
  }

  if(weekSpan===1){
    var sun0=addDays(mon0,6);
    byId("plWLabel").textContent="Semaine "+isoWeek(mon0);
    byId("plWSub").textContent=mon0.getDate()+" "+MONTHS[mon0.getMonth()]+" – "+sun0.getDate()+" "+MONTHS[sun0.getMonth()]+" "+sun0.getFullYear();
  }else{
    var lastSun=addDays(mon0, 7*weekSpan-1);
    byId("plWLabel").textContent=weekSpan+" semaines";
    byId("plWSub").textContent=mon0.getDate()+" "+MONTHS[mon0.getMonth()]+" – "+lastSun.getDate()+" "+MONTHS[lastSun.getMonth()]+" "+lastSun.getFullYear();
  }

  byId("plSPlan").innerHTML=hrs(agg.planned)+'<small>h</small>';
  byId("plSDone").innerHTML=hrs(agg.done)+'<small>h</small>';
  byId("plSBar").style.width=(agg.planned?Math.min(100,agg.done/agg.planned*100):0)+"%";
  byId("plSCount").textContent=agg.count;
  var top="—",max=0;
  for(var k in agg.bySubject){ if(agg.bySubject[k]>max){ max=agg.bySubject[k]; top=k; } }
  byId("plSTop").textContent = top.length>18 ? top.slice(0,17)+"…" : top;
}

function renderTodo(){
  var list=state.sessions.filter(function(s){ return s.status==="todo"; })
    .sort(function(a,b){ return a.created-b.created; });
  byId("plCTodo").textContent = list.length || "";
  var box=byId("plTodoList"); box.innerHTML="";
  if(!list.length){ box.innerHTML='<div class="pl-empty">Rien à faire pour l\'instant. Ajoute une séance ci-dessus.</div>'; return; }
  list.forEach(function(s){
    var row=document.createElement("div");
    row.className="row";
    row.innerHTML=
      '<button class="tick" title="Valider">✓</button>'+
      '<div class="body"><div class="t">'+esc(s.name)+'</div>'+
      '<div class="s"><span>'+durLabel(s.duration)+'</span></div></div>'+
      '<button class="mini pl">Planifier</button>'+
      '<button class="mini rm">✕</button>';
    row.querySelector(".tick").onclick=function(){ complete(s.id); };
    row.querySelector(".pl").onclick=function(){ openModal({id:s.id, date:ymd(new Date())}); };
    row.querySelector(".rm").onclick=function(){ remove(s.id); };
    makeDraggable(row, s.id);
    box.appendChild(row);
  });
}

byId("plQuickForm").addEventListener("submit",function(e){
  e.preventDefault();
  var name=byId("plQName").value.trim(); if(!name) return;
  state.sessions.push({
    id:uid(), name:name, date:null, time:null,
    duration:parseInt(byId("plQDur").value,10)||60, status:"todo", doneAt:null, created:Date.now()
  });
  byId("plQName").value="";
  save(); render(); byId("plQName").focus();
});

function renderDone(){
  var list=state.sessions.filter(function(s){ return s.status==="done" && s.kind!=="pause"; })
    .sort(function(a,b){ return (b.doneAt||"").localeCompare(a.doneAt||"") || b.created-a.created; });

  var total=0, weekMin=0, mon=ymd(mondayOf(new Date())), sun=ymd(addDays(mondayOf(new Date()),6));
  var weeks={};
  list.forEach(function(s){
    total+=s.duration;
    var d=s.doneAt||s.date;
    if(d>=mon && d<=sun) weekMin+=s.duration;
    if(d){ var wk=ymd(mondayOf(parseYmd(d))); weeks[wk]=(weeks[wk]||0)+s.duration; }
  });
  byId("plDTotal").innerHTML=hrs(total)+'<small>h</small>';
  byId("plDWeek").innerHTML=hrs(weekMin)+'<small>h</small>';
  byId("plDCount").textContent=list.length;
  var nw=Object.keys(weeks).length;
  byId("plDAvg").innerHTML=hrs(nw?total/nw:0)+'<small>h</small>';

  var chart=byId("plChart"); chart.innerHTML="";
  var base=mondayOf(new Date()), maxv=1;
  var vals=[];
  for(var i=7;i>=0;i--){
    var wkStart=addDays(base,-7*i), key=ymd(wkStart);
    var v=weeks[key]||0; if(v>maxv) maxv=v;
    vals.push({k:key,v:v,label:"S"+isoWeek(wkStart)});
  }
  vals.forEach(function(o,idx){
    var col=document.createElement("div"); col.className="col";
    var h=Math.max(3, o.v/maxv*88);
    col.innerHTML='<div class="n">'+(o.v?hrs(o.v):"")+'</div>'+
      '<div class="b'+(idx===vals.length-1?" f":"")+'" style="height:'+h+'%"></div>'+
      '<div class="l">'+o.label+'</div>';
    chart.appendChild(col);
  });

  var box=byId("plDoneList"); box.innerHTML="";
  if(!list.length){ box.innerHTML='<div class="pl-empty">Aucune séance validée pour le moment.</div>'; return; }
  var groups={}, order=[];
  list.forEach(function(s){
    var d=s.doneAt||s.date||"?";
    if(!groups[d]){ groups[d]=[]; order.push(d); }
    groups[d].push(s);
  });
  order.forEach(function(d){
    var g=document.createElement("div"); g.className="histgroup";
    var min=0; groups[d].forEach(function(s){ min+=s.duration; });
    var head=(d==="?")?"Sans date":longDate(parseYmd(d));
    g.innerHTML='<div class="gh"><b>'+head+'</b><span>'+groups[d].length+' séance'+(groups[d].length>1?"s":"")+' · '+hrs(min)+' h</span></div>';
    groups[d].forEach(function(s){
      var row=document.createElement("div");
      row.className="row hist";
      row.innerHTML=
        '<button class="tick" style="border-color:var(--green);color:#fff;background:var(--green)">✓</button>'+
        '<div class="body"><div class="t">'+esc(s.name)+'</div>'+
        '<div class="s"><span>'+durLabel(s.duration)+'</span>'+(s.time?'<span>'+esc(s.time)+'</span>':'')+'</div></div>'+
        '<button class="mini und">Annuler</button>'+
        '<button class="mini rm">✕</button>';
      row.querySelector(".und").onclick=function(){ uncomplete(s.id); };
      row.querySelector(".rm").onclick=function(){ remove(s.id); };
      g.appendChild(row);
    });
    box.appendChild(g);
  });
}

function render(){
  byId("plCDone").textContent = state.sessions.filter(function(s){return s.status==="done" && s.kind!=="pause";}).length || "";
  byId("plVWeek").hidden = view!=="week";
  byId("plVDone").hidden = view!=="done";
  if(view==="week"){ renderWeek(); renderTodo(); }
  if(view==="done") renderDone();
}

Array.prototype.forEach.call(document.querySelectorAll("#module-sessions .tabs button"),function(b){
  b.onclick=function(){
    view=b.dataset.pltab;
    Array.prototype.forEach.call(document.querySelectorAll("#module-sessions .tabs button"),function(x){ x.classList.toggle("on", x===b); });
    render();
  };
});
byId("plPrevW").onclick=function(){ anchor=addDays(mondayOf(anchor),-7*weekSpan); renderWeek(); };
byId("plNextW").onclick=function(){ anchor=addDays(mondayOf(anchor),7*weekSpan); renderWeek(); };
byId("plTodayBtn").onclick=function(){ anchor=new Date(); renderWeek(); };
Array.prototype.forEach.call(document.querySelectorAll("#plSpanToggle button"),function(b){
  b.onclick=function(){
    weekSpan=parseInt(b.dataset.span,10)||1;
    Array.prototype.forEach.call(document.querySelectorAll("#plSpanToggle button"),function(x){ x.classList.toggle("on", x===b); });
    renderWeek();
  };
});

/* ---------- hooks pour l'export/import unifié de Fonsai ---------- */
window.plannerExportState = function(){ return { sessions: state.sessions, events: state.events }; };
window.plannerImportState = function(d){
  if(d && Array.isArray(d.sessions)){ state.sessions=d.sessions; }
  if(d && Array.isArray(d.events)){ state.events=d.events; }
  if(d && (Array.isArray(d.sessions) || Array.isArray(d.events))){ save(); render(); }
};
window.plannerRefreshWeek = function(){ if(view==="week") renderWeek(); };
window.plannerNewAt = function(date, time){ showModalOnly(); openModal({ date:date, time:time }); };
window.plannerNewEvent = function(date){ showModalOnly(); openEventModal({ date:date }); };
window.plannerEdit = function(id){ if(!find(id)) return; showModalOnly(); openModal({ id:id }); };
window.plannerRerender = function(){ try { render(); } catch(e) {} };
window.plannerAddSessions = function(list){
  var added=0, skipped=0;
  list.forEach(function(it){
    var dup=state.sessions.some(function(s){ return s.date===it.date && (s.time||null)===(it.time||null) && s.name===it.name && s.duration===it.duration; });
    if(dup){ skipped++; return; }
    var s={ id:uid(), name:it.name, date:it.date, time:it.time||null, duration:it.duration, status:"planned", doneAt:null, created:Date.now()+added };
    if(it.kind==="pause") s.kind="pause";
    state.sessions.push(s); added++;
  });
  if(added){ save(); render(); }
  return { added:added, skipped:skipped };
};
window.plannerToggleDone = function(id){ var s=find(id); if(!s) return; if(s.status==="done") uncomplete(id); else complete(id); };

(function init(){
  load();
  render();
})();

})();
