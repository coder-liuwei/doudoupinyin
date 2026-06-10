import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Preview from "@/components/Preview";
import { useEditorStore } from "@/store/useEditorStore";

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
      title: "未命名",
      currentId: null,
      err: null,
    });
  });

  it("updates one pinyin reading from the inline proofing editor", () => {
    useEditorStore.setState({
      title: "校对测试",
      paragraphs: [[{ ch: "你", py: "nǐ", isPunct: false, pySource: "auto" }]],
    });

    render(<Preview />);
    fireEvent.click(screen.getByText("nǐ"));
    fireEvent.change(screen.getByDisplayValue("nǐ"), {
      target: { value: "ní" },
    });
    fireEvent.click(screen.getByLabelText("保存拼音"));

    expect(useEditorStore.getState().paragraphs[0][0].py).toBe("ní");
    expect(useEditorStore.getState().paragraphs[0][0].pySource).toBe("manual");
  });

  it("marks common polyphone characters as proofreading suspects", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "行", py: "xíng", isPunct: false, pySource: "auto" }]],
    });

    const { container } = render(<Preview />);

    expect(container.querySelector(".proof-unit.suspect")).not.toBeNull();
    expect(screen.getByText("1 个待核对")).not.toBeNull();
  });

  it("applies layout and indent classes to the preview body", () => {
    useEditorStore.setState({
      layoutMode: "preserve",
      indentFirstLine: false,
      paragraphs: [[{ ch: "床", py: "chuáng", isPunct: false, pySource: "auto" }]],
    });

    const { container } = render(<Preview />);
    const preview = container.querySelector("#previewInner");

    expect(preview?.className).toContain("layout-preserve");
    expect(preview?.className).toContain("no-first-indent");
  });

  it("updates a selected word range and marks all selected pinyin as manual", () => {
    useEditorStore.setState({
      title: "词组校对",
      paragraphs: [[
        { ch: "银", py: "yín", isPunct: false, pySource: "auto" },
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
    });

    render(<Preview />);
    fireEvent.click(screen.getByText("yín"));
    fireEvent.click(screen.getByLabelText("向右扩一字"));
    fireEvent.change(screen.getByDisplayValue("xíng"), {
      target: { value: "háng" },
    });
    fireEvent.click(screen.getByLabelText("保存拼音"));

    const pairs = useEditorStore.getState().paragraphs[0];
    expect(pairs.map((pair) => pair.py)).toEqual(["yín", "háng"]);
    expect(pairs.map((pair) => pair.pySource)).toEqual(["manual", "manual"]);
    expect(screen.getByText("2 个人工修改")).not.toBeNull();
  });
});
