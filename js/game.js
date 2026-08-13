// ============================================================
// OYUN MANTIĞI — DAVRANIŞ KATMANI
// Veri: cases.js (CASES). Bu dosya arayüzü ve akışı yönetir.
//
// Akış: Lobi (mod + dosya seçimi) → Oyun (sırayla açılan kartlar)
//   brief           Vaka Dosyası (özet + görev)
//   scene           Olay Yeri (kroki + kanıtlar)
//   csi             Kriminal Rapor
//   autopsy         Otopsi Raporu (şema + toksikoloji)
//   interrogation   Şüpheli Sorguları (tutanak + işaretleme)
//   verdict         Karar Dosyan (mühürleme)
// ============================================================

const MODES = [
  {
    id: "classic",
    name: "Klasik Soruşturma",
    desc: "Tüm raporlar açık: olay yeri, kriminal, otopsi ve sorgular. Klasik deneyim.",
    tag: "9 kart · tüm raporlar",
    cards: ["brief", "scene", "csi", "autopsy", "interrogation", "timeline", "quiz", "elimination", "verdict"]
  },
  {
    id: "interrogation",
    name: "Sorgu Odası",
    desc: "Adli raporlar dosyaya girmedi; yalnız vaka özeti, tutanaklar ve sezgilerin var.",
    tag: "6 kart · raporsuz",
    cards: ["brief", "interrogation", "timeline", "quiz", "elimination", "verdict"]
  },
  {
    id: "blind",
    name: "Karanlık Dosya",
    desc: "Sorgu yok, kriminal yok: yalnız olay yeri ve otopsiyle katili çıkar. Zorlu mod.",
    tag: "7 kart · sorgusuz",
    cards: ["brief", "scene", "autopsy", "timeline", "quiz", "elimination", "verdict"]
  },
  {
    id: "hard",
    name: "Zor Ekip (Bölünmüş)",
    desc: "Sert bölme: her dedektif yalnız kendi uzmanlık kartını görür. Bulgular 'yankı' ile diğerlerine akar; konuşmadan çözülmez.",
    tag: "9 kart · sert bölme + yankı",
    split: true,
    cards: ["brief", "scene", "csi", "autopsy", "interrogation", "timeline", "quiz", "elimination", "verdict"]
  }
];

const CARDS = {
  brief: { title: "Vaka Dosyası", short: "Dosya" },
  scene: { title: "Olay Yeri", short: "Olay Yeri" },
  csi: { title: "Kriminal Rapor", short: "Kriminal" },
  autopsy: { title: "Otopsi Raporu", short: "Otopsi" },
  interrogation: { title: "Şüpheli Sorguları", short: "Sorgular" },
  timeline: { title: "Zaman Çizelgesi", short: "Zaman" },
  quiz: { title: "Çapraz Analiz", short: "Analiz" },
  elimination: { title: "Eleme Masası", short: "Eleme" },
  verdict: { title: "Karar Dosyan", short: "Karar" }
};

const ROLES = ["Olay Yeri", "Kriminal", "Adli Tıp", "Sorgu"];

// Kart -> uzmanlık eşlemesi; eşlemesi olmayan kartlar (brief, timeline, quiz,
// elimination, verdict) her dedektife açıktır.
const ROLE_CARD = { scene: "Olay Yeri", csi: "Kriminal", autopsy: "Adli Tıp", interrogation: "Sorgu" };

// Vaka sırasına göre rol dönüşü: 2. vakada roller bir kayar.
function caseShift() {
  const idx = caseIndexById(state.caseId);
  return idx > 0 ? idx % ROLES.length : 0;
}

// i. oyuncunun uzmanlıkları: roller dağıtılarak paylaştırılır, 4. oyuncudan
// sonrası "serbest"tir (tüm kartları görür).
function rolesOf(i, n) {
  if (!n || n <= 1) return ROLES.slice();
  if (i >= ROLES.length) return ROLES.slice();
  const shift = caseShift();
  const rotated = ROLES.slice(shift).concat(ROLES.slice(0, shift));
  const out = [];
  for (let j = 0; j < rotated.length; j++) {
    if (j % n === i) out.push(rotated[j]);
  }
  return out.length ? out : [rotated[i % rotated.length]];
}

// Rol filtresi: çevrimiçi ekip oyununda ya da bölünmüş (Zor) modda etkin.
function roleFilterActive() {
  return state.teamCount > 1 && (!!state.net || !!activeMode().split);
}

function visibleCards() {
  const cards = activeMode().cards;
  if (!roleFilterActive()) return cards;
  const roles = rolesOf(state.mySlot, state.teamCount);
  return cards.filter(function (k) {
    const r = ROLE_CARD[k];
    return !r || roles.indexOf(r) !== -1;
  });
}

const state = {
  view: "lobby",
  modeId: "classic",
  caseId: null,
  cardIndex: 0,
  unlocked: 1,
  marked: [],
  markedBy: {},
  players: [],
  teamCount: 1,
  activePlayer: 0,
  teamConfirm: [],
  traitor: null,
  echoes: [],
  activeSuspect: null,
  resolved: false,
  resultNode: null,
  drawerOpen: false,
  net: null,
  timeline: null,
  timelineScore: null,
  timelineCorrect: 0,
  quizAnswers: {},
  quizLocked: false,
  quizScore: null,
  quizCorrect: 0,
  elimSolved: {},
  elimOrders: null,
  elimDrafts: {},
  elimDone: false,
  scenePicks: {},
  sceneSealed: false,
  sceneScore: null,
  labSolved: {},
  labFirstTry: {},
  labTried: {},
  labMissed: {},
  labOrders: null,
  labDone: false,
  labScore: null,
  confrontAnswers: {},
  confrontDone: false,
  freeQA: {},
  freeMiss: null
};

const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ================= Ses (WebAudio sentezi — dosya gerektirmez) =================
const SOUND_KEY = "elagency-sound";
const sound = {
  ctx: null,
  enabled: (function () {
    try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; }
  })(),
  ensure: function () {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  tone: function (freq, dur, type, gain, when) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise: function (dur, freq, gain, when) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq || 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t);
  },
  click: function () { this.noise(0.05, 2400, 0.05); },
  paper: function () { this.noise(0.2, 950, 0.06); },
  good: function () { this.tone(660, 0.12, "triangle", 0.06); this.tone(880, 0.18, "triangle", 0.06, 0.09); },
  bad: function () { this.tone(170, 0.22, "sawtooth", 0.045); },
  stamp: function () { this.tone(85, 0.2, "sine", 0.16); this.noise(0.12, 320, 0.12); },
  toggle: function () {
    this.enabled = !this.enabled;
    try { localStorage.setItem(SOUND_KEY, this.enabled ? "1" : "0"); } catch (e) {}
    if (this.enabled) this.click();
  }
};

const el = {
  progressBar: document.getElementById("progress-bar"),
  tagline: document.querySelector(".tagline"),
  rankName: document.getElementById("rank-name"),
  rankScore: document.getElementById("rank-score"),
  statSolved: document.getElementById("stat-solved"),
  viewLobby: document.getElementById("view-lobby"),
  viewGame: document.getElementById("view-game"),
  teamSetup: document.getElementById("team-setup"),
  teamBar: document.getElementById("team-bar"),
  modeGrid: document.getElementById("mode-grid"),
  caseGrid: document.getElementById("case-grid"),
  careerSummary: document.getElementById("career-summary"),
  backBtn: document.getElementById("back-btn"),
  gameCaseNo: document.getElementById("game-case-no"),
  gameCaseTitle: document.getElementById("game-case-title"),
  gameModeChip: document.getElementById("game-mode-chip"),
  drawerBtn: document.getElementById("drawer-btn"),
  noteCount: document.getElementById("note-count"),
  cardTabs: document.getElementById("card-tabs"),
  cardArea: document.getElementById("card-area"),
  prevCard: document.getElementById("prev-card"),
  nextCard: document.getElementById("next-card"),
  cardPos: document.getElementById("card-pos"),
  drawer: document.getElementById("drawer"),
  drawerBackdrop: document.getElementById("drawer-backdrop"),
  drawerClose: document.getElementById("drawer-close"),
  drawerBody: document.querySelector(".drawer__body"),
  drawerList: document.getElementById("drawer-list"),
  drawerEmpty: document.getElementById("drawer-empty"),
  chatPanel: document.getElementById("chat-panel"),
  chatList: document.getElementById("chat-list"),
  chatText: document.getElementById("chat-text"),
  chatSend: document.getElementById("chat-send"),
  drawerNotes: null,
  confirmOverlay: document.getElementById("confirm-overlay"),
  confirmTitle: document.getElementById("confirm-title"),
  confirmBody: document.getElementById("confirm-body"),
  confirmYes: document.getElementById("confirm-yes"),
  confirmNo: document.getElementById("confirm-no"),
  resetBtn: document.getElementById("reset-progress")
};

function h(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function modeById(id) {
  for (let i = 0; i < MODES.length; i++) {
    if (MODES[i].id === id) return MODES[i];
  }
  return MODES[0];
}

function activeMode() {
  return modeById(state.modeId);
}

function currentCase() {
  if (state.caseId == null) return null;
  for (let i = 0; i < CASES.length; i++) {
    if (CASES[i].id === state.caseId) return CASES[i];
  }
  return null;
}

function caseIndexById(id) {
  for (let i = 0; i < CASES.length; i++) {
    if (CASES[i].id === id) return i;
  }
  return -1;
}

// ================= Kalıcı ilerleme (localStorage) =================

const STORAGE_KEY = "elagency-progress";

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data && data.cases ? data : { cases: {} };
  } catch (err) {
    return { cases: {} };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    // depolama yoksa sessiz geç
  }
}

// ================= Dosya kaydı (yarım kalan vakayı sürdür) =================

const SAVE_KEY = "elagency-save";

function saveCaseState() {
  if (state.caseId == null || state.resolved || state.net) return;
  const cards = visibleCards();
  const data = {
    caseId: state.caseId,
    modeId: state.modeId,
    cardKey: cards[state.cardIndex] || null,
    unlocked: state.unlocked,
    marked: state.marked,
    markedBy: state.markedBy,
    activeSuspect: state.activeSuspect,
    teamCount: state.teamCount,
    teamNames: state.teamNames,
    timeline: state.timeline,
    timelineScore: state.timelineScore,
    timelineCorrect: state.timelineCorrect,
    quizAnswers: state.quizAnswers,
    quizLocked: state.quizLocked,
    quizScore: state.quizScore,
    quizCorrect: state.quizCorrect,
    elimSolved: state.elimSolved,
    elimOrders: state.elimOrders,
    elimDrafts: state.elimDrafts,
    elimDone: state.elimDone,
    scenePicks: state.scenePicks,
    sceneSealed: state.sceneSealed,
    sceneScore: state.sceneScore,
    confrontAnswers: state.confrontAnswers,
    confrontDone: state.confrontDone,
    freeQA: state.freeQA,
    at: Date.now()
  };
  try {
    const saves = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    saves[state.caseId] = data;
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  } catch (err) {}
}

function loadCaseSave(caseId) {
  try {
    const saves = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    const s = saves[caseId];
    return s && s.caseId === caseId ? s : null;
  } catch (err) {
    return null;
  }
}

function clearCaseSave(caseId) {
  try {
    const saves = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    delete saves[caseId];
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  } catch (err) {}
}

function applyCaseSave(s) {
  state.modeId = s.modeId || state.modeId;
  state.marked = s.marked || [];
  state.markedBy = s.markedBy || {};
  state.activeSuspect = s.activeSuspect || null;
  state.teamCount = s.teamCount || 1;
  state.teamNames = s.teamNames || [];
  state.timeline = s.timeline || null;
  state.timelineScore = s.timelineScore != null ? s.timelineScore : null;
  state.timelineCorrect = s.timelineCorrect || 0;
  state.quizAnswers = s.quizAnswers || {};
  state.quizLocked = !!s.quizLocked;
  state.quizScore = s.quizScore != null ? s.quizScore : null;
  state.quizCorrect = s.quizCorrect || 0;
  state.elimSolved = s.elimSolved || {};
  state.elimOrders = s.elimOrders || null;
  state.elimDrafts = s.elimDrafts || {};
  state.elimDone = !!s.elimDone;
  state.scenePicks = s.scenePicks || {};
  state.sceneSealed = !!s.sceneSealed;
  state.sceneScore = s.sceneScore != null ? s.sceneScore : null;
  state.confrontAnswers = s.confrontAnswers || {};
  state.confrontDone = !!s.confrontDone;
  state.freeQA = s.freeQA || {};
  syncPlayers();
  const cards = visibleCards();
  const idx = s.cardKey ? cards.indexOf(s.cardKey) : 0;
  state.cardIndex = idx >= 0 ? idx : 0;
  state.unlocked = Math.max(s.unlocked || 1, state.cardIndex + 1);
}

// ================= Şüpheli portreleri (noir, tohumdan üretilir) =================

function hashId(str) {
  let x = 7;
  for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) >>> 0;
  return x;
}

function portraitSvg(id) {
  const seed = hashId(id);
  const svg = svgEl("svg");
  svg.setAttribute("viewBox", "0 0 40 40");
  svg.setAttribute("class", "portrait");
  svg.setAttribute("aria-hidden", "true");

  const bg = svgEl("circle");
  bg.setAttribute("cx", 20); bg.setAttribute("cy", 20); bg.setAttribute("r", 19);
  bg.setAttribute("class", "portrait-bg");
  svg.appendChild(bg);

  const skin = ["#d8c29a", "#cbb58a", "#e0cba4", "#c9ad82"][(seed >> 6) % 4];
  const dark = ["#3a2e22", "#4a3b28", "#2e241a", "#5a4a38"][(seed >> 4) % 4];

  const shoulders = svgEl("path");
  shoulders.setAttribute("d", "M5,40 C7,31 13,27.5 20,27.5 C27,27.5 33,31 35,40 Z");
  shoulders.setAttribute("fill", dark);
  svg.appendChild(shoulders);

  const collar = (seed >> 2) % 3;
  if (collar === 1) {
    const c = svgEl("path");
    c.setAttribute("d", "M16,29 L20,34 L24,29 L22,28 L20,30.5 L18,28 Z");
    c.setAttribute("fill", "#e8dcc0");
    svg.appendChild(c);
  } else if (collar === 2) {
    const c = svgEl("rect");
    c.setAttribute("x", 14); c.setAttribute("y", 28.4);
    c.setAttribute("width", 12); c.setAttribute("height", 2.2);
    c.setAttribute("fill", "#8f2d24"); c.setAttribute("opacity", "0.85");
    svg.appendChild(c);
  }

  const head = svgEl("ellipse");
  head.setAttribute("cx", 20); head.setAttribute("cy", 17);
  head.setAttribute("rx", 6.6); head.setAttribute("ry", 7.6);
  head.setAttribute("fill", skin);
  svg.appendChild(head);

  const hair = seed % 4;
  if (hair === 1) {
    const p = svgEl("path");
    p.setAttribute("d", "M13.4,15 C13.8,10.4 16.6,8.6 20,8.6 C23.4,8.6 26.2,10.4 26.6,15 C24.4,12.6 15.6,12.6 13.4,15 Z");
    p.setAttribute("fill", dark);
    svg.appendChild(p);
  } else if (hair === 2) {
    const p = svgEl("path");
    p.setAttribute("d", "M12.6,14.2 C12.6,9 16,6.8 20,6.8 C24,6.8 27.4,9 27.4,14.2 L27.4,15.4 L12.6,15.4 Z");
    p.setAttribute("fill", dark);
    svg.appendChild(p);
    const brim = svgEl("rect");
    brim.setAttribute("x", 10.5); brim.setAttribute("y", 13.6);
    brim.setAttribute("width", 19); brim.setAttribute("height", 1.8);
    brim.setAttribute("rx", 0.9); brim.setAttribute("fill", dark);
    svg.appendChild(brim);
  } else if (hair === 3) {
    const p = svgEl("path");
    p.setAttribute("d", "M13.2,16 C12.8,10 16,7.4 20,7.4 C24,7.4 27.2,10 26.8,16 C26.8,11.8 24,10.2 20,10.2 C16,10.2 13.2,11.8 13.2,16 Z");
    p.setAttribute("fill", dark);
    svg.appendChild(p);
  }

  const eyeY = 16.6;
  [[17.4], [22.6]].forEach(function (e) {
    const dot = svgEl("circle");
    dot.setAttribute("cx", e[0]); dot.setAttribute("cy", eyeY);
    dot.setAttribute("r", 0.75); dot.setAttribute("fill", "#2a2016");
    svg.appendChild(dot);
  });

  if ((seed >> 8) % 3 === 1) {
    [[17.4], [22.6]].forEach(function (e) {
      const r = svgEl("circle");
      r.setAttribute("cx", e[0]); r.setAttribute("cy", eyeY);
      r.setAttribute("r", 1.9); r.setAttribute("fill", "none");
      r.setAttribute("stroke", "#2a2016"); r.setAttribute("stroke-width", "0.5");
      svg.appendChild(r);
    });
  }
  if ((seed >> 9) % 4 === 1) {
    const m = svgEl("path");
    m.setAttribute("d", "M17.6,21.4 C19,22.2 21,22.2 22.4,21.4");
    m.setAttribute("fill", "none");
    m.setAttribute("stroke", dark); m.setAttribute("stroke-width", "1.1");
    m.setAttribute("stroke-linecap", "round");
    svg.appendChild(m);
  }

  return svg;
}

function totalScore(progress) {
  return CASES.reduce(function (sum, c) {
    const rec = progress.cases[c.id];
    return sum + (rec ? rec.score : 0);
  }, 0);
}

// Vaka başına 130 puan: karar 100 + zaman çizelgesi 10 + çapraz analiz 10
// + kanıt toplama 10.
const MAX_TOTAL = CASES.length * 130;

// Zor eşikler: en üst rütbe yalnızca kusursuz kariyerle (%100) açılır.
const RANKS = [
  { min: 100, name: "Baş Dedektif" },
  { min: 90, name: "Usta Dedektif" },
  { min: 75, name: "Kıdemli Dedektif" },
  { min: 60, name: "Dedektif" },
  { min: 40, name: "Dedektif Yardımcısı" },
  { min: 0, name: "Çaylak" }
];

function rankFor(percent) {
  for (let i = 0; i < RANKS.length; i++) {
    if (percent >= RANKS[i].min) return RANKS[i].name;
  }
  return RANKS[0].name;
}

// ================= Başarımlar =================

