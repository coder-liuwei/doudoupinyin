# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

拼音王子 — 生成带 ruby 注音（字上标拼音）的 HTML，用于打印 A4 PDF 供儿童语文学习。核心功能：
- 逐字生成拼音（pypinyin）+ 结构助词（的/地/得）轻量校正
- 生成可打印的 HTML（ruby 标签）+ 浏览器无头打印生成 PDF

## 常用命令

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 生成静态拼音 HTML（默认 baigujing-story.html）
python scripts/build_baigujing_html.py

# HTML 转 PDF（需要本机安装 Chrome/Edge/Chromium）
python scripts/html_to_pdf.py                             # 默认转换根目录 baigujing-story.html
python scripts/html_to_pdf.py path/to/input.html         # 指定输入，PDF 同名输出
python scripts/html_to_pdf.py in.html out.pdf            # 指定输入输出
```

## 技术栈

- **Python**: pypinyin（汉字→拼音），Python 3 标准库（Path, subprocess）
- **HTML/CSS**: ruby 标签实现字-音对照，@page 规则控制 A4 打印排版
- **PDF**: Chrome headless 打印（`--print-to-pdf`），不依赖额外 Python 依赖

## 核心文件

- `scripts/build_baigujing_html.py` — 静态 HTML 生成器（故事文本硬编码，生成 baigujing-story.html）
- `scripts/html_to_pdf.py` — 浏览器无头打印工具（支持 Chrome/Edge/Chromium，自动查找）
- `pinyin-prince.html` — 用户交互工具（粘贴纯文本或「拼音行+汉字行」分段，实时预览）
- `jiazhang-pinyin-wangzi.html` — 家长/老师使用说明（独立维护）
- `baigujing-story.html` 等 — 已生成的静态示例

## 架构要点

- **生成流程**: 文本 → `lazy_pinyin` 逐字转拼音 → `apply_particle_fixes` 校正助词 → ruby HTML
- **PDF 打印**: `html_to_pdf.py` 调用本机浏览器 `--headless=new --print-to-pdf`，file:// URL 方式
- **pinyin-prince.html** 为独立单文件，无需服务器，直接浏览器打开使用