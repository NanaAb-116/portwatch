import { describe, expect, it } from "vitest";
import { viewFromSearch } from "./view";

describe("window view routing", () => {
  it("selects compact only for its explicit window URL", () => {
    expect(viewFromSearch("?view=compact")).toBe("compact");
    expect(viewFromSearch("?view=full")).toBe("full");
    expect(viewFromSearch("")).toBe("full");
  });
});
