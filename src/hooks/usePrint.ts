/**
 * 触发打印路由跳转。
 *
 * 行为：
 * - 若编辑器有 currentId（用户已载入/保存过某条历史），打印视图按 id 从 localStorage 取。
 * - 否则生成 temp-{ts} 临时 id，把当前 paragraphs/title 写进 sessionStorage
 *   让 /print 路由读出来——单次打印，刷新即丢，不污染历史。
 *
 * 使用应用内路由进入打印页，避免嵌入式浏览器忽略 location.assign。
 * `/print` 路由只渲染 PrintOnly，并单独挂载打印样式。
 */
import { useNavigate } from "react-router-dom";
import { useEditorStore } from "@/store/useEditorStore";
import { printSettingsFromStore } from "@/lib/print-settings";
import type { Paragraph, PrintSettings } from "@/lib/types";
import type { AnnotationSettings } from "@/lib/annotation";

const TEMP_KEY = "pinyinPrince.print-temp";

interface TempPayload {
  id: string;
  paragraphs: Paragraph[];
  title: string;
  printSettings: PrintSettings;
  annotationSettings: AnnotationSettings;
}

export function usePrint(): () => void {
  const navigate = useNavigate();
  const currentId = useEditorStore((s) => s.currentId);
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const title = useEditorStore((s) => s.title);
  const fontSize = useEditorStore((s) => s.fontSize);
  const lineHeight = useEditorStore((s) => s.lineHeight);
  const letterSpacing = useEditorStore((s) => s.letterSpacing);
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const indentFirstLine = useEditorStore((s) => s.indentFirstLine);
  const showTitle = useEditorStore((s) => s.showTitle);
  const pageGuide = useEditorStore((s) => s.pageGuide);
  const annotationMode = useEditorStore((s) => s.annotationMode);
  const manualAnnotationKeys = useEditorStore((s) => s.manualAnnotationKeys);

  return function go() {
    const id = currentId ?? `temp-${Date.now()}`;
    const payload: TempPayload = {
      id,
      paragraphs,
      title,
      printSettings: printSettingsFromStore({
        fontSize,
        lineHeight,
        letterSpacing,
        layoutMode,
        indentFirstLine,
        showTitle,
        pageGuide,
      }),
      annotationSettings: {
        mode: annotationMode,
        manualKeys: manualAnnotationKeys,
      },
    };
    try {
      sessionStorage.setItem(TEMP_KEY, JSON.stringify(payload));
    } catch {
      // 写入失败不阻塞跳转；Print 路由会按缺省态降级
    }
    navigate(`/print?id=${encodeURIComponent(id)}`);
  };
}
