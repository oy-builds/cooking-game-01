// kitchen.js — the stall itself: stations, the cook, what the cook carries,
// the two plating bowls, and every interaction between them.
// The cook carries at most two things; a station holds one job at a time.
import { INGREDIENTS, BROTHS, recipeForBowl } from './recipes.js';
import { serveBowl } from './orders.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

// Station rectangles, in canvas pixels. The counter runs along the bottom,
// the crates along the left wall, the serving window at the far right.
export const STATIONS = {
  crates: { id: 'crates', name: 'Crates', x: 24, y: 300, w: 150, h: 330 },
  pot: { id: 'pot', name: 'Noodle Pot', x: 210, y: 300, w: 150, h: 150 },
  board: { id: 'board', name: 'Chopping Board', x: 390, y: 300, w: 150, h: 150 },
  grill: { id: 'grill', name: 'Grill', x: 570, y: 300, w: 150, h: 150 },
  kettle: { id: 'kettle', name: 'Broth Kettle', x: 750, y: 300, w: 150, h: 150 },
  plating: { id: 'plating', name: 'Plating Counter', x: 930, y: 300, w: 170, h: 150 },
  serve: { id: 'serve', name: 'Serving Window', x: 1130, y: 300, w: 126, h: 330 },
};

export const BOWL_SLOTS = [
  { x: 950, y: 350, w: 62, h: 62 },
  { x: 1020, y: 350, w: 62, h: 62 },
];

export const CRATE_SLOTS = [
  { id: 'noodles', x: 40, y: 330, w: 56, h: 56 },
  { id: 'chashu', x: 104, y: 330, w: 56, h: 56 },
  { id: 'egg', x: 40, y: 400, w: 56, h: 56 },
  { id: 'corn', x: 104, y: 400, w: 56, h: 56 },
  { id: 'mushroom', x: 40, y: 470, w: 56, h: 56 },
  { id: 'greens', x: 104, y: 470, w: 56, h: 56 },
];

export const KETTLE_POTS = [
  { id: 'shoyu', x: 762, y: 330, w: 40, h: 40 },
  { id: 'miso', x: 810, y: 330, w: 40, h: 40 },
  { id: 'spicy', x: 858, y: 330, w: 40, h: 40 },
];

export function createKitchen() {
  return {
    player: { x: 640, y: 560, tx: 640, ty: 560, speed: 330, facing: 1 },
    carried: [], // up to two items: { kind: 'raw'|'prepped'|'broth'|'bowl', id, ... }
    jobs: { pot: null, board: null, grill: null }, // { ingredientId, left, total }
    bowls: [null, null], // { broth: null|'shoyu'|..., items: [] }
    flash: null, // { text, x, y, left, color } floating feedback
    sizzle: 0,
  };
}

