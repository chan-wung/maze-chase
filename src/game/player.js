import { Actor } from './actor.js';
import { OPPOSITE } from './maze.js';

export class Player extends Actor {
  constructor(maze) {
    super(maze);
    this.reset();
  }

  reset() {
    this.place(this.maze.start.x, this.maze.start.y, null);
    this.want = 'left';     // 다음에 꺾고 싶은 방향 (갈림길에서 미리 눌러 둘 수 있다)
    this.facing = 'left';   // 마지막으로 향한 방향 (그릴 때 쓴다)
  }

  /** 방향 입력. 가는 길의 반대 방향이면 그 자리에서 바로 돌아선다 */
  setWant(dir) {
    this.want = dir;
    if (this.dir && dir === OPPOSITE[this.dir]) { this.reverse(); this.facing = dir; }
  }

  step(speed, arrive) {
    const { maze } = this;
    this.advance(speed, (a) => {
      if (this.want && maze.canMove(a.tx, a.ty, this.want)) { this.facing = this.want; return this.want; }
      if (a.dir && maze.canMove(a.tx, a.ty, a.dir)) return a.dir;
      return null;
    }, arrive);
  }
}
