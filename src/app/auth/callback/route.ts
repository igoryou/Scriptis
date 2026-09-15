import { serverApi } from '@/lib/backend/server';

export async function GET(request: Request) {
  return serverApi().callback(request);
}
