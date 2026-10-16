// Mission 001 — anatomy figure: a free-flying inspector working its way around a satellite.
// Built in the browser with the anatomy kit (assets/kit). mount(root) draws it and runs it.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

const W = 760, H = 480, AZ = 30, EL = 28;
const DEG = Math.PI / 180;

// ---------- world (units ≈ 1 px, z up) ----------
const BUS = { x: -28, y: -28, w: 56, d: 56, r: 2.5 };
const BUS_TOP = 64;
const DECK = { x: -30, y: -30, w: 60, d: 60, r: 3 };
const WING_Z = 39.2, WING_H = 1.6, PANEL = { w: 44, d: 42 }, GAP = 3;
const panelsOf = (sign) => [0, 1, 2].map((j) => {
  const near = 54 + j * (PANEL.d + GAP);
  return { x: -22, y: sign > 0 ? near : -near - PANEL.d, w: PANEL.w, d: PANEL.d, r: 1 };
});
const DISH_O = [12, -6, 98];
const DISH_A = G.unit3([0.42, 0.12, 0.9]);        // reflector faces up and a little toward the viewer
const DISH_F = G.frameAlong(DISH_O, DISH_A);
const FOCAL4 = 40.5;                      // paraboloid r = sqrt(4 f s), rim r 18 at s 8
const dishR = (s) => Math.sqrt(FOCAL4 * Math.max(s, 0.15));
const dishSlope = (s) => FOCAL4 / (2 * dishR(s));

const STATIONS = [
  { name: "MLI blanket", where: "+x face", at: [76, -46, 40], target: [28, 18, 30], face: "x", finding: "seam lifted · flagged", flag: true },
  { name: "RCS thruster pod", where: "near corner", at: [66, 62, -20], target: [33.2, 31.5, -6.5], face: "top", finding: "nozzles clear" },
  { name: "Solar array", where: "+y wing, panel 2", at: [30, 104, 64], target: [0, 99, WING_Z + WING_H], face: "top", finding: "cells nominal" },
  { name: "High-gain antenna", where: "dish back", at: [66, -26, 142], target: null, face: "dish", finding: "reflector nominal" },
  { name: "Solar array", where: "−y wing, hinge 2", at: [32, -104, 66], target: [0, -97.5, WING_Z + WING_H], face: "top", finding: "hinge latched" },
];
// dish target: a point on the reflector's inner surface, on the robot's side
{
  const s = 4.4, toward = G.sub3(STATIONS[3].at, DISH_O);
  STATIONS[3].target = G.pointOf(DISH_F, s, dishR(s) - 0.05, G.angleToward(DISH_F, toward) + 0.5);
}

