// Oyun mantığı — davranış katmanı.
// Veri: cases.js (CASES). Bu dosya yalnızca arayüzü ve akışı yönetir.

const state = {
  caseIndex: 0,
  currentCase: null,
  marked: [],        // işaretlenen tutanak satır indexleri
  activeSuspect: null,
  resolved: false
};

const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const el = {
  stage: document.getElementById("stage"),
  caseNo: document.getElementById("case-no"),
  progressBar: document.getElementById("progress-bar"),
  tagline: document.querySelector(".tagline"),
  verdictBox: document.querySelector(".verdict"),
  title: document.getElementById("case-title"),
  story: document.getElementById("case-story"),
  sceneSummary: document.getElementById("scene-summary"),
  scenePlan: document.getElementById("scene-plan"),
  scenePlanMeta: document.getElementById("scene-plan-meta"),
  planLegend: document.getElementById("plan-legend"),
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

// ================= Görsel katman yardımcıları =================

// Scroll ile beliren bölümler: her vaka yüklenişinde yeniden kurulur.
const revealObserver = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
  entries.forEach(function (en) {
    if (en.isIntersecting) {
      en.target.classList.add("in");
      revealObserver.unobserve(en.target);
    }
  });
}, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }) : null;

function armReveals() {
  const items = document.querySelectorAll(".reveal");
  if (!revealObserver || REDUCED) {
    items.forEach(function (r) { r.classList.add("in"); });
    return;
  }
  items.forEach(function (r) {
    r.classList.remove("in");
    revealObserver.observe(r);
  });
}

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

// Üstte dosya ilerleme çubuğu
function updateProgress() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  el.progressBar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + "%";
}
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);

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

function loadCase(index) {
  const current = CASES[index % CASES.length];
  state.currentCase = current;
  state.marked = [];
  state.activeSuspect = null;
  state.resolved = false;

  el.caseNo.textContent = String(current.id).padStart(2, "0");
  const oldStamp = el.verdictBox.querySelector(".stamp-verdict");
  if (oldStamp) oldStamp.remove();

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

  armReveals();
  updateProgress();
}

// ================= Olay yeri =================

function renderScene(caseData) {
  el.sceneSummary.textContent = caseData.scene.summary;
  renderScenePlan(caseData.scene);

  el.sceneEvidence.innerHTML = "";
  caseData.scene.evidence.forEach(function (ev) {
    const li = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = ev.name;
    li.appendChild(strong);
    li.appendChild(document.createTextNode(" — " + ev.desc));
    el.sceneEvidence.appendChild(li);
  });
  stagger(el.sceneEvidence);
}

// Olay yeri krokisi: metre koordinatlı, ölçekli, numaralı SVG yerleşim planı.
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
  // pt(u, n): duvar boyunca u metre, içeri doğru n metre (n>0 oda içi).
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
        planText(svg, lx, ly, ft.label, "plan-feature-label", 0.3, anchor);
      }
    });
  });
}

