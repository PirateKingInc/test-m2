// Pure game logic — no DOM, no canvas, no Web Audio. Everything here is
// plain data + deterministic functions so it can be driven headlessly
// by the node test scripts in tests/, exactly as it is driven by the
// real fixed-timestep loop in main.js.

import { LEVELS, TILE } from './levels.js';

export const PLAYER_SIZE = 6;
export const PLAYER_SPEED = 40; // px/sec
export const MAX_FUEL = 100;
export const PASSIVE_DRAIN = 3; // fuel/sec
export const DRIFTER_DAMAGE = 18;
export const SPIKE_DAMAGE = 14;
export const PICKUP_RESTORE = 20;
export const INVULN_DURATION = 1.0; // seconds
export const KNOCKBACK_DIST = 8; // px
export const TRANSITION_DURATION = 0.6; // seconds
export const DRIFTER_SIZE = 8;

const EMPTY_INPUT = Object.freeze({
  left: false, right: false, up: false, down: false,
  a: false, b: false, start: false,
});

export function createGame() {
  return {
    phase: 'TITLE',
    levelIndex: 0,
    fuel: MAX_FUEL,
    maxFuel: MAX_FUEL,
    player: { x: 0, y: 0, w: PLAYER_SIZE, h: PLAYER_SIZE, invuln: 0 },
    tiles: null,
    exit: null,
    drifters: [],
    spikes: [],
    pickups: [],
    levelClock: 0,
    transitionTimer: 0,
    pendingNextLevel: null,
    hitFlash: 0,
    lastEvent: null,
    _prev: { ...EMPTY_INPUT },
  };
}

function isSolidTile(tiles, tx, ty) {
  if (ty < 0 || ty >= tiles.length) return true;
  const row = tiles[ty];
  if (tx < 0 || tx >= row.length) return true;
  return row[tx] === 1;
}

export function collides(tiles, x, y, w, h) {
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + w - 1) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + h - 1) / TILE);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (isSolidTile(tiles, tx, ty)) return true;
    }
  }
  return false;
}

