// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function extractBlock(css: string, start: number) {
  const openingBrace = css.indexOf("{", start);
  if (openingBrace === -1) return "";

  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(start, index + 1);
  }

  return "";
}

describe("changelog styles", () => {
  it("uses the remaining viewport height for the update records", () => {
    const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
    const mobileStart = css.indexOf("@media (max-width: 820px)");
    const baseCss = css.slice(0, mobileStart);
    const mobileCss = extractBlock(css, mobileStart);
    const shellRule = baseCss.match(/\.changelog-shell\s*\{[^}]*\}/s)?.[0] ?? "";
    const sectionRule = baseCss.match(/\.changelog-section\s*\{[^}]*\}/s)?.[0] ?? "";
    const baseScrollRule = baseCss.match(/\.changelog-scroll\s*\{[^}]*\}/s)?.[0] ?? "";
    const mobileScrollRule = mobileCss.match(/\.changelog-scroll\s*\{[^}]*\}/s)?.[0] ?? "";
    const mobileDeclarations = mobileScrollRule
      .slice(mobileScrollRule.indexOf("{") + 1, mobileScrollRule.lastIndexOf("}"))
      .split(";")
      .map((declaration) => declaration.trim().replace(/\s*:\s*/, ": "))
      .filter(Boolean);

    expect(mobileStart).toBeGreaterThan(-1);
    expect(mobileCss).not.toBe("");
    expect(shellRule).toMatch(/height:\s*100dvh;/);
    expect(shellRule).toMatch(/display:\s*grid;/);
    expect(shellRule).toMatch(/grid-template-rows:\s*auto auto minmax\(0,\s*1fr\);/);
    expect(sectionRule).toMatch(/min-height:\s*0;/);
    expect(sectionRule).toMatch(/display:\s*flex;/);
    expect(sectionRule).toMatch(/flex-direction:\s*column;/);
    expect(baseScrollRule).toMatch(/flex:\s*1 1 auto;/);
    expect(baseScrollRule).toMatch(/min-height:\s*0;/);
    expect(baseScrollRule).toMatch(/overflow-y:\s*auto;/);
    expect(baseScrollRule).not.toMatch(/(?:^|[;{])\s*height\s*:/);
    expect(mobileDeclarations).toEqual(["padding-right: 6px"]);
  });
});
