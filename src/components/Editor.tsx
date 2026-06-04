/**
 * 正文输入框 + 单/双行模式切换。
 *
 * 行为对齐旧 pinyin-prince.html：
 * - 单行：纯汉字粘贴，自动逐字注音
 * - 双行：先粘拼音行再粘汉字行（中间空行），工具校验格数
 * - 「加载示例」一键填入白骨精文本并切回单行模式
 *
 * 受控于 useEditorStore：input 文本 / mode 模式 / err 错误信息。
 * 错误条 err 也在本组件底部展示，靠近输入源（避免页面顶部飘红）。
 */
import { useState } from "react";
import { BookOpen, FilePlus2, Wand2 } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { SAMPLE_BAIGUJING } from "@/lib/samples";
import { deriveTitleFromInput } from "@/lib/document";

export default function Editor() {
  const [confirmNew, setConfirmNew] = useState(false);
  const input = useEditorStore((s) => s.input);
  const mode = useEditorStore((s) => s.mode);
  const err = useEditorStore((s) => s.err);
  const title = useEditorStore((s) => s.title);
  const currentId = useEditorStore((s) => s.currentId);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const setInput = useEditorStore((s) => s.setInput);
  const setMode = useEditorStore((s) => s.setMode);
  const setErr = useEditorStore((s) => s.setErr);
  const setTitle = useEditorStore((s) => s.setTitle);
  const setCurrentId = useEditorStore((s) => s.setCurrentId);
  const reset = useEditorStore((s) => s.reset);
  const hasWork = input.trim().length > 0 || paragraphs.length > 0;

  function startNewDocument(): void {
    if (hasWork && !confirmNew) {
      setConfirmNew(true);
      return;
    }
    reset();
    setConfirmNew(false);
  }

  return (
    <section className="workbench-card editor-panel">
      <div className="panel-heading">
        <span className="eyebrow">第 1 步</span>
        <div>
          <h2>准备正文</h2>
          <p className="document-state">
            {currentId ? "已载入历史稿，可继续编辑或保存" : "新建稿件，输入正文后生成注音"}
          </p>
        </div>
        <button
          type="button"
          className={confirmNew ? "new-doc-button danger" : "new-doc-button"}
          onClick={startNewDocument}
        >
          <FilePlus2 size={15} />
          {confirmNew ? "确认新建" : "新建空白稿"}
        </button>
      </div>
      {confirmNew && (
        <p className="inline-warning">
          当前内容还没有保存；再次点击“确认新建”会清空编辑区。
        </p>
      )}

      <label className="field-label" htmlFor="doc-title">
        文档标题
      </label>
      <input
        id="doc-title"
        className="title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (!title.trim()) setTitle(deriveTitleFromInput(input));
        }}
        placeholder="例如：小马过河注音稿"
      />

      <div className="mode-tabs" role="radiogroup" aria-label="注音模式">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "plain"}
          className={mode === "plain" ? "active" : ""}
          onClick={() => setMode("plain")}
        >
          <Wand2 size={16} />
          自动注音
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "dual"}
          className={mode === "dual" ? "active" : ""}
          onClick={() => setMode("dual")}
        >
          <BookOpen size={16} />
          双行手稿
        </button>
      </div>

      <label className="field-label" htmlFor="editor-input">
        正文（粘贴或编辑）
      </label>
      <textarea
        id="editor-input"
        className="source-textarea"
        value={input}
        onChange={(e) => {
          const next = e.target.value;
          setInput(next);
          setCurrentId(null);
          if (!title.trim() || title === "未命名") {
            setTitle(deriveTitleFromInput(next));
          }
        }}
        placeholder={
          mode === "plain"
            ? "把要注音的正文粘到这里..."
            : "先粘拼音行，再粘对应汉字行。每个汉字用空格分开。"
        }
        spellCheck={false}
      />

      <div className="editor-foot">
        <span>{Array.from(input).filter((ch) => /[\u4e00-\u9fff]/.test(ch)).length} 个汉字</span>
        <button
          type="button"
          onClick={() => {
            setInput(SAMPLE_BAIGUJING);
            setMode("plain");
            setTitle("三打白骨精注音稿");
            setCurrentId(null);
            setErr(null);
          }}
          className="text-link"
        >
          加载示例（三打白骨精）
        </button>
      </div>

      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
    </section>
  );
}
