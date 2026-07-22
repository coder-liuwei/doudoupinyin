/**
 * 编辑器全局状态（Zustand）。
 *
 * 范围：input/mode/paragraphs/fontSize/title/currentId/err
 * 不持有历史列表（历史在 useHistory 里独立管理，避免无谓重渲染）。
 * 也不持有 PDF 抽取状态（临时态，组件内 useState 即可）。
 */
import { create } from "zustand";
import {
  annotationKey,
  collectRiskAnnotationKeys,
  DEFAULT_ANNOTATION_SETTINGS,
  normalizeAnnotationSettings,
  type AnnotationMode,
  type AnnotationSettings,
} from "@/lib/annotation";
import { DEFAULT_PRINT_SETTINGS } from "@/lib/print-settings";
import type { LayoutMode, Mode, Paragraph } from "@/lib/types";

export interface EditorState {
  input: string;
  mode: Mode;
  paragraphs: Paragraph[];
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  layoutMode: LayoutMode;
  indentFirstLine: boolean;
  showTitle: boolean;
  pageGuide: "plain" | "grid";
  annotationMode: AnnotationMode;
  riskAnnotationKeys: string[];
  manualAnnotationKeys: string[];
  title: string;
  currentId: string | null;
  err: string | null;

  setInput: (v: string) => void;
  setMode: (m: Mode) => void;
  setParagraphs: (p: Paragraph[]) => void;
  setFontSize: (n: number) => void;
  setLineHeight: (n: number) => void;
  setLetterSpacing: (n: number) => void;
  setLayoutMode: (v: LayoutMode) => void;
  setIndentFirstLine: (v: boolean) => void;
  setShowTitle: (v: boolean) => void;
  setPageGuide: (v: "plain" | "grid") => void;
  setAnnotationMode: (mode: AnnotationMode) => void;
  setAnnotationSettings: (settings: unknown) => void;
  setAnnotationAt: (
    paragraphIndex: number,
    pairIndex: number,
    annotated: boolean,
  ) => void;
  clearCurrentAnnotations: () => void;
  setTitle: (s: string) => void;
  setCurrentId: (id: string | null) => void;
  setErr: (e: string | null) => void;
  updatePairPinyin: (paragraphIndex: number, pairIndex: number, py: string | null) => void;
  updatePairPinyinRange: (
    paragraphIndex: number,
    startIndex: number,
    values: Array<{ pairIndex: number; py: string | null }>,
  ) => void;
  reset: () => void;
}

// 默认字号 20（大班预设），与 PrintSettingsPanel 选项对齐
const INITIAL = {
  input: "",
  mode: "plain" as Mode,
  paragraphs: [] as Paragraph[],
  ...DEFAULT_PRINT_SETTINGS,
  annotationMode: DEFAULT_ANNOTATION_SETTINGS.mode,
  riskAnnotationKeys: [] as string[],
  manualAnnotationKeys: [] as string[],
  title: "未命名",
  currentId: null as string | null,
  err: null as string | null,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...INITIAL,
  setInput: (v) => set({ input: v }),
  setMode: (m) => set({ mode: m }),
  setParagraphs: (p) =>
    set({
      paragraphs: p,
      annotationMode: DEFAULT_ANNOTATION_SETTINGS.mode,
      riskAnnotationKeys: collectRiskAnnotationKeys(p),
      manualAnnotationKeys: [],
    }),
  setFontSize: (n) => set({ fontSize: n }),
  setLineHeight: (n) => set({ lineHeight: n }),
  setLetterSpacing: (n) => set({ letterSpacing: n }),
  setLayoutMode: (v) => set({ layoutMode: v }),
  setIndentFirstLine: (v) => set({ indentFirstLine: v }),
  setShowTitle: (v) => set({ showTitle: v }),
  setPageGuide: (v) => set({ pageGuide: v }),
  setAnnotationMode: (annotationMode) => set({ annotationMode }),
  setAnnotationSettings: (rawSettings) =>
    set((state) => {
      const settings: AnnotationSettings = normalizeAnnotationSettings(
        rawSettings,
        state.paragraphs,
      );
      return {
        annotationMode: settings.mode,
        riskAnnotationKeys: settings.riskKeys,
        manualAnnotationKeys: settings.manualKeys,
      };
    }),
  setAnnotationAt: (paragraphIndex, pairIndex, annotated) =>
    set((state) => {
      if (state.annotationMode === "full") return state;
      const key = annotationKey(paragraphIndex, pairIndex);
      const field =
        state.annotationMode === "risk"
          ? "riskAnnotationKeys"
          : "manualAnnotationKeys";
      const keys = new Set(state[field]);
      if (annotated) keys.add(key);
      else keys.delete(key);
      return { [field]: Array.from(keys), currentId: null };
    }),
  clearCurrentAnnotations: () =>
    set((state) => {
      if (state.annotationMode === "risk") {
        return { riskAnnotationKeys: [], currentId: null };
      }
      if (state.annotationMode === "manual") {
        return { manualAnnotationKeys: [], currentId: null };
      }
      return state;
    }),
  setTitle: (s) => set({ title: s }),
  setCurrentId: (id) => set({ currentId: id }),
  setErr: (e) => set({ err: e }),
  updatePairPinyin: (paragraphIndex, pairIndex, py) =>
    set((state) => ({
      paragraphs: state.paragraphs.map((paragraph, pIndex) =>
        pIndex === paragraphIndex
          ? paragraph.map((pair, i) =>
              i === pairIndex ? { ...pair, py, pySource: "manual" } : pair,
            )
          : paragraph,
      ),
      currentId: null,
    })),
  updatePairPinyinRange: (paragraphIndex, startIndex, values) =>
    set((state) => {
      const byIndex = new Map(
        values.map(({ pairIndex, py }) => [startIndex + pairIndex, py]),
      );
      return {
        paragraphs: state.paragraphs.map((paragraph, pIndex) =>
          pIndex === paragraphIndex
            ? paragraph.map((pair, i) =>
                byIndex.has(i)
                  ? { ...pair, py: byIndex.get(i) ?? null, pySource: "manual" }
                  : pair,
              )
            : paragraph,
        ),
        currentId: null,
      };
    }),
  reset: () => set({ ...INITIAL }),
}));
