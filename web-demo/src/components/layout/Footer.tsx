/**
 * Footer Component
 * Site footer with links and information
 */

import Link from 'next/link';
import { Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* About */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">About</h3>
            <p className="text-sm text-muted-foreground">
              Demonstrating three distinct RBAC authorization models using the Ory Stack
            </p>
          </div>

          {/* Documentation */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Documentation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/docs/architecture"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Architecture
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/readme"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  README
                </Link>
              </li>
            </ul>
          </div>

          {/* Ory Stack */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Ory Stack</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.ory.sh/docs/kratos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Kratos (Identity)
                </a>
              </li>
              <li>
                <a
                  href="https://www.ory.sh/docs/keto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Keto (Authorization)
                </a>
              </li>
              <li>
                <a
                  href="https://www.ory.sh/docs/oathkeeper"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Oathkeeper (Gateway)
                </a>
              </li>
            </ul>
          </div>

          {/* GitHub */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Source Code</h3>
            <a
              href="https://github.com/ory/ory-self-hosted"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              GitHub Repository
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {currentYear} Ory RBAC Demo. Built with Next.js and the Ory Stack.
          </p>
        </div>
      </div>
    </footer>
  );
}
