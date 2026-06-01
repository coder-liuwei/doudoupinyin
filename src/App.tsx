import { Routes, Route } from "react-router-dom";
import Home from "./routes/Home";
import Print from "./routes/Print";

/**
 * 顶层路由。
 * - `/` 主编辑页（由 agents 后续填充）
 * - `/print?id=xxx` 纯打印视图（不挂 Tailwind，绕开 preflight 干扰 ruby）
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/print" element={<Print />} />
    </Routes>
  );
}
