/* ============================================================================
   TRADUCTIONS — chargé en premier.
   i18n.t("clé", { var: valeur }) renvoie le texte dans la langue courante (fr par défaut),
   avec repli sur le français si la clé manque en anglais.
   Dans le HTML : data-i18n="clé" (texte), data-i18n-title / data-i18n-aria (attributs).
   Pour ajouter une langue : un nouveau bloc dans DICT, rien d'autre.
   ============================================================================ */
(function(){
"use strict";

var DICT = {
    fr: {
        "app.name": "Fonsai",
        "app.tagline": "Fonsai, rends le focus addictif.",
        "module.home": "Accueil",
        "module.home.title": "Aujourd'hui",
        "module.tasks": "Tâches",
        "module.habits": "Habitudes",
        "module.notes": "Notes",
        "module.sessions": "Séances",
        "module.carnet": "Carnet",
        "module.carnet.title": "Carnet de notes",
        "module.focus": "Focus",
        "header.theme": "Thème : {mode}",
        "header.customize": "Personnaliser",
        "export.filename": "fonsai-sauvegarde-{date}.json"
    },
    en: {
        "app.name": "Fonsai",
        "app.tagline": "Fonsai, make focus addictive.",
        "module.home": "Home",
        "module.home.title": "Today",
        "module.tasks": "Tasks",
        "module.habits": "Habits",
        "module.notes": "Notes",
        "module.sessions": "Sessions",
        "module.carnet": "Grades",
        "module.carnet.title": "Grade book",
        "module.focus": "Focus",
        "header.theme": "Theme: {mode}",
        "header.customize": "Customize",
        "export.filename": "fonsai-backup-{date}.json"
    }
};

// Langue : choix enregistré, sinon français (l'app n'est pas encore entièrement traduite).
var lang = "fr";
try { var saved = localStorage.getItem("fonsai_lang"); if (saved && DICT[saved]) lang = saved; } catch(e) {}

function t(key, vars){
    var s = (DICT[lang] && DICT[lang][key]) || DICT.fr[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function(m, k){ return k in vars ? vars[k] : m; });
    return s;
}

function applyI18n(root){
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function(el){ el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-title]").forEach(function(el){ el.title = t(el.dataset.i18nTitle); });
    root.querySelectorAll("[data-i18n-aria]").forEach(function(el){ el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}

function setLang(l){
    if (!DICT[l]) return;
    lang = l;
    try { localStorage.setItem("fonsai_lang", l); } catch(e) {}
    document.documentElement.lang = l;
    applyI18n();
}

window.i18n = { t: t, apply: applyI18n, setLang: setLang, lang: function(){ return lang; } };

document.documentElement.lang = lang;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ applyI18n(); });
else applyI18n();
})();
