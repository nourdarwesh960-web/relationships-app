import React, { useState } from "react";
import { Link } from "react-router-dom";
import { SignatureLoader, SkeletonMemoryCard, ButtonSpinner } from "../components/SignatureLoader.jsx";
import { NetworkOfflineBanner } from "../components/NetworkOfflineBanner.jsx";
import { ResilienceState } from "../components/ResilienceState.jsx";
import { EmotionalEmptyState } from "../components/EmotionalEmptyState.jsx";

export function ResilienceShowcasePage({ partnerName = "Sarah" }) {
  const [activeTab, setActiveTab] = useState("loading");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [testOffline, setTestOffline] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2800);
  };

  return (
    <div className="w-full flex flex-col bg-[#120e17] text-on-surface min-h-[calc(100vh-4rem)] pb-20">
      {/* System Showcase Intro Header Banner */}
      <div className="px-4 sm:px-6 pt-4 pb-2 max-w-4xl mx-auto w-full">
        <div className="bg-surface-container-low p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden border border-[#e5c378]/20">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-[11px] font-semibold uppercase tracking-wider">
                  Design System v2.4
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                  Nocturne & Rose
                </span>
              </div>
              <h1 className="font-headline-lg-mobile text-xl sm:text-2xl text-primary font-serif">
                State Resilience Suite
              </h1>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-0.5" dir="rtl">
                نظام معالجة الأخطاء، شاشات الانتظار، والتعافي الذكي للمحادثات الخاصة
              </p>
            </div>
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shadow-sm border border-[#e5c378]/30">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
          </div>

          {/* Quick Telemetry Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-1">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-xs border border-white/5">
              <span className="material-symbols-outlined text-[14px] text-primary">all_inclusive</span>
              <span>Infinity Lemniscate SVG</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-xs border border-white/5">
              <span className="material-symbols-outlined text-[14px] text-tertiary">lock_reset</span>
              <span>Offline Draft Cache Safe</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-xs border border-white/5">
              <span className="material-symbols-outlined text-[14px] text-secondary">translate</span>
              <span>Bilingual EN / AR Pairings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive State Category Selector Tabs */}
      <div className="px-4 sm:px-6 py-2 sticky top-16 z-30 bg-[#16121b]/95 backdrop-blur-md border-b border-surface-container-high/40">
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("loading")}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-label-md text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all ${
              activeTab === "loading"
                ? "bg-primary text-on-primary font-bold shadow-md scale-[1.02]"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">all_inclusive</span>
            <span>Signature Loading</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("system-errors")}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-label-md text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all ${
              activeTab === "system-errors"
                ? "bg-primary text-on-primary font-bold shadow-md scale-[1.02]"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">cloud_off</span>
            <span>System & Network</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("auth-privacy")}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-label-md text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all ${
              activeTab === "auth-privacy"
                ? "bg-primary text-on-primary font-bold shadow-md scale-[1.02]"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">lock_clock</span>
            <span>Auth & Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("empty-states")}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-label-md text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all ${
              activeTab === "empty-states"
                ? "bg-primary text-on-primary font-bold shadow-md scale-[1.02]"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">sentiment_satisfied</span>
            <span>Emotional Empty</span>
          </button>
        </div>
      </div>

      {/* MAIN TAB CONTENT */}
      <div className="px-4 sm:px-6 py-4 max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* ========================================== */}
        {/* TAB 1: SIGNATURE LOADING & SKELETON STATES */}
        {/* ========================================== */}
        {activeTab === "loading" && (
          <section className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-lg sm:text-xl text-primary font-serif">
                  Signature Lemniscate Loading
                </h2>
                <p className="font-body-md text-xs text-on-surface-variant">
                  Continuous geometric infinity draw with glowing stylus tip
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-tertiary font-label-sm text-xs font-semibold">
                Live Interactive
              </span>
            </div>

            {/* Live Hero Card: Full Screen Interactive Loading Experience */}
            <div className="bg-surface-container p-4 sm:p-6 rounded-2xl shadow-xl border border-[#e5c378]/25 relative">
              <SignatureLoader
                allowSpeedToggle={true}
                partnerName={partnerName}
                cyclePhrases={true}
              />

              <div className="flex items-center justify-center gap-3 mt-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => triggerToast("Simulated Ready: Sanctuary unlocked!")}
                  className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container font-label-sm text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>اختبار الجاهزية • Simulate Ready</span>
                </button>
              </div>
            </div>

            {/* Component-Level Inline Loaders & Skeleton Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Button Loading States */}
              <div className="bg-surface-container p-4 rounded-xl flex flex-col gap-3 border border-white/5">
                <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">
                  Pattern A • Action Button In-Flight Spinners
                </span>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl bg-primary-container text-on-primary-container font-label-md text-xs font-semibold shadow-sm opacity-90 cursor-wait"
                  >
                    <ButtonSpinner text="جاري توثيق المكتوب" enText="Encrypting Note" />
                  </button>
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl bg-surface-container-high text-on-surface font-label-md text-xs flex items-center justify-center gap-2 cursor-wait border border-white/5"
                  >
                    <span className="material-symbols-outlined text-[16px] text-tertiary">photo_library</span>
                    <span className="text-on-surface-variant">جارِ استرجاع الصور القديمة • Fetching Vault</span>
                  </button>
                </div>
              </div>

              {/* Shimmer Skeleton */}
              <div className="bg-surface-container p-4 rounded-xl flex flex-col gap-3 border border-white/5">
                <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">
                  Pattern B • Nocturne Shimmer Skeleton
                </span>
                <SkeletonMemoryCard />
              </div>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* TAB 2: SYSTEM & NETWORK ERRORS */}
        {/* ========================================== */}
        {activeTab === "system-errors" && (
          <section className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-lg sm:text-xl text-primary font-serif">
                  System & Network Resilience
                </h2>
                <p className="font-body-md text-xs text-on-surface-variant">
                  Graceful failure states that keep users calm and informed
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs font-semibold">
                3 Scenarios
              </span>
            </div>

            {/* Offline Sync Recovery Card */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-on-surface-variant font-semibold uppercase">
                  Scenario 1: Network Disconnected & Draft Preservation
                </span>
                <button
                  type="button"
                  onClick={() => setTestOffline(!testOffline)}
                  className="px-2.5 py-1 rounded-full bg-surface-container-highest text-primary text-xs flex items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[14px]">toggle_on</span>
                  <span>{testOffline ? "إخفاء شارة انقطاع النت" : "محاكاة انقطاع الإنترنت"}</span>
                </button>
              </div>
              <NetworkOfflineBanner
                forceShow={testOffline}
                pendingQueueCount={3}
                onRetry={() => triggerToast("تم فحص الشبكة: تم حفظ 3 مسودات محلياً بنجاح")}
              />
            </div>

            {/* Card A: 404 Memory Not Found */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Scenario 2: 404 Memory Not Found
              </span>
              <ResilienceState
                type="404"
                onAction={() => triggerToast("الرجوع إلى الملاذ المشترك")}
                onSecondaryAction={() => triggerToast("الرجوع للخلف")}
              />
            </div>

            {/* Card C: 500 Server Overload */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Scenario 3: 500 Sanctuary Rest Mode
              </span>
              <ResilienceState
                type="500"
                onAction={() => triggerToast("جاري فحص حالة خوادم الملاذ المشفرة...")}
              />
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* TAB 3: AUTH, PRIVACY & CONFLICTS */}
        {/* ========================================== */}
        {activeTab === "auth-privacy" && (
          <section className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-lg sm:text-xl text-primary font-serif">
                  Sanctuary Privacy & Conflicts
                </h2>
                <p className="font-body-md text-xs text-on-surface-variant">
                  Confidential pair boundaries and graceful merge resolution
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-tertiary font-label-sm text-xs font-semibold">
                3 Security States
              </span>
            </div>

            {/* State 1: 403 Sanctuary Restricted */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Security 1: 403 Sanctuary Restricted (Pair Lock)
              </span>
              <ResilienceState
                type="403"
                partnerName={partnerName}
                onAction={() => triggerToast("تبديل الحساب إلى ملاذكم المصرح به")}
              />
            </div>

            {/* State 2: 401 Session Re-Authentication */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Security 2: 401 Romantic Biometric Re-Auth
              </span>
              <ResilienceState
                type="401"
                onAction={() => triggerToast("تم تأكيد البصمة الحيوية بنجاح!")}
                onSecondaryAction={(pin) => triggerToast(`تم قبول الرمز السري: ${pin}`)}
              />
            </div>

            {/* State 3: Save Conflict & Unsaved Draft Preservation */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Security 3: Real-Time Edit Conflict Resolution
              </span>
              <ResilienceState
                type="conflict"
                partnerName={partnerName}
                onAction={() => triggerToast("تم دمج المسودتين بنجاح دون أي فقدان للنص!")}
                onSecondaryAction={() => triggerToast("تم حفظ النسخة كرسالة إضافية جديدة!")}
              />
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* TAB 4: EMOTIONAL EMPTY STATES */}
        {/* ========================================== */}
        {activeTab === "empty-states" && (
          <section className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-lg sm:text-xl text-primary font-serif">
                  Emotional Empty States
                </h2>
                <p className="font-body-md text-xs text-on-surface-variant">
                  Warm, inviting invitations instead of cold null data
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-xs font-semibold">
                4 Moments
              </span>
            </div>

            {/* Empty State 1: Photo Album Blank Canvas */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Moment 1: Our Memories Blank Canvas
              </span>
              <EmotionalEmptyState
                type="memories"
                onAction={() => triggerToast("فتح نافذة إضافة أول صورة وذكرى")}
              />
            </div>

            {/* Empty State 2: Letters from the Heart */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Moment 2: Letters from the Heart Quiet Box
              </span>
              <EmotionalEmptyState
                type="letters"
                partnerName={partnerName}
                onAction={() => triggerToast("فتح محرر رسائل الحب المختومة بالشمع")}
              />
            </div>

            {/* Empty State 3: Waiting for Partner Connection */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Moment 3: Unpaired Sanctuary Invitation
              </span>
              <EmotionalEmptyState
                type="pairing"
                pairCode="ROSE-8849-PAIR"
              />
            </div>

            {/* Empty State 4: Storybook Blank Chapter */}
            <div>
              <span className="text-xs text-on-surface-variant font-semibold uppercase block mb-2">
                Moment 4: Storybook Unwritten Chapter
              </span>
              <EmotionalEmptyState
                type="storybook"
                onAction={() => triggerToast("فتح محرر كتاب الذكريات الثلاثي الأبعاد")}
              />
            </div>
          </section>
        )}
      </div>

      {/* Real-Time Interactive Toast Notification */}
      <div
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
          showToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="px-4 py-2.5 rounded-full bg-surface-container-highest text-primary shadow-2xl font-label-md text-xs sm:text-sm flex items-center gap-2 border border-[#e5c378]/30 backdrop-blur-md">
          <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      </div>
    </div>
  );
}
