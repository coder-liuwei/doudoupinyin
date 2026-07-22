// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("preview interaction styles", () => {
  it("shows a pointer cursor for clickable annotated characters", () => {
    const css = readFileSync(
      new URL("../src/styles/global.css", import.meta.url),
      "utf8",
    );
    const clickableUnitRule =
      css.match(/\.proof-unit\[role="button"\]\s*\{[^}]*\}/s)?.[0] ?? "";

    expect(clickableUnitRule).toMatch(/cursor:\s*pointer;/);
  });

  it("keeps a stable annotation status slot without overlay positioning", () => {
    const css = readFileSync(
      new URL("../src/styles/global.css", import.meta.url),
      "utf8",
    );
    const rule = css.match(/\.annotation-selection-bar\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(rule).not.toContain("position: absolute");
    expect(rule).not.toContain("position: fixed");
    expect(rule).toContain("margin: 0 0 14px");
  });
});
