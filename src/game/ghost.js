import { Actor } from './actor.js';
import { ORDER, OPPOSITE } from './maze.js';

/**
 * 유령 네 마리. 쫓아오는 모양이 서로 달라서 한 마리만 피해서는 잡히게 된다.
 *  chaser   : 플레이어가 서 있는 칸을 그대로 쫓는다
 *  ambusher : 플레이어가 가는 방향 4칸 앞을 노려 길목을 막는다
 *  flanker  : chaser 와 '플레이어 2칸 앞'을 잇는 선을 두 배로 늘린 곳 = 반대편에서 끼어 든다
 *  shy      : 멀면 쫓고, 8칸 안으로 가까워지면 제 구석으로 도망간다
 */
export const GHOST_DEFS = [
  { id: 'chaser', color: '#ff3b30', corner: [19, 0], release: 0 },
  { id: 'ambusher', color: '#ff8fd0', corner: [1, 0], release: 0 },
  { id: 'flanker', color: '#35e0e6', corner: [19, 20], release: 300 },
  { id: 'shy', color: '#ffa63d', corner: [1, 20], release: 600 },
];

const sq = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

export class Ghost extends Actor {
  constructor(maze, index) {
    super(maze);
    this.index = index;
    this.def = GHOST_DEFS[index];
    this.reset();
  }

  /** state: wait(집 안에서 기다림) leave(집을 나감) roam(미로를 돌아다님) eaten(눈만 남아 집으로) */
  reset() {
    const { maze, index } = this;
    if (index === 0) { this.place(maze.door.x, maze.door.y - 1, 'left'); this.state = 'roam'; }
    else { const c = maze.houseCells[(index - 1) % maze.houseCells.length]; this.place(c.x, c.y, null); this.state = 'wait'; }
    this.scared = false;
    this.turnBack = false;     // 다음 칸 중심에서 뒤로 돈다 (모드가 바뀔 때)
  }

  /** 지금 노리는 칸 */
  target(ctx) {
    const { maze, player, mode } = ctx;
    if (this.state === 'leave') return { x: maze.door.x, y: maze.door.y - 1 };
    if (this.state === 'eaten') return maze.house;
    const corner = { x: this.def.corner[0], y: this.def.corner[1] };
    if (mode === 'scatter') return corner;
    const f = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] }[player.facing];
    switch (this.def.id) {
      case 'ambusher': return { x: player.tx + f[0] * 4, y: player.ty + f[1] * 4 };
      case 'flanker': {
        const red = ctx.ghosts[0];
        const px = player.tx + f[0] * 2, py = player.ty + f[1] * 2;
        return { x: red.tx + (px - red.tx) * 2, y: red.ty + (py - red.ty) * 2 };
      }
      case 'shy': return sq(this.tx, this.ty, player.tx, player.ty) > 64 ? { x: player.tx, y: player.ty } : corner;
      default: return { x: player.tx, y: player.ty };
    }
  }

  /** 칸 중심에서 갈 방향 */
  pick(ctx) {
    const { maze, rng } = ctx;
    if (this.state === 'wait') return null;
    const door = this.state === 'leave' || this.state === 'eaten';
    const open = ORDER.filter((d) => maze.canMove(this.tx, this.ty, d, door));
    if (this.state === 'eaten') {           // 눈은 집까지 가장 짧은 길로 (직선거리로 가면 모퉁이에 갇힌다)
      const dist = maze.distanceTo(maze.house.x, maze.house.y);
      let best = null, bestD = Infinity;
      for (const d of open) { const n = maze.next(this.tx, this.ty, d); const v = dist[n.y * maze.w + n.x]; if (v >= 0 && v < bestD) { best = d; bestD = v; } }
      return best;
    }
    const back = this.dir ? OPPOSITE[this.dir] : null;
    if (this.turnBack) {
      this.turnBack = false;
      if (back && open.includes(back)) return back;
    }
    let choices = open.filter((d) => d !== back);
    if (!choices.length) choices = open;     // 막다른 길이면 되돌아간다
    if (!choices.length) return null;
    if (this.scared && this.state === 'roam') return choices[Math.floor(rng() * choices.length)];
    const tg = this.target(ctx);
    let best = choices[0], bestD = Infinity;
    for (const d of choices) {               // 거리가 같으면 ORDER(위·왼·아래·오른) 앞쪽이 이긴다
      const n = maze.next(this.tx, this.ty, d);
      const v = sq(n.x, n.y, tg.x, tg.y);
      if (v < bestD) { best = d; bestD = v; }
    }
    return best;
  }

  step(speed, ctx) {
    if (this.state === 'wait') return;
    this.advance(speed, () => this.pick(ctx), () => {
      const { maze } = this;
      if (this.state === 'leave' && this.tx === maze.door.x && this.ty === maze.door.y - 1) this.state = 'roam';
      else if (this.state === 'eaten' && this.tx === maze.house.x && this.ty === maze.house.y) { this.state = 'leave'; this.scared = false; this.dir = null; }
    });
  }
}
