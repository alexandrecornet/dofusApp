/* ================= Données de départ (modifiables !) ================= */

var CATS = {
  drop:   { label: "Drop",   emoji: "\u{1F9B7}",  rgb: "251,191,36" },
  donjon: { label: "Donjon", emoji: "\u{1F3F0}",  rgb: "251,113,133" },
  metier: { label: "Métier", emoji: "\u{1F33E}",  rgb: "163,230,53"  },
  autre:  { label: "Autre",  emoji: "\u2728",     rgb: "56,189,248" }
};
var CAT_IDS = ["drop", "donjon", "metier", "autre"];

var DEFAULT_TASKS = [
  { id: "d-drop-1", cat: "drop", label: "Droper {n} Dents de Smilomouth", nMin: 5, nMax: 10, est: 45, lvl: 130, enabled: true },
  { id: "d-drop-2", cat: "drop", label: "Droper {n} Laines de Boufton noir", nMin: 40, nMax: 100, est: 25, lvl: 40, enabled: true },
  { id: "d-drop-3", cat: "drop", label: "Droper {n} Ecorces de chiendent", nMin: 3, nMax: 5, est: 45, lvl: 130, enabled: true },
  { id: "d-drop-4", cat: "drop", label: "Droper {n} Artefact Pandawashu Eau", nMin: 10, nMax: 20, est: 45, lvl: 120, enabled: true },
  { id: "d-drop-5", cat: "drop", label: "Droper {n} Artefact Pandawashu Air", nMin: 10, nMax: 20, est: 45, lvl: 140, enabled: true },
  { id: "d-drop-6", cat: "drop", label: "Droper {n} Coquille de fantimonier", nMin: 10, nMax: 20, est: 45, lvl: 140, enabled: true },
  { id: "d-drop-7", cat: "drop", label: "Droper {n} Os de sramourai", nMin: 10, nMax: 20, est: 45, lvl: 130, enabled: true },
  { id: "d-drop-8", cat: "drop", label: "Droper {n} Pois de chachachovage", nMin: 10, nMax: 40, est: 45, lvl: 100, enabled: true },
  { id: "d-drop-9", cat: "drop", label: "Droper {n} Bourgeon de fourbasse", nMin: 10, nMax: 20, est: 45, lvl: 100, enabled: true },
  { id: "d-drop-10", cat: "drop", label: "Droper {n} Artefact Pandawashu Roc", nMin: 10, nMax: 20, est: 45, lvl: 140, enabled: true },
  { id: "d-drop-11", cat: "drop", label: "Droper {n} Cerveau de craqueleur poli", nMin: 20, nMax: 30, est: 45, lvl: 110, enabled: true },
  { id: "d-drop-12", cat: "drop", label: "Droper {n} Pierre Précieuse zoth", nMin: 20, nMax: 30, est: 45, lvl: 120, enabled: true },
  { id: "d-drop-13", cat: "drop", label: "Droper {n} Culotte à l'envers du Roissingue", nMin: 1, nMax: 3, est: 45, lvl: 140, enabled: true },
  { id: "d-drop-14", cat: "drop", label: "Droper {n} Echasse de molette", nMin: 10, nMax: 20, est: 45, lvl: 100, enabled: true },
  { id: "d-drop-15", cat: "drop", label: "Droper {n} Boomerang de Koalak Sanguin", nMin: 10, nMax: 20, est: 45, lvl: 120, enabled: true },
  { id: "d-donj-1", cat: "donjon", label: "Faire le Donjon des Bouftous", est: 40, lvl: 20, enabled: true },
  { id: "d-donj-2", cat: "donjon", label: "Faire le Donjon Tofu royal", est: 30, lvl: 120, enabled: true },
  { id: "d-donj-3", cat: "donjon", label: "Faire le Donjon Mantiscore", est: 35, lvl: 80, enabled: true },
  { id: "d-donj-4", cat: "donjon", label: "Faire le Donjon Ben Le Ripate", est: 45, lvl: 140, enabled: true },
  { id: "d-donj-5", cat: "donjon", label: "Faire le Donjon des Abraknydes", est: 45, lvl: 90, enabled: true },
  { id: "d-donj-6", cat: "donjon", label: "Faire le Donjon de Nelween", est: 45, lvl: 70, enabled: true },
  { id: "d-donj-7", cat: "donjon", label: "Faire le Donjon Draegnerys", est: 50, lvl: 70, enabled: true },
  { id: "d-donj-8", cat: "donjon", label: "Faire le Donjon Wa wabbit", est: 50, lvl: 60, enabled: true },
  { id: "d-donj-9", cat: "donjon", label: "Faire le Donjon Kharnozor", est: 55, lvl: 100, enabled: true },
  { id: "d-donj-10", cat: "donjon", label: "Faire le Donjon du Dragon Cochon", est: 60, lvl: 100, enabled: true },
  { id: "d-donj-11", cat: "donjon", label: "Faire le Donjon Tertre du Long sommeil", est: 100, lvl: 140, enabled: true },
  { id: "d-donj-12", cat: "donjon", label: "Faire le Donjon Fabrique de malléfisk", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-13", cat: "donjon", label: "Faire le Donjon corailleur magistral", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-14", cat: "donjon", label: "Faire le Donjon des forgerons", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-15", cat: "donjon", label: "Faire le Donjon Reyne gnée", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-16", cat: "donjon", label: "Faire le Donjon Chouque", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-17", cat: "donjon", label: "Faire le Donjon Moon", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-18", cat: "donjon", label: "Faire le Donjon Meulou", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-19", cat: "donjon", label: "Faire le Donjon Rasboul", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-20", cat: "donjon", label: "Faire le Donjon Crocabulia", est: 40, lvl: 110, enabled: true },
  { id: "d-donj-21", cat: "donjon", label: "Faire le donjon Haute truche", est: 40, lvl: 110, enabled: true },
  { id: "d-met-1", cat: "metier", label: "Farm {t} minutes de récolte en Bûcheron", tMin: 30, tMax: 90, est: 60, enabled: true },
  { id: "d-met-2", cat: "metier", label: "Farm {t} minutes de récolte en Paysan", tMin: 30, tMax: 90, est: 60, enabled: true },
  { id: "d-met-3", cat: "metier", label: "Farm {t} minutes de récolte en Alchimiste", tMin: 30, tMax: 90, est: 60, enabled: true },
  { id: "d-met-4", cat: "metier", label: "Farm {t} minutes de récolte en Mineur", tMin: 30, tMax: 90, est: 60, enabled: true },
  { id: "d-met-5", cat: "metier", label: "Pêcher pendant {t} minutes", tMin: 30, tMax: 90, est: 60, enabled: true },
  { id: "d-aut-4", cat: "autre", label: "Faire gagner {n} niveaux à Le métier de bijoutier", nMin: 2, nMax: 5, est: 45, enabled: true },
  { id: "d-aut-5", cat: "autre", label: "Faire gagner {n} niveaux à Le métier de tailleur", nMin: 2, nMax: 5, est: 45, enabled: true },
  { id: "d-aut-6", cat: "autre", label: "Faire gagner {n} niveaux à Le métier de cordonier", nMin: 2, nMax: 5, est: 45, enabled: true }
];
/* Captures d'archi : une quête par palier de 10, du niveau 10 au niveau 200 (200 XP × niveau) */
(function () {
  for (var L = 10; L <= 200; L += 10) {
    DEFAULT_TASKS.push({
      id: "d-archi-" + L, cat: "autre",
      label: "Capturer l'âme d'un archi monstre (niveau " + L + ")",
      est: 30, lvl: L, enabled: true
    });
  }
})();

