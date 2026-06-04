/**
 * 从 PDF 抽取正文 → 注入 Editor。pdfjs-dist 体积较大，上传时动态加载。
 */
import { useState, type ChangeEvent } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { toast } from "sonner";

export default function PdfImport() {
  const setInput = useEditorStore((s) => s.setInput);
  const setMode = useEditorStore((s) => s.setMode);
  const setErr = useEditorStore((s) => s.setErr);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setFileName(file.name);
    setLastError(null);
    setLastCount(null);
    try {
      const { extractPdfText } = await import("@/lib/pdf-extract");
      const text = await extractPdfText(file);
      setInput(text);
      setMode("plain");
      setErr(null);
      setLastCount(text.length);
      toast.success(`已抽取 ${text.length} 字`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLastError(message);
      toast.error(`PDF 抽取失败: ${message}`);
    } finally {
      setBusy(false);
      e.target.value = ""; // 允许重复上传同一文件
    }
  }

  return (
    <section className="workbench-card import-card">
      <div className="panel-heading">
        <span className="eyebrow">导入</span>
        <h2>PDF 抽取</h2>
      </div>
      <label className={busy ? "upload-drop busy" : "upload-drop"}>
        <input type="file" accept="application/pdf" onChange={onFile} disabled={busy} />
        {busy ? <Loader2 className="spin" size={24} /> : <FileUp size={24} />}
        <span>{busy ? "正在抽取文本..." : "选择 PDF 文件"}</span>
        <small>适合把课文 PDF 先转成可编辑正文</small>
      </label>
      {fileName && (
        <p className="import-status">
          {fileName}
          {lastCount !== null && <span> · 已抽取 {lastCount} 字</span>}
        </p>
      )}
      {lastError && <p className="import-error">{lastError}</p>}
    </section>
  );
}
