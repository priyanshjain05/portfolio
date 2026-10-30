// The spacecraft game: build a ship from 4 parts (3 options each), fly that exact ship in an endless run.
// Loaded on demand from ui.js. Canvas 2D + plain JS: one shared ship renderer, no engine, no external requests.
// Balance lives in parts.js. Add ?gamedebug to the URL to log ship stats and show the frame rate.
import { SLOTS, PARTS, TUNING as T, shipStats, pick, DEFAULT_BUILD } from "./parts.js";
import { drawShip } from "./ship.mjs";

const DEBUG = /[?&]gamedebug\b/.test(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const lerp = (a, b, k) => a + (b - a) * k;

// the slowest any build can move sideways (play-widths/s), so the open corridor is always reachable
const MIN_LATERAL = (() => {
  let m = Infinity;
  for (const e of PARTS.engine) for (const h of PARTS.hull) for (const r of PARTS.thrusters) for (const k of PARTS.tank) {
    const s = shipStats({ engine: e.id, hull: h.id, thrusters: r.id, tank: k.id });
    m = Math.min(m, s.vmax, s.accel / s.damp);
  }
  return m;
})();
const MAX_BOOST = Math.max(...PARTS.engine.map((e) => 1 + e.stats.thrust * T.boostPerThrust));

export function createGame({ root, onClose, links, reduced }) {
  injectStyles();
  let build = sanitize(store.get("pj-game-build", DEFAULT_BUILD));
  let best = store.get("pj-game-best", 0) || 0;
  let phase = "build", running = false, raf = 0, last = 0, opened = false;

  root.innerHTML = template(links);
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const cv = $(".g-canvas"), ctx = cv.getContext("2d");
  const pv = $(".g-preview canvas"), pctx = pv.getContext("2d");
  const form = $(".g-build"), live = $(".g-live");
  let W = 0, H = 0, DPR = 1;

  /* ---------------- builder ---------------- */
  function syncForm() { for (const s of SLOTS) { const r = form.elements[s.id]; if (r) r.value = build[s.id]; } }
  function renderBuild(changed) {
    const st = shipStats(build);
    $(".g-name").textContent = buildName(build);
    for (const [k, v] of Object.entries(st.bars)) {
      const row = $(`[data-bar="${k}"]`); row.style.setProperty("--v", v / 5); row.querySelector(".sr").textContent = `${v} out of 5`; row.querySelector("b").textContent = v.toFixed(1);
    }
    if (changed) { const o = pick(changed, build[changed]); $(".g-effect").textContent = `${o.name}: ${o.effect}`; }
    drawPreview();
    if (DEBUG) console.table({ build: buildName(build), ...Object.fromEntries(Object.entries(st).filter(([k]) => k !== "bars").map(([k, v]) => [k, +v.toFixed?.(3) || v])) });
  }
  function drawPreview(t = 0) {
    const r = pv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    if (!r.width) return;
    if (pv.width !== Math.round(r.width * d)) { pv.width = Math.round(r.width * d); pv.height = Math.round(r.height * d); }
    pctx.setTransform(d, 0, 0, d, 0, 0); pctx.clearRect(0, 0, r.width, r.height);
    const S = Math.min(r.width * 0.62, r.height * 0.78);
    drawShip(pctx, build, { x: r.width / 2, y: r.height * 0.46, size: S, thrust: 0.55, t });
  }
  form.addEventListener("change", (e) => { if (e.target.name) { build[e.target.name] = e.target.value; store.set("pj-game-build", build); renderBuild(e.target.name); } });
  form.addEventListener("submit", (e) => { e.preventDefault(); launch(); });
  $("[data-random]").addEventListener("click", () => {
    for (const s of SLOTS) build[s.id] = PARTS[s.id][Math.floor(Math.random() * 3)].id;
    store.set("pj-game-build", build); syncForm(); renderBuild("hull"); say(`Randomized: ${buildName(build)}`);
  });

  /* ---------------- phases ---------------- */
  function setPhase(p) {
    phase = p; root.dataset.phase = p;
    $(".g-k").textContent = { build: "Shipyard", fly: "Flight", results: "Debrief" }[p];
    $("[data-pause]").hidden = p !== "fly";
    for (const sec of $$("[data-phase-panel]")) sec.hidden = sec.dataset.phasePanel !== p;
  }
  function focusFirst() {
    const t = phase === "build" ? form.querySelector("input:checked") : phase === "results" ? $("[data-again]") : $("[data-pause]");
    t?.focus({ preventScroll: true });
  }

  /* ---------------- flight ---------------- */
  let G = null;                                   // the run's state
  const keys = new Set(), touch = new Map();
  let boostHeld = false, paused = false;
  function launch() {
    const st = shipStats(build);
    if (DEBUG) console.log("[game] launch", buildName(build), st);
    G = {
      st, t: 0, dist: 0, x: 0.5, vx: 0, hp: st.hp, fuel: st.fuel, inv: 0, boost: 0, boostTime: 0,
      obstacles: [], rowAcc: 0, corridor: Math.floor(T.lanes / 2) - 1, budget: 0, stars: makeStars(), parts: [], shake: 0, over: 0, steer: 0,
    };
    setPhase("fly"); paused = false; $(".g-pausebox").hidden = true;
    $(".g-hud-name").textContent = buildName(build);
    drawHudShip();
    hud(true);
    const hint = $(".g-hint"); hint.classList.remove("gone"); setTimeout(() => hint.classList.add("gone"), 4200);
    say(`Launched ${buildName(build)}. Steer with A and D or the arrow keys, Space to boost, P to pause.`);
    focusFirst();
  }
  function makeStars() {
    const s = [];
    for (let i = 0; i < 140; i++) s.push({ x: Math.random(), y: Math.random(), z: 0.25 + Math.random() * 0.75, r: Math.random() });
    return s;
  }
  function step(dt) {
    const g = G, st = g.st, PW = playW();
    if (g.over) { g.over += dt; updateParticles(dt); if (g.over > (reduced ? 0.5 : 1.1)) results(); return; }
    g.t += dt;
    // input
    const left = keys.has("ArrowLeft") || keys.has("a") || [...touch.values()].includes(-1);
    const right = keys.has("ArrowRight") || keys.has("d") || [...touch.values()].includes(1);
    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    // lateral: acceleration from the thrusters, drag shaped by them, inertia from mass
    g.vx += (steer * st.accel - g.vx * st.damp) * dt;
    g.vx = clamp(g.vx, -st.vmax, st.vmax);
    g.x += g.vx * dt;
    const margin = (shipSize() * 0.32 * st.width) / PW;
    if (g.x < margin) { g.x = margin; g.vx = 0; } if (g.x > 1 - margin) { g.x = 1 - margin; g.vx = 0; }
    g.steer = lerp(g.steer, g.vx / st.vmax, 1 - Math.exp(-dt * 12));
    // boost and fuel
    const wantBoost = (keys.has(" ") || boostHeld) && g.fuel > 0.5;
    g.boost = lerp(g.boost, wantBoost ? 1 : 0, 1 - Math.exp(-dt * 8));
    if (wantBoost) { g.fuel = Math.max(0, g.fuel - st.burn * dt); g.boostTime += dt; } else g.fuel = Math.min(st.fuel, g.fuel + st.recharge * dt);
    // forward speed grows with time; boost multiplies it
    const ramp = rampAt(g.t), base = st.cruise * (1 + T.speedRamp * ramp), speed = base * (1 + (st.boost - 1) * g.boost);
    const dy = speed * H * dt;
    g.dist += speed * dt * T.distanceScale;
    // rows of obstacles, spaced by distance; the open corridor only drifts as fast as the slowest ship can follow
    if (g.t > T.calmSeconds) {
      g.rowAcc += dy;
      const rowGapS = lerp(T.rowGap[0], T.rowGap[1], ramp), spacing = rowGapS * base * H;
      while (g.rowAcc >= spacing) { g.rowAcc -= spacing; spawnRow(rowGapS / MAX_BOOST, ramp); }
    }
    for (const o of g.obstacles) { o.y += dy; o.a += o.spin * dt; }
    g.obstacles = g.obstacles.filter((o) => o.y < H + 80);
    // collisions
    g.inv = Math.max(0, g.inv - dt);
    const sx = playX() + g.x * PW, sy = shipY(), hr = shipSize() * T.hitboxScale * st.width;
    for (const o of g.obstacles) {
      if (o.dead) continue;
      const dx = o.cx - sx, dyy = o.y - sy, rr = o.hit + hr;
      if (dx * dx + dyy * dyy < rr * rr) {
        o.dead = true;
        if (g.inv > 0) continue;
        g.hp -= 1; g.inv = T.invulnerableAfterHit; g.shake = reduced ? 0 : 0.25;
        burst(o.cx, o.y, 10, "#c9b394");
        if (g.hp <= 0) { crash(sx, sy); return; }
        say(`Hit. Hull ${g.hp} of ${st.hp}.`);
      }
    }
    g.obstacles = g.obstacles.filter((o) => !o.dead || o.fade-- > 0);
    g.shake = Math.max(0, g.shake - dt);
    for (const s of g.stars) { s.y += (speed * dt * s.z * 0.9); if (s.y > 1) { s.y -= 1; s.x = Math.random(); } }
    updateParticles(dt);
  }
  function spawnRow(rowTime, ramp) {
    const g = G, lanes = T.lanes, PW = playW(), lw = PW / lanes;
    // corridor drift budget: lanes the slowest ship can cross in one row's time, with margin
    g.budget += (MIN_LATERAL * rowTime * 0.55) / (1 / lanes);
    if (g.budget >= 1 && Math.random() < 0.6) {
      const dir = g.corridor <= 0 ? 1 : g.corridor >= lanes - T.corridorLanes ? -1 : Math.random() < 0.5 ? -1 : 1;
      g.corridor += dir; g.budget -= 1;
    }
    g.budget = Math.min(g.budget, 1.5);
    const fill = lerp(T.density[0], T.density[1], ramp);
    for (let i = 0; i < lanes; i++) {
      if (i >= g.corridor && i < g.corridor + T.corridorLanes) continue;
      if (Math.random() > fill) continue;
      const kind = Math.random() < 0.72 ? "rock" : "panel";
      const r = lw * (kind === "rock" ? 0.3 + Math.random() * 0.16 : 0.34);
      g.obstacles.push({ kind, cx: playX() + (i + 0.5) * lw, y: -r - 10, r, hit: r * 0.82, a: Math.random() * 6, spin: (Math.random() - 0.5) * (kind === "rock" ? 0.8 : 2), seed: Math.random() * 1000, fade: 6 });
    }
  }
  function crash(x, y) {
    G.over = 0.0001; G.shake = reduced ? 0 : 0.35;
    burst(x, y, reduced ? 10 : 36, null);
    say("Crashed.");
  }
  function burst(x, y, n, color) {
    const cols = color ? [color] : [pick("hull", build.hull).look.plate, pick("engine", build.engine).look.flame[1], "#e9edf7"];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 160;
      G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.6 + Math.random() * 0.6, c: cols[i % cols.length], s: 1 + Math.random() * 2.5 });
    }
  }
  function updateParticles(dt) { for (const p of G.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; } G.parts = G.parts.filter((p) => p.life < p.max); }
  const rampAt = (t) => clamp((t - T.calmSeconds) / T.rampSeconds, 0, 1);

  /* ---------------- drawing ---------------- */
  const playW = () => Math.min(W, 620), playX = () => (W - playW()) / 2;
  const shipSize = () => clamp(Math.min(playW() * 0.13, H * 0.11), 44, 78);
  const shipY = () => H - Math.max(120, H * 0.2);
  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // a dark veil over the site's own starfield, then this run's stars streaming past
    ctx.fillStyle = phase === "fly" ? "rgba(3,4,10,0.74)" : "rgba(3,4,10,0.66)"; ctx.fillRect(0, 0, W, H);
    const g = G, t = now / 1000;
    const stars = g ? g.stars : idleStars;
    const sp = g && phase === "fly" ? g.boost : 0;
    ctx.fillStyle = "#dfe8ff";
    for (const s of stars) {
      const x = s.x * W, y = s.y * H;
      ctx.globalAlpha = 0.25 + s.z * 0.55;
      if (sp > 0.05 && !reduced) { ctx.fillRect(x, y - sp * 18 * s.z, Math.max(1, s.z * 1.4), sp * 18 * s.z + 1); }
      else ctx.fillRect(x, y, s.z * 1.6, s.z * 1.6);
    }
    ctx.globalAlpha = 1;
    if (phase !== "fly" || !g) return;
    ctx.save();
    if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * g.shake, (Math.random() - 0.5) * 10 * g.shake);
    // play-area rails
    const px = playX(), pw = playW();
    if (pw < W) { ctx.strokeStyle = "rgba(127,227,255,0.14)"; ctx.setLineDash([4, 10]); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.moveTo(px + pw, 0); ctx.lineTo(px + pw, H); ctx.stroke(); ctx.setLineDash([]); }
    for (const o of g.obstacles) drawObstacle(o);
    if (!g.over) {
      const blink = g.inv > 0 ? (Math.floor(g.inv * 5) % 2 ? 0.35 : 1) : 1;      // 2.5 blinks a second, under the 3 Hz limit
      ctx.globalAlpha = blink;
      drawShip(ctx, build, { x: px + g.x * pw, y: shipY(), size: shipSize(), thrust: 0.45 + 0.25 * rampAt(g.t), boost: g.boost, steer: g.steer, t });
      ctx.globalAlpha = 1;
    }
    for (const p of g.parts) { ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  // hazards look nothing like the ship: jagged or boxy, warm grey, hatched, never cyan
  function drawObstacle(o) {
    ctx.save(); ctx.translate(o.cx, o.y); ctx.rotate(o.a);
    ctx.globalAlpha = o.dead ? Math.max(0, o.fade / 6) : 1;
    ctx.lineJoin = "round";
    if (o.kind === "rock") {
      ctx.beginPath();
      const n = 9;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.78 + 0.22 * Math.sin(o.seed + i * 2.3); const x = Math.cos(a) * o.r * k, y = Math.sin(a) * o.r * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath();
      const gr = ctx.createRadialGradient(-o.r * 0.3, -o.r * 0.3, 0, 0, 0, o.r);
      gr.addColorStop(0, "#5a5249"); gr.addColorStop(1, "#24211f");
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = "#c9b394"; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = "rgba(201,179,148,0.45)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(o.r * 0.2, -o.r * 0.15, o.r * 0.22, 0, 7); ctx.moveTo(-o.r * 0.35 + o.r * 0.12, o.r * 0.3); ctx.arc(-o.r * 0.35, o.r * 0.3, o.r * 0.12, 0, 7); ctx.stroke();
    } else {
      const w = o.r * 1.5, h = o.r * 0.7;
      ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "#2b2622"; ctx.fill(); ctx.strokeStyle = "#c9b394"; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = "rgba(201,179,148,0.5)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 1; i < 4; i++) { ctx.moveTo(-w / 2 + (w * i) / 4, -h / 2); ctx.lineTo(-w / 2 + (w * i) / 4, h / 2); }
      ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.stroke();
    }
    ctx.restore();
  }
  const idleStars = makeStars();

  /* ---------------- HUD and results ---------------- */
  let fpsAcc = 0, fpsN = 0, fpsShown = 0, hudT = 0;
  function hud(force) {
    const g = G; if (!g) return;
    hudT = force ? 0 : hudT;
    $("[data-dist]").textContent = `${g.dist.toFixed(2)} km`;
    $("[data-time]").textContent = `${g.t.toFixed(1)} s`;
    $("[data-best]").textContent = `${Math.max(best, g.dist).toFixed(2)} km`;
    $("[data-fuel]").style.setProperty("--v", g.fuel / g.st.fuel);
    $("[data-fuel] .sr").textContent = `${Math.round((g.fuel / g.st.fuel) * 100)}%`;
    const pips = $("[data-hull]");
    if (pips.childElementCount !== g.st.hp) pips.innerHTML = Array.from({ length: g.st.hp }, () => "<i></i>").join("");
    [...pips.children].forEach((p, i) => p.classList.toggle("lost", i >= g.hp));
    pips.setAttribute("aria-label", `Hull ${g.hp} of ${g.st.hp}`);
  }
  function drawHudShip() {
    const c = $(".g-hud-ship"), d = Math.min(devicePixelRatio || 1, 2), x = c.getContext("2d");
    c.width = 44 * d; c.height = 44 * d; x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, 44, 44);
    drawShip(x, build, { x: 22, y: 22, size: 38, thrust: 0.4 });
  }
  function results() {
    const g = G;
    const newBest = g.dist > best;
    if (newBest) { best = g.dist; store.set("pj-game-best", best); }
    setPhase("results");
    $("[data-r-dist]").textContent = `${g.dist.toFixed(2)} km`;
    $("[data-r-time]").textContent = `${g.t.toFixed(1)} s`;
    $("[data-r-best]").textContent = newBest ? "New best!" : `Best ${best.toFixed(2)} km`;
    $("[data-r-parts]").innerHTML = SLOTS.map((s) => `<li><span>${esc(s.name)}</span>${esc(pick(s.id, build[s.id]).name)}</li>`).join("");
    $("[data-r-take]").textContent = takeaway(build, g);
    const c = $(".g-res-ship"), r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), x = c.getContext("2d");
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); x.setTransform(d, 0, 0, d, 0, 0);
    drawShip(x, build, { x: r.width / 2, y: r.height * 0.45, size: Math.min(r.width * 0.7, r.height * 0.8), thrust: 0.3 });
    say(`Run over: ${g.dist.toFixed(2)} kilometres in ${g.t.toFixed(1)} seconds. ${newBest ? "New best." : ""}`);
    focusFirst();
  }

  /* ---------------- loop ---------------- */
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    if (phase === "fly" && G && !paused) step(dt);
    draw(now);
    if (phase === "build") drawPreview(now / 1000);
    if (phase === "fly" && G && !paused) { hudT += dt; if (hudT > 0.1) { hudT = 0; hud(); } }
    if (DEBUG) { fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fpsShown = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; $(".g-fps").textContent = `${fpsShown} fps`; } }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function resize() {
    const r = root.getBoundingClientRect(); W = r.width; H = r.height;
    DPR = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    if (phase === "build") drawPreview();
  }
  function pause(on) {
    if (phase !== "fly" || !G || G.over) return;
    paused = on; $(".g-pausebox").hidden = !on; $("[data-pause]").textContent = on ? "Resume" : "Pause";
    $("[data-pause]").setAttribute("aria-pressed", String(on));
    keys.clear(); touch.clear(); boostHeld = false;
    if (on) { $("[data-resume]").focus({ preventScroll: true }); say("Paused."); } else { last = 0; $("[data-pause]").focus({ preventScroll: true }); }
  }

  /* ---------------- input ---------------- */
  function onKey(e) {
    if (!opened) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.type === "keydown" && k === "Escape") { e.preventDefault(); close(); return; }
    if (e.type === "keydown" && k === "Tab") return trap(e);
    if (phase !== "fly" || !G) return;
    if (e.type === "keydown" && (k === "p")) { e.preventDefault(); pause(!paused); return; }
    if (paused) return;
    if (["ArrowLeft", "ArrowRight", "a", "d", " "].includes(k)) {
      if (e.target.closest?.("button") && k === " ") e.preventDefault();
      e.preventDefault();
      if (e.type === "keydown") keys.add(k); else keys.delete(k);
    }
  }
  function trap(e) {
    const f = $$('button:not([disabled]), [href], input:checked, input:not([type=radio])').filter((x) => x.offsetParent !== null && !x.closest("[hidden]"));
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && (document.activeElement === lastEl || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }
  // touch: hold the left or right half of the play area to steer
  cv.addEventListener("pointerdown", (e) => { if (phase !== "fly" || paused) return; try { cv.setPointerCapture(e.pointerId); } catch {} touch.set(e.pointerId, e.clientX < W / 2 ? -1 : 1); });
  cv.addEventListener("pointermove", (e) => { if (touch.has(e.pointerId)) touch.set(e.pointerId, e.clientX < W / 2 ? -1 : 1); });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) cv.addEventListener(ev, (e) => touch.delete(e.pointerId));
  const bb = $(".g-boost");
  bb.addEventListener("pointerdown", (e) => { e.preventDefault(); try { bb.setPointerCapture(e.pointerId); } catch {} boostHeld = true; bb.classList.add("on"); });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) bb.addEventListener(ev, () => { boostHeld = false; bb.classList.remove("on"); });
  bb.addEventListener("keydown", (e) => { if (e.key === "Enter") { boostHeld = true; } });
  bb.addEventListener("keyup", (e) => { if (e.key === "Enter") { boostHeld = false; } });
  $("[data-pause]").addEventListener("click", () => pause(!paused));
  $("[data-resume]").addEventListener("click", () => pause(false));
  $("[data-again]").addEventListener("click", launch);
  for (const b of $$("[data-rebuild]")) b.addEventListener("click", () => { G = null; paused = false; setPhase("build"); renderBuild(); focusFirst(); });
  for (const b of $$("[data-close]")) b.addEventListener("click", () => close());
  for (const a of $$("[data-site]")) a.addEventListener("click", () => close({ keepHash: true }));
  const onVis = () => { if (document.hidden) pause(true); };
  const onBlur = () => pause(true);

  function say(t) { live.textContent = ""; requestAnimationFrame(() => (live.textContent = t)); }

  /* ---------------- open / close ---------------- */
  function open() {
    opened = true; resize();
    setPhase("build"); syncForm(); renderBuild("engine");
    start();
    addEventListener("keydown", onKey, true); addEventListener("keyup", onKey, true);
    addEventListener("resize", resize); document.addEventListener("visibilitychange", onVis); addEventListener("blur", onBlur);
    focusFirst();
  }
  function close(opts = {}) {
    if (!opened) return;
    opened = false; stop(); G = null; keys.clear(); touch.clear();
    removeEventListener("keydown", onKey, true); removeEventListener("keyup", onKey, true);
    removeEventListener("resize", resize); document.removeEventListener("visibilitychange", onVis); removeEventListener("blur", onBlur);
    onClose?.(opts);
  }
  if (DEBUG) window.__game = { state: () => G, build: () => build, phase: () => phase };
  return { open, close, get phase() { return phase; } };
}

