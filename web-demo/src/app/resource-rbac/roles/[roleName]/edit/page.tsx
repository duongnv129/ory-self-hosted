/**
 * Edit Role Page
 * Server Component for editing an existing role with SEO and metadata
 *
 * Next.js Pro Patterns Applied:
 * - Server Component for metadata generation
 * - Dynamic metadata based on role name
 * - Clean page structure with delegation to Client Component
 * - Proper error boundaries and loading states
 */

import { Metadata } from 'next';
import { EditRoleForm } from './EditRoleForm';

// Metadata generation for SEO
export async function generateMetadata({
  params,
}: {
  params: { roleName: string };
}): Promise<Metadata> {
  const roleName = decodeURIComponent(params.roleName);

  return {
    title: `Edit Role: ${roleName} - Ory Self-Hosted Demo`,
    description: `Modify permissions and settings for the ${roleName} role in the resource-based RBAC system.`,
    keywords: ['role edit', 'RBAC', 'permissions', 'access control', roleName],
    robots: 'noindex, nofollow', // Prevent indexing of admin pages
  };
}

interface EditRolePageProps {
  params: {
    roleName: string;
  };
}

export default function EditRolePage({ params }: EditRolePageProps) {
  const roleName = decodeURIComponent(params.roleName);

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <EditRoleForm roleName={roleName} />
    </div>
  );
}
