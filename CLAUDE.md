# CLAUDE.md

This file provides guidance to Claude Code when working on this repo.

## 项目概述

拼音王子 — 给儿童语文学习生成带 ruby 注音的 HTML，可打印 A4 PDF。

**v0.2 起**：完全重写为 Vite + React 18 + TS + Tailwind v4 的 SPA。
**v0.1 旧版**（Python CLI + 单文件 HTML 工具）已废弃删除。

## 常用命令

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc -b && vite build
npm test             # vitest run (41 cases)
```

## 核心架构

- **拼音生成**：`pinyin-pro` npm 包，`src/lib/pinyin.ts` 包装为 `pinyinOf(ch)`
- **多音字词表**：`src/data/polyphone.yaml` 用 Vite `?raw` + `js-yaml` 在编译时进 bundle
- **打印页**：`/print?id=xxx` 路由挂独立 `print.css`，**不引入** Tailwind，避开 preflight 对 ruby 标签的破坏
- **历史**：`localStorage` 键 `pinyinPrince.v2.history`（带 `schemaVersion: 2` 包装）；自动从 v1 数组迁移，v1 键保留只读

## 关键文件

- `src/lib/polyphone.ts` — 多音字算法（`applyTable`），直接对应旧 `pinyin_prince/polyphone.py:166-228`
- `src/lib/render.tsx` — `<Ruby>` 组件，节点结构与旧 `pinyin-prince.html:543-553` 等价
- `src/lib/particles.ts` — 结构助词校正，对应旧 `scripts/build_baigujing_html.py:108-127`
- `src/lib/split.ts` — `splitPlainBlocks` + `buildDualParagraphs`（双行模式）
- `src/styles/print.css` — ruby 关键样式，**不放** Tailwind `@layer base` 之外

## 关键决策

- **YAML 编译时 import** 而非运行时 fetch：bundle 体积 +3KB，省去 CORS 配置
- **打印走独立路由** 而非 `window.print()` 直接调：URL 可分享，且 100% 隔离 Tailwind
- **PDF 抽取保留**：`pdfjs-dist` 加 ~500KB bundle，换来"上传 PDF→注音"完整闭环
- **不装 shadcn/ui**：v1 纯 Tailwind 够用，后续看需求

## 部署

`vercel.json` 已配 `framework: "vite"`，push 到 `main` 即自动部署。

## 不要

- **不要**在 `print.css` 顶部加 `@import "tailwindcss"`（preflight 会破坏 ruby）
- **不要**把 `pinyin-pro` 改回 CDN（v0.1 旧版用过，已弃）
- **不要**改 `src/lib/types.ts` 的契约（所有 agent 都依赖）
