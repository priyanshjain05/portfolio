// Spacecraft game: every part and every balance number lives here. Tune the game by editing only this file.
//
// Each slot has exactly 3 options. An option has:
//   id, name, short (used in the HUD), effect (one plain line shown in the builder),
//   stats: modifiers the flight model reads (see TUNING for how they combine),
//   look:  visual parameters the ship renderer reads (shape variant + colours).
//
// Display bars in the builder (0–5) are computed from the same stats, so they always match the handling.

export const SLOTS = [
  { id: "engine", name: "Engine", hint: "thrust vs fuel burn" },
  { id: "hull", name: "Hull", hint: "durability vs weight" },
  { id: "thrusters", name: "Thrusters", hint: "precision vs twitchiness" },
  { id: "tank", name: "Fuel tank", hint: "boost reserve vs mass" },
];

export const PARTS = {
  engine: [
    { id: "ion", name: "Ion drive", short: "Ion", effect: "Gentle push that sips fuel: long boosts, small kick.",
      stats: { thrust: 2, burn: 0.55, mass: 0.8 },
      look: { variant: "ion", flame: ["#b9a8ff", "#6f8bff"], metal: "#9fb2d8" } },
    { id: "chem", name: "Chemical rocket", short: "Chemical", effect: "Big kick, thirsty: strong boost that drains the tank.",
      stats: { thrust: 3.6, burn: 1.0, mass: 1.6 },
      look: { variant: "chem", flame: ["#ffe2a8", "#ff9b4a"], metal: "#c9b394" } },
    { id: "plasma", name: "Plasma torch", short: "Plasma", effect: "Fastest cruise of all, heaviest engine, burns hot.",
      stats: { thrust: 4.6, burn: 1.35, mass: 2.4 },
      look: { variant: "plasma", flame: ["#ffe1fb", "#ff6fd2"], metal: "#c8a6d6" } },
  ],
  hull: [
    { id: "scout", name: "Scout frame", short: "Scout", effect: "Light and nimble, but one hit ends the run.",
      stats: { hp: 1, mass: 1.0, width: 0.86 },
      look: { variant: "scout", plate: "#7fe3ff", body: "#132244" } },
    { id: "frigate", name: "Frigate hull", short: "Frigate", effect: "Balanced: shrugs off one hit, middling weight.",
      stats: { hp: 2, mass: 2.3, width: 1.0 },
      look: { variant: "frigate", plate: "#b8c8ea", body: "#16203d" } },
    { id: "bulwark", name: "Bulwark armour", short: "Bulwark", effect: "Survives two extra hits, but heavy and wide.",
      stats: { hp: 3, mass: 3.8, width: 1.18 },
      look: { variant: "bulwark", plate: "#ffbf73", body: "#1d1f33" } },
  ],
  thrusters: [
    { id: "fins", name: "Steering fins", short: "Fins", effect: "Precise and steady, but slow to cross the screen.",
      stats: { accel: 3.4, vmax: 0.62, damp: 6.0 },
      look: { variant: "fins", color: "#7cf2b9" } },
    { id: "pods", name: "RCS pods", short: "Pods", effect: "Quick sideways with a little slide.",
      stats: { accel: 4.0, vmax: 0.85, damp: 4.2 },
      look: { variant: "pods", color: "#7fe3ff" } },
    { id: "vanes", name: "Vector vanes", short: "Vanes", effect: "Twitchy: darts instantly and keeps sliding.",
      stats: { accel: 6.2, vmax: 1.08, damp: 1.9 },
      look: { variant: "vanes", color: "#ff8fb1" } },
  ],
  tank: [
    { id: "compact", name: "Compact cell", short: "Compact", effect: "Small and light; refills fast between boosts.",
      stats: { fuel: 36, recharge: 7.5, mass: 0.4 },
      look: { variant: "compact", color: "#e9edf7", stripe: "#7fe3ff" } },
    { id: "saddle", name: "Saddle tanks", short: "Saddle", effect: "Twin side tanks: decent reserve, some extra weight.",
      stats: { fuel: 66, recharge: 5.0, mass: 1.3 },
      look: { variant: "saddle", color: "#dfe6f5", stripe: "#ffbf73" } },
    { id: "long", name: "Long-range tank", short: "Long-range", effect: "Huge reserve for long boosts, slow refill, heavy.",
      stats: { fuel: 110, recharge: 3.0, mass: 2.4 },
      look: { variant: "long", color: "#d6f5ea", stripe: "#7cf2b9" } },
  ],
};

