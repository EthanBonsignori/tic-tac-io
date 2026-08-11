import Square from "./Square";

function Board({ board, onSquareClick, previewSymbol }) {
  return (
    <div className="board">
      {board.map((value, index) => (
        <Square
          key={index}
          value={value}
          previewSymbol={previewSymbol}
          onClick={() => onSquareClick(index)}
        />
      ))}
    </div>
  );
}

export default Board;
