# Local Image OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add private, browser-only Chinese OCR with separate camera and image-upload entry points, an editable review step, and safe insertion into the existing editor.

**Architecture:** Keep file validation and text merging in a small pure module, isolate Tesseract.js behind a dynamically imported adapter, and keep transient OCR state inside a new import component. The component writes to the existing Zustand store only after explicit user confirmation.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Testing Library, Tesseract.js WebAssembly/Web Worker

---

## File Map

- Create `src/lib/image-import.ts`: supported file rules, OCR text cleanup, and append behavior.
- Create `tests/image-import.test.ts`: unit tests for all pure import rules.
- Create `src/lib/image-ocr.ts`: lazy Tesseract.js worker lifecycle and progress mapping.
- Create `src/components/ImageOcrImport.tsx`: camera/upload controls, progress, editable result, and editor insertion.
- Create `tests/image-ocr-import.test.tsx`: component behavior with the OCR adapter mocked.
- Modify `src/routes/Home.tsx`: mount the new import card next to PDF import.
- Modify `src/styles/global.css`: styles scoped to the new card and responsive action layout.
- Modify `package.json` and `package-lock.json`: add `tesseract.js`.

### Task 1: Image import rules

**Files:**
- Create: `tests/image-import.test.ts`
- Create: `src/lib/image-import.ts`

- [ ] **Step 1: Write failing unit tests**

Test `validateImageFile()` with JPEG/PNG/WebP, unsupported MIME type, and a file larger than 10 MiB. Test `cleanOcrText()` with CRLF, trailing spaces, and excessive blank lines. Test `mergeImportedText()` for empty and existing editor input.

```ts
expect(validateImageFile(new File(["x"], "page.jpg", { type: "image/jpeg" }))).toBeNull();
expect(validateImageFile(new File(["x"], "page.gif", { type: "image/gif" }))).toMatch("JPG");
expect(cleanOcrText(" 第一行  \r\n\r\n\r\n第二行 ")).toBe("第一行\n\n第二行");
expect(mergeImportedText("原文", "识别文字")).toBe("原文\n\n识别文字");
```

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/image-import.test.ts`

Expected: FAIL because `@/lib/image-import` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Export:

```ts
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export function validateImageFile(file: File): string | null;
export function cleanOcrText(text: string): string;
export function mergeImportedText(current: string, imported: string): string;
```

Allow `image/jpeg`, `image/png`, and `image/webp`. Return concise Chinese validation messages. Normalize line endings, remove whitespace before newlines, collapse three or more newlines to two, and trim.

- [ ] **Step 4: Verify the tests pass**

Run: `npm test -- tests/image-import.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/image-import.ts tests/image-import.test.ts
git commit -m "test: define local image import rules"
```

### Task 2: OCR adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/image-ocr.ts`

- [ ] **Step 1: Install the browser OCR dependency**

Run: `npm install tesseract.js`

Expected: `tesseract.js` appears in dependencies and the lockfile updates.

- [ ] **Step 2: Implement a narrow adapter**

Export:

```ts
export interface ImageOcrProgress {
  status: string;
  progress: number;
}

export async function recognizeImageText(
  file: File,
  onProgress?: (progress: ImageOcrProgress) => void,
): Promise<string>;
```

Inside the function, dynamically import `tesseract.js`, create a `chi_sim` worker with a logger, call `worker.recognize(file)`, clean the returned text with `cleanOcrText()`, and terminate the worker in `finally`. Throw `Error("没有识别出文字，请调整光线、距离或角度后重试")` for an empty result.

- [ ] **Step 3: Verify TypeScript integration**

Run: `npm run build`

Expected: PASS, with Tesseract code emitted as a separate lazy chunk.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/image-ocr.ts
git commit -m "feat: add browser-only Chinese OCR adapter"
```

### Task 3: OCR import component

**Files:**
- Create: `tests/image-ocr-import.test.tsx`
- Create: `src/components/ImageOcrImport.tsx`

- [ ] **Step 1: Write failing component tests**

Mock `@/lib/image-ocr` and verify:

- “拍照识别” input has `accept="image/jpeg,image/png,image/webp"` and `capture="environment"`.
- “上传图片” input has the same accept list without `capture`.
- A successful recognition displays editable text before modifying the editor store.
- With empty input, “填入正文” writes the result and switches to plain mode.
- With existing input, “追加到正文” preserves it and “替换正文” replaces it.
- A rejected recognition shows an error and leaves editor input unchanged.

Use deferred promises for the progress state and `waitFor()` for async assertions.

- [ ] **Step 2: Verify the component tests fail**

Run: `npm test -- tests/image-ocr-import.test.tsx`

Expected: FAIL because `ImageOcrImport` does not exist.

- [ ] **Step 3: Implement the component**

Component state:

```ts
const [busy, setBusy] = useState(false);
const [fileName, setFileName] = useState<string | null>(null);
const [progress, setProgress] = useState(0);
const [result, setResult] = useState("");
const [error, setError] = useState<string | null>(null);
```

Use visually styled labels for the two file inputs. Validate before recognizing. Disable both inputs while busy. Show privacy text, percentage progress, and photo quality guidance. Keep result in a textarea. On insertion, call `setInput`, `setMode("plain")`, `setCurrentId(null)`, `setErr(null)`, and derive a title only when the current title is empty or `未命名`.

- [ ] **Step 4: Verify the component tests pass**

Run: `npm test -- tests/image-ocr-import.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ImageOcrImport.tsx tests/image-ocr-import.test.tsx
git commit -m "feat: add camera and image OCR review flow"
```

### Task 4: Page integration and styling

**Files:**
- Modify: `src/routes/Home.tsx`
- Modify: `src/styles/global.css`
- Modify: `tests/image-ocr-import.test.tsx`

- [ ] **Step 1: Add a failing home integration assertion**

Render `Home` inside `MemoryRouter` and assert that the “图片识字” heading and both entry points are present.

- [ ] **Step 2: Verify the integration assertion fails**

Run: `npm test -- tests/image-ocr-import.test.tsx`

Expected: FAIL because `Home` does not mount the component.

- [ ] **Step 3: Mount and style the component**

Import `ImageOcrImport` in `Home.tsx` and render it immediately before `PdfImport`. Add only component-scoped styles for:

- two-column import actions;
- privacy hint and photo tip;
- progress bar;
- OCR result textarea;
- append/replace action row;
- single-column mobile layout.

- [ ] **Step 4: Verify focused tests**

Run: `npm test -- tests/image-import.test.ts tests/image-ocr-import.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Home.tsx src/styles/global.css tests/image-ocr-import.test.tsx
git commit -m "feat: integrate local image OCR import"
```

### Task 5: Full verification

**Files:**
- Review all files changed since the design commit.

- [ ] **Step 1: Run all unit and component tests**

Run: `npm test`

Expected: all test files pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass; OCR dependency remains in lazy chunks.

- [ ] **Step 3: Check scope and whitespace**

Run:

```bash
git diff --check
git status --short
git diff --stat e37b09e
```

Expected: no whitespace errors; only planned feature files plus pre-existing user-owned workspace noise are present.

- [ ] **Step 4: Stop for user verification**

Do not merge or push. Report the branch, test/build results, privacy behavior, and exact local command `npm run dev` for camera/upload validation.
