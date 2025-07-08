function Grid({ items, renderCard, emptyMessage = "No items to display." }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, max-content))",
    justifyContent: "start",
    alignItems: "start",
    gap: "1.5rem",
  };

  const emptyStyle = {
    color: "#888",
    fontSize: "1rem",
    padding: "2rem 1rem",
    textAlign: "center",
  };

  return items.length === 0 ? (
    <div style={emptyStyle}>{emptyMessage}</div>
  ) : (
    <div style={gridStyle}>
      {items.map((item, idx) => renderCard(item, idx))}
    </div>
  );
}

export default Grid;
