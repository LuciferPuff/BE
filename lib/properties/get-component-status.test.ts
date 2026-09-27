import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getComponentStatus,
  heatCompatibilityWarning,
} from "@/lib/properties/get-component-status";
import {
  buildPropertyPartViews,
  computeProfileCompleteness,
  pickNextPartAction,
} from "@/lib/properties/build-property-parts";

describe("getComponentStatus", () => {
  it("verifierad över livslängd → action (röd)", () => {
    const result = getComponentStatus({
      key: "fasad",
      buildYear: 1970,
      replacedYear: 1975,
      yearPrecision: "exact",
      variant: null,
      knownIssues: [],
      nowYear: 2026,
    });
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
      variant: null,
      knownIssues: [],
      nowYear: 2026,
    });
    assert.equal(result.status, "likely");
    assert.equal(result.source, "assumed");
    assert.equal(result.statusLabel, "Troligen dags");
  });

  it("varmekalla utan variant → unknown", () => {
    const result = getComponentStatus({
      key: "varmekalla",
      buildYear: 1980,
      replacedYear: null,
      yearPrecision: null,
      variant: null,
      knownIssues: [],
      nowYear: 2026,
    });
    assert.equal(result.status, "unknown");
    assert.match(result.prompt ?? "", /uppvärmning/i);
  });

  it("varmekalla med variant utan år → unknown", () => {
    const result = getComponentStatus({
      key: "varmekalla",
      buildYear: 1980,
      replacedYear: null,
      yearPrecision: null,
      variant: "bergvarme",
      knownIssues: [],
      nowYear: 2026,
    });
    assert.equal(result.status, "unknown");
    assert.match(result.prompt ?? "", /installerades/i);
  });

  it("känt problem → action oavsett ålder", () => {
    const result = getComponentStatus({
      key: "tak",
      buildYear: 2018,
      replacedYear: 2018,
      yearPrecision: "exact",
      variant: "tegel",
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
      variant: "eternit",
      knownIssues: [],
      nowYear: 2026,
    });
    assert.equal(result.status, "action");
    assert.match(result.warning ?? "", /asbest/i);
  });

  it("tak utan variant → unknown med materialfråga", () => {
    const result = getComponentStatus({
      key: "tak",
      buildYear: 1990,
      replacedYear: null,
      yearPrecision: null,
      variant: null,
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
      variant: null,
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
      variant: null,
      knownIssues: [],
      nowYear: 2026,
    });
    assert.equal(result.status, "assumed_ok");
    assert.equal(result.source, "assumed");
  });

  it("integrerad VVB → ingår", () => {
    const result = getComponentStatus({
      key: "varmvattenberedare",
      buildYear: 2010,
      replacedYear: null,
      yearPrecision: null,
      variant: null,
      knownIssues: [],
      integrated: true,
      nowYear: 2026,
    });
    assert.match(result.ageLabel, /värmepumpen/i);
  });
});

describe("heatCompatibilityWarning", () => {
  it("bergvärme utan radiatorer → varning", () => {
    const msg = heatCompatibilityWarning({
      heatSources: [{ variant: "bergvarme", role: "primar" }],
      distributions: [{ variant: null }],
    });
    assert.ok(msg);
    assert.match(msg, /vattenburen/i);
  });

  it("bergvärme med radiatorer → ingen varning", () => {
    const msg = heatCompatibilityWarning({
      heatSources: [{ variant: "bergvarme", role: "primar" }],
      distributions: [{ variant: "radiatorer" }],
    });
    assert.equal(msg, null);
  });
});

describe("completeness + next step heating", () => {
  it("integrerad VVB exkluderas från X av Y", () => {
    const parts = buildPropertyPartViews(2010, [
      { ...row("tak", 2010), variant: "tegel" },
      row("fasad", 2010),
      row("fonster", 2010),
      row("dranering", 2010),
      row("grund", 2010, "original"),
      row("vatrum", 2010),
      {
        part_key: "varmekalla",
        replaced_year: 2015,
        year_precision: "exact",
        variant: "bergvarme",
        role: "primar",
        known_issues: [],
      },
      {
        part_key: "varmedistribution",
        replaced_year: 2010,
        year_precision: "exact",
        variant: "radiatorer",
        known_issues: [],
      },
      {
        part_key: "varmvattenberedare",
        replaced_year: null,
        year_precision: null,
        variant: null,
        integrated: true,
        known_issues: [],
      },
      row("ventilation", 2010),
      row("el", 2010),
      row("va", 2010),
    ]);
    const c = computeProfileCompleteness({ parts });
    const vvb = parts.find((p) => p.key === "varmvattenberedare");
    assert.equal(vvb?.countsTowardCompleteness, false);
    assert.ok(c.totalParts < parts.filter((p) => !p.notApplicable).length);
  });

  it("komplement påverkar inte Nästa steg om primär finns", () => {
    const parts = buildPropertyPartViews(2010, [
      { ...row("tak", 2010), variant: "tegel" },
      {
        part_key: "varmekalla",
        replaced_year: 2015,
        year_precision: "exact",
        variant: "bergvarme",
        role: "primar",
        known_issues: [],
      },
      {
        part_key: "varmekalla",
        id: "komplement-1",
        replaced_year: null,
        year_precision: null,
        variant: null,
        role: "komplement",
        known_issues: [],
      },
    ]);
    const next = pickNextPartAction(parts);
    assert.notEqual(next?.role, "komplement");
  });
});

function row(
  key: string,
  year: number | null,
  precision: string | null = year != null ? "exact" : null,
) {
  return {
    part_key: key,
    replaced_year: year,
    year_precision: precision,
    variant: key === "tak" ? "tegel" : null,
    known_issues: [] as string[],
  };
}
