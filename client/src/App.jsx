import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import Board from "./Board";
import { checkWinner, isBoardFull, createMarksState, placeMark, getFadingIndices } from "./gameLogic.js";
import { getComputerMove, createDifficultyState } from "./ai.js";
import "./App.css";

const COMPUTER_MOVE_DELAY_MS = 400;

const DIFFICULTY_LABELS = {
  easy: "Easy",
  medium: "Medium",
  impossible: "Impossible",
};

const VARIANT_LABELS = {
  classic: "Classic",
  endless: "Endless",
};

function App() {
  const [status, setStatus] = useState("menu");
  const [mode, setMode] = useState(null); // "computer" | "multiplayer"
  const [difficulty, setDifficulty] = useState(null); // "easy" | "medium" | "impossible"
  const [variant, setVariant] = useState("classic"); // "classic" | "endless"
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [mySymbol, setMySymbol] = useState(null);
  const [fadingIndices, setFadingIndices] = useState([]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const difficultyStateRef = useRef(createDifficultyState());
  const marksStateRef = useRef(createMarksState());

  useEffect(() => {
    function handleGameStart({ symbol }) {
      setMySymbol(symbol);
      setStatus("playing");
    }

    function handleGameState({ board, turn, winner, isDraw, fadingIndices }) {
      setBoard(board);
      setTurn(turn);
      setWinner(winner);
      setIsDraw(isDraw);
      setFadingIndices(fadingIndices || []);
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
    setFadingIndices([]);
    setShowLeaveConfirm(false);
    setStatus("waitingForOpponent");
    socket.emit("findGame", { mode: variant });
  }

  function handlePlayComputer(level) {
    leaveMultiplayerIfNeeded();
    difficultyStateRef.current = createDifficultyState();
    marksStateRef.current = createMarksState();
    setMode("computer");
    setDifficulty(level);
    setBoard(Array(9).fill(null));
    setTurn("X");
    setWinner(null);
    setIsDraw(false);
    setFadingIndices([]);
    setShowLeaveConfirm(false);
    setMySymbol("X");
    setStatus("playing");
  }

  function handleBackToMenu() {
    leaveMultiplayerIfNeeded();
    setMode(null);
    setShowLeaveConfirm(false);
    setStatus("menu");
  }

  function handleConfirmLeave() {
    setShowLeaveConfirm(false);
    handleBackToMenu();
  }

  function handleComputerTurn(currentBoard) {
    setTimeout(() => {
      const searchBoard = [...currentBoard];
      const move = getComputerMove(searchBoard, "O", difficulty, difficultyStateRef.current);
      if (move === null) return;

      const endless = variant === "endless";
      const result = placeMark(currentBoard, marksStateRef.current, move, "O", endless);
      marksStateRef.current = result.marksState;

      const computerWinner = checkWinner(result.board);
      const computerDraw = !computerWinner && isBoardFull(result.board);

      setBoard(result.board);
      setWinner(computerWinner);
      setIsDraw(computerDraw);
      setFadingIndices(getFadingIndices(marksStateRef.current, endless));

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
    const endless = variant === "endless";
    const result = placeMark(board, marksStateRef.current, index, mySymbol, endless);
    marksStateRef.current = result.marksState;

    const playerWinner = checkWinner(result.board);
    const playerDraw = !playerWinner && isBoardFull(result.board);

    setBoard(result.board);
    setWinner(playerWinner);
    setIsDraw(playerDraw);
    setFadingIndices(getFadingIndices(marksStateRef.current, endless));

    if (playerWinner || playerDraw) {
      setStatus("gameOver");
      return;
    }

    setTurn("O");
    handleComputerTurn(result.board);
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
          <div className="variant-toggle">
            <button
              className={variant === "classic" ? "variant-active" : ""}
              onClick={() => setVariant("classic")}
            >
              Classic
            </button>
            <button
              className={variant === "endless" ? "variant-active" : ""}
              onClick={() => setVariant("endless")}
            >
              Endless
            </button>
          </div>
          <p className="menu-label">Play vs Computer</p>
          <button className="btn-primary" onClick={() => handlePlayComputer("easy")}>
            Easy
          </button>
          <button className="btn-primary" onClick={() => handlePlayComputer("medium")}>
            Medium
          </button>
          <button className="btn-primary" onClick={() => handlePlayComputer("impossible")}>
            Impossible
          </button>
          <p className="menu-label">Or</p>
          <button className="btn-primary" onClick={handleFindMatch}>
            Find a Match
          </button>
        </div>
      )}

      {status === "waitingForOpponent" && (
        <>
          <p>Waiting for an opponent...</p>
          <button className="btn-secondary" onClick={handleBackToMenu}>
            Cancel
          </button>
        </>
      )}

      {status === "playing" && (
        <>
          <p>
            You are {mySymbol}
            {mode === "computer" && ` · ${DIFFICULTY_LABELS[difficulty]} computer`}
            {` · ${VARIANT_LABELS[variant]}`}
          </p>
          <p>{turn === mySymbol ? "Your turn" : "Opponent's turn"}</p>
          <Board
            board={board}
            onSquareClick={handleSquareClick}
            previewSymbol={turn === mySymbol ? mySymbol : null}
            fadingIndices={fadingIndices}
          />
          <button className="btn-secondary" onClick={() => setShowLeaveConfirm(true)}>
            Leave Game
          </button>

          {showLeaveConfirm && (
            <div className="modal-overlay">
              <div className="modal-card">
                <p className="modal-result">Leave game?</p>
                <p className="modal-subtext">
                  {mode === "multiplayer"
                    ? "Your opponent will be notified and the game will end."
                    : "Your progress in this game will be lost."}
                </p>
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleConfirmLeave}>
                    Yes, Leave
                  </button>
                  <button className="btn-secondary" onClick={() => setShowLeaveConfirm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {status === "gameOver" && (
        <>
          <Board board={board} onSquareClick={() => {}} fadingIndices={fadingIndices} />
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
                <button className="btn-primary" onClick={handlePlayAgain}>
                  Play Again
                </button>
                <button className="btn-secondary" onClick={handleBackToMenu}>
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {status === "opponentLeft" && (
        <>
          <p>Your opponent disconnected.</p>
          <button className="btn-primary" onClick={handlePlayAgain}>
            Find New Game
          </button>
          <button className="btn-secondary" onClick={handleBackToMenu}>
            Back to Menu
          </button>
        </>
      )}
    </div>
  );
}

export default App;