const P = k.fitProjection(
  [[-22, 182, 41], [22, 182, 41], [-22, -182, 41], [22, -182, 41], [0, 0, -38], [30, 30, -12], [-30, -30, 67],
   [76, -46, 49], [66, 62, -29], [66, -26, 151], [30, 4, 116], [32, -104, 75], [30, 104, 73]],
  W, H, { pad: 18, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const depth = (p) => G.dot3(p, V);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);

// ---------- static satellite ----------
function wing(sign) {
  const out = [];
  const sada = G.frameAlong([0, 28 * sign, 40], [0, sign, 0]);
  const parts = [];
  parts.push({ c: [0, 30 * sign, 40], svg: S(G.disc(0, 4, 5.6, sada, P), { tone: "mid" }) });
  const boom = { x: -2, y: sign > 0 ? 32 : -52, w: 4, d: 20, r: 1 };
  parts.push({ c: [0, 42 * sign, 40], svg: S(k.slabOf(boom, 38.4, 3.2, P, 3, 0.4), { tone: "mid" }) + D([at([0, (sign > 0 ? 36 : -36), 41.6]), at([0, (sign > 0 ? 48 : -48), 41.6])], { size: 0.4 }) });
  panelsOf(sign).forEach((plan, j) => {
    const top = WING_Z + WING_H;
    const grid = [];
    for (let i = 1; i < 6; i++) grid.push(k.lineOnTop([plan.x, plan.y + (plan.d * i) / 6], [plan.x + plan.w, plan.y + (plan.d * i) / 6], top, P));
    for (let i = 1; i < 4; i++) grid.push(k.lineOnTop([plan.x + (plan.w * i) / 4, plan.y], [plan.x + (plan.w * i) / 4, plan.y + plan.d], top, P));
    const svg = S(k.slabOf(plan, WING_Z, WING_H, P, 3, 0.4), { tone: "mid", crease: "lo" })
      + L(grid.join(""), { tone: "faint" })
      + L(k.planOutline(k.insetPlan(plan, 1.4), top, P, 3), { tone: "lo" })
      + D(k.corners(plan, 2.2).map(([x, y]) => at([x, y, top])), { size: 0.4 });
    parts.push({ c: [0, plan.y + plan.d / 2, 40], svg, panel: true });
    // hinge pair on the inboard edge of this panel
    const gy = sign > 0 ? plan.y - 1.5 : plan.y + plan.d + 1.5;
    for (const hx of [-14, 14]) {
      const F = G.frameAlong([hx, gy, 40], [1, 0, 0]);
      parts.push({ c: [hx, gy, 40.5], svg: S(G.disc(-3, 3, 1.5, F, P), { tone: "mid" }), hinge: true });
    }
  });
  parts.sort((a, b) => depth(a.c) + (a.hinge ? 2 : 0) - depth(b.c) - (b.hinge ? 2 : 0));
  return parts.map((p) => p.svg).join("");
}

function rcsPod(cx, cy) {
  const sx = Math.sign(cx), sy = Math.sign(cy);
  const plan = { x: cx - 4.5, y: cy - 4.5, w: 9, d: 9, r: 1.4 };
  const items = [{ c: [cx, cy, -6], svg: S(k.slabOf(plan, -9, 6, P, 3, 0.5), { tone: "mid" }) + D([at([cx - 2.5 * sx, cy - 2.5 * sy, -3])], { size: 0.45 }) }];
  for (const axis of [[sx, 0, -0.35], [0, sy, -0.35]]) {
    const a = G.unit3(axis);
    const base = [cx + axis[0] * 4.5, cy + axis[1] * 4.5, -6.5];
    const F = G.frameAlong(base, a);
    const bell = [];
    for (let i = 0; i <= 10; i++) { const s = 0.6 + (i / 10) * 4.4; bell.push([s, 1.1 + 1.5 * Math.pow((s - 0.6) / 4.4, 0.8), 1]); }
    const slope = (s) => 1.5 * 0.8 * Math.pow(Math.max((s - 0.6) / 4.4, 0.02), -0.2) / 4.4;
    items.push({ c: G.add3(base, G.mul3(a, 3)), svg: S(G.disc(0, 0.6, 1.5, F, P), { tone: "mid" }) + S(G.solidOf(bell, F, P, { smooth: { slope } }), { tone: "hi" }) });
  }
  return items;
}

function satellite() {
  const back = [], front = [];
  const far = (c) => depth(c) < depth([0, 0, 30]);
  // far wing, far pods, engine, adapter: everything the bus hides part of
  back.push(wing(-1));
  // engine and launch adapter under the bus
  const ENG = G.frameOf([0, 0, -9], [0, 0, -1], [1, 0, 0], [0, 1, 0]);
  const bellR = (s) => 4.2 + 7.6 * Math.pow(Math.max(s - 5, 0) / 22, 0.78);
  const bellP = []; for (let i = 0; i <= 24; i++) { const s = 5 + (i / 24) * 22; bellP.push([s, bellR(s), 1]); }
  const bellSlope = (s) => 7.6 * 0.78 * Math.pow(Math.max((s - 5) / 22, 0.01), -0.22) / 22;
  back.push(S(G.disc(0, 5, 6.4, ENG, P), { tone: "mid" }));
  back.push(S(G.solidOf(bellP, ENG, P, { smooth: { slope: bellSlope } }), { tone: "hi", inner: L(G.arcOf(ENG, 16, bellR(16), P, { slope: bellSlope(16) }), { tone: "faint" }) }));
  back.push(S(k.cylinder(0, 0, 20, -9, 6, P, 72, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, 20, -6, P, 40), { tone: "faint" }) }));
  back.push(D(Array.from({ length: 13 }, (_, i) => { const a = (Math.atan2(0.5, 0.866)) - Math.PI / 2 + (i + 0.5) / 13 * Math.PI; return at([20 * Math.cos(a), 20 * Math.sin(a), -4.4]); }), { size: 0.42 }));
  const pods = [[26, 26], [26, -26], [-26, 26], [-26, -26]].flatMap(([x, y]) => rcsPod(x, y));
  pods.filter((p) => far(p.c)).sort((a, b) => depth(a.c) - depth(b.c)).forEach((p) => back.push(p.svg));
  // bottom deck and bus body
  back.push(S(k.slabOf(DECK, -3, 3, P, 6, 0.6), { tone: "mid" }));
  const seams = L(k.sideSeam(BUS, 18, P, 6) + k.sideSeam(BUS, 46, P, 6), { tone: "faint" });
  back.push(S(k.slabOf(BUS, 0, BUS_TOP, P, 6, 1), { tone: "mid", inner: seams }));
  // panel joints on the two visible faces, edge to edge
  const joints = [k.segment([28, -9, 0], [28, -9, BUS_TOP], P), k.segment([-6, 28, 0], [-6, 28, BUS_TOP], P), k.segment([12, 28, 0], [12, 28, BUS_TOP], P)];
  back.push(L(joints.join(""), { tone: "lo" }));
  // radiator on +x face with fin lines
  const RAD = { x: 28, y: -24, w: 1.6, d: 11, r: 0.3 };
  const fins = []; for (let y = RAD.y + 1.5; y < RAD.y + RAD.d; y += 1.6) fins.push(k.segment([RAD.x + RAD.w, y, 8], [RAD.x + RAD.w, y, 56], P));
  back.push(S(k.slabOf(RAD, 8, 48, P, 2), { tone: "hi", inner: L(fins.join(""), { tone: "faint" }) }));
  // MLI anomaly patch on +x face (outline turns red once flagged)
  const patch = [[0, 0], [3.4, -1.2], [5.6, 0.8], [4.8, 4.2], [1.6, 5.4], [-1.4, 3.2]].map(([u, v]) => at([28, 15 + u, 27 + v]));
  back.push(`<path class="iso-line m1-flag" data-tone="lo" d="${k.pathOf(patch, true)}"/>`);
  // engraved name plate on +y face
  back.push(k.faceTextSvg(k.sideMatrix([14, 28], 8, P, "left"), "M-001", { size: 3.4, tone: "lo" }));
  // top deck
  back.push(S(k.slabOf(DECK, BUS_TOP, 3, P, 6, 0.8), { tone: "mid" }));
  const T = BUS_TOP + 3;
  const screws = k.corners(DECK, 4);
  back.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, T, P, 14)).join(""), { tone: "lo" }) + D(screws.map(([x, y]) => at([x, y, T])), { size: 0.45 }));
  // top equipment, far to near
  const top = [];
  for (const [x, y] of [[-16, -16], [-16, 8]]) {
    top.push({ c: [x, y, T], svg: S(k.cylinder(x, y, 4.4, T, 2.4, P, 28), { tone: "mid" })
      + S(k.cylinder(x, y, 3.4, T + 2.4, 6, P, 28), { tone: "hi", inner: L(k.sideArc(x, y, 3.4, T + 5, P, 16), { tone: "faint" }) })
      + S(k.cylinder(x, y, 4.6, T + 8.4, 5, P, 32, 0.4), { tone: "mid" })
      + L(k.ring(x, y, 3.3, T + 13.4, P, 28), { tone: "lo" }) });
  }
  top.push({ c: [-4, 20, T], svg: S(k.slabOf({ x: -7, y: 18, w: 7, d: 5, r: 1 }, T, 2.4, P, 3, 0.4), { tone: "mid" }) + L(k.ring(-3.5, 20.5, 1.2, T + 2.4, P, 14), { tone: "lo" }) });
  top.push({ c: [20, 20, T], svg: S(k.cylinder(20, 20, 2, T, 2, P, 20), { tone: "mid" }) + S(k.cylinder(20, 20, 0.7, T + 2, 15, P, 12), { tone: "mid", crease: "none" }) + S(G.sphereOf([20, 20, T + 18.4], 1.6, P), { tone: "hi" }) });
  // high-gain antenna: pedestal, mast, gimbal block, neck, dish
  const [hx, hy] = [DISH_O[0], DISH_O[1]];
  let hga = S(k.slabOf({ x: hx - 5, y: hy - 5, w: 10, d: 10, r: 1.5 }, T, 3, P, 3, 0.5), { tone: "mid" });
  hga += S(k.cylinder(hx, hy, 2, T + 3, 22, P, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(hx, hy, 2, T + 14, P, 12), { tone: "faint" }) });
  hga += S(k.slabOf({ x: hx - 3.2, y: hy - 3.2, w: 6.4, d: 6.4, r: 1 }, T + 25, 4, P, 3, 0.4), { tone: "mid" });
  hga += S(G.disc(-2.6, 0.3, 2.2, DISH_F, P), { tone: "mid" });
  // reflector seen from inside: outer lip, the bowl, rings and ribs on its inner surface, hub
  const RIM = 8;
  hga += S(G.ringBand(RIM - 0.6, RIM + 0.4, dishR(RIM) - 0.2, dishR(RIM) + 0.9, DISH_F, P), { tone: "hi" });
  hga += `<path class="iso-shade" data-shade="1" d="${G.circleOf(DISH_F, RIM - 0.6, dishR(RIM - 0.6), P, 96)}"/>`;
  const inner = [2.2, 4.4, 6.4].map((s) => G.circleOf(DISH_F, s, dishR(s), P, 72)).join("");
  const ribs = Array.from({ length: 12 }, (_, i) => {
    const ang = (i / 12) * Math.PI * 2;
    return k.pathOf(Array.from({ length: 9 }, (_, j) => { const s = 0.7 + (j / 8) * (RIM - 1.3); return at(G.pointOf(DISH_F, s, dishR(s), ang)); }));
  }).join("");
  hga += L(inner, { tone: "faint" }) + L(ribs, { tone: "faint" });
  hga += L(G.circleOf(DISH_F, RIM - 0.6, dishR(RIM - 0.6), P, 96), { tone: "mid" });
  hga += S(G.disc(0.2, 0.9, 2.6, DISH_F, P), { tone: "mid" });
  // feed horn at the focus, held by three struts that land on the lip
  const FOCUS = FOCAL4 / 4;
  const feedAt = G.pointOf(DISH_F, FOCUS, 0, 0);
  const struts = [0, 1, 2].map((i) => k.segment(G.pointOf(DISH_F, RIM - 0.2, dishR(RIM - 0.2), i * 2.094 + 0.4), G.pointOf(DISH_F, FOCUS - 0.6, 1.4, i * 2.094 + 0.4), P)).join("");
  hga += L(struts, { tone: "mid" });
  const FEED = G.frameAlong(feedAt, G.mul3(DISH_A, -1));
  hga += S(G.solidOf([[-1.2, 2.2], [0.8, 2.2], [0.8, 1.2], [2.4, 0.9]], FEED, P), { tone: "hi" });
  top.push({ c: [hx, hy, T], svg: hga });
  top.sort((a, b) => depth(a.c) - depth(b.c)).forEach((p) => back.push(p.svg));
  // near pods, then the near wing, which passes in front of everything
  pods.filter((p) => !far(p.c)).sort((a, b) => depth(a.c) - depth(b.c)).forEach((p) => front.push(p.svg));
  front.push(wing(1));
  return back.join("") + front.join("");
}

