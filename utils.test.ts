import { assert, describe, expect, test } from "vitest";

import { canonicalJSON } from "./utils";

describe("canonicalJSON", async () => {
  test("ignore json field order", () => {
    const v1 = canonicalJSON({
      a: "A",
      b: "B",
    });
    assert(v1 === `{"a":"A","b":"B"}`);

    const v2 = canonicalJSON({
      b: "B",
      a: "A",
    });
    expect(v2).toBe(v1);
  });
});
