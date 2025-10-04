/**
 * Navigation Component
 * Main navigation menu with active state
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigationItems = [
  { href: '/', label: 'Home' },
  { href: '/simple-rbac', label: 'Simple RBAC' },
  { href: '/tenant-rbac', label: 'Tenant RBAC' },
  { href: '/resource-rbac', label: 'Resource RBAC' },
];

interface NavigationProps {
  className?: string;
  onNavigate?: () => void;
}

export function Navigation({ className, onNavigate }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex flex-col gap-1 md:flex-row md:items-center md:gap-6', className)}>
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
