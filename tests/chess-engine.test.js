const test = require("node:test");
const assert = require("node:assert/strict");
const { ChessEngine } = require("../chess-engine.js");

const piece = (type, color, hasMoved = false) => ({ type, color, hasMoved });

function position(board, options = {}) {
  const engine = new ChessEngine();
  engine.restoreState({
    board,
    currentTurn: options.currentTurn || "white",
    enPassant: options.enPassant || null,
    halfMoveClock: options.halfMoveClock || 0,
    positionCounts: options.positionCounts || [],
  });
  return engine;
}

test("legalMovesFrom filters moves that expose the king", () => {
  const engine = position({
    E1: piece("king", "white"),
    E2: piece("rook", "white"),
    E8: piece("rook", "black"),
    A8: piece("king", "black"),
  });

  assert.deepEqual(engine.legalMovesFrom("E2").sort(), ["E3", "E4", "E5", "E6", "E7", "E8"]);
});

test("promotion exposes only standard pieces and rejects invalid choices", () => {
  const engine = new ChessEngine();

  assert.deepEqual(engine.promotionOptions(), ["queen", "rook", "bishop", "knight"]);
  assert.deepEqual(engine.promote("queen", "white"), {
    type: "queen",
    color: "white",
    hasMoved: true,
  });
  assert.throws(() => engine.promote("pawn", "white"), RangeError);
});

test("en passant is generated without mutating the position", () => {
  const engine = position(
    {
      E1: piece("king", "white"),
      E8: piece("king", "black"),
      E5: piece("pawn", "white", true),
      D5: piece("pawn", "black", true),
    },
    { enPassant: { target: "D6", capture: "D5" } },
  );
  const before = engine.exportState();

  assert.ok(engine.legalMovesFrom("E5").includes("D6"));
  assert.deepEqual(engine.exportState(), before);
});

test("castling is allowed only across unattacked empty squares", () => {
  const safe = position({
    E1: piece("king", "white"),
    H1: piece("rook", "white"),
    E8: piece("king", "black"),
  });
  assert.equal(safe.canCastle("white", "king"), true);

  const pawnAttack = position({
    E1: piece("king", "white"),
    H1: piece("rook", "white"),
    E8: piece("king", "black"),
    G2: piece("pawn", "black", true),
  });
  assert.equal(pawnAttack.canCastle("white", "king"), false);
});

test("game status distinguishes checkmate and stalemate", () => {
  const checkmate = position(
    {
      H1: piece("king", "white"),
      F2: piece("king", "black"),
      G2: piece("queen", "black"),
    },
    { currentTurn: "white" },
  );
  assert.deepEqual(checkmate.getGameStatus(), { type: "checkmate", winner: "black" });

  const stalemate = position(
    {
      H1: piece("king", "white"),
      F2: piece("king", "black"),
      G3: piece("queen", "black"),
    },
    { currentTurn: "white" },
  );
  assert.deepEqual(stalemate.getGameStatus(), { type: "stalemate" });
});

test("draw rules report insufficient material, fifty moves, and repetition", () => {
  const insufficient = position({
    E1: piece("king", "white"),
    E8: piece("king", "black"),
  });
  assert.deepEqual(insufficient.getGameStatus(), { type: "insufficient-material" });

  const fiftyMove = position(
    {
      E1: piece("king", "white"),
      A1: piece("rook", "white"),
      E8: piece("king", "black"),
    },
    { halfMoveClock: 100 },
  );
  assert.deepEqual(fiftyMove.getGameStatus(), { type: "fifty-move" });

  const repetition = position({
    E1: piece("king", "white"),
    A1: piece("rook", "white"),
    E8: piece("king", "black"),
  });
  repetition.recordPosition();
  repetition.recordPosition();
  repetition.recordPosition();
  assert.deepEqual(repetition.getGameStatus(), { type: "threefold-repetition" });
});

test("exported state can restore an earlier position for undo", () => {
  const engine = position({
    E1: piece("king", "white"),
    A1: piece("rook", "white"),
    E8: piece("king", "black"),
  });
  engine.recordPosition();
  const snapshot = engine.exportState();

  delete engine.board.A1;
  engine.currentTurn = "black";
  engine.halfMoveClock = 42;
  engine.restoreState(snapshot);

  assert.deepEqual(engine.exportState(), snapshot);
});