/* ================= Système d'XP et titres ================= */

/* XP total nécessaire pour atteindre le niveau L.
   Chaque niveau coûte BASE + STEP × (niveau - 1) XP : ~1 quête au début,
   progression de plus en plus longue (grind façon Dofus).
   BASE = 12000, STEP = 80 → total ~4M XP pour le niveau 200. */
var XP_BASE = 12000;
var XP_STEP = 80;
function xpNeededForLevel(L) {
  if (L <= 1) return 0;
  var n = L - 1;
  return n * XP_BASE + XP_STEP * n * (n + 1) / 2;
}

function levelCost(L) { return XP_BASE + XP_STEP * (L - 1); }
var TITLES = [
  [1,   "Novice d'Incarnam"],
  [5,   "Aventurier d'Astrub"],
  [10,  "Explorateur d'Amakna"],
  [15,  "Éleveur de Bouftous"],
  [20,  "Champion des Plaines de Cania"],
  [25,  "Traqueur de Craqueleurs"],
  [30,  "Gardien de la Forêt Maléfique"],
  [35,  "Conquérant de Brakmar"],
  [40,  "Héros de Bonta"],
  [50,  "Seigneur du Sidimote"],
  [60,  "Voyageur d'Otomaï"],
  [70,  "Maître de Pandala"],
  [80,  "Dresseur de Dragodindes"],
  [100, "Explorateur de Frigost"],
  [120, "Chasseur de Dragons"],
  [150, "Maître du Monde des Douze"],
  [200, "Légende du Monde des Douze"]
];

/* Règles XP :
   "zone"  : 100 XP × niveau de la mission (drop, donjon)
   "archi" : 200 XP × niveau de la mission (captures d'archi)
   "p25"   : 20% du coût du prochain niveau du perso (métiers de récolte)
   "p15"   : 15% du niveau du perso (bijoutier, tailleur, cordonnier) */
