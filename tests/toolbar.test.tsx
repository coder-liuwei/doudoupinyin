import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ActionPanel from "@/components/ActionPanel";
import Editor from "@/components/Editor";
import PrintSettingsPanel from "@/components/PrintSettingsPanel";
import Preview from "@/components/Preview";
import { useEditorStore } from "@/store/useEditorStore";

describe("layout settings", () => {
  beforeEach(() => {
    useEditorStore.setState({
      input: "床前明月光\n疑是地上霜",
      mode: "plain",
      paragraphs: [],
      fontSize: 19,
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

  it("preserves source line breaks without changing first-line indent", () => {
    render(
      <>
        <Editor />
        <ActionPanel />
        <PrintSettingsPanel />
      </>,
    );

    fireEvent.change(screen.getByLabelText("排版"), {
      target: { value: "preserve" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成注音" }));

    const state = useEditorStore.getState();
    expect(state.layoutMode).toBe("preserve");
    expect(state.indentFirstLine).toBe(true);
    expect(state.paragraphs.map((paragraph) => paragraph.map((pair) => pair.ch).join(""))).toEqual([
      "床前明月光",
      "疑是地上霜",
    ]);
  });

  it("keeps mode selection near the editor and moves printing to the preview", () => {
    const { rerender } = render(
      <>
        <Editor />
        <ActionPanel />
        <Preview />
      </>,
    );

    expect(screen.getByRole("radio", { name: "自动注音" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "打印 / 存 PDF" })).toBeNull();

    act(() => {
      useEditorStore.setState({
        paragraphs: [[{ ch: "床", py: "chuáng", isPunct: false, pySource: "auto" }]],
      });
    });
    rerender(
      <>
        <Editor />
        <ActionPanel />
        <Preview />
      </>,
    );

    expect(screen.getByRole("button", { name: "打印 / 存 PDF" })).not.toBeNull();
  });
});
