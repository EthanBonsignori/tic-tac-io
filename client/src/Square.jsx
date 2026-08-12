function Square({ value, previewSymbol, isFading, onClick }) {
  const symbol = value || previewSymbol;
  const colorClass = symbol ? `square-${symbol.toLowerCase()}` : "";
  const isAvailable = !value && previewSymbol;

  const classes = [
    "square",
    colorClass,
    isAvailable ? "square-active" : "",
    value && isFading ? "square-fading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} onClick={onClick}>
      {value ? value : previewSymbol && <span className="square-preview">{previewSymbol}</span>}
    </button>
  );
}

export default Square;
