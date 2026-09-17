import { createGame, update } from './engine.js';
import { render, WIDTH, HEIGHT } from './render.js';
import { createInputState, attachKeyboard, attachTouchButton } from './input.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('screen');
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext('2d');

const game = createGame();
const input = createInputState();
const audio = createAudio();

attachKeyboard(input);
attachTouchButton(document.getElementById('btn-up'), input, 'up');
attachTouchButton(document.getElementById('btn-down'), input, 'down');
attachTouchButton(document.getElementById('btn-left'), input, 'left');
attachTouchButton(document.getElementById('btn-right'), input, 'right');
attachTouchButton(document.getElementById('btn-a'), input, 'a');
attachTouchButton(document.getElementById('btn-b'), input, 'b');
attachTouchButton(document.getElementById('btn-start'), input, 'start');

function unlockAudio() {
  audio.ensureCtx();
  audio.startMusic();
  window.removeEventListener('keydown', unlockAudio);
  window.removeEventListener('pointerdown', unlockAudio);
}
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('pointerdown', unlockAudio, { once: true });

const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.25;
let acc = 0;
let last = performance.now();

function loop(now) {
  let frameTime = (now - last) / 1000;
  last = now;
  if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;
  acc += frameTime;

  while (acc >= FIXED_DT) {
    update(game, input, FIXED_DT);
    if (game.lastEvent && audio.sfx[game.lastEvent]) audio.sfx[game.lastEvent]();
    if (game.phase === 'PLAYING') audio.startMusic();
    else audio.stopMusic();
    acc -= FIXED_DT;
  }

  render(ctx, game);
  requestAnimationFrame(loop);
}

requestAnimationFrame((t) => { last = t; requestAnimationFrame(loop); });
