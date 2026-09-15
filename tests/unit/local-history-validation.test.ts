import test from "node:test";
import assert from "node:assert/strict";
import { readLocalHistory } from "../../src/lib/local-history";
test("well-formed JSON with malformed records is rejected safely", () => {
  for (const payload of ["{}", "null", '[null,{"id":"bad"}]']) {
    const result = readLocalHistory({ getItem: () => payload });
    assert.deepEqual(result.generations, []);
    assert.ok(result.error);
  }
});
