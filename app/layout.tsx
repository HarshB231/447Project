import './globals.css';
import './styles.css';

export const metadata = { title: "VMS Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-header">
          <div className="container max-w-6xl mx-auto p-2">
            <div className="brand">VMS</div>
            <nav>
              <a href="/dashboard">Dashboard</a>
              <a href="/employees">Employees</a>
            </nav>
          </div>
        </div>

        <main style={{ backgroundColor: 'var(--bg)', minHeight: 'calc(100vh - 120px)' }}>
          <div className="max-w-6xl mx-auto p-6">{children}</div>
        </main>

        <div className="site-footer">
          <div className="container max-w-6xl mx-auto p-2">© {new Date().getFullYear()} VMS • Demo</div>
        </div>
      </body>
    </html>
  );
}
