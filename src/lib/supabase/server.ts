import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Settings } from "../backend/settings";
export async function createServerSupabase(
  settings: Settings,
  signal?: AbortSignal,
) {
  if (!settings.supabase) return null;
  const cookieStore = await cookies();
  return createServerClient(settings.supabase.url, settings.supabase.key, {
    cookieOptions: {
      sameSite: "lax",
      secure: settings.siteOrigin?.startsWith("https://") ?? false,
      path: "/",
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: signal ?? init?.signal }),
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values)
          cookieStore.set(name, value, options);
      },
    },
  });
}