const ACHIEVEMENTS = [
  { id: "first-close", name: "İlk Dosya Kapandı", desc: "İlk dosyanı çözdün." },
  { id: "perfect", name: "Kusursuz Karar", desc: "Neden, katil, sebep ve kanıt sunumunu tek seferde tuttur." },
  { id: "bloodhound", name: "Tazı Gözü", desc: "Bir dosyadaki tüm ipuçlarını işaretleyip hiç yanlış satır seçme." },
  { id: "dark-path", name: "Karanlık Yol", desc: "Karanlık Dosya modunda bir vaka çöz." },
  { id: "trilogy", name: "Arşiv Şefi", desc: "Arşivdeki tüm dosyaları kapat." }
];

function grantAchievements(progress, c, info) {
  progress.achievements = progress.achievements || {};
  function grant(id) {
    if (!progress.achievements[id]) progress.achievements[id] = Date.now();
  }
  if (info.solved) grant("first-close");
  if (info.verdictPerfect) grant("perfect");
  if (info.allClues) grant("bloodhound");
  if (info.solved && info.modeId === "blind") grant("dark-path");
  const allSolved = CASES.every(function (x) {
    const r = progress.cases[x.id];
    return r && r.solved;
  });
  if (allSolved) grant("trilogy");
}

function formatPoints(n) {
  return String(Math.round(n * 10) / 10).replace(".", ",");
}

function renderRankBadge() {
  const progress = loadProgress();
  const total = totalScore(progress);
  const percent = MAX_TOTAL > 0 ? (total / MAX_TOTAL) * 100 : 0;
  el.rankName.textContent = rankFor(percent).toLocaleUpperCase("tr");
  el.rankScore.textContent = formatPoints(total);

  let solved = 0;
  CASES.forEach(function (c) {
    const rec = progress.cases[c.id];
    if (rec && rec.solved) solved += 1;
  });
  el.statSolved.textContent = solved + "/" + CASES.length;
}

function stampTextFor(rec) {
  if (rec.solved) return "DOSYA KAPANDI";
  if (rec.partial) return "KISMEN ÇÖZÜLDÜ";
  return "DOSYA AÇIK KALDI";
}

function renderCareerSummary() {
  const progress = loadProgress();
  const played = CASES.filter(function (c) { return progress.cases[c.id]; });

  el.careerSummary.innerHTML = "";
  if (!played.length) {
    el.careerSummary.classList.add("hidden");
    return;
  }

  const head = document.createElement("h4");
  head.className = "career-summary__head";
  head.textContent = "Kariyer Dosyan";
  el.careerSummary.appendChild(head);

  const list = document.createElement("ul");
  list.className = "career-summary__list";
  played.forEach(function (c) {
    const rec = progress.cases[c.id];
    const li = document.createElement("li");

    const no = h("span", "career-summary__no", "№" + pad(c.id));
    const title = h("span", "career-summary__title", c.title);
    const score = h("span", "career-summary__score", formatPoints(rec.score) + "/130");
    const stamp = h("span", "career-summary__stamp " + (rec.solved ? "ok" : (rec.partial ? "mid" : "bad")), stampTextFor(rec));

    li.appendChild(no);
    li.appendChild(title);
    li.appendChild(score);
    li.appendChild(stamp);
    list.appendChild(li);
  });
  el.careerSummary.appendChild(list);

  const ach = progress.achievements || {};
  const unlockedAch = ACHIEVEMENTS.filter(function (a) { return ach[a.id]; });
  if (unlockedAch.length) {
    const box = h("div", "ach-row");
    unlockedAch.forEach(function (a) {
      const chip = h("span", "ach-chip", a.name);
      chip.title = a.desc;
      box.appendChild(chip);
    });
    el.careerSummary.appendChild(box);
  }

  const total = totalScore(progress);
  const foot = h("p", "career-summary__total");
  foot.textContent = "Toplam " + formatPoints(total) + "/" + MAX_TOTAL + " puan · Rütbe: "
    + rankFor((total / MAX_TOTAL) * 100);
  if (total < MAX_TOTAL) {
    foot.textContent += " · Baş Dedektif'e " + formatPoints(MAX_TOTAL - total) + " puan kaldı";
  }
  el.careerSummary.appendChild(foot);

  el.careerSummary.classList.remove("hidden");
}

// ================= Onay penceresi =================

const confirmState = { action: null };

function openConfirm(title, body, yesLabel, action) {
  el.confirmTitle.textContent = title;
  el.confirmBody.textContent = body;
  el.confirmYes.textContent = yesLabel;
  confirmState.action = action;
  el.confirmOverlay.classList.remove("hidden");
  el.confirmYes.focus();
}

function closeConfirm() {
  el.confirmOverlay.classList.add("hidden");
  confirmState.action = null;
}

el.confirmYes.addEventListener("click", function () {
  const action = confirmState.action;
  closeConfirm();
  if (action) action();
});

el.confirmNo.addEventListener("click", closeConfirm);

el.confirmOverlay.addEventListener("click", function (e) {
  if (e.target === el.confirmOverlay) closeConfirm();
});

document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  if (!el.confirmOverlay.classList.contains("hidden")) {
    closeConfirm();
  } else if (state.drawerOpen) {
    closeDrawer();
  }
});

// ================= Görsel katman yardımcıları =================

// Liste öğelerini tek tek içeri süzer (--i ile kademeli gecikme).
function stagger(container) {
  if (!container || REDUCED) return;
  const kids = container.children;
  for (let i = 0; i < kids.length; i++) {
    kids[i].style.setProperty("--i", i);
  }
  container.classList.remove("stagger");
  void container.offsetWidth;
  container.classList.add("stagger");
  clearTimeout(container._staggerTimer);
  container._staggerTimer = setTimeout(function () {
    container.classList.remove("stagger");
  }, 700 + kids.length * 80);
}

// Başlık sloganını daktilo efektiyle yazar
function typeTagline() {
  if (REDUCED || !el.tagline) return;
  const full = el.tagline.textContent;
  el.tagline.textContent = "";
  el.tagline.classList.add("typing");
  let i = 0;
  (function tick() {
    el.tagline.textContent = full.slice(0, i);
    if (i >= full.length) {
      setTimeout(function () { el.tagline.classList.remove("typing"); }, 1400);
      return;
    }
    i++;
    setTimeout(tick, 40 + Math.random() * 45);
  })();
}

// ================= Görünüm yönetimi =================

function showView(name) {
  state.view = name;
  document.body.classList.toggle("view-lobby", name === "lobby");
  document.body.classList.toggle("view-game", name === "game");
  el.viewLobby.classList.toggle("hidden", name !== "lobby");
  el.viewGame.classList.toggle("hidden", name !== "game");
}

function scrollTopInstant() {
  const prev = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  document.documentElement.style.scrollBehavior = prev;
}

function updateProgressBar() {
  if (state.view !== "game") {
    el.progressBar.style.width = "0%";
    return;
  }
  const total = visibleCards().length;
  el.progressBar.style.width = (Math.min(state.unlocked, total) / total) * 100 + "%";
}

// ================= Lobi =================

function renderLobby() {
  renderTeamSetup();
  renderModeGrid();
  renderCaseGrid();
  renderCareerSummary();
  renderRankBadge();
  updateProgressBar();
}

// ================= Ekip (takım) =================

function isTeam() {
  return state.players.length > 1;
}

function roleName(i) {
  const n = state.teamCount || 1;
  if (n > ROLES.length && i >= ROLES.length) return "Serbest";
  return rolesOf(i, n).join(" + ");
}

function syncPlayers() {
  const names = state.teamNames || [];
  const out = [];
  for (let i = 0; i < state.teamCount; i++) {
    const custom = (names[i] || "").trim();
    out.push({ name: custom || (i + 1) + ". Dedektif", role: roleName(i) });
  }
  state.players = out;
  netSend({ t: "setup", modeId: state.modeId, teamCount: state.teamCount, teamNames: state.teamNames, players: out });
}

function renderTeamSetup() {
  if (!el.teamSetup) return;
  el.teamSetup.innerHTML = "";
  const row = h("div", "team-setup__row");
  row.appendChild(h("span", "team-setup__label", "Oyuncu sayısı:"));
  for (let n = 1; n <= 4; n++) {
    const b = h("button", "team-count" + (state.teamCount === n ? " selected" : ""), n + (n === 1 ? " (tek)" : ""));
    b.type = "button";
    b.addEventListener("click", function () {
      state.teamCount = n;
      syncPlayers();
      renderTeamSetup();
    });
    row.appendChild(b);
  }
  el.teamSetup.appendChild(row);

  if (state.teamCount > 1) {
    const names = h("div", "team-setup__names");
    for (let i = 0; i < state.teamCount; i++) {
      const wrap = h("label", "team-setup__name");
      wrap.appendChild(h("span", null, roleName(i)));
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = (i + 1) + ". Dedektif";
      inp.value = (state.teamNames && state.teamNames[i]) || "";
      inp.maxLength = 14;
      inp.addEventListener("input", function () {
        (state.teamNames = state.teamNames || [])[i] = inp.value;
        syncPlayers();
      });
      wrap.appendChild(inp);
      names.appendChild(wrap);
    }
    el.teamSetup.appendChild(names);
  }
  syncPlayers();
  renderOnlineRow();
}

function roomCode() {
  let s = "";
  for (let i = 0; i < 4; i++) s += "ABCDEFGHJKLMNPRSTUVYZ"[Math.floor(Math.random() * 21)];
  return s;
}

function renderOnlineRow() {
  const row = h("div", "team-setup__row team-setup__online");
  if (state.net) {
    row.appendChild(h("span", "team-setup__label", "Oda: " + state.net.room + (state.net.isHost ? " (kurucu)" : "")));
    const leave = h("button", "team-count", "Odadan ayrıl");
    leave.type = "button";
    leave.addEventListener("click", netDisconnect);
    row.appendChild(leave);
  } else {
    row.appendChild(h("span", "team-setup__label", "Çevrimiçi (ayrı cihazlar):"));
    const create = h("button", "team-count", "Oda kur");
    create.type = "button";
    create.addEventListener("click", function () { netConnect(roomCode()); });
    row.appendChild(create);
    const inp = document.createElement("input");
    inp.type = "text"; inp.placeholder = "Oda kodu"; inp.maxLength = 4;
    inp.className = "team-join";
    const join = h("button", "team-count", "Katıl");
    join.type = "button";
    join.addEventListener("click", function () {
      const code = inp.value.trim().toUpperCase();
      if (code.length >= 3) netConnect(code);
    });
    row.appendChild(inp); row.appendChild(join);
    row.appendChild(h("span", "team-setup__hint", "Tüm cihazlar ruby server.rb ile aynı adreste olmalı."));
  }
  el.teamSetup.appendChild(row);
}

function renderTeamBar() {
  if (!el.teamBar) return;
  el.teamBar.classList.toggle("hidden", !isTeam());
  el.teamBar.innerHTML = "";
  if (!isTeam()) return;
  state.players.forEach(function (p, i) {
    const mine = i === state.mySlot;
    const chip = h("button", "team-chip" + (mine ? " active" : ""));
    chip.type = "button";
    chip.appendChild(h("strong", null, p.name));
    chip.appendChild(h("em", null, p.role + (mine ? " · SEN" : "")));
    chip.title = roleFilterActive()
      ? "Bu cihaz " + p.name + " olarak oynar; kartların buna göre görünür"
      : "İşaretleri bu dedektife yaz";
    chip.addEventListener("click", function () {
      state.mySlot = i;
      state.activePlayer = i;
      netSend({ t: "active", i: i });
      renderGame();
    });
    el.teamBar.appendChild(chip);
  });
  if (state.traitor != null && state.traitor === state.mySlot) {
    el.teamBar.appendChild(h("span", "team-traitor-secret", "Gizli rolün: KÖSTEBEK — ekip çözemesin diye çalış."));
  }
}

function teamAllConfirmed() {
  for (let i = 0; i < state.players.length; i++) {
    if (!state.teamConfirm[i]) return false;
  }
  return state.players.length > 0;
}

function renderTeamConsensus() {
  if (!verdictRefs || !verdictRefs.consensus) return;
  const box = verdictRefs.consensus;
  box.innerHTML = "";
  if (!isTeam()) return;
  box.appendChild(h("span", "team-consensus__label", "Ekip onayı:"));
  const chips = h("div", "team-consensus__chips");
  state.players.forEach(function (p, i) {
    const b = h("button", "team-consent" + (state.teamConfirm[i] ? " on" : ""), (state.teamConfirm[i] ? "✓ " : "") + p.name);
    b.type = "button";
    b.addEventListener("click", function () {
      state.teamConfirm[i] = !state.teamConfirm[i];
      netSend({ t: "confirm", i: i, on: !!state.teamConfirm[i] });
      renderTeamConsensus();
    });
    chips.appendChild(b);
  });
  box.appendChild(chips);
  if (verdictRefs.submit) verdictRefs.submit.disabled = !teamAllConfirmed();
}

// Çevrimiçi senkron: yerel modda etkisiz, çevrimiçi odada mesajları iletir.
function netSend(msg) {
  if (state.net && state.net.send && !applyingRemote) state.net.send(msg);
}

let applyingRemote = false;

function netConnect(code) {
  if (state.net) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(proto + "://" + location.host + "/?room=" + encodeURIComponent(code));
  state.net = {
    ws: ws, room: code, isHost: false,
    send: function (m) { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }
  };
  ws.onmessage = function (e) {
    try { netOnMessage(JSON.parse(e.data)); } catch (err) {}
  };
  ws.onclose = function () {
    state.net = null;
    if (state.netReconnect > 0) {
      state.netReconnect -= 1;
      setTimeout(function () { netConnect(code); }, 1200);
    } else {
      renderTeamSetup();
    }
  };
  state.netReconnect = state.netReconnect == null ? 5 : state.netReconnect;
}

function netDisconnect() {
  state.netReconnect = 0;
  if (state.net && state.net.ws) state.net.ws.close();
  state.net = null;
  renderTeamSetup();
}

function netOnMessage(m) {
  if (m.t === "welcome") { state.net.isHost = m.isHost; renderTeamSetup(); }
  else if (m.t === "peer") { if (state.net) state.net.peers = m.n; }
  else if (m.t === "snapshot") { applySnapshot(m.state); }
  else if (m.t === "chat") { appendChat(m.from, m.text); }
  else if (m.t === "ping") { flashPing(m.i); }
  else netApply(m);
}

function myName() {
  return (isTeam() && state.players[state.activePlayer]) ? state.players[state.activePlayer].name : "Sen";
}

function appendChat(from, text) {
  (state.chat = state.chat || []).push({ from: from, text: text });
  if (el.chatList) {
    const li = h("li", "chat-msg");
    li.appendChild(h("strong", null, from + ": "));
    li.appendChild(document.createTextNode(text));
    el.chatList.appendChild(li);
    el.chatList.scrollTop = el.chatList.scrollHeight;
  }
}

function sendChat() {
  const t = (el.chatText.value || "").trim();
  if (!t) return;
  netSend({ t: "chat", from: myName(), text: t });
  appendChat(myName(), t);
  el.chatText.value = "";
}

function flashPing(i) {
  const item = el.drawerList.querySelector('[data-idx="' + i + '"]');
  if (item) {
    item.classList.remove("ping-flash");
    void item.offsetWidth;
    item.classList.add("ping-flash");
  }
  if (!el.drawer.classList.contains("open")) openDrawer();
}

if (el.chatSend) el.chatSend.addEventListener("click", sendChat);
if (el.chatText) el.chatText.addEventListener("keydown", function (e) {
  if (e.key === "Enter") { e.preventDefault(); sendChat(); }
});

function sendSnapshot() {
  netSend({
    t: "snapshot",
    state: {
      modeId: state.modeId, caseId: state.caseId,
      cardKey: visibleCards()[state.cardIndex],
      marked: state.marked, markedBy: state.markedBy,
      teamCount: state.teamCount, teamNames: state.teamNames, players: state.players,
      activePlayer: state.activePlayer, teamConfirm: state.teamConfirm,
      freeQA: state.freeQA
    }
  });
}

function applySnapshot(s) {
  applyingRemote = true;
  state.modeId = s.modeId; state.teamCount = s.teamCount; state.teamNames = s.teamNames;
  state.players = s.players; state.activePlayer = s.activePlayer; state.teamConfirm = s.teamConfirm;
  state.marked = s.marked || []; state.markedBy = s.markedBy || {};
  state.freeQA = s.freeQA || {};
  state.traitor = s.traitor != null ? s.traitor : null;
  state.echoes = s.echoes || [];
  if (s.caseId != null) {
    state.caseId = s.caseId;
    const cards = visibleCards();
    const idx = cards.indexOf(s.cardKey);
    state.cardIndex = idx >= 0 ? idx : 0;
    state.unlocked = idx >= 0 ? Math.max(state.unlocked, idx + 1) : state.unlocked;
    showView("game"); renderGame();
  }
  applyingRemote = false;
}

function netApply(m) {
  applyingRemote = true;
  if (m.t === "mark") {
    if (state.marked.indexOf(m.i) === -1) { state.marked.push(m.i); state.markedBy[m.i] = m.by; }
  } else if (m.t === "unmark") {
    const ix = state.marked.indexOf(m.i);
    if (ix !== -1) state.marked.splice(ix, 1);
    delete state.markedBy[m.i];
  } else if (m.t === "confirm") {
    state.teamConfirm[m.i] = m.on; renderTeamConsensus();
  } else if (m.t === "active") {
    state.activePlayer = m.i; renderTeamBar();
  } else if (m.t === "traitor") {
    state.traitor = m.i; renderTeamBar();
  } else if (m.t === "echo") {
    if (state.echoes.indexOf(m.id) === -1) state.echoes.push(m.id);
    renderCard();
  } else if (m.t === "case") {
    openCase(m.id);
  } else if (m.t === "card") {
    const cards = visibleCards();
    const idx = cards.indexOf(m.key);
    if (idx !== -1) {
      state.unlocked = Math.max(state.unlocked, idx + 1);
      state.cardIndex = idx;
      renderTabs();
      renderCard();
      renderCardNav();
      updateProgressBar();
    }
  } else if (m.t === "freeqa") {
    state.freeQA[m.subject] = state.freeQA[m.subject] || [];
    if (state.freeQA[m.subject].indexOf(m.i) === -1) state.freeQA[m.subject].push(m.i);
    renderInterrogation(currentCase());
  } else if (m.t === "verdict") {
    if (verdictRefs) {
      verdictRefs.causeSelect.value = m.cause;
      verdictRefs.suspectSelect.value = m.suspect;
      verdictRefs.motiveSelect.value = m.motive;
      verdictRefs.evidenceInput.value = m.evidence;
      resolveVerdict();
    }
  }
  applyingRemote = false;
  renderInterrogation(currentCase());
  renderDrawer();
  updateNoteCount();
}

