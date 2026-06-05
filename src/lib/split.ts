/**
 * 单/双行分段 + 逐字 Pair 序列生成。
 *
 * 来源：pinyin-prince.html:422-530
 *   - splitPlainBlocks: 纯汉字分段（按空行 / 单换行）
 *   - buildDualParagraphs: 双行模式（拼音行 + 汉字行）
 *
 * 输出：每段是 Pair[]，CJK 字符已注音、非 CJK 标点 isPunct=true。
 *
 * 双行模式错误信息保持中文，匹配原 JS 行为：
 *   - 缺少拼音块 / 缺少汉字块 → "第 N 组：..."
 *   - 拼音/汉字格数不等 → "第 N 组：拼音 X 格，汉字 Y 格，未对齐。"
 *   - 汉字非单字 → "第 N 组：汉字「...」须一格一字、用空格分开。"
 */

import type { LayoutMode, Paragraph } from "./types";
import { pinyinOf } from "./pinyin";

const CJK_RE = /[\u4e00-\u9fff]/;

function isCjk(ch: string): boolean {
  return CJK_RE.test(ch);
}

/**
 * 把字符标点化（用于 build 过程中的非 CJK 字符）。
 */
function toPair(ch: string): import("./types").Pair {
  if (isCjk(ch)) {
    return { ch, py: pinyinOf(ch), isPunct: false, pySource: "auto" };
  }
  return { ch, py: null, isPunct: true };
}

/**
 * 纯汉字模式分段：
 *   - 有空行（`\n[ \t]*\n`）→ 按空行分段，段内多余换行去掉
 *   - 无空行 → 按单换行分段（适合一行一段粘贴）
 */
export function splitPlainBlocks(
  text: string,
  options: { layoutMode?: LayoutMode } = {},
): Paragraph[] {
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!t) return [];

  let blocks: string[];
  if (options.layoutMode === "preserve") {
    blocks = t
      .split(/\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  } else if (/\n[ \t]*\n/.test(t)) {
    blocks = t
      .split(/\n[ \t]*\n+/)
      .map((p) => p.replace(/\n+/g, "").trim())
      .filter(Boolean);
  } else {
    blocks = t
      .split(/\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const fallback = t
    ? [t.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()]
    : [];
  if (blocks.length === 0 && fallback.length > 0) blocks = fallback;

  return blocks.map((para) => {
    const pairs: Paragraph = [];
    for (const ch of para) {
      if (ch === "\n" || ch === "\r") continue;
      pairs.push(toPair(ch));
    }
    return pairs;
  });
}

/**
 * 判断一行是否更像「拼音行」（拉丁字母为主）。
 */
function looksLikePinyinLine(line: string): boolean {
  if (!line || !line.trim()) return false;
  const latin = (
    line.match(/[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňɡĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ]/g) ||
    []
  ).length;
  const han = (line.match(/[\u4e00-\u9fff]/g) || []).length;
  if (latin >= 2 && latin >= han) return true;
  return latin > han && latin >= 1;
}

/**
 * 双行模式：拼音行（拉丁）+ 汉字行（CJK），按行交错。
 * 段内多行（被 Word 折行）会合并。
 *
 * 抛错：
 *   - 第一组若以汉字开头 → "应以「拼音」开头"
 *   - 拼音块下面无对应汉字块 → "拼音块下面缺少对应的「汉字块」"
 *   - 拼音/汉字格数不等 → "拼音 X 格，汉字 Y 格，未对齐"
 *   - 汉字格非单字 → "汉字「...」须一格一字"
 */
export function buildDualParagraphs(text: string): Paragraph[] {
  const raw = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length);
  if (raw.length === 0) return [];

  const paragraphs: Paragraph[] = [];
  let i = 0;
  while (i < raw.length) {
    const pyChunk: string[] = [];
    while (i < raw.length && looksLikePinyinLine(raw[i])) {
      pyChunk.push(raw[i]);
      i++;
    }
    const hzChunk: string[] = [];
    while (i < raw.length && !looksLikePinyinLine(raw[i])) {
      hzChunk.push(raw[i]);
      i++;
    }
    if (pyChunk.length === 0 && hzChunk.length === 0) break;
    const n = paragraphs.length + 1;
    if (pyChunk.length === 0) {
      throw new Error(
        `第 ${n} 组：应以「拼音」开头。若第一行是汉字，请对调顺序，或改用「只有汉字」。`,
      );
    }
    if (hzChunk.length === 0) {
      throw new Error(
        `第 ${n} 组：拼音块下面缺少对应的「汉字块」。中间不要空行，汉字要紧接在拼音下面。`,
      );
    }
    const pyLine = pyChunk.join(" ").replace(/\s+/g, " ").trim();
    const hzLine = hzChunk.join(" ").replace(/\s+/g, " ").trim();
    const pyTok = pyLine.split(/\s+/).filter(Boolean);
    const hzTok = hzLine.split(/\s+/).filter(Boolean);
    if (pyTok.length !== hzTok.length) {
      throw new Error(
        `双行模式：拼音 ${pyTok.length} 格 ≠ 汉字 ${hzTok.length} 格`,
      );
    }
    const pairs: Paragraph = [];
    for (let j = 0; j < hzTok.length; j++) {
      const hz = hzTok[j];
      const py = pyTok[j];
      if (hz.length !== 1) {
        throw new Error(
          `第 ${n} 组：汉字「${hz}」须一格一字、用空格分开。`,
        );
      }
      if (isCjk(hz)) {
        pairs.push({ ch: hz, py, isPunct: false, pySource: "dual" });
      } else {
        pairs.push({ ch: hz, py: null, isPunct: true });
      }
    }
    paragraphs.push(pairs);
  }
  return paragraphs;
}
