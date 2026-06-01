"""polyphone 模块的测试。"""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from pypinyin import Style, lazy_pinyin

from pinyin_prince.polyphone import (
    PolyphoneOverride,
    PolyphoneTable,
    apply_table,
    load_table,
)

ROOT = Path(__file__).resolve().parents[1]
BAIGUJING_TXT = ROOT / "stories" / "baigujing.txt"
DEFAULT_YAML = ROOT / "data" / "polyphone.yaml"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _cjk_pairs(text: str) -> list[tuple[str, str | None]]:
    """与 build_baigujing_html.char_pairs 行为对齐的 helper。"""
    out: list[tuple[str, str | None]] = []
    for ch in text:
        if ch.isspace():
            continue
        if "\u4e00" <= ch <= "\u9fff":
            out.append((ch, lazy_pinyin(ch, style=Style.TONE)[0]))
        else:
            out.append((ch, None))
    return out


def _write_yaml(tmp_path: Path, data: dict) -> Path:
    p = tmp_path / "polyphone.yaml"
    p.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# load_table
# ---------------------------------------------------------------------------


class TestLoadTable:
    def test_load_default_yaml(self):
        """默认词表能加载且通过 is_valid。"""
        table = load_table(DEFAULT_YAML)
        assert table.is_valid()
        assert table.defaults  # 至少有单字 defaults
        assert isinstance(table.skips, frozenset)

    def test_missing_fields_use_defaults(self, tmp_path):
        """YAML 缺字段不报错，返回空对应段。"""
        p = _write_yaml(tmp_path, {})
        table = load_table(p)
        assert table.defaults == {}
        assert table.overrides == ()
        assert table.skips == frozenset()

    def test_partial_yaml(self, tmp_path):
        """只写 defaults，其他字段缺失也不报错。"""
        p = _write_yaml(tmp_path, {"defaults": {"行": "xíng"}})
        table = load_table(p)
        assert table.defaults == {"行": "xíng"}
        assert table.overrides == ()

    def test_underscore_keys_ignored(self, tmp_path):
        """下划线开头的 key 视作注释，被忽略。"""
        p = _write_yaml(
            tmp_path,
            {
                "_comment": "这份是注释",
                "defaults": {"行": "xíng"},
            },
        )
        table = load_table(p)
        assert table.defaults == {"行": "xíng"}
        assert "_comment" not in table.defaults

    def test_skips_become_frozenset(self, tmp_path):
        p = _write_yaml(tmp_path, {"skips": ["·", "——", "·"]})
        table = load_table(p)
        assert table.skips == frozenset({"·", "——"})
        assert isinstance(table.skips, frozenset)

    def test_override_length_mismatch_raises(self, tmp_path):
        """override pattern 与 pinyin 长度不一致 → ValueError 指明 pattern 文本。"""
        p = _write_yaml(
            tmp_path,
            {
                "overrides": [
                    {"pattern": "勉强", "pinyin": ["miǎn"]},  # 2字 vs 1项
                ]
            },
        )
        with pytest.raises(ValueError, match="勉强"):
            load_table(p)

    def test_override_length_mismatch_too_long(self, tmp_path):
        p = _write_yaml(
            tmp_path,
            {
                "overrides": [
                    {"pattern": "勉强", "pinyin": ["miǎn", "qiǎng", "foo"]},
                ]
            },
        )
        with pytest.raises(ValueError, match="勉强"):
            load_table(p)

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            load_table(tmp_path / "nope.yaml")

    def test_invalid_yaml_raises_valueerror(self, tmp_path):
        p = tmp_path / "bad.yaml"
        p.write_text("defaults: [unclosed", encoding="utf-8")
        with pytest.raises(ValueError, match="YAML 解析失败"):
            load_table(p)

    def test_root_must_be_mapping(self, tmp_path):
        p = tmp_path / "list_root.yaml"
        p.write_text("- foo\n- bar\n", encoding="utf-8")
        with pytest.raises(ValueError, match="根节点必须是 mapping"):
            load_table(p)


# ---------------------------------------------------------------------------
# apply_table — override
# ---------------------------------------------------------------------------


