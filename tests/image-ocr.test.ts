import { beforeEach, describe, expect, it, vi } from "vitest";

const tesseract = vi.hoisted(() => {
  const recognize = vi.fn();
  const terminate = vi.fn();
  const createWorker = vi.fn();
  return { recognize, terminate, createWorker };
});

vi.mock("tesseract.js", () => ({
  createWorker: tesseract.createWorker,
}));

import { recognizeImageText } from "@/lib/image-ocr";

describe("recognizeImageText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tesseract.terminate.mockResolvedValue(undefined);
    tesseract.createWorker.mockImplementation(
      async (_language: string, _oem: number | undefined, options: {
        logger: (message: { status: string; progress: number }) => void;
      }) => {
        options.logger({ status: "recognizing text", progress: 0.42 });
        return {
          recognize: tesseract.recognize,
          terminate: tesseract.terminate,
        };
      },
    );
  });

  it("recognizes simplified Chinese locally and reports progress", async () => {
    tesseract.recognize.mockResolvedValue({
      data: { text: " 第一行  \r\n第二行 " },
    });
    const updates: Array<{ status: string; progress: number }> = [];

    const text = await recognizeImageText(
      new File(["image"], "课文.jpg", { type: "image/jpeg" }),
      (progress) => updates.push(progress),
    );

    expect(tesseract.createWorker).toHaveBeenCalledWith(
      "chi_sim",
      undefined,
      expect.objectContaining({ logger: expect.any(Function) }),
    );
    expect(text).toBe("第一行\n第二行");
    expect(updates).toContainEqual({ status: "正在识别文字", progress: 0.42 });
    expect(tesseract.terminate).toHaveBeenCalledOnce();
  });

  it("terminates the worker and rejects an empty result", async () => {
    tesseract.recognize.mockResolvedValue({ data: { text: " \n " } });

    await expect(
      recognizeImageText(
        new File(["image"], "空白.jpg", { type: "image/jpeg" }),
      ),
    ).rejects.toThrow("没有识别出文字");
    expect(tesseract.terminate).toHaveBeenCalledOnce();
  });
});
