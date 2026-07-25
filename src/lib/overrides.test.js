import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveFieldValue, anyManualOverride } from "./overrides.js";

describe("overrides", () => {
  it("auto returns computed", () => {
    const r = resolveFieldValue({ mode: "auto", manual: 9, computed: 42 });
    assert.equal(r.value, 42);
    assert.equal(r.derivedFromOverride, false);
  });

  it("manual returns manual", () => {
    const r = resolveFieldValue({ mode: "manual", manual: 9, computed: 42 });
    assert.equal(r.value, 9);
    assert.equal(r.derivedFromOverride, true);
  });

  it("detects any manual override", () => {
    assert.equal(anyManualOverride({ a: { mode: "auto" }, b: { mode: "manual" } }), true);
    assert.equal(anyManualOverride({ a: { mode: "auto" } }), false);
  });
});
