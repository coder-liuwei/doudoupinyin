import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  cleanOcrText,
  mergeImportedText,
  validateImageFile,
} from "@/lib/image-import";

describe("image import rules", () => {
  it.each([
    ["课文.jpg", "image/jpeg"],
    ["课文.png", "image/png"],
    ["课文.webp", "image/webp"],
  ])("accepts supported image %s", (name, type) => {
    expect(validateImageFile(new File(["image"], name, { type }))).toBeNull();
  });

  it("rejects unsupported image formats", () => {
    const message = validateImageFile(
      new File(["image"], "课文.gif", { type: "image/gif" }),
    );

    expect(message).toContain("JPG、PNG 或 WebP");
  });

  it("rejects images larger than the local processing limit", () => {
    const file = new File(
      [new Uint8Array(MAX_IMAGE_BYTES + 1)],
      "超大课文.jpg",
      { type: "image/jpeg" },
    );

    expect(validateImageFile(file)).toContain("10MB");
  });

  it("cleans OCR whitespace without rewriting content", () => {
    expect(cleanOcrText(" 第一行  \r\n\r\n\r\n第二行 \t\r\n")).toBe(
      "第一行\n\n第二行",
    );
  });

  it("merges imported text with a blank line only when needed", () => {
    expect(mergeImportedText("", "识别文字")).toBe("识别文字");
    expect(mergeImportedText("原文", "识别文字")).toBe("原文\n\n识别文字");
  });
});
