import { useEffect, useState } from "react";
import { api } from "../api.js";

export function WishlistPage({ t, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "gifts",
    priority: "medium",
    price: "",
    url: "",
    targetDate: "",
    status: "idea",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function loadWishlist() {
    try {
      setLoading(true);
      const res = await api("getWishlist");
      setItems(res.wishlist || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  function openAddModal() {
    setEditingItem(null);
    setForm({
      title: "",
      category: "gifts",
      priority: "medium",
      price: "",
      url: "",
      targetDate: "",
      status: "idea",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setForm({
      title: item.title,
      category: item.category || "gifts",
      priority: item.priority || "medium",
      price: item.price || "",
      url: item.url || "",
      targetDate: item.targetDate || "",
      status: item.status || "idea",
      notes: item.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSaveItem(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api("saveWishlistItem", {
        id: editingItem?.id,
        ...form,
      });
      setModalOpen(false);
      await loadWishlist();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(item) {
    const nextStatus = item.status === "completed" ? "idea" : "completed";
    try {
      await api("updateWishlistStatus", { id: item.id, status: nextStatus });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)));
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleDeleteItem(id) {
    if (!window.confirm("Remove this wish?")) return;
    try {
      await api("deleteWishlistItem", { id });
      await loadWishlist();
    } catch (e) {
      alert(e.message);
    }
  }

  const filteredItems = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{t("wishlistTitle")}</h2>
          <p>{t("landingFeature5Desc")}</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + {t("addWish")}
        </button>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {/* Filter Tabs & Select */}
      <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              className={`btn ${statusFilter === "all" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setStatusFilter("all")}
            >
              {t("all")}
            </button>
            <button
              className={`btn ${statusFilter === "idea" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setStatusFilter("idea")}
            >
              💡 {t("statusIdea")}
            </button>
            <button
              className={`btn ${statusFilter === "planned" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setStatusFilter("planned")}
            >
              🎯 {t("statusPlanned")}
            </button>
            <button
              className={`btn ${statusFilter === "purchased" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setStatusFilter("purchased")}
            >
              🛍️ {t("statusPurchased")}
            </button>
            <button
              className={`btn ${statusFilter === "completed" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setStatusFilter("completed")}
            >
              ✅ {t("statusCompleted")}
            </button>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ maxWidth: "200px" }}
          >
            <option value="all">{t("all")} Categories</option>
            <option value="gifts">🎁 Gifts & Surprises</option>
            <option value="travel">✈️ Travel & Places</option>
            <option value="activities">🎡 Activities & Dates</option>
            <option value="home">🏡 Home & Comfort</option>
            <option value="other">📌 Other</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">💭</span>
          <p>{t("empty")}</p>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            + {t("addWish")}
          </button>
        </div>
      ) : (
        <div>
          {filteredItems.map((item) => {
            const isDone = item.status === "completed";
            return (
              <div key={item.id} className={`wishlist-item ${isDone ? "completed" : ""}`}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <button
                    className={`btn ${isDone ? "btn-primary" : "btn-secondary"} btn-sm`}
                    style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
                    onClick={() => handleToggleStatus(item)}
                    title="Toggle completed"
                  >
                    {isDone ? "✓" : "○"}
                  </button>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span className={`badge ${item.priority === "high" ? "badge-rose" : item.priority === "medium" ? "badge-amber" : "badge-muted"}`}>
                        {item.priority === "high" ? t("prioHigh") : item.priority === "medium" ? t("prioMedium") : t("prioLow")}
                      </span>
                      <span className="badge badge-muted">{item.category}</span>
                      {item.price && <span className="badge badge-emerald">💰 {item.price}</span>}
                      {item.targetDate && <span className="badge badge-muted">📅 {item.targetDate}</span>}
                    </div>

                    <h4 style={{ margin: "2px 0" }}>{item.title}</h4>
                    {item.notes && <p style={{ fontSize: "0.85rem", margin: 0 }}>{item.notes}</p>}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Open Link"
                    >
                      🔗 Link
                    </a>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(item)}>
                    ✏️
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDeleteItem(item.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Wish Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3>{editingItem ? t("edit") : t("addWish")}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className="form-group">
                <label>{t("wishTitle")}</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Weekend cabin retreat / Coffee machine"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t("category")}</label>
                  <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                    <option value="gifts">🎁 Gifts & Surprises</option>
                    <option value="travel">✈️ Travel & Places</option>
                    <option value="activities">🎡 Activities & Dates</option>
                    <option value="home">🏡 Home & Comfort</option>
                    <option value="other">📌 Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t("wishPriority")}</label>
                  <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                    <option value="high">🔴 {t("prioHigh")}</option>
                    <option value="medium">🟡 {t("prioMedium")}</option>
                    <option value="low">🟢 {t("prioLow")}</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t("wishPrice")}</label>
                  <input
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="e.g. $50 / 200 SAR"
                  />
                </div>
                <div className="form-group">
                  <label>{t("wishStatus")}</label>
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="idea">💡 {t("statusIdea")}</option>
                    <option value="planned">🎯 {t("statusPlanned")}</option>
                    <option value="purchased">🛍️ {t("statusPurchased")}</option>
                    <option value="completed">✅ {t("statusCompleted")}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t("wishUrl")}</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Size, color, where to buy, notes…"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t("loading") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
