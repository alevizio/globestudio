// After a deploy, a tab opened on the previous build asks for chunk hashes
// that no longer exist (vercel.json lets them 404). Vite then dispatches
// `vite:preloadError` on window; reloading fetches the new index.html and
// its new chunk names. At most once a minute per session: if the chunk is
// still missing right after the reload (offline, a broken deploy), that
// second failure reaches the error boundary instead of reloading forever,
// while a tab that recovered from one deploy can still recover from the
// next. When sessionStorage is blocked the loop can't be guarded, so
// nothing reloads.
const RELOAD_KEY = "gs_chunk_reload";
const RELOAD_WINDOW_MS = 60_000;

// Set once a reload is on its way, so the boundary that the same failed
// import reaches doesn't report a stale chunk as a client_error.
let reloading = false;

export const isReloadingForStaleChunk = () => reloading;

export const reloadOnceOnPreloadError = (win = window, now = Date.now()) => {
  try {
    const lastReload = Number(win.sessionStorage.getItem(RELOAD_KEY));
    if (lastReload && now - lastReload < RELOAD_WINDOW_MS) return false;
    win.sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    return false;
  }
  reloading = true;
  win.location.reload();
  return true;
};
