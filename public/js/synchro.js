/* ============================================================================
   SYNCHRO CLOUD (Supabase) — une ligne par module, la version la plus récente gagne.
   Le localStorage reste la source locale (hors ligne OK) ; ce script le surveille.
   ============================================================================ */
(function(){
"use strict";
var SUPABASE_URL = "https://willpykmnhhjqxlqrcqp.supabase.co";
var SUPABASE_KEY = "sb_publishable_v4jgX7cbNTKyEQuZTxn-NQ_algjo3vw";
var TABLE = "hp_data";
var KEYS = ["hashprojects_tasks_v1","hashprojects_history_v1","hashprojects_habits_v1","hashprojects_notes_v1",
            "hashprojects_planner_v1","hashprojects_focus_v1","hashprojects_carnet_v1","hashprojects_prefs_v1","hashprojects_island_v1"];
var OPTIONAL = { "hashprojects_prefs_v1":1, "hashprojects_island_v1":1 };   // envoyés à part : un refus du serveur ne bloque pas les autres modules
var META = "hashprojects_sync_meta_v1";
var $ = function(id){ return document.getElementById(id); };
var toast = function(m){ if (window.showToast) window.showToast(m); };

var LS = window.localStorage;
var origSet = LS.setItem.bind(LS), origGet = LS.getItem.bind(LS);
var meta = {}; try { meta = JSON.parse(origGet(META) || "{}") || {}; } catch(e) {}
function saveMeta(){ try { origSet(META, JSON.stringify(meta)); } catch(e) {} }

var sb = null, user = null, applying = false, dirty = {}, pushTimer = null, busy = false, lastSync = null, errMsg = null;

/* ---- surveille les écritures locales ---- */
LS.setItem = function(k, v){
    origSet(k, v);
    if (applying || KEYS.indexOf(k) < 0) return;
    meta[k] = Date.now(); saveMeta();
    dirty[k] = true;
    if (user) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500); }
};

/* ---- applique une version distante en mémoire ---- */
function applyKey(k, raw){
    var d = JSON.parse(raw);
    origSet(k, raw);
    switch (k) {
        case "hashprojects_tasks_v1":   if (Array.isArray(d)) tasks = d; break;
        case "hashprojects_history_v1": if (Array.isArray(d)) history = d; break;
        case "hashprojects_habits_v1":  if (d && Array.isArray(d.habits)) habitState = d; break;
        case "hashprojects_notes_v1":   notesState = normalizeNotes(d); break;
        case "hashprojects_planner_v1": if (window.plannerImportState) window.plannerImportState(d); break;
        case "hashprojects_focus_v1":   if (window.focusImportState) window.focusImportState(d); break;
        case "hashprojects_carnet_v1":  if (window.carnetImportState) window.carnetImportState(d); break;
        case "hashprojects_prefs_v1":   if (window.prefsImport) window.prefsImport(d); break;
        case "hashprojects_island_v1":  if (window.islandImport) window.islandImport(d); break;
    }
}
function rerender(){
    try { renderTasksModule(); } catch(e) {}
    try { renderHabitsModule(); } catch(e) {}
    var ta = document.activeElement;
    if (!(ta && ta.closest && ta.closest("#module-notes"))) { try { renderNotesModule(); } catch(e) {} }
    try { if (window.renderHome) window.renderHome(); } catch(e) {}
}

/* ---- récupère le cloud ---- */
async function pull(){
    var r = await sb.from(TABLE).select("module,data,updated_at");
    if (r.error) throw r.error;
    var remote = {}; (r.data || []).forEach(function(row){ remote[row.module] = row; });
    var changed = false;
    applying = true;
    try {
        KEYS.forEach(function(k){
            var row = remote[k];
            if (row) {
                var rts = Date.parse(row.updated_at) || 0;
                if (rts > (meta[k] || 0) && !dirty[k]) {
                    try { applyKey(k, JSON.stringify(row.data)); meta[k] = rts; changed = true; } catch(e) { console.warn("sync apply", k, e); }
                }
            } else if (origGet(k) != null) {
                // jamais envoyé : on pousse la version locale
                if (!meta[k]) meta[k] = Date.now();
                dirty[k] = true;
            }
        });
    } finally { applying = false; }
    saveMeta();
    if (changed) rerender();
    return changed;
}

/* ---- envoie les modules modifiés ---- */
async function push(){
    if (!user) return;
    var ks = Object.keys(dirty); if (!ks.length) return;
    var rows = [];
    ks.forEach(function(k){
        var raw = origGet(k); if (raw == null) { delete dirty[k]; return; }
        try { rows.push({ user_id:user.id, module:k, data:JSON.parse(raw), updated_at:new Date(meta[k] || Date.now()).toISOString() }); }
        catch(e) { delete dirty[k]; }
    });
    if (!rows.length) return;
    ks.forEach(function(k){ delete dirty[k]; });
    var extra = rows.filter(function(x){ return OPTIONAL[x.module]; });
    rows = rows.filter(function(x){ return !OPTIONAL[x.module]; });
    if (extra.length) {
        try { var rx = await sb.from(TABLE).upsert(extra, { onConflict:"user_id,module" }); if (rx.error) console.warn("sync prefs", rx.error); }
        catch(e) { console.warn("sync prefs", e); }
    }
    if (!rows.length) { lastSync = Date.now(); return; }
    var r = await sb.from(TABLE).upsert(rows, { onConflict:"user_id,module" });
    if (r.error) { rows.forEach(function(x){ dirty[x.module] = true; }); throw r.error; }
    lastSync = Date.now();
}

