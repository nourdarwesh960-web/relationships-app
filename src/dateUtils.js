/**
 * Robust Date Utilities for Relationships App
 * Seamlessly normalizes ISO dates, timestamps, and Google Sheets localized date strings
 * (e.g. "Wed May 15 2024 00:00:00 GMT+0300 (توقيت شرق أوروبا الصيفي)")
 */

export function normalizeToDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number" && !isNaN(val)) return new Date(val);

  const s = String(val).trim();
  if (!s) return null;

  // 1. Direct match for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00");
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Direct Date parsing (handles ISO with T and standard date strings)
  const dDirect = new Date(s);
  if (!isNaN(dDirect.getTime())) return dDirect;

  // 3. Fallback regex for YYYY-MM-DD in any localized string
  const ymd = s.match(/(\d{4})[^\d](\d{1,2})[^\d](\d{1,2})/);
  if (ymd) {
    const d = new Date(`${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Fallback regex for DD-MM-YYYY
  const dmy = s.match(/(\d{1,2})[^\d](\d{1,2})[^\d](\d{4})/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function formatDateToIso(val) {
  if (!val) return "";
  const d = normalizeToDate(val);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateDisplay(val, lang = "ar") {
  if (!val) return "";
  const d = normalizeToDate(val);
  if (!d) return String(val);
  try {
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return formatDateToIso(val);
  }
}