function renderModeGrid() {
  el.modeGrid.innerHTML = "";
  MODES.forEach(function (m) {
    const btn = h("button", "mode-card" + (m.id === state.modeId ? " selected" : ""));
    btn.type = "button";
    btn.setAttribute("aria-pressed", m.id === state.modeId ? "true" : "false");
    btn.appendChild(h("span", "mode-card__name", m.name));
    btn.appendChild(h("span", "mode-card__desc", m.desc));
    btn.appendChild(h("span", "mode-card__tag", m.tag));
    btn.addEventListener("click", function () {
      if (state.modeId === m.id) return;
      state.modeId = m.id;
      renderModeGrid();
      renderCaseGrid();
    });
    el.modeGrid.appendChild(btn);
  });
}

function renderCaseGrid() {
  el.caseGrid.innerHTML = "";
  const progress = loadProgress();
  const m = activeMode();

  CASES.forEach(function (c, ci) {
    const rec = progress.cases[c.id];
    const card = h("article", "case-file");
    const prev = ci > 0 ? progress.cases[CASES[ci - 1].id] : null;
    const locked = ci > 0 && !(prev && prev.solved);
    if (locked) card.classList.add("case-file--locked");

    const top = h("div", "case-file__top");
    top.appendChild(h("span", "case-file__no", "DOSYA №" + pad(c.id)));
    if (locked) {
      const lock = h("span", "mini-stamp bad", "KİLİTLİ");
      lock.style.setProperty("--rot", "-5deg");
      top.appendChild(lock);
    } else if (rec) {
      const stamp = h("span", "mini-stamp " + (rec.solved ? "ok" : (rec.partial ? "mid" : "bad")), stampTextFor(rec));
      stamp.style.setProperty("--rot", (c.id % 2 === 0 ? -4 : 5) + "deg");
      top.appendChild(stamp);
    }
    card.appendChild(top);

    card.appendChild(h("h3", "case-file__title", c.title));
    card.appendChild(h("p", "case-file__teaser", c.teaser));

    const meta = h("ul", "case-file__meta");
    meta.appendChild(h("li", null, c.suspects.length + " şüpheli"));
    meta.appendChild(h("li", null, m.cards.length + " kart"));
    meta.appendChild(h("li", null, m.name));
    card.appendChild(meta);

    if (rec) {
      card.appendChild(h("p", "case-file__score", "En iyi skor: " + formatPoints(rec.score) + "/130"));
    }

    if (locked) {
      const open = h("button", "btn case-file__open", "Kilitli — önce DOSYA №" + pad(CASES[ci - 1].id) + " çözülsün");
      open.type = "button";
      open.disabled = true;
      card.appendChild(open);
    } else {
      const save = loadCaseSave(c.id);
      const open = h("button", "btn case-file__open", save ? "Devam et" : (rec ? "Dosyayı yeniden aç" : "Dosyayı aç"));
      open.type = "button";
      open.addEventListener("click", function () { openCase(c.id, !!save); });
      card.appendChild(open);
      if (save) {
        const restart = h("button", "btn btn--ghost case-file__restart", "Baştan başla");
        restart.type = "button";
        restart.addEventListener("click", function () {
          openConfirm(
            "Dosya baştan açılsın mı?",
            "Kayıtlı ilerleme silinecek.",
            "Evet, baştan",
            function () { openCase(c.id, false); }
          );
        });
        card.appendChild(restart);
      }
    }

    el.caseGrid.appendChild(card);
  });
}

// ================= Oyun kabuğu =================

function openCase(caseId, resume) {
  state.caseId = caseId;
  state.cardIndex = 0;
  state.unlocked = 1;
  state.marked = [];
  state.markedBy = {};
  state.teamConfirm = [];
  state.activePlayer = 0;
  syncPlayers();
  state.traitor = null;
  state.echoes = [];
  if (isTeam() && state.players.length >= 3) {
    state.traitor = Math.floor(Math.random() * state.players.length);
    netSend({ t: "traitor", i: state.traitor });
  }
  state.activeSuspect = null;
  state.resolved = false;
  state.resultNode = null;
  state.timeline = null;
  state.timelineScore = null;
  state.timelineCorrect = 0;
  state.quizAnswers = {};
  state.quizLocked = false;
  state.quizScore = null;
  state.quizCorrect = 0;
  state.elimSolved = {};
  state.elimOrders = null;
  state.elimDrafts = {};
  state.elimDone = false;
  state.scenePicks = {};
  state.sceneSealed = false;
  state.sceneScore = null;
  state.labSolved = {};
  state.labFirstTry = {};
  state.labTried = {};
  state.labMissed = {};
  state.labOrders = null;
  state.labDone = false;
  state.labScore = null;
  state.confrontAnswers = {};
  state.confrontDone = false;
  state.freeQA = {};
  state.freeMiss = null;
  if (resume) {
    const s = loadCaseSave(caseId);
    if (s) applyCaseSave(s);
  } else {
    clearCaseSave(caseId);
  }
  closeDrawer();
  showView("game");
  renderGame();
  scrollTopInstant();
  netSend({ t: "case", id: caseId });
}

function goLobby() {
  saveCaseState();
  state.caseId = null;
  closeDrawer();
  showView("lobby");
  renderLobby();
  scrollTopInstant();
}

el.backBtn.addEventListener("click", function () {
  if (!state.resolved && (state.marked.length || state.cardIndex > 0)) {
    openConfirm(
      "Dosyadan çıkılsın mı?",
      "Bu oturumdaki ilerlemen ve işaretlediğin satırlar silinecek.",
      "Evet, çık",
      goLobby
    );
    return;
  }
  goLobby();
});

function renderGame() {
  const c = currentCase();
  if (!c) { goLobby(); return; }

  el.gameCaseNo.textContent = "DOSYA №" + pad(c.id);
  el.gameCaseTitle.textContent = c.title;
  el.gameModeChip.textContent = activeMode().name.toLocaleUpperCase("tr");

  renderTeamBar();
  renderTabs();
  renderCard();
  renderCardNav();
  renderDrawer();
  updateNoteCount();
  updateProgressBar();
}

function renderTabs() {
  const cards = visibleCards();
  el.cardTabs.innerHTML = "";
  cards.forEach(function (key, i) {
    const btn = h("button", "card-tab");
    btn.type = "button";
    btn.title = CARDS[key].title;
    if (i === state.cardIndex) {
      btn.classList.add("active");
      btn.setAttribute("aria-current", "step");
    }
    if (i < state.unlocked && i !== state.cardIndex) btn.classList.add("done");
    if (i >= state.unlocked) {
      btn.classList.add("locked");
      btn.disabled = true;
      btn.title = "Önce önceki kartı tamamla";
    }
    btn.appendChild(h("span", "card-tab__no", pad(i + 1)));
    btn.appendChild(h("span", "card-tab__label", CARDS[key].short));
    btn.addEventListener("click", function () { goCard(i); });
    el.cardTabs.appendChild(btn);
  });
}

function goCard(i) {
  const cards = visibleCards();
  if (i < 0 || i >= cards.length || i >= state.unlocked) return;
  state.cardIndex = i;
  netSend({ t: "card", key: cards[i] });
  renderTabs();
  renderCard();
  renderCardNav();
}

// Bazı kartlar tamamlanmadan ilerlenemez (zaman, analiz, eleme).
function cardGateDone(key) {
  if (key === "scene") return state.sceneSealed;
  if (key === "timeline") return state.timelineScore != null;
  if (key === "quiz") return state.quizScore != null;
  if (key === "elimination") return state.elimDone;
  return true;
}

function gateHintFor(key) {
  if (key === "scene") return "Kanıtları topla ve mühürle.";
  if (key === "timeline") return "Sıralamayı tamamla ve kontrol et.";
  if (key === "quiz") return "Tüm soruları cevapla ve kilitle.";
  if (key === "elimination") return "Tüm şüphelileri ele ve yüzleşmeyi tamamla.";
  return "";
}

function advanceCard() {
  const cards = visibleCards();
  if (state.cardIndex >= cards.length - 1) return;
  if (!cardGateDone(cards[state.cardIndex])) return;
  state.cardIndex += 1;
  state.unlocked = Math.max(state.unlocked, state.cardIndex + 1);
  netSend({ t: "card", key: cards[state.cardIndex] });
  renderTabs();
  renderCard();
  renderCardNav();
  updateProgressBar();
}

function renderCardNav() {
  const cards = visibleCards();
  const isLast = state.cardIndex === cards.length - 1;
  const key = cards[state.cardIndex];
  const gated = !cardGateDone(key);
  el.cardPos.textContent = "KART " + pad(state.cardIndex + 1) + " / " + pad(cards.length);
  el.prevCard.disabled = state.cardIndex === 0;
  el.nextCard.disabled = isLast || gated;
  el.nextCard.textContent = isLast
    ? "Son kart"
    : (gated
      ? "Önce: " + gateHintFor(key)
      : "Sonraki: " + CARDS[cards[state.cardIndex + 1]].short + " →");
}

el.prevCard.addEventListener("click", function () { goCard(state.cardIndex - 1); });
el.nextCard.addEventListener("click", advanceCard);

let lastCardKey = null;

function renderCard() {
  const c = currentCase();
  const key = visibleCards()[state.cardIndex];
  el.cardArea.innerHTML = "";
  CARD_RENDERERS[key](el.cardArea, c);
  if (key !== lastCardKey) {
    sound.paper();
    lastCardKey = key;
  }
  saveCaseState();
  if (!REDUCED) {
    el.cardArea.classList.remove("card-in");
    void el.cardArea.offsetWidth;
    el.cardArea.classList.add("card-in");
  }
  scrollTopInstant();
}

function sectionHead(text) {
  return h("h3", "section-head", text);
}

// ================= Kart: Vaka Dosyası =================

function cardBrief(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Vaka Özeti"));
  card.appendChild(h("p", "case__kicker", "Dosya №" + pad(c.id) + " · Gizli"));
  card.appendChild(h("h3", "case__title", c.title));
  card.appendChild(h("p", "case__story", c.story));

  card.appendChild(h("h4", "report__subhead", "Görevin"));
  const tasks = h("ol", "brief-tasks");
  ["Ölüm nedenini belirle.", "Katili tespit et ve sebebini çöz.", "Kararını doğru kanıtlarla destekle.",
   "Zaman çizelgesini kur, çapraz analizi geç ve eleme masasını temizle."]
    .forEach(function (t) { tasks.appendChild(h("li", null, t)); });
  card.appendChild(tasks);

  const m = activeMode();
  const note = m.id === "interrogation"
    ? "Bu modda adli raporlar (olay yeri, kriminal, otopsi) dosyada yok; yalnız tutanaklara güvenebilirsin."
    : (m.id === "blind"
      ? "Bu modda sorgu tutanağı ve kriminal rapor yok: kroki ve otopsi bulgularından çıkarım yap."
      : "Tüm raporlar dosyada. Kartları sırayla aç; sorguda ipucu satırlarını işaretlemeyi unutma.");
  card.appendChild(h("p", "hint", note));

  area.appendChild(card);
}

// ================= Kart: Olay Yeri =================

function notesBox(notes) {
  if (!notes || !notes.length) return null;
  const box = h("div", "notes-box");
  box.appendChild(h("h4", "notes-box__head", "Sana Özel Uzman Notları"));
  const ul = h("ul", "notes-box__list");
  notes.forEach(function (t) { ul.appendChild(h("li", null, t)); });
  box.appendChild(ul);
  box.appendChild(h("p", "notes-box__hint", "Bu notlar yalnız senin ekranında — karar için ekibine sözlü aktar."));
  return box;
}

function cardScene(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Olay Yeri"));
  card.appendChild(h("p", "report__body", c.scene.summary));

  const pickables = c.scene.objects.filter(function (o) { return o.real !== undefined; });
  let countNode = null;
  function refreshCount() {
    if (countNode) {
      countNode.textContent = "Kanıt torbası: " + Object.keys(state.scenePicks).length
        + " / " + pickables.length + " öğe";
    }
  }

  card.appendChild(buildSceneFigure(c.scene, refreshCount));

  if (pickables.length) {
    card.appendChild(h("h4", "report__subhead", "Kanıt Torbası"));
    const panel = h("div", "scene-collect");
    countNode = h("p", "scene-collect__count");
    refreshCount();
    panel.appendChild(countNode);

    if (!state.sceneSealed) {
      panel.appendChild(h("p", "scene-collect__hint",
        "Yukarıdaki krokide kanıt olduğuna emin olduğun öğelere tıklayıp buraya doldur; hazır olunca mühürle."));
      const seal = h("button", "btn", "Kanıtları Mühürle");
      seal.type = "button";
      seal.addEventListener("click", function () {
        let hits = 0, wrong = 0, totalReal = 0;
        c.scene.objects.forEach(function (o, i) {
          if (o.real === undefined) return;
          totalReal++;
          const picked = !!state.scenePicks[i];
          if (o.real && picked) hits++;
          else if (!o.real && picked) wrong++;
        });
        state.sceneSealed = true;
        state.sceneScore = Math.max(0, Math.round(10 * (hits - wrong) / totalReal * 10) / 10);
        if (wrong === 0 && hits === totalReal) sound.good(); else sound.bad();
        renderCard();
        renderCardNav();
      });
      panel.appendChild(seal);
    } else {
      const fb = h("ul", "scene-collect__fb");
      c.scene.objects.forEach(function (o, i) {
        if (o.real === undefined) return;
        const picked = !!state.scenePicks[i];
        let txt, ok;
        if (o.real && picked) { txt = o.label + " — doğru, gerçek kanıt"; ok = true; }
        else if (!o.real && picked) { txt = o.label + " — yanıltıcıydı, torbaya girmemeliydi"; ok = false; }
        else { txt = o.label + " — gerçek kanıttı, kaçırıldı"; ok = false; }
        fb.appendChild(h("li", ok ? "ok" : "bad", (ok ? "✓ " : "✗ ") + txt));
      });
      panel.appendChild(fb);
      panel.appendChild(h("p", "card-done", "Kanıt toplama: +" + formatPoints(state.sceneScore) + " puan"));
    }
    card.appendChild(panel);
  }

  card.appendChild(h("h4", "report__subhead", "Olay yerinde toplananlar"));
  const list = h("ul", "evidence-list");
  c.scene.evidence.forEach(function (ev) {
    const li = document.createElement("li");
    li.appendChild(h("strong", null, ev.name));
    li.appendChild(document.createTextNode(" — " + ev.desc));
    list.appendChild(li);
  });
  card.appendChild(list);

  const nb = notesBox(c.scene.notes);
  if (nb) card.appendChild(nb);
  appendEchoes(card, "scene");

  area.appendChild(card);
  stagger(list);
}

// ================= Kart: Kriminal =================

function cardCsi(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Olay Yeri İnceleme Raporu"));
  card.appendChild(h("p", "report__meta", c.csi.examiner + "  •  " + c.csi.date));
  card.appendChild(h("p", "report__body", c.csi.finding));

  card.appendChild(h("h4", "report__subhead", "Toplanan örnekler"));
  const list = h("ul", "evidence-list");
  c.csi.items.forEach(function (t) { list.appendChild(h("li", null, t)); });
  card.appendChild(list);

  const nb = notesBox(c.csi.notes);
  if (nb) card.appendChild(nb);
  appendEchoes(card, "csi");

  area.appendChild(card);
  stagger(list);
}

// ================= Kart: Otopsi =================

function cardAutopsy(area, c) {
  const aut = c.autopsy;
  const card = h("section", "card");
  card.appendChild(sectionHead("Otopsi Raporu"));
  card.appendChild(h("p", "report__meta", aut.pathologist + "  •  " + aut.date));

  card.appendChild(h("h4", "report__subhead", "Dış Muayene"));
  card.appendChild(h("p", "report__body", aut.external));
  card.appendChild(h("h4", "report__subhead", "İç Muayene"));
  card.appendChild(h("p", "report__body", aut.internal));

  card.appendChild(h("h4", "report__subhead", "Yaralanma Haritası"));
  card.appendChild(buildAnatomyGrid(c));

  card.appendChild(h("h4", "report__subhead", "Toksikoloji"));
  card.appendChild(buildToxTable(aut.toxicology));

  card.appendChild(h("h4", "report__subhead", "Ölüm Nedeni Notu"));
  card.appendChild(h("p", "report__body", aut.causeNote));

  const nb = notesBox(aut.notes);
  if (nb) card.appendChild(nb);
  appendEchoes(card, "autopsy");

  area.appendChild(card);
}

function buildToxTable(rows) {
  const headers = ["Madde", "Sonuç", "Referans", "Yorum"];
  const table = h("table", "tox-table");

  const headRow = document.createElement("tr");
  headers.forEach(function (t) { headRow.appendChild(h("th", null, t)); });
  table.appendChild(headRow);

  rows.forEach(function (row) {
    const tr = document.createElement("tr");
    row.forEach(function (cell) { tr.appendChild(h("td", null, cell)); });
    table.appendChild(tr);
  });
  stagger(table);
  return table;
}

// ================= Kart: Sorgular =================

let interRefs = null;

function cardInterrogation(area, c) {
  const rec = c.interrogation;
  const card = h("section", "card");
  card.appendChild(sectionHead("Şüpheli Sorguları"));
  card.appendChild(h("p", "report__meta", rec.officer + "  •  " + rec.date));
  card.appendChild(h("p", "hint",
    "İpucu sakladığını düşündüğün satıra tıkla ve işaretle; işaretlerin Not Defterim'e düşer. "
    + "Şüpheliyi aşağıdaki kartlardan çağır."));

  const chips = h("div", "suspect-chips");
  const info = h("p", "session-info");
  const list = h("div", "transcript");
  const free = h("div", "freeform-area");
  card.appendChild(chips);
  card.appendChild(info);
  card.appendChild(list);
  card.appendChild(free);

  const nb = notesBox(rec.notes);
  if (nb) card.appendChild(nb);

  area.appendChild(card);

  if (!state.activeSuspect || !c.suspects.some(function (s) { return s.id === state.activeSuspect; })) {
    state.activeSuspect = c.suspects[0].id;
  }
  interRefs = { chips: chips, info: info, list: list, free: free };
  renderInterrogation(c);
}

function sessionRecords(caseData, subject) {
  const out = [];
  caseData.interrogation.records.forEach(function (row, i) {
    if (row.subject === subject) out.push({ idx: i, row: row });
  });
  return out;
}

