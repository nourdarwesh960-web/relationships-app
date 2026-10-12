import { useCallback, useEffect, useState } from "react";
import { HashRouter, Routes, Route, Link, NavLink, Navigate } from "react-router-dom";
import { api, setToken, getToken } from "./api.js";
import { T } from "./i18n.js";
import { LandingPage } from "./pages/LandingPage.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { MemoriesPage } from "./pages/MemoriesPage.jsx";
import { LettersPage } from "./pages/LettersPage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { TypingPage } from "./pages/TypingPage.jsx";
import { WishlistPage } from "./pages/WishlistPage.jsx";
import { RoomPage } from "./pages/RoomPage.jsx";
import { DiscoveryPage } from "./pages/DiscoveryPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { AlbumPage } from "./pages/AlbumPage.jsx";
import { ResilienceShowcasePage } from "./pages/ResilienceShowcasePage.jsx";
import { OnboardingModal } from "./components/OnboardingModal.jsx";
import { SignatureLoader } from "./components/SignatureLoader.jsx";
import { NetworkOfflineBanner } from "./components/NetworkOfflineBanner.jsx";
import { ResilienceState } from "./components/ResilienceState.jsx";
import { formatDateToIso } from "./dateUtils.js";

export default function App() {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "ar");
  const t = (k) => (T[lang] && T[lang][k]) || T.en[k] || k;

  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("lang", lang);
  }, [lang]);

  const loadProfile = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setReady(true);
      return;
    }
    try {
      const data = await api("me");
      setMe(data);
      if (!data.connection && !localStorage.getItem("onboarding_dismissed")) {
        setShowOnboarding(true);
      }
    } catch {
      setMe(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const handleAuthLost = () => {
      setMe(null);
      setReady(true);
    };
    window.addEventListener("authlost", handleAuthLost);
    return () => window.removeEventListener("authlost", handleAuthLost);
  }, [loadProfile]);

  const handleLogout = async () => {
    try {
      await api("logout", { token: getToken() }).catch(() => {});
    } finally {
      try {
        localStorage.removeItem("rel_local_album_photos_guest");
        localStorage.removeItem("rel_storybook_config_guest");
        localStorage.removeItem("rel_local_album_photos");
        localStorage.removeItem("rel_storybook_config");
        localStorage.removeItem("onboarding_dismissed");
      } catch (_) {}
      setToken("");
      setMe(null);
    }
  };

  if (!ready) {
    return <SignatureLoader fullScreen={true} partnerName="" />;
  }

  if (!me) {
    return <LandingPage t={t} onAuth={loadProfile} lang={lang} setLang={setLang} />;
  }

  const user = me.user;
  const connection = me.connection;
  const unreadCount = me.unreadLettersCount || 0;
  const partnerName = connection?.partner?.name || (connection?.partnerJoined ? (lang === "ar" ? "الشريك" : "Partner") : "");

  return (
    <HashRouter>
      <div className="bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Subtle Romantic Watermark Background */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.05] bg-center bg-no-repeat bg-contain"
          style={{ backgroundImage: "url('/heart-logo.jpg')" }}
        />

        {/* Top Navbar */}
        <header className="sticky top-0 w-full z-50 pt-safe bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(90,40,55,0.05)] border-b border-outline-variant/40">
          <div className="h-16 px-gutter flex items-center justify-between gap-space-sm max-w-5xl mx-auto w-full">
            <Link to="/" className="flex items-center gap-space-sm min-w-0 group">
              <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-sm border border-primary/30 group-hover:scale-105 transition-transform flex-shrink-0">
                <img src="/heart-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-headline-md text-title-lg text-on-surface font-bold truncate tracking-tight">
                  {t("title") || "حكايتنا"}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-label-md font-semibold transition-all flex items-center gap-1.5 ${
                    isActive ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
                end
              >
                <span className="material-symbols-outlined text-[18px]">home</span>
                <span>{t("dashboard")}</span>
              </NavLink>

              <NavLink
                to="/watch"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-label-md font-semibold transition-all flex items-center gap-1.5 ${
                    isActive ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">live_tv</span>
                <span>{t("watch")}</span>
              </NavLink>

              <NavLink
                to="/listen"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-label-md font-semibold transition-all flex items-center gap-1.5 ${
                    isActive ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">headphones</span>
                <span>{t("listen")}</span>
              </NavLink>

              <NavLink
                to="/typing"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-label-md font-semibold transition-all flex items-center gap-1.5 ${
                    isActive ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">draw</span>
                <span>{t("typing")}</span>
              </NavLink>

              <NavLink
                to="/memories"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-label-md font-semibold transition-all flex items-center gap-1.5 ${
                    isActive ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>{t("memories")}</span>
              </NavLink>

              <NavLink
                to="/letters"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-label-md font-semibold transition-all flex items-center gap-1.5 ${
                    isActive ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span>{t("letters")}</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary text-on-primary text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/album"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-label-md font-semibold transition-all flex items-center gap-1.5 ${
                    isActive ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">photo_library</span>
                <span>{t("album") || "ألبوم صورنا"}</span>
              </NavLink>

              <NavLink
                to="/resilience"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-label-md font-semibold transition-all flex items-center gap-1.5 ${
                    isActive ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
                title="نظام التعافي وشاشات الأمان"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
                <span>{lang === "ar" ? "الأمان والتعافي" : "Resilience"}</span>
              </NavLink>
            </nav>

            {/* Actions: Lang toggle, Profile pill, Signout */}
            <div className="flex items-center gap-space-xs flex-shrink-0">
              <button
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface text-label-sm font-semibold transition-colors border border-outline-variant/30"
                onClick={() => setLang(lang === "en" ? "ar" : "en")}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px] text-primary">translate</span>
                <span>{lang === "en" ? "العربية" : "English"}</span>
              </button>

              <NavLink
                to="/profile"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/30"
              >
                <span className="text-base">{user?.avatar?.length <= 4 ? user.avatar : "💖"}</span>
                <span className="font-label-sm font-medium max-w-[70px] truncate hidden sm:inline">
                  {user?.name}
                </span>
              </NavLink>

              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-surface-container transition-colors"
                onClick={handleLogout}
                title={t("signout")}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative w-full pt-4 pb-20 bg-surface">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
            <NetworkOfflineBanner />
          </div>
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  t={t}
                  user={user}
                  connection={connection}
                  onConnectionUpdated={loadProfile}
                  lang={lang}
                />
              }
            />
            <Route path="/memories" element={<MemoriesPage t={t} user={user} connection={connection} lang={lang} />} />
            <Route path="/letters" element={<LettersPage t={t} user={user} connection={connection} lang={lang} />} />
            <Route path="/calendar" element={<CalendarPage t={t} user={user} connection={connection} lang={lang} />} />
            <Route path="/typing" element={<TypingPage t={t} user={user} lang={lang} />} />
            <Route path="/wishlist" element={<WishlistPage t={t} user={user} lang={lang} />} />
            <Route path="/album" element={<AlbumPage t={t} user={user} connection={connection} lang={lang} />} />
            <Route path="/watch" element={<RoomPage type="watch" t={t} user={user} connection={connection} lang={lang} />} />
            <Route path="/listen" element={<RoomPage type="listen" t={t} user={user} connection={connection} lang={lang} />} />
            <Route path="/discovery" element={<DiscoveryPage t={t} user={user} connection={connection} lang={lang} />} />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  t={t}
                  user={user}
                  connection={connection}
                  onProfileUpdated={loadProfile}
                  onDisconnected={loadProfile}
                  lang={lang}
                />
              }
            />
            <Route path="/resilience" element={<ResilienceShowcasePage partnerName={partnerName} lang={lang} />} />
            <Route
              path="*"
              element={
                <div className="p-4 sm:p-8 max-w-xl mx-auto w-full">
                  <ResilienceState type="404" />
                </div>
              }
            />
          </Routes>
        </main>

        {/* Mobile Bottom Navigation Bar with Material Symbols */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-surface/90 backdrop-blur-xl border-t border-surface-container-high/40 flex items-center justify-around px-2 md:hidden">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
            end
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
            <span className="text-[10px] tracking-tight">{t("home")}</span>
          </NavLink>

          <NavLink
            to="/memories"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span className="text-[10px] tracking-tight">{t("memories") || "ذكريات"}</span>
          </NavLink>

          <NavLink
            to="/album"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">photo_library</span>
            <span className="text-[10px] tracking-tight">{t("album") || "ألبوم"}</span>
          </NavLink>

          <NavLink
            to="/typing"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">draw</span>
            <span className="text-[10px] tracking-tight">{t("typing")}</span>
          </NavLink>

          <NavLink
            to="/listen"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">headphones</span>
            <span className="text-[10px] tracking-tight">{t("listen")}</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">settings_heart</span>
            <span className="text-[10px] tracking-tight">{t("profile")}</span>
          </NavLink>
        </nav>

        {/* First-time Onboarding Modal */}
        {showOnboarding && (
          <OnboardingModal
            t={t}
            user={user}
            connection={connection}
            onDone={() => {
              setShowOnboarding(false);
              localStorage.setItem("onboarding_dismissed", "1");
            }}
            onSaveProfile={async (patch) => {
              await api("updateProfile", patch);
              await loadProfile();
            }}
            onCreateConn={async (params) => {
              const res = await api("createConnection", params);
              if (params?.startDate) {
                const iso = formatDateToIso(params.startDate);
                const connId = res?.connection?.connectionId;
                if (connId && iso) {
                  localStorage.setItem(`rel_start_date_${connId}`, iso);
                }
                await api("saveNote", {
                  title: "__relationship_start_date__",
                  content: iso || params.startDate,
                  format: "plain",
                }).catch(() => {});
              }
              await loadProfile();
            }}
            onJoinConn={async (params) => {
              await api("joinConnection", params);
              await loadProfile();
            }}
          />
        )}
      </div>
    </HashRouter>
  );
}
