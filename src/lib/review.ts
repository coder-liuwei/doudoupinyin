import { analyzePinyinText, segmentPinyinText } from "./pinyin";
import { loadTable, projectPinyinMap } from "./polyphone";
import type { Pair, Paragraph } from "./types";

function pinyinSyllable(py: string): string {
  return py
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function markResolvedSegments(text: string, resolved: boolean[]): void {
  const chars = Array.from(text);
  let cursor = 0;
  for (const word of segmentPinyinText(text)) {
    const wordChars = Array.from(word);
    const actual = chars.slice(cursor, cursor + wordChars.length).join("");
    if (actual !== word) {
      throw new Error(`分词结果未对齐：位置 ${cursor} 期望「${actual}」，实际「${word}」`);
    }
    if (wordChars.length > 1) {
      for (let index = cursor; index < cursor + wordChars.length; index++) resolved[index] = true;
    }
    cursor += wordChars.length;
  }
  if (cursor !== chars.length) {
    throw new Error(`分词结果未对齐：输入 ${chars.length} 字符，只覆盖 ${cursor} 字符`);
  }
}

function markProjectPhrases(text: string, resolved: boolean[]): void {
  const chars = Array.from(text);
  for (const phrase of Object.keys(projectPinyinMap(loadTable()))) {
    const phraseChars = Array.from(phrase);
    if (phraseChars.length < 2) continue;
    for (let start = 0; start <= chars.length - phraseChars.length; start++) {
      let matches = true;
      for (let offset = 0; offset < phraseChars.length; offset++) {
        if (chars[start + offset] !== phraseChars[offset]) {
          matches = false;
          break;
        }
      }
      if (!matches) continue;
      for (let index = start; index < start + phraseChars.length; index++) resolved[index] = true;
    }
  }
}

/** 按段返回每个 Pair 是否需要人工校对。 */
export function analyzeReviewRisks(paragraph: Paragraph): boolean[] {
  const text = paragraph.map((pair) => pair.ch).join("");
  const units = analyzePinyinText(text);
  if (units.length !== paragraph.length) {
    throw new Error(`风险分析未对齐：段落 ${paragraph.length} 项，拼音 ${units.length} 项`);
  }

  const resolved = new Array<boolean>(paragraph.length).fill(false);
  markResolvedSegments(text, resolved);
  markProjectPhrases(text, resolved);

  return paragraph.map((pair, index) => {
    if (pair.isPunct || pair.py === null || pair.pySource === "manual") return false;
    const candidates = units[index].candidates;
    const candidateSyllables = new Set(candidates.map(pinyinSyllable));
    if (!candidateSyllables.has(pinyinSyllable(pair.py))) return true;
    return candidateSyllables.size > 1 && !resolved[index];
  });
}

export function countBySource(paragraphs: Paragraph[], source: NonNullable<Pair["pySource"]>): number {
  return paragraphs.flat().filter((pair) => !pair.isPunct && pair.py && pair.pySource === source).length;
}

export function countReviewRisks(paragraphs: Paragraph[]): number {
  return paragraphs.reduce(
    (total, paragraph) => total + analyzeReviewRisks(paragraph).filter(Boolean).length,
    0,
  );
}
