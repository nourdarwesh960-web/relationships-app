import { useState } from "react";
import { formatDateToIso } from "../dateUtils.js";

export function OnboardingModal({ t, user, connection, onDone, onSaveProfile, onCreateConn, onJoinConn }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "💖");
  const [date, setDate] = useState(() => formatDateToIso(connection?.startDate) || "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const avatars = ["💖", "🌹", "🌸", "🌿", "🌙", "🌊", "☕", "🕊️", "🪐", "🎈"];

  async function handleProfileSubmit() {
    setErr("");
    setBusy(true);
    try {
      if (name.trim() !== user?.name || avatar !== user?.avatar) {
        await onSaveProfile({ displayName: name.trim(), avatar });
      }
      setStep(2);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!date) return;
    setErr("");
    setBusy(true);
    try {
      const isoDate = formatDateToIso(date) || date;
      await onCreateConn({ startDate: isoDate });
      setStep(3);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!code) return;
    setErr("");
    setBusy(true);
    try {
      await onJoinConn({ code: code.trim().toUpperCase() });
      setStep(3);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "520px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "2.5rem" }}>💖</span>
          <h2>{t("onboardingWelcome")}</h2>
          <p>{step === 1 ? t("onboardingStep1") : step === 2 ? t("onboardingStep2") : t("onboardingStep3")}</p>
        </div>

        {err && <div className="alert alert-error">{err}</div>}

        {step === 1 && (
          <div>
            <div className="form-group">
              <label>{t("displayName")}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("displayName")} />
            </div>

            <div className="form-group">
              <label>Choose Avatar Icon</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", margin: "8px 0" }}>
                {avatars.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: "1.3rem",
                      padding: "8px",
                      borderColor: avatar === a ? "var(--accent-primary)" : "transparent"
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
              <button className="btn btn-primary" onClick={handleProfileSubmit} disabled={busy || !name.trim()}>
                {t("onboardingNext")} ›
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="card card-elevated" style={{ marginBottom: "16px" }}>
              <h4>{t("createConnection")}</h4>
              <p style={{ marginBottom: "10px" }}>{t("startDate")}</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <button className="btn btn-primary" onClick={handleCreate} disabled={busy || !date}>
                  {t("create")}
                </button>
              </div>
            </div>

            <div className="card card-elevated">
              <h4>{t("joinConnection")}</h4>
              <p style={{ marginBottom: "10px" }}>{t("enterCode")}</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD1234" dir="ltr" />
                <button className="btn btn-secondary" onClick={handleJoin} disabled={busy || !code}>
                  {t("join")}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                ‹ {t("back")}
              </button>
              <button className="btn btn-ghost" onClick={() => setStep(3)}>
                Skip for now ›
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "20px 0", textAlign: "start" }}>
              <div className="card card-elevated" style={{ padding: "14px" }}>
                <h5>📸 {t("memories")}</h5>
                <p style={{ fontSize: "0.82rem" }}>Save photos and intimate stories</p>
              </div>
              <div className="card card-elevated" style={{ padding: "14px" }}>
                <h5>💌 {t("letters")}</h5>
                <p style={{ fontSize: "0.82rem" }}>Love letters and scheduled capsules</p>
              </div>
              <div className="card card-elevated" style={{ padding: "14px" }}>
                <h5>🎬 {t("watch")}</h5>
                <p style={{ fontSize: "0.82rem" }}>Synced videos & music in real-time</p>
              </div>
              <div className="card card-elevated" style={{ padding: "14px" }}>
                <h5>📅 {t("calendar")}</h5>
                <p style={{ fontSize: "0.82rem" }}>Milestone tracking & anniversaries</p>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" onClick={onDone} style={{ width: "100%", marginTop: "12px" }}>
              {t("onboardingDone")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
