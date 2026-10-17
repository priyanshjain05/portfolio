// Observatory cupola — anatomy scene for Skills. A six-sided cupola on its berthing ring, seated on a
// quilted module hull: the shutters over the side windows swing open one after another, the top shutter
// lifts on its hinge and the stars show in the top window, which the camera then pushes into.
// mount(root, { label }) → { play(t), focus, mode, cycle }. Body, hull and windows are built once;
// only the shutter plates are rebuilt, and each pose is cached.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const VIEW = { w: 760, h: 620 };
const AZ = 32, EL = 30;
const R0 = 46, R1 = 31, Z0 = 12, Z1 = 46, RING_R = 53, HULL_R = 70, TOPWIN = 17;
const P = k.fitProjection(
  [[-60, -60, -4], [60, 60, -4], [60, -60, -4], [-60, 60, -4], [0, 0, Z1 + 34], [-44, 0, Z1 + 30], [30, 0, -14]],
  VIEW.w, VIEW.h, { pad: 16, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);
const { add3, sub3, mul3, unit3, cross3, dot3 } = G;
const poly = (pts) => k.pathOf(pts.map(at), true);
const lerp3 = (a, b, t) => add3(a, mul3(sub3(b, a), t));

function hull2(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

// the six facets of the frustum, flat-on to the camera's left and right
const A = (i) => ((30 + i * 60) * Math.PI) / 180;
const B = Array.from({ length: 6 }, (_, i) => [R0 * Math.cos(A(i)), R0 * Math.sin(A(i)), Z0]);
const T = Array.from({ length: 6 }, (_, i) => [R1 * Math.cos(A(i)), R1 * Math.sin(A(i)), Z1]);
const FACETS = Array.from({ length: 6 }, (_, i) => {
  const j = (i + 1) % 6, q = [B[i], B[j], T[j], T[i]];
  const n = unit3(cross3(sub3(q[1], q[0]), sub3(q[3], q[0])));
  const out = dot3(n, [Math.cos(A(i) + Math.PI / 6), Math.sin(A(i) + Math.PI / 6), 0]) > 0 ? n : mul3(n, -1);
  const bl = (u, v) => lerp3(lerp3(q[0], q[1], u), lerp3(q[3], q[2], u), v);
  return { i, q, n: out, bl, visible: dot3(out, V) > 0.02 };
});
const SHOWN = FACETS.filter((f) => f.visible).sort((a, b) => dot3(add3(a.q[0], a.q[2]), V) - dot3(add3(b.q[0], b.q[2]), V));
const TOP_F = G.frameOf([0, 0, Z1], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
export const FOCUS = (() => { const c = at([0, 0, Z1]), e = at([TOPWIN, 0, Z1]), f = at([0, TOPWIN, Z1]); return { x: c[0], y: c[1], rx: Math.hypot(e[0] - c[0], e[1] - c[1]), ry: Math.abs(f[1] - c[1]) || 8 }; })();

function frustum() {
  const pts = [...B, ...T].map(at), h = hull2(pts);
  const shades = ["", "", "", ""];
  for (const f of SHOWN) shades[G.toneOf(f.n, P)] += poly(f.q);
  const creases = SHOWN.map((f) => k.segment(f.q[0], f.q[3], P) + k.segment(f.q[3], f.q[2], P)).join("");
  return { fill: k.pathOf(h, true), outline: k.pathOf(h, true), top: poly(T), crease: creases, shades };
}

let STATIC = null;
function build() {
  const out = [];
  // module hull under the cupola, with its thermal-blanket seams and stitching
  const HF = G.frameOf([0, -76, -HULL_R + 4], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
  const seams = [22, 56, 96, 130].map((s) => G.arcOf(HF, s, HULL_R, P)).join("");
  out.push(S(G.disc(0, 152, HULL_R, HF, P), { tone: "lo", inner: L(seams, { tone: "faint" }) }));
  out.push(Dt([22, 56, 96, 130].flatMap((s) => G.dotsOf(HF, s + 4, HULL_R, 40, P, { fade: [0.15, 0.5] })), { size: 0.4, tone: "lo" }));
  // berthing ring with its bolt circle and handrails
  const RF = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out.push(S(G.disc(-2, Z0, RING_R, RF, P, { bevel: 0.8 }), { tone: "mid", inner: L(G.arcOf(RF, Z0 / 2, RING_R, P), { tone: "faint" }) }));
  out.push(Dt(G.dotsOf(RF, Z0, (RING_R + R0) / 2 + 1, 24, P, { all: true }), { size: 0.5 }));
  for (const a of [Math.PI * 0.18, Math.PI * 0.82]) {
    const o = [Math.cos(a) * (RING_R + 1), Math.sin(a) * (RING_R + 1), 4], t = [-Math.sin(a), Math.cos(a), 0];
    out.push(S(G.solidOf([[0, 0], [0.5, 1.3, 1], [1.4, 1.6, 1], [16.6, 1.6, 1], [17.5, 1.3, 1], [18, 0]], G.frameAlong(add3(o, mul3(t, -9)), t), P), { tone: "hi" }));
  }
  // the frustum and its top
  out.push(S(frustum(), { tone: "mid" }));
  // side windows: glass, frame, corner bolts
  for (const f of SHOWN) {
    const w = [f.bl(0.16, 0.2), f.bl(0.84, 0.2), f.bl(0.84, 0.82), f.bl(0.16, 0.82)];
    out.push(`<path class="cu-glass" d="${poly(w)}"/>`, L(poly(w), { tone: "mid" }));
    out.push(L(poly([f.bl(0.1, 0.12), f.bl(0.9, 0.12), f.bl(0.9, 0.9), f.bl(0.1, 0.9)]), { tone: "faint" }));
    out.push(Dt([f.bl(0.1, 0.12), f.bl(0.9, 0.12), f.bl(0.9, 0.9), f.bl(0.1, 0.9)].map(at), { size: 0.45 }));
  }
  // top window: frame ring, glass, stars inside, bolts
  out.push(S(G.ringBand(0, 2, TOPWIN, TOPWIN + 5, TOP_F, P, { hole: [2, TOPWIN] }), { tone: "hi", className: "cu-rim" }));
  const clip = G.circleOf(TOP_F, 2.05, TOPWIN, P);
  let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: 110 }, () => { const a = r() * 6.283, d = Math.sqrt(r()) * TOPWIN; const p = at([Math.cos(a) * d, Math.sin(a) * d, Z1 + 2.05]); return `<path d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}h.01" stroke-width="${(0.8 + r() * 1.4).toFixed(2)}"/>`; }).join("");
  out.push(`<clipPath id="cu-clip"><path d="${clip}"/></clipPath><g clip-path="url(#cu-clip)"><path class="cu-sky" d="${clip}"/><g class="cu-stars">${stars}</g><path class="cu-earth" d="${clip}"/></g>`);
  out.push(Dt(G.dotsOf(TOP_F, 2, TOPWIN + 2.6, 12, P, { all: true }), { size: 0.45 }));
  return out.join("");
}

// one shutter: a trapezoid plate hinged on the window's lower edge, swung out by `a`
function shutter(f, a) {
  const h0 = f.bl(0.08, 0.1), h1 = f.bl(0.92, 0.1), top0 = f.bl(0.12, 0.92), top1 = f.bl(0.88, 0.92);
  const u = unit3(sub3(h1, h0)), mid = lerp3(h0, h1, 0.5), up0 = sub3(lerp3(top0, top1, 0.5), mid), hgt = Math.hypot(...up0), e = unit3(up0);
  const v = add3(mul3(e, Math.cos(a)), mul3(f.n, Math.sin(a))), n = add3(mul3(f.n, Math.cos(a)), mul3(e, -Math.sin(a)));
  const wb = Math.hypot(...sub3(h1, h0)) / 2, wt = Math.hypot(...sub3(top1, top0)) / 2;
  const F = G.frameOf(mid, n, u, v);
  return S(G.prismOf(F, [[-wb, 0], [wb, 0], [wt, hgt], [-wt, hgt]], 0.2, 1.8, P), { tone: "mid" });
}
function topShutter(a) {
  const hinge = [-TOPWIN - 4, 0, Z1 + 2];
  const v = [Math.cos(a), 0, Math.sin(a)], n = [-Math.sin(a), 0, Math.cos(a)];
  const c = add3(hinge, mul3(v, TOPWIN + 4));
  const F = G.frameOf(c, n, [0, 1, 0], v);
  return S(G.disc(0, 1.8, TOPWIN + 4, F, P, { bevel: 0.5 }), { tone: "hi" }) + S(k.cylinder(hinge[0], -3, 1.6, Z1 + 1, 3, P, 14), { tone: "mid" });
}

const CSS = `
.cu .cu-glass{fill:#060a1c}
.cu .cu-glass{fill:color-mix(in srgb,#2a5d86 calc(var(--cu-glow,0) * 60%),#060a1c)}
.cu .cu-sky{fill:#02030b}
.cu .cu-stars{opacity:var(--cu-open,0)}
.cu .cu-stars path{fill:none;stroke:#eaf4ff;stroke-linecap:round;vector-effect:non-scaling-stroke}
.cu .cu-earth{fill:url(#cu-earth);opacity:var(--cu-open,0)}
.cu .cu-rim path{fill-rule:evenodd}
`;
export function mount(root) {
  STATIC = STATIC || build();
  const style = document.createElement("style"); style.textContent = CSS;
  root.classList.add("cu", "iso", "space");
  const defs = `<defs><radialGradient id="cu-earth" cx="85%" cy="95%" r="70%"><stop offset="0" stop-color="#7fb2ff" stop-opacity=".55"/><stop offset=".5" stop-color="#2a4c8a" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`;
  root.innerHTML = k.figureSvg({ width: VIEW.w, height: VIEW.h, label: "An observatory cupola on its berthing ring: the shutters over its six side windows swing open one after another, then the top shutter lifts and stars show through the top window.", body: `${defs}${STATIC}<g class="cu-shutters"></g>` });
  root.prepend(style);
  const g = root.querySelector(".cu-shutters");
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => ease((t - a) / (b - a));
  const cache = new Map();
  let last = "";
  function play(t) {
    const angles = SHOWN.map((f, n) => Math.round(seg(t, 0.04 + n * 0.12, 0.36 + n * 0.12) * 40));
    const top = Math.round(seg(t, 0.46, 0.86) * 40);
    const key = angles.join(",") + "|" + top;
    if (key !== last) {
      last = key;
      let svg = cache.get(key);
      if (!svg) {
        svg = SHOWN.map((f, n) => shutter(f, (angles[n] / 40) * 1.2)).join("") + topShutter((top / 40) * 2.05);
        if (cache.size > 240) cache.clear();
        cache.set(key, svg);
      }
      g.innerHTML = svg;
    }
    root.style.setProperty("--cu-glow", seg(t, 0.3, 0.8).toFixed(3));
    root.style.setProperty("--cu-open", seg(t, 0.62, 0.95).toFixed(3));
  }
  play(0);
  return { play, focus: FOCUS, mode: "push", cycle: 1.6 };
}
