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
});
