// Comms — anatomy figure: a deep-space antenna on an azimuth–elevation mount.
// It slews to the channel you point at (email, LinkedIn, resume) and sends a pulse when you open one.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

const W = 640, H = 470, AZ_CAM = 30, EL_CAM = 28;
const DEG = Math.PI / 180;

const BASE = { x: -46, y: -46, w: 92, d: 92, r: 7 };
const BASE_Z = -12, BASE_H = 9, FOOT_H = 4;
const RING_R = 30, RING_Z = -3, RING_H = 4;              // fixed azimuth ring with degree ticks
const TURRET_R = 26, TURRET_Z = 1, TURRET_H = 6;          // turns with azimuth
const ARM_Y = 31, ARM_T = 3.4, ARM_W = 9, AXIS_Z = 70;     // yoke arms and elevation axis height
const DRUM_R = 8;
const VERTEX = 12, DEPTH = 8, RIM = 26;                   // reflector: vertex 12 out from the axis, 8 deep, 26 radius
const F4 = (RIM * RIM) / DEPTH;                           // paraboloid r = sqrt(F4 · (s − VERTEX))
const FOCUS = VERTEX + F4 / 4;
const dishR = (s) => Math.sqrt(F4 * Math.max(0, s - VERTEX));
const CAB = { x: 18, y: -40, w: 18, d: 13, r: 1.6 };      // electronics cabinet on the base

const P = k.fitProjection(
  [...k.boxCorners(BASE, BASE_Z - FOOT_H, 0), [0, 0, AXIS_Z + 60], [40, 30, AXIS_Z + 40], [-30, -30, AXIS_Z + 40], [0, 36, AXIS_Z + 20], [0, -36, AXIS_Z + 20]],
  W, H, { pad: 26, azimuth: AZ_CAM, elevation: EL_CAM },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const depth = (p) => G.dot3(p, V);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, BASE_Z - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 14))) {
    out.push(S(k.cylinder(x, y, 6, BASE_Z - FOOT_H, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, BASE_Z - FOOT_H + 1.4, FOOT_H - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, BASE_Z, BASE_H, P, 8, 1.4), { tone: "mid" }));
  const top = BASE_Z + BASE_H;
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), top, P), { tone: "lo" }));
  const screws = k.corners(BASE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, top, P, 14)).join(""), { tone: "lo" }), D(screws.map(([x, y]) => at([x, y, top])), { size: 0.5 }));
  // label plate with three rule lines (they stand for printed text)
  const plate = { x: -38, y: 24, w: 22, d: 12, r: 1.2 };
  out.push(S(k.slabOf(plate, top, 0.8, P, 3), { tone: "lo", crease: "none" }), L(k.planOutline(k.insetPlan(plate, 1.4), top + 0.8, P, 3), { tone: "faint" }));
  out.push(L([[-35, 27.5, 16], [-35, 30, 12], [-35, 32.5, 14]].map(([x, y, l]) => k.lineOnTop([x, y], [x + l, y], top + 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([plate.x + 2, plate.y + 2, top + 0.8]), at([plate.x + plate.w - 2, plate.y + plate.d - 2, top + 0.8])], { size: 0.4 }));
  // electronics cabinet with a door seam, hinge dots and a vent grid
  out.push(S(k.slabOf(CAB, top, 16, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(CAB, top + 13, P, 3), { tone: "faint" }) }));
  out.push(L(k.segment([CAB.x + CAB.w, CAB.y + 6.5, top], [CAB.x + CAB.w, CAB.y + 6.5, top + 13], P), { tone: "lo" }));
  out.push(D(k.dotGrid(CAB.x + 4, CAB.y + 3, 5, 3, 2.2, top + 16, P), { size: 0.45, tone: "lo", pulse: true }));
  out.push(D([at([CAB.x + CAB.w, CAB.y + 2, top + 3]), at([CAB.x + CAB.w, CAB.y + 2, top + 10])], { size: 0.45 }));
  return out.join("");
}

