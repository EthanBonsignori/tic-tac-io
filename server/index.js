const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const {
  checkWinner,
  isBoardFull,
  createMarksState,
  placeMark,
  getFadingIndices,
} = require("./game");

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_URL }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_URL },
});

// The one player waiting for an opponent, per mode, or null if no one is waiting.
const waitingPlayers = { classic: null, endless: null };

// roomId -> { board, turn, players: { X: socketId, O: socketId }, mode, marksState }
const rooms = new Map();

// socketId -> roomId, so a player's game can be found on a move or disconnect.
const playerRooms = new Map();

function createRoom(playerX, playerO, mode) {
  const roomId = `${playerX.id}#${playerO.id}`;

  rooms.set(roomId, {
    board: Array(9).fill(null),
    turn: "X",
    players: { X: playerX.id, O: playerO.id },
    mode,
    marksState: createMarksState(),
  });

  playerX.join(roomId);
  playerO.join(roomId);
  playerRooms.set(playerX.id, roomId);
  playerRooms.set(playerO.id, roomId);

  playerX.emit("gameStart", { symbol: "X", mode });
  playerO.emit("gameStart", { symbol: "O", mode });

  sendGameState(roomId);
}

function sendGameState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const winner = checkWinner(room.board);
  const endless = room.mode === "endless";

  io.to(roomId).emit("gameState", {
    board: room.board,
    turn: room.turn,
    winner,
    isDraw: !winner && isBoardFull(room.board),
    fadingIndices: getFadingIndices(room.marksState, endless),
  });
}

// Removes a player from their room. When notifyOpponent is true (an actual
// disconnect) the opponent is told their opponent left; when it's false (the
// player requeuing after a finished game via "Play Again") the opponent is
// left alone so they can requeue on their own terms.
function leaveRoom(socket, { notifyOpponent }) {
  const roomId = playerRooms.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (room && notifyOpponent) {
    const opponentId =
      room.players.X === socket.id ? room.players.O : room.players.X;
    io.to(opponentId).emit("opponentLeft");
    playerRooms.delete(opponentId);
  }

  rooms.delete(roomId);
  playerRooms.delete(socket.id);
  socket.leave(roomId);
}

// Clears a socket out of whichever mode's matchmaking queue it's sitting in.
function leaveQueue(socket) {
  for (const mode of Object.keys(waitingPlayers)) {
    if (waitingPlayers[mode] && waitingPlayers[mode].id === socket.id) {
      waitingPlayers[mode] = null;
    }
  }
}

io.on("connection", (socket) => {
  socket.on("findGame", ({ mode } = {}) => {
    const gameMode = mode === "endless" ? "endless" : "classic";

    const currentRoomId = playerRooms.get(socket.id);
    const currentRoom = rooms.get(currentRoomId);
    if (currentRoom) {
      const gameOver = checkWinner(currentRoom.board) || isBoardFull(currentRoom.board);
      if (!gameOver) return; // already in an active game, ignore duplicate requests
    }

    leaveRoom(socket, { notifyOpponent: false });

    const waitingPlayer = waitingPlayers[gameMode];
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      waitingPlayers[gameMode] = null;
      createRoom(waitingPlayer, socket, gameMode);
    } else {
      waitingPlayers[gameMode] = socket;
    }
  });

  socket.on("leaveGame", () => {
    leaveQueue(socket);
    leaveRoom(socket, { notifyOpponent: true });
  });

  socket.on("makeMove", ({ index }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;

    const symbol = room.players.X === socket.id ? "X" : "O";
    const isMyTurn = room.turn === symbol;
    const isValidMove = index >= 0 && index < 9 && room.board[index] === null;
    const isGameOver = checkWinner(room.board) || isBoardFull(room.board);

    if (!isMyTurn || !isValidMove || isGameOver) return;

    const { board, marksState } = placeMark(room.board, room.marksState, index, symbol, room.mode === "endless");
    room.board = board;
    room.marksState = marksState;
    room.turn = symbol === "X" ? "O" : "X";
    sendGameState(roomId);
  });

  socket.on("disconnect", () => {
    leaveQueue(socket);
    leaveRoom(socket, { notifyOpponent: true });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
