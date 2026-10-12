import { useState } from "react";

// Web Audio sound synthesizer for card fanning / gathering rustle
function playCardSound(type = "fan") {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const duration = type === "fan" ? 0.22 : 0.16;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(type === "fan" ? 1200 : 700, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    setTimeout(() => {
      try { ctx.close(); } catch (_) {}
    }, 300);
  } catch (_) {}
}

const ROTATIONS = [-6, 5, -3, 6, -2, 4, -5, 3];

export function PhotoBouquet({
  photos = [],
  title = "",
  date = "",
  onPhotoClick,
  className = "",
  lang = "ar",
  isAr: isArProp,
}) {
  const isAr = isArProp !== undefined ? isArProp : lang === "ar";
  const [isFanned, setIsFanned] = useState(false);

  if (!photos || photos.length === 0) return null;

  // Single photo fallback: simple elegant card
  if (photos.length === 1) {
    const p = photos[0];
    const url = typeof p === "string" ? p : p.url;
    return (
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md bg-surface-container group cursor-pointer ${className}`}
        onClick={() => onPhotoClick && onPhotoClick(0)}
      >
        <img
          src={url}
          alt={title || "Photo"}
          className="w-full h-56 sm:h-64 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {title && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-white">
            <p className="text-xs font-semibold truncate">{title}</p>
          </div>
        )}
      </div>
    );
  }

  const handleToggle = (e) => {
    e.stopPropagation();
    const nextState = !isFanned;
    setIsFanned(nextState);
    playCardSound(nextState ? "fan" : "gather");
  };

  const previewPhotos = photos.slice(0, 8);

  return (
    <div className={`flex flex-col items-center w-full my-2 ${className}`}>
      {/* Bouquet Stack / Fanned Cards Container */}
      {!isFanned ? (
        /* ========================================================= */
        /* STACKED BOUQUET VIEW (الوضع الملموم / بوكيه الكروت المتراكمة) */
        /* ========================================================= */
        <div
          onClick={handleToggle}
          className="relative w-full max-w-[280px] sm:max-w-[320px] h-64 sm:h-72 cursor-pointer group select-none flex items-center justify-center my-4"
          title={isAr ? "اضغط لفرد كروت البوكيه زي كوتشينة 🎴" : "Click to fan out cards like a deck 🎴"}
        >
          {previewPhotos.map((p, idx) => {
            const url = typeof p === "string" ? p : p.url;
            const rot = ROTATIONS[idx % ROTATIONS.length];
            const isTop = idx === 0;
            const offsetIdx = previewPhotos.length - 1 - idx;
            const zIdx = previewPhotos.length - idx;

            return (
              <div
                key={idx}
                className="absolute inset-0 rounded-2xl overflow-hidden border-4 border-white shadow-xl transition-all duration-300 group-hover:scale-105"
                style={{
                  transform: `rotate(${rot}deg) translateY(${offsetIdx * 2}px) translateX(${offsetIdx * -1}px)`,
                  zIndex: zIdx,
                  backgroundColor: "#fcf9f2",
                }}
              >
                <img
                  src={url}
                  alt={p.caption || title || `Photo ${idx + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Subtle vignette on lower cards */}
                {!isTop && (
                  <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                )}

                {/* Top card watermark / title */}
                {isTop && (
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white flex items-center justify-between">
                    <span className="text-xs font-bold truncate max-w-[170px] drop-shadow-sm">
                      {title || (isAr ? "بوكيه ذكرياتنا" : "Memories Bouquet")}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/90 text-on-primary text-[10px] font-bold shadow-xs">
                      {photos.length} {isAr ? "صور" : "photos"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Floating Action Badge Hint */}
          <div className="absolute -bottom-3 z-30 px-3.5 py-1.5 rounded-full bg-surface-container-high/95 backdrop-blur-md border border-primary/30 text-primary text-xs font-bold shadow-lg flex items-center gap-1.5 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:scale-105">
            <span className="material-symbols-outlined text-[16px]">view_carousel</span>
            <span>{isAr ? "اضغط لفرد الكوتشينة 🎴" : "Tap to fan cards 🎴"}</span>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* FANNED OUT CARDS VIEW (الوضع المفرود / ورق كوتشينة مفرود)   */
        /* ========================================================= */
        <div className="w-full flex flex-col items-center space-y-3 animate-in fade-in zoom-in-95 duration-300 select-none">
          {/* Header Bar with Gather Button */}
          <div className="w-full flex items-center justify-between px-2 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[18px]">style</span>
              <span>
                {isAr
                  ? `كوتشينة مفرودة • ${photos.length} صور`
                  : `Fanned Deck • ${photos.length} photos`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggle}
              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:opacity-95 text-xs font-bold shadow-sm flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">layers</span>
              <span>{isAr ? "لم البوكيه 💐" : "Gather Bouquet 💐"}</span>
            </button>
          </div>

          {/* Horizontal Fanned Cards Deck / Grid */}
          <div className="w-full flex items-center gap-3 overflow-x-auto py-3 px-2 scrollbar-none snap-x snap-mandatory">
            {photos.map((p, idx) => {
              const url = typeof p === "string" ? p : p.url;
              const rot = ROTATIONS[idx % ROTATIONS.length] * 0.7;

              return (
                <div
                  key={idx}
                  onClick={() => onPhotoClick && onPhotoClick(idx)}
                  className="flex-shrink-0 w-44 sm:w-52 h-64 sm:h-72 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-[#fcf9f2] cursor-pointer transition-all duration-300 hover:scale-105 hover:z-30 hover:rotate-0 snap-center relative group"
                  style={{
                    transform: `rotate(${rot}deg)`,
                  }}
                  title={isAr ? "اضغط لتكبير الصورة" : "Tap to zoom"}
                >
                  <img
                    src={url}
                    alt={p.caption || `Card ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Card Index Tag */}
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold flex items-center justify-center border border-white/20">
                    {idx + 1}
                  </div>

                  {/* Caption Overlay */}
                  {p.caption && (
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                      <p className="text-[11px] font-semibold truncate leading-tight">
                        {p.caption}
                      </p>
                    </div>
                  )}

                  {/* Zoom Icon on Hover */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl drop-shadow-md">
                      zoom_in
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-on-surface-variant text-center font-medium">
            {isAr
              ? "اسحب لليمين واليسار لتصفح الكروت • اضغط على أي كارت للتكبير"
              : "Swipe cards horizontally • Tap any card to view full size"}
          </p>
        </div>
      )}
    </div>
  );
}
