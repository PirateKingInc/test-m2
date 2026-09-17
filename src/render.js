// Canvas rendering — the only module allowed to touch a 2D context.
// Reads game state produced by engine.js but never mutates it.

import { TILE, COLS, ROWS, LEVELS } from './levels.js';
import { MAX_FUEL, DRIFTER_SIZE } from './engine.js';

export const WIDTH = COLS * TILE; // 160
export const HEIGHT = ROWS * TILE; // 144

// 4-colour Game Boy-style palette (amber/purple instead of the classic green).
export const PALETTE = ['#120a1f', '#4b2e6b', '#d9713f', '#ffe9b0'];

function sprite(rows) {
  return rows.map((r) => r.split(''));
}

const FLOOR = sprite([
  '00000000', '00000000', '00010000', '00000000',
  '00000000', '00000100', '00000000', '00000000',
]);
const WALL = sprite([
  '11111111', '10101010', '11111111', '01010101',
  '11111111', '10101010', '11111111', '01010101',
]);
const PLAYER = sprite([
  '..2222..', '.222222.', '.233332.', '.133331.',
  '..1111..', '.113311.', '..1..1..', '..1..1..',
]);
const DRIFTER = sprite([
  '........', '.1....1.', '11.11.11', '11111111',
  '.131131.', '..1111..', '.1....1.', '........',
]);
const PICKUP = sprite([
  '........', '...22...', '..2332..', '.233332.',
  '.233332.', '..2332..', '...22...', '........',
]);
const SPIKE_SAFE = sprite([
  '00000000', '00011000', '00100100', '01000010',
  '01000010', '00100100', '00011000', '00000000',
]);
const SPIKE_DANGER = sprite([
  '00022000', '00222200', '02222220', '03333330',
  '02222220', '00222200', '00022000', '00000000',
]);
const EXIT = sprite([
  '00000000', '00333300', '03222230', '32222223',
  '32222223', '03222230', '00333300', '00000000',
]);

function drawSprite(ctx, spr, px, py, transparent) {
  for (let r = 0; r < 8; r++) {
    const row = spr[r];
    for (let c = 0; c < 8; c++) {
      const ch = row[c];
      if (transparent && ch === '.') continue;
      ctx.fillStyle = PALETTE[Number(ch)];
      ctx.fillRect(px + c, py + r, 1, 1);
    }
  }
}

function drawTilemap(ctx, tiles) {
  for (let ty = 0; ty < tiles.length; ty++) {
    const row = tiles[ty];
    for (let tx = 0; tx < row.length; tx++) {
      drawSprite(ctx, row[tx] === 1 ? WALL : FLOOR, tx * TILE, ty * TILE, false);
    }
  }
}

function drawFuelBar(ctx, fuel) {
  const barX = 4, barY = 2, barW = 60, barH = 5;
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  ctx.fillStyle = PALETTE[1];
  ctx.fillRect(barX, barY, barW, barH);
  const pct = Math.max(0, Math.min(1, fuel / MAX_FUEL));
  ctx.fillStyle = pct < 0.25 ? PALETTE[2] : PALETTE[3];
  ctx.fillRect(barX, barY, Math.round(barW * pct), barH);
}

function centeredText(ctx, text, y, color, size = 8) {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, WIDTH / 2, y);
}

export function render(ctx, game) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (game.phase === 'TITLE') {
    renderTitle(ctx);
    return;
  }

  if (game.tiles) {
    drawTilemap(ctx, game.tiles);
    drawSprite(ctx, EXIT, game.exit.x, game.exit.y, false);

    for (const p of game.pickups) {
      if (!p.collected) drawSprite(ctx, PICKUP, Math.round(p.x), Math.round(p.y), true);
    }
    for (const s of game.spikes) {
      const period = s.onDur + s.offDur;
      const t = ((game.levelClock + s.phase) % period + period) % period;
      const dangerous = t >= s.offDur;
      drawSprite(ctx, dangerous ? SPIKE_DANGER : SPIKE_SAFE, s.x, s.y, false);
    }
    for (const d of game.drifters) {
      drawSprite(ctx, DRIFTER, Math.round(d.x), Math.round(d.y), true);
    }

    const flashing = game.player.invuln > 0 && Math.floor(game.player.invuln * 10) % 2 === 0;
    if (!flashing) {
      drawSprite(ctx, PLAYER, Math.round(game.player.x) - 1, Math.round(game.player.y) - 1, true);
    }

    drawFuelBar(ctx, game.fuel);
    centeredText(ctx, LEVELS[game.levelIndex].name, HEIGHT - 6, PALETTE[3], 6);
  }

  if (game.phase === 'PAUSED') {
    ctx.fillStyle = 'rgba(18,10,31,0.6)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    centeredText(ctx, 'PAUSED', HEIGHT / 2, PALETTE[3], 12);
  } else if (game.phase === 'LEVEL_TRANS') {
    const alpha = Math.min(1, game.transitionTimer / 0.6);
    ctx.fillStyle = `rgba(18,10,31,${alpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else if (game.phase === 'GAME_OVER') {
    renderGameOver(ctx);
  } else if (game.phase === 'WIN') {
    renderWin(ctx);
  }
}

function renderTitle(ctx) {
  centeredText(ctx, 'CAVE LANTERN', 50, PALETTE[3], 14);
  centeredText(ctx, 'a lightless descent', 68, PALETTE[2], 8);
  centeredText(ctx, 'PRESS Z TO START', 100, PALETTE[3], 8);
  centeredText(ctx, 'ARROWS/WASD MOVE', 116, PALETTE[1], 7);
}

function renderGameOver(ctx) {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  centeredText(ctx, 'LANTERN OUT', 60, PALETTE[2], 14);
  centeredText(ctx, 'GAME OVER', 80, PALETTE[3], 10);
  centeredText(ctx, 'PRESS Z', 104, PALETTE[1], 8);
}

function renderWin(ctx) {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  centeredText(ctx, 'YOU REACHED', 54, PALETTE[3], 10);
  centeredText(ctx, 'THE SURFACE', 68, PALETTE[3], 10);
  centeredText(ctx, 'YOU WIN', 92, PALETTE[2], 14);
  centeredText(ctx, 'PRESS Z', 116, PALETTE[1], 8);
}
