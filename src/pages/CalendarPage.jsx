import { useEffect, useState } from "react";
import { api } from "../api.js";

export function CalendarPage({ t, user, connection }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("month"); // 'month' | 'agenda'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({
    title: "",
    eventDate: new Date().toISOString().split("T")[0],
    eventType: "date",
    recurrence: "none",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function loadEvents() {
    try {
      setLoading(true);
      const res = await api("getEvents");
      setEvents(res.events || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  function openAddModal(dateStr = null) {
    setEditingEvent(null);
    setForm({
      title: "",
      eventDate: dateStr || new Date().toISOString().split("T")[0],
      eventType: "date",
      recurrence: "none",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEditModal(e) {
    setEditingEvent(e);
    setForm({
      title: e.title,
      eventDate: e.eventDate,
      eventType: e.eventType || "date",
      recurrence: e.recurrence || "none",
      notes: e.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSaveEvent(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api("saveEvent", {
        id: editingEvent?.id,
        title: form.title,
        eventDate: form.eventDate,
        eventType: form.eventType,
        recurrence: form.recurrence,
        notes: form.notes,
      });
      setModalOpen(false);
      await loadEvents();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(id) {
    if (!window.confirm("Delete this event?")) return;
    try {
      await api("deleteEvent", { id });
      await loadEvents();
    } catch (e) {
      alert(e.message);
    }
  }

  // Calendar Month Matrix Generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  // Fill empty leading slots
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ dayNumber: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const pad = String(d).padStart(2, "0");
    const mPad = String(month + 1).padStart(2, "0");
    const dateStr = `${year}-${mPad}-${pad}`;
    calendarDays.push({ dayNumber: d, dateStr });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const isAr = document.documentElement.lang === "ar";
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthNamesAr = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDayNamesAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>📅 {t("calendarTitle")}</h2>
          <p>{t("landingFeature4Desc")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => openAddModal()}>
          + {t("addEvent")}
        </button>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {/* Month Navigation & View Toggle */}
      <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            >
              ‹
            </button>
            <h3 style={{ margin: 0 }}>
              {isAr ? monthNamesAr[month] : monthNames[month]} {year}
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            >
              ›
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={`btn ${view === "month" ? "btn-primary" : "btn-ghost"} btn-sm`}
              onClick={() => setView("month")}
            >
              {t("monthView")}
            </button>
            <button
              className={`btn ${view === "agenda" ? "btn-primary" : "btn-ghost"} btn-sm`}
              onClick={() => setView("agenda")}
            >
              {t("agendaView")}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : view === "month" ? (
        <div className="card" style={{ padding: "16px" }}>
          <div className="calendar-grid">
            {(isAr ? weekDayNamesAr : weekDayNames).map((dn, i) => (
              <div key={i} className="calendar-day-header">
                {dn}
              </div>
            ))}

            {calendarDays.map((cd, idx) => {
              if (!cd.dayNumber) {
                return <div key={idx} className="calendar-cell other-month" />;
              }
              const isToday = cd.dateStr === todayStr;
              const dayEvents = events.filter((e) => {
                if (e.eventDate === cd.dateStr) return true;
                if (e.recurrence === "yearly" && e.eventDate.endsWith(cd.dateStr.slice(5))) return true;
                return false;
              });

              return (
                <div
                  key={idx}
                  className={`calendar-cell ${isToday ? "today" : ""}`}
                  onClick={() => openAddModal(cd.dateStr)}
                  title={`${cd.dateStr}: ${dayEvents.length} events`}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: isToday ? "bold" : "normal" }}>
                    {cd.dayNumber}
                  </span>
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                    {dayEvents.map((de, di) => (
                      <span
                        key={di}
                        className="calendar-event-dot"
                        title={de.title}
                        style={{
                          backgroundColor:
                            de.eventType === "anniversary"
                              ? "var(--accent-rose)"
                              : de.eventType === "birthday"
                              ? "var(--accent-amber)"
                              : "var(--accent-primary)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card">
          {events.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📅</span>
              <p>{t("empty")}</p>
            </div>
          ) : (
            <div>
              {events.map((e) => {
                const isUpcoming = new Date(e.eventDate).getTime() >= new Date(todayStr).getTime();
                return (
                  <div
                    key={e.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span className="badge badge-emerald">{e.eventDate}</span>
                        <span className="badge badge-muted">{e.eventType}</span>
                        {e.recurrence !== "none" && <span className="badge badge-rose">🔁 {e.recurrence}</span>}
                      </div>
                      <h4>{e.title}</h4>
                      {e.notes && <p style={{ fontSize: "0.85rem" }}>{e.notes}</p>}
                    </div>

                    {!e.isSystem && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(e)}>
                          ✏️
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteEvent(e.id)}>
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3>{editingEvent ? t("edit") : t("addEvent")}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="form-group">
                <label>{t("eventTitle")}</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Candlelight Dinner / Birthday"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t("eventDate")}</label>
                  <input
                    type="date"
                    required
                    value={form.eventDate}
                    onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>{t("eventType")}</label>
                  <select value={form.eventType} onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))}>
                    <option value="date">🕯️ {t("typeDate")}</option>
                    <option value="anniversary">💖 {t("typeAnniversary")}</option>
                    <option value="birthday">🎂 {t("typeBirthday")}</option>
                    <option value="trip">✈️ {t("typeTrip")}</option>
                    <option value="milestone">🏆 {t("typeMilestone")}</option>
                    <option value="other">📌 {t("typeOther")}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t("recurrence")}</label>
                <select value={form.recurrence} onChange={(e) => setForm((p) => ({ ...p, recurrence: e.target.value }))}>
                  <option value="none">{t("recurNone")}</option>
                  <option value="yearly">{t("recurYearly")}</option>
                  <option value="monthly">{t("recurMonthly")}</option>
                  <option value="weekly">{t("recurWeekly")}</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes & Location</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Details, reservation notes, ideas…"
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
