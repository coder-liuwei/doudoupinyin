/**
 * 屏幕版预览。
 *
 * 容器 #previewInner 必须保留：print.css / PrintOnly 都通过这个 id 注入
 * 排版样式 + 套 A4 视觉，确保屏幕版和打印版视觉一致。
 *
 * 字号受 store.fontSize 控制（不是 viewport 自适应）—— 由用户主动选，
 * 三个档位：小学 16 / 大班 20 / 小班 24。
 */
import { useEditorStore } from "@/store/useEditorStore";
import { renderParagraphs } from "@/lib/render";

export default function Preview() {
  const paragraphs = useEditorStore((s) => s.paragraphs);
  const fontSize = useEditorStore((s) => s.fontSize);

  if (paragraphs.length === 0) {
    return (
      <p className="text-gray-400 text-sm mt-4">
        （还没有注音稿，点「生成」开始）
      </p>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mt-4">
      <p className="text-sm font-semibold mb-2 text-gray-600">预览（屏幕版）</p>
      <div id="previewInner" style={{ fontSize: `${fontSize}px` }}>
        {renderParagraphs(paragraphs)}
      </div>
    </div>
  );
}
