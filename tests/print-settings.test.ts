import { describe, it, expect } from "vitest";
import {
  DEFAULT_PRINT_SETTINGS,
  normalizePrintSettings,
  resolvePrintSettings,
  printSettingsFromStore,
} from "@/lib/print-settings";

describe("print-settings", () => {
  it("normalizePrintSettings(undefined) returns defaults", () => {
    expect(normalizePrintSettings(undefined)).toEqual(DEFAULT_PRINT_SETTINGS);
  });

  it("maps legacy fontSize 19 to nearest preset 20", () => {
    expect(normalizePrintSettings({ fontSize: 19 }).fontSize).toBe(20);
  });

  it("maps out-of-range fontSize to nearest preset", () => {
    expect(normalizePrintSettings({ fontSize: 99 }).fontSize).toBe(24);
    expect(normalizePrintSettings({ fontSize: 1 }).fontSize).toBe(16);
  });

  it("resolvePrintSettings is equivalent to normalizePrintSettings", () => {
    expect(resolvePrintSettings({ fontSize: 24, pageGuide: "grid" })).toEqual(
      normalizePrintSettings({ fontSize: 24, pageGuide: "grid" }),
    );
  });

  it("printSettingsFromStore mirrors store fields", () => {
    const store = {
      fontSize: 24,
      lineHeight: 2.45,
      letterSpacing: 6,
      layoutMode: "preserve" as const,
      indentFirstLine: false,
      showTitle: false,
      pageGuide: "grid" as const,
    };
    expect(printSettingsFromStore(store)).toEqual({
      fontSize: 24,
      lineHeight: 2.45,
      letterSpacing: 6,
      layoutMode: "preserve",
      indentFirstLine: false,
      showTitle: false,
      pageGuide: "grid",
    });
  });
});
