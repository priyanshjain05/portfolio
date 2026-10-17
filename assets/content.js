// ─────────────────────────────────────────────────────────────────────────────
// The single source of truth for the site. Every panel, the static HTML that
// search engines and screen readers read, and the universe all come from here.
//
// After editing, run:   node tools/build.mjs
// That rewrites the generated parts of index.html (meta tags, hero text, panels,
// structured data) and sitemap.xml. Never invent facts: if something is missing,
// leave the field empty ("" or []) and add a `// TODO:` note next to it.
// Images: put files in assets/work/ and set `image: "assets/work/<file>"`.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE = {
  name: "Priyansh Jain",
  kicker: "Product · Space · NYU Stern",
  tagline: "I build products for what comes next.",
  target: "Looking for PM internships and full-time roles, especially at space companies.",
  // the invitation in the Contact panel
  contactLead: "If you’re shaping product strategy, building something genuinely new, or working on a problem that doesn’t have an answer yet, I’d like to hear about it.",
  title: "Priyansh Jain · Product & Space Portfolio",
  description: "Priyansh Jain studies Business, Technology & Entrepreneurship at NYU Stern and builds products for what comes next. Looking for PM internships and full-time roles, especially at space companies.",
  url: "https://priyanshjain.info/",
  ogImage: "assets/og-image.png",
  email: "priyansh.jain@stern.nyu.edu",
  linkedin: "https://www.linkedin.com/in/priyanshjain05/",
  linkedinLabel: "in/priyanshjain05",
  resume: "assets/Priyansh_Jain_Resume.pdf",
};

// Project categories (each is also a galaxy in "Explore the universe").
export const CATEGORIES = [
  { id: "ps", num: "04", name: "Product, Design & Strategy", short: "Product & Strategy", color: "#7cf2b9" },
  { id: "ai", num: "01", name: "AI, Software & Startups", short: "AI & Startups", color: "#7fe3ff" },
  { id: "im", num: "02", name: "Interactive Media & Creative Tech", short: "Interactive Media", color: "#b69cff" },
  { id: "hw", num: "03", name: "Hardware & Fabrication", short: "Hardware", color: "#ffbf73" },
];

