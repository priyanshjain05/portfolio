// Realistic sky rendering: prerendered sprites for galaxies, planets, the sun, nebulae and the Milky Way,
// plus small helpers to draw stars. Everything shares one palette so the universe reads as one place.

export function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const TAU = Math.PI * 2;
const gauss = (rnd) => (rnd() + rnd() + rnd() + rnd() - 2) * 1.732;   // ≈ unit normal

// ---------- noise ----------
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, s, oct = 5) { let f = 0, amp = 0.5, fr = 1; for (let i = 0; i < oct; i++) { f += amp * vnoise(x * fr, y * fr, s + i * 17); fr *= 2.03; amp *= 0.5; } return f; }

// ---------- stars ----------
// rough main-sequence colour mix (O/B blue-white through K/M orange)
const STAR_RGB = [[155, 176, 255], [175, 196, 255], [205, 218, 255], [248, 247, 255], [255, 243, 230], [255, 214, 168], [255, 196, 120]];
const STAR_W = [0.03, 0.08, 0.16, 0.26, 0.24, 0.15, 0.08];
export function starRgb(rnd) { let x = rnd(); for (let i = 0; i < STAR_W.length; i++) { x -= STAR_W[i]; if (x <= 0) return STAR_RGB[i]; } return STAR_RGB[3]; }
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// a star: soft glow, hard core, and (for bright ones) four faint diffraction spikes
export function drawStar(ctx, x, y, size, rgb, alpha = 1, spikes = 0) {
  if (alpha <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
  g.addColorStop(0, rgba(rgb, 0.55 * alpha)); g.addColorStop(0.25, rgba(rgb, 0.16 * alpha)); g.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = g; ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, size * 0.55), 0, TAU); ctx.fill();
  if (spikes > 0) {
    const L = size * 9 * spikes;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const lg = ctx.createLinearGradient(x - dx * L, y - dy * L, x + dx * L, y + dy * L);
      lg.addColorStop(0, rgba(rgb, 0)); lg.addColorStop(0.5, rgba(rgb, 0.5 * alpha)); lg.addColorStop(1, rgba(rgb, 0));
      ctx.strokeStyle = lg; ctx.lineWidth = Math.max(0.6, size * 0.22);
      ctx.beginPath(); ctx.moveTo(x - dx * L, y - dy * L); ctx.lineTo(x + dx * L, y + dy * L); ctx.stroke();
    }
  }
}

