import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import PrintOnly from "@/components/PrintOnly";

describe("PrintOnly annotation settings", () => {
  beforeEach(() => {
    sessionStorage.clear();
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
});
