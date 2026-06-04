import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Paragraph, HistoryRecord } from "@/lib/types";
import { renderParagraphs } from "@/lib/render";
import { loadHistory } from "@/lib/history";

/**
 * 打印专用容器。
 * - 套 A4 视觉容器 (#previewInner)
 * - 屏幕上的「返回 / 打印」按钮带 .no-print，@media print 时隐藏
 * - 数据来源优先级：localStorage (用户已保存) > sessionStorage (usePrint 临时存)
 */
export default function PrintOnly() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [data, setData] = useState<{
    paragraphs: Paragraph[];
    title: string;
    fontSize: number;
    lineHeight: number;
    showTitle: boolean;
    pageGuide: "plain" | "grid";
  } | null>(null);
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
        const parsed = JSON.parse(temp);
        if (parsed && parsed.id === id && Array.isArray(parsed.paragraphs)) {
          setData({
            paragraphs: parsed.paragraphs,
            title: parsed.title ?? "",
            fontSize: Number(parsed.fontSize) || 19,
            lineHeight: Number(parsed.lineHeight) || 2.15,
            showTitle: parsed.showTitle !== false,
            pageGuide: parsed.pageGuide === "grid" ? "grid" : "plain",
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
          fontSize: 19,
          lineHeight: 2.15,
          showTitle: true,
          pageGuide: "plain",
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
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <h1>无法打开打印视图</h1>
        <p>{error}</p>
        <a href="/" className="no-print">返回首页</a>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: 24 }}>加载中…</div>;
  }

  return (
    <>
      {/* 屏幕上的返回/打印按钮，打印时隐藏 */}
      <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 10 }}>
        <a href="/" style={{ marginRight: 8 }}>← 返回</a>
        <button onClick={() => window.print()}>打印 / 存为 PDF</button>
      </div>

      <div
        id="previewInner"
        className={data.pageGuide === "grid" ? "practice-grid" : undefined}
        style={{ fontSize: data.fontSize, lineHeight: data.lineHeight }}
      >
        {data.showTitle && (
          <h1 style={{ textAlign: "center", fontSize: "1.2em", marginBottom: 16 }}>{data.title}</h1>
        )}
        {/* Agent A 的 renderParagraphs 导出会渲染 .line 段落 */}
        {renderParagraphs(data.paragraphs)}
      </div>
    </>
  );
}
