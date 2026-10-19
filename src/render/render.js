import { DIRS } from '../game/maze.js';
import { t } from '../app/i18n.js';

export const TILE = 24;
const HUD_TOP = 40;
const HUD_BOTTOM = 32;
const ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

const COLOR = {
  bg: '#140d08',
  wall: '#5a3a1f',
  wallEdge: '#a8743f',
  door: '#d9a066',
  cheese: '#ffcf40',
  cheeseHole: '#c98f00',
  cream: '#ffe8b0',
  mouse: '#b8b8c0',
  mousePink: '#f4a6b8',
  scared: '#cdb9f0',
  scaredFlash: '#fff3d6',
};

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
        ctx.fillStyle = COLOR.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLOR.wallEdge;                  // 길과 맞닿은 면에만 밝은 선
        if (!wall(x, y - 1)) ctx.fillRect(px, py, TILE, 2);
        if (!wall(x, y + 1)) ctx.fillRect(px, py + TILE - 2, TILE, 2);
        if (!wall(x - 1, y)) ctx.fillRect(px, py, 2, TILE);
        if (!wall(x + 1, y)) ctx.fillRect(px + TILE - 2, py, 2, TILE);
      } else if (c === '-') {
        ctx.fillStyle = COLOR.door;
        ctx.fillRect(px, py + TILE / 2 - 2, TILE, 4);
      }
    }
  }
}

