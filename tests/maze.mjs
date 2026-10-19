import { Maze } from '../src/game/maze.js';
import { check, done } from './lib.mjs';

const m = new Maze();
check('크기 21x21', m.w === 21 && m.h === 21);
check('시작 칸', m.start.x === 10 && m.start.y === 14);
check('문 위치', m.door.x === 10 && m.door.y === 8);
check('집 칸 3개', m.houseCells.length === 3 && m.house.x === 10 && m.house.y === 9);
check('점 개수가 센 값과 같다', m.dotCount === [...m.initialDots].filter(Boolean).length);
check('큰 점 4개', [...m.initialDots].filter((v) => v === 2).length === 4);
check('벽 판정', m.isWall(0, 0) && !m.isWall(1, 1));
check('플레이어는 문을 못 지난다', !m.canEnter(10, 8) && m.canEnter(10, 8, true));
check('터널: 왼쪽 끝에서 왼쪽 → 오른쪽 끝', JSON.stringify(m.next(0, 9, 'left')) === '{"x":20,"y":9}' && m.canMove(0, 9, 'left'));
check('벽이 있는 가장자리는 못 지난다', !m.canMove(1, 1, 'left'));

// 모든 점과 집은 시작 칸에서 닿는다 (끊어진 길이 없다)
const d = m.distanceTo(m.start.x, m.start.y);
let unreachable = 0;
for (let i = 0; i < m.initialDots.length; i++) if (m.initialDots[i] && d[i] < 0) unreachable++;
check('모든 점에 닿을 수 있다', unreachable === 0, `unreachable=${unreachable}`);
check('집 안에서도 닿는다', d[m.house.y * m.w + m.house.x] > 0);

let bad = false;
try { new Maze(['###', '#.']); } catch { bad = true; }
check('줄 길이가 다르면 오류', bad);
done();
