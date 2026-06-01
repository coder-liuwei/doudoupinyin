/**
 * 文本规范化（粘贴到编辑器后第一时间调用）。
 *
 * 来源：pinyin-prince.html:394-407 normalizeInputText
 *
 * 1. NFKC：合并部分兼容字符（全角/半角、OCR 变体）
 * 2. 去 \r：把 \r\n / \r 统一为 \n
 * 3. 多余空白合并：[ \t]{2,} → 单个空格（保留段落内的单个空格）
 * 4. trim 首尾空白
 *
 * 注意：dual 模式不需要「合并折行」（mergeSingleNewlines），因为用户就是按行
 * 切拼音/汉字；这里统一不合并折行，行为对 dual 更友好。
 */

export function normalizeInput(text: string): string {
  let t = String(text);
  try {
    if (typeof t.normalize === "function") {
      t = t.normalize("NFKC");
    }
  } catch {
    // 旧环境无 normalize，跳过
  }
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  return t.trim();
}
