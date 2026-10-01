import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bcrypt, getSession, audit } from '@/lib/auth';
import { db } from '@/lib/db';
import { safeEqualOrigin } from '@/lib/guards';
const schema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(12).max(200) });
export async function POST(request: Request) {
  if (!safeEqualOrigin(request)) return NextResponse.json({ error: 'リクエストを確認できません。' }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'ログインしてください。' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '現在のパスワードと12文字以上の新しいパスワードが必要です。' }, { status: 400 });
  if (!(await bcrypt.compare(parsed.data.currentPassword, session.user.passwordHash))) return NextResponse.json({ error: '現在のパスワードを確認してください。' }, { status: 400 });
  await db.user.update({ where: { id: session.userId }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), passwordChangedAt: new Date() } });
  await db.session.deleteMany({ where: { userId: session.userId, NOT: { id: session.id } } });
  await audit(session.userId, session.schoolId, 'auth.password_change', 'User', session.userId);
  return NextResponse.json({ ok: true });
}
