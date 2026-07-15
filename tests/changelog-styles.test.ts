// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("changelog styles", () => {
  it("keeps the update records in an independent vertical scroller", () => {
    const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
    const scrollRules = css.match(/\.changelog-scroll\s*\{[^}]*\}/gs) ?? [];
    const [baseRule, mobileRule] = scrollRules;

    expect(scrollRules).toHaveLength(2);
    expect(baseRule).toMatch(/height:\s*min\(52dvh,\s*520px\);/);
    expect(baseRule).toMatch(/overflow-y:\s*auto;/);
    expect(baseRule).not.toMatch(/min-height:/);
    expect(mobileRule).toMatch(/height:\s*min\(55dvh,\s*480px\);/);
    expect(mobileRule).not.toMatch(/min-height:/);
  });
});
