# 多音字候选字卡 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在屏幕预览中为所有带拼音汉字增加候选读音字卡，多音字可一键切换读音，同时保留现有范围手动输入能力。

**Architecture:** 新增纯函数从完整段落的 `pinyin-pro` 分析结果中提取候选读音，新增无 Store 依赖的 `PolyphoneCandidateCard` 展示组件。`Preview` 维护字卡位置和当前目标，候选选择继续调用现有 `updatePairPinyinRange`；用户点击“手动输入”时切回现有行内范围编辑器。字卡位于 `#previewInner` 外，不进入打印渲染，也不修改 `Pair` 或历史数据结构。

**Tech Stack:** React 18、TypeScript、Zustand、pinyin-pro、Vitest、Testing Library、Tailwind 之外的现有 `global.css`

---

## 文件结构

- Create: `src/lib/pinyin-candidates.ts`
  - 从完整段落中获取指定 `Pair` 的去重候选读音。
  - 引擎失败时退化为当前拼音，不阻断预览。
- Create: `src/components/PolyphoneCandidateCard.tsx`
  - 纯展示组件，负责候选选择、关闭和切换到手动输入。
  - 不读取 Store，不修改持久化数据。
- Modify: `src/components/Preview.tsx`
  - 维护当前字卡目标、锚点位置和关闭行为。
  - 调用候选提取函数及现有 Store 更新动作。
  - 保留现有范围编辑状态和扩展左右字符的能力。
- Modify: `src/lib/render.tsx`
  - 将普通带拼音汉字的激活操作从“直接手动编辑”改为“打开候选字卡”。
  - 行内手动编辑渲染逻辑保持不变。
- Modify: `src/styles/global.css`
  - 增加与现有浅色、柔和圆角视觉一致的字卡样式和窄屏约束。
- Modify: `tests/preview.test.tsx`
  - 覆盖字卡打开、候选选择、单音字、相同读音、手动输入和非汉字边界。
- Create: `tests/pinyin-candidates.test.ts`
  - 覆盖候选提取、去重、当前读音兜底和越界行为。

### Task 1: 候选读音提取

**Files:**
- Create: `src/lib/pinyin-candidates.ts`
- Create: `tests/pinyin-candidates.test.ts`

- [ ] **Step 1: 写候选提取失败测试**

```ts
import { describe, expect, it } from "vitest";
import { getPairPinyinCandidates } from "@/lib/pinyin-candidates";
import type { Paragraph } from "@/lib/types";

describe("getPairPinyinCandidates", () => {
  it("返回多音字候选并保留当前上下文读音", () => {
    const paragraph: Paragraph = [
      { ch: "银", py: "yín", isPunct: false, pySource: "auto" },
      { ch: "行", py: "háng", isPunct: false, pySource: "auto" },
    ];

    const result = getPairPinyinCandidates(paragraph, 1);

    expect(result[0]).toBe("háng");
    expect(result).toContain("xíng");
    expect(new Set(result).size).toBe(result.length);
  });

  it("单音字只返回当前读音", () => {
    const paragraph: Paragraph = [
      { ch: "你", py: "nǐ", isPunct: false, pySource: "auto" },
    ];

    expect(getPairPinyinCandidates(paragraph, 0)).toEqual(["nǐ"]);
  });

  it("标点、无拼音和越界位置不返回候选", () => {
    const paragraph: Paragraph = [
      { ch: "，", py: null, isPunct: true },
    ];

    expect(getPairPinyinCandidates(paragraph, 0)).toEqual([]);
    expect(getPairPinyinCandidates(paragraph, 1)).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/pinyin-candidates.test.ts`

Expected: FAIL，提示无法找到 `@/lib/pinyin-candidates`。

- [ ] **Step 3: 实现最小候选提取函数**

