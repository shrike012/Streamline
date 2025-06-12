function VideoGrid({ items, renderCard, emptyMessage = "No videos to display." }) {
  return (
    <div className="card-grid">
      {items.length === 0 ? (
        <div className="grid-empty">{emptyMessage}</div>
      ) : (
        items.map((item, idx) => renderCard(item, idx))
      )}
    </div>
  );
}

export default VideoGrid;