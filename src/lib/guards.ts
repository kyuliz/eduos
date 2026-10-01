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
  try {
    const originHost = new URL(origin).host;
    // リバースプロキシ環境（Cloudflare Tunnelなど）では
    // 'x-forwarded-host' に本来のホスト名が含まれるため、それを優先して確認する
    const forwardedHost = request.headers.get('x-forwarded-host');
    const hostHeader = request.headers.get('host');
    
    // プロキシのホスト名、もしくは直接のHostヘッダー、最後にURLのホストと比較
    const requestHost = forwardedHost || hostHeader || new URL(request.url).host;
    
    return originHost === requestHost;
  } catch {
    return false;
  }
}
