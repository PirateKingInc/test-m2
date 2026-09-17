// Level data — plain, readable text tilemaps + entity lists.
// '#' = solid wall, '.' = walkable floor. 20 cols x 18 rows, 8px tiles
// (160x144 total), matching the internal Game Boy-style resolution.
// This file contains no rendering or update logic — see engine.js.

export const TILE = 8;
export const COLS = 20;
export const ROWS = 18;

function parseTilemap(rows) {
  if (rows.length !== ROWS) {
    throw new Error(`level tilemap must have ${ROWS} rows, got ${rows.length}`);
  }
  return rows.map((row, y) => {
    if (row.length !== COLS) {
      throw new Error(`level row ${y} must have ${COLS} cols, got ${row.length}`);
    }
    return row.split('').map((ch) => (ch === '#' ? 1 : 0));
  });
}

// Helper to express positions in tile coordinates and convert to pixels.
const px = (tileX, tileY) => ({ x: tileX * TILE, y: tileY * TILE });

const LEVEL_1 = {
  name: 'Entry Shaft',
  tiles: parseTilemap([
    '####################',
    '#..................#',
    '#..................#',
    '#..................#',
    '#....####..........#',
    '#....#..#..........#',
    '#....#..#..........#',
    '#....####..........#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..........####....#',
    '#..........#..#....#',
    '#..........#..#....#',
    '#..........####....#',
    '#..................#',
    '#..................#',
    '####################',
  ]),
  playerStart: px(2, 2),
  exit: { ...px(17, 15), w: TILE, h: TILE },
  drifters: [
    { axis: 'x', min: 48, max: 112, speed: 24, x: 48, y: 64 },
  ],
  spikes: [
    { x: 120, y: 72, onDur: 1.0, offDur: 1.0, phase: 0 },
  ],
  pickups: [
    { x: 24, y: 104 },
    { x: 128, y: 32 },
  ],
};

const LEVEL_2 = {
  name: 'Drift Chambers',
  tiles: parseTilemap([
    '####################',
    '#..................#',
    '#..................#',
    '#....#########.....#',
    '#....#.......#.....#',
    '#....#.......#.....#',
    '#....#.......#.....#',
    '#....#########.....#',
    '#..................#',
    '#..................#',
    '#.....##########...#',
    '#.....#........#...#',
    '#.....#........#...#',
    '#.....##########...#',
    '#..................#',
    '#..................#',
    '#..................#',
    '####################',
  ]),
  playerStart: px(2, 1),
  exit: { ...px(17, 16), w: TILE, h: TILE },
  drifters: [
    { axis: 'x', min: 16, max: 136, speed: 28, x: 16, y: 72 },
    { axis: 'y', min: 8, max: 64, speed: 26, x: 136, y: 8 },
  ],
  spikes: [
    { x: 128, y: 72, onDur: 0.9, offDur: 1.1, phase: 0 },
    { x: 24, y: 120, onDur: 0.9, offDur: 1.1, phase: 0.9 },
  ],
  pickups: [
    { x: 16, y: 72 },
    { x: 144, y: 112 },
  ],
};

const LEVEL_3 = {
  name: 'Lower Tunnels',
  tiles: parseTilemap([
    '####################',
    '#..................#',
    '#..................#',
    '#..#............#..#',
    '#..#............#..#',
    '#..#............#..#',
    '#..................#',
    '#..................#',
    '#.......####.......#',
    '#.......#..#.......#',
    '#.......#..#.......#',
    '#.......####.......#',
    '#..................#',
    '#..................#',
    '#..#............#..#',
    '#..#............#..#',
    '#..................#',
    '####################',
  ]),
  playerStart: px(2, 1),
  exit: { ...px(17, 16), w: TILE, h: TILE },
  drifters: [
    { axis: 'x', min: 16, max: 136, speed: 30, x: 16, y: 48 },
    { axis: 'y', min: 96, max: 128, speed: 24, x: 80, y: 96 },
  ],
  spikes: [
    { x: 40, y: 56, onDur: 0.8, offDur: 1.0, phase: 0 },
    { x: 112, y: 104, onDur: 0.8, offDur: 1.0, phase: 0.6 },
  ],
  pickups: [
    { x: 16, y: 96 },
    { x: 136, y: 24 },
  ],
};

const LEVEL_4 = {
  name: 'Surface Climb',
  tiles: parseTilemap([
    '####################',
    '#..................#',
    '#..................#',
    '#..................#',
    '#.####.####.####...#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#...####.####.####.#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#.####.####.####...#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '####################',
  ]),
  playerStart: px(1, 1),
  exit: { ...px(18, 16), w: TILE, h: TILE },
  drifters: [
    { axis: 'x', min: 16, max: 136, speed: 32, x: 16, y: 48 },
    { axis: 'y', min: 72, max: 128, speed: 28, x: 8, y: 72 },
  ],
  spikes: [
    { x: 72, y: 16, onDur: 0.8, offDur: 0.9, phase: 0 },
    { x: 72, y: 72, onDur: 0.8, offDur: 0.9, phase: 0.5 },
    { x: 72, y: 120, onDur: 0.8, offDur: 0.9, phase: 1.0 },
  ],
  pickups: [
    { x: 32, y: 80 },
    { x: 112, y: 24 },
  ],
};

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4];
