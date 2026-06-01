/**
 * 历史下拉 + 快捷删除按钮。
 *
 * 行为：
 * - 记录按保存时间倒序（useHistory 内部已 unshift）
 * - 选一条 → 还原 input / mode / paragraphs / title / currentId
 * - 「删除」按钮只显示最近 5 条（避免横排爆行）
 *
 * 不做「清空全部」按钮：误删一条比误删全部代价小，保守起见让用户逐条删。
 */
import { useHistory } from "@/hooks/useHistory";
import { useEditorStore } from "@/store/useEditorStore";

export default function HistoryPanel() {
  const { records, remove, refresh } = useHistory();
  const setInput = useEditorStore((s) => s.setInput);
  const setMode = useEditorStore((s) => s.setMode);
  const setParagraphs = useEditorStore((s) => s.setParagraphs);
  const setCurrentId = useEditorStore((s) => s.setCurrentId);
  const setTitle = useEditorStore((s) => s.setTitle);

  if (records.length === 0) {
    return <p className="text-sm text-gray-500 my-2">暂无历史</p>;
  }

  function loadRecord(id: string): void {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    setInput(r.sourceRaw);
    setMode(r.mode);
    setParagraphs(r.paragraphs);
    setTitle(r.title);
    setCurrentId(r.id);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 my-2 text-sm">
      <span>历史：</span>
      <select
        onChange={(e) => {
          if (e.target.value) loadRecord(e.target.value);
          e.target.value = ""; // 让同一条目可以重复点
        }}
        defaultValue=""
        className="border rounded px-2 py-1"
      >
        <option value="">选择载入…</option>
        {records.map((r) => (
          <option key={r.id} value={r.id}>
            {new Date(r.ts).toLocaleString("zh-CN")} — {r.title}（{r.mode}）
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={refresh}
        className="text-gray-500 underline hover:text-gray-700"
      >
        刷新
      </button>
      <span className="text-gray-400 ml-2">删除：</span>
      {records.slice(0, 5).map((r) => (
        <button
          type="button"
          key={r.id}
          onClick={() => {
            if (window.confirm(`删除「${r.title}」？`)) remove(r.id);
          }}
          className="text-red-600 underline hover:text-red-800"
        >
          {r.title}
        </button>
      ))}
    </div>
  );
}
