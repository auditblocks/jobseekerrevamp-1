import { describe, it, expect } from "vitest";
import { REFERRAL_PENDING_CODE_KEY } from "../src/lib/referralStorage";

describe("referral storage contract", () => {
  it("uses a stable localStorage key for pending referral codes", () => {
    expect(REFERRAL_PENDING_CODE_KEY).toBe("referral_pending_code");
    expect(REFERRAL_PENDING_CODE_KEY.length).toBeGreaterThan(4);
  });
});
