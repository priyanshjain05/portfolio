// Solar array wing — anatomy scene for Experience. Out on the truss, no airlock: the mast extends from its
// canister and pulls two cell blankets out of their accordion folds, the beta gimbal turns the wing to the sun,
// and a glint runs down the cells. mount(root) → { play(t), focus, mode, cycle }.
// Truss, gimbal and canister are built once; the blankets and mast are rebuilt per pose and cached.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const VIEW = { w: 760, h: 620 };
const AZ = 24, EL = 24;
const N = 10, SEG = 22, L = N * SEG, W = 34, GAP = 7;     // ten panels of 22 per blanket, blankets 34 wide either side of the mast
const P = k.fitProjection(
  [[-60, -70, -30], [60, -70, 30], [W + GAP, L + 12, 0], [-W - GAP, L + 12, 0], [0, L + 12, 30], [0, L + 12, -30], [0, -70, -30], [0, -70, 34]],
  VIEW.w, VIEW.h, { pad: 18, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);
const { dot3, cross3, sub3, unit3 } = G;
const poly = (pts) => k.pathOf(pts.map(at), true);

let STATIC = null;
function build() {
  const out = [];
  // truss segment: a box frame with bracing on its visible faces, its rails ending on the end frames
  const box = { x: -26, y: -96, w: 52, d: 52, r: 1 };
  out.push(S(k.slabOf(box, -24, 48, P, 2, 0.8), { tone: "lo" }));
  const br = [];
  for (const [y0, y1] of [[-96, -70], [-70, -44]]) {
    br.push(k.segment([26, y0, -24], [26, y1, 24], P), k.segment([26, y0, 24], [26, y1, -24], P));
    br.push(k.segment([-26, y0, 24], [26, y1, 24], P), k.segment([26, y0, 24], [-26, y1, 24], P));
  }
  out.push(Ln(br.join(""), { tone: "faint" }));
  out.push(Ln(k.segment([26, -70, -24], [26, -70, 24], P) + k.lineOnTop([-26, -70], [26, -70], 24, P), { tone: "lo" }));
  out.push(Dt([[26, -96, 24], [26, -70, 24], [26, -44, 24], [-26, -44, 24], [26, -44, -24]].map(at), { size: 0.55 }));
  // beta gimbal: a drum on the truss face, its bolt circle, a flange
  const GF = G.frameOf([0, -44, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
  out.push(S(G.disc(0, 14, 17, GF, P, { bevel: 0.6 }), { tone: "mid", inner: Ln(G.arcOf(GF, 7, 17, P), { tone: "faint" }) }));
  out.push(S(G.disc(14, 18, 20, GF, P, { bevel: 0.6 }), { tone: "hi" }));
  out.push(Dt(G.dotsOf(GF, 18, 17.2, 16, P, { fade: [0.04, 0.42] }), { size: 0.45 }));
  return out.join("");
}

// the turning, deploying part: canister, mast, two blankets, tip fitting. `e` is extension, `b` the beta angle.
function wing(e, b) {
  const items = [];
  const c = Math.cos(b), s = Math.sin(b);
  const R = ([x, y, z]) => [x * c - z * s, y, x * s + z * c];                     // turn about the mast (y)
  const len = Math.max(0.06, e) * L, step = len / N, rise = Math.sqrt(Math.max(0, SEG * SEG - step * step));
  const put = (pts3, svg) => items.push({ k: dot3(pts3.reduce((a, p) => [a[0] + p[0] / pts3.length, a[1] + p[1] / pts3.length, a[2] + p[2] / pts3.length], [0, 0, 0]), V), svg });
  // canisters: the folded stacks' boxes either side of the mast root
  for (const side of [-1, 1]) {
    const x0 = side > 0 ? GAP : -GAP - W, pts = [[x0, -26, -3], [x0 + W, -26, -3], [x0 + W, -12, -3], [x0, -12, -3], [x0, -26, 5], [x0 + W, -26, 5], [x0 + W, -12, 5], [x0, -12, 5]].map(R);
    items.push({ k: -1e4 + dot3(pts[0], V), svg: boxSvg(pts, "mid") });
  }
  // blankets: each panel a quad folded about its x edges, zig-zagging until the mast is fully out
  for (const side of [-1, 1]) {
    const x0 = side > 0 ? GAP : -GAP - W, x1 = x0 + W;
    for (let i = 0; i < N; i++) {
      const ya = -12 + i * step, yb = ya + step, za = i % 2 ? rise : 0, zb = i % 2 ? 0 : rise;
      const q = [[x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb]].map(R);
      const n = unit3(cross3(sub3(q[1], q[0]), sub3(q[3], q[0])));
      const face = dot3(n, V) > 0 ? n : [-n[0], -n[1], -n[2]];
      const tone = G.toneOf(face, P);
      const grid = [];
      for (let g = 1; g < 4; g++) { const xg = x0 + (g * W) / 4; grid.push(k.segment(R([xg, ya, za]), R([xg, yb, zb]), P)); }
      grid.push(k.segment(R([x0, (ya + yb) / 2, (za + zb) / 2]), R([x1, (ya + yb) / 2, (za + zb) / 2]), P));
      put(q, `<g class="sl-panel" data-front="${dot3(n, V) > 0 ? 1 : 0}"><path class="sl-cell" data-shade="${tone}" d="${poly(q)}"/>${Ln(grid.join(""), { tone: "faint" })}<path class="sl-glint" d="${poly(q)}"/>${Ln(poly(q), { tone: "mid" })}</g>`);
    }
  }
  // mast: three longerons with battens, from the canister to the tip fitting
  const tipY = -12 + len;
  const lon = [[-2.6, 0, -2], [2.6, 0, -2], [0, 0, 3]];
  const mast = [];
  for (const [x, , z] of lon) mast.push(k.segment(R([x, -12, z]), R([x, tipY, z]), P));
  for (let y = -12 + 9; y < tipY - 2; y += 9) { mast.push(k.segment(R([lon[0][0], y, lon[0][2]]), R([lon[1][0], y, lon[1][2]]), P), k.segment(R([lon[1][0], y, lon[1][2]]), R([lon[2][0], y + 4.5, lon[2][2]]), P)); }
  put([R([0, -12, 0]), R([0, tipY, 0])], Ln(mast.join(""), { tone: "mid" }));
  // tip fitting: the bar that holds both blankets' outer edges
  const tip = [[-GAP - W, tipY, -2], [GAP + W, tipY, -2], [GAP + W, tipY + 6, -2], [-GAP - W, tipY + 6, -2], [-GAP - W, tipY, 3], [GAP + W, tipY, 3], [GAP + W, tipY + 6, 3], [-GAP - W, tipY + 6, 3]].map(R);
  items.push({ k: 1e4, svg: boxSvg(tip, "hi") + Dt([R([-GAP - W + 3, tipY + 3, 3]), R([GAP + W - 3, tipY + 3, 3])].map(at), { size: 0.5 }) });
  items.sort((a, z) => a.k - z.k);
  return items.map((i) => i.svg).join("");
}
// a box from its eight corners (four low, four high), shaded by facing
function boxSvg(c, tone) {
  const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  const mid = c.reduce((a, p) => [a[0] + p[0] / 8, a[1] + p[1] / 8, a[2] + p[2] / 8], [0, 0, 0]);
  const shades = ["", "", "", ""];
  for (const f of faces) {
    const q = f.map((i) => c[i]);
    let n = unit3(cross3(sub3(q[1], q[0]), sub3(q[3], q[0])));
    const fc = q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    if (dot3(n, sub3(fc, mid)) < 0) n = [-n[0], -n[1], -n[2]];
    if (dot3(n, V) > 0.001) shades[G.toneOf(n, P)] += poly(q);
  }
  const h = hull(c.map(at));
  return S({ fill: k.pathOf(h, true), outline: k.pathOf(h, true), top: "", crease: "", shades }, { tone });
}
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
export const FOCUS = (() => { const c = at([0, L * 0.45, 0]); return { x: c[0], y: c[1], rx: 60, ry: 40 }; })();

const CSS = `
.sl .sl-cell{fill:#16244a}
.sl .sl-cell[data-shade="0"]{fill:#0e1836}.sl .sl-cell[data-shade="1"]{fill:#122044}.sl .sl-cell[data-shade="2"]{fill:#172a55}.sl .sl-cell[data-shade="3"]{fill:#1d3366}
.sl .sl-panel[data-front="0"] .sl-cell{fill:#2a2f3e}
.sl .sl-glint{fill:url(#sl-sweep);opacity:var(--sl-glint,0);pointer-events:none}
.sl .sl-panel[data-front="0"] .sl-glint{display:none}
`;
export function mount(root) {
  STATIC = STATIC || build();
  const style = document.createElement("style"); style.textContent = CSS;
  root.classList.add("sl", "iso", "space");
  const a = at([0, -12, 0]), b = at([0, L, 0]);
  const defs = `<defs><linearGradient id="sl-sweep" gradientUnits="userSpaceOnUse" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"><stop offset="0" stop-color="#eaf8ff" stop-opacity="0"/><stop class="s1" offset="0" stop-color="#eaf8ff" stop-opacity="0"/><stop class="s2" offset="0.05" stop-color="#eaf8ff" stop-opacity=".75"/><stop class="s3" offset="0.1" stop-color="#eaf8ff" stop-opacity="0"/><stop offset="1" stop-color="#eaf8ff" stop-opacity="0"/></linearGradient></defs>`;
  root.innerHTML = k.figureSvg({ width: VIEW.w, height: VIEW.h, label: "A solar array wing on its truss: the mast extends from its canister and unfolds two cell blankets, the gimbal turns the wing toward the sun and a glint runs down the cells.", body: `${defs}${STATIC}<g class="sl-wing"></g>` });
  root.prepend(style);
  const g = root.querySelector(".sl-wing"), stops = [".s1", ".s2", ".s3"].map((q) => root.querySelector(q));
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => ease((t - a) / (b - a));
  const cache = new Map();
  let last = "";
  function play(t) {
    const e = Math.round((0.06 + 0.94 * seg(t, 0, 0.58)) * 160), be = Math.round(seg(t, 0.42, 0.84) * 60);
    const key = e + "|" + be;
    if (key !== last) {
      last = key;
      let svg = cache.get(key);
      if (!svg) { svg = wing(e / 160, (-be / 60) * 0.62); if (cache.size > 400) cache.clear(); cache.set(key, svg); }
      g.innerHTML = svg;
    }
    const sw = seg(t, 0.72, 1) * 1.2 - 0.1;
    stops[0].setAttribute("offset", Math.max(0, sw - 0.06).toFixed(3)); stops[1].setAttribute("offset", Math.max(0, sw).toFixed(3)); stops[2].setAttribute("offset", Math.max(0, sw + 0.06).toFixed(3));
    root.style.setProperty("--sl-glint", (seg(t, 0.7, 0.78) * (1 - seg(t, 0.97, 1) * 0.6)).toFixed(3));
  }
  play(0);
  return { play, focus: FOCUS, mode: "settle", cycle: 1.8 };
}
