/**
 * 渲染层 snapshot 测试。
 *
 * 覆盖：
 *  1. 单行 ruby 结构（白骨精想吃唐僧肉）
 *  2. 整篇 SAMPLE_BAIGUJING（8 段）
 *  3. 标点不带 ruby（hidden rt 行为）
 *
 * 用 react-test-renderer 把 JSX 序列化为纯 JSON 树，再用 vitest 的
 * toMatchSnapshot 锁定节点结构。
 */
import { describe, it, expect } from "vitest";
import TestRenderer from "react-test-renderer";
import { renderParagraphs } from "@/lib/render";
import { SAMPLE_BAIGUJING } from "@/lib/samples";
import { normalizeInput } from "@/lib/normalize";
import { splitPlainBlocks } from "@/lib/split";
import { pinyinOf } from "@/lib/pinyin";
import { applyTable, loadTable } from "@/lib/polyphone";
import { fixParticles } from "@/lib/particles";
import type { Paragraph } from "@/lib/types";

/** 把一段纯汉字文本构造成 Pair[]（与 lib/split.ts 行为一致）。 */
function buildPairs(text: string): Paragraph {
  const pairs: Paragraph = [];
  for (const ch of text) {
    if (ch === "\n" || ch === "\r") continue;
    if (/[\u4e00-\u9fff]/.test(ch)) {
      pairs.push({ ch, py: pinyinOf(ch), isPunct: false });
    } else {
      pairs.push({ ch, py: null, isPunct: true });
    }
  }
  return pairs;
}

/** 把多段纯文本（以空行分隔）转成 Paragraph[]。 */
function buildParagraphs(text: string): Paragraph[] {
  const normalized = normalizeInput(text);
  const blocks = splitPlainBlocks(normalized);
  return blocks.map((b) => buildPairs(b.join("")));
}

describe("render — ruby structure", () => {
  it("renders 白骨精想吃唐僧肉 with ruby + rt", () => {
    const text = "白骨精想吃唐僧肉";
    const paragraphs = buildParagraphs(text);
    const allPairs = paragraphs.flat();
    applyTable(allPairs, text, loadTable());
    fixParticles(allPairs);

    const tree = TestRenderer.create(
      <div>{renderParagraphs(paragraphs)}</div>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("renders the full SAMPLE_BAIGUJING (8 paragraphs) and matches snapshot", () => {
    const paragraphs = buildParagraphs(SAMPLE_BAIGUJING);
    expect(paragraphs).toHaveLength(8);

    const allPairs = paragraphs.flat();
    applyTable(allPairs, SAMPLE_BAIGUJING, loadTable());
    fixParticles(allPairs);

    const tree = TestRenderer.create(
      <div>{renderParagraphs(paragraphs)}</div>,
    ).toJSON();
    expect(tree).toMatchSnapshot();

    // 结构性断言：顶层 div 下应有 8 个 <p class="line">
    expect(tree).not.toBeNull();
    const root = tree as { children?: unknown[] };
    expect(Array.isArray(root.children)).toBe(true);
    expect(root.children).toHaveLength(8);
  });

  it("renders punctuation as ruby with a hidden blank rt", () => {
    const paragraph: Paragraph = [
      { ch: "你", py: "nǐ", isPunct: false },
      { ch: "，", py: null, isPunct: true },
      { ch: "好", py: "hǎo", isPunct: false },
    ];

    const tree = TestRenderer.create(
      <div>{renderParagraphs([paragraph])}</div>,
    ).toJSON();
    expect(tree).toMatchSnapshot();

    // 标点 span 的 className 应包含 "punct"，且用空 rt 补齐 ruby 高度
    const root = tree as {
      children: Array<{
        type: string;
        children: Array<{
          type: string;
          props: { className?: string };
          children?: Array<{ type: string }>;
        }>;
      }>;
    };
    const p = root.children[0];
    const units = p.children;
    expect(units).toHaveLength(3);
    // 第一个：你 → ruby
    expect(units[0].type).toBe("span");
    expect(units[0].props.className).toBe("unit");
    expect(units[0].children?.[0].type).toBe("ruby");
    // 第二个：， → punct span（ruby + 空白 rt）
    expect(units[1].type).toBe("span");
    expect(units[1].props.className).toBe("unit punct");
    expect(units[1].children?.[0].type).toBe("ruby");
    const punctRuby = units[1].children?.[0] as {
      children: Array<{
        type: string;
        props?: { "aria-hidden"?: string };
        children?: string[];
      }>;
    };
    expect(punctRuby.children[0].children).toEqual(["，"]);
    expect(punctRuby.children[1].type).toBe("rt");
    expect(punctRuby.children[1].props?.["aria-hidden"]).toBe("true");
    // 第三个：好 → ruby
    expect(units[2].type).toBe("span");
    expect(units[2].props.className).toBe("unit");
    expect(units[2].children?.[0].type).toBe("ruby");
  });

  it("groups latin letters and digits into plain text units", () => {
    const paragraph: Paragraph = [
      { ch: "A", py: null, isPunct: true },
      { ch: "I", py: null, isPunct: true },
      { ch: " ", py: null, isPunct: true },
      { ch: "2", py: null, isPunct: true },
      { ch: "0", py: null, isPunct: true },
      { ch: "2", py: null, isPunct: true },
      { ch: "1", py: null, isPunct: true },
    ];

    const tree = TestRenderer.create(
      <div>{renderParagraphs([paragraph])}</div>,
    ).toJSON();

    const root = tree as {
      children: Array<{
        type: string;
        props?: { className?: string };
        children?: Array<unknown>;
      }>;
    };

    const p = root.children[0];
    expect(p.children?.[0]).toMatchObject({ type: "span" });
    const firstLatin = p.children?.[0] as {
      props?: { className?: string };
      children?: Array<{ type: string; children?: Array<{ children?: string[] }> }>;
    };
    expect(firstLatin.props?.className).toBe("unit latin");
    expect(firstLatin.children?.[0].type).toBe("ruby");
    expect(firstLatin.children?.[0].children?.[0].children).toEqual(["AI"]);

    const secondLatin = p.children?.[2] as {
      props?: { className?: string };
      children?: Array<{ type: string; children?: Array<{ children?: string[] }> }>;
    };
    expect(secondLatin.props?.className).toBe("unit latin");
    expect(secondLatin.children?.[0].type).toBe("ruby");
    expect(secondLatin.children?.[0].children?.[0].children).toEqual(["2021"]);
  });

  it("renders 8 <p class='line'> nodes in the right order for the sample", () => {
    const paragraphs = buildParagraphs(SAMPLE_BAIGUJING);
    const allPairs = paragraphs.flat();
    applyTable(allPairs, SAMPLE_BAIGUJING, loadTable());
    fixParticles(allPairs);

    const tree = TestRenderer.create(
      <div>{renderParagraphs(paragraphs)}</div>,
    ).toJSON();

    const root = tree as { children: Array<{ type: string; props: { className?: string } }> };
    expect(root.children).toHaveLength(8);
    for (const child of root.children) {
      expect(child.type).toBe("p");
      expect(child.props.className).toBe("line");
    }
  });
});