function renderInterrogation(c) {
  if (!interRefs) return;

  interRefs.chips.innerHTML = "";
  c.suspects.forEach(function (s) {
    const chip = h("button", "suspect-chip" + (s.id === state.activeSuspect ? " active" : ""));
    chip.type = "button";
    chip.appendChild(portraitSvg(s.id));
    chip.appendChild(h("span", "suspect-chip__name", s.name));
    chip.addEventListener("click", function () {
      state.activeSuspect = s.id;
      sound.click();
      renderInterrogation(c);
    });
    interRefs.chips.appendChild(chip);
  });

  const suspect = c.suspects.find(function (s) { return s.id === state.activeSuspect; });
  const session = sessionRecords(c, state.activeSuspect);
  interRefs.info.textContent = "Şu an sorguda: " + suspect.name
    + " — " + suspect.note + " (" + session.length + " ifade)";

  interRefs.list.innerHTML = "";
  session.forEach(function (item) {
    const row = item.row;
    const line = h("div", "transcript-line"
      + (row.clue ? " has-clue" : "")
      + (row.speaker.indexOf("Hakim") === 0 ? " is-question" : ""));
    line.appendChild(h("span", "transcript-who", row.speaker));
    line.appendChild(h("span", "transcript-text", row.text));
    if (state.marked.indexOf(item.idx) !== -1) line.classList.add("marked");
    line.addEventListener("click", function () { toggleMark(item.idx); });
    interRefs.list.appendChild(line);
  });

  renderPressureRound(interRefs.list, c, state.activeSuspect);

  if (interRefs.free) {
    interRefs.free.innerHTML = "";
    renderFreeform(interRefs.free, c);
  }

  if (!REDUCED) {
    interRefs.list.classList.remove("swap");
    void interRefs.list.offsetWidth;
    interRefs.list.classList.add("swap");
  }
}

// Kademeli sorgu: yeterli satır işaretlenince şüphelinin baskı turu açılır.
function renderPressureRound(list, c, subject) {
  const rounds = c.interrogation.pressure || [];
  let round = null;
  for (let i = 0; i < rounds.length; i++) {
    if (rounds[i].subject === subject) { round = rounds[i]; break; }
  }
  if (!round) return;

  if (state.marked.length < round.minClues) {
    const locked = h("div", "pressure-locked");
    locked.appendChild(h("span", "pressure-locked__tag", "BASKI TURU KİLİTLİ"));
    locked.appendChild(h("span", "pressure-locked__hint",
      "Açmak için " + (round.minClues - state.marked.length)
      + " satır daha işaretle; şüpheli bunaldıkça konuşacak."));
    list.appendChild(locked);
    return;
  }

  const head = h("div", "pressure-head", "BASKI TURU — YENİ İFADE");
  list.appendChild(head);
  round.records.forEach(function (row) {
    const line = h("div", "transcript-line pressure-line"
      + (row.clue ? " has-clue" : "")
      + (row.speaker.indexOf("Hakim") === 0 ? " is-question" : ""));
    line.appendChild(h("span", "transcript-who", row.speaker));
    line.appendChild(h("span", "transcript-text", row.text));
    list.appendChild(line);
  });
}

function toggleMark(i) {
  if (state.resolved) return;
  const idx = state.marked.indexOf(i);
  if (idx === -1) {
    state.marked.push(i);
    state.markedBy[i] = state.mySlot;
    netSend({ t: "mark", i: i, by: state.mySlot });
    unlockEchoesFor(i);
    sound.click();
  } else {
    state.marked.splice(idx, 1);
    delete state.markedBy[i];
    netSend({ t: "unmark", i: i });
  }
  renderInterrogation(currentCase());
  renderDrawer();
  updateNoteCount();
}

// İşaretlenen satır bir yankı tetikliyorsa, hedef rolün kartına otomatik düşür.
function unlockEchoesFor(i) {
  const c = currentCase();
  if (!c || !c.echoes) return;
  const row = c.interrogation.records[i];
  if (!row) return;
  const txt = trNorm(row.text);
  c.echoes.forEach(function (e, id) {
    if (state.echoes.indexOf(id) !== -1) return;
    const k = trNorm(e.key);
    if (k && txt.indexOf(k) !== -1) {
      state.echoes.push(id);
      netSend({ t: "echo", id: id });
      renderCard();
    }
  });
}

// Bir karta düşmüş açık yankıları listele.
function appendEchoes(container, cardKey) {
  const c = currentCase();
  if (!c || !c.echoes) return;
  state.echoes.forEach(function (id) {
    const e = c.echoes[id];
    if (!e || e.to !== cardKey) return;
    container.appendChild(h("p", "echo-note", e.text));
  });
}

// ================= Kart: Zaman Çizelgesi =================

function shuffleIndices(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  let ordered = true;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== i) { ordered = false; break; }
  }
  if (ordered && arr.length > 1) {
    const t = arr[0]; arr[0] = arr[1]; arr[1] = t;
  }
  return arr;
}

function cardTimeline(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Zaman Çizelgesi"));
  card.appendChild(h("p", "hint",
    "Olaylar kısa ipuçları olarak verildi; hangisinin ne zaman olduğunu dosyadan çıkarman "
    + "gerekiyor. En erken olaya tıklayarak sağdaki sıraya yerleştir; yanlış yerleştirdiğini "
    + "tıklayıp geri alabilirsin. Sıra tamamlanınca kontrol et."));

  if (!state.timeline) {
    state.timeline = { pool: shuffleIndices(c.timeline.length), placed: [] };
  }
  const tl = state.timeline;
  const locked = state.timelineScore != null;

  const wrap = h("div", "timeline-board");

  const poolBox = h("div", "timeline-col");
  poolBox.appendChild(h("h4", "timeline-col__head", "Olaylar"));
  if (!tl.pool.length) poolBox.appendChild(h("p", "hint", "Havuz boşaldı."));
  tl.pool.forEach(function (idx) {
    const chip = h("button", "timeline-chip");
    chip.type = "button";
    chip.textContent = c.timeline[idx];
    chip.addEventListener("click", function () {
      if (locked) return;
      tl.pool.splice(tl.pool.indexOf(idx), 1);
      tl.placed.push(idx);
      renderCard();
    });
    poolBox.appendChild(chip);
  });

  const placedBox = h("div", "timeline-col");
  placedBox.appendChild(h("h4", "timeline-col__head", "Sıralaman"));
  if (!tl.placed.length) placedBox.appendChild(h("p", "hint", "Henüz olay yerleştirmedin."));
  tl.placed.forEach(function (idx, pos) {
    const item = h("button", "timeline-item");
    item.type = "button";
    if (locked && tl.results) item.classList.add(tl.results[pos] ? "ok" : "bad");
    item.appendChild(h("span", "timeline-item__no", String(pos + 1)));
    item.appendChild(h("span", "timeline-item__text", c.timeline[idx]));
    if (!locked) {
      item.title = "Geri almak için tıkla";
      item.addEventListener("click", function () {
        tl.placed.splice(pos, 1);
        tl.pool.push(idx);
        renderCard();
      });
    }
    placedBox.appendChild(item);
  });

  wrap.appendChild(poolBox);
  wrap.appendChild(placedBox);
  card.appendChild(wrap);

  if (!locked) {
    const check = h("button", "btn", "Sıralamayı kontrol et");
    check.type = "button";
    check.disabled = tl.pool.length > 0;
    check.addEventListener("click", function () {
      tl.results = tl.placed.map(function (idx, pos) { return idx === pos; });
      state.timelineCorrect = tl.results.filter(Boolean).length;
      state.timelineScore = Math.round(10 * state.timelineCorrect / c.timeline.length * 10) / 10;
      if (state.timelineCorrect === c.timeline.length) sound.good(); else sound.bad();
      renderCard();
      renderCardNav();
    });
    card.appendChild(check);
  } else {
    card.appendChild(h("p", "card-done",
      state.timelineCorrect + "/" + c.timeline.length + " olay doğru sırada · +"
      + formatPoints(state.timelineScore) + " puan"));
    if (state.timelineCorrect < c.timeline.length) {
      card.appendChild(h("p", "hint", "Doğru kronoloji:"));
      const sol = h("ol", "timeline-solution");
      c.timeline.forEach(function (t) { sol.appendChild(h("li", null, t)); });
      card.appendChild(sol);
    }
  }

  area.appendChild(card);
}

// ================= Kart: Çapraz Analiz =================

function cardQuiz(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Çapraz Analiz"));
  card.appendChild(h("p", "hint",
    "Dosyayı ne kadar dikkatli okudun? Her sorunun tek doğru cevabı var. "
    + "Tüm soruları cevaplamadan kilitlenmez; kilit sonrası değişiklik yapılamaz."));

  const locked = state.quizScore != null;

  function allAnswered() {
    return c.quiz.every(function (qz, qi) { return !!state.quizAnswers[qi]; });
  }

  let lockBtn = null;

  c.quiz.forEach(function (qz, qi) {
    const block = h("div", "quiz-q");
    block.appendChild(h("p", "quiz-q__text", (qi + 1) + ". " + qz.q));
    qz.options.forEach(function (opt) {
      let cls = "quiz-opt";
      if (locked) {
        if (opt === qz.correct) cls += " ok";
        else if (state.quizAnswers[qi] === opt) cls += " bad";
      }
      const label = h("label", cls);
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "quiz-" + qi;
      input.value = opt;
      input.checked = state.quizAnswers[qi] === opt;
      input.disabled = locked;
      input.addEventListener("change", function () {
        state.quizAnswers[qi] = opt;
        if (lockBtn) lockBtn.disabled = !allAnswered();
      });
      label.appendChild(input);
      label.appendChild(h("span", null, opt));
      block.appendChild(label);
    });
    if (locked && state.quizAnswers[qi] !== qz.correct) {
      block.appendChild(h("p", "quiz-q__answer", "Doğru cevap: " + qz.correct));
    }
    card.appendChild(block);
  });

  if (!locked) {
    lockBtn = h("button", "btn", "Cevapları kilitle");
    lockBtn.type = "button";
    lockBtn.disabled = !allAnswered();
    lockBtn.addEventListener("click", function () {
      state.quizCorrect = c.quiz.filter(function (qz, qi) {
        return state.quizAnswers[qi] === qz.correct;
      }).length;
      state.quizScore = Math.round(10 * state.quizCorrect / c.quiz.length * 10) / 10;
      state.quizLocked = true;
      if (state.quizCorrect === c.quiz.length) sound.good(); else sound.bad();
      renderCard();
      renderCardNav();
    });
    card.appendChild(lockBtn);
  } else {
    card.appendChild(h("p", "card-done",
      state.quizCorrect + "/" + c.quiz.length + " doğru · +" + formatPoints(state.quizScore) + " puan"));
  }

  area.appendChild(card);
}

// ================= Kart: Eleme Masası =================

// Oyuncunun serbest gerekçe metnini şüphelinin anahtar kelimeleriyle eşleştirir.
function elimMatch(entry, text) {
  const nt = trNorm(text);
  if (!nt) return false;
  const keys = entry.keys || [];
  for (let i = 0; i < keys.length; i++) {
    const nk = trNorm(keys[i]);
    if (nk && nt.indexOf(nk) !== -1) return true;
  }
  return false;
}

function cardElimination(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Eleme Masası"));
  card.appendChild(h("p", "hint",
    "Katil kararından önce masayı temizle: her şüpheliyi neden elediğini KENDİ cümlenle yaz. "
    + "Dosyadaki somut bir gerçeğe dayanmalı (alibi, ayakkabı numarası, kamera kaydı...). "
    + "Gerekçe tutmazsa şüpheli elenmez, dosyaya yeniden bakarsın. Suçlu olduğuna inandığını "
    + "'elenemez' diye belirt. Herkes elenmeden karar kartı açılmaz."));

  const list = h("div", "elim-list");
  c.elimination.forEach(function (entry) {
    const suspect = c.suspects.find(function (s) { return s.id === entry.id; });
    const solved = !!state.elimSolved[entry.id];

    const row = h("div", "elim-row" + (solved ? " solved" : ""));
    row.appendChild(h("p", "elim-row__name", suspect.name + " — " + suspect.note));

    if (solved) {
      row.appendChild(h("p", "elim-row__done", "✓ " + entry.correct));
    } else {
      const controls = h("div", "elim-row__controls");
      const input = h("input", "elim-input");
      input.type = "text";
      input.placeholder = "Gerekçeni kendi cümlenle yaz...";
      input.value = state.elimDrafts[entry.id] || "";
      input.addEventListener("input", function () {
        state.elimDrafts[entry.id] = input.value;
      });
      const msg = h("span", "elim-row__msg");
      const btn = h("button", "btn btn--small", "Ele");
      btn.type = "button";
      function tryEliminate() {
        if (elimMatch(entry, input.value)) {
          state.elimSolved[entry.id] = true;
          sound.click();
          if (Object.keys(state.elimSolved).length === c.elimination.length
            && (!c.confrontation || !c.confrontation.length || state.confrontDone)) {
            state.elimDone = true;
            sound.good();
          }
          renderCard();
          renderCardNav();
        } else {
          sound.bad();
          msg.textContent = "Bu gerekçe tutmuyor; şüpheli elenemedi. Dosyadaki somut bir gerçeğe bak.";
          row.classList.remove("shake");
          void row.offsetWidth;
          row.classList.add("shake");
        }
      }
      btn.addEventListener("click", tryEliminate);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); tryEliminate(); }
      });
      controls.appendChild(input);
      controls.appendChild(btn);
      row.appendChild(controls);
      row.appendChild(msg);
    }
    list.appendChild(row);
  });
  card.appendChild(list);

  const allEliminated = Object.keys(state.elimSolved).length === c.elimination.length;

  if (allEliminated && c.confrontation && c.confrontation.length && !state.confrontDone) {
    card.appendChild(h("h4", "report__subhead", "Son Yüzleşme"));
    card.appendChild(h("p", "hint",
      "Masa temiz. Şimdi senaryoyu doğrula: her ifade için Doğru ya da Yanlış de. "
      + "Tümü cevaplanmadan karar kartı açılmaz."));

    const cfList = h("div", "confront-list");
    c.confrontation.forEach(function (st, si) {
      const row = h("div", "confront-row");
      row.appendChild(h("p", "confront-row__text", (si + 1) + ". " + st.statement));
      const controls = h("div", "confront-row__controls");
      [["Doğru", true], ["Yanlış", false]].forEach(function (pair) {
        const b = h("button", "btn btn--small", pair[0]);
        b.type = "button";
        b.addEventListener("click", function () {
          state.confrontAnswers[si] = pair[1];
          sound.click();
          if (Object.keys(state.confrontAnswers).length === c.confrontation.length) {
            state.confrontDone = true;
            state.elimDone = true;
            sound.good();
          }
          renderCard();
          renderCardNav();
        });
        controls.appendChild(b);
      });
      row.appendChild(controls);
      cfList.appendChild(row);
    });
    card.appendChild(cfList);
  } else if (allEliminated && c.confrontation && c.confrontation.length && state.confrontDone) {
    const cfList = h("div", "confront-list");
    c.confrontation.forEach(function (st, si) {
      const answered = state.confrontAnswers[si];
      const ok = answered === st.answer;
      const row = h("div", "confront-row answered");
      row.appendChild(h("p", "confront-row__text", (si + 1) + ". " + st.statement));
      row.appendChild(h("p", ok ? "confront-row__ok" : "confront-row__bad",
        (ok ? "✓ Doğru — " : "✗ Yanlış — ") + st.why));
      cfList.appendChild(row);
    });
    card.appendChild(cfList);
  }

  if (state.elimDone) {
    card.appendChild(h("p", "card-done", "Masa temiz ve senaryo doğrulandı. Karar kartı açık."));
  }

  area.appendChild(card);
}

// ================= Kart: Karar =================

let verdictRefs = null;

// Puan ağırlıkları: vaka başına toplam 100.
const WEIGHTS = { suspect: 40, cause: 25, motive: 20, evidence: 15 };

function cardVerdict(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Karar Dosyan"));

  if (state.resolved && state.resultNode) {
    card.appendChild(state.resultNode);
    const actions = h("div", "verdict-actions");
    const idx = caseIndexById(c.id);
    if (idx < CASES.length - 1) {
      const next = h("button", "btn", "Sıradaki dosya →");
      next.type = "button";
      next.addEventListener("click", function () { openCase(CASES[idx + 1].id); });
      actions.appendChild(next);
    }
    const back = h("button", "btn btn--ghost", "Arşive dön");
    back.type = "button";
    back.addEventListener("click", goLobby);
    actions.appendChild(back);
    card.appendChild(actions);
    area.appendChild(card);
    return;
  }

  card.appendChild(h("p", "hint",
    "Doğru ölüm nedenini, katili ve sebebi seç; kararını destekleyen kanıtları işaretle. "
    + "Yanlış kanıt seçimi puan düşürür."));

  const form = h("form", "verdict-form");

  form.appendChild(labelFor("cause-select", "Ölüm nedeni neydi?"));
  const causeSelect = h("select", null);
  causeSelect.id = "cause-select";
  causeSelect.name = "cause";
  c.deathCauses.forEach(function (cause) {
    causeSelect.appendChild(h("option", null, cause)).value = cause;
  });
  form.appendChild(causeSelect);

  form.appendChild(labelFor("suspect-select", "Katil kim?"));
  const suspectSelect = h("select", null);
  suspectSelect.id = "suspect-select";
  suspectSelect.name = "suspect";
  c.suspects.forEach(function (s) {
    const opt = h("option", null, s.name);
    opt.value = s.id;
    suspectSelect.appendChild(opt);
  });
  form.appendChild(suspectSelect);

  form.appendChild(labelFor("motive-select", "Katil neden yaptı?"));
  const motiveSelect = h("select", null);
  motiveSelect.id = "motive-select";
  motiveSelect.name = "motive";
  c.motives.forEach(function (motive) {
    motiveSelect.appendChild(h("option", null, motive)).value = motive;
  });
  form.appendChild(motiveSelect);

  const fieldset = document.createElement("fieldset");
  fieldset.className = "evidence-pick";
  const legend = h("legend");
  legend.appendChild(document.createTextNode("Bulduğun kanıtları kendin yaz "));
  legend.appendChild(h("span", "evidence-pick__warn", "Doğru kanıt puan, dosyada olmayan/yanlış kanıt puan düşürür. Her satıra bir kanıt."));
  fieldset.appendChild(legend);
  const evInput = document.createElement("textarea");
  evInput.className = "evidence-input";
  evInput.name = "evidence";
  evInput.rows = 4;
  evInput.placeholder = "örn.\nmasadaki spor ayakkabı çamuru\nyarım bardak çay";
  fieldset.appendChild(evInput);
  form.appendChild(fieldset);

  const submit = h("button", "btn", "Kararını ver");
  submit.type = "submit";

  const consensus = h("div", "team-consensus");
  form.appendChild(consensus);
  form.appendChild(submit);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.resolved) return;
    if (isTeam() && !teamAllConfirmed()) {
      openConfirm("Ekip onayı eksik", "Kararı mühürlemek için tüm dedektifler onay vermeli.", "Tamam", null);
      return;
    }
    netSend({
      t: "verdict",
      cause: causeSelect.value, suspect: suspectSelect.value,
      motive: motiveSelect.value, evidence: evInput.value
    });
    openConfirm(
      isTeam() ? "Ekip kararından emin misiniz?" : "Kararından emin misin?",
      "Dosya mühürlenecek ve geri açılmayacak.",
      "Evet, mühürle",
      resolveVerdict
    );
  });

  verdictRefs = {
    causeSelect: causeSelect,
    suspectSelect: suspectSelect,
    motiveSelect: motiveSelect,
    evidenceInput: evInput,
    submit: submit,
    consensus: consensus
  };
  renderTeamConsensus();

  card.appendChild(form);
  area.appendChild(card);
}

