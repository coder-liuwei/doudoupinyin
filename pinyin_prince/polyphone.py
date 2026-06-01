"""多音字词表加载与应用。

教学场景下，pypinyin 的单字默认值经常猜错（行/还/长/佛/强/得/地/了/着…）。
本模块提供一个用户可编辑的词表（YAML 格式），让家长/老师能覆盖默认读音，
避免「生成的 PDF 拿给娃读，音是错的」这种事故。

词表结构（见 ``data/polyphone.yaml``）：

.. code-block:: yaml

    defaults:            # 单字兜底读音
      "行": "xíng"
    overrides:           # 词组级（按文本子串匹配）
      - pattern: "勉强"
        pinyin: ["miǎn", "qiǎng"]
    skips:               # 跳过 pypinyin 的字符（标点、数字、品牌名等）
      - "·"

匹配规则（自上而下，第一个命中即返回）：

1. 命中 ``overrides`` 区间 → 区间内每个字从 ``pinyin`` 数组取对应读音
2. 命中 ``defaults`` 的单字 → 用 ``defaults[ch]``
3. 都不命中 → 调用 ``pypinyin.lazy_pinyin`` 走默认
4. ``skips`` 中的字符不调用 pypinyin
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

import yaml


@dataclass(frozen=True)
class PolyphoneOverride:
    """一个词组级覆盖。``pattern`` 与 ``pinyin`` 长度必须一致。"""

    pattern: str
    pinyin: Sequence[str]


@dataclass(frozen=True)
class PolyphoneTable:
    """多音字词表。``defaults`` 单字 → 拼音；``overrides`` 词组级匹配。"""

    defaults: dict[str, str] = field(default_factory=dict)
    overrides: tuple[PolyphoneOverride, ...] = ()
    skips: frozenset[str] = field(default_factory=frozenset)

    def is_valid(self) -> bool:
        """校验所有 override 内部 pattern 与 pinyin 长度一致。"""
        for ov in self.overrides:
            if len(ov.pattern) != len(ov.pinyin):
                return False
        return True


_CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def _is_cjk(ch: str) -> bool:
    return bool(_CJK_RE.match(ch))


def load_table(path: str | Path) -> PolyphoneTable:
    """从 YAML 文件加载多音字词表。

    参数:
        path: ``data/polyphone.yaml`` 路径。

    返回:
        ``PolyphoneTable`` 实例。

    异常:
        FileNotFoundError: 文件不存在。
        ValueError: YAML 结构不合法或 override pattern/pinyin 长度不一致。
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError("多音字词表不存在: %s" % path)

    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        raise ValueError("多音字词表 YAML 解析失败: %s" % exc) from exc

    if not isinstance(raw, dict):
        raise ValueError(
            "多音字词表根节点必须是 mapping，实际得到 %s" % type(raw).__name__
        )

    defaults_raw = raw.get("defaults") or {}
    if not isinstance(defaults_raw, dict):
        raise ValueError("多音字词表 defaults 必须是 mapping")

    defaults: dict[str, str] = {}
    for k, v in defaults_raw.items():
        if not isinstance(k, str) or k.startswith("_"):
            continue
        if not isinstance(v, str):
            raise ValueError(
                "多音字 defaults[%r] 必须是字符串，实际为 %s" % (k, type(v).__name__)
            )
        defaults[k] = v

    overrides_raw = raw.get("overrides") or []
    if not isinstance(overrides_raw, list):
        raise ValueError("多音字词表 overrides 必须是列表")

    overrides: list[PolyphoneOverride] = []
    for idx, item in enumerate(overrides_raw):
        if not isinstance(item, dict):
            raise ValueError("多音字 overrides[%d] 必须是 mapping" % idx)
        pattern = item.get("pattern")
        pinyin = item.get("pinyin")
        if not isinstance(pattern, str) or not pattern:
            raise ValueError(
                "多音字 overrides[%d].pattern 必须是非空字符串" % idx
            )
        if not isinstance(pinyin, list) or not all(
            isinstance(p, str) for p in pinyin
        ):
            raise ValueError(
                "多音字 overrides[%d].pinyin 必须是字符串列表" % idx
            )
        if len(pattern) != len(pinyin):
            raise ValueError(
                "多音字 override pattern/pinyin 长度不一致: '%s' (pattern %d 字, pinyin %d 项)"
                % (pattern, len(pattern), len(pinyin))
            )
        overrides.append(PolyphoneOverride(pattern=pattern, pinyin=tuple(pinyin)))

    skips_raw = raw.get("skips") or []
    if not isinstance(skips_raw, list):
        raise ValueError("多音字词表 skips 必须是列表")
    skips: frozenset[str] = frozenset(s for s in skips_raw if isinstance(s, str))

    return PolyphoneTable(
        defaults=defaults,
        overrides=tuple(overrides),
        skips=skips,
    )


