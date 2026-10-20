// Computer opponent. Scores boards with a simple heuristic and, on harder
// levels, looks one reply ahead.
import { capacity, legalMoves, neighbours, playMove } from "./engine.js";

const WIN = 1e6;

// How good the board is for `me`. Higher is better.
export function evaluate(state, me) {
  if (state.winner === me) return WIN;
  if (state.winner !== -1 || !state.players[me].alive) return -WIN;

  let score = 0;
  for (let i = 0; i < state.owner.length; i++) {
    const owner = state.owner[i];
    if (owner === -1) continue;
    const cap = capacity(state, i);
    const nearFull = state.count[i] === cap - 1;
    let value = state.count[i] * 2 + 3;

    let threatened = false;
    let targets = 0;
    for (const n of neighbours(state, i)) {
      const other = state.owner[n];
      if (other === -1 || other === owner) continue;
      if (state.count[n] === capacity(state, n) - 1) threatened = true;
      targets += state.count[n];
    }

    if (threatened) {
      value -= 5 - cap + state.count[i];
    } else {
      if (cap === 2) value += 3;
      else if (cap === 3) value += 2;
      if (nearFull) value += 2 + targets;
    }
    score += owner === me ? value : -value;
  }
  return score;
}

const shuffle = (list, random) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

function bestByGreedy(state, player, random) {
  let best = null;
  let bestScore = -Infinity;
  for (const move of shuffle(legalMoves(state), random)) {
    const { state: after } = playMove(state, move, { record: false });
    const score = evaluate(after, player);
    if (score > bestScore) {
      bestScore = score;
      best = { move, after };
    }
  }
  return best;
}

// level: "easy" | "medium" | "hard"
export function chooseMove(state, level = "medium", random = Math.random) {
  const me = state.current;
  const moves = legalMoves(state);
  if (!moves.length) return -1;

  if (level === "easy" && random() < 0.6) return moves[Math.floor(random() * moves.length)];
  if (level !== "hard") return bestByGreedy(state, me, random).move;

  // Hard: assume the next player answers with their own best greedy move.
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of shuffle(moves, random)) {
    const { state: after } = playMove(state, move, { record: false });
    let score;
    if (after.winner !== -1) {
      score = evaluate(after, me);
    } else {
      const reply = bestByGreedy(after, after.current, random);
      score = reply ? evaluate(reply.after, me) : evaluate(after, me);
    }
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
    if (score >= WIN) break;
  }
  return best;
}
