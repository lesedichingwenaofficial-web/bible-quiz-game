// Game rules. Pure functions only: nothing here touches the screen.
// A board is two flat arrays indexed by row * cols + col:
//   owner[i]: player index, or -1 when the cell is empty
//   count[i]: number of orbs in the cell

const MAX_WAVES = 2000;

export function createGame({ rows, cols, players }) {
  const size = rows * cols;
  return {
    rows,
    cols,
    owner: new Array(size).fill(-1),
    count: new Array(size).fill(0),
    players: players.map((p) => ({ ...p, alive: true, moved: false })),
    current: 0,
    winner: -1,
    turn: 0,
  };
}

export function neighbours(state, i) {
  const { rows, cols } = state;
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out = [];
  if (r > 0) out.push(i - cols);
  if (c < cols - 1) out.push(i + 1);
  if (r < rows - 1) out.push(i + cols);
  if (c > 0) out.push(i - 1);
  return out;
}

// Critical mass: corner 2, edge 3, middle 4.
export const capacity = (state, i) => neighbours(state, i).length;

export function isLegal(state, i) {
  return (
    state.winner === -1 &&
    i >= 0 &&
    i < state.owner.length &&
    (state.owner[i] === -1 || state.owner[i] === state.current)
  );
}

export function legalMoves(state) {
  const moves = [];
  for (let i = 0; i < state.owner.length; i++) if (isLegal(state, i)) moves.push(i);
  return moves;
}

export function cloneState(state) {
  return {
    ...state,
    owner: state.owner.slice(),
    count: state.count.slice(),
    players: state.players.map((p) => ({ ...p })),
  };
}

export function orbTotals(state) {
  const totals = new Array(state.players.length).fill(0);
  for (let i = 0; i < state.owner.length; i++)
    if (state.owner[i] !== -1) totals[state.owner[i]] += state.count[i];
  return totals;
}

function unstableCells(state) {
  const cells = [];
  for (let i = 0; i < state.count.length; i++)
    if (state.count[i] >= capacity(state, i)) cells.push(i);
  return cells;
}

// True once `player` owns every orb and all other players have had a turn,
// i.e. nobody else can come back. Further explosions would change nothing.
function hasWon(state, player) {
  if (state.players.some((p, idx) => idx !== player && !p.moved)) return false;
  return state.owner.every((o, i) => o === player || state.count[i] === 0);
}

// Places an orb for the current player and resolves the chain reaction in
// waves: every over-full cell in a wave explodes at the same time.
// Returns the new state plus snapshots the UI can animate.
export function playMove(state, i, { record = true } = {}) {
  if (!isLegal(state, i)) throw new Error(`Illegal move at cell ${i}`);
  const s = cloneState(state);
  const player = s.current;
  s.owner[i] = player;
  s.count[i]++;
  s.players[player].moved = true;

  const placed = record ? { owner: s.owner.slice(), count: s.count.slice() } : null;
  const waves = [];
  let unstable = unstableCells(s);
  let waveCount = 0;

  while (unstable.length && !hasWon(s, player) && waveCount < MAX_WAVES) {
    const explosions = [];
    for (const from of unstable) {
      const to = neighbours(s, from);
      s.count[from] -= to.length;
      s.owner[from] = s.count[from] > 0 ? player : -1;
      for (const t of to) {
        s.owner[t] = player;
        s.count[t]++;
      }
      explosions.push({ from, to });
    }
    waveCount++;
    if (record) waves.push({ explosions, owner: s.owner.slice(), count: s.count.slice() });
    unstable = unstableCells(s);
  }

  // A player who has had a turn and has no orbs left is out.
  const totals = orbTotals(s);
  s.players.forEach((p, idx) => {
    if (p.alive && p.moved && totals[idx] === 0) p.alive = false;
  });

  const alive = s.players.filter((p) => p.alive);
  const everyoneMoved = s.players.every((p) => p.moved);
  if (alive.length === 1 && everyoneMoved) s.winner = s.players.indexOf(alive[0]);

  if (s.winner === -1) {
    let next = s.current;
    do next = (next + 1) % s.players.length;
    while (!s.players[next].alive);
    s.current = next;
  }
  s.turn++;

  return { state: s, placed, waves };
}