def _build_text_to_pair_index(
    text: str, pairs: list[tuple[str, str | None]]
) -> list[int | None]:
    """把 text 的每个字符位置映射到 pairs 索引（空白处为 None）。

    约定：``pairs`` 是按 ``text`` 去空白后顺序排列的字符序列，调用方需保证这一点。
    """
    mapping: list[int | None] = [None] * len(text)
    pi = 0
    for j, ch in enumerate(text):
        if ch.isspace():
            continue
        if pi < len(pairs):
            mapping[j] = pi
            pi += 1
    return mapping


def apply_table(
    pairs: list[tuple[str, str | None]],
    text: str,
    table: PolyphoneTable,
) -> list[tuple[str, str | None]]:
    """把多音字词表应用到逐字 pairs 上。

    参数:
        pairs: 当前已生成的 ``(char, pinyin)`` 序列（可来自 pypinyin）。
        text: 原始文本（用于在 ``pairs`` 上做区间定位）。
        table: 多音字词表。

    返回:
        修改后的 pairs（in-place 修改并返回同一对象）。

    算法:

    1. 在 ``text`` 上扫 ``table.overrides``，找出所有命中区间
        - 区间冲突（重叠）→ 抛 ``ValueError``
    2. 命中区间内：从 ``ov.pinyin`` 取对应读音覆盖 ``pairs[i]``
    3. 未命中但 CJK：先看 ``table.defaults[ch]``，否则保留 ``pairs[i]`` 原值
    4. ``table.skips`` 中字符：``pairs[i] = (ch, None)``
    """
    text_to_pair = _build_text_to_pair_index(text, pairs)

    intervals: list[tuple[PolyphoneOverride, int, int]] = []
    for ov in table.overrides:
        start = 0
        while True:
            idx = text.find(ov.pattern, start)
            if idx == -1:
                break
            intervals.append((ov, idx, idx + len(ov.pattern)))
            start = idx + 1

    intervals.sort(key=lambda x: (x[1], x[2]))

    for i in range(1, len(intervals)):
        prev_ov, prev_start, prev_end = intervals[i - 1]
        cur_ov, cur_start, cur_end = intervals[i]
        if cur_start < prev_end:
            raise ValueError(
                "多音字 override 区间冲突: '%s' 与 '%s' 在位置 %d"
                % (prev_ov.pattern, cur_ov.pattern, cur_start)
            )

    override_at: dict[int, str] = {}
    for ov, s, e in intervals:
        for k, ti in enumerate(range(s, e)):
            override_at[ti] = ov.pinyin[k]

    for j, ch in enumerate(text):
        pi = text_to_pair[j]
        if pi is None:
            continue
        if ch in table.skips:
            pairs[pi] = (ch, None)
        elif j in override_at:
            pairs[pi] = (ch, override_at[j])
        elif _is_cjk(ch) and ch in table.defaults:
            pairs[pi] = (ch, table.defaults[ch])

    return pairs
