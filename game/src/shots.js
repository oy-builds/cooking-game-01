// shots.js — deterministic screenshot presets. Each one puts the live game
// into a genuine gameplay state (real orders, real bowls, real timer) so a
// screenshot shows the game as it actually plays, then the game keeps running.
// The presets never edit the game: they only set state the game itself builds.
import { spawnTicket } from './orders.js';
import { recipeById } from './recipes.js';

function setTicketPatience(board, id, frac) {
  const ticket = board.tickets.find((t) => t.id === id);
  if (ticket) ticket.patience = ticket.patienceMax * frac;
}

// Cover: a busy stall mid-shift — three tickets on the board, a bowl
// mid-assembly on the plating counter, the cook carrying noodles, timer running.
function presetCover(game) {
  game.elapsed = 74;
  spawnTicket(game.board, game.elapsed, game.rng);
  spawnTicket(game.board, game.elapsed, game.rng);
  spawnTicket(game.board, game.elapsed, game.rng);
  game.board.tickets[0].recipeId = 'shoyu-classic';
  game.board.tickets[1].recipeId = 'spicy-tantan';
  game.board.tickets[2].recipeId = 'miso-corn';
  setTicketPatience(game.board, game.board.tickets[0].id, 0.55);
  setTicketPatience(game.board, game.board.tickets[1].id, 0.72);
  setTicketPatience(game.board, game.board.tickets[2].id, 0.9);
  game.board.earned = 86;
  game.board.streak = 4;
  game.board.served = 6;
  // A Shoyu Classic half-built: broth poured, noodles in, chashu to go.
  game.kitchen.bowls[0] = { broth: 'shoyu', items: ['noodles'] };
  game.kitchen.bowls[1] = { broth: 'miso', items: [] };
  game.kitchen.carried = [{ kind: 'prepped', id: 'chashu' }];
  game.kitchen.player.x = 880;
  game.kitchen.player.y = 560;
  game.kitchen.player.tx = 880;
  game.kitchen.player.ty = 560;
  game.kitchen.jobs.pot = { ingredientId: 'noodles', left: 1.5, total: 4, done: false };
  game.kitchen.jobs.grill = { ingredientId: 'chashu', left: 0, total: 4, done: true };
  game.kitchen.flash = { text: 'Shoyu Classic — one topping to go!', x: 1015, y: 300, left: 5, color: '#ffe9a8' };
}

// Counter: ingredients on the counter — every crate full, a job on each
// station, the cook grabbing from the crates.
function presetCounter(game) {
  game.elapsed = 22;
  spawnTicket(game.board, game.elapsed, game.rng);
  spawnTicket(game.board, game.elapsed, game.rng);
  game.board.tickets[0].recipeId = 'forest-veggie';
  game.board.tickets[1].recipeId = 'shoyu-classic';
  game.board.earned = 14;
  game.board.streak = 1;
  game.board.served = 1;
  game.kitchen.jobs.pot = { ingredientId: 'noodles', left: 2.2, total: 4, done: false };
  game.kitchen.jobs.board = { ingredientId: 'egg', left: 0.8, total: 2, done: false };
  game.kitchen.jobs.grill = { ingredientId: 'mushroom', left: 0, total: 3, done: true };
  game.kitchen.carried = [{ kind: 'raw', id: 'greens' }];
  game.kitchen.player.x = 130;
  game.kitchen.player.y = 560;
  game.kitchen.player.tx = 130;
  game.kitchen.player.ty = 560;
  game.kitchen.flash = { text: 'Greens grabbed — to the chopping board', x: 320, y: 500, left: 5, color: '#ffe9a8' };
}

// Assembly: one dish mid-assembly — a Spicy Tan-Tan with broth and two
// toppings in, the last topping in the cook's hands over the bowl.
function presetAssembly(game) {
  game.elapsed = 96;
  spawnTicket(game.board, game.elapsed, game.rng);
  spawnTicket(game.board, game.elapsed, game.rng);
  game.board.tickets[0].recipeId = 'spicy-tantan';
  game.board.tickets[1].recipeId = 'miso-corn';
  setTicketPatience(game.board, game.board.tickets[0].id, 0.4);
  game.board.earned = 102;
  game.board.streak = 5;
  game.board.served = 7;
  game.kitchen.bowls[0] = { broth: 'spicy', items: ['noodles', 'chashu'] };
  game.kitchen.carried = [{ kind: 'prepped', id: 'greens' }];
  game.kitchen.player.x = 1010;
  game.kitchen.player.y = 560;
  game.kitchen.player.tx = 1010;
  game.kitchen.player.ty = 560;
  game.kitchen.jobs.pot = { ingredientId: 'noodles', left: 0, total: 4, done: true };
  game.kitchen.flash = { text: 'Add the greens to finish Spicy Tan-Tan', x: 1015, y: 300, left: 5, color: '#b8f29a' };
}

// Serve: a finished bowl ready at the window — the cook carries a completed
// Shoyu Classic, its ticket waiting, timer and coins on the HUD.
function presetServe(game) {
  game.elapsed = 118;
  spawnTicket(game.board, game.elapsed, game.rng);
  spawnTicket(game.board, game.elapsed, game.rng);
  game.board.tickets[0].recipeId = 'shoyu-classic';
  game.board.tickets[1].recipeId = 'forest-veggie';
  setTicketPatience(game.board, game.board.tickets[0].id, 0.35);
  game.board.earned = 148;
  game.board.streak = 6;
  game.board.served = 10;
  const recipe = recipeById('shoyu-classic');
  game.kitchen.carried = [{ kind: 'bowl', recipeId: recipe.id, broth: 'shoyu', items: [...recipe.items] }];
  game.kitchen.player.x = 1120;
  game.kitchen.player.y = 560;
  game.kitchen.player.tx = 1120;
  game.kitchen.player.ty = 560;
  game.kitchen.flash = { text: 'Shoyu Classic is ready — serve it!', x: 940, y: 520, left: 5, color: '#b8f29a' };
}

export function applyShotPreset(game, name) {
  if (name === 'cover') presetCover(game);
  else if (name === 'counter') presetCounter(game);
  else if (name === 'assembly') presetAssembly(game);
  else if (name === 'serve') presetServe(game);
}

// A small debug handle for play-testing in the browser console.
export function exposeDebug(getGame, startShift) {
  window.RAMEN = {
    get game() { return getGame(); },
    start: startShift,
    state() {
      const game = getGame();
      return {
        screen: game.screen,
        elapsed: game.elapsed,
        tickets: game.board.tickets.map((t) => t.recipeId + ' ' + Math.round(t.patience) + 's'),
        carried: game.kitchen.carried,
        bowls: game.kitchen.bowls,
        earned: game.board.earned,
        streak: game.board.streak,
      };
    },
  };
}
