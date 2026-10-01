import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export const SESSION_COOKIE = 'kyuliz_session';
const SESSION_DAYS = 7;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string, schoolId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, schoolId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt });
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { school: true } } } });
  if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE' || session.schoolId !== session.user.schoolId) return null;
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function audit(actorId: string | null, schoolId: string, action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) {
  await db.auditLog.create({ data: { actorId, schoolId, action, entityType, entityId, metadata: metadata as object | undefined } });
}

export { bcrypt };
