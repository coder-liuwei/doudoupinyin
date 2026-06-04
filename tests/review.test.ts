import { describe, expect, it } from "vitest";
import { buildDualParagraphs, splitPlainBlocks } from "@/lib/split";
import { countBySource, countReviewRisks, isReviewRisk } from "@/lib/review";
import type { Paragraph } from "@/lib/types";

describe("pinyin source and review helpers", () => {
  it("marks plain generated CJK pairs as auto", () => {
    const paragraphs = splitPlainBlocks("银行");

    expect(paragraphs[0][0].pySource).toBe("auto");
    expect(paragraphs[0][1].pySource).toBe("auto");
  });

  it("marks dual-line pinyin as user input", () => {
    const paragraphs = buildDualParagraphs("yín háng\n银 行");

    expect(paragraphs[0].map((pair) => pair.pySource)).toEqual(["dual", "dual"]);
    expect(countBySource(paragraphs, "dual")).toBe(2);
  });

  it("counts review risks and ignores manually corrected pinyin", () => {
    const paragraphs: Paragraph[] = [[
      { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      { ch: "长", py: "zhǎng", isPunct: false, pySource: "manual" },
      { ch: "。", py: null, isPunct: true },
    ]];

    expect(isReviewRisk(paragraphs[0][0])).toBe(true);
    expect(isReviewRisk(paragraphs[0][1])).toBe(false);
    expect(countReviewRisks(paragraphs)).toBe(1);
    expect(countBySource(paragraphs, "manual")).toBe(1);
  });
});
