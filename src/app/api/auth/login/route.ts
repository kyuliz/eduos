import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bcrypt, createSession, audit } from '@/lib/auth';
import { db } from '@/lib/db';
import { safeEqualOrigin } from '@/lib/guards';
import { rateLimit } from '@/lib/redis';

const schema = z.object({ schoolId: z.string().min(1).max(80), loginId: z.string().trim().min(1).max(120), password: z.string().min(1).max(200) });
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = await rateLimit(`login:${ip}`, 5, 60); // 5 attempts per minute
  if (!rl.success) {
    return NextResponse.json({ error: '試行回数が多すぎます。しばらく経ってから再度お試しください。' }, { status: 429 });
  }

  if (!safeEqualOrigin(request)) return NextResponse.json({ error: 'リクエストを確認できません。' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '学校ID、ログインID、パスワードを確認してください。' }, { status: 400 });
  const { schoolId, loginId, password } = parsed.data;
  const user = await db.user.findUnique({ where: { schoolId_loginId: { schoolId, loginId } }, include: { school: true } });
  if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'ログイン情報を確認してください。' }, { status: 401 });
  }
  await createSession(user.id, user.schoolId);
  await audit(user.id, user.schoolId, 'auth.login', 'User', user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, school: user.school.name } });
}
