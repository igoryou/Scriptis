import test from "node:test";
import assert from "node:assert/strict";
import { readJson, HttpError, withDeadline } from "../../src/lib/backend/http";

test("deadline aborts stalled body reads without waiting for upstream", async () => {
  let canceled = false;
  let signal: AbortSignal | undefined;
  const body = new ReadableStream(
    {
      pull() {},
      cancel() {
        canceled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(
    withDeadline(async (abort) => {
      signal = abort;
      return readJson(request, 24, abort);
    }, 25),
    (error: unknown) => error instanceof HttpError && error.status === 504,
  );
  assert.equal(signal?.aborted, true);
  assert.equal(canceled, true);
});

test("rejects declared oversized bodies before reading the stream", async () => {
  let reads = 0;
  const body = new ReadableStream(
    {
      pull() {
        reads += 1;
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "8193" },
    body,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(
    readJson(request, 8192),
    (error: unknown) => error instanceof HttpError && error.status === 413,
  );
  assert.equal(reads, 0);
});

test("only accepts JSON content types and valid JSON", async () => {
  for (const [body, contentType, status] of [
    ["{}", "text/plain", 415],
    ["{", "application/json", 400],
  ] as const) {
    await assert.rejects(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          body,
          headers: { "content-type": contentType },
        }),
        24,
      ),
      (error: unknown) => error instanceof HttpError && error.status === status,
    );
  }
  assert.deepEqual(
    await readJson(
      new Request("http://localhost", {
        method: "POST",
        body: '{"ok":true}',
        headers: { "content-type": "application/json; charset=utf-8" },
      }),
      24,
    ),
    { ok: true },
  );
});

test("counts streamed bytes despite a false length and cancels at the cap", async () => {
  let reads = 0;
  let canceled = false;
  const body = new ReadableStream(
    {
      pull(controller) {
        reads++;
        controller.enqueue(
          new TextEncoder().encode(reads === 1 ? '{"x":"' : "ç".repeat(10)),
        );
        if (reads === 8) controller.close();
      },
      cancel() {
        canceled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "1" },
    body,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(
    readJson(request, 24),
    (error: unknown) => error instanceof HttpError && error.status === 413,
  );
  assert.equal(reads, 2);
  assert.equal(canceled, true);
});
