// Oyun mantığı — davranış katmanı.
// Veri: cases.js (CASES). Bu dosya yalnızca arayüzü ve akışı yönetir.

const state = {
  caseIndex: 0,
  currentCase: null,
  marked: [],        // işaretlenen tutanak satır indexleri
  activeSuspect: null,
  resolved: false
};

const el = {
  title: document.getElementById("case-title"),
  story: document.getElementById("case-story"),
  sceneSummary: document.getElementById("scene-summary"),
  scenePhoto: document.getElementById("scene-photo"),
  sceneEvidence: document.getElementById("scene-evidence"),
  csiExaminer: document.getElementById("csi-examiner"),
  csiFinding: document.getElementById("csi-finding"),
  csiItems: document.getElementById("csi-items"),
  autPatholog: document.getElementById("autopsy-patholog"),
  autExternal: document.getElementById("autopsy-external"),
  autInternal: document.getElementById("autopsy-internal"),
  anatExternal: document.getElementById("anat-external"),
  anatInternal: document.getElementById("anat-internal"),
  toxTable: document.getElementById("tox-table"),
  autCause: document.getElementById("autopsy-cause"),
  transcriptMeta: document.getElementById("transcript-meta"),
  transcript: document.getElementById("transcript"),
  sessionTabs: document.getElementById("session-tabs"),
  sessionInfo: document.getElementById("session-info"),
  transcriptList: document.getElementById("transcript-list"),
  suspectGrid: document.getElementById("suspect-grid"),
  clueList: document.getElementById("clue-list"),
  clueEmpty: document.getElementById("clue-empty"),
  causeSelect: document.getElementById("cause-select"),
  suspectSelect: document.getElementById("suspect-select"),
  form: document.getElementById("verdict-form"),
  result: document.getElementById("result"),
  nextBtn: document.getElementById("next-case")
};

function loadCase(index) {
  const current = CASES[index % CASES.length];
  state.currentCase = current;
  state.marked = [];
  state.activeSuspect = null;
  state.resolved = false;

  el.title.textContent = current.title;
  el.story.textContent = current.story;

  renderScene(current);
  renderCsi(current);
  renderAutopsy(current);
  renderAnatomy(current);
  renderTranscript(current);
  renderSuspects();
  renderClues();
  fillSelects();

  el.result.textContent = "";
  el.result.className = "result";
  el.nextBtn.classList.add("hidden");
  el.form.classList.remove("hidden");
}

// ================= Olay yeri =================

function renderScene(caseData) {
  el.sceneSummary.textContent = caseData.scene.summary;
  renderScenePhoto(caseData.scene.objects);

  el.sceneEvidence.innerHTML = "";
  caseData.scene.evidence.forEach(function (ev) {
    const li = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = ev.name;
    li.appendChild(strong);
    li.appendChild(document.createTextNode(" — " + ev.desc));
    el.sceneEvidence.appendChild(li);
  });
}

// Sahneyi SVG ile çizer: sepya "eski fotoğraf" karesi.
function svgEl(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}

