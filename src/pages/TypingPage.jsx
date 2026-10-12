import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

function pointsToSvgPath(points) {
  if (!Array.isArray(points) || points.length === 0) return "";
  return points.reduce((acc, p, i) => {
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") return acc;
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");
}

export function TypingPage({ t, user, lang = "ar" }) {
  const isAr = lang === "ar";
  const [mode, setMode] = useState("free"); // Default to 'free' so user sees Free Typing working immediately, and can switch to hand easily!

  // Free Typing State
  const [title, setTitle] = useState("Shared Journal");
  const [content, setContent] = useState("");
  const [version, setVersion] = useState(1);
  const [saveStatus, setSaveStatus] = useState("saved"); // 'saved' | 'saving' | 'offline' | 'conflict'
  const [conflictNote, setConflictNote] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Hand Typing State
  const [stationery, setStationery] = useState("cream"); // 'cream' | 'rose' | 'emerald'
  const [inkColor, setInkColor] = useState("#4A0E2E"); // Burgundy Rose default
  const [drawing, setDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [showWaxModal, setShowWaxModal] = useState(false);
  const [waxSealed, setWaxSealed] = useState(false);

  // Partner's Received Letters State
  const [receivedLetters, setReceivedLetters] = useState([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [readingLetter, setReadingLetter] = useState(null);

  const localDraftKey = "free_typing_local_draft";
  const timerRef = useRef(null);
  const textareaRef = useRef(null);
  const canvasRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  };

  // Load Note from server on mount
  useEffect(() => {
    async function loadServerNote() {
      try {
        const res = await api("getNote");
        if (res.note) {
          setTitle(res.note.title || "Shared Journal");
          setContent(res.note.content || "");
          setVersion(res.note.version || 1);
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("offline");
        const local = localStorage.getItem(localDraftKey);
        if (local) setContent(local);
      }
    }
    loadServerNote();
  }, []);

  // Fetch received letters from partner
  async function loadLetters() {
    try {
      setLoadingLetters(true);
      const res = await api("getLetters");
      const list = Array.isArray(res.received) ? res.received : [];
      setReceivedLetters(list);
    } catch {
    } finally {
      setLoadingLetters(false);
    }
  }

  useEffect(() => {
    loadLetters();
  }, []);

  // Text changes with debounce
  function handleTextChange(newContent) {
    setContent(newContent);
    localStorage.setItem(localDraftKey, newContent);
    setSaveStatus("saving");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api("saveNote", {
          title,
          content: newContent,
          baseVersion: version,
        });

        if (res.conflict) {
          setSaveStatus("conflict");
          setConflictNote(res.note);
        } else if (res.note) {
          setVersion(res.note.version);
          setSaveStatus("saved");
          setConflictNote(null);
        }
      } catch {
        setSaveStatus("offline");
      }
    }, 1200);
  }

  // Explicit save action for Free Typing
  const handleExplicitSave = async () => {
    try {
      setSaveStatus("saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      localStorage.setItem(localDraftKey, content);
      const res = await api("saveNote", {
        title: title.trim() || "Shared Journal",
        content: content,
        baseVersion: version,
      });

      if (res.conflict) {
        setSaveStatus("conflict");
        setConflictNote(res.note);
        showToast(isAr ? "تنبيه: يوجد تعديل متزامن من الشريك" : "Conflict detected from partner");
      } else if (res.note) {
        setVersion(res.note.version);
        setSaveStatus("saved");
        setConflictNote(null);
        showToast(isAr ? "تم حفظ الخاطرة في الشيت بنجاح! 💾" : "Note saved successfully! 💾");
      }
    } catch {
      setSaveStatus("offline");
      showToast(isAr ? "تم الحفظ محلياً في المتصفح" : "Saved locally");
    }
  };

  // Formatting helpers
  function insertFormatting(prefix, suffix = "") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = prefix + selected + suffix;
    const updated = content.slice(0, start) + replacement + content.slice(end);
    handleTextChange(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  }

  // Hand Typing drawing handlers
  const handlePointerDown = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing(true);
    setCurrentStroke({ color: inkColor, points: [{ x, y }] });
  };

  const handlePointerMove = (e) => {
    if (!drawing || !currentStroke) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentStroke((prev) => ({
      ...prev,
      points: [...prev.points, { x, y }],
    }));
  };

  const handlePointerUp = () => {
    if (drawing && currentStroke && currentStroke.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setDrawing(false);
    setCurrentStroke(null);
  };

  const clearCanvas = () => {
    setStrokes([]);
    setCurrentStroke(null);
    showToast(isAr ? "تم مسح الورقة بالكامل" : "Parchment cleared");
  };

  const undoStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  // Convert SVG strokes and selected stationery to a crisp JPEG image DataURL
  const exportDrawingToDataUrl = () => {
    if (strokes.length === 0) return "";
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Stationery background colors
    const bgColors = {
      cream: "#f7efe6",
      rose: "#281822",
      emerald: "#10221c",
    };
    ctx.fillStyle = bgColors[stationery] || "#f7efe6";
    ctx.fillRect(0, 0, width, height);

    // Elegant stationery border
    ctx.strokeStyle = stationery === "cream" ? "#e0d0c3" : "#574048";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Scale from SVG bounding rect to canvas dimensions
    const svgEl = canvasRef.current;
    const svgRect = svgEl?.getBoundingClientRect();
    const scaleX = svgRect?.width ? width / svgRect.width : 1;
    const scaleY = svgRect?.height ? height / svgRect.height : 1;

    // Render strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokes.forEach((s) => {
      if (!s.points || s.points.length === 0) return;
      ctx.strokeStyle = s.color || "#4A0E2E";
      ctx.lineWidth = 3.2 * scaleX;
      ctx.beginPath();
      s.points.forEach((pt, i) => {
        const x = pt.x * scaleX;
        const y = pt.y * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    return canvas.toDataURL("image/jpeg", 0.85);
  };

  // Fold and Send Wax-Sealed Letter
  const handleSendWaxLetter = async () => {
    if (strokes.length === 0 && !content.trim()) {
      showToast(isAr ? "اكتب أو ارسم حاجة الأول قبل ختم الجواب! ✍️" : "Draw or write something before sealing! ✍️");
      setShowWaxModal(false);
      return;
    }

    setWaxSealed(true);
    const drawingImg = exportDrawingToDataUrl();
    const letterTitle = isAr ? "جواب بخط اليد بالشمع الملكي 💌" : "Handwritten Wax-Sealed Letter 💌";

    // Encode payload so partner receives both the handwritten drawing image and note text
    const letterPayload = JSON.stringify({
      type: "handwritten",
      drawingUrl: drawingImg,
      textNote: content.trim() || "",
      stationery: stationery,
      sentAt: new Date().toISOString(),
    });

    setTimeout(async () => {
      try {
        await api("sendLetter", {
          title: letterTitle,
          content: letterPayload,
          theme: stationery,
        });
        showToast(isAr ? "تم إرسال الجواب وختمه بالشمع لشريكك بنجاح! 💌" : "Wax-sealed letter sent to your partner! 💌");
        setStrokes([]);
        await loadLetters();
      } catch (err) {
        // Fallback: save letter so content is not lost
        try {
          await api("saveLetter", {
            title: letterTitle,
            content: letterPayload,
            theme: stationery,
          });
          showToast(isAr ? "تم حفظ الجواب في صندوق الرسائل بنجاح 💌" : "Letter saved to mailbox 💌");
          await loadLetters();
        } catch {
          showToast(isAr ? "حصلت مشكلة في الإرسال، تأكد من اتصال الشريك" : "Failed to send letter");
        }
      } finally {
        setShowWaxModal(false);
        setWaxSealed(false);
      }
    }, 1600);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 100));

  // Stationery themes
  const stationeryThemes = {
    cream: {
      bg: "bg-[#f7efe6]",
      text: "text-[#341b24]",
      sub: "text-[#6e4e5b]",
      border: "border-[#e0d0c3]",
    },
    rose: {
      bg: "bg-[#281822]",
      text: "text-[#ffdbe8]",
      sub: "text-[#debec8]",
      border: "border-[#574048]",
    },
    emerald: {
      bg: "bg-[#10221c]",
      text: "text-[#c2f2dc]",
      sub: "text-[#87a998]",
      border: "border-[#1d4337]",
    },
  };

  // Helper to parse letter content (detects handwritten drawing vs plain text)
  const parseLetterContent = (raw) => {
    if (!raw) return { isHandwritten: false, drawingUrl: "", textNote: "" };
    try {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.drawingUrl || parsed.type === "handwritten")) {
        return {
          isHandwritten: true,
          drawingUrl: parsed.drawingUrl || "",
          textNote: parsed.textNote || "",
          stationery: parsed.stationery || "cream",
          sentAt: parsed.sentAt || "",
        };
      }
    } catch {}
    return { isHandwritten: false, drawingUrl: "", textNote: String(raw) };
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-5 pb-24">
      {/* Top Header Hub */}
      <section className="flex items-center justify-between pt-2 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-primary flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[24px]">
              {mode === "free" ? "edit_note" : "draw"}
            </span>
          </div>
          <div>
            <h2 className="font-headline-md text-title-lg text-on-surface font-semibold tracking-tight">
              {mode === "free"
                ? (isAr ? "مساحة الكتابة الحرة" : "Writing Sanctuary")
                : (isAr ? "رسم وجوابات بخط اليد والشمع" : "Handwritten Ink & Wax Notes")}
            </h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {mode === "free"
                ? (isAr ? "يوميات مشتركة وخواطر فورية" : "Real-time shared journal & intimate reflections")
                : (isAr ? "أوراق عتيقة، رسم باليد، وختم شمع ملكي" : "Digital stationery parchment & wax-sealed notes")}
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1 rounded-full bg-surface-container border border-outline-variant/30 select-none">
          <button
            onClick={() => setMode("free")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === "free"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">edit_document</span>
            <span>{isAr ? "كتابة حرة" : "Free Typing"}</span>
          </button>
          <button
            onClick={() => setMode("hand")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === "hand"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">draw</span>
            <span>{isAr ? "رسم وخط اليد" : "Hand Typing"}</span>
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* TAB 1: FREE TYPING MODE                                    */}
      {/* ========================================================= */}
      {mode === "free" && (
        <div className="flex flex-col space-y-3 animate-in fade-in duration-300">
          {/* Status Bar */}
          <div className="flex items-center justify-between text-xs text-on-surface-variant px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  saveStatus === "saved"
                    ? "bg-green-500"
                    : saveStatus === "saving"
                    ? "bg-amber-500 animate-pulse"
                    : saveStatus === "conflict"
                    ? "bg-error animate-ping"
                    : "bg-outline"
                }`}
              />
              <span className="font-medium">
                {saveStatus === "saved" && (isAr ? "محفوظ في الشيت" : "Saved to cloud")}
                {saveStatus === "saving" && (isAr ? "جاري الحفظ..." : "Saving...")}
                {saveStatus === "offline" && (isAr ? "محفوظ محلياً فقط" : "Saved locally (Offline)")}
                {saveStatus === "conflict" && (isAr ? "يوجد تعديل متزامن من الشريك" : "Conflict detected")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span>{wordCount} {isAr ? "كلمة" : "words"}</span>
              <span>•</span>
              <span>{readTime} {isAr ? "دقيقة قراءة" : "min read"}</span>
            </div>
          </div>

          {/* Formatting Toolbar & Save Button */}
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-surface-container border border-outline-variant/30 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => insertFormatting("**", "**")}
                className="p-1.5 rounded-xl hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                title={isAr ? "عريض" : "Bold"}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">format_bold</span>
              </button>
              <button
                onClick={() => insertFormatting("*", "*")}
                className="p-1.5 rounded-xl hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                title={isAr ? "مائل" : "Italic"}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">format_italic</span>
              </button>
              <button
                onClick={() => insertFormatting("> ")}
                className="p-1.5 rounded-xl hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                title={isAr ? "اقتباس" : "Quote"}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">format_quote</span>
              </button>
              <button
                onClick={() => insertFormatting("- ")}
                className="p-1.5 rounded-xl hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                title={isAr ? "قائمة نقطية" : "Bullet list"}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              </button>
            </div>

            {/* Manual Save Button */}
            <button
              onClick={handleExplicitSave}
              type="button"
              className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ml-auto rtl:mr-auto rtl:ml-0"
              title={isAr ? "حفظ فوري في الشيت" : "Save instantly to cloud"}
            >
              <span className={`material-symbols-outlined text-[16px] ${saveStatus === "saving" ? "animate-spin" : ""}`}>
                {saveStatus === "saving" ? "sync" : "save"}
              </span>
              <span>
                {saveStatus === "saving"
                  ? (isAr ? "جاري الحفظ..." : "Saving...")
                  : (isAr ? "احفظ الآن 💾" : "Save Now 💾")}
              </span>
            </button>
          </div>

          {/* Text Editor */}
          <div className="rounded-3xl bg-surface-container p-4 sm:p-6 border border-outline-variant/30 shadow-md">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isAr ? "عنوان اليوميات أو الخاطرة..." : "Note title..."}
              className="w-full bg-transparent text-lg sm:text-xl font-bold text-on-surface focus:outline-none mb-3 pb-2 border-b border-outline-variant/30"
            />
            <textarea
              ref={textareaRef}
              rows={12}
              value={content}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={isAr ? "اكتب اللي في قلبك بحرية، كل حرف بيتحفظ بينكم فوراً..." : "Pour your heart out freely, synced in real-time..."}
              className="w-full bg-transparent text-sm sm:text-base text-on-surface focus:outline-none resize-none leading-relaxed"
              dir="auto"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HANDWRITTEN INK & WAX LETTERS                      */}
      {/* ========================================================= */}
      {mode === "hand" && (
        <div className="flex flex-col space-y-4 animate-in fade-in duration-300">
          {/* Controls: Stationery selector & Ink color palette */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container border border-outline-variant/30 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium">
                {isAr ? "الورق:" : "Paper:"}
              </span>
              {[
                { id: "cream", label: isAr ? "بيج كلاسيك" : "Cream" },
                { id: "rose", label: isAr ? "وردي دمشقي" : "Rose" },
                { id: "emerald", label: isAr ? "زمردي هادئ" : "Emerald" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStationery(st.id)}
                  type="button"
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    stationery === st.id
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium">
                {isAr ? "الحبر:" : "Ink:"}
              </span>
              {[
                { color: "#4A0E2E", name: "Burgundy" },
                { color: "#d8587e", name: "Rose" },
                { color: "#1E293B", name: "Midnight" },
                { color: "#B45309", name: "Gold" },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => setInkColor(c.color)}
                  type="button"
                  style={{ backgroundColor: c.color }}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer border-2 ${
                    inkColor === c.color ? "scale-125 border-white shadow-sm" : "border-transparent"
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Digital Stationery Canvas Container */}
          <div className="relative w-full rounded-3xl p-1 bg-surface-container-high/40 shadow-2xl overflow-hidden flex flex-col items-center border border-outline-variant/30">
            {/* Active Stationery Paper Surface */}
            <div
              className={`relative w-full rounded-2xl p-5 sm:p-6 min-h-[380px] sm:min-h-[440px] flex flex-col justify-between shadow-2xl transition-colors duration-300 overflow-hidden select-none ${stationeryThemes[stationery].bg} ${stationeryThemes[stationery].text}`}
            >
              {/* Header Stamp */}
              <div className={`flex items-center justify-between opacity-60 font-headline-md text-xs italic ${stationeryThemes[stationery].sub}`}>
                <span>{isAr ? "جواب من القلب • باليد والشمع" : "Handwritten from the Heart"}</span>
                <span>♥</span>
              </div>

              {/* Interactive SVG Drawing Surface */}
              <svg
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="w-full h-72 sm:h-80 touch-none cursor-crosshair my-2 rounded-xl"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }}
              >
                {/* Simulated prompt if user hasn't drawn yet */}
                {strokes.length === 0 && !currentStroke && (
                  <g opacity="0.6">
                    <text
                      x="50%"
                      y="50%"
                      dominantBaseline="middle"
                      textAnchor="middle"
                      fill={stationery === "cream" ? "#4A0E2E" : "#ffdbe8"}
                      fontSize="16"
                      fontFamily="Cairo, Edu QLD Hand, sans-serif"
                      fontWeight="bold"
                    >
                      {isAr ? "✍️ ارسم أو اكتب هنا بإصبعك أو الماوس وسجل مشاعرك" : "✍️ Draw or write here with your finger or mouse"}
                    </text>
                  </g>
                )}

                {/* Drawn strokes */}
                {strokes.map((s, idx) => {
                  const pathD = pointsToSvgPath(s?.points);
                  if (!pathD) return null;
                  return (
                    <path
                      key={idx}
                      d={pathD}
                      stroke={s.color || inkColor}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  );
                })}

                {/* Current Active Stroke */}
                {currentStroke && pointsToSvgPath(currentStroke?.points) && (
                  <path
                    d={pointsToSvgPath(currentStroke.points)}
                    stroke={currentStroke.color || inkColor}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
              </svg>

              {/* Optional Bottom Text Note */}
              <div className="pt-2 border-t border-[#c89f4b]/20">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={isAr ? "كلمات إضافية ترسل مع الرسمة... (اختياري)" : "Extra note words to send with the drawing... (optional)"}
                  className="w-full bg-transparent text-xs font-semibold focus:outline-none placeholder:opacity-50"
                  dir="auto"
                />
              </div>

              {/* Footer Watermark */}
              <div className={`flex items-center justify-between opacity-50 text-[11px] pt-1 ${stationeryThemes[stationery].sub}`}>
                <span>{isAr ? "معاً إلى الأبد" : "Forever & Always"}</span>
                <span>❦</span>
              </div>
            </div>
          </div>

          {/* Hand Typing Action Bar */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={undoStroke}
                disabled={strokes.length === 0}
                className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all border border-outline-variant/30 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                type="button"
                title={isAr ? "تراجع عن آخر خط" : "Undo last stroke"}
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                <span>{isAr ? "تراجع" : "Undo"}</span>
              </button>
              <button
                onClick={clearCanvas}
                className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all border border-outline-variant/30 flex items-center gap-1 cursor-pointer"
                type="button"
                title={isAr ? "مسح الرسم" : "Clear parchment"}
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>{isAr ? "مسح" : "Clear"}</span>
              </button>
            </div>

            {/* Fold & Wax Seal Action Button */}
            <button
              onClick={() => setShowWaxModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xs sm:text-sm transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                markunread_mailbox
              </span>
              <span>{isAr ? "طوي وختم الجواب بالشمع الملكي 💌" : "Fold & Wax Seal Letter"}</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* RECEIVED LETTERS FROM PARTNER SECTION (جوابات الشريك)       */}
          {/* ========================================================= */}
          <section className="w-full flex flex-col space-y-3 pt-6 border-t border-outline-variant/30 mt-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">markunread_mailbox</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface">
                    {isAr ? "رسائل وجوابات الشريك الواردة 💌" : "Letters Received from Partner 💌"}
                  </h3>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {receivedLetters.length > 0
                      ? (isAr ? `وصلك ${receivedLetters.length} جواب من شريكك` : `${receivedLetters.length} letters received`)
                      : (isAr ? "أي جواب شريكك هيبعته هيظهر هنا فوراً" : "Letters your partner sends will appear here")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={loadLetters}
                disabled={loadingLetters}
                className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary border border-primary/20 flex items-center gap-1 transition-all cursor-pointer"
                title={isAr ? "تحديث صندوق الجوابات" : "Refresh letters inbox"}
              >
                <span className={`material-symbols-outlined text-[16px] ${loadingLetters ? "animate-spin" : ""}`}>refresh</span>
                <span>{isAr ? "تحديث" : "Refresh"}</span>
              </button>
            </div>

            {loadingLetters && receivedLetters.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant font-medium">
                {isAr ? "جاري تحميل الجوابات..." : "Loading incoming letters..."}
              </div>
            ) : receivedLetters.length === 0 ? (
              <div className="p-6 rounded-3xl bg-surface-container text-center flex flex-col items-center space-y-2 border border-outline-variant/20">
                <span className="text-3xl">💌</span>
                <span className="text-sm font-bold text-on-surface">
                  {isAr ? "لسه مفيش جوابات مبعوثة من الشريك" : "No letters received from your partner yet"}
                </span>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  {isAr
                    ? "ابعتله أول جواب مرسوم ومختوم بالشمع من فوق، وهتلاقوا كل جواباتكم محفوظة ومتبادلة هنا دايماً!"
                    : "Send the first handwritten letter above, and all your incoming letters will appear here!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {receivedLetters.map((l, idx) => {
                  const parsed = parseLetterContent(l.content);
                  return (
                    <article
                      key={l.id || idx}
                      onClick={() => setReadingLetter(l)}
                      className="relative p-4 rounded-3xl bg-[#fdfbf7] text-[#26140f] border border-[#c89f4b]/35 shadow-md hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      {/* Top Header with Seal & Date */}
                      <div className="flex items-center justify-between border-b border-[#c89f4b]/20 pb-2">
                        <div className="flex items-center gap-2">
                          {/* Wax Seal Badge */}
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c43b5d] to-[#7f1d35] flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                            {isAr ? "ختم" : "Seal"}
                          </div>
                          <span className="text-xs font-bold font-serif text-[#4A0E2E]">
                            {l.title || (isAr ? "جواب حب" : "Love Letter")}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 font-medium">
                          {l.sentAt ? new Date(l.sentAt).toLocaleDateString(isAr ? "ar-EG" : "en-US") : ""}
                        </span>
                      </div>

                      {/* Content Preview */}
                      {parsed.drawingUrl ? (
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 relative">
                          <img
                            src={parsed.drawingUrl}
                            alt="Handwritten drawing"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                            <span className="px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              {isAr ? "فتح الجواب 💌" : "Open Letter 💌"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-stone-700 font-serif leading-relaxed line-clamp-3 italic px-1">
                          «{parsed.textNote || (isAr ? "رسالة خاصة من القلب" : "A special heartfelt note")}»
                        </p>
                      )}

                      {/* Footer Sender Info */}
                      <div className="flex items-center justify-between text-[11px] text-[#854d0e] pt-1">
                        <span>{isAr ? "من: الشريك 💖" : "From: Partner 💖"}</span>
                        <span className="text-primary font-bold flex items-center gap-0.5">
                          <span>{isAr ? "قراءة" : "Read"}</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* READING LETTER MODAL (نافذة فتح وقراءة الجواب)             */}
      {/* ========================================================= */}
      {readingLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#fdfbf7] text-[#26140f] p-5 sm:p-7 shadow-2xl border-2 border-[#c89f4b]/40 flex flex-col space-y-4 my-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#c89f4b]/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c43b5d] to-[#7f1d35] flex items-center justify-center text-white text-xs font-bold shadow-md">
                  ♥
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#4A0E2E]">
                    {readingLetter.title || (isAr ? "جواب الشريك المختوم" : "Sealed Letter")}
                  </h3>
                  <span className="text-[11px] text-stone-500">
                    {readingLetter.sentAt ? new Date(readingLetter.sentAt).toLocaleString(isAr ? "ar-EG" : "en-US") : ""}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReadingLetter(null)}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-300 text-stone-700 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Content Body */}
            {(() => {
              const parsed = parseLetterContent(readingLetter.content);
              return (
                <div className="flex flex-col space-y-3">
                  {parsed.drawingUrl && (
                    <div className="w-full rounded-2xl overflow-hidden border border-[#c89f4b]/30 shadow-inner bg-white p-1">
                      <img
                        src={parsed.drawingUrl}
                        alt="Handwritten letter"
                        className="w-full h-auto max-h-[380px] object-contain rounded-xl"
                      />
                    </div>
                  )}

                  {parsed.textNote && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/50">
                      <p className="text-xs sm:text-sm font-serif text-stone-800 whitespace-pre-line leading-relaxed">
                        {parsed.textNote}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#c89f4b]/20">
              <span className="text-xs text-[#854d0e] font-serif font-bold">
                {isAr ? "مع كل الحب والوداد 💖" : "With all love & tenderness 💖"}
              </span>

              <button
                type="button"
                onClick={() => setReadingLetter(null)}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:opacity-95 cursor-pointer"
              >
                {isAr ? "إغلاق الجواب" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* WAX SEAL CONFIRMATION MODAL                               */}
      {/* ========================================================= */}
      {showWaxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-high p-6 shadow-2xl flex flex-col items-center text-center space-y-4 border border-outline-variant/40 animate-in fade-in zoom-in-95 duration-200">
            {/* Wax Seal Stamp Icon */}
            <div
              className={`w-20 h-20 rounded-full bg-primary-container text-white flex items-center justify-center shadow-[0_0_30px_rgba(255,176,205,0.5)] border-4 border-primary transition-transform duration-700 ${
                waxSealed ? "scale-125 rotate-180" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
            </div>

            <div className="flex flex-col space-y-1">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                {isAr ? "طوي وختم الجواب بالشمع الملكي" : "Fold & Apply Wax Seal"}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isAr
                  ? "سيتم ختم رسمتك باليد وشمع الورد الملكي وإرسالها فوراً إلى شريكك."
                  : "Your handwritten letter will be sealed with a hot rose wax emblem and sent exclusively to your partner."}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <button
                type="button"
                onClick={() => setShowWaxModal(false)}
                className="flex-1 rounded-xl bg-surface-container py-2.5 text-on-surface font-semibold hover:bg-surface-bright transition-all cursor-pointer text-xs"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSendWaxLetter}
                disabled={waxSealed}
                className="flex-1 rounded-xl bg-primary text-on-primary py-2.5 font-semibold hover:opacity-95 transition-all shadow-md cursor-pointer text-xs"
              >
                {waxSealed ? (isAr ? "جاري الختم والإرسال..." : "Sealing...") : (isAr ? "اختم وابعت 💌" : "Seal & Send")}
              </button>
            </div>
          </div>
        </div>
      )}

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
