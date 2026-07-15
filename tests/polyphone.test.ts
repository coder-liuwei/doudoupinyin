import { describe, expect, it } from "vitest";
import { initializePinyinEngine, pinyinOf } from "@/lib/pinyin";
import {
  loadTable,
  projectPinyinMap,
  type PolyphoneTable,
} from "@/lib/polyphone";

function table(overrides: PolyphoneTable["overrides"]): PolyphoneTable {
  return { defaults: {}, overrides, skips: new Set() };
}

describe("项目拼音词表", () => {
  it("加载嵌入式 YAML 并保留单字兜底与词组", () => {
    const loaded = loadTable();

    expect(loaded.defaults["行"]).toBe("xíng");
    expect(loaded.overrides.some((item) => item.pattern === "舍不得地")).toBe(true);
    expect(loaded.skips.has("·")).toBe(true);
  });

  it("允许前缀重叠并把更长词组排在前面", () => {
    const mapping = projectPinyinMap(table([
      { pattern: "舍不得", pinyin: ["shě", "bù", "de"] },
      { pattern: "舍不得地", pinyin: ["shě", "bù", "de", "de"] },
    ]));

    expect(Object.keys(mapping)).toEqual(["舍不得地", "舍不得"]);
  });

  it("同一词组配置不同拼音时直接报错", () => {
    const duplicated = table([
      { pattern: "银行", pinyin: ["yín", "háng"] },
      { pattern: "银行", pinyin: ["yín", "xíng"] },
    ]);

    expect(() => projectPinyinMap(duplicated)).toThrow(/多音字配置冲突.*银行/);
  });

  it("单字输入使用项目 defaults 且引擎初始化幂等", () => {
    initializePinyinEngine();
    const first = pinyinOf("长");
    initializePinyinEngine();

    expect(first).toBe("cháng");
    expect(pinyinOf("长")).toBe(first);
    expect(pinyinOf("A")).toBeNull();
  });
});
