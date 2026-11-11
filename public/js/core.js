"use strict";

/* ========================================================================
   STOCKAGE
   ======================================================================== */
const STORAGE_TASKS = "hashprojects_tasks_v1";
const STORAGE_HISTORY = "hashprojects_history_v1";
const STORAGE_HABITS = "hashprojects_habits_v1";

let tasks = JSON.parse(localStorage.getItem(STORAGE_TASKS) || "[]");
let history = JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]");
let currentTaskFilter = "all";
let currentTaskSort = localStorage.getItem("hashprojects_tasksort_v1") || "manual";

const DEFAULT_HABITS = [
    { name:"Réviser les cours du jour", category:"Académique" },
    { name:"Faire les exercices / devoirs", category:"Académique" },
    { name:"Relire mes notes (active recall)", category:"Académique" },
    { name:"Dormir avant minuit", category:"Santé" },
    { name:"Boire assez d'eau", category:"Santé" },
    { name:"Entraînement / sport", category:"Santé" },
    { name:"Préparer sac + planning du lendemain", category:"Discipline" },
    { name:"Zéro réseaux sociaux avant le travail fini", category:"Discipline" }
];

function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function parseDate(s){ return new Date(s + "T00:00:00"); }
function addDays(s, n){ const d = parseDate(s); d.setDate(d.getDate()+n); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function loadHabitState() {
    try {
        const raw = localStorage.getItem(STORAGE_HABITS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.habits) && parsed.logs) return parsed;
        }
    } catch(e) {}
    const t = todayStr();
    return {
        habits: DEFAULT_HABITS.map(h => ({ id:uid(), name:h.name, category:h.category, createdAt:t, active:true })),
        logs: {}
    };
}
let habitState = loadHabitState();
let currentHabitFilter = "all";
let currentDate = todayStr();

function saveTasks(){ localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks)); localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history)); }
function saveHabits(){ localStorage.setItem(STORAGE_HABITS, JSON.stringify(habitState)); }

let toastTimer;
function showToast(msg){
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}
function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

/* ========================================================================
   SÉLECTEUR DE DATE MAISON
   (remplace les <input type="date"> natifs — l'année ne se tapait pas
   correctement au clavier sur certains navigateurs)
   ======================================================================== */
const DP_MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const DP_MONTHS_ABBR = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const DP_DAYS = ["L","M","M","J","V","S","D"];

function dpYmd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function dpParse(s){ return s ? new Date(s+"T00:00:00") : null; }
function dpFormat(s){
    if (!s) return "";
    const d = dpParse(s);
    return d.getDate()+" "+DP_MONTHS_ABBR[d.getMonth()]+" "+d.getFullYear();
}

let dpState = null;
function closeDatePicker(){
    if (!dpState) return;
    dpState.pop.remove();
    document.removeEventListener("mousedown", dpState.onDocClick, true);
    document.removeEventListener("keydown", dpState.onKeyDown, true);
    window.removeEventListener("scroll", dpState.onScroll, true);
    dpState = null;
}
function openDatePicker(anchorEl, currentValue, onSelect, opts){
    closeDatePicker();
    opts = opts || {};
    const base = dpParse(currentValue) || new Date();
    let viewY = base.getFullYear(), viewM = base.getMonth();

    const pop = document.createElement("div");
    pop.className = "dp-pop";

    function draw(){
        const first = new Date(viewY, viewM, 1);
        const ws = window.hpWeekStart ? window.hpWeekStart() : 1;
        const startOffset = (first.getDay()+7-ws)%7;
        const daysInMonth = new Date(viewY, viewM+1, 0).getDate();
        const todayS = dpYmd(new Date());
        let cells = "";
        for (let i=0;i<startOffset;i++) cells += '<span class="dp-cell dp-empty"></span>';
        for (let day=1; day<=daysInMonth; day++){
            const s = viewY+"-"+String(viewM+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
            let cls = "dp-cell";
            if (s===todayS) cls += " dp-today";
            if (s===currentValue) cls += " dp-sel";
            cells += '<button type="button" class="'+cls+'" data-d="'+s+'">'+day+'</button>';
        }
        pop.innerHTML =
            '<div class="dp-head">'+
                '<button type="button" class="dp-nav" data-nav="-1">‹</button>'+
                '<span class="dp-label">'+DP_MONTHS[viewM]+' '+viewY+'</span>'+
                '<button type="button" class="dp-nav" data-nav="1">›</button>'+
            '</div>'+
            '<div class="dp-weekdays">'+(ws === 0 ? DP_DAYS.slice(6).concat(DP_DAYS.slice(0,6)) : DP_DAYS).map(d=>'<span>'+d+'</span>').join('')+'</div>'+
            '<div class="dp-grid">'+cells+'</div>'+
            '<div class="dp-foot">'+
                '<button type="button" class="dp-mini" data-today="1">Aujourd\'hui</button>'+
                (opts.clearable ? '<button type="button" class="dp-mini dp-clear" data-clear="1">Effacer</button>' : '')+
            '</div>';

        pop.querySelector('[data-nav="-1"]').onclick = () => { viewM--; if (viewM<0){viewM=11;viewY--;} draw(); };
        pop.querySelector('[data-nav="1"]').onclick = () => { viewM++; if (viewM>11){viewM=0;viewY++;} draw(); };
        pop.querySelectorAll(".dp-cell[data-d]").forEach(btn => {
            btn.onclick = () => { onSelect(btn.dataset.d); closeDatePicker(); };
        });
        const todayBtn = pop.querySelector("[data-today]");
        if (todayBtn) todayBtn.onclick = () => { onSelect(dpYmd(new Date())); closeDatePicker(); };
        const clearBtn = pop.querySelector("[data-clear]");
        if (clearBtn) clearBtn.onclick = () => { onSelect(""); closeDatePicker(); };
    }
    draw();
    document.body.appendChild(pop);

    const r = anchorEl.getBoundingClientRect();
    const popW = 240;
    let left = r.left;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    pop.style.left = Math.max(8, left) + "px";
    let top = r.bottom + 6;
    if (top + 320 > window.innerHeight - 8) top = r.top - 326;
    pop.style.top = Math.max(8, top) + "px";

    function onDocClick(e){ if (!pop.contains(e.target) && e.target!==anchorEl) closeDatePicker(); }
    function onKeyDown(e){ if (e.key==="Escape") closeDatePicker(); }
    function onScroll(){ closeDatePicker(); }
    setTimeout(() => {
        document.addEventListener("mousedown", onDocClick, true);
        document.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("scroll", onScroll, true);
    }, 0);

    dpState = { pop, onDocClick, onKeyDown, onScroll };
}

/* ========================================================================
   MODULE : TÂCHES
   ======================================================================== */
const input = document.getElementById("taskInput");
input.addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });

