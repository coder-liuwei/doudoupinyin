# 拼音王子

给儿童语文学习用的工具：粘贴正文，生成带 ruby 注音（字上标拼音）的 HTML，
一键保存为 A4 PDF 打印稿。

> v0.2 起完全重写为 **Vite + React 18 + TypeScript + Tailwind v4**。
> 旧版 Python CLI 与单文件 HTML 工具已废弃。

## 快速使用

```bash
npm install
npm run dev
# 浏览器打开 http://localhost:5173
```

粘贴正文 → 点「生成」→ 点「打印 / 存 PDF」→ 浏览器打印对话框选「另存为 PDF」。

## 功能

- **单行模式**：自动给每个汉字标拼音，标点不标
- **双行模式**：支持「拼音行 + 汉字行」手稿（格数自动校验）
- **多音字词表**：用 YAML 编辑多音字（`src/data/polyphone.yaml`），编译时进 bundle
- **结构助词校正**：「的/地/得」按上下文规则自动选音
- **历史记录**：localStorage 持久化，最多 40 条（兼容旧版 `pinyinPrince.v1.history`）
- **PDF 抽取**：上传 PDF 文件，自动抽取正文后注音
- **打印兼容**：走 `/print?id=xxx` 独立路由，避开 Tailwind preflight 对 ruby 标签的干扰

## 学段字号预设

工具栏可切：
- 小学 16px
- 大班 20px
- 小班 24px

## 命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建（tsc + vite build）
npm run preview      # 预览生产构建
npm test             # 跑 41 个 vitest 用例
npm run test:e2e     # Playwright e2e（待补）
```

## 项目结构

```
src/
├─ main.tsx                       # Vite 入口
├─ App.tsx                        # 路由（/ 与 /print）
├─ routes/
│  ├─ Home.tsx                    # 主编辑页
│  └─ Print.tsx                   # 打印路由
├─ components/
│  ├─ Editor.tsx                  # 输入区 + 模式切换
│  ├─ Preview.tsx                 # 屏幕版预览
│  ├─ PrintOnly.tsx               # 打印专用容器
│  ├─ Toolbar.tsx                 # 生成/保存/打印/清空/字号
│  ├─ HistoryPanel.tsx            # 历史下拉
│  ├─ PdfImport.tsx               # PDF 抽取
│  └─ DualHelp.tsx                # 双行模式说明
├─ lib/
│  ├─ types.ts                    # 共享类型
│  ├─ normalize.ts                # NFKC + 空白整理
│  ├─ pinyin.ts                   # pinyin-pro 包装
│  ├─ polyphone.ts                # 多音字算法
│  ├─ particles.ts                # 的/地/得 校正
│  ├─ split.ts                    # 单/双行分段
│  ├─ render.tsx                  # ruby JSX 渲染
│  ├─ history.ts                  # localStorage + 迁移
│  ├─ pdf-extract.ts              # pdfjs-dist
│  └─ samples.ts                  # 内置示例（三打白骨精）
├─ store/
│  └─ useEditorStore.ts           # Zustand
├─ hooks/
│  ├─ useHistory.ts
│  └─ usePrint.ts
├─ styles/
│  └─ print.css                   # 打印专用（隔离 Tailwind）
└─ data/
   └─ polyphone.yaml              # 唯一真源，编译时 import
```

## 部署到 Vercel

已配 `vercel.json`（framework: vite）。push 到 `main` 即自动部署。

```bash
git push origin main
```

## 多音字词表编辑

改 `src/data/polyphone.yaml`：

```yaml
defaults:                              # 单字兜底
  "行": "xíng"

overrides:                             # 词组覆盖（按子串）
  - pattern: "依依不舍地"
    pinyin: ["yī", "yī", "bù", "shě", "de"]

skips:                                 # 不参与标音
  - "·"
```

改动后 `npm run build` 自动把 YAML 编进 bundle。

## 浏览器打印 PDF 的小贴士

打印对话框里**关闭「页眉和页脚」**，否则 PDF 顶部会带日期/网址。
