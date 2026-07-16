# Changelog Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增面向老师和家长的可滚动更新日志页面，并建立 push 前确认更新内容与贡献人的项目流程。

**Architecture:** 更新记录保存在一个类型安全的静态 TypeScript 数组中，由独立 `/changelog` 路由渲染。主页顶部提供入口，更新区采用固定响应式高度和内部纵向滚动；不增加依赖、接口或后台录入能力。

**Tech Stack:** React 18、TypeScript、React Router 6、Tailwind v4 项目全局 CSS、Vitest、Testing Library

---

## 文件结构

- Create: `src/data/changelog.ts` — 更新日志类型与按日期倒序的数据。
- Create: `src/routes/Changelog.tsx` — 更新日志页面、日期格式化、空状态和时间线渲染。
- Create: `tests/changelog.test.tsx` — 页面内容、空状态、路由和主页入口测试。
- Create: `tests/changelog-styles.test.ts` — 独立滚动区的 CSS 契约测试。
- Modify: `src/App.tsx` — 注册 `/changelog`。
- Modify: `src/routes/Home.tsx` — 主页标题区增加“更新日志”入口。
- Modify: `src/styles/global.css` — 页面视觉、滚动区与移动端样式。
- Modify: `AGENTS.md` — 增加 push 前更新日志确认规则；保留并不提交用户当前已有的 memory 区块。

### Task 1: 更新日志数据与页面内容

**Files:**
- Create: `src/data/changelog.ts`
- Create: `src/routes/Changelog.tsx`
- Create: `tests/changelog.test.tsx`

- [ ] **Step 1: 写入页面失败测试**

创建 `tests/changelog.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Changelog from "@/routes/Changelog";

describe("Changelog", () => {
  it("renders the latest user-facing update and contributor", () => {
    render(
      <MemoryRouter>
        <Changelog />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "我们又进步咯" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "更新动态看得见了" })).not.toBeNull();
    expect(screen.getByText("贡献人：兜兜")).not.toBeNull();
    expect(screen.getAllByText("最新")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "返回拼音工具" }).getAttribute("href")).toBe("/");
    expect(document.querySelector(".changelog-scroll")).not.toBeNull();
  });

  it("shows a friendly empty state", () => {
    render(
      <MemoryRouter>
        <Changelog entries={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("还没有更新记录")).not.toBeNull();
    expect(screen.queryByText("最新")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/changelog.test.tsx`

Expected: FAIL，提示无法解析 `@/routes/Changelog`。

- [ ] **Step 3: 添加类型安全的静态数据**

创建 `src/data/changelog.ts`：

```ts
export interface ChangelogEntry {
  date: string;
  title: string;
  items: readonly string[];
  contributors: readonly string[];
}

export const changelogEntries: readonly ChangelogEntry[] = [
  {
    date: "2026-07-15",
    title: "更新动态看得见了",
    items: ["新增更新日志页面，老师和家长可以查看最近的新功能、体验优化和贡献人。"],
    contributors: ["兜兜"],
  },
];
```

- [ ] **Step 4: 添加最小页面实现**

创建 `src/routes/Changelog.tsx`：

