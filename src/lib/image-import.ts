export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateImageFile(file: File): string | null {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return "请选择 JPG、PNG 或 WebP 图片";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "图片不能超过 10MB，请压缩或重新拍摄";
  }
  return null;
}

export function cleanOcrText(text: string): string {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function mergeImportedText(current: string, imported: string): string {
  const currentText = current.trim();
  const importedText = imported.trim();
  if (!currentText) return importedText;
  if (!importedText) return currentText;
  return `${currentText}\n\n${importedText}`;
}