function drawPlanChrome(svg, plan, f) {
  const w = plan.w, d = plan.d;

  // 1 metrelik ızgara
  for (let x = 1; x < w; x++) planLine(svg, x, 0, x, d, "plan-grid");
  for (let y = 1; y < d; y++) planLine(svg, 0, y, w, y, "plan-grid");

  if (!plan.enclosed) {
    planRect(svg, w / 2, d / 2, w, d, "plan-boundary");
  }

  // saha çizgileri (park yeri vb.)
  (plan.features || []).forEach(function (ft) {
    if (ft.kind === "line") planLine(svg, ft.x1, ft.y1, ft.x2, ft.y2, "plan-line");
  });

  // ölçü okları
  const dy = -0.85 * f;
  planLine(svg, 0, dy, w, dy, "plan-dim");
  planLine(svg, 0, dy - 0.14 * f, 0, dy + 0.14 * f, "plan-dim");
  planLine(svg, w, dy - 0.14 * f, w, dy + 0.14 * f, "plan-dim");
  planText(svg, w / 2, dy - 0.22 * f, w + " m", "plan-dim-text", 0.3 * f);

  const dx = -0.85 * f;
  planLine(svg, dx, 0, dx, d, "plan-dim");
  planLine(svg, dx - 0.14 * f, 0, dx + 0.14 * f, 0, "plan-dim");
  planLine(svg, dx - 0.14 * f, d, dx + 0.14 * f, d, "plan-dim");
  const dt = planText(svg, dx - 0.22 * f, d / 2, d + " m", "plan-dim-text", 0.3 * f);
  dt.setAttribute("transform", "rotate(-90 " + (dx - 0.22 * f) + " " + (d / 2) + ")");

  // kuzey oku
  const nx = w + 1.05 * f, ny = -0.55 * f, nr = 0.5 * f;
  planCircle(svg, nx, ny, nr, "plan-compass");
  planPath(svg, "M" + nx + "," + (ny + nr * 0.62) + " L" + nx + "," + (ny - nr * 0.62), "plan-compass plan-compass--needle");
  planPath(svg, "M" + nx + "," + (ny - nr * 0.62) +
    " L" + (nx - nr * 0.3) + "," + (ny - nr * 0.05) +
    " L" + (nx + nr * 0.3) + "," + (ny - nr * 0.05) + " Z", "plan-compass plan-compass--head");
  planText(svg, nx, ny - nr - 0.18 * f, "K", "plan-compass-text", 0.42 * f);

  // ölçek çubuğu
  const sy = d + 1.2 * f, sl = Math.min(2, w);
  planLine(svg, 0, sy, sl, sy, "plan-dim");
  for (let m = 0; m <= sl; m++) {
    planLine(svg, m, sy - 0.12 * f, m, sy + 0.12 * f, "plan-dim");
    planText(svg, m, sy + 0.48 * f, m === sl ? m + " m" : String(m), "plan-dim-text", 0.26 * f);
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
    planRect(g, 0, 0, w, h, "plan-furniture plan-furniture--car", 0.5);
    const wy = -h / 2 + h * 0.24;
    planPath(g, "M" + (-w / 2 + 0.14) + "," + wy + " Q0," + (wy + 0.22) + " " + (w / 2 - 0.14) + "," + wy, "plan-detail");
    const ry = h / 2 - h * 0.18;
    planPath(g, "M" + (-w / 2 + 0.16) + "," + ry + " Q0," + (ry - 0.2) + " " + (w / 2 - 0.16) + "," + ry, "plan-detail");
    planRect(g, -w / 2 - 0.08, wy + 0.1, 0.14, 0.1, "plan-furniture", 0.03);
    planRect(g, w / 2 + 0.08, wy + 0.1, 0.14, 0.1, "plan-furniture", 0.03);
  },
  "body-seat": function (g) {
    const t = svgEl("ellipse");
    t.setAttribute("cx", 0); t.setAttribute("cy", 0.12);
    t.setAttribute("rx", 0.3); t.setAttribute("ry", 0.22);
    t.setAttribute("class", "plan-body");
    g.appendChild(t);
    planCircle(g, 0, -0.22, 0.15, "plan-body");
  },
  body: function (g, o) {
    const h = o.h || 1.7;
    planCircle(g, 0, -h / 2 + 0.18, 0.17, "plan-body");
    planRect(g, 0, 0.12, 0.52, h - 0.75, "plan-body", 0.2);
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

function renderScenePlan(scene) {
  const plan = scene.plan;
  const objects = scene.objects;
  const w = plan.w, d = plan.d;
  const f = Math.max(1, Math.max(w, d) / 9);

  el.scenePlan.innerHTML = "";
  el.planLegend.innerHTML = "";
  el.scenePlanMeta.textContent = plan.caption + "  •  " + w + "×" + d + " m  •  Kuzey yukarıda";
  el.scenePlan.setAttribute("aria-label", "Olay yeri krokisi: " + plan.caption);

  const svg = svgEl("svg");
  const padX = 1.9 * f, padTop = 1.8 * f, padBot = 2.1 * f;
  svg.setAttribute("viewBox", (-padX) + " " + (-padTop) + " " + (w + padX * 2) + " " + (d + padTop + padBot));
  svg.setAttribute("class", "plan-svg");

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
    g.appendChild(shape);

    const m = markerPos(o);
    const dist = Math.sqrt((m.x - o.x) * (m.x - o.x) + (m.y - o.y) * (m.y - o.y));
    if (dist > 0.55) planLine(g, m.x, m.y, o.x, o.y, "plan-leader");

    const mr = 0.3 * f;
    planCircle(g, m.x, m.y, mr, "plan-marker-disc");
    planText(g, m.x, m.y + mr * 0.38, String(i + 1), "plan-marker-num", 0.4 * f);

    svg.appendChild(g);
    items.push(g);
  });

  el.scenePlan.appendChild(svg);

  // lejant
  const lis = [];
  objects.forEach(function (o, i) {
    const li = document.createElement("li");
    li.setAttribute("data-i", i);

    const num = document.createElement("span");
    num.className = "plan-legend__num";
    num.textContent = String(i + 1);
    li.appendChild(num);

    const text = document.createElement("span");
    text.className = "plan-legend__text";
    const strong = document.createElement("strong");
    strong.textContent = o.label;
    text.appendChild(strong);
    if (o.label2) {
      text.appendChild(document.createTextNode(" — "));
      const sub = document.createElement("em");
      sub.className = "plan-legend__sub";
      sub.textContent = o.label2;
      text.appendChild(sub);
    }
    li.appendChild(text);

    li.tabIndex = 0;
    el.planLegend.appendChild(li);
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
  stagger(el.csiItems);
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
  stagger(el.toxTable);
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

// Yardımcı: path öğesi üret
function pathEl(d, cls) {
  const p = svgEl("path");
  p.setAttribute("d", d);
  p.setAttribute("class", cls);
  return p;
}

// Ön (anterior) görünüm, anatomik pozisyon — t=1 taban koordinatları.
// Gövde ekseni x=70; baş merkezi (70,~21), göğüs 52-90, karın 90-125, pelvis 125-133.
const FIG = {
  head: "M70,9.2 C76.8,9.2 81.2,14.2 81.2,20.8 C81.2,24.6 80.2,27.8 78.4,30.1 "
    + "C77.6,33 75.8,35.8 73.4,37 C72.2,37.6 67.8,37.6 66.6,37 "
    + "C64.2,35.8 62.4,33 61.6,30.1 C59.8,27.8 58.8,24.6 58.8,20.8 C58.8,14.2 63.2,9.2 70,9.2 Z",
  neck: "M65.4,36.6 L64.7,45.2 C64.7,47.6 66.2,48.8 70,48.8 C73.8,48.8 75.3,47.6 75.3,45.2 "
    + "L74.6,36.6 C73.2,37.5 66.8,37.5 65.4,36.6 Z",
  torso: "M63.6,47.9 C58.6,49.3 54.6,51.1 52.3,54.3 C50.7,56.7 50.3,59.9 50.9,62.9 "
    + "C51.7,65.3 53.3,66.9 55.3,67.7 C54.3,72.1 53.7,78.1 53.9,84.1 "
    + "C54.1,90.1 55.1,95.1 56.5,98.6 C57.7,103.1 58.3,107.1 58.1,111.1 "
    + "C57.9,116.1 58.9,121.1 61.1,125.1 C63.1,128.6 66.1,130.6 70,130.9 "
    + "C73.9,130.6 76.9,128.6 78.9,125.1 C81.1,121.1 82.1,116.1 81.9,111.1 "
    + "C81.7,107.1 82.3,103.1 83.5,98.6 C84.9,95.1 85.9,90.1 86.1,84.1 "
    + "C86.3,78.1 85.7,72.1 84.7,67.7 C86.7,66.9 88.3,65.3 89.1,62.9 "
    + "C89.7,59.9 89.3,56.7 87.7,54.3 C85.4,51.1 81.4,49.3 76.4,47.9 "
    + "C72.4,49.5 67.6,49.5 63.6,47.9 Z",
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
  legL: "M61.2,125.2 C59.3,128.7 58.5,132.7 58.7,137.2 C58.9,145.2 59.7,153.2 60.7,160.2 "
    + "C61.3,165.2 61.7,169.2 61.5,173.2 C61.3,178.2 60.5,184.2 59.8,190.2 "
    + "C59.2,196.2 59,202.2 59.4,208.2 C59.6,211.4 59.9,214.2 60.1,216.7 "
    + "C59.5,220.7 58.5,224.4 56.7,227 C55.3,229 53.5,230 53.7,231.1 "
    + "C53.9,232.1 55.7,232.6 58.1,232.6 L65.7,232.6 C67.1,232.6 68,231.8 67.9,230.4 "
    + "L67.3,221.2 C67.1,218.4 67,217 66.9,215.7 C66.7,212.2 66.6,208.2 66.7,203.2 "
    + "C66.8,197.2 67.1,190.7 67.5,184.7 C67.8,179.7 68,175.7 67.9,172.2 "
    + "C67.8,167.7 68,161.7 68.3,155.7 C68.6,148.7 68.8,141.2 68.7,135.2 "
    + "C68.6,131.7 68.9,128.4 69.4,126.4 C66.6,129.2 63.7,128.2 61.2,125.2 Z",
  legR: "M78.8,125.2 C80.7,128.7 81.5,132.7 81.3,137.2 C81.1,145.2 80.3,153.2 79.3,160.2 "
    + "C78.7,165.2 78.3,169.2 78.5,173.2 C78.7,178.2 79.5,184.2 80.2,190.2 "
    + "C80.8,196.2 81,202.2 80.6,208.2 C80.4,211.4 80.1,214.2 79.9,216.7 "
    + "C80.5,220.7 81.5,224.4 83.3,227 C84.7,229 86.5,230 86.3,231.1 "
    + "C86.1,232.1 84.3,232.6 81.9,232.6 L74.3,232.6 C72.9,232.6 72,231.8 72.1,230.4 "
    + "L72.7,221.2 C72.9,218.4 73,217 73.1,215.7 C73.3,212.2 73.4,208.2 73.3,203.2 "
    + "C73.2,197.2 72.9,190.7 72.5,184.7 C72.2,179.7 72,175.7 72.1,172.2 "
    + "C72.2,167.7 72,161.7 71.7,155.7 C71.4,148.7 71.2,141.2 71.3,135.2 "
    + "C71.4,131.7 71.1,128.4 70.6,126.4 C73.4,129.2 76.3,128.2 78.8,125.2 Z"
};

// Vücut tipi ölçeğini orta eksene (x=70) uygular.
function scaledGroup(t) {
  const g = svgEl("g");
  g.setAttribute("transform", "translate(" + (70 * (1 - t)) + ",0) scale(" + t + ",1)");
  return g;
}

// "Dış yüzey" figürü: adli tıp şeması tarzında ön görünüm, anatomik pozisyon.
// Yüz hatları nötr çizilir; gölgeli tıbbi illüstrasyon; yüzeyel damarlar görünür.
function buildExternalFigure(markers, caseData) {
  const svg = svgEl("svg");
  svg.setAttribute("viewBox", "0 0 " + BODY.canvasW + " " + BODY.canvasH);
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

  // yüz (nötr adli çizim): kulak, kaş, göz, burun, ağız
  g.appendChild(pathEl("M58.9,21.2 C57.6,21.6 57.5,24.8 59,25.6", "face-line"));
  g.appendChild(pathEl("M81.1,21.2 C82.4,21.6 82.5,24.8 81,25.6", "face-line"));
  g.appendChild(pathEl("M62.8,21.2 C64.4,20.4 66.6,20.4 67.8,21", "face-line"));
  g.appendChild(pathEl("M72.2,21 C73.4,20.4 75.6,20.4 77.2,21.2", "face-line"));
  [["M63.2,23.4 C64.4,22.2 66.4,22.2 67.4,23.4 C66.4,24.5 64.4,24.5 63.2,23.4 Z", 65.3],
   ["M72.6,23.4 C73.6,22.2 75.6,22.2 76.8,23.4 C75.6,24.5 73.6,24.5 72.6,23.4 Z", 74.7]].forEach(function (e) {
    g.appendChild(pathEl(e[0], "eye-shape"));
    const pupil = svgEl("circle");
    pupil.setAttribute("cx", e[1]);
    pupil.setAttribute("cy", 23.35);
    pupil.setAttribute("r", 0.9);
    pupil.setAttribute("class", "pupil");
    g.appendChild(pupil);
  });
  g.appendChild(pathEl("M68.7,28.2 C69.4,29.2 70.6,29.2 71.3,28.2", "face-line"));
  g.appendChild(pathEl("M66.6,32.4 C68.6,33.6 71.4,33.6 73.4,32.4", "face-line"));

  // gövde anatomik işaretleri
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

  // kol ayrıntıları: dirsek, bilek, başparmak, parmak çizgileri
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

  // bacak ayrıntıları: diz kapağı, ayak parmakları
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

  // yüzeyel damarlar
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
// "İskelet / iç organ" figürü: gerçek otopsi şeması tarzında — soluk beden
// silüeti üzerinde omurga, göğüs kafesi, pelvis ve renk kodlu iç organlar.
function buildInternalFigure(markers, caseData) {
  const svg = svgEl("svg");
  svg.setAttribute("viewBox", "0 0 " + BODY.canvasW + " " + BODY.canvasH);
  svg.setAttribute("class", "anatomy-svg");
  const t = bodyScale(caseData).t;

  const g = scaledGroup(t);

  // soluk beden silüeti
  [FIG.head, FIG.neck, FIG.torso, FIG.armL, FIG.armR, FIG.legL, FIG.legR].forEach(function (d) {
    g.appendChild(pathEl(d, "silhouette"));
  });

  // omurga (servikal + torakal/lomber omurlar)
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

  // iç organlar
  const organs = svgEl("g");
  organs.setAttribute("class", "organs");

  // trakea + bronşlar
  organs.appendChild(pathEl("M68.6,41.5 L68.6,52.5 C68.6,54.5 69,55.8 70,56.6 C71,55.8 71.4,54.5 71.4,52.5 L71.4,41.5 C70.5,42.1 69.5,42.1 68.6,41.5 Z", "organ organ--trachea"));
  organs.appendChild(pathEl("M70,56.6 C68,58.6 66.4,60.6 65.4,62.6", "detail-line"));
  organs.appendChild(pathEl("M70,56.6 C72,58.6 73.6,60.6 74.6,62.6", "detail-line"));

  // böbrekler (retroperitoneal, diğer organların altında)
  organs.appendChild(pathEl("M56.4,95.4 C54.8,96.2 54,98.4 54.4,101 C54.8,103.6 56.2,105.4 57.9,105.2 C59.4,105 60.2,103.2 60,100.8 C59.8,98.2 58.2,95.8 56.4,95.4 Z", "organ organ--kidney"));
  organs.appendChild(pathEl("M83.6,95.4 C85.2,96.2 86,98.4 85.6,101 C85.2,103.6 83.8,105.4 82.1,105.2 C80.6,105 79.8,103.2 80,100.8 C80.2,98.2 81.8,95.8 83.6,95.4 Z", "organ organ--kidney"));

  // akciğerler (sağda 3 lob çizgisi, solda kalp çentiği)
  organs.appendChild(pathEl("M66.4,57.4 C61.4,58.2 57.2,62 55.9,67.6 C54.7,73.2 54.8,80.4 55.8,86 C56.6,90.2 58.6,92.8 61.6,93.3 C64.4,93.7 66.2,91.8 66.4,88.6 L66.6,61.8 C66.6,59.4 66.6,58 66.4,57.4 Z", "organ organ--lung"));
  organs.appendChild(pathEl("M73.6,57.4 C78.6,58.2 82.8,62 84.1,67.6 C85.3,73.2 85.2,80.4 84.2,86 C83.4,90.2 81.4,92.8 78.4,93.3 C75.6,93.7 73.9,91.8 73.7,89 C76,87.2 77.3,84.4 76.9,81.4 C76.5,78.8 75.1,77.2 73.5,76.7 L73.4,61.8 C73.4,59.4 73.4,58 73.6,57.4 Z", "organ organ--lung"));
  organs.appendChild(pathEl("M56.4,74 C59.4,77.4 62.8,79.6 66.4,80.6", "detail-line"));
  organs.appendChild(pathEl("M56.2,71.4 C59.4,70.6 63,70.4 66.5,70.8", "detail-line"));
  organs.appendChild(pathEl("M83.6,74 C80.6,77.4 77.4,79.4 74,80.2", "detail-line"));

  // kalp (apeks sola aşağıda) + büyük damar hizaları
  organs.appendChild(pathEl("M66.2,63.2 C63.2,64.6 61.7,67.6 62.3,71.2 C62.9,75.2 65.1,79.4 68.5,82.4 C71.6,85.2 75.5,86.9 78.1,85.7 C80.5,84.5 81.3,81.6 80.5,78.4 C79.6,74.6 77.1,70.4 73.9,67.3 C71.5,64.9 68.8,62.4 66.2,63.2 Z", "organ organ--heart"));
  organs.appendChild(pathEl("M66.8,63.4 C66.2,61.4 66.4,59.6 67.4,58.2", "detail-line"));
  organs.appendChild(pathEl("M70.2,63 C70.4,61 71.2,59.4 72.6,58.4", "detail-line"));
  organs.appendChild(pathEl("M73.6,64.2 C74.6,62.4 76,61.2 77.6,60.8", "detail-line"));

  // diyafram hattı
  organs.appendChild(pathEl("M55.4,89.4 C60.4,93.8 66,95.6 70,95.6 C74,95.6 79.6,93.8 84.6,89.4", "detail-line detail-line--dash"));

  // karaciğer (sağ hipokondrium, orta hattı aşan sol lob)
  organs.appendChild(pathEl("M56.8,89.2 C54.8,91 54,94.4 55,97.6 C56,100.8 58.8,103 62.7,103.5 C67.2,104.1 71.7,103.1 75,101.1 C77,99.9 77.8,98.1 77,96.5 C75.8,94.1 72.2,92.5 68.2,91.5 C64.2,90.5 59.8,88.8 56.8,89.2 Z", "organ organ--liver"));

  // mide (sol hipokondrium, J kıvrımı)
  organs.appendChild(pathEl("M72.6,90.2 C76.2,89.6 80.2,90.6 82.6,93.2 C84.8,95.6 85.2,98.8 83.6,101.4 C82,103.8 79.2,104.8 76.6,104 C74.6,103.4 73.2,101.8 73,99.8 C72.8,98 73.6,96.4 75,95.6 C74,94.4 73,92.4 72.6,90.2 Z", "organ organ--stomach"));

  // ince bağırsak kitlesi + kıvrım çizgileri
  organs.appendChild(pathEl("M62.2,105.8 C58.7,107.8 57.3,111.8 57.7,116.3 C58.1,120.8 60.1,124.6 63.7,126.2 C67.1,127.7 72.9,127.7 76.3,126.2 C79.9,124.6 81.9,120.8 82.3,116.3 C82.7,111.8 81.3,107.8 77.8,105.8 C72.8,103.6 67.2,103.6 62.2,105.8 Z", "organ organ--gut"));
  ["M60.4,110.6 C64,109 68.4,109.2 71.6,111 C74.6,112.6 77.4,112.8 79.8,111.6",
   "M59.6,115.4 C63.4,113.8 67.6,114.2 70.8,116 C73.8,117.6 77,117.8 80.2,116.4",
   "M60.6,120.2 C64.2,118.8 68.2,119.2 71.2,120.8 C74,122.2 76.8,122.4 79.4,121.2",
   "M63.4,124.2 C66.4,123 70,123.2 72.8,124.4"].forEach(function (d) {
    organs.appendChild(pathEl(d, "detail-line"));
  });

  // mesane
  const bladder = svgEl("ellipse");
  bladder.setAttribute("cx", 70);
  bladder.setAttribute("cy", 129.4);
  bladder.setAttribute("rx", 5.6);
  bladder.setAttribute("ry", 4.4);
  bladder.setAttribute("class", "organ organ--bladder");
  organs.appendChild(bladder);

  g.appendChild(organs);

  // göğüs kafesi: klavikula, sternum konturu, kotlar
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

  // pelvis (ilyak kanatlar + pubis yayı)
  g.appendChild(pathEl("M69,118.6 C64.6,117.8 60.4,119 58.2,122 C56.4,124.6 56.6,127.8 58.8,130 C60.8,131.9 63.8,132.8 66.2,132.4 C67.8,132.1 68.8,131 69,129.6 Z", "bone-wing"));
  g.appendChild(pathEl("M71,118.6 C75.4,117.8 79.6,119 81.8,122 C83.6,124.6 83.4,127.8 81.2,130 C79.2,131.9 76.2,132.8 73.8,132.4 C72.2,132.1 71.2,131 71,129.6 Z", "bone-wing"));
  g.appendChild(pathEl("M66.4,132.6 C68.4,134.2 71.6,134.2 73.6,132.6", "bone-path light"));

  // kafatası: kranyum, orbita, burun boşluğu, mandibula, diş hattı
  const skull = svgEl("circle");
  skull.setAttribute("cx", 70);
  skull.setAttribute("cy", 20.8);
  skull.setAttribute("r", 11.4);
  skull.setAttribute("class", "bone-path");
  g.appendChild(skull);
  [[65.4], [74.6]].forEach(function (sck) {
    const socket = svgEl("circle");
    socket.setAttribute("cx", sck[0]);
    socket.setAttribute("cy", 21.6);
    socket.setAttribute("r", 2.9);
    socket.setAttribute("class", "bone-path light");
    g.appendChild(socket);
  });
  g.appendChild(pathEl("M70,24.6 L68.8,28.2 L71.2,28.2 Z", "bone-path light"));
  g.appendChild(pathEl("M61.4,27.4 C63,33.4 66,36.2 70,36.2 C74,36.2 77,33.4 78.6,27.4", "bone-path light"));
  g.appendChild(pathEl("M66.4,31.4 L73.6,31.4", "bone-path light"));

  // kol kemikleri: humerus, radius/ulna, el
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

  // bacak kemikleri: femur, patella, tibia/fibula, ayak
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
  renderTranscript(state.currentCase, true);
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

function renderTranscript(caseData, animate) {
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

  if (animate && !REDUCED) {
    el.transcriptList.classList.remove("swap");
    void el.transcriptList.offsetWidth;
    el.transcriptList.classList.add("swap");
  }
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
  stagger(el.suspectGrid);
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

  // Karar mührü
  const stamp = document.createElement("span");
  const solved = causeRight && suspectRight;
  const partial = causeRight || suspectRight;
  stamp.className = "stamp-verdict " + (solved ? "ok" : (partial ? "mid" : "bad"));
  stamp.textContent = solved ? "DOSYA KAPANDI" : (partial ? "KISMEN ÇÖZÜLDÜ" : "DOSYA AÇIK KALDI");
  el.result.insertAdjacentElement("beforebegin", stamp);
});

function scrollTopInstant() {
  const prev = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  document.documentElement.style.scrollBehavior = prev;
}

el.nextBtn.addEventListener("click", function () {
  state.caseIndex += 1;
  if (REDUCED) {
    loadCase(state.caseIndex);
    scrollTopInstant();
    return;
  }
  el.stage.classList.add("stage--out");
  setTimeout(function () {
    loadCase(state.caseIndex);
    scrollTopInstant();
    el.stage.classList.remove("stage--out");
  }, 290);
});

loadCase(0);
typeTagline();
updateProgress();