/**
 * 触发打印路由跳转。
 *
 * 行为：
 * - 若编辑器有 currentId（用户已载入/保存过某条历史），打印视图按 id 从 localStorage 取。
 * - 否则生成 temp-{ts} 临时 id，把当前 paragraphs/title 写进 sessionStorage
 *   让 /print 路由读出来——单次打印，刷新即丢，不污染历史。
 *
 * 走 window.location.assign 而非 react-router 的 navigate：触发完整页面导航，
 * 打印页可以完全脱壳（Agent C 的 PrintOnly 容器会另挂样式）。
 */
import { useEditorStore } from "@/store/useEditorStore";
import type { LayoutMode, Paragraph } from "@/lib/types";

const TEMP_KEY = "pinyinPrince.print-temp";

interface TempPayload {
  id: string;
  paragraphs: Paragraph[];
  title: string;
  fontSize: number;
  lineHeight: number;
  layoutMode: LayoutMode;
  indentFirstLine: boolean;
  showTitle: boolean;
  pageGuide: "plain" | "grid";
}

export function usePrint(): () => void {
  const currentId = useEditorStore((s) => s.currentId);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const title = useEditorStore((s) => s.title);
  const fontSize = useEditorStore((s) => s.fontSize);
  const lineHeight = useEditorStore((s) => s.lineHeight);
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const indentFirstLine = useEditorStore((s) => s.indentFirstLine);
  const showTitle = useEditorStore((s) => s.showTitle);
  const pageGuide = useEditorStore((s) => s.pageGuide);

  return function go() {
    const id = currentId ?? `temp-${Date.now()}`;
    const payload: TempPayload = {
      id,
      paragraphs,
      title,
      fontSize,
      lineHeight,
      layoutMode,
      indentFirstLine,
      showTitle,
      pageGuide,
    };
    try {
      sessionStorage.setItem(TEMP_KEY, JSON.stringify(payload));
    } catch {
      // 写入失败不阻塞跳转；Print 路由会按缺省态降级
    }
    window.location.assign(`/print?id=${encodeURIComponent(id)}`);
  };
}