```tsx
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { changelogEntries, type ChangelogEntry } from "@/data/changelog";

interface ChangelogProps {
  entries?: readonly ChangelogEntry[];
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

export default function Changelog({ entries = changelogEntries }: ChangelogProps) {
  return (
    <main className="changelog-shell">
      <nav className="changelog-backbar" aria-label="页面导航">
        <Link to="/" className="changelog-backlink">
          <ArrowLeft size={16} />
          返回拼音工具
        </Link>
      </nav>

      <header className="changelog-hero">
        <span className="changelog-kicker">每一次更新，都为了更好用一点</span>
        <h1>我们又进步咯</h1>
        <p>这里记录兜兜拼音最近的新功能和小优化，也感谢每一位帮助它变得更好的朋友。</p>
      </header>

      <section className="changelog-section" aria-labelledby="changelog-heading">
        <div className="changelog-section-head">
          <div>
            <span className="changelog-eyebrow">最近更新</span>
            <h2 id="changelog-heading">一点一点，变得更好</h2>
          </div>
          <span className="changelog-count">共 {entries.length} 次更新</span>
        </div>

        {entries.length === 0 ? (
          <p className="changelog-empty">还没有更新记录</p>
        ) : (
          <div className="changelog-scroll">
            <div className="changelog-timeline">
              {entries.map((entry, index) => (
                <article className="changelog-entry" key={`${entry.date}-${entry.title}`}>
                  <div className="changelog-entry-meta">
                    <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                    {index === 0 && <span className="changelog-latest">最新</span>}
                  </div>
                  <h3>{entry.title}</h3>
                  <ul>
                    {entry.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <p className="changelog-contributors">
                    贡献人：{entry.contributors.join("、")}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: 运行页面测试并确认通过**

Run: `npm test -- tests/changelog.test.tsx`

Expected: `2 passed`。

- [ ] **Step 6: 提交数据与页面**

```bash
git add src/data/changelog.ts src/routes/Changelog.tsx tests/changelog.test.tsx
git commit -m "feat: add changelog page content"
```

### Task 2: 路由与主页顶部入口

**Files:**
- Modify: `tests/changelog.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: 增加失败的路由与入口测试**

在 `tests/changelog.test.tsx` 追加导入：

```tsx
import App from "@/App";
import Home from "@/routes/Home";
```

并在文件末尾追加：

```tsx
describe("changelog routing", () => {
  it("renders the changelog route", () => {
    render(
      <MemoryRouter initialEntries={["/changelog"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "我们又进步咯" })).not.toBeNull();
  });

  it("links to the changelog from the home hero", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "更新日志" });
    expect(link.getAttribute("href")).toBe("/changelog");
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/changelog.test.tsx`

Expected: FAIL，`/changelog` 无匹配路由，主页也找不到“更新日志”链接。

- [ ] **Step 3: 注册 `/changelog` 路由**

在 `src/App.tsx` 导入并注册：

```tsx
import Changelog from "./routes/Changelog";
```

```tsx
<Route path="/changelog" element={<Changelog />} />
```

- [ ] **Step 4: 在主页标题区增加入口**

在 `src/routes/Home.tsx` 增加导入：

```tsx
import { Link } from "react-router-dom";
```

在 `.hero-band` 的说明文字后增加：

```tsx
<Link to="/changelog" className="hero-changelog-link">
  更新日志
</Link>
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `npm test -- tests/changelog.test.tsx`

Expected: `4 passed`。

- [ ] **Step 6: 提交路由与入口**

```bash
git add src/App.tsx src/routes/Home.tsx tests/changelog.test.tsx
git commit -m "feat: link changelog from home"
```

### Task 3: 暖色时间线、独立滚动与响应式样式

**Files:**
- Create: `tests/changelog-styles.test.ts`
- Modify: `src/styles/global.css`

- [ ] **Step 1: 写入滚动样式失败测试**

创建 `tests/changelog-styles.test.ts`：

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("changelog styles", () => {
  it("keeps the update records in an independent vertical scroller", () => {
    const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.changelog-scroll\s*\{[^}]*overflow-y:\s*auto;/s);
    expect(css).toMatch(/\.changelog-scroll\s*\{[^}]*height:\s*min\(52vh,\s*520px\);/s);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/changelog-styles.test.ts`

Expected: FAIL，CSS 中不存在 `.changelog-scroll` 滚动规则。

- [ ] **Step 3: 添加主页入口与更新日志页面样式**

在 `src/styles/global.css` 的主页标题区样式后添加：

