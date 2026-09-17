import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, update, loadLevel, collides, tryMove, isSpikeDangerous,
  MAX_FUEL, PASSIVE_DRAIN, DRIFTER_DAMAGE, SPIKE_DAMAGE, PICKUP_RESTORE,
} from '../src/engine.js';
import { LEVELS, TILE } from '../src/levels.js';

const DT = 1 / 60;
const NO_INPUT = { left: false, right: false, up: false, down: false, a: false, b: false, start: false };
const input = (overrides) => ({ ...NO_INPUT, ...overrides });

function closeTo(actual, expected, tolerance, msg) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${msg}: expected ${actual} to be within ${tolerance} of ${expected}`);
}

// --- Collision -------------------------------------------------------

test('collides() detects solid border walls and open floor', () => {
  const tiles = LEVELS[0].tiles;
  assert.equal(collides(tiles, 0, 0, 6, 6), true, 'top-left corner is a wall');
  assert.equal(collides(tiles, 16, 16, 6, 6), false, 'interior floor near spawn is open');
});

test('tryMove() blocks a move that would enter a solid tile', () => {
  const tiles = LEVELS[0].tiles;
  const player = { x: 9, y: 16, w: 6, h: 6 };
  tryMove(player, -10, 0, tiles);
  assert.ok(player.x >= TILE, `player.x=${player.x} must not cross into the border wall`);
});

test('player cannot pass through solid tiles across many simulated frames', () => {
  const game = createGame();
  update(game, input({ a: true }), DT); // TITLE -> PLAYING, loads level 0
  for (let i = 0; i < 300; i++) {
    update(game, input({ left: true, up: true }), DT); // drive into the top-left wall
  }
  assert.ok(game.player.x >= TILE, `player.x=${game.player.x} should be stopped by the wall`);
  assert.ok(game.player.y >= TILE, `player.y=${game.player.y} should be stopped by the wall`);
});

// --- Hazard behaviour: Drifter (patrol enemy) -------------------------

test('drifter patrols back and forth and reverses at its bounds', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';
  const d = game.drifters[0];
  assert.equal(d.dir, 1);
  assert.equal(d.axis, 'x');

  for (let i = 0; i < 400; i++) update(game, input(), DT);

  assert.ok(d.x >= d.min - 0.001 && d.x <= d.max + 0.001, 'drifter stays within its patrol range');
});

test('drifter reaching max bound flips direction to -1, then min bound flips back to 1', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';
  const d = game.drifters[0];
  const framesToMax = Math.ceil((d.max - d.x) / d.speed / DT) + 2;
  for (let i = 0; i < framesToMax; i++) update(game, input(), DT);
  assert.equal(d.dir, -1, 'drifter should reverse after reaching max');

  const framesToMin = Math.ceil((d.max - d.min) / d.speed / DT) + 2;
  for (let i = 0; i < framesToMin; i++) update(game, input(), DT);
  assert.equal(d.dir, 1, 'drifter should reverse again after reaching min');
});

test('touching a drifter drains fuel once per invulnerability window (no repeat-frame drain)', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';
  const d = game.drifters[0];
  game.player.x = d.x;
  game.player.y = d.y;
  game.player.invuln = 0;

  const fuelBefore = game.fuel;
  update(game, input(), DT);
  closeTo(game.fuel, fuelBefore - PASSIVE_DRAIN * DT - DRIFTER_DAMAGE, 1e-6,
    'first contact frame should apply passive drain plus one drifter hit');
  assert.ok(game.player.invuln > 0, 'player should be invulnerable right after a hit');

  const fuelAfterHit = game.fuel;
  update(game, input(), DT);
  closeTo(game.fuel, fuelAfterHit - PASSIVE_DRAIN * DT, 1e-6,
    'while invulnerable, only passive drain should apply, not another hit');
});

// --- Hazard behaviour: Pulse Spike (timer enemy) ----------------------

test('isSpikeDangerous() toggles safe/dangerous on its own fixed timer', () => {
  const spike = { onDur: 1.0, offDur: 1.0, phase: 0 };
  assert.equal(isSpikeDangerous(spike, 0), false);
  assert.equal(isSpikeDangerous(spike, 0.99), false);
  assert.equal(isSpikeDangerous(spike, 1.01), true);
  assert.equal(isSpikeDangerous(spike, 1.99), true);
  assert.equal(isSpikeDangerous(spike, 2.01), false, 'cycle should repeat with the same period');
});

test('standing on a spike only drains fuel while it is in its dangerous phase', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';
  const s = game.spikes[0];
  game.player.x = s.x;
  game.player.y = s.y;
  game.player.invuln = 0;
  game.levelClock = 1.5; // within the [1.0, 2.0) dangerous window for onDur=1, offDur=1, phase=0

  const fuelBefore = game.fuel;
  update(game, input(), DT);
  closeTo(game.fuel, fuelBefore - PASSIVE_DRAIN * DT - SPIKE_DAMAGE, 1e-6,
    'a dangerous spike should apply passive drain plus one spike hit');

  const fuelAfterHit = game.fuel;
  update(game, input(), DT); // still dangerous, but now invulnerable
  closeTo(game.fuel, fuelAfterHit - PASSIVE_DRAIN * DT, 1e-6,
    'while invulnerable, standing on the same dangerous spike should not hit again');
});

// --- Resource system ---------------------------------------------------

test('fuel reaching zero triggers GAME_OVER', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';
  game.fuel = SPIKE_DAMAGE - 1; // guarantees a spike hit drops it to <= 0
  const s = game.spikes[0];
  game.player.x = s.x;
  game.player.y = s.y;
  game.player.invuln = 0;
  game.levelClock = 1.5;

  update(game, input(), DT);

  assert.equal(game.phase, 'GAME_OVER');
  assert.equal(game.fuel, 0, 'fuel should be clamped at 0, never negative');
  assert.equal(game.lastEvent, 'gameover');
});

test('pickups restore fuel and are consumed once', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';
  game.fuel = 50;
  const p = game.pickups[0];
  game.player.x = p.x;
  game.player.y = p.y;

  update(game, input(), DT);
  closeTo(game.fuel, 50 - PASSIVE_DRAIN * DT + PICKUP_RESTORE, 1e-6);
  assert.equal(p.collected, true);

  const fuelAfterPickup = game.fuel;
  update(game, input(), DT); // second frame on the same tile: pickup already collected
  closeTo(game.fuel, fuelAfterPickup - PASSIVE_DRAIN * DT, 1e-6,
    'an already-collected pickup must not restore fuel again');
});

test('fuel is capped at maxFuel when picking up while near full', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';
  game.fuel = MAX_FUEL - 1;
  const p = game.pickups[0];
  game.player.x = p.x;
  game.player.y = p.y;

  update(game, input(), DT);
  assert.equal(game.fuel, MAX_FUEL);
});

// --- Level transitions ---------------------------------------------------

test('reaching the exit on a non-final level starts a LEVEL_TRANS and then loads the next level', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';
  game.player.x = game.exit.x;
  game.player.y = game.exit.y;

  update(game, input(), DT);
  assert.equal(game.phase, 'LEVEL_TRANS');
  assert.equal(game.pendingNextLevel, 1);
  assert.ok(game.transitionTimer > 0);

  const framesToFinish = Math.ceil(game.transitionTimer / DT) + 2;
  for (let i = 0; i < framesToFinish; i++) update(game, input(), DT);

  assert.equal(game.phase, 'PLAYING');
  assert.equal(game.levelIndex, 1);
  closeTo(game.player.x, LEVELS[1].playerStart.x + 1, 0.001);
  closeTo(game.player.y, LEVELS[1].playerStart.y + 1, 0.001);
});

test('every level transitions to the next, in order, across all four levels', () => {
  const game = createGame();
  loadLevel(game, 0);
  game.phase = 'PLAYING';

  for (let lvl = 0; lvl < LEVELS.length - 1; lvl++) {
    assert.equal(game.levelIndex, lvl);
    game.player.x = game.exit.x;
    game.player.y = game.exit.y;
    update(game, input(), DT);
    assert.equal(game.phase, 'LEVEL_TRANS');
    const frames = Math.ceil(game.transitionTimer / DT) + 2;
    for (let i = 0; i < frames; i++) update(game, input(), DT);
    assert.equal(game.phase, 'PLAYING');
    assert.equal(game.levelIndex, lvl + 1);
  }
});

// --- Win condition ---------------------------------------------------

test('reaching the exit on the final level triggers WIN', () => {
  const game = createGame();
  loadLevel(game, LEVELS.length - 1);
  game.phase = 'PLAYING';
  game.player.x = game.exit.x;
  game.player.y = game.exit.y;

  update(game, input(), DT);

  assert.equal(game.phase, 'WIN');
  assert.equal(game.lastEvent, 'win');
});

// --- State machine ---------------------------------------------------

test('state machine: TITLE -> PLAYING -> PAUSED -> PLAYING, GAME_OVER/WIN -> TITLE', () => {
  const game = createGame();
  assert.equal(game.phase, 'TITLE');

  update(game, input({ a: true }), DT);
  assert.equal(game.phase, 'PLAYING');

  update(game, input({ start: true }), DT);
  assert.equal(game.phase, 'PAUSED');

  update(game, input({ start: false }), DT); // no edge, stays paused
  assert.equal(game.phase, 'PAUSED');

  update(game, input({ start: true }), DT);
  assert.equal(game.phase, 'PLAYING');

  game.phase = 'GAME_OVER';
  update(game, input({ a: true }), DT);
  assert.equal(game.phase, 'TITLE');

  update(game, input({ a: true }), DT); // fresh press starts a new run
  game.phase = 'WIN';
  update(game, input({ a: false }), DT); // reset edge tracking
  update(game, input({ a: true }), DT);
  assert.equal(game.phase, 'TITLE');
});

test('starting a new game from TITLE resets fuel to max and loads level 0', () => {
  const game = createGame();
  game.fuel = 3; // simulate a prior depleted run
  update(game, input({ a: true }), DT);
  assert.equal(game.phase, 'PLAYING');
  assert.equal(game.fuel, MAX_FUEL);
  assert.equal(game.levelIndex, 0);
});
