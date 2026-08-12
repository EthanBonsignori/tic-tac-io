const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every((cell) => cell !== null);
}

// Endless mode: each player only keeps their most recent ENDLESS_MAX_MARKS
// marks on the board. marksState tracks each symbol's active square indices,
// oldest first, so we know which one to fade and then evict.
const ENDLESS_MAX_MARKS = 3;

function createMarksState() {
  return { X: [], O: [] };
}

// Places `symbol` at `index`, evicting that symbol's oldest mark once it has
// more than ENDLESS_MAX_MARKS on the board. Returns the updated board and
// marksState; non-endless callers can ignore marksState entirely.
function placeMark(board, marksState, index, symbol, endless) {
  const nextBoard = [...board];
  nextBoard[index] = symbol;

  if (!endless) {
    return { board: nextBoard, marksState, expiredIndex: null };
  }

  const queue = [...marksState[symbol], index];
  let expiredIndex = null;
  if (queue.length > ENDLESS_MAX_MARKS) {
    expiredIndex = queue.shift();
    nextBoard[expiredIndex] = null;
  }

  return {
    board: nextBoard,
    marksState: { ...marksState, [symbol]: queue },
    expiredIndex,
  };
}

// Indices whose mark is the oldest of a full queue — i.e. it will be evicted
// the next time that symbol moves, so it should render as fading now.
function getFadingIndices(marksState, endless) {
  if (!endless) return [];
  return ["X", "O"]
    .filter((symbol) => marksState[symbol].length === ENDLESS_MAX_MARKS)
    .map((symbol) => marksState[symbol][0]);
}

module.exports = {
  checkWinner,
  isBoardFull,
  ENDLESS_MAX_MARKS,
  createMarksState,
  placeMark,
  getFadingIndices,
};
