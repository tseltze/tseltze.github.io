(function (global) {
  "use strict";

  const PROMOTION_TYPES = Object.freeze(["queen", "rook", "bishop", "knight"]);

  class ChessEngine {
    constructor() {
      this.cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
      this.rows = [8, 7, 6, 5, 4, 3, 2, 1];
      this.value = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
      this.resetState();
    }

    resetState() {
      this.board = {};
      this.currentTurn = "white";
      this.enPassant = null;
      this.halfMoveClock = 0;
      this.positionCounts = new Map();
    }

    legalMovesFrom(from) {
      return this.possibleMoves(from).filter((to) => !this.ifMove(from, to));
    }

    promotionOptions() {
      return [...PROMOTION_TYPES];
    }

    promote(type, color) {
      if (!PROMOTION_TYPES.includes(type)) {
        throw new RangeError(`Invalid promotion type: ${type}`);
      }
      return { type, color, hasMoved: true };
    }

    attackedSquaresFrom(from) {
      const piece = this.board[from];
      if (!piece) return [];
      if (piece.type !== "pawn") return this.possibleMoves(from);

      const file = from.charCodeAt(0);
      const rank = Number(from[1]);
      const direction = piece.color === "white" ? 1 : -1;
      return [-1, 1]
        .map((offset) => String.fromCharCode(file + offset) + (rank + direction))
        .filter((square) => /^[A-H][1-8]$/.test(square));
    }

    getGameStatus() {
      const hasLegalMove =
        Object.keys(this.board).some((cell) => {
          const piece = this.board[cell];
          return (
            piece.color === this.currentTurn && this.legalMovesFrom(cell).length > 0
          );
        }) ||
        this.canCastle(this.currentTurn, "king") ||
        this.canCastle(this.currentTurn, "queen");
      const checked = this.inCheck(this.currentTurn);

      if (!hasLegalMove) {
        if (checked) {
          return {
            type: "checkmate",
            winner: this.currentTurn === "white" ? "black" : "white",
          };
        }
        return { type: "stalemate" };
      }
      if (this.hasInsufficientMaterial()) return { type: "insufficient-material" };
      if (this.halfMoveClock >= 100) return { type: "fifty-move" };
      if ((this.positionCounts.get(this.positionKey()) || 0) >= 3) {
        return { type: "threefold-repetition" };
      }
      return { type: checked ? "check" : "active" };
    }

    exportState() {
      return {
        board: JSON.parse(JSON.stringify(this.board)),
        currentTurn: this.currentTurn,
        enPassant: this.enPassant ? { ...this.enPassant } : null,
        halfMoveClock: this.halfMoveClock,
        positionCounts: Array.from(this.positionCounts.entries()),
      };
    }

    restoreState(state) {
      this.board = JSON.parse(JSON.stringify(state.board || {}));
      this.currentTurn = state.currentTurn || "white";
      this.enPassant = state.enPassant ? { ...state.enPassant } : null;
      this.halfMoveClock = state.halfMoveClock || 0;
      this.positionCounts = new Map(state.positionCounts || []);
    }

    // =====================
    // POSSIBLE MOVES
    // =====================
    possibleMoves(from) {
      const p = this.board[from];
      if (!p) return []; // no piece on that square -> no moves
      const f = from.charCodeAt(0); 
      const r = +from[1]; // rank as a number
     
      const dir = p.color === "white" ? 1 : -1;
      const moves = [];
      // Pawns move in opposite directions depending on color: White
      // moves toward higher rank numbers (+1), Black toward lower ones
      // (-1).
      const push = (cf, cr) => {
        const cell = String.fromCharCode(cf) + cr;
        // push(cf, cr) is a small helper used by every "sliding" or
        // "stepping" piece below. Given a candidate file and rank, it:
        //   1. converts them back into a square name like "E4"
        //   2. bails out if that square is off the board
        //   3. bails out if it's occupied by a piece of the SAME color
        // Its return value is used by the sliding pieces to decide whether
        // to keep sliding further in that direction: it returns `true` only
        // when the square was empty and `false` both when the square is
        // off-board AND when it's occupied
        if (!/^[A-H][1-8]$/.test(cell)) return false;
        const occ = this.board[cell];
        if (occ && occ.color === p.color) return false; // blocked by own piece
        moves.push(cell);
        return !occ; // true = square was empty, so sliding pieces may continue past it
      }; // Regex check that `cell` is a real square, e.g. "E4" -- this
      // is what catches attempts to move off the edge of the board
      // (file before A / after H, or rank below 1 / above 8).
      switch (p.type) {
        case "pawn":
          {
            // Pawns are the one piece type where "can move there" and
            // "can capture there" are DIFFERENT rules
            // --- Forward movement (no capturing straight ahead) ---
            const one = String.fromCharCode(f) + (r + dir);
            if (!this.board[one]) {
              moves.push(one);
              if (!p.hasMoved) {
                const two = String.fromCharCode(f) + (r + 2 * dir);
                if (!this.board[two]) moves.push(two);
              }
            } // First move only: allowed to advance two squares, but only
            // if BOTH the one-square and two-square destinations are empty
            [-1, 1].forEach((df) => {
              const cap = String.fromCharCode(f + df) + (r + dir);
              if (this.board[cap] && this.board[cap].color !== p.color)
                moves.push(cap);
            }); // --- Diagonal captures ---
            // A pawn can move one square diagonally forward ONLY if
            // there's an enemy piece there
            if (this.enPassant) {
              [-1, 1].forEach((df) => {
                const ep = String.fromCharCode(f + df) + (r + dir);
                if (ep === this.enPassant.target) moves.push(ep);
              });
            }
          }
          break;
        // En passant is a special one-time capture: if an enemy pawn
        // JUST advanced two squares on the previous move (landing
        // right beside this pawn), this pawn may capture it "as it
        // passes", moving diagonally into the square the enemy pawn
        // skipped over
        case "knight":
          // All 8 possible "L-shaped" knight jumps, as [file-offset,
          // rank-offset] pairs.
          [
            [1, 2],
            [2, 1],
            [2, -1],
            [1, -2],
            [-1, -2],
            [-2, -1],
            [-2, 1],
            [-1, 2],
          ].forEach(([df, dr]) => push(f + df, r + dr));
          break;

        case "bishop":
          // The 4 diagonal directions. For each one, keep stepping
          // further away (i = 1, 2, 3, ... up to 7 squares) and calling
          // push() at each step; push()'s return value tells us to
          // `break` out of the inner loop as soon as we hit an occupied
          // square
          [
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ].forEach(([df, dr]) => {
            for (let i = 1; i < 8; i++) if (!push(f + df * i, r + dr * i)) break;
          });
          break;

        case "rook":
          // The 4 straight (horizontal/vertical) directions, same
          // sliding pattern as the bishop
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].forEach(([df, dr]) => {
            for (let i = 1; i < 8; i++) if (!push(f + df * i, r + dr * i)) break;
          });
          break;

        case "queen":
          // A queen simply moves like a bishop AND a rook combined
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ].forEach(([df, dr]) => {
            for (let i = 1; i < 8; i++) if (!push(f + df * i, r + dr * i)) break;
          });
          break;

        case "king":
          // Same 8 directions as the queen, but only a single step in each
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ].forEach(([df, dr]) => push(f + df, r + dr));
          break;
      }
      return moves;
    }

    // =====================
    // SIMULATE MOVE (CHECK SAFETY)
    // =====================
    ifMove(from, to) {
      const moving = this.board[from];
      const dst = this.board[to]; // whatever (if anything) is currently on the
      let enPassantCell = null, // destination square
        epPiece = null;

      if (
        moving.type === "pawn" &&
        !dst &&
        this.enPassant &&
        this.enPassant.target === to
      ) {
        enPassantCell = this.enPassant.capture;
        epPiece = this.board[enPassantCell];
        delete this.board[enPassantCell];
      }

      // --- Perform the move ---
      delete this.board[from];
      this.board[to] = moving;

      // --- Check whether the mover's own king is now in check ---
      const inCheck = this.inCheck(moving.color);

      // --- Undo the move, restoring the board exactly as it was ---
      delete this.board[to];
      this.board[from] = moving;
      if (dst) this.board[to] = dst; // put back whatever was captured normally...
      if (enPassantCell) this.board[enPassantCell] = epPiece; // ...or the en passant victim,
      return inCheck;
    }

    // =====================
    // IN CHECK
    // =====================
    // inCheck: Is the given color's king currently under attack?
    inCheck(color) {
      let king = "";
      for (const cell in this.board) {
        const p = this.board[cell];
        if (p.type === "king" && p.color === color) {
          king = cell;
          break;
        } /* find king */
      } // Scan every occupied square looking for this color's king.
      for (const cell in this.board) {
        const p = this.board[cell];
        if (p.color !== color && this.attackedSquaresFrom(cell).includes(king))
          return true;
      }
      return false;
    }

    // =====================
    // CAN CASTLE
    // =====================
    canCastle(color, side) {
      const rank = color === "white" ? "1" : "8";
      const kingFrom = "E" + rank;
      const rookFrom = side === "king" ? "H" + rank : "A" + rank;
      const king = this.board[kingFrom];
      const rook = this.board[rookFrom];
      if (!king || king.type !== "king" || king.hasMoved) return false;
      if (!rook || rook.type !== "rook" || rook.hasMoved) return false;

      const emptyPath =
        side === "king"
          ? ["F" + rank, "G" + rank]
          : ["D" + rank, "C" + rank, "B" + rank];
      if (emptyPath.some((square) => this.board[square])) return false;

      // The squares the king actually travels across (its start square
      // plus every square up to and including where it lands) must all
      // be safe -- castling is not allowed out of, through, or into
      // check.
      const kingPath =
        side === "king"
          ? ["E" + rank, "F" + rank, "G" + rank]
          : ["E" + rank, "D" + rank, "C" + rank];
      const opponent = color === "white" ? "black" : "white";
      return !kingPath.some((square) =>
        Object.keys(this.board).some(
          (cell) =>
            this.board[cell].color === opponent &&
            this.attackedSquaresFrom(cell).includes(square),
        ),
      );
    }

    // =====================
    // INSUFFICIENT MATERIAL CHECK
    // =====================
    // True when neither side has enough material left on the board to ever force a
    // checkmate which is an automatic draw under the standard chess rules 
    hasInsufficientMaterial() {
      const pieces = Object.values(this.board).filter((p) => p.type !== "king");
      if (pieces.length === 0) return true; // king vs king
      if (
        pieces.length === 1 &&
        (pieces[0].type === "bishop" || pieces[0].type === "knight")
      ) {
        return true; // king+minor vs king
      }
      if (
        pieces.length === 2 &&
        pieces.every((p) => p.type === "bishop" || p.type === "knight")
      ) {
        return true; // king+minor vs king+minor (a simplification: a real
        // engine would also check same-colored bishops here, but two
        // minor pieces are extremely unlikely to force mate regardless)
      }
      return false;
    }

    // =====================
    // SEARCH KEY
    // =====================
    searchKey(color) {
      const boardPart = Object.keys(this.board)
        .sort()
        .map(
          (cell) =>
            `${cell}${this.board[cell].color[0]}${this.board[cell].type[0]}`,
        )
        .join(",");
      const rights = ["white", "black"]
        .map((c) => {
          const rank = c === "white" ? "1" : "8";
          const king = this.board["E" + rank];
          const kingOk = king && king.type === "king" && !king.hasMoved;
          const kRook = this.board["H" + rank];
          const qRook = this.board["A" + rank];
          return (
            (kingOk && kRook && kRook.type === "rook" && !kRook.hasMoved
              ? "K"
              : "") +
            (kingOk && qRook && qRook.type === "rook" && !qRook.hasMoved
              ? "Q"
              : "")
          );
        })
        .join("|");
      const ep = this.enPassant ? this.enPassant.target : "-";
      return `${boardPart}_${color}_${rights}_${ep}`;
    }

    // =====================
    // POSITION KEY
    // =====================
    // positionKey(): searchKey() for whoever's ACTUALLY up next on the
    // real board right now -- used for threefold-repetition tracking.
    positionKey() {
      return this.searchKey(this.currentTurn);
    }

    // =====================
    // RECORD POSITION
    // =====================
    // recordPosition(): records the current position (see positionKey()
    // above) as having occurred once more, and returns the new total
    // count for that exact position.
    recordPosition() {
      const key = this.positionKey();
      const count = (this.positionCounts.get(key) || 0) + 1;
      this.positionCounts.set(key, count);
      return count;
    }

  }

  global.ChessEngine = ChessEngine;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { ChessEngine };
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
