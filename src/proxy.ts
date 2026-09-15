import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSettings } from "./lib/backend/settings";
export async function proxy(request: NextRequest) {
  const settings = readSettings(process.env);
  if (!settings.supabase) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    settings.supabase.url,
    settings.supabase.key,
    {
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          for (const { name, value } of values)
            request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of values)
            response.cookies.set(name, value, options);
        },
      },
    },
  );
  try {
    await supabase.auth.getClaims();
  } catch {
    /* Protected API routes independently verify every identity. */
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/", "/login"] };
