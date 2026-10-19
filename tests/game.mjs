import { Game, TICRATE } from '../src/game/game.js';
import { check, done, seq } from './lib.mjs';

const tick = (g, n) => { for (let i = 0; i < n; i++) g.tick(); };
const go = (g) => { g.start(); tick(g, 2 * TICRATE + 1); };   // title → ready → play

let g = new Game({ rng: seq(0.5) });
check('처음은 타이틀', g.phase === 'title');
g.start();
check('start → ready', g.phase === 'ready' && g.lives === 3 && g.score === 0);
tick(g, 2 * TICRATE + 1);
check('2초 뒤 play', g.phase === 'play');

// 점 먹기
g.player.place(1, 1, null);
const before = g.dotsLeft;
g.setDir('right');
tick(g, 16);
check('점을 먹으면 10점씩', g.score > 0 && g.score % 10 === 0 && g.dotsLeft < before, `score=${g.score}`);

// 큰 점 → 겁먹음
g = new Game({ rng: seq(0.5) }); go(g);
g.ghosts.forEach((x) => { x.state = 'roam'; });
g.eatAt(1, 1);
check('큰 점: 40점 + 유령이 겁먹음', g.score === 40 && g.ghosts.every((x) => x.scared) && g.scaredTimer === 6 * TICRATE);

// 겁먹은 유령 먹기: 150, 300
g = new Game({ rng: seq(0.5) }); go(g);
g.ghosts.forEach((x) => { x.state = 'roam'; x.scared = true; x.place(1, 19, null); });
g.scaredTimer = 300;
g.ghosts[0].place(g.player.tx, g.player.ty, null);
g.ghosts[1].place(g.player.tx, g.player.ty, null);
g.play();
check('겁먹은 유령 연속으로 먹으면 150 → 300', g.score === 150 + 300 && g.ghosts[0].state === 'eaten' && g.ghosts[1].state === 'eaten' && g.phase === 'play', `score=${g.score}`);

// 유령에게 닿으면 죽는다 → 목숨 -1 → 다시 ready
g = new Game({ rng: seq(0.5) }); go(g);
g.ghosts[0].place(g.player.tx, g.player.ty, null); g.ghosts[0].state = 'roam';
g.play();
check('닿으면 dying', g.phase === 'dying');
tick(g, 101);
check('목숨 3 → 2, 다시 ready', g.lives === 2 && g.phase === 'ready');

// 마지막 목숨
g = new Game({ rng: seq(0.5) }); go(g); g.lives = 1;
g.ghosts[0].place(g.player.tx, g.player.ty, null); g.ghosts[0].state = 'roam';
g.play(); tick(g, 101);
check('마지막 목숨을 잃으면 over', g.phase === 'over' && g.lives === 0);
const hi = g.hiScore;
g.start();
check('over 에서 start → 새 게임 (최고 점수는 유지)', g.phase === 'ready' && g.lives === 3 && g.score === 0 && g.hiScore === hi);

// 모든 점을 먹으면 클리어 → 다음 단계
g = new Game({ rng: seq(0.5) }); go(g);
g.ghosts.forEach((x) => { x.state = 'wait'; x.place(10, 9, null); });
g.dots.fill(0); g.dots[g.maze.w * 14 + 9] = 1; g.dotsLeft = 1;
g.player.place(10, 14, null); g.setDir('left');
tick(g, 20);
check('마지막 점 → clear', g.phase === 'clear', g.phase);
tick(g, 2 * TICRATE + 1);
check('다음 단계: 점이 다시 깔리고 ready', g.level === 2 && g.phase === 'ready' && g.dotsLeft === g.maze.dotCount);

// 흩어지기 → 쫓기 전환 시계
g = new Game({ rng: seq(0.5) }); go(g);
check('처음은 scatter', g.mode === 'scatter');
g.ghosts.forEach((x) => { x.state = 'wait'; });
tick(g, 6 * TICRATE);
check('6초 뒤 chase', g.mode === 'chase', g.mode);

// 보너스 목숨
g = new Game(); go(g); g.score = 7990; g.addScore(10);
check('8000점에 목숨 +1 (한 번만)', g.lives === 4); g.addScore(10000);
check('두 번째는 없다', g.lives === 4);

// 일시정지: 시계·움직임이 멈추고 입력이 무시된다
g = new Game({ rng: seq(0.5) });
g.togglePause();
check('타이틀에서는 일시정지가 안 된다', g.paused === false);
go(g);
g.togglePause();
const snap = JSON.stringify([g.frame, g.playTime, g.modeTimer, g.player.x, g.player.y, g.ghosts.map((x) => [x.x, x.y])]);
g.setDir('left'); tick(g, 120);
check('멈춘 동안은 아무것도 변하지 않는다', g.paused && JSON.stringify([g.frame, g.playTime, g.modeTimer, g.player.x, g.player.y, g.ghosts.map((x) => [x.x, x.y])]) === snap);
g.togglePause(); tick(g, 30);
check('다시 누르면 계속 진행된다', !g.paused && g.frame > JSON.parse(snap)[0]);
g.lives = 1; g.phase = 'dying'; g.timer = 1;
tick(g, 2);
g.togglePause();
check('게임 오버에서는 일시정지가 안 된다', g.phase === 'over' && g.paused === false);

// 한참 돌려도 상태가 깨지지 않는다 (무작위 입력)
let rs = 12345; const rnd = () => (rs = (rs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
g = new Game({ rng: rnd });
g.start();
const dirs = ['up', 'down', 'left', 'right'];
let ok = true, deaths = 0, prevLives = 3;
for (let i = 0; i < 60 * 600 && ok; i++) {
  if (i % 20 === 0) g.setDir(dirs[Math.floor(rnd() * 4)]);
  if (g.phase === 'over') { g.start(); prevLives = g.lives; }
  g.tick();
  if (g.lives < prevLives) deaths++;
  prevLives = g.lives;
  for (const a of [g.player, ...g.ghosts]) {
    if (!(a.tx >= 0 && a.tx < g.maze.w && a.ty >= 0 && a.ty < g.maze.h) || g.maze.isWall(a.tx, a.ty)) { ok = false; console.log(`FAIL 벽 안에 있다 ${a.tx},${a.ty} tic ${i}`); }
    if (a.t < 0 || a.t >= 1) { ok = false; console.log(`FAIL t 범위 ${a.t}`); }
  }
}
check('10분치 무작위 플레이: 벽을 뚫거나 칸을 벗어나지 않는다', ok, `deaths=${deaths}`);
done();