// ---------- the inspector (rebuilt each frame: it yaws and moves) ----------
const rot = (u, v, c, s) => [u * c - v * s, u * s + v * c];
function rectRing(cx, cy, hu, hv, r, yaw, ou = 0, ov = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return k.ringOf({ x: -hu, y: -hv, w: hu * 2, d: hv * 2, r }, 3).map(([u, v]) => { const [a, b] = rot(u + ou, v + ov, c, s); return [cx + a, cy + b]; });
}
function inspector(pos, yaw, glow) {
  const [x, y, z] = pos;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const local = (u, v, w = 0) => { const [a, b] = rot(u, v, c, s); return [x + a, y + b, z + w]; };
  const fwd = [c, s, 0], side = [-s, c, 0];
  const parts = [];
  parts.push({ c: [x, y, z], svg: S(k.extrude(rectRing(x, y, 8, 8, 2.6, yaw), z - 8, 16, P, { bevel: 0.6 }), { tone: "hi", lit: true }) + D([local(5.6, 5.6, 8), local(-5.6, 5.6, 8), local(5.6, -5.6, 8), local(-5.6, -5.6, 8)].map(at), { size: 0.42 }) });
  for (const sign of [-1, 1]) {
    const ring = rectRing(x, y, 7, 1.8, 0.9, yaw, 0, sign * 9.8);
    const slot = rectRing(x, y, 4.8, 0.5, 0.45, yaw, 0, sign * 9.8);
    const svg = S(k.extrude(ring, z - 7, 14, P, { bevel: 0.4 }), { tone: "mid" }) + L(k.onTop(slot, z + 7, P, true), { tone: "lo" });
    parts.push({ c: local(0, sign * 9.8), svg });
  }
  const camF = G.frameAlong(local(8, 0), fwd);
  parts.push({ c: local(10, 0), svg: S(G.disc(0, 2.4, 3.8, camF, P), { tone: "mid" }) + S(G.disc(2.4, 3.6, 2.8, camF, P), { tone: "hi" }) + (G.dot3(fwd, V) > 0.05 ? L(G.circleOf(camF, 3.6, 1.8, P), { tone: "lit" }) : "") });
  parts.sort((a, b) => depth(a.c) - depth(b.c));
  let svg = parts.map((p) => p.svg).join("");
  // on top: status light and whisker antenna
  svg += S(k.cylinder(...local(-4.4, 4.4).slice(0, 2), 0.5, z + 8, 7, P, 10), { tone: "mid", crease: "none" }) + S(G.sphereOf(local(-4.4, 4.4, 15.9), 1, P), { tone: "hi" });
  svg += `<circle cx="${at(local(3.2, -3.2, 8.1))[0].toFixed(1)}" cy="${at(local(3.2, -3.2, 8.1))[1].toFixed(1)}" r="1.1" class="m1-led" style="opacity:${(0.35 + 0.65 * glow).toFixed(2)}"/>`;
  return { svg, lens: local(11.8, 0), side };
}