/* ---------------- words ---------------- */
function sanitize(b) { const out = {}; for (const s of SLOTS) out[s.id] = PARTS[s.id].some((o) => o.id === b?.[s.id]) ? b[s.id] : DEFAULT_BUILD[s.id]; return out; }
function buildName(b) { return ["hull", "engine", "thrusters", "tank"].map((k) => pick(k, b[k]).short).join(" · "); }
function takeaway(b, g) {
  const hull = { scout: "Light hull", frigate: "Balanced hull", bulwark: "Heavy hull" }[b.hull];
  const thr = { fins: "steady fins", pods: "quick pods", vanes: "twitchy vanes" }[b.thrusters];
  const tank = { compact: "small tank", saddle: "twin tanks", long: "big tank" }[b.tank];
  const eng = { ion: "ion drive", chem: "chemical rocket", plasma: "plasma torch" }[b.engine];
  const boosted = g.boostTime > 1 ? ` Boosted for ${g.boostTime.toFixed(0)} s on the ${eng} and ${tank}.` : ` Barely touched the ${eng}'s boost.`;
  return `${hull} + ${thr}: lasted ${g.t.toFixed(0)} s.${boosted}`;
}

/* ---------------- markup ---------------- */
function template(links) {
  const slot = (s) => `<fieldset class="g-slot"><legend>${esc(s.name)} <span>${esc(s.hint)}</span></legend><div class="g-opts">${PARTS[s.id].map((o) =>
    `<label class="g-opt"><input type="radio" name="${s.id}" value="${o.id}"><span class="g-opt-n">${esc(o.name)}</span><span class="g-opt-e">${esc(o.effect)}</span></label>`).join("")}</div></fieldset>`;
  const bar = (k, label) => `<div class="g-stat" data-bar="${k}"><dt>${label}</dt><dd><span class="g-bar" aria-hidden="true"></span><b></b><span class="sr"></span></dd></div>`;
  return `
  <canvas class="g-canvas" role="img" aria-label="Spacecraft endless run game"></canvas>
  <div class="g-shell">
    <header class="g-top">
      <p class="g-k">Shipyard</p>
      <h2 class="sr" id="g-title">Spacecraft game</h2>
      <div class="g-top-actions"><button type="button" class="g-btn ghost sm" data-pause hidden aria-pressed="false">Pause</button><button type="button" class="g-btn ghost sm" data-close>Back to site <kbd>Esc</kbd></button></div>
    </header>
    <form class="g-build" data-phase-panel="build" aria-labelledby="g-build-h">
      <div class="g-preview">
        <h3 class="g-h" id="g-build-h">Build your ship</h3>
        <canvas aria-hidden="true"></canvas>
        <p class="g-name" aria-live="polite"></p>
        <p class="g-effect"></p>
        <dl class="g-stats">${bar("thrust", "Thrust")}${bar("durability", "Durability")}${bar("agility", "Agility")}${bar("fuel", "Fuel")}</dl>
      </div>
      <div class="g-slots">${SLOTS.map(slot).join("")}</div>
      <div class="g-build-actions"><button type="button" class="g-btn ghost" data-random>Randomize</button><button type="submit" class="g-btn primary">Launch <kbd>↵</kbd></button></div>
    </form>
    <section class="g-fly" data-phase-panel="fly" aria-label="Flight" hidden>
      <div class="g-hud">
        <div class="g-hud-own"><canvas class="g-hud-ship" width="44" height="44" aria-hidden="true"></canvas><div><span>Your ship</span><b class="g-hud-name"></b></div></div>
        <dl class="g-hud-nums"><div><dt>Distance</dt><dd data-dist></dd></div><div><dt>Time</dt><dd data-time></dd></div><div><dt>Best</dt><dd data-best></dd></div></dl>
        <div class="g-hud-gauges"><div><span>Hull</span><span class="g-pips" data-hull role="img"></span></div><div><span>Fuel</span><span class="g-fuel" data-fuel><span class="sr"></span></span></div></div>
      </div>
      <p class="g-hint"><span class="g-fine">Steer with A / D or ← / →, hold Space to boost, P to pause.</span><span class="g-coarse">Hold the left or right side to steer. Hold Boost to speed up.</span></p>
      <button type="button" class="g-boost" aria-label="Boost (hold)">Boost</button>
      <p class="g-fps" aria-hidden="true"></p>
      <div class="g-pausebox" hidden><p class="g-h">Paused</p><div class="g-row"><button type="button" class="g-btn primary" data-resume>Resume</button><button type="button" class="g-btn ghost" data-rebuild>Rebuild</button></div></div>
    </section>
    <section class="g-results" data-phase-panel="results" aria-labelledby="g-res-h" hidden>
      <h3 class="g-h" id="g-res-h">Debrief</h3>
      <div class="g-res-grid">
        <canvas class="g-res-ship" aria-hidden="true"></canvas>
        <div class="g-res-text">
          <p class="g-res-big"><b data-r-dist></b><span data-r-time></span></p>
          <p class="g-res-best" data-r-best></p>
          <ul class="g-res-parts" data-r-parts></ul>
          <p class="g-take" data-r-take></p>
        </div>
      </div>
      <div class="g-row"><button type="button" class="g-btn primary" data-again>Fly again</button><button type="button" class="g-btn ghost" data-rebuild>Rebuild</button><button type="button" class="g-btn ghost" data-close>Back to site</button></div>
      <p class="g-res-link">Like building things? <a href="${esc(links.work)}" data-site>See my work</a> or <a href="${esc(links.contact)}" data-site>get in touch</a>.</p>
    </section>
    <p class="sr g-live" aria-live="polite"></p>
  </div>`;
}

