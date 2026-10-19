/**
 * 모바일 터치 조작: 화면 어디서나 스와이프로 방향을 바꾸고, 아래쪽(가로 화면에서는 오른쪽 아래)에
 * 방향 패드도 둔다. 터치 기기이거나 주소에 ?touch=1 이 있을 때만 켠다.
 */
export const isTouchDevice = () =>
  new URLSearchParams(location.search).has('touch')
  || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || 'ontouchstart' in window;

const SWIPE_PX = 24;

/** 포인터 캡처(손가락이 요소 밖으로 나가도 계속 추적). 일부 환경에서 실패해도 조작은 계속되게 */
const capture = (el, id) => { try { el.setPointerCapture(id); } catch { /* 무시 */ } };

/** 시작점에서 SWIPE_PX 이상 움직이면 가장 많이 움직인 축으로 방향을 정한다. 정하면 시작점을 거기로 옮겨 이어서 꺾을 수 있다 */
export function swipeDir(dx, dy) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

export function setupTouch(game, root = document.body) {
  document.body.classList.add('touch');

  let origin = null;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#lang, #pause, #dpad')) return;
    if (game.paused) { game.resume(); return; }          // 멈춘 화면은 아무 곳이나 터치하면 계속
    game.start();
    origin = { x: e.clientX, y: e.clientY, id: e.pointerId };
    capture(root, e.pointerId);
  });
  root.addEventListener('pointermove', (e) => {
    if (!origin || e.pointerId !== origin.id) return;
    const dir = swipeDir(e.clientX - origin.x, e.clientY - origin.y);
    if (dir) { game.setDir(dir); origin.x = e.clientX; origin.y = e.clientY; }
  });
  const end = (e) => { if (origin && e.pointerId === origin.id) origin = null; };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);

  const pad = document.createElement('div');
  pad.id = 'dpad';
  for (const [dir, label] of [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.dir = dir;
    b.textContent = label;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); game.start(); game.setDir(dir); });
    pad.appendChild(b);
  }
  document.body.appendChild(pad);
}
