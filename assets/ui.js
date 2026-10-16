// UI layer: the station menu, panels, routes, intro and accessibility. The universe engine is in space.js.
import { Space } from "./space.js";
import { PROJECTS, EXPERIENCE, CATEGORIES } from "./content.js";
import { ANCHORS } from "./fig/station.mjs";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const session = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch {} } };

const SECTIONS = ["work", "experience", "skills", "about", "contact"];
const LABEL = { work: "Work", experience: "Experience", skills: "Skills", about: "About", contact: "Contact" };
const PART = { work: "Lab module", experience: "Solar arrays", skills: "Observatory", about: "Crew quarters", contact: "Comms dish" };
const ROLES_NEWEST = [...EXPERIENCE].reverse();

/* ============================ layout: where the station and its labels go ============================ */
const menu = $("#stationMenu"), lines = $("#hot-lines"), hint = $("#hint");
const hots = Object.fromEntries($$(".hot", menu).map((a) => [a.dataset.part, a]));
let tall = false, labelMode = true, homeBox = null, sideBox = null, panelW = 0;
// label offsets as a share of the drawn station width (tuned to the drawing)
const OFFSET = { work: [0.06, 0.22], experience: [0.12, -0.2], skills: [0.1, -0.2], about: [-0.15, 0.13], contact: [-0.12, -0.2], resume: [0.16, 0.08] };
function measure() {
  tall = innerWidth < 761 || innerWidth / innerHeight < 0.8;
  if (tall) {
    const hero = $(".hero").getBoundingClientRect(), tb = $(".tabbar").getBoundingClientRect();
    document.documentElement.style.setProperty("--slot-top", `${Math.round(hero.bottom + 8)}px`);
    document.documentElement.style.setProperty("--tabbar", `${Math.round(tb.height || 64)}px`);
  }
  const slot = slotRect();
  labelMode = slot.width >= 600;
  menu.classList.toggle("pins", !labelMode);
  const mx = labelMode ? 92 : 6, my = labelMode ? 80 : 30;
  const w = Math.max(160, Math.min(slot.width - mx * 2, ((slot.height - my * 2) * 900) / 560));
  homeBox = { cx: slot.left + slot.width / 2, cy: slot.top + slot.height / 2 + (labelMode ? 10 : 0), w };
  Space.setHomeBox(homeBox);
  panelW = tall ? innerWidth : Math.min(740, innerWidth * 0.58);
  const free = innerWidth - panelW - 36 * 2;
  sideBox = tall ? { cx: innerWidth / 2, cy: innerHeight / 2, w: innerWidth * 0.9 } : { cx: free / 2 + 20, cy: innerHeight / 2 + 24, w: Math.max(200, Math.min(free * 0.92, (innerHeight - 200) * 1.6)) };
}
function slotRect() {
  const el = document.createElement("div"); el.id = "station-slot"; document.body.appendChild(el);
  const r = el.getBoundingClientRect(); el.remove(); return r;
}

