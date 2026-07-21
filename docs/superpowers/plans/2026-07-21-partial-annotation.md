# 部分注音 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留全文注音、候选读音和手动输入的基础上，实现风险字与按出现位置手动选择注音，并贯通历史保存和打印。

**Architecture:** 用独立的 `AnnotationSettings` 控制 ruby 拼音的可见性，不改 `Pair` 与 `PrintSettings` 契约。预览和打印共用纯函数计算每个 Pair 是否显示；Zustand 保存当前模式与手动位置，历史和临时打印载荷用可选字段向后兼容。

**Tech Stack:** React 18、TypeScript、Zustand、Vitest、Testing Library、Vite

---

### Task 1: 注音范围领域模型

**Files:**
- Create: `src/lib/annotation.ts`
- Create: `tests/annotation.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("旧数据默认全文注音", () => {
  expect(normalizeAnnotationSettings(undefined)).toEqual({ mode: "full", manualKeys: [] });
});

it("手动模式只显示选中的出现位置", () => {
  const visible = buildAnnotationVisibility(paragraphs, {
    mode: "manual",
    manualKeys: ["0:1"],
  });
  expect(visible).toEqual([[false, true]]);
});

it("风险模式复用当前风险分析", () => {
  expect(buildAnnotationVisibility(riskParagraphs, { mode: "risk", manualKeys: [] })[0])
    .toEqual([true]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/annotation.test.ts`
Expected: FAIL because `@/lib/annotation` does not exist.

- [ ] **Step 3: Implement the minimal model**

```ts
export type AnnotationMode = "full" | "risk" | "manual";
export interface AnnotationSettings { mode: AnnotationMode; manualKeys: string[] }
export const DEFAULT_ANNOTATION_SETTINGS = { mode: "full", manualKeys: [] };
export function annotationKey(paragraphIndex: number, pairIndex: number): string {
  return `${paragraphIndex}:${pairIndex}`;
}
```

Add normalization and `buildAnnotationVisibility()` using `analyzeReviewRisks()` for risk mode and a `Set` of keys for manual mode.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/annotation.test.ts`
Expected: PASS.

### Task 2: Store and settings controls

**Files:**
- Modify: `src/store/useEditorStore.ts`
- Modify: `src/components/PrintSettingsPanel.tsx`
- Modify: `src/styles/global.css`
- Modify: `tests/preview.test.tsx`

- [ ] **Step 1: Write failing UI/store tests**

```tsx
expect(useEditorStore.getState().annotationMode).toBe("full");
fireEvent.click(screen.getByRole("button", { name: "手动选择" }));
expect(useEditorStore.getState().annotationMode).toBe("manual");
expect(useEditorStore.getState().manualAnnotationKeys).toEqual([]);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/preview.test.tsx`
Expected: FAIL because annotation state and controls do not exist.

- [ ] **Step 3: Add minimal state and controls**

Add `annotationMode`, `manualAnnotationKeys`, `setAnnotationMode`, `setAnnotationSettings`, `toggleManualAnnotation`, and `clearManualAnnotations`. `setParagraphs` and `reset` restore full mode with no manual keys. Add three accessible buttons to the print settings panel.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/preview.test.tsx`
Expected: PASS.

### Task 3: Preview selection and proofreading coexistence

**Files:**
- Modify: `src/lib/render.tsx`
- Modify: `src/components/Preview.tsx`
- Modify: `src/styles/global.css`
- Modify: `tests/render.test.tsx`
- Modify: `tests/preview.test.tsx`

- [ ] **Step 1: Write failing behavior tests**

```tsx
fireEvent.click(screen.getByRole("button", { name: "手动选择" }));
expect(screen.getByText("xíng").closest("rt")).toHaveClass("annotation-hidden");
fireEvent.click(screen.getByText("行"));
expect(useEditorStore.getState().manualAnnotationKeys).toEqual(["0:0"]);
fireEvent.click(screen.getByRole("button", { name: "完成选择" }));
fireEvent.click(screen.getByText("行"));
expect(screen.getByRole("button", { name: "手动输入拼音" })).not.toBeNull();
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/preview.test.tsx tests/render.test.tsx`
Expected: FAIL because selection mode and hidden ruby rendering are absent.

- [ ] **Step 3: Implement preview behavior**

Extend `Ruby` with `hidePinyin`; extend proofread options with annotation visibility and selection callbacks. In `Preview`, enter selection state on manual mode, show clear/finish/reselect controls, toggle only the current `paragraphIndex:pairIndex`, and keep candidate/manual editing active outside selection state.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/preview.test.tsx tests/render.test.tsx`
Expected: PASS with existing proofreading tests unchanged.

### Task 4: History and printing persistence

**Files:**
- Modify: `src/lib/annotation.ts`
- Modify: `src/lib/history.ts`
- Modify: `src/hooks/useHistory.ts`
- Modify: `src/components/ActionPanel.tsx`
- Modify: `src/components/HistoryPanel.tsx`
- Modify: `src/hooks/usePrint.ts`
- Modify: `src/components/PrintOnly.tsx`
- Modify: `src/styles/print.css`
- Modify: `tests/history.test.ts`
- Create: `tests/print-only.test.tsx`

- [ ] **Step 1: Write failing persistence tests**

```ts
saveRecord({ ...record, annotationSettings: { mode: "manual", manualKeys: ["0:0"] } });
expect(loadHistory().records[0].annotationSettings).toEqual({
  mode: "manual",
  manualKeys: ["0:0"],
});
```

Render `PrintOnly` from a session payload and assert selected ruby remains visible while an unselected ruby has the hidden annotation class.

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/history.test.ts tests/print-only.test.tsx`
Expected: FAIL because annotation settings are not carried or rendered.

- [ ] **Step 3: Persist optional annotation settings**

Define `AnnotatedHistoryRecord = HistoryRecord & { annotationSettings?: AnnotationSettings }` outside `types.ts`. Save and restore settings in ActionPanel/HistoryPanel, include them in print temp payload, normalize absent data to full, and pass visibility into `renderParagraphs` on the print page. Add print-only CSS to hide `rt` without collapsing ruby space.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/history.test.ts tests/print-only.test.tsx`
Expected: PASS.

### Task 5: Full regression and acceptance

**Files:**
- Modify only files required by failures introduced by this feature.

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all test files pass with zero failures.

- [ ] **Step 2: Build production bundle**

Run: `npm run build`
Expected: exit code 0; existing pdfjs and chunk-size warnings are acceptable.

- [ ] **Step 3: Check scope and whitespace**

Run: `git diff --check`
Expected: no output.

- [ ] **Step 4: Start local acceptance server**

Run: `npm run dev`
Expected: Vite prints a localhost URL; open it for user acceptance without merging or pushing.