// status: "Shipped" (finished / delivered), "In progress", or "Concept".
// featured: order in the first Work view (finished, outcome-heavy work first). 0 = not featured.
export const PROJECTS = [
  {
    slug: "uber-av-strategy", name: "Uber AV Strategy", category: "ps", status: "Shipped", featured: 1, award: "1st place",
    oneLiner: "Uber Case Competition · Beta Alpha Psi",
    outcome: "1st place of 9 teams · $45M EBITDA projected",
    meta: "Competition · Team of 4 · Spring 2026",
    problem: "Where and how should Uber expand its autonomous-vehicle business following its Rivian partnership?",
    whatIDid: "Analyzed demand, infrastructure, the competitive landscape, and the EV ecosystem to find high-utilization corridors. Built the model comparing fleet structures, recommended a phased Atlanta launch on Rivian's R2 fleet, and presented to Uber Finance leadership.",
    result: "1st place of 9 teams. Projected $45M EBITDA from a 400-vehicle Rivian fleet and 80% higher revenue per trip.",
    tools: ["Financial modeling", "Market strategy", "Fleet economics", "Excel"],
    image: "", // TODO: add a slide or deck image (assets/work/uber-av-strategy.jpg)
    links: [], // TODO: add a link if there is a public deck or write-up
  },
  {
    slug: "ai-infrastructure-marketplace", name: "AI Infrastructure Marketplace", category: "ps", status: "Shipped", featured: 2,
    oneLiner: "CoreWeave · Product Management Intern",
    outcome: "PR/FAQ mapping 30 partners to 10 enterprise use cases",
    meta: "Experience · Jan – May 2026 · via NYU Stern",
    problem: "CoreWeave was exploring an AI-native enterprise marketplace connecting infrastructure, software, tools, and enterprise customers, and needed to know who to serve first and with which partners.",
    whatIDid: "Conducted 20 customer interviews across 4 AI-native verticals and defined ICP segments. Partnered with Solution Architects and Product Marketing to design 5 workflows integrating ML tooling into CoreWeave's Kubernetes ecosystem, and authored the PR/FAQ.",
    result: "A PR/FAQ for a two-sided marketplace mapping 30 partners to 10 enterprise use cases, plus ICP segmentation and partner strategy to prioritize go-to-market.",
    tools: ["Customer discovery", "ICP definition", "PR/FAQ", "GTM strategy"],
    image: "", // TODO: add an image if one can be shared publicly
    links: [],
  },
  {
    slug: "dreamweaver", name: "Dreamweaver", category: "im", status: "Shipped", featured: 3,
    oneLiner: "Hand-tracking interactive experience",
    outcome: "Played live by 25 people at a public showcase",
    meta: "Class project · Public showcase",
    problem: "Could you move through a dreamlike story using only your hands, with no mouse or keyboard?",
    whatIDid: "Designed and programmed the full interaction system in p5.js and ml5.js: hand tracking, gesture recognition, particle effects, scene transitions, and a typewriter sequence.",
    result: "Five scenes, played live by 25 people at a public showcase.",
    tools: ["p5.js", "ml5.js", "JavaScript", "Gesture recognition"],
    image: "", // TODO: add a screenshot or GIF (assets/work/dreamweaver.gif)
    links: [], // TODO: add a demo video link
  },
  {
    slug: "meroo-design-sprint", name: "Meroo Design Sprint", category: "ps", status: "Concept", featured: 4,
    oneLiner: "Gamified career discovery · BTE design sprint",
    outcome: "Founder implemented some of our ideas",
    meta: "BTE Design Sprint · Product Manager · Team of 4 · Nov 2024",
    problem: "Meroo, a gamified career-discovery app, wanted to reach users beyond its original audience.",
    whatIDid: "Led a 4-person team as PM through a one-week sprint with founder David Restrepo, from problem definition and user interviews to ideation and a prototype concept adapted for users at three career stages.",
    result: "Pitched against two competing teams. The founder implemented some of our ideas, and our user interviews confirmed the positioning.",
    tools: ["Design thinking", "User research", "Prototyping", "Project management"],
    image: "", // TODO: add a prototype screen
    links: [],
  },
  {
    slug: "unblur", name: "Unblur", category: "ai", status: "In progress", featured: 5,
    oneLiner: "AI onboarding assistant",
    outcome: "Direction grounded in 20 user interviews",
    meta: "Project · Solo",
    problem: "Interns and early-career employees lose momentum when their supervisors aren't around to explain company-specific context.",
    whatIDid: "Generated 10 startup concepts, narrowed them down, and chose Unblur as the strongest. Ran 20 user interviews and shaped the product direction around closing onboarding knowledge gaps.",
    result: "Product direction grounded in 20 user interviews; mockup in progress.",
    tools: ["Customer discovery", "User interviews", "Product strategy", "AI"],
    image: "", // TODO: add the mockup (assets/work/unblur.png)
    links: [],
  },
  {
    slug: "mission-001", name: "Mission 001", category: "ai", status: "In progress", featured: 6, figure: "mission001",
    oneLiner: "Autonomous spacecraft inspection",
    outcome: "",
    meta: "Project · Solo · Python · MuJoCo",
    problem: "Inspecting a spacecraft in orbit calls for a robot that can work around the vehicle on its own: seeing it, spotting anomalies, planning its moves, and recovering when something goes wrong.",
    whatIDid: "Building the simulation and full technical stack myself in Python and MuJoCo, centered on a free-flying 6-DOF robot operating around a spacecraft. The architecture covers perception, anomaly detection, planning, failure recovery, and mission evaluation.",
    result: "In active development, with a working prototype coming soon.", // TODO: replace with the first milestone and its date
    tools: ["Python", "MuJoCo", "Physics simulation", "Robotics"],
    image: "", // the interactive anatomy figure is shown instead; TODO: add a simulation GIF when ready
    links: [],
  },
  {
    slug: "cnc-space-p", name: "CNC Space \"P\"", category: "hw", status: "Shipped", featured: 0,
    oneLiner: "Fusion 360 × ShopBot",
    outcome: "A finished, machined piece",
    meta: "Project", problemLabel: "Challenge",
    problem: "Turn a single letter into a small piece of the solar system.",
    whatIDid: "Designed a plywood \"P\" with planets, orbital elements, contours, pockets, and engraving in Fusion 360, generated the CNC toolpaths, and machined it on a ShopBot.",
    result: "A finished, machined piece.",
    tools: ["Fusion 360", "CAM toolpaths", "ShopBot CNC"],
    image: "", // TODO: add a photo (assets/work/cnc-space-p.jpg)
    links: [],
  },
  {
    slug: "rube-goldberg-machine", name: "Rube Goldberg Machine", category: "hw", status: "Shipped", featured: 0,
    oneLiner: "Arduino Nano 33 IoT chain reaction",
    outcome: "", // TODO: number of stages or a run-through result
    meta: "Project", problemLabel: "Challenge",
    problem: "Make every physical event reliably trigger the next, using sensors and actuators that don't always cooperate.",
    whatIDid: "Designed and programmed a chain reaction on an Arduino Nano 33 IoT using a VL53L0X distance sensor, servo motor, force-sensitive resistor, and speaker, with each stage triggering the next. Troubleshot sensor readings and built conductive materials into the physical design.",
    result: "",
    tools: ["Arduino", "C++", "VL53L0X", "Servo", "FSR"],
    image: "", // TODO: add a run-through video still
    links: [],
  },
  {
    slug: "velostat-heart", name: "Velostat Heart", category: "im", status: "Shipped", featured: 0,
    oneLiner: "Touch-responsive physical interface",
    outcome: "", // TODO: how people reacted to it
    meta: "Project",
    problem: "Can a few simple conductive materials turn touch into something that feels alive?",
    whatIDid: "Built a heart-shaped interface from pressure-sensitive Velostat, with sensing and LEDs that turn touch into an ambient visual response.",
    result: "",
    tools: ["Velostat", "Sensors", "LEDs", "Physical computing"],
    image: "", // TODO: add a photo or video still
    links: [],
  },
  {
    slug: "after-effects-animation", name: "After Effects Animation", category: "im", status: "Shipped", featured: 0,
    oneLiner: "Two people falling in love · motion design",
    outcome: "",
    meta: "Motion design", problemLabel: "Challenge",
    problem: "Telling a love story through motion alone, without much prior drawing experience.",
    whatIDid: "Developed the visual concept and animated it in After Effects, experimenting with motion, composition, and transitions.",
    result: "",
    tools: ["After Effects", "Motion design", "Visual storytelling"],
    image: "", // TODO: add a still frame
    links: [], // TODO: add the video link
  },
  {
    slug: "astryn", name: "Astryn", category: "ai", status: "Concept", featured: 0,
    oneLiner: "Dream-logging experience",
    outcome: "",
    meta: "Project · Solo",
    problem: "Most dream apps pitch themselves as lucid-dreaming tools. I wanted reflecting on your dreams to feel immersive instead.",
    whatIDid: "Developed the product concept and interaction direction: you explore your \"inner galaxy\" through journaling, emotional visualization, and streak-based engagement.",
    result: "",
    tools: ["Product design", "Interaction design", "Engagement loops"],
    image: "", // TODO: add prototype screens
    links: [],
  },
];

