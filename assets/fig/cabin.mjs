// Crew quarters — anatomy scene for About. A sleep station seen from the module aisle:
// the latch light turns, the door slides along its top rail into the pocket, the cabin light comes up
// on a tethered sleeping bag, a laptop on its arm, a reading lamp, a photo and a vent.
// mount(root, { label }) → { play(t), focus, mode, cycle }. Static art is built once; the door only translates.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const VIEW = { w: 760, h: 620 };
const AZ = 30, EL = 15;
const BACK = -56, Y0 = -42, Y1 = 42, TOP = 150, SLIDE = 86;
const P = k.fitProjection(
  [...k.boxCorners({ x: BACK - 6, y: -48, w: 66, d: 96 }, -6, TOP + 6), [10, 132, TOP + 6], [10, 132, 0]],
  VIEW.w, VIEW.h, { pad: 18, azimuth: AZ, elevation: EL },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);
const poly = (pts) => k.pathOf(pts.map(at), true);
const slab = (x, y, w, d, z, h, r = 0.6, bevel = 0.4) => k.slabOf({ x, y, w, d, r }, z, h, P, 2, bevel);

const LAPTOP = { x: -34, y: -16, z: 85.6 };
const SCREEN = [[-33.5, -13.6, 88.4], [-33.5, 5.6, 88.4], [-33.5, 5.6, 100.2], [-33.5, -13.6, 100.2]];
export const FOCUS = (() => { const c = at([-33.5, -4, 94.3]); return { x: c[0], y: c[1], rx: 30, ry: 22 }; })();

