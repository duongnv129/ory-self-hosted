/**
 * Header Component
 * Site header with navigation and tenant selector
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Navigation } from './Navigation';
import { TenantSelector } from '@/components/features/TenantSelector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo/Title */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">O</span>
          </div>
          <span className="hidden font-bold sm:inline-block">Ory RBAC Demo</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1 md:items-center md:justify-center">
          <Navigation />
        </div>

        {/* Tenant Selector & Mobile Menu Button */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <TenantSelector />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden',
          mobileMenuOpen ? 'block' : 'hidden'
        )}
      >
        <div className="border-t px-4 py-4">
          <Navigation onNavigate={() => setMobileMenuOpen(false)} />
          <div className="mt-4 border-t pt-4">
            <TenantSelector />
          </div>
        </div>
      </div>
    </header>
  );
}
