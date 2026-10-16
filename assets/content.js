// Content shared by the immersive site (index.html). Edit text here.
export const GALAXIES = [
  { id:'ai', num:'01', name:'AI, Software & Startups', color:'#7fe3ff', projects:[
    { title:'Mission 001', sub:'Autonomous Spacecraft Inspection', kind:'planet', live:true, label:'In progress',
      meta:'Project · Solo · In progress',
      problem:'Inspecting a spacecraft in orbit calls for a robot that can work around the vehicle on its own: seeing it, spotting anomalies, planning its moves, and recovering when something goes wrong.',
      did:'Building the simulation and full technical stack myself in Python and MuJoCo, centered on a free-flying 6-DOF robot operating around a spacecraft. The architecture covers perception, anomaly detection, planning, failure recovery, and mission evaluation.',
      result:'In active development, with a working prototype coming soon.',
      tools:['Python','MuJoCo','Physics simulation','Robotics'] },
    { title:'Unblur', sub:'AI Onboarding Assistant', kind:'planet', label:'AI startup concept',
      meta:'Project · Solo',
      problem:'Interns and early-career employees lose momentum when their supervisors aren\'t around to explain company-specific context.',
      did:'Generated 10 startup concepts, narrowed them down, and chose Unblur as the strongest. Ran 20 user interviews and shaped the product direction around closing onboarding knowledge gaps.',
      result:'Product direction grounded in 20 user interviews; mockup in progress.',
      tools:['Customer discovery','User interviews','Product strategy','AI'] },
    { title:'Astryn', sub:'Dream-Logging Experience', kind:'star', label:'Product concept',
      meta:'Project · Solo',
      problem:'Most dream apps pitch themselves as lucid-dreaming tools. I wanted reflecting on your dreams to feel immersive instead.',
      did:'Developed the product concept and interaction direction: you explore your "inner galaxy" through journaling, emotional visualization, and streak-based engagement.',
      result:'',
      tools:['Product design','Interaction design','Engagement loops'] },
  ]},
  { id:'im', num:'02', name:'Interactive Media & Creative Tech', color:'#b69cff', projects:[
    { title:'Dreamweaver', sub:'Hand-Tracking Interactive Experience', kind:'planet', label:'Hand-tracking',
      meta:'Class project · Public showcase',
      problem:'Could you move through a dreamlike story using only your hands, with no mouse or keyboard?',
      did:'Designed and programmed the full interaction system in p5.js and ml5.js: hand tracking, gesture recognition, particle effects, scene transitions, and a typewriter sequence.',
      result:'Five scenes, played live by 25 people at a public showcase.',
      tools:['p5.js','ml5.js','JavaScript','Gesture recognition'] },
    { title:'Velostat Heart', sub:'Touch-Responsive Physical Interface', kind:'star', label:'Physical computing',
      meta:'Project',
      problem:'Can a few simple conductive materials turn touch into something that feels alive?',
      did:'Built a heart-shaped interface from pressure-sensitive Velostat, with sensing and LEDs that turn touch into an ambient visual response.',
      result:'',
      tools:['Velostat','Sensors','LEDs','Physical computing'] },
    { title:'After Effects Animation', sub:'Two People Falling in Love', kind:'star', label:'Motion design', pLabel:'Challenge',
      meta:'Motion design',
      problem:'Telling a love story through motion alone, without much prior drawing experience.',
      did:'Developed the visual concept and animated it in After Effects, experimenting with motion, composition, and transitions.',
      result:'',
      tools:['After Effects','Motion design','Visual storytelling'] },
  ]},
  { id:'hw', num:'03', name:'Hardware & Fabrication', color:'#ffbf73', projects:[
    { title:'Rube Goldberg Machine', sub:'Arduino Nano 33 IoT Chain Reaction', kind:'planet', label:'Arduino build', pLabel:'Challenge',
      meta:'Project',
      problem:'Make every physical event reliably trigger the next, using sensors and actuators that don\'t always cooperate.',
      did:'Designed and programmed a chain reaction on an Arduino Nano 33 IoT using a VL53L0X distance sensor, servo motor, force-sensitive resistor, and speaker, with each stage triggering the next. Troubleshot sensor readings and built conductive materials into the physical design.',
      result:'',
      tools:['Arduino','C++','VL53L0X','Servo','FSR'] },
    { title:'CNC Space "P"', sub:'Fusion 360 × ShopBot', kind:'star', label:'CAD + CNC', pLabel:'Challenge',
      meta:'Project',
      problem:'Turn a single letter into a small piece of the solar system.',
      did:'Designed a plywood "P" with planets, orbital elements, contours, pockets, and engraving in Fusion 360, generated the CNC toolpaths, and machined it on a ShopBot.',
      result:'A finished, machined piece.',
      tools:['Fusion 360','CAM toolpaths','ShopBot CNC'] },
  ]},
  { id:'ps', num:'04', name:'Product, Design & Strategy', color:'#7cf2b9', projects:[
    { title:'AI Infrastructure Marketplace', sub:'CoreWeave · Product Management Intern', kind:'planet', label:'CoreWeave',
      meta:'Experience · Jan – May 2026 · via NYU Stern',
      problem:'CoreWeave was exploring an AI-native enterprise marketplace connecting infrastructure, software, tools, and enterprise customers, and needed to know who to serve first and with which partners.',
      did:'Conducted 20 customer interviews across 4 AI-native verticals and defined ICP segments. Partnered with Solution Architects and Product Marketing to design 5 workflows integrating ML tooling into CoreWeave\'s Kubernetes ecosystem, and authored the PR/FAQ.',
      result:'A PR/FAQ for a two-sided marketplace mapping 30 partners to 10 enterprise use cases, plus ICP segmentation and partner strategy to prioritize go-to-market.',
      tools:['Customer discovery','ICP definition','PR/FAQ','GTM strategy'] },
    { title:'Uber AV Strategy', sub:'Uber Case Competition · Beta Alpha Psi', kind:'planet', label:'1st place', award:'1st place',
      meta:'Competition · Team of 4 · Spring 2026',
      problem:'Where and how should Uber expand its autonomous-vehicle business following its Rivian partnership?',
      did:'Analyzed demand, infrastructure, the competitive landscape, and the EV ecosystem to find high-utilization corridors. Built the model comparing fleet structures, recommended a phased Atlanta launch on Rivian\'s R2 fleet, and presented to Uber Finance leadership.',
      result:'1st place of 9 teams. Projected $45M EBITDA from a 400-vehicle Rivian fleet and 80% higher revenue per trip.',
      tools:['Financial modeling','Market strategy','Fleet economics','Excel'] },
    { title:'Meroo Design Sprint', sub:'Gamified Career Discovery', kind:'star', label:'Design sprint',
      meta:'BTE Design Sprint · Product Manager · Team of 4 · Nov 2024',
      problem:'Meroo, a gamified career-discovery app, wanted to reach users beyond its original audience.',
      did:'Led a 4-person team as PM through a one-week sprint with founder David Restrepo, from problem definition and user interviews to ideation and a prototype concept adapted for users at three career stages.',
      result:'Pitched against two competing teams. The founder implemented some of our ideas, and our user interviews confirmed the positioning.',
      tools:['Design thinking','User research','Prototyping','Project management'] },
  ]},
];

