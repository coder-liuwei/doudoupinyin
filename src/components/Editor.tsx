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
import { useEditorStore } from "@/store/useEditorStore";
import { SAMPLE_BAIGUJING } from "@/lib/samples";

export default function Editor() {
  const input = useEditorStore((s) => s.input);
  const mode = useEditorStore((s) => s.mode);
  const err = useEditorStore((s) => s.err);
  const setInput = useEditorStore((s) => s.setInput);
  const setMode = useEditorStore((s) => s.setMode);
  const setErr = useEditorStore((s) => s.setErr);

  return (
    <div>
      <label className="block text-sm font-semibold mb-1" htmlFor="editor-input">
        正文（粘贴或编辑）
      </label>
      <textarea
        id="editor-input"
        className="w-full min-h-[180px] p-3 border border-gray-300 rounded-lg resize-y text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="把要注音的正文粘到这里…"
        spellCheck={false}
      />
      <div className="mt-3 flex items-center gap-4 flex-wrap">
        <label className="inline-flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="mode"
            checked={mode === "plain"}
            onChange={() => setMode("plain")}
          />
          <span className="text-sm">单行（自动注音）</span>
        </label>
        <label className="inline-flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="mode"
            checked={mode === "dual"}
            onChange={() => setMode("dual")}
          />
          <span className="text-sm">双行（拼音+汉字手稿）</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setInput(SAMPLE_BAIGUJING);
            setMode("plain");
            setErr(null);
          }}
          className="text-sm text-blue-600 underline ml-auto hover:text-blue-800"
        >
          加载示例（三打白骨精）
        </button>
      </div>
      {err && (
        <p className="text-red-700 text-sm mt-2 whitespace-pre-wrap" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
