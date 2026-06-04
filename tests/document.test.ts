import { describe, expect, it } from "vitest";
import { countAnnotatedChars, deriveTitleFromInput } from "@/lib/document";
import type { Paragraph } from "@/lib/types";

describe("document helpers", () => {
  it("derives a short readable title from the first Chinese text", () => {
    expect(
      deriveTitleFromInput("  \n《小马过河》\n\n小马驮起口袋，飞快地往磨坊跑去。"),
    ).toBe("小马过河小马驮起口袋飞快地往");
  });

  it("falls back to 未命名 when input has no readable text", () => {
    expect(deriveTitleFromInput(" \n\t  ")).toBe("未命名");
  });

  it("counts annotated CJK characters and ignores punctuation", () => {
    const paragraphs: Paragraph[] = [
      [
        { ch: "你", py: "nǐ", isPunct: false },
        { ch: "，", py: null, isPunct: true },
        { ch: "好", py: "hǎo", isPunct: false },
      ],
      [{ ch: "！", py: null, isPunct: true }],
    ];

    expect(countAnnotatedChars(paragraphs)).toBe(2);
  });
});
