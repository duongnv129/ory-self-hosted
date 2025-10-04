# Component Usage Guide

This guide shows how to use the shared components implemented in Epic 3.

## Layout Components

### Header, Footer, Navigation

These are already integrated in the root layout. No additional setup needed.

```tsx
// Already configured in src/app/layout.tsx
import { Header, Footer } from '@/components/layout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TenantProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </TenantProvider>
      </body>
    </html>
  );
}
```

## Tenant Context

### Using the Tenant Hook

```tsx
'use client';

import { useTenant } from '@/lib/hooks';

export function MyComponent() {
  const { currentTenant, setTenant, clearTenant } = useTenant();

  return (
    <div>
      <p>Current Tenant: {currentTenant || 'None selected'}</p>
      <button onClick={() => setTenant('tenant-a')}>Select Tenant A</button>
      <button onClick={clearTenant}>Clear Tenant</button>
    </div>
  );
}
```

### TenantSelector Component

```tsx
import { TenantSelector } from '@/components/features';

// Use in any component
<TenantSelector />
```

## UI Components

### Button

```tsx
import { Button } from '@/components/ui';

// Variants
<Button variant="default">Default Button</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// States
<Button disabled>Disabled</Button>
<Button asChild>
  <Link href="/path">Link Button</Link>
</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Table

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Form with react-hook-form + zod

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      name: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormDescription>Your email address</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Dialog/Modal

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description text</DialogDescription>
    </DialogHeader>
    <p>Dialog content goes here</p>
  </DialogContent>
</Dialog>
```

### Alert

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Default alert
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

// Destructive alert
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>
```

### Badge

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

### Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select onValueChange={(value) => console.log(value)}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

## Loading Components

### LoadingSpinner

```tsx
import { LoadingSpinner } from '@/components/ui/loading';

<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />
```

### FullPageLoading

```tsx
import { FullPageLoading } from '@/components/ui/loading';

<FullPageLoading message="Loading data..." />
```

### Skeleton Loaders

```tsx
import { Skeleton, TableSkeleton, CardSkeleton } from '@/components/ui/loading';

// Basic skeleton
<Skeleton className="h-4 w-[250px]" />

// Table skeleton
<TableSkeleton rows={5} columns={4} />

// Card skeleton
<CardSkeleton count={3} />
```

## Complete Example: User List Page

```tsx
'use client';

import { useUsers } from '@/lib/hooks';
import { useTenant } from '@/lib/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner, TableSkeleton } from '@/components/ui/loading';
import { AlertCircle } from 'lucide-react';

export default function UsersPage() {
  const { currentTenant } = useTenant();
  const { users, isLoading, error, mutate } = useUsers();

  if (!currentTenant) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select a tenant to view users.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={3} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load users: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Manage users for {currentTenant}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tenants</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.name.first} {user.name.last}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.tenant_ids.map((id) => (
                    <Badge key={id} variant="outline" className="mr-1">
                      {id}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

## Styling Utilities

### cn() Function

Use the `cn()` utility to merge Tailwind classes:

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  'override-class'
)} />
```

### Custom CSS Variables

Available CSS variables (defined in `globals.css`):

```css
--background
--foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--destructive
--destructive-foreground
--border
--input
--ring
--radius
--card
--card-foreground
--popover
--popover-foreground
```

Use in Tailwind:

```tsx
<div className="bg-background text-foreground border-border" />
<div className="bg-card text-card-foreground rounded-lg" />
```

## Best Practices

1. **Always use 'use client' for interactive components**
   ```tsx
   'use client';
   import { useState } from 'react';
   ```

2. **Use TypeScript types for props**
   ```tsx
   interface MyComponentProps {
     title: string;
     onClick?: () => void;
   }

   export function MyComponent({ title, onClick }: MyComponentProps) {
     // ...
   }
   ```

3. **Handle loading and error states**
   ```tsx
   if (isLoading) return <LoadingSpinner />;
   if (error) return <Alert variant="destructive">...</Alert>;
   ```

4. **Use semantic HTML and ARIA labels**
   ```tsx
   <button aria-label="Close menu" onClick={handleClose}>
     <X className="h-4 w-4" />
   </button>
   ```

5. **Leverage barrel exports for clean imports**
   ```tsx
   // ✅ Good
   import { Button, Card, Badge } from '@/components/ui';

   // ❌ Avoid
   import { Button } from '@/components/ui/button';
   import { Card } from '@/components/ui/card';
   ```

## Next Steps

With these components in place, you can now:

1. Build the Simple RBAC UI (Epic 4)
2. Build the Tenant-Centric RBAC UI (Epic 5)
3. Build the Resource-Scoped RBAC UI (Epic 6)

All the foundation is ready!
