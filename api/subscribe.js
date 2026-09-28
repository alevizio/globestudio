// /api/subscribe: retired. It added addresses to the launch waitlist, which
// closed when Globestudio went live on 28 Sep 2026. Every request, any
// method, now gets 410 Gone and nothing is read or stored.
//
// The signups it saved stay as private objects under "waitlist/" in the
// project's Vercel Blob store, because the one launch email is sent from
// that list; /privacy says when it is deleted. This handler never touches
// the store, so there is no import of @vercel/blob here.
//
// No CORS headers, as before: the only caller was the same-origin teaser.

export default function handler(_req, res) {
  return res.status(410).json({
    error: "waitlist_closed",
    message: "The waitlist closed because Globestudio is live. Try it at https://globestudio.app",
    url: "https://globestudio.app",
  });
}
