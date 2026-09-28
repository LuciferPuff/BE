import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPropertyPartViews,
  pickNextPartAction,
} from "@/lib/properties/build-property-parts";
import { buildPropertyTodos } from "@/lib/properties/build-todos";

function row(
  key: string,
  year: number | null,
  precision: string | null = year != null ? "exact" : null,
) {
  return {
    part_key: key,
    replaced_year: year,
    year_precision: precision,
    variant:
      key === "tak" ? "tegel" : key === "grund" ? "platta_pa_mark" : null,
    known_issues: [] as string[],
  };
}

describe("pickNextPartAction priority", () => {
  it("väljer första overifierade i konsekvensordning (tak före våtrum)", () => {
    const parts = buildPropertyPartViews(1980, [
      row("fasad", null),
      row("vatrum", null),
    ]);
    const next = pickNextPartAction(parts);
    assert.equal(next?.key, "tak");
  });

  it("hoppar verifierad tak och tar våtrum", () => {
    const parts = buildPropertyPartViews(1980, [
      { ...row("tak", 2015), variant: "tegel" },
      row("vatrum", null),
      row("dranering", null),
    ]);
    const next = pickNextPartAction(parts);
    assert.equal(next?.key, "vatrum");
  });

  it("när allt verifierat: snart/action i prioritet", () => {
    const parts = buildPropertyPartViews(1970, [
      { ...row("tak", 1972), variant: "papp" },
      row("vatrum", 2020),
      row("dranering", 2015),
      row("va", 2010),
      row("el", 2010),
      {
        part_key: "varmekalla",
        replaced_year: 2018,
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
      row("varmvattenberedare", 2018),
      row("fonster", 2010),
      row("fasad", 2010),
      row("ventilation", 2015),
      row("grund", 1970, "original"),
    ]);
    const next = pickNextPartAction(parts);
    assert.ok(next);
    assert.equal(next.source, "verified");
    assert.ok(next.tone === "action" || next.tone === "soon");
  });
});

describe("verify_parts auto-complete", () => {
  it("markeras klar automatiskt när alla delar är verifierade", () => {
    const parts = buildPropertyPartViews(2010, [
      { ...row("tak", 2010), variant: "tegel" },
      row("fasad", 2010),
      row("fonster", 2010),
      row("dranering", 2010),
      row("grund", 2010, "original"),
      row("vatrum", 2010),
      {
        part_key: "varmekalla",
        replaced_year: 2010,
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
      row("varmvattenberedare", 2010),
      row("ventilation", 2010),
      row("el", 2010),
      row("va", 2010),
    ]);
    const todos = buildPropertyTodos({
      ownershipStatus: "ager",
      hasAnalysis: true,
      parts,
      states: [],
      propertyId: "p1",
      month: 7,
    });
    const verify = todos.find((t) => t.key === "verify_parts");
    assert.ok(verify);
    assert.equal(verify.kind, "auto");
    assert.equal(verify.completed, true);
  });

  it("är öppen när någon del saknar verifiering", () => {
    const parts = buildPropertyPartViews(2010, [
      { ...row("tak", 2010), variant: "tegel" },
    ]);
    const todos = buildPropertyTodos({
      ownershipStatus: "ager",
      hasAnalysis: false,
      parts,
      states: [],
      propertyId: "p1",
      month: 7,
    });
    const verify = todos.find((t) => t.key === "verify_parts");
    assert.equal(verify?.completed, false);
    assert.equal(verify?.kind, "auto");
  });
});
