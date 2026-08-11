import { checkWinner, isBoardFull } from "./gameLogic.js";

export const DIFFICULTIES = ["easy", "medium", "impossible"];

const EASY_MISTAKE_CHANCE = 0.75;
const MEDIUM_MISTAKE_CHANCE = 0.4;
// Computer moves at most 4 times in a 9-square game (it always moves second),
// so forcing the mistake by then guarantees medium gets its one slip-up in
// any game that runs long enough for it to matter.
const MEDIUM_FORCE_MISTAKE_AT_MOVE = 4;

// Per-game bookkeeping for difficulties that should misstep only once.
// Callers create one of these per game and pass it into every getComputerMove call.
export function createDifficultyState() {
  return { movesMade: 0, mistakeMade: false };
}

function getRandomMove(board) {
  const empties = board.reduce((acc, cell, i) => {
    if (!cell) acc.push(i);
    return acc;
  }, []);
  return empties[Math.floor(Math.random() * empties.length)];
}

export function getComputerMove(board, computerSymbol, difficulty = "impossible", state = createDifficultyState()) {
  state.movesMade += 1;

  if (difficulty === "easy") {
    return Math.random() < EASY_MISTAKE_CHANCE
      ? getRandomMove(board)
      : getBestMove(board, computerSymbol);
  }

  if (difficulty === "medium") {
    const mustMistakeNow = state.movesMade >= MEDIUM_FORCE_MISTAKE_AT_MOVE;
    if (!state.mistakeMade && (mustMistakeNow || Math.random() < MEDIUM_MISTAKE_CHANCE)) {
      state.mistakeMade = true;
      return getRandomMove(board);
    }
    return getBestMove(board, computerSymbol);
  }

  return getBestMove(board, computerSymbol);
}

// Unbeatable move via minimax with alpha-beta pruning.
function getBestMove(board, computerSymbol) {
  const humanSymbol = computerSymbol === "X" ? "O" : "X";
  let bestScore = -Infinity;
  let bestMove = null;

  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = computerSymbol;
    const score = minimax(board, 0, false, -Infinity, Infinity, computerSymbol, humanSymbol);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}

function minimax(board, depth, isMaximizing, alpha, beta, computerSymbol, humanSymbol) {
  const winner = checkWinner(board);
  if (winner === computerSymbol) return 10 - depth;
  if (winner === humanSymbol) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = computerSymbol;
      best = Math.max(best, minimax(board, depth + 1, false, alpha, beta, computerSymbol, humanSymbol));
      board[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = humanSymbol;
    best = Math.min(best, minimax(board, depth + 1, true, alpha, beta, computerSymbol, humanSymbol));
    board[i] = null;
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}