function addHistory(text) {
    history.unshift({ text, time: new Date().toLocaleString("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) });
    history = history.slice(0, 40);
}
function addTask() {
    const text = input.value.trim();
    if (!text) return;
    tasks.unshift({ id: Date.now(), text, status: "todo", date: null });
    addHistory(`Tâche ajoutée : ${text}`);
    input.value = "";
    saveTasks();
    renderTasksModule();
}
function addTaskForDay(text, dateStr) {
    const t = text.trim();
    if (!t) return;
    tasks.unshift({ id: Date.now(), text: t, status: "todo", date: dateStr || null });
    addHistory(`Tâche ajoutée : ${t}`);
    saveTasks();
    renderTasksModule();
    if (window.plannerRefreshWeek) window.plannerRefreshWeek();
}
function setTaskDate(id, dateStr) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.date = dateStr || null;
    saveTasks();
    renderTasksModule();
    if (window.plannerRefreshWeek) window.plannerRefreshWeek();
}
function pickTaskDate(id, anchorEl) {
    const task = tasks.find(t => t.id === id);
    openDatePicker(anchorEl, task ? task.date : null, v => setTaskDate(id, v), { clearable: true });
}
function changeStatus(id, status) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const labels = { todo:"À faire", doing:"En cours", done:"Done" };
    if (task.status !== status) {
        addHistory(`${task.text} → ${labels[status]}`);
        task.status = status;
    }
    saveTasks();
    renderTasksModule();
    if (window.plannerRefreshWeek) window.plannerRefreshWeek();
}
function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    tasks = tasks.filter(t => t.id !== id);
    addHistory(`Tâche supprimée : ${task.text}`);
    saveTasks();
    renderTasksModule();
    if (window.plannerRefreshWeek) window.plannerRefreshWeek();
}
function setTaskFilter(filter) {
    currentTaskFilter = filter;
    document.querySelectorAll('#module-tasks .filter').forEach(b => b.classList.toggle("active", b.dataset.filter === filter));
    renderTaskList();
}
function setTaskSort(v) {
    currentTaskSort = v;
    try { localStorage.setItem("hashprojects_tasksort_v1", v); } catch(e) {}
    renderTaskList();
}
function moveTask(dragId, targetId, after) {
    const from = tasks.findIndex(t => t.id === dragId);
    if (from < 0 || dragId === targetId) return;
    const [item] = tasks.splice(from, 1);
    let to = tasks.findIndex(t => t.id === targetId);
    if (to < 0) { tasks.splice(from, 0, item); return; }
    tasks.splice(after ? to + 1 : to, 0, item);
    saveTasks();
    renderTaskList();
}
function dueLabel(dateStr) {
    const n = Math.round((parseDate(dateStr) - parseDate(todayStr())) / 86400000);
    if (n === 0) return "aujourd'hui";
    if (n === 1) return "demain";
    if (n === -1) return "hier";
    if (n < 0) return "il y a " + (-n) + " j";
    if (n < 7) return "dans " + n + " j";
    return dpFormat(dateStr);
}
function toggleDone(id) {
    const task = tasks.find(t => t.id === id);
    if (task) changeStatus(id, task.status === "done" ? "todo" : "done");
}
function renderTaskList() {
    const container = document.getElementById("tasks");
    let visible = currentTaskFilter === "all" ? tasks.slice() : tasks.filter(t => t.status === currentTaskFilter);
    const sortSel = document.getElementById("taskSort");
    if (sortSel) sortSel.value = currentTaskSort;
    if (currentTaskSort === "date")
        visible.sort((a, b) => (a.status === "done") - (b.status === "done") || (a.date || "9999").localeCompare(b.date || "9999"));
    const today = todayStr(), canDrag = currentTaskSort === "manual";
    if (!visible.length) {
        container.innerHTML = `<div class="empty">${tasks.length ? "Aucune tâche dans cette catégorie." : "Aucune tâche pour le moment.<br>Ajoute quelque chose à faire."}</div>`;
        return;
    }
    const labels = { todo:"À faire", doing:"En cours", done:"Done" };
    const classes = { todo:"todo", doing:"doing", done:"completed" };
    container.innerHTML = visible.map(t => {
        const late = t.date && t.date < today && t.status !== "done";
        return `
        <div class="task ${t.status === "done" ? "done" : ""} ${late ? "late" : ""}" data-id="${t.id}" ${canDrag ? 'draggable="true"' : ""}>
            <button class="check" onclick="toggleDone(${t.id})">${t.status === "done" ? "✓" : ""}</button>
            <div>
                <div class="task-title">${escapeHtml(t.text)}</div>
                <div class="meta">
                    <span class="badge ${classes[t.status]}">${labels[t.status]}</span>
                    <select onchange="changeStatus(${t.id}, this.value)">
                        <option value="todo" ${t.status==="todo"?"selected":""}>À faire</option>
                        <option value="doing" ${t.status==="doing"?"selected":""}>En cours</option>
                        <option value="done" ${t.status==="done"?"selected":""}>Done</option>
                    </select>
                    <button type="button" class="task-date-btn ${late ? "late" : ""}" onclick="pickTaskDate(${t.id}, this)" title="${t.date ? dpFormat(t.date) : "Assigner à un jour"}">${t.date ? (late ? "En retard · " : "") + dueLabel(t.date) : "+ Échéance"}</button>
                </div>
            </div>
            <button class="delete" title="Supprimer" onclick="deleteTask(${t.id})">×</button>
        </div>`;
    }).join("");
}
(function(){
    const box = document.getElementById("tasks");
    let dragId = null;
    box.addEventListener("dragstart", e => {
        const row = e.target.closest(".task[draggable]");
        if (!row) return;
        dragId = +row.dataset.id;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", String(dragId)); } catch(_) {}
    });
    box.addEventListener("dragover", e => {
        const row = e.target.closest(".task[draggable]");
        if (!row || dragId === null) return;
        e.preventDefault();
        const r = row.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
        box.querySelectorAll(".drop-before,.drop-after").forEach(x => x.classList.remove("drop-before", "drop-after"));
        if (+row.dataset.id !== dragId) row.classList.add(after ? "drop-after" : "drop-before");
    });
    box.addEventListener("drop", e => {
        const row = e.target.closest(".task[draggable]");
        if (!row || dragId === null) return;
        e.preventDefault();
        const r = row.getBoundingClientRect();
        moveTask(dragId, +row.dataset.id, e.clientY > r.top + r.height / 2);
    });
    box.addEventListener("dragend", () => {
        dragId = null;
        box.querySelectorAll(".dragging,.drop-before,.drop-after").forEach(x => x.classList.remove("dragging", "drop-before", "drop-after"));
    });
})();
function renderTaskStats() {
    const todo = tasks.filter(t => t.status === "todo").length;
    const doing = tasks.filter(t => t.status === "doing").length;
    const done = tasks.filter(t => t.status === "done").length;
    const total = tasks.length;
    const progress = total ? Math.round(done / total * 100) : 0;
    document.getElementById("todoCount").textContent = todo;
    document.getElementById("doingCount").textContent = doing;
    document.getElementById("doneCount").textContent = done;
    document.getElementById("totalCount").textContent = `${total} tâche${total > 1 ? "s" : ""}`;
    document.getElementById("progressText").textContent = `${progress}%`;
    document.getElementById("progressBar").style.width = `${progress}%`;
}
function renderTaskHistory() {
    const container = document.getElementById("history");
    if (!history.length) {
        container.innerHTML = `<div style="color:var(--muted);font-size:12px;">L'historique apparaîtra ici.</div>`;
        return;
    }
    container.innerHTML = history.map(h => `
        <div class="history-item"><strong>${escapeHtml(h.text)}</strong><span>${h.time}</span></div>
    `).join("");
}
function clearHistory() { history = []; saveTasks(); renderTaskHistory(); }
function renderTasksModule() { renderTaskList(); renderTaskStats(); renderTaskHistory(); }

