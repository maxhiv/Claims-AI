export const metadata = { title: 'AI Scheduler', description: 'Davies CQ × AI Scheduler' };
import './globals.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
