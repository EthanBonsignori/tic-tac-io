const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { checkWinner, isBoardFull } = require("./game");

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_URL }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_URL },
});

// The one player waiting for an opponent, or null if no one is waiting.
let waitingPlayer = null;

// roomId -> { board, turn, players: { X: socketId, O: socketId } }
const rooms = new Map();

// socketId -> roomId, so a player's game can be found on a move or disconnect.
const playerRooms = new Map();

function createRoom(playerX, playerO) {
  const roomId = `${playerX.id}#${playerO.id}`;

  rooms.set(roomId, {
    board: Array(9).fill(null),
    turn: "X",
    players: { X: playerX.id, O: playerO.id },
  });

  playerX.join(roomId);
  playerO.join(roomId);
  playerRooms.set(playerX.id, roomId);
  playerRooms.set(playerO.id, roomId);

  playerX.emit("gameStart", { symbol: "X" });
  playerO.emit("gameStart", { symbol: "O" });

  sendGameState(roomId);
}

function sendGameState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const winner = checkWinner(room.board);

  io.to(roomId).emit("gameState", {
    board: room.board,
    turn: room.turn,
    winner,
    isDraw: !winner && isBoardFull(room.board),
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

io.on("connection", (socket) => {
  socket.on("findGame", () => {
    const currentRoomId = playerRooms.get(socket.id);
    const currentRoom = rooms.get(currentRoomId);
    if (currentRoom) {
      const gameOver = checkWinner(currentRoom.board) || isBoardFull(currentRoom.board);
      if (!gameOver) return; // already in an active game, ignore duplicate requests
    }

    leaveRoom(socket, { notifyOpponent: false });

    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const opponent = waitingPlayer;
      waitingPlayer = null;
      createRoom(opponent, socket);
    } else {
      waitingPlayer = socket;
    }
  });

  socket.on("leaveGame", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
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

    room.board[index] = symbol;
    room.turn = symbol === "X" ? "O" : "X";
    sendGameState(roomId);
  });

  socket.on("disconnect", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    leaveRoom(socket, { notifyOpponent: true });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