export const SKILLS = [
  { name:'Product', color:'#7cf2b9', items:['User research','Customer discovery','PR/FAQs','ICP definition','Go-to-market strategy','Design thinking','Prioritization','Storytelling & pitching'] },
  { name:'Technical', color:'#7fe3ff', items:['Python','SQL','HTML & CSS','Playwright','MuJoCo','p5.js & ml5.js','Claude Code'] },
  { name:'Hardware & Making', color:'#ffbf73', items:['Arduino & C++','Sensors & physical computing','Fusion 360 (CAD/CAM)','ShopBot CNC','Fabrication'] },
  { name:'Business & Creative', color:'#b69cff', items:['Financial modeling','Excel','QuickBooks','After Effects','Adobe Creative Cloud','Visual storytelling'] },
];

// Flight Log, oldest orbit first (inner planet) to newest (outer planet)
export const EXPERIENCE = [
  { id:'ey', org:'EY', role:'Summer Intern, Operational & Financial Restructuring', when:'Jun – Jul 2025', where:'Mumbai, India', color:'#ffbf73',
    points:[
      'Spotted a bottleneck in company research and built a Python/Playwright tool that pulls financial data from PrivateCircle based on Excel inputs, cutting manual research time by 70%.',
      'Supported insolvency resolution processes: condensed resolution plans, ran compliance checks, and prepared 3 presentations for the Committee of Creditors.',
      'Analyzed a hospital restructuring, including fair and liquidation values, financial projections, and buyer proposals, and flagged financial and operational red flags for the team.',
    ] },
  { id:'bte', org:'BTE Leadership, NYU Stern', role:'President', when:'May 2025 – May 2026', where:'New York, NY', color:'#b69cff',
    points:[
      'Led a 9-member executive board across strategy, budgeting, and outreach.',
      'Ran 20 social and professional events with 20+ attendees each, three of them drawing 60+.',
      'Sourced 17 speakers from outreach to 150+ professionals across VC, PE, and consumer, including Mike Pell, inventor of the PDF.',
    ] },
  { id:'coreweave', org:'CoreWeave', role:'Product Management Intern', when:'Jan – May 2026', where:'New York, NY · via NYU Stern', color:'#7cf2b9', project:['product', 0],
    points:[
      'Conducted 20 customer interviews across 4 AI-native verticals to define ICPs and prioritize go-to-market opportunities.',
      'Partnered with Solution Architects and Product Marketing to design 5 workflows integrating ML tooling into CoreWeave\'s Kubernetes ecosystem.',
      'Authored the PR/FAQ for a two-sided AI infrastructure marketplace, mapping 30 partners to 10 enterprise use cases.',
    ] },
  { id:'livegage', org:'Livegage', role:'Business Analyst Intern', when:'Jun – Aug 2026', where:'New York, NY', color:'#7fe3ff',
    points:[
      'Engineered a loan-level mortgage cash-flow engine modeling paydown, prepayment, defaults, valuation, and waterfalls across hundreds of scenarios.',
      'Scoped, built, and shipped a credit-enhancement model, calibrated against 50 real deals and deployed as a service.',
      'Integrated both tools into Livegage\'s INSAITS platform, connecting the analytics to the interface for a complete user workflow.',
      'Built pricing, customer-acquisition, revenue, cost, margin, and two-year ARR forecasts for INSAITS with the Capital Markets Products team.',
    ] },
];

