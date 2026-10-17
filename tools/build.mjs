// Generates the static, crawlable HTML for the site from assets/content.js.
//   node tools/build.mjs
// It rewrites only the regions of index.html between <!-- gen:NAME --> and <!-- /gen:NAME -->,
// and writes sitemap.xml and robots.txt. Everything a text-only fetch, a search engine or a screen
// reader needs (name, tagline, target line, projects, experience, skills, links) ends up in the page source.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, CATEGORIES, PROJECTS, EXPERIENCE, STATS, SKILLS, ABOUT } from "../assets/content.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cat = (id) => CATEGORIES.find((c) => c.id === id);
const statusClass = (s) => ({ "Shipped": "s-shipped", "In progress": "s-progress", "Concept": "s-concept" })[s] || "s-concept";
const orgShort = (o) => o.split(",")[0];
const newestFirst = [...EXPERIENCE].reverse();

// ---- section definitions shared by the station, the text menus and the panels ----
export const SECTIONS = [
  { id: "work", label: "Work", part: "Lab module", preview: `${PROJECTS.length} projects · strategy, AI, media, hardware` },
  { id: "experience", label: "Experience", part: "Solar arrays", preview: `${EXPERIENCE.length} roles · ${newestFirst.map((e) => orgShort(e.org)).join(", ")}` },
  { id: "skills", label: "Skills", part: "Observatory", preview: `${SKILLS.length} groups · ${SKILLS.map((g) => g.name).join(", ")}` },
  { id: "about", label: "About", part: "Crew quarters", preview: "NYU Stern · graduating Dec 2027" },
  { id: "contact", label: "Contact", part: "Comms dish", preview: "Email, LinkedIn and resume" },
];
const RESUME = { id: "resume", label: "Resume", part: "Docked ship", preview: "Opens the PDF" };

// ---- ordering: finished, outcome-heavy work leads; in-progress work never leads ----
const featured = PROJECTS.filter((p) => p.featured).sort((a, b) => a.featured - b.featured);
const rest = CATEGORIES.flatMap((c) => PROJECTS.filter((p) => p.category === c.id && !p.featured));
const ORDER = [...featured, ...rest];

function head() {
  const url = SITE.url, img = new URL(SITE.ogImage, url).href;
  const ld = {
    "@context": "https://schema.org", "@type": "Person", name: SITE.name, url, email: `mailto:${SITE.email}`,
    description: SITE.description, sameAs: [SITE.linkedin],
    affiliation: { "@type": "CollegeOrUniversity", name: "NYU Stern School of Business" },
  };
  return `
<title>${esc(SITE.title)}</title>
<meta name="description" content="${esc(SITE.description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(SITE.title)}">
<meta property="og:description" content="${esc(SITE.description)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`${SITE.name}: ${SITE.tagline}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(SITE.title)}">
<meta name="twitter:description" content="${esc(SITE.description)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
`;
}

function hero() {
  return `
<p class="h-kicker">${esc(SITE.kicker)}</p>
<h1 class="h-name" id="hero-name">${esc(SITE.name)}</h1>
<p class="h-tag">${esc(SITE.tagline)}</p>
<p class="h-target">${esc(SITE.target)}</p>
<ul class="h-cta" aria-label="Get in touch">
  <li><a class="btn primary" href="${esc(SITE.resume)}" target="_blank" rel="noopener">Resume (PDF)</a></li>
  <li><a class="btn" href="mailto:${esc(SITE.email)}">Email</a></li>
  <li><a class="btn" href="${esc(SITE.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></li>
</ul>
<nav class="h-nav" aria-label="Sections">
  <p class="h-nav-k" id="hnav-k">Open a section</p>
  <ul aria-labelledby="hnav-k">
${SECTIONS.filter((s) => HERO_LINKS.includes(s.id)).map((s) => `    <li><a href="#/${s.id}" data-sec-link="${s.id}">${esc(s.label)}</a></li>`).join("\n")}
  </ul>
