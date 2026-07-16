import { cleanOcrText } from "@/lib/image-import";

export interface ImageOcrProgress {
  status: string;
  progress: number;
}

interface OcrWorker {
  recognize: (file: File) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
}

const STATUS_LABELS: Record<string, string> = {
  "loading tesseract core": "正在加载识别引擎",
  "initializing tesseract": "正在初始化识别引擎",
  "loading language traineddata": "正在加载中文模型",
  "initializing api": "正在初始化中文识别",
  "recognizing text": "正在识别文字",
};

export async function recognizeImageText(
  file: File,
  onProgress?: (progress: ImageOcrProgress) => void,
): Promise<string> {
  let worker: OcrWorker | null = null;
  try {
    const { createWorker } = await import("tesseract.js");
    worker = await createWorker("chi_sim", undefined, {
      logger: (message) => {
        onProgress?.({
          status: STATUS_LABELS[message.status] ?? "正在准备识别",
          progress: Math.min(1, Math.max(0, message.progress ?? 0)),
        });
      },
    });
    const result = await worker.recognize(file);
    const text = cleanOcrText(result.data.text);
    if (!text) {
      throw new Error("没有识别出文字，请调整光线、距离或角度后重试");
    }
    return text;
  } finally {
    await worker?.terminate();
  }
}