export function tryMove(player, dx, dy, tiles) {
  if (dx !== 0) {
    const nx = player.x + dx;
    if (!collides(tiles, nx, player.y, player.w, player.h)) player.x = nx;
  }
  if (dy !== 0) {
    const ny = player.y + dy;
    if (!collides(tiles, player.x, ny, player.w, player.h)) player.y = ny;
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function isSpikeDangerous(spike, levelClock) {
  const period = spike.onDur + spike.offDur;
  const t = ((levelClock + spike.phase) % period + period) % period;
  return t >= spike.offDur;
}

export function loadLevel(game, levelIndex) {
  const def = LEVELS[levelIndex];
  game.levelIndex = levelIndex;
  game.tiles = def.tiles;
  game.exit = def.exit;
  game.player.x = def.playerStart.x + 1;
  game.player.y = def.playerStart.y + 1;
  game.player.invuln = 0;
  game.drifters = def.drifters.map((d) => ({ ...d, dir: 1 }));
  game.spikes = def.spikes.map((s) => ({ ...s }));
  game.pickups = def.pickups.map((p) => ({ x: p.x, y: p.y, w: TILE, h: TILE, collected: false }));
  game.levelClock = 0;
  game.transitionTimer = 0;
  game.pendingNextLevel = null;
}

function updateDrifter(d, dt) {
  if (d.axis === 'x') {
    d.x += d.dir * d.speed * dt;
    if (d.x <= d.min) { d.x = d.min; d.dir = 1; }
    else if (d.x >= d.max) { d.x = d.max; d.dir = -1; }
  } else {
    d.y += d.dir * d.speed * dt;
    if (d.y <= d.min) { d.y = d.min; d.dir = 1; }
    else if (d.y >= d.max) { d.y = d.max; d.dir = -1; }
  }
}

function playerRect(game) {
  return { x: game.player.x, y: game.player.y, w: game.player.w, h: game.player.h };
}

function updatePlaying(game, input, dt) {
  if (input.start && !game._prev.start) {
    game.phase = 'PAUSED';
    return;
  }

  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }
  tryMove(game.player, dx * PLAYER_SPEED * dt, dy * PLAYER_SPEED * dt, game.tiles);

  game.levelClock += dt;
  for (const d of game.drifters) updateDrifter(d, dt);

  if (game.player.invuln > 0) game.player.invuln = Math.max(0, game.player.invuln - dt);
  if (game.hitFlash > 0) game.hitFlash = Math.max(0, game.hitFlash - dt);

  game.fuel -= PASSIVE_DRAIN * dt;

  const pRect = playerRect(game);

  if (game.player.invuln === 0) {
    for (const d of game.drifters) {
      const dRect = { x: d.x, y: d.y, w: DRIFTER_SIZE, h: DRIFTER_SIZE };
      if (rectsOverlap(pRect, dRect)) {
        game.fuel -= DRIFTER_DAMAGE;
        game.player.invuln = INVULN_DURATION;
        game.hitFlash = 0.2;
        game.lastEvent = 'hit';
        const cx = game.player.x + game.player.w / 2;
        const cy = game.player.y + game.player.h / 2;
        const dcx = d.x + DRIFTER_SIZE / 2;
        const dcy = d.y + DRIFTER_SIZE / 2;
        let kx = cx - dcx;
        let ky = cy - dcy;
        const len = Math.hypot(kx, ky) || 1;
        kx = (kx / len) * KNOCKBACK_DIST;
        ky = (ky / len) * KNOCKBACK_DIST;
        tryMove(game.player, kx, ky, game.tiles);
        break;
      }
    }
  }

  if (game.player.invuln === 0) {
    for (const s of game.spikes) {
      if (!isSpikeDangerous(s, game.levelClock)) continue;
      const sRect = { x: s.x, y: s.y, w: TILE, h: TILE };
      if (rectsOverlap(playerRect(game), sRect)) {
        game.fuel -= SPIKE_DAMAGE;
        game.player.invuln = INVULN_DURATION;
        game.hitFlash = 0.2;
        game.lastEvent = 'hit';
        break;
      }
    }
  }

  for (const p of game.pickups) {
    if (p.collected) continue;
    if (rectsOverlap(playerRect(game), p)) {
      p.collected = true;
      game.fuel = Math.min(game.maxFuel, game.fuel + PICKUP_RESTORE);
      game.lastEvent = 'pickup';
    }
  }

  if (game.fuel <= 0) {
    game.fuel = 0;
    game.phase = 'GAME_OVER';
    game.lastEvent = 'gameover';
    return;
  }

  if (rectsOverlap(playerRect(game), game.exit)) {
    if (game.levelIndex >= LEVELS.length - 1) {
      game.phase = 'WIN';
      game.lastEvent = 'win';
    } else {
      game.phase = 'LEVEL_TRANS';
      game.transitionTimer = TRANSITION_DURATION;
      game.pendingNextLevel = game.levelIndex + 1;
      game.lastEvent = 'exit';
    }
  }
}

export function update(game, rawInput, dt) {
  const input = rawInput || EMPTY_INPUT;
  game.lastEvent = null;

  switch (game.phase) {
    case 'TITLE':
      if ((input.a && !game._prev.a) || (input.start && !game._prev.start)) {
        game.fuel = game.maxFuel;
        loadLevel(game, 0);
        game.phase = 'PLAYING';
      }
      break;
    case 'PAUSED':
      if (input.start && !game._prev.start) {
        game.phase = 'PLAYING';
      }
      break;
    case 'PLAYING':
      updatePlaying(game, input, dt);
      break;
    case 'LEVEL_TRANS':
      game.transitionTimer -= dt;
      if (game.transitionTimer <= 0) {
        loadLevel(game, game.pendingNextLevel);
        game.phase = 'PLAYING';
      }
      break;
    case 'GAME_OVER':
    case 'WIN':
      if ((input.a && !game._prev.a) || (input.start && !game._prev.start)) {
        game.phase = 'TITLE';
      }
      break;
    default:
      break;
  }

  game._prev = {
    left: !!input.left, right: !!input.right, up: !!input.up, down: !!input.down,
    a: !!input.a, b: !!input.b, start: !!input.start,
  };

  return game;
}
