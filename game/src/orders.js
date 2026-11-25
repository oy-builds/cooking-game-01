// orders.js — the order board: tickets spawn, wait, get served or walk out.
// Pressure grows by the clock, never by adding chores: tickets arrive faster
// and wait less patiently as the shift wears on, while the kitchen stays the same.
import { RECIPES } from './recipes.js';

export const SHIFT_SECONDS = 180; // a three-minute midnight shift
export const MAX_TICKETS = 4;

let nextTicketId = 1;

export function createOrderBoard() {
  return {
    tickets: [],
    spawnTimer: 4, // first ticket lands a few seconds in
    served: 0,
    missed: 0,
    earned: 0,
    streak: 0,
    bestStreak: 0,
  };
}

function spawnInterval(elapsedSeconds) {
  // 14s between tickets at the start, 7s by the end of the shift.
  const t = Math.min(1, elapsedSeconds / SHIFT_SECONDS);
  return 14 - 7 * t;
}

function patienceSeconds(elapsedSeconds) {
  // 52s of patience early, 34s late: the rush reads in the draining bars.
  const t = Math.min(1, elapsedSeconds / SHIFT_SECONDS);
  return 52 - 18 * t;
}

function pickRecipeId(rng) {
  const weights = [0.30, 0.26, 0.24, 0.20]; // classic first, veggie rarest
  let roll = rng();
  for (let i = 0; i < RECIPES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RECIPES[i].id;
  }
  return RECIPES[0].id;
}

export function spawnTicket(board, elapsedSeconds, rng) {
  if (board.tickets.length >= MAX_TICKETS) return null;
  const patience = patienceSeconds(elapsedSeconds);
  const ticket = {
    id: nextTicketId++,
    recipeId: pickRecipeId(rng),
    patience,
    patienceMax: patience,
    bornAt: elapsedSeconds,
    state: 'waiting', // waiting | served | walked
  };
  board.tickets.push(ticket);
  return ticket;
}

// Advance the board one frame: spawn new tickets, drain patience, drop the
// ones whose customers gave up. Returns tickets that walked out this frame.
export function updateOrderBoard(board, dt, elapsedSeconds, rng) {
  const walked = [];
  board.spawnTimer -= dt;
  if (board.spawnTimer <= 0) {
    const spawned = spawnTicket(board, elapsedSeconds, rng);
    board.spawnTimer = spawned ? spawnInterval(elapsedSeconds) : 2;
  }
  for (const ticket of board.tickets) {
    if (ticket.state !== 'waiting') continue;
    ticket.patience -= dt;
    if (ticket.patience <= 0) {
      ticket.patience = 0;
      ticket.state = 'walked';
      walked.push(ticket);
    }
  }
  board.tickets = board.tickets.filter((t) => t.state === 'waiting');
  for (const ticket of walked) {
    board.missed += 1;
    board.streak = 0;
  }
  return walked;
}

// Serve a finished bowl: find the waiting ticket its recipe matches, pay
// with a tip for the patience still left, and grow the streak.
export function serveBowl(board, recipe) {
  const index = board.tickets.findIndex(
    (t) => t.state === 'waiting' && t.recipeId === recipe.id,
  );
  if (index === -1) return null;
  const ticket = board.tickets[index];
  board.tickets.splice(index, 1);
  const patienceLeft = Math.max(0, ticket.patience / ticket.patienceMax);
  const tip = Math.round(recipe.price * 0.6 * patienceLeft);
  const streakBonus = Math.min(8, board.streak * 2);
  const paid = recipe.price + tip + streakBonus;
  board.served += 1;
  board.earned += paid;
  board.streak += 1;
  board.bestStreak = Math.max(board.bestStreak, board.streak);
  return { ticket, paid, tip, streakBonus, patienceLeft };
}

// The ticket a bowl could serve right now, for the serving-window hint.
export function matchingTicket(board, recipe) {
  if (!recipe) return null;
  return board.tickets.find((t) => t.state === 'waiting' && t.recipeId === recipe.id) || null;
}

export function shiftTimeLeft(elapsedSeconds) {
  return Math.max(0, SHIFT_SECONDS - elapsedSeconds);
}

export function shiftOver(elapsedSeconds) {
  return elapsedSeconds >= SHIFT_SECONDS;
}
