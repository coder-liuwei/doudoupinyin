/**
 * 主页布局：把 Editor / Toolbar / Preview / History / PdfImport / DualHelp
 * 按「上 → 下」的认知顺序串起来：
 *
 *   1. 标题（让用户一眼知道在哪）
 *   2. HistoryPanel（载入旧稿是最常见的入口）
 *   3. Toolbar（操作区，常驻可见）
 *   4. Editor（输入源）
 *   5. DualHelp（双行模式解释，按需展开）
 *   6. PdfImport（辅助导入，靠 Editor 近）
 *   7. Preview（最终结果，最下方）
 *
 * max-w-4xl 适配 A4 排版在屏幕上预览的视觉宽度，mx-auto 居中。
 */
import Editor from "@/components/Editor";
import Toolbar from "@/components/Toolbar";
import Preview from "@/components/Preview";
import HistoryPanel from "@/components/HistoryPanel";
import PdfImport from "@/components/PdfImport";
import DualHelp from "@/components/DualHelp";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold m-0">拼音王子</h1>
        <p className="text-sm text-gray-500 m-0">
          粘贴正文，生成注音稿，保存为 PDF 打印。
        </p>
      </header>
      <HistoryPanel />
      <Toolbar />
      <Editor />
      <DualHelp />
      <PdfImport />
      <Preview />
    </div>
  );
}
