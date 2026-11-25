// input.js — keyboard and mouse for the stall. WASD or arrows walk the cook,
// E uses the station the cook stands by, Space does the same, P pauses,
// Enter starts, M mutes. Clicking walks the cook or uses what was clicked.
export function createInput() {
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false },
    onClick: null, // (x, y) in canvas pixels
    onKey: null, // (code) for one-shot keys
  };
}

export function bindInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    input.keys.add(event.code);
    if (input.onKey) input.onKey(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    input.mouse.x = x;
    input.mouse.y = y;
    input.mouse.down = true;
    if (input.onClick) input.onClick(x, y);
  });
  canvas.addEventListener('pointerup', () => {
    input.mouse.down = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
}

// Read the held movement keys into a unit vector; zero when none are held.
export function movementVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}
