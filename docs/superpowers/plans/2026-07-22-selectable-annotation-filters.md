# 可选择注音过滤器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让全文、风险字、手动注音统一通过点击文字打开候选弹窗，并分别维护、持久化各自的注音位置。

**Architecture:** `Pair.py` 继续保存底层读音，`AnnotationSettings` 只保存显示范围。三种模式分别使用 `fullKeys`、`riskKeys`、`manualKeys`；全文初始为全部可注音位置，风险字初始为风险位置，手动初始为空。候选卡片把“当前读音”和“当前是否已注音”拆开：未注音时仍展示当前读音，但没有候选处于选中状态。旧记录缺少集合时从段落派生对应默认值，显式空数组则保留为空。

**Tech Stack:** React 18、TypeScript、Zustand、Vitest、Testing Library、Vite

---

### Task 1: 扩展注音设置与独立选择集合

**Files:**
- Modify: `src/lib/annotation.ts`
- Modify: `src/store/useEditorStore.ts`
- Modify: `tests/annotation.test.ts`

- [ ] **Step 1: Write the failing domain tests**

Add tests covering derived risk keys, explicit empty risk keys, independent mode visibility, and store initialization:

```ts
it("旧设置缺少 riskKeys 时从段落风险生成", () => {
  expect(normalizeAnnotationSettings({ mode: "risk", manualKeys: [] }, riskParagraphs))
    .toEqual({ mode: "risk", riskKeys: ["0:0"], manualKeys: [] });
});

it("显式清空的 riskKeys 不会被重新生成", () => {
  expect(normalizeAnnotationSettings(
    { mode: "risk", riskKeys: [], manualKeys: [] },
    riskParagraphs,
  )).toEqual({ mode: "risk", riskKeys: [], manualKeys: [] });
});

it("风险和手动模式分别按自己的位置显示", () => {
  expect(buildAnnotationVisibility(paragraphs, {
    mode: "risk",
    riskKeys: ["0:0"],
    manualKeys: ["0:1"],
  })).toEqual([[true, false]]);
  expect(buildAnnotationVisibility(paragraphs, {
    mode: "manual",
    riskKeys: ["0:0"],
    manualKeys: ["0:1"],
  })).toEqual([[false, true]]);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/annotation.test.ts`

Expected: FAIL because `riskKeys` is not part of the normalized settings and risk visibility is still recalculated on every render.

- [ ] **Step 3: Implement the minimal domain model**

In `src/lib/annotation.ts`:

```ts
export interface AnnotationSettings {
  mode: AnnotationMode;
  fullKeys: string[];
  riskKeys: string[];
  manualKeys: string[];
}

export function collectRiskAnnotationKeys(paragraphs: Pair[][]): string[] {
  return analyzeReviewRisks(paragraphs).map(({ paragraphIndex, pairIndex }) =>
    annotationKey(paragraphIndex, pairIndex),
  );
}
```

Normalize keys with deduplication. Only derive `riskKeys` when the property is absent; never replace an explicit empty array. Make `buildAnnotationVisibility()` read the selected mode's key set.

In `src/store/useEditorStore.ts`, add `riskAnnotationKeys`, replace manual-only toggling with:

```ts
setAnnotationAt(paragraphIndex: number, pairIndex: number, annotated: boolean): void;
clearCurrentAnnotations(): void;
```

`setAnnotationAt` updates only the currently active full/risk/manual array. `setParagraphs` initializes full keys from all annotatable positions, risk keys from the new paragraphs, and empties manual keys. `setAnnotationSettings` normalizes against the current paragraphs so old saved data can derive missing keys.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/annotation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the domain change**

```bash
git add src/lib/annotation.ts src/store/useEditorStore.ts tests/annotation.test.ts
git commit -m "feat: keep independent annotation filters"
```

### Task 2: Separate current reading from selected reading

**Files:**
- Modify: `src/components/PolyphoneCandidateCard.tsx`
- Modify: `tests/preview.test.tsx`

- [ ] **Step 1: Write failing candidate-card tests**

