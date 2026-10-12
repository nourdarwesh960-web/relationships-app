import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export function DiscoveryPage({ t, user, connection }) {
  const [activities, setActivities] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [stats, setStats] = useState({ days: 0, memories: 0, letters: 0, wishes: 0 });
  const [loading, setLoading] = useState(true);

  // Quick memory modal for prompt
  const [promptAnswer, setPromptAnswer] = useState("");
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [actRes, memRes, letRes, wishRes] = await Promise.all([
          api("getActivities").catch(() => ({ activities: [], prompts: [] })),
          api("getMemories").catch(() => ({ memories: [] })),
          api("getLetters").catch(() => ({ received: [], sent: [] })),
          api("getWishlist").catch(() => ({ wishlist: [] })),
        ]);

        const days = connection?.startDate
          ? Math.max(0, Math.floor((Date.now() - new Date(connection.startDate + "T00:00:00").getTime()) / 864e5))
          : 0;

        const wishesDone = (wishRes.wishlist || []).filter((w) => w.status === "completed").length;
        const totalLetters = (letRes.received || []).length + (letRes.sent || []).length;

        setStats({
          days,
          memories: (memRes.memories || []).length,
          letters: totalLetters,
          wishes: wishesDone,
        });

        const promptList = actRes.prompts || [];
        setPrompts(promptList);
        if (promptList.length > 0) setSelectedPrompt(promptList[0]);
        setActivities(actRes.activities || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [connection]);

  const isAr = document.documentElement.lang === "ar";

  async function handleSavePromptAnswer() {
    if (!promptAnswer.trim() || !selectedPrompt) return;
    setSavingAnswer(true);
    try {
      const qText = isAr ? selectedPrompt.ar : selectedPrompt.en;
      await api("saveMemory", {
        title: `Q&A: ${qText.slice(0, 40)}…`,
        memoryDate: new Date().toISOString().split("T")[0],
        content: `Question: ${qText}\n\nAnswer: ${promptAnswer}`,
        category: "daily",
        tags: ["qa", "prompt"],
        isFavorite: true,
        privacy: "shared",
      });
      setAnswerSaved(true);
      setPromptAnswer("");
      setTimeout(() => setAnswerSaved(false), 3000);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingAnswer(false);
    }
  }

  function pickRandomPrompt() {
    if (prompts.length === 0) return;
    const r = prompts[Math.floor(Math.random() * prompts.length)];
    setSelectedPrompt(r);
    setPromptAnswer("");
    setAnswerSaved(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🧭 {t("discoveryTitle")}</h2>
          <p>Relationship insights, deep conversation starters, and our story timeline.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <span style={{ fontSize: "2rem" }}>⏳</span>
          <h2 style={{ color: "var(--accent-primary)", margin: "8px 0" }}>{stats.days}</h2>
          <p style={{ fontSize: "0.85rem" }}>{t("statDays")}</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <span style={{ fontSize: "2rem" }}>📸</span>
          <h2 style={{ color: "var(--accent-rose)", margin: "8px 0" }}>{stats.memories}</h2>
          <p style={{ fontSize: "0.85rem" }}>{t("statMemories")}</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <span style={{ fontSize: "2rem" }}>💌</span>
          <h2 style={{ color: "var(--accent-amber)", margin: "8px 0" }}>{stats.letters}</h2>
          <p style={{ fontSize: "0.85rem" }}>{t("statLetters")}</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <span style={{ fontSize: "2rem" }}>🎁</span>
          <h2 style={{ color: "var(--accent-blue)", margin: "8px 0" }}>{stats.wishes}</h2>
          <p style={{ fontSize: "0.85rem" }}>{t("statWishes")}</p>
        </div>
      </section>

      {/* Daily Conversation Starter */}
      {selectedPrompt && (
        <section className="card card-elevated" style={{ marginBottom: "28px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span className="badge badge-rose">💭 {t("conversationStarters")}</span>
            <button className="btn btn-secondary btn-sm" onClick={pickRandomPrompt}>
              🔄 {t("newPrompt")}
            </button>
          </div>

          <h3 style={{ fontStyle: "italic", lineHeight: 1.6, marginBottom: "18px" }}>
            "{isAr ? selectedPrompt.ar : selectedPrompt.en}"
          </h3>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              placeholder="Write your shared answer or thought here…"
              value={promptAnswer}
              onChange={(e) => setPromptAnswer(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleSavePromptAnswer}
              disabled={savingAnswer || !promptAnswer.trim()}
            >
              {savingAnswer ? t("loading") : `📝 ${t("recordAsMemory")}`}
            </button>
          </div>

          {answerSaved && (
            <p className="ok" style={{ marginTop: "10px", fontSize: "0.88rem" }}>
              ✓ Saved to your memories!
            </p>
          )}
        </section>
      )}

      {/* Activity Log */}
      <section className="card">
        <h3 style={{ marginBottom: "16px" }}>📜 {t("activityFeed")}</h3>
        {loading ? (
          <div className="loading-spinner" />
        ) : activities.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px", color: "var(--text-subtle)" }}>
            {t("empty")}
          </p>
        ) : (
          <div>
            {activities.map((act) => (
              <div key={act.id} className="activity-item">
                <span className="activity-avatar">
                  {act.actionType.includes("memory")
                    ? "📸"
                    : act.actionType.includes("letter")
                    ? "💌"
                    : act.actionType.includes("wish")
                    ? "🎁"
                    : act.actionType.includes("event")
                    ? "📅"
                    : "💖"}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "var(--text-main)", fontSize: "0.95rem", margin: 0 }}>
                    {act.summary}
                  </p>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-subtle)" }}>
                    {new Date(act.createdAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
