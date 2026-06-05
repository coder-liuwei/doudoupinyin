import { useState } from "react";
import { Eraser, Save, Sparkles } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { useHistory } from "@/hooks/useHistory";
import { normalizeInput } from "@/lib/normalize";
import { splitPlainBlocks, buildDualParagraphs } from "@/lib/split";
import { applyTable, loadTable } from "@/lib/polyphone";
import { fixParticles } from "@/lib/particles";
import { deriveTitleFromInput } from "@/lib/document";
import type { Paragraph } from "@/lib/types";

export default function ActionPanel() {
  const [confirmClear, setConfirmClear] = useState(false);
  const input = useEditorStore((s) => s.input);
  const mode = useEditorStore((s) => s.mode);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const title = useEditorStore((s) => s.title);
  const currentId = useEditorStore((s) => s.currentId);
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const setParagraphs = useEditorStore((s) => s.setParagraphs);
  const setErr = useEditorStore((s) => s.setErr);
  const setCurrentId = useEditorStore((s) => s.setCurrentId);
  const setTitle = useEditorStore((s) => s.setTitle);
  const reset = useEditorStore((s) => s.reset);

  const { save } = useHistory();

  function handleGenerate(): void {
    setErr(null);
    try {
      const normalized = normalizeInput(input);
      let next: Paragraph[];
      if (mode === "plain") {
        next = splitPlainBlocks(normalized, { layoutMode });
      } else {
        next = buildDualParagraphs(normalized);
      }
      if (next.length === 0) {
        setErr("输入为空或无法分段。");
        return;
      }
      const flat = next.flat();
      const table = loadTable();
      try {
        applyTable(flat, normalized, table);
      } catch (e) {
        console.warn("polyphone:", e);
        setErr(
          "多音字词表冲突，已降级到默认注音：" +
            (e instanceof Error ? e.message : String(e)),
        );
      }
      fixParticles(flat);
      setParagraphs(next);
      if (!title.trim() || title === "未命名") {
        setTitle(deriveTitleFromInput(normalized));
      }
      setCurrentId(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  function handleSave(): void {
    if (paragraphs.length === 0) {
      setErr("请先生成注音稿");
      return;
    }
    const id = currentId ?? `rec-${Date.now()}`;
    const nextTitle = title.trim() || deriveTitleFromInput(input);
    save({
      id,
      ts: Date.now(),
      title: nextTitle,
      mode,
      sourceRaw: input,
      paragraphs,
    });
    setTitle(nextTitle);
    setCurrentId(id);
    setErr(null);
  }

  function handleReset(): void {
    reset();
    setConfirmClear(false);
  }

  return (
    <section className="workbench-card action-panel" aria-label="生成与管理">
      <div className="action-grid">
        <button type="button" onClick={handleGenerate} className="btn btn-primary">
          <Sparkles size={18} />
          生成注音
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={paragraphs.length === 0}
          className="btn btn-secondary"
        >
          <Save size={17} />
          保存到历史
        </button>
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          className="btn btn-quiet"
        >
          <Eraser size={17} />
          清空
        </button>
      </div>

      {confirmClear && (
        <div className="confirm-strip" role="alert">
          <span>清空当前编辑器和预览？历史记录不受影响。</span>
          <button type="button" onClick={handleReset}>确认清空</button>
          <button type="button" onClick={() => setConfirmClear(false)}>取消</button>
        </div>
      )}
    </section>
  );
}
