import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import PrintOnly from "@/components/PrintOnly";
import { useEditorStore } from "@/store/useEditorStore";

describe("PrintOnly annotation settings", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useEditorStore.getState().reset();
  });

  it("临时打印载荷按手动选择隐藏未选拼音", async () => {
    sessionStorage.setItem(
      "pinyinPrince.print-temp",
      JSON.stringify({
        id: "temp-1",
        title: "部分注音",
        paragraphs: [[
          { ch: "春", py: "chūn", isPunct: false },
          { ch: "行", py: "xíng", isPunct: false },
        ]],
        printSettings: {},
        annotationSettings: { mode: "manual", manualKeys: ["0:1"] },
      }),
    );

    render(
      <MemoryRouter initialEntries={["/print?id=temp-1"]}>
        <PrintOnly />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("部分注音")).not.toBeNull());
    expect(screen.getByText("chūn").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("xíng").getAttribute("aria-hidden")).toBeNull();
  });

  it("返回编辑页时保留当前草稿", async () => {
    useEditorStore.getState().setInput("不能丢失的草稿");
    sessionStorage.setItem(
      "pinyinPrince.print-temp",
      JSON.stringify({
        id: "temp-return",
        title: "返回测试",
        paragraphs: [[{ ch: "春", py: "chūn", isPunct: false }]],
        printSettings: {},
      }),
    );

    function DraftProbe() {
      return <p>{useEditorStore((state) => state.input)}</p>;
    }

    render(
      <MemoryRouter initialEntries={["/print?id=temp-return"]}>
        <Routes>
          <Route path="/print" element={<PrintOnly />} />
          <Route path="/" element={<DraftProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("返回测试")).not.toBeNull());
    fireEvent.click(screen.getByRole("link", { name: "← 返回" }));

    expect(await screen.findByText("不能丢失的草稿")).not.toBeNull();
  });

  it("返回按钮使用左侧操作位", async () => {
    sessionStorage.setItem(
      "pinyinPrince.print-temp",
      JSON.stringify({
        id: "temp-layout",
        title: "布局测试",
        paragraphs: [[{ ch: "春", py: "chūn", isPunct: false }]],
        printSettings: {},
      }),
    );

    render(
      <MemoryRouter initialEntries={["/print?id=temp-layout"]}>
        <PrintOnly />
      </MemoryRouter>,
    );

    const back = await screen.findByRole("link", { name: "← 返回" });
    expect(back.classList.contains("print-back-action")).toBe(true);
  });
});
