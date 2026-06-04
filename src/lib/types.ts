/**
 * 共享类型契约。
 * 任何 agent 引入数据层，必须 import 此处。
 *
 * Pair: 逐字（字 + 拼音 + 是否标点）。非 CJK 字符标点化（py=null, isPunct=true）。
 * Paragraph: 一段（一对句）内的所有 Pair 序列。
 * Mode: 编辑器模式。
 * HistoryRecord: 本地历史快照（v2 schema）。
 */

export interface Pair {
  ch: string;
  py: string | null;
  isPunct: boolean;
  pySource?: "auto" | "dual" | "manual";
}

export type Paragraph = Pair[];

export type Mode = "plain" | "dual";

export interface HistoryRecord {
  id: string;
  ts: number;
  title: string;
  mode: Mode;
  sourceRaw: string;
  paragraphs: Paragraph[];
}
