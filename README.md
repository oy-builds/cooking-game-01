[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/oy-builds/cooking-game-01/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/oy-builds/cooking-game-01/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# Lantern Ramen — Midnight Stall

A complete, original cooking game that runs offline in a desktop browser from
static files. You run a midnight ramen stall through one three-minute shift:
orders land on the board, you grab ingredients from the crates, boil the
noodles, chop and grill the toppings, ladle the broth, build each bowl on the
plating counter, and serve it before the customer walks out. Serve fast for
tips, keep the streak alive, and watch the tickets arrive faster as the night
wears on.

## How to play

- Orders appear on the board with a patience bar. Each ticket names a recipe:
  a broth plus three toppings.
- Grab raw ingredients from the crates (click, or walk up and press E).
- Prep them: noodles on the Noodle Pot, egg/corn/greens on the Chopping
  Board, chashu/mushroom on the Grill. A job takes a few seconds, then the
  finished item is ready to collect.
- Ladle a broth from the Broth Kettle (Shoyu, Miso or Spicy).
- Click an empty spot on the Plating Counter for a fresh bowl, then add the
  broth first and the three toppings. A bowl that matches a recipe glows and
  names the dish — click it to carry it.
- Click the Serving Window to serve a finished bowl to the customer who
  ordered it. Wrong bowls and walked-out customers break your streak.

Four recipes: Shoyu Classic, Miso Corn, Spicy Tan-Tan, Forest Veggie. The
shift lasts 3 minutes; orders spawn faster and wait less patiently as it goes
on. Your coins, streak and best streak are scored at the end of the shift.

## Controls

- **WASD / arrow keys** — walk the cook (or click the floor to walk there)
- **Click** — grab, prep, ladle, build, serve
- **E / Space** — use the nearest station
- **P** — pause, **M** — mute, **Enter** — start / play again

## Run it

Serve `game/` with any static server and open `index.html` — no build step,
no network requests, all art drawn on canvas and all sounds synthesized with
WebAudio:

```
node serve.ts   # then open http://localhost:8080
```

## Layout

- `game/index.html` + `game/style.css` — page shell
- `game/src/main.js` — boot and game loop
- `game/src/recipes.js` — ingredients, broths, recipes
- `game/src/orders.js` — order board, patience, scoring
- `game/src/kitchen.js` — stations, cook, carrying, bowls
- `game/src/render.js` — all canvas drawing
- `game/src/audio.js` — synthesized sounds
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — screenshot presets and debug handle
- `main.ts` — hands the game, screenshots and dossier to `/output`
- `screenshots/` — real renders of the game in headless Chromium