</nav>
<p class="h-explore"><a class="linkish" href="#/explore">Explore the universe →</a> <span>An optional map of the same work</span></p>
`;
}

// the three section links under the hero (Resume, Email and LinkedIn are the buttons above; every section is on the station)
const HERO_LINKS = ["work", "experience", "skills"];

function hotspots() {
  const all = [...SECTIONS, RESUME];
  return all.map((s, i) => {
    const href = s.id === "resume" ? esc(SITE.resume) : `#/${s.id}`;
    const ext = s.id === "resume" ? ` target="_blank" rel="noopener"` : "";
    return `<a class="hot" href="${href}"${ext} data-part="${s.id}" aria-label="${esc(`${s.label}: ${s.part}. ${s.preview}`)}"><span class="hot-pin" aria-hidden="true"><span class="hot-num">${i + 1}</span></span><span class="hot-label"><b>${esc(s.label)}</b><small>${esc(s.preview)}</small></span></a>`;
  }).join("\n");
}

function tabbar() {
  const all = [...SECTIONS, RESUME];
  return all.map((s, i) => {
    const href = s.id === "resume" ? esc(SITE.resume) : `#/${s.id}`;
    const ext = s.id === "resume" ? ` target="_blank" rel="noopener"` : "";
    return `<li><a href="${href}"${ext} data-sec-link="${s.id}"><span class="tb-num" aria-hidden="true">${i + 1}</span>${esc(s.label)}</a></li>`;
  }).join("\n");
}

const media = (p) => p.figure
  ? `<div class="fig-mount" data-figure="${esc(p.figure)}"><p class="fig-fallback">Interactive illustration of the concept. Turn on JavaScript to see it.</p></div>`
  : p.image
    ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
    : `<div class="img-coming" role="img" aria-label="Image coming"><span>Image coming</span></div>`; // TODO(image): add assets/work/<slug>.jpg and set image in content.js

function caseView(p, i) {
  const c = cat(p.category), prev = ORDER[(i - 1 + ORDER.length) % ORDER.length], next = ORDER[(i + 1) % ORDER.length];
  const parts = [
    ["problem", p.problemLabel || "Problem", `<p>${esc(p.problem)}</p>`],
    ["did", "What I did", `<p>${esc(p.whatIDid)}</p>`],
    ...(p.result ? [["result", "Result", `<p>${esc(p.result)}</p>`]] : []),
    ["details", p.links.length ? "Tools & links" : "Tools", `<ul class="tags">${p.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>${p.links.length ? `<ul class="links">${p.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join("")}</ul>` : ""}`],
  ];
  return `<article class="case" id="work-${p.slug}" data-case="${p.slug}" aria-labelledby="h-${p.slug}" style="--c:${c.color}" hidden>
  <a class="back" href="#/work">← All work</a>
  <header class="case-head">
    <p class="case-kicker"><span class="status ${statusClass(p.status)}">${esc(p.status)}</span>${p.award ? `<span class="award">${esc(p.award)}</span>` : ""}<span>${esc(c.name)}</span></p>
    <h3 class="case-title" id="h-${p.slug}">${esc(p.name)}</h3>
    <p class="case-one">${esc(p.oneLiner)}</p>
    <p class="case-meta">${esc(p.meta)}</p>
  </header>
  <div class="case-grid">
    <figure class="case-media">${media(p)}</figure>
    <div class="case-text" data-fit>
      <div class="steps" role="tablist" aria-label="${esc(p.name)} sections">${parts.map(([k, l], j) => `<button type="button" role="tab" class="step" data-step="${k}" aria-selected="${j === 0}">${esc(l)}</button>`).join("")}</div>
${parts.map(([k, l, body]) => `      <section class="part" data-part="${k}"><h4>${esc(l)}</h4>${body}</section>`).join("\n")}
    </div>
  </div>
  <nav class="pager" aria-label="More projects"><a href="#/work/${prev.slug}">← ${esc(prev.name)}</a><a href="#/work/${next.slug}">${esc(next.name)} →</a></nav>
</article>`;
}

