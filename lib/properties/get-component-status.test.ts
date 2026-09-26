import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getComponentStatus } from "@/lib/properties/get-component-status";

describe("getComponentStatus", () => {
  it("verifierad över livslängd → action (röd)", () => {
    const result = getComponentStatus({
      key: "fasad",
      buildYear: 1970,
      replacedYear: 1975,
      yearPrecision: "exact",
      material: null,
      knownIssues: [],
      nowYear: 2026,
    });
    // ålder 51, livslängd 40 → action
    assert.equal(result.status, "action");
    assert.equal(result.source, "verified");
    assert.equal(result.statusLabel, "Åtgärda");
  });

  it("antagen ≥ 70 % → likely", () => {
    const result = getComponentStatus({
      key: "fonster",
      buildYear: 1995,
      replacedYear: null,
      yearPrecision: null,
      material: null,
      knownIssues: [],
      nowYear: 2026,
    });
    // ålder 31, livslängd 35 → ~88 % → likely
    assert.equal(result.status, "likely");
    assert.equal(result.source, "assumed");
    assert.equal(result.statusLabel, "Troligen dags");
  });

  it("antagen > 1,5 × livslängd → unknown (troligen bytt)", () => {
    const result = getComponentStatus({
      key: "uppvarmning",
      buildYear: 1980,
      replacedYear: null,
      yearPrecision: null,
      material: null,
      knownIssues: [],
      nowYear: 2026,
    });
    // ålder 46, livslängd 20 → 2,3× → unknown
    assert.equal(result.status, "unknown");
    assert.match(result.prompt ?? "", /troligen bytt/i);
  });

  it("känt problem → action oavsett ålder", () => {
    const result = getComponentStatus({
      key: "tak",
      buildYear: 2018,
      replacedYear: 2018,
      yearPrecision: "exact",
      material: "tegel",
      knownIssues: ["lackage"],
      nowYear: 2026,
    });
    assert.equal(result.status, "action");
  });

  it("eternit → action + asbestvarning", () => {
    const result = getComponentStatus({
      key: "tak",
      buildYear: 1975,
      replacedYear: null,
      yearPrecision: null,
      material: "eternit",
      knownIssues: [],
      nowYear: 2026,
    });
    assert.equal(result.status, "action");
    assert.match(result.warning ?? "", /asbest/i);
  });

  it("tak utan material → unknown med materialfråga", () => {
    const result = getComponentStatus({
      key: "tak",
      buildYear: 1990,
      replacedYear: null,
      yearPrecision: null,
      material: null,
      knownIssues: [],
      nowYear: 2026,
    });
    assert.equal(result.status, "unknown");
    assert.match(result.prompt ?? "", /material/i);
  });

  it("original från byggår räknas som verifierat", () => {
    const result = getComponentStatus({
      key: "grund",
      buildYear: 2010,
      replacedYear: 2010,
      yearPrecision: "original",
      material: null,
      knownIssues: [],
      nowYear: 2026,
    });
    assert.equal(result.source, "verified");
    assert.equal(result.status, "ok");
  });

  it("antagen under 70 % → assumed_ok", () => {
    const result = getComponentStatus({
      key: "el",
      buildYear: 2015,
      replacedYear: null,
      yearPrecision: null,
      material: null,
      knownIssues: [],
      nowYear: 2026,
    });
    // ålder 11, livslängd 45 → assumed_ok
    assert.equal(result.status, "assumed_ok");
    assert.equal(result.source, "assumed");
  });
});