function labelFor(forId, text) {
  const label = h("label", null, text);
  label.setAttribute("for", forId);
  return label;
}

function trNorm(s) {
  return (s || "").toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9çğıöşüâîû ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Oyuncunun serbest satırını kanıt havuzuyla eşleştirir; en spesifik (en uzun)
// anahtarı tutan girdiyi döndürür, yoksa null.
function matchEvidence(c, line) {
  const nl = trNorm(line);
  if (!nl) return null;
  let best = null, bestLen = 0;
  c.verdictEvidence.forEach(function (ev) {
    (ev.keys || []).forEach(function (k) {
      const nk = trNorm(k);
      if (nk && nl.indexOf(nk) !== -1 && nk.length > bestLen) {
        best = ev; bestLen = nk.length;
      }
    });
  });
  return best;
}

// ================= Serbest sorgu =================

// Oyuncunun sorusunu şüphelinin cevap havuzuyla eşleştirir.
function matchFreeform(c, subject, question) {
  const pool = ((c.interrogation || {}).freeform || {})[subject] || [];
  const nq = trNorm(question);
  if (!nq) return null;
  let best = null, bestLen = 0;
  pool.forEach(function (qa, i) {
    (qa.keys || []).forEach(function (k) {
      const nk = trNorm(k);
      if (nk && nq.indexOf(nk) !== -1 && nk.length > bestLen) {
        best = { idx: i, qa: qa };
        bestLen = nk.length;
      }
    });
  });
  return best;
}

function askFreeform(c, question) {
  const subject = state.activeSuspect;
  const q = (question || "").trim();
  if (!q) return;
  const m = matchFreeform(c, subject, q);
  if (m) {
    state.freeQA[subject] = state.freeQA[subject] || [];
    if (state.freeQA[subject].indexOf(m.idx) === -1) {
      state.freeQA[subject].push(m.idx);
      netSend({ t: "freeqa", subject: subject, i: m.idx });
    }
    state.freeMiss = null;
    sound.click();
  } else {
    state.freeMiss = { subject: subject, q: q };
  }
  renderInterrogation(c);
}

function renderFreeform(container, c) {
  const subject = state.activeSuspect;
  const pool = ((c.interrogation || {}).freeform || {})[subject] || [];
  if (!pool.length) return;

  const box = h("div", "freeform-box");
  box.appendChild(h("p", "freeform-box__head", "Kendi sorunu sor"));

  const asked = state.freeQA[subject] || [];
  if (asked.length) {
    const log = h("div", "freeform-log");
    asked.forEach(function (i) {
      const qa = pool[i];
      if (!qa) return;
      const pair = h("div", "freeform-pair" + (qa.clue ? " has-clue" : ""));
      pair.appendChild(h("span", "freeform-pair__q", "Soru: " + qa.q));
      pair.appendChild(h("span", "freeform-pair__a", qa.a));
      log.appendChild(pair);
    });
    box.appendChild(log);
  }

  if (state.freeMiss && state.freeMiss.subject === subject) {
    box.appendChild(h("p", "freeform-miss",
      "'" + state.freeMiss.q + "' — şüpheli bu konuda konuşmuyor. Başka bir açıdan dene."));
  }

  const row = h("div", "freeform-box__row");
  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "freeform-box__input";
  inp.maxLength = 120;
  inp.placeholder = "Örn: o gece neredeydin, borç, anahtar...";
  const btn = h("button", "btn btn--small", "Sor");
  btn.type = "button";
  function fire() {
    askFreeform(c, inp.value);
    inp.value = "";
    inp.focus();
  }
  btn.addEventListener("click", fire);
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); fire(); } });
  row.appendChild(inp);
  row.appendChild(btn);
  box.appendChild(row);
  box.appendChild(h("p", "freeform-box__hint",
    "İpucu: sorgu tutanağında geçen konuları sor; her şüphelinin açılacak "
    + (pool.length - asked.length) + " cevabı kaldı."));

  container.appendChild(box);
}

function resolveVerdict() {
  if (state.resolved || !verdictRefs) return;
  const c = currentCase();

  const causeGuess = verdictRefs.causeSelect.value;
  const suspectGuess = verdictRefs.suspectSelect.value;
  const motiveGuess = verdictRefs.motiveSelect.value;

  const causeRight = causeGuess === c.deathCauseCorrect;
  const suspectRight = suspectGuess === c.culprit;
  const motiveRight = motiveGuess === c.motiveCorrect;

  const lines = verdictRefs.evidenceInput.value.split("\n")
    .map(function (t) { return t.trim(); })
    .filter(Boolean);

  const matchedOk = [];
  const reviewLines = [];
  let wrongCount = 0;
  lines.forEach(function (line) {
    const ev = matchEvidence(c, line);
    if (ev && ev.ok) {
      if (matchedOk.indexOf(ev) === -1) matchedOk.push(ev);
      reviewLines.push({ line: line, ok: true, why: ev.why });
    } else if (ev) {
      wrongCount++;
      reviewLines.push({ line: line, ok: false, why: ev.why });
    } else {
      wrongCount++;
      reviewLines.push({ line: line, ok: false, why: "Bu dosyada böyle bir kanıt kaydı yok." });
    }
  });

  const correctCount = matchedOk.length;
  const totalCorrect = c.verdictEvidence.filter(function (ev) { return ev.ok; }).length;
  const evidenceScore = Math.max(
    0,
    WEIGHTS.evidence * (correctCount - wrongCount) / totalCorrect
  );

  const timelinePts = state.timelineScore || 0;
  const quizPts = state.quizScore || 0;
  const scenePts = state.sceneScore || 0;

  const score = (causeRight ? WEIGHTS.cause : 0)
    + (suspectRight ? WEIGHTS.suspect : 0)
    + (motiveRight ? WEIGHTS.motive : 0)
    + evidenceScore
    + timelinePts
    + quizPts
    + scenePts;

  state.resolved = true;

  const culprit = c.suspects.find(function (s) { return s.id === c.culprit; });
  const solved = causeRight && suspectRight;
  const partial = causeRight || suspectRight;

  const result = h("div", "result " + (solved ? "correct" : (partial ? "partial" : "wrong")));

  const stamp = h("span", "stamp-verdict " + (solved ? "ok" : (partial ? "mid" : "bad")));
  stamp.textContent = solved ? "DOSYA KAPANDI" : (partial ? "KISMEN ÇÖZÜLDÜ" : "DOSYA AÇIK KALDI");
  result.appendChild(stamp);

  const report = h("table", "verdict-report");
  const thead = document.createElement("tr");
  ["", "Senin kararın", "Doğrusu", "Puan"].forEach(function (t) { thead.appendChild(h("th", null, t)); });
  report.appendChild(thead);

  function suspectName(id) {
    const s = c.suspects.find(function (x) { return x.id === id; });
    return s ? s.name : id;
  }

  function addRow(label, guess, correct, ok, points) {
    const tr = h("tr", ok ? "row-ok" : "row-bad");
    [label + (ok ? " ✓" : " ✗"), guess, correct, points].forEach(function (cell) {
      tr.appendChild(h("td", null, cell));
    });
    report.appendChild(tr);
  }

  addRow("Ölüm nedeni", causeGuess, c.deathCauseCorrect, causeRight,
    (causeRight ? WEIGHTS.cause : 0) + "/" + WEIGHTS.cause);
  addRow("Katil", suspectName(suspectGuess), culprit.name, suspectRight,
    (suspectRight ? WEIGHTS.suspect : 0) + "/" + WEIGHTS.suspect);
  addRow("Sebep", motiveGuess, c.motiveCorrect, motiveRight,
    (motiveRight ? WEIGHTS.motive : 0) + "/" + WEIGHTS.motive);
  addRow("Kanıt sunumu",
    lines.length ? correctCount + " doğru, " + wrongCount + " yanlış" : "Kanıt yazılmadı",
    totalCorrect + " doğru kanıt vardı",
    correctCount === totalCorrect && wrongCount === 0,
    formatPoints(evidenceScore) + "/" + WEIGHTS.evidence);
  addRow("Zaman çizelgesi",
    state.timelineCorrect + "/" + c.timeline.length + " olay doğru sırada",
    "Kronolojik sıra",
    state.timelineCorrect === c.timeline.length,
    formatPoints(timelinePts) + "/10");
  addRow("Çapraz analiz",
    state.quizCorrect + "/" + c.quiz.length + " soru doğru",
    "Tümü doğru",
    state.quizCorrect === c.quiz.length,
    formatPoints(quizPts) + "/10");
  addRow("Kanıt toplama",
    state.sceneSealed ? "Torba mühürlendi" : "Mühürlenmedi",
    "Gerçek kanıtları toplamak",
    scenePts === 10,
    formatPoints(scenePts) + "/10");

  const totalRow = h("tr", "row-total");
  const totalLabel = h("td", null, "TOPLAM");
  totalLabel.colSpan = 3;
  totalRow.appendChild(totalLabel);
  totalRow.appendChild(h("td", null, formatPoints(score) + "/130"));
  report.appendChild(totalRow);
  result.appendChild(report);

  if (reviewLines.length) {
    const review = h("ul", "evidence-review");
    reviewLines.forEach(function (r) {
      const li = h("li", r.ok ? "row-ok" : "row-bad");
      li.appendChild(h("span", "evidence-review__mark", r.ok ? "✓" : "✗"));
      const body = h("span");
      body.appendChild(h("strong", null, r.line + ": "));
      body.appendChild(document.createTextNode(r.why));
      li.appendChild(body);
      review.appendChild(li);
    });
    result.appendChild(review);
  }

  const missed = c.verdictEvidence.filter(function (ev) {
    return ev.ok && matchedOk.indexOf(ev) === -1;
  });
  if (missed.length) {
    result.appendChild(h("p", "evidence-missed",
      "Kaçırdığın doğru kanıtlar: " + missed.map(function (ev) { return ev.name; }).join(", ")));
  }

  const records = c.interrogation.records;
  const clueHits = state.marked.filter(function (i) { return records[i].clue; }).length;
  const totalClues = records.filter(function (r) { return r.clue; }).length;

  if (isTeam()) {
    const contrib = h("ul", "team-contrib");
    contrib.appendChild(h("li", "team-contrib__head", "Dedektif katkısı:"));
    state.players.forEach(function (p, pi) {
      const own = state.marked.filter(function (i) { return state.markedBy[i] === pi; });
      const real = own.filter(function (i) { return records[i] && records[i].clue; }).length;
      const li = h("li");
      li.appendChild(h("strong", null, p.name + " (" + p.role + "): "));
      li.appendChild(document.createTextNode(own.length + " işaret, " + real + " gerçek ipucu"));
      contrib.appendChild(li);
    });
    result.appendChild(contrib);
  }

  if (isTeam() && state.traitor != null && state.players[state.traitor]) {
    const traitorWin = !solved;
    result.appendChild(h("p", "team-traitor-reveal",
      "Köstebek " + state.players[state.traitor].name + " idi. " +
      (traitorWin ? "Ekip çözemediği için köstebek kazandı!" : "Ekip çözdü; köstebek kaybetti.")));
  }

  let text = "İşaretlediğin " + state.marked.length + " satırdan " + clueHits
    + " tanesi gerçekten ipucuydu (toplam " + totalClues + " ipucu saklıydı). ";
  if (solved) {
    text += "Mükemmel! Hem ölüm nedenini (" + causeGuess + ") hem katili ("
      + culprit.name + ") buldun. " + c.solution;
  } else if (causeRight) {
    text += "Ölüm nedeni doğru (" + causeGuess + ") ama sanık yanlış. Gerçek katil "
      + culprit.name + " idi. " + c.solution;
  } else if (suspectRight) {
    text += "Katili buldun (" + culprit.name + ") ama ölüm nedeni yanlış. Doğrusu: "
      + c.deathCauseCorrect + ". " + c.solution;
  } else {
    text += "İkisinde de yanıldın. Doğru ölüm nedeni: " + c.deathCauseCorrect
      + "; katil: " + culprit.name + ". " + c.solution;
  }
  result.appendChild(h("p", "result__text", text));

  state.resultNode = result;

  const progress = loadProgress();
  const prev = progress.cases[c.id];
  const rec = {
    score: Math.round(score * 10) / 10,
    solved: solved,
    partial: partial,
    at: Date.now()
  };
  progress.cases[c.id] = prev && prev.score >= rec.score ? prev : rec;
  grantAchievements(progress, c, {
    solved: solved,
    verdictPerfect: causeRight && suspectRight && motiveRight
      && matchedOk.length === totalCorrect && wrongCount === 0,
    allClues: totalClues > 0 && clueHits === totalClues && state.marked.length === totalClues,
    modeId: state.modeId
  });
  saveProgress(progress);
  clearCaseSave(c.id);
  sound.stamp();
  setTimeout(function () { if (solved) sound.good(); else sound.bad(); }, 350);
  renderRankBadge();

  verdictRefs = null;
  renderCard();
  renderTabs();
}

const CARD_RENDERERS = {
  brief: cardBrief,
  scene: cardScene,
  csi: cardCsi,
  autopsy: cardAutopsy,
  interrogation: cardInterrogation,
  timeline: cardTimeline,
  quiz: cardQuiz,
  elimination: cardElimination,
  verdict: cardVerdict
};

// ================= Not Defteri çekmecesi =================

const NOTES_KEY = "elagency-notes";

function loadNotes() {
  try {
    const data = JSON.parse(localStorage.getItem(NOTES_KEY));
    return data && typeof data === "object" ? data : {};
  } catch (err) {
    return {};
  }
}

