"""Generate pinyin-ruby HTML for 三打白骨精 excerpt (拼音王子)."""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from pypinyin import lazy_pinyin, Style

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pinyin_prince import polyphone as _polyphone  # noqa: E402  (import after sys.path tweak)
OUT = ROOT / "baigujing-story.html"
STORY_PATH = ROOT / "stories" / "baigujing.txt"
POLYPHONE_PATH = ROOT / "data" / "polyphone.yaml"

TITLE_FALLBACK = "拼音对照"


@dataclass
class Story:
    title: str = ""
    author: str | None = None
    source: str | None = None
    audited: str | None = None
    level: str | None = None
    paragraphs: list[str] = field(default_factory=list)


_META_RE = re.compile(r"^#\s*(.+?)\s*[:：]\s*(.*)$")
_META_KEY_MAP: dict[str, str] = {
    "标题": "title",
    "作者": "author",
    "出处": "source",
    "拼音校对": "audited",
    "难度": "level",
}


def load_story(path: str | Path) -> Story:
    """解析 stories/*.txt：前若干行元信息 + 剩余正文（按空行分段）。"""
    text = Path(path).read_text(encoding="utf-8")
    lines = text.splitlines()

    story = Story()
    body_start = len(lines)

    for i, line in enumerate(lines):
        m = _META_RE.match(line)
        if not m:
            body_start = i
            break
        key = m.group(1).strip()
        value = m.group(2).strip()
        attr = _META_KEY_MAP.get(key)
        if attr is None:
            body_start = i
            break
        if attr == "title":
            story.title = value
        elif value:
            setattr(story, attr, value)
        # 值为空 → 保持默认（None），不动

    body_text = "\n".join(lines[body_start:])
    raw_paras = re.split(r"\n\n+", body_text)
    story.paragraphs = [p.strip() for p in raw_paras if p.strip()]
    return story


def load_polyphone(path: str | Path = POLYPHONE_PATH) -> _polyphone.PolyphoneTable | None:
    """加载多音字词表；文件不存在或加载失败时返回 None（容错优先）。"""
    p = Path(path)
    if not p.exists():
        print(f"提示: 多音字词表 {p} 不存在，跳过 polyphone override（占位表走 fallback）")
        return None
    try:
        return _polyphone.load_table(p)
    except NotImplementedError:
        print(f"提示: polyphone.load_table 尚未实装（Subagent A 还在干），跳过")
        return None
    except Exception as e:
        print(f"警告: 加载多音字词表失败: {e}，跳过 polyphone override")
        return None


def is_cjk(ch: str) -> bool:
    return "\u4e00" <= ch <= "\u9fff"


def char_pairs(text: str) -> list[tuple[str, str | None]]:
    out: list[tuple[str, str | None]] = []
    for ch in text:
        if ch.isspace():
            continue
        if is_cjk(ch):
            py = lazy_pinyin(ch, style=Style.TONE)[0]
            out.append((ch, py))
        else:
            out.append((ch, None))
    return out


def apply_particle_fixes(pairs: list[tuple[str, str | None]]) -> None:
    """Light-touch fixes for structural 的/地/得 in this story."""

    def set_py(i: int, py: str) -> None:
        ch, _ = pairs[i]
        pairs[i] = (ch, py)

    for i in range(1, len(pairs)):
        ch, py = pairs[i]
        if py is None:
            continue
        prev = pairs[i - 1][0]

        if ch == "得" and prev in "疼气笑走":
            set_py(i, "de")
        if ch == "地" and i >= 4:
            window = "".join(pairs[j][0] for j in range(i - 4, i + 1))
            if window == "依依不舍地":
                set_py(i, "de")


def escape_html(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def pairs_to_html(pairs: list[tuple[str, str | None]]) -> str:
    parts: list[str] = []
    for ch, py in pairs:
        if py is None:
            parts.append(
                f'<span class="punct"><ruby>{escape_html(ch)}<rt></rt></ruby></span>'
            )
        else:
            parts.append(f"<ruby>{escape_html(ch)}<rt>{escape_html(py)}</rt></ruby>")
    return "".join(parts)


def render_paragraphs_html(
    paragraphs: list[str],
    polyphone_table: _polyphone.PolyphoneTable | None = None,
) -> str:
    """逐段生成 <p class="line">…</p>，polyphone override 失败时降级不中断。"""
    out: list[str] = []
    for para in paragraphs:
        pairs = char_pairs(para)
        apply_particle_fixes(pairs)
        if polyphone_table is not None:
            try:
                _polyphone.apply_table(pairs, para, polyphone_table)
            except ValueError as e:
                print(f"警告: polyphone.apply_table 失败（{para[:12]}…）: {e}")
            except NotImplementedError:
                pass
        out.append(f'  <p class="line">{pairs_to_html(pairs)}</p>')
    return "\n".join(out)


def main(
    story_path: str | Path = STORY_PATH,
    out_path: str | Path = OUT,
    polyphone_path: str | Path = POLYPHONE_PATH,
) -> Path:
    story = load_story(story_path)
    table = load_polyphone(polyphone_path)
    body_paras = render_paragraphs_html(story.paragraphs, table)

    title = story.title.strip() or TITLE_FALLBACK

    html = f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape_html(title)}· 拼音对照</title>
  <style>
    @page {{
      size: A4;
      margin: 18mm 16mm;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: "Songti SC", "SimSun", "STSong", "Noto Serif SC", serif;
      font-size: 19px;
      line-height: 2.15;
      color: #111;
      max-width: 170mm;
      margin: 0 auto;
      padding: 10mm 0 16mm;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 600;
      text-align: center;
      margin: 0 0 14mm;
      letter-spacing: 0.08em;
    }}
    .line {{
      display: block;
      margin: 0 0 14px;
      text-indent: 2em;
      text-align: justify;
      text-justify: inter-character;
    }}
    .line ruby,
    .line .punct {{
      margin-right: 3px;
    }}
    ruby {{
      ruby-position: over;
      ruby-align: center;
      vertical-align: baseline;
    }}
    ruby > rt {{
      font-family: "Helvetica Neue", "Arial", "PingFang SC", "Noto Sans SC", sans-serif;
      font-size: 0.55em;
      font-weight: 500;
      color: #333;
      line-height: 1.15;
      user-select: none;
    }}
    .punct rt {{
      font-size: 0;
      opacity: 0;
    }}
    .note {{
      font-size: 14px;
      color: #555;
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
    }}
    @media print {{
      body {{ padding: 0; }}
    }}
  </style>
</head>
<body>
  <h1>{escape_html(title)}· 拼音对照</h1>

{body_paras}

  <p class="note">注：正文拼音由 <code>pypinyin</code> 逐字生成，已对「疼得、气得、笑得」中的「得」及「依依不舍地」中的「地」等结构助词作轻量校正；若遇多音字教学需要，请再对照词典微调。</p>
</body>
</html>
"""
    out_p = Path(out_path)
    out_p.write_text(html, encoding="utf-8")
    print(f"Wrote {out_p}")
    return out_p


if __name__ == "__main__":
    main()