let STATIC = null;
function build(label) {
  const back = [], mid = [], front = [];
  // shell: back panel, floor, left wall
  back.push(S(slab(BACK - 6, -48, 6, 96, -6, TOP + 12, 1, 0.8), { tone: "lo" }));
  back.push(S(slab(BACK, -48, 60, 96, -6, 6, 1, 0.6), { tone: "lo" }));
  back.push(S(slab(BACK, -48, 58, 6, 0, TOP, 0.6, 0.6), { tone: "mid" }));
  // back wall: a cargo net in the lower corner, its cords ending on a frame
  const net = { x: BACK, y: 14, z: 10, d: 24, h: 30 };
  back.push(L(poly([[BACK, net.y, net.z], [BACK, net.y + net.d, net.z], [BACK, net.y + net.d, net.z + net.h], [BACK, net.y, net.z + net.h]]), { tone: "lo" }));
  const cords = [];
  for (let i = 1; i < 6; i++) cords.push(k.segment([BACK, net.y + (i * net.d) / 6, net.z], [BACK, net.y + (i * net.d) / 6, net.z + net.h], P));
  for (let i = 1; i < 5; i++) cords.push(k.segment([BACK, net.y, net.z + (i * net.h) / 5], [BACK, net.y + net.d, net.z + (i * net.h) / 5], P));
  back.push(L(cords.join(""), { tone: "faint" }));
  back.push(Dt([[net.y, net.z], [net.y + net.d, net.z], [net.y, net.z + net.h], [net.y + net.d, net.z + net.h]].map(([y, z]) => at([BACK, y, z])), { size: 0.55 }));
  // left wall inner face (y = Y0): vent grille, a framed photo, a handhold
  const vent = [];
  for (let z = 22; z <= 40; z += 3) vent.push(k.segment([-44, Y0, z], [-20, Y0, z], P));
  back.push(L(poly([[-44, Y0, 20], [-20, Y0, 20], [-20, Y0, 42], [-44, Y0, 42]]), { tone: "lo" }), L(vent.join(""), { tone: "faint" }));
  back.push(S(slab(-26, Y0, 13, 0.9, 108, 15, 0.3, 0.2), { tone: "mid", crease: "none" }));
  back.push(L(poly([[-24.6, Y0 + 0.9, 110], [-14.4, Y0 + 0.9, 110], [-14.4, Y0 + 0.9, 121], [-24.6, Y0 + 0.9, 121]]), { tone: "lo" }));
  for (const z of [56, 76]) back.push(S(G.disc(0, 4, 1.1, G.frameOf([-8, Y0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "mid" }));
  back.push(S(G.disc(0, 22, 1.3, G.frameOf([-8, Y0 + 4, 55], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P), { tone: "hi" }));
  // sleeping bag tethered to the back wall, quilted, with two straps and a pillow
  const bag = { x: BACK, y: -20, w: 9, d: 40, r: 9 };
  const quilts = [44, 60, 76, 92, 108].map((z) => k.sideSeam(bag, z, P, 8)).join("");
  mid.push(S(k.slabOf(bag, 24, 106, P, 8, 1.2), { tone: "mid", inner: L(quilts, { tone: "faint" }) }));
  for (const z of [52, 98]) mid.push(S(k.slabOf({ x: BACK, y: -21, w: 10.4, d: 42, r: 9.6 }, z, 3.2, P, 8, 0.4), { tone: "lo" }));
  mid.push(S(k.slabOf({ x: BACK, y: -13, w: 12, d: 26, r: 6 }, 116, 12, P, 8, 1), { tone: "hi" }));
  // laptop on an arm from the left wall: arm, elbow, base with keys, hinged screen
  mid.push(S(G.disc(0, 26, 1.5, G.frameOf([-27, Y0, 82.6], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "mid" }));
  mid.push(S(G.sphereOf([-27, -16, 82.6], 2.3, P), { tone: "hi" }));
  mid.push(S(slab(LAPTOP.x, LAPTOP.y, 16, 24, 83.8, 1.8, 0.8, 0.3), { tone: "mid" }));
  mid.push(Dt(k.dotGrid(LAPTOP.x + 3, LAPTOP.y + 3, 9, 4, 2.2, LAPTOP.z, P).slice(0), { size: 0.35, tone: "lo" }));
  mid.push(S(slab(LAPTOP.x - 1.2, LAPTOP.y, 1.6, 24, LAPTOP.z, 16.6, 0.5, 0.3), { tone: "lo" }));
  mid.push(`<path class="cb-screen" d="${poly(SCREEN)}"/>`);
  const rules = [[91.5, 12], [94, 16], [96.5, 9]].map(([z, l]) => k.segment([-33.4, -11.6, z], [-33.4, -11.6 + l, z], P)).join("");
  mid.push(`<g class="cb-ui">${L(rules, { tone: "lit", free: true })}</g>`);
  // reading lamp under the ceiling
  mid.push(S(k.cylinder(-40, 12, 3.4, TOP - 9, 9, P, 24, 0.3), { tone: "mid" }));
  mid.push(`<ellipse class="cb-lamp" cx="${at([-40, 12, TOP - 9])[0].toFixed(1)}" cy="${at([-40, 12, TOP - 9])[1].toFixed(1)}" rx="30" ry="18"/>`);
  // light and dark over the opening (the cabin light comes up)
  const open = poly([[0, Y0, 0], [0, Y1, 0], [0, Y1, TOP], [0, Y0, TOP]]);
  const room = poly([[BACK, Y0, 0], [BACK, Y1, 0], [BACK, Y1, TOP], [0, Y1, TOP], [0, Y0, TOP], [0, Y0, 0]]);
  mid.push(`<path class="cb-dark" d="${room}"/><path class="cb-light" d="${room}"/>`);
  // ceiling, right wall (outer face), door frame
  front.push(S(slab(BACK, -48, 60, 96, TOP, 6, 1, 0.6), { tone: "lo" }));
  front.push(S(slab(BACK, Y1, 58, 6, 0, TOP, 0.6, 0.6), { tone: "mid" }));
  const pocket = [];
  for (let y = 54; y <= 126; y += 12) pocket.push([y]);
  front.push(S(slab(0, -48, 4, 8, 0, TOP + 6, 0.4, 0.4), { tone: "mid" }), S(slab(0, 40, 4, 8, 0, TOP + 6, 0.4, 0.4), { tone: "mid" }));
  front.push(S(slab(0, -48, 4, 96, 0, 5, 0.4, 0.4), { tone: "mid" }));
  front.push(Dt([at([4, 44, 132])], { size: 1.1, tone: "lo" }));
  front.push(`<circle class="cb-led" cx="${at([4, 44, 132])[0].toFixed(1)}" cy="${at([4, 44, 132])[1].toFixed(1)}" r="1.6"/>`);
  // the door, built once at rest and translated along its rail
  const d = [];
  d.push(S(slab(5, -41, 3.2, 82, 6, TOP - 8, 1, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: 5, y: -41, w: 3.2, d: 82, r: 1 }, 30, P, 2), { tone: "faint" }) }));
  const louver = []; for (let z = 12; z <= 26; z += 2.8) louver.push(k.segment([8.2, -26, z], [8.2, 26, z], P));
  d.push(L(poly([[8.2, -28, 10], [8.2, 28, 10], [8.2, 28, 28], [8.2, -28, 28]]), { tone: "lo" }), L(louver.join(""), { tone: "faint" }));
  d.push(L(poly([[8.2, -24, 52], [8.2, 24, 52], [8.2, 24, 98], [8.2, -24, 98]]), { tone: "faint" }));
  d.push(S(slab(8.2, -14, 0.8, 28, 108, 12, 0.3, 0.2), { tone: "lo", crease: "none" }));
  d.push(k.faceTextSvg(k.sideMatrix([9, 0], 111.2, P, "right"), label, { size: 5.6, tone: "hi", anchor: "middle" }));
  d.push(Dt([at([9, -12.2, 110]), at([9, 12.2, 110]), at([9, -12.2, 118]), at([9, 12.2, 118])], { size: 0.38 }));
  d.push(S(G.disc(0, 30, 1.5, G.frameOf([11.4, -33, 62], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P), { tone: "hi" }));
  for (const z of [62, 92]) d.push(S(G.disc(0, 3.2, 1.1, G.frameOf([8.2, -33, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P), { tone: "mid" }));
  const door = d.join("");
  // top rail the door hangs from, running out over the pocket
  const rail = S(slab(4, -48, 7, 182, TOP - 2, 8, 0.6, 0.5), { tone: "hi" }) + Dt([-40, -4, 32, 68, 104].map((y) => at([11, y, TOP + 2])), { size: 0.45 });
  return { back: back.join(""), mid: mid.join(""), front: front.join(""), door, rail };
}

const CSS = `
.cb .cb-screen{fill:var(--anatomy-paper);opacity:1}
.cb .cb-ui{opacity:var(--cb-on,0)}
.cb .cb-screen{fill:color-mix(in srgb,#7fe3ff calc(var(--cb-on,0) * 55%),var(--anatomy-paper))}
.cb .cb-lamp{fill:url(#cb-glow);opacity:var(--cb-lit,0)}
.cb .cb-dark{fill:#02030a;opacity:calc(.55 - var(--cb-lit,0) * .55)}
.cb .cb-light{fill:url(#cb-wash);opacity:calc(var(--cb-lit,0) * .5)}
.cb .cb-led{fill:#ffbf73;opacity:calc(1 - var(--cb-latch,0))}
.cb .cb-led-on{fill:#7cf2b9}
`;
export function mount(root, { label = "CREW 04" } = {}) {
  STATIC = STATIC && STATIC.label === label ? STATIC : { label, ...build(label) };
  const style = document.createElement("style"); style.textContent = CSS;
  root.classList.add("cb", "iso", "space");
  const defs = `<defs><radialGradient id="cb-glow"><stop offset="0" stop-color="#fff4dc" stop-opacity=".9"/><stop offset="1" stop-color="#ffd9a8" stop-opacity="0"/></radialGradient>
  <radialGradient id="cb-wash" cx="40%" cy="20%" r="80%"><stop offset="0" stop-color="#ffe6c2" stop-opacity=".55"/><stop offset=".6" stop-color="#7fe3ff" stop-opacity=".12"/><stop offset="1" stop-color="#7fe3ff" stop-opacity="0"/></radialGradient></defs>`;
  const led = at([4, 44, 132]);
  const body = `${defs}${STATIC.back}${STATIC.mid}${STATIC.front}<circle class="cb-led-on" cx="${led[0].toFixed(1)}" cy="${led[1].toFixed(1)}" r="1.6" style="opacity:var(--cb-latch,0)"/><g class="cb-door">${STATIC.door}</g>${STATIC.rail}`;
  root.innerHTML = k.figureSvg({ width: VIEW.w, height: VIEW.h, label: `A crew sleep station labelled ${label}: its door slides open on a top rail and the cabin light comes up on a tethered sleeping bag, a laptop on an arm, a reading lamp and a photo.`, body });
  root.prepend(style);
  const doorG = root.querySelector(".cb-door");
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => ease((t - a) / (b - a));
  let last = -1;
  function play(t) {
    const slide = seg(t, 0.16, 0.7);
    const key = Math.round(slide * 400);
    if (key !== last) { last = key; doorG.setAttribute("transform", k.translateAlong(P, [0, (key / 400) * SLIDE, 0])); }
    root.style.setProperty("--cb-latch", seg(t, 0, 0.16).toFixed(3));
    root.style.setProperty("--cb-lit", seg(t, 0.5, 0.88).toFixed(3));
    root.style.setProperty("--cb-on", seg(t, 0.66, 0.95).toFixed(3));
  }
  play(0);
  return { play, focus: FOCUS, mode: "settle", cycle: 1.5 };
}
