// Based off the starter code from Alex Burton https://alexburton.com/
//   - The board itself is NOT a 2D array (no board[row][col]). Instead
//     it's a plain object where the KEYS are chess-style squareuare names
//     like "E4" or "A1", and the VALUES are piece objects like
//     {type:'pawn', color:'white', hasMoved:false}.
class ChessGame {
  constructor() {
    this.cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
    this.rows = [8, 7, 6, 5, 4, 3, 2, 1];

    this.unicode = {
      // Unicode chess-piece font/size via CSS.
      pawn: { white: "♙", black: "♟" },
      knight: { white: "♘", black: "♞" },
      bishop: { white: "♗", black: "♝" },
      rook: { white: "♖", black: "♜" },
      queen: { white: "♕", black: "♛" },
      king: { white: "♔", black: "♚" },
    };

    this.value = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
    this.promotion = null;
    this.enPassant = null;

    this.init(); // makes new game and initializes click listeners
  }

  init() {
    // Reset
    this.board = {}; // board only
    this.history = []; // list of moves
    this.snapshot = []; // snapshots after each move
    this.captured = { white: [], black: [] };
    this.currentTurn = "white";
    this.enPassant = null;

    this.takeSnapshot(); // Takes a snapshot you can undo
    this.createBoard(); // Build the 64 empty <div> squareuares
    this.resetPieces(); // fill this.board with the starting position
    this.drawPieces(); // draw pieces onto the squareuares we just built
    this.bindEvents(); // wire up all the buttons/board clicks
    this.updateTurn();
    this.updateScores();
  }

  takeSnapshot() {
    // takeSnapshot() / deleteSnapshot() together implement Undo.
    this.snapshot.push({
      board: JSON.parse(JSON.stringify(this.board)), // JSON.parse(JSON.stringify(x)) is a common way to
      history: JSON.parse(JSON.stringify(this.history)), // deep-clone a plain object/array in JavaScript.
      captured: JSON.parse(JSON.stringify(this.captured)),
      currentTurn: this.currentTurn,
      enPassant: this.enPassant ? { ...this.enPassant } : null, // enPassant is either null or a small object;
    }); // {...this.enPassant} makes a shallow copy of it (spreading null
    // would throw, hence the ternary).
  }
  deleteSnapshot() {
    if (this.snapshot.length < 2) return; // We keep at least one snapshot
    this.snapshot.pop(); // To undo, we throw one away
    const prev = this.snapshot.pop(); //and look at the new last entry
    this.board = prev.board;
    this.history = prev.history;
    this.captured = prev.captured;
    this.currentTurn = prev.currentTurn;
    this.enPassant = prev.enPassant;

    this.drawPieces();
    this.updateTurn();
    this.updateScores();
  }

  // Utilities
  showToast(msg, type = "") {
    const wrap = document.getElementById("toast-alert"); // This is the div in index.html that all the
    const div = document.createElement("div"); // individual toast messages get appended into.
    div.className = `toast ${type}`;
    div.textContent = msg;
    wrap.appendChild(div);
    setTimeout(() => div.remove(), 3000); // Auto-remove this particular toast after 3 seconds
  }

