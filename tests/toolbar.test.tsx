import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Toolbar from "@/components/Toolbar";
import { useEditorStore } from "@/store/useEditorStore";

describe("Toolbar layout settings", () => {
  beforeEach(() => {
    useEditorStore.setState({
      input: "床前明月光\n疑是地上霜",
      mode: "plain",
      paragraphs: [],
      fontSize: 19,
      lineHeight: 2.15,
      layoutMode: "auto",
      indentFirstLine: true,
      showTitle: true,
      pageGuide: "plain",
      title: "未命名",
      currentId: null,
      err: null,
    });
  });

  it("preserves source line breaks and disables first-line indent by default", () => {
    render(<Toolbar />);

    fireEvent.change(screen.getByLabelText("排版"), {
      target: { value: "preserve" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成注音" }));

    const state = useEditorStore.getState();
    expect(state.layoutMode).toBe("preserve");
    expect(state.indentFirstLine).toBe(false);
    expect(state.paragraphs.map((paragraph) => paragraph.map((pair) => pair.ch).join(""))).toEqual([
      "床前明月光",
      "疑是地上霜",
    ]);
  });
});
