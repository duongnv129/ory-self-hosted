/**
 * Resource-Scoped RBAC Layout
 * Nested layout with sidebar navigation for Resource-Scoped RBAC section
 *
 * Note: Resource-Scoped RBAC uses tenant-specific authorization where
 * permissions are granted per individual resource with tenant isolation.
 * This layout manages tenant context switching and tenant-aware API calls.
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building,
  Shield,
  Package,
  FolderOpen,
  Users,
  Menu,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useAuth } from '@/lib/hooks';
import { useTenant } from '@/lib/hooks/useTenant';
import { AVAILABLE_TENANTS } from '@/lib/config/tenants';
import { FullPageLoading } from '@/components/ui/loading';
import { apiClient } from '@/lib/api/client';

const sidebarItems = [
  { href: '/resource-rbac', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/resource-rbac/users', label: 'Users', icon: Users, exact: false },
  { href: '/resource-rbac/products', label: 'Products', icon: Package, exact: false },
  { href: '/resource-rbac/categories', label: 'Categories', icon: FolderOpen, exact: false },
  { href: '/resource-rbac/roles', label: 'Roles', icon: Shield, exact: false },
];

export default function ResourceRBACLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant, setTenant } = useTenant();

  // Set use case context for resource-scoped RBAC API calls
  useEffect(() => {
    apiClient.setUseCaseContext('resource-rbac');
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?return_to=/resource-rbac');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleTenantChange = (tenantId: string) => {
    setTenant(tenantId);
  };

  if (isLoading) {
    return <FullPageLoading message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Resource RBAC</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Per-resource permissions
            </p>

            {/* Tenant Selector */}
            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground">
                Tenant Context
              </label>
              <Select
                value={currentTenant || 'global'}
                onValueChange={handleTenantChange}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_TENANTS.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {tenant.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href) && item.href !== '/resource-rbac';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="border-t p-4">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">Current Context:</p>
              <p className="mt-1">
                {currentTenant
                  ? AVAILABLE_TENANTS.find(t => t.id === currentTenant)?.name || 'Unknown'
                  : 'Global (All Tenants)'
                }
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">
              {sidebarItems.find(item =>
                item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href) && item.href !== '/resource-rbac'
              )?.label || 'Resource RBAC'}
            </h1>
            {currentTenant && (
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <span>
                  {AVAILABLE_TENANTS.find(t => t.id === currentTenant)?.name}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
