import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const nav = [
    { href: '/dashboard', icon: '⌂', label: 'ホーム' },
    { href: '/dashboard#portfolio', icon: '▣', label: 'ポートフォリオ' },
    { href: '/dashboard#projects', icon: '◇', label: 'プロジェクト' },
    ...(session.user.role !== 'STUDENT' ? [{ href: '/dashboard#students', icon: '♧', label: '生徒一覧' }] : []),
    ...(session.user.role === 'SCHOOL_ADMIN' ? [{ href: '/admin', icon: '⚙', label: '学校設定' }] : []),
  ];
  return <div className="app"><aside className="sidebar"><Link href="/dashboard" className="brand"><span className="brand-mark">K</span><span className="brand-name">kyuliz<span>OS</span></span></Link><div className="school-chip"><div className="school-icon">🏫</div><div className="school-meta"><b>{session.user.school.name}</b><small>Learning Portfolio</small></div></div><div className="menu-label">MENU</div><nav className="nav">{nav.map(n=><Link href={n.href} key={n.href} className={title===n.label?'active':''}><span className="ico">{n.icon}</span>{n.label}</Link>)}</nav><div className="side-bottom"><div className="profile"><div className="avatar">{session.user.name.slice(0,1)}</div><div style={{flex:1}}><b>{session.user.name}</b><small>{session.user.role==='STUDENT'?'生徒':session.user.role==='TEACHER'?'教師':'学校管理者'}</small></div><form action="/api/auth/logout" method="post"><button aria-label="ログアウト" title="ログアウト" style={{border:0,background:'transparent',fontSize:17}}>↪</button></form></div></div></aside><main className="main"><header className="topbar"><div className="crumb">Kyuliz OS　/　<b>{title}</b></div><div className="top-actions"><span className="role-pill">{session.user.role==='STUDENT'?'生徒':session.user.role==='TEACHER'?'教師':'学校管理者'}</span><span className="date">{new Intl.DateTimeFormat('ja-JP',{dateStyle:'long'}).format(new Date())}</span></div></header>{children}</main><nav className="mobile-nav">{nav.slice(0,4).map(n=><Link href={n.href} key={n.href}><b>{n.icon}</b>{n.label}</Link>)}</nav></div>;
}
