export function Lightbox({ photos, currentIndex, onClose, onNavigate }) {
  if (!photos || photos.length === 0 || currentIndex < 0) return null;
  const current = photos[currentIndex];
  if (!current) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  return (
    <div className="lightbox-modal" onClick={onClose}>
      <button className="modal-close" style={{ position: "absolute", top: "20px", right: "20px", color: "#fff" }} onClick={onClose} aria-label="Close">
        ✕
      </button>

      <img
        src={current.url}
        alt={current.caption || "Memory photo"}
        className="lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />

      {current.caption && (
        <p style={{ color: "#fff", marginTop: "12px", background: "rgba(0,0,0,0.6)", padding: "6px 14px", borderRadius: "8px" }}>
          {current.caption}
        </p>
      )}

      <div className="lightbox-controls" onClick={(e) => e.stopPropagation()}>
        {hasPrev && (
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate(currentIndex - 1)}>
            ‹ Previous
          </button>
        )}
        <span style={{ color: "#fff", fontSize: "0.85rem" }}>
          {currentIndex + 1} / {photos.length}
        </span>
        {hasNext && (
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate(currentIndex + 1)}>
            Next ›
          </button>
        )}
      </div>
    </div>
  );
}
