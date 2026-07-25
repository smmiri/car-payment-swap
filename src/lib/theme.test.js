import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveIsDark } from "./theme.js";

describe("theme", () => {
  it("resolveIsDark respects explicit light and dark", () => {
    assert.equal(resolveIsDark("light"), false);
    assert.equal(resolveIsDark("dark"), true);
  });
});