export function stationAtPoint(x, y) {
  for (const key of Object.keys(STATIONS)) {
    const s = STATIONS[key];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}

function crateAtPoint(x, y) {
  return CRATE_SLOTS.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || null;
}

function kettlePotAtPoint(x, y) {
  return KETTLE_POTS.find((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) || null;
}

function bowlSlotAtPoint(x, y) {
  for (let i = 0; i < BOWL_SLOTS.length; i++) {
    const s = BOWL_SLOTS[i];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return i;
  }
  return -1;
}

function setFlash(kitchen, text, x, y, color) {
  kitchen.flash = { text, x, y, left: 1.1, color: color || '#ffe9a8' };
}

export function updateKitchen(kitchen, dt) {
  const p = kitchen.player;
  // Walk toward the click target; keys set the target directly in main.js.
  const dx = p.tx - p.x;
  const dy = p.ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 4) {
    const step = Math.min(dist, p.speed * dt);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    p.facing = dx < -2 ? -1 : dx > 2 ? 1 : p.facing;
  }
  // Prep jobs tick down; a finished job pops its item onto the station.
  for (const key of ['pot', 'board', 'grill']) {
    const job = kitchen.jobs[key];
    if (!job) continue;
    job.left -= dt;
    kitchen.sizzle = Math.max(kitchen.sizzle, 0.25);
    if (job.left <= 0) {
      kitchen.jobs[key] = { ingredientId: job.ingredientId, left: 0, total: job.total, done: true };
    }
  }
  if (kitchen.sizzle > 0) kitchen.sizzle -= dt;
  if (kitchen.flash) {
    kitchen.flash.left -= dt;
    if (kitchen.flash.left <= 0) kitchen.flash = null;
  }
}

function stationJobKey(stationId) {
  return stationId === 'pot' ? 'pot' : stationId === 'board' ? 'board' : stationId === 'grill' ? 'grill' : null;
}

// The cook's hands are full at two items.
function canCarry(kitchen) {
  return kitchen.carried.length < 2;
}

function takeItem(kitchen, item) {
  if (!canCarry(kitchen)) return false;
  kitchen.carried.push(item);
  return true;
}

// What happens when the cook clicks a point in the kitchen. Returns a short
// event name the game uses for sound and hints: 'grab', 'start', 'collect',
// 'broth', 'bowl', 'add', 'serve', 'deny' or null.
export function interactAt(kitchen, board, x, y) {
  const crate = crateAtPoint(x, y);
  if (crate) {
    if (!canCarry(kitchen)) { setFlash(kitchen, 'Hands full!', x, y, '#ff9a8a'); return 'deny'; }
    takeItem(kitchen, { kind: 'raw', id: crate.id });
    setFlash(kitchen, INGREDIENTS[crate.id].name + ' grabbed', x, y);
    return 'grab';
  }
  const kettlePot = kettlePotAtPoint(x, y);
  if (kettlePot) {
    if (!canCarry(kitchen)) { setFlash(kitchen, 'Hands full!', x, y, '#ff9a8a'); return 'deny'; }
    takeItem(kitchen, { kind: 'broth', id: kettlePot.id });
    setFlash(kitchen, BROTHS[kettlePot.id].name + ' broth ladled', x, y);
    return 'broth';
  }
  const bowlIndex = bowlSlotAtPoint(x, y);
  if (bowlIndex >= 0) return interactBowl(kitchen, bowlIndex, x, y);
  const station = stationAtPoint(x, y);
  if (station) return interactStation(kitchen, board, station, x, y);
  // Clicking open floor just walks there.
  kitchen.player.tx = Math.max(30, Math.min(VIEW_W - 30, x));
  kitchen.player.ty = Math.max(300, Math.min(VIEW_H - 40, y));
  return null;
}

function interactStation(kitchen, board, station, x, y) {
  const jobKey = stationJobKey(station.id);
  if (jobKey) {
    const job = kitchen.jobs[jobKey];
    if (job && job.done) {
      if (!canCarry(kitchen)) { setFlash(kitchen, 'Hands full!', x, y, '#ff9a8a'); return 'deny'; }
      takeItem(kitchen, { kind: 'prepped', id: job.ingredientId });
      kitchen.jobs[jobKey] = null;
      setFlash(kitchen, INGREDIENTS[job.ingredientId].name + ' ready!', x, y, '#b8f29a');
      return 'collect';
    }
    if (job) { setFlash(kitchen, 'Still cooking…', x, y); return 'deny'; }
    // Start a job with a matching raw ingredient from the cook's hands.
    const handIndex = kitchen.carried.findIndex(
      (c) => c.kind === 'raw' && INGREDIENTS[c.id].station === station.id,
    );
    if (handIndex === -1) {
      const want = Object.values(INGREDIENTS).filter((g) => g.station === station.id).map((g) => g.name).join(' / ');
      setFlash(kitchen, 'Needs: ' + want, x, y, '#ff9a8a');
      return 'deny';
    }
    const item = kitchen.carried.splice(handIndex, 1)[0];
    const def = INGREDIENTS[item.id];
    kitchen.jobs[jobKey] = { ingredientId: item.id, left: def.prepTime, total: def.prepTime, done: false };
    setFlash(kitchen, def.name + ' on the ' + station.name.toLowerCase(), x, y);
    return 'start';
  }
  if (station.id === 'serve') return serveAtWindow(kitchen, board, x, y);
  // Clicking the plating counter or crates with no slot hit just walks there.
  kitchen.player.tx = Math.max(30, Math.min(VIEW_W - 30, x));
  kitchen.player.ty = Math.max(300, Math.min(VIEW_H - 40, y));
  return null;
}

function interactBowl(kitchen, index, x, y) {
  const bowl = kitchen.bowls[index];
  if (!bowl) {
    // Place an empty bowl on the counter.
    kitchen.bowls[index] = { broth: null, items: [] };
    setFlash(kitchen, 'Fresh bowl', x, y);
    return 'bowl';
  }
  const recipe = recipeForBowl(bowl);
  // A finished bowl in hand-ready state: pick it up to carry to the window.
  if (recipe) {
    if (!canCarry(kitchen)) { setFlash(kitchen, 'Hands full!', x, y, '#ff9a8a'); return 'deny'; }
    kitchen.bowls[index] = null;
    takeItem(kitchen, { kind: 'bowl', recipeId: recipe.id, broth: bowl.broth, items: [...bowl.items] });
    setFlash(kitchen, recipe.name + ' — serve it!', x, y, '#b8f29a');
    return 'collect';
  }
  // Add a carried broth or prepped item to the bowl.
  const handIndex = kitchen.carried.findIndex((c) => {
    if (c.kind === 'broth') return bowl.broth === null;
    if (c.kind === 'prepped') return !bowl.items.includes(c.id) && bowl.broth !== null;
    return false;
  });
  if (handIndex === -1) {
    if (bowl.broth === null) setFlash(kitchen, 'Needs broth first', x, y, '#ff9a8a');
    else setFlash(kitchen, 'Nothing to add', x, y, '#ff9a8a');
    return 'deny';
  }
  const item = kitchen.carried.splice(handIndex, 1)[0];
  if (item.kind === 'broth') {
    bowl.broth = item.id;
    setFlash(kitchen, BROTHS[item.id].name + ' broth poured', x, y);
  } else {
    bowl.items.push(item.id);
    setFlash(kitchen, INGREDIENTS[item.id].name + ' added', x, y);
  }
  const done = recipeForBowl(bowl);
  if (done) setFlash(kitchen, done.name + ' is ready!', x, y + 24, '#b8f29a');
  return 'add';
}

function serveAtWindow(kitchen, board, x, y) {
  const handIndex = kitchen.carried.findIndex((c) => c.kind === 'bowl');
  if (handIndex === -1) { setFlash(kitchen, 'Bring a finished bowl here', x, y, '#ff9a8a'); return 'deny'; }
  const item = kitchen.carried[handIndex];
  const recipe = recipeForBowl(item);
  if (!recipe) { setFlash(kitchen, 'That bowl is not finished', x, y, '#ff9a8a'); return 'deny'; }
  const result = serveBowl(board, recipe);
  if (!result) {
    setFlash(kitchen, 'No one ordered ' + recipe.name, x, y, '#ff9a8a');
    return 'deny';
  }
  kitchen.carried.splice(handIndex, 1);
  setFlash(kitchen, '+' + result.paid + ' coins · ' + recipe.name, x, y, '#ffd94d');
  return 'serve';
}

// Keyboard shortcut: use the station nearest the cook, within reach.
// E (or Space) repeats the last sensible action at that station.
export function interactNearest(kitchen, board) {
  const p = kitchen.player;
  let best = null;
  let bestDist = 170;
  for (const key of Object.keys(STATIONS)) {
    const s = STATIONS[key];
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    const d = Math.hypot(cx - p.x, cy - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  if (!best) return null;
  return interactAt(kitchen, board, best.x + best.w / 2, best.y + best.h / 2);
}

// A carried bowl's recipe, for the serving-window hint.
export function carriedBowlRecipe(kitchen) {
  const item = kitchen.carried.find((c) => c.kind === 'bowl');
  return item ? recipeForBowl(item) : null;
}