/* ========================================================================
   MODULE : HABITUDES
   ======================================================================== */
function activeHabitsOn(dateStr){ return habitState.habits.filter(h => h.active !== false && h.createdAt <= dateStr); }
// logs[date][id] : true = fait, "no" = pas fait (dit explicitement), absent = pas rempli
function habitMark(dateStr, habitId){ const l = habitState.logs[dateStr]; return l ? l[habitId] : undefined; }
function isChecked(dateStr, habitId){ return habitMark(dateStr, habitId) === true; }
function isNo(dateStr, habitId){ return habitMark(dateStr, habitId) === "no"; }
function setChecked(dateStr, habitId, val){
    if (!habitState.logs[dateStr]) habitState.logs[dateStr] = {};
    if (val === true || val === "no") habitState.logs[dateStr][habitId] = val; else delete habitState.logs[dateStr][habitId];
    if (Object.keys(habitState.logs[dateStr]).length === 0) delete habitState.logs[dateStr];
    saveHabits();
}
function isSkipped(dateStr){ return !!(habitState.skipped && habitState.skipped[dateStr]); }
function setSkipped(dateStr, val){
    if (!habitState.skipped) habitState.skipped = {};
    if (val) habitState.skipped[dateStr] = true; else delete habitState.skipped[dateStr];
    saveHabits();
}
function dayCompletion(dateStr){
    if (isSkipped(dateStr)) return null;
    const habits = activeHabitsOn(dateStr);
    if (habits.length === 0) return null;
    const checked = habits.filter(h => isChecked(dateStr, h.id)).length;
    return { checked, total: habits.length, pct: Math.round(100*checked/habits.length) };
}
function habitStreak(habitId){
    let streak = 0, cursor = todayStr();
    const h = habitState.habits.find(x => x.id === habitId);
    if (!h) return 0;
    if (!isChecked(cursor, habitId)) cursor = addDays(cursor, -1);
    while (cursor >= h.createdAt) {
        if (isSkipped(cursor) && !isChecked(cursor, habitId)) { cursor = addDays(cursor, -1); continue; }
        if (isChecked(cursor, habitId)) { streak++; cursor = addDays(cursor, -1); } else break;
    }
    return streak;
}
function perfectDayStreak(){
    let streak = 0, cursor = todayStr();
    const c = dayCompletion(cursor);
    if (!c || c.pct < 100) cursor = addDays(cursor, -1);
    let guard = 0;
    while (guard++ < 3650) {
        if (isSkipped(cursor)) { cursor = addDays(cursor, -1); continue; }
        const d = dayCompletion(cursor);
        if (d && d.pct === 100) { streak++; cursor = addDays(cursor, -1); } else break;
    }
    return streak;
}
function avgRate(windowDays){
    let cursor = todayStr(), total = 0, sum = 0;
    for (let i = 0; i < windowDays; i++) {
        const d = dayCompletion(cursor);
        if (d) { sum += d.pct; total++; }
        cursor = addDays(cursor, -1);
    }
    return total ? Math.round(sum/total) : 0;
}

const WEEKDAYS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
const MONTHS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const CAT_CLASS = { "Académique":"cat-academique", "Santé":"cat-sante", "Discipline":"cat-discipline", "Autre":"cat-autre" };

