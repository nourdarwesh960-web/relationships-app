import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { normalizeToDate, formatDateToIso } from "../dateUtils.js";

export { normalizeToDate, formatDateToIso } from "../dateUtils.js";

function useLiveCounter(startDateStr) {
  const [elapsed, setElapsed] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    hasDate: false,
  });

  useEffect(() => {
    const dateObj = normalizeToDate(startDateStr);
    if (!dateObj) {
      setElapsed({ days: 0, hours: 0, minutes: 0, seconds: 0, hasDate: false });
      return;
    }

    const startMs = dateObj.getTime();

    const calc = () => {
      const now = Date.now();
      const diffMs = Math.max(0, now - startMs);
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setElapsed({ days, hours, minutes, seconds, hasDate: true });
    };

    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [startDateStr]);

  return elapsed;
}

export function Dashboard({ t, user, connection, onConnectionUpdated, lang = "ar" }) {
  const isAr = lang === "ar";
  const navigate = useNavigate();
  const [data, setData] = useState({
    memories: [],
    photos: [],
    activities: [],
    playlist: [],
    loading: true,
  });

  const [toastMsg, setToastMsg] = useState("");
  const [heartPulsing, setHeartPulsing] = useState(false);

  // Clean legacy unscoped keys to prevent cross-room leaks
  useEffect(() => {
    try {
      localStorage.removeItem("rel_local_album_photos");
      localStorage.removeItem("rel_local_album_photos_guest");
      localStorage.removeItem("rel_storybook_config");
      localStorage.removeItem("rel_storybook_config_guest");
    } catch (_) {}
  }, []);

  // Room Creation state when connection is not yet created
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomStartDate, setNewRoomStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Start Date Picker State (always normalized to YYYY-MM-DD for HTML input)
  const [customStartDate, setCustomStartDate] = useState(() => {
    const raw = connection?.startDate || connection?.relationshipStartDate || "";
    return formatDateToIso(raw);
  });
  const [savingDate, setSavingDate] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Auto-sync start date across both partners
  useEffect(() => {
    const raw = connection?.startDate || connection?.relationshipStartDate;
    if (raw) {
      const iso = formatDateToIso(raw);
      if (iso) setCustomStartDate(iso);
    } else if (connection?.connectionId) {
      const cached = localStorage.getItem(`rel_start_date_${connection.connectionId}`);
      if (cached) {
        const iso = formatDateToIso(cached);
        if (iso) setCustomStartDate(iso);
      }
      api("getNote", { title: "__relationship_start_date__" })
        .then((res) => {
          if (res?.note?.content) {
            const iso = formatDateToIso(res.note.content);
            if (iso) {
              setCustomStartDate(iso);
              if (connection) {
                connection.startDate = iso;
                connection.relationshipStartDate = iso;
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [connection?.startDate, connection?.relationshipStartDate, connection?.connectionId]);

  // Partner Join State
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState("");

  // Simple Playlist State
  const [songInput, setSongInput] = useState("");
  const [addingSong, setAddingSong] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  };

  const partnerJoined = !!connection?.partnerJoined;
  const partnerName = connection?.partner?.name || (partnerJoined ? (isAr ? "الشريك" : "Partner") : "");
  const pairCode = connection?.connectionId || "";

  // Live ticking relationship counter
  const activeStartDate = customStartDate || connection?.startDate || connection?.relationshipStartDate;
  const counter = useLiveCounter(activeStartDate);

  // Load dashboard data from Google Sheets & Local storage
  async function loadDashboardData() {
    try {
      const [memRes, photoRes, actRes, queueRes] = await Promise.allSettled([
        api("getMemories"),
        api("getPhotos"),
        api("getActivities"),
        api("getMediaQueue", { type: "listen" }),
      ]);

      const memories = memRes.status === "fulfilled" && memRes.value?.memories ? memRes.value.memories : [];
      let photos = photoRes.status === "fulfilled" && photoRes.value?.photos ? [...photoRes.value.photos] : [];
      const activities = actRes.status === "fulfilled" && actRes.value?.activities ? actRes.value.activities : [];
      const playlist = queueRes.status === "fulfilled" && queueRes.value?.queue ? queueRes.value.queue : [];

      // Merge memory photos and cached local album photos for maximum reliability
      if (memories.length > 0) {
        memories.forEach((m) => {
          if (m.photoUrl && !photos.some((p) => p.url === m.photoUrl)) {
            photos.push({ id: m.coverPhotoId || m.id, url: m.photoUrl, caption: m.title });
          } else if (Array.isArray(m.photos)) {
            m.photos.forEach((ph) => {
              if (ph && ph.url && !photos.some((p) => p.url === ph.url)) {
                photos.push(ph);
              }
            });
          }
        });
      }

      try {
        const connKey = connection?.connectionId || "guest";
        const localAlbumStr = localStorage.getItem(`rel_local_album_photos_${connKey}`);
        if (localAlbumStr) {
          const localList = JSON.parse(localAlbumStr);
          if (Array.isArray(localList)) {
            localList.forEach((lp) => {
              if (lp && lp.url && !photos.some((p) => p.url === lp.url)) {
                photos.unshift(lp);
              }
            });
          }
        }
      } catch (e) {}

      setData({
        memories,
        photos,
        activities,
        playlist,
        loading: false,
      });
    } catch {
      setData((p) => ({ ...p, loading: false }));
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [connection?.connectionId]);

  // Copy pairing code
  const handleCopyCode = () => {
    if (!pairCode) return;
    navigator.clipboard.writeText(pairCode);
    showToast(isAr ? "اتنسخ كود الارتباط!" : "Pairing code copied!");
  };

  // Share pairing link
  const handleShareLink = () => {
    if (!pairCode) return;
    const shareUrl = `${window.location.origin}/#/register?invite=${pairCode}`;
    if (navigator.share) {
      navigator
        .share({
          title: isAr ? "ركننا الخاص" : "Our Private Sanctuary",
          text: (isAr ? "تعال نشارك ركننا الخاص.. كود الارتباط: " : "Join our private sanctuary.. Invite code: ") + pairCode,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast(isAr ? "اتنسخ رابط الدعوة!" : "Invite link copied!");
    }
  };

  // Send playful heartbeat
  const handleSendHeartbeat = () => {
    setHeartPulsing(true);
    setTimeout(() => setHeartPulsing(false), 1200);
    showToast(isAr ? `بعتّ نبضة حب لـ ${partnerName || "شريكك"} ❤️` : `Sent a love pulse to ${partnerName || "your partner"} ❤️`);
  };

  // Join partner with code
  const handleJoinPartner = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinErr("");
    try {
      await api("joinConnection", { code: joinCode.trim() });
      showToast(isAr ? "تم ربط الحساب بنجاح!" : "Successfully connected!");
      window.location.reload();
    } catch (err) {
      setJoinErr(err.message || (isAr ? "الكود غير صحيح أو مستخدم من قبل" : "Invalid code or already used"));
    } finally {
      setJoining(false);
    }
  };

  // Create Room directly from Dashboard if user skipped onboarding
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const iso = formatDateToIso(newRoomStartDate);
    if (!iso) return;
    setCreatingRoom(true);
    try {
      const res = await api("createConnection", { startDate: iso });
      const connId = res?.connection?.connectionId;
      if (connId) {
        localStorage.setItem(`rel_start_date_${connId}`, iso);
      }
      await api("saveNote", {
        title: "__relationship_start_date__",
        content: iso,
        format: "plain",
      }).catch(() => {});
      setCustomStartDate(iso);
      showToast(isAr ? "تم إنشاء غرفتكم الخاصة وتحديد تاريخ البداية! 💖" : "Private room created with start date! 💖");
      if (onConnectionUpdated) await onConnectionUpdated();
      else window.location.reload();
    } catch (err) {
      showToast(err.message || (isAr ? "فشل إنشاء الغرفة" : "Failed to create room"));
    } finally {
      setCreatingRoom(false);
    }
  };

  // Save custom relationship start date
  const handleSaveStartDate = async (e) => {
    e.preventDefault();
    const isoDate = formatDateToIso(customStartDate);
    if (!isoDate) return;
    setSavingDate(true);
    try {
      // 1. Save to note first (100% reliable and synced across both partners in Google Sheets)
      await api("saveNote", {
        title: "__relationship_start_date__",
        content: isoDate,
        format: "plain",
      }).catch(() => {});

      // 2. Try updateConnection in case supported
      await api("updateConnection", { startDate: isoDate }).catch(() => {});

      if (connection?.connectionId) {
        localStorage.setItem(`rel_start_date_${connection.connectionId}`, isoDate);
      }

      if (connection) {
        connection.startDate = isoDate;
        connection.relationshipStartDate = isoDate;
      }
      setCustomStartDate(isoDate);

      showToast(isAr ? "اتحفظ تاريخ البداية وتزامن مع الشريك فوراً! ⏳" : "Start date saved & synced with partner! ⏳");
      setShowDatePicker(false);
    } catch (err) {
      showToast(err.message || (isAr ? "فشل حفظ التاريخ" : "Failed to save date"));
    } finally {
      setSavingDate(false);
    }
  };

  // Add song to playlist
  const handleAddSong = async (e) => {
    e.preventDefault();
    const val = songInput.trim();
    if (!val) return;
    setAddingSong(true);
    try {
      let title = val;
      let provider = "custom";
      if (val.includes("anghami.com")) provider = "anghami";
      else if (val.includes("youtube.com") || val.includes("youtu.be")) provider = "youtube";

      if (val.startsWith("http")) {
        try {
          const u = new URL(val);
          title = u.pathname.split("/").filter(Boolean).pop() || (isAr ? "أغنية جديدة" : "New Track");
        } catch {
          title = isAr ? "أغنية جديدة" : "New Track";
        }
      }

      await api("addMediaQueueItem", {
        type: "listen",
        url: val,
        title,
        provider,
      });
      setSongInput("");
      showToast(isAr ? "انضافت الأغنية للقائمة!" : "Song added to playlist!");
      const q = await api("getMediaQueue", { type: "listen" });
      setData((prev) => ({ ...prev, playlist: q.queue || [] }));
    } catch (err) {
      showToast(err.message || (isAr ? "فشل إضافة الأغنية" : "Failed to add song"));
    } finally {
      setAddingSong(false);
    }
  };

  // Remove song from playlist
  const handleDeleteSong = async (id) => {
    try {
      await api("removeMediaQueueItem", { id });
      setData((prev) => ({
        ...prev,
        playlist: prev.playlist.filter((s) => s.id !== id),
      }));
      showToast(isAr ? "اتمسحت الأغنية من القائمة" : "Song removed from playlist");
    } catch (err) {
      showToast(err.message || (isAr ? "فشل مسح الأغنية" : "Failed to remove song"));
    }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-4xl mx-auto pb-24">
      {/* 1. Partner Connection / Invitation Card */}
      {!connection?.connectionId ? (
        <section className="relative overflow-hidden rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-primary/30 flex-shrink-0">
              <img src="/heart-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                {isAr ? "إنشاء مساحتكم الخاصة" : "Create Your Private Space"}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {isAr
                  ? "أنشئوا غرفتكم الخاصة وحددوا تاريخ البداية ليبدأ العداد بحساب كل ثانية بتعدي سوا"
                  : "Create your private room and set your anniversary date to start the counter"}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateRoom} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-on-surface-variant block mb-1">
                {isAr ? "تاريخ أول يوم بدأتو سوا فيه:" : "The day your story began:"}
              </label>
              <input
                type="date"
                value={newRoomStartDate}
                onChange={(e) => setNewRoomStartDate(e.target.value)}
                className="w-full bg-surface-container px-3.5 py-2 rounded-xl text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={creatingRoom || !newRoomStartDate}
              className="self-end px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {creatingRoom ? (isAr ? "جارِ الإنشاء..." : "Creating...") : (isAr ? "ابدأ الحكاية الآن ✨" : "Start Our Story ✨")}
            </button>
          </form>

          {/* Input to join partner if they made the code */}
          <form onSubmit={handleJoinPartner} className="pt-2 border-t border-outline-variant/15 flex flex-col gap-2.5">
            <label className="text-xs text-on-surface-variant font-medium">
              {isAr
                ? "أو لو شريكك أنشأ الغرفة قبلك، اكتب كوده هنا واربطوا الحسابين:"
                : "Or enter partner's code here if they already created the room:"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isAr ? "اكتب كود الشريك مثلاً REL-XXXX" : "Enter partner code e.g. REL-XXXX"}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm text-on-surface uppercase focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-semibold text-on-surface transition-all disabled:opacity-50 cursor-pointer"
              >
                {joining ? (isAr ? "بيتم الربط..." : "Connecting...") : (isAr ? "ربط الحساب" : "Link Accounts")}
              </button>
            </div>
            {joinErr && <p className="text-xs text-error">{joinErr}</p>}
          </form>
        </section>
      ) : !partnerJoined ? (
        <section className="relative overflow-hidden rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-primary/30 flex-shrink-0">
              <img src="/heart-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                {isAr ? "في انتظار الشريك" : "Waiting for Partner"}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {isAr
                  ? "المكان هنا معمول ليكم أنتوا الاتنين.. ابعت الكود لشريكك عشان يبدأوا حكايتكم سوا"
                  : "This space is built just for the two of you.. Share the invite code to link your accounts"}
              </p>
            </div>
          </div>

          {/* User's Invite Code Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 mb-4">
            <div>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                {isAr ? "كود الارتباط الخاص بيك" : "Your Invite Code"}
              </span>
              <span className="text-2xl font-bold tracking-widest text-primary font-mono select-all">
                {pairCode || (isAr ? "جارِ التحميل..." : "Loading...")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface transition-all border border-outline-variant/30 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>{isAr ? "نسخ الكود" : "Copy Code"}</span>
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-95 transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                <span>{isAr ? "مشاركة الرابط" : "Share Link"}</span>
              </button>
            </div>
          </div>

          {/* Input to join partner if they made the code */}
          <form onSubmit={handleJoinPartner} className="pt-2 border-t border-outline-variant/15 flex flex-col gap-2.5">
            <label className="text-xs text-on-surface-variant font-medium">
              {isAr
                ? "أو لو شريكك عمل الكود قبلك، اكتب كوده هنا واربطوا الحسابين:"
                : "Or enter partner's code here if they invited you first:"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isAr ? "اكتب كود الشريك مثلاً REL-XXXX" : "Enter partner code e.g. REL-XXXX"}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm text-on-surface uppercase focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-semibold text-on-surface transition-all disabled:opacity-50 cursor-pointer"
              >
                {joining ? (isAr ? "بيتم الربط..." : "Connecting...") : (isAr ? "ربط الحساب" : "Link Accounts")}
              </button>
            </div>
            {joinErr && <p className="text-xs text-error">{joinErr}</p>}
          </form>
        </section>
      ) : (
        /* Connected Partner Banner */
        <section className="relative overflow-hidden rounded-3xl bg-surface-container p-5 border border-outline-variant/30 shadow-xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-primary/40 flex-shrink-0">
              <img src="/heart-logo.jpg" alt="Heart Logo" className="w-full h-full object-cover" />
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface">
                {user?.name || (isAr ? "أنت" : "You")} & {partnerName}
              </h2>
              <span className="text-xs text-primary font-serif font-semibold">
                {isAr ? "قلبان اجتمعا في قصة حب واحدة 💖" : "Two hearts bound forever 💖"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendHeartbeat}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface transition-all border border-outline-variant/30 active:scale-95 cursor-pointer ${
              heartPulsing ? "ring-2 ring-primary text-primary" : ""
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] text-primary transition-transform ${
                heartPulsing ? "scale-125" : ""
              }`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
            <span>{isAr ? "ابعت نبضة حب" : "Send Love Pulse"}</span>
          </button>
        </section>
      )}

      {/* 2. Live Ticking Relationship Counter */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">hourglass_top</span>
            <h3 className="text-base font-bold text-on-surface">
              {isAr ? "مع بعض بقالنا" : "Days of Love Counter"}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowDatePicker((p) => !p)}
            className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">edit_calendar</span>
            <span>{counter.hasDate ? (isAr ? "تعديل التاريخ" : "Change Date") : (isAr ? "حدد تاريخ البداية" : "Set Start Date")}</span>
          </button>
        </div>

        {/* Date Picker Form if expanded or no date */}
        {showDatePicker && (
          <form onSubmit={handleSaveStartDate} className="mb-4 p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center gap-2 flex-wrap">
            <label className="text-xs text-on-surface-variant w-full">
              {isAr ? "تاريخ أول يوم بدأتو سوا فيه:" : "The day your story began:"}
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
              required
            />
            <button
              type="submit"
              disabled={savingDate}
              className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer"
            >
              {savingDate ? (isAr ? "بيحفظ..." : "Saving...") : (isAr ? "احفظ التاريخ" : "Save Date")}
            </button>
            <button
              type="button"
              onClick={() => setShowDatePicker(false)}
              className="px-2.5 py-2 text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </form>
        )}

        {/* Live Ticking Units Grid */}
        {counter.hasDate ? (
          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-primary font-mono">{counter.days}</span>
              <span className="text-[11px] text-on-surface-variant mt-1">{isAr ? "يوم" : "Days"}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-on-surface font-mono">{counter.hours}</span>
              <span className="text-[11px] text-on-surface-variant mt-1">{isAr ? "ساعة" : "Hours"}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-on-surface font-mono">{counter.minutes}</span>
              <span className="text-[11px] text-on-surface-variant mt-1">{isAr ? "دقيقة" : "Minutes"}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-secondary font-mono animate-pulse">{counter.seconds}</span>
              <span className="text-[11px] text-on-surface-variant mt-1">{isAr ? "ثانية" : "Seconds"}</span>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center rounded-2xl bg-surface-container-low border border-outline-variant/15 flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-primary opacity-60">calendar_month</span>
            <p className="text-xs text-on-surface-variant max-w-xs">
              {isAr
                ? "حددوا تاريخ بداية حكايتكم عشان العداد يبدأ يحسب كل يوم وساعة وثانية بتعدي سوا"
                : "Set your anniversary date so the counter starts tracking every day and moment together"}
            </p>
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="mt-1 px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-on-primary text-xs font-semibold transition-all cursor-pointer"
            >
              {isAr ? "اضغط هنا وحدد التاريخ" : "Set Relationship Date"}
            </button>
          </div>
        )}
      </section>

      {/* 3. Super Simple Shared Playlist */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">headphones</span>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                {isAr ? "قائمتنا للمزيكا" : "Our Shared Music"}
              </h3>
              <span className="text-[11px] text-on-surface-variant">
                {isAr
                  ? "أغاني بنحب نسمعها سوا (أنغامي، يوتيوب، أو بالاسم)"
                  : "Songs we love listening to together (Anghami, YouTube, or title)"}
              </span>
            </div>
          </div>
          <Link to="/listen" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
            <span>{isAr ? "غرفة المزيكا" : "Music Room"}</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {/* Add Song Form */}
        <form onSubmit={handleAddSong} className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder={isAr ? "حط لينك أنغامي أو يوتيوب أو اكتب اسم الأغنية..." : "Paste Anghami or YouTube link, or type song title..."}
            value={songInput}
            onChange={(e) => setSongInput(e.target.value)}
            className="flex-1 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={addingSong || !songInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold transition-all disabled:opacity-50 shadow-md cursor-pointer"
          >
            {addingSong ? (isAr ? "بيضيف..." : "Adding...") : (isAr ? "إضافة" : "Add Song")}
          </button>
        </form>

        {/* Playlist Items */}
        <div className="flex flex-col space-y-2">
          {data.playlist.length > 0 ? (
            data.playlist.map((song) => (
              <div
                key={song.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px]">
                      {song.provider === "anghami" ? "music_note" : song.provider === "youtube" ? "play_circle" : "audiotrack"}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-on-surface truncate">{song.title}</p>
                    <span className="text-[10px] text-on-surface-variant">
                      {song.provider === "anghami" ? (isAr ? "أنغامي" : "Anghami") : song.provider === "youtube" ? (isAr ? "يوتيوب" : "YouTube") : (isAr ? "مزيكا" : "Music")}
                      {song.creatorId === user?.id
                        ? isAr
                          ? " • ضفتها أنت"
                          : " • Added by you"
                        : isAr
                        ? " • ضافها الشريك"
                        : " • Added by partner"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        showToast(isAr ? "جاري تشغيل الأغنية..." : "Starting song...");
                        await api("createSession", { type: "listen", url: song.url });
                        navigate("/listen");
                      } catch (err) {
                        navigate("/listen");
                      }
                    }}
                    className="p-1.5 rounded-lg text-primary hover:bg-surface-bright transition-colors cursor-pointer"
                    title={isAr ? "تشغيل في الغرفة" : "Play in room"}
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSong(song.id)}
                    className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-surface-bright transition-colors cursor-pointer"
                    title={isAr ? "مسح" : "Remove"}
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-5 text-center rounded-2xl bg-surface-container-low/60 border border-outline-variant/10 text-xs text-on-surface-variant">
              {isAr
                ? "القائمة لسه فاضية.. ضيفوا أول أغنية بتحبوها سوا عشان تشغلوها مع بعض في أي وقت."
                : "Playlist is empty.. Add your first favorite song to listen together anytime."}
            </div>
          )}
        </div>
      </section>

      {/* 4. "ألبوم صورنا" Card Shortcut */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">photo_library</span>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                {isAr ? "ألبوم صورنا" : "Our Photo Album"}
              </h3>
              <span className="text-[11px] text-on-surface-variant">
                {isAr ? "كل صورنا ولحظاتنا الحلوة متجمعة في مكان واحد" : "All our shared pictures gathered in one place"}
              </span>
            </div>
          </div>
          <Link
            to="/album"
            className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-95 transition-all shadow-md flex items-center gap-1"
          >
            <span>{isAr ? "فتح الألبوم" : "Open Album"}</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {/* Photo Previews or Empty State */}
        {data.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {data.photos.slice(0, 3).map((ph, idx) => (
              <Link
                key={ph.id || idx}
                to="/album"
                className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/20 hover:scale-[1.02] transition-transform"
              >
                <img src={ph.url} alt={ph.caption || (isAr ? "صورة" : "Photo")} className="w-full h-full object-cover" />
              </Link>
            ))}
          </div>
        ) : (
          <Link
            to="/album"
            className="py-6 px-4 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/40 hover:border-primary/50 text-center flex flex-col items-center gap-2 transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-[28px] opacity-70">add_photo_alternate</span>
            <p className="text-xs text-on-surface font-medium">
              {isAr
                ? "الألبوم لسه فاضي.. دوس هنا عشان ترفعوا أول صورة لحكايتكم"
                : "Album is empty.. Tap here to upload your first photo together"}
            </p>
          </Link>
        )}
      </section>

      {/* 5. Essential Feature Shortcuts (Storybook, Typing, Watch) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Photo Album */}
        <Link
          to="/album"
          className="p-4 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 hover:border-amber-400/40 transition-all shadow-lg flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">photo_library</span>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-on-surface truncate">
              {isAr ? "ألبوم صورنا" : "Our Photo Album"}
            </h4>
            <span className="text-[11px] text-on-surface-variant block truncate">
              {isAr ? "بوكيهات وكروت ذكرياتنا" : "Photo Bouquets & Cards"}
            </span>
          </div>
        </Link>

        {/* Free & Hand Typing */}
        <Link
          to="/typing"
          className="p-4 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 hover:border-primary/40 transition-all shadow-lg flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">draw</span>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-on-surface truncate">
              {isAr ? "فضفضة وخواطر" : "Whispers & Notes"}
            </h4>
            <span className="text-[11px] text-on-surface-variant block truncate">
              {isAr ? "كتابة فورية ورسم" : "Live Writing & Draw"}
            </span>
          </div>
        </Link>

        {/* Watch Together */}
        <Link
          to="/watch"
          className="p-4 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 hover:border-primary/40 transition-all shadow-lg flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">live_tv</span>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-on-surface truncate">
              {isAr ? "اتفرجوا سوا" : "Watch Together"}
            </h4>
            <span className="text-[11px] text-on-surface-variant block truncate">
              {isAr ? "سينما يوتيوب متزامنة" : "Synced Cinema"}
            </span>
          </div>
        </Link>
      </div>

      {/* 6. Recent Real Activities Feed */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">history</span>
            <h3 className="text-base font-bold text-on-surface">
              {isAr ? "لحظاتنا الأخيرة" : "Recent Moments"}
            </h3>
          </div>
          <span className="text-[11px] text-on-surface-variant">
            {isAr ? "النشاط المشترك" : "Shared Activity"}
          </span>
        </div>

        <div className="flex flex-col space-y-2">
          {data.activities.length > 0 ? (
            data.activities.slice(0, 5).map((act) => (
              <div
                key={act.id || act.activityId}
                className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 text-xs text-on-surface"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[18px]">favorite</span>
                  <p className="font-medium truncate">{act.summary}</p>
                </div>
                {act.createdAt && (
                  <span className="text-[10px] text-on-surface-variant flex-shrink-0 mr-2">
                    {new Date(act.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="py-5 text-center rounded-2xl bg-surface-container-low/60 border border-outline-variant/10 text-xs text-on-surface-variant">
              {isAr
                ? "لسه مفيش نشاط مسجل.. أول ما تبدأوا تكتبوا أو تسمعوا أو ترفعوا صور هتظهر هنا كل لحظاتكم سوا."
                : "No shared activity yet.. Once you start writing, listening, or uploading photos, your moments will appear here."}
            </div>
          )}
        </div>
      </section>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2 text-on-surface shadow-2xl border border-outline-variant/40 text-xs font-semibold animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
