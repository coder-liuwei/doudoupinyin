import { BookOpen, Wand2 } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";

export default function ModePanel() {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);

  return (
    <section className="workbench-card mode-panel" aria-label="注音模式">
      <div className="mode-tabs" role="radiogroup" aria-label="注音模式">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "plain"}
          className={mode === "plain" ? "active" : ""}
          onClick={() => setMode("plain")}
        >
          <Wand2 size={16} />
          自动注音
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "dual"}
          className={mode === "dual" ? "active" : ""}
          onClick={() => setMode("dual")}
        >
          <BookOpen size={16} />
          双行手稿
        </button>
      </div>
    </section>
  );
}
