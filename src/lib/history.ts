/**
 * localStorage 历史持久化 + v1 → v2 迁移。
 *
 * v1（来自旧 pinyin-prince.html）：键 `pinyinPrince.v1.history`，裸 HistoryRecord[]。
 * v2（本 React 版）：键 `pinyinPrince.v2.history`，包成 HistorySchema 对象，
 *   留出 schemaVersion 字段，便于未来再升级。
 *
 * 迁移策略：
 * 1. 先读 v2：有则直接返回（v2 是权威源）。
 * 2. 没 v2 但有 v1：把 v1 的裸数组包成 HistorySchema，写入 v2。
 *    v1 key 保留只读，不回滚（用户清缓存后即便 v1 没了，v2 仍可继续）。
 * 3. 都没有：返回空 schema。
 */
import type { HistoryRecord } from "@/lib/types";

const V1_KEY = "pinyinPrince.v1.history";
const V2_KEY = "pinyinPrince.v2.history";
export const MAX_HISTORY = 40;

export interface HistorySchema {
  schemaVersion: 2;
  records: HistoryRecord[];
}

function isRecordArray(x: unknown): x is HistoryRecord[] {
  return Array.isArray(x);
}

function readV1Records(): HistoryRecord[] | null {
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (!raw) return null;
    const j: unknown = JSON.parse(raw);
    return isRecordArray(j) ? j : null;
  } catch {
    return null;
  }
}

function readV2Schema(): HistorySchema | null {
  try {
    const raw = localStorage.getItem(V2_KEY);
    if (!raw) return null;
    const j: unknown = JSON.parse(raw);
    if (
      j &&
      typeof j === "object" &&
      (j as { schemaVersion?: unknown }).schemaVersion === 2 &&
      isRecordArray((j as { records?: unknown }).records)
    ) {
      return j as HistorySchema;
    }
    return null;
  } catch {
    return null;
  }
}

function writeV2Schema(s: HistorySchema): void {
  try {
    localStorage.setItem(V2_KEY, JSON.stringify(s));
  } catch (e) {
    throw new Error(
      "无法写入浏览器存储（可能已满或隐私模式）：" +
        ((e as Error).message || String(e)),
    );
  }
}

/** 读取历史（含自动迁移）。失败时返回空 schema，不抛。 */
export function loadHistory(): HistorySchema {
  const v2 = readV2Schema();
  if (v2) return v2;

  const v1 = readV1Records();
  if (v1) {
    const migrated: HistorySchema = { schemaVersion: 2, records: v1 };
    try {
      writeV2Schema(migrated);
    } catch {
      // 迁移写失败仍返回（只读视图）
    }
    return migrated;
  }
  return { schemaVersion: 2, records: [] };
}

/** 保存/覆盖一条记录：同 id 替换，新记录置顶；超过 MAX_HISTORY 截断。 */
export function saveRecord(rec: HistoryRecord): HistorySchema {
  const cur = loadHistory();
  const filtered = cur.records.filter((r) => r.id !== rec.id);
  filtered.unshift(rec);
  const next: HistorySchema = {
    schemaVersion: 2,
    records: filtered.slice(0, MAX_HISTORY),
  };
  writeV2Schema(next);
  return next;
}

export function deleteRecord(id: string): HistorySchema {
  const cur = loadHistory();
  const next: HistorySchema = {
    schemaVersion: 2,
    records: cur.records.filter((r) => r.id !== id),
  };
  writeV2Schema(next);
  return next;
}

export function renameRecord(id: string, title: string): HistorySchema {
  const cur = loadHistory();
  const cleanTitle = title.trim() || "未命名";
  const next: HistorySchema = {
    schemaVersion: 2,
    records: cur.records.map((r) =>
      r.id === id ? { ...r, title: cleanTitle } : r,
    ),
  };
  writeV2Schema(next);
  return next;
}

export function clearHistory(): HistorySchema {
  const next: HistorySchema = { schemaVersion: 2, records: [] };
  writeV2Schema(next);
  return next;
}
