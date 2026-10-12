import React, { useState } from "react";
import { Link } from "react-router-dom";

export function ResilienceState({
  type = "404",
  partnerName = "شريكتي",
  className = "",
  onAction,
}) {
  const [currentCode, setCurrentCode] = useState(type);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryStatus, setRetryStatus] = useState("جاري إعادة الاتصال بالملاذ...");

  const ERROR_MAP = {
    "404": {
      title: "الصفحة غير موجودة",
      desc: "قد تكون الذكرى أو الصفحة أو الرسالة انتقلت لأرشيفكم الخاص أو تغير عنوانها.",
      poetic: "حتى الذكريات اللي بتتأخر أو بتضيع، مكانها دايماً محفور بالقلب.",
    },
    "401": {
      title: "يرجى تسجيل الدخول أولاً",
      desc: "انتهت جلسة أمان الملاذ، يرجى تسجيل الدخول مجدداً لحماية خصوصيتكما.",
      poetic: "حفظ العهد يبدأ بحماية خصوصية كل كلمة كتبناها سوا.",
    },
    "403": {
      title: "هذه المساحة خاصة ومحمية",
      desc: "هذا الركن خاص جداً ومحمي بالتشفير بين قلبين فقط، ولا يمكن الدخول إليه.",
      poetic: "ركنكما الخاص محفوظ في أمان تام بعيداً عن أي عيون.",
    },
    "429": {
      title: "مهلاً.. على مهلكم شوية",
      desc: "تم إرسال طلبات سريعة متتالية، انتظر بضع ثوانٍ وسيعود كل شيء لطبيعته.",
      poetic: "اللحظات الحلوة مبتحتاجش استعجال، خد نفس عميق وكمل.",
    },
    "500": {
      title: "خطأ مؤقت في خوادم الملاذ",
      desc: "نظام الملاذ المشفر يعيد تهيئة الاتصال وحماية بياناتكما الآن.",
      poetic: "كل حاجة بترجع أقوى وأدفى مما كانت، ثواني ونكون معاك.",
    },
    "503": {
      title: "الخدمة تحت الصيانة الهادئة",
      desc: "نقوم بتحسين وتحديث أمان الملاذ لنقدم لكما تجربة أكثر روعة وسلاسة.",
      poetic: "بنظبط كل تفصيلة عشان تفضل حكايتكم منورة دايماً.",
    },
  };

  const activeError = ERROR_MAP[currentCode] || ERROR_MAP["404"];

  const handleTriggerRetry = () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setRetryStatus("جاري إعادة الاتصال بالملاذ...");

    setTimeout(() => {
      setRetryStatus("تم استعادة الاتصال بنجاح ✨");
      setTimeout(() => {
        setIsRetrying(false);
        if (onAction) onAction();
      }, 900);
    }, 1200);
  };

  return (
    <div className={`w-full flex flex-col items-center justify-between min-h-[70vh] py-8 px-4 text-center select-none ${className}`}>
      {/* Top Bar / Back & Retry Trigger */}
      <header className="w-full max-w-lg flex items-center justify-between h-12 px-2">
        <button
          type="button"
          aria-label="الرجوع"
          onClick={() => window.history.back()}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1 text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          <span>رجوع</span>
        </button>
        <button
          type="button"
          onClick={handleTriggerRetry}
          className="text-xs font-bold text-primary hover:opacity-80 transition-opacity py-1.5 px-3 rounded-full bg-primary-container/60 border border-primary/20"
        >
          إعادة المحاولة
        </button>
      </header>

      {/* Centered Hero Display */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 my-auto max-w-md w-full">
        {/* Large Display Serif Error Code */}
        <h1 className="font-serif font-light text-7xl sm:text-8xl tracking-tight text-primary leading-none mb-3">
          {currentCode}
        </h1>

        {/* Refined Minimal Title */}
        <h2 className="font-serif text-lg sm:text-xl text-on-surface font-bold leading-relaxed mb-2">
          {activeError.title}
        </h2>

        {/* Detailed Explanation */}
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-4 max-w-sm">
          {activeError.desc}
        </p>

        {/* Poetic Subtext */}
        <div className="py-2.5 px-4 rounded-2xl bg-surface-container text-[#bfa054] text-xs max-w-xs border border-[#c89f4b]/20 italic shadow-xs mb-6">
          “{activeError.poetic}”
        </div>

        {/* Home Link */}
        <Link
          to="/"
          className="group inline-flex items-center gap-2 text-xs font-bold text-on-surface hover:text-primary transition-all py-2.5 px-6 rounded-full border border-outline-variant/60 hover:border-primary/50 bg-surface-container-low shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[17px] text-primary">home</span>
          <span>العودة للرئيسية</span>
        </Link>
      </main>

      {/* Code Switcher Bar */}
      <footer className="w-full max-w-md pt-6 flex flex-col items-center">
        <div className="flex items-center justify-center gap-1.5 p-1 rounded-full bg-surface-container border border-outline-variant/40 shadow-xs flex-wrap">
          {["404", "401", "403", "429", "500", "503"].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setCurrentCode(code)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                currentCode === code
                  ? "bg-primary text-white shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </footer>

      {/* Minimal In-Flight Retry Modal with Infinity Lemniscate Animation */}
      {isRetrying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-xs w-full bg-surface rounded-3xl border border-outline-variant/50 shadow-2xl">
            {/* Signature Delicate Infinity Lemniscate SVG Animation */}
            <svg className="w-24 h-12 overflow-visible" viewBox="0 0 200 100">
              <path
                d="M 50,50 C 15,10 15,90 50,50 C 85,10 115,90 150,50 C 185,10 185,90 150,50 C 115,10 85,90 50,50 Z"
                fill="none"
                stroke="#d8587e"
                strokeOpacity="0.15"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 50,50 C 15,10 15,90 50,50 C 85,10 115,90 150,50 C 185,10 185,90 150,50 C 115,10 85,90 50,50 Z"
                fill="none"
                stroke="url(#modalRoseGradient)"
                strokeDasharray="320"
                strokeDashoffset="0"
                strokeLinecap="round"
                strokeWidth="3"
                className="animate-pulse"
              />
              <defs>
                <linearGradient id="modalRoseGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#d8587e" />
                  <stop offset="50%" stopColor="#f8b7c9" />
                  <stop offset="100%" stopColor="#b83b5e" />
                </linearGradient>
              </defs>
            </svg>
            <span className="mt-3 text-xs font-semibold text-primary">
              {retryStatus}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
