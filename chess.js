  class ChessGame {
    constructor () {
      /* --- static maps --- */
      this.cols = ['A','B','C','D','E','F','G','H'];
      this.rows = [8,7,6,5,4,3,2,1];
      this.unicode = {
        pawn:{white:'\u2659',black:'\u265F'},
        knight:{white:'\u2658',black:'\u265E'},
        bishop:{white:'\u2657',black:'\u265D'},
        rook:{white:'\u2656',black:'\u265C'},
        queen:{white:'\u2655',black:'\u265B'},
        king:{white:'\u2654',black:'\u265A'}
      };
      this.valueMap = {pawn:1, knight:3, bishop:3, rook:5, queen:9, king:0};

      this.pendingPromotion = null;  // {cell,color}
      this.enPassant = null;         // {target:'E3',capture:'E4'} or null
      this.init();
    }

    /* ---------------------------------------------------------------------
       INITIALISATION / RESET
    --------------------------------------------------------------------- */
    init () {
      this.board   = {};          // cell -> piece {type,color,hasMoved}
      this.history = [];          // move log
      this.boardHistory = [];     // deep snapshots for undo
      this.captured = {white:[],black:[]};
      this.currentTurn = 'white';
      this.enPassant   = null;

      this.pushState();
      this.createBoard();
      this.resetPieces();
      this.render();
      this.bindEvents();
      this.updateTurnIndicator();
      this.updateScores();
    }

    pushState () {
      this.boardHistory.push({
        board      : JSON.parse(JSON.stringify(this.board)),
        history    : JSON.parse(JSON.stringify(this.history)),
        captured   : JSON.parse(JSON.stringify(this.captured)),
        currentTurn: this.currentTurn,
        enPassant  : this.enPassant ? {...this.enPassant} : null
      });
    }
    popState () {
      if (this.boardHistory.length < 2) return;
      this.boardHistory.pop();              // discard current snapshot
      const prev = this.boardHistory.pop(); // load previous
      this.board       = prev.board;
      this.history     = prev.history;
      this.captured    = prev.captured;
      this.currentTurn = prev.currentTurn;
      this.enPassant   = prev.enPassant;

      this.render();
      this.updateTurnIndicator();
      this.updateScores();
    }

    /* ---------------------------------------------------------------------
       UTILITIES
    --------------------------------------------------------------------- */
    showToast (msg, type='') {
      const wrap = document.getElementById('toast-container');
      const div  = document.createElement('div');
      div.className = `toast ${type}`;
      div.textContent = msg;
      wrap.appendChild(div);
      setTimeout(() => div.remove(), 3000);
    }

    /* ---------------------------------------------------------------------
       BOARD BUILD / RESET
    --------------------------------------------------------------------- */
    createBoard () {
      const boardEl = document.getElementById('chess-board');
      boardEl.innerHTML = '';
      for (const r of this.rows) {
        for (const c of this.cols) {
          const cell = `${c}${r}`;
          const sq = document.createElement('div');
          const light = (this.cols.indexOf(c) + this.rows.indexOf(r)) % 2 === 0;
          sq.className = `square ${light ? 'light' : 'dark'}`;
          sq.dataset.cell = cell;

          const note = document.createElement('div');
          note.className = 'notation';
          note.textContent = cell;
          sq.appendChild(note);

          boardEl.appendChild(sq);
        }
      }
    }

    resetPieces () {
      const back = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
      for (let i = 0; i < 8; i++) {
        const f = this.cols[i];
        this.board[`${f}2`] = {type:'pawn',  color:'white',hasMoved:false};
        this.board[`${f}7`] = {type:'pawn',  color:'black',hasMoved:false};
        this.board[`${f}1`] = {type:back[i], color:'white',hasMoved:false};
        this.board[`${f}8`] = {type:back[i], color:'black',hasMoved:false};
      }
    }

    /* ---------------------------------------------------------------------
       RENDER
    --------------------------------------------------------------------- */
    render () {
      /* clear each square */
      document.querySelectorAll('.square').forEach(sq => {
        sq.innerHTML = '';
        const note = document.createElement('div');
        note.className = 'notation';
        note.textContent = sq.dataset.cell;
        sq.appendChild(note);
      });

      /* add pieces */
      for (const cell in this.board) {
        const p  = this.board[cell];
        const sq = document.querySelector(`.square[data-cell="${cell}"]`);
        if (!sq) continue;

        const el = document.createElement('div');
        el.className = 'piece';
        el.textContent = this.unicode[p.type][p.color];
        el.dataset.cell  = cell;
        el.dataset.type  = p.type;
        el.dataset.color = p.color;
        sq.appendChild(el);
      }

      /* captured rows */
      ['white','black'].forEach(color => {
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

    /* ---------------------------------------------------------------------
       EVENT BINDINGS
    --------------------------------------------------------------------- */
    bindEvents () {
      document.getElementById('chess-board')
              .addEventListener('click', e => this.onBoardClick(e));

      document.getElementById('undo-btn')
              .addEventListener('click', () => this.undo());

      document.getElementById('reset-btn')
              .addEventListener('click', () => window.location.reload());

      document.getElementById('history-btn')
              .addEventListener('click', () => this.showHistory());

      document.getElementById('castle-kingside-btn')
              .addEventListener('click', () => this.castleSide('king'));

      document.getElementById('castle-queenside-btn')
              .addEventListener('click', () => this.castleSide('queen'));

      document.getElementById('history-close')
              .addEventListener('click', () => {
                document.getElementById('history-modal').style.display = 'none';
              });

      document.getElementById('result-close')
              .addEventListener('click', () => {
                document.getElementById('result-modal').style.display = 'none';
                this.init();
              });
    }

    /* ---------------------------------------------------------------------
       MOVE‑GENERATION / CHECK DETECTION
    --------------------------------------------------------------------- */
    isInCheck (color) {
      /* find king */
      let king = '';
      for (const cell in this.board) {
        const p = this.board[cell];
        if (p.type === 'king' && p.color === color) { king = cell; break; }
      }
      /* any opposing pseudo move attack? */
      for (const cell in this.board) {
        const p = this.board[cell];
        if (p.color !== color && this.getPseudoMoves(cell).includes(king))
          return true;
      }
      return false;
    }

    getPseudoMoves (from) {
      const p = this.board[from];
      if (!p) return [];

      const f = from.charCodeAt(0);  // file as char code
      const r = +from[1];            // rank as number
      const dir = p.color === 'white' ? 1 : -1;
      const moves = [];

      const push = (cf, cr) => {
        const cell = String.fromCharCode(cf) + cr;
        if (!/^[A-H][1-8]$/.test(cell)) return false;
        const occ = this.board[cell];
        if (occ && occ.color === p.color) return false;
        moves.push(cell);
        return !occ;   // true if empty (for sliders)
      };

      switch (p.type) {
        case 'pawn': {
          /* single step */
          const one = String.fromCharCode(f) + (r + dir);
          if (!this.board[one]) {
            moves.push(one);
            /* double step */
            if (!p.hasMoved) {
              const two = String.fromCharCode(f) + (r + 2 * dir);
              if (!this.board[two]) moves.push(two);
            }
          }
          /* normal captures */
          [-1, 1].forEach(df => {
            const cap = String.fromCharCode(f + df) + (r + dir);
            if (this.board[cap] && this.board[cap].color !== p.color)
              moves.push(cap);
          });
          /* en‑passant capture */
          if (this.enPassant) {
            [-1, 1].forEach(df => {
              const ep = String.fromCharCode(f + df) + (r + dir);
              if (ep === this.enPassant.target) moves.push(ep);
            });
          }
        } break;

        case 'knight':
          [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]
          .forEach(([df,dr]) => push(f + df, r + dr));
          break;

        case 'bishop':
          [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([df,dr]) => {
            for (let i = 1; i < 8; i++)
              if (!push(f + df*i, r + dr*i)) break;
          });
          break;

        case 'rook':
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([df,dr]) => {
            for (let i = 1; i < 8; i++)
              if (!push(f + df*i, r + dr*i)) break;
          });
          break;

        case 'queen':
          [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
          .forEach(([df,dr]) => {
            for (let i = 1; i < 8; i++)
              if (!push(f + df*i, r + dr*i)) break;
          });
          break;

        case 'king':
          [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
          .forEach(([df,dr]) => push(f + df, r + dr));
          break;
      }
      return moves;
    }

    /* ---------------------------------------------------------------------
       SIMULATE (*** handles en‑passant for legality checks ***)
    --------------------------------------------------------------------- */
    simulateMove (from, to) {
      const moving = this.board[from];
      const dst    = this.board[to];
      let epCell = null, epPiece = null;

      /* if en‑passant would capture, temporarily remove the pawn */
      if (moving.type === 'pawn' && !dst && this.enPassant &&
          this.enPassant.target === to) {
        epCell  = this.enPassant.capture;
        epPiece = this.board[epCell];
        delete this.board[epCell];
      }

      delete this.board[from];
      this.board[to] = moving;

      const inCheck = this.isInCheck(moving.color);

      delete this.board[to];
      this.board[from] = moving;
      if (dst) this.board[to] = dst;
      if (epCell) this.board[epCell] = epPiece;

      return inCheck;
    }

    /* ---------------------------------------------------------------------
       CLICK HANDLING
    --------------------------------------------------------------------- */
    onBoardClick (e) {
      const sq   = e.target.closest('.square');
      if (!sq) return;
      const cell = sq.dataset.cell;
      const sel  = document.querySelector('.selected');

      /* second click ⇒ attempt a move */
      if (sel) {
        const from  = sel.dataset.cell;
        const legal = this.getPseudoMoves(from)
                         .filter(d => !this.simulateMove(from, d));

        if (legal.includes(cell))
          this.makeMove(from, cell);
        else
          this.showToast('Invalid move!', 'error');

        /* clear highlights */
        document.querySelectorAll('.selected,.move-highlight,.capture-highlight')
                .forEach(el => el.classList.remove('selected','move-highlight','capture-highlight'));
        return;
      }

      /* first click ⇒ select a piece */
      const piece = this.board[cell];
      if (piece && piece.color === this.currentTurn) {
        sq.classList.add('selected');
        this.getPseudoMoves(cell)
            .filter(d => !this.simulateMove(cell, d))
            .forEach(d => {
              const tgt = document.querySelector(`.square[data-cell="${d}"]`);
              tgt.classList.add(this.board[d] ? 'capture-highlight' : 'move-highlight');
            });

        if (this.isInCheck(this.currentTurn))
          this.showToast('You are in check!', 'warning');
      }
    }

    /* ---------------------------------------------------------------------
       MAKE MOVE  (handles en‑passant, promotion, sets new en‑passant)
    --------------------------------------------------------------------- */
    makeMove (from, to) {
      const moving = this.board[from];
      let target   = this.board[to];
      let epCell   = null;            // square of pawn captured en‑passant

      /* en‑passant capture */
      if (moving.type === 'pawn' && !target && this.enPassant &&
          this.enPassant.target === to) {
        epCell = this.enPassant.capture;
        target = this.board[epCell];
      }

      /* capture */
      if (target) {
        this.captured[target.color].push(target);
        delete this.board[epCell || to];
        this.showToast(`Captured ${target.type}!`, 'capture');
      }

      delete this.board[from];
      this.enPassant = null;          // clear by default

      /* set new en‑passant opportunity (pawn double push) */
      if (moving.type === 'pawn' && Math.abs(+from[1] - +to[1]) === 2) {
        const midRank = (+from[1] + +to[1]) / 2;
        this.enPassant = { target: from[0] + midRank, capture: to };
      }

      /* promotion */
      if (moving.type === 'pawn' && (to[1] === '8' || to[1] === '1')) {
        this.board[to] = {...moving, hasMoved: true};
        this.pendingPromotion = {cell: to, color: moving.color};
        this.promptPromotion();
        return;
      }

      this.board[to] = {...moving, hasMoved:true};
      this.finishMove(from, to, moving, target);
    }

    /* ---------------------------------------------------------------------
       PROMOTION
    --------------------------------------------------------------------- */
    promptPromotion () {
      const modal   = document.getElementById('promotion-modal');
      const options = document.getElementById('promotion-options');
      options.innerHTML = '';

      const {color} = this.pendingPromotion;
      const pool = this.captured[color];
      let types = [...new Set(pool.map(p => p.type))];
      if (!types.length) types = ['queen','rook','bishop','knight'];

      types.forEach(type => {
        const btn = document.createElement('div');
        btn.className = 'promotion-option';
        btn.textContent = this.unicode[type][color];
        btn.title = type.charAt(0).toUpperCase() + type.slice(1);
        btn.addEventListener('click', () => this.promotePawn(type));
        options.appendChild(btn);
      });

      modal.style.display = 'flex';
    }

    promotePawn (type) {
      const {cell,color} = this.pendingPromotion;
      const idx = this.captured[color].findIndex(p => p.type === type);
      if (idx !== -1) this.captured[color].splice(idx, 1);

      this.board[cell] = {type, color, hasMoved:true};
      this.pendingPromotion = null;
      document.getElementById('promotion-modal').style.display = 'none';

      this.finishMove(cell, cell, this.board[cell]);
    }

    /* ---------------------------------------------------------------------
       FINISH MOVE / CHECK & CHECKMATE
    --------------------------------------------------------------------- */
    finishMove (from, to, piece, capturedPiece = null) {
      this.history.push({
        player       : this.currentTurn,
        piece        : piece.type,
        from, to,
        capture      : !!capturedPiece,
        capturedPiece: capturedPiece ? capturedPiece.type : ''
      });

      /* switch turns */
      this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

      this.pushState();
      this.render();
      this.updateTurnIndicator();
      this.updateScores();

      if (this.isInCheck(this.currentTurn))
        this.showToast('Check!', 'warning');

      /* checkmate? */
      const anyLegal = Object.keys(this.board).some(cell => {
        const p = this.board[cell];
        if (p.color !== this.currentTurn) return false;
        return this.getPseudoMoves(cell)
                   .filter(d => !this.simulateMove(cell, d)).length > 0;
      });

      if (this.isInCheck(this.currentTurn) && !anyLegal) {
        document.getElementById('result-text').textContent =
          `${this.currentTurn === 'white' ? 'Black' : 'White'} wins by checkmate!`;
        document.getElementById('result-modal').style.display = 'flex';
      }
    }

    /* ---------------------------------------------------------------------
       CASTLING / UNDO / HISTORY UI / SCORES (unchanged from before)
    --------------------------------------------------------------------- */
    castleSide (side) {
      const isWhite = this.currentTurn === 'white';
      const rank = isWhite ? '1' : '8';
      const kingFrom = 'E' + rank;
      const rookFrom = side === 'king' ? 'H' + rank : 'A' + rank;
      const kingTo   = side === 'king' ? 'G' + rank : 'C' + rank;
      const rookTo   = side === 'king' ? 'F' + rank : 'D' + rank;
      const path = side === 'king'
                   ? ['F' + rank, 'G' + rank]
                   : ['D' + rank, 'C' + rank, 'B' + rank];

      if (!this.board[kingFrom] || this.board[kingFrom].hasMoved) {
        this.showToast('King cannot castle', 'error'); return;
      }
      if (!this.board[rookFrom] || this.board[rookFrom].hasMoved) {
        this.showToast('Rook cannot castle', 'error'); return;
      }
      if (path.some(sq => this.board[sq])) {
        this.showToast('Pieces in path', 'error'); return;
      }

      const kingPiece = this.board[kingFrom];
      const rookPiece = this.board[rookFrom];
      delete this.board[kingFrom]; delete this.board[rookFrom];
      this.board[kingTo] = {...kingPiece, hasMoved:true};
      this.board[rookTo] = {...rookPiece, hasMoved:true};

      this.showToast(`Castled ${side}-side`, 'capture');
      this.history.push({
        player:this.currentTurn,piece:'king',from:kingFrom,to:kingTo,
        capture:false,capturedPiece:'',castled:side
      });

      this.currentTurn = isWhite ? 'black' : 'white';
      this.pushState(); this.render(); this.updateTurnIndicator(); this.updateScores();
    }

    undo () { this.popState(); }

    showHistory () {
      const tbody = document.getElementById('history-body');
      tbody.innerHTML = this.history.map((m,i) => `
        <tr>
          <td>${i+1}</td><td>${m.player}</td><td>${m.piece}</td>
          <td>${m.from}</td><td>${m.to}</td>
          <td>${m.capture ? 'Yes' : ''}</td><td>${m.capturedPiece || ''}</td>
        </tr>`).join('');
      document.getElementById('history-modal').style.display = 'flex';
    }

    updateTurnIndicator () {
      let txt = `Turn: ${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)}`;
      if (this.isInCheck(this.currentTurn)) txt += ' (Check!)';
      document.getElementById('turn-indicator').textContent = txt;
    }

    updateScores () {
      const sum = arr => arr.reduce((s,p)=>s + this.valueMap[p.type],0);
      document.getElementById('score-white').textContent = sum(this.captured.white);
      document.getElementById('score-black').textContent = sum(this.captured.black);
    }
  }

  /* -----------------------------------------------------------------------
     BOOT
  ----------------------------------------------------------------------- */
  window.addEventListener('DOMContentLoaded', () => new ChessGame());