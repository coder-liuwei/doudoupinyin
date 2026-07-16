import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useEditorStore } from "@/store/useEditorStore";
import Changelog from "./routes/Changelog";
import Home from "./routes/Home";
import Print from "./routes/Print";

/**
 * 顶层路由。
 * - `/` 主编辑页（由 agents 后续填充）
 * - `/print?id=xxx` 纯打印视图（不挂 Tailwind，绕开 preflight 干扰 ruby）
 */
export default function App() {
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
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/changelog" element={<Changelog />} />
      <Route path="/print" element={<Print />} />
    </Routes>
  );
}