```css
.hero-changelog-link {
  flex: 0 0 auto;
  margin-left: auto;
  border: 1px solid rgba(157, 52, 40, 0.24);
  border-radius: 999px;
  padding: 7px 12px;
  color: #8d352b;
  background: rgba(255, 252, 242, 0.72);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.hero-changelog-link:hover {
  background: #fffaf0;
}

.changelog-shell {
  width: min(780px, calc(100% - 32px));
  margin: 0 auto;
  padding: 16px 0 32px;
}

.changelog-backbar {
  padding: 16px 20px;
  border: 1px solid rgba(86, 54, 32, 0.16);
  border-radius: 14px 14px 0 0;
  background: #fff;
}

.changelog-backlink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #9a6544;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.changelog-hero {
  padding: 40px 28px 34px;
  border-inline: 1px solid rgba(86, 54, 32, 0.16);
  text-align: center;
  background: linear-gradient(180deg, #fff5e8 0%, #fffaf2 100%);
}

.changelog-kicker {
  display: inline-block;
  margin-bottom: 14px;
  border-radius: 999px;
  padding: 5px 11px;
  color: #a75f2c;
  background: #ffe7ca;
  font-size: 12px;
}

.changelog-hero h1 {
  margin: 0;
  color: #4a2e22;
  font-family: "Songti SC", "STSong", serif;
  font-size: 36px;
  line-height: 1.2;
}

.changelog-hero p {
  max-width: 500px;
  margin: 12px auto 0;
  color: #8a6b58;
  font-size: 14px;
  line-height: 1.8;
}

.changelog-section {
  padding: 28px;
  border: 1px solid rgba(86, 54, 32, 0.16);
  border-top: 0;
  border-radius: 0 0 14px 14px;
  background: #fffaf2;
}

.changelog-section-head,
.changelog-entry-meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.changelog-eyebrow {
  color: #b06d33;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.changelog-section h2 {
  margin: 5px 0 0;
  color: #513528;
  font-size: 22px;
}

.changelog-count {
  color: #a98d79;
  font-size: 12px;
}

.changelog-scroll {
  height: min(52vh, 520px);
  min-height: 320px;
  margin-top: 18px;
  overflow-y: auto;
  padding: 2px 14px 4px 8px;
  scrollbar-color: #e9a76f #f7e8d9;
}

.changelog-timeline {
  margin-left: 7px;
  border-left: 2px solid #f2b36f;
  padding-left: 22px;
}

.changelog-entry {
  position: relative;
  margin-bottom: 16px;
  border: 1px solid #f1dfcf;
  border-radius: 14px;
  padding: 18px 19px;
  background: #fff;
  box-shadow: 0 6px 22px rgba(100, 60, 30, 0.06);
}

.changelog-entry:last-child {
  margin-bottom: 0;
}

.changelog-entry::before {
  position: absolute;
  top: 21px;
  left: -29px;
  width: 12px;
  height: 12px;
  border: 3px solid #fffaf2;
  border-radius: 50%;
  background: #ef9b5b;
  content: "";
}

.changelog-entry time {
  color: #a7653a;
  font-size: 12px;
}

.changelog-latest {
  border-radius: 999px;
  padding: 3px 8px;
  color: #a95822;
  background: #fff0df;
  font-size: 10px;
  font-weight: 800;
}

.changelog-entry h3 {
  margin: 10px 0 8px;
  color: #513528;
  font-size: 19px;
}

.changelog-entry ul {
  margin: 0;
  padding-left: 20px;
  color: #6f5a4c;
  font-size: 13px;
  line-height: 1.8;
}

.changelog-contributors {
  margin: 14px 0 0;
  border-top: 1px dashed #ead8c8;
  padding-top: 12px;
  color: #7b5038;
  font-size: 12px;
  font-weight: 700;
}

.changelog-empty {
  margin: 24px 0 0;
  border: 1px dashed #e4cbb5;
  border-radius: 12px;
  padding: 36px 20px;
  color: #9a7b67;
  text-align: center;
}
```

在现有 `@media (max-width: 820px)` 中增加：

```css
  .hero-changelog-link {
    display: inline-flex;
    margin-top: 10px;
    margin-left: 0;
  }

  .changelog-shell {
    width: min(100% - 20px, 760px);
    padding-top: 10px;
  }

  .changelog-hero {
    padding: 30px 18px 26px;
  }

  .changelog-hero h1 {
    font-size: 30px;
  }

  .changelog-section {
    padding: 22px 14px;
  }

  .changelog-section-head {
    align-items: flex-start;
  }

  .changelog-scroll {
    height: min(55vh, 480px);
    min-height: 300px;
    padding-right: 6px;
  }
```