function humanDate(dateStr){
    const d = parseDate(dateStr);
    const label = WEEKDAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
    if (dateStr === todayStr()) return { main:"Aujourd'hui", sub:label };
    if (dateStr === addDays(todayStr(),-1)) return { main:"Hier", sub:label };
    if (dateStr === addDays(todayStr(),1)) return { main:"Demain", sub:label };
    return { main:label, sub:"" };
}
function renderSkipBar(){
    const bar = document.getElementById("skipbar");
    if (isSkipped(currentDate)) {
        bar.innerHTML = '<div class="skip-on"><span><b>Jour ignoré</b> — il ne compte pas dans tes stats.</span><button type="button" class="btn-ghost" id="skipToggle">Réactiver ce jour</button></div>';
    } else {
        bar.innerHTML = '<button type="button" class="skip-link" id="skipToggle">Oublié de remplir ? Ignorer ce jour</button>';
    }
    document.getElementById("skipToggle").onclick = () => {
        const on = !isSkipped(currentDate);
        setSkipped(currentDate, on);
        renderHabitsModule();
        showToast(on ? "Jour ignoré" : "Jour réactivé");
    };
}
function renderDayNav(){
    renderSkipBar();
    const lbl = document.getElementById("day-label");
    const h = humanDate(currentDate);
    lbl.innerHTML = h.main + (h.sub ? `<span class="sub">${h.sub}</span>` : "");
    const nextBtn = document.getElementById("day-next");
    const disabled = currentDate >= todayStr();
    nextBtn.disabled = disabled;
    if (disabled) nextBtn.setAttribute("disabled",""); else nextBtn.removeAttribute("disabled");
}
function addHabit(){
    const nameInput = document.getElementById("habitInput");
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const category = document.getElementById("habitCategorySelect").value;
    habitState.habits.push({ id:uid(), name, category, createdAt: todayStr(), active:true });
    nameInput.value = "";
    saveHabits();
    renderHabitsModule();
    showToast("Habitude ajoutée");
}
function toggleHabitToday(habitId){
    setChecked(currentDate, habitId, !isChecked(currentDate, habitId));
    renderHabitsModule();
}
function toggleHabitNo(habitId){
    setChecked(currentDate, habitId, isNo(currentDate, habitId) ? null : "no");
    renderHabitsModule();
}

/* ---------- stats par habitude ---------- */
// jours où l'habitude compte : créée, jour non ignoré, jusqu'à aujourd'hui
function habitWindow(h, fromStr, toStr){
    let done = 0, no = 0, eligible = 0;
    for (let d = fromStr < h.createdAt ? h.createdAt : fromStr; d <= toStr; d = addDays(d, 1)) {
        const m = habitMark(d, h.id);
        if (isSkipped(d) || (d === todayStr() && !m)) continue; // aujourd'hui ne compte que s'il est rempli
        eligible++;
        if (m === true) done++; else if (m === "no") no++;
    }
    return { done, no, eligible, rate: eligible ? Math.round(100*done/eligible) : null };
}
function habitBestStreak(h){
    let best = 0, cur = 0;
    for (let d = h.createdAt, t = todayStr(); d <= t; d = addDays(d, 1)) {
        if (isChecked(d, h.id)) { cur++; if (cur > best) best = cur; }
        else if (isSkipped(d) || d === t) continue;
        else cur = 0;
    }
    return best;
}
function habitWeekdays(h){
    // taux lun → dim sur 12 semaines
    const out = [0,0,0,0,0,0,0].map(() => ({ done:0, eligible:0 }));
    const t = todayStr(), from = addDays(t, -83);
    for (let d = from < h.createdAt ? h.createdAt : from; d <= t; d = addDays(d, 1)) {
        if (isSkipped(d)) continue;
        if (d === t && !habitMark(d, h.id)) continue;
        const i = (parseDate(d).getDay() + 6) % 7;
        out[i].eligible++;
        if (isChecked(d, h.id)) out[i].done++;
    }
    return out.map(o => o.eligible ? Math.round(100*o.done/o.eligible) : null);
}
function habitWeeks(h, n){
    const t = todayStr(), mon = addDays(t, -((parseDate(t).getDay() + 6) % 7)), out = [];
    for (let w = n - 1; w >= 0; w--) {
        const start = addDays(mon, -7*w), end = addDays(start, 6) > t ? t : addDays(start, 6);
        out.push({ start, ...habitWindow(h, start, end), future: end < h.createdAt });
    }
    return out;
}
function habitDots(h){
    let html = "";
    for (let i = 6; i >= 0; i--) {
        const d = addDays(currentDate, -i), m = habitMark(d, h.id);
        const cls = d < h.createdAt ? "none" : isSkipped(d) ? "skip" : m === true ? "yes" : m === "no" ? "no" : "";
        const dt = parseDate(d);
        html += `<i class="hd ${cls}" title="${WEEKDAYS[dt.getDay()]} ${dt.getDate()} — ${cls === "yes" ? "fait" : cls === "no" ? "non" : cls === "skip" ? "ignoré" : "pas rempli"}"></i>`;
    }
    return `<span class="hdots" aria-hidden="true">${html}</span>`;
}

