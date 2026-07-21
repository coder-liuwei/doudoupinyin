# 简化手动注音交互 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除手动注音的“完成/调整”中间状态，让手动模式中的单击始终只添加或取消当前字的注音，同时保留模式切换后的手动选择。

**Architecture:** 继续使用现有 `annotationMode` 和 `manualAnnotationKeys`，不修改数据契约。`Preview` 直接用 `annotationMode === "manual"` 决定点击行为；全文和风险字模式继续打开校音候选，手动模式永远调用 `toggleManualAnnotation`。

**Tech Stack:** React 18、TypeScript、Zustand、Vitest、Testing Library、Vite

---

### Task 1: 手动模式始终直接选择注音

**Files:**
- Modify: `tests/preview.test.tsx`
- Modify: `src/components/Preview.tsx`

- [ ] **Step 1: Write the failing behavior tests**

Replace the tests that expect “完成选择” and manual-mode proofreading with these behaviors:

First add `act` to the Testing Library import:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
```

```tsx
it("手动模式每次点击都只切换当前字且不打开校音弹窗", () => {
  useEditorStore.setState({
    annotationMode: "manual",
    manualAnnotationKeys: [],
    paragraphs: [[
      { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
      { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
    ]],
  });

  renderPreview();
  const characters = screen.getAllByText("行");

  fireEvent.click(characters[0]);
  expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:0"]);
  expect(screen.queryByRole("dialog")).toBeNull();

  fireEvent.click(characters[0]);
  expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("切换范围模式保留手动选择且只有清空注音会删除", () => {
  useEditorStore.setState({
    annotationMode: "manual",
    manualAnnotationKeys: ["0:0"],
    paragraphs: [[
      { ch: "行", py: "xíng", isPunct: false, pySource: "auto" },
    ]],
  });

  renderPreview();
  expect(screen.queryByRole("button", { name: "完成选择" })).toBeNull();
  expect(screen.queryByRole("button", { name: "调整选择" })).toBeNull();

  act(() => {
    useEditorStore.getState().setAnnotationMode("full");
    useEditorStore.getState().setAnnotationMode("manual");
  });
  expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:0"]);

  fireEvent.click(screen.getByRole("button", { name: "清空注音" }));
  expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
});
```

- [ ] **Step 2: Run the targeted test to verify RED**

Run: `npm test -- tests/preview.test.tsx`

Expected: FAIL because the second click opens the candidate card after the existing “完成选择” state, and the toolbar does not yet expose `清空注音` with the simplified behavior.

- [ ] **Step 3: Remove the temporary selection state**

In `src/components/Preview.tsx`:

1. Remove `Check` from the `lucide-react` import.
2. Remove `isSelectingAnnotations` and `setIsSelectingAnnotations`.
3. Keep the mode-change cleanup, but remove the selection-state assignment:

```tsx
useEffect(() => {
  setCandidateTarget(null);
  setEditing(null);
}, [annotationMode]);
```

4. Replace the manual toolbar with the stable count and explicit clear action:

```tsx
{annotationMode === "manual" && (
  <div className="annotation-selection-bar" aria-label="手动注音选择">
    <div>
      <strong>手动选择注音</strong>
      <span>已选 {manualAnnotationKeys.length} 处</span>
    </div>
    <button type="button" onClick={clearManualAnnotations}>
      清空注音
    </button>
  </div>
)}
```

5. Make manual mode the permanent selection condition passed to `renderProofreadParagraph`:

```tsx
annotationSelectionActive: annotationMode === "manual",
```

Do not change `src/lib/render.tsx`: it already routes clicks to `onToggleAnnotation` whenever `annotationSelectionActive` is true and opens candidates otherwise.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- tests/preview.test.tsx tests/render.test.tsx`

Expected: PASS; manual clicks toggle only visibility, while existing full-mode candidate and manual-input tests remain green.

- [ ] **Step 5: Commit the behavior change**

```bash
git add src/components/Preview.tsx tests/preview.test.tsx
git commit -m "fix: simplify manual annotation selection"
```

### Task 2: Full regression and acceptance

**Files:**
- Modify only files required by failures caused by Task 1.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all test files pass with zero failures.

- [ ] **Step 2: Build the production bundle**

Run: `npm run build`

Expected: exit code 0; the existing pdfjs worker, `eval`, and large-chunk warnings are acceptable.

- [ ] **Step 3: Check scope and whitespace**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the planned files are changed before commit, and the worktree is clean after commit.

- [ ] **Step 4: Verify the browser interaction**

At `http://127.0.0.1:5173/`, generate a short annotated sentence and verify:

1. Entering 手动选择 hides all pinyin.
2. Clicking a character shows its pinyin; clicking it again hides it.
3. No pronunciation candidate card opens in manual mode.
4. Switching to 全文注音 and back preserves the prior manual positions.
5. Clicking 清空注音 removes all manual positions.
