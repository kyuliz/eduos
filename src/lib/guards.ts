import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function requireRole(roles: Array<'STUDENT' | 'TEACHER' | 'SCHOOL_ADMIN'>) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'ログインしてください。' }, { status: 401 }) };
  if (!roles.includes(session.user.role)) return { error: NextResponse.json({ error: 'この操作を行う権限がありません。' }, { status: 403 }) };
  return { session };
}

export function safeEqualOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
