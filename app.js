/* ================= Utilitaires ================= */

var K_TASKS = "dofus-quest-gen/tasks/v1";
var K_HISTORY = "dofus-quest-gen/history/v1";
var K_FILTERS = "dofus-quest-gen/filters/v1";
var K_RECENT = "dofus-quest-gen/recent/v1";
var K_DEFSIG = "dofus-quest-gen/defsig/v1";
var K_PLAYER = "dofus-quest-gen/player/v1";
var K_LVLFILTER = "dofus-quest-gen/lvlfilter/v1";
var K_WEEKLY = "dofus-quest-gen/weekly/v1";

function storageGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
function storageSet(key, value) { try { window.localStorage.setItem(key, value); } catch (e) {} }
function storageAvailable() {
  try { window.localStorage.setItem("__t", "1"); window.localStorage.removeItem("__t"); return true; } catch (e) { return false; }
}
function loadArr(key, fallback) {
  var raw = storageGet(key);
  if (raw) { try { var p = JSON.parse(raw); if (Array.isArray(p) && (key !== K_FILTERS || p.length)) return p; } catch (e) {} }
  return fallback;
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uid() { return "t-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36); }
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmtDate(iso) {
  var d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function fmtXP(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
function sampleText(t) {
  var x = t.label;
  if (x.indexOf("{n}") !== -1) x = x.split("{n}").join(String(t.nMin != null ? t.nMin : 1));
  if (x.indexOf("{t}") !== -1) x = x.split("{t}").join(String(t.tMin != null ? t.tMin : 30));
  return x;
}
function catBadge(c, withEmoji) {
  var meta = CATS[c] || CATS.autre;
  return '<span class="badge cat" style="--c:' + meta.rgb + '">' + (withEmoji ? meta.emoji + " " : "") + meta.label + "</span>";
}
/* Normalise un intitulé pour retrouver la quête d'origine depuis l'historique
   (les nombres tirés au hasard deviennent des #) */
function normLabel(s) {
  return String(s).replace(/\{n\}/g, "#").replace(/\{t\}/g, "#")
    .replace(/[0-9]+/g, "#").replace(/\s+/g, " ").toLowerCase().trim();
}

/* Empreinte de la liste de départ : change dès que tu modifies
   DEFAULT_TASKS dans le fichier. Sert à proposer la mise à jour. */
function defaultsSignature() {
  return DEFAULT_TASKS.map(function (t) { return t.id + "|" + t.label; }).join(";");
}

/* ================= État ================= */

var canStore = storageAvailable();
var savedCats = loadArr(K_FILTERS, CAT_IDS).filter(function (c) { return CAT_IDS.indexOf(c) !== -1; });
var savedTasks = loadArr(K_TASKS, null);
var curSig = defaultsSignature();
var savedSig = storageGet(K_DEFSIG);
var savedPlayer = parseInt(storageGet(K_PLAYER), 10);
var savedLvlFilter = storageGet(K_LVLFILTER);
var needsDefaultsChoice = !!(
  canStore &&
  savedTasks && savedTasks.length &&
  savedSig !== curSig
);

var state = {
  tab: "quete",
  tasks: (savedTasks && savedTasks.length) ? savedTasks : DEFAULT_TASKS,
  history: loadArr(K_HISTORY, []),
  activeCats: new Set(savedCats.length ? savedCats : CAT_IDS),
  playerLvl: isNaN(savedPlayer) ? 200 : savedPlayer,
  lvlFilter: savedLvlFilter === null ? true : savedLvlFilter === "1",
  quest: null,
  rolling: false,
  noPool: false,
  editingId: null,
  draft: null,
  jsonArea: "",
  jsonMsg: "",
  exportArea: "",
  exportMsg: "",
  defaultsChoice: needsDefaultsChoice
};

/* "Sac à mélanger" : ids des quêtes récemment tirées.
   Une quête dans ce sac ne peut plus être tirée tant que toutes les
   quêtes éligibles ne sont pas sorties au moins une fois. */
var recent = loadArr(K_RECENT, []);
var questSeq = 0;
var rollTimer = null;

function persist() {
  storageSet(K_TASKS, JSON.stringify(state.tasks));
  storageSet(K_HISTORY, JSON.stringify(state.history));
  storageSet(K_FILTERS, JSON.stringify(Array.from(state.activeCats)));
  storageSet(K_RECENT, JSON.stringify(recent));
  storageSet(K_PLAYER, String(state.playerLvl));
  storageSet(K_LVLFILTER, state.lvlFilter ? "1" : "0");
}
function acknowledgeDefaults() { storageSet(K_DEFSIG, defaultsSignature()); state.defaultsChoice = false; }

/* Récupère l'XP des quêtes déjà accomplies avant l'arrivée du système d'XP :
   on retrouve la quête d'origine dans la bibliothèque en comparant les
   intitulés normalisés (nombres ignorés), puis on applique les formules. */
function backfillHistoryXP() {
  var changed = false;
  var byNorm = {};
  state.tasks.forEach(function (t) { byNorm[normLabel(t.label)] = t; });
  state.history.forEach(function (e) {
    if (!e.ok || e.xp != null) return;
    var t = byNorm[normLabel(e.text)];
    if (t) {
      e.xp = computeXP(t);
    } else {
      /* quête introuvable (supprimée de la bibliothèque) : estimation par catégorie */
      if (e.cat === "metier") e.xp = Math.max(1, Math.round(levelCost(levelFromXP(totalXP())) * 0.2));
      else if (e.cat === "autre") e.xp = 200 * 100;
      else e.xp = 100 * 100;
    }
    changed = true;
  });
  if (changed) storageSet(K_HISTORY, JSON.stringify(state.history));
}

/* ================= Choix liste de départ ================= */

function adoptDefaults() {
  if (!confirm("Remplacer ta bibliothèque actuelle par la nouvelle liste de départ du fichier ?")) return;
  state.tasks = DEFAULT_TASKS.map(function (t) { return Object.assign({}, t); });
  recent = [];
  acknowledgeDefaults();
  persist();
  render();
}
function keepMyLibrary() {
  acknowledgeDefaults();
  render();
}

/* ================= Génération ================= */

function buildQuest(t) {
  var text = t.label, dur = t.est != null ? t.est : 30;
  if (text.indexOf("{n}") !== -1) {
    var a = t.nMin != null ? t.nMin : 1;
    var b = Math.max(t.nMax != null ? t.nMax : 10, a);
    text = text.split("{n}").join(String(randInt(a, b)));
  }
  if (text.indexOf("{t}") !== -1) {
    var top = t.tMax != null ? t.tMax : 60;
    var bot = t.tMin != null ? t.tMin : 30;
    bot = Math.min(bot, top);
    var tt = Math.max(5, Math.round(randInt(bot, top) / 5) * 5);
    text = text.split("{t}").join(String(tt));
    dur = tt;
  }
  questSeq++;
  return { id: questSeq, text: text, cat: t.cat, dur: dur, lvl: t.lvl, xp: computeXP(t) };
}

/* Choisit la quête finale SANS répéter celles déjà tirées récemment.
   Le sac se vide tout seul quand tout est passé, puis le cycle recommence. */
function pickQuest(pool) {
  var poolIds = {};
  pool.forEach(function (t) { poolIds[t.id] = true; });
  recent = recent.filter(function (id) { return poolIds[id]; });
  var candidates = pool.filter(function (t) { return recent.indexOf(t.id) === -1; });
  if (candidates.length === 0) {
    recent = [];               /* tout est sorti : on recommence un cycle */
    candidates = pool.slice();
  }
  var task = candidates[randInt(0, candidates.length - 1)];
  recent.push(task.id);
  if (recent.length > 50) recent.shift();
  persist();
  return task;
}

function roll() {
  var pool = state.tasks.filter(function (t) {
    if (!t.enabled || !state.activeCats.has(t.cat)) return false;
    if (state.lvlFilter && t.lvl != null && t.lvl > state.playerLvl) return false;
    return true;
  });
  if (pool.length === 0) { state.noPool = true; state.quest = null; render(); return; }
  var finalQuest = buildQuest(pickQuest(pool));
  state.noPool = false;
  state.rolling = true;
  var ticks = 0;
  if (rollTimer) clearInterval(rollTimer);
  rollTimer = setInterval(function () {
    ticks++;
    if (ticks < 12) {
      /* l'animation défile au hasard, mais le résultat final est déjà choisi */
      state.quest = buildQuest(pool[randInt(0, pool.length - 1)]);
    } else {
      clearInterval(rollTimer);
      rollTimer = null;
      state.quest = finalQuest;
      state.rolling = false;
    }
    render();
  }, 70);
}

function recordQuest(ok) {
  if (!state.quest) return;
  var before = levelFromXP(totalXP());
  var xp = ok ? Math.round(state.quest.xp * streakMult()) : null;
  state.history.unshift({
    id: uid(), text: state.quest.text, cat: state.quest.cat,
    at: new Date().toISOString(), ok: ok, xp: xp
  });
  state.history = state.history.slice(0, 200);
  if (ok) {
    state.quest = null;
    state.lastLevelUp = null;
    var after = levelFromXP(totalXP());
    if (after > before) state.lastLevelUp = after;
  }
  persist();
  render();
}

/* ================= Bibliothèque ================= */

function startNew() {
  state.editingId = "new";
  state.draft = { id: "new", cat: "drop", label: "", nMin: 10, nMax: 30, tMin: 30, tMax: 60, est: 30, lvl: null, xpRule: null, enabled: true };
  render();
  var inp = document.getElementById("draft-label");
  if (inp) inp.focus();
}
function startEdit(id) {
  var t = state.tasks.find(function (x) { return x.id === id; });
  if (!t) return;
  state.editingId = id;
  state.draft = Object.assign({}, t);
  render();
}
function cancelEdit() { state.editingId = null; state.draft = null; render(); }

/* Met à jour le brouillon SANS re-render (pour garder le focus des champs) */
function updDraft(field, value, isNum) {
  if (!state.draft) return;
  if (field === "xpRule") { state.draft.xpRule = value === "auto" ? null : value; return; }
  if (isNum) state.draft[field] = value === "" ? null : Number(value);
  else state.draft[field] = value;
}

function saveDraft() {
  var d = state.draft;
  if (!d) return;
  d.label = (d.label || "").trim();
  if (!d.label) { render(); return; }
  if (d.label.indexOf("{n}") !== -1) {
    if (d.nMin == null) d.nMin = 1;
    if (d.nMax == null) d.nMax = 10;
    d.nMax = Math.max(d.nMax, d.nMin);
  }
  if (d.label.indexOf("{t}") !== -1) {
    if (d.tMin == null) d.tMin = 30;
    if (d.tMax == null) d.tMax = 60;
    d.tMax = Math.max(d.tMax, d.tMin);
  }
  if (d.est == null || isNaN(d.est)) d.est = 30;
  if (d.id === "new") {
    d.id = uid();
    state.tasks = state.tasks.concat([d]);
  } else {
    state.tasks = state.tasks.map(function (t) { return t.id === d.id ? d : t; });
  }
  state.editingId = null;
  state.draft = null;
  persist();
  render();
}

function deleteTask(id) {
  var t = state.tasks.find(function (x) { return x.id === id; });
  if (!t || !confirm("Supprimer « " + sampleText(t) + " » ?")) return;
  state.tasks = state.tasks.filter(function (x) { return x.id !== id; });
  recent = recent.filter(function (x) { return x !== id; });
  if (state.editingId === id) { state.editingId = null; state.draft = null; }
  persist();
  render();
}

function toggleTask(id, v) {
  state.tasks = state.tasks.map(function (t) { return t.id === id ? Object.assign({}, t, { enabled: v }) : t; });
  persist();
  render();
}

function resetLibrary() {
  if (!confirm("Remplacer toute la bibliothèque par la liste de départ ?")) return;
  state.tasks = DEFAULT_TASKS.map(function (t) { return Object.assign({}, t); });
  state.editingId = null;
  state.draft = null;
  recent = [];
  acknowledgeDefaults();
  persist();
  render();
}

function expJson() { state.jsonArea = JSON.stringify(state.tasks, null, 2); state.jsonMsg = null; render(); }
function updJsonArea(v) { state.jsonArea = v; }
function impJson() {
  try {
    var parsed = JSON.parse(state.jsonArea);
    if (!Array.isArray(parsed)) throw new Error("not array");
    state.tasks = parsed
      .filter(function (t) { return t && typeof t.label === "string" && t.label.trim(); })
      .map(function (t) {
        return {
          id: typeof t.id === "string" ? t.id : uid(),
          cat: CAT_IDS.indexOf(t.cat) !== -1 ? t.cat : "autre",
          label: String(t.label),
          nMin: typeof t.nMin === "number" ? t.nMin : null,
          nMax: typeof t.nMax === "number" ? t.nMax : null,
          tMin: typeof t.tMin === "number" ? t.tMin : null,
          tMax: typeof t.tMax === "number" ? t.tMax : null,
          est: typeof t.est === "number" ? t.est : 30,
          lvl: typeof t.lvl === "number" ? t.lvl : null,
          xpRule: (t.xpRule === "zone" || t.xpRule === "archi" || t.xpRule === "p25" || t.xpRule === "p15") ? t.xpRule : null,
          enabled: t.enabled !== false
        };
      });
    recent = [];
    acknowledgeDefaults();
    persist();
    state.jsonMsg = "✅ Bibliothèque importée (" + state.tasks.length + " quêtes).";
  } catch (e) {
    state.jsonMsg = "❌ JSON invalide — vérifie le contenu.";
  }
  render();
}

function toggleCat(c) {
  var next = new Set(state.activeCats);
  if (next.has(c)) next.delete(c); else next.add(c);
  if (next.size === 0) next.add(c);
  state.activeCats = next;
  persist();
  render();
}
function setPlayerLvl(v) {
  var n = parseInt(v, 10);
  state.playerLvl = isNaN(n) ? 200 : Math.min(200, Math.max(1, n));
  persist();
  render();
}
function toggleLvlFilter(v) { state.lvlFilter = v; persist(); render(); }
function setTab(t) { state.tab = t; render(); }
function clearHistory() {
  if (!confirm("Effacer tout l'historique ? (Ton XP et ta série repartiront de zéro)")) return;
  state.history = [];
  persist();
  render();
}

/* ================= Export / Import de la sauvegarde complète ================= */

function buildSaveObject() {
  return {
    app: "QuêteRNG",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: state.tasks,
      history: state.history,
      activeCats: Array.from(state.activeCats),
      recent: recent,
      playerLvl: state.playerLvl,
      lvlFilter: state.lvlFilter,
      weekly: state.weekly
    }
  };
}
/* Sauvegarde complète : bibliothèque + XP + historique + série + hebdo */
function downloadSave() {
  var blob = new Blob([JSON.stringify(buildSaveObject(), null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "queterng-sauvegarde.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function applySave(obj) {
  var d = obj && obj.data;
  if (!d) throw new Error("bad format");
  if (Array.isArray(d.tasks)) state.tasks = d.tasks;
  if (Array.isArray(d.history)) state.history = d.history;
  if (Array.isArray(d.activeCats) && d.activeCats.length) {
    state.activeCats = new Set(d.activeCats.filter(function (c) { return CAT_IDS.indexOf(c) !== -1; }));
  }
  if (Array.isArray(d.recent)) recent = d.recent;
  if (typeof d.playerLvl === "number") state.playerLvl = Math.min(200, Math.max(1, d.playerLvl));
  state.lvlFilter = d.lvlFilter !== false;
  if (d.weekly && d.weekly.weekKey) { storageSet(K_WEEKLY, JSON.stringify(d.weekly)); state.weekly = d.weekly; }
  persist();
}
function importSaveFile(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      applySave(JSON.parse(reader.result));
      state.exportMsg = "✅ Sauvegarde restaurée avec succès !";
    } catch (e) {
      state.exportMsg = "❌ Fichier invalide — ce n'est pas une sauvegarde QuêteRNG.";
    }
    input.value = "";
    render();
  };
  reader.readAsText(file);
}
function importSaveText() {
  try {
    applySave(JSON.parse(state.exportArea));
    state.exportMsg = "✅ Sauvegarde restaurée avec succès !";
  } catch (e) {
    state.exportMsg = "❌ Contenu invalide — vérifie le JSON collé.";
  }
  render();
}
function fillExportArea() {
  state.exportArea = JSON.stringify(buildSaveObject());
  state.exportMsg = null;
  render();
}
function updExportArea(v) { state.exportArea = v; }

/* ================= Rendu ================= */

function renderProfileCard() {
  var xp = totalXP();
  var L = levelFromXP(xp);
  var title = titleForLevel(L);
  var base = xpNeededForLevel(L);
  var next = xpNeededForLevel(L + 1);
  var pct = Math.min(100, Math.round((xp - base) / (next - base) * 100));
  var s = streaks();
  var nextT = nextTitleAt(L);

  var h = '<div class="card" style="border-color:rgba(163,230,53,.35)">';
  h += '<div class="profile">';
  h += '<div class="center"><div class="lvl-num">' + L + '</div><div class="tiny">niveau</div></div>';
  h += '<div class="grow">';
  h += '<div class="title-name">' + esc(title) + '</div>';
  h += '<div class="xpbar"><div style="width:' + pct + '%"></div></div>';
  h += '<div class="tiny">' + fmtXP(xp - base) + " / " + fmtXP(next - base) + " XP — " + fmtXP(xp) + " XP au total</div>";
  if (nextT) h += '<div class="tiny">Prochain titre à l\'app niveau ' + nextT[0] + ' : ' + esc(nextT[1]) + '</div>';
  h += "</div>";
  h += '<div class="center"><div class="streak">🔥 ' + s.current + '</div><div class="tiny">jour' + (s.current > 1 ? "s" : "") + ' d\'affilée</div><div class="tiny">record : ' + s.best + '</div>';
  var mult = streakMult();
  if (mult > 1) h += '<div class="tiny" style="color:#fb923c;font-weight:700">+' + Math.round((mult - 1) * 100) + '% XP série</div>';
  h += "</div>";
  h += "</div></div>";
  return h;
}

/* Carte des missions hebdo : 3 quêtes tirées chaque lundi, XP ×2 */
function renderWeeklyCard() {
  var wk = state.weekly;
  if (!wk || !wk.questIds.length) return "";
  var h = '<div class="card" style="border-color:rgba(56,189,248,.35)">';
  h += '<div class="row between"><span class="label-xs" style="color:#38bdf8">📅 Missions hebdo (XP ×2)</span>';
  h += '<span class="tiny">' + wk.doneIds.length + "/" + wk.questIds.length + " terminée" + (wk.doneIds.length > 1 ? "s" : "") + "</span></div>";
  wk.questIds.forEach(function (qid) {
    var t = state.tasks.find(function (x) { return x.id === qid; });
    if (!t) return;
    var done = wk.doneIds.indexOf(qid) !== -1;
    h += '<div class="task-row ' + (done ? "off" : "") + '" style="padding:9px 0;border-bottom:1px solid #292524">';
    h += "<span>" + (done ? "✅" : "⏳") + "</span>";
    h += '<span class="txt">' + esc(sampleText(t));
    if (t.lvl != null) h += ' <span class="tiny">~ niv. ' + t.lvl + "</span>";
    h += "</span>";
    if (!done) {
      h += '<button class="btn btn-green sm" onclick="completeWeekly(\'' + t.id + '\')">✓ Fait !</button>';
    } else {
      h += '<span class="tiny" style="color:#a3e635;font-weight:700">+' + fmtXP(computeXP(t) * 2) + " XP</span>";
    }
    h += "</div>";
  });
  h += "</div>";
  return h;
}

function renderQuestPanel() {
  var h = "";
  h += renderProfileCard();

  h += '<div class="card"><div class="row between" style="flex-wrap:wrap;gap:12px">';
  h += '<div class="row"><span class="label-xs">Niveau de ton perso</span>';
  h += '<input type="number" min="1" max="200" class="field-90" value="' + state.playerLvl + '" onchange="setPlayerLvl(this.value)"></div>';
  h += '<div class="row"><span class="label-xs">Filtrer les missions trop hautes</span>';
  h += '<input type="checkbox" class="switch" ' + (state.lvlFilter ? "checked" : "") + ' onchange="toggleLvlFilter(this.checked)"></div>';
  h += "</div></div>";

  h += '<div class="card"><div class="label-xs">Catégories</div><div class="chips">';
  CAT_IDS.forEach(function (c) {
    h += '<button class="chip ' + (state.activeCats.has(c) ? "on" : "") + '" style="--c:' + CATS[c].rgb + '" onclick="toggleCat(\'' + c + '\')">' + CATS[c].emoji + " " + CATS[c].label + "</button>";
  });
  h += '</div></div>';

  h += '<div class="center" style="margin:16px 0">';
  h += '<button class="btn btn-primary btn-big" ' + (state.rolling ? "disabled" : "") + " onclick=\"roll()\">" +
       (state.rolling ? "🎲 Tirage en cours…" : state.quest ? "🎲 Relancer" : "🎲 Tirer une quête") + "</button></div>";

  if (state.lastLevelUp) {
    h += '<div class="card center" style="border-color:rgba(163,230,53,.6);background:#1a2e05cc">';
    h += '<div style="font-size:20px;font-weight:900;color:#a3e635">🎉 Niveau ' + state.lastLevelUp + ' atteint !</div>';
    h += '<div class="tiny" style="color:#d9f99d">Nouveau titre : ' + esc(titleForLevel(state.lastLevelUp)) + '</div>';
    h += "</div>";
    state.lastLevelUp = null;
  }

  if (state.noPool && !state.quest) {
    h += '<div class="card center muted">Aucune quête ne correspond à ces filtres. Active d\'autres catégories, monte le niveau de ton perso — ou ajoute des quêtes dans la bibliothèque.</div>';
  } else if (state.quest) {
    var q = state.quest;
    h += '<div class="card quest-card ' + (state.rolling ? "" : "final") + '">';
    h += '<div class="quest-meta">';
    h += catBadge(q.cat, true);
    if (q.lvl != null) h += '<span class="badge neutral">Niv. ~' + q.lvl + "</span>";
    h += '<span class="badge neutral">≈ ' + q.dur + " min</span>";
    h += '<span class="badge xp">+' + fmtXP(q.xp) + " XP</span>";
    h += "</div>";
    h += '<p class="quest-title ' + (state.rolling ? "dim" : "") + '">' + esc(q.text) + "</p>";
    if (!state.rolling) {
      h += '<div class="actions">';
      h += '<button class="btn btn-green" onclick="recordQuest(true)">✓ Terminée !</button>';
      h += '<button class="btn btn-outline" onclick="recordQuest(false)">Je passe…</button>';
      h += '<button class="btn btn-ghost" onclick="roll()">↻ Relancer</button>';
      h += "</div>";
    }
    h += "</div>";
  } else if (!state.rolling) {
    h += '<div class="card dashed quest-card"><div class="big">🎯</div>Appuie sur le bouton pour recevoir ta mission du jour.</div>';
  }
  /* Missions hebdo volontairement en bas : elles restent au second plan */
  h += renderWeeklyCard();
  return h;
}

function renderDraftForm() {
  var d = state.draft;
  if (!d) return "";
  var h = '<div class="card" style="border-color:rgba(251,191,36,.4);background:#1c1917cc">';
  h += '<div style="color:#fbbf24;font-weight:700">' + (state.editingId === "new" ? "➕ Nouvelle quête" : "✏️ Modifier la quête") + "</div>";
  h += '<div class="form-grid">';
  h += '<div class="span2"><label>Catégorie</label><select onchange="updDraft(\'cat\', this.value)">';
  CAT_IDS.forEach(function (c) {
    h += '<option value="' + c + '"' + (d.cat === c ? " selected" : "") + ">" + CATS[c].emoji + " " + CATS[c].label + "</option>";
  });
  h += "</select></div>";
  h += '<div class="span4"><label>Intitulé — tu peux utiliser {n} (quantité) et {t} (minutes)</label>' +
       '<input type="text" id="draft-label" placeholder="Ex. : Droper {n} Dents de Smilomouth" value="' + esc(d.label) + '" oninput="updDraft(\'label\', this.value)" style="width:100%"></div>';

  function num(label, field) {
    return "<div><label>" + label + "</label><input type=\"number\" value=\"" + (d[field] == null ? "" : d[field]) +
      "\" oninput=\"updDraft('" + field + "', this.value, true)\" style=\"width:100%\"></div>";
  }
  h += num("Niv. conseillé", "lvl");
  h += num("Durée estim. (min)", "est");
  h += num("{n} min", "nMin");
  h += num("{n} max", "nMax");
  h += num("{t} min", "tMin");
  h += num("{t} max", "tMax");
  h += '<div><label>Règle XP</label><select onchange="updDraft(\'xpRule\', this.value)">';
  [["auto", "Auto (selon catégorie)"], ["zone", "100 XP × niv. mission"], ["archi", "200 XP × niv. mission"], ["p25", "20% du prochain niveau"], ["p15", "15% du niv. du perso"]].forEach(function (o) {
    h += '<option value="' + o[0] + '"' + ((d.xpRule || "auto") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
  });
  h += "</select></div>";
  h += "</div>";

  h += '<div class="row" style="justify-content:flex-end;margin-top:14px">';
  h += '<button class="btn btn-ghost" onclick="cancelEdit()">Annuler</button>';
  h += '<button class="btn btn-primary" onclick="saveDraft()">Enregistrer</button>';
  h += "</div></div>";
  return h;
}

function renderLibrary() {
  var h = "";
  h += '<div class="card row between" style="flex-wrap:wrap">';
  h += '<span class="muted"><b style="color:#e7e5e4">' + state.tasks.length + "</b> quêtes possibles. C'est <i>ta</i> base : corrige ce que le RNG te propose mal, ajoute tes drops et donjons préférés.</span>";
  h += '<span class="row">';
  h += '<button class="btn btn-primary sm" onclick="startNew()">+ Ajouter</button>';
  h += '<button class="btn btn-outline sm" onclick="resetLibrary()">Réinitialiser</button>';
  h += "</span></div>";

  h += renderDraftForm();

  CAT_IDS.forEach(function (c) {
    var group = state.tasks.filter(function (t) { return t.cat === c; });
    if (!group.length) return;
    h += '<div class="grp-title">' + CATS[c].emoji + " " + CATS[c].label + " <span style='color:#57534e'>(" + group.length + ")</span></div>";
    group.forEach(function (t) {
      h += '<div class="card task-row ' + (t.enabled ? "" : "off") + '">';
      h += '<input type="checkbox" class="switch" ' + (t.enabled ? "checked" : "") + ' onchange="toggleTask(\'' + t.id + '\', this.checked)">';
      h += '<span class="txt">' + esc(sampleText(t));
      if (t.lvl != null) h += ' <span class="tiny">~ niv. ' + t.lvl + "</span>";
      h += "</span>";
      h += '<span class="dur">' + (t.label.indexOf("{t}") !== -1 ? (t.tMin != null ? t.tMin : 30) + "–" + (t.tMax != null ? t.tMax : 60) + " min" : t.est + " min") + ' · <span style="color:#a3e635;font-weight:700">+' + fmtXP(computeXP(t)) + " XP</span></span>";
      h += '<button class="btn btn-ghost sm" onclick="startEdit(\'' + t.id + '\')">' + (state.editingId === t.id ? "▲" : "✏️") + "</button>";
      h += '<button class="btn btn-ghost sm danger" onclick="deleteTask(\'' + t.id + '\')">🗑</button>';
      h += "</div>";
    });
  });

  h += '<div class="card" style="margin-top:18px">';
  h += '<div style="font-weight:700;margin-bottom:4px">💾 Sauvegarde manuelle (JSON)</div>';
  h += '<div class="tiny" style="margin-bottom:8px">Exporte ta bibliothèque pour la garder quelque part, ou colle un JSON et importe-le.</div>';
  h += '<textarea rows="5" placeholder="Colle ici un JSON de bibliothèque…" oninput="updJsonArea(this.value)">' + esc(state.jsonArea) + "</textarea>";
  h += '<div class="row" style="margin-top:8px">';
  h += '<button class="btn btn-outline sm" onclick="expJson()">Exporter</button>';
  h += '<button class="btn btn-primary sm" onclick="impJson()">Importer</button>';
  if (state.jsonMsg) h += '<span class="tiny">' + state.jsonMsg + "</span>";
  h += "</div></div>";
  return h;
}

function renderHistory() {
  var xp = totalXP();
  var L = levelFromXP(xp);
  var done = state.history.filter(function (x) { return x.ok; });
  var h = "";
  h += renderProfileCard();
  h += '<div class="card"><div class="row between"><span class="muted">Quêtes terminées</span>';
  h += '<span style="font-size:28px;font-weight:900;color:#fbbf24">' + done.length + "</span></div><div style='margin-top:10px'>";
  var maxC = 1;
  var counts = CAT_IDS.map(function (c) {
    var n = done.filter(function (x) { return x.cat === c; }).length;
    if (n > maxC) maxC = n;
    return { cat: c, count: n };
  });
  counts.forEach(function (b) {
    h += '<div class="bar-row"><span class="catlab">' + CATS[b.cat].emoji + " " + CATS[b.cat].label + "</span>";
    h += '<div class="bar"><div style="width:' + (b.count / maxC) * 100 + '%"></div></div>';
    h += '<span class="num">' + b.count + "</span></div>";
  });
  h += "</div></div>";

  h += '<div class="row between" style="margin:4px 0 8px"><span class="label-xs">Dernières quêtes</span>';
  if (state.history.length) h += '<button class="btn btn-ghost sm danger" onclick="clearHistory()">Tout effacer</button>';
  h += "</div>";

  if (!state.history.length) {
    h += '<div class="card dashed">Rien pour l\'instant. Tire une quête et reviens !</div>';
  } else {
    state.history.forEach(function (e) {
      h += '<div class="card history-row">';
      h += '<span style="font-size:17px">' + (e.ok ? "✅" : "⏭️") + "</span>";
      h += catBadge(e.cat, false);
      h += '<span class="txt">' + esc(e.text) + "</span>";
      if (e.ok && e.xp) h += '<span class="xpval">+' + fmtXP(e.xp) + " XP</span>";
      h += '<span class="date">' + fmtDate(e.at) + "</span>";
      h += "</div>";
    });
  }
  return h;
}

function renderExport() {
  var xp = totalXP();
  var L = levelFromXP(xp);
  var s = streaks();
  var h = "";
  h += '<div class="card">';
  h += '<div style="font-weight:700;margin-bottom:10px">💾 Sauvegarde complète</div>';
  h += '<div class="tiny" style="margin-bottom:10px">Tout ton profil dans un seul fichier : bibliothèque (' + state.tasks.length + ' quêtes), niveau d\'app ' + L + ' (' + fmtXP(xp) + ' XP), série 🔥 ' + s.current + ', historique (' + state.history.length + ' entrées) et missions hebdo. Pratique pour changer de navigateur, de PC, ou juste par sécurité.</div>';
  h += '<div class="row" style="flex-wrap:wrap">';
  h += '<button class="btn btn-primary" onclick="downloadSave()">⬇️ Télécharger ma sauvegarde</button>';
  h += '<button class="btn btn-outline" onclick="fillExportArea()">📋 Afficher en copier-coller</button>';
  h += "</div>";
  if (state.exportArea) {
    h += '<textarea rows="6" style="margin-top:12px" oninput="updExportArea(this.value)">' + esc(state.exportArea) + "</textarea>";
  }
  h += '<div class="sep"></div>';
  h += '<div style="font-weight:700;margin-bottom:6px">♻️ Restaurer une sauvegarde</div>';
  h += '<div class="tiny" style="margin-bottom:10px">Charge un fichier de sauvegarde QuêteRNG. ⚠️ Remplace tout le profil actuel.</div>';
  h += '<label class="btn btn-outline" style="display:inline-block;cursor:pointer">📂 Choisir un fichier…<input type="file" accept="application/json,.json" style="display:none" onchange="importSaveFile(this)"></label>';
  if (state.exportArea || state.exportMsg) {
    h += '<div class="row" style="margin-top:12px;flex-wrap:wrap">';
    h += '<button class="btn btn-primary sm" onclick="importSaveText()">Importer le contenu ci-dessus</button>';
    if (state.exportMsg) h += '<span class="tiny">' + state.exportMsg + "</span>";
    h += "</div>";
  }
  h += "</div>";
  return h;
}

function render() {
  state.weekly = ensureWeekly();
  var app = document.getElementById("app");
  var h = '<div class="wrap">';
  h += "<h1><span class=\"amber\">🎲 Quête</span>RNG</h1>";
  h += '<p class="subtitle">Ton générateur de quêtes Dofus — tire une mission au hasard.<br><span class="small">La bibliothèque est la tienne : corrige, ajoute, supprime.</span></p>';
  if (!canStore) {
    h += '<div class="warn">⚠️ La sauvegarde automatique n\'est pas disponible ici. Utilise <b>Exporter / Importer</b> dans la bibliothèque.</div>';
  }
  h += '<div class="tabs">';
  [["quete", "🎲 Quête"], ["biblio", "📚 Bibliothèque"], ["histoire", "📜 Historique"], ["export", "💾 Export"]].forEach(function (t) {
    h += '<button class="tab ' + (state.tab === t[0] ? "active" : "") + '" onclick="setTab(\'' + t[0] + '\')">' + t[1] + "</button>";
  });
  h += "</div>";

  if (state.defaultsChoice) {
    h += '<div class="card" style="border-color:rgba(251,191,36,.5);background:#2a1f0ecc">';
    h += '<div style="font-weight:700;color:#fbbf24;margin-bottom:6px">📋 La liste de départ du fichier a changé</div>';
    h += '<div class="tiny" style="margin-bottom:10px">Ta bibliothèque sauvegardée date d\'avant cette modification. Choisis quoi en faire :</div>';
    h += '<div class="row">';
    h += '<button class="btn btn-primary sm" onclick="adoptDefaults()">Adopter la nouvelle liste</button>';
    h += '<button class="btn btn-outline sm" onclick="keepMyLibrary()">Garder ma bibliothèque</button>';
    h += "</div></div>";
  }

  if (state.tab === "quete") h += renderQuestPanel();
  else if (state.tab === "biblio") h += renderLibrary();
  else if (state.tab === "export") h += renderExport();
  else h += renderHistory();

  h += '<footer>Fait pour Alexandre — le contenu Dofus est modifiable, c\'est toi l\'expert du Monde des Douze 🌍</footer>';
  h += "</div>";
  app.innerHTML = h;
}

/* Première utilisation : on mémorise l'empreinte de la liste de départ */
if (canStore && (!savedTasks || !savedTasks.length)) {
  storageSet(K_DEFSIG, curSig);
  persist();
}

/* Récupération de l'XP des anciennes quêtes accomplies */
backfillHistoryXP();

render();