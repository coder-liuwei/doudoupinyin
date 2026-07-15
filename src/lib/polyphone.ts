import * as yaml from "js-yaml";
import polyphoneYaml from "@/data/polyphone.yaml?raw";

export interface PolyphoneOverride {
  pattern: string;
  pinyin: string[];
}

export interface PolyphoneTable {
  defaults: Record<string, string>;
  overrides: PolyphoneOverride[];
  skips: Set<string>;
}

let table: PolyphoneTable | null = null;

/** 读取并校验编译进 bundle 的项目拼音规则。 */
export function loadTable(): PolyphoneTable {
  if (table) return table;
  const raw = (yaml.load(polyphoneYaml) ?? {}) as {
    defaults?: Record<string, unknown>;
    overrides?: Array<{ pattern?: unknown; pinyin?: unknown }>;
    skips?: unknown[];
  };

  const defaults: Record<string, string> = {};
  if (raw.defaults && typeof raw.defaults === "object") {
    for (const [ch, py] of Object.entries(raw.defaults)) {
      if (!ch.startsWith("_") && typeof py === "string") defaults[ch] = py;
    }
  }

  const overrides: PolyphoneOverride[] = [];
  if (Array.isArray(raw.overrides)) {
    for (const item of raw.overrides) {
      if (!item || typeof item.pattern !== "string" || !Array.isArray(item.pinyin)) continue;
      if (!item.pinyin.every((py) => typeof py === "string")) continue;
      if (Array.from(item.pattern).length !== item.pinyin.length) continue;
      overrides.push({ pattern: item.pattern, pinyin: item.pinyin as string[] });
    }
  }

  const skips = new Set(
    Array.isArray(raw.skips)
      ? raw.skips.filter((item): item is string => typeof item === "string")
      : [],
  );

  const next = { defaults, overrides, skips };
  projectPinyinMap(next);
  table = next;
  return next;
}

/**
 * 把项目词组转换为 pinyin-pro customPinyin 所需映射。
 * 重叠前缀合法；同一词组若声明了不同拼音则直接报配置错误。
 */
export function projectPinyinMap(source: PolyphoneTable = loadTable()): Record<string, string> {
  const collected = new Map<string, string>();
  for (const override of source.overrides) {
    const py = override.pinyin.join(" ");
    const previous = collected.get(override.pattern);
    if (previous && previous !== py) {
      throw new Error(`多音字配置冲突：「${override.pattern}」同时配置为 ${previous} 和 ${py}`);
    }
    collected.set(override.pattern, py);
  }

  return Object.fromEntries(
    [...collected.entries()].sort((a, b) => Array.from(b[0]).length - Array.from(a[0]).length),
  );
}
