// The universe: one canvas, one camera, an explorable space. Home is an orbital station (anatomy figure);
// the work lives out in the galaxies. Drag to pan, scroll or pinch to zoom, click anything to fly there.
import { GALAXIES, SKILLS, EXPERIENCE, CREW, TICKER, CONTACT } from "./content.js";
import { mount as mountStation, VIEW as SV, ANCHORS, MODULES } from "./fig/station.mjs";
import { galaxySprite, planetTexture, drawPlanet, sunSprite, nebulaSprite, milkyWay, drawStar, starRgb } from "./render.js";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const follow = (v, target, dt, tau) => v + (target - v) * (RM ? 1 : 1 - Math.exp(-dt / tau));
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* ============================ canvas ============================ */
const cv = $("#space"), ctx = cv.getContext("2d");
let W = 0, H = 0, DPR = 1, tall = false;

/* ============================ the world ============================ */
const STATION_W = 640;                       // world units across the station drawing
const SU = STATION_W / SV.w;                 // world units per station-SVG unit
const STATION_H = SV.h * SU;
const WORLD = 2700;                          // how far from home you can roam
const GAL_SHAPE = [
  { arms: 2, twist: 3.6, tilt: -0.35, flat: 0.5, spin: 0.04 },
  { arms: 3, twist: 2.8, tilt: 0.45, flat: 0.58, spin: -0.035 },
  { arms: 2, twist: 4.2, tilt: -0.55, flat: 0.46, spin: 0.045 },
  { arms: 4, twist: 2.4, tilt: 0.3, flat: 0.55, spin: -0.04 },
];
const polar = (deg, r) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];
const PLACE = { ai: polar(-14, 1980), ps: polar(62, 1960), hw: polar(150, 1980), im: polar(222, 1960), mission: [760, -400], comms: [-840, -560], log: [-1000, 640], skills: [1020, 660] };
const DESTS = [
  { id: "crew", type: "crew", name: "Home station", kicker: "About me", color: "#b69cff", x: 0, y: 0, r: 250 },
  ...GALAXIES.map((g, gi) => ({ id: g.id, type: "galaxy", gi, name: g.name, kicker: `Galaxy ${g.num}`, color: g.color, r: 330 })),
  { id: "mission", type: "mission", name: "Mission 001", kicker: "In flight", color: "#7cf2b9", r: 96 },
  { id: "log", type: "log", name: "Flight Log", kicker: "Experience", color: "#ffbf73", r: 240 },
  { id: "skills", type: "skills", name: "Constellations", kicker: "Skills", color: "#7fe3ff", r: 270 },
  { id: "comms", type: "comms", name: "Comms", kicker: "Contact", color: "#7fe3ff", r: 86 },
];
const D = Object.fromEntries(DESTS.map((d) => [d.id, d]));
for (const d of DESTS) if (PLACE[d.id]) [d.x, d.y] = PLACE[d.id];

/* ============================ galaxies (particles) ============================ */
class Galaxy {
  constructor({ seed, n, arms, twist, tilt, flat, spin, color, intro = false, dust = false, spread = 1, disk = 0.3 }) {
    Object.assign(this, { seed, arms, twist, tilt, flat, spin, intro, dustOn: dust || intro, spread, disk });
    this.rgb = hexRgb(color);
    this.fills = intro
      ? ["rgba(255,240,222,.95)", "rgba(178,214,255,.85)", "rgba(140,170,255,.45)", "rgba(255,150,205,.7)", "rgba(255,255,255,.9)"]
      : ["rgba(255,247,235,.9)", rgba(this.rgb, 0.85), rgba(this.rgb, 0.38), "rgba(205,220,255,.55)", "rgba(255,160,210,.75)"];
    this.build(n);
  }
  build(n) {
    const rnd = mulberry(this.seed), B = this.fills.length;
    const lists = Array.from({ length: B }, () => []), dust = [];
    const tw = this.twist * -Math.sign(this.spin);
    for (let i = 0; i < n; i++) {
      let r, a; const q = rnd();
      if (q < 0.16) { r = Math.pow(rnd(), 1.8) * 0.26; a = rnd() * TAU; }
      else if (q < this.disk) { r = Math.pow(rnd(), 0.7) * 1.05; a = rnd() * TAU; }
      else { r = 0.07 + Math.pow(rnd(), 0.65) * 0.95; const g = (rnd() + rnd() + rnd() - 1.5) / 1.5; a = ((i % this.arms) / this.arms) * TAU + r * tw + g * (0.9 - r * 0.45) * 0.6 * this.spread; r += (rnd() - 0.5) * 0.05 * this.spread; }
      let b = r < 0.2 ? 0 : rnd() < 0.12 ? 3 : rnd() < 0.55 ? 1 : 2;
      if (r > 0.25 && rnd() < 0.02) b = 4;
      lists[b].push(r, a, rnd() < 0.04 ? 2.1 : 0.55 + rnd() * 0.95);
      if (this.dustOn && q >= this.disk && r > 0.2 && rnd() < 0.22) dust.push(r - 0.03, a - 0.16 * Math.sign(tw), 0.8 + rnd() * 1.2);
    }
    this.parts = lists.map((l) => Float32Array.from(l));
    this.dust = Float32Array.from(dust);
  }
  draw(cx, cy, k, alpha, time, { glow = 0, psize = 1, haze = 1 } = {}) {
    if (alpha <= 0.003 || cx + k * 1.3 < 0 || cx - k * 1.3 > W || cy + k * 1.3 < 0 || cy - k * 1.3 > H) return false;
    const ct = Math.cos(this.tilt), st = Math.sin(this.tilt), rot = time * this.spin, fl = this.flat;
    let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, k * 1.2);
    g.addColorStop(0, rgba(this.rgb, 0.18 * alpha * haze * (1 + glow * 0.7)));
    g.addColorStop(1, rgba(this.rgb, 0));
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(cx - k * 1.2, cy - k * 1.2, k * 2.4, k * 2.4);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, alpha * (0.85 + glow * 0.35));
    for (let b = 0; b < this.parts.length; b++) {
      const Pp = this.parts[b]; ctx.fillStyle = this.fills[b];
      for (let i = 0; i < Pp.length; i += 3) {
        const r = Pp[i], a = Pp[i + 1] + rot * (1.25 - r * 0.7), s = Pp[i + 2] * psize;
        const u = Math.cos(a) * r, v = Math.sin(a) * r * fl;
        ctx.fillRect(cx + (u * ct - v * st) * k - s / 2, cy + (u * st + v * ct) * k - s / 2, s, s);
      }
    }
    ctx.globalCompositeOperation = "source-over";
    if (this.dust.length) {
      ctx.fillStyle = "rgba(3,4,12,.22)"; const Pp = this.dust;
      for (let i = 0; i < Pp.length; i += 3) {
        const r = Pp[i], a = Pp[i + 1] + rot * (1.25 - r * 0.7), s = Pp[i + 2] * psize * 1.3;
        const u = Math.cos(a) * r, v = Math.sin(a) * r * fl;
        ctx.fillRect(cx + (u * ct - v * st) * k - s / 2, cy + (u * st + v * ct) * k - s / 2, s, s);
      }
    }
    ctx.globalAlpha = alpha;
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, k * 0.32);
    g.addColorStop(0, "rgba(255,250,240,.95)"); g.addColorStop(0.2, rgba(this.rgb, 0.45)); g.addColorStop(1, rgba(this.rgb, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - k * 0.32, cy - k * 0.32, k * 0.64, k * 0.64);
    ctx.globalAlpha = 1;
    return true;
  }
  at(cx, cy, k, r, a) {
    const u = Math.cos(a) * r, v = Math.sin(a) * r * this.flat, ct = Math.cos(this.tilt), st = Math.sin(this.tilt);
    return [cx + (u * ct - v * st) * k, cy + (u * st + v * ct) * k];
  }
}
let introGalaxy = null, galSprites = [], sunTex = null, planetTex = [], nebTex = [], mw = null, MW_M = 420;
const jobs = [];
const pump = () => { const job = jobs.shift(); if (job) setTimeout(() => { job(); pump(); }, 40); };
// each portfolio galaxy has a real morphology; colour stays natural (warm cores, blue arms, pink knots, dark dust)
const GAL_MORPH = [
  { seed: 11, flat: 0.8, tilt: -0.5, arms: 2, twist: 2.3 },                 // face-on grand-design spiral
  { seed: 22, flat: 0.2, tilt: 0.24, arms: 2, twist: 2.0, edge: true },     // edge-on, with a midplane dust lane
  { seed: 33, flat: 0.64, tilt: -0.95, arms: 2, twist: 1.9, bar: 0.3 },     // barred spiral
  { seed: 44, flat: 0.4, tilt: 0.55, arms: 2, twist: 3.1 },                 // inclined, tightly wound
];
const PLANET_KIND = ["rocky", "ocean", "gas", "ice"];
const NEB = [
  { x: 1450, y: -900, size: 1700, rgb: [196, 86, 112], a: 0.55, seed: 5 },
  { x: -1550, y: 300, size: 1900, rgb: [92, 156, 190], a: 0.42, seed: 8 },
  { x: 650, y: 1500, size: 1500, rgb: [150, 120, 220], a: 0.38, seed: 13 },
  { x: -900, y: -1500, size: 1500, rgb: [200, 110, 120], a: 0.4, seed: 21 },
  { x: 2300, y: 1000, size: 1300, rgb: [120, 150, 230], a: 0.32, seed: 34 },
];
const DISTANT = (() => { const r = mulberry(901); return Array.from({ length: 80 }, () => ({ x: (r() * 2 - 1) * 3400, y: (r() * 2 - 1) * 3400, s: 1.4 + r() * 3.2, f: 0.25 + r() * 0.55, ang: r() * Math.PI, warm: r() })); })();
function buildGalaxies() {
  introGalaxy = new Galaxy({ seed: 4242, n: tall ? 6000 : 12000, arms: 2, twist: 4.6, tilt: -0.28, flat: 0.44, spin: 0.018, color: "#9ec4ff", intro: true, spread: 1.9, disk: 0.42 });
  galSprites = GALAXIES.map(() => null);
  const size = tall ? 860 : 1300, density = tall ? 0.6 : 1;
  jobs.length = 0;
  jobs.push(() => { sunTex = sunSprite(tall ? 384 : 560); planetTex = PLANET_KIND.map((k2, i) => planetTexture(k2, 160, 50 + i)); });
  GALAXIES.forEach((_, gi) => jobs.push(() => { galSprites[gi] = galaxySprite({ ...GAL_MORPH[gi], size, density }); }));
  NEB.forEach((n, i) => jobs.push(() => { nebTex[i] = nebulaSprite(tall ? 220 : 300, n.seed, n.rgb, n.a); }));
  pump();
}

