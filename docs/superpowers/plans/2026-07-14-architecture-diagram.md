# 兜兜拼音交互式架构图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个无需构建和网络资源即可打开的 `docs/architecture.html`，准确展示兜兜拼音从内容输入到打印输出的完整架构，并支持视图切换、节点详情和链路聚焦。

**Architecture:** 单文件 HTML 内嵌语义化页面结构、CSS 设计令牌、SVG 连接层和原生 JavaScript。架构节点与边由 JavaScript 数据对象统一驱动，节点按钮保留无脚本时的基础可读内容，交互只负责视图过滤、详情渲染和链路高亮。

**Tech Stack:** HTML5、CSS3、内嵌 SVG、原生 JavaScript、Codex 内置浏览器

---

## 文件结构

- Create: `docs/architecture.html` — 唯一交付文件，包含架构数据、页面结构、视觉样式和交互逻辑。
- Reference only: `docs/superpowers/specs/2026-07-14-architecture-diagram-design.md` — 已确认的设计规格，不再修改。

### Task 1: 建立可访问的架构图骨架与设计系统

**Files:**
- Create: `docs/architecture.html`

- [x] **Step 1: 创建完整语义骨架**

页面必须包含以下稳定接口，后续脚本直接依赖这些 ID 和属性：

```html
<header class="hero" aria-labelledby="page-title">...</header>
<nav class="view-switcher" aria-label="架构视图">
  <button data-view="product" aria-pressed="true">产品视角</button>
  <button data-view="technical" aria-pressed="false">技术视角</button>
  <button data-view="parsing" aria-pressed="false">聚焦内容解析</button>
</nav>
<main class="architecture-shell">
  <section id="architecture-map" aria-label="兜兜拼音系统架构图">...</section>
  <aside id="detail-panel" aria-live="polite">...</aside>
</main>
```

每个节点必须使用真实可聚焦按钮：

```html
<button class="node-card" data-node-id="normalize" type="button">
  <span class="node-index">02.1</span>
  <strong>输入规范化</strong>
  <code>normalizeInput()</code>
</button>
```

- [x] **Step 2: 内嵌设计令牌和响应式布局**

CSS 使用固定令牌，禁止外部字体和资源：

```css
:root {
  --paper: #f6f1e7;
  --ink: #1d2540;
  --indigo: #3446a8;
  --green: #23856d;
  --orange: #d56b35;
  --line: #cfc8b8;
  --surface: rgba(255, 253, 247, 0.92);
  --shadow: 0 14px 30px rgba(35, 42, 73, 0.10), 0 2px 0 rgba(255,255,255,.85) inset;
}
```

桌面端采用“主图 + 详情栏”，小于 900px 改为单列，小于 560px 将视图按钮改为纵向并缩小节点间距。所有动画放入 `@media (prefers-reduced-motion: no-preference)`。

- [x] **Step 3: 加入五层真实架构内容**

节点必须覆盖以下 ID，名称与代码职责保持一致：

```js
const requiredNodeIds = [
  "text-input", "pdf-import", "pdf-extract", "normalize",
  "plain-split", "dual-parse", "pair-model", "base-pinyin",
  "polyphone", "particles", "editor-state", "proofread",
  "history", "ruby-render", "print-route"
];
```

五个视觉层依次为：输入层、内容解析层、语言处理层、状态与校对层、展示输出层。正常链路使用实线和箭头；校验失败、词表冲突和人工兜底使用橙色虚线并附文字标签。

- [x] **Step 4: 运行静态结构检查**

Run:

```bash
node -e 'const fs=require("fs");const s=fs.readFileSync("docs/architecture.html","utf8");for(const x of ["architecture-map","detail-panel","data-view=\"product\"","data-view=\"technical\"","data-view=\"parsing\"","data-node-id=\"pdf-extract\"","data-node-id=\"normalize\"","data-node-id=\"print-route\""])if(!s.includes(x))throw new Error("missing "+x);console.log("architecture structure ok")'
```

Expected: `architecture structure ok`

### Task 2: 实现节点数据、详情面板和视图交互

**Files:**
- Modify: `docs/architecture.html`

- [x] **Step 1: 定义节点详情数据**

每个节点数据使用统一结构，字段全部渲染到详情面板：

```js
const nodeDetails = {
  normalize: {
    title: "输入规范化",
    layer: "内容解析层",
    summary: "统一兼容字符、换行和多余空白，为两种分段策略提供稳定输入。",
    input: "用户文本或 PDF 抽取结果",
    output: "规范化后的纯文本",
    rules: ["NFKC 规范化", "CRLF/CR 转 LF", "连续横向空白折叠", "首尾 trim"],
    errors: "旧环境不支持 normalize 时跳过 NFKC，其余清洗继续执行。",
    files: ["src/lib/normalize.ts · normalizeInput"]
  }
};
```

其余节点同样提供 `title/layer/summary/input/output/rules/errors/files`，不允许出现空字段或虚构模块。