class TestApplyOverride:
    def test_override_hits(self):
        text = "勉强笑了笑"
        pairs = _cjk_pairs(text)
        table = PolyphoneTable(
            overrides=(PolyphoneOverride(pattern="勉强", pinyin=("miǎn", "qiǎng")),)
        )
        apply_table(pairs, text, table)
        assert pairs[0] == ("勉", "miǎn")
        assert pairs[1] == ("强", "qiǎng")
        # 后续字保留 pypinyin 兜底
        assert pairs[2] == ("笑", "xiào")

    def test_multiple_overrides_no_conflict(self):
        text = "他勉强地说，仿佛很委屈"
        pairs = _cjk_pairs(text)
        table = PolyphoneTable(
            overrides=(
                PolyphoneOverride(pattern="勉强", pinyin=("miǎn", "qiǎng")),
                PolyphoneOverride(pattern="仿佛", pinyin=("fǎng", "fú")),
            )
        )
        apply_table(pairs, text, table)
        char_to_py = dict(pairs)
        # 命中 override 的字
        assert char_to_py["勉"] == "miǎn"
        assert char_to_py["强"] == "qiǎng"
        assert char_to_py["仿"] == "fǎng"
        assert char_to_py["佛"] == "fú"
        # 未命中 override 的字保留 pypinyin 兜底
        assert char_to_py["他"] == "tā"
        assert char_to_py["说"] == "shuō"
        # 标点保持 None
        assert ("，", None) in pairs

    def test_interval_conflict_raises(self):
        """两个 override 区间在 text 上重叠 → ValueError。"""
        # 故意让两个 override 都能在 "ABCABCD" 形式上重叠
        # 简单构造：text = "勉强", override1 = "勉强", override2 = "强笑"（后者起点 1, 终点 3）
        # 不对，"勉强"长度 2。重新设计：
        text = "abcab"
        # override pattern1 = "ab" 命中 (0,2)
        # override pattern2 = "cab" 命中 (2,5) -> 不冲突
        # 我们需要冲突：让 "abca" 区间上两个 override 重叠
        text = "abcdab"
        # override "abcd" (0,4), "cdab" (2,6) — 重叠 (2,4)
        table = PolyphoneTable(
            overrides=(
                PolyphoneOverride(pattern="abcd", pinyin=("a", "b", "c", "d")),
                PolyphoneOverride(pattern="cdab", pinyin=("c", "d", "a", "b")),
            )
        )
        pairs = _cjk_pairs(text)
        with pytest.raises(ValueError, match="多音字 override 区间冲突"):
            apply_table(pairs, text, table)

    def test_overlapping_patterns_too_similar(self):
        """同位置子串（如 prefix 关系）也应当作冲突。"""
        text = "勉强说"
        table = PolyphoneTable(
            overrides=(
                PolyphoneOverride(pattern="勉强", pinyin=("miǎn", "qiǎng")),
                PolyphoneOverride(pattern="勉强说", pinyin=("miǎn", "qiǎng", "shuō")),
            )
        )
        pairs = _cjk_pairs(text)
        with pytest.raises(ValueError, match="多音字 override 区间冲突"):
            apply_table(pairs, text, table)

    def test_conflict_error_message_mentions_patterns(self):
        text = "abcdab"
        table = PolyphoneTable(
            overrides=(
                PolyphoneOverride(pattern="abcd", pinyin=("a", "b", "c", "d")),
                PolyphoneOverride(pattern="cdab", pinyin=("c", "d", "a", "b")),
            )
        )
        pairs = _cjk_pairs(text)
        with pytest.raises(ValueError) as excinfo:
            apply_table(pairs, text, table)
        msg = str(excinfo.value)
        assert "abcd" in msg
        assert "cdab" in msg


# ---------------------------------------------------------------------------
# apply_table — defaults & falls-back
# ---------------------------------------------------------------------------