/* ============================ hotspots follow the station every frame ============================ */
let lineEls = {}, hintPos = null;
function frame(f) {
  const show = Space.scene === "home" && !panelOpen && f.station.visible && f.station.alpha > 0.15;
  menu.style.visibility = show ? "visible" : "hidden";
  menu.style.opacity = show ? Math.min(1, f.station.alpha).toFixed(3) : "0";
  for (const a of Object.values(hots)) a.tabIndex = show ? 0 : -1;
  if (!show) { hint.style.opacity = "0"; return; }
  const { left, top, sc } = f.station, sw = 900 * sc, sh = 560 * sc;
  const pts = {};
  for (const k of ["work", "experience", "skills", "about", "contact"]) pts[k] = [left + ANCHORS[k][0] * sc, top + ANCHORS[k][1] * sc];
  pts.resume = [f.dock[0] + Math.cos(0) * 0, f.dock[1]];
  const placed = [];
  // pin mode (phones): keep every 44px pin clear of the others, with a short leader back to its part
  const pinAt = {};
  if (!labelMode) {
    const P = Object.keys(hots).map((k) => ({ k, ax: pts[k][0], ay: pts[k][1], x: pts[k][0], y: pts[k][1] }));
    for (let it = 0; it < 40; it++) {
      let moved = false;
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const a = P[i], b = P[j]; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01, need = 50;
        if (d < need) { if (d < 0.5) { dx = 1; dy = 0.3; } const push = (need - d) / 2, ux = dx / (Math.hypot(dx, dy)), uy = dy / (Math.hypot(dx, dy)); a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; moved = true; }
      }
      if (!moved) break;
    }
    for (const p of P) pinAt[p.k] = [Math.max(24, Math.min(innerWidth - 24, p.x)), p.y];
  }
  for (const [k, a] of Object.entries(hots)) {
    const [x, y] = pts[k], pin = a.firstElementChild, lab = a.lastElementChild;
    const [px, py] = labelMode ? [x, y] : pinAt[k];
    pin.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
    let line = lineEls[k];
    if (!line) { line = lineEls[k] = document.createElementNS("http://www.w3.org/2000/svg", "line"); lines.appendChild(line); }
    if (!labelMode) {
      const far = Math.hypot(px - x, py - y) > 6;
      line.style.display = far ? "" : "none";
      if (far) { line.setAttribute("x1", x.toFixed(1)); line.setAttribute("y1", y.toFixed(1)); line.setAttribute("x2", px.toFixed(1)); line.setAttribute("y2", py.toFixed(1)); }
      continue;
    }
    const lw = lab._w || (lab._w = lab.offsetWidth), lh = lab._h || (lab._h = lab.offsetHeight);
    let lx = x + OFFSET[k][0] * sw - lw / 2, ly = y + OFFSET[k][1] * sw - lh / 2;
    lx = Math.max(12, Math.min(innerWidth - lw - 12, lx)); ly = Math.max(76, Math.min(innerHeight - lh - 12, ly));
    for (let i = 0; i < 6; i++) {           // nudge apart from labels already placed
      const hit = placed.find((o) => lx < o.x + o.w + 8 && lx + lw + 8 > o.x && ly < o.y + o.h + 6 && ly + lh + 6 > o.y);
      if (!hit) break;
      ly = ly + lh / 2 < hit.y + hit.h / 2 ? hit.y - lh - 8 : hit.y + hit.h + 8;
    }
    placed.push({ x: lx, y: ly, w: lw, h: lh });
    lab.style.transform = `translate3d(${lx.toFixed(1)}px,${ly.toFixed(1)}px,0)`;
    // connector from the part to the nearest point on the label
    const ex = Math.max(lx, Math.min(lx + lw, x)), ey = Math.max(ly, Math.min(ly + lh, y));
    line.style.display = "";
    line.setAttribute("x1", x.toFixed(1)); line.setAttribute("y1", y.toFixed(1)); line.setAttribute("x2", ex.toFixed(1)); line.setAttribute("y2", ey.toFixed(1));
    line.classList.toggle("on", a.classList.contains("on"));
  }
  // first-visit hint under the station
  if (!hint.classList.contains("gone")) {
    const hw = hint.offsetWidth, hx = Math.max(12, Math.min(innerWidth - hw - 12, left + sw / 2 - hw / 2));
    const hy = tall ? innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tabbar")) || 64) - 52 : innerHeight - 64;
    hint.style.transform = `translate3d(${hx.toFixed(1)}px,${hy.toFixed(1)}px,0)`;
    hint.style.opacity = "";
  }
}
function setHot(part) {
  for (const [k, a] of Object.entries(hots)) a.classList.toggle("on", k === part);
  $$("[data-sec-link]").forEach((l) => l.classList.toggle("hot-on", l.dataset.secLink === part));
  Space.highlight(part && part !== "resume" ? part : null);
}
for (const [k, a] of Object.entries(hots)) {
  a.addEventListener("pointerenter", () => setHot(k)); a.addEventListener("pointerleave", () => setHot(null));
  a.addEventListener("focus", () => setHot(k)); a.addEventListener("blur", () => setHot(null));
  a.addEventListener("click", seenHint);
}
$$("[data-sec-link]").forEach((l) => {
  l.addEventListener("pointerenter", () => setHot(l.dataset.secLink)); l.addEventListener("pointerleave", () => setHot(null));
  l.addEventListener("focus", () => setHot(l.dataset.secLink)); l.addEventListener("blur", () => setHot(null));
});
function seenHint() { hint.classList.add("gone"); store.set("pj-station-hint", "1"); }
if (store.get("pj-station-hint")) hint.classList.add("gone");

