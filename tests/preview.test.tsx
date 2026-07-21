import { fireEvent, render, screen } from "@testing-library/react";
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

  it("手动选择只切换当前字，完成后仍可校对读音", () => {
    useEditorStore.setState({
      annotationMode: "manual",
      manualAnnotationKeys: [],
      paragraphs: [[
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    const { container } = renderPreview();
    const characters = screen.getAllByText("行");
    const pinyin = screen.getAllByText("xíng");

    expect(pinyin[0].getAttribute("aria-hidden")).toBe("true");
    expect(pinyin[1].getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(characters[0]);

    expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:0"]);
    expect(pinyin[0].getAttribute("aria-hidden")).toBeNull();
    expect(pinyin[1].getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "完成选择" }));
    fireEvent.click(characters[0]);
    fireEvent.click(screen.getByRole("button", { name: "选择 háng" }));

    expect(useEditorStore.getState().paragraphs[0][0].py).toBe("háng");
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:0"]);
  });

  it("风险字模式只显示读音风险位置", () => {
    useEditorStore.setState({
      annotationMode: "risk",
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

  it("手动选择完成后仍保留手动输入拼音", () => {
    useEditorStore.setState({
      annotationMode: "manual",
      manualAnnotationKeys: ["0:0"],
      paragraphs: [[
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    renderPreview();
    fireEvent.click(screen.getByRole("button", { name: "完成选择" }));
    fireEvent.click(screen.getByText("行"));
    fireEvent.click(screen.getByRole("button", { name: "手动输入拼音" }));
    fireEvent.change(screen.getByDisplayValue("xíng"), {
      target: { value: "háng" },
    });
    fireEvent.click(screen.getByLabelText("保存拼音"));

    expect(useEditorStore.getState().paragraphs[0][0]).toMatchObject({
      py: "háng",
      pySource: "manual",
    });
    expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:0"]);
  });
});
