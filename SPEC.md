# SPEC — Cave Lantern

## Genre & Concept

Top-down tile-based action game in the spirit of an early-90s Game Boy
title. You play a miner descending through a collapsed mine, carrying a
lantern that is also your health bar. The lantern burns fuel constantly;
touching hazards drains it faster. Collect fuel pickups, dodge or outrun
two distinct hazard types, and reach the glowing crystal exit on each of
four hand-built screens to climb back to the surface.

Original IP: no existing characters, names, music, or level layouts are
reused from any commercial game.

## Core Loop

1. Player spawns on a level with a fixed lantern fuel amount (shared
   across the whole run, not refilled per level except via pickups).
2. Player moves through a tile-based room, colliding with solid walls.
3. Fuel drains 1 unit per second automatically (lantern burn).
4. Two hazard types threaten the player:
   - **Drifter** (bat): moves back and forth along a fixed patrol path;
     contact drains a fuel chunk and knocks the player back one tile.
   - **Pulse Spike**: stationary hazard tile that alternates
     safe/dangerous on a fixed timer; standing on it while dangerous
     drains a fuel chunk per tick.
5. Fuel pickups (small glowing ore) restore fuel when walked over.
6. Reaching the level's exit tile advances to the next level, carrying
   remaining fuel forward.
7. If fuel reaches 0, game over.
8. Reaching the exit of the final (4th) level triggers the win screen.

## Win Condition

Reach the exit tile of Level 4 with fuel remaining above 0.

## Systems (in scope, to be built)

1. **State machine**: TITLE → PLAYING → PAUSED → GAME_OVER / WIN, with
   transitions on defined inputs.
2. **Fixed-timestep game loop** decoupled from rendering (logic update
   at a constant simulated Hz regardless of actual frame rate).
3. **Tile-based world renderer**: 160x144 internal resolution, 8x8
   tiles, 4-colour palette, nearest-neighbour upscale to fill the
   window.
4. **Player movement + collision** against solid tiles, grid-aligned
   movement with sub-tile smooth interpolation.
5. **Camera**: none needed — each level fits in one 160x144 screen
   (20x18 tiles). No scrolling.
6. **Hazard system** with two distinct behaviors (Drifter patrol AI,
   Pulse Spike timer AI), each implemented as pure data + pure update
   functions.
7. **Resource system**: lantern fuel (acts as health/lives in one),
   HUD fuel bar, damage-on-contact with i-frames (brief invulnerability
   after a hit) to prevent multi-hit-per-frame drain.
8. **Pickup system**: fuel ore pickups, consumed on contact.
9. **Level data format**: each level is a plain JS data file
   (tilemap array + entity list + exit position) in `levels.js`,
   authored as readable arrays, loaded by the engine — never
   hardcoded into the render/update loop.
10. **Level transition**: fade/flash transition, carries fuel forward,
    resets hazard state, loads next level.
11. **Four hand-designed levels** with increasing hazard density.
12. **Win screen** and **game-over screen**, each returning to TITLE on
    input.
13. **Audio**: Web Audio API synthesized SFX (step-adjacent optional,
    hit, pickup, exit, game-over, win) and a simple looping synthesized
    background tone/arpeggio. No audio files.
14. **Input**: keyboard (arrow keys/WASD + two action buttons Z/X for
    confirm/pause) and on-screen touch D-pad + two buttons for mobile,
    both mapped to the same internal input state.
15. **Juice**: screen flash on hit, particle-free simple squash on
    pickup, palette flash on transitions — kept minimal.
16. **Pure/testable core**: game logic (movement, collision, hazard AI,
    fuel, transitions, win/lose) lives in plain functions/modules with
    no DOM or canvas dependency, so a Node test script can drive it
    headlessly via scripted input frames.

## Out of Scope

- No save system / persistence between browser sessions.
- No dialogue trees or NPCs.
- No shops, currency, or inventory beyond the single fuel resource.
- No procedural generation — all 4 levels are hand-authored fixed data.
- No multiplayer or networking of any kind.
- No external asset files (images, audio files, fonts) — everything is
  code-drawn pixels and synthesized audio.
- No build step, bundler, or npm runtime dependency — plain
  HTML/CSS/JS, runs by opening `index.html`.
- No more than 4 levels; no endless/score-chase mode.
- No enemy types beyond the two specified (Drifter, Pulse Spike).
- No level editor.

Anything else desired later goes in `BACKLOG.md`, not into this build.