// Experience, oldest first (the universe draws them as inner → outer orbits). Panels list newest first.
// headline: the one metric shown before the full bullets, taken from the bullets themselves.
export const EXPERIENCE = [
  { id: "ey", org: "EY", role: "Summer Intern, Operational & Financial Restructuring", when: "Jun – Jul 2025", where: "Mumbai, India", color: "#ffbf73",
    headline: "Cut manual research time by 70% with a Python/Playwright tool",
    points: [
      "Spotted a bottleneck in company research and built a Python/Playwright tool that pulls financial data from PrivateCircle based on Excel inputs, cutting manual research time by 70%.",
      "Supported insolvency resolution processes: condensed resolution plans, ran compliance checks, and prepared 3 presentations for the Committee of Creditors.",
      "Analyzed a hospital restructuring, including fair and liquidation values, financial projections, and buyer proposals, and flagged financial and operational red flags for the team.",
    ] },
  { id: "bte", org: "BTE Leadership, NYU Stern", role: "President", when: "May 2025 – May 2026", where: "New York, NY", color: "#b69cff",
    headline: "20 events run · 17 speakers sourced from 150+ outreach",
    points: [
      "Led a 9-member executive board across strategy, budgeting, and outreach.",
      "Ran 20 social and professional events with 20+ attendees each, three of them drawing 60+.",
      "Sourced 17 speakers from outreach to 150+ professionals across VC, PE, and consumer, including Mike Pell, inventor of the PDF.",
    ] },
  { id: "coreweave", org: "CoreWeave", role: "Product Management Intern", when: "Jan – May 2026", where: "New York, NY · via NYU Stern", color: "#7cf2b9", project: "ai-infrastructure-marketplace",
    headline: "20 customer interviews · PR/FAQ mapping 30 partners to 10 use cases",
    points: [
      "Conducted 20 customer interviews across 4 AI-native verticals to define ICPs and prioritize go-to-market opportunities.",
      "Partnered with Solution Architects and Product Marketing to design 5 workflows integrating ML tooling into CoreWeave's Kubernetes ecosystem.",
      "Authored the PR/FAQ for a two-sided AI infrastructure marketplace, mapping 30 partners to 10 enterprise use cases.",
    ] },
  { id: "livegage", org: "Livegage", role: "Business Analyst Intern", when: "Jun – Aug 2026", where: "New York, NY", color: "#7fe3ff",
    headline: "Credit-enhancement model calibrated against 50 real deals, shipped as a service",
    points: [
      "Engineered a loan-level mortgage cash-flow engine modeling paydown, prepayment, defaults, valuation, and waterfalls across hundreds of scenarios.",
      "Scoped, built, and shipped a credit-enhancement model, calibrated against 50 real deals and deployed as a service.",
      "Integrated both tools into Livegage's INSAITS platform, connecting the analytics to the interface for a complete user workflow.",
      "Built pricing, customer-acquisition, revenue, cost, margin, and two-year ARR forecasts for INSAITS with the Capital Markets Products team.",
    ] },
];