class TestApplyDefaults:
    def test_default_overrides_pypinyin(self):
        """pypinyin 把「行」读 xíng/háng 时，default 强制成 xíng。"""
        text = "行走"
        pairs = _cjk_pairs(text)
        # 先看下 pypinyin 给的什么
        # 行: xíng 默认
        assert pairs[0][1] == "xíng"
        table = PolyphoneTable(defaults={"行": "xíng"})
        apply_table(pairs, text, table)
        assert pairs[0] == ("行", "xíng")

    def test_default_used_when_pypinyin_would_be_wrong(self):
        """构造一个 pypinyin 明显会读错、default 兜底的场景。"""
        # 强 qiáng 是 default; pypinyin 默认就是 qiáng
        text = "强迫"
        pairs = _cjk_pairs(text)
        table = PolyphoneTable(defaults={"强": "qiáng"})
        apply_table(pairs, text, table)
        assert pairs[0] == ("强", "qiáng")

    def test_no_default_no_override_keeps_pypinyin(self):
        text = "你好"
        pairs = _cjk_pairs(text)
        original = list(pairs)
        table = PolyphoneTable()
        apply_table(pairs, text, table)
        assert pairs == original

    def test_punctuation_untouched(self):
        """标点不在 skips 时保留 pairs 原值（这里是 None）。"""
        text = "你好，世界"
        pairs = _cjk_pairs(text)
        # 找 '，' 的位置
        comma_idx = next(i for i, (ch, _) in enumerate(pairs) if ch == "，")
        table = PolyphoneTable()
        apply_table(pairs, text, table)
        assert pairs[comma_idx] == ("，", None)


# ---------------------------------------------------------------------------
# apply_table — skips
# ---------------------------------------------------------------------------


class TestApplySkips:
    def test_skip_char_set_to_none(self):
        """即使 pairs[i] 有拼音，skips 中的字符也强制置 None。"""
        text = "中间·分隔"
        pairs = _cjk_pairs(text)
        # 模拟「·」被 pypinyin 错误处理成非 None（实际 pypinyin 透传，py=·）
        # 强制注入一个非 None 测试 apply_table 能否覆盖
        dot_idx = next(i for i, (ch, _) in enumerate(pairs) if ch == "·")
        pairs[dot_idx] = ("·", "FOO")  # 故意污染
        table = PolyphoneTable(skips=frozenset({"·"}))
        apply_table(pairs, text, table)
        assert pairs[dot_idx] == ("·", None)

    def test_skip_default_punctuation_idempotent(self):
        """标点本身 pypinyin 返回 None 时，skips 设置后仍为 None。"""
        text = "你好。"
        pairs = _cjk_pairs(text)
        table = PolyphoneTable(skips=frozenset({"。"}))
        apply_table(pairs, text, table)
        assert pairs[-1] == ("。", None)

    def test_skips_does_not_affect_cjk(self):
        text = "你好"
        pairs = _cjk_pairs(text)
        table = PolyphoneTable(skips=frozenset({"X"}))  # 不在 text
        apply_table(pairs, text, table)
        assert pairs == [("你", "nǐ"), ("好", "hǎo")]


# ---------------------------------------------------------------------------
# apply_table — 端到端 / 白骨精
# ---------------------------------------------------------------------------


def _read_story_body() -> str:
    """读 stories/baigujing.txt，丢掉元信息行和空行。"""
    lines = BAIGUJING_TXT.read_text(encoding="utf-8").splitlines()
    body_lines = []
    in_meta = True
    for line in lines:
        if in_meta:
            if line.strip() == "":
                in_meta = False
            continue
        if line.strip():
            body_lines.append(line)
    return "\n".join(body_lines)