function renderScenePhoto(objects) {
  el.scenePhoto.innerHTML = "";

  const svg = svgEl("svg");
  svg.setAttribute("viewBox", "0 0 100 80");
  svg.setAttribute("class", "scene-svg");

  // zemin
  const bg = svgEl("rect");
  bg.setAttribute("x", 0); bg.setAttribute("y", 0);
  bg.setAttribute("width", 100); bg.setAttribute("height", 80);
  bg.setAttribute("fill", "#cbb58a");
  svg.appendChild(bg);

  objects.forEach(function (obj) {
    const a = svgEl("title");
    a.textContent = obj.label || "";

    let shape;
    if (obj.kind === "ellipse") {
      shape = svgEl("ellipse");
      shape.setAttribute("cx", obj.x);
      shape.setAttribute("cy", obj.y);
      shape.setAttribute("rx", obj.w / 2 || 4);
      shape.setAttribute("ry", obj.h / 2 || obj.w / 2 || 4);
    } else if (obj.kind === "circle") {
      shape = svgEl("circle");
      shape.setAttribute("cx", obj.x);
      shape.setAttribute("cy", obj.y);
      shape.setAttribute("r", obj.w || 4);
    } else {
      shape = svgEl("rect");
      shape.setAttribute("x", obj.x);
      shape.setAttribute("y", obj.y);
      shape.setAttribute("width", obj.w);
      shape.setAttribute("height", obj.h || 3);
      shape.setAttribute("rx", 1.5);
    }
    shape.setAttribute("class", "scene-object" + (obj.label2 ? " has-dual" : ""));
    if (obj.fill) shape.setAttribute("fill", obj.fill);

    svg.appendChild(shape);
    svg.appendChild(a);

    // Etiket: nesnenin ortası/altına açıklayıcı metin
    if (obj.label) {
      let cx, cy;
      if (obj.kind === "ellipse") { cx = obj.x; cy = obj.y; }
      else if (obj.kind === "circle") { cx = obj.x; cy = obj.y; }
      else { cx = obj.x + (obj.w || 0) / 2; cy = obj.y + (obj.h || 0); }

      const label = svgEl("text");
      label.setAttribute("x", cx);
      label.setAttribute("y", cy + 4);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "scene-label");
      label.textContent = obj.label;
      svg.appendChild(label);

      if (obj.label2) {
        const label2 = svgEl("text");
        label2.setAttribute("x", cx);
        label2.setAttribute("y", cy + 8);
        label2.setAttribute("text-anchor", "middle");
        label2.setAttribute("class", "scene-label scene-label--sub");
        label2.textContent = obj.label2;
        svg.appendChild(label2);
      }
    }
  });

  el.scenePhoto.appendChild(svg);
}

// ================= CSI raporu =================

function renderCsi(caseData) {
  el.csiExaminer.textContent = caseData.csi.examiner + "  •  " + caseData.csi.date;
  el.csiFinding.textContent = caseData.csi.finding;

  el.csiItems.innerHTML = "";
  caseData.csi.items.forEach(function (itemText) {
    const li = document.createElement("li");
    li.textContent = itemText;
    el.csiItems.appendChild(li);
  });
}

// ================= Otopsi raporu =================

function renderAutopsy(caseData) {
  const aut = caseData.autopsy;
  el.autPatholog.textContent = aut.pathologist + "  •  " + aut.date;
  el.autExternal.textContent = aut.external;
  el.autInternal.textContent = aut.internal;
  el.autCause.textContent = aut.causeNote;
  renderToxTable(aut.toxicology);
}

