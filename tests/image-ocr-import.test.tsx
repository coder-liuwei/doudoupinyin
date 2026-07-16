import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ImageOcrImport from "@/components/ImageOcrImport";
import Home from "@/routes/Home";
import { useEditorStore } from "@/store/useEditorStore";

const ocr = vi.hoisted(() => ({
  recognizeImageText: vi.fn(),
}));

vi.mock("@/lib/image-ocr", () => ({
  recognizeImageText: ocr.recognizeImageText,
}));

function resetEditor(input = ""): void {
  useEditorStore.setState({
    input,
    mode: "dual",
    paragraphs: [],
    title: "未命名",
    currentId: "saved-document",
    err: "旧错误",
  });
}

async function uploadAndWaitForResult(text = "识别文字"): Promise<void> {
  ocr.recognizeImageText.mockImplementation(
    async (_file: File, onProgress?: (value: { status: string; progress: number }) => void) => {
      onProgress?.({ status: "正在识别文字", progress: 0.5 });
      return text;
    },
  );
  fireEvent.change(screen.getByLabelText("上传图片"), {
    target: {
      files: [new File(["image"], "课文.jpg", { type: "image/jpeg" })],
    },
  });
  await screen.findByDisplayValue(text);
}

describe("ImageOcrImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEditor();
  });

  it("offers separate camera and image upload inputs", () => {
    render(<ImageOcrImport />);

    const camera = screen.getByLabelText("拍照识别");
    const upload = screen.getByLabelText("上传图片");
    expect(camera.getAttribute("accept")).toBe("image/jpeg,image/png,image/webp");
    expect(camera.getAttribute("capture")).toBe("environment");
    expect(upload.getAttribute("accept")).toBe("image/jpeg,image/png,image/webp");
    expect(upload.hasAttribute("capture")).toBe(false);
  });

  it("keeps recognized text editable until the user fills the editor", async () => {
    render(<ImageOcrImport />);

    await uploadAndWaitForResult();

    expect(useEditorStore.getState().input).toBe("");
    fireEvent.change(screen.getByLabelText("识别结果"), {
      target: { value: "校对后的文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "填入正文" }));

    expect(useEditorStore.getState()).toMatchObject({
      input: "校对后的文字",
      mode: "plain",
      currentId: null,
      err: null,
    });
  });

  it("lets the user append or replace when the editor already has content", async () => {
    resetEditor("原有正文");
    const { unmount } = render(<ImageOcrImport />);

    await uploadAndWaitForResult();
    fireEvent.click(screen.getByRole("button", { name: "追加到正文" }));
    expect(useEditorStore.getState().input).toBe("原有正文\n\n识别文字");

    unmount();
    resetEditor("原有正文");
    render(<ImageOcrImport />);
    await uploadAndWaitForResult("替换文字");
    fireEvent.click(screen.getByRole("button", { name: "替换正文" }));
    expect(useEditorStore.getState().input).toBe("替换文字");
  });

  it("shows OCR failures without modifying the editor", async () => {
    resetEditor("保留正文");
    ocr.recognizeImageText.mockRejectedValue(new Error("本地识别失败"));
    render(<ImageOcrImport />);

    fireEvent.change(screen.getByLabelText("上传图片"), {
      target: {
        files: [new File(["image"], "课文.jpg", { type: "image/jpeg" })],
      },
    });

    expect((await screen.findByRole("alert")).textContent).toContain("本地识别失败");
    expect(useEditorStore.getState().input).toBe("保留正文");
  });
});

describe("Home image OCR integration", () => {
  it("shows local image OCR next to the other import tools", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "图片识字" })).not.toBeNull();
    });
    expect(screen.getByText("拍照识别")).not.toBeNull();
    expect(screen.getByText("上传图片")).not.toBeNull();
  });
});