/* ============================ routing ============================ */
// #/  ·  #/explore  ·  #/work[/slug]  ·  #/experience[/id]  ·  #/skills  ·  #/about  ·  #/contact
const LEGACY = (parts) => {
  if (parts[0] === "galaxy") {
    const cat = parts[1], n = +parts[2];
    const list = PROJECTS.filter((p) => p.category === cat);
    if (n && list[n - 1]) return `#/work/${list[n - 1].slug}`;
    if (CATEGORIES.some((c) => c.id === cat)) { filter = cat; return "#/work"; }
  }
  return { log: "#/experience", comms: "#/contact", crew: "#/about", mission: "#/work/mission-001" }[parts[0]] || null;
};
function parse(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (!parts.length) return { home: true };
  if (parts[0] === "explore") return { explore: true };
  if (SECTIONS.includes(parts[0])) {
    if (parts[0] === "work" && parts[1] && !PROJECTS.some((p) => p.slug === parts[1])) return { sec: "work" };
    if (parts[0] === "experience" && parts[1] && !EXPERIENCE.some((e) => e.id === parts[1])) return { sec: "experience" };
    return { sec: parts[0], sub: parts[1] };
  }
  const to = LEGACY(parts);
  return to ? { redirect: to } : { home: true };
}
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };
let panelOpen = false, origin = "home", fromExplore = false, current = null, opener = null, filter = "featured";
function route() {
  const r = parse(location.hash);
  if (r.redirect) { history.replaceState(null, "", r.redirect); return route(); }
  if (r.home) return toHome();
  if (r.explore) return toExplore();
  openSection(r.sec, r.sub);
}
addEventListener("hashchange", route);

function setExploreUI(on) {
  body.classList.toggle("explore", on);
  const b = $("#exploreBtn");
  b.textContent = on ? "Back to station" : "Explore the universe";
  b.setAttribute("href", on ? "#/" : "#/explore");
}
function toHome() {
  closePanel(); origin = "home"; setExploreUI(false);
  Space.setPanel(null); Space.home(homeBox);
  document.title = baseTitle;
}
function toExplore() {
  closePanel(); origin = "explore"; setExploreUI(true);
  Space.setPanel(null); Space.explore();
  document.title = `Explore the universe · ${baseTitle}`;
  seenHint();
  live(`Exploring the universe. Drag to move around; galaxies hold the work.`);
}