  // Board
  createBoard() {
    const boardEl = document.getElementById("chess-board");
    boardEl.innerHTML = ""; // clear board

    for (const r of this.rows) {
      for (const c of this.cols) {
        const cell = `${c}${r}`; // e.g. "E4"
        const square = document.createElement("div");
        const light = (this.cols.indexOf(c) + this.rows.indexOf(r)) % 2 === 0;
        square.className = `square ${light ? "light" : "dark"}`; // rows alt light/dark
        square.dataset.cell = cell;
        // cell is how we tag each square <div> with its chess
        // coordinate so later code can find "the square named E4"
        // via document.querySelector('.square[data-cell="E4"]'), and
        // so click handlers can read e.target.closest('.square')
        // .dataset.cell to find out which squareuare was clicked
        const note = document.createElement("div");
        note.className = "notation";
        note.textContent = cell;
        square.appendChild(note);
        boardEl.appendChild(square); // notation purely for decoration
      }
    }
  }
  resetPieces() {
    // fills the board with data not drawn pieces
    const back = [
      "rook",
      "knight",
      "bishop",
      "queen",
      "king",
      "bishop",
      "knight",
      "rook",
    ];
    for (let i = 0; i < 8; i++) {
      const f = this.cols[i];
      this.board[`${f}2`] = { type: "pawn", color: "white", hasMoved: false };
      this.board[`${f}7`] = { type: "pawn", color: "black", hasMoved: false };
      this.board[`${f}1`] = { type: back[i], color: "white", hasMoved: false };
      this.board[`${f}8`] = { type: back[i], color: "black", hasMoved: false };
    } // read piece type out of index
    // hasMoved:false info: castling requires that neither the king nor the
    //  rook has ever moved and a pawn's very first move is allowed to be
    // two squareuares instead of one
  }
  // drawPieces() is the "redraw everything from the data" step
  drawPieces() {
    document.querySelectorAll(".square").forEach((square) => {
      square.innerHTML = "";
      const note = document.createElement("div");
      note.className = "notation";
      note.textContent = square.dataset.cell;
      square.appendChild(note);
    }); // Step 1: clear every square

    for (const cell in this.board) {
      const p = this.board[cell];
      const square = document.querySelector(`.square[data-cell="${cell}"]`);
      if (!square) continue;
      const el = document.createElement("div");
      el.className = "piece";
      el.textContent = this.unicode[p.type][p.color];
      // Step 2: for every square that currently has a piece on it
      // (`for...in` over the this.board object visits each of its keys,
      // i.e. each occupied cell name), find the matching squareuare <div>
      // and add a piece <div> showing the right glyph.
      el.dataset.cell = cell;
      el.dataset.type = p.type;
      el.dataset.color = p.color;
      square.appendChild(el);
    }
    ["white", "black"].forEach((color) => {
      // #captured-white / #captured-black in HTML
      const row = document.getElementById(`captured-${color}`);
      row.innerHTML = "";
      this.captured[color].forEach((p) => {
        const el = document.createElement("div");
        el.className = "captured-piece";
        el.textContent = this.unicode[p.type][p.color];
        row.appendChild(el);
      }); // Step 3: redraw the two "captured pieces" rows below the side of the board.
    });
  }

