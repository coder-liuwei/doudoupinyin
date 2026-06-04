/**
 * 多音字词表加载与应用。
 *
 * 来源：pinyin_prince/polyphone.py:166-228 apply_table
 *
 * 数据：src/data/polyphone.yaml（git mv 自 data/polyphone.yaml，Vite ?raw 引入）
 * 结构：
 *   defaults:  { "行": "xíng", ... }     # 单字兜底
 *   overrides: [{ pattern, pinyin }, ...] # 词组级（pattern.length === pinyin.length）
 *   skips:     ["·", "——", ...]          # 跳过的字符（标点等）
 *
 * 算法（严格 1:1 翻译自 Python 端）：
 *   1. 扫所有 overrides 在 text 中的命中位置
 *   2. 按 (start, end) 排序；冲突（区间重叠）→ 抛 Error
 *   3. 命中区间：pairs[i] = (ch, ov.pinyin[k])
 *   4. skips 字符：pairs[i] = (ch, null)
 *   5. CJK + defaults 命中：pairs[i] = (ch, defaults[ch])
 *   6. 空白字符：跳过（text_to_pair 映射为 None）
 */

// 注：项目 tsconfig 未开 esModuleInterop，必须用 namespace import。
import * as yaml from "js-yaml";
import polyphoneYaml from "@/data/polyphone.yaml?raw";
import type { Pair } from "./types";

export interface PolyphoneOverride {
  pattern: string;
  pinyin: string[];
}

export interface PolyphoneTable {
  defaults: Record<string, string>;
  overrides: PolyphoneOverride[];
  skips: Set<string>;
}

const CJK_RE = /[\u4e00-\u9fff]/;
const WHITESPACE_RE = /\s/;

function isCjk(ch: string): boolean {
  return CJK_RE.test(ch);
}

let _table: PolyphoneTable | null = null;

/** 读 YAML，返回单例 PolyphoneTable。 */
export function loadTable(): PolyphoneTable {
  if (_table) return _table;
  const raw = (yaml.load(polyphoneYaml) ?? {}) as {
    defaults?: Record<string, unknown>;
    overrides?: Array<{ pattern?: unknown; pinyin?: unknown }>;
    skips?: unknown[];
  };

  const defaults: Record<string, string> = {};
  if (raw.defaults && typeof raw.defaults === "object") {
    for (const [k, v] of Object.entries(raw.defaults)) {
      if (typeof k === "string" && !k.startsWith("_") && typeof v === "string") {
        defaults[k] = v;
      }
    }
  }

  const overrides: PolyphoneOverride[] = [];
  if (Array.isArray(raw.overrides)) {
    for (const item of raw.overrides) {
      if (
        item &&
        typeof item.pattern === "string" &&
        Array.isArray(item.pinyin) &&
        item.pinyin.every((p) => typeof p === "string") &&
        item.pattern.length === item.pinyin.length
      ) {
        overrides.push({ pattern: item.pattern, pinyin: item.pinyin as string[] });
      }
    }
  }

  const skips = new Set<string>();
  if (Array.isArray(raw.skips)) {
    for (const s of raw.skips) {
      if (typeof s === "string") skips.add(s);
    }
  }

  _table = { defaults, overrides, skips };
  return _table;
}

/** 把 text 的每个字符位置映射到 pairs 索引（空白处为 null）。 */
function buildTextToPairIndex(text: string, pairs: Pair[]): (number | null)[] {
  const mapping: (number | null)[] = new Array(text.length).fill(null);
  let pi = 0;
  for (let j = 0; j < text.length; j++) {
    if (WHITESPACE_RE.test(text[j])) continue;
    if (pi < pairs.length) {
      mapping[j] = pi;
      pi++;
    }
  }
  return mapping;
}

/**
 * 把多音字词表应用到逐字 pairs 上（in-place）。
 *
 * 区间冲突（不同 override 在同一文本位置重叠）→ 抛 Error。
 * 命中区间内：从 ov.pinyin 取对应读音覆盖 pairs[i].
 * 未命中但 CJK：先看 table.defaults[ch]，否则保留 pairs[i] 原值。
 * table.skips 中字符：pairs[i] = (ch, null, isPunct: true).
 */
export function applyTable(
  pairs: Pair[],
  text: string,
  table?: PolyphoneTable,
): void {
  const t = table ?? loadTable();
  const textToPair = buildTextToPairIndex(text, pairs);

  interface Interval {
    ov: PolyphoneOverride;
    start: number;
    end: number;
  }
  const intervals: Interval[] = [];
  for (const ov of t.overrides) {
    let start = 0;
    while (true) {
      const idx = text.indexOf(ov.pattern, start);
      if (idx === -1) break;
      intervals.push({ ov, start: idx, end: idx + ov.pattern.length });
      start = idx + 1;
    }
  }

  intervals.sort((a, b) => a.start - b.start || a.end - b.end);

  for (let i = 1; i < intervals.length; i++) {
    const prev = intervals[i - 1];
    const cur = intervals[i];
    if (cur.start < prev.end) {
      throw new Error(
        `多音字 override 区间冲突: '${prev.ov.pattern}' 与 '${cur.ov.pattern}' 在位置 ${cur.start}`,
      );
    }
  }

  const overrideAt: Record<number, string> = {};
  for (const { ov, start, end } of intervals) {
    for (let k = 0; k < end - start; k++) {
      overrideAt[start + k] = ov.pinyin[k];
    }
  }

  for (let j = 0; j < text.length; j++) {
    const pi = textToPair[j];
    if (pi === null) continue;
    const ch = text[j];
    if (t.skips.has(ch)) {
      Object.assign(pairs[pi], { ch, py: null, isPunct: true });
    } else if (j in overrideAt) {
      Object.assign(pairs[pi], { ch, py: overrideAt[j], isPunct: false });
    } else if (isCjk(ch) && ch in t.defaults) {
      Object.assign(pairs[pi], { ch, py: t.defaults[ch], isPunct: false });
    }
  }
}
