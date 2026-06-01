# 拼音王子

生成带 ruby 注音（字上标拼音）的 HTML，用于打印 A4 PDF 供儿童语文学习。

## 文件说明

| 文件 | 说明 |
|------|------|
| `pinyin-prince.html` | 交互工具：粘贴正文自动生成拼音稿，支持打印/保存 PDF |
| `jiazhang-pinyin-wangzi.html` | 家长与老师使用说明 |
| `baigujing-story.html` / `.pdf` | 示例：三打白骨精（节选） |
| `scripts/build_baigujing_html.py` | 静态 HTML 生成脚本 |
| `scripts/html_to_pdf.py` | HTML → PDF 转换脚本 |

## 快速使用

### 方式一：直接用浏览器打开

双击 `pinyin-prince.html` 拖进浏览器窗口，粘贴文字 → 生成预览 → 打印保存 PDF。

### 方式二：命令行生成

```bash
pip install -r requirements.txt

# 生成示例 HTML
python scripts/build_baigujing_html.py

# HTML 转 PDF（需安装 Chrome/Edge/Chromium）
python scripts/html_to_pdf.py
```

## PDF 打印注意

若 PDF 顶部出现网址/日期：在打印窗口关闭「页眉和页脚」选项后再打印。