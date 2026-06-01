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
import { useEditorStore } from "@/store/useEditorStore";
import { useHistory } from "@/hooks/useHistory";
import { usePrint } from "@/hooks/usePrint";
import { normalizeInput } from "@/lib/normalize";
import { splitPlainBlocks, buildDualParagraphs } from "@/lib/split";
import { applyTable, loadTable } from "@/lib/polyphone";
import { fixParticles } from "@/lib/particles";
import type { Paragraph } from "@/lib/types";

export default function Toolbar() {
  const input = useEditorStore((s) => s.input);
  const mode = useEditorStore((s) => s.mode);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const title = useEditorStore((s) => s.title);
  const currentId = useEditorStore((s) => s.currentId);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setParagraphs = useEditorStore((s) => s.setParagraphs);
  const setErr = useEditorStore((s) => s.setErr);
  const setCurrentId = useEditorStore((s) => s.setCurrentId);
  const setFontSize = useEditorStore((s) => s.setFontSize);
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
        next = splitPlainBlocks(normalized);
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
    save({
      id,
      ts: Date.now(),
      title,
      mode,
      sourceRaw: input,
      paragraphs,
    });
    setCurrentId(id);
    setErr(null);
  }

  function handleReset(): void {
    if (
      window.confirm("清空当前编辑器和已生成注音稿，确定吗？历史记录不受影响。")
    ) {
      reset();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 my-3">
      <button
        type="button"
        onClick={handleGenerate}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        生成
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={paragraphs.length === 0}
        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        保存到历史
      </button>
      <button
        type="button"
        onClick={goPrint}
        disabled={paragraphs.length === 0}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        打印 / 存 PDF
      </button>
      <button
        type="button"
        onClick={handleReset}
        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
      >
        清空
      </button>
      <label className="text-sm ml-2 inline-flex items-center gap-1">
        字号：
        <select
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="ml-1 border rounded px-2 py-1"
        >
          <option value={16}>小学 16px</option>
          <option value={20}>大班 20px</option>
          <option value={24}>小班 24px</option>
        </select>
      </label>
    </div>
  );
}
