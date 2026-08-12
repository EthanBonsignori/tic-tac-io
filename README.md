# Tic-Tac-IO

Video Demo: https://youtu.be/UPuL4lfTPtw
A multiplayer Tic-Tac-Toe game built for CS50's final project, using React and Socket.IO.

## Game modes

Two independent choices are made from the menu: a **board variant** (Classic or Endless) and an **opponent** (a local AI at one of three difficulties, or a live matchmade human).

### Board variants

- **Classic** — Standard tic-tac-toe rules. Marks are permanent; the game ends in a win or a draw once the board fills up.
- **Endless** — Each player only ever has their 3 most recent marks on the board. Placing a 4th mark evicts that player's oldest one (which fades first as a warning the turn before it disappears). Because the board can never completely fill up with both players stuck, games can't end in a draw — someone eventually lines up three in a row.

### Play vs Computer

A single-player match against an in-browser AI (`client/src/ai.js`), offered at three difficulties:

- **Easy** — 75% of the time the AI plays a uniformly random legal move; the rest of the time it plays optimally. Very beatable.
- **Medium** — Plays optimally but is guaranteed exactly one random slip-up per game: each move it has a 40% chance to blunder, and if it hasn't blundered by its 4th move it is forced to on that move. Beatable, but you have to capitalize on the mistake.
- **Impossible** — Always plays the game-theoretically optimal move via minimax search with alpha-beta pruning. Unbeatable; best case is a draw (in Classic — Endless has no draws, so a perfect AI here is truly unbeatable).

The AI runs entirely client-side and re-searches the full game tree (bounded by the 9-square board) on every move, so there's no server round-trip for computer games.

### Find a Match (multiplayer)

Live 1v1 play over WebSockets. Clicking "Find a Match" joins a per-variant matchmaking queue on the server; the server pairs the first two waiting players into a room, assigns them X/O, and becomes the authoritative source of truth for the board — the client only renders state pushed to it and sends the squares it clicks. If an opponent disconnects mid-game, the remaining player is notified and can requeue.

## Project structure

```
tic-tac-io/
├── client/   # React app (Vite)
└── server/   # Express + Socket.IO server
```

## Tech stack

### Client (`client/`)

- **React 19** for UI, built with **Vite** (dev server + bundler).
- **socket.io-client** for the WebSocket connection to the server (`client/src/socket.js`).
- Game rules (win/draw checks, Endless mark eviction) live in `client/src/gameLogic.js` and are shared conceptually with the server's copy so both sides agree on what a legal, finished game looks like.
- The computer opponent (`client/src/ai.js`) is a self-contained minimax implementation with alpha-beta pruning, plus the difficulty-specific randomness described above — it never talks to the server.
- **oxlint** for linting.

### Server (`server/`)

- **Express** serves as the HTTP app shell (mainly to host CORS config and the HTTP server that Socket.IO attaches to).
- **Socket.IO** handles all real-time game traffic: matchmaking (`findGame`), moves (`makeMove`), leaving (`leaveGame`), and disconnect handling.
- Server-authoritative game state: `server/index.js` keeps an in-memory `Map` of rooms (board, turn, players, marks) keyed by a room ID derived from the two players' socket IDs, plus a per-variant matchmaking queue (`waitingPlayers`). Every accepted move is validated (right player, right turn, empty square, game not already over) before the new state is broadcast to both players in the room.
- Shared game-logic helpers (win detection, board-full check, Endless mark placement/fading) live in `server/game.js`.
- **cors** restricts the HTTP/WebSocket origin to the configured client URL.
- **nodemon** for the dev server's auto-restart on file changes.

## Getting started

You'll need two terminals, one for the server and one for the client.

### Server

```
cd server
npm install
npm run dev
```

Runs on http://localhost:3001

### Client

```
cd client
npm install
npm run dev
```

Runs on http://localhost:5173
