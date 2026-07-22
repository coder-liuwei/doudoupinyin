import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Paragraph, HistoryRecord, PrintSettings } from "@/lib/types";
import { renderParagraphs } from "@/lib/render";
import { loadHistory } from "@/lib/history";
import { normalizePrintSettings } from "@/lib/print-settings";
import {
  annotationSettingsFromRecord,
  normalizeAnnotationSettings,
  type AnnotationSettings,
} from "@/lib/annotation";

/**
 * 打印专用容器。
 * - 套 A4 视觉容器 (#previewInner)
 * - 屏幕上的「返回 / 打印」按钮带 .no-print，@media print 时隐藏
 * - 数据来源优先级：sessionStorage (usePrint 临时存) > localStorage (用户已保存)
 */
export default function PrintOnly() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [data, setData] = useState<{
    paragraphs: Paragraph[];
    title: string;
    annotationSettings: AnnotationSettings;
  } & PrintSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("缺少 id 参数");
      return;
    }

    // 1. 优先查 sessionStorage：里面包含当前打印设置。
    const temp = sessionStorage.getItem("pinyinPrince.print-temp");
    if (temp) {
      try {
        const parsed = JSON.parse(temp) as {
          id?: string;
          paragraphs?: Paragraph[];
          title?: string;
          printSettings?: Partial<PrintSettings>;
          fontSize?: number;
          lineHeight?: number;
          letterSpacing?: number;
          layoutMode?: string;
          indentFirstLine?: boolean;
          showTitle?: boolean;
          pageGuide?: string;
          annotationSettings?: unknown;
        };
        if (parsed && parsed.id === id && Array.isArray(parsed.paragraphs)) {
          const legacySettings = parsed.printSettings ?? {
            fontSize: parsed.fontSize,
            lineHeight: parsed.lineHeight,
            letterSpacing: parsed.letterSpacing,
            layoutMode: parsed.layoutMode,
            indentFirstLine: parsed.indentFirstLine,
            showTitle: parsed.showTitle,
            pageGuide: parsed.pageGuide,
          };
          setData({
            paragraphs: parsed.paragraphs,
            title: parsed.title ?? "",
            ...normalizePrintSettings(legacySettings),
            annotationSettings: normalizeAnnotationSettings(
              parsed.annotationSettings,
              parsed.paragraphs,
            ),
          });
          return;
        }
      } catch {
        // ignore 解析错误
      }
    }

    // 2. 否则查 localStorage（用户已保存的）
    try {
      const schema = loadHistory();
      const found = schema.records.find((r: HistoryRecord) => r.id === id);
      if (found) {
        setData({
          paragraphs: found.paragraphs,
          title: found.title,
          ...normalizePrintSettings(found.printSettings),
          annotationSettings: annotationSettingsFromRecord(found),
        });
        return;
      }
    } catch {
      // lib/history 尚未就绪或抛错，继续往下走缺省态
    }

    setError(`找不到 id=${id} 的文档`);
  }, [id]);

  if (error) {
    return (
      <main className="print-page" style={{ padding: 24, fontFamily: "sans-serif" }}>
        <h1>无法打开打印视图</h1>
        <p>{error}</p>
        <Link to="/" className="no-print">返回首页</Link>
      </main>
    );
  }

  if (!data) {
    return <main className="print-page" style={{ padding: 24 }}>加载中…</main>;
  }

  return (
    <main className="print-page">
      {/* 屏幕上的返回/打印按钮，打印时隐藏 */}
      <div className="print-actions no-print">
        <Link to="/" className="print-back-action">← 返回</Link>
        <button onClick={() => window.print()}>打印 / 存为 PDF</button>
      </div>

      <div
        id="previewInner"
        className={[
          data.pageGuide === "grid" ? "practice-grid" : "",
          `layout-${data.layoutMode}`,
          data.indentFirstLine ? "first-indent" : "no-first-indent",
        ].filter(Boolean).join(" ")}
        style={{
          fontSize: data.fontSize,
          lineHeight: data.lineHeight,
          ["--ruby-unit-gap" as string]: `${data.letterSpacing}px`,
        }}
      >
        {data.showTitle && (
          <h1 style={{ textAlign: "center", fontSize: "1.2em", marginBottom: 16 }}>{data.title}</h1>
        )}
        {renderParagraphs(data.paragraphs, data.annotationSettings)}
      </div>
    </main>
  );
}