// ---------- galaxies ----------
// morphology: flat (cos of inclination), tilt (position angle), arms, twist (pitch), bar (bar half-length), edge (edge-on dust lane)
export function galaxySprite({ seed, size, flat, tilt, arms = 2, twist = 2.4, bar = 0, edge = false, density = 1 }) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d");
  const c = size / 2, R = size * 0.46, px = size / 1300, rnd = mulberry(seed);
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const P = (u, v) => { const y = v * flat; return [c + (u * ct - y * st) * R, c + (u * st + y * ct) * R]; };
  const r0 = bar > 0 ? bar : 0.08;
  const theta = (r, arm) => (arm / arms) * TAU + twist * Math.log(Math.max(r, r0) / r0);
  // 1. diffuse light of the disk and the bulge
  g.save(); g.translate(c, c); g.rotate(tilt); g.scale(1, flat);
  let gr = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.08);
  gr.addColorStop(0, "rgba(255,232,200,.6)"); gr.addColorStop(0.14, "rgba(240,225,210,.32)"); gr.addColorStop(0.42, "rgba(185,198,235,.13)"); gr.addColorStop(0.75, "rgba(160,180,235,.04)"); gr.addColorStop(1, "rgba(150,170,230,0)");
  g.fillStyle = gr; g.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 2.2);
  g.restore();
  g.save(); g.translate(c, c); g.rotate(tilt); g.scale(1, Math.max(flat, 0.72));
  gr = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.26);
  gr.addColorStop(0, "rgba(255,238,205,.85)"); gr.addColorStop(0.35, "rgba(255,220,180,.35)"); gr.addColorStop(1, "rgba(255,210,170,0)");
  g.fillStyle = gr; g.fillRect(-R * 0.3, -R * 0.3, R * 0.6, R * 0.6);
  g.restore();
  g.globalCompositeOperation = "lighter";
  const dot = (x, y, s, col, a) => { g.fillStyle = rgba(col, a); g.fillRect(x - s / 2, y - s / 2, s, s); };
  const soft = (x, y, s, col, a) => { const q = g.createRadialGradient(x, y, 0, x, y, s); q.addColorStop(0, rgba(col, a)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(x - s, y - s, s * 2, s * 2); };
  const N = Math.round(26000 * density);
  // 2. arm stars (young, blue-white), with a faint glow pass for smoothness
  for (let i = 0; i < N * 1.3; i++) {
    const arm = i % arms, r = r0 + (1 - r0) * Math.pow(rnd(), 0.8);
    // arms are clumpy: brightness wanders along each arm
    if (rnd() > 0.35 + 0.9 * fbm(r * 7, arm * 3.1, seed, 3)) continue;
    const sig = 0.34 * (1.12 - r) + 0.1;
    const a = theta(r, arm) + gauss(rnd) * sig, rr = r + gauss(rnd) * 0.05;
    const [x, y] = P(Math.cos(a) * rr, Math.sin(a) * rr);
    const col = rnd() < 0.78 ? [196, 212, 255] : [255, 238, 222];
    dot(x, y, (0.8 + rnd() * 1.0) * px * 1.6, col, 0.1 + rnd() * 0.24);
    if (i % 5 === 0) dot(x, y, 10 * px, col, 0.022);
  }
  // 3. the older disk between the arms (warmer, fainter)
  for (let i = 0; i < N * 0.9; i++) {
    const r = Math.min(1.05, -Math.log(1 - rnd() * 0.95) * 0.3), a = rnd() * TAU;
    const [x, y] = P(Math.cos(a) * r, Math.sin(a) * r);
    dot(x, y, (0.6 + rnd() * 0.8) * px * 1.5, [245, 230, 212], 0.07 + rnd() * 0.14);
    if (i % 6 === 0) dot(x, y, 9 * px, [245, 230, 212], 0.015);
  }
  // 4. bulge and bar (old, warm)
  for (let i = 0; i < N * 0.35; i++) {
    let u, v;
    if (bar > 0 && i % 2) { u = (rnd() * 2 - 1) * bar; v = gauss(rnd) * 0.035; }
    else { const r = Math.abs(gauss(rnd)) * 0.11, a = rnd() * TAU; u = Math.cos(a) * r; v = (Math.sin(a) * r * Math.max(flat, 0.72)) / flat; }
    const [x, y] = P(u, v);
    dot(x, y, (0.7 + rnd() * 0.8) * px * 1.6, [255, 226, 190], 0.25 + rnd() * 0.3);
  }
  // 5. young clusters and pink star-forming knots along the arms
  for (let i = 0; i < 260 * density; i++) {
    const arm = i % arms, r = r0 + 0.08 + (0.9 - r0) * rnd(), a = theta(r, arm) + gauss(rnd) * 0.05;
    const [x, y] = P(Math.cos(a) * r, Math.sin(a) * r);
    for (let j = 0; j < 6; j++) dot(x + gauss(rnd) * 5 * px, y + gauss(rnd) * 5 * px, (1.2 + rnd()) * px * 1.5, [185, 205, 255], 0.55);
    if (rnd() < 0.55) soft(x + 6 * px, y, (5 + rnd() * 6) * px, [255, 120, 165], 0.32);
  }
  g.globalCompositeOperation = "source-over";
  // 6. dust: dark lanes on the inner edge of each arm, and a midplane lane when seen edge-on
  for (let i = 0; i < N * 0.42; i++) {
    const arm = i % arms, r = r0 + 0.03 + (0.95 - r0) * Math.pow(rnd(), 0.9);
    if (rnd() > 0.3 + 0.9 * fbm(r * 9 + 4, arm * 2.3, seed + 2, 3)) continue;
    const a = theta(r, arm) - 0.16 + gauss(rnd) * 0.09;
    const [x, y] = P(Math.cos(a) * r, Math.sin(a) * r);
    g.fillStyle = `rgba(14,9,8,${0.025 + rnd() * 0.04})`; const s = (3 + rnd() * 5) * px * 1.6; g.fillRect(x - s / 2, y - s / 2, s, s);
  }
  if (edge) {
    for (let i = 0; i < N * 0.5; i++) {
      const u = (rnd() * 2 - 1) * 0.92 * Math.sqrt(rnd()), w = gauss(rnd) * 0.018;
      const [x, y] = P(u, 0); const [nx, ny] = [-st, ct];
      g.fillStyle = `rgba(12,8,7,${0.08 + rnd() * 0.08})`; const s = (2 + rnd() * 3.5) * px * 1.6;
      g.fillRect(x + nx * w * R - s / 2, y + ny * w * R - s / 2, s, s);
    }
  }
  // 7. a bright, small nucleus
  g.globalCompositeOperation = "lighter";
  gr = g.createRadialGradient(c, c, 0, c, c, R * 0.05);
  gr.addColorStop(0, "rgba(255,250,235,.95)"); gr.addColorStop(1, "rgba(255,235,205,0)");
  g.fillStyle = gr; g.fillRect(c - R * 0.06, c - R * 0.06, R * 0.12, R * 0.12);
  return { canvas: cv, size, R, P: (u, v) => { const [x, y] = P(u, v); return [(x - c) / R, (y - c) / R]; }, armPoint: (r, arm, off = 0) => { const a = theta(r, arm) + off; return [Math.cos(a) * r, Math.sin(a) * r]; } };
}