/* ============================ the sky: Milky Way, nebulae, distant galaxies, stars ============================ */
let stars = [], dust = [];
function buildSky() {
  const rnd = mulberry(7), T = Math.max(W, H) * 1.3;
  const count = Math.round((W * H) / 2600);
  stars = [0.03, 0.08, 0.16, 0.3].map((p, li) => ({ p, T, list: Array.from({ length: Math.round(count * [0.5, 0.27, 0.15, 0.08][li]) }, () => { const big = li === 3 && rnd() < 0.18; return { x: rnd() * T, y: rnd() * T, r: (0.3 + rnd() * 0.6) * (1 + li * 0.25) * (big ? 1.9 : 1), tw: rnd() * TAU, ts: 0.3 + rnd() * 0.9, c: starRgb(rnd), big }; }) }));
  dust = Array.from({ length: 50 }, () => ({ x: rnd() * T, y: rnd() * T, r: 0.6 + rnd() * 1.1 }));
  MW_M = Math.round(Math.max(W, H) * 0.35);
  mw = milkyWay(Math.round(W + MW_M * 2), Math.round(H + MW_M * 2), 3);
}
let skyTimer = 0;
function drawSky(time) {
  if (mw) {
    const p = 0.05, ox = clamp(-cam.x * cam.s * p, -MW_M, MW_M), oy = clamp(-cam.y * cam.s * p, -MW_M, MW_M);
    ctx.globalAlpha = 1; ctx.drawImage(mw, -MW_M + ox, -MW_M + oy);
  }
  // distant galaxies: tiny smudges far behind everything
  for (const g of DISTANT) {
    const p = 0.28, sx = W / 2 + (g.x - cam.x) * cam.s * p, sy = H / 2 + (g.y - cam.y) * cam.s * p;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    const s = g.s * (0.7 + 0.3 * Math.sqrt(cam.s / exploreS));
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(g.ang); ctx.scale(1, g.f);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    gr.addColorStop(0, g.warm > 0.5 ? "rgba(255,235,210,.38)" : "rgba(215,225,255,.34)"); gr.addColorStop(1, "rgba(220,225,255,0)");
    ctx.fillStyle = gr; ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore();
  }
  // nebulae, set back in depth
  ctx.globalCompositeOperation = "lighter";
  NEB.forEach((n, i) => {
    const tex = nebTex[i]; if (!tex) return;
    const p = 0.42, sx = W / 2 + (n.x - cam.x) * cam.s * p, sy = H / 2 + (n.y - cam.y) * cam.s * p, sz = n.size * cam.s * Math.sqrt(p);
    if (!Number.isFinite(sx + sy + sz) || sx + sz / 2 < 0 || sx - sz / 2 > W || sy + sz / 2 < 0 || sy - sz / 2 > H) return;
    ctx.globalAlpha = 0.85; ctx.drawImage(tex, sx - sz / 2, sy - sz / 2, sz, sz);
  });
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  // stars in four depths
  const z = Math.log(cam.s / exploreS || 1);
  for (const layer of stars) {
    const zs = 1 + clamp(z, -0.7, 2) * layer.p * 1.3, T = layer.T;
    const ox = cam.x * cam.s * layer.p + pointer.sx * 26 * layer.p, oy = cam.y * cam.s * layer.p + pointer.sy * 26 * layer.p;
    for (const s of layer.list) {
      let x = (((s.x - ox) % T) + T) % T - (T - W) / 2, y = (((s.y - oy) % T) + T) % T - (T - H) / 2;
      x = W / 2 + (x - W / 2) * zs; y = H / 2 + (y - H / 2) * zs;
      if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      const a = RM ? 0.8 : 0.72 + 0.18 * Math.sin(time * s.ts + s.tw);
      if (s.big) { drawStar(ctx, x, y, s.r * Math.min(1.5, zs), s.c, a, 0.6); continue; }
      ctx.globalAlpha = a; ctx.fillStyle = `rgb(${s.c[0]},${s.c[1]},${s.c[2]})`;
      const r = s.r * Math.min(1.6, zs);
      if (r < 0.8) ctx.fillRect(x, y, r * 1.6, r * 1.6); else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    }
  }
  ctx.globalAlpha = 1;
  if (hubAlpha > 0.01) {
    const T = stars[0]?.T || W;
    ctx.fillStyle = "rgba(200,215,255,.5)";
    for (const d of dust) {
      const x = ((((d.x - cam.x * cam.s * 1.4) % T) + T) % T) - (T - W) / 2, y = ((((d.y - cam.y * cam.s * 1.4) % T) + T) % T) - (T - H) / 2;
      if (x < 0 || y < 0 || x > W || y > H) continue;
      ctx.globalAlpha = 0.16 * hubAlpha; ctx.beginPath(); ctx.arc(x, y, d.r * 1.5, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/* ============================ camera ============================ */
const cam = { x: 0, y: 0, s: 1 }, camV = { x: 0, y: 0, l: 0 };
let goal = { x: 0, y: 0, s: 1 }, camTau = 0.7, exploreS = 1;
const vel = { x: 0, y: 0 };
function camStep(dt) {
  if (RM) { Object.assign(cam, goal); return; }
  const w = 1 / camTau, n = Math.min(80, Math.max(3, Math.ceil(dt / (0.2 * camTau)))), h = dt / n;
  let l = Math.log(cam.s); const gl = Math.log(goal.s);
  for (let i = 0; i < n; i++) {
    camV.x += (w * w * (goal.x - cam.x) - 2 * w * camV.x) * h; cam.x += camV.x * h;
    camV.y += (w * w * (goal.y - cam.y) - 2 * w * camV.y) * h; cam.y += camV.y * h;
    camV.l += (w * w * (gl - l) - 2 * w * camV.l) * h; l += camV.l * h;
  }
  cam.s = Math.exp(l);
}
const toScreen = (x, y) => [(x - cam.x) * cam.s + W / 2, (y - cam.y) * cam.s + H / 2];
function homeFraming() { return { x: 0, y: (H * 0.11) / exploreS, s: exploreS }; }
function exploreAt(d) { return d.type === "crew" ? homeFraming() : { x: d.x, y: d.y, s: exploreS * (d.type === "galaxy" ? 0.95 : 1.1) }; }
function focusPoint() {
  if (tall) return { x: W / 2, y: H * 0.245, avail: Math.min(W, H * 0.42) };
  const panel = Math.min(470, W * 0.4);
  return { x: (W - panel) * 0.5 + 10, y: H * 0.52, avail: Math.min(W - panel - 40, H - 120) };
}
function viewFraming(d) {
  const f = focusPoint();
  const fill = { galaxy: 0.47, log: 0.56, skills: 0.5, crew: 0.62, mission: 0.3, comms: 0.3 }[d.type];
  const s = (f.avail * fill) / d.r;
  return { x: d.x - (f.x - W / 2) / s, y: d.y - (f.y - H / 2) / s, s };
}

/* ============================ station (anatomy figure, placed in the world) ============================ */
const stationEl = $("#station");
let stationHover = null;
mountStation(stationEl, {
  onHover: (mod) => { stationHover = mod; },
  onSelect: (mod) => { if (dragMoved) return; go(mod === "crew" ? "#/about" : `#/${mod}`); },
});
const modLabel = $("#modlabel");

/* ============================ drawing: destinations ============================ */
const state = { sel: { galaxy: [0, 0, 0, 0], log: EXPERIENCE.length - 1, skills: -1 } };
let subs = [];
const ringAt = (x, y, r, a) => { ctx.strokeStyle = `rgba(233,237,247,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) { const an = (i * Math.PI) / 2 + Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * (r + 2), y + Math.sin(an) * (r + 2)); ctx.lineTo(x + Math.cos(an) * (r + 6), y + Math.sin(an) * (r + 6)); ctx.stroke(); } };

// projects are bright stars sitting on the galaxy's arms (galaxies don't visibly turn, so neither do they)
function galaxyStars(gi) {
  const sp = galSprites[gi]; if (!sp) return [];
  const rs = [0.42, 0.63, 0.84];
  return GALAXIES[gi].projects.map((p, j) => { const [u, v] = sp.armPoint(rs[j] ?? 0.6, j % GAL_MORPH[gi].arms, 0.05); const [nx, ny] = sp.P(u, v); return { p, j, nx, ny }; });
}
function drawGalaxyDest(d, t, alpha, f, pins) {
  const sp = galSprites[d.gi], [cx, cy] = toScreen(d.x, d.y), k = d.r * cam.s;
  if (!sp || cx + k * 1.15 < 0 || cx - k * 1.15 > W || cy + k * 1.15 < 0 || cy - k * 1.15 > H) return;
  const sc = k / sp.R;
  ctx.globalAlpha = alpha * (0.92 + d.hover * 0.08);
  ctx.drawImage(sp.canvas, cx - (sp.size / 2) * sc, cy - (sp.size / 2) * sc, sp.size * sc, sp.size * sc);
  ctx.globalAlpha = 1;
  const sel = state.sel.galaxy[d.gi], grow = clamp(Math.sqrt(cam.s / exploreS), 0.85, 1.9);
  for (const st of galaxyStars(d.gi)) {
    const x = cx + st.nx * k, y = cy + st.ny * k, big = st.p.kind === "planet";
    const size = (big ? 2.3 : 1.7) * grow;
    drawStar(ctx, x, y, size, big ? [228, 236, 255] : [255, 238, 215], alpha, big ? 1 : 0.6);
    if (st.p.live && !RM) { const ph = (t * 0.5) % 1; ctx.strokeStyle = `rgba(124,242,185,${(1 - ph) * 0.55 * alpha})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, size * 3 + ph * 14, 0, TAU); ctx.stroke(); }
    if (f > 0.3 && st.j === sel) ringAt(x, y, size * 4 + 5 + (RM ? 0 : Math.sin(t * 2.5)), 0.8 * f);
    if (f > 0.3) subs.push({ x, y, r: size * 4 + 10, side: true, key: `g${d.gi}:${st.j}`, act: () => selectProject(d.gi, st.j), label: st.p.title, small: st.p.label, color: GALAXIES[d.gi].color, sel: st.j === sel });
    else if (pins > 0.02) subs.push({ x, y, r: size * 3 + 6, pin: true, vis: pins, key: `p${d.gi}:${st.j}`, act: () => go(`#/galaxy/${d.id}/${st.j + 1}`), label: st.p.title, color: GALAXIES[d.gi].color });
  }
}

// Mission 001: a small satellite in gold foil with blue arrays, and the inspector circling it
function drawSatelliteDest(d, t, alpha) {
  const [cx, cy] = toScreen(d.x, d.y), k = cam.s * 1.6;
  if (cx < -220 || cx > W + 220 || cy < -220 || cy > H + 220) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy + Math.sin(t * 0.7) * 1.5 * k); ctx.rotate(-0.28 + Math.sin(t * 0.25) * 0.04);
  for (const sgn of [-1, 1]) {
    ctx.strokeStyle = "rgba(190,198,215,.8)"; ctx.lineWidth = Math.max(0.8, k * 0.8); ctx.beginPath(); ctx.moveTo(sgn * 9 * k, 0); ctx.lineTo(sgn * 13.5 * k, 0); ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const x0 = sgn > 0 ? (13.5 + i * 15) * k : -(13.5 + i * 15 + 14) * k, y0 = -5.5 * k, w = 14 * k, h = 11 * k;
      const gp = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h); gp.addColorStop(0, "#14204a"); gp.addColorStop(0.5, "#27407f"); gp.addColorStop(1, "#111a3d");
      ctx.fillStyle = gp; ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = "rgba(160,185,255,.16)"; ctx.lineWidth = 0.6; ctx.beginPath();
      for (let c = 1; c < 4; c++) { ctx.moveTo(x0 + (w * c) / 4, y0); ctx.lineTo(x0 + (w * c) / 4, y0 + h); } for (let r = 1; r < 3; r++) { ctx.moveTo(x0, y0 + (h * r) / 3); ctx.lineTo(x0 + w, y0 + (h * r) / 3); } ctx.stroke();
      const sh = (t * 0.12 + i * 0.3 + (sgn > 0 ? 0.5 : 0)) % 1, gs = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
      gs.addColorStop(clamp(sh - 0.12, 0, 1), "rgba(255,255,255,0)"); gs.addColorStop(sh, "rgba(220,235,255,.18)"); gs.addColorStop(clamp(sh + 0.12, 0, 1), "rgba(255,255,255,0)");
      ctx.fillStyle = gs; ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = "rgba(200,208,225,.55)"; ctx.lineWidth = 0.7; ctx.strokeRect(x0, y0, w, h);
    }
  }
  const gb = ctx.createLinearGradient(-9 * k, -9 * k, 9 * k, 9 * k);
  gb.addColorStop(0, "#6e4a12"); gb.addColorStop(0.3, "#d6a43f"); gb.addColorStop(0.5, "#f5da8c"); gb.addColorStop(0.72, "#b07e25"); gb.addColorStop(1, "#5d3b0d");
  ctx.fillStyle = gb; ctx.fillRect(-9 * k, -9 * k, 18 * k, 18 * k);
  ctx.strokeStyle = "rgba(255,230,170,.35)"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-9 * k, -2 * k); ctx.lineTo(-2 * k, -9 * k); ctx.moveTo(-6 * k, 9 * k); ctx.lineTo(9 * k, -4 * k); ctx.stroke();
  ctx.strokeStyle = "rgba(120,80,20,.8)"; ctx.strokeRect(-9 * k, -9 * k, 18 * k, 18 * k);
  ctx.strokeStyle = "rgba(205,210,222,.9)"; ctx.lineWidth = Math.max(0.8, k * 0.7); ctx.beginPath(); ctx.moveTo(0, -9 * k); ctx.lineTo(0, -13 * k); ctx.stroke();
  const gd = ctx.createLinearGradient(-6 * k, -18 * k, 6 * k, -12 * k); gd.addColorStop(0, "#f4f6fb"); gd.addColorStop(1, "#8f99ad");
  ctx.fillStyle = gd; ctx.beginPath(); ctx.ellipse(0, -14.5 * k, 6.5 * k, 2.6 * k, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
  ctx.restore();
  // the inspector: a small white free-flyer with a running light
  const a = t * 0.55, ix = cx + Math.cos(a) * 32 * k, iy = cy + Math.sin(a) * 12 * k, s = Math.max(2.2, 2.4 * k);
  ctx.globalAlpha = alpha * (Math.sin(a) < 0 ? 0.75 : 1);
  const gi = ctx.createLinearGradient(ix - s, iy - s, ix + s, iy + s); gi.addColorStop(0, "#f2f4f9"); gi.addColorStop(1, "#7f889c");
  ctx.fillStyle = gi; ctx.fillRect(ix - s, iy - s, s * 2, s * 2);
  drawStar(ctx, ix + s, iy - s, 0.9, [124, 242, 185], alpha * (0.6 + 0.4 * Math.sin(t * 3)), 0);
  ctx.globalAlpha = 1;
  if (!RM && (t % 6) < 0.25) drawStar(ctx, cx + 20 * k, cy - 6 * k, 1.6, [255, 255, 255], Math.sin(((t % 6) / 0.25) * Math.PI) * alpha, 1.2);
}
// Comms: a relay satellite with a big white dish
function drawCommsDest(d, t, alpha) {
  const [cx, cy] = toScreen(d.x, d.y), k = cam.s * 1.5;
  if (cx < -220 || cx > W + 220 || cy < -220 || cy > H + 220) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(0.18);
  for (const sgn of [-1, 1]) {
    const x0 = sgn > 0 ? 9 * k : -21 * k, gp = ctx.createLinearGradient(x0, -4 * k, x0 + 12 * k, 4 * k);
    gp.addColorStop(0, "#14204a"); gp.addColorStop(0.5, "#2a4485"); gp.addColorStop(1, "#111a3d");
    ctx.fillStyle = gp; ctx.fillRect(x0, -4 * k, 12 * k, 8 * k); ctx.strokeStyle = "rgba(200,208,225,.5)"; ctx.lineWidth = 0.7; ctx.strokeRect(x0, -4 * k, 12 * k, 8 * k);
  }
  const gb = ctx.createLinearGradient(-7 * k, -7 * k, 7 * k, 7 * k); gb.addColorStop(0, "#e9ecf3"); gb.addColorStop(1, "#7d8597");
  ctx.fillStyle = gb; ctx.fillRect(-7 * k, -6 * k, 14 * k, 12 * k);
  ctx.save(); ctx.translate(-2 * k, -12 * k); ctx.rotate(-0.55);
  const gd = ctx.createRadialGradient(-4 * k, -2 * k, 0, 0, 0, 16 * k); gd.addColorStop(0, "#ffffff"); gd.addColorStop(0.7, "#c2c9d6"); gd.addColorStop(1, "#7c8496");
  ctx.fillStyle = gd; ctx.beginPath(); ctx.ellipse(0, 0, 15 * k, 5.5 * k, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.strokeStyle = "rgba(220,225,235,.8)"; ctx.beginPath(); ctx.moveTo(-10 * k, 1 * k); ctx.lineTo(0, -10 * k); ctx.lineTo(10 * k, 1 * k); ctx.stroke();
  ctx.restore(); ctx.restore();
  ctx.globalAlpha = alpha;
  const fx = cx + 2 * k, fy = cy - 24 * k;
  for (let i = 0; i < 3; i++) { const ph = (t * 0.35 + i / 3) % 1; ctx.strokeStyle = `rgba(220,232,255,${(1 - ph) * 0.35})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fx, fy, (8 + ph * 46) * k, -2.3, -0.9); ctx.stroke(); }
  drawStar(ctx, cx - 7 * k, cy + 6 * k, 0.8, [255, 107, 122], alpha * (Math.sin(t * 2.2) > 0.6 ? 1 : 0.2), 0);
  ctx.globalAlpha = 1;
}

// Flight Log: a real star with four lit planets on faint orbits (inner = earliest role)
const LOG_ORB = [0.3, 0.48, 0.7, 0.93], LOG_R = [4.5, 6, 12, 9.5], LOG_TILT = -0.12, LOG_FLAT = 0.3;
const LOG_OPTS = [{ atmo: null }, { atmo: "140,190,255" }, { atmo: "255,220,180" }, { atmo: "170,230,240", ring: { c: "200,225,235", tilt: -0.35 } }];
const logBodies = (t) => EXPERIENCE.map((e, i) => ({ e, i, r: LOG_ORB[i], a: 0.9 + i * 1.85 + (t * 0.03) / Math.pow(LOG_ORB[i], 1.5) }));
function drawLogDest(d, t, alpha, f, pins) {
  const [cx, cy] = toScreen(d.x, d.y), k = d.r * cam.s;
  if (cx + k * 1.2 < 0 || cx - k * 1.2 > W || cy + k < 0 || cy - k > H) return;
  const sel = state.sel.log, ct = Math.cos(LOG_TILT), st = Math.sin(LOG_TILT);
  ctx.lineWidth = 0.8;
  for (const b of logBodies(t)) { ctx.strokeStyle = `rgba(205,215,240,${(0.05 + 0.1 * Math.max(f, pins) + (b.i === sel ? 0.18 * f : 0)) * alpha})`; ctx.beginPath(); ctx.ellipse(cx, cy, b.r * k, b.r * k * LOG_FLAT, LOG_TILT, 0, TAU); ctx.stroke(); }
  const pos = logBodies(t).map((b) => { const u = Math.cos(b.a) * b.r * k, v = Math.sin(b.a) * b.r * k * LOG_FLAT; return { ...b, x: cx + u * ct - v * st, y: cy + u * st + v * ct, back: Math.sin(b.a) < 0 }; });
  const planet = (b) => {
    const r = LOG_R[b.i] * cam.s * 1.15, tex = planetTex[b.i];
    if (tex) drawPlanet(ctx, tex, b.x, b.y, Math.max(2.2, r), Math.atan2(cy - b.y, cx - b.x), LOG_OPTS[b.i]);
    if (f > 0.3 && b.i === sel) ringAt(b.x, b.y, Math.max(2.2, r) * (b.i === 3 ? 2.3 : 1.4) + 6, 0.8 * f);
    if (f > 0.3) subs.push({ x: b.x, y: b.y, r: Math.max(2.2, r) + 14, key: `l${b.i}`, act: () => selectRole(b.i), label: b.e.org.split(",")[0], small: b.e.when, color: b.e.color, sel: b.i === sel });
    else if (pins > 0.02) subs.push({ x: b.x, y: b.y, r: Math.max(2.2, r) + 8, pin: true, vis: pins, key: `lp${b.i}`, act: () => { state.sel.log = b.i; go("#/log"); }, label: b.e.org.split(",")[0], color: b.e.color });
  };
  ctx.globalAlpha = alpha;
  pos.filter((b) => b.back).forEach(planet);
  if (sunTex) { const S = 290 * cam.s; ctx.globalCompositeOperation = "lighter"; ctx.drawImage(sunTex, cx - S, cy - S, S * 2, S * 2); ctx.globalCompositeOperation = "source-over"; }
  pos.filter((b) => !b.back).forEach(planet);
  ctx.globalAlpha = 1;
}

// Skills: constellations made of real-looking stars, among other field stars; their lines only firm up as you come close
const CONST_AT = [[-0.72, -0.48], [0.18, -0.48], [-0.72, 0.48], [0.18, 0.48]];
const constellations = SKILLS.map((grp, gi) => {
  const rnd = mulberry(gi * 71 + 9), n = grp.items.length;
  const pts = Array.from({ length: n }, (_, i) => [((i % 2 ? 1 : -1) * 0.07 + (rnd() - 0.5) * 0.08) + Math.sin(i * 0.9 + gi) * 0.05, -0.32 + (0.64 * i) / (n - 1) + (rnd() - 0.5) * 0.02]);
  const edges = pts.slice(1).map((_, i) => [i, i + 1]); if (n > 5) edges.push([1, 4]);
  const look = pts.map((_, i) => ({ c: starRgb(rnd), m: i === 0 ? 2.4 : 1.2 + rnd() * 0.9 }));
  return { grp, gi, pts, edges, look };
});
const FIELD = (() => { const r = mulberry(4040); return Array.from({ length: 46 }, () => ({ x: (r() * 2 - 1) * 1.15, y: (r() * 2 - 1) * 0.95, m: 0.6 + r() * 1.1, c: starRgb(r) })); })();
function drawSkillsDest(d, t, alpha, f, pins) {
  const [cx, cy] = toScreen(d.x, d.y), k = d.r * cam.s;
  if (cx + k * 1.2 < 0 || cx - k * 1.2 > W || cy + k < 0 || cy - k > H) return;
  const sel = state.sel.skills, grow = clamp(Math.sqrt(cam.s / exploreS), 0.85, 1.7);
  for (const s of FIELD) drawStar(ctx, cx + s.x * k, cy + s.y * k, s.m * grow, s.c, alpha * 0.8, 0);
  for (const c of constellations) {
    const ox = cx + CONST_AT[c.gi][0] * k, oy = cy + CONST_AT[c.gi][1] * k;
    const on = sel < 0 || sel === c.gi ? 1 : 0.4;
    ctx.strokeStyle = `rgba(205,218,245,${(0.05 + 0.2 * Math.max(pins, f) + 0.12 * d.hover + (sel === c.gi ? 0.2 : 0)) * alpha * on})`; ctx.lineWidth = 0.8;
    ctx.beginPath(); for (const [i, j] of c.edges) { ctx.moveTo(ox + c.pts[i][0] * k, oy + c.pts[i][1] * k); ctx.lineTo(ox + c.pts[j][0] * k, oy + c.pts[j][1] * k); } ctx.stroke();
    c.pts.forEach(([px, py], i) => {
      const x = ox + px * k, y = oy + py * k, L = c.look[i];
      drawStar(ctx, x, y, L.m * grow, L.c, alpha * (on < 1 ? 0.55 : 1), L.m > 2 ? 0.8 : 0.25);
      if (f > 0.3) subs.push({ x, y, r: L.m * grow * 3 + 6, key: `s${c.gi}:${i}`, act: () => selectGroup(c.gi), label: c.grp.items[i], color: c.grp.color, star: true, side: true, dim: on < 1 });
    });
    if (f > 0.3) subs.push({ x: ox - 0.06 * k, y: oy - 0.36 * k, key: `sg${c.gi}`, act: () => selectGroup(c.gi), label: c.grp.name, color: c.grp.color, head: true, side: true, dim: on < 1 });
    else if (pins > 0.02) subs.push({ x: ox, y: oy - 0.38 * k, r: 0, pin: true, vis: pins, key: `sp${c.gi}`, act: () => { go("#/skills"); setTimeout(() => selectGroup(c.gi), 900); }, label: c.grp.name, color: c.grp.color });
  }
}

/* ============================ rocket ============================ */
const rocket = { x: 0, y: 0, ang: 0, park: { id: "crew", a: 0.6 }, thrust: 0 };
let flight = null, exhaust = [];
function parkPos(id, a) {
  const d = D[id];
  if (d.type === "crew") return [Math.cos(a) * 360, Math.sin(a) * 150 + 10];
  const rr = d.r * (d.type === "galaxy" ? 1.05 : 1.2) + 30;
  return [d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.55];
}
function drawRocket(x, y, size, ang, thrust, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const s = size / 30; ctx.scale(s, s);
  if (thrust > 0.02) {
    const Lf = (14 + 16 * thrust) * (RM ? 1 : 0.85 + 0.15 * Math.sin(t * 40));
    const g = ctx.createLinearGradient(-12, 0, -12 - Lf, 0);
    g.addColorStop(0, `rgba(255,250,235,${0.95 * thrust})`); g.addColorStop(0.35, `rgba(127,227,255,${0.75 * thrust})`); g.addColorStop(1, "rgba(127,227,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-11, -3.6); ctx.quadraticCurveTo(-12 - Lf * 0.6, 0, -11, 3.6); ctx.quadraticCurveTo(-12 - Lf, 0, -11, -3.6); ctx.fill();
  }
  ctx.lineWidth = (1 / s) * 0.9; ctx.strokeStyle = "rgba(233,237,247,.95)"; ctx.fillStyle = "#24305a";
  ctx.beginPath(); ctx.moveTo(-6, -4.5); ctx.lineTo(-12, -10); ctx.lineTo(-11, -4.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, 4.5); ctx.lineTo(-12, 10); ctx.lineTo(-11, 4.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  const b = ctx.createLinearGradient(0, -5, 0, 5); b.addColorStop(0, "#f2f5fb"); b.addColorStop(0.55, "#b9c4dc"); b.addColorStop(1, "#6d7a99");
  ctx.fillStyle = b;
  ctx.beginPath(); ctx.moveTo(15, 0); ctx.bezierCurveTo(11, -5.4, 4, -5.6, -10, -4.6); ctx.lineTo(-11.5, -3.4); ctx.lineTo(-11.5, 3.4); ctx.lineTo(-10, 4.6); ctx.bezierCurveTo(4, 5.6, 11, 5.4, 15, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(40,52,90,.6)"; ctx.beginPath(); ctx.moveTo(8, -4.6); ctx.lineTo(8, 4.6); ctx.moveTo(-6, -4.9); ctx.lineTo(-6, 4.9); ctx.stroke();
  ctx.fillStyle = "#7fe3ff"; ctx.strokeStyle = "#24305a"; ctx.beginPath(); ctx.arc(2.5, 0, 2.1, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/* ============================ warp ============================ */
let warp = null;
const warpStars = Array.from({ length: 760 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
const WARP_T = 2.9;
function drawWarp(dt, wt) {
  const speed = 0.25 * smooth(0, 1.0, wt) + 2.6 * smooth(0.55, 1.25, wt) * (1 - smooth(1.75, 2.75, wt));
  const alpha = smooth(0.15, 0.6, wt) * (1 - smooth(2.0, 2.85, wt));
  if (alpha <= 0) return;
  const F = Math.max(W, H) * 0.55;
  ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  for (const s of warpStars) {
    s.z -= speed * dt * 0.55;
    if (s.z < 0.03) { s.z = 1; s.x = (Math.random() - 0.5) * 2; s.y = (Math.random() - 0.5) * 2; }
    const z1 = s.z, z0 = Math.min(1, s.z + 0.012 + speed * 0.05);
    const x1 = W / 2 + (s.x / z1) * F * 0.3, y1 = H / 2 + (s.y / z1) * F * 0.3, x0 = W / 2 + (s.x / z0) * F * 0.3, y0 = H / 2 + (s.y / z0) * F * 0.3;
    if (x1 < -50 || x1 > W + 50 || y1 < -50 || y1 > H + 50) continue;
    const a = alpha * clamp((1 - z1) * 1.4, 0, 1);
    ctx.strokeStyle = z1 < 0.4 ? `rgba(220,245,255,${a})` : `rgba(127,190,255,${a * 0.8})`;
    ctx.lineWidth = clamp((1 - z1) * 2.4, 0.5, 2.6);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.35);
  g.addColorStop(0, `rgba(160,220,255,${0.22 * alpha * smooth(0.8, 1.5, wt)})`); g.addColorStop(1, "rgba(160,220,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
}

/* ============================ DOM: labels, pins, beacons, radar ============================ */
const labelsEl = $("#labels");
DESTS.forEach((d) => {
  if (d.type !== "crew") {
    const b = document.createElement("button");
    b.className = `dlabel${d.type === "galaxy" ? " big" : ""}`; b.type = "button"; b.style.setProperty("--c", d.color);
    b.innerHTML = `<span class="k">${esc(d.kicker)}</span><span class="n">${esc(d.name)}</span>`;
    b.setAttribute("aria-label", `${d.name}, ${d.kicker}`);
    b.addEventListener("click", () => go(routeOf(d.id)));
    b.addEventListener("pointerenter", () => { hoverId = d.id; });
    b.addEventListener("pointerleave", () => { if (hoverId === d.id) hoverId = null; });
    b.addEventListener("focus", () => { hoverId = d.id; centerOn(d); });
    labelsEl.appendChild(b); d.el = b;
  }
  const bc = document.createElement("button");
  bc.className = "beacon"; bc.type = "button"; bc.style.setProperty("--c", d.color); bc.tabIndex = -1;
  bc.innerHTML = `<i class="arr"></i><span>${esc(d.type === "crew" ? "Home" : d.name)}</span><small></small>`;
  bc.setAttribute("aria-label", `Fly to ${d.name}`);
  bc.addEventListener("click", () => (d.type === "crew" ? flyHome() : go(routeOf(d.id))));
  $("#beacons").appendChild(bc); d.beacon = bc; d.hover = 0; d._lv = 0; d._bv = 0;
});
const subPool = new Map();
function syncSubs(vis) {
  const seen = new Set();
  for (const s of subs) {
    if (!s.label) continue;
    seen.add(s.key);
    let el = subPool.get(s.key);
    if (!el) {
      el = document.createElement("button"); el.type = "button"; el.className = s.pin ? "pin" : "sublabel";
      el.innerHTML = `<b></b><small></small>`; labelsEl.appendChild(el); subPool.set(s.key, el);
      el.addEventListener("click", (e) => { e.stopPropagation(); el._act?.(); });
    }
    el._act = s.act;
    el.style.setProperty("--c", s.color);
    if (el._label !== s.label) { el._label = s.label; el._w = 0; el.firstChild.textContent = s.label; el.lastChild.textContent = s.small || (s.head ? "constellation" : ""); el.setAttribute("aria-label", s.label); }
    el.classList.toggle("sel", !!s.sel);
    let v = s.pin ? s.vis : vis;
    if (s.side) {
      const w = el._w || (el._w = el.offsetWidth || 120);
      let x = s.x + (s.head ? 0 : (s.r || 8) - 2);
      if (x + w > W - 8) x = s.x - (s.r || 8) + 2 - w;
      el.style.transform = `translate3d(${x.toFixed(1)}px,${(s.y + (s.head ? -18 : 0)).toFixed(1)}px,0) translate(0,-50%)`;
    } else if (s.pin) {
      el.style.transform = `translate3d(${s.x.toFixed(1)}px,${(s.y - (s.r || 8)).toFixed(1)}px,0) translate(-50%,-100%)`;
    } else el.style.transform = `translate3d(${s.x.toFixed(1)}px,${(s.y + (s.r || 10) + 2).toFixed(1)}px,0) translate(-50%,0)`;
    el.classList.toggle("side", !!s.side);
    if (tall && s.key[0] === "g" && !s.sel) v = 0;
    el.style.opacity = (v * (s.dim ? 0.45 : 1)).toFixed(3);
    el.style.pointerEvents = v > 0.6 ? "auto" : "none";
    el.tabIndex = v > 0.6 ? 0 : -1;
    if (s.star) { el.lastChild.textContent = ""; el.firstChild.style.fontSize = "11.5px"; }
    if (s.head) el.firstChild.style.fontSize = "14px";
  }
  for (const [key, el] of subPool) if (!seen.has(key)) { el.style.opacity = "0"; el.style.pointerEvents = "none"; el.tabIndex = -1; }
}
const radar = $("#radar"), rctx = radar.getContext("2d");
let radarDots = [];
function drawRadar(alpha) {
  radar.parentElement.style.opacity = alpha.toFixed(3);
  radar.parentElement.style.pointerEvents = alpha > 0.5 ? "auto" : "none";
  if (alpha < 0.01) return;
  const S = radar.clientWidth, dpr = Math.min(devicePixelRatio || 1, 2);
  if (radar.width !== Math.round(S * dpr)) { radar.width = Math.round(S * dpr); radar.height = Math.round(S * dpr); }
  rctx.setTransform(dpr, 0, 0, dpr, 0, 0); rctx.clearRect(0, 0, S, S);
  const R = S / 2 - 2, c = S / 2, range = WORLD * 0.95;
  rctx.lineWidth = 1; rctx.strokeStyle = "rgba(255,255,255,.14)";
  rctx.beginPath(); rctx.arc(c, c, R, 0, TAU); rctx.stroke(); rctx.beginPath(); rctx.arc(c, c, R * 0.5, 0, TAU); rctx.stroke();
  rctx.strokeStyle = "rgba(255,255,255,.06)"; rctx.beginPath(); rctx.moveTo(c - R, c); rctx.lineTo(c + R, c); rctx.moveTo(c, c - R); rctx.lineTo(c, c + R); rctx.stroke();
  if (!RM && rctx.createConicGradient) { const g = rctx.createConicGradient(clock * 0.9, c, c); g.addColorStop(0, "rgba(127,227,255,.22)"); g.addColorStop(0.12, "rgba(127,227,255,0)"); g.addColorStop(1, "rgba(127,227,255,0)"); rctx.fillStyle = g; rctx.beginPath(); rctx.arc(c, c, R, 0, TAU); rctx.fill(); }
  radarDots = [];
  for (const d of DESTS) {
    let x = (d.x / range) * R, y = (d.y / range) * R;
    const l = Math.hypot(x, y); if (l > R - 4) { x *= (R - 4) / l; y *= (R - 4) / l; }
    rctx.fillStyle = d.color; rctx.globalAlpha = 0.9;
    rctx.beginPath(); rctx.arc(c + x, c + y, d.type === "galaxy" ? 3.2 : d.type === "crew" ? 3 : 2.2, 0, TAU); rctx.fill();
    radarDots.push({ x: c + x, y: c + y, d });
  }
  rctx.globalAlpha = 1;
  const vw = (W / cam.s / range) * R, vh = (H / cam.s / range) * R, vx = c + (cam.x / range) * R, vy = c + (cam.y / range) * R;
  rctx.strokeStyle = "rgba(233,237,247,.8)"; rctx.strokeRect(vx - vw / 2, vy - vh / 2, vw, vh);
}
radar.addEventListener("click", (e) => {
  const r = radar.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bd = 14; for (const p of radarDots) { const dd = Math.hypot(p.x - x, p.y - y); if (dd < bd) { bd = dd; best = p.d; } }
  if (best) (best.type === "crew" ? flyHome() : go(routeOf(best.id)));
  else if (mode === "explore") { const S = radar.clientWidth, range = WORLD * 0.95; goal = { ...goal, x: ((x - S / 2) / (S / 2 - 2)) * range, y: ((y - S / 2) / (S / 2 - 2)) * range }; vel.x = vel.y = 0; camTau = 0.7; }
});

/* ============================ views ============================ */
const views = Object.fromEntries($$(".view").map((v) => [v.dataset.view, v]));
const live = $("#live");
let figHandles = {};
const icon = { prev: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3 5 8l5 5"/></svg>`, next: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3l5 5-5 5"/></svg>` };
const pdr = (p, c) => `<div class="pdr" style="--c:${c}">
  <div><span class="k">${p.pLabel || "Problem"}</span><p>${esc(p.problem)}</p></div>
  <div><span class="k">What I did</span><p>${esc(p.did)}</p></div>
  ${p.result ? `<div class="res"><span class="k">Result</span><p>${esc(p.result)}</p></div>` : ""}</div>`;
function renderGalaxy(gi) {
  const g = GALAXIES[gi], pi = state.sel.galaxy[gi], p = g.projects[pi], next = GALAXIES[(gi + 1) % GALAXIES.length];
  const el = $("#v-galaxy"); el.style.setProperty("--c", g.color);
  el.innerHTML = `
    <p class="v-kicker">Galaxy ${g.num} · ${esc(g.name)}</p>
    <div><h2 class="v-title" id="g-title" tabindex="-1">${esc(p.title)}${p.award ? `<span class="award">${esc(p.award)}</span>` : ""}</h2><p class="v-sub">${esc(p.sub)}</p><p class="v-meta">${esc(p.meta)}</p></div>
    ${pdr(p, g.color)}
    <div class="tools">${p.tools.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
    ${gi === 0 && pi === 0 ? `<a class="linkish" href="#/mission">Open the Mission 001 figure →</a>` : ""}
    <div><div class="worlds" role="group" aria-label="Worlds in this galaxy">${g.projects.map((q, j) => `<button type="button" data-j="${j}" aria-current="${j === pi}"><i></i>${esc(q.title)}</button>`).join("")}</div>
    <div class="stepper"><button class="step" data-step="-1" aria-label="Previous world">${icon.prev}</button><button class="step" data-step="1" aria-label="Next world">${icon.next}</button><span>${pi + 1} / ${g.projects.length} · ← →</span></div>
    <a class="linkish next-gal" href="#/galaxy/${next.id}" style="--c:${next.color}">Fly to Galaxy ${next.num} · ${esc(next.name)} →</a></div>`;
  $$(".worlds button", el).forEach((b) => b.addEventListener("click", () => selectProject(gi, +b.dataset.j)));
  $$("[data-step]", el).forEach((b) => b.addEventListener("click", () => selectProject(gi, (pi + +b.dataset.step + g.projects.length) % g.projects.length)));
}
function selectProject(gi, j) {
  if (state.sel.galaxy[gi] === j) return;
  state.sel.galaxy[gi] = j; renderGalaxy(gi); setHash(`#/galaxy/${GALAXIES[gi].id}/${j + 1}`);
  live.textContent = GALAXIES[gi].projects[j].title;
}
function renderMission() {
  const p = GALAXIES[0].projects[0];
  const el = $("#v-mission"); el.style.setProperty("--c", "#7cf2b9");
  const stations = ["MLI blanket · +x face", "RCS thruster pod · near corner", "Solar array · +y wing", "High-gain antenna · dish", "Solar array · −y wing"];
  el.innerHTML = `
    <p class="v-kicker">Mission 001 · In flight</p>
    <div><h2 class="v-title" id="m-title" tabindex="-1">${esc(p.sub)}</h2><p class="v-meta">${esc(p.meta)} · Python · MuJoCo</p></div>
    ${pdr(p, "#7cf2b9")}
    <div><span class="pdr"><span class="k" style="margin-top:4px">Inspection stations</span></span><div class="stations" role="group" aria-label="Inspection stations">${stations.map((s, i) => `<button type="button" data-i="${i}" aria-current="${i === 0}"><b>0${i + 1}</b>${s}</button>`).join("")}</div></div>
    <p class="v-meta" style="line-height:1.6">Concept illustration of what the simulation models. Perception, anomaly detection, planning and failure recovery are in development.</p>`;
  $$(".stations button", el).forEach((b) => b.addEventListener("click", () => figHandles.mission?.go(+b.dataset.i)));
}
function renderLog() {
  const i = state.sel.log, e = EXPERIENCE[i];
  const el = $("#v-log"); el.style.setProperty("--c", e.color);
  el.innerHTML = `
    <p class="v-kicker">Flight Log · Orbit ${i + 1} of ${EXPERIENCE.length}</p>
    <div><h2 class="v-title" id="l-title" tabindex="-1">${esc(e.org)}</h2><p class="v-sub">${esc(e.role)}</p><p class="v-meta">${esc(e.when)} · ${esc(e.where)}</p></div>
    <ul class="roles">${e.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    ${e.project ? `<a class="linkish" href="#/galaxy/ps/${e.project[1] + 1}">See the project in Galaxy 04 →</a>` : ""}
    <div><div class="worlds" role="group" aria-label="Roles">${EXPERIENCE.map((x, j) => `<button type="button" data-j="${j}" aria-current="${j === i}" style="--c:${x.color}"><i></i>${esc(x.org.split(",")[0])}</button>`).join("")}</div>
    <div class="stepper"><button class="step" data-step="-1" aria-label="Earlier role">${icon.prev}</button><button class="step" data-step="1" aria-label="Later role">${icon.next}</button><span>inner orbit = earliest · ← →</span></div></div>`;
  $$(".worlds button", el).forEach((b) => b.addEventListener("click", () => selectRole(+b.dataset.j)));
  $$("[data-step]", el).forEach((b) => b.addEventListener("click", () => selectRole((i + +b.dataset.step + EXPERIENCE.length) % EXPERIENCE.length)));
}
function selectRole(i) { if (state.sel.log === i) return; state.sel.log = i; renderLog(); live.textContent = EXPERIENCE[i].org; }
function renderCrew() {
  const el = $("#v-crew"); el.style.setProperty("--c", "#b69cff");
  const bars = Array.from({ length: 26 }, (_, i) => `<i style="height:${30 + ((i * 37) % 70)}%"></i>`).join("");
  el.innerHTML = `
    <p class="v-kicker">Crew module · About me</p>
    <h2 class="v-title" id="c-title" tabindex="-1">More questions than answers.</h2>
    <p class="lead">I study Business, Technology &amp; Entrepreneurship at NYU Stern. What I love most are answers that open up new questions, and I bring that same curiosity to building products.</p>
    <div class="badge" id="badge"><div class="badge-in">
      <div class="face"><div class="b-top"><span>NYU Stern · Crew</span><b>${CREW.id}</b></div><div class="b-photo"><img src="assets/priyansh.jpg" alt="Portrait of Priyansh Jain"></div><div class="b-name">${CREW.name}</div><div class="b-role">${CREW.role}</div><div class="b-line"><span>BTE · DEC 2027<br>NEW YORK</span><span class="b-bars">${bars}</span></div></div>
      <div class="face back"><div class="b-top"><span>Mission stats</span><b>${CREW.id}</b></div><div class="stats">${CREW.stats.map(([n, l]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join("")}</div></div>
    </div></div>
    <button class="flip" id="flip" type="button">↻ Flip for mission stats</button>
    <dl class="facts">${CREW.facts.map(([k2, v]) => `<div><dt>${esc(k2)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  const flip = () => { const b = $("#badge"); const on = b.classList.toggle("flipped"); $("#flip").textContent = on ? "↻ Flip back to ID" : "↻ Flip for mission stats"; };
  $("#flip").addEventListener("click", flip); $("#badge").addEventListener("click", flip);
}
function renderSkills() {
  const el = $("#v-skills"); el.style.setProperty("--c", "#7fe3ff");
  el.innerHTML = `
    <p class="v-kicker">Constellations · Skills</p>
    <h2 class="v-title" id="s-title" tabindex="-1">What I navigate by.</h2>
    <p class="v-sub">Each constellation is a set of skills; every star is one of them.</p>
    <div class="groups" id="groups">${SKILLS.map((g, i) => `<button type="button" data-i="${i}" style="--c:${g.color}"><h3><i></i>${esc(g.name)}</h3><p>${g.items.map(esc).join(" · ")}</p></button>`).join("")}</div>`;
  $$("#groups button").forEach((b) => {
    b.addEventListener("pointerenter", () => selectGroup(+b.dataset.i));
    b.addEventListener("focus", () => selectGroup(+b.dataset.i));
    b.addEventListener("click", () => selectGroup(+b.dataset.i, true));
  });
  $("#groups").addEventListener("pointerleave", () => selectGroup(-1));
}
function selectGroup(i, toggle) {
  if (toggle && state.sel.skills === i) i = -1;
  state.sel.skills = i;
  $("#groups")?.classList.toggle("dim", i >= 0);
  $$("#groups button").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
}
const CHANNELS = [{ name: "Email", az: 0, el: 34 }, { name: "LinkedIn", az: 48, el: 56 }, { name: "Resume", az: 92, el: 30 }];
function renderComms() {
  const el = $("#v-comms"); el.style.setProperty("--c", "#7fe3ff");
  el.innerHTML = `
    <p class="v-kicker">Comms · Contact</p>
    <h2 class="v-title" id="x-title" tabindex="-1">Let's build what comes next.</h2>
    <p class="v-sub">I'm looking for PM internships and full-time roles, especially at space companies. If you're building something ambitious, I'd love to hear about it.</p>
    <div class="channels">
      <a href="mailto:${CONTACT.email}" data-ch="Email"><span class="ch">CH 01</span><span class="nm">Email<small>${CONTACT.email}</small></span><span class="go">↗</span></a>
      <a href="${CONTACT.linkedin}" target="_blank" rel="noopener" data-ch="LinkedIn"><span class="ch">CH 02</span><span class="nm">LinkedIn<small>in/priyanshjain05</small></span><span class="go">↗</span></a>
      <a href="${CONTACT.resume}" target="_blank" rel="noopener" data-ch="Resume"><span class="ch">CH 03</span><span class="nm">Resume<small>PDF · one page</small></span><span class="go">↗</span></a>
      <button type="button" id="copy" data-ch="Email"><span class="ch">CH 04</span><span class="nm">Copy email<small>to your clipboard</small></span><span class="go">⧉</span></button>
    </div>`;
  $$("[data-ch]", el).forEach((a) => {
    a.addEventListener("pointerenter", () => figHandles.comms?.aim(a.dataset.ch));
    a.addEventListener("focus", () => figHandles.comms?.aim(a.dataset.ch));
    a.addEventListener("pointerleave", () => figHandles.comms?.release());
    a.addEventListener("click", () => figHandles.comms?.transmit(a.dataset.ch));
  });
  $("#copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(CONTACT.email); $("#copy small").textContent = "copied ✓"; } catch { location.href = `mailto:${CONTACT.email}`; } });
}
async function mountFigure(which) {
  const wrap = $(`#fig-${which} > div`);
  const mod = which === "mission" ? await import("./fig/mission001.mjs") : await import("./fig/comms.mjs");
  if (current !== which) return;
  figHandles[which]?.destroy();
  figHandles[which] = which === "mission"
    ? mod.mount(wrap, { onReadout: (_, i) => $$("#v-mission .stations button").forEach((b) => b.setAttribute("aria-current", String(+b.dataset.i === i))) })
    : mod.mount(wrap, { channels: CHANNELS });
}
function openView(id) {
  const d = D[id], type = d.type;
  ({ galaxy: () => renderGalaxy(d.gi), mission: renderMission, log: renderLog, crew: renderCrew, skills: renderSkills, comms: renderComms })[type]();
  const v = views[type]; v.classList.add("on");
  if (type === "mission" || type === "comms") { $(`#fig-${type}`).classList.add("on"); mountFigure(type); }
  const name = type === "crew" ? "About" : d.name;
  $("#crumb").classList.add("on"); $("#here").textContent = `/ ${name}`;
  setTimeout(() => v.querySelector(".v-title")?.focus({ preventScroll: true }), 80);
  document.title = `${name} · Priyansh Jain`;
}
function closeViews() {
  Object.values(views).forEach((v) => v.classList.remove("on"));
  $$(".figwrap").forEach((f) => f.classList.remove("on"));
  for (const k2 of Object.keys(figHandles)) { const h = figHandles[k2]; setTimeout(() => { if (current !== k2) { h?.destroy(); if (figHandles[k2] === h) delete figHandles[k2]; } }, 900); }
  $("#crumb").classList.remove("on");
  document.title = "Priyansh Jain · Product & Space";
}

/* ============================ travel ============================ */
let mode = "intro", current = null, hoverId = null, hubAlpha = 0, viewVis = 0, arrivedAt = 0;
function arrive(id) {
  flight = null; mode = "view"; current = id; arrivedAt = clock;
  camTau = 0.62; goal = viewFraming(D[id]);
  setTimeout(() => { if (current === id && mode === "view") openView(id); }, RM ? 0 : 380);
}
function travel(id, sub) {
  const d = D[id];
  if (sub !== undefined && d.type === "galaxy") state.sel.galaxy[d.gi] = sub;
  if (mode === "view" && current === id) { if (d.type === "galaxy") renderGalaxy(d.gi); return; }
  closeViews(); document.body.classList.remove("in-hub"); vel.x = vel.y = 0;
  const from = [rocket.x, rocket.y];
  const a = d.type === "crew" ? Math.atan2(from[1] / 0.4, from[0]) : Math.atan2((from[1] - d.y) / 0.55, from[0] - d.x);
  const to = parkPos(id, a);
  rocket.park = { id, a }; current = id;
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (RM || dist < 4) { rocket.x = to[0]; rocket.y = to[1]; arrive(id); return; }
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], nx = -(to[1] - from[1]) / dist, ny = (to[0] - from[0]) / dist;
  flight = { from, to, ctrl: [mid[0] + nx * dist * 0.2, mid[1] + ny * dist * 0.2], t: 0, dur: clamp(1.0 + dist / 1400, 1.1, 2.4), id, startS: cam.s };
  mode = "travel"; camTau = 0.42;
}
function explore(at) {
  closeViews(); current = null; flight = null; mode = "explore";
  camTau = 0.75; goal = at || { x: cam.x, y: cam.y, s: exploreS }; vel.x = vel.y = 0;
  document.body.classList.add("in-hub");
}
function flyHome() {
  if (mode !== "explore") { go("#/"); setTimeout(() => mode === "explore" && flyHome(), 30); return; }
  camTau = 0.9; goal = homeFraming(); vel.x = vel.y = 0;
  if (rocket.park.id !== "crew") {
    const from = [rocket.x, rocket.y], to = parkPos("crew", 0.6); rocket.park = { id: "crew", a: 0.6 };
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]), mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    flight = { from, to, ctrl: [mid[0] - (to[1] - from[1]) * 0.2, mid[1] + (to[0] - from[0]) * 0.2], t: 0, dur: clamp(1.0 + dist / 1400, 1.1, 2.4), id: null };
  }
}
function centerOn(d) { if (mode !== "explore") return; const f = exploreAt(d); camTau = 0.9; goal = { ...goal, x: f.x, y: f.y }; vel.x = vel.y = 0; }

/* ============================ routing ============================ */
const routeOf = (id) => (D[id].type === "galaxy" ? `#/galaxy/${id}` : id === "crew" ? "#/about" : `#/${id}`);
function parse(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return { hub: true };
  if (parts[0] === "galaxy" && D[parts[1]] && D[parts[1]].type === "galaxy") return { id: parts[1], sub: parts[2] ? clamp(+parts[2] - 1, 0, GALAXIES[D[parts[1]].gi].projects.length - 1) : undefined };
  if (parts[0] === "about" || parts[0] === "crew") return { id: "crew" };
  if (D[parts[0]] && D[parts[0]].type !== "galaxy") return { id: parts[0] };
  return { hub: true };
}
let quietHash = false;
function setHash(h) { quietHash = true; history.replaceState(null, "", h); quietHash = false; }
function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
function route() {
  if (quietHash || mode === "intro" || mode === "warp") return;
  const r = parse(location.hash);
  if (r.hub) { const was = current ? D[current] : null; explore(was ? exploreAt(was) : null); }
  else travel(r.id, r.sub);
}
addEventListener("hashchange", route);

/* ============================ intro + warp ============================ */
function enter() { if (mode !== "intro") return; $("#intro").classList.add("gone"); if (RM) { finishWarp(); return; } mode = "warp"; warp = { t: 0 }; }
function finishWarp() {
  warp = null; mode = "explore"; hubAlpha = Math.max(hubAlpha, 0.6); document.body.classList.add("in-hub");
  const r = parse(location.hash);
  if (!r.hub) travel(r.id, r.sub);
}
$("#enter").addEventListener("click", enter);

/* ============================ input: drag to pan, wheel / pinch to zoom ============================ */
const pointer = { x: -1, y: -1, sx: 0, sy: 0, tx: 0, ty: 0 };
const ptrs = new Map();
let drag = null, dragMoved = false, pinch = null;
const pannable = (t) => t === cv || !!t.closest?.("#station") || (!!t.closest?.("#homeov") && !t.closest("a")) || !!t.closest?.("#labels:not(button)");
function hitDest(x, y) {
  let best = null, bd = Infinity;
  for (const d of DESTS) { if (d.type === "crew") continue; const [sx, sy] = toScreen(d.x, d.y); const dd = Math.hypot(sx - x, sy - y); const lim = Math.max(d.r * cam.s * 0.9, 44); if (dd < lim && dd < bd) { bd = dd; best = d.id; } }
  return best;
}
function zoomAt(sx, sy, f) {
  const ns = clamp(goal.s * f, exploreS * 0.42, exploreS * 2.2);
  const wx = (sx - W / 2) / goal.s + goal.x, wy = (sy - H / 2) / goal.s + goal.y;
  goal = { x: wx - (sx - W / 2) / ns, y: wy - (sy - H / 2) / ns, s: ns }; camTau = 0.22;
}
addEventListener("pointerdown", (e) => {
  if (mode !== "explore" || !pannable(e.target)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: goal.s }; drag = null; return; }
  drag = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY }; dragMoved = false; stationEl._dragged = false;
  vel.x = vel.y = 0;
});
addEventListener("pointermove", (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.tx = e.clientX / W - 0.5; pointer.ty = e.clientY / H - 0.5;
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const dd = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.s * (dd / pinch.d)) / goal.s); return; }
  if (drag) {
    const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly, now = performance.now(), dtm = Math.max(1, now - drag.t) / 1000;
    if (!dragMoved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5) { dragMoved = true; stationEl._dragged = true; document.body.classList.add("dragging"); }
    if (dragMoved) {
      goal.x -= dx / cam.s; goal.y -= dy / cam.s; camTau = 0.09;
      const vmax = 1600 / cam.s;
      vel.x = clamp(lerp(vel.x, -dx / cam.s / dtm, 0.35), -vmax, vmax); vel.y = clamp(lerp(vel.y, -dy / cam.s / dtm, 0.35), -vmax, vmax);
    }
    drag.lx = e.clientX; drag.ly = e.clientY; drag.t = now;
    return;
  }
  if (mode === "explore" && e.target === cv) { const h = hitDest(e.clientX, e.clientY); hoverId = h; cv.style.cursor = h ? "pointer" : "grab"; }
  else if (mode === "view" && e.target === cv) cv.style.cursor = nearestSub(e.clientX, e.clientY) ? "pointer" : "default";
});
const endPtr = (e) => {
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (!drag) return;
  document.body.classList.remove("dragging");
  if (!dragMoved && e.type === "pointerup" && e.target === cv) { const h = hitDest(e.clientX, e.clientY); if (h) go(routeOf(h)); }
  else if (dragMoved && performance.now() - drag.t > 90) { vel.x = vel.y = 0; }
  drag = null; setTimeout(() => { dragMoved = false; stationEl._dragged = false; }, 0);
};
addEventListener("pointerup", endPtr); addEventListener("pointercancel", endPtr);
addEventListener("wheel", (e) => {
  if (mode !== "explore" || !pannable(e.target)) return;
  e.preventDefault();
  if (e.ctrlKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
  else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.6 && Math.abs(e.deltaX) > 2) { goal = { ...goal, x: goal.x + e.deltaX / cam.s, y: goal.y + e.deltaY / cam.s }; camTau = 0.12; }
  else zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016));
}, { passive: false });
cv.addEventListener("click", (e) => {
  if (mode === "intro") { enter(); return; }
  if (mode === "view") { const s = nearestSub(e.clientX, e.clientY); s?.act(); }
});
function nearestSub(x, y) { let best = null, bd = Infinity; for (const s of subs) { if (!s.act || s.head || s.pin) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < Math.max(s.r || 12, 16) && d < bd) { bd = d; best = s; } } return best; }
const keysDown = new Set();
addEventListener("keydown", (e) => {
  if (menuOpen) { if (e.key === "Escape") toggleMenu(false); return; }
  if (mode === "intro" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); return; }
  if (e.key === "Escape" && (mode === "view" || mode === "travel")) { e.preventDefault(); go("#/"); return; }
  if (mode === "explore") {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d"].includes(e.key) && !e.target.closest?.("input,textarea")) { keysDown.add(e.key); e.preventDefault(); }
    if (e.key === "+" || e.key === "=") zoomAt(W / 2, H / 2, 1.2);
    if (e.key === "-" || e.key === "_") zoomAt(W / 2, H / 2, 1 / 1.2);
    if (e.key === "h" || e.key === "H") flyHome();
    return;
  }
  if (mode !== "view" || e.target.closest?.(".iso-stage")) return;
  const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
  if (!dir) return;
  const d = D[current];
  if (d.type === "galaxy") { const n = GALAXIES[d.gi].projects.length; selectProject(d.gi, (state.sel.galaxy[d.gi] + dir + n) % n); }
  else if (d.type === "log") selectRole((state.sel.log + dir + EXPERIENCE.length) % EXPERIENCE.length);
  else if (d.type === "mission") figHandles.mission?.go(figHandles.mission.station + dir);
  else if (d.type === "skills") selectGroup(((state.sel.skills < 0 ? (dir > 0 ? -1 : 0) : state.sel.skills) + dir + SKILLS.length) % SKILLS.length);
  else return;
  e.preventDefault();
});
addEventListener("keyup", (e) => keysDown.delete(e.key));
addEventListener("blur", () => keysDown.clear());
$("#home").addEventListener("click", () => (mode === "intro" ? enter() : flyHome()));
$("#back").addEventListener("click", () => go("#/"));
$$("[data-nav]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); go(a.getAttribute("href")); }));

// menu
let menuOpen = false;
const menu = $("#menu");
$("#menuList").innerHTML = `
  <h2>Galaxies · Projects</h2>${DESTS.filter((d) => d.type === "galaxy").map((d) => `<button type="button" data-dest="${d.id}" style="--c:${d.color}"><i></i>${esc(d.name)}</button>`).join("")}
  <h2>Destinations</h2>${["mission", "log", "skills", "comms", "crew"].map((id) => `<button type="button" data-dest="${id}" style="--c:${D[id].color}"><i></i>${esc(id === "crew" ? "About me" : D[id].name)} <span style="color:var(--dim);font:400 11px var(--mono);margin-left:auto">${esc(id === "crew" ? "Crew module" : D[id].kicker)}</span></button>`).join("")}
  <h2>Elsewhere</h2><button type="button" data-dest="hub" style="--c:#e9edf7"><i></i>Home station</button><button type="button" id="replay" style="--c:#e9edf7"><i></i>Replay the intro</button>
  <a href="classic.html" style="--c:#e9edf7"><i></i>Classic view (one page)</a><a href="assets/Priyansh_Jain_Resume.pdf" target="_blank" rel="noopener" style="--c:#e9edf7"><i></i>Resume (PDF) ↗</a>`;
function toggleMenu(open) {
  menuOpen = open; menu.classList.toggle("open", open); $("#menuScrim").classList.toggle("open", open); menu.inert = !open;
  $("#menuBtn").setAttribute("aria-expanded", String(open));
  if (open) setTimeout(() => $("#menuList button")?.focus({ preventScroll: true }), 60); else $("#menuBtn").focus({ preventScroll: true });
}
$("#menuBtn").addEventListener("click", () => toggleMenu(!menuOpen));
$("#menuClose").addEventListener("click", () => toggleMenu(false));
$("#menuScrim").addEventListener("click", () => toggleMenu(false));
$$("#menuList [data-dest]").forEach((b) => b.addEventListener("click", () => {
  toggleMenu(false);
  if (mode === "intro") { $("#intro").classList.add("gone"); finishWarp(); }
  const id = b.dataset.dest;
  if (id === "hub") flyHome(); else go(routeOf(id));
}));
$("#replay").addEventListener("click", () => { toggleMenu(false); closeViews(); current = null; flight = null; mode = "intro"; hubAlpha = 0; document.body.classList.remove("in-hub"); history.replaceState(null, "", "#/"); $("#intro").classList.remove("gone"); goal = homeFraming(); });
$("#tickerRun").innerHTML = [...TICKER, ...TICKER].map((t) => `<span>${esc(t)}</span>`).join("");

/* ============================ layout ============================ */
function layout() {
  W = innerWidth; H = innerHeight;
  DPR = Math.min(devicePixelRatio || 1, W * H > 1600000 ? 1.5 : 1.75);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const wasTall = tall; tall = W < 760 || W / H < 0.8;
  exploreS = tall ? Math.min((W * 0.94) / STATION_W, (H * 0.5) / STATION_H) : Math.min((W * 0.6) / STATION_W, (H - 140 - 230) / STATION_H);
  if (wasTall !== tall || !introGalaxy) buildGalaxies();
  buildSky();
  if (mode === "view" && current) goal = viewFraming(D[current]);
  else if (mode === "explore") goal = { ...goal, s: clamp(goal.s, exploreS * 0.42, exploreS * 2.2) };
  else goal = homeFraming();
  if (mode !== "travel") { Object.assign(cam, goal); camV.x = camV.y = camV.l = 0; }
  if (!flight) [rocket.x, rocket.y] = parkPos(rocket.park.id, rocket.park.a);
}
let resizeT = 0;
addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 160); });

