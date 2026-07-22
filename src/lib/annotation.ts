import { analyzeReviewRisks } from "@/lib/review";
import type { HistoryRecord, Paragraph } from "@/lib/types";

export type AnnotationMode = "full" | "risk" | "manual";

export interface AnnotationSettings {
  mode: AnnotationMode;
  riskKeys: string[];
  manualKeys: string[];
}

export interface AnnotatedHistoryRecord extends HistoryRecord {
  annotationSettings?: AnnotationSettings;
}

export const DEFAULT_ANNOTATION_SETTINGS: AnnotationSettings = {
  mode: "full",
  riskKeys: [],
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
  paragraphs: Paragraph[] = [],
): AnnotationSettings {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_ANNOTATION_SETTINGS,
      riskKeys: collectRiskAnnotationKeys(paragraphs),
      manualKeys: [],
    };
  }

  const candidate = raw as {
    mode?: unknown;
    riskKeys?: unknown;
    manualKeys?: unknown;
  };
  const mode: AnnotationMode =
    candidate.mode === "risk" || candidate.mode === "manual"
      ? candidate.mode
      : "full";
  const normalizeKeys = (keys: unknown): string[] =>
    Array.isArray(keys)
      ? Array.from(
          new Set(
            keys.filter(
              (key): key is string =>
                typeof key === "string" && /^\d+:\d+$/.test(key),
            ),
          ),
        )
      : [];
  const riskKeys = Object.prototype.hasOwnProperty.call(candidate, "riskKeys")
    ? normalizeKeys(candidate.riskKeys)
    : collectRiskAnnotationKeys(paragraphs);
  const manualKeys = normalizeKeys(candidate.manualKeys);

  return { mode, riskKeys, manualKeys };
}

export function collectRiskAnnotationKeys(
  paragraphs: Paragraph[],
): string[] {
  return paragraphs.flatMap((paragraph, paragraphIndex) =>
    analyzeReviewRisks(paragraph).flatMap((isRisk, pairIndex) =>
      isRisk ? [annotationKey(paragraphIndex, pairIndex)] : [],
    ),
  );
}

export function buildAnnotationVisibility(
  paragraphs: Paragraph[],
  rawSettings: unknown,
): boolean[][] {
  const settings = normalizeAnnotationSettings(rawSettings, paragraphs);
  const riskKeys = new Set(settings.riskKeys);
  const manualKeys = new Set(settings.manualKeys);

  return paragraphs.map((paragraph, paragraphIndex) => {
    return paragraph.map((pair, pairIndex) => {
      if (pair.isPunct || pair.py === null) return false;
      if (settings.mode === "full") return true;
      if (settings.mode === "risk") {
        return riskKeys.has(annotationKey(paragraphIndex, pairIndex));
      }
      return manualKeys.has(annotationKey(paragraphIndex, pairIndex));
    });
  });
}

export function annotationSettingsFromRecord(
  record: HistoryRecord,
): AnnotationSettings {
  return normalizeAnnotationSettings(
    (record as AnnotatedHistoryRecord).annotationSettings,
    record.paragraphs,
  );
}
