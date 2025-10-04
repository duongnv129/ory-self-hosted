import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-bold text-gray-900">
            Ory Stack RBAC Demo
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            Interactive demonstration of three distinct Role-Based Access Control (RBAC)
            authorization models using Ory Kratos, Keto, and Oathkeeper
          </p>
        </div>

        {/* Architecture Overview */}
        <div className="mb-16 rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-3xl font-semibold text-gray-900">Architecture Overview</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-6">
              <h3 className="mb-2 text-xl font-semibold text-blue-600">Oathkeeper</h3>
              <p className="text-gray-600">
                API Gateway handling authentication and authorization at the edge
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6">
              <h3 className="mb-2 text-xl font-semibold text-green-600">Kratos</h3>
              <p className="text-gray-600">
                Identity management and session-based authentication
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6">
              <h3 className="mb-2 text-xl font-semibold text-purple-600">Keto</h3>
              <p className="text-gray-600">
                Fine-grained authorization using Zanzibar-style permission model
              </p>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-semibold text-gray-900">
            RBAC Use Cases
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Use Case 1: Simple RBAC */}
            <Link href="/simple-rbac" className="group">
              <div className="h-full rounded-lg border border-gray-200 bg-white p-8 shadow-md transition-all hover:border-blue-500 hover:shadow-xl">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                  1
                </div>
                <h3 className="mb-3 text-2xl font-bold text-gray-900">Simple RBAC</h3>
                <p className="mb-4 text-gray-600">
                  Global roles with hierarchical inheritance. Single namespace with role-based permissions.
                </p>
                <ul className="mb-4 space-y-2 text-sm text-gray-500">
                  <li>✓ Admin → Moderator → Customer</li>
                  <li>✓ Global permissions</li>
                  <li>✓ Simple role assignment</li>
                </ul>
                <span className="text-blue-600 group-hover:underline">Explore →</span>
              </div>
            </Link>

            {/* Use Case 2: Tenant-Centric RBAC */}
            <Link href="/tenant-rbac" className="group">
              <div className="h-full rounded-lg border border-gray-200 bg-white p-8 shadow-md transition-all hover:border-green-500 hover:shadow-xl">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-600">
                  2
                </div>
                <h3 className="mb-3 text-2xl font-bold text-gray-900">Tenant-Centric RBAC</h3>
                <p className="mb-4 text-gray-600">
                  Multi-tenant users with different roles per tenant. Complete tenant isolation.
                </p>
                <ul className="mb-4 space-y-2 text-sm text-gray-500">
                  <li>✓ Per-tenant roles</li>
                  <li>✓ Multi-tenant users</li>
                  <li>✓ Tenant isolation</li>
                </ul>
                <span className="text-green-600 group-hover:underline">Explore →</span>
              </div>
            </Link>

            {/* Use Case 3: Resource-Scoped RBAC */}
            <Link href="/resource-rbac" className="group">
              <div className="h-full rounded-lg border border-gray-200 bg-white p-8 shadow-md transition-all hover:border-purple-500 hover:shadow-xl">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-2xl font-bold text-purple-600">
                  3
                </div>
                <h3 className="mb-3 text-2xl font-bold text-gray-900">Resource-Scoped RBAC</h3>
                <p className="mb-4 text-gray-600">
                  Different roles per resource type. Maximum granularity and flexibility.
                </p>
                <ul className="mb-4 space-y-2 text-sm text-gray-500">
                  <li>✓ Resource-level roles</li>
                  <li>✓ Fine-grained control</li>
                  <li>✓ Complex hierarchies</li>
                </ul>
                <span className="text-purple-600 group-hover:underline">Explore →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Technical Details */}
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900">Technical Implementation</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Frontend</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Next.js 14+ with App Router</li>
                <li>• TypeScript for type safety</li>
                <li>• SWR for data fetching</li>
                <li>• Tailwind CSS for styling</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Backend Integration</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• All requests through Oathkeeper (port 4455)</li>
                <li>• Session-based auth with Kratos</li>
                <li>• Authorization via Keto</li>
                <li>• Express.js backend (port 9000)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
