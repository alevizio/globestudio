import { describe, expect, it, vi } from "vitest";
import {
  dataUrlToBlob,
  exportScaleValue,
  MIN_VIDEO_BYTES,
  probeMp4Support,
  recordCanvasToMp4Blob,
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

  it("flags the canvas as streaming only while it records", async () => {
    const element = document.createElement("canvas");
    element.captureStream = () => ({});
    let flagWhileRecording;
    await withRecorder([new Blob([new Uint8Array(MIN_VIDEO_BYTES * 4)])], async () => {
      const recording = recordCanvasToVideoBlob(element, { durationMs: 1 });
      flagWhileRecording = element.dataset.streaming;
      await recording;
    });
    expect(flagWhileRecording).toBe("1");
    expect(element.dataset.streaming).toBeUndefined();
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

describe("recordCanvasToMp4Blob", () => {
  // WebCodecs stand-ins: an encoder whose support answer and output the test
  // picks, plus the 2D context and VideoFrame that jsdom lacks.
  const withWebCodecs = (VideoEncoder, run) => {
    const originals = { VideoEncoder: window.VideoEncoder, VideoFrame: window.VideoFrame };
    window.VideoEncoder = VideoEncoder;
    window.VideoFrame = class {
      close() {}
    };
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ clearRect() {}, drawImage() {} });
    return run().finally(() => {
      getContext.mockRestore();
      for (const [name, value] of Object.entries(originals)) {
        if (value === undefined) delete window[name];
        else window[name] = value;
      }
    });
  };
  const fakeEncoder = ({ supported, emitChunks }) => {
    const Encoder = vi.fn(function Encoder({ output }) {
      this.configure = () => {};
      this.encode = () => {
        if (emitChunks) output({}, {});
      };
      this.flush = async () => {};
      this.close = () => {};
    });
    Encoder.isConfigSupported = vi.fn(async () => ({ supported }));
    return Encoder;
  };
  // Wider than the 1024px cap, so the real frame is 1024x768, not the
  // 1024x1024 the startup probe asked about.
  const canvas = { width: 1600, height: 1200 };

  it("checks the real frame size again and fails before encoding when H.264 can't do it", async () => {
    const Encoder = fakeEncoder({ supported: false, emitChunks: true });
    await withWebCodecs(Encoder, () =>
      expect(recordCanvasToMp4Blob(canvas, { durationMs: 1000, fps: 1 })).rejects.toThrow(/1024x768/),
    );
    expect(Encoder.isConfigSupported).toHaveBeenCalledWith(
      expect.objectContaining({ codec: "avc1.420028", width: 1024, height: 768 }),
    );
    expect(Encoder).not.toHaveBeenCalled();
  });

  it("rejects when the encoder emits no frames instead of saving an empty MP4", async () => {
    const Encoder = fakeEncoder({ supported: true, emitChunks: false });
    await withWebCodecs(Encoder, () =>
      expect(recordCanvasToMp4Blob(canvas, { durationMs: 1000, fps: 1 })).rejects.toThrow(/no frames/),
    );
    expect(Encoder).toHaveBeenCalledTimes(1);
  });
});
