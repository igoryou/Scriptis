import { withDeadline } from '@/lib/backend/http';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  return withDeadline(async (signal) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/';
    if (!code) return Response.redirect(new URL('/?error=magic_link_missing_code', url.origin));
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return Response.redirect(new URL('/?error=supabase_not_configured', url.origin));
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return Response.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, url.origin));
    return Response.redirect(new URL(next, url.origin));
  });
}