function saveNote(caseId, text) {
  try {
    const notes = loadNotes();
    if (text) notes[caseId] = text;
    else delete notes[caseId];
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (err) {
    // depolama yoksa sessiz geç
  }
}

function updateNoteCount() {
  el.noteCount.textContent = String(state.marked.length);
}

function renderDrawer() {
  el.drawerList.innerHTML = "";
  const c = currentCase();
  const records = c ? c.interrogation.records : [];

  state.marked.forEach(function (i) {
    const row = records[i];
    if (!row) return;
    const li = h("li", "drawer-item");
    li.setAttribute("data-idx", i);
    const body = h("p", "drawer-item__text");
    body.appendChild(h("strong", null, row.speaker + ": "));
    body.appendChild(document.createTextNode(row.text));
    li.appendChild(body);
    if (isTeam() && state.markedBy[i] != null && state.players[state.markedBy[i]]) {
      li.appendChild(h("span", "drawer-item__by", state.players[state.markedBy[i]].name));
    }
    if (state.net) {
      const ping = h("button", "drawer-item__ping", "⚡");
      ping.type = "button";
      ping.title = "Takıma bu kanıtı vurgula";
      ping.addEventListener("click", function () { netSend({ t: "ping", i: i }); flashPing(i); });
      li.appendChild(ping);
    }
    if (!state.resolved) {
      const del = h("button", "drawer-item__del", "✕");
      del.type = "button";
      del.setAttribute("aria-label", "İşareti kaldır");
      del.addEventListener("click", function () { toggleMark(i); });
      li.appendChild(del);
    }
    el.drawerList.appendChild(li);
  });
  el.drawerEmpty.hidden = state.marked.length > 0;
  if (el.chatPanel) el.chatPanel.classList.toggle("hidden", !state.net);

  if (el.drawerNotes) {
    el.drawerNotes.remove();
    el.drawerNotes = null;
  }
  if (c) {
    const notes = h("div", "drawer-notes");
    notes.appendChild(h("h4", "drawer-notes__head", "Kendi notların"));
    const ta = document.createElement("textarea");
    ta.className = "drawer-notes__input";
    ta.rows = 5;
    ta.placeholder = "Çıkarımlarını, saatleri, şüphelerini buraya yaz...";
    ta.value = loadNotes()[c.id] || "";
    ta.addEventListener("input", function () { saveNote(c.id, ta.value); });
    notes.appendChild(ta);
    notes.appendChild(h("p", "drawer-notes__hint", "Notlar bu tarayıcıda saklanır; dosyayı kapatsan da kalır."));
    el.drawerBody.appendChild(notes);
    el.drawerNotes = notes;
  }
}

function openDrawer() {
  state.drawerOpen = true;
  renderDrawer();
  el.drawer.classList.add("open");
  el.drawer.setAttribute("aria-hidden", "false");
  el.drawerBackdrop.classList.remove("hidden");
}

function closeDrawer() {
  state.drawerOpen = false;
  el.drawer.classList.remove("open");
  el.drawer.setAttribute("aria-hidden", "true");
  el.drawerBackdrop.classList.add("hidden");
}

el.drawerBtn.addEventListener("click", function () {
  if (state.drawerOpen) { closeDrawer(); } else { openDrawer(); }
});
el.drawerClose.addEventListener("click", closeDrawer);
el.drawerBackdrop.addEventListener("click", closeDrawer);

// ================= Olay yeri krokisi =================

function svgEl(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}

function planLine(g, x1, y1, x2, y2, cls) {
  const l = svgEl("line");
  l.setAttribute("x1", x1); l.setAttribute("y1", y1);
  l.setAttribute("x2", x2); l.setAttribute("y2", y2);
  l.setAttribute("class", cls);
  g.appendChild(l);
  return l;
}

function planRect(g, cx, cy, w, h, cls, rx) {
  const r = svgEl("rect");
  r.setAttribute("x", cx - w / 2); r.setAttribute("y", cy - h / 2);
  r.setAttribute("width", w); r.setAttribute("height", h);
  if (rx) r.setAttribute("rx", rx);
  r.setAttribute("class", cls);
  g.appendChild(r);
  return r;
}

function planCircle(g, cx, cy, r, cls) {
  const c = svgEl("circle");
  c.setAttribute("cx", cx); c.setAttribute("cy", cy);
  c.setAttribute("r", r);
  c.setAttribute("class", cls);
  g.appendChild(c);
  return c;
}

function planEllipse(g, cx, cy, rx, ry, cls, rot) {
  const e = svgEl("ellipse");
  e.setAttribute("cx", cx); e.setAttribute("cy", cy);
  e.setAttribute("rx", rx); e.setAttribute("ry", ry);
  if (rot) e.setAttribute("transform", "rotate(" + rot + " " + cx + " " + cy + ")");
  e.setAttribute("class", cls);
  g.appendChild(e);
  return e;
}

function planPath(g, d, cls) {
  const p = svgEl("path");
  p.setAttribute("d", d);
  p.setAttribute("class", cls);
  g.appendChild(p);
  return p;
}

function planText(g, x, y, str, cls, size, anchor) {
  const t = svgEl("text");
  t.setAttribute("x", x); t.setAttribute("y", y);
  t.setAttribute("class", cls);
  t.setAttribute("font-size", size);
  t.setAttribute("text-anchor", anchor || "middle");
  t.textContent = str;
  g.appendChild(t);
  return t;
}

// Duvar ekseni: "K" kuzey (üst) vb. pt(u, n) → duvar boyunca u metre,
// içeri doğru n metre içerideki noktanın (x, y) koordinatları.
function wallAxis(wall, plan) {
  const w = plan.w, d = plan.d;
  switch (wall) {
    case "K": return { pt: function (u, n) { return [u, n]; }, len: w, out: [0, -1] };
    case "G": return { pt: function (u, n) { return [u, d - n]; }, len: w, out: [0, 1] };
    case "B": return { pt: function (u, n) { return [n, u]; }, len: d, out: [-1, 0] };
    default:  return { pt: function (u, n) { return [w - n, u]; }, len: d, out: [1, 0] };
  }
}

function drawWalls(svg, plan) {
  const byWall = { K: [], G: [], B: [], D: [] };
  (plan.features || []).forEach(function (ft) {
    if (ft.wall && byWall[ft.wall]) byWall[ft.wall].push(ft);
  });

  ["K", "G", "B", "D"].forEach(function (wall) {
    const axis = wallAxis(wall, plan);
    const feats = byWall[wall].slice().sort(function (a, b) { return a.from - b.from; });

    let cursor = 0;
    feats.forEach(function (ft) {
      if (ft.from > cursor) {
        const a = axis.pt(cursor, 0), b = axis.pt(ft.from, 0);
        planLine(svg, a[0], a[1], b[0], b[1], "plan-wall");
      }
      cursor = Math.max(cursor, ft.to);
    });
    if (cursor < axis.len) {
      const a = axis.pt(cursor, 0), b = axis.pt(axis.len, 0);
      planLine(svg, a[0], a[1], b[0], b[1], "plan-wall");
    }

    feats.forEach(function (ft) {
      if (ft.kind === "window") {
        [0.07, -0.07].forEach(function (n) {
          const a = axis.pt(ft.from, n), b = axis.pt(ft.to, n);
          planLine(svg, a[0], a[1], b[0], b[1], "plan-window");
        });
      } else if (ft.kind === "door") {
        const L = ft.to - ft.from;
        const nDir = ft.swing === "out" ? -1 : 1;
        const hingeU = ft.hinge === "to" ? ft.to : ft.from;
        const otherU = ft.hinge === "to" ? ft.from : ft.to;
        const H = axis.pt(hingeU, 0);
        const T = axis.pt(hingeU, nDir * L);
        const E = axis.pt(otherU, 0);
        planLine(svg, H[0], H[1], T[0], T[1], "plan-door");
        const tx = T[0] - H[0], ty = T[1] - H[1];
        const ex = E[0] - H[0], ey = E[1] - H[1];
        const sweep = (tx * ey - ty * ex) > 0 ? 1 : 0;
        planPath(svg, "M" + T[0] + "," + T[1] + " A" + L + "," + L + " 0 0 " + sweep + " " + E[0] + "," + E[1], "plan-door plan-door--arc");
      }

      if (ft.label) {
        const mid = axis.pt((ft.from + ft.to) / 2, 0);
        const horiz = axis.out[1] !== 0;
        const lx = horiz ? mid[0] : mid[0] + axis.out[0] * 0.5;
        const ly = horiz ? mid[1] + (axis.out[1] < 0 ? -0.5 : 0.72) : mid[1] + 0.1;
        const anchor = horiz ? "middle" : (axis.out[0] < 0 ? "end" : "start");
        planText(svg, lx, ly, ft.label, "plan-feature-label", 0.46, anchor);
      }
    });
  });
}

function drawPlanChrome(svg, plan, f) {
  const w = plan.w, d = plan.d;

  for (let x = 1; x < w; x++) planLine(svg, x, 0, x, d, "plan-grid");
  for (let y = 1; y < d; y++) planLine(svg, 0, y, w, y, "plan-grid");

  if (!plan.enclosed) {
    planRect(svg, w / 2, d / 2, w, d, "plan-boundary");
  }

  (plan.features || []).forEach(function (ft) {
    if (ft.kind === "line") planLine(svg, ft.x1, ft.y1, ft.x2, ft.y2, "plan-line");
  });

  const dy = -0.95 * f;
  planLine(svg, 0, dy, w, dy, "plan-dim");
  planLine(svg, 0, dy - 0.14 * f, 0, dy + 0.14 * f, "plan-dim");
  planLine(svg, w, dy - 0.14 * f, w, dy + 0.14 * f, "plan-dim");
  planText(svg, w / 2, dy - 0.2 * f, w + " m", "plan-dim-text", 0.36 * f);

  const dx = -0.95 * f;
  planLine(svg, dx, 0, dx, d, "plan-dim");
  planLine(svg, dx - 0.14 * f, 0, dx + 0.14 * f, 0, "plan-dim");
  planLine(svg, dx - 0.14 * f, d, dx + 0.14 * f, d, "plan-dim");
  const dt = planText(svg, dx - 0.24 * f, d / 2, d + " m", "plan-dim-text", 0.36 * f);
  dt.setAttribute("transform", "rotate(-90 " + (dx - 0.24 * f) + " " + (d / 2) + ")");

  const nx = w + 0.85 * f, ny = -0.45 * f, nr = 0.42 * f;
  planCircle(svg, nx, ny, nr, "plan-compass");
  planPath(svg, "M" + nx + "," + (ny + nr * 0.62) + " L" + nx + "," + (ny - nr * 0.62), "plan-compass plan-compass--needle");
  planPath(svg, "M" + nx + "," + (ny - nr * 0.62) +
    " L" + (nx - nr * 0.3) + "," + (ny - nr * 0.05) +
    " L" + (nx + nr * 0.3) + "," + (ny - nr * 0.05) + " Z", "plan-compass plan-compass--head");
  planText(svg, nx, ny - nr - 0.16 * f, "K", "plan-compass-text", 0.44 * f);

  const sy = d + 0.95 * f, sl = Math.min(2, w);
  planLine(svg, 0, sy, sl, sy, "plan-dim");
  for (let m = 0; m <= sl; m++) {
    planLine(svg, m, sy - 0.12 * f, m, sy + 0.12 * f, "plan-dim");
    planText(svg, m, sy + 0.44 * f, m === sl ? m + " m" : String(m), "plan-dim-text", 0.3 * f);
  }
}

// Nesne çizimleri: her form, merkez (0,0) kabulüyle çizilir.
const PLAN_FORMS = {
  desk: function (g, o) {
    const w = o.w || 1.6, h = o.h || 0.8;
    planRect(g, 0, 0, w, h, "plan-furniture plan-furniture--desk", 0.05);
    planRect(g, 0, 0, w - 0.16, h - 0.16, "plan-detail", 0.03);
  },
  shelf: function (g, o) {
    const w = o.w || 0.5, h = o.h || 2;
    planRect(g, 0, 0, w, h, "plan-furniture plan-furniture--shelf", 0.02);
    for (let y = -h / 2 + 0.55; y < h / 2 - 0.2; y += 0.55) {
      planLine(g, -w / 2 + 0.04, y, w / 2 - 0.04, y, "plan-detail");
    }
  },
  chair: function (g, o, s) {
    s = s || 0.5;
    planRect(g, 0, 0.04 * s / 0.5, s, s * 0.86, "plan-furniture", 0.06);
    planRect(g, 0, -s / 2 + 0.05, s, 0.1, "plan-furniture plan-furniture--back", 0.03);
  },
  "chair-fallen": function (g, o) {
    const s = o.w || 0.5;
    planCircle(g, 0, 0, s * 0.95, "plan-detail plan-detail--dashed");
    const inner = svgEl("g");
    inner.setAttribute("transform", "rotate(" + (o.rot || 70) + ")");
    PLAN_FORMS.chair(inner, o, s);
    g.appendChild(inner);
  },
  car: function (g, o) {
    const w = o.w || 1.9, h = o.h || 4.6;
    const hw = w / 2, hh = h / 2;

    const body = svgEl("path");
    body.setAttribute("d",
      "M0," + (-hh)
      + " C" + (w * 0.36) + "," + (-hh) + " " + hw + "," + (-hh + h * 0.14) + " " + hw + "," + (-hh + h * 0.26)
      + " L" + hw + "," + (hh - h * 0.16)
      + " C" + hw + "," + (hh - h * 0.05) + " " + (w * 0.3) + "," + hh + " 0," + hh
      + " C" + (-w * 0.3) + "," + hh + " " + (-hw) + "," + (hh - h * 0.05) + " " + (-hw) + "," + (hh - h * 0.16)
      + " L" + (-hw) + "," + (-hh + h * 0.26)
      + " C" + (-hw) + "," + (-hh + h * 0.14) + " " + (-w * 0.36) + "," + (-hh) + " 0," + (-hh) + " Z");
    body.setAttribute("class", "plan-furniture plan-furniture--car");
    g.appendChild(body);

    const wy = -hh + h * 0.3;
    planPath(g, "M" + (-hw + 0.16) + "," + wy + " Q0," + (wy + 0.26) + " " + (hw - 0.16) + "," + wy, "plan-detail");
    const ry = hh - h * 0.22;
    planPath(g, "M" + (-hw + 0.18) + "," + ry + " Q0," + (ry - 0.24) + " " + (hw - 0.18) + "," + ry, "plan-detail");
    planRect(g, 0, h * 0.03, w - 0.62, h * 0.36, "plan-detail", 0.22);

    planRect(g, -hw - 0.1, wy + 0.06, 0.16, 0.12, "plan-furniture", 0.04);
    planRect(g, hw + 0.1, wy + 0.06, 0.16, 0.12, "plan-furniture", 0.04);
  },
  // Oturur halde ceset: üstten, baş + gövde + iki kol + öne uzanan iki bacak.
  "body-seat": function (g) {
    planEllipse(g, -0.12, -0.42, 0.07, 0.24, "plan-body", 6);    // sol bacak (öne)
    planEllipse(g, 0.12, -0.42, 0.07, 0.24, "plan-body", -6);    // sağ bacak (öne)
    planEllipse(g, -0.28, -0.06, 0.05, 0.24, "plan-body", 30);   // sol kol
    planEllipse(g, 0.28, -0.06, 0.05, 0.24, "plan-body", -30);   // sağ kol
    planRect(g, 0, 0, 0.42, 0.44, "plan-body", 0.16);            // gövde
    planCircle(g, 0, -0.3, 0.14, "plan-body plan-body--head");   // baş
  },
  // Yatar halde ceset: üstten, kafa + gövde + iki kol + iki bacak (~1.7 m).
  body: function (g, o) {
    planCircle(g, 0, -0.7, 0.15, "plan-body plan-body--head");   // baş
    planEllipse(g, -0.3, -0.22, 0.06, 0.3, "plan-body", 18);     // sol kol
    planEllipse(g, 0.3, -0.22, 0.06, 0.3, "plan-body", -18);     // sağ kol
    planRect(g, 0, -0.25, 0.46, 0.6, "plan-body", 0.18);         // gövde
    planEllipse(g, -0.12, 0.45, 0.08, 0.42, "plan-body", 4);     // sol bacak
    planEllipse(g, 0.12, 0.45, 0.08, 0.42, "plan-body", -4);     // sağ bacak
  },
  cup: function (g) {
    planCircle(g, 0, 0, 0.14, "plan-small");
    planPath(g, "M0.13,-0.07 A0.1,0.1 0 1 1 0.13,0.07", "plan-detail");
  },
  patch: function (g, o) {
    const w = o.w || 1, h = o.h || 1;
    const e = svgEl("ellipse");
    e.setAttribute("cx", 0); e.setAttribute("cy", 0);
    e.setAttribute("rx", w / 2); e.setAttribute("ry", h / 2);
    e.setAttribute("class", "plan-patch");
    g.appendChild(e);
    [[-w * 0.22, -h * 0.28], [w * 0.05, -h * 0.05], [-w * 0.1, h * 0.18], [w * 0.2, h * 0.32]].forEach(function (p) {
      const fp = svgEl("ellipse");
      fp.setAttribute("cx", p[0]); fp.setAttribute("cy", p[1]);
      fp.setAttribute("rx", 0.09); fp.setAttribute("ry", 0.15);
      fp.setAttribute("transform", "rotate(18 " + p[0] + " " + p[1] + ")");
      fp.setAttribute("class", "plan-detail");
      g.appendChild(fp);
    });
  },
  box: function (g, o) {
    const w = o.w || 0.4, h = o.h || 0.3;
    planRect(g, 0, 0, w, h, "plan-furniture", 0.03);
    planCircle(g, 0, 0, 0.045, "plan-detail");
  },
  paper: function (g, o) {
    const w = o.w || 0.45, h = o.h || 0.34;
    const inner = svgEl("g");
    inner.setAttribute("transform", "rotate(7)");
    planRect(inner, 0, 0, w, h, "plan-furniture plan-furniture--paper", 0.02);
    planLine(inner, 0, -h / 2 + 0.03, 0, h / 2 - 0.03, "plan-detail");
    g.appendChild(inner);
  },
  blanket: function (g, o) {
    const w = o.w || 1.2, h = o.h || 0.6;
    planRect(g, 0, 0, w, h, "plan-furniture plan-furniture--paper", 0.16);
    planLine(g, -w / 6, -h / 2 + 0.06, -w / 6, h / 2 - 0.06, "plan-detail");
    planLine(g, w / 6, -h / 2 + 0.06, w / 6, h / 2 - 0.06, "plan-detail");
  },
  cap: function (g) {
    planCircle(g, 0, 0, 0.15, "plan-small");
    planLine(g, -0.08, 0, 0.08, 0, "plan-detail");
    planLine(g, 0, -0.08, 0, 0.08, "plan-detail");
  },
  mirror: function (g, o) {
    planRect(g, 0, 0, o.w || 0.3, o.h || 0.14, "plan-small", 0.05);
  }
};

function markerPos(o) {
  if (o.mx != null && o.my != null) return { x: o.mx, y: o.my };
  const hw = (o.w || 0.55) / 2, hh = (o.h || 0.55) / 2;
  if (Math.max(hw, hh) > 0.6) return { x: o.x + hw * 0.55, y: o.y - hh * 0.55 };
  return { x: o.x + hw + 0.5, y: o.y - hh - 0.4 };
}

// Temiz, teknik numaralı işaretçi (kanıt numarası)
function drawMarker(g, x, y, num, f) {
  const r = 0.2 * f;
  planCircle(g, x, y, r, "plan-marker");
  planText(g, x, y + r * 0.45, num, "plan-marker-num", 0.28 * f);
}

function buildSceneFigure(scene, onPickChange) {
  const plan = scene.plan;
  const objects = scene.objects;
  const w = plan.w, d = plan.d;
  const f = Math.max(1, Math.max(w, d) / 9);
  const collectMode = objects.some(function (o) { return o.real !== undefined; });

  const fig = h("figure", "scene-figure");
  const head = h("figcaption", "scene-figure__head");
  head.appendChild(h("span", "scene-figure__title", "Olay Yeri Krokisi"));
  head.appendChild(h("span", "scene-figure__meta", plan.caption + "  •  " + w + "×" + d + " m  •  Kuzey yukarıda"));
  fig.appendChild(head);

  const planBox = h("div", "scene-plan");
  planBox.setAttribute("aria-label", "Olay yeri krokisi: " + plan.caption);
  const stamp = h("div", "plan-stamp", "OLAY YERİ — GİZLİ");
  stamp.setAttribute("aria-hidden", "true");
  const legend = h("ol", "plan-legend");
  fig.appendChild(planBox);
  fig.appendChild(stamp);
  fig.appendChild(legend);
  fig.appendChild(h("p", "hint", collectMode && !state.sceneSealed
    ? "Kanıtları topla: krokideki numaralı öğelere TIKLA — gerçek kanıt olduğunu düşündüklerini torbaya ekle, "
      + "yanlışlıkla eklediklerine tekrar tıklayıp çıkar. Dikkat, her öğe kanıt değildir; yanıltıcı olanlar da var. "
      + "Bitirince aşağıdaki 'Kanıtları Mühürle' butonuna bas. Doğru kanıtlar puan kazandırır, yanıltıcı öğeler puan düşürür."
    : "Krokideki numaralı öğelerin ya da listedeki maddelerin üzerine gel: eşleşen öğe vurgulanır."));

  const svg = svgEl("svg");
  const padX = 1.6 * f, padTop = 1.5 * f, padBot = 1.6 * f;
  svg.setAttribute("viewBox", (-padX) + " " + (-padTop) + " " + (w + padX * 2) + " " + (d + padTop + padBot));
  svg.setAttribute("class", "plan-svg");

  drawPlanChrome(svg, plan, f);
  if (plan.enclosed) drawWalls(svg, plan);

  const items = [];
  objects.forEach(function (o, i) {
    const g = svgEl("g");
    g.setAttribute("class", "plan-item");
    g.setAttribute("data-i", i);
    if (o.real !== undefined) {
      g.classList.add("pickable");
      if (state.scenePicks[i]) g.classList.add("picked");
    }

    const tip = svgEl("title");
    tip.textContent = o.label + (o.label2 ? " — " + o.label2 : "");
    g.appendChild(tip);

    const shape = svgEl("g");
    shape.setAttribute("transform", "translate(" + o.x + " " + o.y + ")");
    const drawer = PLAN_FORMS[o.form];
    if (drawer) {
      drawer(shape, o);
    } else {
      const inner = svgEl("g");
      if (o.rot) inner.setAttribute("transform", "rotate(" + o.rot + ")");
      planRect(inner, 0, 0, o.w || 0.5, o.h || 0.5, "plan-furniture", 0.04);
      shape.appendChild(inner);
    }
    g.appendChild(shape);

    const m = markerPos(o);
    const dist = Math.sqrt((m.x - o.x) * (m.x - o.x) + (m.y - o.y) * (m.y - o.y));
    if (dist > 0.55) planLine(g, m.x, m.y, o.x, o.y, "plan-leader");

    drawMarker(g, m.x, m.y, String(i + 1), f);

    svg.appendChild(g);
    items.push(g);
  });

  planBox.appendChild(svg);

  const lis = [];
  objects.forEach(function (o, i) {
    const li = document.createElement("li");
    li.setAttribute("data-i", i);
    li.appendChild(h("span", "plan-legend__num", String(i + 1)));

    const text = h("span", "plan-legend__text");
    text.appendChild(h("strong", null, o.label));
    if (o.label2) {
      text.appendChild(document.createTextNode(" — "));
      text.appendChild(h("em", "plan-legend__sub", o.label2));
    }
    li.appendChild(text);

    li.tabIndex = 0;
    legend.appendChild(li);
    lis.push(li);
  });

  function setHot(i, onn) {
    items[i].classList.toggle("hot", onn);
    lis[i].classList.toggle("hot", onn);
    svg.classList.toggle("has-hot", onn);
  }
  function togglePick(i) {
    if (objects[i].real === undefined || state.sceneSealed) return;
    if (state.scenePicks[i]) {
      delete state.scenePicks[i];
    } else {
      state.scenePicks[i] = true;
    }
    const on = !!state.scenePicks[i];
    items[i].classList.toggle("picked", on);
    lis[i].classList.toggle("picked", on);
    if (onPickChange) onPickChange();
  }
  items.forEach(function (g, i) {
    g.addEventListener("mouseenter", function () { setHot(i, true); });
    g.addEventListener("mouseleave", function () { setHot(i, false); });
    lis[i].addEventListener("mouseenter", function () { setHot(i, true); });
    lis[i].addEventListener("mouseleave", function () { setHot(i, false); });
    lis[i].addEventListener("focus", function () { setHot(i, true); });
    lis[i].addEventListener("blur", function () { setHot(i, false); });
    g.addEventListener("click", function () { togglePick(i); });
    lis[i].addEventListener("click", function () { togglePick(i); });
  });

  return fig;
}

// ================= Anatomi figürleri =================

const BODY = {
  canvasW: 140,
  canvasH: 300
};

// Kurbanın boy/kilo bilgisinden vücut yapısı ölçeği üretir.
function bodyScale(caseData) {
  const v = (caseData && caseData.autopsy && caseData.autopsy.victim) || {};
  if (!v.height || !v.weight) return { t: 1, l: 1 };
  const bulk = v.weight / (v.height / 100);
  const t = Math.max(0.9, Math.min(1.1, bulk / 40));
  return { t: t, l: 0.85 + 0.15 * t };
}

function pathEl(d, cls) {
  const p = svgEl("path");
  p.setAttribute("d", d);
  p.setAttribute("class", cls);
  return p;
}

// Ön (anterior) görünüm, anatomik pozisyon — t=1 taban koordinatları.
const FIG = {
  head: "M70,9.2 C76.8,9.2 81.2,14.2 81.2,20.8 C81.2,24.6 80.2,27.8 78.4,30.1 "
    + "C77.6,33 75.8,35.8 73.4,37 C72.2,37.6 67.8,37.6 66.6,37 "
    + "C64.2,35.8 62.4,33 61.6,30.1 C59.8,27.8 58.8,24.6 58.8,20.8 C58.8,14.2 63.2,9.2 70,9.2 Z",
  neck: "M65.4,36.6 L64.7,45.2 C64.7,47.6 66.2,48.8 70,48.8 C73.8,48.8 75.3,47.6 75.3,45.2 "
    + "L74.6,36.6 C73.2,37.5 66.8,37.5 65.4,36.6 Z",
  torso: "M70,47.6 C66,47.9 64.8,48.4 63.8,49.2 C60,50.4 55.4,52 52.6,55.2 "
    + "C50.8,57.4 50.6,60.6 51.4,63.4 C52.2,66 53,67.4 53.4,69 "
    + "C52.8,76 53.4,84 55,91 C56.2,96.4 57,99 57.4,101.6 "
    + "C57.8,108 56.2,113 54.8,117.6 C53.8,121 53.8,124.6 55.2,127.4 "
    + "C57,130.8 62,133 70,133.2 "
    + "C78,133 83,130.8 84.8,127.4 C86.2,124.6 86.2,121 85.2,117.6 "
    + "C83.8,113 82.2,108 82.6,101.6 C83,99 83.8,96.4 85,91 "
    + "C86.6,84 87.2,76 86.6,69 C87,67.4 87.8,66 88.6,63.4 "
    + "C89.4,60.6 89.2,57.4 87.4,55.2 C84.6,52 80,50.4 76.2,49.2 "
    + "C75.2,48.4 74,47.9 70,47.6 Z",
  armL: "M52,54 C49.4,56.6 48.1,60.2 48.4,64.1 C48.6,68.6 48,73.6 47.2,78.6 "
    + "C46.6,82.6 46.3,86.1 46.6,89.6 C46.9,94.1 46.3,99.1 45.7,104.1 "
    + "C45.3,107.6 45.1,110.6 45.3,113.1 C44.5,114.6 44,116.6 44.3,118.9 "
    + "C44.7,121.6 45.6,124.4 47,126 C48.5,127.3 50.2,126.9 50.8,125.2 "
    + "C51.4,123.2 51.4,120.4 51.1,117.9 C50.9,115.9 51.2,113.9 51.7,111.9 "
    + "C52.5,106.9 53.1,101.4 53.4,95.9 C53.7,91.4 54,87.9 53.8,84.4 "
    + "C53.6,79.4 54.1,72.9 54.9,67.4 C55.4,63.9 54.9,59.4 53.4,56.2 "
    + "C53,55.3 52.5,54.6 52,54 Z",
  armR: "M88,54 C90.6,56.6 91.9,60.2 91.6,64.1 C91.4,68.6 92,73.6 92.8,78.6 "
    + "C93.4,82.6 93.7,86.1 93.4,89.6 C93.1,94.1 93.7,99.1 94.3,104.1 "
    + "C94.7,107.6 94.9,110.6 94.7,113.1 C95.5,114.6 96,116.6 95.7,118.9 "
    + "C95.3,121.6 94.4,124.4 93,126 C91.5,127.3 89.8,126.9 89.2,125.2 "
    + "C88.6,123.2 88.6,120.4 88.9,117.9 C89.1,115.9 88.8,113.9 88.3,111.9 "
    + "C87.5,106.9 86.9,101.4 86.6,95.9 C86.3,91.4 86,87.9 86.2,84.4 "
    + "C86.4,79.4 85.9,72.9 85.1,67.4 C84.6,63.9 85.1,59.4 86.6,56.2 "
    + "C87,55.3 87.5,54.6 88,54 Z",
  legL: "M55.6,126.4 C57.4,131 58.6,138 59.2,146 C59.8,154 59.6,163 59,171 "
    + "C58.6,176 58.8,181 59.4,187 C60,195 60.4,203 60.6,210 "
    + "C60.7,215 61,219 61.6,222.4 C60.6,226 58.4,229.4 55.4,231.6 "
    + "C53.8,232.8 53.2,234.2 54.2,235.2 L65.8,235.4 "
    + "C67.2,235.4 67.8,234.4 67.6,233 C67.2,230 66.8,226.6 66.4,223.4 "
    + "C66,219 66,215 66.2,210 C66.6,203 67.2,195 67.8,187.6 "
    + "C68.2,181 68.4,176 68,171.4 C67.6,163 68,154 68.8,146.4 "
    + "C69.4,139.4 69.8,134 69.6,130.6 C66,132.4 60.6,130.4 55.6,126.4 Z",
  legR: "M84.4,126.4 C82.6,131 81.4,138 80.8,146 C80.2,154 80.4,163 81,171 "
    + "C81.4,176 81.2,181 80.6,187 C80,195 79.6,203 79.4,210 "
    + "C79.3,215 79,219 78.4,222.4 C79.4,226 81.6,229.4 84.6,231.6 "
    + "C86.2,232.8 86.8,234.2 85.8,235.2 L74.2,235.4 "
    + "C72.8,235.4 72.2,234.4 72.4,233 C72.8,230 73.2,226.6 73.6,223.4 "
    + "C74,219 74,215 73.8,210 C73.4,203 72.8,195 72.2,187.6 "
    + "C71.8,181 71.6,176 72,171.4 C72.4,163 72,154 71.2,146.4 "
    + "C70.6,139.4 70.2,134 70.4,130.6 C74,132.4 79.4,130.4 84.4,126.4 Z"
};

function scaledGroup(t) {
  const g = svgEl("g");
  g.setAttribute("transform", "translate(" + (70 * (1 - t)) + ",0) scale(" + t + ",1)");
  return g;
}

// "Dış yüzey" figürü: adli tıp şeması tarzında ön görünüm, anatomik pozisyon.
function buildExternalFigure(markers, caseData) {
  const svg = svgEl("svg");
  svg.setAttribute("viewBox", "-18 0 " + (BODY.canvasW + 36) + " " + BODY.canvasH);
  svg.setAttribute("class", "anatomy-svg");
  const t = bodyScale(caseData).t;

  const defs = svgEl("defs");

  const skinG = svgEl("linearGradient");
  skinG.setAttribute("id", "skinGrad");
  skinG.setAttribute("x1", "0");
  skinG.setAttribute("y1", "0");
  skinG.setAttribute("x2", "0");
  skinG.setAttribute("y2", "1");
  [["0%", "#e8d6b0"], ["55%", "#d8c29a"], ["100%", "#ba9b6c"]].forEach(function (pair) {
    const st = svgEl("stop");
    st.setAttribute("offset", pair[0]);
    st.setAttribute("stop-color", pair[1]);
    skinG.appendChild(st);
  });
  defs.appendChild(skinG);

  const shadeG = svgEl("radialGradient");
  shadeG.setAttribute("id", "torsoShade");
  shadeG.setAttribute("cx", "0.5");
  shadeG.setAttribute("cy", "0.4");
  shadeG.setAttribute("r", "0.8");
  [["0%", "rgba(70,50,28,0)"], ["60%", "rgba(70,50,28,0)"], ["100%", "rgba(56,38,20,0.38)"]].forEach(function (pair) {
    const st = svgEl("stop");
    st.setAttribute("offset", pair[0]);
    st.setAttribute("stop-color", pair[1]);
    shadeG.appendChild(st);
  });
  defs.appendChild(shadeG);

  const glossG = svgEl("linearGradient");
  glossG.setAttribute("id", "skinGloss");
  glossG.setAttribute("x1", "0");
  glossG.setAttribute("y1", "0");
  glossG.setAttribute("x2", "1");
  glossG.setAttribute("y2", "0");
  [["0%", "rgba(255,255,255,0.28)"], ["38%", "rgba(255,255,255,0)"], ["100%", "rgba(60,40,20,0.16)"]].forEach(function (pair) {
    const st = svgEl("stop");
    st.setAttribute("offset", pair[0]);
    st.setAttribute("stop-color", pair[1]);
    glossG.appendChild(st);
  });
  defs.appendChild(glossG);

  svg.appendChild(defs);

  const g = scaledGroup(t);

  g.appendChild(pathEl(FIG.torso, "body-part skin"));
  g.appendChild(pathEl(FIG.torso, "body-shade"));
  g.appendChild(pathEl(FIG.torso, "body-gloss"));
  g.appendChild(pathEl(FIG.neck, "body-part skin"));
  g.appendChild(pathEl(FIG.head, "body-part skin"));
  g.appendChild(pathEl(FIG.armL, "body-part skin"));
  g.appendChild(pathEl(FIG.armR, "body-part skin"));
  g.appendChild(pathEl(FIG.legL, "body-part skin"));
  g.appendChild(pathEl(FIG.legR, "body-part skin"));

  g.appendChild(pathEl("M69,51.6 C65.4,50.9 60.6,51.3 56.8,53.3", "muscle-line"));
  g.appendChild(pathEl("M71,51.6 C74.6,50.9 79.4,51.3 83.2,53.3", "muscle-line"));
  g.appendChild(pathEl("M67.6,50.9 C68.8,52 71.2,52 72.4,50.9", "muscle-line faint"));
  g.appendChild(pathEl("M70,52.4 L70,75.5", "muscle-line faint"));
  g.appendChild(pathEl("M56.4,67.9 C59.4,71.4 64.4,73 69.6,72.8", "muscle-line faint"));
  g.appendChild(pathEl("M83.6,67.9 C80.6,71.4 75.6,73 70.4,72.8", "muscle-line faint"));
  [[60.8], [79.2]].forEach(function (n) {
    const nip = svgEl("circle");
    nip.setAttribute("cx", n[0]);
    nip.setAttribute("cy", 66.6);
    nip.setAttribute("r", 1);
    nip.setAttribute("class", "navel");
    g.appendChild(nip);
  });
  g.appendChild(pathEl("M70,75.5 L70,95.5", "muscle-line faint"));
  g.appendChild(pathEl("M69.4,76.6 C66.4,79.4 63,81.2 60.4,81.9", "muscle-line faint"));
  g.appendChild(pathEl("M70.6,76.6 C73.6,79.4 77,81.2 79.6,81.9", "muscle-line faint"));
  const navel = svgEl("circle");
  navel.setAttribute("cx", 70);
  navel.setAttribute("cy", 98);
  navel.setAttribute("r", 1.1);
  navel.setAttribute("class", "navel");
  g.appendChild(navel);
  g.appendChild(pathEl("M58.9,108.4 C61.3,112.2 63.9,114.9 66.4,116.6", "muscle-line faint"));
  g.appendChild(pathEl("M81.1,108.4 C78.7,112.2 76.1,114.9 73.6,116.6", "muscle-line faint"));
  g.appendChild(pathEl("M62.4,122.4 C64.9,126.2 67.4,128.7 69.6,129.7", "muscle-line faint"));
  g.appendChild(pathEl("M77.6,122.4 C75.1,126.2 72.6,128.7 70.4,129.7", "muscle-line faint"));

  g.appendChild(pathEl("M46.8,88.6 C49,89.4 51.4,89.4 53.6,88.6", "muscle-line faint"));
  g.appendChild(pathEl("M86.4,88.6 C88.6,89.4 91,89.4 93.2,88.6", "muscle-line faint"));
  g.appendChild(pathEl("M45.5,113.2 C47.5,113.9 49.7,113.9 51.5,113.2", "muscle-line faint"));
  g.appendChild(pathEl("M94.5,113.2 C92.5,113.9 90.3,113.9 88.5,113.2", "muscle-line faint"));
  g.appendChild(pathEl("M45.4,113.6 C44.8,115.6 44.6,117.8 45,119.6", "muscle-line faint"));
  g.appendChild(pathEl("M94.6,113.6 C95.2,115.6 95.4,117.8 95,119.6", "muscle-line faint"));
  g.appendChild(pathEl("M47.3,121.4 L47.1,125.4", "muscle-line faint"));
  g.appendChild(pathEl("M49,121.8 L49,125.7", "muscle-line faint"));
  g.appendChild(pathEl("M92.7,121.4 L92.9,125.4", "muscle-line faint"));
  g.appendChild(pathEl("M91,121.8 L91,125.7", "muscle-line faint"));

  [[64.3], [75.7]].forEach(function (k) {
    const pat = svgEl("ellipse");
    pat.setAttribute("cx", k[0]);
    pat.setAttribute("cy", 172.4);
    pat.setAttribute("rx", 2.6);
    pat.setAttribute("ry", 3.2);
    pat.setAttribute("class", "muscle-line faint");
    g.appendChild(pat);
  });
  g.appendChild(pathEl("M56.2,230.2 L56.5,232.2", "muscle-line faint"));
  g.appendChild(pathEl("M59,230.6 L59.2,232.4", "muscle-line faint"));
  g.appendChild(pathEl("M61.8,230.8 L62,232.5", "muscle-line faint"));
  g.appendChild(pathEl("M83.8,230.2 L83.5,232.2", "muscle-line faint"));
  g.appendChild(pathEl("M81,230.6 L80.8,232.4", "muscle-line faint"));
  g.appendChild(pathEl("M78.2,230.8 L78,232.5", "muscle-line faint"));

  ["M50.6,70 C50,84 49.6,96 49.2,108",
   "M49.8,82 C47.4,88 46.6,94 46.2,100",
   "M89.4,70 C90,84 90.4,96 90.8,108",
   "M90.2,82 C92.6,88 93.4,94 93.8,100",
   "M67.8,68 C64.4,74 62.4,80 61.4,88",
   "M72.2,68 C75.6,74 77.6,80 78.6,88",
   "M63.6,150 C63.4,168 63.8,190 63.2,210",
   "M76.4,150 C76.6,168 76.2,190 76.8,210"].forEach(function (d) {
    g.appendChild(pathEl(d, "vessel"));
  });

  svg.appendChild(g);

  markers.forEach(function (m, i) {
    svg.appendChild(buildMarker(m, "external", i));
  });

  return svg;
}

// "İskelet / iç organ" figürü: soluk beden silüeti üzerinde omurga,
// göğüs kafesi, pelvis ve renk kodlu iç organlar.
function buildInternalFigure(markers, caseData) {
  const svg = svgEl("svg");
  svg.setAttribute("viewBox", "-18 0 " + (BODY.canvasW + 36) + " " + BODY.canvasH);
  svg.setAttribute("class", "anatomy-svg");
  const t = bodyScale(caseData).t;

  const g = scaledGroup(t);

  [FIG.head, FIG.neck, FIG.torso, FIG.armL, FIG.armR, FIG.legL, FIG.legR].forEach(function (d) {
    g.appendChild(pathEl(d, "silhouette"));
  });

  [38.5, 41.4, 44.3].forEach(function (y) {
    const v = svgEl("rect");
    v.setAttribute("x", 68);
    v.setAttribute("y", y);
    v.setAttribute("width", 4);
    v.setAttribute("height", 2.3);
    v.setAttribute("rx", 0.8);
    v.setAttribute("class", "bone-seg");
    g.appendChild(v);
  });
  for (let i = 0; i < 16; i++) {
    const y = 54 + i * 4.55;
    const w = i > 11 ? 5.4 : 4.6;
    const v = svgEl("rect");
    v.setAttribute("x", 70 - w / 2);
    v.setAttribute("y", y);
    v.setAttribute("width", w);
    v.setAttribute("height", 3);
    v.setAttribute("rx", 1);
    v.setAttribute("class", "bone-seg");
    g.appendChild(v);
  }

  const organs = svgEl("g");
  organs.setAttribute("class", "organs");

  organs.appendChild(pathEl("M68.6,41.5 L68.6,52.5 C68.6,54.5 69,55.8 70,56.6 C71,55.8 71.4,54.5 71.4,52.5 L71.4,41.5 C70.5,42.1 69.5,42.1 68.6,41.5 Z", "organ organ--trachea"));
  organs.appendChild(pathEl("M70,56.6 C68,58.6 66.4,60.6 65.4,62.6", "detail-line"));
  organs.appendChild(pathEl("M70,56.6 C72,58.6 73.6,60.6 74.6,62.6", "detail-line"));

  organs.appendChild(pathEl("M56.4,95.4 C54.8,96.2 54,98.4 54.4,101 C54.8,103.6 56.2,105.4 57.9,105.2 C59.4,105 60.2,103.2 60,100.8 C59.8,98.2 58.2,95.8 56.4,95.4 Z", "organ organ--kidney"));
  organs.appendChild(pathEl("M83.6,95.4 C85.2,96.2 86,98.4 85.6,101 C85.2,103.6 83.8,105.4 82.1,105.2 C80.6,105 79.8,103.2 80,100.8 C80.2,98.2 81.8,95.8 83.6,95.4 Z", "organ organ--kidney"));

  organs.appendChild(pathEl("M66.4,57.4 C61.4,58.2 57.2,62 55.9,67.6 C54.7,73.2 54.8,80.4 55.8,86 C56.6,90.2 58.6,92.8 61.6,93.3 C64.4,93.7 66.2,91.8 66.4,88.6 L66.6,61.8 C66.6,59.4 66.6,58 66.4,57.4 Z", "organ organ--lung"));
  organs.appendChild(pathEl("M73.6,57.4 C78.6,58.2 82.8,62 84.1,67.6 C85.3,73.2 85.2,80.4 84.2,86 C83.4,90.2 81.4,92.8 78.4,93.3 C75.6,93.7 73.9,91.8 73.7,89 C76,87.2 77.3,84.4 76.9,81.4 C76.5,78.8 75.1,77.2 73.5,76.7 L73.4,61.8 C73.4,59.4 73.4,58 73.6,57.4 Z", "organ organ--lung"));
  organs.appendChild(pathEl("M56.4,74 C59.4,77.4 62.8,79.6 66.4,80.6", "detail-line"));
  organs.appendChild(pathEl("M56.2,71.4 C59.4,70.6 63,70.4 66.5,70.8", "detail-line"));
  organs.appendChild(pathEl("M83.6,74 C80.6,77.4 77.4,79.4 74,80.2", "detail-line"));

  organs.appendChild(pathEl("M66.2,63.2 C63.2,64.6 61.7,67.6 62.3,71.2 C62.9,75.2 65.1,79.4 68.5,82.4 C71.6,85.2 75.5,86.9 78.1,85.7 C80.5,84.5 81.3,81.6 80.5,78.4 C79.6,74.6 77.1,70.4 73.9,67.3 C71.5,64.9 68.8,62.4 66.2,63.2 Z", "organ organ--heart"));
  organs.appendChild(pathEl("M66.8,63.4 C66.2,61.4 66.4,59.6 67.4,58.2", "detail-line"));
  organs.appendChild(pathEl("M70.2,63 C70.4,61 71.2,59.4 72.6,58.4", "detail-line"));
  organs.appendChild(pathEl("M73.6,64.2 C74.6,62.4 76,61.2 77.6,60.8", "detail-line"));

  organs.appendChild(pathEl("M55.4,89.4 C60.4,93.8 66,95.6 70,95.6 C74,95.6 79.6,93.8 84.6,89.4", "detail-line detail-line--dash"));

  organs.appendChild(pathEl("M56.8,89.2 C54.8,91 54,94.4 55,97.6 C56,100.8 58.8,103 62.7,103.5 C67.2,104.1 71.7,103.1 75,101.1 C77,99.9 77.8,98.1 77,96.5 C75.8,94.1 72.2,92.5 68.2,91.5 C64.2,90.5 59.8,88.8 56.8,89.2 Z", "organ organ--liver"));

  organs.appendChild(pathEl("M72.6,90.2 C76.2,89.6 80.2,90.6 82.6,93.2 C84.8,95.6 85.2,98.8 83.6,101.4 C82,103.8 79.2,104.8 76.6,104 C74.6,103.4 73.2,101.8 73,99.8 C72.8,98 73.6,96.4 75,95.6 C74,94.4 73,92.4 72.6,90.2 Z", "organ organ--stomach"));

  organs.appendChild(pathEl("M62.2,105.8 C58.7,107.8 57.3,111.8 57.7,116.3 C58.1,120.8 60.1,124.6 63.7,126.2 C67.1,127.7 72.9,127.7 76.3,126.2 C79.9,124.6 81.9,120.8 82.3,116.3 C82.7,111.8 81.3,107.8 77.8,105.8 C72.8,103.6 67.2,103.6 62.2,105.8 Z", "organ organ--gut"));
  ["M60.4,110.6 C64,109 68.4,109.2 71.6,111 C74.6,112.6 77.4,112.8 79.8,111.6",
   "M59.6,115.4 C63.4,113.8 67.6,114.2 70.8,116 C73.8,117.6 77,117.8 80.2,116.4",
   "M60.6,120.2 C64.2,118.8 68.2,119.2 71.2,120.8 C74,122.2 76.8,122.4 79.4,121.2",
   "M63.4,124.2 C66.4,123 70,123.2 72.8,124.4"].forEach(function (d) {
    organs.appendChild(pathEl(d, "detail-line"));
  });

  const bladder = svgEl("ellipse");
  bladder.setAttribute("cx", 70);
  bladder.setAttribute("cy", 129.4);
  bladder.setAttribute("rx", 5.6);
  bladder.setAttribute("ry", 4.4);
  bladder.setAttribute("class", "organ organ--bladder");
  organs.appendChild(bladder);

  g.appendChild(organs);

  g.appendChild(pathEl("M69,52.2 C65.2,51.4 60.8,51.8 57.2,53.8", "bone-path"));
  g.appendChild(pathEl("M71,52.2 C74.8,51.4 79.2,51.8 82.8,53.8", "bone-path"));
  g.appendChild(pathEl("M68.5,52.6 L71.5,52.6 L71.2,68.4 C71.1,71 70.9,73.4 70,75.4 C69.1,73.4 68.9,71 68.8,68.4 Z", "bone-path light"));
  const ribYs = [56.5, 60.6, 64.7, 68.8, 72.9, 77, 81.1];
  const ribXs = [57.5, 56.5, 56, 56.5, 57.5, 59, 61];
  ribYs.forEach(function (y, i) {
    const lx = ribXs[i];
    const rx = 140 - lx;
    g.appendChild(pathEl("M68.7," + y + " C64," + (y + 1.2) + " " + lx + "," + (y + 2.8) + " " + lx + "," + (y + 5.4) + " C" + lx + "," + (y + 7.2) + " " + (lx + 3) + "," + (y + 8.2) + " " + (lx + 6.5) + "," + (y + 8), "bone-path light"));
    g.appendChild(pathEl("M71.3," + y + " C76," + (y + 1.2) + " " + rx + "," + (y + 2.8) + " " + rx + "," + (y + 5.4) + " C" + rx + "," + (y + 7.2) + " " + (rx - 3) + "," + (y + 8.2) + " " + (rx - 6.5) + "," + (y + 8), "bone-path light"));
  });

  g.appendChild(pathEl("M69,118.6 C64.6,117.8 60.4,119 58.2,122 C56.4,124.6 56.6,127.8 58.8,130 C60.8,131.9 63.8,132.8 66.2,132.4 C67.8,132.1 68.8,131 69,129.6 Z", "bone-wing"));
  g.appendChild(pathEl("M71,118.6 C75.4,117.8 79.6,119 81.8,122 C83.6,124.6 83.4,127.8 81.2,130 C79.2,131.9 76.2,132.8 73.8,132.4 C72.2,132.1 71.2,131 71,129.6 Z", "bone-wing"));
  g.appendChild(pathEl("M66.4,132.6 C68.4,134.2 71.6,134.2 73.6,132.6", "bone-path light"));

  const skull = svgEl("circle");
  skull.setAttribute("cx", 70);
  skull.setAttribute("cy", 20.8);
  skull.setAttribute("r", 11.4);
  skull.setAttribute("class", "bone-path");
  g.appendChild(skull);

  g.appendChild(pathEl("M52.8,56.4 C51,62 49.6,70 48.6,77.6 C48.1,81.4 47.8,85 47.9,88", "bone-path"));
  g.appendChild(pathEl("M87.2,56.4 C89,62 90.4,70 91.4,77.6 C91.9,81.4 92.2,85 92.1,88", "bone-path"));
  [[47.9], [92.1]].forEach(function (j) {
    const c = svgEl("circle");
    c.setAttribute("cx", j[0]);
    c.setAttribute("cy", 89.4);
    c.setAttribute("r", 1.9);
    c.setAttribute("class", "bone-seg");
    g.appendChild(c);
  });
  g.appendChild(pathEl("M47.2,91 C46.6,96.4 46.2,102 46.2,107.4 C46.2,110 46.3,112 46.5,113.6", "bone-path light"));
  g.appendChild(pathEl("M49.2,91.2 C48.8,96.6 48.6,102 48.7,107.4 C48.8,110 49,112 49.2,113.6", "bone-path light"));
  g.appendChild(pathEl("M92.8,91 C93.4,96.4 93.8,102 93.8,107.4 C93.8,110 93.7,112 93.5,113.6", "bone-path light"));
  g.appendChild(pathEl("M90.8,91.2 C91.2,96.6 91.4,102 91.3,107.4 C91.2,110 91,112 90.8,113.6", "bone-path light"));
  [[47.8], [92.2]].forEach(function (w) {
    const c = svgEl("circle");
    c.setAttribute("cx", w[0]);
    c.setAttribute("cy", 116);
    c.setAttribute("r", 1.6);
    c.setAttribute("class", "bone-seg");
    g.appendChild(c);
  });
  ["M47,117.6 L45.8,122.6", "M47.8,117.8 L47.4,123.2", "M48.6,117.6 L49,122.8",
   "M93,117.6 L94.2,122.6", "M92.2,117.8 L92.6,123.2", "M91.4,117.6 L91,122.8"].forEach(function (d) {
    g.appendChild(pathEl(d, "bone-path light"));
  });

  g.appendChild(pathEl("M63.4,133.6 C63,142 63.2,152 64,161 C64.4,165.6 64.6,168.8 64.6,171", "bone-path"));
  g.appendChild(pathEl("M76.6,133.6 C77,142 76.8,152 76,161 C75.6,165.6 75.4,168.8 75.4,171", "bone-path"));
  [[64.6], [75.4]].forEach(function (k) {
    const c = svgEl("circle");
    c.setAttribute("cx", k[0]);
    c.setAttribute("cy", 172.8);
    c.setAttribute("r", 2);
    c.setAttribute("class", "bone-seg");
    g.appendChild(c);
  });
  g.appendChild(pathEl("M63.8,175 C63,183 62.4,193 62.4,202 C62.4,207 62.6,211 62.9,214.4", "bone-path"));
  g.appendChild(pathEl("M76.2,175 C77,183 77.6,193 77.6,202 C77.6,207 77.4,211 77.1,214.4", "bone-path"));
  g.appendChild(pathEl("M66.4,175.6 C66,183 65.8,193 65.9,202 C66,207 66,211 65.9,214", "bone-path light"));
  g.appendChild(pathEl("M73.6,175.6 C74,183 74.2,193 74.1,202 C74,207 74,211 74.1,214", "bone-path light"));
  ["M62.6,216.4 C61,219 59.2,221.6 57.4,224", "M57.4,224 L55.6,227.6", "M58.6,224.6 L57.4,228.4", "M60,225 L59.4,228.8",
   "M77.4,216.4 C79,219 80.8,221.6 82.6,224", "M82.6,224 L84.4,227.6", "M81.4,224.6 L82.6,228.4", "M80,225 L80.6,228.8"].forEach(function (d) {
    g.appendChild(pathEl(d, "bone-path light"));
  });

  svg.appendChild(g);

  markers.forEach(function (m, i) {
    svg.appendChild(buildMarker(m, "internal", i));
  });

  return svg;
}

// Bir yaralanma işaretini çizer. kind -> renk/ikon.
const MARKER_COLORS = {
  mydriasis: "#3a2e22",
  flush: "#b5763c",
  dry: "#8a6d3b",
  stomach: "#b5763c",
  heart: "#915c33",
  bladder: "#4a6fa5",
  miosis: "#3a2e22",
  cold: "#4a6fa5",
  liver: "#a1703f"
};

function wrapLabel(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  words.forEach(function (w) {
    const test = cur ? cur + " " + w : w;
    if (test.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  });
  if (cur) lines.push(cur);
  return lines;
}

function buildMarker(m, layer, index) {
  const color = MARKER_COLORS[m.kind] || "#915c33";
  const group = svgEl("g");
  group.setAttribute("class", "marker");

  const tip = svgEl("title");
  tip.textContent = m.label;
  group.appendChild(tip);

  const dot = svgEl("circle");
  dot.setAttribute("cx", m.x);
  dot.setAttribute("cy", m.y);
  dot.setAttribute("r", 4.8);
  dot.setAttribute("fill", color);
  dot.setAttribute("class", "marker-dot");
  group.appendChild(dot);

  const halo = svgEl("circle");
  halo.setAttribute("cx", m.x);
  halo.setAttribute("cy", m.y);
  halo.setAttribute("r", 7.6);
  halo.setAttribute("fill", "none");
  halo.setAttribute("stroke", color);
  halo.setAttribute("stroke-width", 0.8);
  halo.setAttribute("opacity", 0.4);
  group.appendChild(halo);

  const num = svgEl("text");
  num.setAttribute("x", m.x);
  num.setAttribute("y", m.y + 2.1);
  num.setAttribute("text-anchor", "middle");
  num.setAttribute("class", "marker-num");
  num.textContent = String((index || 0) + 1);
  group.appendChild(num);

  const right = m.x >= 70;
  const lx = right ? m.x + 10 : m.x - 10;
  const leader = svgEl("line");
  leader.setAttribute("x1", right ? m.x + 5.2 : m.x - 5.2);
  leader.setAttribute("y1", m.y);
  leader.setAttribute("x2", right ? lx - 1 : lx + 1);
  leader.setAttribute("y2", m.y);
  leader.setAttribute("stroke", color);
  leader.setAttribute("stroke-width", 0.6);
  leader.setAttribute("opacity", 0.55);
  group.appendChild(leader);

  const lines = wrapLabel(m.label, 17);
  const label = svgEl("text");
  label.setAttribute("class", "marker-label");
  label.setAttribute("text-anchor", right ? "start" : "end");
  const startY = m.y - ((lines.length - 1) * 8) / 2 + 2.4;
  lines.forEach(function (ln, i) {
    const ts = svgEl("tspan");
    ts.setAttribute("x", lx);
    ts.setAttribute("y", startY + i * 8);
    ts.textContent = ln;
    label.appendChild(ts);
  });
  group.appendChild(label);

  return group;
}

function buildLegend(markers) {
  if (!markers || !markers.length) return null;
  const ol = document.createElement("ol");
  ol.className = "anatomy-legend";
  markers.forEach(function (m, i) {
    const li = document.createElement("li");
    const num = document.createElement("span");
    num.className = "legend-num";
    num.style.backgroundColor = MARKER_COLORS[m.kind] || "#915c33";
    num.textContent = String(i + 1);
    li.appendChild(num);
    li.appendChild(document.createTextNode(m.label));
    ol.appendChild(li);
  });
  return ol;
}

function buildAnatomyGrid(caseData) {
  const inj = caseData.autopsy.injuries || { external: [], internal: [] };
  const grid = h("div", "anatomy-grid");

  const f1 = h("figure", "anatomy");
  f1.appendChild(h("figcaption", null, "Dış Yüzey Bulguları"));
  const box1 = h("div");
  box1.appendChild(buildExternalFigure(inj.external, caseData));
  const extLegend = buildLegend(inj.external);
  if (extLegend) box1.appendChild(extLegend);
  f1.appendChild(box1);
  grid.appendChild(f1);

  const f2 = h("figure", "anatomy");
  f2.appendChild(h("figcaption", null, "İskelet / İç Organ Bulguları"));
  const box2 = h("div");
  box2.appendChild(buildInternalFigure(inj.internal, caseData));
  const intLegend = buildLegend(inj.internal);
  if (intLegend) box2.appendChild(intLegend);
  f2.appendChild(box2);
  grid.appendChild(f2);

  return grid;
}

// ================= Sıfırlama ve başlatma =================

el.resetBtn.addEventListener("click", function () {
  openConfirm(
    "İlerlemen silinecek",
    "Tüm puanların ve rütben sıfırlanacak. Emin misin?",
    "Evet, sıfırla",
    function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        // depolama yoksa sessiz geç
      }
      renderLobby();
    }
  );
});

