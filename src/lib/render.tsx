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
 *   非注音单元（标点 / 英文 / 数字）：
 *     <span class="unit punct|latin">
 *       <ruby>
 *         <span class="rb">{ch}</span>
 *         <rt aria-hidden="true">&nbsp;</rt>
 *       </ruby>
 *     </span>
 *
 * 注意：非注音单元也保留 ruby 空位，避免与汉字 ruby 混排时基线漂移。
 */

import { Fragment, type JSX, type MouseEvent } from "react";
import type { Paragraph } from "./types";

export function isAsciiTokenChar(ch: string): boolean {
  return /[A-Za-z0-9]/.test(ch);
}

export function Ruby({
  ch,
  py,
  className = "unit",
  onActivate,
}: {
  ch: string;
  py: string | null;
  className?: string;
  onActivate?: () => void;
}): JSX.Element {
  const activationProps = onActivate
    ? {
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          onActivate();
        },
      }
    : {};

  return (
    <span className={className}>
      <ruby>
        <span className="rb" {...activationProps}>{ch}</span>
        {py === null ? (
          <rt aria-hidden="true">{"\u00a0"}</rt>
        ) : (
          <rt {...activationProps}>{py}</rt>
        )}
      </ruby>
    </span>
  );
}

function renderUnitNodes(paragraph: Paragraph): JSX.Element[] {
  const nodes: JSX.Element[] = [];
  for (let i = 0; i < paragraph.length; ) {
    const pair = paragraph[i];
    if (pair.py && !pair.isPunct) {
      nodes.push(<Ruby key={i} ch={pair.ch} py={pair.py} />);
      i++;
      continue;
    }
    if (isAsciiTokenChar(pair.ch)) {
      let token = pair.ch;
      let end = i + 1;
      while (end < paragraph.length && isAsciiTokenChar(paragraph[end].ch)) {
        token += paragraph[end].ch;
        end++;
      }
      nodes.push(
        <Ruby key={`latin-${i}`} ch={token} py={null} className="unit latin" />,
      );
      i = end;
      continue;
    }
    nodes.push(
      <Ruby key={i} ch={pair.ch} py={null} className="unit punct" />,
    );
    i++;
  }
  return nodes;
}

/** 渲染单段：`<p class="line">...</p>`。 */
export function renderParagraph(paragraph: Paragraph): JSX.Element {
  const nodes = renderUnitNodes(paragraph);
  return (
    <p className="line">
      {nodes}
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
      {renderUnitNodes(paragraph)}
    </>
  );
}
