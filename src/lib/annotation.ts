import { analyzeReviewRisks } from "@/lib/review";
import type { HistoryRecord, Paragraph } from "@/lib/types";

export type AnnotationMode = "full" | "risk" | "manual";

export interface AnnotationSettings {
  mode: AnnotationMode;
  manualKeys: string[];
}

export interface AnnotatedHistoryRecord extends HistoryRecord {
  annotationSettings?: AnnotationSettings;
}

export const DEFAULT_ANNOTATION_SETTINGS: AnnotationSettings = {
  mode: "full",
  manualKeys: [],
};

export function annotationKey(
  paragraphIndex: number,
  pairIndex: number,
): string {
  return `${paragraphIndex}:${pairIndex}`;
}

export function normalizeAnnotationSettings(
  raw: unknown,
): AnnotationSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ANNOTATION_SETTINGS, manualKeys: [] };
  }

  const candidate = raw as { mode?: unknown; manualKeys?: unknown };
  const mode: AnnotationMode =
    candidate.mode === "risk" || candidate.mode === "manual"
      ? candidate.mode
      : "full";
  const manualKeys = Array.isArray(candidate.manualKeys)
    ? Array.from(
        new Set(
          candidate.manualKeys.filter(
            (key): key is string =>
              typeof key === "string" && /^\d+:\d+$/.test(key),
          ),
        ),
      )
    : [];

  return { mode, manualKeys };
}

export function buildAnnotationVisibility(
  paragraphs: Paragraph[],
  rawSettings: unknown,
): boolean[][] {
  const settings = normalizeAnnotationSettings(rawSettings);
  const manualKeys = new Set(settings.manualKeys);

  return paragraphs.map((paragraph, paragraphIndex) => {
    const risks =
      settings.mode === "risk" ? analyzeReviewRisks(paragraph) : null;
    return paragraph.map((pair, pairIndex) => {
      if (pair.isPunct || pair.py === null) return false;
      if (settings.mode === "full") return true;
      if (settings.mode === "risk") return Boolean(risks?.[pairIndex]);
      return manualKeys.has(annotationKey(paragraphIndex, pairIndex));
    });
  });
}

export function annotationSettingsFromRecord(
  record: HistoryRecord,
): AnnotationSettings {
  return normalizeAnnotationSettings(
    (record as AnnotatedHistoryRecord).annotationSettings,
  );
}
