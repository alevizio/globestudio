import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../api/subscribe.js";

// The saved signups live in Vercel Blob until the one launch email is sent,
// so the retired endpoint must never reach the store. These spies stand in
// for every @vercel/blob call the old handler made or could make.
const blob = vi.hoisted(() => ({
  head: vi.fn(),
  put: vi.fn(),
  list: vi.fn(),
  del: vi.fn(),
}));
vi.mock("@vercel/blob", () => blob);

// The slice of Vercel's Node response helpers the handler uses.
const fakeRes = () => {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.setHeader = (name, value) => {
    res.headers[name.toLowerCase()] = value;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const call = async (req) => {
  const res = fakeRes();
  await handler({ headers: {}, ...req }, res);
  return res;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("/api/subscribe (retired at launch)", () => {
  it("answers every method with 410 Gone and points to the live site", async () => {
    for (const method of ["POST", "GET", "HEAD", "OPTIONS", "PUT", "DELETE"]) {
      const res = await call({ method });
      expect(res.statusCode, method).toBe(410);
      expect(res.body, method).toEqual({
        error: "waitlist_closed",
        message: "The waitlist closed because Globestudio is live. Try it at https://globestudio.app",
        url: "https://globestudio.app",
      });
    }
  });

  it("stores nothing, even for a valid signup with the Blob store linked", async () => {
    // With this token set, the old handler checked and wrote waitlist/<email>.
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
    const statuses = [];
    for (const body of [{ email: "someone@studio.com" }, JSON.stringify({ email: "someone@studio.com" })]) {
      statuses.push((await call({ method: "POST", body })).statusCode);
    }
    for (const [name, fn] of Object.entries(blob)) expect(fn, name).not.toHaveBeenCalled();
    expect(statuses).toEqual([410, 410]);
  });

  it("adds no CORS headers, so other sites still can't call it", async () => {
    const res = await call({ method: "OPTIONS", headers: { origin: "https://example.com" } });
    expect(Object.keys(res.headers).filter((name) => name.startsWith("access-control-"))).toEqual([]);
  });

  it("words the message plainly, without dashes", async () => {
    const { body } = await call({ method: "POST" });
    expect(body.message).not.toMatch(/[–—]| - /);
  });
});
