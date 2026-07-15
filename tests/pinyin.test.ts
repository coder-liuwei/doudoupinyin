import { describe, expect, it } from "vitest";
import { buildDualParagraphs, splitPlainBlocks } from "@/lib/split";

function readings(text: string): Array<string | null> {
  return splitPlainBlocks(text)[0].map((pair) => pair.py);
}

describe("整段拼音生成", () => {
  it("使用完整词典和上下文判断连续多音字", () => {
    expect(readings("银行行长")).toEqual(["yín", "háng", "háng", "zhǎng"]);
    expect(readings("长大以后还念着家乡")).toEqual([
      "zhǎng",
      "dà",
      "yǐ",
      "hòu",
      "hái",
      "niàn",
      "zhe",
      "jiā",
      "xiāng",
    ]);
    expect(readings("睡着了")).toEqual(["shuì", "zháo", "le"]);
    expect(readings("一行白鹭上青天")).toEqual([
      "yī",
      "háng",
      "bái",
      "lù",
      "shàng",
      "qīng",
      "tiān",
    ]);
  });

  it("让项目词组和结构助词补丁覆盖通用词典", () => {
    expect(readings("走得很快")).toEqual(["zǒu", "de", "hěn", "kuài"]);
    expect(readings("依依不舍地离开")).toEqual([
      "yī",
      "yī",
      "bù",
      "shě",
      "de",
      "lí",
      "kāi",
    ]);
    expect(readings("认真地学习")).toEqual(["rèn", "zhēn", "de", "xué", "xí"]);
    expect(readings("舍不得舍不得地走")).toEqual([
      "shě",
      "bù",
      "de",
      "shě",
      "bù",
      "de",
      "de",
      "zǒu",
    ]);
  });

  it("保持混合字符的顺序并且只给汉字注音", () => {
    const text = "A行1，😀Ｂ《好》";
    const pairs = splitPlainBlocks(text)[0];

    expect(pairs.map((pair) => pair.ch).join("")).toBe(text);
    expect(pairs.map((pair) => pair.py)).toEqual([
      null,
      "xíng",
      null,
      null,
      null,
      null,
      null,
      "hǎo",
      null,
    ]);
  });

  it("双行模式严格保留用户提供的拼音", () => {
    const paragraphs = buildDualParagraphs("xìn cháng de\n行 长 得");

    expect(paragraphs[0].map((pair) => pair.py)).toEqual(["xìn", "cháng", "de"]);
    expect(paragraphs[0].map((pair) => pair.pySource)).toEqual(["dual", "dual", "dual"]);
  });

  it("为孤立多音字使用项目单字兜底", () => {
    expect(["行", "长", "得", "地", "着", "了"].map((ch) => readings(ch)[0])).toEqual([
      "xíng",
      "cháng",
      "de",
      "de",
      "zhe",
      "le",
    ]);
  });

  it("处理 CRLF、空行和重复词组时不发生字符错位", () => {
    const source = "银行行长\r\n\r\n舍不得地舍不得";
    const paragraphs = splitPlainBlocks(source);

    expect(paragraphs.map((paragraph) => paragraph.map((pair) => pair.ch).join(""))).toEqual([
      "银行行长",
      "舍不得地舍不得",
    ]);
    expect(paragraphs.flat().every((pair) => pair.isPunct === (pair.py === null))).toBe(true);
  });
});