Add focused tests proving an unannotated character has no pressed candidate while its header still shows the current reading:

```tsx
render(
  <PolyphoneCandidateCard
    ch="行"
    currentPy="xíng"
    selectedPy={null}
    candidates={["xíng", "háng"]}
    onSelect={onSelect}
    onManualInput={vi.fn()}
    onClose={vi.fn()}
  />,
);

expect(screen.getByText("xíng", { selector: ".candidate-current-py" })).not.toBeNull();
expect(screen.getByRole("button", { name: "xíng" })).toHaveAttribute("aria-pressed", "false");
expect(screen.getByRole("button", { name: "háng" })).toHaveAttribute("aria-pressed", "false");
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- tests/preview.test.tsx`

Expected: FAIL because pressed state is currently derived directly from `currentPy`.

- [ ] **Step 3: Add explicit selected state**

Add `selectedPy: string | null` to `PolyphoneCandidateCardProps`. Keep the header bound to `currentPy`, but set each candidate's `aria-pressed` and selected class from `selectedPy`.

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm test -- tests/preview.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the candidate semantics**

```bash
git add src/components/PolyphoneCandidateCard.tsx tests/preview.test.tsx
git commit -m "fix: separate reading from annotation selection"
```

### Task 3: Unify text clicks and candidate toggling

**Files:**
- Modify: `src/lib/render.tsx`
- Modify: `src/components/Preview.tsx`
- Modify: `tests/render.test.tsx`
- Modify: `tests/preview.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Cover these transitions by position, including two identical characters:

```tsx
it("风险和手动模式点击文字只打开弹窗", () => {
  // for each mode: click the first duplicated character
  // assert dialog opens and the selected key arrays are unchanged
});

it("未注音时点击当前读音会添加注音", () => {
  // open an unannotated character, assert no aria-pressed=true,
  // click its current reading, then assert only that position was added
});

it("已注音时点击当前读音会取消注音", () => {
  // open an annotated character, click the pressed candidate,
  // assert its key is removed while Pair.py remains unchanged
});

it("点击其他读音会换音并保持注音", () => {
  // click another candidate and assert Pair.py changes and key remains present
});

it("全文模式点击当前读音取消，再点击候选恢复", () => {
  // click current candidate and assert only that position becomes hidden,
  // then click its candidate again and assert the annotation returns
});
```

Also update render tests so Enter/Space still open candidates, and punctuation/Latin/digits remain non-interactive.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/preview.test.tsx tests/render.test.tsx`

Expected: FAIL because manual mode currently toggles immediately and does not open the popup; risk mode cannot remove a selected annotation.

- [ ] **Step 3: Make all character clicks open candidates**

Remove `annotationSelectionActive` and `onToggleAnnotation` from `ProofreadParagraphOptions`. Keep `annotationVisibility`, add `highlightSelectedAnnotations`, and make click/Enter/Space always invoke `onOpenCandidates` for interactive Han characters.

In `Preview`:

1. Build visibility from `{ mode, fullKeys: fullAnnotationKeys, riskKeys: riskAnnotationKeys, manualKeys: manualAnnotationKeys }`.
2. Pass `selectedPy={isTargetAnnotated ? candidatePair.py : null}`.
3. Handle candidate selection with this state table:

```ts
if (isTargetAnnotated && py === pair.py) {
  setAnnotationAt(paragraphIndex, pairIndex, false);
} else {
  if (py !== pair.py) updatePairPy(paragraphIndex, pairIndex, py);
  setAnnotationAt(paragraphIndex, pairIndex, true);
}
```

4. Always show the selection count and `清空注音` toolbar in the same stable layout slot for all three modes; clear only the active mode.
5. On manual-input save, update the reading and annotate every edited position in the active mode. Closing, Escape, or outside click must not change keys.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/preview.test.tsx tests/render.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the unified interaction**

```bash
git add src/lib/render.tsx src/components/Preview.tsx tests/render.test.tsx tests/preview.test.tsx
git commit -m "feat: unify annotation candidate interaction"
```

