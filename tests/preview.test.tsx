import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PolyphoneCandidateCard from "@/components/PolyphoneCandidateCard";
import Preview from "@/components/Preview";
import PrintSettingsPanel from "@/components/PrintSettingsPanel";
import { useEditorStore } from "@/store/useEditorStore";

function renderPreview() {
  return render(
    <MemoryRouter>
      <Preview />
    </MemoryRouter>,
  );
}

describe("PolyphoneCandidateCard", () => {
  it("展示当前汉字、候选读音和多音字标签", () => {
    render(
      <PolyphoneCandidateCard
        ch="行"
        currentPy="háng"
        selectedPy="háng"
        candidates={["háng", "xíng"]}
        position={{ left: 120, top: 80 }}
        onSelect={vi.fn()}
        onManualEdit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "行的读音" })).not.toBeNull();
    expect(screen.getByText("多音字")).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "选择 háng" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "选择 xíng" })).not.toBeNull();
  });

  it("候选选择和手动输入通过回调交给上层", () => {
    const onSelect = vi.fn();
    const onManualEdit = vi.fn();
    render(
      <PolyphoneCandidateCard
        ch="行"
        currentPy="háng"
        selectedPy="háng"
        candidates={["háng", "xíng"]}
        position={{ left: 120, top: 80 }}
        onSelect={onSelect}
        onManualEdit={onManualEdit}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "选择 xíng" }));
    expect(onSelect).toHaveBeenCalledWith("xíng");

    fireEvent.click(screen.getByRole("button", { name: "手动输入拼音" }));
    expect(onManualEdit).toHaveBeenCalledOnce();
  });

  it("未注音时仍展示当前读音但没有候选被选中", () => {
    render(
      <PolyphoneCandidateCard
        ch="行"
        currentPy="xíng"
        selectedPy={null}
        candidates={["xíng", "háng"]}
        position={{ left: 120, top: 80 }}
        onSelect={vi.fn()}
        onManualEdit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("xíng", { selector: ".polyphone-card__pinyin" }))
      .not.toBeNull();
    expect(
      screen.getByRole("button", { name: "选择 xíng" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen.getByRole("button", { name: "选择 háng" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });
});

describe("Preview proofreading", () => {
  beforeEach(() => {
    useEditorStore.setState({
      input: "",
      mode: "plain",
      paragraphs: [],
      fontSize: 20,
      lineHeight: 2.15,
      letterSpacing: 2,
      layoutMode: "auto",
      indentFirstLine: true,
      showTitle: true,
      pageGuide: "plain",
      annotationMode: "full",
      riskAnnotationKeys: [],
      manualAnnotationKeys: [],
      title: "未命名",
      currentId: null,
      err: null,
    });
  });

  it("选择候选读音后保存为人工修改", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "行", py: "xíng", isPunct: false, pySource: "auto" }]],
    });

    renderPreview();
    fireEvent.click(screen.getByText("xíng"));
    fireEvent.click(screen.getByRole("button", { name: "选择 háng" }));

    expect(useEditorStore.getState().paragraphs[0][0]).toMatchObject({
      py: "háng",
      pySource: "manual",
    });
    expect(screen.queryByRole("dialog", { name: "行的读音" })).toBeNull();
  });

  it("选择当前读音不重复更新来源", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "行", py: "xíng", isPunct: false, pySource: "auto" }]],
    });

    renderPreview();
    fireEvent.click(screen.getByText("xíng"));
    fireEvent.click(screen.getByRole("button", { name: "选择 xíng" }));

    expect(useEditorStore.getState().paragraphs[0][0].pySource).toBe("auto");
  });

  it("单音字也能打开只包含当前读音的字卡", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "你", py: "nǐ", isPunct: false, pySource: "auto" }]],
    });

    renderPreview();
    fireEvent.click(screen.getByText("nǐ"));

    expect(screen.getByRole("dialog", { name: "你的读音" })).not.toBeNull();
    expect(screen.getByText("当前读音")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "选择 nǐ" })).toHaveLength(1);
  });

  it("按 Escape 关闭候选字卡", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "行", py: "xíng", isPunct: false, pySource: "auto" }]],
    });

    renderPreview();
    fireEvent.click(screen.getByText("xíng"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "行的读音" })).toBeNull();
  });

  it("点击字卡外部关闭候选字卡", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "行", py: "xíng", isPunct: false, pySource: "auto" }]],
    });

    renderPreview();
    fireEvent.click(screen.getByText("xíng"));
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("dialog", { name: "行的读音" })).toBeNull();
  });

  it("手动模式用键盘打开或关闭弹窗都不会误加注音", () => {
    useEditorStore.setState({
      annotationMode: "manual",
      riskAnnotationKeys: ["0:0"],
      manualAnnotationKeys: [],
      paragraphs: [[
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    renderPreview();
    const character = screen.getByRole("button", { name: "行" });

    fireEvent.keyDown(character, { key: "Enter" });
    expect(screen.getByRole("dialog", { name: "行的读音" })).not.toBeNull();
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "行的读音" })).toBeNull();
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);

    fireEvent.keyDown(character, { key: " " });
    fireEvent.click(screen.getByRole("button", { name: "关闭读音选择" }));
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);

    fireEvent.click(character);
    fireEvent.pointerDown(document.body);
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
    expect(useEditorStore.getState().riskAnnotationKeys).toEqual(["0:0"]);
  });

  it("marks common polyphone characters as proofreading suspects", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "行", py: "xíng", isPunct: false, pySource: "auto" }]],
    });

    const { container } = renderPreview();

    expect(container.querySelector(".proof-unit.suspect")).not.toBeNull();
    expect(screen.getByText("1 个待核对")).not.toBeNull();
  });

  it("applies layout and indent classes to the preview body", () => {
    useEditorStore.setState({
      layoutMode: "preserve",
      indentFirstLine: false,
      paragraphs: [[{ ch: "床", py: "chuáng", isPunct: false, pySource: "auto" }]],
    });

    const { container } = renderPreview();
    const preview = container.querySelector("#previewInner");

    expect(preview?.className).toContain("layout-preserve");
    expect(preview?.className).toContain("no-first-indent");
  });

  it("手动输入入口继续使用现有范围编辑器", () => {
    useEditorStore.setState({
      title: "词组校对",
      annotationMode: "manual",
      riskAnnotationKeys: [],
      manualAnnotationKeys: [],
      paragraphs: [[
        { ch: "银", py: "yín", isPunct: false, pySource: "auto" },
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    renderPreview();
    fireEvent.click(screen.getByText("xíng"));
    fireEvent.click(screen.getByRole("button", { name: "手动输入拼音" }));
    fireEvent.click(screen.getByLabelText("向左扩一字"));
    fireEvent.change(screen.getByDisplayValue("xíng"), {
      target: { value: "háng" },
    });
    fireEvent.click(screen.getByLabelText("保存拼音"));

    const pairs = useEditorStore.getState().paragraphs[0];
    expect(pairs.map((pair) => pair.py)).toEqual(["yín", "háng"]);
    expect(pairs.map((pair) => pair.pySource)).toEqual(["manual", "manual"]);
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([
      "0:0",
      "0:1",
    ]);
    expect(screen.getByText("2 个人工修改")).not.toBeNull();
  });

  it("标点和无拼音字符不会打开候选字卡", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "，", py: null, isPunct: true }]],
    });

    renderPreview();
    fireEvent.click(screen.getByText("，"));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("注音范围默认全文并可切换到手动选择", () => {
    render(<PrintSettingsPanel />);

    expect(
      screen.getByRole("button", { name: "全文注音" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "手动选择" }));

    expect(useEditorStore.getState().annotationMode).toBe("manual");
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
  });

  it("手动模式点击文字只打开弹窗且未注音时没有候选被选中", () => {
    useEditorStore.setState({
      annotationMode: "manual",
      riskAnnotationKeys: [],
      manualAnnotationKeys: [],
      paragraphs: [[
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    renderPreview();
    const characters = screen.getAllByText("行");
    const pinyin = screen.getAllByText("xíng");

    expect(pinyin[0].getAttribute("aria-hidden")).toBe("true");
    expect(pinyin[1].getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(characters[0]);

    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
    expect(pinyin[0].getAttribute("aria-hidden")).toBe("true");
    expect(pinyin[1].getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("dialog", { name: "行的读音" })).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "选择 xíng" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("未注音时点击当前读音添加，已注音时再次点击当前读音取消", () => {
    useEditorStore.setState({
      annotationMode: "manual",
      riskAnnotationKeys: [],
      manualAnnotationKeys: [],
      paragraphs: [[
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    renderPreview();
    fireEvent.click(screen.getAllByText("行")[0]);
    fireEvent.click(screen.getByRole("button", { name: "选择 xíng" }));

    expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:0"]);
    expect(useEditorStore.getState().paragraphs[0][0].py).toBe("xíng");
    expect(screen.getAllByText("xíng")[0].getAttribute("aria-hidden")).toBeNull();

    fireEvent.click(screen.getAllByText("行")[0]);
    expect(
      screen.getByRole("button", { name: "选择 xíng" }).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "选择 xíng" }));

    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
    expect(useEditorStore.getState().paragraphs[0][0].py).toBe("xíng");
  });

  it("点击其他读音会换音并保持当前位置已注音", () => {
    useEditorStore.setState({
      annotationMode: "risk",
      riskAnnotationKeys: ["0:0"],
      manualAnnotationKeys: [],
      paragraphs: [[
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    renderPreview();
    fireEvent.click(screen.getByText("行"));
    fireEvent.click(screen.getByRole("button", { name: "选择 háng" }));

    expect(useEditorStore.getState().paragraphs[0][0]).toMatchObject({
      py: "háng",
      pySource: "manual",
    });
    expect(useEditorStore.getState().riskAnnotationKeys).toEqual(["0:0"]);
  });

  it("风险字模式只显示读音风险位置", () => {
    useEditorStore.setState({
      annotationMode: "risk",
      riskAnnotationKeys: ["0:1"],
      manualAnnotationKeys: [],
      paragraphs: [[
        { ch: "春", py: "chūn", isPunct: false, pySource: "auto" },
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    renderPreview();

    expect(screen.getByText("chūn").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("xíng").getAttribute("aria-hidden")).toBeNull();
  });

  it("切换范围模式保留手动选择且只有清空注音会删除", () => {
    useEditorStore.setState({
      annotationMode: "manual",
      riskAnnotationKeys: ["0:0"],
      manualAnnotationKeys: ["0:0"],
      paragraphs: [[
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    renderPreview();
    expect(screen.queryByRole("button", { name: "完成选择" })).toBeNull();
    expect(screen.queryByRole("button", { name: "调整选择" })).toBeNull();

    act(() => {
      useEditorStore.getState().setAnnotationMode("full");
      useEditorStore.getState().setAnnotationMode("manual");
    });
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:0"]);

    fireEvent.click(screen.getByRole("button", { name: "清空注音" }));
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
    expect(useEditorStore.getState().riskAnnotationKeys).toEqual(["0:0"]);
  });
});
