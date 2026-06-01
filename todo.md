# 拼音王子 · 待办清单

> 详细设计在对话历史里（2026-06-01 那次规划）。本文档是「可执行版」，照着干就行。
>
> **图例**：✅ 已完成 · ⬜ 未开始 · 🔧 进行中 · ⛔ 阻塞

## 当前进度

- ✅ **P0 全部 4 项** 已 commit（`feat: polyphone dict + story decoupling + pytest`）
- 测试：43 passed / 0 failed
- 端到端：`baigujing-story.html` 23,316 字节 / 8 段 / 670 ruby 单元

---

## P1 · 可复用性 / 可移植性 / 文档（高价值）

| 状态 | # | 任务 | 改动文件 | 验收 | 估时 |
|---|---|---|---|---|---|
| ⬜ | P1.1 | 抽 `assets/style.css`，Python 注入 / HTML 引用同一份 | `assets/style.css`（新）、`pinyin_prince/render.py`（新）、`scripts/build_baigujing_html.py`、`pinyin-prince.html` | 改 `--font-size` 一处，所有产物跟随；snapshot 测试视觉一致 | 中 |
| ⬜ | P1.2 | 学段排版预设（小班 24 / 大班 20 / 小学 16） | `assets/style.css`、`pinyin-prince.html`、`scripts/build_baigujing_html.py` | 工具栏单选切换即时生效；CLI 加 `--age` 参数 | 小 |
| ⬜ | P1.3 | pinyin-pro + pdfjs-dist 离线降级 + SRI | `scripts/vendor_pinyin.py`（新）、`vendor/`、`pinyin-prince.html` | 断网打开 HTML 工具「只有汉字」模式仍能工作 | 中 |
| ⬜ | P1.4 | 多音字校对指南文档 | `docs/pinyin-audit-guide.md`（新） | 高危多音字清单 + 校对流程 + checklist | 小 |
| ⬜ | P1.5 | README 重写 + 家长说明页升级 | `README.md`、`jiazhang-pinyin-wangzi.html` | 5 种使用方式 + 排版预设 + 故障排查；说明页覆盖 PDF 抽取 / 双行 / 快捷键 | 中 |

---

## P2 · 体验打磨

| 状态 | # | 任务 | 改动文件 | 验收 | 估时 |
|---|---|---|---|---|---|
| ⬜ | P2.1 | `html_to_pdf.py` 跨平台（Linux/Windows 路径） | `scripts/html_to_pdf.py` | Linux/Windows 能找到对应浏览器 | 小 |
| ⬜ | P2.2 | PDF 错误信息友好化 | `scripts/html_to_pdf.py` | 区分「找不到浏览器」/「运行失败」；前者给下载链接 | 小 |
| ⬜ | P2.3 | PDF 进度提示 + 产物验证 | `scripts/html_to_pdf.py` | `print(..., flush=True)` 状态行；检查 `%PDF` 文件头 | 小 |
| ⬜ | P2.4 | 分页/孤行控制 | `assets/style.css` | `.line { widows: 3; orphans: 3; break-inside: avoid; }` | 极小 |
| ⬜ | P2.5 | 双行模式错误信息改进 | `pinyin-prince.html` | 标出错字符位置 + 「可能原因」提示 | 小 |
| ⬜ | P2.6 | 导出 `.html` 文件（脱离 localStorage） | `pinyin-prince.html` | 「下载当前预览为独立 HTML」按钮 | 小 |
| ⬜ | P2.7 | pinyin-pro 主版本升级评估 | `pinyin-prince.html` | 跑拼音正确性回归，决定是否升 3.23.x → latest | 小 |
| ⬜ | P2.8 | localStorage schema 版本 + 迁移 | `pinyin-prince.html` | 加 `schemaVersion` 字段 + 旧记录降级 | 小 |

---

## P3 · 锦上添花

| 状态 | # | 任务 | 改动文件 | 验收 | 估时 |
|---|---|---|---|---|---|
| ⬜ | P3.1 | 标点 ruby 行高修复 | `assets/style.css`、`pinyin-prince.html` | `.punct rt { line-height: 0; }` 不再顶行 | 极小 |
| ⬜ | P3.2 | 快捷键（Ctrl+Enter / Ctrl+S / Ctrl+P / Esc） | `pinyin-prince.html` | 老用户/家长高频场景提速 | 小 |
| ⬜ | P3.3 | 产物输出统一到 `dist/` | `scripts/build_baigujing_html.py`、`scripts/html_to_pdf.py` | 根目录不混 HTML/PDF | 极小 |
| ⬜ | P3.4 | `CHANGELOG.md`（Keep a Changelog 格式） | `CHANGELOG.md`（新） | `## [Unreleased]` + 历史条目 | 极小 |
| ⬜ | P3.5 | GitHub Actions 跑 pytest | `.github/workflows/test.yml` | push / PR 自动跑 43 测试 | 小 |
| ⬜ | P3.6 | 词组分色（jieba 词典 + CSS） | `pinyin_prince/wordcolor.py`（新） | 同一词组同色（如「白骨精」三字同色） | 大 |
| ⬜ | P3.7 | 声调分色（一二三四声 = 红/黄/绿/蓝，可关） | `assets/style.css` | `rt[data-tone]` 分色；教学流派有争议，做配置开关 | 中 |
| ⬜ | P3.8 | mypy strict（核心模块） | `pyproject.toml` | polyphone / build_html 零类型错 | 小 |
| ⬜ | P3.9 | 渲染快照测试（HTML diff） | `tests/snapshots/` | 关键改动显式 update snapshot | 小 |
| ⬜ | P3.10 | OCR 集成调研 | `docs/ocr-research.md` | PaddleOCR vs Tesseract vs 云 API 选型报告 | 调研 1 天 |
| ⬜ | P3.11 | PWA 离线（手机/平板可用） | `pinyin-prince.html`、`manifest.json`、`service-worker.js` | 移动端断网可用 | 中 |

---

## 关键路径（最短完成「可分享给其他家长」水准）

```
P0 ✅ ──► P1.1 共享 CSS ──► P1.2 排版预设 ──► P1.4 校对文档 ──► P1.5 文档升级
                       └─► P1.3 离线降级
```

完成上述 ≈ 4-5 天，到「给别人用不翻车」水准。

## 决策记录

- **2026-06-01**：选 YAML 而非 JSON 做多音字词表（家长/老师可手编、注释友好）
- **2026-06-01**：`build_baigujing_html.py` 保留向后兼容（同名同位置输出），新能力通过 polyphone + stories 渐进增强
- **2026-06-01**：`apply_table` 抛错时 build 不阻断——「部分多音字错」优于「整个 PDF 跑不出来」
- **2026-06-01**：P0 不动 `pinyin-prince.html`（HTML 工具与 Python 脚本两条线，P3 阶段整合）

## 风险登记

- **P2.7 pinyin-pro 升级**：钉死 `3.23.1` 是不想破坏当前预览，但库有 bug 升不了。先做拼音正确性回归再决定。
- **P3.6 词组分色**：jieba 词典边界算法复杂（兼类词、姓名），先做最常见 200 词。完整版是研究级工作量。
- **P3.7 声调分色**：教学流派有争议，有的老师认为干扰认字。务必做配置开关，默认关闭。
- **双 subagent 并行写入**：`tests/` 目录曾出现瞬时清空状态（Subagent B 报告），最终 43/43 全绿。后续 P1 并行任务建议 doudou 串行触发出文件，子 agent 只读骨架。
