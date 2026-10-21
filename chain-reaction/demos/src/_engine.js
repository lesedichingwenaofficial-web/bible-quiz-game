// ===================== CHAIN REACTION ENGINE =====================
// Shared by every cheekyfoundlamb demo. Keep this block identical across files;
// demo-specific rules plug in through the `rules` hooks of Engine.resolve.
//
// Written for the Chain Burst project after studying these MIT-licensed
// open-source Chain Reaction games:
//   LironCareto/ChainReaction          Copyright (c) 2026 LironCareto
//   tahmidnafees619/ChainReaction-game Copyright (c) 2026 tahmidnafees619
//
// MIT License
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
const Engine = (() => {
  const ORTHO = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  const DIAG = [[-1, -1], [-1, 1], [1, 1], [1, -1]];
  const ALL8 = ORTHO.concat(DIAG);

  // A board is a set of flat arrays indexed by row * cols + col.
  // owner: player index (>= 0), or -1 for empty. count: orbs in the cell.
  // rock: blocked cells. `extra` adds more per-cell arrays, e.g. { water: false }.
  function createBoard(rows, cols, extra = {}) {
    const size = rows * cols;
    const b = {
      rows,
      cols,
      size,
      owner: new Array(size).fill(-1),
      count: new Array(size).fill(0),
      rock: new Array(size).fill(false),
    };
    for (const [key, value] of Object.entries(extra)) b[key] = new Array(size).fill(value);
    return b;
  }

  function clone(b) {
    const c = {};
    for (const key in b) c[key] = Array.isArray(b[key]) ? b[key].slice() : b[key];
    return c;
  }

  const rowOf = (b, i) => Math.floor(i / b.cols);
  const colOf = (b, i) => i % b.cols;
  const inside = (b, r, c) => r >= 0 && c >= 0 && r < b.rows && c < b.cols;

  function neighbours(b, i, dirs = ORTHO) {
    const r = rowOf(b, i);
    const c = colOf(b, i);
    const out = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inside(b, nr, nc)) continue;
      const n = nr * b.cols + nc;
      if (!b.rock[n]) out.push(n);
    }
    return out;
  }

  // Critical mass: the number of open orthogonal neighbours (corner 2, edge 3, middle 4).
  const capacity = (b, i) => neighbours(b, i).length;

  const DEFAULT_RULES = {
    cap: (b, i) => capacity(b, i), // orbs needed to burst
    canBurst: (b, i) => b.owner[i] >= 0,
    targets: (b, i) => neighbours(b, i), // one orb lands per entry (repeat an entry for 2 orbs)
    spend: (b, i) => DEFAULT_RULES.cap(b, i), // orbs the bursting cell loses
    emptied: (b, i) => {
      b.owner[i] = -1;
    },
    land: (b, from, to, who) => {
      b.owner[to] = who;
      b.count[to]++;
    },
    done: () => false, // return true to stop resolving (e.g. only one side left)
    maxWaves: 200,
  };

  function place(b, i, who, n = 1) {
    b.owner[i] = who;
    b.count[i] += n;
  }

  // Resolves every burst in waves: all full cells in a wave burst together.
  // Mutates `b`. Returns { waves, capped }, where each wave is
  // { bursts: [{ from, to, who }], board } and board is a snapshot after the wave.
  function resolve(b, rules = {}, record = true) {
    const R = { ...DEFAULT_RULES, ...rules };
    if (!rules.spend) R.spend = (bb, i) => R.cap(bb, i);
    const waves = [];
    let capped = false;
    for (;;) {
      if (R.done(b)) break;
      if (waves.length >= R.maxWaves) {
        capped = true;
        break;
      }
      const ready = [];
      for (let i = 0; i < b.size; i++) if (b.count[i] >= R.cap(b, i) && R.canBurst(b, i)) ready.push(i);
      if (!ready.length) break;
      const bursts = [];
      for (const from of ready) {
        const who = b.owner[from];
        const to = R.targets(b, from);
        b.count[from] = Math.max(0, b.count[from] - R.spend(b, from));
        if (b.count[from] === 0) R.emptied(b, from);
        bursts.push({ from, to, who });
      }
      for (const { from, to, who } of bursts) for (const t of to) R.land(b, from, t, who);
      waves.push({ bursts, board: record ? clone(b) : null });
    }
    return { waves, capped };
  }

  function tally(b, players) {
    const cells = new Array(players).fill(0);
    const orbs = new Array(players).fill(0);
    for (let i = 0; i < b.size; i++) {
      const o = b.owner[i];
      if (o >= 0 && o < players) {
        cells[o]++;
        orbs[o] += b.count[i];
      }
    }
    return { cells, orbs };
  }

  return { ORTHO, DIAG, ALL8, createBoard, clone, rowOf, colOf, inside, neighbours, capacity, place, resolve, tally };
})();
// =================== END CHAIN REACTION ENGINE ===================