export const CREW = {
  name:'Priyansh Jain', role:'Mission Specialist · Product', id:'PJ-2027',
  facts:[
    ['Studying','B.S. Business, Technology & Entrepreneurship, NYU Stern'],
    ['Minors','Math & Computer Science · Interactive Media Arts'],
    ['Graduating','Dec 2027 · GPA 3.8 · Dean\'s List'],
    ['Based in','New York, open to relocating'],
    ['Seeking','PM internships & full-time roles, with space as the north star'],
  ],
  stats:[
    ['3.8','GPA at NYU Stern'], ['20','customer interviews (CoreWeave)'], ['30','partners mapped in a PR/FAQ'], ['1st','of 9 teams, Uber case'],
    ['$45M','EBITDA modeled, AV fleet'], ['70%','research time cut at EY'], ['50','real deals calibrated'], ['17','speakers sourced for BTE'],
  ],
};

export const TICKER = [
  'Now building: Mission 001, autonomous spacecraft inspection',
  'Business Analyst Intern, Livegage · Summer 2026',
  '1st place of 9 teams · Uber Case Competition',
  'Product Management Intern, CoreWeave · Spring 2026',
  'President, BTE Leadership · NYU Stern',
];

export const CONTACT = {
  email:'priyansh.jain@stern.nyu.edu',
  linkedin:'https://www.linkedin.com/in/priyanshjain05/',
  resume:'assets/Priyansh_Jain_Resume.pdf',
};
