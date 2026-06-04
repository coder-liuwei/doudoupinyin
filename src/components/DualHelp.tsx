/**
 * 双行模式说明（可折叠）。
 *
 * 默认收起，避免页面打开时就把说明全摊开——说明区是「需要的人去找」，
 * 不是「第一眼就要看」的引导。
 */
import { useState } from "react";
import { HelpCircle } from "lucide-react";

export default function DualHelp() {
  const [open, setOpen] = useState(false);
  return (
    <section className="workbench-card help-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="help-trigger"
      >
        <HelpCircle size={17} />
        {open ? "收起" : "什么是「双行模式」？"}
      </button>
      {open && (
        <div className="help-body">
          <p>适合已经有「拼音行 + 汉字行」手稿的情况：</p>
          <pre>
{`hàn zì   bì xū   yǔ   pīn yīn   gé shù   yí zhì
汉字 必须 与 拼音 格数 一致`}
          </pre>
          <p>
            两行粘到输入框（中间空一行）即可，工具会校验格数。
          </p>
        </div>
      )}
    </section>
  );
}
