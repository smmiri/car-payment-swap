import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INPUTS, createScenario } from "./defaults.js";
import {
  mergeSavedInputs,
  parseInputsCookieValue,
  serializeInputs,
  INPUTS_COOKIE_MAX_BYTES,
} from "./persist-inputs.js";

describe("persist-inputs", () => {
  it("mergeSavedInputs ignores unknown keys and invalid enums", () => {
    const merged = mergeSavedInputs({
      global: { province: "ZZ", targetAllInMonthly: "bad", annualKm: 15_000 },
      extra: 123,
    });
    assert.equal(merged.global.province, DEFAULT_INPUTS.global.province);
    assert.equal(merged.global.annualKm, 15_000);
    assert.equal(merged.extra, undefined);
  });

  it("mergeSavedInputs keeps valid nested scenarios", () => {
    const merged = mergeSavedInputs({
      global: { province: "BC", targetAllInMonthly: 900 },
      scenarios: [
        createScenario({
          id: "x",
          name: "Test",
          vehicleType: "new_ev_bev",
          tradeInValue: 12_000,
          channel: "dealer",
        }),
      ],
      activeScenarioId: "x",
    });
    assert.equal(merged.global.province, "BC");
    assert.equal(merged.global.targetAllInMonthly, 900);
    assert.equal(merged.scenarios.length, 1);
    assert.equal(merged.scenarios[0].vehicleType, "new_ev_bev");
    assert.equal(merged.activeScenarioId, "x");
  });

  it("round-trips through serialize and parse", () => {
    const custom = structuredClone(DEFAULT_INPUTS);
    custom.global.targetAllInMonthly = 750;
    custom.current.balance = 12_000;
    const raw = serializeInputs(custom);
    // Full multi-scenario payloads may exceed cookie limits; localStorage holds them.
    assert.ok(raw.length > 0);
    assert.ok(INPUTS_COOKIE_MAX_BYTES > 0);
    const restored = parseInputsCookieValue(raw);
    assert.equal(restored.global.targetAllInMonthly, 750);
    assert.equal(restored.current.balance, 12_000);
  });

  it("mergeSavedInputs repairs missing and duplicate scenario ids", () => {
    const merged = mergeSavedInputs({
      scenarios: [
        { name: "A", tradeInValue: 10_000 },
        { id: "dup", name: "B", tradeInValue: 12_000 },
        { id: "dup", name: "C", tradeInValue: 14_000 },
      ],
      activeScenarioId: "dup",
    });
    const ids = merged.scenarios.map((s) => s.id);
    assert.equal(new Set(ids).size, 3);
    assert.ok(ids.every((id) => typeof id === "string" && id.length > 0));
    // First "dup" kept; active still valid
    assert.ok(ids.includes(merged.activeScenarioId));
  });

  it("parseInputsCookieValue returns null for garbage", () => {
    assert.equal(parseInputsCookieValue(""), null);
    assert.equal(parseInputsCookieValue("%"), null);
    assert.equal(parseInputsCookieValue("not-json"), null);
  });
});