- [ ] **Step 4: 运行样式测试并确认通过**

Run: `npm test -- tests/changelog-styles.test.ts`

Expected: `1 passed`。

- [ ] **Step 5: 提交样式**

```bash
git add src/styles/global.css tests/changelog-styles.test.ts
git commit -m "style: add scrollable changelog timeline"
```

### Task 4: Push 前更新日志确认规则

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: 在用户现有 memory 区块之前增加规则**

使用 `apply_patch` 在 `AGENTS.md` 的“不要”列表之后、`<claude-mem-context>` 之前插入：

```markdown
## 更新日志发布流程

- 准备 `git push` 前，先根据本次待发布差异推荐一段面向老师、家长的更新标题和内容，并等待用户确认。
- 贡献人默认填写“兜兜”，同时必须询问用户是否增加其他贡献者。
- 用户确认后，把记录追加到 `src/data/changelog.ts`，再执行最终验证和 push。
- 只记录用户能够感知的新功能和体验优化，不逐条展示内部重构、依赖调整或拼写修复。
- 普通本地提交不强制新增更新记录。
```

- [ ] **Step 2: 验证规则存在且用户原改动仍在**

Run: `rg -n "更新日志发布流程|贡献人默认填写|claude-mem-context" AGENTS.md`

Expected: 三个模式都有匹配；`<claude-mem-context>` 未被删除。

- [ ] **Step 3: 只暂存新增规则**

由于 `AGENTS.md` 已有用户未提交内容，不运行 `git add AGENTS.md`。使用 `apply_patch` 创建 `/private/tmp/changelog-agents.patch`：

```diff
diff --git a/AGENTS.md b/AGENTS.md
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -56,3 +56,11 @@ npm test             # vitest run (41 cases)
 - **不要**在 `print.css` 顶部加 `@import "tailwindcss"`（preflight 会破坏 ruby）
 - **不要**把 `pinyin-pro` 改回 CDN（v0.1 旧版用过，已弃）
 - **不要**改 `src/lib/types.ts` 的契约（所有 agent 都依赖）
+
+## 更新日志发布流程
+
+- 准备 `git push` 前，先根据本次待发布差异推荐一段面向老师、家长的更新标题和内容，并等待用户确认。
+- 贡献人默认填写“兜兜”，同时必须询问用户是否增加其他贡献者。
+- 用户确认后，把记录追加到 `src/data/changelog.ts`，再执行最终验证和 push。
+- 只记录用户能够感知的新功能和体验优化，不逐条展示内部重构、依赖调整或拼写修复。
+- 普通本地提交不强制新增更新记录。
```

只把该 patch 应用到 index：

```bash
git apply --cached /private/tmp/changelog-agents.patch
```

随后运行：

```bash
git diff --cached -- AGENTS.md
git diff -- AGENTS.md
```

Expected: cached diff 只包含“更新日志发布流程”；worktree diff 仍包含用户原有 `<claude-mem-context>` 区块。

- [ ] **Step 4: 提交规则**

```bash
git commit -m "docs: require changelog review before push"
```

### Task 5: 完整验证与交付

**Files:**
- Verify only; do not modify unrelated files.

- [ ] **Step 1: 运行完整测试**

Run: `npm test`

Expected: 所有 Vitest 文件通过，无失败用例。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: TypeScript 检查与 Vite 构建成功，生成 `dist/`。

- [ ] **Step 3: 检查差异与工作区边界**

```bash
git diff --check
git status --short --branch
git log -5 --oneline --decorate
```

Expected: 当前分支为 `codex/changelog-page`；业务实现均已提交；`README.md`、用户的 `AGENTS.md` memory 区块、`.codegraph/daemon.pid` 和 `.superpowers/` 仍未纳入提交。

- [ ] **Step 4: 停止并交给用户本地视觉验证**

告知用户运行 `npm run dev` 检查主页顶部入口、`/changelog`、记录区域滚动和移动端布局。未经用户确认，不 merge，不 push。
