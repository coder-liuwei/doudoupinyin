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
import { useEditorStore } from "@/store/useEditorStore";
import { useEffect } from "react";

export default function Home() {
  const input = useEditorStore((s) => s.input);
  const currentId = useEditorStore((s) => s.currentId);

  useEffect(() => {
    const hasDraft = input.trim().length > 0 && !currentId;
    if (!hasDraft) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [currentId, input]);

  return (
    <main className="app-shell">
      <header className="hero-band">
        <div>
          <p className="hero-kicker">儿童语文拼音工作台</p>
          <h1>兜兜拼音</h1>
          <p>
            给课文、故事和练习稿加上清晰 ruby 拼音，家里打印、课堂备课都能用。
          </p>
        </div>
        <div className="hero-note" aria-label="当前流程">
          <span>粘贴正文</span>
          <span>生成校对</span>
          <span>打印 PDF</span>
        </div>
      </header>

      <div className="workbench-layout">
        <aside className="left-rail">
          <HistoryPanel />
        </aside>
        <section className="input-column">
          <Editor />
          <Toolbar />
          <DualHelp />
          <PdfImport />
        </section>
        <Preview />
      </div>
    </main>
  );
}
