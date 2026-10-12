import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";

export const expectedTime = (s) =>
  !s ? 0 : s.state === "playing" ? s.position + ((Date.now() + s.clock - s.updatedAt) / 1000) * s.rate : s.position;

export function useSync(type) {
  const [st, setSt] = useState({ session: null, partner: false, down: false, error: "", loaded: false });
  const ver = useRef(0), cur = useRef(null);
  const adopt = (sess, serverTime) => {
    if (!sess) { ver.current = 0; cur.current = null; return null; }
    ver.current = sess.version; cur.current = { ...sess, clock: serverTime - Date.now() };
    return cur.current;
  };
  useEffect(() => {
    let stop = false, timer, fails = 0;
    const tick = async () => {
      if (stop) return;
      try {
        const d = await api("getSession", { type, sinceVersion: ver.current });
        fails = 0;
        const sess = d.notModified ? cur.current : adopt(d.session, d.serverTime);
        if (d.notModified && cur.current) cur.current.clock = d.serverTime - Date.now();
        setSt((p) => ({ ...p, session: sess, partner: d.partnerOnline, down: false, loaded: true }));
      } catch (e) {
        if (e.code === "AUTH" || e.code === "CONFIG") { setSt((p) => ({ ...p, error: e.message, loaded: true })); return; }
        fails++; setSt((p) => ({ ...p, down: true, error: e.code === "NO_CONN" ? e.message : p.error, loaded: true }));
      }
      if (stop) return;
      const base = document.hidden ? 10000 : cur.current?.state === "playing" ? 2500 : 6000;
      timer = setTimeout(tick, Math.min(30000, base * (1 + Math.min(fails, 4))));
    };
    tick();
    return () => { stop = true; clearTimeout(timer); api("leaveSession", { type }).catch(() => {}); };
  }, [type]);

  const send = useCallback(async (action, params) => {
    try {
      const d = await api(action, { type, ...params });
      const sess = adopt(d.session, d.serverTime);
      setSt((p) => ({ ...p, session: sess, down: false, error: "" }));
      return d;
    } catch (e) { setSt((p) => ({ ...p, error: e.message })); }
  }, [type]);
  const push = useCallback((patch) => send("updateSession", { baseVersion: ver.current, patch }), [send]);
  const create = useCallback((url) => send("createSession", { url }), [send]);
  return { ...st, push, create };
}