function openHabitStats(habitId){
    const h = habitState.habits.find(x => x.id === habitId);
    if (!h) return;
    const t = todayStr();
    const w30 = habitWindow(h, addDays(t, -29), t), all = habitWindow(h, h.createdAt, t);
    const weeks = habitWeeks(h, 12), wd = habitWeekdays(h);
    const WD = ["L","M","M","J","V","S","D"];
    const filled = wd.filter(v => v !== null);
    const worst = filled.length >= 3 ? wd.indexOf(Math.min(...filled)) : -1;
    const WDL = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];

    // calendrier 5 semaines
    const mon = addDays(t, -((parseDate(t).getDay() + 6) % 7) - 28);
    let cal = WD.map(x => `<span class="hc-h">${x}</span>`).join("");
    for (let i = 0; i < 35; i++) {
        const d = addDays(mon, i), m = habitMark(d, h.id), dt = parseDate(d);
        const cls = d > t || d < h.createdAt ? "out" : isSkipped(d) ? "skip" : m === true ? "yes" : m === "no" ? "no" : "";
        cal += `<span class="hc ${cls}${d === t ? " today" : ""}" title="${dt.getDate()} ${MONTHS[dt.getMonth()]}">${dt.getDate()}</span>`;
    }

    const bars = weeks.map(w => {
        const dt = parseDate(w.start);
        const v = w.future || w.rate === null ? null : w.rate;
        return `<div class="hw" title="Semaine du ${dt.getDate()} ${MONTHS[dt.getMonth()]} — ${v === null ? "—" : v + "% (" + w.done + "/" + w.eligible + ")"}">
            <div class="hw-bar" style="height:${v === null ? 0 : Math.max(v, 3)}%"></div></div>`;
    }).join("");
    const wbars = wd.map((v, i) => `<div class="hwd${i === worst ? " worst" : ""}"><div class="hwd-track"><div class="hwd-bar" style="width:${v || 0}%"></div></div><span>${WDL[i].slice(0,3)}.</span><b>${v === null ? "—" : v + "%"}</b></div>`).join("");

    document.getElementById("hs-title").textContent = h.name;
    document.getElementById("hs-body").innerHTML = `
        <div class="hs-meta"><span class="badge ${CAT_CLASS[h.category] || "cat-autre"}">${escapeHtml(h.category)}</span><span class="count">depuis le ${parseDate(h.createdAt).getDate()} ${MONTHS[parseDate(h.createdAt).getMonth()]}</span></div>
        <div class="stats hs-stats">
            <div class="stat"><strong>${w30.rate === null ? "—" : w30.rate + "%"}</strong><span>réussite 30 j</span></div>
            <div class="stat"><strong>${habitStreak(h.id)}</strong><span>série actuelle</span></div>
            <div class="stat"><strong>${habitBestStreak(h)}</strong><span>meilleure série</span></div>
        </div>
        <p class="hs-line"><b>${all.done}</b> fois fait · <b>${all.no}</b> fois non · <b>${Math.max(0, all.eligible - all.done - all.no)}</b> jours pas remplis</p>
        <h3 class="hs-h">12 dernières semaines</h3>
        <div class="hw-chart">${bars}</div>
        <div class="bars-caption"><span>il y a 12 sem.</span><span>cette semaine</span></div>
        <h3 class="hs-h">Par jour de la semaine</h3>
        <div class="hwd-list">${wbars}</div>
        ${worst >= 0 && filled.length ? `<p class="hint">Ton jour le plus faible : <b>${WDL[worst]}</b>.</p>` : ""}
        <h3 class="hs-h">5 dernières semaines</h3>
        <div class="hcal">${cal}</div>
        <div class="heat-legend hs-legend"><i class="hd yes"></i>fait <i class="hd no"></i>non <i class="hd"></i>pas rempli <i class="hd skip"></i>ignoré</div>`;
    document.getElementById("hs-overlay").hidden = false;
}
function closeHabitStats(){ document.getElementById("hs-overlay").hidden = true; }
document.addEventListener("keydown", e => { if (e.key === "Escape") closeHabitStats(); });
function renderHabitRanking(){
    const t = todayStr(), from = addDays(t, -29);
    const rows = habitState.habits.filter(h => h.active !== false)
        .map(h => ({ h, w: habitWindow(h, from, t) }))
        .sort((a, b) => (b.w.rate ?? -1) - (a.w.rate ?? -1));
    document.getElementById("habit-ranking").innerHTML = rows.length ? rows.map(({ h, w }) => `
        <button type="button" class="hr-row" onclick="openHabitStats('${h.id}')">
            <span class="hr-name">${escapeHtml(h.name)}</span>
            <span class="hr-track"><span class="hr-bar" style="width:${w.rate || 0}%"></span><span class="hr-no" style="width:${w.eligible ? Math.round(100*w.no/w.eligible) : 0}%"></span></span>
            <span class="hr-val">${w.rate === null ? "—" : w.rate + "%"}</span>
        </button>`).join("") : `<div class="hm-empty">Aucune habitude active.</div>`;
}
function togglePause(habitId){
    const h = habitState.habits.find(x => x.id === habitId);
    if (!h) return;
    h.active = h.active === false ? true : false;
    saveHabits();
    renderHabitsModule();
}
function renameHabit(habitId){
    const h = habitState.habits.find(x => x.id === habitId);
    if (!h) return;
    const nn = prompt("Renommer l'habitude :", h.name);
    if (nn && nn.trim()) { h.name = nn.trim(); saveHabits(); renderHabitsModule(); }
}
function deleteHabit(habitId){
    const h = habitState.habits.find(x => x.id === habitId);
    if (!h) return;
    if (confirm(`Supprimer "${h.name}" ? Son historique sera conservé mais elle disparaîtra des listes.`)) {
        habitState.habits = habitState.habits.filter(x => x.id !== habitId);
        saveHabits();
        renderHabitsModule();
    }
}
function setHabitFilter(cat){
    currentHabitFilter = cat;
    document.querySelectorAll('#habit-filters .filter').forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
    renderHabitList();
}
document.getElementById("habit-filters").addEventListener("click", e => {
    const btn = e.target.closest(".filter");
    if (btn) setHabitFilter(btn.dataset.cat);
});

