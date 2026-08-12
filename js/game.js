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

const state = {
  view: "lobby",
  modeId: "classic",
  caseId: null,
  cardIndex: 0,
  unlocked: 1,
  marked: [],
  activeSuspect: null,
  resolved: false,
  resultNode: null,
  drawerOpen: false,
  timeline: null,
  timelineScore: null,
  timelineCorrect: 0,
  quizAnswers: {},
  quizLocked: false,
  quizScore: null,
  quizCorrect: 0,
  elimSolved: {},
  elimOrders: null,
  elimDone: false
};

const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const el = {
  progressBar: document.getElementById("progress-bar"),
  tagline: document.querySelector(".tagline"),
  rankName: document.getElementById("rank-name"),
  rankScore: document.getElementById("rank-score"),
  statSolved: document.getElementById("stat-solved"),
  viewLobby: document.getElementById("view-lobby"),
  viewGame: document.getElementById("view-game"),
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

function totalScore(progress) {
  return CASES.reduce(function (sum, c) {
    const rec = progress.cases[c.id];
    return sum + (rec ? rec.score : 0);
  }, 0);
}

// Vaka başına 120 puan: karar 100 + zaman çizelgesi 10 + çapraz analiz 10.
const MAX_TOTAL = CASES.length * 120;

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
    const score = h("span", "career-summary__score", formatPoints(rec.score) + "/120");
    const stamp = h("span", "career-summary__stamp " + (rec.solved ? "ok" : (rec.partial ? "mid" : "bad")), stampTextFor(rec));

    li.appendChild(no);
    li.appendChild(title);
    li.appendChild(score);
    li.appendChild(stamp);
    list.appendChild(li);
  });
  el.careerSummary.appendChild(list);

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
  const total = activeMode().cards.length;
  el.progressBar.style.width = (Math.min(state.unlocked, total) / total) * 100 + "%";
}

// ================= Lobi =================

function renderLobby() {
  renderModeGrid();
  renderCaseGrid();
  renderCareerSummary();
  renderRankBadge();
  updateProgressBar();
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

  CASES.forEach(function (c) {
    const rec = progress.cases[c.id];
    const card = h("article", "case-file");

    const top = h("div", "case-file__top");
    top.appendChild(h("span", "case-file__no", "DOSYA №" + pad(c.id)));
    if (rec) {
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
      card.appendChild(h("p", "case-file__score", "En iyi skor: " + formatPoints(rec.score) + "/120"));
    }

    const open = h("button", "btn case-file__open", rec ? "Dosyayı yeniden aç" : "Dosyayı aç");
    open.type = "button";
    open.addEventListener("click", function () { openCase(c.id); });
    card.appendChild(open);

    el.caseGrid.appendChild(card);
  });
}

// ================= Oyun kabuğu =================

function openCase(caseId) {
  state.caseId = caseId;
  state.cardIndex = 0;
  state.unlocked = 1;
  state.marked = [];
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
  state.elimDone = false;
  closeDrawer();
  showView("game");
  renderGame();
  scrollTopInstant();
}

function goLobby() {
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

  renderTabs();
  renderCard();
  renderCardNav();
  renderDrawer();
  updateNoteCount();
  updateProgressBar();
}

function renderTabs() {
  const cards = activeMode().cards;
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
  const cards = activeMode().cards;
  if (i < 0 || i >= cards.length || i >= state.unlocked) return;
  state.cardIndex = i;
  renderTabs();
  renderCard();
  renderCardNav();
}

// Bazı kartlar tamamlanmadan ilerlenemez (zaman, analiz, eleme).
function cardGateDone(key) {
  if (key === "timeline") return state.timelineScore != null;
  if (key === "quiz") return state.quizScore != null;
  if (key === "elimination") return state.elimDone;
  return true;
}

function gateHintFor(key) {
  if (key === "timeline") return "Sıralamayı tamamla ve kontrol et.";
  if (key === "quiz") return "Tüm soruları cevapla ve kilitle.";
  if (key === "elimination") return "Tüm şüphelileri ele.";
  return "";
}

function advanceCard() {
  const cards = activeMode().cards;
  if (state.cardIndex >= cards.length - 1) return;
  if (!cardGateDone(cards[state.cardIndex])) return;
  state.cardIndex += 1;
  state.unlocked = Math.max(state.unlocked, state.cardIndex + 1);
  renderTabs();
  renderCard();
  renderCardNav();
  updateProgressBar();
}