// ---------- paths between stations ----------
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function pathBetween(a, b) {
  const mid = G.lerp3(a, b, 0.5);
  const out = G.unit3([mid[0], mid[1], 0]);
  const tv = [Math.cos(AZ * DEG), Math.sin(AZ * DEG), 0];
  const ctrl = G.add3(mid, G.add3(G.mul3(out, 16), G.mul3(tv, 22)));
  ctrl[2] += 6;
  const len = G.len3(G.sub3(b, a)) + 30;
  return { a, b, ctrl, time: Math.min(3.2, 1.3 + len / 95) };
}
const bez = (p, t) => { const u = 1 - t; return [0, 1, 2].map((i) => u * u * p.a[i] + 2 * u * t * p.ctrl[i] + t * t * p.b[i]); };

// ---------- styles that sit on top of the kit's ----------
const CSS = `
.m1 .iso-plate{background:transparent;box-shadow:none;padding:30px 8px 40px}
.m1 .m1-led{fill:var(--m1-led,#7cf2b9)}
.m1 .m1-flag[data-on]{stroke:var(--anatomy-red);stroke-width:1}
.m1 .m1-beam .iso-line{stroke:var(--anatomy-lit);stroke-width:1.2}
.m1 .m1-beam .iso-wire-end{stroke:var(--anatomy-lit)}
.m1 .m1-ret{fill:none;stroke:var(--anatomy-lit);stroke-width:.7;vector-effect:non-scaling-stroke}
.m1 .m1-puff circle{fill:var(--anatomy-hi)}
.m1-stage{outline:none;touch-action:manipulation;cursor:pointer}
.m1-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
`;

