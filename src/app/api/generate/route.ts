import { serverApi } from '@/lib/backend/server';

export async function POST(request: Request) {
  return serverApi().generate(request);
}
