import React, { useState, useEffect } from "react";

export const LOADING_PHRASES = [
  {
    ar: "بنجهّز مساحتكم الخاصة بكل حب...",
    en: "Preparing your private sanctuary with love..."
  },
  {
    ar: "لحظات وتكون كل الذكريات بين إيديكم...",
    en: "Opening your shared digital vault..."
  },
  {
    ar: "بنتأكد إن كل كلمة وصورة محفوظة بأمان...",
    en: "Ensuring every memory is safely kept..."
  },
  {
    ar: "صندوق الحكايات بيفتح دلوقتي...",
    en: "Your shared storybook is opening..."
  }
];

export function SignatureLoader({
  fullScreen = false,
  arPhrase,
  enPhrase,
  status,
  cyclePhrases = true,
  partnerName = "",
  className = ""
}) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (!cyclePhrases || arPhrase) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPhraseIdx((prev) => (prev + 1) % LOADING_PHRASES.length);
        setFade(true);
      }, 250);
    }, 3200);
    return () => clearInterval(interval);
  }, [cyclePhrases, arPhrase]);

  const activePhrase = arPhrase
    ? { ar: arPhrase, en: enPhrase || "", status: status || "" }
    : {
        ...LOADING_PHRASES[phraseIdx],
        status: partnerName
          ? LOADING_PHRASES[phraseIdx].status?.replace("Partner", partnerName)
          : LOADING_PHRASES[phraseIdx].status
      };

  const content = (
    <div className={`relative flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl overflow-hidden ${className}`}>
      {/* Soft Ambient Rose & Latte Aura */}
      <div className="absolute w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none -top-6" />

      {/* Elegant Minimalist Dual Ring + Beating Heart Spinner */}
      <div className="relative w-20 h-20 my-4 flex items-center justify-center">
        {/* Outer Rotating Rose Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40 animate-spin" style={{ animationDuration: "1.6s" }} />

        {/* Inner Counter-Rotating Latte Ring */}
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[#a3722a] border-l-[#a3722a]/40 animate-spin" style={{ animationDuration: "2.2s", animationDirection: "reverse" }} />

        {/* Pulsing Gentle Rose Heart */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary shadow-xs">
          <span
            className="material-symbols-outlined text-[20px] animate-pulse"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
        </div>
      </div>

      {/* Dynamic Contextual Text with Smooth Fade */}
      <div className="flex flex-col items-center gap-1.5 z-10 max-w-sm mt-2">
        <div
          dir="rtl"
          className={`font-headline-md text-base sm:text-lg font-bold text-on-surface transition-opacity duration-300 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          {activePhrase.ar}
        </div>
        {activePhrase.en && (
          <div
            className={`font-body-md text-xs sm:text-sm text-on-surface-variant transition-opacity duration-300 ${
              fade ? "opacity-100" : "opacity-0"
            }`}
          >
            {activePhrase.en}
          </div>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Shimmer card skeleton matching warm nescafe & rose palette
 */
export function SkeletonMemoryCard() {
  return (
    <div className="bg-surface p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden border border-outline-variant/40 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high animate-pulse" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-3.5 bg-surface-container-high rounded-full w-2/5 animate-pulse" />
          <div className="h-2.5 bg-surface-container rounded-full w-1/4 animate-pulse" />
        </div>
      </div>
      <div className="w-full h-36 rounded-xl bg-surface-container flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse" />
        <span className="material-symbols-outlined text-outline-variant text-4xl">favorite</span>
      </div>
      <div className="flex flex-col gap-2 pt-1">
        <div className="h-3 bg-surface-container-high rounded-full w-11/12 animate-pulse" />
        <div className="h-3 bg-surface-container-high rounded-full w-3/4 animate-pulse" />
        <div className="h-3 bg-surface-container rounded-full w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Button spinner for in-flight requests
 */
export function ButtonSpinner({ text = "جاري الحفظ...", enText = "" }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg
        className="animate-spin w-4 h-4 text-current"
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>
        {text}
        {enText ? ` • ${enText}` : ""}
      </span>
    </span>
  );
}