/* ============================ panels ============================ */
const wrap = $("#panelWrap"), panel = $("#panel"), pTitle = $("#p-title"), pKicker = $("#p-kicker");
const baseTitle = document.title;
const destFor = (sec, sub) => {
  if (sec === "work") {
    const p = sub && PROJECTS.find((x) => x.slug === sub);
    if (p) return p.slug === "mission-001" ? "mission" : p.category;
    return CATEGORIES.some((c) => c.id === filter) ? filter : "ai";
  }
  return { experience: "log", skills: "skills", contact: "comms" }[sec] || null;
};
function openSection(sec, sub) {
  const firstOpen = !panelOpen;
  if (firstOpen) opener = document.activeElement;
  const explore = fromExplore || (body.classList.contains("explore") && origin === "explore");
  fromExplore = false;
  seenHint();
  render(sec, sub);
  const dest = destFor(sec, sub);
  if (explore && dest && sec !== "about") {
    origin = "explore"; setExploreUI(true);
    Space.setPanel({ origin, dest });
    const already = Space.scene === "explore" && current && current.dest === dest;
    current = { sec, sub, dest };
    if (already) { Space.frameDest(dest, sideBox); showPanel(firstOpen); }
    else { hidePanelVisual(); Space.travelTo(dest, sideBox).then(() => { if (current && current.dest === dest) showPanel(true); }); }
  } else {
    if (origin === "explore") setExploreUI(false);
    origin = "home"; current = { sec, sub, dest };
    Space.setPanel({ origin });
    Space.home(tall ? homeBox : sideBox, { dim: tall ? 0 : 0.4 });
    showPanel(firstOpen);
  }
}
function showPanel(focusTitle) {
  wrap.hidden = false; wrap.inert = false; panelOpen = true;
  void wrap.offsetWidth; wrap.classList.add("open");
  body.classList.add("panel-open");
  for (const el of $$(".home, .hud, .tabbar, #labels, #beacons, .radar-wrap")) el.inert = true;
  fit();
  if (focusTitle) setTimeout(() => focusHeading(), RM ? 0 : 60);
}
function hidePanelVisual() { wrap.classList.remove("open"); wrap.inert = true; }
function closePanel() {
  if (!panelOpen) return;
  panelOpen = false; current = null;
  wrap.classList.remove("open"); wrap.inert = true; body.classList.remove("panel-open");
  for (const el of $$(".home, .hud, .tabbar, #labels, #beacons, .radar-wrap")) el.inert = false;
  unmountFigures();
  const back = opener && opener.isConnected && opener !== document.body && !opener.closest("[hidden], #panelWrap") ? opener : null;
  setTimeout(() => (back || $("#content")).focus({ preventScroll: true }), 30);
  opener = null;
}
function focusHeading() {
  const sec = $(".sec:not([hidden])");
  const h = sec && ($(".case:not([hidden]) .case-title, .role-detail:not([hidden]) .case-title", sec));
  const target = h || pTitle;
  if (h) h.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}
