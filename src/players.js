let ytP;
const loadYT = () => ytP || (ytP = new Promise((res) => {
  if (window.YT?.Player) return res(window.YT);
  const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
  window.onYouTubeIframeAPIReady = () => res(window.YT);
}));

export async function makeAdapter(s, host, h) {
  if (!s || !host) return null;

  if (s.provider === "audio") {
    host.innerHTML = "";
    const a = new Audio(s.mediaUrl);
    a.controls = true;
    a.autoplay = true;
    a.playsInline = true;
    a.preload = "auto";
    a.style.width = "100%";
    a.style.borderRadius = "12px";
    a.style.marginTop = "8px";
    host.appendChild(a);

    // MediaSession API enables background audio on mobile & lockscreen controls
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: s.title || (s.mediaUrl ? s.mediaUrl.split("/").pop() : "أغنيتنا سوا"),
          artist: "ركننا الخاص",
        });
        navigator.mediaSession.setActionHandler("play", () => a.play().catch(() => {}));
        navigator.mediaSession.setActionHandler("pause", () => a.pause());
      } catch (err) {}
    }

    a.onplay = () => h.onState("playing", a.currentTime);
    a.onpause = () => h.onState("paused", a.currentTime);
    a.onseeked = () => h.onSeek(a.currentTime);
    a.onerror = () => h.onError();

    return {
      play: () => a.play().catch(() => {}),
      pause: () => a.pause(),
      seek: (t) => { a.currentTime = t; },
      time: () => a.currentTime,
      rate: () => a.playbackRate,
      setRate: (r) => { a.playbackRate = r; },
      destroy: () => {
        a.pause();
        a.removeAttribute("src");
        host.innerHTML = "";
      }
    };
  }

  if (s.provider === "anghami") {
    host.innerHTML = "";
    const cleanId = String(s.mediaId).match(/\d+/)?.[0] || s.mediaId;
    const iframe = document.createElement("iframe");
    iframe.src = `https://widget.anghami.com/?id=${cleanId}&layout=wide&theme=dark`;
    iframe.width = "100%";
    iframe.height = "160px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "16px";
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    host.appendChild(iframe);
    return {
      play: () => {},
      pause: () => {},
      seek: () => {},
      time: () => 0,
      rate: () => 1,
      setRate: () => {},
      destroy: () => { host.innerHTML = ""; }
    };
  }

  // YouTube Adapter
  const YT = await loadYT();
  host.innerHTML = "";
  const el = document.createElement("div");
  host.appendChild(el);

  return new Promise((resolve) => {
    let last = 0, p, iv;
    p = new YT.Player(el, {
      videoId: s.mediaId,
      width: "100%",
      height: "100%",
      playerVars: {
        playsinline: 1,
        rel: 0,
        autoplay: 1,
        modestbranding: 1
      },
      events: {
        onReady: () => {
          iv = setInterval(() => {
            const t = p.getCurrentTime?.() ?? 0, playing = p.getPlayerState?.() === 1;
            if (Math.abs(t - (last + (playing ? 0.5 * p.getPlaybackRate() : 0))) > 1.5) h.onSeek(t);
            last = t;
          }, 500);
          resolve({
            play: async () => { try { p.playVideo(); } catch(e){} },
            pause: () => { try { p.pauseVideo(); } catch(e){} },
            seek: (t) => { try { p.seekTo(t, true); } catch(e){} },
            time: () => p.getCurrentTime?.() ?? 0,
            rate: () => p.getPlaybackRate?.() ?? 1,
            setRate: (r) => { try { p.setPlaybackRate?.(r); } catch(e){} },
            destroy: () => { clearInterval(iv); try { p.destroy(); } catch(e){} host.innerHTML = ""; }
          });
        },
        onStateChange: (e) => {
          if (e.data === 1) h.onState("playing", p.getCurrentTime());
          else if (e.data === 2) h.onState("paused", p.getCurrentTime());
        },
        onError: () => h.onError(),
      }
    });
  });
}
