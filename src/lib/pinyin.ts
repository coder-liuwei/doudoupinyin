/**
 * pinyin-pro 单字包装。
 *
 * 来源：pinyin-prince.html:451-459
 *
 * 行为：
 *   - CJK 字符（U+4E00–U+9FFF）→ 调用 pinyin-pro 单字取音（带声调）
 *   - 其他字符 → 视为标点，返回 null
 *
 * 注意：不处理多音字（见 polyphone.ts）。
 */

import { pinyin } from "pinyin-pro";

const CJK_RE = /[\u4e00-\u9fff]/;

function isCjk(ch: string): boolean {
  return CJK_RE.test(ch);
}

export function pinyinOf(ch: string): string | null {
  if (!isCjk(ch)) return null;
  let py = pinyin(ch, { toneType: "symbol", type: "string" });
  if (typeof py !== "string") py = String(py);
  return py.replace(/\s+/g, "").trim();
}
