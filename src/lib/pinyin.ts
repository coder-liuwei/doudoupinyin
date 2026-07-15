import CompleteDict from "@pinyin-pro/data/complete";
import {
  addDict,
  customPinyin,
  OutputFormat,
  pinyin,
  segment,
} from "pinyin-pro";
import { loadTable, projectPinyinMap } from "./polyphone";
import type { Pair } from "./types";

const PINYIN_OPTIONS = {
  toneType: "symbol" as const,
  nonZh: "spaced" as const,
  segmentit: 2 as const,
  toneSandhi: false,
};

export interface PinyinTextUnit {
  ch: string;
  py: string | null;
  candidates: string[];
  isZh: boolean;
}

let initialized = false;

/** 注册完整词典和项目词组。重复调用不会再次修改 pinyin-pro 全局词典。 */
export function initializePinyinEngine(): void {
  if (initialized) return;
  const table = loadTable();
  addDict(CompleteDict, { name: "doudoupinyin-complete" });
  const customEntries = Object.entries(projectPinyinMap(table)).filter(([word, py]) => {
    const enginePy = pinyin(word, { ...PINYIN_OPTIONS, type: "array" }).join(" ");
    return enginePy !== py;
  });
  if (customEntries.length > 0) {
    customPinyin(Object.fromEntries(customEntries), {
      multiple: "add",
      polyphonic: "add",
    });
  }
  initialized = true;
}

/** 整段获取上下文读音和候选读音，并严格校验结果与原字符对齐。 */
export function analyzePinyinText(text: string): PinyinTextUnit[] {
  initializePinyinEngine();
  const chars = Array.from(text);
  const result = pinyin(text, { ...PINYIN_OPTIONS, type: "all" });

  if (result.length !== chars.length) {
    throw new Error(`拼音结果未对齐：输入 ${chars.length} 字符，返回 ${result.length} 项`);
  }

  const table = loadTable();
  const isSingleHan = chars.length === 1 && result[0]?.isZh;

  return result.map((item, index) => {
    const ch = chars[index];
    if (item.origin !== ch) {
      throw new Error(`拼音结果未对齐：位置 ${index} 期望「${ch}」，实际「${item.origin}」`);
    }
    if (!item.isZh) {
      return { ch, py: null, candidates: [], isZh: false };
    }

    const fallback = table.defaults[ch];
    const py = (!item.pinyin || isSingleHan) && fallback ? fallback : item.pinyin;
    return {
      ch,
      py: py || null,
      candidates: item.polyphonic,
      isZh: true,
    };
  });
}

/** 整段生成现有 Pair[] 契约。 */
export function pinyinPairs(text: string): Pair[] {
  return analyzePinyinText(text).map((item) =>
    item.isZh
      ? { ch: item.ch, py: item.py, isPunct: false, pySource: "auto" }
      : { ch: item.ch, py: null, isPunct: true },
  );
}

/** 返回 pinyin-pro 的上下文分词边界。 */
export function segmentPinyinText(text: string): string[] {
  initializePinyinEngine();
  return segment(text, {
    ...PINYIN_OPTIONS,
    format: OutputFormat.ZhSegment,
  });
}

/** 保留单字 API，供现有调用和单字兜底使用。 */
export function pinyinOf(ch: string): string | null {
  if (Array.from(ch).length !== 1) return null;
  return analyzePinyinText(ch)[0]?.py ?? null;
}
