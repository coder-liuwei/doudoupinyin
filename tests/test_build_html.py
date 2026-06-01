"""Tests for scripts.build_baigujing_html — load_story / load_polyphone / main()."""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts import build_baigujing_html as build

ROOT = Path(__file__).resolve().parents[1]
STORIES = ROOT / "stories"


# ----------------------------- load_story -----------------------------


def test_load_story_baigujing_full_metadata_and_8_paragraphs():
    story = build.load_story(STORIES / "baigujing.txt")
    assert story.title == "三打白骨精（节选）"
    assert story.author == "吴承恩"
    assert story.source == "西游记 第二十七回"
    assert story.audited == "2026-05-15"
    assert story.level == "小学三年级"
    assert len(story.paragraphs) == 8
    assert all(p and p == p.strip() for p in story.paragraphs)
    assert story.paragraphs[0].startswith("唐僧师徒四人西天取经")


def test_load_story_template_placeholder_title_kept():
    """_template.txt 的标题是 <故事标题> 占位符，应原样解析（非空）。"""
    story = build.load_story(STORIES / "_template.txt")
    assert story.title == "<故事标题>"
    assert story.paragraphs == ["第一段正文。段间空一行。", "第二段正文。段间空一行。"]


def test_load_story_illegal_no_meta_yields_empty_title(tmp_path):
    """完全没有 # 元信息 → title 为空，正文按空行分段。"""
    p = tmp_path / "raw.txt"
    p.write_text("纯正文一段。\n\n纯正文二段。\n", encoding="utf-8")
    story = build.load_story(p)
    assert story.title == ""
    assert story.author is None
    assert story.source is None
    assert story.paragraphs == ["纯正文一段。", "纯正文二段。"]


def test_load_story_missing_title_field_only(tmp_path):
    """文件有 # 作者: 但没 # 标题: → title 为空，author 正确。"""
    p = tmp_path / "no_title.txt"
    p.write_text(
        "# 作者: 匿名\n"
        "\n"
        "第一段。\n"
        "\n"
        "第二段。\n",
        encoding="utf-8",
    )
    story = build.load_story(p)
    assert story.title == ""
    assert story.author == "匿名"
    assert len(story.paragraphs) == 2


def test_load_story_blank_value_keeps_none(tmp_path):
    p = tmp_path / "blank.txt"
    p.write_text(
        "# 标题: 测试\n"
        "# 作者: \n"  # 显式空值
        "\n"
        "正文段。\n",
        encoding="utf-8",
    )
    story = build.load_story(p)
    assert story.title == "测试"
    assert story.author is None


def test_load_story_supports_multi_blank_line_separator(tmp_path):
    p = tmp_path / "multi.txt"
    p.write_text(
        "# 标题: x\n"
        "\n"
        "段一。\n"
        "\n\n\n"
        "段二。\n",
        encoding="utf-8",
    )
    story = build.load_story(p)
    assert story.paragraphs == ["段一。", "段二。"]


def test_load_story_unknown_meta_key_stops_metadata_parsing(tmp_path):
    """遇到不在 _META_KEY_MAP 中的 key，视为正文起点。"""
    p = tmp_path / "unknown.txt"
    p.write_text(
        "# 标题: 已知\n"
        "# 随机键: 值\n"  # 不识别 → 后续行算正文
        "# 作者: 不会读到\n"
        "\n"
        "段一。\n",
        encoding="utf-8",
    )
    story = build.load_story(p)
    assert story.title == "已知"
    assert story.author is None
    body = "\n".join(story.paragraphs)
    assert "段一。" in body


# ----------------------------- load_polyphone -----------------------------


def test_load_polyphone_missing_file_returns_none(tmp_path, capsys):
    p = tmp_path / "nope.yaml"
    result = build.load_polyphone(p)
    assert result is None
    captured = capsys.readouterr()
    assert "不存在" in captured.out


# ----------------------------- main() 端到端 -----------------------------


def test_main_generates_html_with_ruby_and_at_least_8_lines(tmp_path):
    out = tmp_path / "baigujing-story.html"
    result = build.main(out_path=out)
    assert result == out
    assert out.exists()

    html = out.read_text(encoding="utf-8")
    assert "<ruby>" in html
    line_count = html.count('<p class="line">')
    assert line_count >= 8, f"期望 ≥8 个段落，实际 {line_count}"


def test_main_works_without_polyphone_table(tmp_path, capsys):
    """polyphone.yaml 不存在 → load_polyphone 返回 None → main 仍跑通。"""
    out = tmp_path / "baigujing-story.html"
    build.main(
        story_path=STORIES / "baigujing.txt",
        out_path=out,
        polyphone_path=tmp_path / "nope.yaml",
    )
    captured = capsys.readouterr()
    assert "不存在" in captured.out
    assert out.exists()
    html = out.read_text(encoding="utf-8")
    assert "<ruby>" in html
    assert html.count('<p class="line">') >= 8


def test_main_uses_story_title_in_html(tmp_path):
    out = tmp_path / "baigujing-story.html"
    build.main(
        story_path=STORIES / "baigujing.txt",
        out_path=out,
        polyphone_path=tmp_path / "nope.yaml",
    )
    html = out.read_text(encoding="utf-8")
    assert "三打白骨精（节选）" in html


def test_main_uses_fallback_title_when_title_empty(tmp_path):
    """标题为空时使用 TITLE_FALLBACK。"""
    story_file = tmp_path / "no_title.txt"
    story_file.write_text("正文段落一。\n\n正文段落二。\n", encoding="utf-8")
    out = tmp_path / "out.html"
    build.main(
        story_path=story_file,
        out_path=out,
        polyphone_path=tmp_path / "nope.yaml",
    )
    html = out.read_text(encoding="utf-8")
    assert "拼音对照" in html


def test_main_applies_particle_fixes_kept(tmp_path):
    """得 → de（疼得）必须出现在 HTML 里。"""
    out = tmp_path / "baigujing-story.html"
    build.main(
        story_path=STORIES / "baigujing.txt",
        out_path=out,
        polyphone_path=tmp_path / "nope.yaml",
    )
    html = out.read_text(encoding="utf-8")
    # 故事里「疼得悟空满地打滚」中的「得」应被改读 de
    assert ">de<" in html


# ----------------------------- pairs 稳定行为 -----------------------------


def test_char_pairs_basic():
    pairs = build.char_pairs("你好")
    assert len(pairs) == 2
    assert pairs[0][0] == "你"
    assert pairs[1][0] == "好"
    assert all(p[1] is not None for p in pairs)


def test_apply_particle_fixes_de_for_疼得():
    pairs = build.char_pairs("疼得悟空")
    build.apply_particle_fixes(pairs)
    ch_de = next(p for p in pairs if p[0] == "得")
    assert ch_de[1] == "de"