function renderToxTable(rows) {
  const headers = ["Madde", "Sonuç", "Referans", "Yorum"];
  el.toxTable.innerHTML = "";

  const headRow = document.createElement("tr");
  headers.forEach(function (h) {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  el.toxTable.appendChild(headRow);

  rows.forEach(function (row) {
    const tr = document.createElement("tr");
    row.forEach(function (cell) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    el.toxTable.appendChild(tr);
  });
}

// ================= Anatomi figürleri =================

const BODY = {
  canvasW: 140,
  canvasH: 300
};

// Kurbanın boy/kilo bilgisinden vücut yapısı ölçeği üretir.
// bulk (kg/m) 40 taban kabul edilir: iri yapı > 1, ince yapı < 1.
function bodyScale(caseData) {
  const v = (caseData && caseData.autopsy && caseData.autopsy.victim) || {};
  if (!v.height || !v.weight) return { t: 1, l: 1 };
  const bulk = v.weight / (v.height / 100);
  const t = Math.max(0.9, Math.min(1.1, bulk / 40));
  return { t: t, l: 0.85 + 0.15 * t };
}

// "Dış yüzey" figürü: yüz/saç içermez; gölgeli tıbbi illüstrasyon tarzı.
// Vücut tipi kurbanın boy/kilosuna göre ölçeklenir; yüzeyel damarlar görünür.
function buildExternalFigure(markers, caseData) {
  const svg = svgEl("svg");
  svg.setAttribute("viewBox", "0 0 " + BODY.canvasW + " " + BODY.canvasH);
  svg.setAttribute("class", "anatomy-svg");
  const s = bodyScale(caseData);
  const t = s.t;

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

  const g = svgEl("g");
  g.setAttribute("class", "body-silhouette");

  // baş — yüz ve saç çizilmez (adli standart)
  const head = svgEl("circle");
  head.setAttribute("cx", 70);
  head.setAttribute("cy", 26);
  head.setAttribute("r", 13);
  head.setAttribute("class", "body-part skin");
  g.appendChild(head);

  // boyun
  const neck = svgEl("path");
  neck.setAttribute("d", "M" + (70 - 6 * t) + ",39 L" + (70 - 6 * t) + ",47 C" + (70 - 6 * t) + ",49 " + (70 + 6 * t) + ",49 " + (70 + 6 * t) + ",47 L" + (70 + 6 * t) + ",39 Z");
  neck.setAttribute("class", "body-part skin");
  g.appendChild(neck);

  // gövde — ölçekli yumuşak silüet
  const torsoD =
    "M" + (70 - 17 * t) + ",50 C" + (70 - 22 * t) + ",52 " + (70 - 25 * t) + ",57 " + (70 - 25 * t) + ",63 " +
    "L" + (70 - 25 * t) + ",84 C" + (70 - 25 * t) + ",108 " + (70 - 24 * t) + ",115 " + (70 - 16 * t) + ",120 " +
    "C" + (70 - 13 * t) + ",122 " + (70 - 9 * t) + ",124 70,124 " +
    "C" + (70 + 9 * t) + ",124 " + (70 + 13 * t) + ",122 " + (70 + 16 * t) + ",120 " +
    "C" + (70 + 24 * t) + ",115 " + (70 + 25 * t) + ",108 " + (70 + 25 * t) + ",84 " +
    "L" + (70 + 25 * t) + ",63 C" + (70 + 25 * t) + ",57 " + (70 + 22 * t) + ",52 " + (70 + 17 * t) + ",50 " +
    "C" + (70 + 12 * t) + ",47 " + (70 + 8 * t) + ",47 70,47 " +
    "C" + (70 - 8 * t) + ",47 " + (70 - 12 * t) + ",47 " + (70 - 17 * t) + ",50 Z";
  const torso = svgEl("path");
  torso.setAttribute("d", torsoD);
  torso.setAttribute("class", "body-part skin");
  g.appendChild(torso);

  // tıbbi gölgeleme + cilt parlaması (gövde üstünde)
  const shade = svgEl("path");
  shade.setAttribute("d", torsoD);
  shade.setAttribute("class", "body-shade");
  g.appendChild(shade);
  const gloss = svgEl("path");
  gloss.setAttribute("d", torsoD);
  gloss.setAttribute("class", "body-gloss");
  g.appendChild(gloss);

  // köprücük, göğüs kası, karın çizgisi, göbek
  const collar = svgEl("path");
  collar.setAttribute("d", "M" + (70 - 14 * t) + ",52 C" + (70 - 8 * t) + ",49 " + (70 - 3 * t) + ",48 70,48 C" + (70 + 3 * t) + ",48 " + (70 + 8 * t) + ",49 " + (70 + 14 * t) + ",52");
  collar.setAttribute("class", "muscle-line");
  g.appendChild(collar);
  const pecL = svgEl("path");
  pecL.setAttribute("d", "M70,51 C" + (70 - 5 * t) + ",54 " + (70 - 8 * t) + ",57 " + (70 - 9 * t) + ",61");
  pecL.setAttribute("class", "muscle-line faint");
  g.appendChild(pecL);
  const pecR = svgEl("path");
  pecR.setAttribute("d", "M70,51 C" + (70 + 5 * t) + ",54 " + (70 + 8 * t) + ",57 " + (70 + 9 * t) + ",61");
  pecR.setAttribute("class", "muscle-line faint");
  g.appendChild(pecR);
  const linea = svgEl("path");
  linea.setAttribute("d", "M70,62 L70,96");
  linea.setAttribute("class", "muscle-line faint");
  g.appendChild(linea);
  const navel = svgEl("circle");
  navel.setAttribute("cx", 70);
  navel.setAttribute("cy", 96);
  navel.setAttribute("r", 1);
  navel.setAttribute("class", "navel");
  g.appendChild(navel);

  // kollar — hafif açık duruş, eller gövdeden ayrık
  const shL = 70 - 17 * t;
  const shR = 70 + 17 * t;
  [["M" + shL + ",51 C" + (shL - 6) + ",53 " + (shL - 8) + ",57 " + (shL - 8) + ",61 L" + (shL - 9) + ",102 C" + (shL - 9) + ",110 " + (shL - 8) + ",116 " + (shL - 5) + ",118 C" + (shL - 2) + ",120 " + shL + ",119 " + (shL + 1) + ",116 L" + (shL + 1) + ",53 C" + shL + ",51 " + (shL - 1) + ",51 " + shL + ",51 Z", shL - 6, 118, "L"],
   ["M" + shR + ",51 C" + (shR + 6) + ",53 " + (shR + 8) + ",57 " + (shR + 8) + ",61 L" + (shR + 9) + ",102 C" + (shR + 9) + ",110 " + (shR + 8) + ",116 " + (shR + 5) + ",118 C" + (shR + 2) + ",120 " + shR + ",119 " + (shR - 1) + ",116 L" + (shR - 1) + ",53 C" + shR + ",51 " + (shR + 1) + ",51 " + shR + ",51 Z", shR + 6, 118, "R"]].forEach(function (a) {
    const arm = svgEl("path");
    arm.setAttribute("d", a[0]);
    arm.setAttribute("class", "body-part skin");
    g.appendChild(arm);
    const hand = svgEl("circle");
    hand.setAttribute("cx", a[1]);
    hand.setAttribute("cy", a[2]);
    hand.setAttribute("r", 3.6);
    hand.setAttribute("class", "body-part skin");
    g.appendChild(hand);
    const elbow = svgEl("path");
    elbow.setAttribute("d", a[3] === "L"
      ? "M" + (shL - 8) + ",86 L" + (shL + 1) + ",86"
      : "M" + (shR - 1) + ",86 L" + (shR + 8) + ",86");
    elbow.setAttribute("class", "muscle-line faint");
    g.appendChild(elbow);
  });

  // yüzeyel damarlar (kol + göğüs)
  [["M" + (shL - 3) + ",70 C" + (shL - 2) + ",84 " + (shL - 2) + ",96 " + (shL - 1) + ",108", "M" + (shL - 2) + ",82 C" + (shL - 6) + ",88 " + (shL - 7) + ",94 " + (shL - 8) + ",100"],
   ["M" + (shR + 3) + ",70 C" + (shR + 2) + ",84 " + (shR + 2) + ",96 " + (shR + 1) + ",108", "M" + (shR + 2) + ",82 C" + (shR + 6) + ",88 " + (shR + 7) + ",94 " + (shR + 8) + ",100"],
   ["M" + (70 - 2 * t) + ",68 C" + (70 - 6 * t) + ",74 " + (70 - 8 * t) + ",80 " + (70 - 9 * t) + ",88", ""],
   ["M" + (70 + 2 * t) + ",68 C" + (70 + 6 * t) + ",74 " + (70 + 8 * t) + ",80 " + (70 + 9 * t) + ",88", ""]].forEach(function (v) {
    const ve = svgEl("path");
    ve.setAttribute("d", v[0]);
    ve.setAttribute("class", "vessel");
    g.appendChild(ve);
    if (v[1]) {
      const ve2 = svgEl("path");
      ve2.setAttribute("d", v[1]);
      ve2.setAttribute("class", "vessel");
      g.appendChild(ve2);
    }
  });

  // bacaklar — ölçekli, diz çizgili
  [["M" + (70 - 10 * t) + ",121 C" + (70 - 12 * t) + ",121 " + (70 - 12 * t) + ",124 " + (70 - 12 * t) + ",128 L" + (70 - 12 * t) + ",190 C" + (70 - 12 * t) + ",201 " + (70 - 11 * t) + ",211 " + (70 - 8 * t) + ",224 L" + (70 - 1 * t) + ",224 L" + (70 - 1 * t) + ",121 Z", "L"],
   ["M" + (70 + 10 * t) + ",121 C" + (70 + 12 * t) + ",121 " + (70 + 12 * t) + ",124 " + (70 + 12 * t) + ",128 L" + (70 + 12 * t) + ",190 C" + (70 + 12 * t) + ",201 " + (70 + 11 * t) + ",211 " + (70 + 8 * t) + ",224 L" + (70 + 1 * t) + ",224 L" + (70 + 1 * t) + ",121 Z", "R"]].forEach(function (l) {
    const leg = svgEl("path");
    leg.setAttribute("d", l[0]);
    leg.setAttribute("class", "body-part skin");
    g.appendChild(leg);
    const knee = svgEl("path");
    knee.setAttribute("d", l[1] === "L"
      ? "M" + (70 - 10 * t) + ",170 L" + (70 - 1 * t) + ",170"
      : "M" + (70 + 1 * t) + ",170 L" + (70 + 10 * t) + ",170");
    knee.setAttribute("class", "muscle-line faint");
    g.appendChild(knee);
  });

  // bacak damarları
  [["M" + (70 - 6 * t) + ",150 C" + (70 - 6 * t) + ",168 " + (70 - 5 * t) + ",190 " + (70 - 6 * t) + ",210"],
   ["M" + (70 + 6 * t) + ",150 C" + (70 + 6 * t) + ",168 " + (70 + 5 * t) + ",190 " + (70 + 6 * t) + ",210"]].forEach(function (v) {
    const ve = svgEl("path");
    ve.setAttribute("d", v[0]);
    ve.setAttribute("class", "vessel");
    g.appendChild(ve);
  });

  // ayaklar
  [["M" + (70 - 12 * t) + ",226 L" + (70 + 3 * t) + ",226 L" + (70 + 3 * t) + ",233 L" + (70 - 12 * t) + ",233 Z"],
   ["M" + (70 - 3 * t) + ",226 L" + (70 + 12 * t) + ",226 L" + (70 + 12 * t) + ",233 L" + (70 - 3 * t) + ",233 Z"]].forEach(function (f) {
    const foot = svgEl("path");
    foot.setAttribute("d", f[0]);
    foot.setAttribute("class", "body-part skin");
    g.appendChild(foot);
  });

  svg.appendChild(g);

  markers.forEach(function (m, i) {
    svg.appendChild(buildMarker(m, "external", i));
  });

  return svg;
}
// "İskelet / iç organ" figürü: renk kodlu iç organlar + ölçekli iskelet + iç bulgu işaretleri.
function buildInternalFigure(markers, caseData) {
  const svg = svgEl("svg");
  svg.setAttribute("viewBox", "0 0 " + BODY.canvasW + " " + BODY.canvasH);
  svg.setAttribute("class", "anatomy-svg");
  const s = bodyScale(caseData);
  const t = s.t;

  // iç organlar (iskeletin altında, renk kodlu)
  const organs = svgEl("g");
  organs.setAttribute("class", "organs");

  const organPaths = [
    { d: "M62,66 C56,64 51,70 52,80 C53,89 58,93 64,92 C69,91 69,72 62,66 Z", cls: "organ organ--lung" },
    { d: "M78,66 C84,64 89,70 88,80 C87,89 82,93 76,92 C71,91 71,72 78,66 Z", cls: "organ organ--lung" },
    { d: "M63,66 C59,63 54,65 54,70 C54,75 59,80 63,82 C67,80 72,75 72,70 C72,65 67,63 63,66 Z", cls: "organ organ--heart" },
    { d: "M72,74 C70,74 69,76 69,80 C69,87 72,90 78,90 C84,90 87,87 87,82 C87,77 85,74 82,74 Z", cls: "organ organ--liver" },
    { d: "M68,95 C62,94 56,97 56,103 C56,109 61,111 68,110 C69,105 69,100 68,95 Z", cls: "organ organ--stomach" },
    { d: "M58,112 C64,109 76,109 82,112 C84,116 82,120 76,121 C72,121 68,120 62,121 C57,121 56,117 58,112 Z", cls: "organ organ--gut" }
  ];
  organPaths.forEach(function (o) {
    const p = svgEl("path");
    p.setAttribute("d", o.d);
    p.setAttribute("class", o.cls);
    organs.appendChild(p);
  });

  const bladder = svgEl("ellipse");
  bladder.setAttribute("cx", 70);
  bladder.setAttribute("cy", 126);
  bladder.setAttribute("rx", 6);
  bladder.setAttribute("ry", 5);
  bladder.setAttribute("class", "organ organ--bladder");
  organs.appendChild(bladder);

  svg.appendChild(organs);

  const g = svgEl("g");
  g.setAttribute("class", "bone");

  const bones = [
    "M70,36 C" + (70 - 4 * t) + ",70 " + (70 - 4 * t) + ",95 " + (70 + 2 * t) + ",120",
    "M" + (70 - 10 * t) + ",120 L" + (70 + 10 * t) + ",120 L" + (70 + 5 * t) + ",131 L" + (70 - 5 * t) + ",131 Z",
    "M" + (70 - 18 * t) + ",52 L" + (70 - 23 * t) + ",88",
    "M" + (70 - 23 * t) + ",88 L" + (70 - 18 * t) + ",118",
    "M" + (70 + 18 * t) + ",52 L" + (70 + 23 * t) + ",88",
    "M" + (70 + 23 * t) + ",88 L" + (70 + 18 * t) + ",118",
    "M" + (70 - 4 * t) + ",122 L" + (70 - 8 * t) + ",176",
    "M" + (70 - 8 * t) + ",176 L" + (70 - 3 * t) + ",218",
    "M" + (70 + 4 * t) + ",122 L" + (70 + 8 * t) + ",176",
    "M" + (70 + 8 * t) + ",176 L" + (70 + 3 * t) + ",218"
  ];
  bones.forEach(function (d) {
    const p = svgEl("path");
    p.setAttribute("d", d);
    p.setAttribute("class", "bone-path");
    g.appendChild(p);
  });

  // kafatası + göz çukurları + çene
  const skull = svgEl("circle");
  skull.setAttribute("cx", 70);
  skull.setAttribute("cy", 24);
  skull.setAttribute("r", 12);
  skull.setAttribute("class", "bone-path");
  g.appendChild(skull);
  [[70 - 7 * t, 23], [70 + 7 * t, 23]].forEach(function (sck) {
    const socket = svgEl("circle");
    socket.setAttribute("cx", sck[0]);
    socket.setAttribute("cy", sck[1]);
    socket.setAttribute("r", 3);
    socket.setAttribute("class", "bone-path light");
    g.appendChild(socket);
  });
  const jaw = svgEl("path");
  jaw.setAttribute("d", "M62,28 C64,34 66,36 70,36 C74,36 76,34 78,28");
  jaw.setAttribute("class", "bone-path light");
  g.appendChild(jaw);

  // köprücük kemiği
  const collar = svgEl("path");
  collar.setAttribute("d", "M" + (70 - 14 * t) + ",51 L" + (70 + 14 * t) + ",51");
  collar.setAttribute("class", "bone-path");
  g.appendChild(collar);

  // göğüs kafesi (4 çift yay)
  for (let i = 0; i < 4; i++) {
    const y = 56 + i * 9;
    const left = svgEl("path");
    left.setAttribute("d", "M70," + y + " C" + (70 - 12 * t) + "," + y + " " + (70 - 16 * t) + "," + (y + 8) + " " + (70 - 12 * t) + "," + (y + 10));
    left.setAttribute("class", "bone-path light");
    const right = svgEl("path");
    right.setAttribute("d", "M70," + y + " C" + (70 + 12 * t) + "," + y + " " + (70 + 16 * t) + "," + (y + 8) + " " + (70 + 12 * t) + "," + (y + 10));
    right.setAttribute("class", "bone-path light");
    g.appendChild(left);
    g.appendChild(right);
  }

  // eklem noktaları
  [[70 - 23 * t, 88], [70 + 23 * t, 88], [70 - 8 * t, 176], [70 + 8 * t, 176], [70 - 4 * t, 120], [70 + 4 * t, 120]].forEach(function (j) {
    const joint = svgEl("circle");
    joint.setAttribute("cx", j[0]);
    joint.setAttribute("cy", j[1]);
    joint.setAttribute("r", 2.5);
    joint.setAttribute("class", "bone-path");
    g.appendChild(joint);
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
  flush: "#b03012",
  dry: "#8a6d3b",
  stomach: "#b03012",
  heart: "#8f2d24",
  bladder: "#4a6fa5",
  miosis: "#3a2e22",
  cold: "#4a6fa5",
  liver: "#8f2d24"
};

function buildMarker(m, layer, index) {
  const color = MARKER_COLORS[m.kind] || "#8f2d24";
  const group = svgEl("g");
  group.setAttribute("class", "marker");

  const tip = svgEl("title");
  tip.textContent = m.label;
  group.appendChild(tip);

  const dot = svgEl("circle");
  dot.setAttribute("cx", m.x);
  dot.setAttribute("cy", m.y);
  dot.setAttribute("r", 6);
  dot.setAttribute("fill", color);
  dot.setAttribute("class", "marker-dot");
  group.appendChild(dot);

  const halo = svgEl("circle");
  halo.setAttribute("cx", m.x);
  halo.setAttribute("cy", m.y);
  halo.setAttribute("r", 9.5);
  halo.setAttribute("fill", "none");
  halo.setAttribute("stroke", color);
  halo.setAttribute("stroke-width", 1);
  halo.setAttribute("opacity", 0.4);
  group.appendChild(halo);

  const num = svgEl("text");
  num.setAttribute("x", m.x);
  num.setAttribute("y", m.y + 2.4);
  num.setAttribute("text-anchor", "middle");
  num.setAttribute("class", "marker-num");
  num.textContent = String((index || 0) + 1);
  group.appendChild(num);

  const lx = m.x > 70 ? m.x - 4 : m.x + 4;
  const anchor = m.x > 70 ? "end" : "start";
  const label = svgEl("text");
  label.setAttribute("x", lx);
  label.setAttribute("y", m.y + (m.x > 70 ? -5 : 14));
  label.setAttribute("text-anchor", anchor);
  label.setAttribute("class", "marker-label");
  label.textContent = m.label;
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
    num.style.backgroundColor = MARKER_COLORS[m.kind] || "#8f2d24";
    num.textContent = String(i + 1);
    li.appendChild(num);
    li.appendChild(document.createTextNode(m.label));
    ol.appendChild(li);
  });
  return ol;
}

function renderAnatomy(caseData) {
  const inj = caseData.autopsy.injuries || { external: [], internal: [] };
  el.anatExternal.innerHTML = "";
  el.anatExternal.appendChild(buildExternalFigure(inj.external, caseData));
  const extLegend = buildLegend(inj.external);
  if (extLegend) el.anatExternal.appendChild(extLegend);
  el.anatInternal.innerHTML = "";
  el.anatInternal.appendChild(buildInternalFigure(inj.internal, caseData));
  const intLegend = buildLegend(inj.internal);
  if (intLegend) el.anatInternal.appendChild(intLegend);
}

// ================= Şüpheli sorguları =================

// O an sorgulanan şüpheli: aktif değilse ilk şüpheliye döner.
function activeSubject(caseData) {
  const ids = caseData.suspects.map(function (s) { return s.id; });
  if (ids.indexOf(state.activeSuspect) !== -1) return state.activeSuspect;
  return ids[0];
}

function sessionRecords(caseData, subject) {
  const out = [];
  caseData.interrogation.records.forEach(function (row, i) {
    if (row.subject === subject) out.push({ idx: i, row: row });
  });
  return out;
}

function renderTabs(caseData) {
  el.sessionTabs.innerHTML = "";
  const active = state.activeSuspect;

  caseData.suspects.forEach(function (s) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "session-tab" + (s.id === active ? " active" : "");
    btn.textContent = "Sorguya Çağır: " + s.name;
    btn.addEventListener("click", function () {
      selectSuspect(s.id);
    });
    el.sessionTabs.appendChild(btn);
  });
}

function selectSuspect(id) {
  state.activeSuspect = id;
  renderTranscript(state.currentCase);
  applyCardSelection();
}

function applyCardSelection() {
  const cards = el.suspectGrid.querySelectorAll("[data-suspect-id]");
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute("data-suspect-id") === state.activeSuspect) {
      cards[i].classList.add("selected");
    } else {
      cards[i].classList.remove("selected");
    }
  }
}

