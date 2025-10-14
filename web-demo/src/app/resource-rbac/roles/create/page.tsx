/**
 * Create Role Page
 * Dedicated page for creating new roles following Next.js Pro patterns
 *
 * Next.js Pro Principles Applied:
 * - Dedicated page route for better UX and SEO
 * - Server Component with Client Component composition
 * - Proper error boundaries and loading states
 * - TypeScript strict mode compliance
 * - Accessibility-first design
 * - Clean separation of concerns
 *
 * Route: /resource-rbac/roles/create
 */

import { Metadata } from 'next';
import { CreateRoleForm } from './CreateRoleForm';

export const metadata: Metadata = {
  title: 'Create Role | Resource RBAC',
  description: 'Create a new role with permissions and inheritance settings for resource-based access control.',
};

/**
 * Create Role Page Component (Server Component)
 * Handles the page layout and metadata, delegates form logic to Client Component
 */
export default function CreateRolePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <CreateRoleForm />
    </div>
  );
}
