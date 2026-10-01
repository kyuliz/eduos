'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function LoginPage() {
  const router = useRouter(), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  async function submit(form: FormData) {
    setBusy(true); setError('');
    const response = await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({schoolId:form.get('schoolId'),loginId:form.get('loginId'),password:form.get('password')})});
    const data = await response.json(); setBusy(false);
    if(!response.ok){setError(data.error||'ログインできませんでした。');return;} router.push('/dashboard'); router.refresh();
  }
  return <div className="login-page"><section className="login-card"><div className="login-brand"><span className="brand-mark">K</span><span className="brand-name">kyuliz<span>OS</span></span></div><h1>学びの記録を、ここから。</h1><p>学校から案内されたログイン情報を入力してください。</p><form action={submit}><label htmlFor="schoolId">学校ID</label><input className="form-input" id="schoolId" name="schoolId" autoComplete="organization" placeholder="学校から案内されたID" required maxLength={80}/><label htmlFor="loginId">ログインID</label><input className="form-input" id="loginId" name="loginId" autoComplete="username" required maxLength={120}/><label htmlFor="password">パスワード</label><input className="form-input" id="password" name="password" type="password" autoComplete="current-password" required maxLength={200}/>{error&&<div className="notice error" role="alert">{error}</div>}<button className="primary-btn" disabled={busy}>{busy?'確認しています…':'ログイン'}</button></form><p style={{margin:'18px 0 0',fontSize:10}}>パスワードを忘れた場合は、学校管理者へお問い合わせください。</p></section></div>;
}
