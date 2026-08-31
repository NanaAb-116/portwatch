import { describe, expect, it } from "vitest";
import { errorCode, terminationErrorMessage } from "./errors";

describe("termination error mapping", () => {
  it.each([
    ["process_no_longer_exists", "already exited"],
    ["process_identity_changed", "changed since it was discovered"],
    ["process_identity_unverifiable", "could not verify"],
    ["self_termination", "cannot terminate itself"],
    ["protected_process", "protected system process"],
    ["permission_denied", "denied permission"],
    ["process_still_running", "still running"],
    ["force_termination_failed", "could not force terminate"],
    ["force_termination_not_authorized", "confirmation expired"],
  ])("maps %s to safe user copy", (code, expected) => {
    expect(
      terminationErrorMessage({ code, details: { operation: "/private/native/error" } }),
    ).toContain(expected);
    expect(terminationErrorMessage({ code })).not.toContain("/private/native/error");
  });

  it("does not trust unknown thrown values", () => {
    expect(terminationErrorMessage(new Error("secret OS failure"))).toBe(
      "PortWatch could not terminate this process safely.",
    );
    expect(errorCode(new Error("secret OS failure"))).toBeUndefined();
  });
});