renderLobby();
typeTagline();

// Açılış introsu: daktilo → mühür → klasör (CSS zamanlamasıyla senkron ses)
function playIntro() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  if (REDUCED) { intro.remove(); return; }

  if (sound.enabled) {
    for (let i = 0; i < 20; i++) sound.noise(0.05, 2400, 0.05, 0.35 + i * 0.0425);
    for (let i = 0; i < 23; i++) sound.noise(0.05, 2400, 0.05, 1.25 + i * 0.0304);
    sound.tone(85, 0.2, "sine", 0.16, 2.55);
    sound.noise(0.12, 320, 0.12, 2.55);
    sound.noise(0.2, 950, 0.06, 3.9);
    sound.noise(0.25, 700, 0.05, 4.3);
  }

  const resume = function () { sound.ensure(); };
  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("keydown", resume, { once: true });

  setTimeout(function () { if (intro.parentNode) intro.remove(); }, 6500);
}
playIntro();

// Ses aç/kapa düğmesi (footer'a eklenir)
(function () {
  const foot = document.querySelector(".footer");
  if (!foot) return;
  const btn = h("button", "footer-reset", sound.enabled ? "Ses: Açık" : "Ses: Kapalı");
  btn.type = "button";
  btn.addEventListener("click", function () {
    sound.toggle();
    btn.textContent = sound.enabled ? "Ses: Açık" : "Ses: Kapalı";
  });
  foot.appendChild(btn);
})();
