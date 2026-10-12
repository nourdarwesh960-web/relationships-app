import React, { useState } from "react";

export function EmotionalEmptyState({
  type = "memories", // 'memories' | 'letters' | 'pairing' | 'storybook'
  partnerName = "",
  pairCode = "",
  onAction,
  actionText,
  className = ""
}) {
  const [copied, setCopied] = useState(false);

  if (type === "memories") {
    return (
      <div className={`bg-surface-container p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col items-center text-center relative overflow-hidden border border-[#e5c378]/20 ${className}`}>
        {/* Ambient Glow */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        {/* Decorative Floating Polaroid Frame */}
        <div className="relative w-28 h-32 bg-surface-container-highest p-2 pb-5 rounded-lg shadow-2xl rotate-3 mb-4 flex flex-col items-center justify-between border border-white/10 group hover:rotate-0 transition-transform duration-300">
          <div className="w-full h-20 bg-surface-container-low rounded flex items-center justify-center text-primary/60">
            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
          </div>
          <span className="font-label-sm text-[11px] text-on-surface-variant italic font-serif">
            ذكرى رقم ١
          </span>
        </div>

        <h3 className="font-headline-md text-xl sm:text-2xl text-primary font-serif" dir="rtl">
          سجل ذكرياتكم مستني أول لحظة توثقوها سوا
        </h3>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-sm mt-1 leading-relaxed" dir="rtl">
          ضيفوا أول صورة أو ذكرى تجمعكم لتتكون في بوكيهات جميلة ومحفوظة بينكم للأبد.
        </p>

        {/* Prompt Suggestions Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 my-4 max-w-xs">
          <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface font-label-sm text-xs border border-white/5">
            أول خروجة سوا ☕
          </span>
          <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface font-label-sm text-xs border border-white/5">
            تذكرة سفر ✈️
          </span>
          <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface font-label-sm text-xs border border-white/5">
            سيلفي عفوي 📸
          </span>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="w-full max-w-xs py-3 px-5 rounded-xl bg-primary-container text-on-primary-container font-label-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
          <span>{actionText || "+ إضافة أول ذكرى • Add First Memory"}</span>
        </button>
      </div>
    );
  }

  if (type === "letters") {
    return (
      <div className={`bg-surface-container p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 border border-[#e5c378]/20 shadow-lg ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-tertiary flex items-center justify-center flex-shrink-0 shadow-inner">
          <span className="material-symbols-outlined text-2xl">mail</span>
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-right" dir="rtl">
          <span className="font-title-lg text-base sm:text-lg text-on-surface font-semibold block">
            صندوق الرسائل هادئ حالياً
          </span>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
            مافيش جوابات متبادلة لسه.. سيب أول رسالة حب غير متوقعة تصحي بيها {partnerName || "شريك حياتك"} الصبح.
          </p>
          <div className="mt-3 flex justify-center sm:justify-start">
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2 rounded-xl bg-surface-container-high text-primary font-label-sm text-xs sm:text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform border border-primary/25 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>{actionText || "اكتب أول جواب • Write Secret Note"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === "pairing") {
    const handleCopy = () => {
      if (pairCode) {
        navigator.clipboard?.writeText(pairCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <div className={`bg-surface-container p-5 sm:p-6 rounded-2xl flex flex-col gap-3 border border-[#e5c378]/25 shadow-xl ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-title-lg text-base sm:text-lg text-on-surface font-semibold" dir="rtl">
              في انتظار انضمام شريكة حياتك
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-xs font-semibold">
            Unpaired
          </span>
        </div>

        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
          Share your private pair code or hold phones together to ignite the synchronised heartbeat aura.
        </p>

        {pairCode && (
          <div className="bg-surface-container-low p-2.5 px-3.5 rounded-xl flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">qr_code_2</span>
              <span className="font-mono text-primary font-semibold tracking-widest text-sm sm:text-base">
                {pairCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 rounded-lg bg-surface-container-highest text-on-surface font-label-sm text-xs active:scale-95 transition-transform"
            >
              {copied ? "تم النسخ ✓" : "نسخ الكود"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
