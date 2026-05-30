// POST /api/subscribe { email } — adds an address to the launch waitlist.
//
// Storage is provider-flexible via env vars (set in Vercel → Project →
// Settings → Environment Variables); the first configured one wins:
//
//   1. Vercel Blob (first-party, no third party). One PRIVATE object per
//      email (path = the email), so signups never race each other and
//      dedup is free. Export the list at launch with `list({ prefix:
//      "waitlist/" })`. Auto-injected when you create a Blob store and
//      link it to the project:
//        BLOB_READ_WRITE_TOKEN
//
//   2. Resend Audiences (lets you broadcast the launch email + handles
//      unsubscribe/GDPR):
//        RESEND_API_KEY=re_xxx
//        RESEND_AUDIENCE_ID=xxxxxxxx-xxxx-...   (Resend → Audiences)
//
//   3. Vercel KV (Upstash Redis SET). Auto-injected when you create a KV
//      store and link it to the project:
//        KV_REST_API_URL, KV_REST_API_TOKEN
//
// If none is set the request still succeeds (so the form works in
// preview) but logs a warning and stores nothing.

import { head, put } from "@vercel/blob";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  // Honeypot: bots fill the hidden field. Pretend success, store nothing.
  if (body.hp) return res.status(200).json({ ok: true });

  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: "invalid_email" });
  }

  try {
    const {
      BLOB_READ_WRITE_TOKEN,
      RESEND_API_KEY,
      RESEND_AUDIENCE_ID,
      KV_REST_API_URL,
      KV_REST_API_TOKEN,
    } = process.env;

    // --- Option 1: Vercel Blob (one private object per email) ---
    if (BLOB_READ_WRITE_TOKEN) {
      const pathname = `waitlist/${encodeURIComponent(email)}.json`;
      // Already on the list? head() resolves if the object exists.
      const exists = await head(pathname).then(
        () => true,
        () => false,
      );
      if (exists) return res.status(409).json({ ok: true, duplicate: true });
      try {
        await put(pathname, JSON.stringify({ email, ts: new Date().toISOString() }), {
          access: "private",
          addRandomSuffix: false,
          contentType: "application/json",
        });
      } catch {
        // A concurrent signup of the same email just created it — put()
        // refuses to overwrite, so treat the conflict as a dedupe hit.
        return res.status(409).json({ ok: true, duplicate: true });
      }
      return res.status(200).json({ ok: true });
    }

    // --- Option 2: Resend Audiences ---
    if (RESEND_API_KEY && RESEND_AUDIENCE_ID) {
      const r = await fetch(
        `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, unsubscribed: false }),
        },
      );
      if (r.ok) return res.status(200).json({ ok: true });
      const text = await r.text();
      // Resend reports an existing contact as 409, or 422 "already exists".
      if (r.status === 409 || (r.status === 422 && /exist/i.test(text))) {
        return res.status(409).json({ ok: true, duplicate: true });
      }
      console.error("subscribe: resend error", r.status, text);
      return res.status(502).json({ error: "provider_error" });
    }

    // --- Option 3: Vercel KV (Upstash REST) — SADD into a set ---
    if (KV_REST_API_URL && KV_REST_API_TOKEN) {
      const r = await fetch(
        `${KV_REST_API_URL}/sadd/waitlist/${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } },
      );
      if (!r.ok) {
        console.error("subscribe: kv error", r.status, await r.text());
        return res.status(502).json({ error: "provider_error" });
      }
      const data = await r.json();
      // SADD returns 0 when the member already existed.
      if (data.result === 0) return res.status(409).json({ ok: true, duplicate: true });
      return res.status(200).json({ ok: true });
    }

    // --- No provider configured ---
    console.warn("subscribe: no RESEND_*/KV_* env set; not stored:", email);
    return res.status(200).json({ ok: true, stored: false });
  } catch (err) {
    console.error("subscribe: unexpected error", err);
    return res.status(500).json({ error: "server_error" });
  }
}
