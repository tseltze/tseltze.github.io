const BOT_SEARCH_MAX_DEPTH = 6;
const MAX_QUIESCENCE_DEPTH = 6;

// point tables per piece
const PIECE_SQUARE_TABLES = {
  pawn: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  knight: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  bishop: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  rook: [
    [0, 0, 0, 5, 5, 0, 0, 0],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  queen: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  king: [
    [20, 30, 10, 0, 0, 10, 30, 20],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
  ],
  kingEndgame: [
    [-50, -30, -30, -30, -30, -30, -30, -50],
    [-30, -30, 0, 0, 0, 0, -30, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -20, -10, 0, 0, -10, -20, -30],
    [-50, -40, -30, -20, -20, -30, -40, -50],
  ],
};

const DIFFICULTY_PRESETS = {
  easy: { depth: 2, timeBudgetMs: 150, randomnessMargin: 120 },
  medium: { depth: 3, timeBudgetMs: 400, randomnessMargin: 45 },
  hard: { depth: 4, timeBudgetMs: 900, randomnessMargin: 15 },
};

// plays that are good for black at the start of a game
const OPENING_BOOK = {
  E2E4: [
    { from: "E7", to: "E5" },
    { from: "C7", to: "C5" },
    { from: "E7", to: "E6" },
  ],
  D2D4: [
    { from: "D7", to: "D5" },
    { from: "G8", to: "F6" },
  ],
  C2C4: [
    { from: "E7", to: "E5" },
    { from: "G8", to: "F6" },
  ],
  G1F3: [
    { from: "D7", to: "D5" },
    { from: "G8", to: "F6" },
  ],
};

class ChessGame extends ChessEngine {
  constructor() {
    super();

    this.unicode = {
      // Unicode chess-piece font/size via CSS.
      pawn: { white: "♙", black: "♟" },
      knight: { white: "♘", black: "♞" },
      bishop: { white: "♗", black: "♝" },
      rook: { white: "♖", black: "♜" },
      queen: { white: "♕", black: "♛" },
      king: { white: "♔", black: "♚" },
    };

    this.promotion = null;
    this.enPassant = null;

    this.humanColor = "white";
    this.aiColor = "black";
    this.aiThinking = false; // true while the computer's move is queued up but hasn't played yet
    this.aiTimeoutId = null; // setTimeout id for the pending computer move, so Undo can cancel it

    this.difficulty = "medium"; 

    this.init(); // makes new game and initializes click listeners
  }

  // =====================
  // SET DIFFICULTY
  // =====================
  setDifficulty(level) {
    this.difficulty = DIFFICULTY_PRESETS[level] ? level : "medium";
    this.showToast(`Difficulty set to ${this.difficulty}`, "");
  }

  // =====================
  // INITIALIZE / RESET GAME
  // =====================
  init() {
    // Reset
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }
    this.aiThinking = false;
    this.resetState();
    this.history = [];
    this.snapshot = [];
    this.captured = { white: [], black: [] };
    this.searchTT = new Map();

    this.createBoard(); // Build the 64 empty square buttons
    this.resetPieces(); // fill this.board with the starting position
    this.recordPosition();
    this.takeSnapshot();
    this.drawPieces(); // draw pieces onto the squares we just built
    this.bindEvents(); // wire up all the buttons/board clicks
    this.updateTurn();
    this.updateScores();
  }
  // =====================
  // BOARD CLICK HANDLING
  // =====================
  onBoardClick(e) {
    // Ignore clicks while it isn't the human's turn or while the computer is still "thinking" 
    if (this.currentTurn !== this.humanColor || this.aiThinking) return;

    // e.target is whatever exact element was clicked 
    const square = e.target.closest(".square");
    if (!square) return; // click landed somewhere that isn't part of a square at all
    const cell = square.dataset.cell;
    // Is there already a piece selected from a previous click? (CSS
    // class 'selected' is added/removed below and in bindEvents'
    // reset logic.)
    const sel = document.querySelector(".selected");

    if (sel) {
      // --- This is the SECOND click: attempt to move to `cell` ---
      const from = sel.dataset.cell;
      // Recompute legal moves for the selected piece
      const legal = this.legalMovesFrom(from);

      if (legal.includes(cell)) this.makeMove(from, cell);
      else this.showToast("Invalid move!", "error");

      // Whether the move succeeded clear all the visual
      // selection/highlight state
      document
        .querySelectorAll(".selected,.move-highlight,.capture-highlight")
        .forEach((el) => {
          el.classList.remove(
            "selected",
            "move-highlight",
            "capture-highlight",
          );
          el.setAttribute("aria-pressed", "false");
        });
      return;
    }

    // --- This is the FIRST click: try to select a piece ---
    const piece = this.board[cell];
    // Only allow selecting a piece that belongs to whoever's turn it
    // currently is.
    if (piece && piece.color === this.currentTurn) {
      square.classList.add("selected");
      square.setAttribute("aria-pressed", "true");
      // Highlight every legal destination for this piece: a
      // 'capture-highlight' if an enemy piece is sitting there, or a
      // plain 'move-highlight' otherwise. purely visible
      this.legalMovesFrom(cell).forEach((d) => {
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

  // =====================
  // MAKE MOVE
  // =====================
  makeMove(from, to) {
    const moving = this.board[from];
    let target = this.board[to]; // piece being captured normally, if any
    let enPassantCell = null; // set only if this turns out to be an en passant capture

    if (
      moving.type === "pawn" &&
      !target &&
      this.enPassant &&
      this.enPassant.target === to
    ) {
      enPassantCell = this.enPassant.capture;
      target = this.board[enPassantCell];
    }

    if (target && target.type === "king") {
      // Defensive fallback: if a king is ever actually captured anyway, end
      // the game immediately and cleanly rather than continuing to play
      // with a king missing from the board.
      delete this.board[from];
      this.board[to] = { ...moving, hasMoved: true };
      this.drawPieces();
      this.endGame(
        `${moving.color === "white" ? "White" : "Black"} wins by capturing the King!`,
      );
      return;
    }

    if (target) {
      // Record the capture then remove the captured piece from the board.
      this.captured[target.color].push(target);
      delete this.board[enPassantCell || to];
      this.showToast(`Captured ${target.type}!`, "capture");
    }

    delete this.board[from];
    this.enPassant = null;

    if (moving.type === "pawn" && Math.abs(+from[1] - +to[1]) === 2) {
      const midRank = (+from[1] + +to[1]) / 2;
      this.enPassant = { target: from[0] + midRank, capture: to };
    }

    if (moving.type === "pawn" && (to[1] === "8" || to[1] === "1")) {
      this.board[to] = { ...moving, hasMoved: true };
      this.promotion = {
        cell: to,
        from,
        to,
        color: moving.color,
        piece: moving,
        capturedPiece: target,
      };
      this.promptPromotion();
      return;
    }

    // Normal (non-promotion) move: place the piece and immediately
    // finish the move
    this.board[to] = { ...moving, hasMoved: true };
    this.finishMove(from, to, moving, target);
  }

  // =====================
  // PROMPT PROMOTION
  // =====================
  promptPromotion() {
    // The computer always promotes to a queen and should never show the
    // human-facing "choose a piece" popup for its own promotions.
    if (this.promotion.color === this.aiColor) {
      this.promotePawn("queen");
      return;
    }
    const modal = document.getElementById("promotion-id");
    const options = document.getElementById("promotion-choice");
    options.innerHTML = ""; // clear any leftover options from a previous promotion

    const { color } = this.promotion;
    const types = this.promotionOptions();

    types.forEach((type) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "promotion-option";
      btn.textContent = this.unicode[type][color];
      btn.title = type.charAt(0).toUpperCase() + type.slice(1); // e.g. "Queen" tooltip
      btn.setAttribute("aria-label", `Promote to ${type}`);
      btn.addEventListener("click", () => this.promotePawn(type));
      options.appendChild(btn);
    });

    modal.style.display = "flex";
    document.getElementById("chess-modal").setAttribute("inert", "");
    options.querySelector("button").focus();
  }

  // =====================
  // PROMOTE PAWN
  // =====================
  promotePawn(type) {
    const { cell, color, from, to, piece, capturedPiece } = this.promotion;

    // Replace the pawn sitting on `cell` with the selected promotion piece.
    this.board[cell] = this.promote(type, color);
    this.promotion = null;
    // The promotion popup's div is id="promotion-id" in index.html.
    document.getElementById("promotion-id").style.display = "none";
    document.getElementById("chess-modal").removeAttribute("inert");
    document.querySelector(`.square[data-cell="${to}"]`).focus();

    this.finishMove(from, to, piece, capturedPiece);
  }

  // =====================
  // CASTLING
  // =====================
  // This implementation checks that the king and rook haven't
  // moved yet, and that the squares between them are empty
  castleSide(side, isBotMove = false) {
    if (!isBotMove && this.currentTurn !== this.humanColor) {
      this.showToast("It's not your turn", "error");
      return;
    }
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
    // Castling never captures anything and never moves a pawn, so it
    // always just ticks the fifty-move-rule clock forward 
    this.halfMoveClock++;

    // This duplicates the turn-switching / re-drawPieces / update parts of
    // finishMove() inline, rather than calling finishMove() itself --
    this.currentTurn = isWhite ? "black" : "white";
    this.recordPosition();
    this.takeSnapshot();
    this.drawPieces();
    this.updateTurn();
    this.updateScores();

    this.checkGameEnd();
  } 

  // =====================
  // FINISH MOVE
  // =====================
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

    if (capturedPiece || piece.type === "pawn") this.halfMoveClock = 0;
    else this.halfMoveClock++;

    // Hand the turn over to the other player.
    this.currentTurn = this.currentTurn === "white" ? "black" : "white";
    this.recordPosition();

    this.takeSnapshot(); // snapshot for Undo
    this.drawPieces();
    this.updateTurn();
    this.updateScores();

    if (this.inCheck(this.currentTurn)) this.showToast("Check!", "warning");

    this.checkGameEnd();
  }

  // =====================
  // CHECK GAME END
  // =====================
  checkGameEnd() {
    const status = this.getGameStatus();

    if (status.type === "active" || status.type === "check") {
      if (this.currentTurn === this.aiColor) this.scheduleBotMove();
      return;
    }

    const messages = {
      stalemate: "Draw by Stalemate!",
      "insufficient-material": "Draw by Insufficient Material!",
      "fifty-move": "Draw by the Fifty-Move Rule!",
      "threefold-repetition": "Draw by Threefold Repetition!",
    };
    const message = status.type === "checkmate"
      ? `${status.winner === "white" ? "White" : "Black"} wins by Checkmate!`
      : messages[status.type];
    this.endGame(message);
  }

  // =====================
  // END GAME
  // =====================
  endGame(message) {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
      this.aiThinking = false;
    }
    document.getElementById("result-text").textContent = message;
    document.getElementById("result-id").style.display = "flex";
    document.getElementById("chess-modal").setAttribute("inert", "");
    document.getElementById("result-span").focus();
  }

  // =====================
  // UNDO
  // =====================
  undo() {
    // If the computer is mid-"think", cancel that first so it doesn't
    // fire off a move for a position that's about to disappear.
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
      this.aiThinking = false;
    }

    if (!this.deleteSnapshot()) return;

    // When the computer has already replied, also undo the human move so
    // control returns to the same side that initiated Undo.
    if (this.currentTurn === this.aiColor) this.deleteSnapshot();
    this.updateTurn();
  }

  // =====================
  // OPENING BOOK
  // =====================
  getOpeningBookMove() {
    if (this.history.length !== 1) return null; // only Black's very first move of the game
    const whiteFirstMove = this.history[0];
    const bookKey = whiteFirstMove.from + whiteFirstMove.to;
    const candidates = OPENING_BOOK[bookKey];
    if (!candidates || !candidates.length) return null;

    const legalMoves = this.generateMoves(this.aiColor);
    const playable = candidates
      .map((c) =>
        legalMoves.find((m) => !m.castle && m.from === c.from && m.to === c.to),
      )
      .filter(Boolean);
    if (!playable.length) return null;

    return playable[Math.floor(Math.random() * playable.length)];
  }

  // =====================
  // CHOOSE BOT MOVE
  // =====================
  chooseBotMove() {
    
    const bookMove = this.getOpeningBookMove();
    if (bookMove) return bookMove;

    this.searchTT = new Map();

    const moves = this.generateMoves(this.aiColor);
    if (!moves.length) return null;

    const preset =
      DIFFICULTY_PRESETS[this.difficulty] || DIFFICULTY_PRESETS.medium;
    const { depth: baseDepth, timeBudgetMs, randomnessMargin } = preset;

    const startTime = Date.now();
    let scored = this.searchRootMoves(moves, baseDepth, randomnessMargin);

    for (let depth = baseDepth + 1; depth <= BOT_SEARCH_MAX_DEPTH; depth++) {
    
      if (Date.now() - startTime > timeBudgetMs) break;
      scored = this.searchRootMoves(moves, depth, randomnessMargin);
    }
    const bestScore = scored[0].score;
    const nearBest = scored.filter(
      (s) => bestScore - s.score <= randomnessMargin,
    );
    return nearBest[Math.floor(Math.random() * nearBest.length)].move;
  }

  // =====================
  // SCHEDULE BOT MOVE
  // =====================
  scheduleBotMove() {
    this.aiThinking = true;
    this.updateTurn();
    const delay = 450 + Math.random() * 550; // ~0.45s - 1s
    this.aiTimeoutId = setTimeout(() => this.botMove(), delay);
  }

  // =====================
  // BOT MOVE
  // =====================
  // The actual "make the computer's move" step, run once the thinking
  botMove() {
    if (this.currentTurn !== this.aiColor) return; // safety net: something else (e.g. Undo) already changed whose turn it is

    const move = this.chooseBotMove();
    this.aiThinking = false;
    this.aiTimeoutId = null;

    if (!move) {
      
      this.showToast("No legal moves -- stalemate!", "warning");
      this.updateTurn();
      return;
    }

    if (move.castle) this.castleSide(move.castle, true);
    else this.makeMove(move.from, move.to);
  }

  // =============================================================
  // SEARCH ALGORITHM (negamax + quiescence search)
  // =============================================================
  negamax(depth, alpha, beta, color) {

    if (depth === 0) {
      return this.quiesce(alpha, beta, color, 0);
    }

    const ttKey = this.searchKey(color);
    const cached = this.searchTT.get(ttKey);
    if (cached && cached.depth >= depth) {
      if (cached.flag === "exact") return cached.score;
      if (cached.flag === "lower" && cached.score > alpha) alpha = cached.score;
      else if (cached.flag === "upper" && cached.score < beta)
        beta = cached.score;
      if (alpha >= beta) return cached.score;
    }
    const alphaOrig = alpha;

    const moves = this.generateMoves(color);
    if (!moves.length) {
      // No legal moves: either checkmate or stalemate
      return this.inCheck(color) ? -100000 : 0;
    }

    const opponent = color === "white" ? "black" : "white";
    let best = -Infinity;
    for (const move of moves) {
      // Castle moves are simulated/undone differently from ordinary
      // moves, so branch on move.castle here
      // the same way botMove() and chooseBotMove() do below.
      const info = move.castle
        ? this.applySearchCastle(color, move.castle)
        : this.applySearchMove(move);
      const score = -this.negamax(depth - 1, -beta, -alpha, opponent);
      if (move.castle) this.undoSearchCastle(info);
      else this.undoSearchMove(info);

      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break; // alpha-beta cutoff
    }

    // Record what was actually proven about this position before
    // returning, so a future search that reaches the same position can
    // skip re-deriving it (see the lookup above).
    let flag;
    if (best <= alphaOrig)
      flag = "upper"; 
    else if (best >= beta)
      flag = "lower"; 
    else flag = "exact"; 
    this.searchTT.set(ttKey, { score: best, depth, flag });

    return best;
  }

  // =====================
  // QUIESCENCE SEARCH
  // =====================
  quiesce(alpha, beta, color, qDepth) {
    const standPatRaw = this.evaluateBoard();
    const standPat = color === "white" ? standPatRaw : -standPatRaw;

    if (standPat >= beta) return beta; 
    if (standPat > alpha) alpha = standPat;

    // Safety valve: an extremely long forced sequence of captures could otherwise
    // recurse quite deep. Capping it keeps worst-case search time
    // bounded without materially affecting move quality.
    if (qDepth >= MAX_QUIESCENCE_DEPTH) return alpha;

    const captures = this.generateMoves(color, true); // true = capturesOnly
    const opponent = color === "white" ? "black" : "white";
    
    const DELTA_MARGIN = 200;
    for (const move of captures) {
      const victimValue = move.capturedType
        ? this.value[move.capturedType] * 100
        : 0;
      if (standPat + victimValue + DELTA_MARGIN < alpha) continue;

      // Castling can never be a capture, so captures-only move lists
      // never contain a castle entry -- always a plain applySearchMove.
      const info = this.applySearchMove(move);
      const score = -this.quiesce(-beta, -alpha, opponent, qDepth + 1);
      this.undoSearchMove(info);

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  // =====================
  // SEARCH ROOT MOVES
  // =====================
  searchRootMoves(moves, depth, margin) {
    let alphaBound = -Infinity;
    const scored = [];
    for (const move of moves) {
      const info = move.castle
        ? this.applySearchCastle(this.aiColor, move.castle)
        : this.applySearchMove(move);
      const score = -this.negamax(
        depth - 1,
        -Infinity,
        -alphaBound,
        this.humanColor,
      );
      if (move.castle) this.undoSearchCastle(info);
      else this.undoSearchMove(info);
      scored.push({ move, score });
      if (score > alphaBound) alphaBound = score - margin;
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  // =====================
  // EVALUATE BOARD
  // =====================
  evaluateBoard() {

    let nonPawnMaterial = 0;
    for (const cell in this.board) {
      const p = this.board[cell];
      if (p.type !== "king" && p.type !== "pawn")
        nonPawnMaterial += this.value[p.type];
    }
    const isEndgame = nonPawnMaterial <= 14; // roughly "both queens are gone, or most of the minor/major pieces have been traded off"

    let score = 0;
    let whiteBishops = 0;
    let blackBishops = 0;
    for (const cell in this.board) {
      const p = this.board[cell];
      const file = cell.charCodeAt(0) - 65; // 'A' -> 0 ... 'H' -> 7
      const rank = +cell[1]; // 1..8
      let value = this.value[p.type] * 100;

      value += this.getPST(p.type, p.color, file, rank, isEndgame);

      if (p.type === "pawn") {
        const advancement = p.color === "white" ? rank - 2 : 7 - rank;
        value += advancement * 6;
      }
      if (p.type === "bishop") {
        if (p.color === "white") whiteBishops++;
        else blackBishops++;
      }

      score += p.color === "white" ? value : -value;
    }

    const BISHOP_PAIR_BONUS = 30;
    if (whiteBishops >= 2) score += BISHOP_PAIR_BONUS;
    if (blackBishops >= 2) score -= BISHOP_PAIR_BONUS;

    return score;
  }

  // =====================
  // PIECE-SQUARE TABLE LOOKUP
  // =====================
  // getPST(type, color, file, rank, isEndgame): looks up one piece's
  // positional bonus/penalty out of PIECE_SQUARE_TABLES. The tables
  // above are all written from White's perspective (rank 1 = row 0).
  getPST(type, color, file, rank, isEndgame) {
    const table =
      type === "king"
        ? isEndgame
          ? PIECE_SQUARE_TABLES.kingEndgame
          : PIECE_SQUARE_TABLES.king
        : PIECE_SQUARE_TABLES[type];
    if (!table) return 0; // shouldn't happen -- every piece type has a table -- but never let a lookup miss crash evaluateBoard()
    const rankIndex = color === "white" ? rank - 1 : 8 - rank;
    return table[rankIndex][file];
  }
  // =====================
  // GENERATE MOVES
  // =====================
  generateMoves(color, capturesOnly = false) {
    const moves = [];
    for (const cell in this.board) {
      const p = this.board[cell];
      if (p.color !== color) continue;
   
      const pseudoMoves = this.possibleMoves(cell);
      const candidates = capturesOnly
        ? pseudoMoves.filter(
            (d) =>
              !!this.board[d] ||
              (p.type === "pawn" &&
                this.enPassant &&
                this.enPassant.target === d),
          )
        : pseudoMoves;
      candidates
        .filter((d) => !this.ifMove(cell, d))
        .forEach((d) => {
          const capturedPiece =
            this.board[d] ||
            (p.type === "pawn" && this.enPassant && this.enPassant.target === d
              ? this.board[this.enPassant.capture]
              : null);
          const isCapture = !!capturedPiece;
          // Remember what's actually being captured (if anything) so
          // moveOrderScore() below can rank "my pawn takes your queen"
          // far above "my queen takes your pawn" 
          moves.push({
            from: cell,
            to: d,
            isCapture,
            capturedType: capturedPiece ? capturedPiece.type : null,
            movingType: p.type,
          });
        });
    }
    if (!capturesOnly) {
      
      const rank = color === "white" ? "1" : "8";
      ["king", "queen"].forEach((side) => {
        if (this.canCastle(color, side)) {
          moves.push({
            from: "E" + rank,
            to: side === "king" ? "G" + rank : "C" + rank,
            isCapture: false,
            castle: side,
          });
        }
      });
    }
    moves.sort((a, b) => this.moveOrderScore(b) - this.moveOrderScore(a));
    return moves;
  }

  // =====================
  // MOVE ORDERING SCORE
  // =====================
  moveOrderScore(move) {
    if (move.castle) return 5; // castling is usually a solid move -- rank it above ordinary quiet moves, below any real capture
    if (!move.isCapture) return 0;
    const victimValue = move.capturedType ? this.value[move.capturedType] : 0;
    const attackerValue = move.movingType ? this.value[move.movingType] : 0;
    return 1000 + victimValue * 10 - attackerValue;
  }

  // =====================
  // APPLY SEARCH MOVE
  // =====================
  applySearchMove(move) {
    const moving = this.board[move.from];
    const normalCapture = this.board[move.to] || null;
    let epCell = null;
    let epPiece = null;

    if (
      moving.type === "pawn" &&
      !normalCapture &&
      this.enPassant &&
      this.enPassant.target === move.to
    ) {
      epCell = this.enPassant.capture;
      epPiece = this.board[epCell];
      delete this.board[epCell];
    }

    delete this.board[move.from];

    // The search always promotes to a queen
    const isPromotion =
      moving.type === "pawn" && (move.to[1] === "8" || move.to[1] === "1");
    const placed = isPromotion
      ? { type: "queen", color: moving.color, hasMoved: true }
      : { ...moving, hasMoved: true };
    this.board[move.to] = placed;

    const prevEnPassant = this.enPassant;
    this.enPassant = null;
    if (moving.type === "pawn" && Math.abs(+move.from[1] - +move.to[1]) === 2) {
      const midRank = (+move.from[1] + +move.to[1]) / 2;
      this.enPassant = { target: move.from[0] + midRank, capture: move.to };
    }

    return {
      from: move.from,
      to: move.to,
      moving,
      normalCapture,
      epCell,
      epPiece,
      prevEnPassant,
    };
  }

  // =====================
  // UNDO SEARCH MOVE
  // =====================
  undoSearchMove(info) {
    delete this.board[info.to];
    this.board[info.from] = info.moving;
    if (info.normalCapture) this.board[info.to] = info.normalCapture;
    if (info.epCell) this.board[info.epCell] = info.epPiece;
    this.enPassant = info.prevEnPassant;
  }

  // =====================
  // APPLY SEARCH CASTLE
  // =====================
  // they let the search "try out" a castle move (moving both the king and rook at once) and cleanly
  // put everything back afterwards, without touching this.history,
  // this.currentTurn, or anything else outside of the board itself.
  applySearchCastle(color, side) {
    const rank = color === "white" ? "1" : "8";
    const kingFrom = "E" + rank;
    const rookFrom = side === "king" ? "H" + rank : "A" + rank;
    const kingTo = side === "king" ? "G" + rank : "C" + rank;
    const rookTo = side === "king" ? "F" + rank : "D" + rank;
    const kingPiece = this.board[kingFrom];
    const rookPiece = this.board[rookFrom];
    delete this.board[kingFrom];
    delete this.board[rookFrom];
    this.board[kingTo] = { ...kingPiece, hasMoved: true };
    this.board[rookTo] = { ...rookPiece, hasMoved: true };
    const prevEnPassant = this.enPassant;
    this.enPassant = null;
    return {
      color,
      side,
      kingFrom,
      rookFrom,
      kingTo,
      rookTo,
      kingPiece,
      rookPiece,
      prevEnPassant,
    };
  }

  // =====================
  // UNDO SEARCH CASTLE
  // =====================
  undoSearchCastle(info) {
    delete this.board[info.kingTo];
    delete this.board[info.rookTo];
    this.board[info.kingFrom] = info.kingPiece;
    this.board[info.rookFrom] = info.rookPiece;
    this.enPassant = info.prevEnPassant;
  }

  // =====================
  // CREATE BOARD
  // =====================
  createBoard() {
    const boardEl = document.getElementById("chess-board");
    boardEl.innerHTML = ""; // clear board
    boardEl.setAttribute("aria-label", "Chess board");

    for (const r of this.rows) {
      for (const c of this.cols) {
        const cell = `${c}${r}`; // e.g. "E4"
        const square = document.createElement("button");
        square.type = "button";
        const light = (this.cols.indexOf(c) + this.rows.indexOf(r)) % 2 === 0;
        square.className = `square ${light ? "light" : "dark"}`; // rows alt light/dark
        square.dataset.cell = cell;
        square.setAttribute("aria-label", `${cell}: empty`);
        square.setAttribute("aria-pressed", "false");
        // cell is how we tag each square button with its chess
        // coordinate so later code can find "the square named E4"
        // via document.querySelector('.square[data-cell="E4"]'), and
        // so click handlers can read e.target.closest('.square')
        // .dataset.cell to find out which square was clicked
        const note = document.createElement("div");
        note.className = "notation";
        note.textContent = cell;
        square.appendChild(note);
        boardEl.appendChild(square); // notation purely for decoration
      }
    }
  }

  // =====================
  // RESET PIECES
  // =====================
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
    // two squares instead of one
  }

  // =====================
  // DRAW PIECES
  // =====================
  // drawPieces() is the "redraw everything from the data" step
  drawPieces() {
    document.querySelectorAll(".square").forEach((square) => {
      square.innerHTML = "";
      square.setAttribute("aria-label", `${square.dataset.cell}: empty`);
      square.setAttribute("aria-pressed", "false");
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
      // find the matching square and add a piece showing the right glyph.
      el.dataset.cell = cell;
      el.dataset.type = p.type;
      el.dataset.color = p.color;
      square.setAttribute("aria-label", `${cell}: ${p.color} ${p.type}`);
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

  // =====================
  // BIND EVENTS
  // =====================
  bindEvents() {
    document
      .getElementById("chess-board")
      .addEventListener("click", (e) => this.onBoardClick(e));

    document
      .getElementById("undo-btn")
      .addEventListener("click", () => this.undo());
    // Clicking anywhere on the board delegates to onBoardClick, which
    // figures out which square was actually clicked
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

    const difficultySelect = document.getElementById("difficulty-select");
    if (difficultySelect) {
      difficultySelect.value = this.difficulty;
      difficultySelect.addEventListener("change", (e) =>
        this.setDifficulty(e.target.value),
      );
    }
    // Reset just reloads the whole page rather than trying to reset in-place
    document.getElementById("history-span").addEventListener("click", () => {
      // The "x" that closes the Move History popup
      document.getElementById("history-id").style.display = "none";
      document.getElementById("chess-modal").removeAttribute("inert");
      document.getElementById("history-btn").focus();
    });
    document.getElementById("result-span").addEventListener("click", () => {
      document.getElementById("result-id").style.display = "none";
      document.getElementById("chess-modal").removeAttribute("inert");
      this.init();
      document.getElementById("chess-modal-id").focus();
    }); // The "x" that closes the "you won/lost" checkmate popup.
  }

  // =====================
  // SHOW TOAST
  // =====================
  // Utilities
  showToast(msg, type = "") {
    const wrap = document.getElementById("toast-alert"); // This is the div in index.html that all the
    const div = document.createElement("div"); // individual toast messages get appended into.
    div.className = `toast ${type}`;
    div.textContent = msg;
    wrap.appendChild(div);
    setTimeout(() => div.remove(), 3000); // Auto-remove this particular toast after 3 seconds
  }

  // =====================
  // TAKE SNAPSHOT
  // =====================
  takeSnapshot() {
    // takeSnapshot() / deleteSnapshot() together implement Undo.
    this.snapshot.push({
      ...this.exportState(),
      history: JSON.parse(JSON.stringify(this.history)),
      captured: JSON.parse(JSON.stringify(this.captured)),
    });
  }

  // =====================
  // DELETE SNAPSHOT (UNDO)
  // =====================
  deleteSnapshot() {
    if (this.snapshot.length < 2) return false;
    this.snapshot.pop();
    const prev = this.snapshot[this.snapshot.length - 1];
    this.restoreState(prev);
    this.history = prev.history;
    this.captured = prev.captured;

    this.drawPieces();
    this.updateTurn();
    this.updateScores();
    return true;
  }

  // =====================
  // SHOW HISTORY
  // =====================
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
    document.getElementById("chess-modal").setAttribute("inert", "");
    document.getElementById("history-span").focus();
  } // This code builds one big HTML string of <tr> rows (one
  // per move) and sets it as the table body's contents

  // =====================
  // UPDATE TURN INDICATOR
  // =====================
  updateTurn() {
    let txt = `Turn: ${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)}`;
    if (this.currentTurn === this.aiColor && this.aiThinking)
      txt += " (thinking...)";
    if (this.inCheck(this.currentTurn)) txt += " (Check!)";
    document.getElementById("turn-indicator").textContent = txt;
  } // Refreshes the turn text above the board, including check status

  // =====================
  // UPDATE SCORES
  // =====================
  updateScores() {
    const sum = (arr) => arr.reduce((s, p) => s + this.value[p.type], 0);
    document.getElementById("white-score").textContent = sum(
      this.captured.white,
    );
    document.getElementById("black-score").textContent = sum(
      this.captured.black,
    ); // Recomputes each side's total pieces using valueMap. The calculation is White's captured pieces,
    // which also sums up Black's total
  }
}
// Starting Event Listener
window.addEventListener("DOMContentLoaded", () => new ChessGame());
