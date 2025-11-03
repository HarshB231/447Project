import './globals.css';
import './styles.css';

export const metadata = { title: "VMS Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
