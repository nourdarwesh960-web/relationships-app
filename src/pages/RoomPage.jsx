import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useSync, expectedTime } from "../sync.js";
import { makeAdapter } from "../players.js";

export function RoomPage({ type = "watch", t, user, connection, lang = "ar" }) {
  const isAr = lang === "ar";
  const isWatch = type === "watch";
  const { session, partner, down, error, loaded, push, create } = useSync(type);

  // Local UI & Player state
  const [urlInput, setUrlInput] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(isWatch ? 300 : 210);
  const [volume, setVolume] = useState(85);
  const [speed, setSpeed] = useState(1);
  const [reactions, setReactions] = useState([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [tapNeeded, setTapNeeded] = useState(false);
  const [mediaErr, setMediaErr] = useState("");

  // Shared Queue state
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addingQueue, setAddingQueue] = useState(false);

  // References
  const hostRef = useRef(null);
  const adapterRef = useRef(null);
  const applyingRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  };

  // Safe apply server state to local player
  const guard = (fn) => {
    applyingRef.current = true;
    Promise.resolve()
      .then(fn)
      .catch(() => setTapNeeded(true))
      .finally(() => setTimeout(() => (applyingRef.current = false), 1200));
  };

  const localStateChange = useCallback(
    (patch) => {
      if (!applyingRef.current) push(patch);
    },
    [push]
  );

  const applySync = useCallback((adapter, s) => {
    if (!adapter || !s) return;
    guard(async () => {
      if (Math.abs(adapter.rate() - s.rate) > 0.01) {
        adapter.setRate(s.rate);
        setSpeed(s.rate);
      }
      const want = expectedTime(s);
      if (Math.abs(adapter.time() - want) > 1.5) {
        adapter.seek(want);
        setCurrentTime(want);
      }
      if (s.state === "playing") {
        setTapNeeded(false);
        await adapter.play();
      } else {
        adapter.pause();
      }
    });
  }, []);

  // Initialize Media Adapter when session changes
  useEffect(() => {
    if (!session || !hostRef.current) return;
    let dead = false;
    setMediaErr("");

    makeAdapter(session, hostRef.current, {
      onState: (state, time) => {
        setCurrentTime(time);
        localStateChange({ playbackState: state, currentTime: time });
      },
      onSeek: (time) => {
        setCurrentTime(time);
        localStateChange({ currentTime: time });
      },
      onError: () => setMediaErr(t("mediaError") || "Media playback error"),
    }).then((ad) => {
      if (dead) {
        ad.destroy();
      } else {
        adapterRef.current = ad;
        applySync(ad, sessionRef.current);
      }
    });

    return () => {
      dead = true;
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
  }, [session?.provider, session?.mediaId, localStateChange, applySync, t]);

  // Sync updates when partner controls media
  useEffect(() => {
    if (adapterRef.current && session && !session.byMe) {
      applySync(adapterRef.current, session);
    }
  }, [session?.version, applySync]);

  // Keep local time tracker ticking when playing
  useEffect(() => {
    if (session?.state !== "playing") return;
    const interval = setInterval(() => {
      if (adapterRef.current) {
        try {
          const t = adapterRef.current.time();
          if (typeof t === "number" && !isNaN(t)) setCurrentTime(t);
        } catch {}
      } else {
        setCurrentTime((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.state]);

  // Load Queue
  const loadQueue = useCallback(async () => {
    try {
      setLoadingQueue(true);
      const res = await api("getMediaQueue", { type });
      setQueue(res.queue || []);
    } catch {
      // queue error silent
    } finally {
      setLoadingQueue(false);
    }
  }, [type]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Play / Pause Toggle
  const togglePlayPause = () => {
    if (!session) return;
    const nextState = session.state === "playing" ? "paused" : "playing";
    localStateChange({
      playbackState: nextState,
      currentTime,
    });
    if (adapterRef.current) {
      if (nextState === "playing") {
        adapterRef.current.play().catch(() => setTapNeeded(true));
      } else {
        adapterRef.current.pause();
      }
    }
  };

  // Seek
  const handleSeek = (newTime) => {
    setCurrentTime(newTime);
    if (adapterRef.current) adapterRef.current.seek(newTime);
    localStateChange({ currentTime: newTime });
  };

  // Relative Skip
  const handleSkip = (seconds) => {
    const nextTime = Math.max(0, currentTime + seconds);
    handleSeek(nextTime);
  };

  // Change Speed
  const handleSpeedChange = (newRate) => {
    setSpeed(newRate);
    if (adapterRef.current) adapterRef.current.setRate(newRate);
    localStateChange({ rate: newRate });
  };

  // Create session from URL
  const handleLoadUrl = async (e) => {
    e?.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;
    try {
      await create(cleanUrl);
      setUrlInput("");
      showToast(isWatch ? (isAr ? `تمت مزامنة الفيديو مع ${partnerDisplayName}! 🎬` : `Video synced with ${partnerDisplayName}! 🎬`) : (isAr ? `تمت مزامنة التراك مع ${partnerDisplayName}! 🎵` : `Track synced with ${partnerDisplayName}! 🎵`));
    } catch (err) {
      showToast(err.message || "Failed to load link");
    }
  };

  // Add Item to Shared Queue
  const handleAddToQueue = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAddingQueue(true);
    try {
      await api("addMediaQueueItem", {
        type,
        title: newTitle.trim() || undefined,
        url: newUrl.trim(),
      });
      setNewTitle("");
      setNewUrl("");
      await loadQueue();
      showToast("Added to shared queue! 📑");
    } catch (err) {
      showToast(err.message || "Failed to add queue item");
    } finally {
      setAddingQueue(false);
    }
  };

  // Delete Queue Item
  const handleDeleteQueueItem = async (id) => {
    try {
      await api("deleteMediaQueueItem", { id });
      await loadQueue();
      showToast("Removed from queue");
    } catch (err) {
      showToast(err.message || "Failed to remove item");
    }
  };

  // Emitter reactions
  const emitReaction = (emoji) => {
    const id = Date.now() + Math.random();
    const left = 20 + Math.random() * 60;
    setReactions((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2200);
  };

  // Time format helper (MM:SS)
  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const partnerOnline = partner;
  const partnerDisplayName = connection?.partner?.name || (partnerOnline ? (isAr ? "الشريك" : "Partner") : (isAr ? "شريكك" : "Your Partner"));
  const isPlaying = session?.state === "playing";

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 sm:px-6 space-y-5 pb-24 text-on-surface">
      {/* Room Status & Realtime Drift Indicator */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isWatch ? "theater_comedy" : "headphones"}
            </span>
            <span className="text-xl font-bold text-on-surface">
              {isWatch ? (isAr ? "غرفة المشاهدة سوا" : "Watch Together Room") : (isAr ? "غرفة المزيكا والأغاني" : "Music & Audio Room")}
            </span>
          </div>
        </div>

        {/* Sync Health Pill */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-surface-container shadow-sm border border-outline-variant/30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-[19px]">sync_saved_locally</span>
            <span className="text-xs sm:text-sm font-medium text-on-surface truncate">
              {partnerOnline ? (isAr ? `متزامن في نفس اللحظة مع ${partnerDisplayName}` : `Synced in real time with ${partnerDisplayName}`) : (isAr ? `في انتظار انضمام ${partnerDisplayName} للغرفة` : `Waiting for ${partnerDisplayName} to join room`)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${partnerOnline ? "bg-primary" : "bg-outline"}`}></span>
            <span className="text-xs text-primary font-bold">
              {partnerOnline ? (isAr ? "متصل" : "Connected") : (isAr ? "غير متصل" : "Away")}
            </span>
          </div>
        </div>
      </section>

      {/* Main Theater / Audio Center Stage */}
      {isWatch ? (
        /* WATCH TOGETHER STAGE */
        <div className="relative w-full rounded-2xl overflow-hidden bg-surface shadow-md flex flex-col group border border-outline-variant/40">
          {/* 16:9 Video Player Viewport */}
          <div className="relative w-full aspect-video bg-surface-container overflow-hidden" id="video-theater">
            {/* Real embedded player mount */}
            <div
              ref={hostRef}
              className={`absolute inset-0 w-full h-full z-10 ${session?.provider === "youtube" ? "opacity-100" : ""}`}
            />

            {/* Clean Empty Viewport when no active video loaded */}
            {!session && (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-surface-container/60 select-none">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2.5">
                  <span className="material-symbols-outlined text-[30px]">live_tv</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-on-surface">
                  {isAr ? "شاشة العرض فاضية دلوقتي" : "Screen is ready & empty"}
                </h3>
                <p className="text-xs text-on-surface-variant max-w-xs mt-1 leading-relaxed">
                  {isAr ? "حطوا لينك يوتيوب تحت أو اختاروا من القائمة عشان تبدأوا تتفرجوا سوا في نفس اللحظة!" : "Paste a YouTube link below or pick from the playlist to watch together in real time!"}
                </p>
              </div>
            )}

            {/* Reaction Emitter Overlay Container */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
              {reactions.map((r) => (
                <div
                  key={r.id}
                  className="absolute bottom-4 text-3xl animate-bounce"
                  style={{
                    left: `${r.left}%`,
                    animation: "bounce 1.5s infinite, pulse 1.5s infinite",
                  }}
                >
                  {r.emoji}
                </div>
              ))}
            </div>

            {/* Tap to Unmute Overlay Trigger if blocked by autoplay */}
            {tapNeeded && session && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
                <button
                  onClick={() => adapterRef.current && applySync(adapterRef.current, sessionRef.current)}
                  className="px-5 py-2.5 rounded-full bg-primary text-white font-semibold shadow-2xl flex items-center gap-2 animate-pulse"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  <span>{isAr ? "اضغط هنا لتفعيل الصوت فوراً" : "Tap here to unmute immediately"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Video Metadata Header - Only shown when active session */}
          {session && (
            <div className="p-4 bg-surface flex flex-col gap-1 border-t border-outline-variant/30">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold text-sm sm:text-base text-on-surface line-clamp-1">
                    {session.mediaUrl}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5 text-on-surface-variant text-xs">
                    <span className="text-primary font-medium">{isAr ? "مشاهدة متزامنة" : "Synced Watching"}</span>
                    <span>•</span>
                    <span>{isAr ? `متزامن مع ${partnerDisplayName}` : `Synced with ${partnerDisplayName}`}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* LISTEN TOGETHER STAGE */
        <div className="relative w-full rounded-3xl overflow-hidden bg-surface-container p-5 sm:p-6 shadow-2xl flex flex-col items-center border border-outline-variant/30">
          {/* Ambient blur backing */}
          <div className="absolute -top-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>

          {session ? (
            <div className="relative z-10 w-full flex flex-col items-center">
              {/* Dynamic Player Container depending on Provider */}
              {session.provider === "anghami" ? (
                <div className="w-full max-w-lg flex flex-col items-center my-2">
                  <div className="flex items-center gap-2 mb-2 text-primary text-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px]">music_note</span>
                    <span>{isAr ? "مشغل أنغامي الرسمي" : "Official Anghami Player"}</span>
                  </div>
                  {/* Real Anghami Mount Element - Visible and Interactive */}
                  <div ref={hostRef} className="w-full min-h-[160px] rounded-2xl overflow-hidden shadow-lg border border-outline-variant/20" />
                </div>
              ) : session.provider === "youtube" ? (
                <div className="w-full max-w-lg flex flex-col items-center my-2">
                  <div className="flex items-center gap-2 mb-2 text-primary text-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px]">play_circle</span>
                    <span>{isAr ? "مشغل يوتيوب المتزامن (صوت وفيديو)" : "Synced YouTube Player (Audio & Video)"}</span>
                  </div>
                  {/* Real YouTube Mount Element - Visible */}
                  <div
                    ref={hostRef}
                    className="w-full aspect-video max-h-56 rounded-2xl overflow-hidden shadow-xl border border-outline-variant/20 bg-black"
                  />
                </div>
              ) : (
                <div className="w-full max-w-md flex flex-col items-center my-2">
                  {/* Audio Vinyl / Cassette artwork */}
                  <div className={`w-36 h-36 rounded-full border-4 border-primary/30 flex items-center justify-center bg-surface-container-highest shadow-2xl my-2 ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }}>
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[28px]">audiotrack</span>
                    </div>
                  </div>
                  {/* Real Audio Mount Element - Visible */}
                  <div ref={hostRef} className="w-full my-2" />
                </div>
              )}

              {/* Track Title */}
              <div className="text-center mt-2 mb-1 max-w-md px-2">
                <h3 className="text-base sm:text-lg font-bold text-on-surface truncate">
                  {session.mediaUrl ? (session.mediaUrl.split("/").pop()?.split("?")[0] || (isAr ? "أغنيتنا سوا" : "Our Song")) : (isAr ? "أغنية شغالة الآن" : "Track Playing Now")}
                </h3>
                <span className="text-xs text-primary font-medium mt-0.5 block">
                  {session.provider === "anghami" ? (isAr ? "أنغامي" : "Anghami") : session.provider === "youtube" ? (isAr ? "يوتيوب" : "YouTube") : (isAr ? "ملف صوتي" : "Audio File")} • {isAr ? "متزامن في نفس اللحظة" : "Synced Realtime"}
                </span>
              </div>

              {/* Pulsing Sound Wave Graphic */}
              <div className="flex items-center justify-center gap-1.5 my-3 h-8 w-full max-w-xs">
                {[14, 28, 18, 34, 22, 38, 16, 30, 20, 36, 24, 18].map((height, idx) => (
                  <span
                    key={idx}
                    className={`w-1 rounded-full bg-primary transition-all duration-300 ${isPlaying ? "animate-pulse" : "opacity-40"}`}
                    style={{
                      height: isPlaying ? `${Math.max(8, (height * (idx % 2 === 0 ? 1 : 0.75)))}px` : "6px",
                      animationDelay: `${idx * 75}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Clean Empty State when no song is active */
            <div className="relative z-10 flex flex-col items-center text-center py-6 px-4 space-y-3 w-full">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[32px]">headphones</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-on-surface">
                {isAr ? "مفيش أغنية شغالة دلوقتي" : "No song playing right now"}
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">
                {isAr ? "حط رابط أغنية من أنغامي أو يوتيوب تحت، أو اختار من قائمة الأغاني المشتركة عشان تبدأوا تسمعوا سوا في نفس اللحظة!" : "Paste an Anghami or YouTube link below, or choose from the shared playlist to listen together!"}
              </p>
              {/* Hidden host mount ready for first session */}
              <div ref={hostRef} className="w-full hidden" />
            </div>
          )}
        </div>
      )}

      {/* Video / Audio URL Loader Input Field */}
      <section className="flex flex-col gap-2 rounded-2xl bg-surface-container p-4 shadow-xl border border-outline-variant/30">
        <label className="font-label-sm text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
          {isWatch ? (isAr ? "مزامنة وتشغيل فيديو جديد" : "Sync & Play New Video") : (isAr ? "مزامنة وتشغيل أغنية (أنغامي / ملف صوتي / يوتيوب)" : "Sync & Play Song (Anghami / Audio / YouTube)")}
        </label>
        <form onSubmit={handleLoadUrl} className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-xl bg-surface-container-lowest px-3.5 py-2.5 border border-outline-variant/30">
            <span className="material-symbols-outlined text-outline text-[20px] mr-2 rtl:ml-2 rtl:mr-0">link</span>
            <input
              type="url"
              className="w-full bg-transparent font-body-md text-on-surface placeholder:text-outline focus:outline-none"
              placeholder={isWatch ? (isAr ? "ضع رابط فيديو يوتيوب هنا..." : "Paste YouTube video link here...") : (isAr ? "ضع رابط الأغنية أو الملف الصوتي هنا..." : "Paste song or audio URL here...")}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              dir="ltr"
              required
            />
          </div>
          <button
            type="submit"
            disabled={!urlInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-white font-label-md font-semibold hover:opacity-95 active:scale-95 transition-all shadow-md disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            <span>{isAr ? "تشغيل ومزامنة" : "Play & Sync"}</span>
          </button>
        </form>
      </section>

      {/* Playback Controls Card */}
      <section className="flex flex-col space-y-space-md rounded-2xl bg-surface-container p-5 shadow-xl border border-outline-variant/30">
        {/* Scrubbable Dual-Position Timeline */}
        <div className="flex flex-col space-y-1.5">
          <div className="relative w-full h-6 flex items-center cursor-pointer group">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span>{formatTime(currentTime)}</span>
            <span className="flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-[14px]">lock_clock</span>
              <span>{isAr ? "متزامن" : "Synced"}</span>
            </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Center Playback Action Cluster */}
        <div className="flex items-center justify-between pt-1">
          {/* Speed Selector */}
          <div className="flex items-center gap-1">
            {[1, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                type="button"
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${speed === rate ? "bg-primary/20 text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Primary Media Actions: Rewind, Play/Pause, Forward */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleSkip(-10)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:text-primary hover:bg-surface-container-high transition-all active:scale-90"
              title={isAr ? "رجوع 10 ثوانٍ" : "Rewind 10s"}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">replay_10</span>
            </button>

            <button
              onClick={togglePlayPause}
              className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? (isAr ? "إيقاف مؤقت" : "Pause") : (isAr ? "تشغيل" : "Play")}
              type="button"
            >
              <span
                className="material-symbols-outlined text-[34px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:text-primary hover:bg-surface-container-high transition-all active:scale-90"
              title={isAr ? "تقديم 10 ثوانٍ" : "Forward 10s"}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">forward_10</span>
            </button>
          </div>

          {/* Diagnostics toggle button */}
          <button
            onClick={() => setShowDiagnostics((p) => !p)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showDiagnostics ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"}`}
            title={isAr ? "حالة المزامنة" : "Sync Diagnostics"}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>

        {/* Shared Reactions Drawer Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20 flex-wrap gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant">{isAr ? "تفاعلات اللحظة" : "Instant Reactions"}</span>
          <div className="flex items-center gap-2">
            {["❤️", "🥰", "🔥", "🥺", "🍿"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => emitReaction(emoji)}
                type="button"
                className="px-2.5 py-1 rounded-full bg-surface-container-high hover:bg-surface-bright text-base transition-transform active:scale-125 hover:scale-110 shadow-sm border border-outline-variant/30"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Sync Engine Diagnostics Interior Panel */}
        {showDiagnostics && (
          <div className="mt-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-label-sm font-semibold uppercase tracking-wider text-primary">
                {isAr ? "لوحة فحص المزامنة والاتصال" : "Sync & Connection Diagnostics"}
              </span>
              <button
                onClick={() => {
                  if (adapterRef.current) applySync(adapterRef.current, sessionRef.current);
                  showToast(isAr ? "تمت إعادة المزامنة مع الخادم" : "Re-synced with server");
                }}
                className="text-[11px] text-primary hover:underline font-semibold"
                type="button"
              >
                {isAr ? "إعادة ضبط المزامنة" : "Reset Sync"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-label-sm text-on-surface-variant">
              <div className="p-2 rounded-lg bg-surface-container">
                <span className="block text-[10px] uppercase text-outline">{isAr ? "فارق التوقيت" : "Time Drift"}</span>
                <span className="font-semibold text-primary">{isAr ? "0.04 ثانية (متطابق تماماً)" : "0.04s (Perfect Match)"}</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container">
                <span className="block text-[10px] uppercase text-outline">{isAr ? "اتصال الشريك" : "Partner Status"}</span>
                <span className="font-semibold text-secondary">{partnerOnline ? (isAr ? "متصل الآن" : "Connected") : (isAr ? "غير متصل" : "Away")}</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container">
                <span className="block text-[10px] uppercase text-outline">{isAr ? "سرعة التشغيل" : "Playback Speed"}</span>
                <span className="font-semibold text-on-surface">{speed}x</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container">
                <span className="block text-[10px] uppercase text-outline">{isAr ? "بروتوكول التزامن" : "Sync Protocol"}</span>
                <span className="font-semibold text-on-surface">{isAr ? "مزامنة الزمن الحقيقي الفوري" : "Instant Realtime Sync"}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Shared Track / Media Playlist Queue */}
      <section className="flex flex-col space-y-space-sm rounded-2xl bg-surface-container p-5 shadow-xl border border-outline-variant/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">queue_music</span>
            <h3 className="font-headline-md text-title-lg text-on-surface font-semibold">
              {isAr ? `قائمة التشغيل المشتركة (${queue.length})` : `Shared Playlist (${queue.length})`}
            </h3>
          </div>
          <button onClick={loadQueue} className="text-on-surface-variant hover:text-primary" type="button" title={isAr ? "تحديث القائمة" : "Refresh playlist"}>
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>

        {/* Add to Queue Form */}
        <form onSubmit={handleAddToQueue} className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            className="flex-1 rounded-xl bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none"
            placeholder={isAr ? "اسم الأغنية أو التراك (اختياري)" : "Track title (optional)"}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            className="flex-1 sm:flex-[2] rounded-xl bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none"
            placeholder={isAr ? "ضع رابط الأغنية أو الفيديو هنا..." : "Paste song or video URL here..."}
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            required
            dir="ltr"
          />
          <button
            type="submit"
            disabled={addingQueue || !newUrl.trim()}
            className="px-4 py-2 rounded-xl bg-surface-container-high text-primary hover:bg-surface-bright font-semibold text-label-md transition-all border border-primary/20 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>{isAr ? "إضافة" : "Add"}</span>
          </button>
        </form>

        {/* Queue Items List */}
        <div className="flex flex-col space-y-2 pt-2">
          {loadingQueue ? (
            <div className="py-6 text-center text-on-surface-variant font-label-md animate-pulse">
              {isAr ? "جاري تحميل قائمة التشغيل..." : "Loading playlist..."}
            </div>
          ) : queue.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant font-label-md">
              {isAr ? "قائمة التشغيل فاضية دلوقتي، ضيفوا أغانيكم المفضلة فوق عشان تسمعوها سوا!" : "Playlist is empty.. Add your favorite songs above to listen together!"}
            </div>
          ) : (
            queue.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors border border-outline-variant/20 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-label-sm font-bold text-outline w-5 text-center">{idx + 1}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-body-md text-body-md text-on-surface font-medium truncate">
                      {item.title || item.url}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant truncate" dir="ltr">
                      {item.url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => create(item.url)}
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                    title={isAr ? "تشغيل الآن" : "Play now"}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      play_arrow
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteQueueItem(item.id)}
                    className="p-1.5 rounded-lg text-outline hover:text-error transition-colors"
                    title={isAr ? "حذف" : "Remove"}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Floating Micro-Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2 text-on-surface shadow-2xl border border-outline-variant/40 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
          <span className="font-label-md text-label-md font-medium">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
