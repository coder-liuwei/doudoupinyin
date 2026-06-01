/**
 * 渲染 Pair[] → JSX。
 *
 * 来源：pinyin-prince.html:533-558 renderPairs
 *
 * 节点结构（与原 HTML 等价）：
 *   CJK 注音：
 *     <span class="unit">
 *       <ruby>
 *         <span class="rb">{ch}</span>
 *         <rt>{py}</rt>
 *       </ruby>
 *     </span>
 *
 *   标点（py === null）：
 *     <span class="unit punct">{ch}</span>
 *
 * 注意：标点不打 ruby，因为标点本就不需要注音位置；CSS 可选地保留 .punct 类以便
 * 隐藏空白注音空间（参考 print.css）。
 */

import { Fragment, type JSX } from "react";
import type { Paragraph, Pair } from "./types";

export function Ruby({
  ch,
  py,
}: {
  ch: string;
  py: string | null;
}): JSX.Element {
  if (py === null) {
    return <span className="unit punct">{ch}</span>;
  }
  return (
    <span className="unit">
      <ruby>
        <span className="rb">{ch}</span>
        <rt>{py}</rt>
      </ruby>
    </span>
  );
}

/** 渲染单段：`<p class="line">...</p>`。 */
export function renderParagraph(paragraph: Paragraph): JSX.Element {
  return (
    <p className="line">
      {paragraph.map((pair, i) => (
        <Ruby key={i} ch={pair.ch} py={pair.py} />
      ))}
    </p>
  );
}

/** 渲染多段：每段一个 `<p class="line">`，外层用 Fragment 包裹。 */
export function renderParagraphs(paragraphs: Paragraph[]): JSX.Element {
  return (
    <>
      {paragraphs.map((p, i) => (
        <Fragment key={i}>{renderParagraph(p)}</Fragment>
      ))}
    </>
  );
}

/** 内部导出：把单段渲染为 inline 单元序列（无 <p> 包裹），用于 History 回放等场景。 */
export function renderUnits(paragraph: Paragraph): JSX.Element {
  return (
    <>
      {paragraph.map((pair: Pair, i: number) => (
        <Ruby key={i} ch={pair.ch} py={pair.py} />
      ))}
    </>
  );
}
