"use client";
import './globals.css';
import './styles.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const showSidebar = pathname !== '/';

  useEffect(() => {
    const v = localStorage.getItem('sidebar_collapsed');
    setCollapsed(v === '1');
  }, []);

  function toggleSidebar() {
    const nv = !collapsed;
    setCollapsed(nv);
    localStorage.setItem('sidebar_collapsed', nv ? '1' : '0');
  }

  async function handleLogout() {
    if (!supabase) {
      router.replace('/');
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out skipped (supabase not configured).');
    } finally {
      router.replace('/');
    }
  }

  const IconHome = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
  );
  const IconUsers = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
  const IconLogout = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
  );

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: <IconHome /> },
    { href: '/employees', label: 'Employees', icon: <IconUsers /> },
  ];

  return (
    <html lang="en">
      <body>
        {showSidebar ? (
          <div className={`layout ${collapsed ? 'layout-collapsed' : ''}`}>
            <aside className="sidebar">
              <div className="sidebar-top">
                <div className="brand">
                  <span className="brand-part vms">VMS</span><span className="brand-part umbc">UMBC</span>
                </div>
                <button className="sidebar-toggle" onClick={toggleSidebar}>{collapsed ? '›' : '‹'}</button>
              </div>
              <nav className="sidebar-nav">
                {nav.map((n) => (
                  <Link key={n.href} href={n.href} className={`sidebar-item ${pathname.startsWith(n.href) ? 'active' : ''}`}>
                    <span className="icon">{n.icon}</span>
                    <span className="text">{n.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="sidebar-bottom">
                <div className="sidebar-logo">
                  <img src="/UMBCLogo.png" alt="UMBC Logo" />
                </div>
                <button className="sidebar-item" onClick={handleLogout}>
                  <span className="icon"><IconLogout /></span>
                  <span className="text">Back to Login</span>
                </button>
              </div>
            </aside>
            <main className="main pattern-bg">{children}</main>
          </div>
        ) : (
          <main className="main pattern-bg">{children}</main>
        )}
      </body>
    </html>
  );
}
