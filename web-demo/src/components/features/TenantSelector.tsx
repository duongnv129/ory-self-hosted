/**
 * Tenant Selector Component
 * Dropdown for selecting and switching between tenants
 */

'use client';

import { useTenant } from '@/lib/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const TENANTS = [
  { id: 'tenant-a', name: 'Tenant A' },
  { id: 'tenant-b', name: 'Tenant B' },
  { id: 'tenant-c', name: 'Tenant C' },
];

export function TenantSelector() {
  const { currentTenant, setTenant, clearTenant } = useTenant();

  return (
    <div className="flex items-center gap-2">
      <Select value={currentTenant || undefined} onValueChange={setTenant}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select tenant" />
        </SelectTrigger>
        <SelectContent>
          {TENANTS.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentTenant && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearTenant}
          aria-label="Clear tenant selection"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
