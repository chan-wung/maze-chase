import { Maze } from '../src/game/maze.js';
import { Player } from '../src/game/player.js';
import { check, done } from './lib.mjs';

const maze = new Maze();
const run = (p, tics, speed = 0.125) => { for (let i = 0; i < tics; i++) p.step(speed); };

let p = new Player(maze);
check('시작 위치', p.tx === 10 && p.ty === 14);
run(p, 8);
check('8tic(=1칸): 왼쪽으로 한 칸', p.tx === 9 && p.ty === 14 && p.t === 0, `${p.tx},${p.ty},${p.t}`);

// 벽 앞에서 멈춘다
p = new Player(maze);
p.setWant('left');
run(p, 8 * 20);
check('왼쪽 끝(1,14)에서 멈춘다', p.tx === 1 && p.ty === 14 && p.dir === null, `${p.tx},${p.ty},${p.dir}`);

// 미리 누른 방향으로 갈림길에서 꺾인다
p = new Player(maze);
p.setWant('left');
run(p, 8 * 3);            // (7,14)
p.setWant('up');          // (7,13) 은 길이다 → 지금 눌러 두면 칸 중심에서 꺾는다
run(p, 8);
check('갈림길에서 미리 누른 위쪽으로 꺾는다', p.tx === 7 && p.ty === 13, `${p.tx},${p.ty}`);

// 벽 쪽으로 누르면 가던 길을 계속 간다
p = new Player(maze);
p.setWant('left');
run(p, 4);
p.setWant('up');          // 다음 칸 (9,14) 의 위쪽 (9,13) 은 벽
run(p, 12);
check('막힌 쪽을 눌러도 가던 방향 유지', p.ty === 14 && p.tx === 8, `${p.tx},${p.ty}`);

// 가는 도중 반대로 돌아선다
p = new Player(maze);
p.setWant('left');
run(p, 4);
p.setWant('right');
check('중간에 반대 방향: 바로 돌아선다', p.dir === 'right' && Math.abs(p.x - 9.5) < 1e-9, `x=${p.x}`);
run(p, 4);
check('돌아서서 원래 칸에 도착', p.tx === 10 && p.t === 0);

// 터널
p = new Player(maze);
p.place(2, 9, 'left');
p.setWant('left');
run(p, 8 * 4);
check('터널: 왼쪽 끝을 지나 오른쪽으로 나온다', p.tx === 20 || p.tx === 19, `tx=${p.tx}`);

// 속도가 칸 단위로 안 떨어져도 칸 중심에서 방향을 정한다 (남은 거리 이어 쓰기)
p = new Player(maze);
p.setWant('left');
run(p, 100, 0.11);
check('0.11 칸/tic 로 100tic = 11칸 (벽 앞 멈춤 포함)', p.tx === 1 && p.t === 0, `${p.tx},${p.t}`);
done();