async function syncNow(manual){
    if (!sb || !user || busy) return;
    if (!navigator.onLine) { errMsg = "Hors ligne"; renderUI(); return; }
    busy = true; errMsg = null; renderUI();
    try {
        var changed = await pull();
        await push();
        lastSync = Date.now();
        if (manual) toast(changed ? "Données mises à jour" : "Tout est synchronisé");
    } catch(e) {
        console.warn("sync", e); errMsg = "Erreur de synchro";
        if (manual) toast("Synchro impossible : " + (e.message || e));
    }
    busy = false; renderUI();
}

/* ---- interface ---- */
function ago(t){
    var s = Math.round((Date.now() - t)/1000);
    if (s < 60) return "à l'instant";
    if (s < 3600) return "il y a " + Math.floor(s/60) + " min";
    return "à " + new Date(t).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
}
function renderUI(){
    var dot = $("sync-dot"), lab = $("sync-label");
    dot.className = "sync-dot" + (!user ? "" : busy ? " busy" : errMsg ? " err" : " ok");
    if (!sb) lab.textContent = "Synchro indisponible (hors ligne ?)";
    else if (!user) lab.textContent = "Non connecté";
    else lab.textContent = (busy ? "Synchronisation…" : errMsg ? errMsg : lastSync ? "Synchronisé " + ago(lastSync) : "Connecté") + " · " + (user.email || "");
    $("sync-text").textContent = user
        ? "Tes données sont synchronisées entre tous les appareils connectés à ce compte, et restent utilisables hors ligne."
        : "Tes données sont stockées sur cet appareil. Connecte-toi pour les synchroniser entre ton PC, ton téléphone et l'app.";
    $("sync-login-btn").hidden = !!user;
    $("sync-now-btn").hidden = !user;
    $("sync-logout-btn").hidden = !user;
}
function openModal(){ $("sync-err").textContent = ""; $("sync-overlay").hidden = false; setTimeout(function(){ $("sync-email").focus(); }, 30); }
function closeModal(){ $("sync-overlay").hidden = true; }

async function auth(signup){
    var email = $("sync-email").value.trim(), pass = $("sync-pass").value, err = $("sync-err");
    if (!email || pass.length < 6) { err.textContent = "Email et mot de passe (6 caractères min.) requis."; return; }
    if (!sb) { err.textContent = "Connexion au service impossible (hors ligne ?)."; return; }
    err.textContent = "…";
    var r = signup ? await sb.auth.signUp({ email:email, password:pass }) : await sb.auth.signInWithPassword({ email:email, password:pass });
    if (r.error) {
        var m = r.error.message || "";
        err.textContent = /invalid login/i.test(m) ? "Email ou mot de passe incorrect."
            : /already registered/i.test(m) ? "Ce compte existe déjà : clique sur « Se connecter »."
            : /not confirmed/i.test(m) ? "Confirme d'abord ton email (lien reçu par mail)."
            : m;
        return;
    }
    if (signup && !r.data.session) { err.textContent = "Compte créé : clique sur le lien reçu par mail, puis connecte-toi."; return; }
    closeModal(); toast("Connecté");
}

$("sync-login-btn").addEventListener("click", openModal);
$("sync-close").addEventListener("click", closeModal);
$("sync-overlay").addEventListener("click", function(e){ if (e.target === this) closeModal(); });
$("sync-form").addEventListener("submit", function(e){ e.preventDefault(); auth(false); });
$("sync-signup").addEventListener("click", function(){ auth(true); });
$("sync-now-btn").addEventListener("click", function(){ syncNow(true); });
$("sync-logout-btn").addEventListener("click", async function(){
    if (!confirm("Se déconnecter ? Les données restent sur cet appareil mais ne seront plus synchronisées.")) return;
    try { await push(); } catch(e) {}
    await sb.auth.signOut();
});

/* ---- démarrage ---- */
if (window.supabase && SUPABASE_KEY.indexOf("COLLE") !== 0) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{ persistSession:true, autoRefreshToken:true } });
    sb.auth.onAuthStateChange(function(ev, session){
        var was = user && user.id;
        user = session ? session.user : null;
        renderUI();
        if (user && user.id !== was) setTimeout(function(){ syncNow(false); }, 0);
    });
    document.addEventListener("visibilitychange", function(){
        if (!user) return;
        if (document.visibilityState === "visible") syncNow(false);
        else { clearTimeout(pushTimer); push().catch(function(){}); }
    });
    window.addEventListener("online", function(){ syncNow(false); });
    setInterval(function(){ if (user && document.visibilityState === "visible") syncNow(false); else renderUI(); }, 30000);
}
renderUI();
window.hpSyncNow = function(){ return syncNow(true); };
})();
