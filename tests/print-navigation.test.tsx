import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePrint } from "@/hooks/usePrint";
import { useEditorStore } from "@/store/useEditorStore";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

function PrintButton() {
  const goPrint = usePrint();
  return <button onClick={goPrint}>打印</button>;
}

describe("usePrint navigation", () => {
  beforeEach(() => {
    navigate.mockReset();
    sessionStorage.clear();
    useEditorStore.setState({
      currentId: null,
      title: "打印测试",
      paragraphs: [[
        { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      ]],
      annotationMode: "manual",
      fullAnnotationKeys: ["0:0"],
      riskAnnotationKeys: [],
      manualAnnotationKeys: ["0:0"],
    });
  });

  it("保存临时数据后通过应用路由打开打印页", () => {
    render(<PrintButton />);

    fireEvent.click(screen.getByRole("button", { name: "打印" }));

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate.mock.calls[0][0]).toMatch(/^\/print\?id=temp-\d+$/);
    const payload = JSON.parse(
      sessionStorage.getItem("pinyinPrince.print-temp") ?? "null",
    );
    expect(payload.annotationSettings).toEqual({
      mode: "manual",
      fullKeys: ["0:0"],
      riskKeys: [],
      manualKeys: ["0:0"],
    });
  });
});
