// One renderer for every ship in the game: the builder preview, the ship you fly, and the results card.
// drawShip(ctx, build, { x, y, size, thrust, steer, t, boost }) composes the ship from its four parts, pointing up.
// Every part changes the silhouette, not just the colour: hull outline and plating, engine nozzle and flame,
// thruster fins / pods / vanes, and where the fuel tank sits and how big it is.
import { pick } from "./parts.js";

const LINE = "rgba(222,232,250,0.92)", FAINT = "rgba(160,180,215,0.42)";
const HULL = {
  // half-outlines (right side, x ≥ 0) in units of ship length, nose at negative y
  scout: [[0, -0.52], [0.06, -0.38], [0.1, -0.16], [0.12, 0.08], [0.1, 0.3], [0.06, 0.38]],
  frigate: [[0, -0.46], [0.09, -0.34], [0.18, -0.02], [0.27, 0.24], [0.2, 0.33], [0.09, 0.36]],
  bulwark: [[0, -0.4], [0.13, -0.38], [0.24, -0.2], [0.27, 0.14], [0.22, 0.34], [0.09, 0.38]],
};
const HALF = { scout: 0.11, frigate: 0.19, bulwark: 0.25 };   // typical half-width, for attaching parts

export function drawShip(ctx, build, o = {}) {
  const S = o.size || 100, t = o.t || 0, thrust = o.thrust ?? 0.5, steer = o.steer || 0, boost = o.boost || 0;
  const E = pick("engine", build.engine), H = pick("hull", build.hull), R = pick("thrusters", build.thrusters), K = pick("tank", build.tank);
  const hv = H.look.variant, hw = HALF[hv], lw = Math.max(1, S * 0.012);
  ctx.save();
  ctx.translate(o.x || 0, o.y || 0);
  ctx.scale(S * (1 - Math.abs(steer) * 0.12), S);              // a slight bank when steering
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const W = lw / S;                                             // one screen-ish pixel in ship units

  flame(ctx, E, thrust, boost, t, W);
  engine(ctx, E, W);
  thrusters(ctx, R, hw, steer, t, W, "under");
  hull(ctx, H, W);
  tank(ctx, K, hw, W);
  thrusters(ctx, R, hw, steer, t, W, "over");
  cockpit(ctx, hv, W);
  ctx.restore();
}

