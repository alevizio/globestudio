import { describe, expect, it, vi } from "vitest";
import {
  dataUrlToBlob,
  exportScaleValue,
  MIN_VIDEO_BYTES,
  probeMp4Support,
  recordCanvasToVideoBlob,
} from "./export.js";

describe("exportScaleValue", () => {
  it("parses the leading number out of '2x'", () => {
    expect(exportScaleValue("2x")).toBe(2);
    expect(exportScaleValue("4x")).toBe(4);
  });

  it("defaults to 1 for unrecognized values", () => {
    expect(exportScaleValue("")).toBe(1);
    expect(exportScaleValue("foo")).toBe(1);
  });
});

describe("dataUrlToBlob", () => {
  it("decodes a base64 data URL into a Blob with the header's mime type", () => {
    const blob = dataUrlToBlob("data:image/png;base64,iVBORw0KGgo=");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("parses a non-PNG mime type from the header", () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64,AAAA");
    expect(blob.type).toBe("image/jpeg");
  });

  it("returns null when the input has no data segment (no comma)", () => {
    expect(dataUrlToBlob("not-a-data-url")).toBeNull();
  });
});

describe("recordCanvasToVideoBlob", () => {
  // A MediaRecorder stand-in that hands back whatever chunks the test gives it.
  const withRecorder = (chunks, run) => {
    const original = globalThis.MediaRecorder;
    globalThis.MediaRecorder = class {
      static isTypeSupported() {
        return true;
      }
      start() {}
      stop() {
        for (const data of chunks) this.ondataavailable?.({ data });
        this.onstop?.();
      }
    };
    return run().finally(() => {
      globalThis.MediaRecorder = original;
    });
  };
  const canvas = { captureStream: () => ({}) };

  it("rejects a recording with no frames instead of saving a file that won't open", async () => {
    await withRecorder([new Blob([new Uint8Array(110)])], () =>
      expect(recordCanvasToVideoBlob(canvas, { durationMs: 1 })).rejects.toThrow(/empty/),
    );
    await withRecorder([], () =>
      expect(recordCanvasToVideoBlob(canvas, { durationMs: 1 })).rejects.toThrow(/empty/),
    );
  });

  it("resolves with the recording once it holds real frames", async () => {
    await withRecorder([new Blob([new Uint8Array(MIN_VIDEO_BYTES * 4)])], async () => {
      const blob = await recordCanvasToVideoBlob(canvas, { durationMs: 1 });
      expect(blob.size).toBe(MIN_VIDEO_BYTES * 4);
    });
  });
});

describe("probeMp4Support", () => {
  const withEncoder = (encoder, run) => {
    const original = window.VideoEncoder;
    window.VideoEncoder = encoder;
    return run().finally(() => {
      if (original === undefined) delete window.VideoEncoder;
      else window.VideoEncoder = original;
    });
  };

  it("is false without WebCodecs", async () => {
    await withEncoder(undefined, async () => expect(await probeMp4Support()).toBe(false));
  });

  it("asks the encoder whether it can do H.264 instead of trusting that it exists", async () => {
    const isConfigSupported = vi.fn(async () => ({ supported: false }));
    await withEncoder({ isConfigSupported }, async () => expect(await probeMp4Support()).toBe(false));
    expect(isConfigSupported).toHaveBeenCalledWith(expect.objectContaining({ codec: "avc1.420028" }));

    await withEncoder({ isConfigSupported: async () => ({ supported: true }) }, async () =>
      expect(await probeMp4Support()).toBe(true),
    );
  });

  it("is false when the probe throws", async () => {
    await withEncoder({ isConfigSupported: async () => { throw new TypeError("bad config"); } }, async () =>
      expect(await probeMp4Support()).toBe(false),
    );
  });
});
