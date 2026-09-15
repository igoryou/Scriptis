import { serverApi } from '@/lib/backend/server';

export async function GET() {
  return serverApi().history();
}

export async function POST(request: Request) {
  return serverApi().saveHistory(request);
}

export async function DELETE(request: Request) {
  return serverApi().deleteHistory(request);
}
