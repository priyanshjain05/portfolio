// Comms dish — anatomy scene for Contact. Out on the truss, no airlock: the station's dish on its mast
// slews from stowed toward Earth, the feed lights when it locks, and it transmits. The head is the same
// azimuth–elevation mount as the Comms figure, here on a mast above a truss stub.
// mount(root) → { play(t), focus, mode, cycle }. Base and mast are built once; head poses are cached.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const VIEW = { w: 760, h: 620 };
const AZ_CAM = 30, EL_CAM = 22, DEG = Math.PI / 180;
const TURRET_R = 20, TURRET_Z = 4, TURRET_H = 5;
const ARM_Y = 25, ARM_T = 3, ARM_W = 8, AXIS_Z = 52;
const DRUM_R = 7;
const VERTEX = 10, DEPTH = 8, RIM = 26;
const F4 = (RIM * RIM) / DEPTH;
const FOCUS_S = VERTEX + F4 / 4;
const FOCUS = FOCUS_S;
const dishR = (s) => Math.sqrt(F4 * Math.max(0, s - VERTEX));
const MAST_R = 4.2, MAST_Z0 = -70;
const STOW = { az: 30 * DEG, el: 88 * DEG }, AIM = { az: 74 * DEG, el: -10 * DEG };

const P = k.fitProjection(
  [[-40, -40, MAST_Z0 - 26], [40, 40, MAST_Z0 - 26], [40, -40, MAST_Z0 - 26], [-40, 40, MAST_Z0 - 26], [0, 0, AXIS_Z + 60], [-62, -30, AXIS_Z + 10], [30, 30, AXIS_Z + 40], [-40, 30, AXIS_Z + 30]],
  VIEW.w, VIEW.h, { pad: 18, azimuth: AZ_CAM, elevation: EL_CAM },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const depth = (p) => G.dot3(p, V);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);

