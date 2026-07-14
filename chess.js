  // =====================================================================
  // CHESS.JS -- a small, self-contained chess game.
  //
  // Big picture, for anyone new to reading this file:
  //   - There is ONE class, ChessGame, that owns all the game's state and
  //     behavior. "State" means: where every piece is, whose turn it is,
  //     what's been captured, and the move history.
  //   - The board itself is NOT a 2D array (no board[row][col]). Instead
  //     it's a plain object where the KEYS are chess-style square names
  //     like "E4" or "A1", and the VALUES are piece objects like
  //     {type:'pawn', color:'white', hasMoved:false}. A square with no
  //     piece on it simply has no key in the object at all.
  //   - Every user interaction (clicking a square, clicking Undo, closing
  //     a popup) is wired up once, in bindEvents(), using
  //     document.getElementById(...) to grab the actual HTML elements
  //     from index.html. If an id here doesn't exactly match an id in
  //     index.html, getElementById returns null and the next line that
  //     tries to use it (e.g. `.style.display = ...`) throws an error --
  //     that's the exact class of bug we tracked down and fixed earlier.
  //   - "Rendering" (createBoard/render) is kept separate from "game
  //     logic" (makeMove, getPseudoMoves, isInCheck, etc). Logic updates
  //     the plain-object board; render() then throws away all the old
  //     square contents and redraws everything based on that object.
  //     This is a simple (if not the most efficient) pattern: always
  //     re-render the whole board from scratch instead of trying to
  //     patch individual squares.
  // =====================================================================
  class ChessGame {
    constructor () {
      // Column letters (files) left-to-right, and row numbers (ranks)
      // top-to-bottom as they'll be drawn on screen. Because rows starts
      // at 8 and counts down to 1, createBoard() below will naturally
      // draw the board with White's back rank (rank 1) at the bottom --
      // the traditional orientation.
      this.cols = ['A','B','C','D','E','F','G','H'];
      this.rows = [8,7,6,5,4,3,2,1];

      // Unicode chess glyphs to display for each piece type/color combo.
      // These are just characters (e.g. '♙' is "White Pawn" ♙),
      // no images involved -- the pieces are plain text rendered with a
      // chess-piece font/size via CSS.
      this.unicode = {
        pawn:{white:'♙',black:'♟'},
        knight:{white:'♘',black:'♞'},
        bishop:{white:'♗',black:'♝'},
        rook:{white:'♖',black:'♜'},
        queen:{white:'♕',black:'♛'},
        king:{white:'♔',black:'♚'}
      };

      // Point values used only for the on-screen "score" (captured
      // material), not for anything about legality of moves. The king
      // is 0 here because it's never actually captured -- the game ends
      // at checkmate instead (see finishMove()).
      this.valueMap = {pawn:1, knight:3, bishop:3, rook:5, queen:9, king:0};

      // pendingPromotion holds {cell, color} while we're waiting for the
      // player to choose what a pawn promotes into (queen/rook/etc).
      // It's null the rest of the time.
      this.pendingPromotion = null;
      // enPassant describes the one-move-only opportunity to capture a
      // pawn "en passant" right after it makes its initial two-square
      // advance. It's explained in more detail down in getPseudoMoves()
      // and makeMove().
      this.enPassant = null;

      // init() builds a fresh game: empty board, starting position,
      // first render, and all the click/button listeners. It's also
      // reused later to fully restart the game (see the "You win" popup
      // close handler in bindEvents()).
      this.init();
    }

    // Reset
    // ---------------------------------------------------------------
    // init() sets (or resets) every piece of game state, then does the
    // one-time work of drawing the board and wiring up event listeners.
    // Note bindEvents() runs again every time init() runs -- see the
    // note on bindEvents() itself about why that's normally something
    // to watch out for (duplicate listeners), and why it happens to be
    // safe here.
    init () {
      this.board   = {};       // no pieces yet -- resetPieces() fills this in below
      this.history = [];          // list of every move made, for the "Move History" popup
      this.boardHistory = [];     // snapshots of state after each move, used for Undo
      this.captured = {white:[],black:[]}; // pieces captured FROM each color
      this.currentTurn = 'white';          // white always moves first
      this.enPassant   = null;

      // pushState() takes a "before any moves" snapshot so Undo has
      // something to fall back to even after just one move.
      this.pushState();
      this.createBoard();   // build the 64 empty <div> squares
      this.resetPieces();   // fill this.board with the starting position
      this.render();        // draw pieces onto the squares we just built
      this.bindEvents();    // wire up all the buttons/board clicks
      this.updateTurnIndicator();
      this.updateScores();
    }

    // pushState() / popState() together implement Undo.
    //
    // The approach: instead of trying to cleverly "reverse" a move
    // (which gets complicated fast with captures, castling, en passant,
    // and promotion all needing their own separate undo logic), we just
    // take a full deep-copy SNAPSHOT of the entire game state after every
    // move and stash it in this.boardHistory. Undo then simply throws
    // away the most recent snapshot and restores the one before it.
    // This is simple to reason about at the cost of using more memory
    // than a "real" undo stack would -- perfectly fine for a casual
    // in-browser game like this.
    pushState () {
      this.boardHistory.push({
        // JSON.parse(JSON.stringify(x)) is a common quick-and-dirty way
        // to deep-clone a plain object/array in JavaScript. It works
        // here because everything in board/history/captured is simple
        // data (strings, booleans, nested plain objects) -- it would
        // NOT work if any of these contained functions, dates, or
        // circular references.
        board      : JSON.parse(JSON.stringify(this.board)),
        history    : JSON.parse(JSON.stringify(this.history)),
        captured   : JSON.parse(JSON.stringify(this.captured)),
        currentTurn: this.currentTurn,
        // enPassant is either null or a small {target, capture} object;
        // {...this.enPassant} makes a shallow copy of it (spreading null
        // would throw, hence the ternary).
        enPassant  : this.enPassant ? {...this.enPassant} : null
      });
    }
    popState () {
      // We keep at least one snapshot (the initial position) so the
      // very first Undo click doesn't empty the history entirely and
      // leave nothing to restore.
      if (this.boardHistory.length < 2) return;

      // The LAST snapshot in the array is "where we are right now"
      // (it was pushed right after the most recent move finished). To
      // undo, we throw that one away, then look at the new last entry,
      // which is the state as it was BEFORE that move.
      this.boardHistory.pop();
      const prev = this.boardHistory.pop();

      // Note: we .pop() prev out entirely rather than just "peeking" at
      // it, and then don't push it back. That's intentional here: the
      // very next move the player makes will call pushState() again
      // and re-add a snapshot for "prev" as the new current state, so
      // it isn't lost -- it's just temporarily not sitting in the array
      // while we're between moves.
      this.board       = prev.board;
      this.history     = prev.history;
      this.captured    = prev.captured;
      this.currentTurn = prev.currentTurn;
      this.enPassant   = prev.enPassant;

      this.render();
      this.updateTurnIndicator();
      this.updateScores();
    }

    // Utilities
    // ---------------------------------------------------------------
    // showToast() pops up one of those small temporary notification
    // banners (e.g. "Captured pawn!", "Check!", "Invalid move!") in the
    // corner of the screen. `type` controls its color/styling via CSS
    // (see the ".toast.error", ".toast.warning" etc. rules in chess.css).
    showToast (msg, type='') {
      // #toast-alert is the container div in index.html that all the
      // individual toast messages get appended into.
      const wrap = document.getElementById('toast-alert');
      const div  = document.createElement('div');
      div.className = `toast ${type}`;
      div.textContent = msg;
      wrap.appendChild(div);
      // Auto-remove this particular toast after 3 seconds. Multiple
      // toasts can be stacked/visible at once since each one manages
      // its own removal independently.
      setTimeout(() => div.remove(), 3000);
    }

    // Board
    // ---------------------------------------------------------------
    // createBoard() builds the 64 square <div> elements ONCE and lays
    // them out in the DOM. It does NOT place any pieces -- that's
    // render()'s job, called separately every time the position
    // changes. Splitting "build the grid" from "draw what's on it" like
    // this means render() can be called over and over (after every
    // move) without re-creating the whole grid from scratch each time.
    createBoard () {
      const boardEl = document.getElementById('chess-board');
      boardEl.innerHTML = ''; // clear out anything left over from a previous game

      // Because this.rows is [8,7,6,5,4,3,2,1] and this.cols is
      // [A,B,C,...H], this nested loop visits squares in the order
      // A8,B8,C8,...,H8, A7,B7,...,H1 -- i.e. row-by-row, left to right,
      // starting from the top of the board (Black's side) and ending at
      // the bottom (White's side). That's also the order the squares end
      // up in the DOM, which combined with the CSS grid layout is what
      // makes the board visually appear the "right way up".
      for (const r of this.rows) {
        for (const c of this.cols) {
          const cell = `${c}${r}`; // e.g. "E4"
          const sq = document.createElement('div');

          // Standard chessboard coloring: a square is "light" if the
          // sum of its column-index and row-index is even. Flipping
          // between the two colors as you move across (or down) the
          // board produces the familiar checkerboard pattern.
          const light = (this.cols.indexOf(c) + this.rows.indexOf(r)) % 2 === 0;
          sq.className = `square ${light ? 'light' : 'dark'}`;

          // data-cell is how we tag each square <div> with its chess
          // coordinate so later code can find "the square named E4"
          // via document.querySelector('.square[data-cell="E4"]'), and
          // so click handlers can read e.target.closest('.square')
          // .dataset.cell to find out which square was clicked.
          sq.dataset.cell = cell;

          // A small text label (e.g. "E4") shown in the corner of the
          // square, purely cosmetic/for orientation -- not used by any
          // game logic.
          const note = document.createElement('div');
          note.className = 'notation';
          note.textContent = cell;
          sq.appendChild(note);

          boardEl.appendChild(sq);
        }
      }
    }

    // resetPieces() fills this.board with the standard chess starting
    // position. It only touches the DATA (this.board); nothing gets
    // drawn on screen until render() runs afterward (init() calls both,
    // in that order).
    resetPieces () {
      // Standard back-rank piece order, left to right.
      const back = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
      for (let i = 0; i < 8; i++) {
        const f = this.cols[i]; // the file/column letter for this iteration, e.g. 'A'
        // Pawns on rank 2 (white) and rank 7 (black)...
        this.board[`${f}2`] = {type:'pawn',  color:'white',hasMoved:false};
        this.board[`${f}7`] = {type:'pawn',  color:'black',hasMoved:false};
        // ...and the back-rank pieces on rank 1 (white) and rank 8 (black),
        // reading the piece type out of `back` by column index so, e.g.,
        // column A (i=0) gets a rook on both A1 and A8.
        this.board[`${f}1`] = {type:back[i], color:'white',hasMoved:false};
        this.board[`${f}8`] = {type:back[i], color:'black',hasMoved:false};
      }
      // hasMoved:false on every piece matters later: castling requires
      // that neither the king nor the chosen rook has ever moved (see
      // castleSide()), and a pawn's very first move is allowed to be
      // two squares instead of one (see getPseudoMoves()'s pawn case).
    }

    // Render
    // ---------------------------------------------------------------
    // render() is the "redraw everything from the data" step. It always
    // runs after any change to this.board (a move, an undo, a reset) so
    // the screen stays in sync with the underlying game state. It does
    // this the simple way: wipe every square's contents, then walk
    // this.board and re-add a piece <div> wherever one exists.
    render () {
      // Step 1: clear every square back down to just its little corner
      // notation label (e.g. "E4"), removing any piece that was drawn
      // there before.
      document.querySelectorAll('.square').forEach(sq => {
        sq.innerHTML = '';
        const note = document.createElement('div');
        note.className = 'notation';
        note.textContent = sq.dataset.cell;
        sq.appendChild(note);
      });

      // Step 2: for every square that currently has a piece on it
      // (`for...in` over the this.board object visits each of its keys,
      // i.e. each occupied cell name), find the matching square <div>
      // and add a piece <div> showing the right glyph.
      for (const cell in this.board) {
        const p  = this.board[cell];
        const sq = document.querySelector(`.square[data-cell="${cell}"]`);
        if (!sq) continue; // defensive: skip if somehow no matching square exists

        const el = document.createElement('div');
        el.className = 'piece';
        el.textContent = this.unicode[p.type][p.color];
        // These data-* attributes aren't read anywhere else in this
        // file currently, but they make each piece element
        // self-describing, which is handy for CSS hooks or future
        // features (and for debugging in the browser dev tools).
        el.dataset.cell  = cell;
        el.dataset.type  = p.type;
        el.dataset.color = p.color;
        sq.appendChild(el);
      }

      // Step 3: redraw the two "captured pieces" rows (one for pieces
      // captured from White, one for pieces captured from Black) below
      // each side of the board.
      ['white','black'].forEach(color => {
        // #captured-white / #captured-black in index.html.
        const row = document.getElementById(`captured-${color}`);
        row.innerHTML = '';
        this.captured[color].forEach(p => {
          const el = document.createElement('div');
          el.className = 'captured-piece';
          el.textContent = this.unicode[p.type][p.color];
          row.appendChild(el);
        });
      });
    }

    // Events
    // ---------------------------------------------------------------
    // bindEvents() connects every clickable thing in the chess popup to
    // its behavior. It's called once from init(). Because init() is
    // ALSO called again later to fully restart the game (see the
    // "result-span" close handler below, which calls this.init() after
    // hiding the checkmate popup), bindEvents() technically runs more
    // than once over the page's lifetime.
    //
    // Normally re-running a bunch of addEventListener() calls on the
    // SAME elements would stack up duplicate listeners (e.g. clicking
    // Undo would fire the undo logic twice, three times, etc. after
    // enough restarts). That doesn't bite us here because
    // createBoard() throws away and rebuilds the actual <div> elements
    // for the squares each time (getElementById('chess-board').innerHTML
    // = ''), and the buttons (#undo-btn, #reset-btn, etc.) live OUTSIDE
    // anything createBoard() touches -- so in practice, as currently
    // wired, a full page reload happens instead (see #reset-btn below)
    // any time init() would otherwise run twice in a way that mattered.
    // It's still a subtle spot worth knowing about if this file gets
    // extended later.
    bindEvents () {
      // Clicking anywhere on the board delegates to onBoardClick, which
      // figures out which square was actually clicked (see the
      // `.closest('.square')` call in there).
      document.getElementById('chess-board')
              .addEventListener('click', e => this.onBoardClick(e));

      document.getElementById('undo-btn')
              .addEventListener('click', () => this.undo());

      // Reset just reloads the whole page rather than trying to reset
      // in-place -- simple and guaranteed to leave everything (DOM,
      // listeners, state) completely fresh.
      document.getElementById('reset-btn')
              .addEventListener('click', () => window.location.reload());

      document.getElementById('history-btn')
              .addEventListener('click', () => this.showHistory());

      document.getElementById('castle-kingside-btn')
              .addEventListener('click', () => this.castleSide('king'));

      document.getElementById('castle-queenside-btn')
              .addEventListener('click', () => this.castleSide('queen'));

      // The little "x" that closes the Move History popup.
      document.getElementById('history-span')
              .addEventListener('click', () => {
                // The History popup's div is id="history-id" in index.html,
                // not "history" -- getElementById has to use the exact id string.
                document.getElementById('history-id').style.display = 'none';
              });

      // The little "x" that closes the "you won/lost" checkmate popup.
      // Closing this one also fully restarts the game via this.init(),
      // since the game is over at this point and there's nothing else
      // useful to do with the board underneath the popup.
      document.getElementById('result-span')
              .addEventListener('click', () => {
                // Same idea: the win/checkmate popup's div is id="result-id".
                document.getElementById('result-id').style.display = 'none';
                this.init();
              });
    }

    // isInCheck(color) answers: "is the given color's king currently
    // under attack?" It's used both to warn the player mid-game ("You
    // are in check!") and, combined with anyLegal in finishMove(), to
    // detect checkmate.
    isInCheck (color) {
      /* find king */
      // Scan every occupied square looking for this color's king. There's
      // exactly one, so we can stop as soon as we find it.
      let king = '';
      for (const cell in this.board) {
        const p = this.board[cell];
        if (p.type === 'king' && p.color === color) { king = cell; break; }
      }
      /* any opposing pseudo move attack? */
      // A color is "in check" if ANY enemy piece has a pseudo-legal
      // move that lands on the king's square. Note this deliberately
      // uses getPseudoMoves (raw movement rules) rather than fully
      // "legal" moves -- see the comment on getPseudoMoves for why that
      // distinction matters and how simulateMove() layers the "does
      // this leave my own king in check" rule on top separately.
      for (const cell in this.board) {
        const p = this.board[cell];
        if (p.color !== color && this.getPseudoMoves(cell).includes(king))
          return true;
      }
      return false;
    }

    // getPseudoMoves(from) returns every square a piece COULD move to
    // according to how that piece type moves and what's currently
    // occupying nearby squares -- but WITHOUT checking whether making
    // that move would leave the mover's own king in check. That extra
    // "is my king safe afterward" check is layered on separately by
    // simulateMove() (see below), which is why you'll see call sites
    // written as:
    //     this.getPseudoMoves(cell).filter(d => !this.simulateMove(cell, d))
    // i.e. "take all the pseudo-moves, then filter OUT any that would
    // leave me in check" -- that combination is what actually produces
    // fully legal moves.
    //
    // Splitting it this way (raw movement rules, then a separate
    // legality filter) keeps this function simpler: it only has to know
    // "how does a bishop move", not "how does a bishop move AND would
    // that expose my king".
    getPseudoMoves (from) {
      const p = this.board[from];
      if (!p) return []; // no piece on that square -> no moves

      const f = from.charCodeAt(0);  // file as a character code, e.g. 'E' -> 69
      const r = +from[1];            // rank as a number, e.g. "4" -> 4 (the `+` converts string to number)
      // Pawns move in opposite directions depending on color: White
      // moves toward higher rank numbers (+1), Black toward lower ones
      // (-1). This single `dir` variable is used throughout the pawn
      // logic below so we don't have to write separate white/black
      // branches for "forward".
      const dir = p.color === 'white' ? 1 : -1;
      const moves = [];

      // push(cf, cr) is a small helper used by every "sliding" or
      // "stepping" piece (knight, bishop, rook, queen, king) below. Given
      // a candidate file (as a character code) and rank, it:
      //   1. converts them back into a square name like "E4"
      //   2. bails out if that square is off the board
      //   3. bails out if it's occupied by a piece of the SAME color
      //      (you can't capture your own piece)
      //   4. otherwise records it as a valid destination
      // Its return value is used by the sliding pieces (bishop/rook/
      // queen) to decide whether to keep sliding further in that
      // direction: it returns `true` only when the square was empty
      // (so a rook, say, can keep going straight past it), and `false`
      // both when the square is off-board AND when it's occupied
      // (whether by a friendly piece that blocks the slide, or an enemy
      // piece that can be captured but blocks anything further beyond
      // it) -- either way, sliding must stop there.
      const push = (cf, cr) => {
        const cell = String.fromCharCode(cf) + cr;
        // Regex check that `cell` is a real square, e.g. "E4" -- this
        // is what catches attempts to move off the edge of the board
        // (file before A / after H, or rank below 1 / above 8).
        if (!/^[A-H][1-8]$/.test(cell)) return false;
        const occ = this.board[cell];
        if (occ && occ.color === p.color) return false; // blocked by own piece
        moves.push(cell);
        return !occ; // true = square was empty, so sliding pieces may continue past it
      };

      switch (p.type) {
        case 'pawn': {
          // Pawns are the one piece type where "can move there" and
          // "can capture there" are DIFFERENT rules (every other piece
          // moves and captures the same way), so pawns get their own
          // hand-written logic instead of using the generic `push`
          // helper.

          // --- Forward movement (no capturing straight ahead) ---
          const one = String.fromCharCode(f) + (r + dir);
          if (!this.board[one]) {
            moves.push(one);

            // First move only: allowed to advance two squares, but only
            // if BOTH the one-square and two-square destinations are
            // empty (you can't jump over a piece).
            if (!p.hasMoved) {
              const two = String.fromCharCode(f) + (r + 2 * dir);
              if (!this.board[two]) moves.push(two);
            }
          }

          // --- Diagonal captures ---
          // A pawn can move one square diagonally forward ONLY if
          // there's an enemy piece there to capture (df = -1 or +1,
          // i.e. one file to the left or right).
          [-1, 1].forEach(df => {
            const cap = String.fromCharCode(f + df) + (r + dir);
            if (this.board[cap] && this.board[cap].color !== p.color)
              moves.push(cap);
          });

          // --- En passant ---
          // En passant is a special one-time capture: if an enemy pawn
          // JUST advanced two squares on the previous move (landing
          // right beside this pawn), this pawn may capture it "as it
          // passes", moving diagonally into the square the enemy pawn
          // skipped over -- even though that square is empty.
          // this.enPassant (set in makeMove(), see below) records that
          // opportunity as {target, capture}: `target` is the empty
          // square this pawn would move into, `capture` is the square
          // the enemy pawn actually sits on. Here we just check whether
          // one of our two possible diagonal squares matches that
          // target.
          if (this.enPassant) {
            [-1, 1].forEach(df => {
              const ep = String.fromCharCode(f + df) + (r + dir);
              if (ep === this.enPassant.target) moves.push(ep);
            });
          }
        } break;

        case 'knight':
          // All 8 possible "L-shaped" knight jumps, as [file-offset,
          // rank-offset] pairs. Knights don't slide, so push() is
          // simply called once per direction (its return value isn't
          // used here -- unlike bishop/rook/queen below, there's no
          // "keep going" concept for a knight).
          [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]
          .forEach(([df,dr]) => push(f + df, r + dr));
          break;

        case 'bishop':
          // The 4 diagonal directions. For each one, keep stepping
          // further away (i = 1, 2, 3, ... up to 7 squares) and calling
          // push() at each step; push()'s return value tells us to
          // `break` out of the inner loop as soon as we hit an occupied
          // square (own piece blocks entirely; enemy piece can be
          // captured but blocks anything further beyond it) or the edge
          // of the board.
          [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([df,dr]) => {
            for (let i = 1; i < 8; i++)
              if (!push(f + df*i, r + dr*i)) break;
          });
          break;

        case 'rook':
          // The 4 straight (horizontal/vertical) directions, same
          // sliding pattern as the bishop above.
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([df,dr]) => {
            for (let i = 1; i < 8; i++)
              if (!push(f + df*i, r + dr*i)) break;
          });
          break;

        case 'queen':
          // A queen simply moves like a bishop AND a rook combined, so
          // this is just the union of both direction lists above, using
          // the exact same sliding pattern.
          [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
          .forEach(([df,dr]) => {
            for (let i = 1; i < 8; i++)
              if (!push(f + df*i, r + dr*i)) break;
          });
          break;

        case 'king':
          // Same 8 directions as the queen, but only a single step in
          // each (i.e. no sliding loop) -- a king can only move one
          // square at a time. Note: castling is handled completely
          // separately in castleSide(), NOT here, since it's a special
          // compound move (king + rook moving together) rather than a
          // normal single-piece move.
          [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
          .forEach(([df,dr]) => push(f + df, r + dr));
          break;
      }
      return moves;
    }

    // simulateMove(from, to) answers the question "if I made this move,
    // would MY OWN king end up in check?" -- which is exactly the rule
    // that turns a pseudo-legal move into a fully legal one. It works by
    // actually performing the move on the real this.board, checking
    // isInCheck(), and then immediately undoing the move so the board is
    // left exactly as it was. Because this happens fully synchronously
    // (nothing else can run in between), the brief moment where the
    // board is "wrong" is never visible to the player or to render().
    //
    // Every call site uses this the same way:
    //     someMoves.filter(d => !this.simulateMove(from, d))
    // "keep only the destinations where simulating the move does NOT
    // result in check".
    simulateMove (from, to) {
      const moving = this.board[from];
      const dst    = this.board[to]; // whatever (if anything) is currently on the destination square
      let epCell = null, epPiece = null;

      // If this would be an en passant capture, the piece actually
      // being captured is NOT on the destination square `to` -- it's
      // on a different square (this.enPassant.capture). We need to
      // remove it too so isInCheck() below sees an accurate board, and
      // we need to remember what/where it was so we can put it back
      // afterward.
      if (moving.type === 'pawn' && !dst && this.enPassant &&
          this.enPassant.target === to) {
        epCell  = this.enPassant.capture;
        epPiece = this.board[epCell];
        delete this.board[epCell];
      }

      // --- Perform the move ---
      delete this.board[from];
      this.board[to] = moving;

      // --- Check whether the mover's own king is now in check ---
      const inCheck = this.isInCheck(moving.color);

      // --- Undo the move, restoring the board exactly as it was ---
      delete this.board[to];
      this.board[from] = moving;
      if (dst) this.board[to] = dst;           // put back whatever was captured normally...
      if (epCell) this.board[epCell] = epPiece; // ...or the en passant victim, if that's what happened

      return inCheck;
    }

    // Click Handling
    // ---------------------------------------------------------------
    // onBoardClick(e) is the single click handler for the entire board
    // (attached once, in bindEvents(), to the #chess-board container --
    // this pattern is called "event delegation": rather than adding a
    // listener to each of the 64 squares individually, we listen once on
    // their shared parent and figure out which square was actually
    // clicked from the event).
    //
    // It implements a simple two-click move flow:
    //   1st click on one of your own pieces -> select it, highlight its
    //   legal destinations.
    //   2nd click on a highlighted destination -> make the move.
    //   2nd click anywhere else -> treated as an invalid move attempt,
    //   and the selection is cleared either way.
    onBoardClick (e) {
      // e.target is whatever exact element was clicked (could be the
      // square itself, or the piece <div>, or the notation label inside
      // it) -- .closest('.square') walks back up to find the actual
      // square element regardless of which of its children got clicked.
      const sq   = e.target.closest('.square');
      if (!sq) return; // click landed somewhere that isn't part of a square at all
      const cell = sq.dataset.cell;
      // Is there already a piece selected from a previous click? (CSS
      // class 'selected' is added/removed below and in bindEvents'
      // reset logic.)
      const sel  = document.querySelector('.selected');

      if (sel) {
        // --- This is the SECOND click: attempt to move to `cell` ---
        const from  = sel.dataset.cell;
        // Recompute legal moves for the selected piece: same
        // "pseudo-moves minus ones that leave me in check" pattern used
        // everywhere else in this file.
        const legal = this.getPseudoMoves(from)
                         .filter(d => !this.simulateMove(from, d));

        if (legal.includes(cell))
          this.makeMove(from, cell);
        else
          this.showToast('Invalid move!', 'error');

        // Whether the move succeeded or not, clear all the visual
        // selection/highlight state -- either the move happened and
        // render() will redraw everything anyway, or it didn't and we
        // want to un-select so the player can try again from scratch.
        document.querySelectorAll('.selected,.move-highlight,.capture-highlight')
                .forEach(el => el.classList.remove('selected','move-highlight','capture-highlight'));
        return;
      }

      // --- This is the FIRST click: try to select a piece ---
      const piece = this.board[cell];
      // Only allow selecting a piece that belongs to whoever's turn it
      // currently is.
      if (piece && piece.color === this.currentTurn) {
        sq.classList.add('selected');
        // Highlight every legal destination for this piece: a
        // 'capture-highlight' if an enemy piece is sitting there, or a
        // plain 'move-highlight' otherwise. (Purely visual -- the
        // actual legality check already happened via getPseudoMoves +
        // simulateMove.)
        this.getPseudoMoves(cell)
            .filter(d => !this.simulateMove(cell, d))
            .forEach(d => {
              const tgt = document.querySelector(`.square[data-cell="${d}"]`);
              tgt.classList.add(this.board[d] ? 'capture-highlight' : 'move-highlight');
            });

        // Warn the player if selecting this piece reveals they're
        // currently in check (informational only -- it doesn't block
        // anything; illegal moves that don't get out of check are
        // already filtered out above by simulateMove).
        if (this.isInCheck(this.currentTurn))
          this.showToast('You are in check!', 'warning');
      }
      // If the click was on an empty square, or an opponent's piece,
      // with nothing currently selected, this function simply does
      // nothing -- no selection, no error message.
    }

    // makeMove(from, to) actually performs a move that's already been
    // confirmed legal by the caller (onBoardClick). This is where the
    // board data gets permanently updated (as opposed to simulateMove,
    // which always undoes itself). It handles all the special cases:
    // captures, en passant, setting up a future en passant opportunity,
    // and pawn promotion.
    makeMove (from, to) {
      const moving = this.board[from];
      let target   = this.board[to]; // piece being captured normally, if any
      let epCell   = null;            // set only if this turns out to be an en passant capture

      // Detect an en passant capture: moving pawn, destination square is
      // empty (a normal capture would have an enemy piece sitting right
      // on `to`), and `to` matches the currently-available en passant
      // target square. If so, the piece actually being captured is on
      // this.enPassant.capture (a different square than `to`).
      if (moving.type === 'pawn' && !target && this.enPassant &&
          this.enPassant.target === to) {
        epCell = this.enPassant.capture;
        target = this.board[epCell];
      }

      if (target) {
        // Record the capture (for score-keeping and for offering
        // recaptured piece types during promotion, see promptPromotion),
        // then remove the captured piece from the board. `epCell || to`
        // means: remove it from epCell if this was an en passant
        // capture, otherwise from the normal destination square `to`.
        this.captured[target.color].push(target);
        delete this.board[epCell || to];
        this.showToast(`Captured ${target.type}!`, 'capture');
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
      if (moving.type === 'pawn' && Math.abs(+from[1] - +to[1]) === 2) {
        const midRank = (+from[1] + +to[1]) / 2;
        this.enPassant = { target: from[0] + midRank, capture: to };
      }

      // Pawn promotion: if a pawn reaches the far rank (rank 8 for
      // White, rank 1 for Black), the move isn't finished yet -- we
      // place the pawn on the destination square for now, remember that
      // a promotion choice is pending, show the promotion popup, and
      // return EARLY (finishMove() is not called yet; it'll be called
      // from promotePawn() once the player picks a piece).
      if (moving.type === 'pawn' && (to[1] === '8' || to[1] === '1')) {
        this.board[to] = {...moving, hasMoved: true};
        this.pendingPromotion = {cell: to, color: moving.color};
        this.promptPromotion();
        return;
      }

      // Normal (non-promotion) move: place the piece and immediately
      // finish the move (switch turns, re-render, check for check/
      // checkmate, etc).
      this.board[to] = {...moving, hasMoved:true};
      this.finishMove(from, to, moving, target);
    }

    // Promotion
    // ---------------------------------------------------------------
    // promptPromotion() shows the "choose a piece to promote to" popup
    // once a pawn has reached the far rank (see makeMove() above). It
    // builds one clickable option per available piece type.
    promptPromotion () {
      const modal   = document.getElementById('promotion-id');
      const options = document.getElementById('promotion-choice');
      options.innerHTML = ''; // clear any leftover options from a previous promotion

      const {color} = this.pendingPromotion;
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
      let types = [...new Set(pool.map(p => p.type))];
      if (!types.length) types = ['queen','rook','bishop','knight'];

      types.forEach(type => {
        const btn = document.createElement('div');
        btn.className = 'promotion-option';
        btn.textContent = this.unicode[type][color];
        btn.title = type.charAt(0).toUpperCase() + type.slice(1); // e.g. "Queen" tooltip
        btn.addEventListener('click', () => this.promotePawn(type));
        options.appendChild(btn);
      });

      modal.style.display = 'flex';
    }

    // promotePawn(type) runs once the player has clicked one of the
    // promotion options built above. It finalizes the promotion and
    // then hands off to finishMove() to complete the turn (switch
    // players, re-render, check/checkmate detection) -- the same
    // finishMove() that a normal, non-promotion move calls directly
    // from makeMove().
    promotePawn (type) {
      const {cell,color} = this.pendingPromotion;

      // If this promotion is "reclaiming" a piece from the captured
      // pool (see the comment in promptPromotion above), remove one
      // instance of that type from the captured list -- it's being put
      // back into play, so it shouldn't still count as captured.
      const idx = this.captured[color].findIndex(p => p.type === type);
      if (idx !== -1) this.captured[color].splice(idx, 1);

      // Replace the pawn sitting on `cell` with a brand new piece of
      // the chosen type.
      this.board[cell] = {type, color, hasMoved:true};
      this.pendingPromotion = null;
      // The promotion popup's div is id="promotion-id" in index.html.
      document.getElementById('promotion-id').style.display = 'none';

      // Note `from` and `to` are both `cell` here -- the pawn didn't
      // move again, it was just replaced in place, so there's no
      // "movement" left for finishMove()'s history entry to describe
      // beyond the promoted piece's final square.
      this.finishMove(cell, cell, this.board[cell]);
    }

    // Check or Checkmate
    // ---------------------------------------------------------------
    // finishMove() is the shared "wrap up a move" step, called from
    // three places: makeMove() (normal moves), promotePawn() (after a
    // promotion choice), and NOT called directly for castling, which has
    // its own very similar wrap-up inline in castleSide() below (castling
    // moves two pieces at once, which doesn't fit finishMove()'s
    // single-piece `history` entry shape).
    //
    // It's responsible for: recording the move in history, switching
    // whose turn it is, re-rendering, and then figuring out whether the
    // player who's now "up" is in check or fully checkmated.
    finishMove (from, to, piece, capturedPiece = null) {
      // Add a row to the move history log (shown later in the "Move
      // History" popup via showHistory()).
      this.history.push({
        player       : this.currentTurn,
        piece        : piece.type,
        from, to,
        capture      : !!capturedPiece,
        capturedPiece: capturedPiece ? capturedPiece.type : ''
      });

      // Hand the turn over to the other player.
      this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

      this.pushState(); // snapshot for Undo
      this.render();
      this.updateTurnIndicator();
      this.updateScores();

      // From here on, "this.currentTurn" refers to whoever is about to
      // move NEXT (i.e. the player on the receiving end of the move that
      // just happened) -- so these checks are effectively "did the move
      // I just made put my opponent in check/checkmate?".
      if (this.isInCheck(this.currentTurn))
        this.showToast('Check!', 'warning');

      // anyLegal: does the player now on turn have ANY legal move at
      // all, anywhere on the board? This walks every occupied square,
      // skips anything not belonging to the current player, and for the
      // rest checks whether it has at least one destination that
      // doesn't leave its own king in check (the same pseudo-moves +
      // simulateMove filter used everywhere else). `.some(...)` short-
      // circuits as soon as it finds a single cell with at least one
      // such move, so this doesn't necessarily check the WHOLE board
      // every time -- just until it can answer the yes/no question.
      const anyLegal = Object.keys(this.board).some(cell => {
        const p = this.board[cell];
        if (p.color !== this.currentTurn) return false;
        return this.getPseudoMoves(cell)
                   .filter(d => !this.simulateMove(cell, d)).length > 0;
      });

      // Checkmate = in check AND no legal moves exist to escape it.
      // (Note: this file doesn't currently detect stalemate -- "not in
      // check, but also no legal moves" -- which in real chess rules is
      // a draw. That would be a reasonable thing to add later: an
      // `else if (!anyLegal)` branch here announcing a draw instead of
      // silently doing nothing.)
      if (this.isInCheck(this.currentTurn) && !anyLegal) {
        document.getElementById('result-text').textContent =
          `${this.currentTurn === 'white' ? 'Black' : 'White'} wins by checkmate!`;
        document.getElementById('result-id').style.display = 'flex';
      }
    }

    // Castling
    // ---------------------------------------------------------------
    // castleSide(side) handles the special castling move, where the
    // king and a rook move simultaneously. `side` is either 'king'
    // (castling toward the h-file / "kingside") or 'queen' (castling
    // toward the a-file / "queenside"). This is triggered directly by
    // its own dedicated buttons (#castle-kingside-btn /
    // #castle-queenside-btn) rather than through the normal
    // click-a-square-then-click-a-destination flow used for every other
    // move -- there's no square-clicking UI for castling in this game.
    //
    // NOTE: this implementation checks that the king and rook haven't
    // moved yet, and that the squares between them are empty, but it
    // does NOT check the full official castling rule that the king may
    // not castle OUT of, THROUGH, or INTO check. That would be worth
    // adding if this game is extended further.
    castleSide (side) {
      const isWhite = this.currentTurn === 'white';
      const rank = isWhite ? '1' : '8'; // White castles along rank 1, Black along rank 8
      const kingFrom = 'E' + rank;      // the king always starts on the E file
      // Kingside castling uses the rook on the H file (moving to F);
      // queenside uses the rook on the A file (moving to D).
      const rookFrom = side === 'king' ? 'H' + rank : 'A' + rank;
      const kingTo   = side === 'king' ? 'G' + rank : 'C' + rank;
      const rookTo   = side === 'king' ? 'F' + rank : 'D' + rank;
      // The squares that must be completely empty for castling to be
      // allowed (between the king's start and the rook, excluding the
      // king/rook squares themselves). Queenside has one extra square
      // (B-file) to check since the queenside rook starts further away.
      const path = side === 'king'
                   ? ['F' + rank, 'G' + rank]
                   : ['D' + rank, 'C' + rank, 'B' + rank];

      // Guard clauses: bail out with an error toast (and don't touch the
      // board at all) if any castling requirement isn't met.
      if (!this.board[kingFrom] || this.board[kingFrom].hasMoved) {
        this.showToast('King cannot castle', 'error'); return;
      }
      if (!this.board[rookFrom] || this.board[rookFrom].hasMoved) {
        this.showToast('Rook cannot castle', 'error'); return;
      }
      if (path.some(sq => this.board[sq])) {
        this.showToast('Pieces in path', 'error'); return;
      }

      // All checks passed: move both the king and the rook at once.
      const kingPiece = this.board[kingFrom];
      const rookPiece = this.board[rookFrom];
      delete this.board[kingFrom]; delete this.board[rookFrom];
      this.board[kingTo] = {...kingPiece, hasMoved:true};
      this.board[rookTo] = {...rookPiece, hasMoved:true};

      this.showToast(`Castled ${side}-side`, 'capture');
      // Record this as a single history entry describing the king's
      // movement (with a `castled` flag so showHistory()/anyone reading
      // the log can tell it apart from a normal king move, even though
      // the table currently doesn't render anything special for it).
      this.history.push({
        player:this.currentTurn,piece:'king',from:kingFrom,to:kingTo,
        capture:false,capturedPiece:'',castled:side
      });

      // This duplicates the turn-switching / re-render / update parts of
      // finishMove() inline, rather than calling finishMove() itself --
      // because finishMove() expects a single `piece`/`from`/`to` for
      // ONE moved piece, which doesn't cleanly describe "two pieces
      // moved at once". It also means castling currently does NOT run
      // the check/checkmate detection that finishMove() does -- castling
      // giving check or checkmate wouldn't currently be announced. Worth
      // keeping in mind if that behavior ever needs to match normal
      // moves exactly.
      this.currentTurn = isWhite ? 'black' : 'white';
      this.pushState(); this.render(); this.updateTurnIndicator(); this.updateScores();
    }

    // undo() is just a thin, more readable wrapper name for
    // popState() -- it's what the Undo button's click handler in
    // bindEvents() actually calls.
    undo () { this.popState(); }

    // showHistory() fills in the Move History popup's table using
    // this.history (built up one entry per move by finishMove() and
    // castleSide()), then reveals the popup.
    showHistory () {
      const tbody = document.getElementById('history-body');
      // .map(...).join('') builds one big HTML string of <tr> rows (one
      // per move) and sets it as the table body's contents in a single
      // assignment, rather than creating each row with
      // document.createElement the way render() does for the board --
      // just a different (equally valid) way to build up dynamic HTML.
      tbody.innerHTML = this.history.map((m,i) => `
        <tr>
          <td>${i+1}</td><td>${m.player}</td><td>${m.piece}</td>
          <td>${m.from}</td><td>${m.to}</td>
          <td>${m.capture ? 'Yes' : ''}</td><td>${m.capturedPiece || ''}</td>
        </tr>`).join('');
      document.getElementById('history-id').style.display = 'flex';
    }

    // updateTurnIndicator() refreshes the "Turn: White" / "Turn: Black"
    // text above the board, appending "(Check!)" if that player is
    // currently in check. Called after every move/undo so it's always
    // showing the current state.
    updateTurnIndicator () {
      let txt = `Turn: ${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)}`;
      if (this.isInCheck(this.currentTurn)) txt += ' (Check!)';
      document.getElementById('turn-indicator').textContent = txt;
    }

    // updateScores() recomputes each side's "material captured from the
    // OTHER side" total using this.valueMap, and writes it into the
    // scoreboard spans. Note this.captured.white is the list of WHITE's
    // pieces that have been captured -- so summing it produces the
    // score credited to BLACK, and vice versa. That's just how the
    // arrays are named/used consistently everywhere else in this file
    // (see makeMove(): `this.captured[target.color].push(target)`).
    updateScores () {
      const sum = arr => arr.reduce((s,p)=>s + this.valueMap[p.type],0);
      document.getElementById('white-score').textContent = sum(this.captured.white);
      document.getElementById('black-score').textContent = sum(this.captured.black);
    }
  }

  // Starting Event Listener
  // ---------------------------------------------------------------
  // Wait for the page's HTML to be fully parsed (DOMContentLoaded) before
  // constructing the game, since the constructor -> init() chain
  // immediately reaches into the DOM for elements like #chess-board,
  // #undo-btn, etc. If this ran any earlier, those elements might not
  // exist in the document yet and every getElementById(...) call would
  // return null.
  window.addEventListener('DOMContentLoaded', () => new ChessGame());
