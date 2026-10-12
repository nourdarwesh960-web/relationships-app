import { useState } from "react";
import { api, setToken } from "../api.js";

export function LandingPage({ t, onAuth, lang, setLang }) {
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'register'
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const isAr = lang === "ar";

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (authMode === "register") {
        const res = await api("register", {
          username: username.trim(),
          displayName: email.trim() || username.trim(),
          avatar: "💖",
          password,
        });
        setToken(res.token);
      } else {
        const res = await api("login", {
          username: username.trim(),
          password,
        });
        setToken(res.token);
      }
      await onAuth();
    } catch (error) {
      setErr(error.message || (isAr ? "فشل تسجيل الدخول، تأكد من البيانات" : "Authentication failed. Check details"));
    } finally {
      setBusy(false);
    }
  }

  // Quick join with invite code
  async function handleJoinWithCode(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const guestUser = "guest_" + Math.random().toString(36).substring(2, 8);
      const res = await api("register", {
        username: guestUser,
        displayName: isAr ? "شريك منضم" : "Joined Partner",
        avatar: "🌹",
        password: "guest_pwd_" + Math.random().toString(36),
      });
      setToken(res.token);
      await api("joinConnection", { code: inviteCode.trim().toUpperCase() });
      await onAuth();
    } catch (e) {
      setErr(e.message || (isAr ? "كود الدعوة غير صالح أو مستخدم" : "Invalid or expired invite code"));
    } finally {
      setBusy(false);
    }
  }

  // Google login simulation
  const handleGoogleLogin = () => {
    showToast(isAr ? "جارٍ تسجيل الدخول بحساب Google..." : "Signing in with Google...");
    setTimeout(async () => {
      try {
        setBusy(true);
        const demoUser = "google_user_" + Math.floor(Math.random() * 900 + 100);
        const res = await api("register", {
          username: demoUser,
          displayName: "Google User",
          avatar: "🌸",
          password: "demo_password_12345",
        }).catch(() =>
          api("login", {
            username: "demo_user",
            password: "demo_password_12345",
          })
        );
        if (res?.token) {
          setToken(res.token);
          await onAuth();
        }
      } catch (e) {
        setErr(isAr ? "يرجى إدخال اسم المستخدم وكلمة المرور" : "Please use username and password to log in");
      } finally {
        setBusy(false);
      }
    }, 900);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 text-[#7a3541] relative selection:bg-[#e1b7b4] selection:text-[#5c222b] overflow-x-hidden"
      style={{
        background: "linear-gradient(135deg, #f2dedb 0%, #ecd0cd 45%, #e2b9b7 100%)",
        fontFamily: isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <style>{`
        .glow-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(70px);
          pointer-events: none;
          z-index: 0;
        }
        .glass-card {
          background: rgba(247, 229, 227, 0.72);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.65);
        }
        .custom-input {
          background: transparent;
          border: none;
          border-bottom: 1.5px solid rgba(196, 104, 114, 0.45);
          transition: all 0.25s ease;
        }
        .custom-input:focus {
          outline: none;
          box-shadow: none;
          border-bottom-color: #8d3b45;
        }
        .satin-rose-btn {
          background: linear-gradient(180deg, #d38b93 0%, #b8626e 50%, #9e4653 100%);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
        }
        .satin-rose-btn:active {
          transform: scale(0.97);
        }
        .flower-visual-mask {
          border-radius: 36px;
          box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.3), 0 12px 30px rgba(122, 53, 65, 0.2);
        }
        .shadow-soft-neumorphic {
          box-shadow: 18px 18px 40px rgba(186, 126, 127, 0.28), -12px -12px 30px rgba(255, 255, 255, 0.85);
        }
        .shadow-pill-glow {
          box-shadow: 0 8px 24px rgba(196, 104, 114, 0.38), inset 0 1px 1px rgba(255, 255, 255, 0.45);
        }
      `}</style>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#5c222b] text-white px-5 py-2.5 rounded-full shadow-lg text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMsg}
        </div>
      )}

      {/* Ambient Background Lighting */}
      <div className="glow-orb w-72 h-72 bg-[#fbd4cd] top-4 left-6 opacity-60"></div>
      <div className="glow-orb w-80 h-80 bg-[#e7adb0] bottom-6 right-6 opacity-40"></div>

      {/* Mobile Device / App Frame */}
      <main className="w-full max-w-[420px] md:max-w-[800px] mx-auto z-10 relative">
        {/* Top Header: Language Switcher & Subtle Sanctuary Badge */}
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-[#8d3b45] font-semibold tracking-wide">
            <span className="text-sm">🌸</span>
            <span>{isAr ? "ريليشنشيبس • مساحتكم الخاصة" : "RELATIONSHIPS • PRIVATE SPACE"}</span>
          </div>
          <div className="flex items-center bg-white/50 backdrop-blur-md rounded-full p-0.5 border border-white/60 shadow-xs">
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                isAr ? "bg-[#aa4c57] text-white shadow-xs" : "text-[#7a3541] hover:text-[#5c222b]"
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                !isAr ? "bg-[#aa4c57] text-white shadow-xs" : "text-[#7a3541] hover:text-[#5c222b]"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Outer Neumorphic Canvas Card */}
        <div className="glass-card rounded-[40px] p-4 sm:p-7 shadow-soft-neumorphic relative overflow-hidden">
          {/* Dynamic Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Aesthetic Floral Image Showcase Panel */}
            <section
              aria-label="Visual Brand Showcase"
              className="md:col-span-5 order-1 md:order-2 flex flex-col justify-center relative"
            >
              <div className="relative w-full h-56 md:h-full min-h-[220px] md:min-h-[440px] overflow-hidden flower-visual-mask group">
                {/* Provided Floral Artwork */}
                <img
                  alt="A breathtaking cinematic close-up of a blooming delicate pink and dusty rose flower with soft layered petals"
                  className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-700 ease-out group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwdt04asDmMZzPMbywUgwO2yoryfMBPtl3pZBHlICamueDNgQjxx_GRf1kr1u63Ij33-O2P80h7VeqmW3dcbfR1SQF8jgBrVNgTf0bbcyApd2bAfDxRC11xm_ApgDxrpeDcJrJ3yfbXss2EmBM3Pwni-FPK6dcdAV0cZ_OcEobVNNE-q5-UJZ1yIN4nuLTdKF2Kx36FRkQy4ES7D3P3c6yEN9iUpgNtYWCJg70hwaE4BpP3e6T1Ky9hg"
                />
                {/* Soft Rose Overlay and Glow Edge */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#5c222b]/40 via-transparent to-[#edd3d0]/20 pointer-events-none"></div>
                <div className="absolute inset-0 rounded-[36px] ring-1 ring-inset ring-white/40 pointer-events-none"></div>
                {/* Delicate Floating Tagline */}
                <div className="absolute bottom-4 left-4 right-4 text-center backdrop-blur-md bg-white/20 py-2 px-3 rounded-2xl border border-white/30">
                  <p
                    className="text-white text-xs tracking-widest uppercase drop-shadow-sm font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {isAr ? "همس الورد • Ethereal Bloom" : "Ethereal Bloom"}
                  </p>
                </div>
              </div>
            </section>

            {/* Sign Up / Login Form Card */}
            <section className="md:col-span-7 order-2 md:order-1 flex flex-col justify-center px-2 sm:px-4 py-2">
              {/* Header Area */}
              <header className="text-center md:text-left mb-6 sm:mb-8">
                <h1
                  className="text-3xl sm:text-4xl font-extrabold text-[#8d3b45] tracking-tight mb-2"
                  style={{ fontFamily: isAr ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                >
                  {authMode === "register"
                    ? isAr
                      ? "إنشاء حساب جديد"
                      : "Sign up"
                    : isAr
                    ? "أهلاً بك مجدداً"
                    : "Welcome back"}
                </h1>
                <p className="text-xs sm:text-sm text-[#aa4c57]/80 font-medium">
                  {isAr ? "انضموا إلى ملاذكم الخاص وشاركوا أجمل اللحظات" : "Join our romantic desert aesthetic sanctuary"}
                </p>
              </header>

              {/* Error Message */}
              {err && (
                <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-700 text-xs font-semibold text-center">
                  {err}
                </div>
              )}

              {/* Input Fields Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Field 1: Username */}
                <div className="relative group">
                  <label className="block text-xs font-semibold text-[#8d3b45] tracking-wider mb-1" htmlFor="username">
                    {isAr ? "اسم المستخدم" : "User name"}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={isAr ? "اكتب اسم المستخدم الخاص بك" : "Enter your username"}
                      className="custom-input w-full pb-2.5 pt-1 text-sm font-medium text-[#5c222b] placeholder-[#db9d9b]/80 pr-9 focus:ring-0"
                    />
                    <span className="absolute right-1 text-[#aa4c57]/75 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Field 2: Email / Display Name */}
                <div className="relative group">
                  <label className="block text-xs font-semibold text-[#8d3b45] tracking-wider mb-1" htmlFor="email">
                    {authMode === "register" ? (isAr ? "الاسم الظاهر أو البريد" : "Display Name or Email") : isAr ? "البريد الإلكتروني (اختياري)" : "Email"}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="email"
                      name="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isAr ? "اسمك المستعار أو بريدك" : "name@desertbloom.com"}
                      className="custom-input w-full pb-2.5 pt-1 text-sm font-medium text-[#5c222b] placeholder-[#db9d9b]/80 pr-9 focus:ring-0"
                    />
                    <span className="absolute right-1 text-[#aa4c57]/75 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Field 3: Password */}
                <div className="relative group">
                  <label className="block text-xs font-semibold text-[#8d3b45] tracking-wider mb-1" htmlFor="password">
                    {isAr ? "كلمة المرور" : "Password"}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="custom-input w-full pb-2.5 pt-1 text-sm font-medium text-[#5c222b] placeholder-[#db9d9b]/80 pr-9 focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      className="absolute right-1 text-[#aa4c57]/75 hover:text-[#5c222b] focus:outline-none transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Form Actions & Primary Button */}
                <div className="pt-3 flex flex-col items-center space-y-4">
                  <button
                    id="submit-btn"
                    type="submit"
                    disabled={busy}
                    className="satin-rose-btn w-48 sm:w-56 py-3 px-6 rounded-full text-white font-semibold text-base shadow-pill-glow tracking-wide flex items-center justify-center space-x-2 border border-white/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>
                      {busy
                        ? isAr
                          ? "جارٍ التحميل..."
                          : "Please wait..."
                        : authMode === "register"
                        ? isAr
                          ? "إنشاء الحساب"
                          : "Sign up"
                        : isAr
                        ? "تسجيل الدخول"
                        : "Login"}
                    </span>
                  </button>

                  {/* Prompt Switch Link */}
                  <p className="text-xs sm:text-sm text-[#7a3541]/80 text-center font-normal">
                    {authMode === "register"
                      ? isAr
                        ? "لديك حساب بالفعل؟ "
                        : "Already have an account? "
                      : isAr
                      ? "ليس لديك حساب بعد؟ "
                      : "Don't have an account? "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === "register" ? "login" : "register");
                        setErr("");
                      }}
                      className="font-semibold text-[#5c222b] underline decoration-[#db9d9b] decoration-1 underline-offset-4 hover:text-[#8d3b45] transition-colors ml-1 cursor-pointer"
                    >
                      {authMode === "register" ? (isAr ? "تسجيل الدخول" : "Log in") : isAr ? "إنشاء حساب جديد" : "Sign up"}
                    </button>
                  </p>
                </div>

                {/* Alternative Quick Biometric / Guest Access Divider */}
                <div className="pt-2 flex items-center justify-between text-xs text-[#c46872]/70">
                  <span className="w-1/4 border-b border-[#e1b7b4]/60"></span>
                  <span className="uppercase tracking-widest text-[10px] font-medium">
                    {isAr ? "أو المتابعة السريعة عبر" : "or continue with"}
                  </span>
                  <span className="w-1/4 border-b border-[#e1b7b4]/60"></span>
                </div>

                {/* Quick Action Icons */}
                <div className="flex justify-center items-center gap-4 pt-1">
                  {/* Partner Invite Code Button */}
                  <button
                    type="button"
                    title={isAr ? "الانضمام برمز دعوة الشريك" : "Join with partner code"}
                    onClick={() => setShowCodeModal(true)}
                    className="w-10 h-10 rounded-full bg-white/50 border border-white/80 shadow-sm flex items-center justify-center text-[#8d3b45] hover:bg-white hover:text-[#5c222b] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                  </button>

                  {/* FaceID / Biometric simulation */}
                  <button
                    type="button"
                    title={isAr ? "دخول سريع FaceID / بصمة" : "Quick Biometric Login"}
                    onClick={handleGoogleLogin}
                    className="w-10 h-10 rounded-full bg-white/50 border border-white/80 shadow-sm flex items-center justify-center text-[#8d3b45] hover:bg-white hover:text-[#5c222b] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.65-.83 1.11-1.99.96-3.14-1 .04-2.18.67-2.88 1.49-.6.7-1.13 1.83-.98 2.94 1.12.09 2.25-.46 2.9-1.29z" />
                    </svg>
                  </button>

                  {/* Google Login */}
                  <button
                    type="button"
                    title={isAr ? "تسجيل عبر Google" : "Continue with Google"}
                    onClick={handleGoogleLogin}
                    className="w-10 h-10 rounded-full bg-white/50 border border-white/80 shadow-sm flex items-center justify-center text-[#8d3b45] hover:bg-white hover:text-[#5c222b] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V13.4h6.887C18.2 16.27 15.6 18.5 12.24 18.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5c1.63 0 3.12.61 4.26 1.62l2.36-2.36C17.34 3.32 14.94 2.5 12.24 2.5 6.98 2.5 2.74 6.74 2.74 12s4.24 9.5 9.5 9.5c5.5 0 9.17-3.86 9.17-9.34 0-.64-.06-1.26-.17-1.875H12.24z" />
                    </svg>
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>

        {/* iOS Home Indicator Spacing Simulation */}
        <div className="h-4 w-32 mx-auto mt-5 bg-[#db9d9b]/30 rounded-full md:hidden"></div>
      </main>

      {/* Partner Invite Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-[#5c222b]">
            <button
              type="button"
              onClick={() => setShowCodeModal(false)}
              className="absolute top-4 left-4 text-xs font-bold text-[#8d3b45] hover:text-[#5c222b] cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold mb-2 text-center" style={{ fontFamily: isAr ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}>
              {isAr ? "الانضمام برمز الدعوة" : "Join with Partner Code"}
            </h3>
            <p className="text-xs text-[#8d3b45]/80 text-center mb-4">
              {isAr
                ? "اكتب الرمز المكون من 8 أحرف وأرقام الذي أرسله لك شريكك"
                : "Enter the 8-character code sent by your partner"}
            </p>
            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <input
                type="text"
                required
                maxLength={8}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123XY"
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 rounded-xl border border-[#c46872]/40 bg-white/70 focus:outline-none focus:border-[#8d3b45]"
              />
              <button
                type="submit"
                disabled={busy}
                className="satin-rose-btn w-full py-2.5 rounded-xl text-white font-semibold text-sm shadow-md cursor-pointer disabled:opacity-50"
              >
                {busy ? (isAr ? "جارٍ الربط..." : "Connecting...") : isAr ? "انضمام للغرفة الآن" : "Join Sanctuary Now"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