let STATIC = null;
function base() {
  const out = [];
  // truss stub: a box frame with bracing, its corner fittings riveted
  const box = { x: -30, y: -30, w: 60, d: 60, r: 1 }, z0 = MAST_Z0 - 26, z1 = MAST_Z0;
  out.push(S(k.slabOf(box, z0, z1 - z0, P, 2, 0.8), { tone: "lo" }));
  const br = [k.segment([30, -30, z0], [30, 30, z1], P), k.segment([30, -30, z1], [30, 30, z0], P), k.segment([-30, 30, z0], [30, 30, z1], P), k.segment([-30, 30, z1], [30, 30, z0], P)];
  out.push(L(br.join(""), { tone: "faint" }));
  out.push(D([[30, -30, z1], [30, 30, z1], [-30, 30, z1], [30, 30, z0], [30, -30, z0], [-30, 30, z0]].map(at), { size: 0.55 }));
  // mast foot flange, mast with bands, a cable clamp pair
  const MF = G.frameOf([0, 0, z1], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out.push(S(G.disc(0, 3, 12, MF, P, { bevel: 0.6 }), { tone: "mid" }));
  out.push(D(G.dotsOf(MF, 3, 9.6, 8, P, { fade: [0.04, 0.42] }), { size: 0.45 }));
  out.push(S(G.disc(3, TURRET_Z - z1, MAST_R, MF, P), { tone: "mid" }));
  for (const s0 of [22, 44]) out.push(S(G.ringBand(s0, s0 + 3, MAST_R, MAST_R + 1.3, MF, P), { tone: "hi" }));
  out.push(S(G.ringBand(64, 68, MAST_R, MAST_R + 1.6, MF, P), { tone: "hi" }));
  // bearing housing under the turret
  out.push(S(G.disc(TURRET_Z - z1 - 6, TURRET_Z - z1, 11, MF, P, { bevel: 0.5 }), { tone: "mid" }));
  // Earth's limb far below, lit at its edge
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
  let turret = S(k.cylinder(0, 0, TURRET_R, TURRET_Z, TURRET_H, P, 64, 0.6), { tone: "mid" });
  turret += L(k.lineOnTop(local(TURRET_R - 7, 0, 0).slice(0, 2), local(TURRET_R + 0.2, 0, 0).slice(0, 2), TURRET_Z + TURRET_H, P), { tone: "lit", free: "start" });
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
  const drum = S(G.disc(0, 2 * ARM_Y - ARM_T, DRUM_R, drumF, P), { tone: "mid" });
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
  dish += L(Array.from({ length: 16 }, (_, i) => k.pathOf(Array.from({ length: 10 }, (_, j) => { const s0 = VERTEX + (4.6 * 4.6) / F4, ss = s0 + (j / 9) * (VERTEX + DEPTH - 0.7 - s0); return at(G.pointOf(F, ss, dishR(ss), (i / 16) * Math.PI * 2)); }))).join(""), { tone: "faint" });
  dish += L(G.circleOf(F, VERTEX + DEPTH - 0.7, dishR(VERTEX + DEPTH - 0.7), P, 120), { tone: "mid" });
  dish += S(G.disc(VERTEX, VERTEX + 1.2, 4.6, F, P), { tone: "mid" });
  // quadripod to the feed at the focus
  const legs = [0, 1, 2, 3].map((i) => k.segment(G.pointOf(F, VERTEX + DEPTH - 0.7, dishR(VERTEX + DEPTH - 0.7), i * Math.PI / 2 + Math.PI / 4), G.pointOf(F, FOCUS - 2.4, 2.2, i * Math.PI / 2 + Math.PI / 4), P)).join("");
  dish += L(legs, { tone: "mid" }) + D([0, 1, 2, 3].map((i) => at(G.pointOf(F, FOCUS - 2.4, 2.2, i * Math.PI / 2 + Math.PI / 4))), { size: 0.5 });
  const feed = G.frameAlong(G.pointOf(F, FOCUS + 2, 0, 0), G.mul3(A, -1));
  const horn = G.solidOf([[0, 1.4], [1.2, 1.4], [1.2, 3.2], [5.4, 2.2]], feed, P);
  dish += S(horn, { tone: "hi" }) + `<g class="dz-feed">${S(horn, { tone: "hi", lit: true })}</g>`;
  // order: far arm, counterweight, drum, reflector, near arm (by the arms' depth)
  const [far, near] = depth(arms[0].c) < depth(arms[1].c) ? [arms[0], arms[1]] : [arms[1], arms[0]];
  const svg = turret + beam + far.svg + cw + drum + dish + near.svg;
  return { svg, F, A, feedTip: G.pointOf(F, FOCUS - 3.4, 0, 0) };
}


const CSS = `
.dz .dz-wave{fill:none;stroke:var(--anatomy-lit);stroke-width:1.1}
.dz .dz-feed{opacity:var(--dz-lock,0)}
.dz .dz-earth{fill:url(#dz-earth)}
`;
export function mount(root) {
  STATIC = STATIC || base();
  const style = document.createElement("style"); style.textContent = CSS;
  root.classList.add("dz", "iso", "space");
  const ex = -VIEW.w * 0.42, ey = VIEW.h * 1.5, er = VIEW.w * 0.92;
  const defs = `<defs><radialGradient id="dz-earth" gradientUnits="userSpaceOnUse" cx="${ex}" cy="${ey}" r="${er * 1.06}"><stop offset=".86" stop-color="#0d1d3d"/><stop offset=".93" stop-color="#173a6e"/><stop offset=".94" stop-color="#4f8fd6" stop-opacity=".8"/><stop offset=".955" stop-color="#7fb2ff" stop-opacity=".35"/><stop offset="1" stop-color="#7fb2ff" stop-opacity="0"/></radialGradient></defs>`;
  const earth = `<circle class="dz-earth" cx="${ex}" cy="${ey}" r="${er * 1.06}"/>`;
  root.innerHTML = k.figureSvg({ width: VIEW.w, height: VIEW.h, label: "The station's comms dish on its mast above a truss stub: it slews from stowed toward Earth, its feed lights when it locks on, and it sends a transmission.", body: `${defs}${earth}${STATIC}<g class="dz-head"></g><g class="dz-waves"></g>` });
  root.prepend(style);
  const headG = root.querySelector(".dz-head"), wavesG = root.querySelector(".dz-waves");
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => ease((t - a) / (b - a));
  const cache = new Map();
  let last = -1, cur = null;
  function play(t) {
    const q = Math.round(seg(t, 0.06, 0.62) * 120);
    if (q !== last) {
      last = q;
      let h = cache.get(q);
      if (!h) {
        const u = q / 120, az = STOW.az + (AIM.az - STOW.az) * u, el = STOW.el + (AIM.el - STOW.el) * u;
        h = head(az, el); if (cache.size > 200) cache.clear(); cache.set(q, h);
      }
      cur = h; headG.innerHTML = h.svg;
    }
    root.style.setProperty("--dz-lock", seg(t, 0.62, 0.7).toFixed(3));
    // three rings leave the feed along the boresight once it is locked
    let w = "";
    for (let i = 0; i < 3; i++) {
      const p = (t - 0.7 - i * 0.08) / 0.3;
      if (p <= 0 || p >= 1) continue;
      const s = VERTEX + DEPTH + 4 + p * 60, r = RIM * (0.9 + p * 0.9);
      w += `<path class="dz-wave" style="opacity:${(1 - p).toFixed(2)}" d="${G.circleOf(cur.F, s, r, P, 48)}"/>`;
    }
    wavesG.innerHTML = w;
  }
  play(0);
  const tip = () => at(cur.feedTip);
  return { play, get focus() { const p = tip(); return { x: p[0], y: p[1], rx: 30, ry: 30 }; }, mode: "beam", cycle: 1.7 };
}