function renderHabitList(){
    const container = document.getElementById("habit-list");
    let visible;
    if (currentHabitFilter === "paused") {
        visible = habitState.habits.filter(h => h.active === false);
    } else {
        visible = activeHabitsOn(currentDate);
        if (currentHabitFilter !== "all") visible = visible.filter(h => h.category === currentHabitFilter);
    }
    if (!visible.length) {
        container.innerHTML = `<div class="empty">${habitState.habits.length ? "Aucune habitude dans cette catégorie." : "Aucune habitude pour le moment.<br>Ajoute ta première habitude."}</div>`;
        return;
    }
    container.innerHTML = visible.map(h => {
        const live = currentHabitFilter !== "paused";
        const checked = live && isChecked(currentDate, h.id);
        const no = live && isNo(currentDate, h.id);
        const streak = habitStreak(h.id);
        const catBadge = `<span class="badge ${CAT_CLASS[h.category] || "cat-autre"}">${escapeHtml(h.category)}</span>`;
        const pausedBadge = h.active === false ? `<span class="badge paused">En pause</span>` : "";
        const streakBadge = streak > 0 ? `<span class="badge streak">${streak} j</span>` : "";
        const checkBtn = (h.active === false || isSkipped(currentDate))
            ? `<div class="yn"><div class="check" style="opacity:.3"></div></div>`
            : `<div class="yn"><button class="check" title="Fait" aria-label="Fait" aria-pressed="${checked}" onclick="toggleHabitToday('${h.id}')">${checked?"✓":""}</button><button class="check check-no" title="Pas fait" aria-label="Pas fait" aria-pressed="${no}" onclick="toggleHabitNo('${h.id}')">✕</button></div>`;
        return `
        <div class="task habit-row ${checked ? "checked" : ""} ${no ? "said-no" : ""} ${isSkipped(currentDate) ? "skipped" : ""}">
            ${checkBtn}
            <div>
                <button type="button" class="task-title habit-name" onclick="openHabitStats('${h.id}')" title="Voir les stats">${escapeHtml(h.name)}</button>
                <div class="meta">${catBadge}${pausedBadge}${streakBadge}${habitDots(h)}</div>
            </div>
            <div class="task-actions">
                <button class="icon-btn warn" title="${h.active === false ? 'Réactiver' : 'Mettre en pause'}" onclick="togglePause('${h.id}')">${h.active === false ? "▶" : "❚❚"}</button>
                <button class="icon-btn" title="Renommer" onclick="renameHabit('${h.id}')">✎</button>
                <button class="delete" title="Supprimer" onclick="deleteHabit('${h.id}')">×</button>
            </div>
        </div>`;
    }).join("");
}
function renderHabitStats(){
    const active = habitState.habits.filter(h => h.active !== false);
    document.getElementById("habitTotalCount").textContent = `${active.length} habitude${active.length > 1 ? "s" : ""}`;
    document.getElementById("stat-perfect-streak").textContent = perfectDayStreak();
    document.getElementById("stat-rate-7").textContent = avgRate(7) + "%";
    document.getElementById("stat-rate-30").textContent = avgRate(30) + "%";
    const comp = dayCompletion(currentDate);
    const pct = comp ? comp.pct : 0;
    document.getElementById("habitProgressText").textContent = pct + "%";
    document.getElementById("habitProgressBar").style.width = pct + "%";
}
function renderBars(){
    const bars = document.getElementById("bars30");
    bars.innerHTML = "";
    const days = [];
    for (let i = 29; i >= 0; i--) days.push(addDays(todayStr(), -i));
    days.forEach(ds => {
        const d = dayCompletion(ds);
        const pct = d ? d.pct : 0;
        const col = document.createElement("div");
        col.className = "bar-col";
        const dt = parseDate(ds);
        col.title = dt.getDate() + " " + MONTHS[dt.getMonth()] + " — " + (isSkipped(ds) ? "jour ignoré" : d ? pct + "% (" + d.checked + "/" + d.total + ")" : "pas de données");
        col.innerHTML = isSkipped(ds) ? `<div class="bar skip" style="height:100%"></div>` : `<div class="bar ${d && pct === 100 ? "perfect" : (d ? "on" : "")}" style="height:${Math.max(pct, d ? 4 : 2)}%"></div>`;
        bars.appendChild(col);
    });
    const dtStart = parseDate(days[0]), dtEnd = parseDate(days[days.length-1]);
    document.getElementById("bars-start").textContent = dtStart.getDate() + " " + MONTHS[dtStart.getMonth()];
    document.getElementById("bars-end").textContent = "Aujourd'hui";
}
function renderHeatmap(){
    const heat = document.getElementById("heatmap");
    heat.innerHTML = "";
    const end = parseDate(todayStr());
    const endDow = (end.getDay() + 6) % 7;
    const gridEnd = addDays(todayStr(), 6 - endDow);
    const totalDays = 13 * 7;
    let cursor = addDays(gridEnd, -(totalDays - 1));
    for (let w = 0; w < 13; w++) {
        const col = document.createElement("div");
        col.className = "heat-week";
        for (let dday = 0; dday < 7; dday++) {
            const cell = document.createElement("div");
            if (cursor > todayStr()) {
                cell.className = "heat-cell future";
            } else {
                const d = dayCompletion(cursor);
                const pct = d ? d.pct : 0;
                const bucket = !d ? "" : pct === 0 ? "" : pct < 50 ? "b25" : pct < 75 ? "b50" : pct < 100 ? "b75" : "b100";
                cell.className = "heat-cell " + (isSkipped(cursor) ? "skip" : bucket);
                const dt = parseDate(cursor);
                cell.title = dt.getDate() + " " + MONTHS[dt.getMonth()] + (isSkipped(cursor) ? " — ignoré" : d ? " — " + pct + "%" : " — pas de données");
            }
            col.appendChild(cell);
            cursor = addDays(cursor, 1);
        }
        heat.appendChild(col);
    }
}
function renderHabitsModule(){
    renderDayNav();
    renderHabitList();
    renderHabitStats();
    renderBars();
    renderHeatmap();
    renderHabitRanking();
}

