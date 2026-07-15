import { describe, expect, it } from "vitest";
import { buildDualParagraphs, splitPlainBlocks } from "@/lib/split";
import { countBySource, countReviewRisks } from "@/lib/review";
import type { Paragraph } from "@/lib/types";

describe("上下文风险分析", () => {
  it("已被完整词典按词解析的多音字不标红，孤立多音字标红", () => {
    expect(countReviewRisks(splitPlainBlocks("银行"))).toBe(0);
    expect(countReviewRisks(splitPlainBlocks("行"))).toBe(1);
    expect(countReviewRisks(splitPlainBlocks("长"))).toBe(1);
  });

  it("项目确认词组不标红，未确认的结构助词补丁仍标红", () => {
    expect(countReviewRisks(splitPlainBlocks("认真地学习"))).toBe(0);
    expect(countReviewRisks(splitPlainBlocks("依依不舍地离开"))).toBe(0);
    expect(countReviewRisks(splitPlainBlocks("走得很快"))).toBe(1);
  });

  it("双行内容不被改写，但明显错误的候选读音标红", () => {
    const valid = buildDualParagraphs("yín háng\n银 行");
    const invalid = buildDualParagraphs("yín xìn\n银 行");

    expect(valid[0].map((pair) => pair.py)).toEqual(["yín", "háng"]);
    expect(countReviewRisks(valid)).toBe(0);
    expect(invalid[0].map((pair) => pair.py)).toEqual(["yín", "xìn"]);
    expect(countReviewRisks(invalid)).toBe(1);
    expect(countBySource(invalid, "dual")).toBe(2);
  });

  it("人工确认、标点和无拼音单元不标红", () => {
    const paragraphs: Paragraph[] = [[
      { ch: "行", py: "xíng", isPunct: false, pySource: "manual" },
      { ch: "。", py: null, isPunct: true },
      { ch: "A", py: null, isPunct: true },
    ]];

    expect(countReviewRisks(paragraphs)).toBe(0);
    expect(countBySource(paragraphs, "manual")).toBe(1);
  });

  it("万字级重复文本保持对齐且无明显平方级退化", () => {
    const text = "舍不得地".repeat(2000);
    const startedAt = performance.now();
    const paragraphs = splitPlainBlocks(text);
    const riskCount = countReviewRisks(paragraphs);
    const elapsed = performance.now() - startedAt;

    expect(paragraphs[0].map((pair) => pair.ch).join("")).toBe(text);
    expect(riskCount).toBe(0);
    expect(elapsed).toBeLessThan(5000);
  }, 10_000);
});
