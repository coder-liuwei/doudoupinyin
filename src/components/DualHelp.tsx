/**
 * 双行模式说明（可折叠）。
 *
 * 默认收起，避免页面打开时就把说明全摊开——说明区是「需要的人去找」，
 * 不是「第一眼就要看」的引导。
 */
import { useState } from "react";

export default function DualHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 text-sm text-gray-600">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="underline hover:text-gray-800"
      >
        {open ? "收起" : "什么是「双行模式」？"}
      </button>
      {open && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded">
          <p>适合已经有「拼音行 + 汉字行」手稿的情况：</p>
          <pre className="bg-white p-2 mt-1 border rounded text-xs whitespace-pre-wrap font-mono">
{`hàn zì   bì xū   yǔ   pīn yīn   gé shù   yí zhì
汉字 必须 与 拼音 格数 一致`}
          </pre>
          <p className="mt-1 text-xs">
            两行粘到输入框（中间空一行）即可，工具会校验格数。
          </p>
        </div>
      )}
    </div>
  );
}