function renderTranscript(caseData) {
  const rec = caseData.interrogation;
  el.transcriptMeta.textContent = rec.officer + "  •  " + rec.date;

  state.activeSuspect = activeSubject(caseData);
  renderTabs(caseData);

  const suspect = caseData.suspects.find(function (s) { return s.id === state.activeSuspect; });
  const session = sessionRecords(caseData, state.activeSuspect);
  el.sessionInfo.textContent = "Şu an sorguda: " + suspect.name
    + " — " + suspect.note + " (" + session.length + " ifade)";

  el.transcriptList.innerHTML = "";
  session.forEach(function (item) {
    const row = item.row;
    const line = document.createElement("div");
    line.className = "transcript-line"
      + (row.clue ? " has-clue" : "")
      + (row.speaker.indexOf("Hakim") === 0 ? " is-question" : "");

    const who = document.createElement("span");
    who.className = "transcript-who";
    who.textContent = row.speaker;

    const body = document.createElement("span");
    body.className = "transcript-text";
    body.textContent = row.text;

    line.appendChild(who);
    line.appendChild(body);

    if (state.marked.indexOf(item.idx) !== -1) {
      line.classList.add("marked");
    }

    line.addEventListener("click", function () {
      if (state.resolved) return;
      toggleMark(item.idx);
    });

    el.transcriptList.appendChild(line);
  });
}

