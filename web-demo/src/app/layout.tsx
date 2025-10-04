import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { env } from '@/config/env';
import { TenantProvider } from '@/lib/context/TenantContext';
import { AuthProvider } from '@/lib/context/AuthContext';
import { Header, Footer } from '@/components/layout';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: env.appName,
    template: `%s | ${env.appName}`,
  },
  description: 'Next.js web application demonstrating three distinct RBAC authorization models using the Ory Stack',
  keywords: ['Ory', 'RBAC', 'Authorization', 'Kratos', 'Keto', 'Oathkeeper', 'Next.js'],
  authors: [{ name: 'Ory' }],
  openGraph: {
    type: 'website',
    title: env.appName,
    description: 'Demonstrating three distinct RBAC authorization models using the Ory Stack',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TenantProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                <div className="container mx-auto px-4 py-8">
                  {children}
                </div>
              </main>
              <Footer />
            </div>
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
