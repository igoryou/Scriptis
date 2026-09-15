import { readSettings, type Settings } from '@/lib/backend/settings';
import { createApi, type Dependencies } from '@/lib/backend/api';
import { withDeadline, readJson } from '@/lib/backend/http';
import { cookies } from 'next/headers';
import { leadInputSchema, generationSchema, type LeadInput, type Generation } from '@/lib/domain';
import { generateLocal } from '@/lib/generator';

function getSettings(): Settings {
  return readSettings(process.env);
}

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

const deps: Dependencies = {
  settings: getSettings(),
  getUser: async (signal) => {
    const user = await getUser();
    signal?.throwIfAborted();
    return user;
  },
};

const api = createApi(deps);

export async function POST(request: Request) {
  return withDeadline(async (signal) => {
    const body = await readJson(request, 8192, signal) as { input: LeadInput; iteration?: number };
    const parsed = leadInputSchema.safeParse(body.input);
    if (!parsed.success) return Response.json({ error: 'Dados de contato inválidos.' }, { status: 400 });
    const iteration = body.iteration ?? 0;
    if (!Number.isSafeInteger(iteration) || iteration < 0) return Response.json({ error: 'Iteração inválida.' }, { status: 400 });
    const generation = generateLocal(parsed.data, iteration);
    generationSchema.parse(generation);
    return Response.json({ generation });
  });
}