import { analyzePinyinText } from "./pinyin";
import type { Paragraph } from "./types";

export function getPairPinyinCandidates(
  paragraph: Paragraph,
  pairIndex: number,
): string[] {
  const pair = paragraph[pairIndex];
  if (!pair?.py || pair.isPunct) return [];

  try {
    const text = paragraph.map((item) => item.ch).join("");
    const candidates = analyzePinyinText(text)[pairIndex]?.candidates ?? [];
    return [pair.py, ...candidates].filter(
      (py, index, values) => Boolean(py) && values.indexOf(py) === index,
    );
  } catch {
    return [pair.py];
  }
}