/* ---------------- styles (scoped to #game; colours and type come from the site) ---------------- */
let styled = false;
function injectStyles() {
  if (styled) return; styled = true;
  const s = document.createElement("style"); s.id = "game-css";
  s.textContent = `
#game{position:fixed;inset:0;height:100dvh;z-index:70;color:var(--ink);overflow:hidden;opacity:0;transition:opacity .45s var(--ease)}
#game.show{opacity:1}
#game .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.g-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.g-shell{position:relative;height:100%;display:flex;flex-direction:column;pointer-events:none}
.g-shell>*{pointer-events:auto}
.g-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px var(--gutter,24px) 6px}
.g-k{font:500 12px var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--cyan)}
.g-top-actions{display:flex;gap:8px}
.g-h{font:600 clamp(22px,2.4vw,30px)/1.1 var(--display);letter-spacing:-.02em;color:#fff}
.g-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 20px;border-radius:999px;font:600 15px var(--display);letter-spacing:.01em;cursor:pointer;transition:transform .25s var(--ease),box-shadow .25s,background .25s}
.g-btn[hidden]{display:none}
.g-btn.sm{min-height:44px;padding:0 14px;font-size:14px}
.g-btn.primary{color:#04121c;background:linear-gradient(180deg,#a9f0ff,#5fd3f3);box-shadow:0 0 0 1px rgba(127,227,255,.6),0 10px 30px -10px rgba(127,227,255,.8)}
.g-btn.primary:hover{transform:translateY(-1px)}
.g-btn.ghost{color:var(--ink);background:rgba(7,9,20,.6);box-shadow:inset 0 0 0 1px var(--line-2)}
.g-btn.ghost:hover{box-shadow:inset 0 0 0 1px var(--cyan)}
.g-btn kbd{font:500 12px var(--mono);opacity:.75}
#game :focus-visible{outline:2px solid var(--cyan);outline-offset:3px}
/* build */
.g-build{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.25fr);grid-template-rows:minmax(0,1fr) auto;gap:10px 34px;padding:4px var(--gutter,24px) 18px;max-width:1240px;width:100%;margin:0 auto}
.g-build[hidden]{display:none}
.g-preview{display:flex;flex-direction:column;align-items:center;min-height:0;text-align:center}
.g-preview canvas{flex:1;min-height:120px;width:100%}
.g-name{font:500 14px var(--mono);letter-spacing:.06em;color:var(--ink)}
.g-effect{min-height:20px;margin-top:4px;font-size:14px;color:var(--muted);max-width:44ch}
.g-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 22px;width:100%;max-width:420px;margin-top:10px}
.g-stat{display:grid;grid-template-columns:84px minmax(0,1fr);align-items:center;gap:8px;text-align:left}
.g-stat dt{font:500 12px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.g-stat dd{display:flex;align-items:center;gap:8px}
.g-bar{position:relative;flex:1;height:6px;border-radius:3px;background:rgba(127,227,255,.12);overflow:hidden}
.g-bar::after{content:"";position:absolute;inset:0;width:calc(var(--v,0)*100%);background:linear-gradient(90deg,#5fd3f3,#a9f0ff);box-shadow:0 0 8px #7fe3ff;transition:width .35s var(--ease-out)}
.g-stat b{font:600 13px var(--mono);color:#fff;min-width:24px}
.g-slots{display:grid;gap:10px;align-content:center;min-height:0}
.g-slot{border:0;margin:0;padding:0;min-width:0}
.g-slot legend{margin-bottom:6px;font:500 12px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--cyan)}
.g-slot legend span{margin-left:8px;color:var(--muted);letter-spacing:.06em;text-transform:none}
.g-opts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.g-opt{position:relative;display:flex;flex-direction:column;gap:2px;min-height:44px;padding:9px 12px;border-radius:12px;background:rgba(7,10,22,.72);box-shadow:inset 0 0 0 1px var(--line-2);cursor:pointer;transition:box-shadow .25s,background .25s}
.g-opt:hover{box-shadow:inset 0 0 0 1px rgba(127,227,255,.55)}
.g-opt input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
.g-opt:has(input:checked){background:rgba(127,227,255,.12);box-shadow:inset 0 0 0 1.5px var(--cyan),0 0 18px -6px var(--cyan)}
.g-opt:has(input:focus-visible){outline:2px solid var(--cyan);outline-offset:2px}
.g-opt-n{font:600 15px var(--display);color:#fff}
.g-opt-e{font-size:13px;line-height:1.3;color:var(--muted)}
.g-build-actions{grid-column:1/-1;display:flex;justify-content:center;gap:12px}
/* fly */
.g-fly{position:absolute;inset:0;pointer-events:none}
.g-fly[hidden]{display:none}
.g-fly>*{pointer-events:auto}
.g-hud{position:absolute;left:0;right:0;top:60px;display:flex;align-items:flex-start;justify-content:center;gap:clamp(14px,3vw,40px);padding:0 var(--gutter,24px);pointer-events:none;flex-wrap:wrap}
.g-hud-own{display:flex;align-items:center;gap:8px}
.g-hud-own span,.g-hud-nums dt,.g-hud-gauges span:first-child{display:block;font:500 12px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.g-hud-name{font:500 14px var(--body);color:#fff}
.g-hud-nums{display:flex;gap:22px}
.g-hud-nums dd{font:600 20px/1.1 var(--display);color:#fff;font-variant-numeric:tabular-nums}
.g-hud-gauges{display:flex;gap:18px}
.g-pips{display:flex;gap:5px;margin-top:5px}
.g-pips i{width:16px;height:9px;border-radius:2px;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
.g-pips i.lost{background:transparent;box-shadow:inset 0 0 0 1px var(--line-2)}
.g-fuel{position:relative;display:block;width:110px;height:9px;margin-top:5px;border-radius:5px;background:rgba(255,191,115,.15);overflow:hidden}
.g-fuel::after{content:"";position:absolute;inset:0;width:calc(var(--v,1)*100%);background:var(--amber);box-shadow:0 0 8px var(--amber)}
.g-hint{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);max-width:calc(100% - 32px);padding:8px 16px;border-radius:999px;background:rgba(7,9,20,.7);box-shadow:inset 0 0 0 1px var(--line-2);font-size:14px;color:var(--ink-2);text-align:center;transition:opacity .8s;pointer-events:none}
.g-hint.gone{opacity:0}
.g-coarse{display:none}
@media (pointer:coarse){.g-fine{display:none}.g-coarse{display:inline}}
.g-boost{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));width:88px;height:88px;border-radius:50%;font:600 15px var(--display);color:#1d1203;background:radial-gradient(circle at 40% 35%,#ffe0b3,#ffb35c);box-shadow:0 0 0 1px rgba(255,191,115,.7),0 0 30px -6px #ffbf73;touch-action:none;user-select:none;-webkit-user-select:none}
.g-boost.on{transform:scale(.94);box-shadow:0 0 0 2px #ffe0b3,0 0 40px -2px #ffbf73}
@media (hover:hover) and (pointer:fine){.g-boost{width:72px;height:72px;font-size:14px;opacity:.85}}
.g-fps{position:absolute;left:12px;bottom:10px;font:500 12px var(--mono);color:var(--muted)}
.g-pausebox{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;gap:14px;justify-items:center;padding:26px 30px;border-radius:18px;background:rgba(7,10,22,.9);box-shadow:inset 0 0 0 1px rgba(127,227,255,.3)}
.g-pausebox[hidden]{display:none}
.g-row{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
/* results */
.g-results{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:6px var(--gutter,24px) 24px;text-align:center}
.g-results[hidden]{display:none}
.g-res-grid{display:grid;grid-template-columns:minmax(0,220px) minmax(0,340px);gap:26px;align-items:center;text-align:left}
.g-res-ship{width:100%;height:220px}
.g-res-big b{display:block;font:600 44px/1 var(--display);letter-spacing:-.03em;color:#fff}
.g-res-big span{font:500 15px var(--mono);color:var(--muted)}
.g-res-best{margin-top:4px;font:500 14px var(--mono);color:var(--mint)}
.g-res-parts{display:grid;gap:3px;margin-top:12px;font-size:14px;color:var(--ink-2)}
.g-res-parts span{display:inline-block;width:88px;font:500 12px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.g-take{margin-top:12px;font-size:15px;color:var(--ink)}
.g-res-link{font-size:14px;color:var(--muted)}
.g-res-link a{display:inline-block;padding:13px 2px;margin:-13px 0;color:var(--cyan)}
/* phones */
@media (max-width:760px), (max-aspect-ratio:4/5){
  .g-top{padding:10px 14px 4px}
  .g-build{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr) auto;gap:8px;padding:0 14px 12px}
  .g-preview canvas{flex:none;height:min(24dvh,170px)}
  .g-h{font-size:20px}
  .g-preview .g-h{display:none}
  .g-effect{font-size:13px;min-height:34px}
  .g-stats{gap:4px 14px;margin-top:4px}
  .g-stat{grid-template-columns:72px minmax(0,1fr)}
  .g-slots{gap:6px;align-content:start}
  .g-slot legend{margin-bottom:4px}
  .g-slot legend span{display:none}
  .g-opt{padding:8px 8px;min-height:46px;justify-content:center}
  .g-opt-n{font-size:13px;line-height:1.2}
  .g-opt-e{display:none}
  .g-hud{top:54px;gap:10px 16px}
  .g-hud-own{display:none}
  .g-hud-nums{gap:14px}
  .g-hud-nums dd{font-size:17px}
  .g-fuel{width:76px}
  .g-hint{bottom:auto;top:34%;font-size:13px}
  .g-res-grid{grid-template-columns:1fr;gap:8px;text-align:center}
  .g-res-ship{height:min(22dvh,150px)}
  .g-res-big b{font-size:34px}
  .g-res-parts{justify-items:center}
}
@media (max-height:720px) and (min-width:761px){
  .g-preview canvas{min-height:100px}
  .g-opt{padding:7px 10px}
  .g-opt-e{font-size:12.5px}
  .g-slots{gap:6px}
  .g-res-ship{height:170px}
}
@media (prefers-reduced-motion:reduce){#game{transition-duration:.15s}}
`;
  document.head.appendChild(s);
}
