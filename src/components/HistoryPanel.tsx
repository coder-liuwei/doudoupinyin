import { useState } from "react";
import { Clock, Edit3, FileText, FolderOpen, RotateCw, Trash2 } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { useEditorStore } from "@/store/useEditorStore";
import { countAnnotatedChars } from "@/lib/document";
import { applyPrintSettingsToStore } from "@/lib/print-settings";
import { annotationSettingsFromRecord } from "@/lib/annotation";

export default function HistoryPanel() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { records, remove, rename, refresh } = useHistory();
  const setInput = useEditorStore((s) => s.setInput);
  const setMode = useEditorStore((s) => s.setMode);
  const setParagraphs = useEditorStore((s) => s.setParagraphs);
  const setCurrentId = useEditorStore((s) => s.setCurrentId);
  const setTitle = useEditorStore((s) => s.setTitle);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const setLineHeight = useEditorStore((s) => s.setLineHeight);
  const setLetterSpacing = useEditorStore((s) => s.setLetterSpacing);
  const setLayoutMode = useEditorStore((s) => s.setLayoutMode);
  const setIndentFirstLine = useEditorStore((s) => s.setIndentFirstLine);
  const setShowTitle = useEditorStore((s) => s.setShowTitle);
  const setPageGuide = useEditorStore((s) => s.setPageGuide);
  const setAnnotationSettings = useEditorStore((s) => s.setAnnotationSettings);

  function loadRecord(id: string): void {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    setInput(r.sourceRaw);
    setMode(r.mode);
    setParagraphs(r.paragraphs);
    setTitle(r.title);
    setCurrentId(r.id);
    setAnnotationSettings(annotationSettingsFromRecord(r));
    applyPrintSettingsToStore(r.printSettings ?? {}, {
      setFontSize,
      setLineHeight,
      setLetterSpacing,
      setLayoutMode,
      setIndentFirstLine,
      setShowTitle,
      setPageGuide,
    });
  }

  return (
    <section className="history-dock" aria-label="历史记录">
      <div className="history-head">
        <div>
          <span className="eyebrow">历史</span>
          <h2>历史记录</h2>
        </div>
        <button type="button" className="icon-button" onClick={refresh} aria-label="刷新历史">
          <RotateCw size={16} />
        </button>
      </div>

      {records.length === 0 ? (
        <div className="empty-history">
          <FileText size={18} />
          <span>保存过的注音稿会出现在这里；新稿请在右侧输入。</span>
        </div>
      ) : (
        <div className="history-list">
          {records.map((r) => (
            <article className="history-item" key={r.id}>
              <div className="history-main">
                {editingId === r.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      rename(r.id, draftTitle);
                      setEditingId(null);
                    }}
                  >
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      autoFocus
                    />
                    <button type="submit">保存</button>
                  </form>
                ) : (
                  <>
                    <h3 className="history-title">{r.title}</h3>
                    <p>
                      <Clock size={13} />
                      {new Date(r.ts).toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span>{r.mode === "plain" ? "自动注音" : "双行手稿"}</span>
                      <span>{countAnnotatedChars(r.paragraphs)} 字</span>
                    </p>
                  </>
                )}
              </div>
              <div className="history-actions">
                <button
                  type="button"
                  className="history-open"
                  aria-label={`打开 ${r.title}`}
                  onClick={() => loadRecord(r.id)}
                >
                  <FolderOpen size={15} />
                  打开
                </button>
                <button
                  type="button"
                  aria-label={`重命名 ${r.title}`}
                  onClick={() => {
                    setEditingId(r.id);
                    setDraftTitle(r.title);
                    setPendingDeleteId(null);
                  }}
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`删除 ${r.title}`}
                  onClick={() => setPendingDeleteId(r.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {pendingDeleteId === r.id && (
                <div className="history-confirm">
                  <span>删除这条历史？</span>
                  <button type="button" onClick={() => remove(r.id)}>删除</button>
                  <button type="button" onClick={() => setPendingDeleteId(null)}>取消</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