function ring() {
  const out = [S(k.cylinder(0, 0, RING_R, RING_Z, RING_H, P, 96, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, RING_R, RING_Z + 1.6, P, 48), { tone: "faint" }) })];
  const ticks = k.radialTicks(0, 0, RING_R - 0.8, 72, 6, RING_Z + RING_H, [1.4, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}

// ---------- the moving head: rebuilt for every (az, el) ----------
const rot = (u, v, c, s) => [u * c - v * s, u * s + v * c];
function head(az, el) {
  const c = Math.cos(az), s = Math.sin(az);
  const local = (u, v, z) => { const [a, b] = rot(u, v, c, s); return [a, b, z]; };
  const fwd = [c, s, 0], side = [-s, c, 0];
  const A = G.unit3([Math.cos(el) * c, Math.cos(el) * s, Math.sin(el)]);   // boresight
  const O = [0, 0, AXIS_Z];
  const rect = (hu, hv, r, ou, ov) => k.ringOf({ x: -hu, y: -hv, w: hu * 2, d: hv * 2, r }, 3).map(([u, v]) => { const [a, b] = rot(u + ou, v + ov, c, s); return [a, b]; });
  const parts = [];
  // turret and pointer
  let turret = S(k.cylinder(0, 0, TURRET_R, TURRET_Z, TURRET_H, P, 88, 0.6), { tone: "mid" });
  turret += L(k.lineOnTop(local(TURRET_R - 7, 0, 0).slice(0, 2), local(TURRET_R + 0.2, 0, 0).slice(0, 2), TURRET_Z + TURRET_H, P), { tone: "lit" });
  turret += D([0, 1, 2, 3, 4, 5].map((i) => { const a = az + (i + 0.5) * Math.PI / 3; return at([18 * Math.cos(a), 18 * Math.sin(a), TURRET_Z + TURRET_H]); }), { size: 0.45 });
  const top = TURRET_Z + TURRET_H;
  // cross beam on the turret
  const beam = S(k.extrude(rect(9, ARM_Y + ARM_T / 2 + 1, 2, 0, 0), top, 6, P, { bevel: 0.5 }), { tone: "mid" });
  // the two arms, each a tall plate, with a bearing cap on its outer face
  const arms = [-1, 1].map((sign) => {
    const yy = sign * ARM_Y;
    let svg = S(k.extrude(rect(ARM_W / 2, ARM_T / 2, 1, 0, yy), top + 6, AXIS_Z + 7 - top - 6, P, { bevel: 0.5 }), { tone: "mid" });
    const cap = G.frameAlong(local(0, yy + sign * ARM_T / 2, AXIS_Z), G.mul3(side, sign));
    svg += S(G.disc(0, 2.6, 6, cap, P), { tone: "mid" }) + S(G.disc(2.6, 3.6, 3.6, cap, P), { tone: "hi" });
    if (G.dot3(G.mul3(side, sign), V) > 0.1) svg += D(G.dotsOf(cap, 2.6, 4.6, 6, P, { all: true }), { size: 0.42 });
    return { c: local(0, yy, (top + AXIS_Z) / 2), svg };
  });
  // elevation drum between the arms
  const drumF = G.frameAlong(local(0, -ARM_Y + ARM_T / 2, AXIS_Z), side);
  const drum = S(G.disc(0, 2 * ARM_Y - ARM_T, DRUM_R, drumF, P), { tone: "mid", inner: L(G.arcOf(drumF, ARM_Y - ARM_T / 2, DRUM_R, P), { tone: "faint" }) });
  // counterweight on a short arm behind the drum
  const back = G.frameAlong(O, G.mul3(A, -1));
  const cw = S(G.prismOf(back, [[-5, -9], [5, -9], [5, 9], [-5, 9]], DRUM_R - 0.5, DRUM_R + 9, P), { tone: "mid" })
    + S(G.prismOf(back, [[-8, -15], [8, -15], [8, 15], [-8, 15]], DRUM_R + 9, DRUM_R + 17, P), { tone: "mid" });
  // reflector, seen from inside: neck, lip, bowl, rings, ribs, hub
  const F = G.frameAlong(O, A);
  let dish = S(G.disc(DRUM_R - 0.6, VERTEX + 0.4, 4.2, F, P), { tone: "mid" });
  dish += S(G.ringBand(VERTEX + DEPTH - 0.7, VERTEX + DEPTH + 0.5, RIM - 0.3, RIM + 1.2, F, P), { tone: "hi" });
  dish += `<path class="iso-shade" data-shade="1" d="${G.circleOf(F, VERTEX + DEPTH - 0.7, dishR(VERTEX + DEPTH - 0.7), P, 120)}"/>`;
  dish += L([2.5, 5, 7].map((d) => G.circleOf(F, VERTEX + d, dishR(VERTEX + d), P, 96)).join(""), { tone: "faint" });
  dish += L(Array.from({ length: 16 }, (_, i) => k.pathOf(Array.from({ length: 10 }, (_, j) => { const ss = VERTEX + 0.9 + (j / 9) * (DEPTH - 1.6); return at(G.pointOf(F, ss, dishR(ss), (i / 16) * Math.PI * 2)); }))).join(""), { tone: "faint" });
  dish += L(G.circleOf(F, VERTEX + DEPTH - 0.7, dishR(VERTEX + DEPTH - 0.7), P, 120), { tone: "mid" });
  dish += S(G.disc(VERTEX, VERTEX + 1.2, 4.6, F, P), { tone: "mid" });
  // quadripod to the feed at the focus
  const legs = [0, 1, 2, 3].map((i) => k.segment(G.pointOf(F, VERTEX + DEPTH, RIM - 0.2, i * Math.PI / 2 + Math.PI / 4), G.pointOf(F, FOCUS - 2.4, 2.2, i * Math.PI / 2 + Math.PI / 4), P)).join("");
  dish += L(legs, { tone: "mid" });
  const feed = G.frameAlong(G.pointOf(F, FOCUS + 2, 0, 0), G.mul3(A, -1));
  dish += S(G.solidOf([[0, 1.4], [1.2, 1.4], [1.2, 3.2], [5.4, 2.2]], feed, P), { tone: "hi", lit: true });
  // order: far arm, counterweight, drum, reflector, near arm (by the arms' depth)
  const [far, near] = depth(arms[0].c) < depth(arms[1].c) ? [arms[0], arms[1]] : [arms[1], arms[0]];
  const svg = turret + beam + far.svg + cw + drum + dish + near.svg;
  return { svg, F, A, feedTip: G.pointOf(F, FOCUS - 3.4, 0, 0) };
}

const CSS = `
.cm .iso-plate{background:transparent;box-shadow:none;padding:28px 6px 38px}
.cm .cm-wave{fill:none;stroke:var(--anatomy-lit);stroke-width:.9;vector-effect:non-scaling-stroke}
.cm-stage{outline:none;cursor:pointer;touch-action:manipulation}
.cm-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
`;

export function mount(root, { channels = [], onReadout } = {}) {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const label = "A deep-space antenna on an azimuth and elevation mount: a base plate on feet with an electronics cabinet, a ring with degree ticks, a turret, two yoke arms, an elevation drum with a counterweight, and a dish with its feed held on four legs. It turns to point at the channel you choose and sends a pulse when you open one.";
  const style = document.createElement("style"); style.textContent = CSS;
  root.classList.add("cm");
  const svg = k.figureSvg({ width: W, height: H, label, body: [base(), ring(), `<g class="cm-head"></g><g class="cm-waves"></g>`] });
  root.innerHTML = k.plateHtml({ fig: "Fig 2", title: "Comms · deep-space antenna", hint: "Hover a channel to aim", readout: "", body: `<div class="iso-stage cm-stage" tabindex="0" role="group" aria-label="Comms antenna figure. Left and right arrow keys aim at the next channel.">${svg}</div>` });
  root.prepend(style);
  const $ = (q) => root.querySelector(q);
  const stage = $(".cm-stage"), headG = $(".cm-head"), waves = $(".cm-waves"), readout = $("[data-readout]");
  const idleAim = { name: "listening", az: 38, el: 48 };
  let aim = channels[0] ?? idleAim;
  const az = { x: aim.az * DEG, v: 0 }, el = { x: aim.el * DEG, v: 0 };
  let tgt = aim, pulses = [], clock = 0, last = 0, frame = 0, visible = true, touring = !still.matches, idleAt = 0, tourIx = 0;
  const settle = (st, target, dt, sec, calm) => {
    if (calm) { st.x = target; st.v = 0; return false; }
    const w = 1 / sec;
    for (let i = 0; i < 4; i++) { st.v += (w * w * (target - st.x) - 2 * w * st.v) * dt / 4; st.x += st.v * dt / 4; }
    if (Math.abs(target - st.x) < 1e-4 && Math.abs(st.v) < 1e-4) { st.x = target; st.v = 0; return false; }
    return true;
  };
  function draw() {
    const h = head(az.x, el.x);
    headG.innerHTML = h.svg;
    // pulses: rings perpendicular to the boresight leaving the dish and fading
    waves.innerHTML = pulses.map((p) => {
      const age = clock - p.born, s = VERTEX + DEPTH + 4 + age * 70, r = RIM * (0.55 + age * 0.5);
      const a = Math.max(0, 1 - age / 0.9) * Math.min(1, age / 0.08);
      return a > 0.02 ? `<path class="cm-wave" style="opacity:${a.toFixed(2)}" d="${G.circleOf(h.F, s, r, P, 64)}"/>` : "";
    }).join("");
    const text = `az ${Math.round(((az.x / DEG) % 360 + 360) % 360)}° · el ${Math.round(el.x / DEG)}° · ${pulses.length ? "transmitting" : "aimed at"} ${tgt.name.toLowerCase()}`;
    if (readout.textContent !== text) { readout.textContent = text; onReadout?.(text); }
  }
  function tick(now) {
    const dt = (last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60) * (globalThis.__figSpeed || 1);
    last = now; clock += dt;
    const calm = still.matches;
    if (touring && channels.length && clock - idleAt > 3.2) { idleAt = clock; tourIx = (tourIx + 1) % channels.length; tgt = channels[tourIx]; }
    const m1 = settle(az, tgt.az * DEG, dt, 0.42, calm), m2 = settle(el, tgt.el * DEG, dt, 0.36, calm);
    pulses = pulses.filter((p) => clock - p.born < 0.9);
    draw();
    frame = visible && (m1 || m2 || pulses.length || touring) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  function aimAt(name) { const c = channels.find((x) => x.name === name); if (!c) return; touring = false; tgt = c; run(); }
  function release() { touring = !still.matches; idleAt = clock; run(); }
  function transmit(name) { aimAt(name); if (still.matches) return; for (let i = 0; i < 3; i++) pulses.push({ born: clock + i * 0.18 }); run(); }
  stage.addEventListener("click", () => { const i = (channels.indexOf(tgt) + 1) % channels.length; aimAt(channels[i].name); transmit(channels[i].name); });
  stage.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault(); e.stopPropagation();
    const i = (channels.indexOf(tgt) + (e.key === "ArrowRight" ? 1 : -1) + channels.length) % channels.length;
    aimAt(channels[i].name);
  });
  const io = new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" });
  io.observe(stage);
  draw(); run();
  return { aim: aimAt, release, transmit, destroy() { io.disconnect(); cancelAnimationFrame(frame); frame = 0; visible = false; } };
}