function xpRuleFor(t) {
  if (t.xpRule) return t.xpRule;
  if (t.cat === "drop" || t.cat === "donjon") return "zone";
  if (t.cat === "metier") return "p25";
  var l = (t.label || "").toLowerCase();
  if (l.indexOf("archi") !== -1) return "archi";
  if (l.indexOf("bijoutier") !== -1 || l.indexOf("tailleur") !== -1 || l.indexOf("cordon") !== -1) return "p15";
  return "zone";
}
function computeXP(t) {
  var r = xpRuleFor(t);
  if (r === "p25") return Math.max(1, Math.round(levelCost(levelFromXP(totalXP())) * 0.2));
  if (r === "p15") return Math.max(1, Math.round(state.playerLvl * 0.15));
  if (r === "archi") return 200 * (t.lvl != null ? t.lvl : 100);
  return 100 * (t.lvl != null ? t.lvl : 100);
}
function totalXP() {
  return state.history.reduce(function (sum, e) { return sum + (e.ok && e.xp ? e.xp : 0); }, 0);
}
function levelFromXP(xp) {
  var L = 1;
  while (xpNeededForLevel(L + 1) <= xp) L++;
  return L;
}
function titleForLevel(L) {
  var title = TITLES[0][1];
  for (var i = 0; i < TITLES.length; i++) if (L >= TITLES[i][0]) title = TITLES[i][1];
  return title;
}
function nextTitleAt(L) {
  for (var i = 0; i < TITLES.length; i++) if (TITLES[i][0] > L) return TITLES[i];
  return null;
}

/* ================= Série de jours consécutifs ================= */

function dayKey(iso) {
  var d = new Date(iso);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function todayKey() { return dayKey(new Date().toISOString()); }
function prevDayKey(key) {
  var p = key.split("-");
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
/* Série courante et record, calculées depuis la toute première quête accomplie */
function streaks() {
  var days = {};
  var first = null;
  state.history.forEach(function (e) {
    if (!e.ok) return;
    var k = dayKey(e.at);
    days[k] = true;
    if (first === null || k < first) first = k;
  });
  if (first === null) return { current: 0, best: 0 };
  /* série courante : jours consécutifs se terminant aujourd'hui (ou hier) */
  var cur = 0;
  var k = todayKey();
  if (!days[k]) k = prevDayKey(k);
  while (days[k]) { cur++; k = prevDayKey(k); }
  /* record : plus longue série depuis le premier jour d'activité */
  var best = 0, run = 0;
  var d = first.split("-");
  var cursor = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
  var today = todayKey();
  while (true) {
    var key = cursor.getFullYear() + "-" + (cursor.getMonth() + 1) + "-" + cursor.getDate();
    if (days[key]) { run++; if (run > best) best = run; }
    else if (key !== today) run = 0;
    if (key === today) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return { current: cur, best: Math.max(best, cur) };
}

/* Bonus de série : +10% d'XP dès 7 jours d'affilée, +25% dès 30 jours */
function streakMult() {
  var s = streaks().current;
  if (s >= 30) return 1.25;
  if (s >= 7) return 1.10;
  return 1;
}

/* ================= Missions hebdo (XP ×2, tirées chaque lundi) ================= */

/* Identifiant du lundi de la semaine contenant la date donnée */
function mondayKey(dateIso) {
  var d = new Date(dateIso);
  var day = (d.getDay() + 6) % 7;       /* lundi = 0 */
  d.setDate(d.getDate() - day);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function currentWeekKey() { return mondayKey(new Date().toISOString()); }

/* Tire 3 missions au début de chaque semaine (une seule fois par semaine) */
function ensureWeekly() {
  var wk = null;
  var raw = storageGet(K_WEEKLY);
  if (raw) { try { wk = JSON.parse(raw); } catch (e) {} }
  var ck = currentWeekKey();
  if (!wk || wk.weekKey !== ck) {
    var pool = state.tasks.filter(function (t) { return t.enabled; });
    var copy = pool.slice();
    var picks = [];
    for (var i = 0; i < 3 && copy.length > 0; i++) {
      var idx = randInt(0, copy.length - 1);
      picks.push(copy[idx].id);
      copy.splice(idx, 1);
    }
    wk = { weekKey: ck, questIds: picks, doneIds: [] };
    storageSet(K_WEEKLY, JSON.stringify(wk));
  }
  return wk;
}

/* Valider une mission hebdo : XP ×2, comptée dans l'historique */
function completeWeekly(id) {
  var wk = state.weekly;
  var t = state.tasks.find(function (x) { return x.id === id; });
  if (!wk || !t || wk.doneIds.indexOf(id) !== -1) return;
  var xp = Math.round(computeXP(t) * 2);
  var before = levelFromXP(totalXP());
  state.history.unshift({
    id: uid(), text: "📅 " + sampleText(t), cat: t.cat,
    at: new Date().toISOString(), ok: true, xp: xp
  });
  state.history = state.history.slice(0, 200);
  wk.doneIds.push(id);
  storageSet(K_WEEKLY, JSON.stringify(wk));
  var after = levelFromXP(totalXP());
  if (after > before) state.lastLevelUp = after;
  persist();
  render();
}

