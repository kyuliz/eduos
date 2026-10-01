import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Kyuliz Education OS', description: '学び、制作、探究、成長をつなぐLearning Portfolio' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja"><body>{children}</body></html>; }
