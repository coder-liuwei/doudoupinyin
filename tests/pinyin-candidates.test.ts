import { describe, expect, it } from "vitest";
import { getPairPinyinCandidates } from "@/lib/pinyin-candidates";
import type { Paragraph } from "@/lib/types";

describe("getPairPinyinCandidates", () => {
  it("返回多音字候选并保留当前上下文读音", () => {
    const paragraph: Paragraph = [
      { ch: "银", py: "yín", isPunct: false, pySource: "auto" },
      { ch: "行", py: "háng", isPunct: false, pySource: "auto" },
    ];

    const result = getPairPinyinCandidates(paragraph, 1);

    expect(result[0]).toBe("háng");
    expect(result).toContain("xíng");
    expect(new Set(result).size).toBe(result.length);
  });

  it("单音字只返回当前读音", () => {
    const paragraph: Paragraph = [
      { ch: "你", py: "nǐ", isPunct: false, pySource: "auto" },
    ];

    expect(getPairPinyinCandidates(paragraph, 0)).toEqual(["nǐ"]);
  });

  it("标点、无拼音和越界位置不返回候选", () => {
    const paragraph: Paragraph = [
      { ch: "，", py: null, isPunct: true },
    ];

    expect(getPairPinyinCandidates(paragraph, 0)).toEqual([]);
    expect(getPairPinyinCandidates(paragraph, 1)).toEqual([]);
  });
});