function render(sec, sub) {
  const i = SECTIONS.indexOf(sec);
  for (const s of $$(".sec", panel)) s.hidden = s.dataset.sec !== sec;
  pTitle.textContent = LABEL[sec];
  pKicker.textContent = `${String(i + 1).padStart(2, "0")} / 0${SECTIONS.length} · ${PART[sec]}`;
  for (const a of $$("[data-tab]", panel)) { if (a.dataset.tab === sec) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }
  const prev = SECTIONS[(i - 1 + SECTIONS.length) % SECTIONS.length], next = SECTIONS[(i + 1) % SECTIONS.length];
  const pp = $("#pPrev"), pn = $("#pNext");
  pp.href = `#/${prev}`; pp.textContent = `← ${LABEL[prev]}`; pn.href = `#/${next}`; pn.textContent = `${LABEL[next]} →`;
  const el = $(`#sec-${sec}`);
  el.classList.remove("fadein"); void el.offsetWidth; el.classList.add("fadein");
  el.scrollTop = 0;
  unmountFigures();
  if (sec === "work") {
    const list = $("[data-list]", el);
    let shown = null;
    for (const c of $$(".case", el)) { const on = c.dataset.case === sub; c.hidden = !on; if (on) shown = c; }
    list.hidden = !!shown;
    if (shown) { document.title = `${$(".case-title", shown).textContent} · Work · Priyansh Jain`; mountFigure(shown); live(`${$(".case-title", shown).textContent}`); }
    else { applyFilter(filter); document.title = `Work · Priyansh Jain`; live("Work"); }
  } else if (sec === "experience") {
    const list = $("[data-list]", el);
    let shown = null;
    for (const r of $$(".role-detail", el)) { const on = r.dataset.role === sub; r.hidden = !on; if (on) shown = r; }
    list.hidden = !!shown;
    document.title = `${shown ? $(".case-title", shown).textContent + " · " : ""}Experience · Priyansh Jain`;
    live(shown ? $(".case-title", shown).textContent : "Experience");
  } else {
    document.title = `${LABEL[sec]} · Priyansh Jain`;
    live(LABEL[sec]);
    if (sec === "contact") mountFigure(el);
  }
  fit();
}
// fit: never let the page scroll. If a case doesn't fit, split it into steps; a small inner scroll is the last resort.
function fit() {
  const sec = $(".sec:not([hidden])", panel); if (!sec) return;
  for (const t of $$(".case-text", sec)) {
    t.classList.remove("stepped");
    if (t.closest("[hidden]")) continue;
    if (sec.scrollHeight > sec.clientHeight + 2) {
      t.classList.add("stepped");
      const on = $(".step[aria-selected='true']", t)?.dataset.step || "problem";
      selectStep(t, on);
    }
  }
}
function selectStep(t, key) {
  for (const b of $$(".step", t)) b.setAttribute("aria-selected", String(b.dataset.step === key));
  for (const p of $$(".part", t)) p.classList.toggle("on", p.dataset.part === key);
}
panel.addEventListener("click", (e) => {
  const st = e.target.closest(".step"); if (st) { selectStep(st.closest(".case-text"), st.dataset.step); return; }
  const ch = e.target.closest(".chip"); if (ch) { applyFilter(ch.dataset.filter); return; }
  const cp = e.target.closest("[data-copy]"); if (cp) copy(cp.dataset.copy);
});
function applyFilter(f) {
  filter = f;
  for (const c of $$(".chip", panel)) c.setAttribute("aria-selected", String(c.dataset.filter === f));
  for (const li of $$(".cards li", panel)) li.hidden = !li.dataset.cats.split(" ").includes(f);
}
async function copy(text) {
  const out = $(".copied", panel);
  try { await navigator.clipboard.writeText(text); out.textContent = "Email copied to your clipboard."; }
  catch { out.textContent = `Copy this address: ${text}`; }
}
$("#pScrim").addEventListener("click", () => go(origin === "explore" ? "#/explore" : "#/"));
$("#pClose").addEventListener("click", (e) => { e.preventDefault(); go(origin === "explore" ? "#/explore" : "#/"); });

// figures: the Mission 001 anatomy figure in its case view, the comms antenna in Contact (wide screens)
const figs = new Map();
async function mountFigure(scope) {
  for (const m of $$("[data-figure]", scope)) {
    if (m.offsetParent === null) continue;
    const kind = m.dataset.figure;
    const mod = kind === "mission001" ? await import("./fig/mission001.mjs") : await import("./fig/comms.mjs");
    if (!panelOpen && !wrap.classList.contains("open") && current == null) return;
    const host = document.createElement("div");
    m.replaceChildren(host);
    const h = kind === "mission001" ? mod.mount(host) : mod.mount(host, { channels: [{ name: "Email", az: 0, el: 34 }, { name: "LinkedIn", az: 48, el: 56 }, { name: "Resume", az: 92, el: 30 }] });
    figs.set(m, h);
    if (kind === "comms") for (const [sel, ch] of [["[data-copy]", "Email"], ["a[href^='mailto']", "Email"], ["a[href*='linkedin']", "LinkedIn"], ["a[href$='.pdf']", "Resume"]]) for (const a of $$(`.actions ${sel}`, scope)) { a.onpointerenter = () => h.aim(ch); a.onfocus = () => h.aim(ch); a.onpointerleave = () => h.release(); }
  }
}
function unmountFigures() { for (const [m, h] of figs) { h.destroy?.(); } figs.clear(); }

