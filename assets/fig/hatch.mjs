// Airlock hatch — anatomy figure, the doorway into each part of the station.
// A round hatch in a riveted bulkhead: the gauge bleeds the pressure difference to zero and the lamp lights,
// the handwheel turns and pulls the six dogs off the coaming, then the door swings out on its hinge.
// mount(root, { label }) draws it; play(t) poses it at time t in [0, 1] of one cycle.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const VIEW = { w: 760, h: 620 };
const AZ = 22, EL = 16, DEG = Math.PI / 180;

// world: x out of the bulkhead toward the viewer, y along it, z up. The hatch sits at C.
const PLATE = { x: -8, y: -84, w: 8, d: 168, r: 0.8 }, PLATE_H = 156;
const C = [0, 0, 74], R_OPEN = 31, R_COAM = 43, R_DOOR = 34.5;
const HINGE = [12, 46];                       // vertical hinge axis (x, y)
const DOOR_X = 8, DOOR_T = 6;                 // door back face at x = 8, 6 thick
const GAUGE = [0, -60, 108], LAMP = [0, -60, 82];
const FX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);

const P = k.fitProjection(
  [...k.boxCorners(PLATE, 0, PLATE_H), [74, 66, 74 + R_DOOR], [74, 66, 74 - R_DOOR], [12, 84, 0], [12, -84, 0], [12, -84, PLATE_H]],
  VIEW.w, VIEW.h, { pad: 18, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);
const F0 = FX(C);

// the open doorway in screen units, for the camera push through it
export const DOORWAY = (() => { const c = at(C), e = at([0, R_OPEN, C[2]]), t = at([0, 0, C[2] + R_OPEN]); return { x: c[0], y: c[1], rx: Math.hypot(e[0] - c[0], e[1] - c[1]), ry: Math.hypot(t[0] - c[0], t[1] - c[1]) }; })();

/* ---------------- fixed: bulkhead, coaming, hinge leaves, gauge, lamp, handrail, label ---------------- */
function bulkhead(name) {
  const out = [];
  const face = 0, top = PLATE_H;
  out.push(S(k.slabOf(PLATE, 0, top, P, 2, 1.2), { tone: "lo" }));
  // panel seams run from the kick plate to the stringer, riveted both sides
  const seams = [-58, 58];
  const meet = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], q = [d[0] - c[0], d[1] - c[1]], den = r[0] * q[1] - r[1] * q[0], t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den; return [a[0] + r[0] * t, a[1] + r[1] * t]; };
  out.push(L(seams.map((y) => { const lo = at([face, y, 12]), hi = meet(lo, at([face, y, 140]), at([4.2, -84, 140]), at([4.2, 84, 140])); return `M${lo[0].toFixed(2)} ${lo[1].toFixed(2)}L${hi[0].toFixed(2)} ${hi[1].toFixed(2)}`; }).join(""), { tone: "faint" }));
  const rivets = [];
  for (const y of seams) for (let z = 18; z <= 134; z += 9) rivets.push(at([face, y - 3.2, z]), at([face, y + 3.2, z]));
  out.push(Dt(rivets, { size: 0.42, tone: "lo" }));
  // kick plate with hazard hatching that runs edge to edge
  const kick = { x: 0, y: -84, w: 3.2, d: 168, r: 0.4 };
  const hatch = [];
  for (let y = -80; y < 76; y += 9) hatch.push(k.segment([3.2, y, 0], [3.2, y + 7, 12], P));
  out.push(S(k.slabOf(kick, 0, 12, P, 2, 0.5), { tone: "mid", inner: L(hatch.join(""), { tone: "faint" }) }));
  // stringer along the top with its own rivet row
  const str = { x: 0, y: -84, w: 4.2, d: 168, r: 0.4 };
  out.push(S(k.slabOf(str, 140, 9, P, 2, 0.6), { tone: "mid" }));
  const sr = []; for (let y = -78; y <= 78; y += 12) sr.push(at([4.2, y, 144.5]));
  out.push(Dt(sr, { size: 0.45 }));
  // label plate under the lamp: the destination engraved, two screws
  const lp = { x: 0, y: -74, w: 1.2, d: 28, r: 0.4 };
  out.push(S(k.slabOf(lp, 52, 14, P, 2, 0.3), { tone: "mid", crease: "none" }));
  out.push(k.faceTextSvg(k.sideMatrix([1.2, -60], 57, P, "right"), name, { size: 5.4, tone: "hi", anchor: "middle" }));
  out.push(Dt([at([1.2, -71.5, 63.5]), at([1.2, -48.5, 63.5]), at([1.2, -71.5, 54.5]), at([1.2, -48.5, 54.5])], { size: 0.4 }));
  return out.join("");
}
function coaming() {
  const out = [];
  out.push(S(G.ringBand(0, 7, R_OPEN, R_COAM, F0, P), { tone: "mid", inner: L(G.arcOf(F0, 3.4, R_COAM, P), { tone: "faint" }) }));
  out.push(L(G.circleOf(F0, 7, R_COAM - 3.2, P), { tone: "faint" }));
  out.push(Dt(G.dotsOf(F0, 7, R_COAM - 3.2, 24, P, { all: true, phase: 7.5 * DEG }), { size: 0.5 }));
  return out.join("");
}
function doorway() {
  // the tunnel through the bulkhead, with its frames, ending on the lit module interior
  const id = "hz-clip";
  const rim = G.circleOf(F0, 0.01, R_OPEN, P);
  const far = G.circleOf(F0, -15, R_OPEN, P);
  const ribs = [-5, -10].map((s) => G.circleOf(F0, s, R_OPEN, P)).join("");
  return `<clipPath id="${id}"><path d="${rim}"/></clipPath>
  <g clip-path="url(#${id})"><path class="hz-tunnel" d="${rim}"/><path class="hz-rib" d="${ribs}"/><path class="hz-far" d="${far}"/><path class="hz-glow" d="${far}"/></g>`;
}
function gasket() { return S(G.ringBand(7, 8.2, R_OPEN, R_OPEN + 2.4, F0, P, { hole: [8.2, R_OPEN] }), { tone: "lo", crease: "none", className: "hz-rim" }); }
function hingeLeaves() {
  const out = [];
  for (const z0 of [42, 98]) {
    const leaf = { x: 0, y: HINGE[1] - 4, w: HINGE[0] - 2, d: 9, r: 0.6 };
    out.push(S(k.slabOf(leaf, z0, 12, P, 2, 0.4), { tone: "mid" }));
    out.push(Dt([at([leaf.w * 0.45, HINGE[1] - 1.5, z0 + 12]), at([leaf.w * 0.45, HINGE[1] + 3, z0 + 12])], { size: 0.4 }));
  }
  return out.join("");
}
function knuckles() {
  const out = [];
  for (const [z0, h] of [[42, 12], [98, 12]]) out.push(S(k.cylinder(HINGE[0], HINGE[1], 3.6, z0, h, P, 24, 0.4), { tone: "hi" }));
  // the pin: a cap on the top knuckle and a nut under the bottom one
  out.push(S(k.cylinder(HINGE[0], HINGE[1], 2.2, 110, 1.6, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(HINGE[0], HINGE[1], 2.6, 39.6, 2.4, P, 6), { tone: "mid" }));
  return out.join("");
}
function doorKnuckle() { return S(k.cylinder(HINGE[0], HINGE[1], 3.6, 54.4, 43.2, P, 24, 0.4), { tone: "hi", inner: L(k.sideArc(HINGE[0], HINGE[1], 3.6, 76, P, 14), { tone: "faint" }) }); }
function handrail() {
  const out = [];
  for (const y of [-26, 26]) out.push(S(G.disc(0, 6.4, 2.2, FX([0, y, 124]), P), { tone: "mid" }));
  const F = G.frameOf([8.4, -32, 124], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
  out.push(S(G.solidOf([[0, 0], [0.6, 1.8, 1], [1.6, 2.5, 1], [62.4, 2.5, 1], [63.4, 1.8, 1], [64, 0]], F, P), { tone: "hi" }));
  return out.join("");
}
const G_F = FX(GAUGE), A0 = 225 * DEG, SWEEP = 270 * DEG;
function gauge() {
  const out = [];
  out.push(S(G.disc(0, 5, 11.6, G_F, P), { tone: "mid" }));
  out.push(S(G.ringBand(5, 6.6, 9.4, 11.8, G_F, P), { tone: "hi" }));
  out.push(`<path class="hz-face" d="${G.circleOf(G_F, 5.2, 9.4, P)}"/>`, L(G.circleOf(G_F, 5.3, 9.2, P) + G.circleOf(G_F, 5.3, 6.8, P), { tone: "faint" }));
  const minor = [], major = [];
  for (let i = 0; i <= 20; i++) { const a = A0 - (i / 20) * SWEEP; (i % 5 ? minor : major).push(k.segment(G.pointOf(G_F, 5.3, i % 5 ? 7.6 : 6.8, a), G.pointOf(G_F, 5.3, 9.2, a), P)); }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(L(k.segment(G.pointOf(G_F, 5.3, 6.8, A0), G.pointOf(G_F, 5.3, 9.2, A0), P), { tone: "hi" }));
  // stem into the bulkhead
  out.push(S(G.disc(-1, 0.2, 3, FX([0, GAUGE[1], GAUGE[2] - 13]), P), { tone: "lo" }));
  return out.join("");
}
function needle(p) {
  const a = A0 - p * SWEEP;
  return L(k.segment(G.pointOf(G_F, 5.8, -2.2, a), G.pointOf(G_F, 5.8, 8.2, a), P), { tone: "hi", free: true }) + Dt([at(G.pointOf(G_F, 6, 0, 0))], { size: 0.9, tone: "hi" });
}
const L_F = FX(LAMP);
function lamp() {
  return S(G.disc(0, 3.2, 5.2, L_F, P), { tone: "mid" }) + S(G.ringBand(3.2, 4.2, 3.4, 5.4, L_F, P), { tone: "hi" })
    + `<g class="hz-lens">${S(G.disc(3.2, 4.8, 3.4, L_F, P), { tone: "lo" })}</g><g class="hz-lens-on">${S(G.disc(3.2, 4.8, 3.4, L_F, P), { tone: "lit", lit: true })}</g>`;
}

/* ---------------- moving: the door, its wheel and its dogs ---------------- */
const rot = (p, phi) => { const dx = p[0] - HINGE[0], dy = p[1] - HINGE[1], c = Math.cos(phi), s = Math.sin(phi); return [HINGE[0] + dx * c - dy * s, HINGE[1] + dx * s + dy * c, p[2]]; };
const rotV = (v, phi) => { const c = Math.cos(phi), s = Math.sin(phi); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
function door(phi, wheel, dogs) {
  const F = G.frameOf(rot([DOOR_X, 0, C[2]], phi), rotV([1, 0, 0], phi), rotV([0, 1, 0], phi), [0, 0, 1]);
  const out = [];
  const T = DOOR_T;
  // hinge arms from the knuckle onto the door's face
  for (const z of [62, 86]) {
    const a = rot([DOOR_X + T + 1.2, 18, z], phi), b = rot([HINGE[0], HINGE[1], z], phi);
    const Fa = G.frameAlong(a, G.unit3(G.sub3(b, a)));
    out.push({ k: -1, svg: S(G.disc(0, G.len3(G.sub3(b, a)), 2.4, Fa, P), { tone: "mid" }) });
  }
  out.push({ k: -2, svg: S(G.disc(0, T, R_DOOR, F, P, { bevel: 0.8 }), { tone: "mid", inner: L(G.arcOf(F, T * 0.5, R_DOOR, P), { tone: "faint" }) }) });
  out.push({ k: -1.5, svg: L(G.circleOf(F, T, R_DOOR - 4.5, P) + G.circleOf(F, T, 9.5, P), { tone: "faint" }) });
  // six dogs on guide pads, each pushed by a link from the cam on the hub
  const rd = 21 + dogs * 8, live = [], pins = [];
  for (let i = 0; i < 6; i++) {
    const a = (30 + i * 60) * DEG;
    live.push(S(G.disc(T, T + 2.2, 3.6, G.frameOf(G.pointOf(F, 0, 26, a), F.a, F.u, F.v), P), { tone: "lo" }));
    live.push(L(k.segment(G.pointOf(F, T + 5, 6.6, a + wheel * 0.18), G.pointOf(F, T + 1, rd, a), P), { tone: "lo" }));
    const Fd = G.frameAlong(G.pointOf(F, T + 3.4, rd, a), G.radialOf(F, a));
    live.push(S(G.disc(0, 9, 1.9, Fd, P), { tone: "hi" }));
    pins.push(at(G.pointOf(F, T + 1, rd, a)));
  }
  live.push(Dt(pins, { size: 0.55, tone: "hi" }));
  out.push({ k: -1, svg: live.join("") });
  // hub, three spokes, the rim and a crank knob
  const hub = [S(G.disc(T, T + 5, 6.6, F, P), { tone: "mid" })];
  const spokes = [];
  for (let i = 0; i < 3; i++) { const a = wheel + (90 + i * 120) * DEG; spokes.push(S(G.disc(0, 12.4, 1.4, G.frameAlong(G.pointOf(F, T + 7.4, 5, a), G.radialOf(F, a)), P), { tone: "mid" })); }
  const rim = S(G.ringBand(T + 6.2, T + 8.6, 16.4, 19.8, F, P, { hole: [T + 8.6, 16.4] }), { tone: "hi", className: "hz-rim" });
  const knob = S(G.disc(T + 8.6, T + 13, 1.9, G.frameOf(G.pointOf(F, 0, 18.1, wheel + 30 * DEG), F.a, F.u, F.v), P), { tone: "hi" });
  const cap = S(G.disc(T + 5, T + 8.6, 3, F, P), { tone: "hi" });
  out.push({ k: 0, svg: hub.join("") + spokes.join("") + rim + cap + knob });
  return out.map((o) => o.svg).join("");
}

/* ---------------- figure ---------------- */
const CSS = `
.hz .hz-tunnel{fill:var(--anatomy-shade-1)}
.hz .hz-rib{fill:none;stroke:var(--anatomy-faint);stroke-width:.8}
.hz .hz-far{fill:#060a1c}
.hz .hz-glow{fill:url(#hz-light);opacity:var(--hz-glow,0);transition:none}
.hz .hz-rim path{fill-rule:evenodd}
.hz .iso-face-text{font-family:"JetBrains Mono",ui-monospace,monospace!important;font-size:5.4px!important;font-weight:500;letter-spacing:.06em!important}
.hz .hz-face{fill:var(--anatomy-paper);stroke:none}
.hz .hz-lens-on{opacity:var(--hz-lamp,0)}
.hz .hz-lens-on .iso-fill,.hz .hz-lens-on .iso-top{fill:#7fe3ff}
.hz .hz-lens-on{filter:drop-shadow(0 0 4px #7fe3ff)}
`;
export function mount(root, { label = "MODULE" } = {}) {
  const style = document.createElement("style"); style.textContent = CSS;
  root.classList.add("hz", "iso", "space");
  const defs = `<defs><radialGradient id="hz-light" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#eafaff" stop-opacity=".95"/><stop offset=".35" stop-color="#7fe3ff" stop-opacity=".55"/><stop offset="1" stop-color="#7fe3ff" stop-opacity="0"/></radialGradient></defs>`;
  const fixed = defs + bulkhead(label) + coaming() + doorway() + gasket() + hingeLeaves();
  const front = knuckles() + handrail() + gauge() + lamp();
  const desc = `An airlock hatch in a riveted bulkhead, labelled ${label}: the pressure gauge falls to zero, the lamp lights, the handwheel turns, the six dogs pull in and the door swings open.`;
  root.innerHTML = k.figureSvg({ width: VIEW.w, height: VIEW.h, label: desc, body: `${fixed}<g class="hz-door"></g><g class="hz-front">${front}</g><g class="hz-needle"></g>` });
  root.prepend(style);
  const doorG = root.querySelector(".hz-door"), needleG = root.querySelector(".hz-needle");
  let lastKey = "";
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => ease((t - a) / (b - a));
  // one cycle: bleed (0–.34), lamp (.3–.4), wheel and dogs (.3–.62), swing (.6–1)
  function play(t) {
    const p = 0.82 * (1 - seg(t, 0.02, 0.34));
    const lampOn = seg(t, 0.3, 0.4);
    const turn = seg(t, 0.3, 0.62), dogs = 1 - turn;
    const swing = 1 - Math.pow(1 - Math.min(1, Math.max(0, (t - 0.6) / 0.4)), 3);
    const phi = swing * 104 * DEG, wheel = turn * 1.25 * 2 * Math.PI;
    root.style.setProperty("--hz-lamp", lampOn.toFixed(3));
    root.style.setProperty("--hz-glow", (seg(t, 0.58, 0.9)).toFixed(3));
    needleG.innerHTML = needle(p);
    const key = `${phi.toFixed(3)}|${wheel.toFixed(3)}`;
    if (key !== lastKey) {
      lastKey = key;
      doorG.innerHTML = doorKnuckle() + door(phi, wheel, dogs);
    }
  }
  play(0);
  return { play, doorway: DOORWAY, view: VIEW };
}