export function mount(root, { onReadout } = {}) {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const style = document.createElement("style"); style.textContent = CSS;
  const label = "A satellite with two solar wings, a high-gain dish, star trackers and thruster pods. A small free-flying inspector robot moves between five inspection stations around it and points its camera at the surface it is checking.";
  const svg = k.figureSvg({ width: W, height: H, label, body: [
    `<g class="m1-sat">${satellite()}</g>`,
    `<g class="m1-ret-g"></g><g class="m1-puff"></g><g class="m1-bot"></g><g class="m1-beam"></g>`,
  ] });
  root.classList.add("m1");
  root.innerHTML = k.plateHtml({ fig: "Fig 1", title: "Mission 001 · inspection pass", hint: "Click to move · ← →", readout: "", body: `<div class="iso-stage m1-stage" tabindex="0" role="group" aria-label="Mission 001 figure. Left and right arrow keys move the inspector between stations.">${svg}</div>` });
  root.prepend(style);
  const $ = (q) => root.querySelector(q);
  const stage = $(".m1-stage"), bot = $(".m1-bot"), beam = $(".m1-beam"), ret = $(".m1-ret-g"), puffG = $(".m1-puff"), flag = $(".m1-flag"), readout = $("[data-readout]");

  let station = 0, from = 0, path = null, t = 1, pos = STATIONS[0].at.slice(), yaw = 0, dwell = 0, last = 0, frame = 0, clock = 0;
  let touring = !still.matches, idle = 0, visible = true, flagged = false, glow = 0, puffs = [];
  const yawTo = (p, target) => Math.atan2(target[1] - p[1], target[0] - p[0]);
  yaw = yawTo(pos, STATIONS[0].target);
  const say = (text) => { if (readout.textContent !== text) { readout.textContent = text; onReadout?.(text, station); } };

  function go(i) {
    i = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    if (i === station && t >= 1) return;
    from = station; station = i;
    path = pathBetween(pos.slice(), STATIONS[i].at);
    t = 0; dwell = 0;
    if (!still.matches) for (let n = 0; n < 7; n++) puffs.push({ born: clock + n * 0.03, p: null, v: null, kick: true });
    run();
  }
  function steer(i) { touring = false; idle = clock; go(i); }

  function draw() {
    const st = STATIONS[station];
    const bob = still.matches ? 0 : Math.sin(clock * 1.3) * 0.9;
    const p = [pos[0], pos[1], pos[2] + bob];
    const b = inspector(p, yaw, glow);
    bot.innerHTML = b.svg;
    // beam and reticle while docked
    const docked = t >= 1 ? Math.min(1, dwell / 0.45) : 0;
    if (docked > 0.01) {
      const tip = at(b.lens), tg = at(st.target);
      beam.innerHTML = k.wireSvg(tip, tg, { tone: "lit", dotted: true, flow: true, size: 1 });
      beam.setAttribute("opacity", docked.toFixed(2));
      const r = 3.6 + (still.matches ? 0 : Math.sin(clock * 3) * 0.5);
      const ring = st.face === "x" ? k.sideRing(st.target, r, "x", P, 28)
        : st.face === "dish" ? G.circleOf(G.frameAlong(st.target, G.unit3(G.sub3(st.target, G.pointOf(DISH_F, 3.2, 0, 0)))), 0, r, P, 28)
        : k.ring(st.target[0], st.target[1], r, st.target[2], P, 28);
      ret.innerHTML = `<path class="m1-ret" d="${ring}"/>`;
      ret.setAttribute("opacity", docked.toFixed(2));
    } else { beam.innerHTML = ""; ret.innerHTML = ""; }
    // thruster puffs
    puffG.innerHTML = D(puffs.filter((q) => q.p).map((q) => { const age = clock - q.born; const s = at(q.p); return [s[0], s[1], Math.max(0, 0.9 * (1 - age / 0.9))]; }), { size: 0.9, tone: "hi" });
    // readout
    let text;
    if (t < 1) text = `in transit → ${STATIONS[station].name.toLowerCase()}`;
    else if (dwell < 1.1) text = `station ${station + 1}/5 · ${st.name.toLowerCase()} · scanning`;
    else text = `station ${station + 1}/5 · ${st.name.toLowerCase()} · ${st.finding}`;
    say(text);
    stage.setAttribute("aria-valuetext", `Station ${station + 1} of 5: ${st.name}, ${st.where}`);
  }

  function tick(now) {
    const dt = (last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60) * (globalThis.__figSpeed || 1);
    last = now; clock += dt;
    const calm = still.matches;
    if (t < 1) {
      t = calm ? 1 : Math.min(1, t + dt / path.time);
      const e = ease(t);
      const prev = pos;
      pos = bez(path, e);
      const want = t > 0.82 ? yawTo(pos, STATIONS[station].target) : Math.atan2(pos[1] - prev[1], pos[0] - prev[0]) || yaw;
      let dy = ((want - yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      yaw += dy * (calm ? 1 : 1 - Math.exp(-dt / 0.22));
      if (t >= 1 && !calm) for (let n = 0; n < 6; n++) puffs.push({ born: clock + n * 0.03, p: null, v: null, kick: false });
    } else {
      dwell += dt;
      const want = yawTo(pos, STATIONS[station].target);
      let dy = ((want - yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      yaw += dy * (calm ? 1 : 1 - Math.exp(-dt / 0.25));
      if (STATIONS[station].flag && dwell > 1.1 && !flagged) { flagged = true; flag.setAttribute("data-on", ""); }
      if (touring && dwell > 3.4) go(station + 1);
      if (!touring && clock - idle > 7 && !calm) touring = true;
    }
    glow = 0.5 + 0.5 * Math.sin(clock * 2.4);
    // puffs: born at a vent, drift away from the direction of travel, fade
    const dir = path && t < 1 ? G.unit3(G.sub3(path.b, path.a)) : [0, 0, 0];
    for (const q of puffs) {
      if (!q.p && clock >= q.born) {
        const v = G.add3(G.mul3(dir, q.kick ? -14 : 14), [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8]);
        q.p = G.add3(pos, G.mul3(G.unit3(v), 8)); q.v = v;
      }
      if (q.p) q.p = G.add3(q.p, G.mul3(q.v, dt));
    }
    puffs = puffs.filter((q) => !q.p || clock - q.born < 0.9);
    draw();
    const moving = t < 1 || touring || puffs.length || dwell < 1.6 || !calm;
    frame = visible && moving ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };

  // input
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); steer(station + 1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); steer(station - 1); }
  });
  stage.addEventListener("click", (e) => {
    const box = stage.querySelector("svg").getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W, py = ((e.clientY - box.top) / box.height) * H;
    let best = 0, bd = Infinity;
    STATIONS.forEach((s, i) => { const [sx, sy] = at(s.target); const d = Math.hypot(sx - px, sy - py); if (d < bd) { bd = d; best = i; } });
    steer(best);
  });
  const io = new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" });
  io.observe(stage);
  draw(); run();
  return {
    stations: STATIONS.map((s) => `${s.name} · ${s.where}`),
    go: steer,
    get station() { return station; },
    destroy() { io.disconnect(); cancelAnimationFrame(frame); frame = 0; visible = false; },
  };
}