/** 치즈 조각 한 개. s 는 크기 배율 */
function cheese(ctx, cx, cy, s, holes) {
  ctx.fillStyle = COLOR.cheese;
  ctx.beginPath();
  ctx.moveTo(cx - 3.5 * s, cy + 2.5 * s);
  ctx.lineTo(cx + 3.5 * s, cy + 2.5 * s);
  ctx.lineTo(cx + 3.5 * s, cy - 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLOR.cheeseHole;
  for (const [hx, hy, hr] of holes) {
    ctx.beginPath();
    ctx.arc(cx + hx * s, cy + hy * s, hr * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDots(ctx, game) {
  const { maze, dots } = game;
  const pulse = 1 + 0.15 * Math.sin(game.frame * 0.15);
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      const v = dots[y * maze.w + x];
      if (!v) continue;
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      if (v === 2) cheese(ctx, cx, cy, 2.2 * pulse, [[0.8, 0.9, 0.5], [2, -0.2, 0.35], [-1.4, 1.7, 0.3]]);
      else cheese(ctx, cx, cy, 0.9, [[1, 1, 0.45]]);
    }
  }
}

/** 터널 가장자리에서 반대쪽에도 같이 그려 매끄럽게 넘어가 보이게 */
function wrapped(maze, x, draw) {
  draw(x);
  if (x < 1) draw(x + maze.w);
  else if (x > maze.w - 2) draw(x - maze.w);
}

/** 위에서 본 생쥐. rot=0 이면 오른쪽을 본다. r 은 몸 크기, wag 는 꼬리 흔들림(-1~1) */
function mouse(ctx, cx, cy, r, rot, wag) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.strokeStyle = COLOR.mousePink;                    // 꼬리
  ctx.lineWidth = Math.max(1.2, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.quadraticCurveTo(-r * 1.0, wag * r * 0.7, -r * 1.2, wag * r * 0.3);
  ctx.stroke();
  ctx.fillStyle = COLOR.mouse;                          // 몸통과 머리
  ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.8, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.5, 0, r * 0.5, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  for (const s of [-1, 1]) {                            // 귀
    ctx.fillStyle = COLOR.mouse;
    ctx.beginPath(); ctx.arc(r * 0.3, s * r * 0.5, r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLOR.mousePink;
    ctx.beginPath(); ctx.arc(r * 0.3, s * r * 0.5, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';                             // 눈
    ctx.beginPath(); ctx.arc(r * 0.72, s * r * 0.2, Math.max(1, r * 0.1), 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = COLOR.mousePink;                      // 코
  ctx.beginPath(); ctx.arc(r * 0.98, 0, Math.max(1.2, r * 0.13), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, game) {
  const { player, maze } = game;
  let rot = ANGLE[player.facing];
  let wag = Math.sin(game.frame * 0.4);
  let scale = 1, alpha = 1;
  if (game.phase === 'dying') {                        // 죽을 때: 빙글 돌며 작아지고 흐려진다
    const p = 1 - game.timer / 100;
    rot += p * Math.PI * 6;
    scale = 1 - p * 0.9;
    alpha = 1 - p * 0.9;
  }
  if (game.phase === 'ready' && game.frame >= 0 && !player.dir) wag = 0;
  wrapped(maze, player.x, (x) => {
    const cx = x * TILE + TILE / 2, cy = player.y * TILE + TILE / 2;
    ctx.globalAlpha = alpha;
    mouse(ctx, cx, cy, TILE * 0.46 * scale, rot, wag);
    ctx.globalAlpha = 1;
  });
}

/** 고양이 얼굴 위에 얹는 털 무늬 */
function pattern(ctx, kind, cx, cy) {
  switch (kind) {
    case 'stripe':
      ctx.strokeStyle = '#a85a1a';
      ctx.lineWidth = 1.6;
      for (const i of [-1, 0, 1]) {
        ctx.beginPath(); ctx.moveTo(cx + i * 3.2, cy - 8.5); ctx.lineTo(cx + i * 3, cy - 5); ctx.stroke();
      }
      break;
    case 'tuxedo':
      ctx.fillStyle = '#f4f1ea';
      ctx.beginPath(); ctx.ellipse(cx, cy + 5, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'plain':
      ctx.fillStyle = '#b9bec3';
      ctx.beginPath(); ctx.ellipse(cx, cy + 5, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'calico':
      ctx.fillStyle = '#e8893a';
      ctx.beginPath(); ctx.arc(cx - 4.5, cy - 4.5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2b2b';
      ctx.beginPath(); ctx.arc(cx + 5.5, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
      break;
    default: break;
  }
}

function drawGhost(ctx, game, g) {
  const { maze } = game;
  const eaten = g.state === 'eaten';
  const scared = g.scared && !eaten;
  const flicker = game.scaredTimer > 0 && game.scaredTimer < 120 && Math.floor(game.scaredTimer / 10) % 2 === 0;
  const body = scared ? (flicker ? COLOR.scaredFlash : COLOR.scared) : g.def.color;
  const look = g.dir ? DIRS[g.dir] : { dx: 0, dy: 0 };
  wrapped(maze, g.x, (x) => {
    const cx = x * TILE + TILE / 2, cy = g.y * TILE + TILE / 2 + 1, r = TILE * 0.44;
    ctx.globalAlpha = eaten ? 0.35 : 1;
    ctx.fillStyle = body;
    for (const s of [-1, 1]) {                           // 귀
      ctx.beginPath();
      ctx.moveTo(cx + s * r * 0.95, cy - r * 0.1);
      ctx.lineTo(cx + s * r * 0.8, cy - r * 1.15);
      ctx.lineTo(cx + s * r * 0.2, cy - r * 0.75);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();                                     // 머리: 겁먹으면 털이 곤두선다
    if (scared) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2, rr = i % 2 ? r + 2 : r - 0.5;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.fill();
    if (!scared) pattern(ctx, g.def.pattern, cx, cy);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';           // 수염
    ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      for (const dy of [-2, 2]) {
        ctx.beginPath(); ctx.moveTo(cx + s * r * 0.5, cy + 3 + dy * 0.5); ctx.lineTo(cx + s * r * 1.15, cy + 3 + dy); ctx.stroke();
      }
    }
    ctx.fillStyle = COLOR.mousePink;                     // 코
    ctx.beginPath(); ctx.moveTo(cx - 1.8, cy + 2.5); ctx.lineTo(cx + 1.8, cy + 2.5); ctx.lineTo(cx, cy + 4.5); ctx.closePath(); ctx.fill();
    for (const s of [-1, 1]) {                           // 눈
      const ex = cx + s * 4.2, ey = cy - 1.5;
      if (scared) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(ex, ey, 1, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#e6f06a';
        ctx.beginPath(); ctx.ellipse(ex, ey, 3.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.ellipse(ex + look.dx * 1.2, ey + look.dy * 0.8, 1, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (scared) {                                        // 식은땀
      ctx.fillStyle = '#bfe9ff';
      ctx.beginPath(); ctx.arc(cx + r * 0.95, cy - r * 0.9, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function drawHud(ctx, game, W, H) {
  text(ctx, t('hud.score'), 12, 16, 13, '#fff');
  text(ctx, String(game.score).padStart(6, '0'), 12, 34, 16, COLOR.cream);
  text(ctx, t('hud.hi'), W / 2, 16, 13, '#fff', 'center');
  text(ctx, String(game.hiScore).padStart(6, '0'), W / 2, 34, 16, COLOR.cream, 'center');
  text(ctx, t('hud.level', { n: game.level }), W - 12, 34, 14, '#fff', 'right');
  for (let i = 0; i < game.lives - (game.phase === 'dying' ? 1 : 0); i++) {   // 남은 목숨
    mouse(ctx, 22 + i * 26, H - HUD_BOTTOM / 2 + 4, 10, 0, 0);
  }
}

function banner(ctx, W, y, label, color, size = 20) {
  text(ctx, label, W / 2, y, size, color, 'center');
}

export function draw(ctx, game) {
  const { maze } = game;
  const { width: W, height: H } = canvasSize(maze);
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, W, H);
  drawHud(ctx, game, W, H);

  ctx.save();
  ctx.translate(0, HUD_TOP);
  drawWalls(ctx, maze);
  if (game.phase === 'title') {
    const my = maze.h * TILE / 2;
    ctx.fillStyle = 'rgba(20,13,8,0.85)';
    ctx.fillRect(0, my - 90, W, 190);
    banner(ctx, W, my - 40, t('title'), COLOR.cheese, 34);
    banner(ctx, W, my - 5, t('title.sub'), '#fff', 15);
    banner(ctx, W, my + 30, t('title.controls'), COLOR.door, 14);
    if (Math.floor(game.frame / 30) % 2 === 0) banner(ctx, W, my + 70, t('title.start'), COLOR.mousePink, 16);
    ctx.restore();
    return;
  }
  drawDots(ctx, game);
  if (game.phase !== 'dying') for (const g of game.ghosts) drawGhost(ctx, game, g);
  drawPlayer(ctx, game);
  if (game.popup) {
    const { x, y, text: s } = game.popup;
    text(ctx, s, x * TILE + TILE / 2, y * TILE + TILE / 2 + 5, 14, COLOR.cream, 'center');
  }
  const cy = (maze.door.y + 3) * TILE + TILE / 2 + 5;          // 집 아래 한 칸: 안내 문구 자리
  if (game.phase === 'ready') banner(ctx, W, cy, t('msg.ready'), COLOR.cream, 16);
  if (game.phase === 'clear') banner(ctx, W, cy, t('msg.clear'), COLOR.cream, 16);
  if (game.phase === 'over') {
    banner(ctx, W, cy, t('msg.over'), '#ff3b30', 22);
    banner(ctx, W, cy + 30, t('msg.over.again'), '#fff', 13);
  }
  if (game.paused) {
    const my = maze.h * TILE / 2;
    ctx.fillStyle = 'rgba(20,13,8,0.8)';
    ctx.fillRect(0, 0, W, maze.h * TILE);
    banner(ctx, W, my, t('msg.paused'), COLOR.cheese, 32);
    banner(ctx, W, my + 34, t('msg.resume'), COLOR.cream, 13);
  }
  ctx.restore();
}
