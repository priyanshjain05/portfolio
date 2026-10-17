// Home station — anatomy figure, and the site's main menu. Each part is a section:
// main lab module (Work), solar arrays (Experience), observatory cupola (Skills),
// crew quarters below the node (About), comms dish (Contact); the docked ship is the resume.
// mount(root, { onHover, onSelect }) draws it; a part lights up as the one accent when pointed at.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const VIEW = { w: 900, h: 560 };
const AZ = 35, EL = 26;
const FX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FXN = (o) => G.frameOf(o, [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const FY = (o, sign = 1) => G.frameOf(o, [0, sign, 0], [0, 0, 1], [1, 0, 0]);

const R_MOD = 10.5, TRUSS_Z = 22, TRUSS_H = 8, WING_Z = 25.4;
const DISH_O = [-28, 0, 37], DISH_A = G.unit3([0.42, 0.18, 0.89]), DISH_R = 14, DISH_D = 6;
const F4 = (DISH_R * DISH_R) / DISH_D;
const dishR = (s) => Math.sqrt(F4 * Math.max(0, s));

const P = k.fitProjection(
  [[0, -184, 28], [0, 184, 28], [-30, -184, 26], [30, 184, 26], [82, 0, 0], [0, 0, -66], [-40, 0, 52], [-40, 0, -8], [44, -6, 34], [0, 0, -16], [-34, 66, 27], [-34, -66, 27]],
  VIEW.w, VIEW.h, { pad: 20, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const depth = (p) => G.dot3(p, V);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);

function build() {
  const items = [];
  const put = (c, svg, mod = "", bias = 0) => items.push({ k: depth(c) + bias, svg, mod });

  // ---- node, post ----
  put([0, 0, 0], S(G.sphereOf([0, 0, 0], 14, P), { tone: "mid" }));
  for (const [a, F] of [["+y", FY([0, 12.6, 0])], ["-y", FY([0, -12.6, 0], -1)]]) put(G.pointOf(F, 1.5, 0, 0), S(G.disc(0, 3, 6.2, F, P), { tone: "mid" }) + (G.dot3(F.a, V) > 0.1 ? Dt(G.dotsOf(F, 3, 4.8, 8, P, { all: true }), { size: 0.42 }) : ""), "", 0.5);
  put([0, 0, 18], S(k.cylinder(0, 0, 3.4, 13.4, TRUSS_Z - 13.4, P, 24), { tone: "mid", inner: L(k.sideArc(0, 0, 3.4, 17.5, P, 14), { tone: "faint" }) }), "", 1);

  // ---- crew module (+x) with windows, handrail and docking adapter ----
  const CM = FX([0, 0, 0]);
  const seams = L(G.arcOf(CM, 28, R_MOD, P) + G.arcOf(CM, 48, R_MOD, P), { tone: "faint" });
  put([40, 0, 0], S(G.disc(13, 66, R_MOD, CM, P), { tone: "hi", inner: seams }), "work");
  const face = G.angleToward(CM, V);
  [22, 34, 56].forEach((s) => {
    const p = G.pointOf(CM, s, R_MOD, face + 0.35), F = G.frameAlong(p, G.radialOf(CM, face + 0.35));
    put(G.add3(p, [0, 0, 0.1]), S(G.disc(-0.2, 0.7, 2, F, P), { tone: "mid" }) + `<path class="st-window" d="${G.circleOf(F, 0.7, 1.3, P, 24)}"/>`, "work", 2);
  });
  const rail = [16, 30, 44, 60].map((s) => G.pointOf(CM, s, R_MOD + 1.4, face - 0.55));
  put([40, 0, 2], L(k.pathOf(rail.map(at)), { tone: "mid" }) + Dt([16, 30, 44, 60].map((s) => at(G.pointOf(CM, s, R_MOD + 0.2, face - 0.55))), { size: 0.45 }), "work", 3);
  put([72, 0, 0], S(G.solidOf([[66, R_MOD], [70, 7.4], [77, 7.4], [77, 5.4], [80, 5.4]], CM, P), { tone: "mid", inner: L(G.arcOf(CM, 73.5, 7.4, P), { tone: "faint" }) }), "work");
  put([80, 0, 0], S(G.ringBand(79.4, 80.8, 5.4, 6.8, CM, P), { tone: "hi" }) + Dt(G.dotsOf(CM, 80.8, 6.1, 8, P, { fade: [0.04, 0.42] }), { size: 0.4 }), "work", 0.5);

  // ---- observatory cupola + telescope (on top of the crew module) ----
  const CX = 42, top = R_MOD;
  put([CX, 0, top + 1], S(k.cylinder(CX, 0, 7, top - 0.9, 3, P, 40, 0.5), { tone: "mid" }), "skills", 1);
  const panes = k.knurl(CX, 0, 6, top + 2.2, top + 6.6, 12, P, 0);
  put([CX, 0, top + 4], S(k.cylinder(CX, 0, 6, top + 2.1, 4.5, P, 40), { tone: "hi", inner: L(panes, { tone: "lo" }) }), "skills", 1.2);
  const dome = []; for (let i = 0; i <= 10; i++) { const t = i / 10; dome.push([top + 6.6 + 4.8 * Math.sin((t * Math.PI) / 2), Math.max(0.25, 6 * Math.cos((t * Math.PI) / 2)), 1]); }
  const DZ = FZ([CX, 0, 0]);
  put([CX, 0, top + 9], S(G.solidOf(dome, DZ, P, { smooth: true }), { tone: "hi" }), "skills", 1.4);
  const TA = G.unit3([0.38, -0.36, 0.85]), TF = G.frameAlong([CX, 0, top + 11], TA);
  put(G.pointOf(TF, 6, 0, 0), S(G.disc(0, 13, 1.7, TF, P), { tone: "mid", inner: L(G.arcOf(TF, 6, 1.7, P), { tone: "faint" }) }) + S(G.disc(13, 15.4, 2.5, TF, P), { tone: "hi" }) + `<path class="st-glass" d="${G.circleOf(TF, 15.4, 1.7, P, 28)}"/>`, "skills", 2);

  // ---- log module hanging below the node, domed end, hatch ----
  const LM = G.frameOf([0, 0, 0], [0, 0, -1], [1, 0, 0], [0, 1, 0]);
  put([0, 0, -36], S(G.disc(13, 58, R_MOD, LM, P), { tone: "hi", inner: L(G.arcOf(LM, 26, R_MOD, P) + G.arcOf(LM, 42, R_MOD, P), { tone: "faint" }) }), "about", -2);
  const endDome = []; for (let i = 0; i <= 10; i++) { const t = i / 10; endDome.push([58 + 6.4 * Math.sin((t * Math.PI) / 2), Math.max(0.3, R_MOD * Math.cos((t * Math.PI) / 2)), 1]); }
  put([0, 0, -62], S(G.solidOf(endDome, LM, P, { smooth: true }), { tone: "hi" }), "about", -1);
  const fa = G.angleToward(LM, V);
  const hatch = G.pointOf(LM, 34, R_MOD, fa), HF = G.frameAlong(hatch, G.radialOf(LM, fa));
  put(G.add3(hatch, [3, 3, 0]), S(G.disc(-0.2, 0.8, 3.6, HF, P), { tone: "mid" }) + L(G.circleOf(HF, 0.8, 2.6, P, 24), { tone: "lo" }), "about", 2);
  [20, 48].forEach((s2) => { const p2 = G.pointOf(LM, s2, R_MOD, fa + 0.6), F2 = G.frameAlong(p2, G.radialOf(LM, fa + 0.6)); put(G.add3(p2, [3, 3, 0]), S(G.disc(-0.2, 0.6, 1.6, F2, P), { tone: "mid" }) + `<path class="st-window" d="${G.circleOf(F2, 0.6, 1, P, 20)}"/>`, "about", 2.2); });
  // service stub on the far side (carries the comms mast)
  const SM = FXN([0, 0, 0]);
  put([-24, 0, 0], S(G.solidOf([[12, 7.6], [34, 7.6], [36, 6], [37, 3]], SM, P), { tone: "mid", inner: L(G.arcOf(SM, 24, 7.6, P), { tone: "faint" }) }), "contact", -1);
  // ---- comms boom and dish (on the log module) ----
  put([-28, 0, 18], S(k.cylinder(-28, 0, 2, 6.8, 30 - 6.8, P, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(-28, 0, 2, 18, P, 12), { tone: "faint" }) }), "contact", 1);
  put([-28, 0, 31], S(k.slabOf({ x: -31.5, y: -3.5, w: 7, d: 7, r: 1.2 }, 30, 4, P, 3, 0.4), { tone: "mid" }), "contact", 1.2);
  const DF = G.frameAlong(DISH_O, DISH_A);
  let dish = S(G.disc(-3, 0.3, 2.2, DF, P), { tone: "mid" });
  dish += S(G.ringBand(DISH_D - 0.6, DISH_D + 0.4, DISH_R - 0.2, DISH_R + 0.9, DF, P), { tone: "hi" });
  dish += `<path class="iso-shade" data-shade="1" d="${G.circleOf(DF, DISH_D - 0.6, dishR(DISH_D - 0.6), P, 80)}"/>`;
  dish += L([1.6, 3.4, 5].map((s) => G.circleOf(DF, s, dishR(s), P, 56)).join(""), { tone: "faint" });
  dish += L(Array.from({ length: 12 }, (_, i) => k.pathOf(Array.from({ length: 8 }, (_, j) => { const s = 0.5 + (j / 7) * (DISH_D - 1.1); return at(G.pointOf(DF, s, dishR(s), (i / 12) * Math.PI * 2)); }))).join(""), { tone: "faint" });
  dish += L(G.circleOf(DF, DISH_D - 0.6, dishR(DISH_D - 0.6), P, 80), { tone: "mid" });
  const FOC = F4 / 4;
  dish += L([0, 1, 2].map((i) => k.segment(G.pointOf(DF, DISH_D - 0.2, DISH_R - 0.2, i * 2.094 + 0.5), G.pointOf(DF, FOC - 0.5, 1.2, i * 2.094 + 0.5), P)).join(""), { tone: "mid" });
  dish += S(G.solidOf([[-1, 1.8], [0.6, 1.8], [0.6, 1], [2, 0.7]], G.frameAlong(G.pointOf(DF, FOC + 1.2, 0, 0), G.mul3(DISH_A, -1)), P), { tone: "hi" });
  put(DISH_O, dish, "contact", 2);

  // ---- truss: segments with X-bracing, then rotary joints, masts and solar wings ----
  for (let y = -72; y < 72; y += 18) {
    const plan = { x: -4, y, w: 8, d: 18, r: 0.6 };
    const brace = k.lineOnTop([-4, y], [4, y + 18], TRUSS_Z + TRUSS_H, P) + k.lineOnTop([4, y], [-4, y + 18], TRUSS_Z + TRUSS_H, P)
      + k.segment([4, y, TRUSS_Z], [4, y + 18, TRUSS_Z + TRUSS_H], P) + k.segment([4, y + 18, TRUSS_Z], [4, y, TRUSS_Z + TRUSS_H], P);
    put([0, y + 9, TRUSS_Z + 4], S(k.slabOf(plan, TRUSS_Z, TRUSS_H, P, 2, 0.3), { tone: "mid", inner: L(brace, { tone: "lo" }) }) + Dt([[-4, y], [4, y], [4, y + 18]].map(([x, yy]) => at([x, yy, TRUSS_Z + TRUSS_H])), { size: 0.4 }), "", 0);
  }
  for (const sign of [-1, 1]) {
    const J = FY([0, sign * 72, TRUSS_Z + TRUSS_H / 2], sign);
    put(G.pointOf(J, 3, 0, 0), S(G.disc(0, 6, 6.4, J, P), { tone: "mid", inner: L(G.arcOf(J, 3, 6.4, P), { tone: "faint" }) }), "experience", 0.3);
    const M = FY([0, sign * 78, WING_Z + 0.6], sign);
    put(G.pointOf(M, 52, 0, 0), S(G.disc(0, 104, 1.1, M, P), { tone: "mid", crease: "none" }), "experience", -0.4);
    for (const side of [-1, 1]) {
      const plan = { x: side > 0 ? 2.5 : -28.5, y: sign > 0 ? 82 : -178, w: 26, d: 96, r: 0.6 };
      const grid = [];
      for (let i = 1; i < 12; i++) grid.push(k.lineOnTop([plan.x, plan.y + (plan.d * i) / 12], [plan.x + plan.w, plan.y + (plan.d * i) / 12], WING_Z + 1.2, P));
      for (let i = 1; i < 4; i++) grid.push(k.lineOnTop([plan.x + (plan.w * i) / 4, plan.y], [plan.x + (plan.w * i) / 4, plan.y + plan.d], WING_Z + 1.2, P));
      put([plan.x + 13, plan.y + 48, WING_Z], S(k.slabOf(plan, WING_Z, 1.2, P, 2, 0.3), { tone: "mid", crease: "lo" }) + `<path class="st-cells" d="${k.slabOf(k.insetPlan(plan, 1.2), WING_Z, 1.2, P, 2).top}"/>` + L(grid.join(""), { tone: "faint" }) + L(k.planOutline(k.insetPlan(plan, 1.2), WING_Z + 1.2, P, 2), { tone: "lo" }), "experience", 0);
    }
    for (const yy of [80, 179]) put([0, sign * yy, WING_Z + 1], S(k.slabOf({ x: -30, y: sign > 0 ? yy - 1 : -yy - 1, w: 60, d: 2, r: 0.5 }, WING_Z + 1.2, 1.2, P, 2), { tone: "mid" }), "experience", 0.6);
    // radiator panel off the truss, fins edge to edge
    const rp = { x: -34, y: sign * 60 - 6, w: 30, d: 12, r: 0.6 };
    const fins = []; for (let x = rp.x + 2.5; x < rp.x + rp.w; x += 2.5) fins.push(k.lineOnTop([x, rp.y], [x, rp.y + rp.d], WING_Z + 0.8, P));
    put([rp.x + 15, sign * 60, WING_Z], S(k.slabOf(rp, WING_Z, 0.8, P, 2), { tone: "hi", inner: L(fins.join(""), { tone: "faint" }) }), "", 0.2);
    // navigation light at the wing tip
    put([0, sign * 181, WING_Z + 2], `<circle class="st-nav ${sign > 0 ? "st-green" : "st-red"}" cx="${at([0, sign * 181, WING_Z + 2])[0].toFixed(1)}" cy="${at([0, sign * 181, WING_Z + 2])[1].toFixed(1)}" r="1.6"/>`, "", 5);
  }
  put([81, 0, 0], `<circle class="st-nav st-white" cx="${at([81.4, 0, 0])[0].toFixed(1)}" cy="${at([81.4, 0, 0])[1].toFixed(1)}" r="1.4"/>`, "work", 6);
  items.sort((a, b) => a.k - b.k);
  return items.map((it) => `<g class="st-it"${it.mod ? ` data-mod="${it.mod}"` : ""}>${it.svg}</g>`).join("");
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export const MODULES = {
  work: { name: "Lab module", says: "Work" },
  experience: { name: "Solar arrays", says: "Experience" },
  skills: { name: "Observatory", says: "Skills" },
  about: { name: "Crew quarters", says: "About" },
  contact: { name: "Comms dish", says: "Contact" },
};
// anchor points (viewBox units) where each part's hotspot sits; the wing on the right of the screen carries Experience
const wingSign = at([0, 130, 26])[0] > at([0, -130, 26])[0] ? 1 : -1;
export const ANCHORS = {
  work: at([28, 6, -8]),
  experience: at([0, wingSign * 132, 26.6]),
  skills: at([47, -9, 36]),
  about: at([0, 0, -48]),
  contact: at(G.add3(DISH_O, G.mul3(DISH_A, 3))),
  dock: at([81, 0, 0]),
};
// the direction the docking port points on screen (the ship sits nose-out along it)
export const DOCK_DIR = (() => { const a = at([81, 0, 0]), b = at([95, 0, 0]); return Math.atan2(b[1] - a[1], b[0] - a[0]); })();

const CSS = `
.st{position:relative}
.st .iso-svg{overflow:visible}
.st [data-mod]{cursor:pointer}
.st [data-mod] .iso-edge,.st [data-mod] .iso-top,.st [data-mod] .iso-shade,.st [data-mod] .iso-fill{transition:fill .5s,stroke .5s}
.st [data-mod][data-on] .iso-top{fill:var(--anatomy-lit-top)}
.st [data-mod][data-on] .iso-shade{fill:var(--anatomy-lit-shade)}
.st [data-mod][data-on] .iso-edge{stroke:var(--anatomy-lit);stroke-width:1.1px}
.st [data-mod][data-on] .iso-solid[data-seamless]>.iso-shade{stroke:var(--anatomy-lit-shade)}
.st[data-focus] .st-it:not([data-on]) .iso-edge[data-tone="hi"]{stroke:var(--anatomy-mid)}
.st .st-window{fill:#ffcf8a;opacity:.85;filter:drop-shadow(0 0 2px #ffbf73)}
.st .st-glass{fill:var(--anatomy-lit);opacity:.6}
.st .st-cells{fill:#16285a;opacity:.55}
.st .st-nav{animation:st-blink 2.4s steps(1,end) infinite}
.st .st-red{fill:#ff6b7a;filter:drop-shadow(0 0 3px #ff6b7a)}
.st .st-green{fill:#7cf2b9;filter:drop-shadow(0 0 3px #7cf2b9);animation-delay:1.2s}
.st .st-white{fill:#fff;filter:drop-shadow(0 0 3px #fff);animation-duration:1.6s}
@keyframes st-blink{0%,100%{opacity:.25}8%{opacity:1}22%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.st .st-nav{animation:none;opacity:.8}}
`;

const LABEL = "An orbital station that works as the site menu: a lab module with a docking port (Work), two solar arrays (Experience), an observatory cupola with a telescope (Skills), crew quarters below the central node (About), and a comms dish (Contact).";
export const markup = () => k.figureSvg({ width: VIEW.w, height: VIEW.h, label: LABEL, body: build() });
export function mount(root, { onHover, onSelect } = {}) {
  const style = document.createElement("style"); style.textContent = CSS;
  root.classList.add("st", "iso", "space");
  // tools/build.mjs writes the drawing into the page ahead of time; build it here only if it isn't there
  if (!root.querySelector("svg")) root.innerHTML = markup();
  root.prepend(style);
  let on = null;
  const set = (mod) => {
    if (mod === on) return; on = mod;
    root.toggleAttribute("data-focus", !!mod);
    root.querySelectorAll(".st-it[data-mod]").forEach((g) => g.toggleAttribute("data-on", g.dataset.mod === mod));
    onHover?.(mod);
  };
  root.addEventListener("pointerover", (e) => { const g = e.target.closest("[data-mod]"); set(g ? g.dataset.mod : null); });
  root.addEventListener("pointerleave", () => set(null));
  root.addEventListener("click", (e) => { const g = e.target.closest("[data-mod]"); if (g && !root._dragged) onSelect?.(g.dataset.mod); });
  return { set, get on() { return on; } };
}
