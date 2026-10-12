import { useEffect, useState } from "react";
import { api } from "../api.js";
import { SignatureLoader } from "../components/SignatureLoader.jsx";
import { EmotionalEmptyState } from "../components/EmotionalEmptyState.jsx";

export function LettersPage({ t, user, connection, lang = "ar" }) {
  const [tab, setTab] = useState("received"); // 'received' | 'sent' | 'drafts'
  const [lettersData, setLettersData] = useState({ received: [], sent: [], drafts: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Compose Modal
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    isScheduled: false,
    scheduledDate: "",
    scheduledTime: "12:00",
  });
  const [sending, setSending] = useState(false);

  // Read Modal
  const [readingLetter, setReadingLetter] = useState(null);
  const [letterOpening, setLetterOpening] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  };

  async function loadLetters() {
    try {
      setLoading(true);
      const res = await api("getLetters");
      setLettersData({
        received: res.received || [],
        sent: res.sent || [],
        drafts: res.drafts || [],
      });
    } catch (e) {
      setErr(e.message || (lang === "en" ? "Failed to load letters" : "فشل تحميل الجوابات"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLetters();
  }, []);

  function openCompose(letter = null) {
    if (letter) {
      setEditingLetter(letter);
      setForm({
        title: letter.title || "",
        content: letter.content || "",
        isScheduled: !!letter.scheduledFor,
        scheduledDate: letter.scheduledFor ? letter.scheduledFor.split("T")[0] : "",
        scheduledTime:
          letter.scheduledFor && letter.scheduledFor.includes("T")
            ? letter.scheduledFor.split("T")[1].slice(0, 5)
            : "12:00",
      });
    } else {
      setEditingLetter(null);
      setForm({
        title: "",
        content: "",
        isScheduled: false,
        scheduledDate: "",
        scheduledTime: "12:00",
      });
    }
    setComposeOpen(true);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSending(true);
    setErr("");
    try {
      let scheduledFor = "";
      if (form.isScheduled && form.scheduledDate) {
        scheduledFor = `${form.scheduledDate}T${form.scheduledTime || "12:00"}:00`;
      }
      await api("sendLetter", {
        id: editingLetter?.id,
        title: form.title.trim(),
        content: form.content.trim(),
        theme: "standard",
        scheduledFor: scheduledFor || undefined,
      });
      setComposeOpen(false);
      showToast(
        form.isScheduled
          ? (lang === "en" ? "Sealed inside a time capsule! 🔒" : "اتقفل الجواب في كبسولة زمنية! 🔒")
          : (lang === "en" ? "Letter delivered with love! 💌" : "اتبعت الجواب لشريكك بنجاح! 💌")
      );
      await loadLetters();
    } catch (e) {
      setErr(e.message || (lang === "en" ? "Failed to send letter" : "فشل إرسال الجواب"));
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    if (!form.title.trim() && !form.content.trim()) return;
    setSending(true);
    setErr("");
    try {
      await api("saveLetter", {
        id: editingLetter?.id,
        title: form.title.trim(),
        content: form.content.trim(),
        theme: "standard",
      });
      setComposeOpen(false);
      showToast(lang === "en" ? "Draft saved!" : "اتحفظت المسودة!");
      await loadLetters();
    } catch (e) {
      setErr(e.message || (lang === "en" ? "Failed to save draft" : "فشل حفظ المسودة"));
    } finally {
      setSending(false);
    }
  }

  async function handleCancelScheduled(id) {
    if (!window.confirm(lang === "en" ? "Cancel this scheduled letter?" : "إلغاء ميعاد إرسال الجواب ده؟")) return;
    try {
      await api("cancelLetter", { id });
      showToast(lang === "en" ? "Scheduled letter cancelled" : "تم إلغاء الميعاد");
      await loadLetters();
    } catch (e) {
      alert(e.message || (lang === "en" ? "Failed to cancel" : "فشل الإلغاء"));
    }
  }

  async function handleOpenLetter(letter) {
    setLetterOpening(true);
    setReadingLetter(letter);
    setTimeout(() => setLetterOpening(false), 200);

    // If unread and recipient, mark as read
    if (tab === "received" && !letter.isRead) {
      try {
        await api("markLetterRead", { id: letter.id });
        setLettersData((p) => ({
          ...p,
          received: p.received.map((l) => (l.id === letter.id ? { ...l, isRead: true } : l)),
        }));
      } catch {
        // silent
      }
    }
  }

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 sm:px-6 space-y-5 pb-24 text-on-surface">
      {/* Top Header Hub */}
      <section className="flex items-center justify-between pt-2 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">mail</span>
            <span>{lang === "en" ? "Love Letters & Whispers" : "جوابات ورسائل من القلب"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            {lang === "en"
              ? "Heartfelt notes sealed securely for the two of you"
              : "كلمات سرية بينكم، ومفاجآت مقفولة تفتح في وقتها"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCompose()}
          className="px-4 py-2.5 rounded-full bg-primary text-white hover:bg-primary-container hover:text-on-primary-container text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          <span>{lang === "en" ? "Write New Letter" : "اكتب جواب جديد"}</span>
        </button>
      </section>

      {/* Navigation Tabs */}
      <div className="flex items-center p-1 rounded-2xl bg-surface-container border border-outline-variant/30 gap-1">
        <button
          type="button"
          onClick={() => setTab("received")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "received"
              ? "bg-primary text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">inbox</span>
          <span>{lang === "en" ? "Received" : "الجوابات اللي وصلتني"}</span>
          {lettersData.received.filter((l) => !l.isRead).length > 0 && (
            <span className="w-2 h-2 rounded-full bg-error inline-block" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab("sent")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "sent"
              ? "bg-primary text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">send</span>
          <span>{lang === "en" ? "Sent" : "الجوابات اللي بعتها"}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("drafts")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "drafts"
              ? "bg-primary text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">drafts</span>
          <span>{lang === "en" ? "Drafts" : "المسودات"}</span>
          {lettersData.drafts.length > 0 && (
            <span className="text-[10px] opacity-80">({lettersData.drafts.length})</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-8">
          <SignatureLoader
            arPhrase="جارٍ فتح صندوق الجوابات..."
            enPhrase="Fetching your secret love letters..."
          />
        </div>
      ) : (
        <div className="flex flex-col space-y-3">
          {tab === "received" && (
            lettersData.received.length === 0 ? (
              <EmotionalEmptyState
                type="letters"
                partnerName={connection?.partner?.name || ""}
                onAction={() => openCompose()}
                actionText={lang === "en" ? "Write First Letter" : "اكتب أول جواب"}
              />
            ) : (
              lettersData.received.map((letter) => (
                <article
                  key={letter.id}
                  onClick={() => handleOpenLetter(letter)}
                  className="p-5 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] border border-outline-variant/40 bg-surface shadow-xs hover:border-primary/50 flex flex-col space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                      </div>
                      <span className="font-bold text-sm text-on-surface">{letter.title || (lang === "en" ? "Love Letter" : "جواب حب")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!letter.isRead ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold animate-pulse">
                          {lang === "en" ? "New" : "جديد • مش مقروء"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant">{lang === "en" ? "Read" : "تمت القراءة"}</span>
                      )}
                      <span className="text-[11px] text-on-surface-variant">
                        {letter.sentAt ? new Date(letter.sentAt).toLocaleDateString(lang === "en" ? "en-US" : "ar-EG", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {letter.content}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/30 text-[11px]">
                    <span className="text-on-surface-variant">{lang === "en" ? "Click to open" : "اضغط لقراءة الجواب بالكامل"}</span>
                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      <span>{lang === "en" ? "Read" : "افتح الجواب"}</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                </article>
              ))
            )
          )}

          {tab === "sent" && (
            lettersData.sent.length === 0 ? (
              <div className="py-12 text-center rounded-3xl bg-surface border border-outline-variant/30 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl text-outline">outgoing_mail</span>
                <p className="text-xs text-on-surface-variant">
                  {lang === "en"
                    ? 'No sent letters yet. Click "Write New Letter" to send a surprise!'
                    : 'لسه مابعتش جوابات لشريكك.. دوس على "اكتب جواب جديد" وفاجئه بكلماتك!'}
                </p>
              </div>
            ) : (
              lettersData.sent.map((letter) => {
                const isLocked = letter.status === "scheduled" && !letter.isDelivered;
                return (
                  <article
                    key={letter.id}
                    onClick={() => handleOpenLetter(letter)}
                    className="p-5 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] border border-outline-variant/40 bg-surface shadow-xs hover:border-primary/50 flex flex-col space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        </div>
                        <span className="font-bold text-sm text-on-surface">{letter.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">lock_clock</span>
                            <span>{lang === "en" ? "Time Capsule Locked" : "مقفول في كبسولة"}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant">
                            {letter.isRead ? (lang === "en" ? "✓✓ Read by partner" : "✓✓ شريكك قرأه") : (lang === "en" ? "✓ Delivered" : "✓ وصل لشريكك")}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {letter.content}
                    </p>
                    {isLocked && (
                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
                        <span className="text-amber-800 text-[11px]">
                          {lang === "en" ? "Opens on: " : "هيفتح يوم: "}{new Date(letter.scheduledFor).toLocaleString(lang === "en" ? "en-US" : "ar-EG")}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelScheduled(letter.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-error/15 text-error hover:bg-error/25 text-[11px] font-semibold"
                        >
                          {lang === "en" ? "Cancel Schedule" : "إلغاء الميعاد"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )
          )}

          {tab === "drafts" && (
            lettersData.drafts.length === 0 ? (
              <div className="py-12 text-center rounded-3xl bg-surface border border-outline-variant/30 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl text-outline">description</span>
                <p className="text-xs text-on-surface-variant">{lang === "en" ? "No saved drafts." : "مفيش مسودات محفوظة لسه."}</p>
              </div>
            ) : (
              lettersData.drafts.map((letter) => (
                <article
                  key={letter.id}
                  onClick={() => openCompose(letter)}
                  className="p-5 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] border border-outline-variant/40 bg-surface shadow-xs hover:border-primary/50 flex flex-col space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-outline text-[16px]">edit_note</span>
                      <span className="font-bold text-sm text-on-surface">{letter.title || (lang === "en" ? "Draft without title" : "مسودة بدون عنوان")}</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">{lang === "en" ? "Draft" : "مسودة"}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {letter.content || (lang === "en" ? "Empty draft..." : "مسودة فاضية...")}
                  </p>
                  <div className="text-[11px] text-primary font-semibold text-left pt-1 border-t border-outline-variant/30">
                    {lang === "en" ? "Click to continue writing →" : "اضغط لتكملة الكتابة والإرسال ←"}
                  </div>
                </article>
              ))
            )
          )}
        </div>
      )}

      {/* ================= Compose Letter Modal ================= */}
      {composeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
          onClick={() => setComposeOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-surface p-6 sm:p-7 shadow-2xl flex flex-col space-y-4 my-8 border border-outline-variant/40 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface">
                    {editingLetter
                      ? (lang === "en" ? "Edit Letter" : "تعديل الجواب")
                      : (lang === "en" ? "Write a Letter From the Heart" : "جواب جديد من القلب")}
                  </h3>
                  <span className="text-[11px] text-on-surface-variant block">
                    {lang === "en" ? "Words that touch the soul" : "كلمات حقيقية طالعة من القلب بدون أي تكلف"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {err && (
              <div className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs">
                {err}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  {lang === "en" ? "Letter Title" : "عنوان الجواب"}
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder={lang === "en" ? "e.g. From my heart to yours..." : "مثلاً: كلام من قلبي، سر بيني وبينك..."}
                  className="w-full bg-surface-container px-3.5 py-2.5 rounded-xl border border-outline-variant/40 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  {lang === "en" ? "Letter Content" : "نص الجواب والكلام اللي طالع من القلب"}
                </label>
                <textarea
                  rows={7}
                  required
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder={lang === "en" ? "Pour your feelings here..." : "فضفض واكتب كل اللي حاسس بيه لشريكك بكل راحة..."}
                  className="w-full bg-surface-container p-3.5 rounded-2xl border border-outline-variant/40 text-sm text-on-surface focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              {/* Time Capsule Toggle */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface">
                  <input
                    type="checkbox"
                    checked={form.isScheduled}
                    onChange={(e) => setForm((p) => ({ ...p, isScheduled: e.target.checked }))}
                    className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>{lang === "en" ? "Time Capsule ⏳ (Only unlocks at specified date & time)" : "كبسولة زمنية ⏳ (ماتفتحش غير في تاريخ وساعة محددين)"}</span>
                </label>
                {form.isScheduled && (
                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <input
                      type="date"
                      required
                      value={form.scheduledDate}
                      onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))}
                      className="bg-surface-container-low px-3 py-1.5 rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none"
                    />
                    <input
                      type="time"
                      value={form.scheduledTime}
                      onChange={(e) => setForm((p) => ({ ...p, scheduledTime: e.target.value }))}
                      className="bg-surface-container-low px-3 py-1.5 rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none"
                    />
                    <span className="text-[11px] text-on-surface-variant w-full block">
                      {lang === "en" ? "The letter will remain securely locked until this exact moment." : "الجواب هيفضل مقفول ومش هيقدر شريكك يفتحه غير في اللحظة دي."}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={sending}
                  className="px-4 py-2.5 rounded-xl bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  {lang === "en" ? "Save Draft" : "حفظ كمسودة"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComposeOpen(false)}
                    className="px-3.5 py-2.5 text-xs text-on-surface-variant hover:text-on-surface"
                  >
                    {lang === "en" ? "Cancel" : "إلغاء"}
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !form.title.trim() || !form.content.trim()}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {sending ? (
                      (lang === "en" ? "Sending..." : "جارٍ الإرسال...")
                    ) : form.isScheduled ? (
                      <>
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                        <span>{lang === "en" ? "Lock & Send Capsule" : "قفل وإرسال الكبسولة"}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>{lang === "en" ? "Send Letter Now" : "إرسال الجواب فوراً"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= Reading Full Letter Modal ================= */}
      {readingLetter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto"
          onClick={() => setReadingLetter(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col space-y-4 my-8 relative overflow-hidden bg-surface border border-outline-variant/40 animate-in fade-in zoom-in-95 duration-200 ${
              letterOpening ? "scale-95 opacity-50" : "scale-100 opacity-100"
            }`}
          >
            {/* Top Ornamental Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    favorite
                  </span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-on-surface">
                    {readingLetter.title}
                  </h3>
                  <span className="text-[11px] text-on-surface-variant block">
                    {readingLetter.sentAt ? new Date(readingLetter.sentAt).toLocaleString(lang === "en" ? "en-US" : "ar-EG") : ""}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReadingLetter(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
                title={lang === "en" ? "Close Letter" : "إغلاق الجواب"}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Letter Body */}
            <div className="py-4 text-sm sm:text-base leading-loose whitespace-pre-line text-on-surface min-h-[140px]">
              {readingLetter.content}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-outline-variant/30 pt-4 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1 text-primary font-medium">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                <span>{lang === "en" ? "Written with love in our private space" : "كتب بكل حب في ركننا الخاص"}</span>
              </span>
              <button
                type="button"
                onClick={() => setReadingLetter(null)}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-colors"
              >
                {lang === "en" ? "Close" : "طبق الجواب واقفل"}
              </button>
            </div>
          </div>
        </div>
      )}

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
