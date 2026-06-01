import PrintOnly from "@/components/PrintOnly";
// 显式 import print.css —— 切到 /print 路由时 Vite 才加载，
// 避免污染主站 Tailwind preflight 干扰 ruby 标签
import "@/styles/print.css";

/**
 * /print?id=xxx 纯打印视图。
 * 整个页面只挂 <PrintOnly/> + 它的 print.css，不挂 Tailwind。
 */
export default function Print() {
  return <PrintOnly />;
}
