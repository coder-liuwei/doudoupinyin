/**
 * 屏幕版预览。
 *
 * 容器 #previewInner 必须保留：print.css / PrintOnly 都通过这个 id 注入
 * 排版样式 + 套 A4 视觉，确保屏幕版和打印版视觉一致。
 *
 * 字号受 store.fontSize 控制（不是 viewport 自适应）—— 由用户主动选，
 * 三个档位：小学 16 / 大班 20 / 小班 24。
 */
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, MousePointer2, PencilLine, Printer, X } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { usePrint } from "@/hooks/usePrint";
import { Ruby } from "@/lib/render";
import { countAnnotatedChars } from "@/lib/document";
import { countBySource, countReviewRisks, isReviewRisk } from "@/lib/review";

interface EditingRange {
  paragraphIndex: number;
  startIndex: number;
  endIndex: number;
  values: string[];
}

function isAsciiTokenChar(ch: string): boolean {
  return /[A-Za-z0-9]/.test(ch);
}

function sourceClass(pair: { pySource?: string }): string {
  if (pair.pySource === "manual") return "manual";
  if (pair.pySource === "dual") return "dual";
  return "auto";
}

export default function Preview() {
  const [editing, setEditing] = useState<EditingRange | null>(null);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const fontSize = useEditorStore((s) => s.fontSize);
  const lineHeight = useEditorStore((s) => s.lineHeight);
  const letterSpacing = useEditorStore((s) => s.letterSpacing);
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const indentFirstLine = useEditorStore((s) => s.indentFirstLine);
  const showTitle = useEditorStore((s) => s.showTitle);
  const pageGuide = useEditorStore((s) => s.pageGuide);
  const title = useEditorStore((s) => s.title);
  const updatePairPinyinRange = useEditorStore((s) => s.updatePairPinyinRange);
  const goPrint = usePrint();
  const gridOffset = (36 + fontSize * 2) % 32;

  function beginEdit(paragraphIndex: number, pairIndex: number): void {
    const pair = paragraphs[paragraphIndex]?.[pairIndex];
    if (!pair?.py) return;
    setEditing({
      paragraphIndex,
      startIndex: pairIndex,
      endIndex: pairIndex,
      values: [pair.py],
    });
  }

  function canUsePair(paragraphIndex: number, pairIndex: number): boolean {
    const pair = paragraphs[paragraphIndex]?.[pairIndex];
    return Boolean(pair && !pair.isPunct && pair.py);
  }

  function expandEditing(direction: "left" | "right"): void {
    if (!editing) return;
    if (direction === "left") {
      const nextIndex = editing.startIndex - 1;
      if (!canUsePair(editing.paragraphIndex, nextIndex)) return;
      const pair = paragraphs[editing.paragraphIndex][nextIndex];
      setEditing({
        ...editing,
        startIndex: nextIndex,
        values: [pair.py ?? "", ...editing.values],
      });
      return;
    }
    const nextIndex = editing.endIndex + 1;
    if (!canUsePair(editing.paragraphIndex, nextIndex)) return;
    const pair = paragraphs[editing.paragraphIndex][nextIndex];
    setEditing({
      ...editing,
      endIndex: nextIndex,
      values: [...editing.values, pair.py ?? ""],
    });
  }

  function saveEditing(): void {
    if (!editing) return;
    updatePairPinyinRange(
      editing.paragraphIndex,
      editing.startIndex,
      editing.values.map((py, pairIndex) => ({
        pairIndex,
        py: py.trim() || null,
      })),
    );
    setEditing(null);
  }

  function renderParagraph(paragraph: typeof paragraphs[number], paragraphIndex: number) {
    const nodes: JSX.Element[] = [];
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
            <span className="range-word">{selectedPairs.map((selectedPair) => selectedPair.ch).join("")}</span>
            <span className="range-inputs">
              {selectedPairs.map((selectedPair, i) => (
                <label key={`${selectedPair.ch}-${i}`}>
                  <span>{selectedPair.ch}</span>
                  <input
                    value={editing.values[i] ?? ""}
                    autoFocus={i === 0}
                    onChange={(e) => {
                      const next = [...editing.values];
                      next[i] = e.target.value;
                      setEditing({ ...editing, values: next });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditing();
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                </label>
              ))}
            </span>
            <button
              type="button"
              aria-label="向左扩一字"
              disabled={!canUsePair(paragraphIndex, editing.startIndex - 1)}
              onClick={() => expandEditing("left")}
            >
              <ArrowLeft size={12} />
            </button>
            <button
              type="button"
              aria-label="向右扩一字"
              disabled={!canUsePair(paragraphIndex, editing.endIndex + 1)}
              onClick={() => expandEditing("right")}
            >
              <ArrowRight size={12} />
            </button>
            <button type="button" aria-label="保存拼音" onClick={saveEditing}>
              <Check size={12} />
            </button>
            <button type="button" aria-label="取消编辑" onClick={() => setEditing(null)}>
              <X size={12} />
            </button>
          </span>,
        );
        pairIndex = editing.endIndex + 1;
        continue;
      }

      if (pair.py && !pair.isPunct) {
        const isSuspect = isReviewRisk(pair);
        nodes.push(
          <span
            key={currentPairIndex}
            className={[
              "proof-unit",
              sourceClass(pair),
              isSuspect ? "suspect" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            role="button"
            tabIndex={0}
            onClick={() => {
              beginEdit(paragraphIndex, currentPairIndex);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                beginEdit(paragraphIndex, currentPairIndex);
              }
            }}
          >
            <Ruby ch={pair.ch} py={pair.py} onActivate={() => beginEdit(paragraphIndex, currentPairIndex)} />
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

  if (paragraphs.length === 0) {
    return (
      <section className="preview-panel empty-preview" aria-label="预览">
        <div className="paper-sheet empty-paper">
          <PencilLine size={28} />
          <h2>还没有注音稿</h2>
          <p>在左侧粘贴正文后点击“生成注音”，这里会显示接近 A4 打印效果的预览。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="preview-panel" aria-label="预览与校对">
      <div className="preview-toolbar">
        <div>
          <span className="eyebrow">第 3 步</span>
          <h2>校对与预览</h2>
        </div>
        <div className="preview-actions">
          <p>
            <MousePointer2 size={14} />
            点击拼音可修改，红点字建议重点检查
          </p>
          <button type="button" className="new-doc-button preview-print-button" onClick={goPrint}>
            <Printer size={15} />
            打印 / 存 PDF
          </button>
        </div>
      </div>

      <div
        className={`paper-sheet ${pageGuide === "grid" ? "practice-grid" : ""}`}
        style={{
          ["--preview-font-size" as string]: `${fontSize}px`,
          ["--preview-line-height" as string]: lineHeight,
          ["--ruby-unit-gap" as string]: `${letterSpacing}px`,
          backgroundPositionX: `${gridOffset}px`,
        }}
      >
        {showTitle && <h1 className="paper-title">{title}</h1>}
        <div
          id="previewInner"
          className={[
            "screen-preview",
            `layout-${layoutMode}`,
            indentFirstLine ? "first-indent" : "no-first-indent",
          ].join(" ")}
        >
          {paragraphs.map((paragraph, paragraphIndex) => (
            <p className="line" key={paragraphIndex}>
              {renderParagraph(paragraph, paragraphIndex)}
            </p>
          ))}
        </div>
      </div>

      <div className="preview-stats">
        <span>{paragraphs.length} 段</span>
        <span>{countAnnotatedChars(paragraphs)} 个注音字</span>
        <span>{countReviewRisks(paragraphs)} 个待核对</span>
        <span>{countBySource(paragraphs, "dual")} 个用户录入</span>
        <span>{countBySource(paragraphs, "manual")} 个人工修改</span>
      </div>
    </section>
  );
}