/* ---------- pieces ---------- */
function outline(ctx, half, close = true) {
  ctx.beginPath();
  half.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = half.length - 1; i >= 0; i--) { const [x, y] = half[i]; if (x !== 0 || i === 0) ctx.lineTo(-x, y); }
  if (close) ctx.closePath();
}
function glowStroke(ctx, color, W, k = 1) {
  ctx.globalAlpha = 0.22; ctx.strokeStyle = color; ctx.lineWidth = W * 4 * k; ctx.stroke();
  ctx.globalAlpha = 1; ctx.strokeStyle = LINE; ctx.lineWidth = W * 1.15 * k; ctx.stroke();
}
function bodyFill(ctx, top, body) {
  const g = ctx.createLinearGradient(-0.3, -0.5, 0.3, 0.4);
  g.addColorStop(0, top); g.addColorStop(1, body);
  return g;
}
function hull(ctx, H, W) {
  const v = H.look.variant, half = HULL[v];
  outline(ctx, half);
  ctx.fillStyle = bodyFill(ctx, mix(H.look.body, "#3a4c7a", 0.55), H.look.body); ctx.fill();
  glowStroke(ctx, H.look.plate, W);
  ctx.strokeStyle = H.look.plate; ctx.lineWidth = W;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  if (v === "scout") {                                         // a spine and two chevrons
    ctx.moveTo(0, -0.3); ctx.lineTo(0, 0.34);
    for (const y of [0.02, 0.16]) { ctx.moveTo(-0.08, y + 0.06); ctx.lineTo(0, y); ctx.lineTo(0.08, y + 0.06); }
  } else if (v === "frigate") {                                // panel seams and a dorsal stripe
    ctx.moveTo(-0.1, -0.12); ctx.lineTo(0.1, -0.12);
    ctx.moveTo(-0.17, 0.1); ctx.lineTo(0.17, 0.1);
    ctx.moveTo(-0.08, -0.3); ctx.lineTo(-0.2, 0.28); ctx.moveTo(0.08, -0.3); ctx.lineTo(0.2, 0.28);
  } else {                                                     // armour bands
    for (const [y, x] of [[-0.24, 0.2], [-0.06, 0.25], [0.12, 0.26], [0.28, 0.21]]) { ctx.moveTo(-x, y); ctx.lineTo(x, y); }
  }
  ctx.stroke(); ctx.globalAlpha = 1;
  if (v === "bulwark") {                                       // rivets on the armour
    ctx.fillStyle = H.look.plate;
    for (const y of [-0.15, 0.03, 0.2]) for (const x of [-0.18, -0.06, 0.06, 0.18]) { ctx.beginPath(); ctx.arc(x, y, W * 1.1, 0, 7); ctx.fill(); }
  }
}
function cockpit(ctx, v, W) {
  ctx.beginPath();
  if (v === "scout") ctx.ellipse(0, -0.28, 0.035, 0.1, 0, 0, 7);
  else if (v === "frigate") ctx.ellipse(0, -0.24, 0.07, 0.07, 0, 0, 7);
  else { ctx.rect(-0.09, -0.33, 0.18, 0.04); }
  const g = ctx.createLinearGradient(0, -0.38, 0, -0.18);
  g.addColorStop(0, "#c9f4ff"); g.addColorStop(1, "#2a6a8f");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = W; ctx.stroke();
}
function engine(ctx, E, W) {
  const v = E.look.variant;
  ctx.fillStyle = mix(E.look.metal, "#0b1126", 0.55); ctx.strokeStyle = LINE; ctx.lineWidth = W;
  if (v === "ion") {                                           // twin small round nozzles
    for (const x of [-0.055, 0.055]) { ctx.beginPath(); ctx.rect(x - 0.03, 0.34, 0.06, 0.07); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, 0.41, 0.032, 0.012, 0, 0, 7); ctx.stroke(); }
  } else if (v === "chem") {                                   // one big bell
    ctx.beginPath(); ctx.moveTo(-0.06, 0.34); ctx.lineTo(0.06, 0.34); ctx.lineTo(0.11, 0.48); ctx.lineTo(-0.11, 0.48); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.085, 0.42); ctx.lineTo(0.085, 0.42); ctx.strokeStyle = FAINT; ctx.stroke();
  } else {                                                     // an annular torch with coil bands
    ctx.beginPath(); ctx.rect(-0.075, 0.33, 0.15, 0.1); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = E.look.flame[1]; ctx.globalAlpha = 0.8;
    for (const y of [0.355, 0.38, 0.405]) { ctx.beginPath(); ctx.moveTo(-0.075, y); ctx.lineTo(0.075, y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = LINE;
    ctx.beginPath(); ctx.ellipse(0, 0.44, 0.08, 0.022, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0.44, 0.04, 0.011, 0, 0, 7); ctx.stroke();
  }
}
function flame(ctx, E, thrust, boost, t, W) {
  const v = E.look.variant, [core, edge] = E.look.flame;
  const flick = 0.9 + 0.1 * Math.sin(t * 38) + 0.05 * Math.sin(t * 91);
  const L = (0.12 + 0.3 * thrust + 0.28 * boost) * flick;
  ctx.globalCompositeOperation = "lighter";
  const plume = (x, y, w, len) => {
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, core); g.addColorStop(0.35, edge); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.9, y + len * 0.4, x, y + len); ctx.quadraticCurveTo(x + w * 0.9, y + len * 0.4, x + w, y); ctx.closePath(); ctx.fill();
  };
  if (v === "ion") { plume(-0.055, 0.41, 0.022, L * 1.15); plume(0.055, 0.41, 0.022, L * 1.15); }
  else if (v === "chem") plume(0, 0.48, 0.1, L);
  else {
    plume(0, 0.44, 0.07, L * 1.05);
    ctx.strokeStyle = core; ctx.lineWidth = W * 1.2; ctx.globalAlpha = 0.7;   // shock diamonds in the plasma
    for (let i = 1; i <= 3; i++) { const y = 0.44 + (L * i) / 4.2, w = 0.04 * (1 - i / 4); ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(0, y + 0.02); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = "source-over";
}
function thrusters(ctx, R, hw, steer, t, W, layer) {
  const v = R.look.variant, c = R.look.color;
  ctx.strokeStyle = LINE; ctx.lineWidth = W;
  if (v === "fins" && layer === "under") {                     // swept tail fins that lean into a turn
    for (const s of [-1, 1]) {
      const lean = -steer * s * 0.03;
      ctx.beginPath(); ctx.moveTo(s * hw * 0.7, 0.12); ctx.lineTo(s * (hw + 0.17), 0.42 + lean); ctx.lineTo(s * (hw + 0.1), 0.45 + lean); ctx.lineTo(s * hw * 0.6, 0.34); ctx.closePath();
      ctx.fillStyle = mix(c, "#0b1126", 0.7); ctx.fill(); glowStroke(ctx, c, W, 0.9);
    }
  }
  if (v === "pods" && layer === "under") {                     // pods on pylons, puffing against the turn
    for (const s of [-1, 1]) {
      const px = s * (hw + 0.16);
      ctx.beginPath(); ctx.moveTo(s * hw * 0.8, 0.02); ctx.lineTo(px, 0.04); ctx.strokeStyle = FAINT; ctx.lineWidth = W * 2; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(px - 0.035, -0.06, 0.07, 0.2, 0.035); ctx.fillStyle = mix(c, "#0b1126", 0.72); ctx.fill(); ctx.lineWidth = W; glowStroke(ctx, c, W, 0.9);
      if (steer * s < -0.1) puff(ctx, px + s * 0.05, 0.02, s, c, t);
    }
  }
  if (v === "vanes" && layer === "over") {                     // forward canards plus vector paddles by the nozzle
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 0.04, -0.22); ctx.lineTo(s * (hw + 0.12), -0.1 - steer * s * 0.03); ctx.lineTo(s * (hw + 0.1), -0.05); ctx.lineTo(s * 0.06, -0.12); ctx.closePath();
      ctx.fillStyle = mix(c, "#0b1126", 0.68); ctx.fill(); glowStroke(ctx, c, W, 0.9);
      ctx.save(); ctx.translate(s * 0.13, 0.44); ctx.rotate(steer * 0.35);
      ctx.beginPath(); ctx.rect(-0.012, -0.05, 0.024, 0.1); ctx.fillStyle = mix(c, "#0b1126", 0.5); ctx.fill(); ctx.strokeStyle = LINE; ctx.stroke(); ctx.restore();
    }
  }
}
function puff(ctx, x, y, s, c, t) {
  ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = c;
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.35 - i * 0.1; ctx.beginPath(); ctx.arc(x + s * i * 0.03, y + Math.sin(t * 40 + i) * 0.005, 0.014 + i * 0.008, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}
function tank(ctx, K, hw, W) {
  const v = K.look.variant;
  const can = (x, y, w, h) => {
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, w / 2);
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, mix(K.look.color, "#0b1126", 0.35)); g.addColorStop(0.45, K.look.color); g.addColorStop(1, mix(K.look.color, "#0b1126", 0.6));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = W; ctx.stroke();
    ctx.strokeStyle = K.look.stripe; ctx.lineWidth = W * 2;
    const n = h > 0.3 ? 3 : 1;
    for (let i = 1; i <= n; i++) { const yy = y - h / 2 + (h * i) / (n + 1); ctx.beginPath(); ctx.moveTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy); ctx.stroke(); }
  };
  if (v === "compact") {                                       // a small sphere on the back
    ctx.beginPath(); ctx.arc(0, 0.12, 0.06, 0, 7);
    const g = ctx.createRadialGradient(-0.02, 0.1, 0, 0, 0.12, 0.06); g.addColorStop(0, "#ffffff"); g.addColorStop(1, mix(K.look.color, "#0b1126", 0.5));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = W; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.06, 0.12); ctx.lineTo(0.06, 0.12); ctx.strokeStyle = K.look.stripe; ctx.lineWidth = W * 2; ctx.stroke();
  } else if (v === "saddle") {                                 // twin tanks along the flanks
    for (const s of [-1, 1]) can(s * (hw * 0.62 + 0.035), 0.1, 0.07, 0.3);
  } else {                                                     // one long tank down the spine, past the tail
    can(0, 0.12, 0.11, 0.46);
  }
}
// blend two hex colours (k = share of b)
function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",")})`;
}
