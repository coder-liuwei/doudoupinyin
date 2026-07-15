// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("changelog styles", () => {
  it("keeps the update records in an independent vertical scroller", () => {
    const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.changelog-scroll\s*\{[^}]*overflow-y:\s*auto;/s);
    expect(css).toMatch(/\.changelog-scroll\s*\{[^}]*height:\s*min\(52vh,\s*520px\);/s);
  });
});
