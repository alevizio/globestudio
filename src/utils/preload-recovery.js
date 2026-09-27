// After a deploy, a tab opened on the previous build asks for chunk hashes
// that no longer exist (vercel.json lets them 404). Vite then dispatches
// `vite:preloadError` on window; reloading fetches the new index.html and
// its new chunk names. Only once per session: if the chunk is missing for
// another reason (offline, a broken deploy), the second failure reaches the
// error boundary instead of reloading forever. When sessionStorage is
// blocked the loop can't be guarded, so nothing reloads.
const RELOAD_KEY = "gs_chunk_reload";

export const reloadOnceOnPreloadError = (win = window) => {
  try {
    if (win.sessionStorage.getItem(RELOAD_KEY)) return false;
    win.sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    return false;
  }
  win.location.reload();
  return true;
};
