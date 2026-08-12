import Square from "./Square";

function Board({ board, onSquareClick, previewSymbol, fadingIndices = [] }) {
  return (
    <div className="board">
      {board.map((value, index) => (
        <Square
          key={index}
          value={value}
          previewSymbol={previewSymbol}
          isFading={fadingIndices.includes(index)}
          onClick={() => onSquareClick(index)}
        />
      ))}
    </div>
  );
}

export default Board;
