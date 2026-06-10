import type { LayoutMode, PrintSettings } from "@/lib/types";

const FONT_SIZE_OPTIONS = [16, 20, 24] as const;
const LINE_HEIGHT_OPTIONS = [1.9, 2.15, 2.45] as const;
const LETTER_SPACING_OPTIONS = [0, 2, 4, 6] as const;

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  fontSize: 20,
  lineHeight: 2.15,
  letterSpacing: 2,
  layoutMode: "auto",
  indentFirstLine: true,
  showTitle: true,
  pageGuide: "plain",
};

function nearestOption(value: number, options: readonly number[]): number {
  return options.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best,
  );
}

function clampToOption(value: number, options: readonly number[]): number {
  return options.some((option) => option === value)
    ? value
    : nearestOption(value, options);
}

/** 合并默认并钳制到 UI 合法档位（旧 19px 等脏数据映射到最近预设）。 */
export function normalizePrintSettings(
  raw: Partial<PrintSettings> | undefined | null,
): PrintSettings {
  if (raw == null || Object.keys(raw).length === 0) {
    return { ...DEFAULT_PRINT_SETTINGS };
  }
  const base = { ...DEFAULT_PRINT_SETTINGS, ...raw };
  return {
    fontSize: clampToOption(base.fontSize, FONT_SIZE_OPTIONS),
    lineHeight: clampToOption(base.lineHeight, LINE_HEIGHT_OPTIONS),
    letterSpacing: clampToOption(base.letterSpacing, LETTER_SPACING_OPTIONS),
    layoutMode: base.layoutMode === "preserve" ? "preserve" : "auto",
    indentFirstLine: base.indentFirstLine !== false,
    showTitle: base.showTitle !== false,
    pageGuide: base.pageGuide === "grid" ? "grid" : "plain",
  };
}

export function resolvePrintSettings(
  saved?: PrintSettings,
): PrintSettings {
  return normalizePrintSettings(saved);
}

export interface PrintSettingsStoreSlice {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  layoutMode: LayoutMode;
  indentFirstLine: boolean;
  showTitle: boolean;
  pageGuide: "plain" | "grid";
}

export function printSettingsFromStore(state: PrintSettingsStoreSlice): PrintSettings {
  return {
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    letterSpacing: state.letterSpacing,
    layoutMode: state.layoutMode,
    indentFirstLine: state.indentFirstLine,
    showTitle: state.showTitle,
    pageGuide: state.pageGuide,
  };
}

export interface PrintSettingsSetters {
  setFontSize: (n: number) => void;
  setLineHeight: (n: number) => void;
  setLetterSpacing: (n: number) => void;
  setLayoutMode: (v: LayoutMode) => void;
  setIndentFirstLine: (v: boolean) => void;
  setShowTitle: (v: boolean) => void;
  setPageGuide: (v: "plain" | "grid") => void;
}

export function applyPrintSettingsToStore(
  settings: PrintSettings,
  setters: PrintSettingsSetters,
): void {
  const normalized = normalizePrintSettings(settings);
  setters.setFontSize(normalized.fontSize);
  setters.setLineHeight(normalized.lineHeight);
  setters.setLetterSpacing(normalized.letterSpacing);
  setters.setLayoutMode(normalized.layoutMode);
  setters.setIndentFirstLine(normalized.indentFirstLine);
  setters.setShowTitle(normalized.showTitle);
  setters.setPageGuide(normalized.pageGuide);
}