// Only numbers that already appear elsewhere on the site.
export const STATS = [
  ["1st", "of 9 teams, Uber case"],
  ["$45M", "EBITDA modeled, AV fleet"],
  ["70%", "research time cut at EY"],
  ["20", "customer interviews (CoreWeave)"],
  ["50", "real deals calibrated"],
];

export const SKILLS = [
  { name: "Product", color: "#7cf2b9", items: ["User research", "Customer discovery", "PR/FAQs", "ICP definition", "Go-to-market strategy", "Design thinking", "Prioritization", "Storytelling & pitching"] },
  { name: "Technical", color: "#7fe3ff", items: ["Python", "SQL", "HTML & CSS", "Playwright", "MuJoCo", "p5.js & ml5.js", "Claude Code"] },
  { name: "Hardware & Making", color: "#ffbf73", items: ["Arduino & C++", "Sensors & physical computing", "Fusion 360 (CAD/CAM)", "ShopBot CNC", "Fabrication"] },
  { name: "Business & Creative", color: "#b69cff", items: ["Financial modeling", "Excel", "QuickBooks", "After Effects", "Adobe Creative Cloud", "Visual storytelling"] },
];

export const ABOUT = {
  photo: "assets/priyansh.jpg",
  heading: "More questions than answers.",
  lead: "I study Business, Technology & Entrepreneurship at NYU Stern. What I love most are answers that open up new questions, and I bring that same curiosity to building products.",
  facts: [
    ["Studying", "B.S. Business, Technology & Entrepreneurship, NYU Stern"],
    ["Minors", "Math & Computer Science · Interactive Media Arts"],
    ["Graduating", "Dec 2027 · GPA 3.8 · Dean's List"],
    ["Based in", "New York, open to relocating"],
    ["Seeking", "PM internships & full-time roles, with space as the north star"],
  ],
};

// ── derived: the universe (galaxies) uses this shape ──────────────────────────
const byCategory = (id) => PROJECTS.filter((p) => p.category === id);
export const GALAXIES = ["ai", "im", "hw", "ps"].map((id) => {
  const c = CATEGORIES.find((x) => x.id === id);
  return { id, num: c.num, name: c.name, color: c.color, projects: byCategory(id).map((p) => ({ slug: p.slug, title: p.name, kind: p.featured ? "planet" : "star", live: p.status === "In progress" && p.slug === "mission-001", label: p.status })) };
});
