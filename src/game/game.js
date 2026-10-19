import { Maze } from './maze.js';
import { Player } from './player.js';
import { Ghost, GHOST_DEFS } from './ghost.js';

export const TICRATE = 60;
const SPEED = { player: 0.125, ghost: 0.115, scared: 0.07, eaten: 0.25, leave: 0.07 };
/** [초, 모드]: 흩어지기와 쫓기를 번갈아. 마지막은 끝까지 쫓기 */
const SCHEDULE = [[6, 'scatter'], [18, 'chase'], [6, 'scatter'], [18, 'chase'], [4, 'scatter'], [22, 'chase'], [4, 'scatter'], [Infinity, 'chase']];
const SCORE = { dot: 10, power: 40, ghost: 150 };
const START_LIVES = 3;
const EXTRA_LIFE_AT = 8000;

/**
 * 게임 규칙 전체. 화면·키보드를 모르므로 node 에서 그대로 테스트할 수 있다.
 * phase: title → ready → play → (dying → ready | over) / (clear → ready)
 */
export class Game {
  constructor({ maze = new Maze(), rng = Math.random } = {}) {
    this.maze = maze;
    this.rng = rng;
    this.player = new Player(maze);
    this.ghosts = GHOST_DEFS.map((_, i) => new Ghost(maze, i));
    this.phase = 'title';
    this.hiScore = 0;
    this.frame = 0;
    this.paused = false;
    this.newGame();
    this.phase = 'title';
  }

  newGame() {
    this.paused = false;
    this.score = 0;
    this.lives = START_LIVES;
    this.level = 1;
    this.extraGiven = false;
    this.startLevel();
  }

  startLevel() {
    this.dots = Uint8Array.from(this.maze.initialDots);
    this.dotsLeft = this.maze.dotCount;
    this.resetActors();
  }

  resetActors() {
    this.player.reset();
    for (const g of this.ghosts) g.reset();
    this.modeIndex = 0;
    this.modeTimer = SCHEDULE[0][0] * TICRATE;
    this.mode = SCHEDULE[0][1];
    this.scaredTimer = 0;
    this.ghostCombo = 0;
    this.playTime = 0;
    this.popup = null;
    this.phase = 'ready';
    this.timer = 2 * TICRATE;
  }

  /** title / over 에서 키를 누르면 새 게임 */
  start() {
    if (this.phase === 'title' || this.phase === 'over') { this.newGame(); }
  }

  setDir(dir) { if (!this.paused) this.player.setWant(dir); }

  /** 일시정지는 타이틀·게임 오버 화면에서는 의미가 없다 */
  get canPause() { return this.phase !== 'title' && this.phase !== 'over'; }
  pause() { if (this.canPause) this.paused = true; }
  resume() { this.paused = false; }
  togglePause() { if (this.paused) this.resume(); else this.pause(); }

  get speedScale() { return 1 + 0.04 * Math.min(this.level - 1, 10); }
  get scaredTics() { return Math.round(Math.max(6 - (this.level - 1) * 0.8, 1) * TICRATE); }

  addScore(n) {
    this.score += n;
    if (this.score > this.hiScore) this.hiScore = this.score;
    if (!this.extraGiven && this.score >= EXTRA_LIFE_AT) { this.extraGiven = true; this.lives++; }
  }

  eatAt(x, y) {
    const i = y * this.maze.w + x;
    const v = this.dots[i];
    if (!v) return;
    this.dots[i] = 0;
    this.dotsLeft--;
    this.addScore(v === 2 ? SCORE.power : SCORE.dot);
    if (v === 2) this.scare();
  }

  scare() {
    this.scaredTimer = this.scaredTics;
    this.ghostCombo = 0;
    for (const g of this.ghosts) {
      if (g.state === 'wait' || g.state === 'eaten') continue;
      if (!g.scared) g.turnBack = true;
      g.scared = true;
    }
  }

  tick() {
    if (this.paused) return;
    this.frame++;
    switch (this.phase) {
      case 'ready':
        if (--this.timer <= 0) this.phase = 'play';
        break;
      case 'play': this.play(); break;
      case 'dying':
        if (--this.timer <= 0) {
          this.lives--;
          if (this.lives <= 0) this.phase = 'over'; else this.resetActors();
        }
        break;
      case 'clear':
        if (--this.timer <= 0) { this.level++; this.startLevel(); }
        break;
      default: break;
    }
  }

  play() {
    const { player, ghosts, maze } = this;
    this.playTime++;
    if (this.popup && --this.popup.timer <= 0) this.popup = null;

    if (this.scaredTimer > 0) {                 // 겁먹은 동안에는 흩어지기·쫓기 시계가 멈춘다
      if (--this.scaredTimer === 0) for (const g of ghosts) g.scared = false;
    } else if (--this.modeTimer <= 0) {
      this.modeIndex = Math.min(this.modeIndex + 1, SCHEDULE.length - 1);
      this.modeTimer = SCHEDULE[this.modeIndex][0] * TICRATE;
      this.mode = SCHEDULE[this.modeIndex][1];
      for (const g of ghosts) if (g.state === 'roam') g.turnBack = true;
    }

    for (const g of ghosts) if (g.state === 'wait' && this.playTime >= g.def.release / this.speedScale) g.state = 'leave';

    const k = this.speedScale;
    this.eatAt(player.tx, player.ty);
    player.step(SPEED.player * k, (p) => this.eatAt(p.tx, p.ty));
    if (this.dotsLeft <= 0) { this.phase = 'clear'; this.timer = 2 * TICRATE; return; }

    const ctx = { maze, player, ghosts, mode: this.mode, rng: this.rng };
    for (const g of ghosts) {
      const s = g.state === 'eaten' ? SPEED.eaten : g.state === 'leave' ? SPEED.leave : g.scared ? SPEED.scared : SPEED.ghost;
      g.step(s * k, ctx);
      if (this.touching(g)) {
        if (g.scared && g.state !== 'eaten') {
          g.state = 'eaten'; g.scared = false;
          const pts = SCORE.ghost << this.ghostCombo++;
          this.addScore(pts);
          this.popup = { x: g.x, y: g.y, text: String(pts), timer: 60 };
        } else if (g.state !== 'eaten') {
          this.phase = 'dying';
          this.timer = 100;
          return;
        }
      }
    }
  }

  touching(g) {
    const dx = Math.abs(g.x - this.player.x), dy = Math.abs(g.y - this.player.y);
    return dx < 0.6 && dy < 0.6;
  }
}
