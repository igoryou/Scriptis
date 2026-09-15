import { readSettings, type Settings } from '@/lib/backend/settings';
import { withDeadline, readJson } from '@/lib/backend/http';
import { cookies } from 'next/headers';
import { generationSchema, type Generation } from '@/lib/domain';
import { upsertHistory } from '@/lib/local-history';

async function getUser(): Promise<{ id: string; email: string } | null> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? '' } : null;
}

export async function GET() {
  return withDeadline(async (signal) => {
    const user = await getUser();
    signal?.throwIfAborted();
    if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    });
    const { data, error } = await supabase.from('scriptis_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    const generations = (data ?? []).map(row => generationSchema.parse(row.content));
    return Response.json({ generations });
  });
}

export async function POST(request: Request) {
  return withDeadline(async (signal) => {
    const user = await getUser();
    signal?.throwIfAborted();
    if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
    const body = await readJson(request, 8192, signal) as { generation: Generation };
    const parsed = generationSchema.safeParse(body.generation);
    if (!parsed.success) return Response.json({ error: 'Registro inválido.' }, { status: 400 });
    if (parsed.data.input.name.trim().length === 0) return Response.json({ error: 'Nome do contato não pode ser vazio.' }, { status: 400 });
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    });
    const { error } = await supabase.from('scriptis_history').upsert({ user_id: user.id, content: parsed.data, created_at: parsed.data.createdAt }, { onConflict: 'user_id,created_at' });
    if (error) throw error;
    return Response.json({ generation: parsed.data });
  });
}

export async function DELETE(request: Request) {
  return withDeadline(async (signal) => {
    const user = await getUser();
    signal?.throwIfAborted();
    if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'ID obrigatório.' }, { status: 400 });
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    });
    const { error } = await supabase.from('scriptis_history').delete().eq('user_id', user.id).eq('content->>id', id);
    if (error) throw error;
    return Response.json({ success: true });
  });
}