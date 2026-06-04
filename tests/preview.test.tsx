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
      fontSize: 19,
      lineHeight: 2.15,
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
      paragraphs: [[{ ch: "你", py: "nǐ", isPunct: false }]],
    });

    render(<Preview />);
    fireEvent.click(screen.getByText("nǐ"));
    fireEvent.change(screen.getByDisplayValue("nǐ"), {
      target: { value: "ní" },
    });
    fireEvent.click(screen.getByLabelText("保存拼音"));

    expect(useEditorStore.getState().paragraphs[0][0].py).toBe("ní");
  });

  it("marks common polyphone characters as proofreading suspects", () => {
    useEditorStore.setState({
      paragraphs: [[{ ch: "行", py: "xíng", isPunct: false }]],
    });

    const { container } = render(<Preview />);

    expect(container.querySelector(".proof-unit.suspect")).not.toBeNull();
  });
});
