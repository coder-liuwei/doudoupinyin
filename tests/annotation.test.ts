import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOTATION_SETTINGS,
  annotationKey,
  buildAnnotationVisibility,
  annotationSettingsFromRecord,
  normalizeAnnotationSettings,
} from "@/lib/annotation";
import type { Paragraph } from "@/lib/types";
import type { HistoryRecord } from "@/lib/types";

const paragraph: Paragraph = [
  { ch: "春", py: "chūn", isPunct: false, pySource: "auto" },
  { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
  { ch: "。", py: null, isPunct: true },
];

describe("annotation settings", () => {
  it("旧数据默认使用全文注音", () => {
    expect(normalizeAnnotationSettings(undefined)).toEqual(
      DEFAULT_ANNOTATION_SETTINGS,
    );
    expect(buildAnnotationVisibility([paragraph], undefined)).toEqual([
      [true, true, false],
    ]);
  });

  it("手动模式只显示选中的当前出现位置", () => {
    expect(annotationKey(0, 1)).toBe("0:1");
    expect(
      buildAnnotationVisibility([paragraph], {
        mode: "manual",
        manualKeys: ["0:1"],
      }),
    ).toEqual([[false, true, false]]);
  });

  it("风险模式复用读音风险分析", () => {
    expect(
      buildAnnotationVisibility([paragraph], {
        mode: "risk",
        manualKeys: [],
      }),
    ).toEqual([[false, true, false]]);
  });

  it("非法持久化值回退到安全默认值", () => {
    expect(
      normalizeAnnotationSettings({
        mode: "unknown",
        manualKeys: ["0:1", 2, "bad", "0:1"],
      }),
    ).toEqual({ mode: "full", manualKeys: ["0:1"] });
  });

  it("历史记录缺少新字段时按全文读取", () => {
    const record = {
      annotationSettings: { mode: "manual", manualKeys: ["0:1"] },
    } as unknown as HistoryRecord;

    expect(annotationSettingsFromRecord(record)).toEqual({
      mode: "manual",
      manualKeys: ["0:1"],
    });
    expect(annotationSettingsFromRecord({} as HistoryRecord)).toEqual(
      DEFAULT_ANNOTATION_SETTINGS,
    );
  });
});
