#!/usr/bin/env python3
"""将带 ruby 注音的 HTML 打印为 A4 PDF（供家长直接打开，无需会开发）。

优先使用本机已安装的 Chromium 内核浏览器「无头打印」，不安装额外 Python 依赖。

用法：
  python3 scripts/html_to_pdf.py                    # 默认：项目根目录 baigujing-story.html → baigujing-story.pdf
  python3 scripts/html_to_pdf.py path/to/in.html    # 指定 HTML，PDF 同名同目录
  python3 scripts/html_to_pdf.py in.html out.pdf
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


def find_chrome_executable() -> str | None:
    """macOS 上常见 Chrome / Edge / Chromium 路径。"""
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    for p in candidates:
        if Path(p).is_file():
            return p
    return shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chrome")


def html_to_pdf(html_path: Path, pdf_path: Path) -> None:
    chrome = find_chrome_executable()
    if not chrome:
        raise FileNotFoundError(
            "未找到 Chrome/Edge/Chromium。请安装 Google Chrome，或使用浏览器打开 HTML 后「打印 → 存储为 PDF」。"
        )

    html_path = html_path.resolve()
    if not html_path.is_file():
        raise FileNotFoundError(f"找不到 HTML：{html_path}")

    pdf_path = pdf_path.resolve()
    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    # 使用 file:// 绝对路径；headless 打印沿用 @page print 样式
    file_url = html_path.as_uri()

    args = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        file_url,
    ]
    subprocess.run(args, check=True, capture_output=True, text=True)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    argv = sys.argv[1:]

    if len(argv) == 0:
        html = root / "baigujing-story.html"
        pdf = root / "baigujing-story.pdf"
    elif len(argv) == 1:
        html = Path(argv[0]).expanduser()
        pdf = html.with_suffix(".pdf")
    elif len(argv) == 2:
        html = Path(argv[0]).expanduser()
        pdf = Path(argv[1]).expanduser()
    else:
        print(__doc__, file=sys.stderr)
        return 2

    try:
        html_to_pdf(html, pdf)
    except FileNotFoundError as e:
        print(e, file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as e:
        print("浏览器打印失败：", e.stderr or e, file=sys.stderr)
        return 1

    print(f"已生成：{pdf}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
