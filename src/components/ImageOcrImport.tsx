import { useState, type ChangeEvent } from "react";
import { Camera, ImageUp, Loader2, ShieldCheck } from "lucide-react";
import { deriveTitleFromInput } from "@/lib/document";
import { mergeImportedText, validateImageFile } from "@/lib/image-import";
import { recognizeImageText } from "@/lib/image-ocr";
import { useEditorStore } from "@/store/useEditorStore";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export default function ImageOcrImport() {
  const input = useEditorStore((s) => s.input);
  const title = useEditorStore((s) => s.title);
  const setInput = useEditorStore((s) => s.setInput);
  const setMode = useEditorStore((s) => s.setMode);
  const setTitle = useEditorStore((s) => s.setTitle);
  const setCurrentId = useEditorStore((s) => s.setCurrentId);
  const setErr = useEditorStore((s) => s.setErr);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("正在准备识别");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResult("");
    setProgress(0);

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setBusy(true);
    try {
      const text = await recognizeImageText(file, (next) => {
        setProgressStatus(next.status);
        setProgress(next.progress);
      });
      setResult(text);
      setProgress(1);
      setProgressStatus("识别完成，请校对文字");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function writeToEditor(nextInput: string): void {
    setInput(nextInput);
    setMode("plain");
    setCurrentId(null);
    setErr(null);
    if (!title.trim() || title === "未命名") {
      setTitle(deriveTitleFromInput(nextInput));
    }
  }

  const hasExistingInput = input.trim().length > 0;

  return (
    <section className="workbench-card image-ocr-card">
      <div className="panel-heading">
        <span className="eyebrow">导入</span>
        <div>
          <h2>图片识字</h2>
          <p className="document-state">拍课文或选择图片，在本机提取成可编辑文字</p>
        </div>
      </div>

      <div className="image-ocr-actions">
        <label className={busy ? "image-ocr-picker disabled" : "image-ocr-picker"}>
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            capture="environment"
            aria-label="拍照识别"
            onChange={onFile}
            disabled={busy}
          />
          <Camera size={22} />
          <span>拍照识别</span>
        </label>
        <label className={busy ? "image-ocr-picker disabled" : "image-ocr-picker"}>
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            aria-label="上传图片"
            onChange={onFile}
            disabled={busy}
          />
          <ImageUp size={22} />
          <span>上传图片</span>
        </label>
      </div>

      <p className="image-ocr-privacy">
        <ShieldCheck size={15} />
        图片仅在当前设备识别，不会上传；首次使用需下载中文识别模型。
      </p>
      <p className="image-ocr-tip">建议保持页面平整、光线均匀、文字清晰，避免阴影和倾斜。</p>

      {busy && (
        <div className="image-ocr-progress" aria-live="polite">
          <div className="image-ocr-progress-label">
            <span>
              <Loader2 className="spin" size={15} />
              {progressStatus}
            </span>
            <strong>{Math.round(progress * 100)}%</strong>
          </div>
          <div className="image-ocr-progress-track">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}

      {fileName && !busy && (
        <p className="import-status">{fileName}</p>
      )}

      {error && (
        <p className="import-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="image-ocr-review">
          <label className="field-label" htmlFor="image-ocr-result">
            识别结果
          </label>
          <textarea
            id="image-ocr-result"
            className="image-ocr-result"
            value={result}
            onChange={(event) => setResult(event.target.value)}
            spellCheck={false}
          />
          <p className="image-ocr-tip">请先核对错字和段落，再放入正文。</p>
          <div className="image-ocr-result-actions">
            {hasExistingInput ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => writeToEditor(mergeImportedText(input, result))}
                >
                  追加到正文
                </button>
                <button
                  type="button"
                  className="btn image-ocr-replace"
                  onClick={() => writeToEditor(result)}
                >
                  替换正文
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => writeToEditor(result)}
              >
                填入正文
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