// ---------- planets ----------
const PLANET_STYLE = {
  rocky: (lon, lat, s) => { const n = fbm(lon * 3, lat * 3, s, 5), m = fbm(lon * 9, lat * 9, s + 5, 3); const k = 0.55 + n * 0.6 - (m > 0.62 ? 0.18 : 0); return [176 * k, 98 * k, 66 * k]; },
  ocean: (lon, lat, s) => {
    const land = fbm(lon * 2.2, lat * 2.2, s, 5), cloud = fbm(lon * 4 + 7, lat * 6, s + 9, 5);
    let c = land > 0.56 ? [96 + land * 60, 118 + land * 40, 72] : [26, 72 + land * 60, 150 + land * 50];
    if (Math.abs(lat) > 1.25) c = [225, 232, 240];
    const cl = Math.max(0, (cloud - 0.5) * 2.4); return c.map((v) => v * (1 - cl) + 238 * cl);
  },
  gas: (lon, lat, s) => {
    const turb = fbm(lon * 2, lat * 8, s, 4) * 0.6, b = Math.sin(lat * 9 + turb * 4);
    const t = (b + 1) / 2; const c1 = [222, 196, 160], c2 = [168, 116, 80], c3 = [240, 226, 205];
    const c = t > 0.66 ? c3 : t > 0.33 ? c1 : c2; const k = 0.9 + fbm(lon * 6, lat * 20, s + 3, 3) * 0.2; return c.map((v) => v * k);
  },
  ice: (lon, lat, s) => { const b = Math.sin(lat * 5 + fbm(lon * 2, lat * 4, s, 3) * 1.5) * 0.06; return [150 * (1 + b), 210 * (1 + b), 226 * (1 + b)]; },
};
export function planetTexture(kind, size, seed) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d"), img = g.createImageData(size, size), r = size / 2;
  const f = PLANET_STYLE[kind];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + 0.5 - r) / r, ny = (y + 0.5 - r) / r, d2 = nx * nx + ny * ny;
    const i = (y * size + x) * 4;
    if (d2 > 1) { img.data[i + 3] = 0; continue; }
    const nz = Math.sqrt(1 - d2), lat = Math.asin(ny) * 1.0, lon = Math.atan2(nx, nz);
    const col = f(lon, lat, seed), limb = 0.55 + 0.45 * nz;
    img.data[i] = Math.min(255, col[0] * limb); img.data[i + 1] = Math.min(255, col[1] * limb); img.data[i + 2] = Math.min(255, col[2] * limb);
    img.data[i + 3] = d2 > 0.985 ? 255 * (1 - (d2 - 0.985) / 0.015) : 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}
// a lit planet: texture, then the night side away from the star, then a thin atmosphere on the lit limb
export function drawPlanet(ctx, tex, x, y, r, sunAng, { atmo = null, ring = null } = {}) {
  const ringPart = (front) => {
    if (!ring) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ring.tilt);
    for (const [k, a] of [[1.55, 0.35], [1.75, 0.5], [1.95, 0.25], [2.15, 0.18]]) {
      ctx.strokeStyle = `rgba(${ring.c},${a})`; ctx.lineWidth = Math.max(0.6, r * 0.12);
      ctx.beginPath(); ctx.ellipse(0, 0, r * k, r * k * 0.26, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
    }
    ctx.restore();
  };
  ringPart(false);
  ctx.drawImage(tex, x - r, y - r, r * 2, r * 2);
  const dx = Math.cos(sunAng), dy = Math.sin(sunAng);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r + 0.3, 0, TAU); ctx.clip();
  const sh = ctx.createLinearGradient(x + dx * r, y + dy * r, x - dx * r, y - dy * r);
  sh.addColorStop(0, "rgba(2,3,8,0)"); sh.addColorStop(0.42, "rgba(2,3,8,0)"); sh.addColorStop(0.6, "rgba(2,3,8,.82)"); sh.addColorStop(1, "rgba(2,3,8,.96)");
  ctx.fillStyle = sh; ctx.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);
  ctx.restore();
  if (atmo) {
    ctx.strokeStyle = `rgba(${atmo},0.55)`; ctx.lineWidth = Math.max(0.8, r * 0.09);
    ctx.beginPath(); ctx.arc(x, y, r, sunAng - 1.25, sunAng + 1.25); ctx.stroke();
  }
  ringPart(true);
}