/* ============================ keyboard: Esc, arrows, focus trap ============================ */
addEventListener("keydown", (e) => {
  if (body.classList.contains("intro")) {
    if (e.key === "Enter" && !e.target.closest?.("button,a")) { e.preventDefault(); enter(); }
    if (e.key === "Escape") skip();
    return;
  }
  if (!panelOpen) { if (e.key === "Escape" && body.classList.contains("explore")) go("#/"); return; }
  if (e.key === "Escape") { e.preventDefault(); go(origin === "explore" ? "#/explore" : "#/"); return; }
  if (e.key === "Tab") {
    const f = $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', panel).filter((x) => x.offsetParent !== null && !x.closest("[hidden]"));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    return;
  }
  if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.target.closest?.("[role=tablist], .iso-stage, input, textarea")) {
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const c = current; if (!c) return;
    if (c.sec === "work" && c.sub) { const pager = $(`#work-${c.sub} .pager a:${dir > 0 ? "last" : "first"}-child`); if (pager) go(pager.getAttribute("href")); }
    else if (c.sec === "experience" && c.sub) { const pager = $(`#exp-${c.sub} .pager a:${dir > 0 ? "last" : "first"}-child`); if (pager) go(pager.getAttribute("href")); }
    else { const i = SECTIONS.indexOf(c.sec); go(`#/${SECTIONS[(i + dir + SECTIONS.length) % SECTIONS.length]}`); }
    e.preventDefault();
  }
  // tablists (filters, case steps): arrow keys move between tabs
});
panel.addEventListener("keydown", (e) => {
  const tab = e.target.closest?.("[role=tab]"); if (!tab || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
  const all = $$("[role=tab]", tab.parentElement), i = all.indexOf(tab), n = all[(i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
  n.focus(); n.click(); e.preventDefault(); e.stopPropagation();
});

/* ============================ intro ============================ */
function enter() {
  if (!body.classList.contains("intro")) return;
  session.set("pj-intro", "1");
  body.classList.remove("intro"); body.classList.add("warping");
  $("#intro").classList.add("gone");
  Space.enter();
}
function skip() {
  session.set("pj-intro", "1");
  $("#intro").classList.add("gone");
  body.classList.remove("intro");
  Space.skipIntro();
}
$("#enter").addEventListener("click", enter);
$("#skipIntro").addEventListener("click", skip);

/* ============================ engine hooks ============================ */
Space.on("frame", frame);
Space.on("hover", (mod) => { const f = document.activeElement; if (!mod && f && (f.classList.contains("hot") || f.dataset.secLink)) return; setHot(mod); });
Space.on("part", (mod) => { seenHint(); go(`#/${mod}`); });
Space.on("dest", (d) => {
  fromExplore = true;
  if (d.type === "home") { fromExplore = false; go("#/"); return; }
  if (d.type === "project") return go(`#/work/${d.slug}`);
  if (d.type === "role") return go(`#/experience/${d.id}`);
  const id = d.id;
  if (CATEGORIES.some((c) => c.id === id)) { filter = id; return go("#/work"); }
  go({ mission: "#/work/mission-001", log: "#/experience", skills: "#/skills", comms: "#/contact" }[id] || "#/");
});
Space.on("warpDone", () => {
  body.classList.remove("warping", "intro");
  route();
  setTimeout(() => $("#content").focus({ preventScroll: true }), 50);
});
Space.on("resize", () => {
  measure(); Space.relayout();
  if (panelOpen && current) { if (origin === "home") Space.home(tall ? homeBox : sideBox, { dim: tall ? 0 : 0.4, instant: true }); else if (current.dest) Space.frameDest(current.dest, sideBox, true); fit(); }
  else if (Space.scene === "home") Space.home(homeBox, { instant: true });
  for (const a of Object.values(hots)) { a.lastElementChild._w = 0; a.lastElementChild._h = 0; }
});

const liveEl = $("#live");
function live(text) { liveEl.textContent = text; }

/* ============================ start ============================ */
const startHash = parse(location.hash);
const showIntro = startHash.home && !RM && !session.get("pj-intro");
measure();
if (showIntro) { body.classList.add("intro"); $("#intro").classList.remove("gone"); }
Space.start({ intro: showIntro });
if (!showIntro) { Space.home(homeBox, { instant: true }); route(); }
