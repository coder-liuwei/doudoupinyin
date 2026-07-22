import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOTATION_SETTINGS,
  annotationKey,
  buildAnnotationVisibility,
  annotationSettingsFromRecord,
  collectRiskAnnotationKeys,
  normalizeAnnotationSettings,
} from "@/lib/annotation";
import { useEditorStore } from "@/store/useEditorStore";
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
        riskKeys: [],
        manualKeys: ["0:1"],
      }),
    ).toEqual([[false, true, false]]);
  });

  it("风险模式复用读音风险分析", () => {
    expect(
      buildAnnotationVisibility([paragraph], {
        mode: "risk",
        riskKeys: ["0:1"],
        manualKeys: [],
      }),
    ).toEqual([[false, true, false]]);
  });

  it("非法持久化值回退到安全默认值", () => {
    expect(
      normalizeAnnotationSettings({
        mode: "unknown",
        riskKeys: ["0:1", null, "bad", "0:1"],
        manualKeys: ["0:1", 2, "bad", "0:1"],
      }),
    ).toEqual({
      mode: "full",
      riskKeys: ["0:1"],
      manualKeys: ["0:1"],
    });
  });

  it("旧设置缺少 riskKeys 时从段落风险生成", () => {
    expect(collectRiskAnnotationKeys([paragraph])).toEqual(["0:1"]);
    expect(
      normalizeAnnotationSettings(
        { mode: "risk", manualKeys: [] },
        [paragraph],
      ),
    ).toEqual({ mode: "risk", riskKeys: ["0:1"], manualKeys: [] });
  });

  it("显式清空的 riskKeys 不会被重新生成", () => {
    expect(
      normalizeAnnotationSettings(
        { mode: "risk", riskKeys: [], manualKeys: [] },
        [paragraph],
      ),
    ).toEqual({ mode: "risk", riskKeys: [], manualKeys: [] });
  });

  it("风险和手动模式分别按自己的位置显示", () => {
    const settings = {
      mode: "risk" as const,
      riskKeys: ["0:0"],
      manualKeys: ["0:1"],
    };

    expect(buildAnnotationVisibility([paragraph], settings)).toEqual([
      [true, false, false],
    ]);
    expect(
      buildAnnotationVisibility([paragraph], { ...settings, mode: "manual" }),
    ).toEqual([[false, true, false]]);
  });

  it("store 在两个过滤模式中分别增删和清空位置", () => {
    useEditorStore.getState().setParagraphs([paragraph]);
    expect(useEditorStore.getState().riskAnnotationKeys).toEqual(["0:1"]);
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);

    useEditorStore.getState().setAnnotationMode("risk");
    useEditorStore.getState().setAnnotationAt(0, 0, true);
    useEditorStore.getState().setAnnotationMode("manual");
    useEditorStore.getState().setAnnotationAt(0, 1, true);

    expect(useEditorStore.getState().riskAnnotationKeys).toEqual([
      "0:1",
      "0:0",
    ]);
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:1"]);

    useEditorStore.getState().clearCurrentAnnotations();
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
    expect(useEditorStore.getState().riskAnnotationKeys).toEqual([
      "0:1",
      "0:0",
    ]);
  });

  it("历史记录缺少新字段时按全文读取", () => {
    const record = {
      annotationSettings: { mode: "manual", manualKeys: ["0:1"] },
      paragraphs: [paragraph],
    } as unknown as HistoryRecord;

    expect(annotationSettingsFromRecord(record)).toEqual({
      mode: "manual",
      riskKeys: ["0:1"],
      manualKeys: ["0:1"],
    });
    expect(annotationSettingsFromRecord({} as HistoryRecord)).toEqual(
      DEFAULT_ANNOTATION_SETTINGS,
    );
  });
});
