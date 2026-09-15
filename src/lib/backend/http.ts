export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const REQUEST_TIMEOUT_MS = 12_000;

export async function withDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeout = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new HttpError(
        504,
        "A solicitação demorou demais. Tente novamente.",
      );
      controller.abort(error);
      reject(error);
    }, timeout);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export async function readJson(
  request: Request,
  limit: number,
  signal?: AbortSignal,
): Promise<unknown> {
  const length = Number(request.headers.get("content-length"));
  if (length > limit)
    throw new HttpError(413, "Corpo da solicitação muito grande.");
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new HttpError(415, "Envie JSON.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "JSON obrigatório.");
  const cancel = () => {
    void reader.cancel(signal?.reason).catch(() => {});
  };
  signal?.throwIfAborted();
  signal?.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        throw new HttpError(413, "Corpo da solicitação muito grande.");
      }
      chunks.push(value);
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError(400, "JSON inválido.");
  }
}
