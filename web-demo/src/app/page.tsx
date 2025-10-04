/**
 * Home Page
 * Landing page with use case selection cards
 */

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Shield, Users, Target, ExternalLink } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Ory RBAC Demo
        </h1>
        <p className="mx-auto max-w-3xl text-lg text-muted-foreground sm:text-xl">
          Demonstrating three authorization models with Ory Stack (Kratos, Keto, Oathkeeper)
        </p>
      </section>

      {/* Use Case Cards */}
      <section>
        <h2 className="mb-8 text-center text-3xl font-bold">Choose Your RBAC Model</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Simple RBAC */}
          <Card className="group transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle>Simple RBAC</CardTitle>
              <CardDescription>
                Global roles with hierarchical inheritance (admin → moderator → customer)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Single namespace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Global role assignment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Role hierarchy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>No tenant isolation</span>
                </li>
              </ul>
              <Link href="/simple-rbac" className="block">
                <Button className="w-full group-hover:shadow-md">
                  Explore Simple RBAC
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Tenant-Centric RBAC */}
          <Card className="group transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle>Tenant-Centric RBAC</CardTitle>
              <CardDescription>
                Multi-tenant users with different roles per tenant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Complete tenant isolation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>One role per tenant per user</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Multi-tenant user support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Tenant-scoped permissions</span>
                </li>
              </ul>
              <Link href="/tenant-rbac" className="block">
                <Button className="w-full group-hover:shadow-md">
                  Explore Tenant RBAC
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Resource-Scoped RBAC */}
          <Card className="group transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-6 w-6" />
              </div>
              <CardTitle>Resource-Scoped RBAC</CardTitle>
              <CardDescription>
                Fine-grained control with different roles per resource type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Resource-level roles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Maximum granularity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Per-resource permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Tenant + resource isolation</span>
                </li>
              </ul>
              <Link href="/resource-rbac" className="block">
                <Button className="w-full group-hover:shadow-md">
                  Explore Resource RBAC
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Architecture Diagram Section */}
      <section>
        <h2 className="mb-6 text-2xl font-bold">Architecture Overview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Request Flow</CardTitle>
            <CardDescription>
              How requests flow through the Ory Stack
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-6 font-mono text-sm sm:flex-row sm:items-center">
                <Badge variant="outline">Web Demo</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">Oathkeeper (Gateway)</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">Kratos/Keto</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">Backend API</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <h4 className="mb-2 font-semibold">Oathkeeper (Gateway)</h4>
                  <p className="text-sm text-muted-foreground">
                    API Gateway handling authentication and authorization at the edge
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">Kratos (Identity)</h4>
                  <p className="text-sm text-muted-foreground">
                    Identity management and session-based authentication
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">Keto (Authorization)</h4>
                  <p className="text-sm text-muted-foreground">
                    Fine-grained authorization using Zanzibar-style permissions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Documentation Links */}
      <section>
        <h2 className="mb-6 text-2xl font-bold">Documentation & Resources</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/docs/architecture"
                className="flex items-center text-sm text-primary hover:underline"
              >
                ARCHITECTURE.md
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
              <Link
                href="/docs/readme"
                className="flex items-center text-sm text-primary hover:underline"
              >
                README.md
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ory Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="https://www.ory.sh/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-primary hover:underline"
              >
                Ory Documentation
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              <a
                href="https://github.com/ory/ory-self-hosted"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-primary hover:underline"
              >
                GitHub Repository
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
