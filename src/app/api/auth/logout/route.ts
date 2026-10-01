import { NextResponse } from 'next/server';
import { destroySession, getSession, audit } from '@/lib/auth';
import { safeEqualOrigin } from '@/lib/guards';
export async function POST(request: Request) {
  if (!safeEqualOrigin(request)) return NextResponse.json({ error: 'リクエストを確認できません。' }, { status: 403 });
  const session = await getSession();
  if (session) await audit(session.userId, session.schoolId, 'auth.logout', 'User', session.userId);
  await destroySession();
  return NextResponse.json({ ok: true });
}
