import { withDeadline } from '@/lib/backend/http';
import { cookies } from 'next/headers';

export async function POST() {
  return withDeadline(async (signal) => {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return Response.json({ error: 'Supabase não configurado.' }, { status: 500 });
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    });
    await supabase.auth.signOut();
    return Response.json({ success: true });
  });
}