function roleDetail(e, i) {
  const prev = newestFirst[(i - 1 + newestFirst.length) % newestFirst.length], next = newestFirst[(i + 1) % newestFirst.length];
  const proj = e.project ? PROJECTS.find((p) => p.slug === e.project) : null;
  return `<article class="role-detail" id="exp-${e.id}" data-role="${e.id}" aria-labelledby="h-exp-${e.id}" style="--c:${e.color}" hidden>
  <a class="back" href="#/experience">← All roles</a>
  <header class="case-head"><p class="case-kicker"><span>${esc(e.when)}</span><span>${esc(e.where)}</span></p><h3 class="case-title" id="h-exp-${e.id}">${esc(e.org)}</h3><p class="case-one">${esc(e.role)}</p></header>
  <ul class="bullets">${e.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  ${proj ? `<p><a class="linkish" href="#/work/${proj.slug}">See the project: ${esc(proj.name)} →</a></p>` : ""}
  <nav class="pager" aria-label="More roles"><a href="#/experience/${prev.id}">← ${esc(orgShort(prev.org))}</a><a href="#/experience/${next.id}">${esc(orgShort(next.org))} →</a></nav>
</article>`;
}


// ---- list views: mission patches (work), a trajectory (experience), a star chart (skills) ----
const rand = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const f1 = (n) => Math.round(n * 10) / 10;
const STAR_RGB = ["#9bb0ff", "#afc4ff", "#cddaff", "#f8f7ff", "#fff3e6", "#ffd6a8", "#ffc478"];
const starColor = (r) => { const w = [0.03, 0.08, 0.16, 0.26, 0.24, 0.15, 0.08]; let x = r(); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return STAR_RGB[i]; } return STAR_RGB[3]; };

// an embroidered-style mission patch: stitched rim in the category colour, an orbit, the project's initials, a star per award
function patch(p, i) {
  const c = cat(p.category), r = rand(i * 97 + 13), id = `pt-${p.slug}`;
  const initials = esc(p.name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || p.name.slice(0, 2));
  const tilt = Math.round(-30 + r() * 60), dots = Array.from({ length: 7 }, () => { const a = r() * 6.283, d = 18 + r() * 22; return `<circle cx="${f1(60 + Math.cos(a) * d)}" cy="${f1(60 + Math.sin(a) * d)}" r="${f1(0.5 + r() * 0.8)}"/>`; }).join("");
  const art = p.image
    ? `<clipPath id="${id}-c"><circle cx="60" cy="60" r="40"/></clipPath><image href="${esc(p.image)}" x="20" y="20" width="80" height="80" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-c)"/>`
    : `<g class="pt-stars">${dots}</g><text x="60" y="66" class="pt-ini">${initials}</text>`;
  return `<svg class="pt" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs><radialGradient id="${id}-g" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${c.color}" stop-opacity=".34"/><stop offset=".55" stop-color="#0b1330"/><stop offset="1" stop-color="#050816"/></radialGradient></defs>
  <circle cx="60" cy="60" r="56" class="pt-rim"/><circle cx="60" cy="60" r="51.5" class="pt-stitch"/><circle cx="60" cy="60" r="47" fill="url(#${id}-g)" class="pt-face"/>
  ${art}<ellipse cx="60" cy="60" rx="46" ry="15" transform="rotate(${tilt} 60 60)" class="pt-orbit"/><circle cx="${f1(60 + Math.cos(((tilt + 200) * Math.PI) / 180) * 46 * 0.98)}" cy="${f1(60 + Math.sin(((tilt + 200) * Math.PI) / 180) * 15)}" r="2.6" class="pt-moon"/>
  ${p.award ? `<path class="pt-award" d="M60 0.8l2.9 6 6.5.9-4.7 4.6 1.1 6.5L60 15.7l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/>` : ""}</svg>`;
}
function patchItem(p, i) {
  const c = cat(p.category), cats = [p.featured ? "featured" : "", p.category].filter(Boolean).join(" ");
  return `<li data-cats="${cats}"><a class="mission" href="#/work/${p.slug}" style="--c:${c.color}">
  ${patch(p, i)}
  <span class="m-body"><span class="m-top"><span class="m-status ${statusClass(p.status)}">${esc(p.status)}</span>${p.award ? `<span class="m-award">★ ${esc(p.award)}</span>` : ""}</span>
  <b class="m-name">${esc(p.name)}</b>
  <span class="m-one">${esc(p.oneLiner)}</span>${p.outcome ? `\n  <span class="m-out">${esc(p.outcome)}</span>` : ""}</span>
</a></li>`;
}

