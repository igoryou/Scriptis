/** Pure configuration parser. Only server-only modules pass process.env here. */
export interface Settings {
  supabase: { url: string; key: string } | null;
  anthropic: { apiKey: string; model: string } | null;
  siteOrigin: string | null;
}

function origin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function readSettings(
  env: Record<string, string | undefined>,
): Settings {
  const siteOrigin = origin(env.NEXT_PUBLIC_SITE_URL);
  const url = origin(env.NEXT_PUBLIC_SUPABASE_URL);
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const supabase = siteOrigin && url && key ? { url, key } : null;
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  const model = env.ANTHROPIC_MODEL?.trim();
  return {
    siteOrigin,
    supabase,
    anthropic: supabase && apiKey && model ? { apiKey, model } : null,
  };
}
