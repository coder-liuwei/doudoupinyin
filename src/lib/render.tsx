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

import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Fragment, type JSX, type MouseEvent } from "react";
import { analyzeReviewRisks } from "./review";
import type { Pair, Paragraph } from "./types";

export interface EditingRange {
  paragraphIndex: number;
  startIndex: number;
  endIndex: number;
  values: string[];
}

export interface ProofreadParagraphOptions {
  paragraphIndex: number;
  editing: EditingRange | null;
  canUsePair: (paragraphIndex: number, pairIndex: number) => boolean;
  onOpenCandidates: (
    paragraphIndex: number,
    pairIndex: number,
    anchor: HTMLElement,
  ) => void;
  onExpand: (direction: "left" | "right") => void;
  onSave: () => void;
  onCancel: () => void;
  onChangeValue: (index: number, value: string) => void;
}

function sourceClass(pair: Pair): string {
  if (pair.pySource === "manual") return "manual";
  if (pair.pySource === "dual") return "dual";
  return "auto";
}

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

function renderProofreadNodes(
  paragraph: Paragraph,
  options: ProofreadParagraphOptions,
): JSX.Element[] {
  const {
    paragraphIndex,
    editing,
    canUsePair,
    onOpenCandidates,
    onExpand,
    onSave,
    onCancel,
    onChangeValue,
  } = options;
  const nodes: JSX.Element[] = [];
  const reviewRisks = analyzeReviewRisks(paragraph);
  let pairIndex = 0;

  while (pairIndex < paragraph.length) {
    const pair = paragraph[pairIndex];
    const currentPairIndex = pairIndex;
    const isEditing =
      editing?.paragraphIndex === paragraphIndex &&
      currentPairIndex >= (editing?.startIndex ?? -1) &&
      currentPairIndex <= (editing?.endIndex ?? -1);

    if (isEditing && currentPairIndex === editing?.startIndex && editing) {
      const selectedPairs = paragraph.slice(editing.startIndex, editing.endIndex + 1);
      nodes.push(
        <span className="unit edit-unit range-edit-unit" key={`edit-${currentPairIndex}`}>
          <span className="range-word">
            {selectedPairs.map((selectedPair) => selectedPair.ch).join("")}
          </span>
          <span className="range-inputs">
            {selectedPairs.map((selectedPair, i) => (
              <label key={`${selectedPair.ch}-${i}`}>
                <span>{selectedPair.ch}</span>
                <input
                  value={editing.values[i] ?? ""}
                  autoFocus={i === 0}
                  onChange={(e) => onChangeValue(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSave();
                    if (e.key === "Escape") onCancel();
                  }}
                />
              </label>
            ))}
          </span>
          <button
            type="button"
            aria-label="向左扩一字"
            disabled={!canUsePair(paragraphIndex, editing.startIndex - 1)}
            onClick={() => onExpand("left")}
          >
            <ArrowLeft size={12} />
          </button>
          <button
            type="button"
            aria-label="向右扩一字"
            disabled={!canUsePair(paragraphIndex, editing.endIndex + 1)}
            onClick={() => onExpand("right")}
          >
            <ArrowRight size={12} />
          </button>
          <button type="button" aria-label="保存拼音" onClick={onSave}>
            <Check size={12} />
          </button>
          <button type="button" aria-label="取消编辑" onClick={onCancel}>
            <X size={12} />
          </button>
        </span>,
      );
      pairIndex = editing.endIndex + 1;
      continue;
    }

    if (pair.py && !pair.isPunct) {
      const isSuspect = reviewRisks[currentPairIndex];
      nodes.push(
        <span
          key={currentPairIndex}
          className={["proof-unit", sourceClass(pair), isSuspect ? "suspect" : ""]
            .filter(Boolean)
            .join(" ")}
          role="button"
          tabIndex={0}
          onClick={(event) =>
            onOpenCandidates(
              paragraphIndex,
              currentPairIndex,
              event.currentTarget,
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenCandidates(
                paragraphIndex,
                currentPairIndex,
                e.currentTarget,
              );
            }
          }}
        >
          <Ruby ch={pair.ch} py={pair.py} />
        </span>,
      );
      pairIndex++;
      continue;
    }

    if (isAsciiTokenChar(pair.ch)) {
      let token = pair.ch;
      let end = pairIndex + 1;
      while (end < paragraph.length && isAsciiTokenChar(paragraph[end].ch)) {
        token += paragraph[end].ch;
        end++;
      }
      nodes.push(
        <Ruby key={`latin-${pairIndex}`} ch={token} py={null} className="unit latin" />,
      );
      pairIndex = end;
      continue;
    }

    nodes.push(<Ruby key={pairIndex} ch={pair.ch} py={null} className="unit punct" />);
    pairIndex++;
  }

  return nodes;
}

/** 预览校对模式：在打印用 ruby 结构之上叠加点击改音与风险高亮。 */
export function renderProofreadParagraph(
  paragraph: Paragraph,
  options: ProofreadParagraphOptions,
): JSX.Element {
  return (
    <p className="line">
      {renderProofreadNodes(paragraph, options)}
    </p>
  );
}
