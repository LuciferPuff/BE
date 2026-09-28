import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

describe("analysis email token", () => {
  before(() => {
    process.env.ANALYSIS_EMAIL_TOKEN_SECRET = "test-secret-for-unit";
  });

  it("round-trips with secret", async () => {
    const { createAnalysisEmailToken, verifyAnalysisEmailToken } = await import(
      "@/lib/analyses/email-token"
    );
    const id = "11111111-1111-4111-8111-111111111111";
    const token = createAnalysisEmailToken(id, 60);
    const verified = verifyAnalysisEmailToken(token);
    assert.ok(verified);
    assert.equal(verified!.userAnalysisId, id);
  });

  it("rejects tampered token", async () => {
    const { createAnalysisEmailToken, verifyAnalysisEmailToken } = await import(
      "@/lib/analyses/email-token"
    );
    const token = createAnalysisEmailToken(
      "11111111-1111-4111-8111-111111111111",
      60,
    );
    const bad = `${token}x`;
    assert.equal(verifyAnalysisEmailToken(bad), null);
  });
});
