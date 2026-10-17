// Generates the static, crawlable HTML for the site from assets/content.js.
//   node tools/build.mjs
// It rewrites only the regions of index.html between <!-- gen:NAME --> and <!-- /gen:NAME -->,
// and writes sitemap.xml and robots.txt. Everything a text-only fetch, a search engine or a screen
// reader needs (name, tagline, target line, projects, experience, skills, links) ends up in the page source.
import { readFileSync, writeFileSync } from "node:fs";
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
${SECTIONS.map((s) => `    <li><a href="#/${s.id}" data-sec-link="${s.id}">${esc(s.label)}</a></li>`).join("\n")}
    <li><a href="${esc(SITE.resume)}" target="_blank" rel="noopener">Resume (PDF)</a></li>
  </ul>
</nav>
<p class="h-explore"><a class="linkish" href="#/explore">Explore the universe →</a> <span>An optional map of the same work</span></p>
`;
}

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

const thumb = (p) => p.image
  ? `<img src="${esc(p.image)}" alt="" loading="lazy">`
  : `<span class="glyph" aria-hidden="true">${esc(p.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2))}</span>`; // TODO(image): no image yet for this project
const media = (p) => p.figure
  ? `<div class="fig-mount" data-figure="${esc(p.figure)}"><p class="fig-fallback">Interactive illustration of the concept. Turn on JavaScript to see it.</p></div>`
  : p.image
    ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
    : `<div class="img-coming" role="img" aria-label="Image coming"><span>Image coming</span></div>`; // TODO(image): add assets/work/<slug>.jpg and set image in content.js

function card(p) {
  const c = cat(p.category);
  const cats = [p.featured ? "featured" : "", p.category].filter(Boolean).join(" ");
  return `<li data-cats="${cats}"><a class="card" href="#/work/${p.slug}" style="--c:${c.color}">
  <span class="thumb">${thumb(p)}</span>
  <span class="c-body"><span class="c-top"><span class="status ${statusClass(p.status)}">${esc(p.status)}</span>${p.award ? `<span class="award">${esc(p.award)}</span>` : ""}<span class="c-cat">${esc(c.short)}</span></span>
  <b class="c-name">${esc(p.name)}</b>
  <span class="c-one">${esc(p.oneLiner)}</span>${p.outcome ? `\n  <span class="c-out">${esc(p.outcome)}</span>` : ""}</span>
</a></li>`;
}

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

function panels() {
  const filters = [{ id: "featured", label: "Featured", n: featured.length }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.short, n: PROJECTS.filter((p) => p.category === c.id).length }))];
  const work = `<section class="sec" id="sec-work" data-sec="work" aria-labelledby="sec-work-h" hidden>
  <h3 class="sr" id="sec-work-h">Work</h3>
  <div class="work-list" data-list>
    <div class="chips" role="tablist" aria-label="Filter projects">${filters.map((f, i) => `<button type="button" role="tab" class="chip" data-filter="${f.id}" aria-selected="${i === 0}">${esc(f.label)} <span>${f.n}</span></button>`).join("")}</div>
    <ul class="cards">
${ORDER.map(card).join("\n")}
    </ul>
  </div>
${ORDER.map(caseView).join("\n")}
</section>`;
  const experience = `<section class="sec" id="sec-experience" data-sec="experience" aria-labelledby="sec-experience-h" hidden>
  <h3 class="sr" id="sec-experience-h">Experience</h3>
  <div class="exp-list" data-list>
    <ul class="stats" aria-label="Highlights">${STATS.map(([n, l]) => `<li><b>${esc(n)}</b><span>${esc(l)}</span></li>`).join("")}</ul>
    <ol class="timeline">
${newestFirst.map((e) => `      <li><a class="role" href="#/experience/${e.id}" style="--c:${e.color}"><span class="r-when">${esc(e.when)}</span><span class="r-main"><b>${esc(e.org)}</b><span class="r-role">${esc(e.role)}</span></span><span class="r-metric">${esc(e.headline)}</span><span class="r-more">All details →</span></a></li>`).join("\n")}
    </ol>
  </div>
${newestFirst.map(roleDetail).join("\n")}
</section>`;
  const skills = `<section class="sec" id="sec-skills" data-sec="skills" aria-labelledby="sec-skills-h" hidden>
  <h3 class="sr" id="sec-skills-h">Skills</h3>
  <div class="skill-grid">
${SKILLS.map((g) => `    <section class="skill" style="--c:${g.color}" aria-label="${esc(g.name)}"><h4><i aria-hidden="true"></i>${esc(g.name)}</h4><ul class="tags">${g.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>`).join("\n")}
  </div>
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
  const contact = `<section class="sec" id="sec-contact" data-sec="contact" aria-labelledby="sec-contact-h" hidden>
  <h3 class="sr" id="sec-contact-h">Contact</h3>
  <div class="contact">
    <div class="contact-text">
      <p class="about-h">Let's build what comes next.</p>
      <p class="lead">${esc(SITE.target)}</p>
      <dl class="facts"><div><dt>Email</dt><dd><a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></dd></div><div><dt>LinkedIn</dt><dd><a href="${esc(SITE.linkedin)}" target="_blank" rel="noopener">${esc(SITE.linkedinLabel)}</a></dd></div><div><dt>Based in</dt><dd>New York, open to relocating</dd></div></dl>
      <ul class="actions">
        <li><button type="button" class="btn primary" data-copy="${esc(SITE.email)}">Copy email</button></li>
        <li><a class="btn" href="mailto:${esc(SITE.email)}">Email</a></li>
        <li><a class="btn" href="${esc(SITE.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></li>
        <li><a class="btn" href="${esc(SITE.resume)}" target="_blank" rel="noopener">Resume (PDF)</a></li>
      </ul>
      <p class="copied" role="status" aria-live="polite"></p>
    </div>
    <div class="fig-mount contact-fig" data-figure="comms" aria-hidden="true"></div>
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