function renderCardNav() {
  const cards = activeMode().cards;
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

function renderCard() {
  const c = currentCase();
  const key = activeMode().cards[state.cardIndex];
  el.cardArea.innerHTML = "";
  CARD_RENDERERS[key](el.cardArea, c);
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

function cardScene(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Olay Yeri"));
  card.appendChild(h("p", "report__body", c.scene.summary));
  card.appendChild(buildSceneFigure(c.scene));

  card.appendChild(h("h4", "report__subhead", "Olay yerinde toplananlar"));
  const list = h("ul", "evidence-list");
  c.scene.evidence.forEach(function (ev) {
    const li = document.createElement("li");
    li.appendChild(h("strong", null, ev.name));
    li.appendChild(document.createTextNode(" — " + ev.desc));
    list.appendChild(li);
  });
  card.appendChild(list);
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
  card.appendChild(chips);
  card.appendChild(info);
  card.appendChild(list);
  area.appendChild(card);

  if (!state.activeSuspect || !c.suspects.some(function (s) { return s.id === state.activeSuspect; })) {
    state.activeSuspect = c.suspects[0].id;
  }
  interRefs = { chips: chips, info: info, list: list };
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
    chip.appendChild(h("span", "suspect-chip__initial", s.initial));
    chip.appendChild(h("span", "suspect-chip__name", s.name));
    chip.addEventListener("click", function () {
      state.activeSuspect = s.id;
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
  } else {
    state.marked.splice(idx, 1);
  }
  renderInterrogation(currentCase());
  renderDrawer();
  updateNoteCount();
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
    "Olayları kronolojik sıraya diz: en erken olaya tıklayarak sağdaki sıraya yerleştir. "
    + "Yanlış yerleştirdiğini tıklayıp geri alabilirsin. Sıra tamamlanınca kontrol et."));

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

function cardElimination(area, c) {
  const card = h("section", "card");
  card.appendChild(sectionHead("Eleme Masası"));
  card.appendChild(h("p", "hint",
    "Katil kararından önce masayı temizle: her şüpheli için doğru eleme gerekçesini seç. "
    + "Gerekçe tutmazsa şüpheli elenmez, dosyaya yeniden bakıp tekrar denersin. "
    + "Herkes elenmeden karar kartı açılmaz."));

  if (!state.elimOrders) {
    state.elimOrders = {};
    c.elimination.forEach(function (entry) {
      state.elimOrders[entry.id] = shuffleIndices(entry.options.length)
        .map(function (i) { return entry.options[i]; });
    });
  }

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
      const select = h("select");
      state.elimOrders[entry.id].forEach(function (opt) {
        select.appendChild(h("option", null, opt)).value = opt;
      });
      const msg = h("span", "elim-row__msg");
      const btn = h("button", "btn btn--small", "Ele");
      btn.type = "button";
      btn.addEventListener("click", function () {
        if (select.value === entry.correct) {
          state.elimSolved[entry.id] = true;
          if (Object.keys(state.elimSolved).length === c.elimination.length) {
            state.elimDone = true;
          }
          renderCard();
          renderCardNav();
        } else {
          msg.textContent = "Bu gerekçe tutmuyor; şüpheli elenemedi. Dosyaya yeniden bak.";
          row.classList.remove("shake");
          void row.offsetWidth;
          row.classList.add("shake");
        }
      });
      controls.appendChild(select);
      controls.appendChild(btn);
      row.appendChild(controls);
      row.appendChild(msg);
    }
    list.appendChild(row);
  });
  card.appendChild(list);

  if (state.elimDone) {
    card.appendChild(h("p", "card-done", "Masa temiz: tüm şüpheliler elendi. Karar kartı açık."));
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
  form.appendChild(submit);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.resolved) return;
    openConfirm(
      "Kararından emin misin?",
      "Dosya mühürlenecek ve geri açılmayacak.",
      "Evet, mühürle",
      resolveVerdict
    );
  });

  verdictRefs = {
    causeSelect: causeSelect,
    suspectSelect: suspectSelect,
    motiveSelect: motiveSelect,
    evidenceInput: evInput
  };

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

  const score = (causeRight ? WEIGHTS.cause : 0)
    + (suspectRight ? WEIGHTS.suspect : 0)
    + (motiveRight ? WEIGHTS.motive : 0)
    + evidenceScore
    + timelinePts
    + quizPts;

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

  const totalRow = h("tr", "row-total");
  const totalLabel = h("td", null, "TOPLAM");
  totalLabel.colSpan = 3;
  totalRow.appendChild(totalLabel);
  totalRow.appendChild(h("td", null, formatPoints(score) + "/120"));
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
  saveProgress(progress);
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
    const body = h("p", "drawer-item__text");
    body.appendChild(h("strong", null, row.speaker + ": "));
    body.appendChild(document.createTextNode(row.text));
    li.appendChild(body);
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
  // Oturur halde ceset: üstten görünüm, baş öne (masaya doğru) düşmüş.
  "body-seat": function (g) {
    planEllipse(g, 0, 0.06, 0.36, 0.18, "plan-body");            // omuzlar
    planEllipse(g, -0.34, -0.06, 0.09, 0.2, "plan-body", 24);    // sol kol
    planEllipse(g, 0.34, -0.06, 0.09, 0.2, "plan-body", -24);    // sağ kol
    planEllipse(g, 0, 0.3, 0.27, 0.17, "plan-body");             // kalça
    planCircle(g, 0, -0.24, 0.16, "plan-body plan-body--head");  // baş (öne düşmüş)
  },
  // Yatar halde ceset: üstten tebeşir konturu.
  body: function (g, o) {
    const h = o.h || 1.7;
    planCircle(g, 0, -h / 2 + 0.17, 0.17, "plan-body plan-body--head");   // baş
    planEllipse(g, 0, -h / 2 + 0.42, 0.34, 0.15, "plan-body");            // omuzlar
    planEllipse(g, -0.42, -h / 2 + 0.62, 0.09, 0.3, "plan-body", 30);     // sol kol
    planEllipse(g, 0.42, -h / 2 + 0.62, 0.09, 0.3, "plan-body", -30);     // sağ kol
    planRect(g, 0, 0.02, 0.5, h * 0.42, "plan-body", 0.2);                // gövde
    planEllipse(g, -0.16, h / 2 - 0.34, 0.11, 0.36, "plan-body", 6);      // sol bacak
    planEllipse(g, 0.16, h / 2 - 0.34, 0.11, 0.36, "plan-body", -6);      // sağ bacak
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
  const r = 0.3 * f;
  planCircle(g, x, y, r, "plan-marker");
  planText(g, x, y + r * 0.5, num, "plan-marker-num", 0.46 * f);
}

