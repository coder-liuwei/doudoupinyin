import { describe, expect, it } from "vitest";
import { splitPlainBlocks } from "@/lib/split";

function textOf(paragraph: ReturnType<typeof splitPlainBlocks>[number]): string {
  return paragraph.map((pair) => pair.ch).join("");
}

describe("splitPlainBlocks layout modes", () => {
  it("preserves each non-empty source line as its own paragraph", () => {
    const paragraphs = splitPlainBlocks("床前明月光\n疑是地上霜\n\n举头望明月", {
      layoutMode: "preserve",
    });

    expect(paragraphs.map(textOf)).toEqual([
      "床前明月光",
      "疑是地上霜",
      "举头望明月",
    ]);
  });

  it("keeps automatic layout compatible with one-line-per-paragraph input", () => {
    const paragraphs = splitPlainBlocks("第一段\n第二段");

    expect(paragraphs.map(textOf)).toEqual(["第一段", "第二段"]);
  });
});
