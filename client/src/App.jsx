import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import Board from "./Board";
import { checkWinner, isBoardFull } from "./gameLogic.js";
import { getComputerMove, createDifficultyState } from "./ai.js";
import "./App.css";

const COMPUTER_MOVE_DELAY_MS = 400;

const DIFFICULTY_LABELS = {
  easy: "Easy",
  medium: "Medium",
  impossible: "Impossible",
};

function App() {
  const [status, setStatus] = useState("menu");
  const [mode, setMode] = useState(null); // "computer" | "multiplayer"
  const [difficulty, setDifficulty] = useState(null); // "easy" | "medium" | "impossible"
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [mySymbol, setMySymbol] = useState(null);
  const difficultyStateRef = useRef(createDifficultyState());

  useEffect(() => {
    function handleGameStart({ symbol }) {
      setMySymbol(symbol);
      setStatus("playing");
    }

    function handleGameState({ board, turn, winner, isDraw }) {
      setBoard(board);
      setTurn(turn);
      setWinner(winner);
      setIsDraw(isDraw);
      if (winner || isDraw) setStatus("gameOver");
    }

    function handleOpponentLeft() {
      setStatus("opponentLeft");
    }

    socket.on("gameStart", handleGameStart);
    socket.on("gameState", handleGameState);
    socket.on("opponentLeft", handleOpponentLeft);

    return () => {
      socket.off("gameStart", handleGameStart);
      socket.off("gameState", handleGameState);
      socket.off("opponentLeft", handleOpponentLeft);
    };
  }, []);

  function leaveMultiplayerIfNeeded() {
    if (mode === "multiplayer" && (status === "waitingForOpponent" || status === "playing")) {
      socket.emit("leaveGame");
    }
  }

  function handleFindMatch() {
    setMode("multiplayer");
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsDraw(false);
    setStatus("waitingForOpponent");
    socket.emit("findGame");
  }

  function handlePlayComputer(level) {
    leaveMultiplayerIfNeeded();
    difficultyStateRef.current = createDifficultyState();
    setMode("computer");
    setDifficulty(level);
    setBoard(Array(9).fill(null));
    setTurn("X");
    setWinner(null);
    setIsDraw(false);
    setMySymbol("X");
    setStatus("playing");
  }

  function handleBackToMenu() {
    leaveMultiplayerIfNeeded();
    setMode(null);
    setStatus("menu");
  }

  function handleComputerTurn(currentBoard) {
    setTimeout(() => {
      const nextBoard = [...currentBoard];
      const move = getComputerMove(nextBoard, "O", difficulty, difficultyStateRef.current);
      if (move === null) return;
      nextBoard[move] = "O";

      const computerWinner = checkWinner(nextBoard);
      const computerDraw = !computerWinner && isBoardFull(nextBoard);

      setBoard(nextBoard);
      setWinner(computerWinner);
      setIsDraw(computerDraw);

      if (computerWinner || computerDraw) {
        setStatus("gameOver");
      } else {
        setTurn("X");
      }
    }, COMPUTER_MOVE_DELAY_MS);
  }

  function handleSquareClick(index) {
    if (status !== "playing" || turn !== mySymbol || board[index]) return;

    if (mode === "multiplayer") {
      socket.emit("makeMove", { index });
      return;
    }

    // Local vs-computer move.
    const nextBoard = [...board];
    nextBoard[index] = mySymbol;

    const playerWinner = checkWinner(nextBoard);
    const playerDraw = !playerWinner && isBoardFull(nextBoard);

    setBoard(nextBoard);
    setWinner(playerWinner);
    setIsDraw(playerDraw);

    if (playerWinner || playerDraw) {
      setStatus("gameOver");
      return;
    }

    setTurn("O");
    handleComputerTurn(nextBoard);
  }

  function handlePlayAgain() {
    if (mode === "computer") {
      handlePlayComputer(difficulty);
      return;
    }
    handleFindMatch();
  }

  return (
    <div className="app">
      <h1>Tic-Tac-IO</h1>

      {status === "menu" && (
        <div className="menu-buttons">
          <p className="menu-label">Play vs Computer</p>
          <button onClick={() => handlePlayComputer("easy")}>Easy</button>
          <button onClick={() => handlePlayComputer("medium")}>Medium</button>
          <button onClick={() => handlePlayComputer("impossible")}>Impossible</button>
          <p className="menu-label">Or</p>
          <button onClick={handleFindMatch}>Find a Match</button>
        </div>
      )}

      {status === "waitingForOpponent" && (
        <>
          <p>Waiting for an opponent...</p>
          <button onClick={handleBackToMenu}>Cancel</button>
        </>
      )}

      {status === "playing" && (
        <>
          <p>
            You are {mySymbol}
            {mode === "computer" && ` · ${DIFFICULTY_LABELS[difficulty]} computer`}
          </p>
          <p>{turn === mySymbol ? "Your turn" : "Opponent's turn"}</p>
          <Board
            board={board}
            onSquareClick={handleSquareClick}
            previewSymbol={turn === mySymbol ? mySymbol : null}
          />
        </>
      )}

      {status === "gameOver" && (
        <>
          <Board board={board} onSquareClick={() => {}} />
          <div className="modal-overlay">
            <div className="modal-card">
              <p
                className={`modal-result ${
                  winner ? (winner === mySymbol ? "modal-result-win" : "modal-result-lose") : "modal-result-draw"
                }`}
              >
                {winner ? (winner === mySymbol ? "You win!" : "You lose!") : "It's a draw!"}
              </p>
              <div className="modal-actions">
                <button onClick={handlePlayAgain}>Play Again</button>
                <button onClick={handleBackToMenu}>Back to Menu</button>
              </div>
            </div>
          </div>
        </>
      )}

      {status === "opponentLeft" && (
        <>
          <p>Your opponent disconnected.</p>
          <button onClick={handlePlayAgain}>Find New Game</button>
          <button onClick={handleBackToMenu}>Back to Menu</button>
        </>
      )}
    </div>
  );
}

export default App;
