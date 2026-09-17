# Cave Lantern

A Game Boy-style single-player cave descent. Play it live:

**https://piratekinginc.github.io/test-m2/**

## Concept

You're a miner whose only light source is a lantern that doubles as your
health bar — it burns fuel every second, and burns faster when hazards
touch you. Cross four hand-built cave screens, dodge two kinds of
hazards, grab fuel ore to keep the light alive, and reach the crystal
exit on the fourth screen to climb back to the surface. No save system,
no shops, no endless score chase — just four screens and an ending,
playable start to finish in about 5-10 minutes.

Original concept, original pixel art (drawn in code), original
synthesized sound (Web Audio API) — no assets, no existing IP.

## Controls

**Desktop:** Arrow keys or WASD to move, `Z` (or `,`) for the A button,
`X` (or `.`) for the B button, `Enter`/`Space` to start or pause.

**Mobile:** on-screen D-pad and A/B/START buttons appear automatically
below the screen.

- **A** — start the game from the title screen, and confirm on the
  game-over/win screens.
- **START** — pause / unpause during play.

## Running it locally

It's a static site with zero dependencies and no build step:

```
open index.html
```

(or serve the folder with any static file server — nothing fetches
anything at runtime, so `file://` works fine).

## Running the tests

The game logic (`src/engine.js`) is pure — no DOM, no canvas, no Web
Audio — so it's driven headlessly by two Node test scripts with **no
npm dependencies** (Node's built-in test runner):

```
npm test
# or: node --test
```

This runs:

- `tests/engine.test.js` — unit tests covering wall collision, both
  hazard types (the patrolling Drifter and the timed Pulse Spike),
  fuel drain/pickup/game-over, every level transition, the win
  condition, and the title/pause/play/game-over state machine.
- `tests/playthrough.test.js` — a scripted bot that plays the game
  start to finish and asserts it reaches the WIN screen. This is the
  proof the game is actually completable.

## Project layout

- `SPEC.md` — the scope contract this game was built to.
- `BACKLOG.md` — things deliberately left out of v1.
- `index.html` / `style.css` — page shell, canvas, on-screen controls.
- `src/engine.js` — pure game logic and state machine.
- `src/levels.js` — the four hand-authored level tilemaps and entity
  lists, as plain readable text/data.
- `src/render.js` — canvas rendering (160x144, 4-colour palette, 8x8
  tiles, nearest-neighbour scaling).
- `src/input.js` — keyboard + touch input.
- `src/audio.js` — synthesized sound effects and music.
- `src/main.js` — fixed-timestep game loop wiring it all together.
- `tests/` — the Node test scripts described above.
