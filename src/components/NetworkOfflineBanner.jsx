import React, { useState, useEffect } from "react";

export function NetworkOfflineBanner({
  forceShow = false,
  pendingQueueCount = 0,
  onRetry
}) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Countdown timer when offline
  useEffect(() => {
    if (isOnline && !forceShow) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOnline, forceShow]);

  const handleRetry = () => {
    if (isRetrying) return;
    setIsRetrying(true);
    if (onRetry) onRetry();

    setTimeout(() => {
      setIsRetrying(false);
      setCountdown(15);
      if (typeof navigator !== "undefined" && navigator.onLine) {
        setIsOnline(true);
      }
    }, 1800);
  };

  if (justReconnected) {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 px-4 py-2 bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-center justify-center gap-2 backdrop-blur-md animate-fadeIn shadow-lg">
        <span className="material-symbols-outlined text-[18px] text-emerald-400">cloud_done</span>
        <span dir="rtl">تمت استعادة الاتصال بالإنترنت! جاري مزامنة الملاذ...</span>
      </div>
    );
  }

  if (isOnline && !forceShow) {
    return null;
  }

  return (
    <aside aria-label="حالة الاتصال" className="w-full bg-[#18121f] border border-red-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden my-3">
      {/* Ambient Red Glow */}
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-red-500/10 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-error-container text-on-error-container flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-2xl">wifi_off</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-title-lg text-base sm:text-lg text-error font-bold" dir="rtl">
                انقطع الاتصال بالإنترنت
              </span>
              <span className="px-2 py-0.5 rounded-full bg-error/20 text-error font-label-sm text-[11px] font-semibold">
                Offline
              </span>
            </div>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant" dir="rtl">
              مزامنة الملاذ متوقفة مؤقتاً لحين عودة الاتصال
            </p>
          </div>
        </div>
      </div>

      {/* Safe Draft Protection Guarantee Badge */}
      <div className="bg-[#120e17] p-3 sm:p-3.5 rounded-xl flex items-start gap-3 border border-[#e5c378]/25 mb-4 relative z-10">
        <div className="w-8 h-8 rounded-full bg-tertiary-container/30 text-tertiary flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[18px]">bookmark_heart</span>
        </div>
        <div className="min-w-0 flex flex-col gap-0.5 text-right" dir="rtl">
          <span className="font-label-md text-xs sm:text-sm text-tertiary font-semibold">
            كلماتك محفوظة بأمان على جهازك
          </span>
          <p className="font-label-sm text-xs text-on-surface-variant leading-relaxed">
            مسوداتك وصورك المحملة محفوظة بأمان في ذاكرة المتصفح وستُرفع تلقائياً فور عودة الاتصال.
          </p>
        </div>
      </div>

      {/* Dynamic Retry Trigger */}
      <div className="flex flex-col gap-2 relative z-10">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full py-2.5 px-4 rounded-xl bg-primary-container text-on-primary-container font-label-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[18px] ${isRetrying ? "animate-spin" : ""}`}>
            sync
          </span>
          <span>
            {isRetrying ? "جاري محاولة الاتصال... Checking Network" : "إعادة المحاولة الآن • Retry Connection"}
          </span>
        </button>

        <div className="flex items-center justify-between text-on-surface-variant px-1 font-label-sm text-xs">
          <span>
            المحاولة التلقائية بعد: <strong className="text-primary">{countdown}s</strong>
          </span>
          <span>
            طابور الأمان المحلي: {pendingQueueCount > 0 ? `${pendingQueueCount} عناصر` : "محمي وآمن"}
          </span>
        </div>
      </div>
    </aside>
  );
}
