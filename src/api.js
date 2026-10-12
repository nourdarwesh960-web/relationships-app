const URL_ = import.meta.env.VITE_API_URL || "https://script.google.com/macros/s/AKfycbxPAK106ndLK9QZ3o25wJXS6nfSu8aqrVSIPjFgREIQRqdsMkLIij76aYyjHTstcgko/exec";
export const getToken = () => localStorage.getItem("idt") || "";
export const setToken = (token) => {
  if (token) localStorage.setItem("idt", token);
  else localStorage.removeItem("idt");
};
export async function api(action, params = {}) {
  if (!URL_) {
    throw Object.assign(new Error("VITE_API_URL is not set"), { code: "CONFIG" });
  }
  const res = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, params, token: getToken() }),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Invalid server response. Check the Apps Script deployment.");
  }
  if (!data.ok) {
    if (data.code === "AUTH") {
      setToken("");
      window.dispatchEvent(new Event("authlost"));
    }
    throw Object.assign(new Error(data.error || "Request failed"), {
      code: data.code,
    });
  }
  return data.data;
}