document.getElementById("day-prev").addEventListener("click", () => { currentDate = addDays(currentDate, -1); renderHabitsModule(); });
document.getElementById("day-next").addEventListener("click", () => { if (currentDate >= todayStr()) return; currentDate = addDays(currentDate, 1); renderHabitsModule(); });
document.getElementById("day-label").addEventListener("click", () => { currentDate = todayStr(); renderHabitsModule(); });
document.getElementById("habitInput").addEventListener("keydown", e => { if (e.key === "Enter") addHabit(); });
document.getElementById("skipEmptyBtn").addEventListener("click", () => {
    const t = todayStr(), days = [];
    for (let i = 1; i <= 30; i++) {
        const ds = addDays(t, -i);
        if (isSkipped(ds) || activeHabitsOn(ds).length === 0) continue;
        const c = dayCompletion(ds);
        if (c && c.checked === 0) days.push(ds);
    }
    if (!days.length) { showToast("Aucun jour vide à ignorer"); return; }
    if (!confirm(days.length + " jour(s) sans aucune habitude cochée sur les 30 derniers jours (hors aujourd'hui) vont être ignorés. Tu pourras les réactiver un par un. Continuer ?")) return;
    days.forEach(ds => setSkipped(ds, true));
    renderHabitsModule();
    showToast(days.length + " jour(s) ignoré(s)");
});

/* ========================================================================
   MODULE : NOTES
   ======================================================================== */
