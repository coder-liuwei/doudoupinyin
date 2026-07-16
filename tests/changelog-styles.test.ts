// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("changelog styles", () => {
  it("uses the remaining viewport height for the update records", () => {
    const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
    const mobileStart = css.indexOf("@media (max-width: 820px)");
    const baseCss = css.slice(0, mobileStart);
    const mobileCss = css.slice(mobileStart);
    const shellRule = baseCss.match(/\.changelog-shell\s*\{[^}]*\}/s)?.[0] ?? "";
    const sectionRule = baseCss.match(/\.changelog-section\s*\{[^}]*\}/s)?.[0] ?? "";
    const baseScrollRule = baseCss.match(/\.changelog-scroll\s*\{[^}]*\}/s)?.[0] ?? "";
    const mobileScrollRule = mobileCss.match(/\.changelog-scroll\s*\{[^}]*\}/s)?.[0] ?? "";

    expect(mobileStart).toBeGreaterThan(-1);
    expect(shellRule).toMatch(/height:\s*100dvh;/);
    expect(shellRule).toMatch(/display:\s*grid;/);
    expect(shellRule).toMatch(/grid-template-rows:\s*auto auto minmax\(0,\s*1fr\);/);
    expect(sectionRule).toMatch(/min-height:\s*0;/);
    expect(sectionRule).toMatch(/display:\s*flex;/);
    expect(sectionRule).toMatch(/flex-direction:\s*column;/);
    expect(baseScrollRule).toMatch(/flex:\s*1 1 auto;/);
    expect(baseScrollRule).toMatch(/min-height:\s*0;/);
    expect(baseScrollRule).toMatch(/overflow-y:\s*auto;/);
    expect(baseScrollRule).not.toMatch(/height:\s*min\(/);
    expect(mobileScrollRule).toMatch(/padding-right:\s*6px;/);
    expect(mobileScrollRule).not.toMatch(/(?:^|[;{])\s*height\s*:/);
    expect(mobileScrollRule).not.toMatch(/min-height\s*:/);
  });
});