  // Events
  bindEvents() {
    document
      .getElementById("chess-board")
      .addEventListener("click", (e) => this.onBoardClick(e));

    document
      .getElementById("undo-btn")
      .addEventListener("click", () => this.undo());
    // Clicking anywhere on the board delegates to onBoardClick, which
    // figures out which square was actually clicked (see the
    // `.closest('.square')` call in there).
    document
      .getElementById("reset-btn")
      .addEventListener("click", () => window.location.reload());

    document
      .getElementById("history-btn")
      .addEventListener("click", () => this.showHistory());

    document
      .getElementById("castle-kingside-btn")
      .addEventListener("click", () => this.castleSide("king"));

    document
      .getElementById("castle-queenside-btn")
      .addEventListener("click", () => this.castleSide("queen"));
    // Reset just reloads the whole page rather than trying to reset in-place
    document.getElementById("history-span").addEventListener("click", () => {
      // The "x" that closes the Move History popup
      document.getElementById("history-id").style.display = "none";
    });
    document.getElementById("result-span").addEventListener("click", () => {
      document.getElementById("result-id").style.display = "none";
      this.init();
    }); // The "x" that closes the "you won/lost" checkmate popup.
  }

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
      if (p.color !== color && this.possibleMoves(cell).includes(king))
        return true;
    }
    return false;
  }
  // possibleMoves(from) returns every square a piece COULD move to
  // according to how that piece type moves and what's currently
  // occupying nearby squares
  possibleMoves(from) {
    const p = this.board[from];
    if (!p) return []; // no piece on that square -> no moves
    const f = from.charCodeAt(0); // file as a character code, e.g. 'E' -> 69
    const r = +from[1]; // rank as a number, e.g. "4" -> 4 (the `+` converts string to number)
    //this.possibleMoves(cell).filter(d => !this.ifMove(cell, d))
    // i.e. "take all the pseudo-moves, then filter OUT any that would
    // leave me in check
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

  // ifMove(from, to): if I made this move, would MY OWN king end up in check? -- which is exactly the rule
  //. It works by actually performing the move on the real this.board, and then immediately undoing the move so the board is
  // left exactly as it was. Because this happens fully synchronously the
  // brief moment where the board is "wrong" is never visible
  // Every call site uses this the same way:
  // someMoves.filter(d => !this.ifMove(from, d))
  // "keep only the destinations where simulating the move does NOT
  // result in check".
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
    // If this would be an en passant capture, the piece actually
    // being captured is NOT on the destination square `to` -- it's
    // on a different square. We need to remove it too so it sees
    // an accurate board, and we need to remember what/where it was
    // so we can put it back afterward.

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

  // Click Handling
  // ---------------------------------------------------------------
  // onBoardClick(e) is the single click handler for the entire board
  // (attached once, in bindEvents(), we listen once on
  // their shared parent and figure out which square was actually
  // clicked from the event.
  //
  // It implements a simple two-click move flow:
  //   1st click on one of your own pieces -> select it, highlight its
  //   legal destinations.
  //   2nd click on a highlighted destination -> make the move.
  //   2nd click anywhere else -> treated as an invalid move attempt
  onBoardClick(e) {
    // e.target is whatever exact element was clicked (could be the
    // square itself, or the piece <div>, or the notation label inside
    // it) -- .closest('.square') walks back up to find the actual
    // square element regardless of which of its children got clicked.
    const square = e.target.closest(".square");
    if (!square) return; // click landed somewhere that isn't part of a squareuare at all
    const cell = square.dataset.cell;
    // Is there already a piece selected from a previous click? (CSS
    // class 'selected' is added/removed below and in bindEvents'
    // reset logic.)
    const sel = document.querySelector(".selected");

    if (sel) {
      // --- This is the SECOND click: attempt to move to `cell` ---
      const from = sel.dataset.cell;
      // Recompute legal moves for the selected piece
      const legal = this.possibleMoves(from).filter(
        (d) => !this.ifMove(from, d),
      );

      if (legal.includes(cell)) this.makeMove(from, cell);
      else this.showToast("Invalid move!", "error");

      // Whether the move succeeded clear all the visual
      // selection/highlight state
      document
        .querySelectorAll(".selected,.move-highlight,.capture-highlight")
        .forEach((el) =>
          el.classList.remove(
            "selected",
            "move-highlight",
            "capture-highlight",
          ),
        );
      return;
    }

    // --- This is the FIRST click: try to select a piece ---
    const piece = this.board[cell];
    // Only allow selecting a piece that belongs to whoever's turn it
    // currently is.
    if (piece && piece.color === this.currentTurn) {
      square.classList.add("selected");
      // Highlight every legal destination for this piece: a
      // 'capture-highlight' if an enemy piece is sitting there, or a
      // plain 'move-highlight' otherwise. purly visible
      this.possibleMoves(cell)
        .filter((d) => !this.ifMove(cell, d))
        .forEach((d) => {
          const tgt = document.querySelector(`.square[data-cell="${d}"]`);
          tgt.classList.add(
            this.board[d] ? "capture-highlight" : "move-highlight",
          );
        });

      // Warn the player if selecting this piece reveals they're
      // currently in check
      if (this.inCheck(this.currentTurn))
        this.showToast("Be careful, you are in check!", "warning");
    }
  }

  // makeMove(from, to) actually performs a move. This is where the
  // board data gets permanently updated
  makeMove(from, to) {
    const moving = this.board[from];
    let target = this.board[to]; // piece being captured normally, if any
    let enPassantCell = null; // set only if this turns out to be an en passant capture

    // Detect an en passant capture: moving pawn, destination square is
    // empty and `to` matches the currently-available en passant
    // target square. If so, the piece actually being captured is on
    // this.enPassant.capture.
    if (
      moving.type === "pawn" &&
      !target &&
      this.enPassant &&
      this.enPassant.target === to
    ) {
      enPassantCell = this.enPassant.capture;
      target = this.board[enPassantCell];
    }

    if (target) {
      // Record the capture then remove the captured piece from the board.
      // enPassantCell || to means: remove it from enPassantCell if this was an en passant
      // capture, otherwise from the normal destination square `to`.
      this.captured[target.color].push(target);
      delete this.board[enPassantCell || to];
      this.showToast(`Captured ${target.type}!`, "capture");
    }

    delete this.board[from];
    // Any previous en passant opportunity expires the instant another
    // move happens -- it's only available on the very next move
    // immediately after the qualifying two-square pawn advance.
    this.enPassant = null;

    // If THIS move is a pawn advancing two squares, set up a fresh en
    // passant opportunity for the opponent's next move: `target` is
    // the square directly behind the pawn (the one it "skipped over"),
    // and `capture` is the square the pawn actually landed on (where
    // it would need to be removed from if captured en passant).
    if (moving.type === "pawn" && Math.abs(+from[1] - +to[1]) === 2) {
      const midRank = (+from[1] + +to[1]) / 2;
      this.enPassant = { target: from[0] + midRank, capture: to };
    }

    // Pawn promotion: if a pawn reaches the far rank (rank 8 for
    // White, rank 1 for Black), the move isn't finished yet -- we
    // place the pawn on the destination square for now, remember that
    // a promotion choice is pending, show the promotion popup, and
    // return EARLY (finishMove() is not called yet; it'll be called
    // from promotePawn() once the player picks a piece).
    if (moving.type === "pawn" && (to[1] === "8" || to[1] === "1")) {
      this.board[to] = { ...moving, hasMoved: true };
      this.promotion = { cell: to, color: moving.color };
      this.promptPromotion();
      return;
    }

    // Normal (non-promotion) move: place the piece and immediately
    // finish the move (switch turns, re-drawPieces, check for check/
    // checkmate, etc).
    this.board[to] = { ...moving, hasMoved: true };
    this.finishMove(from, to, moving, target);
  }

  // Promotion
  // ---------------------------------------------------------------
  // promptPromotion() shows the "choose a piece to promote to" popup
  // once a pawn has reached the far rank (see makeMove() above). It
  // builds one clickable option per available piece type.
  promptPromotion() {
    const modal = document.getElementById("promotion-id");
    const options = document.getElementById("promotion-choice");
    options.innerHTML = ""; // clear any leftover options from a previous promotion

    const { color } = this.promotion;
    // Nice touch: offer to promote into any piece TYPE this color has
    // already had captured from them (using a Set to de-duplicate, so
    // e.g. losing 3 pawns doesn't offer "pawn" three times) -- this
    // loosely reflects "you can get one of your lost pieces back".
    // If nothing has been captured from this color yet, fall back to
    // the traditional full promotion choice of queen/rook/bishop/
    // knight (note: NOT pawn or king, which a pawn is never allowed to
    // promote into, regardless of this fallback list or what's been
    // captured).
    const pool = this.captured[color];
    let types = [...new Set(pool.map((p) => p.type))];
    if (!types.length) types = ["queen", "rook", "bishop", "knight"];

    types.forEach((type) => {
      const btn = document.createElement("div");
      btn.className = "promotion-option";
      btn.textContent = this.unicode[type][color];
      btn.title = type.charAt(0).toUpperCase() + type.slice(1); // e.g. "Queen" tooltip
      btn.addEventListener("click", () => this.promotePawn(type));
      options.appendChild(btn);
    });

    modal.style.display = "flex";
  }

  // promotePawn(type) runs once the player has clicked one of the
  // promotion options built above. It finalizes the promotion and
  // then hands off to finishMove() to complete the turn (switch
  // players, re-drawPieces, check/checkmate detection) -- the same
  // finishMove() that a normal, non-promotion move calls directly
  // from makeMove().
  promotePawn(type) {
    const { cell, color } = this.promotion;

    // If this promotion is "reclaiming" a piece from the captured
    // pool (see the comment in promptPromotion above), remove one
    // instance of that type from the captured list -- it's being put
    // back into play, so it shouldn't still count as captured.
    const idx = this.captured[color].findIndex((p) => p.type === type);
    if (idx !== -1) this.captured[color].splice(idx, 1);

    // Replace the pawn sitting on `cell` with a brand new piece of
    // the chosen type.
    this.board[cell] = { type, color, hasMoved: true };
    this.promotion = null;
    // The promotion popup's div is id="promotion-id" in index.html.
    document.getElementById("promotion-id").style.display = "none";

    // Note `from` and `to` are both `cell` here -- the pawn didn't
    // move again, it was just replaced in place, so there's no
    // "movement" left for finishMove()'s history entry to describe
    // beyond the promoted piece's final square.
    this.finishMove(cell, cell, this.board[cell]);
  }

  // Check or Checkmate
  // finishMove() is the shared "wrap up a move" step, called from
  // three places: makeMove() (normal moves), promotePawn() (after a
  // promotion choice) It's responsible for: recording the move in history, switching
  // whose turn it is, re-drawPiecesing, and then figuring out whether the
  // player who's now "up" is in check or fully checkmated.
  finishMove(from, to, piece, capturedPiece = null) {
    // Add a row to the move history log (shown later in the "Move
    // History" popup
    this.history.push({
      player: this.currentTurn,
      piece: piece.type,
      from,
      to,
      capture: !!capturedPiece,
      capturedPiece: capturedPiece ? capturedPiece.type : "",
    });

    // Hand the turn over to the other player.
    this.currentTurn = this.currentTurn === "white" ? "black" : "white";

    this.takeSnapshot(); // snapshot for Undo
    this.drawPieces();
    this.updateTurn();
    this.updateScores();

    // From here on, "this.currentTurn" refers to whoever is about to
    // move NEXT (i.e. the player on the receiving end of the move that
    // just happened) -- so these checks are effectively "did the move
    // I just made put my opponent in check/checkmate?".
    if (this.inCheck(this.currentTurn)) this.showToast("Check!", "warning");

    // Does the player now on turn have ANY legal move at
    // all, anywhere on the board? This walks every occupied square,
    // skips anything not belonging to the current player, and for the
    // rest checks whether it has at least one destination that
    // doesn't leave its own king in check
    const anyLegal = Object.keys(this.board).some((cell) => {
      const p = this.board[cell];
      if (p.color !== this.currentTurn) return false;
      return (
        this.possibleMoves(cell).filter((d) => !this.ifMove(cell, d)).length > 0
      );
    });

    // Checkmate = in check AND no legal moves exist to escape it.
    if (this.inCheck(this.currentTurn) && !anyLegal) {
      document.getElementById("result-text").textContent =
        `${this.currentTurn === "white" ? "Black" : "White"} wins by Check Mate!`;
      document.getElementById("result-id").style.display = "flex";
    }
  }

  // Castling
  // castleSide(side) handles the special castling move, where the
  // king and a rook move simultaneously. This is triggered directly by
  // its own dedicated buttons
  //
  // This implementation checks that the king and rook haven't
  // moved yet, and that the squares between them are empty
  castleSide(side) {
    const isWhite = this.currentTurn === "white";
    const rank = isWhite ? "1" : "8"; // White castles along rank 1, Black along rank 8
    const kingFrom = "E" + rank; // the king always starts on the E file
    // Kingside castling uses the rook on the H file (moving to F);
    // queenside uses the rook on the A file (moving to D).
    const rookFrom = side === "king" ? "H" + rank : "A" + rank;
    const kingTo = side === "king" ? "G" + rank : "C" + rank;
    const rookTo = side === "king" ? "F" + rank : "D" + rank;
    // The squares that must be completely empty for castling to be
    // allowed (between the king's start and the rook, excluding the
    // king/rook squares themselves). Queenside has one extra square
    // (B-file) to check since the queenside rook starts further away.
    const path =
      side === "king"
        ? ["F" + rank, "G" + rank]
        : ["D" + rank, "C" + rank, "B" + rank];

    // Guard clauses: bail out with an error toast (and don't touch the
    // board at all) if any castling requirement isn't met.
    if (!this.board[kingFrom] || this.board[kingFrom].hasMoved) {
      this.showToast("King cannot castle", "error");
      return;
    }
    if (!this.board[rookFrom] || this.board[rookFrom].hasMoved) {
      this.showToast("Rook cannot castle", "error");
      return;
    }
    if (path.some((square) => this.board[square])) {
      this.showToast("Pieces in path", "error");
      return;
    }

    // All checks passed: move both the king and the rook at once.
    const kingPiece = this.board[kingFrom];
    const rookPiece = this.board[rookFrom];
    delete this.board[kingFrom];
    delete this.board[rookFrom];
    this.board[kingTo] = { ...kingPiece, hasMoved: true };
    this.board[rookTo] = { ...rookPiece, hasMoved: true };

    this.showToast(`Castled ${side}-side`, "capture");
    // Record this as a single history entry describing the king's
    // movement
    this.history.push({
      player: this.currentTurn,
      piece: "king",
      from: kingFrom,
      to: kingTo,
      capture: false,
      capturedPiece: "",
      castled: side,
    });
    // This duplicates the turn-switching / re-drawPieces / update parts of
    // finishMove() inline, rather than calling finishMove() itself --
    this.currentTurn = isWhite ? "black" : "white";
    this.takeSnapshot();
    this.drawPieces();
    this.updateTurn();
    this.updateScores();
  } // What undo button calls

  undo() {
    this.deleteSnapshot();
  }

  showHistory() {
    const tbody = document.getElementById("history-body");
    // Fills in the move history table using then reveals the popup.
    tbody.innerHTML = this.history
      .map(
        (m, i) => `
        <tr>
          <td>${i + 1}</td><td>${m.player}</td><td>${m.piece}</td>
          <td>${m.from}</td><td>${m.to}</td>
          <td>${m.capture ? "Yes" : ""}</td><td>${m.capturedPiece || ""}</td>
        </tr>`,
      )
      .join("");
    document.getElementById("history-id").style.display = "flex";
  } // This code builds one big HTML string of <tr> rows (one
  // per move) and sets it as the table body's contents

  updateTurn() {
    let txt = `Turn: ${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)}`;
    if (this.inCheck(this.currentTurn)) txt += " (Check Mate!)";
    document.getElementById("turn-indicator").textContent = txt;
  } // Refreshes the Turn text above the board, appending Check Mate if user is in check

  updateScores() {
    const sum = (arr) => arr.reduce((s, p) => s + this.value[p.type], 0);
    document.getElementById("white-score").textContent = sum(
      this.captured.white,
    );
    document.getElementById("black-score").textContent = sum(
      this.captured.black,
    ); // Recompues each side's total pieces using valueMap. The calculation is White's capured pieces,
    // which also sums up Black's total
  }
}
// Starting Event Listener
window.addEventListener("DOMContentLoaded", () => new ChessGame());