```ts
import { analyzePinyinText } from "./pinyin";
import type { Paragraph } from "./types";

export function getPairPinyinCandidates(
  paragraph: Paragraph,
  pairIndex: number,
): string[] {
  const pair = paragraph[pairIndex];
  if (!pair?.py || pair.isPunct) return [];

  try {
    const text = paragraph.map((item) => item.ch).join("");
    const candidates = analyzePinyinText(text)[pairIndex]?.candidates ?? [];
    return [pair.py, ...candidates].filter(
      (py, index, values) => Boolean(py) && values.indexOf(py) === index,
    );
  } catch {
    return [pair.py];
  }
}
```

- [ ] **Step 4: 运行候选提取测试**

Run: `npm test -- tests/pinyin-candidates.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交候选提取能力**

```bash
git add src/lib/pinyin-candidates.ts tests/pinyin-candidates.test.ts
git commit -m "feat: derive pinyin candidates for proofing"
```

### Task 2: 候选字卡展示组件

**Files:**
- Create: `src/components/PolyphoneCandidateCard.tsx`
- Modify: `tests/preview.test.tsx`

- [ ] **Step 1: 添加候选字卡组件测试**

在 `tests/preview.test.tsx` 增加独立组件用例：

```tsx
import { vi } from "vitest";
import PolyphoneCandidateCard from "@/components/PolyphoneCandidateCard";

it("展示当前汉字、候选读音和多音字标签", () => {
  render(
    <PolyphoneCandidateCard
      ch="行"
      currentPy="háng"
      candidates={["háng", "xíng"]}
      position={{ left: 120, top: 80 }}
      onSelect={vi.fn()}
      onManualEdit={vi.fn()}
      onClose={vi.fn()}
    />,
  );

  expect(screen.getByRole("dialog", { name: "行的读音" })).not.toBeNull();
  expect(screen.getByText("多音字")).not.toBeNull();
  expect(screen.getByRole("button", { name: "选择 háng" }).getAttribute("aria-pressed"))
    .toBe("true");
  expect(screen.getByRole("button", { name: "选择 xíng" })).not.toBeNull();
});

