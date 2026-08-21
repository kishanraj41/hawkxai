const CHANNEL = "hawkxai-watchlist";
const TICK = "hawkxai:watchlist:tick";

export function notifyWatchlistChanged(): void {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage({ at: Date.now() });
    ch.close();
  } catch {
    /* unsupported */
  }
  try {
    window.localStorage.setItem(TICK, String(Date.now()));
  } catch {
    /* quota / private */
  }
}

export function onWatchlistChanged(cb: () => void): () => void {
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = () => cb();
  } catch {
    ch = null;
  }
  function onStorage(e: StorageEvent) {
    if (e.key === TICK) cb();
  }
  function onVisible() {
    if (document.visibilityState === "visible") cb();
  }
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    ch?.close();
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
