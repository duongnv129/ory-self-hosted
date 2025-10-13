# Web Demo - Ory RBAC Demonstration

> Next.js 14 application demonstrating three RBAC (Role-Based Access Control) models using the Ory Stack (Kratos, Keto, Oathkeeper)

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](https://opensource.org/licenses/Apache-2.0)

## 🎯 Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.local.example .env.local

# Start development server
pnpm dev

# Open browser
open http://localhost:3000
```

## 📖 Overview

A production-ready Next.js application that demonstrates two different authorization models:

1. **Simple RBAC** - Global roles with hierarchical inheritance
2. **Resource-Scoped RBAC** - Fine-grained permissions per resource type

### Key Features

- 🔐 **Ory Stack Integration** - Kratos (auth), Keto (authz), Oathkeeper (gateway)
- 🏗️ **API Gateway Pattern** - All requests through Oathkeeper (port 4455)
- 🎨 **Modern UI** - shadcn/ui components with Tailwind CSS
- 📱 **Responsive Design** - Mobile-first, accessible (WCAG 2.1 AA)
- 🔄 **Real-time Updates** - SWR for data fetching and caching
- 🌐 **Multi-Tenancy** - Complete tenant isolation with context management
- 📦 **Type-Safe** - Full TypeScript coverage with strict mode

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│     Web Demo (Next.js - Port 3000)              │
└──────────────────┬──────────────────────────────┘
                   │ HTTP/HTTPS
                   ▼
┌─────────────────────────────────────────────────┐
│  Oathkeeper (API Gateway - Port 4455)           │
│  ┌─────────────────────────────────────────┐   │
│  │ 1. Authenticate (Kratos session)        │   │
│  │ 2. Authorize (Keto permissions)         │   │
│  │ 3. Mutate (inject user headers)         │   │
│  │ 4. Proxy (forward to backend)           │   │
│  └─────────────────────────────────────────┘   │
└─────┬──────────────┬────────────┬──────────────┘
      │              │            │
      ▼              ▼            ▼
  ┌────────┐    ┌────────┐   ┌──────────────┐
  │ Kratos │    │  Keto  │   │ Backend API  │
  │ :4433  │    │ :4466  │   │ :9000        │
  └────┬───┘    └────┬───┘   └──────────────┘
       │             │        (In-Memory)
       └──────┬──────┘
              ▼
        ┌──────────┐
        │PostgreSQL│
        │  :5432   │
        └──────────┘
```

**🔗 Request Flow**: `Web Demo → Oathkeeper → [Kratos + Keto] → Backend`

**📚 Detailed Architecture**: See [`docs/architecture.md`](./docs/architecture.md)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 8+ (`npm install -g pnpm`)
- **Docker** & Docker Compose (for Ory services)

### Installation

```bash
# Clone repository (if not already done)
cd web-demo

# Install dependencies
pnpm install

# Setup environment variables
cp .env.local.example .env.local

# Edit .env.local if needed (defaults work for local development)
```

### Running the Application

```bash
# Start Ory services (from parent directory)
cd ..
make up  # Starts Kratos, Keto, Oathkeeper, PostgreSQL

# Start Multi-Tenancy Demo Backend
cd multi-tenancy-demo
pnpm install
pnpm start  # Runs on port 9000

# Start Web Demo (in another terminal)
cd web-demo
pnpm dev  # Runs on port 3000
```

**Access the app**: http://localhost:3000

### Build for Production

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build

# Start production server
pnpm start
```

## 📂 Project Structure

```
web-demo/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page (use case selection)
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── simple-rbac/       # Use Case 1: Simple RBAC
│   │   └── resource-rbac/     # Use Case 2: Resource-Scoped RBAC
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (Button, Input, etc.)
│   │   ├── layout/            # Layout components (Header, Footer, Nav)
│   │   └── features/          # Feature components (TenantSelector, etc.)
│   ├── lib/
│   │   ├── api/               # API clients (users, products, categories)
│   │   ├── hooks/             # React hooks (SWR hooks, useTenant)
│   │   ├── context/           # React contexts (TenantContext)
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   ├── config/                # Configuration (env.ts)
│   └── styles/                # Global styles
├── docs/                      # Documentation
├── public/                    # Static assets
└── package.json
```

## 🎨 Use Cases

### 1. Simple RBAC

**Pattern**: `user:alice → role:admin → product:items (delete)`

- Global roles: admin, moderator, customer
- Hierarchical inheritance (admin inherits all moderator and customer permissions)
- No tenant isolation
- Best for: Simple applications with single workspace

**Demo**: http://localhost:3000/simple-rbac

---

### 2. Resource-Scoped RBAC

**Pattern**: `user:alice → tenant:a#product:items (as admin) → delete allowed`

- Fine-grained control: different roles per resource type
- Alice can be **admin** for products, **moderator** for categories
- Maximum granularity
- Best for: Complex applications requiring per-resource permissions

**Demo**: http://localhost:3000/resource-rbac

**📊 Use Case Comparison**: See [`docs/use-cases.md`](./docs/use-cases.md)

## 🔧 Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript compiler check
```

### Environment Variables

```env
# API Gateway (Oathkeeper)
NEXT_PUBLIC_OATHKEEPER_URL=http://localhost:4455

# Kratos (for login/registration flows)
NEXT_PUBLIC_KRATOS_PUBLIC_URL=http://localhost:4433
```

**Note**: Web Demo only calls Oathkeeper. Direct Kratos/Keto/Backend calls are handled by the gateway.

### Adding New Components

```bash
# Install shadcn/ui component
pnpm dlx shadcn-ui@latest add [component-name]

# Example
pnpm dlx shadcn-ui@latest add dropdown-menu
```

**📖 Component Guide**: See [`docs/components.md`](./docs/components.md)

## 🧪 Testing

```bash
# Run all tests (when implemented)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[docs/architecture.md](./docs/architecture.md)** | Complete architecture documentation |
| **[docs/components.md](./docs/components.md)** | Component usage guide |
| **[docs/api-integration.md](./docs/api-integration.md)** | API integration with Oathkeeper |
| **[docs/development.md](./docs/development.md)** | Development guide and best practices |

## 🔐 Security

- **Authentication**: Session-based via Kratos (cookies)
- **Authorization**: Permission checks via Keto (through Oathkeeper)
- **API Gateway**: All requests authenticated and authorized at gateway layer
- **CORS**: Configured for local development
- **HTTPS**: Required in production

**🛡️ Security Guide**: See [`docs/security.md`](./docs/security.md)

## 🚢 Deployment

### Docker

```bash
# Build Docker image
docker build -t web-demo .

# Run container
docker run -p 3000:3000 web-demo
```

### Docker Compose

```bash
# Start all services
docker-compose up -d
```

**📦 Deployment Guide**: See [`docs/deployment.md`](./docs/deployment.md)

## 🤝 Contributing

This is a demonstration project for the Ory Stack. Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Part of the ORY Keto self-hosted demonstration project.

Apache License 2.0 - see LICENSE file for details.

## 🙏 Acknowledgments

- **Ory Stack** - Authentication, Authorization, and API Gateway
- **Next.js** - React framework
- **shadcn/ui** - Component library
- **Tailwind CSS** - Utility-first CSS

## 📞 Support

- **Documentation**: [Ory Documentation](https://www.ory.sh/docs)
- **Community**: [Ory Community Slack](https://slack.ory.sh/)
- **Issues**: [GitHub Issues](https://github.com/ory/examples/issues)

## 🔗 Related Projects

- [Multi-Tenancy Demo Backend](../multi-tenancy-demo/README.md)
- [Keto Simple RBAC](../keto-zanziban-simple-rbac/README.md)
- [Keto Resource-Scoped RBAC](../keto-zanziban-multi-tenancy-rbac-per-resource/README.md)

---

**Version**: 1.0.0
**Last Updated**: 2025-01-15
**Status**: Production Ready
**Tech Stack**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui + Ory Stack
