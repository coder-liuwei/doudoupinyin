/**
 * 主页布局：把 ModePanel / Editor / ActionPanel / Preview / History / PdfImport / DualHelp
 * 按「上 → 下」的认知顺序串起来：
 *
 *   1. 标题（让用户一眼知道在哪）
 *   2. HistoryPanel（载入旧稿是最常见的入口）
 *   3. ModePanel（注音模式切换）
 *   4. Editor（输入源）
 *   5. ActionPanel（生成/保存/清空）
 *   5. ActionPanel（生成/保存/清空）
 *   6. PrintSettingsPanel（打印设置）
 *   7. DualHelp（双行模式解释，按需展开）
 *   8. PdfImport（辅助导入，靠 Editor 近）
 *   9. Preview（最终结果，最下方）
 *
 * max-w-4xl 适配 A4 排版在屏幕上预览的视觉宽度，mx-auto 居中。
 */
import Editor from "@/components/Editor";
import ModePanel from "@/components/ModePanel";
import ActionPanel from "@/components/ActionPanel";
import PrintSettingsPanel from "@/components/PrintSettingsPanel";
import Preview from "@/components/Preview";
import HistoryPanel from "@/components/HistoryPanel";
import ImageOcrImport from "@/components/ImageOcrImport";
import PdfImport from "@/components/PdfImport";
import DualHelp from "@/components/DualHelp";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="hero-band">
        <h1>兜兜拼音</h1>
        <p>给课文、故事和练习稿加上清晰拼音，家里打印、课堂备课都能用。</p>
        <Link to="/changelog" className="hero-changelog-link">
          更新日志
        </Link>
      </header>

      <div className="workbench-layout">
        <aside className="left-rail">
          <HistoryPanel />
        </aside>
        <section className="input-column">
          <ModePanel />
          <Editor />
          <ActionPanel />
          <PrintSettingsPanel />
          <DualHelp />
          <ImageOcrImport />
          <PdfImport />
        </section>
        <Preview />
      </div>
    </main>
  );
}
