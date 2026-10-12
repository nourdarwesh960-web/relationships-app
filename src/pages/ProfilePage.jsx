import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, setToken } from "../api.js";
import { formatDateDisplay } from "../dateUtils.js";

export function ProfilePage({ t, user, connection, onProfileUpdated, onDisconnected }) {
  // Profile form state
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "💖");
  const [customAvatar, setCustomAvatar] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileErr, setProfileErr] = useState("");

  // Change password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passErr, setPassErr] = useState("");

  // Connection management
  const [disconnecting, setDisconnecting] = useState(false);
  const [deletingAcc, setDeletingAcc] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state if user prop changes
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.avatar) setAvatar(user.avatar);
  }, [user]);

  const avatarPresets = [
    "💖", "🌹", "👑", "🕊️", "🌸", "🦋", "✨", "☕",
    "🌙", "🪐", "🧸", "🌊", "🎈", "💎", "🍫", "🍓"
  ];

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileErr("");
    setProfileSuccess(false);
    try {
      const finalAvatar = customAvatar.trim() || avatar;
      const res = await api("updateProfile", {
        displayName: displayName.trim(),
        avatar: finalAvatar,
      });
      setProfileSuccess(true);
      if (onProfileUpdated) await onProfileUpdated();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e) {
      setProfileErr(e.message || "فشل تحديث البيانات");
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassErr("كلمات المرور الجديدة غير متطابقة");
      return;
    }
    setChangingPass(true);
    setPassErr("");
    setPassSuccess(false);
    try {
      await api("changePassword", { currentPassword, newPassword });
      setPassSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (e) {
      setPassErr(e.message || "فشل تغيير كلمة المرور");
    } finally {
      setChangingPass(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("متأكد إنك عايز تفصل الارتباط؟ هيتم إلغاء الوصول للمساحة المشتركة.")) return;
    setDisconnecting(true);
    try {
      await api("disconnect");
      if (onDisconnected) await onDisconnected();
    } catch (e) {
      alert(e.message || "فشل فك الارتباط");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleCancelInvitation() {
    if (!window.confirm("إلغاء كود الدعوة ده؟")) return;
    try {
      await api("cancelInvitation");
      if (onDisconnected) await onDisconnected();
    } catch (e) {
      alert(e.message || "فشل إلغاء الدعوة");
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("تحذير: هل أنت متأكد من حذف الحساب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    setDeletingAcc(true);
    try {
      await api("deleteAccount");
      setToken("");
      window.location.reload();
    } catch (e) {
      alert(e.message || "فشل حذف الحساب");
    } finally {
      setDeletingAcc(false);
    }
  }

  const partner = connection?.partner;

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-margin sm:px-gutter space-y-6 pb-24 text-on-surface">
      {/* Header Hub */}
      <section className="flex items-center gap-3 pt-2">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[26px]">manage_accounts</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">بروفايلك وإعدادات الحساب</h2>
          <p className="text-xs text-on-surface-variant">تحكم في اسمك، صورتك الرمزية، والأمان بكل سهولة وبدون تعقيد</p>
        </div>
      </section>

      {/* 1. Account Details & Avatar Section */}
      <section className="rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl relative overflow-hidden">
        <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
          <span>بياناتك الشخصية</span>
        </h3>

        {profileErr && (
          <div className="p-3 mb-4 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs font-medium">
            {profileErr}
          </div>
        )}
        {profileSuccess && (
          <div className="p-3 mb-4 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>تم حفظ التعديلات في الحساب بنجاح!</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="flex flex-col space-y-4">
          {/* Current Avatar Display */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-3xl shadow-inner border-2 border-primary/40 flex-shrink-0">
              {avatar}
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-on-surface block truncate">{displayName || "اسمك"}</span>
              <span className="text-xs text-on-surface-variant block truncate">@{user?.username || "username"}</span>
            </div>
          </div>

          {/* Username (Read Only) */}
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
              اسم المستخدم (للدخول)
            </label>
            <input
              value={user?.username || ""}
              disabled
              className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/20 text-xs text-on-surface-variant opacity-70 cursor-not-allowed"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="text-xs font-semibold text-on-surface uppercase tracking-wider block mb-1">
              اسمك اللي هيظهر لشريكك
            </label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="مثلاً: أحمد أو سارة"
              className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {/* Avatar Icon Palette */}
          <div>
            <label className="text-xs font-semibold text-on-surface uppercase tracking-wider block mb-1.5">
              اختر أيقونة بروفايلك (الإيموجي)
            </label>
            <div className="grid grid-cols-8 gap-2 py-1">
              {avatarPresets.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAvatar(a);
                    setCustomAvatar("");
                  }}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    avatar === a && !customAvatar
                      ? "bg-primary text-on-primary ring-2 ring-primary scale-110 shadow-md"
                      : "bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                placeholder="أو اكتب أي إيموجي تحبه هنا..."
                value={customAvatar}
                onChange={(e) => {
                  setCustomAvatar(e.target.value);
                  if (e.target.value.trim()) setAvatar(e.target.value.trim());
                }}
                className="flex-1 bg-surface-container-low px-3.5 py-2 rounded-xl border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={updatingProfile || !displayName.trim()}
              className="w-full py-3 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold hover:opacity-95 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updatingProfile && <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>}
              <span>{updatingProfile ? "بيتم الحفظ..." : "حفظ التعديلات في الحساب"}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. Partner Connection Info */}
      <section className="rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl">
        <h3 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">favorite</span>
          <span>حالة الارتباط بالشريك</span>
        </h3>

        {connection ? (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{partner?.avatar || "💖"}</span>
                <div>
                  <strong className="text-sm text-on-surface block">
                    {partner?.name || (connection.partnerJoined ? "الشريك" : "في انتظار قبول الدعوة")}
                  </strong>
                  <span className="text-xs text-on-surface-variant">
                    {connection.partnerJoined ? "متصلين سوا في نفس المساحة" : "كود الدعوة نشط وفي انتظار دخول الشريك"}
                  </span>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  connection.partnerJoined
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-tertiary/20 text-tertiary border border-tertiary/30"
                }`}
              >
                {connection.partnerJoined ? "ارتباط نشط" : "في انتظار الشريك"}
              </span>
            </div>

            {connection.startDate && (
              <div className="text-xs text-on-surface-variant flex items-center gap-2 px-1">
                <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                <span>تاريخ بداية الحكاية: <strong>{formatDateDisplay(connection.startDate, "ar")}</strong></span>
              </div>
            )}

            {!connection.partnerJoined && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-2">
                <span className="text-xs text-on-surface-variant block">كود الارتباط للمشاركة مع الشريك:</span>
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-base font-bold text-primary bg-surface-container px-3 py-2 rounded-xl border border-outline-variant/30 select-all">
                    {connection.connectionId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(connection.connectionId);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold transition-all border border-outline-variant/30"
                  >
                    {copied ? "اتنسخ!" : "نسخ الكود"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelInvitation}
                    className="px-3 py-2 text-xs text-error hover:bg-error-container/20 rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {connection.partnerJoined && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2 rounded-xl bg-error-container/20 text-error hover:bg-error-container/40 text-xs font-semibold transition-all border border-error/30"
                >
                  {disconnecting ? "جارٍ فك الارتباط..." : "فك الارتباط بالشريك"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface-variant">
            أنت لسه مش مرتبط بشريك.. تقدر تعمل كود جديد أو تدخل بكود شريكك من الصفحة الرئيسية.
          </div>
        )}
      </section>

      {/* 3. Change Password Section */}
      <section className="rounded-3xl bg-surface-container p-6 border border-outline-variant/30 shadow-xl">
        <h3 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
          <span>تغيير كلمة المرور</span>
        </h3>

        {passErr && (
          <div className="p-3 mb-4 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs font-medium">
            {passErr}
          </div>
        )}
        {passSuccess && (
          <div className="p-3 mb-4 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">
            تم تحديث كلمة المرور بنجاح!
          </div>
        )}

        <form onSubmit={handleChangePassword} className="flex flex-col space-y-3">
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
              كلمة المرور الحالية
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPass}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface transition-all border border-outline-variant/30"
            >
              {changingPass ? "جارٍ الحفظ..." : "تحديث كلمة المرور"}
            </button>
          </div>
        </form>
      </section>

      {/* 4. Resilience & Design System Suite Showcase */}
      <section className="rounded-3xl bg-surface p-6 border border-outline-variant/50 shadow-sm relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-3 relative z-10 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                نظام الأمان والتعافي المرن
              </h3>
              <span className="text-xs text-on-surface-variant block">
                معالجة الأخطاء الذكية وشاشات الانتظار
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
            v2.4
          </span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed mb-4 relative z-10">
          استعراض واختبار شاشات الأمان (404، 500، 403، 401)، وانقطاع الإنترنت وحفظ المسودات التلقائي.
        </p>
        <Link
          to="/resilience"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container hover:text-on-primary-container text-xs font-semibold transition-all shadow-xs active:scale-95"
        >
          <span className="material-symbols-outlined text-[17px]">open_in_new</span>
          <span>فتح شاشة الأمان والتعافي</span>
        </Link>
      </section>

      {/* 5. Danger Zone */}
      <section className="rounded-3xl bg-error-container/10 p-6 border border-error/30 shadow-xl">
        <h3 className="text-base font-bold text-error mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">warning</span>
          <span>منطقة الخطر</span>
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          حذف الحساب نهائياً وإلغاء جميع الجلسات والبيانات المرتبطة بك في هذه المساحة.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deletingAcc}
          className="px-4 py-2.5 rounded-xl bg-error text-on-error text-xs font-semibold hover:opacity-90 transition-all shadow-md"
        >
          {deletingAcc ? "جارٍ الحذف..." : "حذف حسابي نهائياً"}
        </button>
      </section>
    </div>
  );
}
