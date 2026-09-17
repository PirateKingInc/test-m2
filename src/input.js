// Input handling — keyboard and on-screen touch controls both write into
// the same plain input-state object consumed by engine.update().

const KEY_MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'a', Comma: 'a',
  KeyX: 'b', Period: 'b',
  Enter: 'start', Space: 'start',
};

export function createInputState() {
  return { left: false, right: false, up: false, down: false, a: false, b: false, start: false };
}

export function attachKeyboard(state, target = window) {
  const onKey = (down) => (e) => {
    const key = KEY_MAP[e.code];
    if (!key) return;
    e.preventDefault();
    state[key] = down;
  };
  target.addEventListener('keydown', onKey(true));
  target.addEventListener('keyup', onKey(false));
}

export function attachTouchButton(el, state, key) {
  if (!el) return;
  const press = (e) => { e.preventDefault(); state[key] = true; };
  const release = (e) => { e.preventDefault(); state[key] = false; };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointerleave', release);
  el.addEventListener('pointercancel', release);
}