// the experience trajectory: a rising transfer orbit, one waypoint per role, oldest on the left
function trajectory() {
  const roles = EXPERIENCE, n = roles.length, H = 128;
  // a burn that steepens: height grows faster with time, like a transfer orbit leaving its parking orbit
  const climb = (t) => f1(120 - 108 * Math.pow(t, 1.8));
  const ys = roles.map((_, i) => climb((i + 0.5) / n));
  const xs = roles.map((_, i) => ((i + 0.5) / n) * 1000);
  const pts = [[0, climb(0)], ...xs.map((x, i) => [x, ys[i]]), [1000, climb(1)]];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]} ${p2[1]}`;
  }
  const stats = `<ul class="telemetry" aria-label="Highlights">${STATS.map(([v, l]) => `<li><b>${esc(v)}</b><span>${esc(l)}</span></li>`).join("")}</ul>`;
  return `${stats}
    <div class="traj" style="--n:${n}">
      <svg class="traj-arc" viewBox="0 0 1000 ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="traj-path" d="${d}"/><path class="traj-glow" d="${d}"/></svg>
      <ol class="traj-list">
${roles.map((e, i) => `        <li style="--c:${e.color};--y:${ys[i]}px"${i === n - 1 ? ' class="latest"' : ""}><a class="wp" href="#/experience/${e.id}"><span class="wp-when">${esc(e.when)}</span><b class="wp-org">${esc(e.org)}</b><span class="wp-role">${esc(e.role)}</span><span class="wp-metric">${esc(e.headline)}</span><span class="wp-more">All details →</span></a></li>`).join("\n")}
      </ol>
    </div>`;
}

// the skills star chart: one constellation per group over a faint celestial grid, field stars and a band of haze
function starChart() {
  const W = 1000, H = 540, r = rand(4242);
  const BOX = [[24, 34], [524, 34], [24, 296], [524, 296]];
  const grid = [];
  for (let k = 1; k <= 5; k++) grid.push(`<ellipse cx="500" cy="${H + 380}" rx="${360 + k * 150}" ry="${300 + k * 120}"/>`);
  for (let k = -4; k <= 4; k++) grid.push(`<path d="M500 ${H + 380}L${f1(500 + k * 260)} -40"/>`);
  const field = Array.from({ length: 170 }, () => { const m = r(); return `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(0.35 + m * m * 1.2)}" fill="${starColor(r)}" opacity="${f1(0.25 + r() * 0.55)}"/>`; }).join("");
  const groups = SKILLS.map((g, gi) => {
    const [x0, y0] = BOX[gi], rr = rand(gi * 71 + 9), n = g.items.length, rows = Math.ceil(n / 2), rowH = Math.min(46, 200 / rows);
    const stars = g.items.map((name, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = x0 + 26 + col * 222 + (rr() - 0.5) * 26 + (row % 2 ? 14 : 0), y = y0 + 46 + row * rowH + (rr() - 0.5) * 12 + col * rowH * 0.42;
      return { name, x: f1(x), y: f1(y), m: i === 0 ? 3.4 : 1.6 + rr() * 1.3, c: i === 0 ? "#f8f7ff" : starColor(rr) };
    });
    // one chain: down the left column, across, and back up the right, like a real asterism with no crossings
    const left = stars.map((_, k) => k).filter((k) => k % 2 === 0), right = stars.map((_, k) => k).filter((k) => k % 2 === 1).reverse();
    const order = [...left, ...right];
    const edges = order.slice(1).map((k, i) => [order[i], k]);
    const lines = edges.map(([a, b]) => `<line x1="${stars[a].x}" y1="${stars[a].y}" x2="${stars[b].x}" y2="${stars[b].y}"/>`).join("");
    const body = stars.map((s, i) => `<g class="sc-star" style="--d:${f1(rr() * 4)}s"><circle class="sc-halo" cx="${s.x}" cy="${s.y}" r="${f1(s.m * 4.2)}" fill="url(#sc-h${STAR_RGB.indexOf(s.c) < 0 ? 3 : STAR_RGB.indexOf(s.c)})"/>${i === 0 ? `<path class="sc-spike" d="M${f1(s.x - s.m * 7)} ${s.y}H${f1(s.x + s.m * 7)}M${s.x} ${f1(s.y - s.m * 7)}V${f1(s.y + s.m * 7)}"/>` : ""}<circle cx="${s.x}" cy="${s.y}" r="${f1(s.m * 0.62)}" fill="#fff"/><text x="${f1(+s.x + 11 + s.m)}" y="${f1(+s.y + 5)}">${esc(s.name)}</text></g>`).join("");
    return `<g class="sc-con" style="--c:${g.color}"><text class="sc-name" x="${x0 + 6}" y="${y0 + 12}">${esc(g.name)}<tspan dx="10">${n} stars</tspan></text><g class="sc-lines">${lines}</g>${body}</g>`;
  }).join("");
  const halos = STAR_RGB.map((c, i) => `<radialGradient id="sc-h${i}"><stop offset="0" stop-color="${c}" stop-opacity=".6"/><stop offset=".22" stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join("");
  return `<svg class="starchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><defs>${halos}<radialGradient id="sc-band" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#9fb4ff" stop-opacity=".09"/><stop offset="1" stop-color="#9fb4ff" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="500" cy="270" rx="620" ry="120" transform="rotate(-18 500 270)" fill="url(#sc-band)"/><g class="sc-grid">${grid.join("")}</g><g class="sc-field">${field}</g>${groups}</svg>`;
}
// the same skills as text: a small sketch of each constellation, then its stars by name (the phone view, and what screen readers get)
function starList() {
  return `<div class="starlist">${SKILLS.map((g, gi) => {
    const rr = rand(gi * 71 + 9), n = g.items.length;
    const pts = g.items.map((_, i) => [f1(6 + (i / (n - 1)) * 44 + (rr() - 0.5) * 6), f1(8 + ((i % 3) / 2) * 20 + (rr() - 0.5) * 6)]);
    const sketch = `<svg class="sl-sketch" viewBox="0 0 56 36" aria-hidden="true" focusable="false"><polyline points="${pts.map((p) => p.join(",")).join(" ")}"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === 0 ? 2 : 1.3}"/>`).join("")}</svg>`;
    return `<section class="sl-group" style="--c:${g.color}" aria-label="${esc(g.name)}">${sketch}<div><h4>${esc(g.name)}</h4><ul>${g.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div></section>`;
  }).join("")}</div>`;
}

function panels() {
  const filters = [{ id: "featured", label: "Featured", n: featured.length }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.short, n: PROJECTS.filter((p) => p.category === c.id).length }))];
  const work = `<section class="sec" id="sec-work" data-sec="work" aria-labelledby="sec-work-h" hidden>
  <h3 class="sr" id="sec-work-h">Work</h3>
  <div class="work-list" data-list>
    <div class="chips" role="tablist" aria-label="Filter projects">${filters.map((f, i) => `<button type="button" role="tab" class="chip" data-filter="${f.id}" aria-selected="${i === 0}">${esc(f.label)} <span>${f.n}</span></button>`).join("")}</div>
    <ul class="missions">
${ORDER.map(patchItem).join("\n")}
    </ul>
  </div>
${ORDER.map(caseView).join("\n")}
</section>`;
  const experience = `<section class="sec" id="sec-experience" data-sec="experience" aria-labelledby="sec-experience-h" hidden>
  <h3 class="sr" id="sec-experience-h">Experience</h3>
  <div class="exp-list" data-list>
    ${trajectory()}
  </div>
${newestFirst.map(roleDetail).join("\n")}
</section>`;
  const skills = `<section class="sec" id="sec-skills" data-sec="skills" aria-labelledby="sec-skills-h" hidden>
  <h3 class="sr" id="sec-skills-h">Skills</h3>
  ${starChart()}
  ${starList()}
</section>`;
  const about = `<section class="sec" id="sec-about" data-sec="about" aria-labelledby="sec-about-h" hidden>
  <h3 class="sr" id="sec-about-h">About</h3>
  <div class="about">
    <img class="about-photo" src="${esc(ABOUT.photo)}" alt="Portrait of ${esc(SITE.name)}" width="560" height="560" loading="lazy">
    <div class="about-text">
      <p class="about-h">${esc(ABOUT.heading)}</p>
      <p class="lead">${esc(ABOUT.lead)}</p>
      <dl class="facts">${ABOUT.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    </div>
  </div>
</section>`;
  // contact: the details on the left, a three-step uplink form on the right. It has no server: transmitting
  // opens the visitor's email app with the message addressed and filled in.
  const TOPICS = ["PM internship", "Full-time role", "Project or collaboration", "Just saying hi"];
  const contact = `<section class="sec" id="sec-contact" data-sec="contact" aria-labelledby="sec-contact-h" hidden>
  <h3 class="sr" id="sec-contact-h">Contact</h3>
  <div class="contact">
    <div class="contact-text">
      <p class="ct-k">Open a channel</p>
      <p class="ct-h">Let's build what comes next.</p>
      <p class="lead">${esc(SITE.contactLead)}</p>
      <ul class="ct-links">
        <li><a href="mailto:${esc(SITE.email)}">${esc(SITE.email)} <span aria-hidden="true">→</span></a><button type="button" class="ct-copy" data-copy="${esc(SITE.email)}">Copy</button></li>
        <li><a href="${esc(SITE.linkedin)}" target="_blank" rel="noopener">LinkedIn <span aria-hidden="true">→</span></a></li>
      </ul>
      <p class="copied" role="status" aria-live="polite"></p>
    </div>
    <form class="uplink" id="uplink" novalidate aria-labelledby="ul-title">
      <header class="ul-head">
        <p class="ul-k"><i aria-hidden="true"></i>Uplink · channel open</p>
        <h4 class="ul-title" id="ul-title">Transmission</h4>
        <p class="ul-route"><span>To</span> ${esc(SITE.name)} <span>From</span> Your Station</p>
        <ol class="ul-steps" aria-label="Steps"><li aria-current="step">1. Call sign</li><li>2. Mission</li><li>3. Transmit</li></ol>
      </header>
      <div class="ul-body">
        <fieldset class="ul-step" data-step="1"><legend class="sr">Step 1 of 3: call sign</legend>
          <label class="ul-field"><span>Name</span><input name="name" autocomplete="name" required maxlength="80"></label>
          <label class="ul-field"><span>Email</span><input name="email" type="email" autocomplete="email" required maxlength="120"></label>
        </fieldset>
        <fieldset class="ul-step" data-step="2" hidden><legend class="sr">Step 2 of 3: mission</legend>
          <div class="ul-topics" role="radiogroup" aria-label="What it's about">${TOPICS.map((t, i) => `<label><input type="radio" name="topic" value="${esc(t)}"${i === 0 ? " checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div>
          <label class="ul-field"><span>Message</span><textarea name="message" rows="3" required maxlength="2000"></textarea></label>
        </fieldset>
        <fieldset class="ul-step" data-step="3" hidden><legend class="sr">Step 3 of 3: review and transmit</legend>
          <dl class="ul-review"><div><dt>From</dt><dd data-r="name"></dd></div><div><dt>Reply to</dt><dd data-r="email"></dd></div><div><dt>About</dt><dd data-r="topic"></dd></div><div><dt>Message</dt><dd data-r="message"></dd></div></dl>
          <p class="ul-note">Transmitting opens your email app with this message ready to send.</p>
        </fieldset>
        <div class="ul-sent" hidden><p class="ul-sent-h">Signal sent</p><p>Your email app should open with the message ready. If it didn't, copy it and send it to <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>.</p><div class="ul-nav"><button type="button" class="ul-btn ghost" data-copy-msg>Copy message</button><button type="button" class="ul-btn ghost" data-reset>New transmission</button></div></div>
        <p class="ul-error" role="alert"></p>
        <div class="ul-nav"><button type="button" class="ul-btn ghost ul-back" hidden>← Back</button><button type="submit" class="ul-btn ul-next">Next →</button></div>
      </div>
    </form>
  </div>
</section>`;
  return [work, experience, skills, about, contact].join("\n");
}

function sectionTabs() {
  return SECTIONS.map((s, i) => `<li><a href="#/${s.id}" data-tab="${s.id}"><span class="tb-num" aria-hidden="true">${i + 1}</span>${esc(s.label)}</a></li>`).join("");
}

// ---- write ----
const file = join(ROOT, "index.html");
let html = readFileSync(file, "utf8");
const put = (name, body) => {
  const re = new RegExp(`(<!-- gen:${name} -->)[\\s\\S]*?(<!-- /gen:${name} -->)`);
  if (!re.test(html)) throw new Error(`index.html is missing the gen:${name} markers`);
  html = html.replace(re, (_, a, b) => a + body + b);
};
put("head", head());
put("hero", hero());
put("hotspots", hotspots());
put("tabbar", tabbar());
put("tabs", sectionTabs());
put("panels", panels());
// every script gets a content fingerprint through an import map, so after a deploy a browser never mixes
// a fresh file with a stale cached one (GitHub Pages lets browsers cache files for ten minutes)
const scripts = [];
const walk = (dir) => { for (const f of readdirSync(join(ROOT, dir))) { const rel = `${dir}/${f}`; if (statSync(join(ROOT, rel)).isDirectory()) walk(rel); else if (/\.m?js$/.test(f)) scripts.push(rel); } };
walk("assets");
const stamp = (rel) => createHash("sha1").update(readFileSync(join(ROOT, rel))).digest("hex").slice(0, 10);
const imports = Object.fromEntries(scripts.sort().map((rel) => [`./${rel}`, `./${rel}?v=${stamp(rel)}`]));
put("importmap", `<script type="importmap">${JSON.stringify({ imports })}</script>${["assets/ui.js", "assets/space.js", "assets/fig/station.mjs"].map((rel) => `<link rel="modulepreload" href="${rel}?v=${stamp(rel)}">`).join("")}`);
put("entry", `<script type="module" src="assets/ui.js?v=${stamp("assets/ui.js")}"></script>`);
// the figure styles, inlined so they don't block the first paint as separate requests
put("isocss", "\n" + readFileSync(join(ROOT, "assets/kit/iso.css"), "utf8") + readFileSync(join(ROOT, "assets/fig/space-iso.css"), "utf8"));
// the station drawing, rendered here so the page doesn't spend a second building it on a phone
put("station", (await import("../assets/fig/station.mjs")).markup());
writeFileSync(file, html);

const routes = [""];
writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${SITE.url}${r}</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>`).join("\n")}
</urlset>
`);
writeFileSync(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}sitemap.xml\n`);
console.log(`built index.html (${PROJECTS.length} projects, ${EXPERIENCE.length} roles), sitemap.xml, robots.txt`);
