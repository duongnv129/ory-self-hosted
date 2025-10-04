import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { env } from '@/config/env';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: env.appName,
  description: 'Next.js web application demonstrating three distinct RBAC authorization models using the Ory Stack',
  keywords: ['Ory', 'RBAC', 'Authorization', 'Kratos', 'Keto', 'Oathkeeper', 'Next.js'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
