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
import { Check, MousePointer2, PencilLine, X } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { Ruby } from "@/lib/render";
import { countAnnotatedChars } from "@/lib/document";

const SUSPECT_CHARS = new Set("行长得地了着还重种为都教觉调处散血");

export default function Preview() {
  const [editing, setEditing] = useState<{
    paragraphIndex: number;
    pairIndex: number;
    value: string;
  } | null>(null);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const fontSize = useEditorStore((s) => s.fontSize);
  const lineHeight = useEditorStore((s) => s.lineHeight);
  const showTitle = useEditorStore((s) => s.showTitle);
  const pageGuide = useEditorStore((s) => s.pageGuide);
  const title = useEditorStore((s) => s.title);
  const updatePairPinyin = useEditorStore((s) => s.updatePairPinyin);

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
        <p>
          <MousePointer2 size={14} />
          点击拼音可修改，红点字建议重点检查
        </p>
      </div>

      <div
        className={`paper-sheet ${pageGuide === "grid" ? "practice-grid" : ""}`}
        style={{ ["--preview-font-size" as string]: `${fontSize}px`, ["--preview-line-height" as string]: lineHeight }}
      >
        {showTitle && <h1 className="paper-title">{title}</h1>}
        <div id="previewInner" className="screen-preview">
          {paragraphs.map((paragraph, paragraphIndex) => (
            <p className="line" key={paragraphIndex}>
              {paragraph.map((pair, pairIndex) => {
                const isEditing =
                  editing?.paragraphIndex === paragraphIndex &&
                  editing.pairIndex === pairIndex;
                const isSuspect = !pair.isPunct && SUSPECT_CHARS.has(pair.ch);
                if (isEditing) {
                  return (
                    <span className="unit edit-unit" key={pairIndex}>
                      <span className="edit-char">{pair.ch}</span>
                      <input
                        value={editing.value}
                        autoFocus
                        onChange={(e) =>
                          setEditing({ ...editing, value: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updatePairPinyin(
                              paragraphIndex,
                              pairIndex,
                              editing.value.trim() || null,
                            );
                            setEditing(null);
                          }
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                      <button
                        type="button"
                        aria-label="保存拼音"
                        onClick={() => {
                          updatePairPinyin(
                            paragraphIndex,
                            pairIndex,
                            editing.value.trim() || null,
                          );
                          setEditing(null);
                        }}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="取消编辑"
                        onClick={() => setEditing(null)}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                }
                return (
                  <span
                    key={pairIndex}
                    className={isSuspect ? "proof-unit suspect" : "proof-unit"}
                    role={pair.py ? "button" : undefined}
                    tabIndex={pair.py ? 0 : undefined}
                    onClick={() => {
                      if (pair.py) {
                        setEditing({ paragraphIndex, pairIndex, value: pair.py });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (pair.py && (e.key === "Enter" || e.key === " ")) {
                        setEditing({ paragraphIndex, pairIndex, value: pair.py });
                      }
                    }}
                  >
                    <Ruby ch={pair.ch} py={pair.py} />
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      </div>

      <div className="preview-stats">
        <span>{paragraphs.length} 段</span>
        <span>{countAnnotatedChars(paragraphs)} 个注音字</span>
      </div>
    </section>
  );
}
