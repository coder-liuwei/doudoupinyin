/**
 * 从 PDF 抽取正文 → 注入 Editor。
 *
 * 走 sonner toast 反馈：成功「已抽取 N 字」、失败展示 lib/pdf-extract 包装后的错误。
 * 抽取完成后清空 input.value，方便用户重复上传同一文件（浏览器 change 不会重复触发）。
 *
 * 强制切到 plain 模式：PDF 抽出来的内容是连续文本，没有「拼音+汉字」双行结构。
 */
import { useState, type ChangeEvent } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { extractPdfText } from "@/lib/pdf-extract";
import { toast } from "sonner";

export default function PdfImport() {
  const setInput = useEditorStore((s) => s.setInput);
  const setMode = useEditorStore((s) => s.setMode);
  const [busy, setBusy] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await extractPdfText(file);
      setInput(text);
      setMode("plain");
      toast.success(`已抽取 ${text.length} 字`);
    } catch (err) {
      toast.error(
        `PDF 抽取失败: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBusy(false);
      e.target.value = ""; // 允许重复上传同一文件
    }
  }

  return (
    <label
      className={
        "inline-flex items-center gap-1 cursor-pointer text-sm text-blue-600 underline my-2 hover:text-blue-800 " +
        (busy ? "opacity-50 pointer-events-none" : "")
      }
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={onFile}
        disabled={busy}
        className="hidden"
      />
      {busy ? "抽取中…" : "从 PDF 抽取正文"}
    </label>
  );
}
