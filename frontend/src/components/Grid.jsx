function Grid({ items, renderCard, emptyMessage = "No items to display." }) {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    justifyContent: 'start',
    gap: '1.5rem',
  };

  const emptyStyle = {
    color: '#888',
    fontSize: '1rem',
    padding: '2rem 1rem',
    textAlign: 'center',
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