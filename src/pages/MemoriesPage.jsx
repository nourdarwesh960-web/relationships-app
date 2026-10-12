import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Lightbox } from "../components/Lightbox.jsx";
import { SignatureLoader } from "../components/SignatureLoader.jsx";
import { EmotionalEmptyState } from "../components/EmotionalEmptyState.jsx";
import { PhotoBouquet } from "../components/PhotoBouquet.jsx";
import { compressImage } from "../imageUtils.js";

function getGoogleMapsUrl(loc) {
  if (!loc) return "";
  const trimmed = loc.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

export function MemoriesPage({ t, user, connection, lang = "ar" }) {
  const isAr = lang === "ar";
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Clean legacy unscoped keys to prevent cross-room leaks
  useEffect(() => {
    try {
      localStorage.removeItem("rel_local_album_photos");
      localStorage.removeItem("rel_storybook_config");
    } catch (_) {}
  }, []);

  // Filtering & Search
  const [filter, setFilter] = useState("all"); // 'all' | 'favorites' | 'voice' | 'trips' | 'letters'
  const [search, setSearch] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [form, setForm] = useState({
    title: "",
    memoryDate: new Date().toISOString().split("T")[0],
    content: "",
    category: "general",
    location: "",
    tags: "",
    isFavorite: false,
    photos: [], // array of { id, url, caption }
    photoUrl: "",
    audioUrl: "",
  });
  const [saving, setSaving] = useState(false);

  // Spotlight Audio Playing State
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Lightbox State
  const [lightbox, setLightbox] = useState({ open: false, photos: [], index: 0 });

  // Full Memory Viewer Modal State
  const [viewingMemory, setViewingMemory] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  };

  async function loadMemories() {
    try {
      setLoading(true);
      const res = await api("getMemories");
      setMemories(res.memories || []);
    } catch (e) {
      setErr(e.message || (isAr ? "حصلت مشكلة في تحميل الذكريات" : "Failed to load memories"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemories();
  }, []);

  async function handlePhotoFilesChange(e) {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;
    try {
      setUploadingPhoto(true);
      const processed = [];
      for (const file of fileList) {
        try {
          const compressed = await compressImage(file, 800, 0.72, 38000);
          if (compressed) {
            processed.push({
              id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              url: compressed,
              caption: form.title || "",
            });
          }
        } catch (_) {}
      }

      if (processed.length > 0) {
        setForm((prev) => {
          const nextPhotos = [...prev.photos, ...processed];
          return {
            ...prev,
            photos: nextPhotos,
            photoUrl: prev.photoUrl || nextPhotos[0]?.url || "",
          };
        });

        showToast(
          isAr
            ? `تم تجهيز ${processed.length} صور للبوكيه 💐`
            : `${processed.length} photos ready for bouquet 💐`
        );
      } else {
        showToast(isAr ? "تعذر قراءة الصور، تأكد من الصيغة" : "Failed to read image files");
      }
    } catch (err) {
      setErr(isAr ? "حصلت مشكلة في تجهيز الصور، جرب صور تانية" : "Failed to process photos, please try others");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  function handleAddManualUrl() {
    if (!manualUrl.trim()) return;
    const trimmed = manualUrl.trim();
    const newPh = {
      id: `ph_url_${Date.now()}`,
      url: trimmed,
      caption: form.title || "",
    };
    setForm((prev) => {
      const nextPhotos = [...prev.photos, newPh];
      return {
        ...prev,
        photos: nextPhotos,
        photoUrl: prev.photoUrl || nextPhotos[0]?.url || "",
      };
    });
    setManualUrl("");
    showToast(isAr ? "تمت إضافة رابط الصورة 📸" : "Photo URL added 📸");
  }

  function handleRemovePhoto(idx) {
    setForm((prev) => {
      const nextPhotos = prev.photos.filter((_, i) => i !== idx);
      return {
        ...prev,
        photos: nextPhotos,
        photoUrl: nextPhotos[0]?.url || "",
      };
    });
  }

  function handleSetCoverPhoto(idx) {
    setForm((prev) => {
      const chosen = prev.photos[idx];
      const rest = prev.photos.filter((_, i) => i !== idx);
      const reordered = [chosen, ...rest];
      return {
        ...prev,
        photos: reordered,
        photoUrl: chosen.url,
      };
    });
    showToast(isAr ? "تم تعيينها كغلاف أول للبوكيه ⭐" : "Set as cover photo ⭐");
  }

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      showToast(isAr ? "المتصفح مش داعم تحديد الموقع" : "Browser does not support geolocation");
      return;
    }
    setLocating(true);
    showToast(isAr ? "جاري تحديد موقعك الحالي..." : "Detecting current location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        setForm((prev) => ({ ...prev, location: mapsUrl }));
        showToast(isAr ? "تم تحديد مكانك وإضافة رابط خرائط جوجل! 📍" : "Location added with Google Maps link! 📍");
      },
      (geoErr) => {
        setLocating(false);
        showToast(isAr ? "تعذر الوصول للموقع، اتأكد من تفعيل إذن الـ Location" : "Failed to get location, check permissions");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function openAddModal() {
    setEditingMemory(null);
    setManualUrl("");
    setForm({
      title: "",
      memoryDate: new Date().toISOString().split("T")[0],
      content: "",
      category: "general",
      location: "",
      tags: "",
      isFavorite: false,
      photos: [],
      photoUrl: "",
      audioUrl: "",
    });
    setModalOpen(true);
  }

  function openEditModal(m) {
    setEditingMemory(m);
    setManualUrl("");
    const existingPhotos = (Array.isArray(m.photos) && m.photos.length > 0)
      ? m.photos
      : (m.photoUrl ? [{ id: "ph_cover", url: m.photoUrl, caption: m.title }] : []);

    setForm({
      title: m.title || "",
      memoryDate: m.memoryDate || new Date().toISOString().split("T")[0],
      content: m.content || "",
      category: m.category || "general",
      location: m.location || "",
      tags: Array.isArray(m.tags) ? m.tags.join(", ") : m.tags || "",
      isFavorite: !!m.isFavorite,
      photos: existingPhotos,
      photoUrl: m.photoUrl || m.coverPhotoUrl || m.coverUrl || existingPhotos[0]?.url || "",
      audioUrl: m.audioUrl || "",
    });
    setModalOpen(true);
  }

  async function handleSaveMemory(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setErr("");
    try {
      const photosToSave = form.photos.length > 0
        ? form.photos.map((p) => ({
            id: p.id || undefined,
            url: p.url,
            caption: p.caption || form.title,
          }))
        : (form.photoUrl ? [{ url: form.photoUrl, caption: form.title }] : []);

      const primaryCoverUrl = photosToSave[0]?.url || form.photoUrl || "";

      // Optimistically update memories state immediately!
      const optimisticMem = {
        id: editingMemory ? editingMemory.id : `mem_${Date.now()}`,
        memoryId: editingMemory ? editingMemory.id : `mem_${Date.now()}`,
        title: form.title,
        memoryDate: form.memoryDate,
        content: form.content,
        category: form.category,
        location: form.location,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isFavorite: form.isFavorite,
        photos: photosToSave,
        photoUrl: primaryCoverUrl,
        coverUrl: primaryCoverUrl,
        createdAt: new Date().toISOString(),
      };

      setMemories((prev) => {
        if (editingMemory) {
          return prev.map((m) => (m.id === editingMemory.id ? { ...m, ...optimisticMem } : m));
        }
        return [optimisticMem, ...prev];
      });

      await api("saveMemory", {
        id: editingMemory ? editingMemory.id : undefined,
        title: form.title,
        memoryDate: form.memoryDate,
        content: form.content,
        category: form.category,
        location: form.location,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isFavorite: form.isFavorite,
        photos: photosToSave,
        photoUrl: primaryCoverUrl || undefined,
        audioUrl: form.audioUrl || undefined,
      });

      // Synchronize all photos into shared Photos album table for partner access
      photosToSave.forEach((ph) => {
        api("uploadPhoto", {
          data: ph.url,
          caption: ph.caption || form.title,
        }).catch(() => {});
      });

      // Optimistically update local connection-scoped album cache
      if (photosToSave.length > 0 && connection?.connectionId) {
        try {
          const localAlbumKey = `rel_local_album_photos_${connection.connectionId}`;
          const localAlbum = JSON.parse(localStorage.getItem(localAlbumKey) || "[]");
          photosToSave.forEach((ph, pIdx) => {
            if (!localAlbum.some((p) => p.url === ph.url)) {
              localAlbum.unshift({
                id: ph.id || `mem_${Date.now()}_${pIdx}`,
                url: ph.url,
                caption: ph.caption || form.title,
                createdAt: new Date().toISOString(),
              });
            }
          });
          localStorage.setItem(localAlbumKey, JSON.stringify(localAlbum.slice(0, 80)));
        } catch (_) {}
      }

      setModalOpen(false);
      showToast(
        editingMemory
          ? (isAr ? "تم تعديل الذكرى وبوكيه الصور بنجاح ✨" : "Memory updated successfully ✨")
          : (isAr ? "تم حفظ الذكرى وبوكيه الصور بنجاح! 💐" : "Memory and photo bouquet saved! 💐")
      );
      await loadMemories();
    } catch (e) {
      setErr(e.message || (isAr ? "فشل حفظ الذكرى" : "Failed to save memory"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMemory(id) {
    if (!window.confirm(isAr ? "عايز تمسح الذكرى دي نهائياً؟" : "Delete this memory permanently?")) return;
    try {
      await api("deleteMemory", { id });
      showToast(isAr ? "تم مسح الذكرى" : "Memory deleted");
      await loadMemories();
    } catch (e) {
      showToast(e.message || (isAr ? "فشل مسح الذكرى" : "Failed to delete memory"));
    }
  }

  async function handleToggleFavorite(id) {
    try {
      await api("toggleMemoryFavorite", { id });
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m))
      );
      showToast(isAr ? "تم تحديث المفضلة ♥" : "Favorites updated ♥");
    } catch (e) {
      showToast(e.message || (isAr ? "فشل تعديل المفضلة" : "Failed to update favorites"));
    }
  }

  // Filter memories
  const filteredMemories = memories.filter((m) => {
    if (filter === "favorites" && !m.isFavorite) return false;
    if (filter === "voice" && !m.audioUrl) return false;
    if (filter === "trips" && m.category !== "trip" && m.category !== "travel") return false;
    if (filter === "letters" && m.category !== "letter") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchContent = m.content?.toLowerCase().includes(q);
      const matchLocation = m.location?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchLocation) return false;
    }
    return true;
  });

  // Spotlight Memory (favorite or top memory)
  const spotlightMemory =
    memories.find((m) => m.isFavorite && (m.photoUrl || (m.photos && m.photos.length > 0))) ||
    memories.find((m) => m.photoUrl || (m.photos && m.photos.length > 0)) ||
    (memories.length > 0 ? memories[0] : null);

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 sm:px-6 space-y-5 pb-24">
      {/* Top Header */}
      <section className="flex items-center justify-between pt-2 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
            <span
              className="material-symbols-outlined text-[26px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_stories
            </span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl text-on-surface font-bold tracking-tight">
              {isAr ? "ذكرياتنا وبوكيهات الصور" : "Our Memories & Photo Bouquets"}
            </h2>
            <span className="text-xs text-on-surface-variant font-medium">
              {memories.length > 0
                ? isAr
                  ? `${memories.length} ذكرى متسجلة سوا`
                  : `${memories.length} recorded memories`
                : isAr
                ? "صندوق ذكرياتنا وبوكيهات صورنا الحلوة"
                : "Vault of our sweetest memories & photo decks"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh & Sync Button */}
          <button
            onClick={loadMemories}
            className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface flex items-center justify-center border border-outline-variant/30 transition-all active:scale-95 cursor-pointer shadow-xs"
            type="button"
            title={isAr ? "تحديث وتزامن الذكريات" : "Refresh & Sync"}
          >
            <span className="material-symbols-outlined text-[19px] text-primary">sync</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-sm transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[19px]">add_photo_alternate</span>
            <span>{isAr ? "ذكرى وبوكيه صور" : "New Memory"}</span>
          </button>
        </div>
      </section>

      {/* Filter & Search Navigation Bar */}
      <section className="flex flex-col gap-2.5">
        {/* Search Input */}
        <div className="flex items-center rounded-2xl bg-surface-container px-3.5 py-2.5 border border-outline-variant/30 focus-within:border-primary/50 transition-colors">
          <span className="material-symbols-outlined text-outline text-[20px] ml-2">search</span>
          <input
            type="text"
            className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
            placeholder={isAr ? "دور في ذكرياتنا، الأماكن، التفاصيل..." : "Search memories, places, details..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-outline hover:text-on-surface p-1 cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none scrollbar-none">
          {[
            { id: "all", label: isAr ? "كل الذكريات" : "All Memories", icon: "bookmarks" },
            { id: "favorites", label: isAr ? "المفضلة بس" : "Favorites", icon: "favorite" },
            { id: "voice", label: isAr ? "تسجيلات صوتية" : "Voice Notes", icon: "record_voice_over" },
            { id: "trips", label: isAr ? "سفريات وخروجات" : "Trips & Dates", icon: "flight_takeoff" },
            { id: "letters", label: isAr ? "جوابات ورسايل" : "Letters", icon: "history_edu" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilter(pill.id)}
              type="button"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border cursor-pointer ${
                filter === pill.id
                  ? "bg-primary text-on-primary border-primary shadow-sm"
                  : "bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{pill.icon}</span>
              <span>{pill.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Spotlight Card */}
      {spotlightMemory && (
        <section className="relative flex flex-col rounded-3xl bg-surface-container overflow-hidden shadow-2xl border border-outline-variant/30 group">
          {/* Spotlight Photos: Bouquet if multiple, single image if one */}
          {(() => {
            const spotPhotos = (Array.isArray(spotlightMemory.photos) && spotlightMemory.photos.length > 0)
              ? spotlightMemory.photos
              : (spotlightMemory.photoUrl ? [{ url: spotlightMemory.photoUrl, caption: spotlightMemory.title }] : []);

            if (spotPhotos.length > 1) {
              return (
                <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant/20">
                  <PhotoBouquet
                    photos={spotPhotos}
                    title={spotlightMemory.title}
                    isAr={isAr}
                    onPhotoClick={(idx) => setLightbox({ open: true, photos: spotPhotos, index: idx })}
                  />
                </div>
              );
            }

            if (spotPhotos.length === 1) {
              return (
                <div
                  className="relative w-full h-64 sm:h-72 bg-cover bg-center overflow-hidden cursor-pointer"
                  onClick={() => setLightbox({ open: true, photos: spotPhotos, index: 0 })}
                  style={{ backgroundImage: `url('${spotPhotos[0].url}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/20 to-black/40"></div>

                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-xs text-primary font-semibold flex items-center gap-1 border border-primary/20">
                      <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        auto_awesome
                      </span>
                      <span>{isAr ? "ذكرى متألقة" : "Featured"}</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(spotlightMemory.id);
                      }}
                      className="w-9 h-9 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center text-primary shadow-lg transition-transform active:scale-90 cursor-pointer"
                      type="button"
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: spotlightMemory.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                    {spotlightMemory.location && (
                      <a
                        href={getGoogleMapsUrl(spotlightMemory.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-on-surface/90 hover:text-primary transition-colors text-xs font-medium bg-black/60 hover:bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10"
                      >
                        <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                        <span className="max-w-[200px] truncate">{spotlightMemory.location}</span>
                      </a>
                    )}
                    {spotlightMemory.memoryDate && (
                      <span className="text-xs text-on-surface/80 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full mr-auto font-medium">
                        {spotlightMemory.memoryDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* Spotlight Content Body */}
          <div className="p-5 sm:p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="material-symbols-outlined text-[16px]">auto_stories</span>
                <span>{isAr ? "ذكرى مميزة" : "Special Memory"}</span>
              </span>

              {spotlightMemory.isFavorite && (
                <span className="flex items-center gap-1 text-primary text-xs font-semibold">
                  <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    favorite
                  </span>
                  <span>{isAr ? "المفضلة" : "Favorite"}</span>
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl text-on-surface font-bold">
              {spotlightMemory.title}
            </h3>

            {spotlightMemory.content && (
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {spotlightMemory.content}
              </p>
            )}

            {/* Audio Snippet */}
            {spotlightMemory.audioUrl && (
              <div className="mt-2 flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAudioPlaying((p) => !p)}
                    className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {audioPlaying ? "pause" : "play_arrow"}
                    </span>
                  </button>
                  <div className="flex flex-col">
                    <span className="text-sm text-on-surface font-bold">
                      {spotlightMemory.audioTitle || (isAr ? "تسجيل صوتي" : "Voice Recording")}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {spotlightMemory.memoryDate || ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 pl-2">
                  {[14, 22, 12, 28, 16, 8, 20].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full bg-primary transition-all duration-300 ${audioPlaying ? "animate-pulse" : "opacity-40"}`}
                      style={{
                        height: audioPlaying ? `${h}px` : "8px",
                        animationDelay: `${i * 90}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Chapters & Keepsakes Timeline Scrapbook Feed */}
      <section className="flex flex-col space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg sm:text-xl text-on-surface font-bold">
            {isAr ? "كل الذكريات واللحظات" : "All Memories & Moments"}
          </h3>
          <span className="text-xs text-on-surface-variant">
            {isAr ? "مرتبة من الأحدث للأقدم" : "Sorted newest to oldest"}
          </span>
        </div>

        {loading ? (
          <div className="py-8">
            <SignatureLoader
              arPhrase={isAr ? "جاري استرجاع ذكرياتكم..." : "Retrieving your memories..."}
              enPhrase={!isAr ? "Retrieving your memories..." : undefined}
              status={isAr ? "ملاذ الذكريات المشترك" : "Shared Memories Vault"}
            />
          </div>
        ) : filteredMemories.length === 0 ? (
          <EmotionalEmptyState
            type="memories"
            onAction={openAddModal}
            actionText={isAr ? "+ إضافة أول ذكرى وبوكيه صور" : "+ Add First Memory & Bouquet"}
          />
        ) : (
          <div className="flex flex-col space-y-5">
            {filteredMemories.map((m, idx) => {
              const memPhotos = (Array.isArray(m.photos) && m.photos.length > 0)
                ? m.photos
                : (m.photoUrl ? [{ url: m.photoUrl, caption: m.title }] : []);

              return (
                <article
                  key={m.id || idx}
                  className="flex flex-col rounded-3xl bg-surface-container overflow-hidden shadow-lg border border-outline-variant/30 hover:border-primary/40 transition-all"
                >
                  {/* Photo Display: Multi-photo Bouquet OR Single photo */}
                  {memPhotos.length > 1 ? (
                    <div className="p-4 bg-surface-container-low/40 border-b border-outline-variant/20">
                      <PhotoBouquet
                        photos={memPhotos}
                        title={m.title}
                        isAr={isAr}
                        onPhotoClick={(pIdx) => setLightbox({ open: true, photos: memPhotos, index: pIdx })}
                      />
                    </div>
                  ) : memPhotos.length === 1 ? (
                    <div
                      className="relative w-full h-48 sm:h-56 overflow-hidden cursor-pointer group"
                      onClick={() => setLightbox({ open: true, photos: memPhotos, index: 0 })}
                    >
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={memPhotos[0].url}
                        alt={m.title}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent"></div>
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">photo_camera</span>
                          <span>1 {isAr ? "صورة" : "photo"}</span>
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="p-4 sm:p-5 flex flex-col space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary font-semibold">{m.memoryDate}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFavorite(m.id)}
                          className="text-primary hover:scale-110 transition-transform p-1 cursor-pointer"
                          type="button"
                          title={m.isFavorite ? (isAr ? "إزالة من المفضلة" : "Remove from favorites") : (isAr ? "إضافة للمفضلة" : "Add to favorites")}
                        >
                          <span
                            className="material-symbols-outlined text-[20px]"
                            style={{ fontVariationSettings: m.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            favorite
                          </span>
                        </button>
                        <button
                          onClick={() => openEditModal(m)}
                          className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
                          type="button"
                          title={isAr ? "تعديل" : "Edit"}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(m.id)}
                          className="text-outline hover:text-error p-1 transition-colors cursor-pointer"
                          type="button"
                          title={isAr ? "مسح" : "Delete"}
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    <h4
                      onClick={() => setViewingMemory(m)}
                      className="text-base sm:text-lg text-on-surface font-bold cursor-pointer hover:text-primary transition-colors"
                      title={isAr ? "اضغط لفتح الذكرى بالكامل وعرض صورها" : "Click to view memory details"}
                    >
                      {m.title}
                    </h4>

                    {m.content && (
                      <p
                        onClick={() => setViewingMemory(m)}
                        className="text-sm text-on-surface-variant line-clamp-3 leading-relaxed cursor-pointer hover:text-on-surface transition-colors"
                      >
                        {m.content}
                      </p>
                    )}

                    {/* View Full Memory Button */}
                    <div className="pt-2 flex items-center justify-between border-t border-outline-variant/15">
                      <button
                        type="button"
                        onClick={() => setViewingMemory(m)}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>{isAr ? "فتح الذكرى وكل الصور 📖" : "View Story & Photos"}</span>
                      </button>

                      <span className="text-[11px] text-on-surface-variant font-medium">
                        {memPhotos.length > 0 ? (isAr ? `${memPhotos.length} صور 📸` : `${memPhotos.length} photos 📸`) : ""}
                      </span>
                    </div>

                    {/* Real Clickable Location */}
                    {m.location && (
                      <div className="pt-1">
                        <a
                          href={getGoogleMapsUrl(m.location)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-xl border border-primary/20 transition-all font-medium group/cardloc"
                          title={isAr ? "افتح المكان على Google Maps" : "Open in Google Maps"}
                        >
                          <span className="material-symbols-outlined text-[15px]">location_on</span>
                          <span className="max-w-[220px] truncate">{m.location}</span>
                          <span className="material-symbols-outlined text-[11px] opacity-70 group-hover/cardloc:translate-x-0.5 transition-transform">open_in_new</span>
                        </a>
                      </div>
                    )}

                    {/* Tags */}
                    {m.tags && (Array.isArray(m.tags) ? m.tags.length > 0 : m.tags) && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {(Array.isArray(m.tags) ? m.tags : m.tags.split(",")).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant text-[11px] font-medium"
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Create / Edit Memory Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-surface-container-high p-6 shadow-2xl flex flex-col space-y-4 border border-outline-variant/40 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl text-on-surface font-bold">
                {editingMemory
                  ? (isAr ? "تعديل الذكرى وبوكيه الصور" : "Edit Memory & Bouquet")
                  : (isAr ? "تسجيل ذكرى جديدة وبوكيه صور" : "Record New Memory & Bouquet")}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {err && (
              <div className="p-3 rounded-xl bg-error/15 text-error text-xs font-semibold border border-error/30">
                {err}
              </div>
            )}

            <form onSubmit={handleSaveMemory} className="flex flex-col space-y-3.5">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  {isAr ? "عنوان الذكرى *" : "Memory Title *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? "مثال: خروجة البحر، أول مرة اتقابلنا، عشاء هادي..." : "e.g. Beach walk, first dinner date, cozy evening..."}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="rounded-2xl bg-surface-container px-4 py-2.5 text-sm text-on-surface border border-outline-variant/30 focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    {isAr ? "التاريخ *" : "Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={form.memoryDate}
                    onChange={(e) => setForm({ ...form, memoryDate: e.target.value })}
                    className="rounded-2xl bg-surface-container px-4 py-2.5 text-sm text-on-surface border border-outline-variant/30 focus:border-primary/50 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      {isAr ? "المكان أو اللوكيشن" : "Location or Place"}
                    </label>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={locating}
                      className="text-[11px] text-primary hover:underline flex items-center gap-0.5 disabled:opacity-50 cursor-pointer"
                      title={isAr ? "جلب إحداثيات موقعي الحالي ورابط جوجل مابس" : "Get current GPS coordinates and Google Maps link"}
                    >
                      <span className="material-symbols-outlined text-[13px]">my_location</span>
                      <span>{locating ? (isAr ? "جاري التحديد..." : "Locating...") : (isAr ? "موقعي الحالي" : "Current Location")}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={isAr ? "اسم المكان أو رابط Google Maps" : "Place name or Google Maps URL"}
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="rounded-2xl bg-surface-container px-4 py-2.5 text-sm text-on-surface border border-outline-variant/30 focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-Photo Bouquet Upload & Preview Section */}
              <div className="flex flex-col space-y-2 p-3.5 rounded-2xl bg-surface-container/60 border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[17px]">style</span>
                    <span>{isAr ? "صور البوكيه للذكرى (ممكن كذا صورة سوا)" : "Bouquet Photos (Multiple allowed)"}</span>
                  </label>
                  {uploadingPhoto && (
                    <span className="text-primary text-xs font-semibold animate-pulse">
                      {isAr ? "جاري تجهيز الصور..." : "Processing photos..."}
                    </span>
                  )}
                </div>

                {/* Thumbnails of attached photos */}
                {form.photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {form.photos.map((ph, pIdx) => {
                      const isCover = pIdx === 0;
                      return (
                        <div
                          key={ph.id || pIdx}
                          className={`relative group rounded-xl overflow-hidden aspect-square border-2 ${
                            isCover ? "border-primary shadow-sm" : "border-outline-variant/40"
                          }`}
                        >
                          <img
                            src={ph.url}
                            alt={`Preview ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(pIdx)}
                            className="absolute top-1 left-1 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                            title={isAr ? "مسح الصورة" : "Remove"}
                          >
                            <span className="material-symbols-outlined text-[13px]">close</span>
                          </button>

                          {/* Cover badge / toggle */}
                          <button
                            type="button"
                            onClick={() => handleSetCoverPhoto(pIdx)}
                            className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-md cursor-pointer flex items-center gap-0.5 ${
                              isCover ? "bg-primary text-on-primary" : "bg-black/60 text-white hover:bg-black/80"
                            }`}
                            title={isAr ? "اضغط لتعيين كغلاف أول للبوكيه" : "Set as Cover"}
                          >
                            <span>⭐</span>
                            <span>{isCover ? (isAr ? "غلاف" : "Cover") : ""}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Multi-Photo Input Button */}
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-outline-variant/50 rounded-2xl bg-surface-container/50 hover:bg-surface-container cursor-pointer transition-all">
                  <span className="material-symbols-outlined text-primary text-2xl mb-1">add_photo_alternate</span>
                  <span className="text-xs text-on-surface font-semibold">
                    {form.photos.length > 0
                      ? (isAr ? "+ إضافة صور تانية للبوكيه" : "+ Add more photos to bouquet")
                      : (isAr ? "اختار صورة أو كذا صورة مع بعض للبوكيه" : "Choose photos from your device")}
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-0.5">
                    {isAr ? "تقدر تحدد أكتر من صورة مرة واحدة (JPG, PNG, WebP)" : "Select multiple photos at once"}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoFilesChange}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>

                {/* Optional Direct URL Addition */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="flex-1 rounded-xl bg-surface-container px-3 py-1.5 text-xs text-on-surface border border-outline-variant/30 focus:outline-none"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualUrl}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-bold border border-outline-variant/40 cursor-pointer"
                  >
                    {isAr ? "إضافة رابط" : "Add URL"}
                  </button>
                </div>
              </div>

              {/* Story Content */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  {isAr ? "حكايتنا وتفاصيل الذكرى" : "Our Story & Memory Details"}
                </label>
                <textarea
                  rows="4"
                  placeholder={isAr ? "اكتب اللي حاسه وافتكر كل لحظة حلوة في اليوم ده..." : "Write your feelings and remember every sweet moment..."}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="rounded-2xl bg-surface-container px-4 py-2.5 text-sm text-on-surface border border-outline-variant/30 focus:border-primary/50 focus:outline-none resize-none"
                  dir="auto"
                />
              </div>

              {/* Favorite Toggle */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-on-surface font-medium select-none">
                  <input
                    type="checkbox"
                    checked={form.isFavorite}
                    onChange={(e) => setForm({ ...form, isFavorite: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span>{isAr ? "علم عليها كذكرى مفضلة ومميزة ♥" : "Mark as special favorite memory ♥"}</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-2xl bg-surface-container py-2.5 text-on-surface font-bold text-sm hover:bg-surface-bright transition-all cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary py-2.5 font-bold text-sm hover:opacity-95 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {saving
                    ? (isAr ? "جاري الحفظ..." : "Saving...")
                    : (isAr ? "حفظ الذكرى والبوكيه 💐" : "Save Memory & Bouquet 💐")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL MEMORY DETAILS MODAL (نافذة فتح الذكرى وعرض كل الصور) */}
      {viewingMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-surface-container-high p-5 sm:p-7 shadow-2xl border border-outline-variant/40 space-y-5 my-8 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-on-surface">
                    {viewingMemory.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-secondary font-medium">
                    <span>{viewingMemory.memoryDate}</span>
                    {viewingMemory.category && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{viewingMemory.category}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(viewingMemory.id)}
                  className="p-2 rounded-full hover:bg-surface-container text-primary transition-transform cursor-pointer"
                  title={viewingMemory.isFavorite ? (isAr ? "إزالة من المفضلة" : "Remove favorite") : (isAr ? "إضافة للمفضلة" : "Favorite")}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: viewingMemory.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMemory(null)}
                  className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Photos Section: Gallery Grid */}
            {(() => {
              const vPhotos = (Array.isArray(viewingMemory.photos) && viewingMemory.photos.length > 0)
                ? viewingMemory.photos
                : (viewingMemory.photoUrl ? [{ url: viewingMemory.photoUrl, caption: viewingMemory.title }] : []);

              if (vPhotos.length === 0) return null;

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[17px]">photo_library</span>
                      <span>
                        {isAr
                          ? `صور الذكرى (${vPhotos.length} صور) - اضغط لتكبير أي صورة`
                          : `Photos (${vPhotos.length}) - Tap to expand`}
                      </span>
                    </span>
                  </div>

                  <div className={`grid gap-2.5 ${
                    vPhotos.length === 1
                      ? "grid-cols-1"
                      : vPhotos.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-2 sm:grid-cols-3"
                  }`}>
                    {vPhotos.map((ph, pIdx) => (
                      <div
                        key={ph.id || pIdx}
                        onClick={() => setLightbox({ open: true, photos: vPhotos, index: pIdx })}
                        className="relative rounded-2xl overflow-hidden aspect-square sm:aspect-video bg-surface-container-low border border-outline-variant/30 cursor-pointer group shadow-sm hover:shadow-md transition-all"
                      >
                        <img
                          src={ph.url}
                          alt={ph.caption || viewingMemory.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                            zoom_in
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Full Story Content */}
            {viewingMemory.content && (
              <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20 space-y-1">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {isAr ? "تفاصيل وحكاية الذكرى:" : "Story Details:"}
                </span>
                <p className="text-sm sm:text-base text-on-surface leading-relaxed whitespace-pre-wrap font-serif">
                  {viewingMemory.content}
                </p>
              </div>
            )}

            {/* Location Link */}
            {viewingMemory.location && (
              <div className="pt-1">
                <a
                  href={getGoogleMapsUrl(viewingMemory.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-2 rounded-xl border border-primary/20 transition-all font-medium"
                >
                  <span className="material-symbols-outlined text-[17px]">location_on</span>
                  <span>{viewingMemory.location}</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              </div>
            )}

            {/* Tags */}
            {viewingMemory.tags && (Array.isArray(viewingMemory.tags) ? viewingMemory.tags.length > 0 : viewingMemory.tags) && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {(Array.isArray(viewingMemory.tags) ? viewingMemory.tags : viewingMemory.tags.split(",")).map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant text-xs font-medium">
                    #{t.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMemory;
                    setViewingMemory(null);
                    openEditModal(m);
                  }}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-xs font-semibold text-on-surface border border-outline-variant/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <span>{isAr ? "تعديل الذكرى" : "Edit"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = viewingMemory.id;
                    setViewingMemory(null);
                    handleDeleteMemory(id);
                  }}
                  className="px-3.5 py-2 rounded-xl hover:bg-error/10 text-xs font-semibold text-error flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>{isAr ? "مسح" : "Delete"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingMemory(null)}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-95 cursor-pointer shadow-md"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Component */}
      {lightbox.open && (
        <Lightbox
          photos={lightbox.photos}
          currentIndex={lightbox.index}
          onClose={() => setLightbox({ open: false, photos: [], index: 0 })}
          onNavigate={(newIdx) => setLightbox((prev) => ({ ...prev, index: newIdx }))}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2 text-on-surface shadow-2xl border border-outline-variant/40 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
