import { useCallback, useEffect, useRef, useState } from "react";
import { useSync, expectedTime } from "./sync.js";
import { makeAdapter } from "./players.js";

export function Room({ type, t }) {
  const { session, partner, down, error, loaded, push, create } = useSync(type);
  const [url, setUrl] = useState(""), [tap, setTap] = useState(false), [mediaErr, setMediaErr] = useState("");
  const host = useRef(null), ad = useRef(null), applying = useRef(false), sRef = useRef(null);
  sRef.current = session;

  const guard = (fn) => { applying.current = true; Promise.resolve().then(fn).catch(() => setTap(true)).finally(() => setTimeout(() => (applying.current = false), 1200)); };
  const local = useCallback((patch) => { if (!applying.current) push(patch); }, [push]);
  const apply = useCallback((a, s) => guard(async () => {
    if (Math.abs(a.rate() - s.rate) > 0.01) a.setRate(s.rate);
    const want = expectedTime(s);
    if (Math.abs(a.time() - want) > 1.5) a.seek(want); // ignore small drift
    if (s.state === "playing") { setTap(false); await a.play(); } else a.pause();
  }), []);

  useEffect(() => {
    if (!session) return;
    let dead = false; setMediaErr("");
    makeAdapter(session, host.current, {
      onState: (state, time) => local({ playbackState: state, currentTime: time }),
      onSeek: (time) => local({ currentTime: time }),
      onError: () => setMediaErr(t("mediaError")),
    }).then((a) => { if (dead) a.destroy(); else { ad.current = a; apply(a, sRef.current); } });
    return () => { dead = true; ad.current?.destroy(); ad.current = null; };
  }, [session?.provider, session?.mediaId]); // eslint-disable-line

  useEffect(() => { if (ad.current && session && !session.byMe) apply(ad.current, session); }, [session?.version]); // eslint-disable-line

  const start = (e) => { e.preventDefault(); if (url.trim()) create(url.trim()).then(() => setUrl("")); };
  return (
    <section className="card">
      <h2>{t(type)}</h2>
      <p className={partner ? "ok" : "muted"} role="status">● {partner ? t("partnerOn") : t("partnerOff")}</p>
      {down && <p className="warn" role="alert">{t("offline")}</p>}
      {(error || mediaErr) && <p className="warn" role="alert">{mediaErr || error}</p>}
      <form onSubmit={start} className="row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("link")} aria-label={t("link")} dir="ltr" />
        <button type="submit">{t("start")}</button>
      </form>
      <p className="muted">{t(type + "Hint")}</p>
      {loaded && !session && <p className="muted">{t("noSession")}</p>}
      <div ref={host} className={session?.provider === "youtube" ? "player yt" : "player"} />
      {tap && <button className="tap" onClick={() => ad.current && apply(ad.current, sRef.current)}>{t("tap")}</button>}
    </section>
  );
}
