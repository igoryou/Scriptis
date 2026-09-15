import test from "node:test";
import assert from "node:assert/strict";
import { readLocalHistory } from "../../src/lib/local-history";

test("a new browser starts with an empty local history", () => {
  assert.deepEqual(readLocalHistory({ getItem: () => null }), {
    generations: [],
    error: null,
  });
});

test("corrupt JSON reports a recoverable storage error instead of crashing", () => {
  const result = readLocalHistory({ getItem: () => "{invalid" });
  assert.deepEqual(result.generations, []);
  assert.match(result.error ?? "", /histórico/i);
});