### Task 4: Persist all three filters through history and print

**Files:**
- Modify: `src/components/ActionPanel.tsx`
- Modify: `src/components/HistoryPanel.tsx`
- Modify: `src/hooks/usePrint.ts`
- Modify: `src/components/PrintOnly.tsx`
- Modify: `tests/history.test.ts`
- Modify: `tests/print-navigation.test.tsx`
- Modify: `tests/print-only.test.tsx`

- [ ] **Step 1: Write failing persistence tests**

Add round-trip coverage for independent arrays:

```ts
expect(loadHistory().records[0].annotationSettings).toEqual({
  mode: "risk",
  riskKeys: [],
  manualKeys: ["0:1"],
});
```

Add print tests proving:

- explicit `riskKeys: []` prints no risk annotation and stays empty;
- old payloads missing `riskKeys` derive current risk positions from saved paragraphs;
- manual and risk keys survive print navigation without overwriting each other.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/history.test.ts tests/print-navigation.test.tsx tests/print-only.test.tsx`

Expected: FAIL because saved and temporary payloads currently include only `manualKeys`.

- [ ] **Step 3: Carry all three arrays through existing boundaries**

Add `fullKeys` and `riskKeys` anywhere `annotationSettings` is assembled. Normalize restored history and print settings with their saved paragraphs. Do not change `src/lib/types.ts` or the history schema version.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/history.test.ts tests/print-navigation.test.tsx tests/print-only.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit persistence**

```bash
git add src/components/ActionPanel.tsx src/components/HistoryPanel.tsx src/hooks/usePrint.ts src/components/PrintOnly.tsx tests/history.test.ts tests/print-navigation.test.tsx tests/print-only.test.tsx
git commit -m "fix: persist annotation filter selections"
```

### Task 5: Adversarial review and regression

**Files:**
- Modify only files required by failures introduced by Tasks 1-4.

- [ ] **Step 1: Run targeted adversarial tests**

Run:

```bash
npm test -- tests/annotation.test.ts tests/preview.test.tsx tests/render.test.tsx tests/history.test.ts tests/print-navigation.test.tsx tests/print-only.test.tsx
```

Expected: PASS for duplicated characters, empty risk selection, independent mode switches/clears, candidate add/remove/switch, manual input, close/Escape/outside-click, keyboard access, punctuation, history, and print.

- [ ] **Step 2: Review the diff adversarially**

Inspect `git diff HEAD~4 --check` and `git diff HEAD~4 --stat`, then trace each state boundary:

- generating/resetting content;
- switching full/risk/manual repeatedly;
- clearing risk versus clearing manual;
- saving/loading new and legacy records;
- entering/returning from print;
- opening and dismissing candidate/manual-input UI without a selection;
- clicking duplicate characters by occurrence rather than by glyph.

If a defect is found, first add a reproducing test, then apply the smallest fix and commit it separately as `fix: harden annotation filter interactions`.

- [ ] **Step 3: Run the full suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 4: Build production assets**

Run: `npm run build`

Expected: exit code 0; existing pdfjs worker, eval, and large-chunk warnings are acceptable.

- [ ] **Step 5: Check repository scope**

Run: `git diff main...HEAD --check && git status --short`

Expected: no whitespace errors and a clean feature worktree. No changes to `src/lib/types.ts`, dependencies, routes, or build config.

- [ ] **Step 6: Browser acceptance**

Start `npm run dev -- --host 127.0.0.1`, open the reported local URL, and verify:

1. 全文模式默认所有字有注音；候选当前音选中，点击可取消，再次点击可恢复。
2. 风险模式初始只显示风险字；点击已注音字可切音或点当前音取消。
3. 手动模式初始为空；点击字只打开弹窗，点击候选后才出现注音。
4. 全文、风险与手动分别保留选择；各自清空互不影响。
5. 打印后返回仍保留正文与三种模式的选择。

Stop after local verification. Do not merge to `main` or push without explicit user confirmation.