function toggleMark(i) {
  const idx = state.marked.indexOf(i);
  if (idx === -1) {
    state.marked.push(i);
  } else {
    state.marked.splice(idx, 1);
  }
  renderTranscript(state.currentCase);
  renderClues();
}

// ================= Şüpheliler =================

function renderSuspects() {
  el.suspectGrid.innerHTML = "";
  current().suspects.forEach(function (s) {
    const card = document.createElement("div");
    card.className = "suspect";
    card.setAttribute("data-suspect-id", s.id);
    if (s.id === state.activeSuspect) card.classList.add("selected");

    const initial = document.createElement("span");
    initial.className = "suspect__initial";
    initial.textContent = s.initial;

    const name = document.createElement("strong");
    name.textContent = s.name;

    const note = document.createElement("span");
    note.className = "suspect__note";
    note.textContent = s.note;

    card.appendChild(initial);
    card.appendChild(name);
    card.appendChild(note);

    card.addEventListener("click", function () {
      selectSuspect(s.id);
      el.transcript.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    el.suspectGrid.appendChild(card);
  });
}

// ================= İşaretlediklerim =================

function renderClues() {
  el.clueList.innerHTML = "";
  const records = current().interrogation.records;

  state.marked.forEach(function (i, k) {
    const li = document.createElement("li");
    const who = document.createElement("strong");
    who.textContent = records[i].speaker + ": ";
    li.appendChild(who);
    li.appendChild(document.createTextNode(records[i].text));
    if (k === state.marked.length - 1) {
      li.classList.add("fresh");
    }
    el.clueList.appendChild(li);
  });
  el.clueEmpty.hidden = state.marked.length > 0;
}

// ================= Karar formu =================

function fillSelects() {
  el.causeSelect.innerHTML = "";
  current().deathCauses.forEach(function (cause) {
    const opt = document.createElement("option");
    opt.value = cause;
    opt.textContent = cause;
    el.causeSelect.appendChild(opt);
  });

  el.suspectSelect.innerHTML = "";
  current().suspects.forEach(function (s) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    el.suspectSelect.appendChild(opt);
  });
}

function current() {
  return state.currentCase;
}

el.form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (state.resolved) return;

  const causeGuess = el.causeSelect.value;
  const causeRight = causeGuess === current().deathCauseCorrect;
  const suspectGuess = el.suspectSelect.value;
  const suspectRight = suspectGuess === current().culprit;

  state.resolved = true;
  el.form.classList.add("hidden");
  el.nextBtn.classList.remove("hidden");

  const culprit = current().suspects.find(function (s) {
    return s.id === current().culprit;
  });

  // İşaretlenen satırlardan kaçı gerçekten ipucuymuş?
  const records = current().interrogation.records;
  const clueHits = state.marked.filter(function (i) { return records[i].clue; }).length;
  const totalClues = records.filter(function (r) { return r.clue; }).length;
  const markedCount = state.marked.length;

  let msg = "İşaretlediğin " + markedCount + " satırdan " + clueHits
    + " tanesi gerçekten ipucuydu (toplam " + totalClues + " ipucu saklıydı). ";

  let verdict;
  if (causeRight && suspectRight) {
    el.result.className = "result correct";
    verdict = "Mükemmel! Hem ölüm nedenini ("
      + causeGuess + ") hem katili (" + culprit.name
      + ") buldun. " + current().solution;
  } else if (causeRight && !suspectRight) {
    el.result.className = "result partial";
    verdict = "Ölüm nedeni doğru (" + causeGuess
      + ") ama sanık yanlış. Gerçek katil " + culprit.name
      + " idi. " + current().solution;
  } else if (suspectRight && !causeRight) {
    el.result.className = "result partial";
    verdict = "Katili buldun (" + culprit.name
      + ") ama ölüm nedeni yanlış. Doğrusu: " + current().deathCauseCorrect
      + ". " + current().solution;
  } else {
    el.result.className = "result wrong";
    verdict = "İkisinde de yanıldın. Doğru ölüm nedeni: "
      + current().deathCauseCorrect + "; katil: " + culprit.name
      + ". " + current().solution;
  }
  el.result.textContent = msg + verdict;
});

el.nextBtn.addEventListener("click", function () {
  state.caseIndex += 1;
  loadCase(state.caseIndex);
});

loadCase(0);