- [x] **Step 2: 定义架构边和可达关系**

```js
const edges = [
  ["text-input", "normalize"],
  ["pdf-import", "pdf-extract"],
  ["pdf-extract", "normalize"],
  ["normalize", "plain-split"],
  ["normalize", "dual-parse"],
  ["plain-split", "base-pinyin"],
  ["base-pinyin", "pair-model"],
  ["dual-parse", "pair-model"],
  ["pair-model", "polyphone"],
  ["polyphone", "particles"],
  ["particles", "editor-state"],
  ["editor-state", "proofread"],
  ["editor-state", "history"],
  ["proofread", "ruby-render"],
  ["history", "print-route"],
  ["ruby-render", "print-route"]
];
```

点击节点时用正向和反向遍历计算全部上下游，将相关节点标记为 `.is-related`，当前节点标记为 `.is-selected`，其余节点标记为 `.is-dimmed`。

- [x] **Step 3: 实现详情与键盘交互**

```js
function selectNode(nodeId) {
  const detail = nodeDetails[nodeId];
  if (!detail) return;
  renderDetail(detail);
  highlightFlow(nodeId);
  document.querySelector("#detail-panel").dataset.open = "true";
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") clearSelection();
});
```

节点使用原生 `button`，Enter 和 Space 由浏览器自动触发 click；详情面板关闭按钮必须带 `aria-label="关闭节点详情"`。

- [x] **Step 4: 实现三种视图**

```js
const views = {
  product: { label: "产品视角", visibleLayers: ["input", "parse", "language", "state", "output"] },
  technical: { label: "技术视角", visibleLayers: ["input", "parse", "language", "state", "output"], showCode: true },
  parsing: { label: "聚焦内容解析", visibleLayers: ["input", "parse"], focusNodes: ["text-input", "pdf-import", "pdf-extract", "normalize", "plain-split", "dual-parse", "pair-model"] }
};
```

切换视图时同步更新 `aria-pressed`、页面说明、节点的隐藏/显示状态和连接线透明度。技术视角展示代码标签，产品视角展示用户价值标签，内容解析视角隐藏无关层但保留一张“后续处理”出口卡片。

- [x] **Step 5: 检查脚本语法和接口完整性**

Run:

```bash
node -e 'const fs=require("fs"),vm=require("vm");const s=fs.readFileSync("docs/architecture.html","utf8");const scripts=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);if(scripts.length!==1)throw new Error("expected one inline script");new vm.Script(scripts[0]);for(const x of ["const nodeDetails","const edges","function selectNode","function selectView","function highlightFlow"])if(!scripts[0].includes(x))throw new Error("missing "+x);console.log("architecture script ok")'
```

Expected: `architecture script ok`

### Task 3: 浏览器验证与视觉修正

**Files:**
- Modify if required: `docs/architecture.html`

- [x] **Step 1: 在 Codex 内置浏览器打开文件**

打开绝对路径：

```text
file:///Users/liuwei.1707/Desktop/CC/doudoupinyin/docs/architecture.html
```

Expected: 页面标题、五层架构、视图切换器和默认详情提示均可见，控制台无错误。

- [x] **Step 2: 验证核心交互**

依次执行并观察：

1. 点击“PDF 文本抽取”，详情显示坐标排序、逐页读取和失败处理。
2. 点击“输入规范化”，上下游节点高亮。
3. 点击“聚焦内容解析”，仅显示两条输入路径、解析分支和后续出口。
4. 点击“技术视角”，所有真实代码标签恢复显示。
5. 按 Esc，详情恢复默认提示且高亮清除。

Expected: 每一步都有唯一、清晰且无布局跳动的状态反馈。

- [x] **Step 3: 验证响应式布局**

分别使用 1440×900、768×900、375×812 视口。

Expected: 1440px 为双栏；768px 和 375px 为单栏；无内容被固定元素遮挡；节点按钮触控高度不小于 44px；无页面级横向滚动。

- [x] **Step 4: 运行 UX 校验查询并修正高优先级问题**

Run:

```bash
python3 /Users/liuwei.1707/.codex/skills/ui-ux-pro-max/scripts/search.py "architecture diagram animation accessibility z-index responsive" --domain ux -n 8
```

Expected: 对照输出检查键盘操作、焦点可见性、动画时长、层级和窄屏可读性；只修正与本页直接相关的问题。

- [x] **Step 5: 运行最终验证**

Run:

```bash
git diff --check
npm test
npm run build
```

Expected: `git diff --check` 无输出；现有测试全部通过；生产构建成功。若现有测试因本次范围之外的问题失败，停止并报告，不修改业务代码。

- [x] **Step 6: 提交单文件架构图**

```bash
git add docs/architecture.html docs/superpowers/plans/2026-07-14-architecture-diagram.md
git commit -m "docs: add interactive project architecture diagram"
```

Expected: 提交只包含实施计划和 `docs/architecture.html`，不包含 `AGENTS.md` 或 `.codegraph/daemon.pid`。
