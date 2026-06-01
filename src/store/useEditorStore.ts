/**
 * 编辑器全局状态（Zustand）。
 *
 * 范围：input/mode/paragraphs/fontSize/title/currentId/err
 * 不持有历史列表（历史在 useHistory 里独立管理，避免无谓重渲染）。
 * 也不持有 PDF 抽取状态（临时态，组件内 useState 即可）。
 */
import { create } from "zustand";
import type { Mode, Paragraph } from "@/lib/types";

export interface EditorState {
  input: string;
  mode: Mode;
  paragraphs: Paragraph[];
  fontSize: number;
  title: string;
  currentId: string | null;
  err: string | null;

  setInput: (v: string) => void;
  setMode: (m: Mode) => void;
  setParagraphs: (p: Paragraph[]) => void;
  setFontSize: (n: number) => void;
  setTitle: (s: string) => void;
  setCurrentId: (id: string | null) => void;
  setErr: (e: string | null) => void;
  reset: () => void;
}

// 沿用旧 pinyin-prince.html:69 的默认字号 19
const INITIAL = {
  input: "",
  mode: "plain" as Mode,
  paragraphs: [] as Paragraph[],
  fontSize: 19,
  title: "未命名",
  currentId: null as string | null,
  err: null as string | null,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...INITIAL,
  setInput: (v) => set({ input: v }),
  setMode: (m) => set({ mode: m }),
  setParagraphs: (p) => set({ paragraphs: p }),
  setFontSize: (n) => set({ fontSize: n }),
  setTitle: (s) => set({ title: s }),
  setCurrentId: (id) => set({ currentId: id }),
  setErr: (e) => set({ err: e }),
  reset: () => set({ ...INITIAL }),
}));
