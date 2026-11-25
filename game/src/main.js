// main.js — boot and the game loop for Lantern Ramen.
// Screens: title → playing → paused → results → playing again.
// The loop is fixed-step logic on requestAnimationFrame with a real delta.
import { createKitchen, interactAt, interactNearest, updateKitchen, VIEW_W, VIEW_H } from './kitchen.js';
import { createOrderBoard, updateOrderBoard, shiftOver } from './orders.js';
import { createInput, bindInput, movementVector } from './input.js';
import { drawGame } from './render.js';
import { sounds, ensureAudio, toggleMute, isMuted } from './audio.js';
import { applyShotPreset, exposeDebug } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGame() {
  return {
    screen: 'title', // title | playing | paused | results
    board: createOrderBoard(),
    kitchen: createKitchen(),
    elapsed: 0,
    rng: mulberry32(20261125),
    lastTick: 0,
  };
}

let game = createGame();
const input = createInput();
bindInput(input, canvas);

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

function startShift() {
  game = createGame();
  game.screen = 'playing';
  game.rng = mulberry32((Date.now() % 100000) + 7);
  ensureAudio();
  sounds.start();
  announce('Shift started. First orders are coming in.');
}

function playSoundFor(eventName) {
  if (eventName === 'grab') sounds.grab();
  else if (eventName === 'start') sounds.sizzle();
  else if (eventName === 'collect') sounds.ding();
  else if (eventName === 'broth') sounds.pour();
  else if (eventName === 'bowl' || eventName === 'add') sounds.chop();
  else if (eventName === 'serve') sounds.serve();
  else if (eventName === 'deny') sounds.deny();
}

input.onClick = (x, y) => {
  ensureAudio();
  if (game.screen === 'title') { startShift(); return; }
  if (game.screen === 'results') { startShift(); return; }
  if (game.screen !== 'playing') return;
  const eventName = interactAt(game.kitchen, game.board, x, y);
  playSoundFor(eventName);
};

input.onKey = (code) => {
  if (code === 'Enter') {
    if (game.screen === 'title' || game.screen === 'results') startShift();
    return;
  }
  if (code === 'KeyM') {
    const muted = toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
    return;
  }
  if (game.screen !== 'playing') {
    if (code === 'KeyP' && game.screen === 'paused') {
      game.screen = 'playing';
      announce('Back to cooking.');
    }
    return;
  }
  if (code === 'KeyP') {
    game.screen = 'paused';
    announce('Paused.');
    return;
  }
  if (code === 'KeyE' || code === 'Space') {
    const eventName = interactNearest(game.kitchen, game.board);
    playSoundFor(eventName);
  }
};

function update(dt) {
  if (game.screen !== 'playing') return;
  game.elapsed += dt;
  const walked = updateOrderBoard(game.board, dt, game.elapsed, game.rng);
  if (walked.length > 0) {
    sounds.walkout();
    announce(walked.length + ' customer(s) walked out.');
  }
  // Held keys steer the cook toward the click target.
  const mv = movementVector(input);
  if (mv) {
    const p = game.kitchen.player;
    p.tx = Math.max(30, Math.min(VIEW_W - 30, p.x + mv.x * 60));
    p.ty = Math.max(300, Math.min(VIEW_H - 40, p.y + mv.y * 60));
  }
  updateKitchen(game.kitchen, dt);
  // The last ten seconds tick audibly.
  const left = 180 - game.elapsed;
  if (left <= 10 && left > 0 && Math.floor(left) !== Math.floor(left + dt)) sounds.tick();
  if (shiftOver(game.elapsed)) {
    game.screen = 'results';
    sounds.ding();
    announce('Shift over. ' + game.board.served + ' bowls served, ' + game.board.earned + ' coins earned.');
  }
}

let lastTime = 0;
function frame(time) {
  const t = time / 1000;
  const dt = Math.min(0.05, lastTime ? (time - lastTime) / 1000 : 0.016);
  lastTime = time;
  update(dt);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawGame(ctx, {
    board: game.board,
    kitchen: game.kitchen,
    elapsed: game.elapsed,
    screen: game.screen,
    muted: isMuted(),
  }, t);
  requestAnimationFrame(frame);
}

// A screenshot preset (?shot=cover&seed=…) jumps straight into a staged,
// genuine gameplay state; the game then keeps running from there.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  game.screen = 'playing';
  game.rng = mulberry32(Number(params.get('seed') || 7));
  applyShotPreset(game, shot);
  announce('Screenshot preset: ' + shot);
}

exposeDebug(() => game, startShift);
requestAnimationFrame(frame);
