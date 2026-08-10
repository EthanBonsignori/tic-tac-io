import { useEffect, useState } from "react";
import { socket } from "./socket";
import Board from "./Board";
import "./App.css";

function App() {
  const [status, setStatus] = useState("waiting");
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [mySymbol, setMySymbol] = useState(null);

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

    socket.emit("findGame");

    return () => {
      socket.off("gameStart", handleGameStart);
      socket.off("gameState", handleGameState);
      socket.off("opponentLeft", handleOpponentLeft);
    };
  }, []);

  function handleSquareClick(index) {
    if (status !== "playing" || turn !== mySymbol || board[index]) return;
    socket.emit("makeMove", { index });
  }

  function handlePlayAgain() {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsDraw(false);
    setStatus("waiting");
    socket.emit("findGame");
  }

  return (
    <div className="app">
      <h1>Tic-Tac-IO</h1>

      {status === "waiting" && <p>Waiting for an opponent...</p>}

      {status === "playing" && (
        <>
          <p>You are {mySymbol}</p>
          <p>{turn === mySymbol ? "Your turn" : "Opponent's turn"}</p>
          <Board board={board} onSquareClick={handleSquareClick} />
        </>
      )}

      {status === "gameOver" && (
        <>
          <Board board={board} onSquareClick={() => {}} />
          <p>
            {winner
              ? winner === mySymbol
                ? "You win!"
                : "You lose!"
              : "It's a draw!"}
          </p>
          <button onClick={handlePlayAgain}>Play Again</button>
        </>
      )}

      {status === "opponentLeft" && (
        <>
          <p>Your opponent disconnected.</p>
          <button onClick={handlePlayAgain}>Find New Game</button>
        </>
      )}
    </div>
  );
}

export default App;
