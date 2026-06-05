/**
 * 工具栏：生成 / 保存 / 打印 / 清空 / 字号。
 *
 * 「生成」是核心管道：normalize → split（按 mode） → polyphone → particles
 *   - plain 模式：splitPlainBlocks 给出已逐字 Pair 的段落
 *   - dual  模式：buildDualParagraphs 已带用户写好的拼音，无须再 pinyinOf
 *
 * polyphone 抛错不阻断：词表冲突属于「编辑/数据问题」，降级到默认注音
 * 让用户至少能看到注音稿 + 控制台告警。其它（双行格式错 / 输入空）会冒泡
 * 到 setErr，Editor 在输入源附近显示红字。
 */
import { useState } from "react";
import { Eraser, FileText, Printer, Save, Sparkles } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { useHistory } from "@/hooks/useHistory";
import { usePrint } from "@/hooks/usePrint";
import { normalizeInput } from "@/lib/normalize";
import { splitPlainBlocks, buildDualParagraphs } from "@/lib/split";
import { applyTable, loadTable } from "@/lib/polyphone";
import { fixParticles } from "@/lib/particles";
import { deriveTitleFromInput } from "@/lib/document";
import type { Paragraph } from "@/lib/types";

export default function Toolbar() {
  const [confirmClear, setConfirmClear] = useState(false);
  const input = useEditorStore((s) => s.input);
  const mode = useEditorStore((s) => s.mode);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const title = useEditorStore((s) => s.title);
  const currentId = useEditorStore((s) => s.currentId);
  const fontSize = useEditorStore((s) => s.fontSize);
  const lineHeight = useEditorStore((s) => s.lineHeight);
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const indentFirstLine = useEditorStore((s) => s.indentFirstLine);
  const showTitle = useEditorStore((s) => s.showTitle);
  const pageGuide = useEditorStore((s) => s.pageGuide);
  const setParagraphs = useEditorStore((s) => s.setParagraphs);
  const setErr = useEditorStore((s) => s.setErr);
  const setCurrentId = useEditorStore((s) => s.setCurrentId);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const setLineHeight = useEditorStore((s) => s.setLineHeight);
  const setLayoutMode = useEditorStore((s) => s.setLayoutMode);
  const setIndentFirstLine = useEditorStore((s) => s.setIndentFirstLine);
  const setShowTitle = useEditorStore((s) => s.setShowTitle);
  const setPageGuide = useEditorStore((s) => s.setPageGuide);
  const setTitle = useEditorStore((s) => s.setTitle);
  const reset = useEditorStore((s) => s.reset);

  const { save } = useHistory();
  const goPrint = usePrint();

  function handleGenerate(): void {
    setErr(null);
    try {
      const normalized = normalizeInput(input);
      let next: Paragraph[];
      if (mode === "plain") {
        // splitPlainBlocks 已逐字生成 Pair（含标点）
        next = splitPlainBlocks(normalized, { layoutMode });
      } else {
        // buildDualParagraphs 已对齐拼音/汉字格数并填好 py
        next = buildDualParagraphs(normalized);
      }
      if (next.length === 0) {
        setErr("输入为空或无法分段。");
        return;
      }
      // 铺平给 polyphone/particles 走 in-place 修改（引用共享，不影响 next 段结构）
      const flat = next.flat();
      const table = loadTable();
      try {
        applyTable(flat, normalized, table);
      } catch (e) {
        // 词表 override 区间冲突：降级到默认注音 + 提示
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
    <section className="workbench-card action-panel" aria-label="生成与打印设置">
      <div className="panel-heading">
        <span className="eyebrow">第 2 步</span>
        <h2>生成与打印</h2>
      </div>

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
          onClick={goPrint}
          disabled={paragraphs.length === 0}
          className="btn btn-ink"
        >
          <Printer size={17} />
          打印 / 存 PDF
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

      <div className="print-settings">
        <label>
          <span>字号</span>
          <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
            <option value={16}>小学 16px</option>
            <option value={20}>大班 20px</option>
            <option value={24}>小班 24px</option>
          </select>
        </label>
        <label>
          <span>行距</span>
          <select value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))}>
            <option value={1.9}>紧凑</option>
            <option value={2.15}>标准</option>
            <option value={2.45}>宽松</option>
          </select>
        </label>
        <label>
          <span>排版</span>
          <select
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value === "preserve" ? "preserve" : "auto")}
          >
            <option value="auto">自动排版</option>
            <option value="preserve">保留换行</option>
          </select>
        </label>
        <label>
          <span>纸面</span>
          <select
            value={pageGuide}
            onChange={(e) => setPageGuide(e.target.value === "grid" ? "grid" : "plain")}
          >
            <option value="plain">无格</option>
            <option value="grid">练字线</option>
          </select>
        </label>
        <label className="toggle-setting">
          <input
            type="checkbox"
            checked={indentFirstLine}
            onChange={(e) => setIndentFirstLine(e.target.checked)}
          />
          <span>首行缩进</span>
        </label>
        <label className="toggle-setting">
          <input
            type="checkbox"
            checked={showTitle}
            onChange={(e) => setShowTitle(e.target.checked)}
          />
          <span><FileText size={15} /> 显示标题</span>
        </label>
      </div>
    </section>
  );
}
