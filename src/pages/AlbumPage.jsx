import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "../api.js";
import { Lightbox } from "../components/Lightbox.jsx";
import { PhotoBouquet } from "../components/PhotoBouquet.jsx";
import { compressImage } from "../imageUtils.js";
import { formatDateToIso } from "../dateUtils.js";

function getLocalAlbumKey(connection) {
  return connection?.connectionId ? `rel_local_album_photos_${connection.connectionId}` : null;
}

function getLocalAlbumPhotos(connection) {
  const k = getLocalAlbumKey(connection);
  if (!k) return [];
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAlbumPhotos(photos, connection) {
  const k = getLocalAlbumKey(connection);
  if (!k) return;
  try {
    const slice = photos.slice(0, 80);
    localStorage.setItem(k, JSON.stringify(slice));
  } catch {}
}

export function AlbumPage({ t, user, connection, lang = "ar" }) {
  const isAr = lang === "ar";
  const [photos, setPhotos] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingBouquet, setSavingBouquet] = useState(false);
  const [err, setErr] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const autoMigratedRef = useRef(false);

  // Clean legacy unscoped keys
  useEffect(() => {
    try {
      localStorage.removeItem("rel_local_album_photos");
      localStorage.removeItem("rel_local_album_photos_guest");
      localStorage.removeItem("rel_storybook_config");
    } catch (_) {}
  }, []);

  // Multi-Selection State
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bouquetModalOpen, setBouquetModalOpen] = useState(false);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]); // array of { id, url, caption }
  const [commonCaption, setCommonCaption] = useState("");

  // Filter & Search
  const [viewTab, setViewTab] = useState("all"); // 'all' | 'bouquets' | 'mine' | 'partner'
  const [search, setSearch] = useState("");

  // Lightbox
  const [lightbox, setLightbox] = useState({ open: false, photos: [], index: 0 });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  };

  async function loadPhotos(isManualSync = false, isSilent = false) {
    try {
      if (isManualSync) setSyncing(true);
      else if (!isSilent) setLoading(true);
      setErr("");

      const memRes = await api("getMemories");
      let all = [];

      // Extract all photos attached to memories (primary shared cloud store)
      if (Array.isArray(memRes?.memories)) {
        setMemories(memRes.memories);
        memRes.memories.forEach((m) => {
          const cleanDate = formatDateToIso(m.memoryDate) || m.createdAt || "";
          if (m.photoUrl && !all.some((p) => p.url === m.photoUrl)) {
            all.push({
              id: m.coverPhotoId || `ph_mem_${m.id}`,
              url: m.photoUrl,
              caption: m.title || "",
              createdAt: m.createdAt || cleanDate,
              uploaderId: m.authorId || "",
              memoryId: m.id || m.memoryId || "",
              _syncedToServer: true,
            });
          }
          if (Array.isArray(m.photos)) {
            m.photos.forEach((ph) => {
              if (ph && ph.url && !all.some((p) => p.url === ph.url || (p.id && p.id === ph.id))) {
                all.push({
                  id: ph.id || ph.photoId || `ph_${Math.random().toString(36).substring(2, 9)}`,
                  url: ph.url,
                  caption: ph.caption || m.title || "",
                  createdAt: ph.createdAt || m.createdAt || cleanDate,
                  uploaderId: ph.uploaderId || m.authorId || "",
                  memoryId: m.id || m.memoryId || "",
                  _syncedToServer: true,
                });
              }
            });
          }
        });
      }

      // Check if there are any local cached photos that weren't synced to a memoryId yet
      const localCached = getLocalAlbumPhotos(connection);
      const unsyncedLocal = localCached.filter(
        (lp) => lp && lp.url && !all.some((sp) => sp.url === lp.url)
      );

      if (unsyncedLocal.length > 0 && !autoMigratedRef.current && connection?.connectionId) {
        autoMigratedRef.current = true;
        // Keep them visible immediately
        all = [...unsyncedLocal, ...all];
        // Push unsynced local photos to shared server memory in background so partner gets them!
        (async () => {
          try {
            const memResMig = await api("saveMemory", {
              title: isAr ? "صور الألبوم المشترك 📸" : "Shared Album Photos 📸",
              memoryDate: new Date().toISOString().split("T")[0],
              content: "",
              category: "general",
              privacy: "shared",
            });
            const migMemId = memResMig?.memory?.memoryId || memResMig?.memory?.id;
            if (migMemId) {
              for (let i = 0; i < unsyncedLocal.length; i++) {
                const lp = unsyncedLocal[i];
                const compressed = await compressImage(lp.url, 720, 0.68, 32000);
                await api("uploadPhoto", {
                  memoryId: migMemId,
                  data: compressed,
                  caption: lp.caption || (isAr ? "صورة في الألبوم" : "Album Photo"),
                  orderIndex: i,
                  isCover: i === 0,
                });
              }
              const refreshed = await api("getMemories");
              if (Array.isArray(refreshed?.memories)) {
                setMemories(refreshed.memories);
              }
            }
          } catch (_) {}
        })();
      }

      if (all.length > 0) {
        all.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setPhotos(all);
        saveLocalAlbumPhotos(all, connection);
      } else if (localCached.length > 0) {
        setPhotos(localCached);
      } else {
        setPhotos([]);
      }

      if (isManualSync) {
        showToast(isAr ? "تم تحديث الألبوم ومزامنة صور الشريكين بنجاح 🔄" : "Album synchronized with partner! 🔄");
      }
    } catch (e) {
      const localFallback = getLocalAlbumPhotos(connection);
      if (localFallback.length > 0) {
        setPhotos(localFallback);
      } else if (!isSilent) {
        setErr(isAr ? "تعذر تحميل الصور حالياً" : "Unable to load photos at the moment");
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadPhotos();
    const interval = setInterval(() => {
      loadPhotos(false, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [connection?.connectionId]);

  async function handleFilesSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      setUploading(true);
      const compressedList = [];
      for (const file of files) {
        try {
          const compressed = await compressImage(file, 720, 0.68, 32000);
          if (compressed) {
            compressedList.push({
              id: `ph_temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              url: compressed,
              caption: "",
            });
          }
        } catch (_) {}
      }
      if (compressedList.length > 0) {
        setUploadQueue(compressedList);
        setCommonCaption("");
        setUploadModalOpen(true);
      } else {
        showToast(isAr ? "تعذر قراءة الصور، تأكد من الصيغة" : "Failed to read image files");
      }
    } catch (error) {
      showToast(isAr ? "فشل تجهيز الصور، جرب صور تانية" : "Failed to process photos");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleConfirmBatchUpload(e) {
    e.preventDefault();
    if (!uploadQueue.length) return;
    try {
      setUploading(true);
      const cap = commonCaption.trim();
      const count = uploadQueue.length;
      const queueCopy = [...uploadQueue];

      const albumTitle =
        cap ||
        (count > 1
          ? isAr
            ? `بوكيه صور (${count} صور) 📸`
            : `Photo Bouquet (${count} photos) 📸`
          : isAr
          ? "صورة في الألبوم المشترك 📸"
          : "Shared Album Photo 📸");

      const newPhotos = queueCopy.map((ph, idx) => ({
        id: ph.id || `ph_opt_${Date.now()}_${idx}`,
        url: ph.url,
        caption: cap || ph.caption || albumTitle,
        createdAt: new Date().toISOString(),
        uploaderId: user?.id,
        _syncedToServer: true,
      }));

      // Optimistically update photos state immediately!
      setPhotos((prev) => [...newPhotos, ...prev]);
      saveLocalAlbumPhotos([...newPhotos, ...photos], connection);

      setUploadModalOpen(false);
      setUploadQueue([]);
      setCommonCaption("");

      showToast(
        isAr
          ? `جاري حفظ ومزامنة ${count} صور عند الشريكين... 📸`
          : `Uploading and syncing ${count} photos for both partners... 📸`
      );

      // 1. Create a shared memory container so getMemories returns these photos to BOTH partners
      const memRes = await api("saveMemory", {
        title: albumTitle,
        memoryDate: new Date().toISOString().split("T")[0],
        content: cap || "",
        category: "general",
        privacy: "shared",
      });

      const targetMemoryId = memRes?.memory?.memoryId || memRes?.memory?.id;

      // 2. Upload each compressed photo linked to targetMemoryId
      if (targetMemoryId) {
        for (let i = 0; i < queueCopy.length; i++) {
          const ph = queueCopy[i];
          const compressedData = await compressImage(ph.url, 720, 0.68, 32000);
          await api("uploadPhoto", {
            memoryId: targetMemoryId,
            data: compressedData,
            caption: cap || ph.caption || albumTitle,
            orderIndex: i,
            isCover: i === 0,
          });
        }
      }

      showToast(
        isAr
          ? `اتحفظت ${count} صور في الألبوم وظهرت عند الشريكين بنجاح! 🎉📸`
          : `${count} photos synced to both partners! 🎉📸`
      );

      await loadPhotos(false, true);
    } catch (error) {
      showToast(error.message || (isAr ? "حصلت مشكلة أثناء حفظ الصور" : "Error saving photos"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveSelectedAsBouquet() {
    if (selectedPhotosList.length < 2) return;
    try {
      setSavingBouquet(true);
      const bqTitle = isAr
        ? `بوكيه كوتشينة (${selectedPhotosList.length} صور) 💐`
        : `Photo Bouquet (${selectedPhotosList.length} photos) 💐`;

      const memRes = await api("saveMemory", {
        title: bqTitle,
        memoryDate: new Date().toISOString().split("T")[0],
        content: "",
        category: "general",
        privacy: "shared",
      });
      const targetMemoryId = memRes?.memory?.memoryId || memRes?.memory?.id;
      if (targetMemoryId) {
        for (let i = 0; i < selectedPhotosList.length; i++) {
          const ph = selectedPhotosList[i];
          const compressedData = await compressImage(ph.url, 720, 0.68, 32000);
          await api("uploadPhoto", {
            memoryId: targetMemoryId,
            data: compressedData,
            caption: ph.caption || bqTitle,
            orderIndex: i,
            isCover: i === 0,
          });
        }
      }
      setBouquetModalOpen(false);
      setSelectMode(false);
      setSelectedIds(new Set());
      showToast(isAr ? "تم حفظ البوكيه ومشاركته عند الشريكين بنجاح! 💐" : "Bouquet saved and shared with partner! 💐");
      await loadPhotos(false, true);
      setViewTab("bouquets");
    } catch (e) {
      showToast(isAr ? "تعذر حفظ البوكيه" : "Failed to save bouquet");
    } finally {
      setSavingBouquet(false);
    }
  }

  async function handleDeletePhoto(id) {
    const confirmPrompt = isAr
      ? "متأكد إنك عايز تمسح الصورة دي من الألبوم؟"
      : "Are you sure you want to remove this photo from your album?";
    if (!window.confirm(confirmPrompt)) return;
    try {
      const targetPhoto = photos.find((p) => p.id === id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      const remaining = getLocalAlbumPhotos(connection).filter((p) => p.id !== id);
      saveLocalAlbumPhotos(remaining, connection);

      try {
        await api("deletePhoto", { id });
      } catch (_) {}

      // If this photo was the only photo in its memory container, also delete that memory container
      if (targetPhoto?.memoryId) {
        const parentMem = memories.find((m) => (m.id || m.memoryId) === targetPhoto.memoryId);
        if (parentMem && (!parentMem.photos || parentMem.photos.length <= 1)) {
          try {
            await api("deleteMemory", { id: targetPhoto.memoryId });
          } catch (_) {}
        }
      }

      showToast(isAr ? "اتمسحت الصورة من الألبوم" : "Photo removed from album");
      if (lightbox.open) setLightbox({ open: false, photos: [], index: 0 });
    } catch (e) {
      showToast(e.message || (isAr ? "فشل مسح الصورة" : "Failed to delete photo"));
    }
  }

  // Multi-Selection Handlers
  function togglePhotoSelect(id, e) {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedIds.size === filteredPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPhotos.map((p) => p.id)));
    }
  }

  const selectedPhotosList = useMemo(() => {
    return photos.filter((p) => selectedIds.has(p.id));
  }, [photos, selectedIds]);

  // Bouquets from Memories
  const memoryBouquets = useMemo(() => {
    return memories
      .filter((m) => (m.photos && m.photos.length > 1) || (m.photoUrl && m.photos && m.photos.length > 0))
      .map((m) => {
        const phs = (m.photos && m.photos.length > 0)
          ? m.photos
          : (m.photoUrl ? [{ url: m.photoUrl, caption: m.title }] : []);
        return {
          id: m.id || m.memoryId,
          title: m.title,
          date: formatDateToIso(m.memoryDate) || m.memoryDate,
          photos: phs,
        };
      });
  }, [memories]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      if (viewTab === "mine" && p.uploaderId && p.uploaderId !== user?.id) return false;
      if (viewTab === "partner" && p.uploaderId && p.uploaderId === user?.id) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.caption?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [photos, viewTab, search, user]);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 pb-28 space-y-6">
      {/* Top Header Hub */}
      <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[28px]">photo_library</span>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">
              {isAr ? "ألبوم صورنا والبوكيهات" : "Our Photo Album & Bouquets"}
            </h2>
            <span className="text-xs text-on-surface-variant font-medium">
              {photos.length > 0
                ? isAr
                  ? `${photos.length} صورة محفوظة ومشتركة بينكم`
                  : `${photos.length} shared photos captured with love`
                : isAr
                ? "مساحتكم الخاصة للصور المشتركة وبوكيهات الكوتشينة"
                : "Your private sanctuary for captured moments"}
            </span>
          </div>
        </div>

        {/* Action Buttons: Sync, Select, Upload */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh & Partner Sync */}
          <button
            type="button"
            onClick={() => loadPhotos(true)}
            disabled={syncing}
            className="px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-bold border border-outline-variant/30 flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            title={isAr ? "تحديث وتزامن فوري لصور الشريكين" : "Sync partner photos"}
          >
            <span className={`material-symbols-outlined text-[18px] text-primary ${syncing ? "animate-spin" : ""}`}>
              sync
            </span>
            <span className="hidden sm:inline">{isAr ? "تزامن" : "Sync"}</span>
          </button>

          {/* Toggle Multi-Select Mode */}
          {photos.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectMode((prev) => !prev);
                if (selectMode) setSelectedIds(new Set());
              }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                selectMode
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-container hover:bg-surface-bright text-on-surface border-outline-variant/30"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {selectMode ? "check_box" : "checklist"}
              </span>
              <span>
                {selectMode
                  ? isAr ? "إلغاء التحديد" : "Cancel Select"
                  : isAr ? "تحديد صور 📑" : "Select Photos"}
              </span>
            </button>
          )}

          {/* Multi-Photo Upload Button */}
          <label className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
            <span>
              {uploading
                ? isAr ? "بيجهز الصور..." : "Preparing..."
                : isAr ? "ارفع صور جديدة" : "Upload Photos"}
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFilesSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Tabs Bar: All Photos, Memory Bouquets, Mine, Partner */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Search Box */}
        <div className="flex items-center rounded-xl bg-surface-container px-3.5 py-2 border border-outline-variant/30 flex-1 min-w-[200px]">
          <span className="material-symbols-outlined text-outline text-[18px] mr-2 rtl:ml-2 rtl:mr-0">search</span>
          <input
            type="text"
            placeholder={isAr ? "دور في تعليقات الصور..." : "Search photo captions..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-outline hover:text-on-surface cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: isAr ? "كل الصور" : "All Photos", icon: "photo_library" },
            { id: "bouquets", label: isAr ? `بوكيهات كوتشينة (${memoryBouquets.length})` : "Bouquets", icon: "style" },
            { id: "mine", label: isAr ? "تصويري" : "My Photos", icon: "person" },
            { id: "partner", label: isAr ? "تصوير شريكي" : "Partner's", icon: "favorite" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                viewTab === tab.id
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Select Mode Helper Header */}
      {selectMode && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-primary font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">touch_app</span>
            <span>
              {isAr
                ? `اضغط على أي صورة لتحديدها وتجميعها في بوكيه كوتشينة (محدد ${selectedIds.size})`
                : `Select photos to bundle into a bouquet (${selectedIds.size} selected)`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSelectAll}
            className="underline hover:text-primary-container cursor-pointer"
          >
            {selectedIds.size === filteredPhotos.length
              ? isAr ? "إلغاء تحديد الكل" : "Deselect All"
              : isAr ? "تحديد الكل" : "Select All"}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-on-surface-variant font-medium">
            {isAr ? "بنجمّع صوركم من الألبوم المشترك..." : "Gathering your shared photos..."}
          </span>
        </div>
      ) : viewTab === "bouquets" ? (
        /* BOUQUETS TAB */
        memoryBouquets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-surface-container/60 border border-outline-variant/30 space-y-3">
            <div className="w-16 h-16 rounded-full bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">style</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface">
              {isAr ? "مفيش بوكيهات متجمعة لسه" : "No photo bouquets yet"}
            </h3>
            <p className="text-xs text-on-surface-variant max-w-sm">
              {isAr
                ? "تقدر تختار كذا صورة من تبويب (كل الصور) وتضغط 'عرض كبوكيه كوتشينة' أو تضيف أكتر من صورة لأي ذكرى!"
                : "You can select photos to gather into a bouquet, or add multiple photos to any memory!"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-8">
            {memoryBouquets.map((bq, bqIdx) => (
              <div
                key={bq.id || bqIdx}
                className="p-5 rounded-3xl bg-surface-container border border-outline-variant/30 shadow-md flex flex-col space-y-2"
              >
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">style</span>
                    <span>{bq.title}</span>
                  </h4>
                  <span className="text-xs text-secondary font-semibold">{bq.date}</span>
                </div>
                <PhotoBouquet
                  photos={bq.photos}
                  title={bq.title}
                  isAr={isAr}
                  onPhotoClick={(idx) => setLightbox({ open: true, photos: bq.photos, index: idx })}
                />
              </div>
            ))}
          </div>
        )
      ) : filteredPhotos.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-surface-container/60 border border-outline-variant/30 space-y-4 my-8">
          <div className="w-16 h-16 rounded-full bg-surface-container-high text-primary/80 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-3xl">photo_album</span>
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-xl font-bold text-on-surface">
              {isAr ? "الألبوم لسه فاضي ومستني أول صورة منكم" : "Your album is ready for your first photo"}
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {isAr
                ? "كل صورة هترفعوها هنا أو هتضيفوها مع ذكرياتكم هتتحفظ وتظهر هنا في الألبوم بجودتها وتتشارك تلقائياً عند الشريكين."
                : "Every photo uploaded will be shared across both partners automatically."}
            </p>
          </div>
          <label className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer mt-2">
            <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
            <span>{isAr ? "ارفعوا أول صورة تجمعكم سوا" : "Upload your first photo"}</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFilesSelect}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        /* Photo Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {filteredPhotos.map((photo, index) => {
            const isSelected = selectedIds.has(photo.id);

            return (
              <div
                key={photo.id || index}
                onClick={(e) => {
                  if (selectMode) {
                    togglePhotoSelect(photo.id, e);
                  } else {
                    setLightbox({ open: true, photos: filteredPhotos, index });
                  }
                }}
                className={`group relative rounded-2xl overflow-hidden bg-surface-container border cursor-pointer aspect-square shadow-xs transition-all duration-300 hover:-translate-y-1 ${
                  isSelected
                    ? "border-primary ring-3 ring-primary shadow-lg scale-98"
                    : "border-outline-variant/40 hover:shadow-lg hover:border-primary/50"
                }`}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Couple Photo"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* Selection Checkmark Button on Top-Right */}
                <button
                  type="button"
                  onClick={(e) => {
                    if (!selectMode) setSelectMode(true);
                    togglePhotoSelect(photo.id, e);
                  }}
                  className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                    isSelected
                      ? "bg-primary text-on-primary scale-110"
                      : selectMode
                      ? "bg-black/50 text-white hover:bg-black/70 border border-white/40"
                      : "opacity-0 group-hover:opacity-100 bg-black/40 text-white hover:bg-black/70"
                  }`}
                  title={isSelected ? (isAr ? "إلغاء التحديد" : "Deselect") : (isAr ? "تحديد" : "Select")}
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {isSelected ? "check" : "radio_button_unchecked"}
                  </span>
                </button>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 text-white pointer-events-none">
                  {photo.caption && (
                    <p className="text-xs font-semibold truncate leading-tight drop-shadow-md">
                      {photo.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1 text-[10px] opacity-80 font-mono">
                    <span>{photo.createdAt ? String(photo.createdAt).split("T")[0] : ""}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                      className="p-1 rounded-full hover:bg-white/20 text-red-300 hover:text-red-200 transition-colors pointer-events-auto cursor-pointer"
                      title={isAr ? "مسح الصورة" : "Delete photo"}
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING ACTION BAR FOR MULTI-SELECT */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 inset-x-4 max-w-xl mx-auto z-40 bg-surface-container-highest/95 backdrop-blur-md rounded-3xl p-3 shadow-2xl border border-primary/30 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 px-2 text-xs font-bold text-on-surface">
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-[11px]">
              {selectedIds.size}
            </span>
            <span>{isAr ? "صور محددة" : "selected"}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* View as Photo Bouquet */}
            <button
              type="button"
              onClick={() => setBouquetModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">style</span>
              <span>{isAr ? "عرض كبوكيه كوتشينة 💐" : "View Bouquet 💐"}</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer transition-colors"
              title={isAr ? "إلغاء التحديد" : "Clear"}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: PHOTO BOUQUET PLAYING CARDS ("كوتشينة الذكريات") */}
      {bouquetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-surface-container-high p-6 shadow-2xl border border-outline-variant/40 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[24px]">style</span>
                <h3 className="text-lg font-bold text-on-surface">
                  {isAr
                    ? `بوكيه كوتشينة الصور (${selectedPhotosList.length} صور)`
                    : `Photo Bouquet Cards (${selectedPhotosList.length} photos)`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBouquetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {isAr
                ? "الصور اتجمعت في بوكيه واحد أنيق، اضغط عليه عشان تتفرز ككوتشينة لعب 🎴 واضغط على أي كارت للتكبير!"
                : "Photos gathered into a deck. Click to fan out like playing cards and explore!"}
            </p>

            <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/20">
              <PhotoBouquet
                photos={selectedPhotosList}
                title={isAr ? "بوكيه الصور المحددة" : "Selected Photos"}
                isAr={isAr}
                onPhotoClick={(idx) => {
                  setBouquetModalOpen(false);
                  setLightbox({ open: true, photos: selectedPhotosList, index: idx });
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                disabled={savingBouquet || selectedPhotosList.length < 2}
                onClick={handleSaveSelectedAsBouquet}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xs shadow-md hover:opacity-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                <span>
                  {savingBouquet
                    ? isAr ? "جاري حفظ البوكيه للشريكين..." : "Saving shared bouquet..."
                    : isAr ? "حفظ كبوكيه مشترك عند الشريكين 💐" : "Save Shared Bouquet 💐"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBouquetModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-surface-container text-on-surface font-bold text-xs hover:bg-surface-bright cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Caption Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-high p-6 shadow-2xl border border-outline-variant/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface">
                {isAr ? `إضافة ${uploadQueue.length} صور للألبوم` : `Add ${uploadQueue.length} Photos`}
              </h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Preview Strip */}
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {uploadQueue.map((item, qIdx) => (
                <div key={item.id || qIdx} className="relative rounded-xl overflow-hidden aspect-square border border-outline-variant/30">
                  <img src={item.url} alt={`Upload ${qIdx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <form onSubmit={handleConfirmBatchUpload} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  {isAr ? "تعليق أو ذكرى للصور (اختياري)" : "Photo Caption / Memory (Optional)"}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? "مثلاً: يوم ما خرجنا في المعادي..." : "e.g. Our favorite sunset walk..."}
                  value={commonCaption}
                  onChange={(e) => setCommonCaption(e.target.value)}
                  className="rounded-xl bg-surface-container px-3.5 py-2.5 text-sm text-on-surface border border-outline-variant/30 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="flex-1 rounded-xl bg-surface-container py-2.5 text-on-surface text-sm font-semibold hover:bg-surface-bright cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 rounded-xl bg-primary text-on-primary py-2.5 text-sm font-semibold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {uploading
                    ? (isAr ? "بيحفظ الصور..." : "Saving...")
                    : (isAr ? "حفظ في الألبوم" : "Save to Album")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox.open && (
        <Lightbox
          photos={lightbox.photos}
          currentIndex={lightbox.index}
          onClose={() => setLightbox({ open: false, photos: [], index: 0 })}
          onNavigate={(newIdx) => setLightbox((prev) => ({ ...prev, index: newIdx }))}
        />
      )}

      {/* Micro-Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2 text-on-surface shadow-2xl border border-outline-variant/40 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
