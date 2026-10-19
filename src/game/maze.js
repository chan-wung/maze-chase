/**
 * 미로: 문자열 격자를 읽어 둔다. 바뀌지 않는 정보(벽·문·집·시작 칸)만 가진다.
 * 점은 판마다 줄어들어야 하니 Game 쪽에서 initialDots 를 복사해 쓴다.
 *   #벽  -유령 집 문  .점  o큰 점  P플레이어 시작  G유령 집 안  공백=점 없는 길
 */
export const DIRS = {
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  down: { dx: 0, dy: 1 },
  right: { dx: 1, dy: 0 },
};
/** 갈림길에서 거리가 같을 때의 우선순위 */
export const ORDER = ['up', 'left', 'down', 'right'];
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const LEVEL_ROWS = [
  '#####################',
  '#o........#........o#',
  '#.###.###.#.###.###.#',
  '#...................#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#####.#.#####.#.#####',
  '#####.#.......#.#####',
  '#####.#.##-##.#.#####',
  '     ...#GGG#...     ',
  '#####.#.#####.#.#####',
  '#####.#.......#.#####',
  '#.....#...#...#.....#',
  '#.###.#.#####.#.###.#',
  '#.........P.........#',
  '#.###.###.#.###.###.#',
  '#o..#.....#.....#..o#',
  '###.#.#.#####.#.#.###',
  '#.....#...#...#.....#',
  '#...................#',
  '#####################',
];

export class Maze {
  constructor(rows = LEVEL_ROWS) {
    this.h = rows.length;
    this.w = rows[0].length;
    if (rows.some((r) => r.length !== this.w)) throw new Error('미로 줄 길이가 서로 다릅니다');
    this.rows = rows;
    this.initialDots = new Uint8Array(this.w * this.h); // 0 없음, 1 점, 2 큰 점
    this.dotCount = 0;
    this.start = null;
    this.door = null;
    this.houseCells = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = rows[y][x];
        if (c === '.') { this.initialDots[y * this.w + x] = 1; this.dotCount++; }
        else if (c === 'o') { this.initialDots[y * this.w + x] = 2; this.dotCount++; }
        else if (c === 'P') this.start = { x, y };
        else if (c === '-') this.door = { x, y };
        else if (c === 'G') this.houseCells.push({ x, y });
      }
    }
    if (!this.start) throw new Error('미로에 P(시작 칸)가 없습니다');
    this.houseCells.sort((a, b) => a.x - b.x);
    this.house = this.houseCells.length ? this.houseCells[Math.floor(this.houseCells.length / 2)] : null;
    this._dist = new Map();
  }

  wrap(x, y) { return { x: (x + this.w) % this.w, y: (y + this.h) % this.h }; }
  isWall(x, y) { const p = this.wrap(x, y); return this.rows[p.y][p.x] === '#'; }
  isDoor(x, y) { const p = this.wrap(x, y); return this.rows[p.y][p.x] === '-'; }

  /** (x,y) 에서 dir 쪽 칸 (끝에서 반대쪽으로 이어진다 = 터널) */
  next(x, y, dir) { const d = DIRS[dir]; return this.wrap(x + d.dx, y + d.dy); }

  /** 그 칸에 들어갈 수 있는가. 문은 유령(door=true)만 */
  canEnter(x, y, door = false) {
    if (this.isWall(x, y)) return false;
    return door || !this.isDoor(x, y);
  }

  canMove(x, y, dir, door = false) {
    const n = this.next(x, y, dir);
    return this.canEnter(n.x, n.y, door);
  }

  /** 목표 칸까지 걸어서 가는 칸 수 (문 통과 가능). 못 가는 칸은 -1. 눈만 남은 유령이 집으로 돌아갈 때 쓴다 */
  distanceTo(tx, ty) {
    const key = ty * this.w + tx;
    let d = this._dist.get(key);
    if (d) return d;
    d = new Int16Array(this.w * this.h).fill(-1);
    d[key] = 0;
    const queue = [[tx, ty]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const dir of ORDER) {
        const n = this.next(x, y, dir);
        const k = n.y * this.w + n.x;
        if (d[k] === -1 && this.canEnter(n.x, n.y, true)) { d[k] = d[y * this.w + x] + 1; queue.push([n.x, n.y]); }
      }
    }
    this._dist.set(key, d);
    return d;
  }
}
