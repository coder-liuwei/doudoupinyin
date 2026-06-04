import type { Paragraph } from "@/lib/types";

const CJK_RE = /[\u4e00-\u9fff]/;

export function deriveTitleFromInput(input: string, maxChars = 14): string {
  const readable = Array.from(input)
    .filter((ch) => CJK_RE.test(ch) || /[a-zA-Z0-9]/.test(ch))
    .join("")
    .slice(0, maxChars);
  return readable || "未命名";
}

export function countAnnotatedChars(paragraphs: Paragraph[]): number {
  return paragraphs.flat().filter((pair) => !pair.isPunct && pair.py !== null).length;
}
