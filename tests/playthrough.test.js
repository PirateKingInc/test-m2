// Bot playthrough — proof the game is actually completable start to finish.
// A deterministic steering "bot" walks a scripted list of waypoints per
// level (hand-picked to route around walls and swing past a pickup or
// two) and the test asserts it reaches the WIN screen without the
// lantern ever running out.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, update, MAX_FUEL } from '../src/engine.js';
import { LEVELS } from '../src/levels.js';

const DT = 1 / 60;
const MAX_FRAMES = 60 * 90; // 90 simulated seconds — generous safety margin

// Waypoints are pixel targets for the player's top-left corner. Each leg
// changes only one axis from the previous target (pure horizontal or
// pure vertical), walked along a row/column hand-verified clear of the
// level's interior walls, so the bot never clips a wall corner by
// drifting diagonally into it. The chosen corridors also sweep through
// at least one fuel pickup per level along the way.
const WAYPOINTS = [
  [{ x: 132, y: 17 }, { x: 132, y: 124 }, { x: 140, y: 124 }], // Level 1
  [{ x: 139, y: 9 }, { x: 139, y: 131 }],                      // Level 2
  [{ x: 139, y: 9 }, { x: 139, y: 131 }],                      // Level 3
  [{ x: 112, y: 9 }, { x: 112, y: 24 }, { x: 148, y: 24 }, { x: 148, y: 131 }], // Level 4
];

function makeInput() {
  return { left: false, right: false, up: false, down: false, a: false, b: false, start: false };
}

test('bot playthrough completes all four levels and reaches WIN', () => {
  const game = createGame();
  const input = makeInput();

  let currentLevel = -1;
  let wpIdx = 0;
  const fuelLog = [];

  for (let frame = 0; frame < MAX_FRAMES; frame++) {
    Object.assign(input, makeInput());

    if (game.phase === 'TITLE') {
      input.a = true;
    } else if (game.phase === 'PLAYING') {
      if (game.levelIndex !== currentLevel) {
        currentLevel = game.levelIndex;
        wpIdx = 0;
      }
      const wp = WAYPOINTS[game.levelIndex][wpIdx];
      const dx = wp.x - game.player.x;
      const dy = wp.y - game.player.y;
      if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
        wpIdx = Math.min(wpIdx + 1, WAYPOINTS[game.levelIndex].length - 1);
      } else {
        if (dx > 3) input.right = true; else if (dx < -3) input.left = true;
        if (dy > 3) input.down = true; else if (dy < -3) input.up = true;
      }
    }
    // LEVEL_TRANS and WIN need no input.

    update(game, input, DT);
    fuelLog.push(game.fuel);

    if (game.phase === 'GAME_OVER') {
      assert.fail(
        `bot died on level ${game.levelIndex + 1} at frame ${frame} `
        + `(fuel trace tail: ${fuelLog.slice(-5).map((f) => f.toFixed(1)).join(', ')})`,
      );
    }
    if (game.phase === 'WIN') {
      assert.equal(game.levelIndex, LEVELS.length - 1, 'should win on the final level');
      assert.ok(game.fuel > 0, 'fuel must be above zero at the moment of winning');
      assert.ok(game.fuel <= MAX_FUEL, 'fuel should never exceed the max');
      return; // success
    }
  }

  assert.fail(`bot did not reach WIN within ${MAX_FRAMES} frames (stuck on level ${game.levelIndex + 1}, phase ${game.phase})`);
});
