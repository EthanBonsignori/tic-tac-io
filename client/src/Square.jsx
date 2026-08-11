function Square({ value, previewSymbol, onClick }) {
  const symbol = value || previewSymbol;
  const colorClass = symbol ? `square-${symbol.toLowerCase()}` : "";
  const isAvailable = !value && previewSymbol;

  return (
    <button className={`square ${colorClass} ${isAvailable ? "square-active" : ""}`} onClick={onClick}>
      {value ? value : previewSymbol && <span className="square-preview">{previewSymbol}</span>}
    </button>
  );
}

export default Square;
