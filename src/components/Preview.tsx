/**
 * 屏幕版预览。
 *
 * 容器 #previewInner 必须保留：print.css / PrintOnly 都通过这个 id 注入
 * 排版样式 + 套 A4 视觉，确保屏幕版和打印版视觉一致。
 *
 * 字号受 store.fontSize 控制（不是 viewport 自适应）—— 由用户主动选，
 * 三个档位：小学 16 / 大班 20 / 小班 24。
 */
import { Fragment, useEffect, useRef, useState } from "react";
import { MousePointer2, PencilLine, Printer } from "lucide-react";
import PolyphoneCandidateCard from "@/components/PolyphoneCandidateCard";
import { useEditorStore } from "@/store/useEditorStore";
import { usePrint } from "@/hooks/usePrint";
import { getPairPinyinCandidates } from "@/lib/pinyin-candidates";
import { buildAnnotationVisibility } from "@/lib/annotation";
import { countBySource, countReviewRisks } from "@/lib/review";
import {
  renderProofreadParagraph,
  type EditingRange,
} from "@/lib/render";

interface CandidateTarget {
  paragraphIndex: number;
  pairIndex: number;
  position: { left: number; top: number };
}

const CANDIDATE_CARD_WIDTH = 280;
const CANDIDATE_CARD_HEIGHT = 220;
const VIEWPORT_GAP = 12;

export default function Preview() {
  const [editing, setEditing] = useState<EditingRange | null>(null);
  const [candidateTarget, setCandidateTarget] =
    useState<CandidateTarget | null>(null);
  const candidateCardRef = useRef<HTMLElement>(null);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const fontSize = useEditorStore((s) => s.fontSize);
  const lineHeight = useEditorStore((s) => s.lineHeight);
  const letterSpacing = useEditorStore((s) => s.letterSpacing);
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const indentFirstLine = useEditorStore((s) => s.indentFirstLine);
  const showTitle = useEditorStore((s) => s.showTitle);
  const pageGuide = useEditorStore((s) => s.pageGuide);
  const annotationMode = useEditorStore((s) => s.annotationMode);
  const manualAnnotationKeys = useEditorStore((s) => s.manualAnnotationKeys);
  const title = useEditorStore((s) => s.title);
  const updatePairPinyinRange = useEditorStore((s) => s.updatePairPinyinRange);
  const toggleManualAnnotation = useEditorStore((s) => s.toggleManualAnnotation);
  const clearManualAnnotations = useEditorStore((s) => s.clearManualAnnotations);
  const goPrint = usePrint();
  const gridOffset = (36 + fontSize * 2) % 32;
  const annotationVisibility = buildAnnotationVisibility(paragraphs, {
    mode: annotationMode,
    manualKeys: manualAnnotationKeys,
  });
  const visibleAnnotationCount = annotationVisibility
    .flat()
    .filter(Boolean).length;

  useEffect(() => {
    setCandidateTarget(null);
  }, [paragraphs]);

  useEffect(() => {
    setCandidateTarget(null);
    setEditing(null);
  }, [annotationMode]);

  useEffect(() => {
    if (!candidateTarget) return;

    function closeOnPointerDown(event: PointerEvent): void {
      if (
        event.target instanceof Node &&
        candidateCardRef.current?.contains(event.target)
      ) {
        return;
      }
      setCandidateTarget(null);
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setCandidateTarget(null);
    }

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [candidateTarget]);

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

  function openCandidates(
    paragraphIndex: number,
    pairIndex: number,
    anchor: HTMLElement,
  ): void {
    const pair = paragraphs[paragraphIndex]?.[pairIndex];
    if (!pair?.py || pair.isPunct) return;

    const rect = anchor.getBoundingClientRect();
    const maxLeft = Math.max(
      VIEWPORT_GAP,
      window.innerWidth - CANDIDATE_CARD_WIDTH - VIEWPORT_GAP,
    );
    const maxTop = Math.max(
      VIEWPORT_GAP,
      window.innerHeight - CANDIDATE_CARD_HEIGHT - VIEWPORT_GAP,
    );
    setEditing(null);
    setCandidateTarget({
      paragraphIndex,
      pairIndex,
      position: {
        left: Math.min(Math.max(VIEWPORT_GAP, rect.left), maxLeft),
        top: Math.min(Math.max(VIEWPORT_GAP, rect.bottom + 10), maxTop),
      },
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

  const candidatePair = candidateTarget
    ? paragraphs[candidateTarget.paragraphIndex]?.[candidateTarget.pairIndex]
    : null;
  const candidates =
    candidateTarget && candidatePair
      ? getPairPinyinCandidates(
          paragraphs[candidateTarget.paragraphIndex],
          candidateTarget.pairIndex,
        )
      : [];

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
            点击汉字选择读音，红点字建议重点检查
          </p>
          <button
            type="button"
            className="new-doc-button preview-print-button"
            onClick={() => {
              setCandidateTarget(null);
              goPrint();
            }}
          >
            <Printer size={15} />
            打印 / 存 PDF
          </button>
        </div>
      </div>

      {annotationMode === "manual" && (
        <div className="annotation-selection-bar" aria-label="手动注音选择">
          <div>
            <strong>手动选择注音</strong>
            <span>已选 {manualAnnotationKeys.length} 处</span>
          </div>
          <button type="button" onClick={clearManualAnnotations}>
            清空注音
          </button>
        </div>
      )}

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
            <Fragment key={paragraphIndex}>
              {renderProofreadParagraph(paragraph, {
                paragraphIndex,
                editing,
                canUsePair,
                onOpenCandidates: openCandidates,
                onExpand: expandEditing,
                onSave: saveEditing,
                onCancel: () => setEditing(null),
                onChangeValue: (index, value) => {
                  if (!editing) return;
                  const next = [...editing.values];
                  next[index] = value;
                  setEditing({ ...editing, values: next });
                },
                annotationVisibility:
                  annotationVisibility[paragraphIndex] ?? [],
                annotationSelectionActive:
                  annotationMode === "manual",
                onToggleAnnotation: (pairIndex) =>
                  toggleManualAnnotation(paragraphIndex, pairIndex),
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {candidateTarget && candidatePair?.py && (
        <PolyphoneCandidateCard
          ref={candidateCardRef}
          ch={candidatePair.ch}
          currentPy={candidatePair.py}
          selectedPy={candidatePair.py}
          candidates={candidates}
          position={candidateTarget.position}
          onSelect={(py) => {
            if (py !== candidatePair.py) {
              updatePairPinyinRange(
                candidateTarget.paragraphIndex,
                candidateTarget.pairIndex,
                [{ pairIndex: 0, py }],
              );
            }
            setCandidateTarget(null);
          }}
          onManualEdit={() => {
            beginEdit(
              candidateTarget.paragraphIndex,
              candidateTarget.pairIndex,
            );
            setCandidateTarget(null);
          }}
          onClose={() => setCandidateTarget(null)}
        />
      )}

      <div className="preview-stats">
        <span>{paragraphs.length} 段</span>
        <span>{visibleAnnotationCount} 个注音字</span>
        <span>{countReviewRisks(paragraphs)} 个待核对</span>
        <span>{countBySource(paragraphs, "dual")} 个用户录入</span>
        <span>{countBySource(paragraphs, "manual")} 个人工修改</span>
      </div>
    </section>
  );
}
