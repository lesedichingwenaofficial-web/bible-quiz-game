import test from "node:test";
import assert from "node:assert/strict";
import { capacity, createGame, isLegal, playMove } from "../engine.js";
import { chooseMove } from "../ai.js";

const twoPlayers = () =>
  createGame({ rows: 3, cols: 3, players: [{ kind: "human" }, { kind: "human" }] });

test("capacity is the number of neighbours", () => {
  const s = twoPlayers();
  assert.equal(capacity(s, 0), 2); // corner
  assert.equal(capacity(s, 1), 3); // edge
  assert.equal(capacity(s, 4), 4); // middle
});

test("cannot play on an opponent's cell", () => {
  let s = twoPlayers();
  s = playMove(s, 0).state;
  assert.equal(isLegal(s, 0), false);
  assert.equal(isLegal(s, 1), true);
});

test("a full corner explodes into its neighbours and captures them", () => {
  let s = twoPlayers();
  s = playMove(s, 0).state; // P0 corner: 1
  s = playMove(s, 1).state; // P1 edge: 1
  const { state, waves } = playMove(s, 0); // P0 corner reaches 2 and explodes
  assert.equal(waves.length, 1);
  assert.equal(state.count[0], 0);
  assert.equal(state.owner[0], -1);
  assert.equal(state.owner[1], 0); // captured
  assert.equal(state.count[1], 2);
  assert.equal(state.owner[3], 0);
  assert.equal(state.count[3], 1);
});

test("nobody wins before every player has moved", () => {
  const s = playMove(twoPlayers(), 0).state;
  assert.equal(s.winner, -1);
  assert.equal(s.current, 1);
});

test("capturing every enemy orb wins the game", () => {
  let s = twoPlayers();
  s = playMove(s, 0).state;
  s = playMove(s, 1).state;
  s = playMove(s, 0).state;
  assert.equal(s.winner, 0);
  assert.equal(s.players[1].alive, false);
});

test("eliminated players are skipped in a 3-player game", () => {
  let s = createGame({ rows: 3, cols: 3, players: [{}, {}, {}] });
  s = playMove(s, 0).state; // P0
  s = playMove(s, 1).state; // P1
  s = playMove(s, 8).state; // P2
  s = playMove(s, 0).state; // P0 explodes and captures P1's only cell
  assert.equal(s.players[1].alive, false);
  assert.equal(s.winner, -1);
  assert.equal(s.current, 2);
});

test("bots always finish a game with a winner", () => {
  for (const level of ["easy", "medium", "hard"]) {
    let s = createGame({ rows: 5, cols: 4, players: [{}, {}, {}] });
    let moves = 0;
    while (s.winner === -1 && moves < 2000) {
      s = playMove(s, chooseMove(s, level), { record: false }).state;
      moves++;
    }
    assert.notEqual(s.winner, -1, `${level} game did not finish`);
  }
});