it("候选选择和手动输入通过回调交给上层", () => {
  const onSelect = vi.fn();
  const onManualEdit = vi.fn();
  render(
    <PolyphoneCandidateCard
      ch="行"
      currentPy="háng"
      candidates={["háng", "xíng"]}
      position={{ left: 120, top: 80 }}
      onSelect={onSelect}
      onManualEdit={onManualEdit}
      onClose={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "选择 xíng" }));
  expect(onSelect).toHaveBeenCalledWith("xíng");

  fireEvent.click(screen.getByRole("button", { name: "手动输入拼音" }));
  expect(onManualEdit).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: 运行组件测试并确认失败**

Run: `npm test -- tests/preview.test.tsx`

Expected: FAIL，提示无法找到 `PolyphoneCandidateCard`。

- [ ] **Step 3: 实现无 Store 依赖的候选字卡**

组件接口固定为：

```tsx
interface PolyphoneCandidateCardProps {
  ch: string;
  currentPy: string;
  candidates: string[];
  position: { left: number; top: number };
  onSelect: (py: string) => void;
  onManualEdit: () => void;
  onClose: () => void;
}
```

组件根节点使用：

```tsx
<aside
  ref={ref}
  className="polyphone-card"
  role="dialog"
  aria-label={`${ch}的读音`}
  style={{ left: position.left, top: position.top }}
>
```

内容依次为关闭按钮、当前汉字与拼音、`candidates.length > 1 ? "多音字" : "当前读音"` 标签、候选按钮组和“手动输入”按钮。候选按钮使用 `aria-pressed={py === currentPy}`，不展示声音、IPA 或注音符号。

- [ ] **Step 4: 运行组件测试**

Run: `npm test -- tests/preview.test.tsx`

Expected: 新增 2 tests PASS；现有 Preview 测试仍保持原状态。

- [ ] **Step 5: 提交展示组件**

```bash
git add src/components/PolyphoneCandidateCard.tsx tests/preview.test.tsx
git commit -m "feat: add polyphone candidate card"
```

### Task 3: 接入预览校对流程

**Files:**
- Modify: `src/components/Preview.tsx`
- Modify: `src/lib/render.tsx`
- Modify: `tests/preview.test.tsx`

- [ ] **Step 1: 把现有 Preview 测试改成候选字卡流程并补齐边界**

将原“点击拼音直接出现输入框”的用例改为：

```tsx
it("选择候选读音后保存为人工修改", () => {
  useEditorStore.setState({
    paragraphs: [[{ ch: "行", py: "xíng", isPunct: false, pySource: "auto" }]],
  });

  render(<Preview />);
  fireEvent.click(screen.getByText("xíng"));
  fireEvent.click(screen.getByRole("button", { name: "选择 háng" }));

  expect(useEditorStore.getState().paragraphs[0][0]).toMatchObject({
    py: "háng",
    pySource: "manual",
  });
  expect(screen.queryByRole("dialog", { name: "行的读音" })).toBeNull();
});

it("选择当前读音不重复更新来源", () => {
  useEditorStore.setState({
    paragraphs: [[{ ch: "行", py: "xíng", isPunct: false, pySource: "auto" }]],
  });

  render(<Preview />);
  fireEvent.click(screen.getByText("xíng"));
  fireEvent.click(screen.getByRole("button", { name: "选择 xíng" }));

  expect(useEditorStore.getState().paragraphs[0][0].pySource).toBe("auto");
});

it("手动输入入口继续使用现有范围编辑器", () => {
  useEditorStore.setState({
    paragraphs: [[
      { ch: "银", py: "yín", isPunct: false, pySource: "auto" },
      { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
    ]],
  });

  render(<Preview />);
  fireEvent.click(screen.getByText("xíng"));
  fireEvent.click(screen.getByRole("button", { name: "手动输入拼音" }));
  fireEvent.click(screen.getByLabelText("向左扩一字"));
  fireEvent.change(screen.getByDisplayValue("xíng"), {
    target: { value: "háng" },
  });
  fireEvent.click(screen.getByLabelText("保存拼音"));

  expect(useEditorStore.getState().paragraphs[0].map((pair) => pair.pySource))
    .toEqual(["manual", "manual"]);
});

it("标点和无拼音字符不会打开候选字卡", () => {
  useEditorStore.setState({
    paragraphs: [[{ ch: "，", py: null, isPunct: true }]],
  });

  render(<Preview />);
  fireEvent.click(screen.getByText("，"));
  expect(screen.queryByRole("dialog")).toBeNull();
});
```

- [ ] **Step 2: 运行 Preview 测试并确认失败**

Run: `npm test -- tests/preview.test.tsx`

Expected: 候选字卡集成用例 FAIL，现有点击仍进入行内编辑。

- [ ] **Step 3: 扩展 `renderProofreadParagraph` 激活回调**

把 `ProofreadParagraphOptions` 中普通字激活回调明确为：

```ts
onOpenCandidates: (
  paragraphIndex: number,
  pairIndex: number,
  anchor: HTMLElement,
) => void;
```

普通 `.proof-unit` 的鼠标和键盘激活均调用：

```tsx
onOpenCandidates(paragraphIndex, currentPairIndex, e.currentTarget);
```

行内 `editing` 分支、范围扩展、保存和取消保持原样。

- [ ] **Step 4: 在 Preview 管理字卡状态和选择动作**

新增状态：

```ts
interface CandidateTarget {
  paragraphIndex: number;
  pairIndex: number;
  position: { left: number; top: number };
}

const [candidateTarget, setCandidateTarget] = useState<CandidateTarget | null>(null);
```

打开时读取锚点 `getBoundingClientRect()`，以 `position: fixed` 计算卡片位置，并限制：

```ts
const CARD_WIDTH = 280;
const left = Math.min(
  Math.max(12, rect.left),
  Math.max(12, window.innerWidth - CARD_WIDTH - 12),
);
const top = Math.min(rect.bottom + 10, window.innerHeight - 220);
```

当前目标通过 `getPairPinyinCandidates` 获得候选。选择不同读音时调用：

```ts
updatePairPinyinRange(paragraphIndex, pairIndex, [{ pairIndex: 0, py }]);
```

如果选择值等于当前值，只关闭字卡，不调用 Store 更新。点击“手动输入”时关闭字卡并调用现有 `beginEdit`。

用 `useEffect` 监听 `paragraphs` 引用变化关闭字卡；用另一个 `useEffect` 注册 `Escape` 和外部 `pointerdown`，组件用 `ref` 识别卡片内部点击。

- [ ] **Step 5: 确保字卡位于打印区域之外**

在 `Preview` 中把 `<PolyphoneCandidateCard />` 渲染为 `.paper-sheet` 的兄弟节点，而不是 `#previewInner` 的子节点。`PrintOnly` 和 `renderParagraphs` 不引用该组件。

- [ ] **Step 6: 运行 Preview 与渲染测试**

Run: `npm test -- tests/preview.test.tsx tests/render.test.tsx`

Expected: 所有用例 PASS，Ruby snapshot 无变化。

- [ ] **Step 7: 提交交互接入**

```bash
git add src/components/Preview.tsx src/lib/render.tsx tests/preview.test.tsx
git commit -m "feat: select polyphone readings in preview"
```

### Task 4: 视觉样式与完整回归

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: 添加现有风格的候选字卡样式**

新增样式必须使用项目现有颜色变量；核心结构如下：

```css
.polyphone-card {
  position: fixed;
  z-index: 40;
  width: min(280px, calc(100vw - 24px));
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 50px rgba(51, 65, 85, 0.18);
}

.polyphone-card__choice[aria-pressed="true"] {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}
```

同时为标题区、汉字、当前拼音、状态标签、候选按钮组、关闭按钮和手动输入按钮增加 BEM 子类。所有可点击项提供 `:hover` 和 `:focus-visible`；窄屏下保持 `12px` 视口边距。

- [ ] **Step 2: 运行相关测试**

Run: `npm test -- tests/pinyin-candidates.test.ts tests/preview.test.tsx tests/render.test.tsx tests/history.test.ts`

Expected: 所有用例 PASS。

- [ ] **Step 3: 运行全部自动化测试**

Run: `npm test`

Expected: 全部 Vitest 用例 PASS。

- [ ] **Step 4: 运行生产构建**

Run: `npm run build`

Expected: TypeScript 和 Vite 构建成功；只允许保留项目现有的 PDF worker、pdfjs `eval` 和大 chunk 警告。

- [ ] **Step 5: 浏览器人工验收**

Run: `npm run dev`

验证：

1. “银行行长”中的每个带拼音汉字都能打开字卡。
2. “行”显示 `háng / xíng` 等候选，当前读音有选中态。
3. 点击不同候选后拼音立即更新、来源计入人工修改、红点消失。
4. 点击“手动输入”仍可向左右扩展词组并保存。
5. 单音字只显示当前读音。
6. 点击字卡外部、关闭按钮和按 Escape 都能关闭。
7. 字卡靠近窗口右边和底部时不超出视口。
8. 打印页面不出现字卡，正文和拼音与预览一致。

- [ ] **Step 6: 检查差异和工作树**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: 无空白错误；只出现本计划列出的源代码、测试、样式和计划文档。

- [ ] **Step 7: 提交样式与最终验证**

```bash
git add src/styles/global.css
git commit -m "style: match polyphone card to preview"
```

最终停留在 `codex/polyphone-candidate-card`，等待用户本地验收；不合并、不推送。
