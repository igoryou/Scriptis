import { withDeadline, readJson } from '@/lib/backend/http';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  return withDeadline(async (signal) => {
    const body = await readJson(request, 8192, signal) as { email: string };
    if (!body.email || !body.email.includes('@')) return Response.json({ error: 'E-mail válido é obrigatório.' }, { status: 400 });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) return Response.json({ error: 'NEXT_PUBLIC_SITE_URL não configurado.' }, { status: 500 });
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return Response.json({ error: 'Supabase não configurado.' }, { status: 500 });
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    });
    const { error } = await supabase.auth.signInWithOtp({ email: body.email, options: { emailRedirectTo: `${siteUrl}/auth/callback` } });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ message: 'Verifique seu e-mail e clique no link de acesso.' });
  });
}