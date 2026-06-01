/**
 * pdfjs-dist 包装：从用户选定的 PDF File 中抽出可读纯文本。
 *
 * 行为对齐旧 pinyin-prince.html 的 extractPdfFullText：
 * - 按页顺序逐页 getTextContent
 * - items 按 y（transform[5]，自上而下）→ x（transform[4]，自左而右）排序
 * - hasEOL 触发 \n；连续 \n{3,} 折叠为 \n\n；前后 trim
 * - 页间以 \n\n 分隔
 *
 * 错误一律抛 `Error("PDF 抽取失败: ...")`，让上层 toast 提示。
 */
import * as pdfjs from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

// Vite 推荐的 worker 配置：用 import.meta.url 让 Vite 把 worker 当资源打包。
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function textFromPageItems(items: TextItem[]): string {
  const sorted = items.slice().sort((a, b) => {
    const ay = a.transform?.[5] ?? 0;
    const by = b.transform?.[5] ?? 0;
    if (Math.abs(ay - by) > 4) return by - ay; // y 大 = 上方，优先
    const ax = a.transform?.[4] ?? 0;
    const bx = b.transform?.[4] ?? 0;
    return ax - bx;
  });
  let buf = "";
  for (const it of sorted) {
    buf += it.str != null ? String(it.str) : "";
    if (it.hasEOL === true) buf += "\n";
  }
  return buf
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function sanitizeWholeText(body: string): string {
  let t = String(body || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

export async function extractPdfText(file: File): Promise<string> {
  try {
    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const total = pdf.numPages;
    const chunks: string[] = [];
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const items = (tc.items as TextItem[]) || [];
      chunks.push(textFromPageItems(items));
    }
    return sanitizeWholeText(chunks.join("\n\n"));
  } catch (e) {
    throw new Error("PDF 抽取失败: " + ((e as Error).message || String(e)));
  }
}
