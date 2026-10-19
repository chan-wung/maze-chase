import { DIRS, OPPOSITE } from './maze.js';

/**
 * 칸 위를 움직이는 것(플레이어·유령)의 공통 이동.
 * (tx,ty) 칸 중심에서 dir 쪽 다음 칸으로 t(0..1)만큼 가 있다. 방향은 칸 중심에서만 정한다.
 */
export class Actor {
  constructor(maze) {
    this.maze = maze;
    this.place(maze.start.x, maze.start.y, null);
  }

  place(x, y, dir) { this.tx = x; this.ty = y; this.dir = dir; this.t = 0; }

  /** 화면에 그릴 칸 좌표 (칸 중심 기준, 터널에서는 가장자리를 넘어갈 수 있다) */
  get x() { return this.tx + (this.dir ? DIRS[this.dir].dx * this.t : 0); }
  get y() { return this.ty + (this.dir ? DIRS[this.dir].dy * this.t : 0); }

  /** 칸 사이를 가는 중에 반대로 돌아선다 */
  reverse() {
    if (!this.dir || this.t === 0) return;
    const n = this.maze.next(this.tx, this.ty, this.dir);
    this.tx = n.x; this.ty = n.y;
    this.dir = OPPOSITE[this.dir];
    this.t = 1 - this.t;
  }

  /**
   * speed(칸/tic) 만큼 움직인다. 칸 중심에 설 때마다 pick(actor) 으로 방향을 정하고
   * (null 이면 멈춘다), 칸에 도착하면 arrive(actor) 를 부른다. 남은 거리는 다음 칸으로 이어 쓴다.
   */
  advance(speed, pick, arrive) {
    let rem = speed;
    while (rem > 1e-9) {
      if (this.t === 0) {
        this.dir = pick(this);
        if (!this.dir) return;
      }
      const d = Math.min(rem, 1 - this.t);
      this.t += d;
      rem -= d;
      if (1 - this.t < 1e-9) {
        const n = this.maze.next(this.tx, this.ty, this.dir);
        this.tx = n.x; this.ty = n.y; this.t = 0;
        if (arrive) arrive(this);
      }
    }
  }
}