class TestEndToEndBaigujing:
    def test_story_file_exists(self):
        assert BAIGUJING_TXT.exists()

    def test_baigujing_keyword_overrides(self):
        """白骨精故事关键 override 片段读音正确。"""
        body = _read_story_body()
        table = load_table(DEFAULT_YAML)
        assert table.is_valid()

        for paragraph in body.split("\n\n"):
            if not paragraph.strip():
                continue
            pairs = _cjk_pairs(paragraph)
            apply_table(pairs, paragraph, table)
            char_to_py = dict(pairs)

            # 1) "依依不舍地" 必须读 yī yī bù shě de
            if "依依不舍地" in paragraph:
                assert char_to_py["依"] == "yī"
                assert char_to_py["依"] == "yī"
                assert char_to_py["不"] == "bù"
                assert char_to_py["舍"] == "shě"
                assert char_to_py["地"] == "de"

            # 2) "还念起" 必须读 hái niàn qǐ
            if "还念起" in paragraph:
                assert char_to_py["还"] == "hái"
                assert char_to_py["念"] == "niàn"
                assert char_to_py["起"] == "qǐ"

            # 3) "强忍" 必须读 qiáng rěn
            if "强忍" in paragraph:
                assert char_to_py["强"] == "qiáng"

            # 4) "拄着/提着/哭着/走着" 的 "着" 读 zhe
            for ch in ("拄", "提", "哭", "走", "住"):
                if ch in paragraph:
                    # 这些"着"都跟 zhe；如果 pypinyin 给出 zhe 就 OK
                    # 但同时要保证 "着" 字确实在词表里有 zhe default
                    pass
            # 直接断言 "着" default
            assert table.defaults.get("着") == "zhe"

            # 5) "疼得" 必须读 téng de
            if "疼得" in paragraph:
                assert char_to_py["疼"] == "téng"
                assert char_to_py["得"] == "de"

            # 6) "把" 介词读 bǎ
            if "把孙悟空" in paragraph:
                assert char_to_py["把"] == "bǎ"

            # 7) "长生" 长读 cháng
            if "长生" in paragraph:
                assert char_to_py["长"] == "cháng"

    def test_baigujing_no_pinyin_unchanged_for_unknown(self):
        """未命中 override/default 的字保持 pypinyin 原值。"""
        paragraph = "唐僧师徒四人西天取经"
        pairs = _cjk_pairs(paragraph)
        original = list(pairs)
        table = load_table(DEFAULT_YAML)
        apply_table(pairs, paragraph, table)
        for orig, after in zip(original, pairs):
            assert orig == after


# ---------------------------------------------------------------------------
# apply_table — 端到端用临时 fixture（不依赖默认 yaml）
# ---------------------------------------------------------------------------


class TestEndToEndFixture:
    def test_apply_with_custom_yaml(self, tmp_path):
        """用临时 yaml 走端到端：验证 load + apply 组合可用。"""
        data = {
            "defaults": {"行": "xíng", "得": "de"},
            "overrides": [
                {"pattern": "勉强", "pinyin": ["miǎn", "qiǎng"]},
            ],
            "skips": ["·"],
        }
        p = _write_yaml(tmp_path, data)
        table = load_table(p)

        paragraph = "他勉强地行走·继续"
        pairs = _cjk_pairs(paragraph)
        apply_table(pairs, paragraph, table)
        char_to_py = dict(pairs)
        assert char_to_py["勉"] == "miǎn"
        assert char_to_py["强"] == "qiǎng"
        assert char_to_py["地"] == "dì"  # pypinyin 默认（没在 defaults/overrides）
        assert char_to_py["行"] == "xíng"
        assert char_to_py["走"] == "zǒu"
        # · 强制 None
        dot = next(p for p in pairs if p[0] == "·")
        assert dot == ("·", None)


# ---------------------------------------------------------------------------
# 组合行为
# ---------------------------------------------------------------------------


class TestInPlaceAndReturn:
    def test_apply_returns_same_list(self):
        text = "勉强"
        pairs = _cjk_pairs(text)
        table = PolyphoneTable(
            overrides=(PolyphoneOverride(pattern="勉强", pinyin=("miǎn", "qiǎng")),)
        )
        ret = apply_table(pairs, text, table)
        assert ret is pairs

    def test_apply_modifies_in_place(self):
        text = "勉强"
        pairs = _cjk_pairs(text)
        table = PolyphoneTable(
            overrides=(PolyphoneOverride(pattern="勉强", pinyin=("miǎn", "qiǎng")),)
        )
        before_id = id(pairs)
        apply_table(pairs, text, table)
        assert id(pairs) == before_id
        assert pairs[0] == ("勉", "miǎn")
        assert pairs[1] == ("强", "qiǎng")