function buildSceneFigure(scene) {
  const plan = scene.plan;
  const objects = scene.objects;
  const w = plan.w, d = plan.d;
  const f = Math.max(1, Math.max(w, d) / 9);

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
  fig.appendChild(h("p", "hint", "Krokideki numaralı öğelerin ya da listedeki maddelerin üzerine gel: eşleşen öğe vurgulanır."));

  const svg = svgEl("svg");
  const padX = 1.6 * f, padTop = 1.5 * f, padBot = 1.6 * f;
  svg.setAttribute("viewBox", (-padX) + " " + (-padTop) + " " + (w + padX * 2) + " " + (d + padTop + padBot));
  svg.setAttribute("class", "plan-svg");

  const defs = svgEl("defs");
  const soft = svgEl("filter");
  soft.setAttribute("id", "plan-soft");
  soft.setAttribute("x", "-40%"); soft.setAttribute("y", "-40%");
  soft.setAttribute("width", "180%"); soft.setAttribute("height", "180%");
  const drop = svgEl("feDropShadow");
  drop.setAttribute("dx", 0.04); drop.setAttribute("dy", 0.07);
  drop.setAttribute("stdDeviation", 0.05);
  drop.setAttribute("flood-color", "rgba(45, 30, 14, 0.38)");
  soft.appendChild(drop);
  defs.appendChild(soft);
  svg.appendChild(defs);

  drawPlanChrome(svg, plan, f);
  if (plan.enclosed) drawWalls(svg, plan);

  const items = [];
  objects.forEach(function (o, i) {
    const g = svgEl("g");
    g.setAttribute("class", "plan-item");
    g.setAttribute("data-i", i);

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
    if (o.form !== "patch" && o.form !== "body" && o.form !== "body-seat") {
      shape.setAttribute("filter", "url(#plan-soft)");
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
  items.forEach(function (g, i) {
    g.addEventListener("mouseenter", function () { setHot(i, true); });
    g.addEventListener("mouseleave", function () { setHot(i, false); });
    lis[i].addEventListener("mouseenter", function () { setHot(i, true); });
    lis[i].addEventListener("mouseleave", function () { setHot(i, false); });
    lis[i].addEventListener("focus", function () { setHot(i, true); });
    lis[i].addEventListener("blur", function () { setHot(i, false); });
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