// ---------- the sun ----------
export function sunSprite(size) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d"), c = size / 2, rnd = mulberry(77);
  let gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0, "rgba(255,248,235,1)"); gr.addColorStop(0.035, "rgba(255,244,220,1)"); gr.addColorStop(0.06, "rgba(255,214,150,.55)");
  gr.addColorStop(0.16, "rgba(255,180,110,.16)"); gr.addColorStop(0.45, "rgba(255,160,100,.04)"); gr.addColorStop(1, "rgba(255,150,100,0)");
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 180; i++) {
    const a = rnd() * TAU, L = c * (0.08 + Math.pow(rnd(), 3) * 0.4);
    const lg = g.createLinearGradient(c, c, c + Math.cos(a) * L, c + Math.sin(a) * L);
    lg.addColorStop(0, "rgba(255,225,180,.10)"); lg.addColorStop(1, "rgba(255,225,180,0)");
    g.strokeStyle = lg; g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * L, c + Math.sin(a) * L); g.stroke();
  }
  return cv;
}

// ---------- nebulae and the Milky Way ----------
export function nebulaSprite(size, seed, rgb, alpha) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d"), img = g.createImageData(size, size), r = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x - r) / r, ny = (y - r) / r, d = Math.sqrt(nx * nx + ny * ny);
    const fall = Math.max(0, 1 - d) ** 1.6;
    const n = fbm(nx * 2.4 + 9, ny * 2.4 + 3, seed, 6), m = fbm(nx * 5, ny * 5, seed + 3, 4);
    const v = Math.max(0, n - 0.38) * 2.2 * fall * (0.7 + m * 0.6);
    const i = (y * size + x) * 4;
    img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = Math.min(255, v * 255 * alpha);
  }
  g.putImageData(img, 0, 0);
  return cv;
}
// a broad band of unresolved stars with dust, sized to cover the view plus a margin for parallax
export function milkyWay(w, h, seed = 3) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const q = 4, sw = Math.ceil(w / q), sh = Math.ceil(h / q);
  const small = document.createElement("canvas"); small.width = sw; small.height = sh;
  const sg = small.getContext("2d"), img = sg.createImageData(sw, sh);
  const ang = -0.38, ca = Math.cos(ang), sa = Math.sin(ang), band = Math.max(w, h) * 0.14;
  const dens = (x, y) => { const d = (-(x - w / 2) * sa + (y - h * 0.48) * ca) / band; return Math.exp(-d * d); };
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const X = x * q, Y = y * q, d = dens(X, Y);
    const n = fbm(X / 260, Y / 260, seed, 5), dust = fbm(X / 140 + 4, Y / 140, seed + 7, 5);
    let v = d * (0.35 + n * 0.9);
    const lane = Math.max(0, dust - 0.5) * 2.6 * d;
    v *= 1 - Math.min(0.85, lane);
    const i = (y * sw + x) * 4, warm = 0.5 + 0.5 * d;
    img.data[i] = 205 + 40 * warm; img.data[i + 1] = 200 + 25 * warm; img.data[i + 2] = 225 - 15 * warm; img.data[i + 3] = Math.min(255, v * 34);
  }
  sg.putImageData(img, 0, 0);
  g.imageSmoothingQuality = "high"; g.drawImage(small, 0, 0, w, h);
  // unresolved stars, thicker toward the band's spine
  const rnd = mulberry(seed * 13 + 1);
  for (let i = 0; i < 52000; i++) {
    const x = rnd() * w, y = rnd() * h, d = dens(x, y);
    if (rnd() > d * 0.9 + 0.04) continue;
    const c = starRgb(rnd);
    g.fillStyle = rgba(c, 0.18 + rnd() * 0.42 * d); const s = rnd() < 0.97 ? 0.8 : 1.4; g.fillRect(x, y, s, s);
  }
  return cv;
}