const STORAGE_NOTES = "hashprojects_notes_v1";
function normalizeNotes(p){
    if (p && Array.isArray(p.pages) && p.pages.length) {
        const pages = p.pages.filter(x => x && typeof x.text === "string").map(x => ({ id: x.id || uid(), name: x.name || "Page", text: x.text, updatedAt: x.updatedAt || null }));
        if (pages.length) return { pages, active: pages.some(x => x.id === p.active) ? p.active : pages[0].id };
    }
    const first = { id: uid(), name: "Page 1", text: (p && typeof p.text === "string") ? p.text : "", updatedAt: (p && p.updatedAt) || null };
    return { pages: [first], active: first.id };
}
function loadNotes(){
    try { const raw = localStorage.getItem(STORAGE_NOTES); if (raw) return normalizeNotes(JSON.parse(raw)); } catch(e) {}
    return normalizeNotes(null);
}
let notesState = loadNotes();
let ntRenaming = null;
function saveNotes(){ try { localStorage.setItem(STORAGE_NOTES, JSON.stringify(notesState)); } catch(e) {} }
function activePage(){ return notesState.pages.find(p => p.id === notesState.active) || notesState.pages[0]; }
function renderNotesStats(){
    const pg = activePage();
    const text = pg.text || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.getElementById("notesWords").textContent = words;
    document.getElementById("notesChars").textContent = text.length;
    document.getElementById("notesSavedAt").textContent = pg.updatedAt
        ? new Date(pg.updatedAt).toLocaleString("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
        : "jamais";
}
function renderNoteTabs(){
    const box = document.getElementById("nt-tabs");
    box.innerHTML = notesState.pages.map(p => p.id === ntRenaming
        ? `<span class="nt-tab on"><input type="text" id="nt-renameInput" value="${escapeHtml(p.name)}" maxlength="40"></span>`
        : `<button type="button" class="nt-tab ${p.id === notesState.active ? "on" : ""}" role="tab" aria-selected="${p.id === notesState.active}" data-page="${p.id}" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>`
    ).join("") + `<button type="button" class="nt-plus" id="nt-add" title="Nouvelle page" aria-label="Nouvelle page">+</button>`;
    const n = notesState.pages.length;
    document.getElementById("nt-count").textContent = n + " page" + (n > 1 ? "s" : "");
    document.getElementById("nt-del").disabled = n <= 1;
    const ri = document.getElementById("nt-renameInput");
    if (ri) { ri.focus(); ri.select(); }
}
function renderNotesModule(){
    const area = document.getElementById("notesArea");
    const pg = activePage();
    if (area.value !== pg.text) area.value = pg.text;
    const ni = document.getElementById("nt-nameInput");
    if (document.activeElement !== ni) ni.value = pg.name;
    renderNoteTabs();
    renderNotesStats();
}
let notesSaveTimer;
function flushNotes(){
    if (!notesSaveTimer) return;
    clearTimeout(notesSaveTimer); notesSaveTimer = null;
    activePage().updatedAt = new Date().toISOString();
    saveNotes();
}
document.getElementById("notesArea").addEventListener("input", e => {
    const pg = activePage();
    pg.text = e.target.value;
    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(() => { notesSaveTimer = null; pg.updatedAt = new Date().toISOString(); saveNotes(); renderNotesStats(); }, 400);
});
function selectPage(id){ flushNotes(); notesState.active = id; saveNotes(); renderNotesModule(); }
function addPage(){
    flushNotes();
    let i = notesState.pages.length + 1;
    while (notesState.pages.some(p => p.name === "Page " + i)) i++;
    const p = { id: uid(), name: "Page " + i, text: "", updatedAt: null };
    notesState.pages.push(p); notesState.active = p.id; saveNotes(); renderNotesModule();
    document.getElementById("notesArea").focus();
}
function renamePage(id, name){
    const p = notesState.pages.find(x => x.id === id);
    if (p && name && name.trim()) { p.name = name.trim().slice(0, 40); saveNotes(); }
}
function deletePage(){
    if (notesState.pages.length <= 1) return;
    const p = activePage();
    if (p.text.trim() && !confirm(`Supprimer la page "${p.name}" et son contenu ?`)) return;
    clearTimeout(notesSaveTimer); notesSaveTimer = null;
    const idx = notesState.pages.indexOf(p);
    notesState.pages.splice(idx, 1);
    notesState.active = notesState.pages[Math.max(0, idx - 1)].id;
    saveNotes(); renderNotesModule(); showToast("Page supprimée");
}
const ntTabs = document.getElementById("nt-tabs");
ntTabs.addEventListener("click", e => {
    if (e.target.closest("#nt-add")) { addPage(); return; }
    const t = e.target.closest("[data-page]");
    if (t && t.dataset.page !== notesState.active) selectPage(t.dataset.page);
});
ntTabs.addEventListener("dblclick", e => {
    const t = e.target.closest("[data-page]"); if (!t) return;
    ntRenaming = t.dataset.page; renderNoteTabs();
});
function endRename(commit){
    const ri = document.getElementById("nt-renameInput");
    if (!ri || !ntRenaming) return;
    if (commit) renamePage(ntRenaming, ri.value);
    ntRenaming = null; renderNotesModule();
}
ntTabs.addEventListener("keydown", e => {
    if (e.target.id !== "nt-renameInput") return;
    if (e.key === "Enter") { e.preventDefault(); endRename(true); }
    if (e.key === "Escape") { e.preventDefault(); endRename(false); }
});
ntTabs.addEventListener("focusout", e => { if (e.target.id === "nt-renameInput") setTimeout(() => endRename(true), 0); });
document.getElementById("nt-nameInput").addEventListener("input", e => { renamePage(notesState.active, e.target.value); renderNoteTabs(); });
document.getElementById("nt-nameInput").addEventListener("blur", e => { e.target.value = activePage().name; });
document.getElementById("nt-del").addEventListener("click", deletePage);

/* ========================================================================
   NAVIGATION ENTRE MODULES
   ======================================================================== */
const MODULE_META = {
    home: { title:"module.home.title", label:"module.home" },
    tasks: { title:"module.tasks", label:"module.tasks" },
    habits: { title:"module.habits", label:"module.habits" },
    notes: { title:"module.notes", label:"module.notes" },
    sessions: { title:"module.sessions", label:"module.sessions" },
    carnet: { title:"module.carnet.title", label:"module.carnet" },
    focus: { title:"module.focus", label:"module.focus" }
};
function switchModule(name){
    if (typeof flushNotes === "function") flushNotes();
    document.getElementById("module-sessions").classList.remove("modal-only");
    document.getElementById("module-home").hidden = name !== "home";
    document.getElementById("module-tasks").hidden = name !== "tasks";
    document.getElementById("module-habits").hidden = name !== "habits";
    document.getElementById("module-notes").hidden = name !== "notes";
    document.getElementById("module-sessions").hidden = name !== "sessions";
    document.getElementById("module-focus").hidden = name !== "focus";
    document.getElementById("module-carnet").hidden = name !== "carnet";
    document.querySelectorAll(".module-btn").forEach(b => b.classList.toggle("active", b.dataset.module === name));
    document.getElementById("page-title").textContent = i18n.t(MODULE_META[name].title);
    document.getElementById("eyebrow").textContent = i18n.t("app.name") + " / " + i18n.t(MODULE_META[name].label);
    if (name === "habits") renderHabitsModule();
    if (name === "notes") renderNotesModule();
    if (name === "home" && window.renderHome) window.renderHome();
    window.scrollTo(0, 0);
}
document.querySelectorAll(".module-btn").forEach(b => b.addEventListener("click", () => switchModule(b.dataset.module)));

/* ========================================================================
   EXPORT / IMPORT GLOBAL
   ======================================================================== */
function exportData(){
    try {
        const plannerData = window.plannerExportState ? window.plannerExportState() : { sessions: [] };
        const focusData = window.focusExportState ? window.focusExportState() : null;
        const carnetData = window.carnetExportState ? window.carnetExportState() : null;
        const payload = { exportedAt: new Date().toISOString(), tasks, history, habits: habitState, notes: notesState, planner: plannerData, focus: focusData, carnet: carnetData };
        if (window.Android && typeof window.Android.saveFile === "function") {
            window.Android.saveFile(i18n.t("export.filename", { date: todayStr() }), JSON.stringify(payload, null, 2));
            return;
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = i18n.t("export.filename", { date: todayStr() });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch(e) {
        showToast("Export impossible dans cet affichage");
    }
}
document.getElementById("file-import").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            const okTasks = Array.isArray(parsed.tasks);
            const okHabits = parsed.habits && Array.isArray(parsed.habits.habits) && parsed.habits.logs;
            const okNotes = parsed.notes && (typeof parsed.notes.text === "string" || Array.isArray(parsed.notes.pages));
            const okPlanner = parsed.planner && Array.isArray(parsed.planner.sessions);
            const okFocus = parsed.focus && typeof parsed.focus === "object";
            const okCarnet = parsed.carnet && Array.isArray(parsed.carnet.subjects);
            if (!okTasks && !okHabits && !okNotes && !okPlanner && !okFocus && !okCarnet) throw new Error("format invalide");
            if (confirm("Remplacer toutes les données actuelles (tâches, habitudes, notes, séances, carnet et focus) par celles du fichier importé ?")) {
                if (okTasks) { tasks = parsed.tasks; history = Array.isArray(parsed.history) ? parsed.history : []; saveTasks(); }
                if (okHabits) { habitState = parsed.habits; saveHabits(); }
                if (okNotes) { notesState = normalizeNotes(parsed.notes); saveNotes(); }
                if (okPlanner && window.plannerImportState) window.plannerImportState(parsed.planner);
                if (okFocus && window.focusImportState) window.focusImportState(parsed.focus);
                if (okCarnet && window.carnetImportState) window.carnetImportState(parsed.carnet);
                renderTasksModule();
                renderHabitsModule();
                renderNotesModule();
                if (window.renderHome) window.renderHome();
                showToast("Import réussi");
            }
        } catch(err) {
            showToast("Fichier invalide");
        }
        e.target.value = "";
    };
    reader.readAsText(file);
});

/* ========================================================================
   INIT
   ======================================================================== */
document.getElementById("date").textContent =
    new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

renderTasksModule();

/* ========================================================================
   THÈME (auto / clair / sombre)
   ======================================================================== */
const STORAGE_THEME = "hashprojects_theme_v1";
const THEME_LABELS = { auto:"auto", light:"clair", dark:"sombre" };
function applyTheme(t){
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else { delete document.documentElement.dataset.theme; t = "auto"; }
    document.getElementById("themeBtn").textContent = "Thème : " + THEME_LABELS[t];
}
function cycleTheme(){
    let cur = "auto";
    try { cur = localStorage.getItem(STORAGE_THEME) || "auto"; } catch(e) {}
    const next = cur === "auto" ? "light" : cur === "light" ? "dark" : "auto";
    try { localStorage.setItem(STORAGE_THEME, next); } catch(e) {}
    applyTheme(next);
}
try { applyTheme(localStorage.getItem(STORAGE_THEME) || "auto"); } catch(e) { applyTheme("auto"); }
