import { DIRS } from '../game/maze.js';
import { t } from '../app/i18n.js';

export const TILE = 24;
const HUD_TOP = 40;
const HUD_BOTTOM = 32;
const ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export function canvasSize(maze) {
  return { width: maze.w * TILE, height: maze.h * TILE + HUD_TOP + HUD_BOTTOM };
}

const FONT = '"Neo둥근모", "Press Start 2P", "Malgun Gothic", monospace';
const text = (ctx, s, x, y, size, color, align = 'left') => {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
};

function drawWalls(ctx, maze) {
  const wall = (x, y) => x < 0 || y < 0 || x >= maze.w || y >= maze.h || maze.rows[y][x] === '#';
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      const px = x * TILE, py = y * TILE;
      const c = maze.rows[y][x];
      if (c === '#') {
        ctx.fillStyle = '#0a1052';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#4a68ff';                       // 길과 맞닿은 면에만 밝은 선
        if (!wall(x, y - 1)) ctx.fillRect(px, py, TILE, 2);
        if (!wall(x, y + 1)) ctx.fillRect(px, py + TILE - 2, TILE, 2);
        if (!wall(x - 1, y)) ctx.fillRect(px, py, 2, TILE);
        if (!wall(x + 1, y)) ctx.fillRect(px + TILE - 2, py, 2, TILE);
      } else if (c === '-') {
        ctx.fillStyle = '#ff8fd0';
        ctx.fillRect(px, py + TILE / 2 - 2, TILE, 4);
      }
    }
  }
}

function drawDots(ctx, game) {
  const { maze, dots } = game;
  const blink = Math.floor(game.frame / 15) % 2 === 0;
  ctx.fillStyle = '#ffd9a8';
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      const v = dots[y * maze.w + x];
      if (!v) continue;
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      if (v === 2 && !blink) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, v === 2 ? 6 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 터널 가장자리에서 반대쪽에도 같이 그려 매끄럽게 넘어가 보이게 */
function wrapped(maze, x, draw) {
  draw(x);
  if (x < 1) draw(x + maze.w);
  else if (x > maze.w - 2) draw(x - maze.w);
}

function drawPlayer(ctx, game) {
  const { player, maze } = game;
  let open = Math.abs(Math.sin(game.frame * 0.25)) * 0.28 * Math.PI;
  let rot = ANGLE[player.facing];
  if (game.phase === 'dying') {                        // 죽을 때: 입이 활짝 벌어지며 사라진다
    const p = 1 - game.timer / 100;
    open = p * Math.PI;
    rot = -Math.PI / 2;
  }
  if (game.phase === 'ready' && game.frame >= 0 && !player.dir) open = 0.25 * Math.PI;
  wrapped(maze, player.x, (x) => {
    const cx = x * TILE + TILE / 2, cy = player.y * TILE + TILE / 2;
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, TILE * 0.46, rot + open, rot + Math.PI * 2 - open);
    ctx.closePath();
    ctx.fill();
  });
}

function drawGhost(ctx, game, g) {
  const { maze } = game;
  const flicker = game.scaredTimer > 0 && game.scaredTimer < 120 && Math.floor(game.scaredTimer / 10) % 2 === 0;
  const body = g.state === 'eaten' ? null : g.scared ? (flicker ? '#ffffff' : '#2a3cff') : g.def.color;
  const look = g.dir ? DIRS[g.dir] : { dx: 0, dy: 0 };
  wrapped(maze, g.x, (x) => {
    const cx = x * TILE + TILE / 2, cy = g.y * TILE + TILE / 2, r = TILE * 0.46;
    if (body) {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy - 1, r, Math.PI, 0);
      const bottom = cy + r - 1;
      const wave = Math.floor(game.frame / 6) % 2 ? 2.5 : -2.5;
      ctx.lineTo(cx + r, bottom);
      for (let i = 0; i < 3; i++) {
        const x0 = cx + r - (i * 2 * r) / 3;
        ctx.lineTo(x0 - r / 3, bottom + (i % 2 ? wave : -wave));
        ctx.lineTo(x0 - (2 * r) / 3, bottom);
      }
      ctx.closePath();
      ctx.fill();
    }
    if (g.scared && g.state !== 'eaten') {                 // 겁먹은 얼굴
      ctx.fillStyle = flicker ? '#ff3b30' : '#ffd9a8';
      ctx.fillRect(cx - 5, cy - 4, 3, 3);
      ctx.fillRect(cx + 2, cy - 4, 3, 3);
    } else {
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(cx + s * 4.5, cy - 3, 3.4, 4.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1b2bd6';
        ctx.beginPath(); ctx.arc(cx + s * 4.5 + look.dx * 1.8, cy - 3 + look.dy * 2.2, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
}

function drawHud(ctx, game, W, H) {
  text(ctx, t('hud.score'), 12, 16, 13, '#fff');
  text(ctx, String(game.score).padStart(6, '0'), 12, 34, 16, '#ffe14a');
  text(ctx, t('hud.hi'), W / 2, 16, 13, '#fff', 'center');
  text(ctx, String(game.hiScore).padStart(6, '0'), W / 2, 34, 16, '#ffe14a', 'center');
  text(ctx, t('hud.level', { n: game.level }), W - 12, 34, 14, '#fff', 'right');
  for (let i = 0; i < game.lives - (game.phase === 'dying' ? 1 : 0); i++) {   // 남은 목숨
    const cx = 22 + i * 26, cy = H - HUD_BOTTOM / 2 + 4;
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 9, 0.25 * Math.PI, 1.75 * Math.PI); ctx.closePath(); ctx.fill();
  }
}

function banner(ctx, W, y, label, color, size = 20) {
  text(ctx, label, W / 2, y, size, color, 'center');
}

export function draw(ctx, game) {
  const { maze } = game;
  const { width: W, height: H } = canvasSize(maze);
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, W, H);
  drawHud(ctx, game, W, H);

  ctx.save();
  ctx.translate(0, HUD_TOP);
  drawWalls(ctx, maze);
  if (game.phase === 'title') {
    const my = maze.h * TILE / 2;
    ctx.fillStyle = 'rgba(5,6,15,0.82)';
    ctx.fillRect(0, my - 90, W, 190);
    banner(ctx, W, my - 40, t('title'), '#ffe14a', 34);
    banner(ctx, W, my - 5, t('title.sub'), '#fff', 15);
    banner(ctx, W, my + 30, t('title.controls'), '#9aa6ff', 14);
    if (Math.floor(game.frame / 30) % 2 === 0) banner(ctx, W, my + 70, t('title.start'), '#ff8fd0', 16);
    ctx.restore();
    return;
  }
  drawDots(ctx, game);
  if (game.phase !== 'dying') for (const g of game.ghosts) drawGhost(ctx, game, g);
  drawPlayer(ctx, game);
  if (game.popup) {
    const { x, y, text: s } = game.popup;
    text(ctx, s, x * TILE + TILE / 2, y * TILE + TILE / 2 + 5, 14, '#35e0e6', 'center');
  }
  const cy = (maze.door.y + 3) * TILE + TILE / 2 + 5;          // 집 아래 한 칸: 안내 문구 자리
  if (game.phase === 'ready') banner(ctx, W, cy, t('msg.ready'), '#ffe14a', 16);
  if (game.phase === 'clear') banner(ctx, W, cy, t('msg.clear'), '#ffe14a', 16);
  if (game.phase === 'over') {
    banner(ctx, W, cy, t('msg.over'), '#ff3b30', 22);
    banner(ctx, W, cy + 30, t('msg.over.again'), '#fff', 13);
  }
  ctx.restore();
}