// How part stats combine into handling, and how the run gets harder. All units are relative to the play area:
// lateral speeds in play-widths per second, forward speeds in play-heights per second.
export const TUNING = {
  baseMass: 4,                 // frame, cockpit and avionics
  lateralAccel: 2.4,           // × thrusters.accel / mass × baseMass → play-widths/s²
  massVmaxPenalty: 0.035,      // vmax shrinks this much per unit of mass over 6
  cruise: 0.42,                // forward speed at the start, play-heights/s
  cruisePerThrust: 0.05,       // + per point of engine thrust over 3
  cruiseMassPenalty: 0.012,    // − per unit of mass over 8
  boostPerThrust: 0.16,        // boost multiplies forward speed by 1 + thrust × this
  burnPerSecond: 16,           // fuel used per second of boost, × engine.burn
  hitboxScale: 0.36,           // ship collision radius as a share of the drawn ship size
  invulnerableAfterHit: 1.4,   // seconds of grace after a hit
  // difficulty over time (seconds survived)
  calmSeconds: 4,              // no obstacles before this
  rampSeconds: 70,             // time to reach full difficulty
  speedRamp: 1.35,             // forward speed grows by up to this factor over the ramp (× 1 + ramp)
  rowGap: [0.62, 0.30],        // seconds between obstacle rows: at start, at full difficulty
  density: [0.28, 0.62],       // share of free lanes filled per row: at start, at full difficulty
  lanes: 9,                    // obstacle lanes across the play area
  corridorLanes: 2,            // lanes always kept open, wider than the widest ship
  distanceScale: 0.05,         // play-heights travelled → km shown to the player
};

// Combine a build (one option id per slot) into the numbers the flight model uses.
export function shipStats(build) {
  const e = pick("engine", build.engine), h = pick("hull", build.hull), t = pick("thrusters", build.thrusters), k = pick("tank", build.tank);
  const T = TUNING;
  const mass = T.baseMass + e.stats.mass + h.stats.mass + k.stats.mass;
  const accel = (T.lateralAccel * t.stats.accel * T.baseMass) / mass;
  const vmax = t.stats.vmax * (1 - Math.max(0, mass - 6) * T.massVmaxPenalty);
  const cruise = T.cruise + (e.stats.thrust - 3) * T.cruisePerThrust - Math.max(0, mass - 8) * T.cruiseMassPenalty;
  const boost = 1 + e.stats.thrust * T.boostPerThrust;
  const burn = T.burnPerSecond * e.stats.burn;
  return {
    mass, accel, vmax, damp: t.stats.damp, cruise, boost, burn,
    fuel: k.stats.fuel, recharge: k.stats.recharge, hp: h.stats.hp, width: h.stats.width,
    // 0–5 display bars, derived from the same numbers
    bars: {
      thrust: clamp5((e.stats.thrust / 4.6) * 5),
      durability: clamp5(h.stats.hp * 1.6 + 0.2),
      agility: clamp5(((vmax / 1.0) * 0.55 + (accel / 10) * 0.45) * 5.2),
      fuel: clamp5(((k.stats.fuel / burn) / 6) * 5),
    },
  };
}
export function pick(slot, id) { return PARTS[slot].find((o) => o.id === id) || PARTS[slot][1]; }
export const DEFAULT_BUILD = { engine: "chem", hull: "frigate", thrusters: "pods", tank: "saddle" };
const clamp5 = (x) => Math.max(0.5, Math.min(5, Math.round(x * 2) / 2));
