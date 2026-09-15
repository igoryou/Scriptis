import { readSettings, type Settings } from '@/lib/backend/settings';
import { withDeadline } from '@/lib/backend/http';
import { cookies } from 'next/headers';

async function getSettings(): Promise<Settings> {
  return readSettings(process.env);
}

async function getUser(): Promise<{ id: string; email: string } | null> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? '' } : null;
}

export async function GET() {
  return withDeadline(async () => {
    const [settings, user] = await Promise.all([getSettings(), getUser()]);
    return Response.json({
      supabaseConfigured: !!settings.supabase,
      anthropicConfigured: !!settings.anthropic,
      openaiConfigured: !!settings.openai,
      user: user ? { id: user.id, email: user.email } : null,
    });
  });
}