import type { Pair, Paragraph } from "./types";

export const REVIEW_RISK_CHARS = new Set("行长得地了着还重种为都教觉调处散血便难空假强舍佛");

export function isReviewRisk(pair: Pair): boolean {
  if (pair.isPunct || pair.py === null) return false;
  if (pair.pySource === "manual") return false;
  return REVIEW_RISK_CHARS.has(pair.ch);
}

export function countBySource(paragraphs: Paragraph[], source: NonNullable<Pair["pySource"]>): number {
  return paragraphs.flat().filter((pair) => !pair.isPunct && pair.py && pair.pySource === source).length;
}

export function countReviewRisks(paragraphs: Paragraph[]): number {
  return paragraphs.flat().filter(isReviewRisk).length;
}
