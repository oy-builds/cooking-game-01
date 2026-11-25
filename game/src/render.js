// render.js — every pixel of Lantern Ramen, drawn on one canvas: the night
// stall, the order board, the counters, the food, the cook and the HUD.
// No images: bowls, noodles, lanterns and steam are all canvas shapes.
import { VIEW_W, VIEW_H, STATIONS, BOWL_SLOTS, CRATE_SLOTS, KETTLE_POTS } from './kitchen.js';
import { INGREDIENTS, BROTHS, RECIPES, recipeById, recipeForBowl } from './recipes.js';
import { matchingTicket, shiftTimeLeft } from './orders.js';

const TAU = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// ---- food drawing -------------------------------------------------------

export function drawIngredientIcon(ctx, id, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (id === 'noodles') {
    ctx.strokeStyle = '#f2d38a';
    ctx.lineWidth = 2.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-r + 2, i * 3.2);
      ctx.bezierCurveTo(-r * 0.3, i * 3.2 - 4, r * 0.3, i * 3.2 + 4, r - 2, i * 3.2);
      ctx.stroke();
    }
  } else if (id === 'chashu') {
    ctx.fillStyle = '#e8a06e';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c96a4a';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2c9a8';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, TAU); ctx.fill();
  } else if (id === 'egg') {
    ctx.fillStyle = '#fdf3d0';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.78, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f5b942';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU); ctx.fill();
  } else if (id === 'corn') {
    ctx.fillStyle = '#ffd94d';
    for (const [dx, dy] of [[-5, -5], [5, -5], [0, 0], [-5, 5], [5, 5]]) {
      ctx.beginPath(); ctx.arc(dx * 0.9, dy * 0.9, r * 0.32, 0, TAU); ctx.fill();
    }
  } else if (id === 'mushroom') {
    ctx.fillStyle = '#b98a5e';
    ctx.beginPath(); ctx.arc(0, -2, r * 0.85, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e8d5b5';
    ctx.fillRect(-r * 0.22, -2, r * 0.44, r * 0.7);
  } else if (id === 'greens') {
    ctx.strokeStyle = '#7ec850';
    ctx.lineWidth = 3;
    for (const a of [0.3, 1.6, 2.9, 4.2, 5.5]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.fillStyle = '#4e9a2e';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawBowl(ctx, x, y, r, brothId, items, glow) {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 18;
  }
  // Bowl body.
  ctx.fillStyle = '#2b4a7a';
  ctx.beginPath(); ctx.arc(0, 2, r, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#3d63a0';
  ctx.beginPath(); ctx.ellipse(0, 2, r, r * 0.32, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#f4ead2';
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.96, r * 0.30, 0, 0, TAU); ctx.fill();
  // Broth surface.
  if (brothId) {
    ctx.fillStyle = BROTHS[brothId].color;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.86, r * 0.24, 0, 0, TAU); ctx.fill();
  }
  // Toppings sit on the broth.
  const spots = [[-r * 0.4, -2], [r * 0.38, -3], [0, 3], [r * 0.05, -6]];
  items.forEach((itemId, i) => {
    const [sx, sy] = spots[i % spots.length];
    drawIngredientIcon(ctx, itemId, sx, sy, r * 0.30);
  });
  // Chopsticks.
  ctx.strokeStyle = '#c98a3d';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.5); ctx.lineTo(r * 1.15, -r * 0.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.35); ctx.lineTo(r * 1.05, -r * 0.6); ctx.stroke();
  ctx.restore();
}

// ---- the stall -----------------------------------------------------------

function drawNightSky(ctx, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#141a33');
  sky.addColorStop(1, '#2c2a4d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, 300);
  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const stars = [[90, 40], [210, 80], [330, 30], [520, 60], [700, 35], [880, 70], [1060, 40], [1210, 80], [430, 100], [980, 110]];
  for (const [sx, sy] of stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + sx);
    ctx.globalAlpha = 0.25 + 0.55 * tw;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Moon, clear of the HUD boxes.
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath(); ctx.arc(1150, 88, 24, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8d5ac';
  ctx.beginPath(); ctx.arc(1143, 82, 5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(1158, 96, 4, 0, TAU); ctx.fill();
}

function drawAwningAndLanterns(ctx, t) {
  // Striped awning over the stall.
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b23a2e' : '#f4ead2';
    ctx.fillRect(i * 80, 118, 80, 34);
  }
  ctx.fillStyle = '#7e241b';
  ctx.fillRect(0, 148, VIEW_W, 6);
  // Paper lanterns hang from the top of the night sky, swaying gently.
  // They stay clear of the HUD boxes at the top right.
  const lanternXs = [60, 300, 560, 820];
  lanternXs.forEach((lx, i) => {
    const sway = Math.sin(t * 0.8 + i * 1.7) * 4;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + sway, 56); ctx.stroke();
    const glow = ctx.createRadialGradient(lx + sway, 78, 4, lx + sway, 78, 46);
    glow.addColorStop(0, 'rgba(255,190,90,0.55)');
    glow.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx + sway - 48, 30, 96, 96);
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath(); ctx.ellipse(lx + sway, 78, 20, 24, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(lx + sway - 20, 74, 40, 7);
    ctx.fillStyle = '#8a2a1a';
    ctx.fillRect(lx + sway - 8, 52, 16, 5);
    ctx.fillRect(lx + sway - 8, 99, 16, 5);
  });
}

function drawOrderBoard(ctx, board, t) {
  // The board: dark wood panel with hanging tickets.
  ctx.fillStyle = '#4a3220';
  roundRect(ctx, 16, 158, VIEW_W - 32, 118, 10);
  ctx.fill();
  ctx.fillStyle = '#5d4028';
  roundRect(ctx, 20, 162, VIEW_W - 40, 110, 8);
  ctx.fill();
  text(ctx, 'ORDER BOARD', 92, 176, 13, '#e8c98a', 'left');
  // A small neon sign for the stall name.
  text(ctx, '🏮 LANTERN RAMEN · MIDNIGHT STALL', 640, 176, 13, '#ffb84d');
  const ticketW = 218;
  const startX = 24;
  board.tickets.forEach((ticket, i) => {
    const recipe = recipeById(ticket.recipeId);
    const x = startX + i * (ticketW + 10);
    const y = 190;
    const urgent = ticket.patience / ticket.patienceMax < 0.3;
    const bob = urgent ? Math.sin(t * 8) * 2 : 0;
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = urgent ? '#ffe1d6' : '#fdf6e3';
    roundRect(ctx, x, y, ticketW, 76, 6);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#e0523d' : '#c9a86a';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, ticketW, 76, 6);
    ctx.stroke();
    // Ticket number + recipe name.
    text(ctx, '#' + ticket.id, x + 10, y + 14, 12, '#8a6a3a', 'left');
    text(ctx, recipe.name.toUpperCase(), x + 10, y + 34, 15, '#2b2b2b', 'left');
    // Recipe icons: broth dot + item icons.
    ctx.fillStyle = BROTHS[recipe.broth].color;
    ctx.beginPath(); ctx.arc(x + 18, y + 56, 8, 0, TAU); ctx.fill();
    text(ctx, BROTHS[recipe.broth].name, x + 30, y + 56, 11, '#5a4632', 'left');
    recipe.items.forEach((itemId, j) => {
      drawIngredientIcon(ctx, itemId, x + 108 + j * 30, y + 56, 10);
    });
    // Patience bar drains as the customer waits.
    const frac = Math.max(0, ticket.patience / ticket.patienceMax);
    ctx.fillStyle = '#d8cbb0';
    roundRect(ctx, x + 8, y + 68, ticketW - 16, 5, 2);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#7ec850' : frac > 0.25 ? '#f5b942' : '#e0523d';
    if (frac > 0) {
      roundRect(ctx, x + 8, y + 68, (ticketW - 16) * frac, 5, 2);
      ctx.fill();
    }
    ctx.restore();
  });
  if (board.tickets.length === 0) {
    text(ctx, 'No orders yet — the night is young…', 640, 228, 15, '#c9b48a');
  }
}

function drawHud(ctx, board, elapsed, muted) {
  const left = shiftTimeLeft(elapsed);
  const mm = Math.floor(left / 60);
  const ss = Math.floor(left % 60).toString().padStart(2, '0');
  const urgent = left <= 30;
  // Shift clock.
  ctx.fillStyle = urgent ? '#e0523d' : '#2b2b3a';
  roundRect(ctx, VIEW_W - 320, 8, 130, 44, 8);
  ctx.fill();
  text(ctx, 'TIME ' + mm + ':' + ss, VIEW_W - 255, 31, 16, '#ffffff');
  // Coins and streak, two lines so nothing overlaps.
  ctx.fillStyle = '#2b2b3a';
  roundRect(ctx, VIEW_W - 180, 8, 168, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath(); ctx.arc(VIEW_W - 168, 22, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a6a1a';
  ctx.font = 'bold 10px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¢', VIEW_W - 168, 22);
  text(ctx, board.earned + ' coins', VIEW_W - 156, 22, 14, '#ffd94d', 'left');
  text(ctx, 'streak x' + board.streak, VIEW_W - 156, 40, 12, board.streak >= 3 ? '#ffb84d' : '#b8b8c8', 'left');
  if (muted) text(ctx, 'MUTED (M)', VIEW_W - 340, 66, 11, '#b8b8c8', 'right');
}

// ---- kitchen floor and stations ------------------------------------------

function drawFloor(ctx) {
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(0, 276, VIEW_W, VIEW_H - 276);
  ctx.fillStyle = '#7a5638';
  for (let y = 300; y < VIEW_H; y += 48) ctx.fillRect(0, y, VIEW_W, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 276, VIEW_W, 10);
  // A narrow rug down the middle walkway.
  ctx.fillStyle = '#7a2a20';
  ctx.fillRect(595, 480, 90, VIEW_H - 480);
  ctx.fillStyle = '#a83a2c';
  ctx.fillRect(595, 480, 90, 5);
  ctx.fillRect(595, 500, 90, 3);
}

function drawStationBase(ctx, s, label, color) {
  ctx.fillStyle = '#3a2a1c';
  roundRect(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 10);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  text(ctx, label, s.x + s.w / 2, s.y + s.h - 12, 12, '#fff8ea');
}

function drawProgressRing(ctx, x, y, r, frac, color) {
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
}

function drawJobBubble(ctx, job, x, y) {
  if (!job) return;
  drawIngredientIcon(ctx, job.ingredientId, x, y - 18, 13);
  if (job.done) {
    text(ctx, 'READY!', x, y + 14, 13, '#b8f29a');
    drawProgressRing(ctx, x, y - 18, 17, 1, '#7ec850');
  } else {
    drawProgressRing(ctx, x, y - 18, 17, 1 - job.left / job.total, '#ffd94d');
    text(ctx, Math.ceil(job.left) + 's', x, y + 14, 13, '#ffe9a8');
  }
}

function drawCrates(ctx, kitchen) {
  drawStationBase(ctx, STATIONS.crates, 'INGREDIENT CRATES', '#8a6a42');
  for (const slot of CRATE_SLOTS) {
    const def = INGREDIENTS[slot.id];
    ctx.fillStyle = '#f4ead2';
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 2;
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 8);
    ctx.stroke();
    drawIngredientIcon(ctx, slot.id, slot.x + slot.w / 2, slot.y + 22, 13);
    text(ctx, def.name, slot.x + slot.w / 2, slot.y + slot.h - 8, 10, '#5a4632');
  }
  text(ctx, 'click to grab', STATIONS.crates.x + 75, 642, 11, '#e8c98a');
}

function drawKettle(ctx, kitchen) {
  drawStationBase(ctx, STATIONS.kettle, 'BROTH KETTLE', '#5d4028');
  for (const pot of KETTLE_POTS) {
    const broth = BROTHS[pot.id];
    ctx.fillStyle = '#3a2a1c';
    ctx.beginPath(); ctx.arc(pot.x + 20, pot.y + 22, 19, 0, TAU); ctx.fill();
    ctx.fillStyle = broth.color;
    ctx.beginPath(); ctx.arc(pot.x + 20, pot.y + 22, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(pot.x + 15, pot.y + 17, 5, 3, -0.4, 0, TAU); ctx.fill();
    text(ctx, broth.name, pot.x + 20, pot.y + 52, 10, '#fff8ea');
  }
  text(ctx, 'click a pot to ladle', 825, 466, 11, '#e8c98a');
}

function drawPlating(ctx, kitchen) {
  drawStationBase(ctx, STATIONS.plating, 'PLATING COUNTER', '#7a5638');
  BOWL_SLOTS.forEach((slot, i) => {
    const bowl = kitchen.bowls[i];
    if (!bowl) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(slot.x + 31, slot.y + 31, 26, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'empty bowl', slot.x + 31, slot.y + 31, 9, 'rgba(255,255,255,0.6)');
    } else {
      const recipe = recipeForBowl(bowl);
      drawBowl(ctx, slot.x + 31, slot.y + 28, 26, bowl.broth, bowl.items, !!recipe);
      if (recipe) text(ctx, recipe.name + ' ✓', slot.x + 31, slot.y + 62, 11, '#b8f29a');
      else if (bowl.broth) text(ctx, 'add ' + (3 - bowl.items.length) + ' more', slot.x + 31, slot.y + 62, 10, '#ffe9a8');
      else text(ctx, 'needs broth', slot.x + 31, slot.y + 62, 10, '#ffe9a8');
    }
  });
  text(ctx, 'click a bowl to add', 1015, 466, 11, '#e8c98a');
}

function drawServeWindow(ctx, kitchen, board) {
  drawStationBase(ctx, STATIONS.serve, 'SERVE', '#2b4a7a');
  // Window hatch with a waiting customer silhouette.
  ctx.fillStyle = '#141a33';
  roundRect(ctx, 1146, 320, 94, 90, 6);
  ctx.fill();
  const carried = kitchen.carried.find((c) => c.kind === 'bowl');
  const ticket = carried ? matchingTicket(board, recipeForBowl(carried)) : null;
  ctx.fillStyle = ticket ? '#ffd94d' : '#8a93a8';
  ctx.beginPath(); ctx.arc(1193, 368, 20, 0, TAU); ctx.fill(); // head
  ctx.beginPath(); ctx.ellipse(1193, 408, 26, 16, 0, Math.PI, 0); ctx.fill(); // shoulders
  ctx.fillStyle = '#141a33';
  ctx.beginPath(); ctx.arc(1186, 366, 3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(1200, 366, 3, 0, TAU); ctx.fill();
  text(ctx, ticket ? 'hungry!' : 'waiting…', 1193, 436, 11, '#fff8ea');
  text(ctx, 'click to serve', 1193, 642, 11, '#e8c98a');
  if (ticket) {
    const recipe = recipeById(ticket.recipeId);
    text(ctx, 'wants ' + recipe.name, 1193, 458, 11, '#ffd94d');
  }
}

function drawCook(ctx, kitchen, t) {
  const p = kitchen.player;
  const moving = Math.hypot(p.tx - p.x, p.ty - p.y) > 4;
  const bob = moving ? Math.sin(t * 12) * 2 : Math.sin(t * 2) * 1;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 26 - bob, 22, 7, 0, 0, TAU); ctx.fill();
  // Body: white chef coat, red neckerchief.
  ctx.fillStyle = '#f4f0e6';
  roundRect(ctx, -17, -8, 34, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#b23a2e';
  ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, -6); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
  // Head + toque.
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(0, -20, 13, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-7, -30, 8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -33, 9, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -30, 8, 0, TAU); ctx.fill();
  ctx.fillRect(-14, -32, 28, 6);
  // Eyes look the way the cook faces.
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.arc(p.facing * 3 - 4, -20, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(p.facing * 3 + 4, -20, 1.8, 0, TAU); ctx.fill();
  // Carried items float above the toque.
  kitchen.carried.forEach((item, i) => {
    const cx = -14 + i * 28;
    const cy = -48;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, TAU); ctx.fill();
    if (item.kind === 'bowl') {
      drawBowl(ctx, cx, cy, 12, item.broth, item.items, true);
    } else if (item.kind === 'broth') {
      ctx.fillStyle = BROTHS[item.id].color;
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f4ead2';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
    } else {
      drawIngredientIcon(ctx, item.id, cx, cy, 10);
    }
  });
  ctx.restore();
}

function drawSteam(ctx, kitchen, t) {
  // Steam wisps over the pot and kettle.
  const spots = [[285, 300], [825, 300]];
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  for (const [sx, sy] of spots) {
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.5 + i * 0.33) % 1;
      const y = sy - phase * 46;
      const x = sx + Math.sin(phase * 6 + i) * 6 + (i - 1) * 18;
      ctx.globalAlpha = 0.4 * (1 - phase);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 5, y - 8, x - 3, y - 16);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawFlash(ctx, kitchen) {
  const f = kitchen.flash;
  if (!f) return;
  ctx.globalAlpha = Math.min(1, f.left);
  text(ctx, f.text, f.x, f.y - 10, 15, f.color);
  ctx.globalAlpha = 1;
}

function drawHintBar(ctx, board, kitchen) {
  const carried = kitchen.carried;
  let hint = 'WASD / arrows to walk · click a crate to grab · E uses the station by you';
  const bowlItem = carried.find((c) => c.kind === 'bowl');
  if (bowlItem) {
    const recipe = recipeForBowl(bowlItem);
    hint = recipe
      ? 'Carrying ' + recipe.name + ' — click the SERVE window!'
      : 'Carrying an unfinished bowl — it is not ready yet';
  } else if (carried.length > 0) {
    const names = carried.map((c) => (c.kind === 'broth' ? BROTHS[c.id].name + ' broth' : INGREDIENTS[c.id].name)).join(' + ');
    hint = 'Carrying: ' + names + ' — pot / board / grill preps it, plating counter builds the bowl';
  }
  ctx.fillStyle = 'rgba(20,20,32,0.75)';
  roundRect(ctx, 16, VIEW_H - 34, VIEW_W - 32, 26, 8);
  ctx.fill();
  text(ctx, hint, VIEW_W / 2, VIEW_H - 20, 13, '#ffe9a8');
}

// ---- screens -------------------------------------------------------------

function drawTitle(ctx, t) {
  ctx.fillStyle = 'rgba(10,10,24,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // A paper lantern drawn above the title, never an emoji glyph.
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath(); ctx.ellipse(640, 148, 26, 32, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.fillRect(614, 143, 52, 9);
  ctx.fillStyle = '#8a2a1a';
  ctx.fillRect(632, 112, 16, 6);
  ctx.fillRect(632, 176, 16, 6);
  text(ctx, 'LANTERN RAMEN', 640, 220, 54, '#ffd94d');
  text(ctx, 'a midnight stall · a three-minute shift', 640, 262, 18, '#ffe9a8');
  const lines = [
    'Orders land on the board. Grab ingredients from the crates,',
    'boil the noodles, chop and grill the toppings, ladle the broth,',
    'build each bowl on the plating counter and serve it before',
    'the customer walks out. Serve fast for tips — keep the streak alive!',
  ];
  lines.forEach((line, i) => text(ctx, line, 640, 310 + i * 26, 16, '#f4ead2'));
  // The four recipes, at a glance.
  RECIPES.forEach((recipe, i) => {
    const x = 300 + i * 230;
    ctx.fillStyle = '#2b2b3a';
    roundRect(ctx, x - 100, 440, 200, 84, 10);
    ctx.fill();
    ctx.strokeStyle = recipe.color;
    ctx.lineWidth = 2;
    roundRect(ctx, x - 100, 440, 200, 84, 10);
    ctx.stroke();
    text(ctx, recipe.name, x, 458, 14, '#ffffff');
    ctx.fillStyle = BROTHS[recipe.broth].color;
    ctx.beginPath(); ctx.arc(x - 62, 486, 8, 0, TAU); ctx.fill();
    recipe.items.forEach((itemId, j) => drawIngredientIcon(ctx, itemId, x - 30 + j * 32, 486, 11));
    text(ctx, recipe.price + ' coins', x, 512, 12, '#ffd94d');
  });
  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK or press ENTER to open the stall', 640, 580, 20, '#ffffff');
  ctx.globalAlpha = 1;
  text(ctx, 'WASD / arrows walk · E use station · M mute · P pause', 640, 616, 13, '#b8b8c8');
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10,10,24,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSED', 640, 330, 44, '#ffffff');
  text(ctx, 'press P to keep cooking', 640, 380, 16, '#ffe9a8');
}

function drawResults(ctx, board) {
  ctx.fillStyle = 'rgba(10,10,24,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'SHIFT OVER — the lanterns dim', 640, 170, 36, '#ffd94d');
  const rows = [
    ['Bowls served', String(board.served)],
    ['Customers walked out', String(board.missed)],
    ['Best streak', 'x' + board.bestStreak],
    ['Coins earned', String(board.earned)],
  ];
  rows.forEach(([label, value], i) => {
    const y = 250 + i * 44;
    text(ctx, label, 480, y, 18, '#f4ead2', 'left');
    text(ctx, value, 800, y, 18, '#ffd94d', 'right');
  });
  const rating = board.served >= 12 ? 'LEGENDARY STALLKEEPER' : board.served >= 8 ? 'MASTER OF THE MIDNIGHT' : board.served >= 5 ? 'SOLID LINE COOK' : board.served >= 2 ? 'APPRENTICE — the stall believes in you' : 'A QUIET NIGHT — try again';
  text(ctx, rating, 640, 460, 22, '#ffffff');
  text(ctx, 'press ENTER to run another shift', 640, 520, 16, '#ffe9a8');
}

export function drawGame(ctx, state, t) {
  const { board, kitchen, elapsed, screen, muted } = state;
  drawNightSky(ctx, t);
  drawAwningAndLanterns(ctx, t);
  drawOrderBoard(ctx, board, t);
  drawHud(ctx, board, elapsed, muted);
  drawFloor(ctx);
  // Stations.
  drawCrates(ctx, kitchen);
  drawStationBase(ctx, STATIONS.pot, 'NOODLE POT', '#8a4a2b');
  drawJobBubble(ctx, kitchen.jobs.pot, 285, 340);
  drawStationBase(ctx, STATIONS.board, 'CHOPPING BOARD', '#6b8a4a');
  drawJobBubble(ctx, kitchen.jobs.board, 465, 340);
  drawStationBase(ctx, STATIONS.grill, 'GRILL', '#7a3a2b');
  drawJobBubble(ctx, kitchen.jobs.grill, 645, 340);
  drawKettle(ctx, kitchen);
  drawPlating(ctx, kitchen);
  drawServeWindow(ctx, kitchen, board);
  drawSteam(ctx, kitchen, t);
  drawCook(ctx, kitchen, t);
  drawFlash(ctx, kitchen);
  drawHintBar(ctx, board, kitchen);
  if (screen === 'title') drawTitle(ctx, t);
  if (screen === 'paused') drawPause(ctx);
  if (screen === 'results') drawResults(ctx, board);
}