/* ============================ loop ============================ */
let clock = 0, last = 0;
const homeEl = $("#homeov");
function frame(now) {
  const dt = (last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60) * (globalThis.__spaceSpeed || 1); last = now; clock += dt;
  const t = RM ? 0 : clock;
  pointer.sx = follow(pointer.sx, pointer.tx, dt, 0.8); pointer.sy = follow(pointer.sy, pointer.ty, dt, 0.8);

  // explore: momentum, keyboard flight, soft edge of the world
  if (mode === "explore") {
    if (!drag && !RM && Math.abs(vel.x) + Math.abs(vel.y) > 2) { goal = { ...goal, x: goal.x + vel.x * dt, y: goal.y + vel.y * dt }; const f = Math.exp(-dt / 0.35); vel.x *= f; vel.y *= f; camTau = 0.1; }
    let kx = 0, ky = 0;
    if (keysDown.has("ArrowLeft") || keysDown.has("a")) kx -= 1; if (keysDown.has("ArrowRight") || keysDown.has("d")) kx += 1;
    if (keysDown.has("ArrowUp") || keysDown.has("w")) ky -= 1; if (keysDown.has("ArrowDown") || keysDown.has("s")) ky += 1;
    if (kx || ky) { goal = { ...goal, x: goal.x + (kx * 760 * dt) / cam.s, y: goal.y + (ky * 760 * dt) / cam.s }; camTau = 0.18; }
    const r0 = Math.hypot(goal.x, goal.y); if (r0 > WORLD) { const m = WORLD / r0; goal = { ...goal, x: goal.x * m, y: goal.y * m }; vel.x *= 0.5; vel.y *= 0.5; }
  }
  // rocket
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / flight.dur);
    const e = easeInOut(flight.t), u = 1 - e;
    const px = u * u * flight.from[0] + 2 * u * e * flight.ctrl[0] + e * e * flight.to[0];
    const py = u * u * flight.from[1] + 2 * u * e * flight.ctrl[1] + e * e * flight.to[1];
    const dx = px - rocket.x, dy = py - rocket.y;
    if (Math.hypot(dx, dy) > 0.01) { const want = Math.atan2(dy, dx); const da = ((want - rocket.ang + Math.PI) % TAU + TAU) % TAU - Math.PI; rocket.ang += da * (1 - Math.exp(-dt / 0.08)); }
    rocket.x = px; rocket.y = py; rocket.thrust = Math.sin(Math.PI * Math.min(1, flight.t * 1.15));
    if (flight.id) {
      const d = D[flight.id], vf = viewFraming(d);
      const span = Math.hypot(d.x - px, d.y - py) + d.r * 1.3;
      const fit = (Math.min(W, H) * 0.5) / span;
      const s = Math.min(vf.s, Math.max(exploreS * 0.4, Math.min(fit, lerp(flight.startS, vf.s, e * e))));
      goal = { x: lerp(px, vf.x, 0.2 + 0.8 * e * e), y: lerp(py, vf.y, 0.2 + 0.8 * e * e), s };
      if (flight.t >= 1) arrive(flight.id);
    } else if (flight.t >= 1) flight = null;
  } else {
    const p = rocket.park; p.a += dt * (p.id === "crew" ? 0.12 : 0.16);
    const [px, py] = parkPos(p.id, p.a);
    const want = Math.atan2(py - rocket.y, px - rocket.x);
    if (Math.hypot(px - rocket.x, py - rocket.y) > 0.001) { const da = ((want - rocket.ang + Math.PI) % TAU + TAU) % TAU - Math.PI; rocket.ang += da * (1 - Math.exp(-dt / 0.3)); }
    rocket.x = follow(rocket.x, px, dt, 0.25); rocket.y = follow(rocket.y, py, dt, 0.25);
    rocket.thrust = follow(rocket.thrust, 0.18, dt, 0.3);
  }
  // warp clock
  let wt = 0;
  if (warp) {
    warp.t += dt; wt = warp.t;
    $("#flash").style.opacity = (Math.max(0, Math.sin(clamp((wt - 1.45) / 0.55, 0, 1) * Math.PI)) * 0.85).toFixed(3);
    if (wt > 1.75 && !warp.hubSet) { warp.hubSet = true; const h = homeFraming(); Object.assign(cam, { x: h.x, y: h.y, s: h.s * 2.8 }); camV.x = camV.y = camV.l = 0; goal = h; camTau = 0.6; }
    if (wt >= WARP_T) { $("#flash").style.opacity = "0"; finishWarp(); }
  }
  camStep(dt);

  // envelopes
  hubAlpha = follow(hubAlpha, mode === "intro" ? 0 : warp ? smooth(1.75, 2.7, wt) : 1, dt, 0.25);
  viewVis = follow(viewVis, mode === "view" && clock - arrivedAt > 0.25 ? 1 : 0, dt, 0.3);
  const exploring = mode === "explore" ? 1 : 0;
  for (const d of DESTS) d.hover = follow(d.hover, hoverId === d.id && exploring ? 1 : 0, dt, 0.15);

  // ---- canvas ----
  ctx.clearRect(0, 0, W, H);
  drawSky(t);
  if (mode === "intro" || warp) {
    const k = Math.max(W, H) * (tall ? 0.62 : 0.48) * (1 + (warp ? Math.pow(smooth(0, 1.4, wt), 2) * 5 : 0));
    const a = warp ? 1 - smooth(0.4, 1.3, wt) : 1;
    introGalaxy.draw(W / 2 + (mode === "intro" ? pointer.sx * 18 : 0), H * (tall ? 0.5 : 0.53) + pointer.sy * 12, k, a, t + 40, { psize: tall ? 1.05 : 1.1, haze: 0.55 });
  }
  subs = [];
  if (hubAlpha > 0.003) {
    for (const d of DESTS) {
      if (d.type === "crew") continue;
      const f = current === d.id ? viewVis : 0;
      const figView = (d.type === "mission" || d.type === "comms") && current === d.id ? 1 - viewVis * 0.85 : 1;
      const a = hubAlpha * (current && current !== d.id && mode === "view" ? 0.5 : 1) * figView;
      const pins = exploring * hubAlpha * smooth(110, 190, d.r * cam.s) * (d.type === "galaxy" || d.type === "log" || d.type === "skills" ? 1 : 0);
      if (d.type === "galaxy") drawGalaxyDest(d, t, a, f, pins);
      else if (d.type === "mission") drawSatelliteDest(d, t, a);
      else if (d.type === "log") drawLogDest(d, t, a, f, pins);
      else if (d.type === "skills") drawSkillsDest(d, t, a, f, pins);
      else if (d.type === "comms") drawCommsDest(d, t, a);
    }
    if (!RM && rocket.thrust > 0.3) for (let i = 0; i < 2; i++) exhaust.push({ x: rocket.x - (Math.cos(rocket.ang) * 14) / cam.s, y: rocket.y - (Math.sin(rocket.ang) * 14) / cam.s, vx: -Math.cos(rocket.ang) * 40 + (Math.random() - 0.5) * 20, vy: -Math.sin(rocket.ang) * 40 + (Math.random() - 0.5) * 20, life: 0 });
    ctx.globalCompositeOperation = "lighter";
    exhaust = exhaust.filter((p) => (p.life += dt) < 0.7);
    for (const p of exhaust) { p.x += (p.vx * dt) / cam.s; p.y += (p.vy * dt) / cam.s; const [x, y] = toScreen(p.x, p.y); ctx.fillStyle = `rgba(127,227,255,${(1 - p.life / 0.7) * 0.5 * hubAlpha})`; ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); }
    ctx.globalCompositeOperation = "source-over";
    const [rx, ry] = toScreen(rocket.x, rocket.y);
    const figOpen = current && (D[current].type === "mission" || D[current].type === "comms") ? viewVis : 0;
    ctx.globalAlpha = hubAlpha * (1 - figOpen * 0.9) * (mode === "view" ? 1 - viewVis * 0.55 : 1);
    drawRocket(rx, ry, clamp(30 * Math.sqrt(cam.s / exploreS), 22, 44), rocket.ang, rocket.thrust, clock);
    ctx.globalAlpha = 1;
  }
  if (warp) drawWarp(dt, wt);

  // ---- station overlay: the anatomy figure, placed and scaled with the world ----
  const sc = cam.s * SU, [hx, hy] = toScreen(0, 0), sw = SV.w * sc, sh = SV.h * sc;
  const stVisible = hubAlpha > 0.01 && hx + sw / 2 > -40 && hx - sw / 2 < W + 40 && hy + sh / 2 > -40 && hy - sh / 2 < H + 40;
  stationEl.style.visibility = stVisible ? "visible" : "hidden";
  if (stVisible) {
    stationEl.style.transform = `translate3d(${(hx - sw / 2).toFixed(1)}px,${(hy - sh / 2).toFixed(1)}px,0) scale(${sc.toFixed(4)})`;
    stationEl.style.opacity = (hubAlpha * (mode === "view" && current !== "crew" ? 0.35 : 1)).toFixed(3);
    stationEl.style.pointerEvents = mode === "explore" ? "auto" : "none";
  }
  if (stationHover && mode === "explore") {
    const [ax, ay] = ANCHORS[stationHover];
    modLabel.style.transform = `translate3d(${(hx - sw / 2 + ax * sc).toFixed(1)}px,${(hy - sh / 2 + ay * sc).toFixed(1)}px,0) translate(-50%,-130%)`;
    if (modLabel._m !== stationHover) { modLabel._m = stationHover; modLabel.innerHTML = `<b>${MODULES[stationHover].says}</b><small>${MODULES[stationHover].name}</small>`; }
    modLabel.style.opacity = "1";
  } else modLabel.style.opacity = "0";
  const homeVis = hubAlpha * exploring;
  homeEl.style.transform = `translate3d(${hx.toFixed(1)}px,${(hy + sh * 0.4).toFixed(1)}px,0) translate(-50%,0)`;
  homeEl.style.opacity = homeVis.toFixed(3);
  homeEl.classList.toggle("live", homeVis > 0.6);
  homeEl.style.visibility = homeVis > 0.01 ? "visible" : "hidden";

  // ---- labels + edge beacons ----
  const labelVis = hubAlpha * exploring;
  const m = tall ? 40 : 64, top = 80, bottom = tall ? 58 : 66, placed = [];
  for (const d of DESTS) {
    const [x, y] = toScreen(d.x, d.y);
    if (d.el) {
      const below = d.type === "galaxy" ? d.r * cam.s * 0.8 : d.type === "log" ? d.r * cam.s * 0.5 : d.type === "skills" ? d.r * cam.s * 0.92 : 48 * cam.s;
      const onScreen = x > -100 && x < W + 100 && y > -100 && y < H + 100;
      d._lv = follow(d._lv, onScreen ? labelVis : 0, dt, 0.2);
      d.el.style.transform = `translate3d(${x.toFixed(1)}px,${(y + below + 4).toFixed(1)}px,0) translate(-50%,0)`;
      d.el.style.opacity = d._lv.toFixed(3);
      d.el.style.pointerEvents = d._lv > 0.5 ? "auto" : "none"; d.el.tabIndex = labelVis > 0.5 ? 0 : -1;
      d.el.classList.toggle("hot", d.hover > 0.5);
    }
    const kk = d.type === "crew" ? STATION_W * 0.35 * cam.s : d.r * cam.s * 0.55;
    const inside = x + kk > m && x - kk < W - m && y + kk > top && y - kk < H - bottom;
    d._bv = follow(d._bv, !inside && labelVis > 0.5 ? 1 : 0, dt, 0.25);
    const bc = d.beacon;
    bc.style.opacity = (d._bv * labelVis).toFixed(3);
    bc.style.pointerEvents = d._bv > 0.5 ? "auto" : "none";
    if (d._bv > 0.01) {
      const cx = W / 2, cy = (top + H - bottom) / 2, vx = x - cx, vy = y - cy;
      const s2 = Math.min((W / 2 - 16) / Math.abs(vx || 1e-6), ((H - top - bottom) / 2 - 8) / Math.abs(vy || 1e-6), 1);
      bc.style.setProperty("--a", `${Math.atan2(vy, vx).toFixed(3)}rad`);
      const txt = `${(Math.hypot(d.x - cam.x, d.y - cam.y) / 100).toFixed(1)} ly`;
      if (bc.lastChild.textContent !== txt) { bc.lastChild.textContent = txt; bc._w = 0; }
      const w = bc._w || (bc._w = bc.offsetWidth || 120), h = tall ? 28 : 30;
      placed.push({ bc, w, h, x: clamp(cx + vx * s2, w / 2 + 10, W - w / 2 - 10), y: clamp(cy + vy * s2, top + h / 2, H - bottom - h / 2), dist: Math.hypot(vx, vy) });
    }
  }
  // keep beacons from piling up: nearest first, the rest slide along their edge to the closest free spot
  placed.sort((a, b) => a.dist - b.dist);
  const rr = radar.getBoundingClientRect();
  const done = rr.width ? [{ x: rr.left + rr.width / 2, y: rr.top + rr.height / 2, w: rr.width + 6, h: rr.height + 6 }] : [];
  for (const b of placed) {
    let vertical = b.x - b.w / 2 <= 12 || b.x + b.w / 2 >= W - 12;
    for (let tries = 0; tries < 16; tries++) {
      const hit = done.find((o) => Math.abs(o.x - b.x) < (o.w + b.w) / 2 + 6 && Math.abs(o.y - b.y) < (o.h + b.h) / 2 + 4);
      if (!hit) break;
      const px = b.x, py = b.y;
      if (vertical) b.y = clamp(b.y + (b.y > hit.y || (b.y === hit.y && tries % 2) ? 1 : -1) * ((hit.h + b.h) / 2 + 5 - Math.abs(b.y - hit.y)), top + b.h / 2, H - bottom - b.h / 2);
      else b.x = clamp(b.x + (b.x > hit.x || (b.x === hit.x && tries % 2) ? 1 : -1) * ((hit.w + b.w) / 2 + 7 - Math.abs(b.x - hit.x)), b.w / 2 + 10, W - b.w / 2 - 10);
      if (b.x === px && b.y === py) vertical = !vertical;   // pinned in a corner: slide along the other edge
    }
    done.push(b);
    b.bc._x = b.bc._x === undefined ? b.x : follow(b.bc._x, b.x, dt, 0.12);
    b.bc._y = b.bc._y === undefined ? b.y : follow(b.bc._y, b.y, dt, 0.12);
    b.bc.style.transform = `translate3d(${b.bc._x.toFixed(1)}px,${b.bc._y.toFixed(1)}px,0) translate(-50%,-50%)`;
  }
  syncSubs(viewVis);
  drawRadar(labelVis);
  requestAnimationFrame(frame);
}

/* ============================ start ============================ */
layout();
const start = parse(location.hash);
if (!start.hub) {
  $("#intro").classList.add("gone"); hubAlpha = 1;
  const d = D[start.id];
  if (d.type === "galaxy" && start.sub !== undefined) state.sel.galaxy[d.gi] = start.sub;
  rocket.park = { id: start.id, a: 2.4 }; [rocket.x, rocket.y] = parkPos(start.id, 2.4);
  arrive(start.id); Object.assign(cam, goal);
}
requestAnimationFrame(frame);
document.addEventListener("visibilitychange", () => { last = 0; });
window.__space = { go, D, flyHome, get mode() { return mode; }, cam, get goal() { return goal; }, get clock() { return clock; } };
