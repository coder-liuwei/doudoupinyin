/**
 * 结构助词（的/地/得）轻量校正。
 *
 * 来源：scripts/build_baigujing_html.py:108-127 apply_particle_fixes
 *
 * 仅 1:1 翻译现有规则：
 *   1. 「得」前为 "疼气笑走" → 读 "de"
 *   2. 「地」前 4 字窗口 = "依依不舍地" → 读 "de"
 *
 * 注意：pollyphone.yaml 的 overrides 已包含 "疼得"/"气得"/"笑得" 等更多
 * 「动词+得」组合（被 polyphone 流程覆盖），本模块只负责 polyphone 流程
 * 之外的「地」字窗口检查。
 *
 * 不做发挥：只翻译现有规则。
 */

import type { Pair } from "./types";

/** 触发 "得" 读轻声 "de" 的前字集合。 */
const DE_BEFORE = "疼气笑走";

/**
 * 就地修改 pairs：把符合规则的 的/地/得 的 py 改为 "de"。
 * 输入：未应用 polyphone 之前的 pairs 序列（来自 char_pairs）。
 */
export function fixParticles(pairs: Pair[]): void {
  for (let i = 1; i < pairs.length; i++) {
    const ch = pairs[i].ch;
    const py = pairs[i].py;
    if (py === null) continue;
    const prev = pairs[i - 1].ch;

    if (ch === "得" && DE_BEFORE.includes(prev)) {
      pairs[i].py = "de";
    }
    if (ch === "地" && i >= 4) {
      const window = pairs
        .slice(i - 4, i + 1)
        .map((p) => p.ch)
        .join("");
      if (window === "依依不舍地") {
        pairs[i].py = "de";
      }
    }
  }
}
