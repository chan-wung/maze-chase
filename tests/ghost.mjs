import { Maze } from '../src/game/maze.js';
import { Player } from '../src/game/player.js';
import { Ghost } from '../src/game/ghost.js';
import { check, done, seq } from './lib.mjs';

const maze = new Maze();
const player = new Player(maze);
const ghosts = [0, 1, 2, 3].map((i) => new Ghost(maze, i));
const ctx = (mode = 'chase') => ({ maze, player, ghosts, mode, rng: seq(0.1) });
const run = (g, tics, speed = 0.125, c = ctx()) => { for (let i = 0; i < tics; i++) g.step(speed, c); };

check('0번은 집 문 위에서 시작', ghosts[0].tx === 10 && ghosts[0].ty === 7 && ghosts[0].state === 'roam');
check('나머지는 집 안에서 기다린다', ghosts.slice(1).every((g) => g.state === 'wait' && g.ty === 9));

// 목표 칸
player.place(5, 14, null); player.facing = 'up';
check('chaser: 플레이어 칸', JSON.stringify(ghosts[0].target(ctx())) === '{"x":5,"y":14}');
check('ambusher: 플레이어 4칸 앞', JSON.stringify(ghosts[1].target(ctx())) === '{"x":5,"y":10}');
ghosts[0].place(5, 18, 'up');
const f = ghosts[2].target(ctx());     // 플레이어 2칸 앞 (5,12) 과 chaser(5,18) → (5, 18+2*(12-18)) = (5,6)
check('flanker: chaser 와 플레이어 앞 지점을 잇는 선의 두 배', f.x === 5 && f.y === 6, JSON.stringify(f));
ghosts[3].place(19, 19, 'left');
check('shy: 멀면 플레이어 칸', JSON.stringify(ghosts[3].target(ctx())) === '{"x":5,"y":14}');
ghosts[3].place(5, 16, 'left');
check('shy: 가까우면 제 구석', JSON.stringify(ghosts[3].target(ctx())) === '{"x":1,"y":20}');
check('scatter: 제 구석', JSON.stringify(ghosts[1].target(ctx('scatter'))) === '{"x":1,"y":0}');

// 뒤로 돌지 않는다
let g = new Ghost(maze, 0);
g.place(10, 7, 'left');
player.place(11, 7, null); player.facing = 'left';    // 바로 오른쪽(뒤)에 플레이어가 있어도
g.step(0.125, ctx());
check('뒤에 플레이어가 있어도 돌아서지 않고 앞으로', g.dir === 'left', `${g.dir} ${g.tx} ${g.t}`);

// 모드가 바뀌면 다음 칸 중심에서 뒤로 돈다
g = new Ghost(maze, 0);
g.place(7, 3, 'right');
g.turnBack = true;
player.place(19, 3, null);
g.step(0.125, ctx());
check('turnBack: 다음 칸 중심에서 반대 방향', g.dir === 'left', g.dir);

// 막다른 길에서는 되돌아간다
g = new Ghost(maze, 0);
g.place(9, 5, 'right');                  // (9,5) 는 왼쪽만 열린 막다른 칸
g.step(0.01, ctx());
check('막다른 길: 되돌아 나온다', g.dir === 'left', g.dir);

// 겁먹으면 무작위로 고른다
g = new Ghost(maze, 0);
g.place(5, 3, 'right'); g.scared = true;
g.step(0.01, { ...ctx(), rng: seq(0) });
const d0 = g.dir;
g = new Ghost(maze, 0);
g.place(5, 3, 'right'); g.scared = true;
g.step(0.01, { ...ctx(), rng: seq(0.99) });
check('scared: 난수에 따라 다른 길', d0 !== g.dir, `${d0} vs ${g.dir}`);

// 집에서 나온다
g = new Ghost(maze, 2);                  // 오른쪽 집 칸
g.state = 'leave';
run(g, 8 * 5, 0.125, ctx('chase'));
check('집을 나와 roam 이 된다', g.state === 'roam' && g.ty <= 7, `${g.state} ${g.tx},${g.ty}`);

// 눈은 집으로 돌아온다 (어디서든)
let allHome = true, worst = 0;
for (const [x, y] of [[1, 1], [19, 19], [1, 19], [19, 1], [3, 16], [17, 12], [0, 9]]) {
  g = new Ghost(maze, 0);
  g.place(x, y, null); g.state = 'eaten';
  let n = 0;
  while (g.state === 'eaten' && n < 3000) { g.step(0.25, ctx()); n++; }
  if (g.state !== 'leave') allHome = false;
  worst = Math.max(worst, n);
}
check('눈이 모든 구석에서 집에 도착한다', allHome, `최대 ${worst}tic`);
check('도착하면 겁먹은 상태가 풀린다', g.scared === false);
done();
