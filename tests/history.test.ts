/**
 * localStorage 历史持久化 + v1 → v2 迁移测试。
 *
 * 覆盖：
 *  - v1 数据自动迁移到 v2（保留 v1 key，生成 v2 key）
 *  - 缺数据时返回空 schema
 *  - v2 权威优先（有 v2 即不再迁移）
 *  - saveRecord 上限 40 + 新记录置顶
 *  - saveRecord 同 id 替换
 *  - deleteRecord / clearHistory
 *
 * 注意点：Node 22+ 在 globalThis 上挂了一个空壳 localStorage（需要
 * --localstorage-file 才能用），它把 jsdom 的 localStorage 遮罩了。需要在
 * beforeEach 里手动删掉 Node 那个、并把 jsdom 的实例挂到 window 上。
 */
import { describe, it, expect, beforeEach } from "vitest";
// jsdom 没装 @types/jsdom；项目不引新依赖，这里用 require 拿值 + 显式 any 类型。
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
// @ts-ignore -- jsdom has no type declarations in this project
import { JSDOM } from "jsdom";
import {
  loadHistory,
  saveRecord,
  deleteRecord,
  clearHistory,
  MAX_HISTORY,
  type HistorySchema,
} from "@/lib/history";
import type { HistoryRecord } from "@/lib/types";

const V1_KEY = "pinyinPrince.v1.history";
const V2_KEY = "pinyinPrince.v2.history";

const samplePair = { ch: "你", py: "nǐ", isPunct: false } as const;

function makeRecord(id: string, ts: number, title: string): HistoryRecord {
  return {
    id,
    ts,
    title,
    mode: "plain",
    sourceRaw: "你好",
    paragraphs: [[{ ...samplePair, ch: "好", py: "hǎo" }]],
  };
}

beforeEach(() => {
  // 1. 抹掉 Node 22+ 在 globalThis 上挂的空壳 localStorage。
  delete (globalThis as { localStorage?: unknown }).localStorage;
  delete (window as { localStorage?: unknown }).localStorage;
  // 2. 单独建一个 jsdom 实例，把它真实的 localStorage 挂回 window。
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  Object.defineProperty(window, "localStorage", {
    value: dom.window.localStorage,
    configurable: true,
    writable: true,
  });
  // 3. lib/history.ts 用的是「localStorage」裸引用（不是 window.localStorage），
  //    在模块作用域里就是 globalThis.localStorage —— 把同一个实例挂回去。
  Object.defineProperty(globalThis, "localStorage", {
    value: dom.window.localStorage,
    configurable: true,
    writable: true,
  });
});

describe("history v1 → v2 migration", () => {
  it("migrates v1 array to v2 schema (v1 key preserved, v2 key written)", () => {
    const v1: HistoryRecord[] = [
      makeRecord("r1", 1000, "测试 A"),
      makeRecord("r2", 2000, "测试 B"),
    ];
    localStorage.setItem(V1_KEY, JSON.stringify(v1));

    const schema = loadHistory();
    expect(schema.schemaVersion).toBe(2);
    expect(schema.records).toHaveLength(2);
    expect(schema.records[0].id).toBe("r1");
    expect(schema.records[1].id).toBe("r2");

    // v1 key 保留（不回滚）
    expect(localStorage.getItem(V1_KEY)).not.toBeNull();
    // v2 key 已写
    expect(localStorage.getItem(V2_KEY)).not.toBeNull();

    // 写入的 v2 内容是合法 schema
    const stored = JSON.parse(localStorage.getItem(V2_KEY)!);
    expect(stored.schemaVersion).toBe(2);
    expect(Array.isArray(stored.records)).toBe(true);
  });

  it("returns empty schema when no data exists at all", () => {
    const schema = loadHistory();
    expect(schema.schemaVersion).toBe(2);
    expect(schema.records).toEqual([]);
    // 此时 v2 key 仍未写（loadHistory 只在迁移时写）
    // 取决于实现：若 v1/v2 都没有，不写 v2
    // 这里只断言返回值正确即可
  });

  it("prefers v2 schema when both v1 and v2 exist (v2 is authoritative)", () => {
    const v1: HistoryRecord[] = [makeRecord("fromV1", 1, "old")];
    const v2: HistorySchema = {
      schemaVersion: 2,
      records: [makeRecord("fromV2", 2, "new")],
    };
    localStorage.setItem(V1_KEY, JSON.stringify(v1));
    localStorage.setItem(V2_KEY, JSON.stringify(v2));

    const schema = loadHistory();
    expect(schema.records).toHaveLength(1);
    expect(schema.records[0].id).toBe("fromV2");
  });

  it("returns empty schema when v1 contains invalid JSON (graceful)", () => {
    localStorage.setItem(V1_KEY, "{not json}");
    const schema = loadHistory();
    expect(schema.records).toEqual([]);
  });
});

describe("history save / replace / cap", () => {
  it("caps records at MAX_HISTORY (40) and prepends newest", () => {
    const total = MAX_HISTORY + 10;
    for (let i = 0; i < total; i++) {
      saveRecord(makeRecord(`r${i}`, i, `T${i}`));
    }
    const schema = loadHistory();
    expect(schema.records).toHaveLength(MAX_HISTORY);
    // 最新插入的应该在最前
    expect(schema.records[0].id).toBe(`r${total - 1}`);
    // 最旧的超出部分被截断
    expect(schema.records[MAX_HISTORY - 1].id).toBe(`r${total - MAX_HISTORY}`);
  });

  it("replaces record with same id and keeps it at the top", () => {
    saveRecord(makeRecord("a", 1, "A-v1"));
    saveRecord(makeRecord("b", 2, "B"));
    saveRecord(makeRecord("a", 99, "A-v2")); // 同 id 替换

    const schema = loadHistory();
    expect(schema.records).toHaveLength(2);
    expect(schema.records[0].id).toBe("a");
    expect(schema.records[0].ts).toBe(99);
    expect(schema.records[0].title).toBe("A-v2");
    expect(schema.records[1].id).toBe("b");
  });

  it("persists records across loadHistory calls", () => {
    saveRecord(makeRecord("persist-1", 1, "X"));
    const schema1 = loadHistory();
    expect(schema1.records).toHaveLength(1);

    // 再读一次（不走 saveRecord），应该看到上次写入的内容
    const schema2 = loadHistory();
    expect(schema2.records).toHaveLength(1);
    expect(schema2.records[0].id).toBe("persist-1");
  });
});

describe("history delete / clear", () => {
  it("deletes a record by id", () => {
    saveRecord(makeRecord("a", 1, "A"));
    saveRecord(makeRecord("b", 2, "B"));
    saveRecord(makeRecord("c", 3, "C"));

    deleteRecord("b");
    const schema = loadHistory();
    expect(schema.records).toHaveLength(2);
    expect(schema.records.map((r) => r.id)).toEqual(["c", "a"]);
  });

  it("clearHistory empties v2 but leaves v1 untouched", () => {
    const v1: HistoryRecord[] = [makeRecord("legacy", 0, "旧")];
    localStorage.setItem(V1_KEY, JSON.stringify(v1));
    saveRecord(makeRecord("fresh", 1, "新"));

    clearHistory();
    const schema = loadHistory();
    // v2 已清空
    expect(schema.records).toEqual([]);
    // v1 仍在（不清）
    expect(localStorage.getItem(V1_KEY)).not.toBeNull();
  });

  it("clearHistory on empty store still returns empty schema", () => {
    const schema = clearHistory();
    expect(schema.schemaVersion).toBe(2);
    expect(schema.records).toEqual([]);
  });
});
