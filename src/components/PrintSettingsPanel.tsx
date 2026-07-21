import { FileText } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";

export default function PrintSettingsPanel() {
  const fontSize = useEditorStore((s) => s.fontSize);
  const lineHeight = useEditorStore((s) => s.lineHeight);
  const letterSpacing = useEditorStore((s) => s.letterSpacing);
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const indentFirstLine = useEditorStore((s) => s.indentFirstLine);
  const showTitle = useEditorStore((s) => s.showTitle);
  const pageGuide = useEditorStore((s) => s.pageGuide);
  const annotationMode = useEditorStore((s) => s.annotationMode);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const setLineHeight = useEditorStore((s) => s.setLineHeight);
  const setLetterSpacing = useEditorStore((s) => s.setLetterSpacing);
  const setLayoutMode = useEditorStore((s) => s.setLayoutMode);
  const setIndentFirstLine = useEditorStore((s) => s.setIndentFirstLine);
  const setShowTitle = useEditorStore((s) => s.setShowTitle);
  const setPageGuide = useEditorStore((s) => s.setPageGuide);
  const setAnnotationMode = useEditorStore((s) => s.setAnnotationMode);

  return (
    <section className="workbench-card settings-panel" aria-label="打印设置">
      <div className="panel-heading compact-heading">
        <span className="eyebrow">设置</span>
        <h2>打印设置</h2>
      </div>

      <div className="print-settings">
        <div className="annotation-setting" role="group" aria-label="注音范围">
          <span>注音范围</span>
          <div className="annotation-mode-buttons">
            {([
              ["full", "全文注音"],
              ["risk", "风险字"],
              ["manual", "手动选择"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={annotationMode === value}
                onClick={() => setAnnotationMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
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
          <span>字间距</span>
          <select
            value={letterSpacing}
            onChange={(e) => setLetterSpacing(Number(e.target.value))}
          >
            <option value={0}>贴紧</option>
            <option value={2}>标准</option>
            <option value={4}>宽松</option>
            <option value={6}>更宽</option>
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
            <option value="grid">字格线</option>
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
