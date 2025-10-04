# Development Guide

> Guide for developers working on the Web Demo application

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- Git

### Initial Setup

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.local.example .env.local

# Start Ory services (one-time setup)
cd .. && make up

# Start backend API
cd multi-tenancy-demo
pnpm install && pnpm start

# Start web demo
cd web-demo
pnpm dev
```

## Development Workflow

### Running the Application

```bash
# Development server with hot reload
pnpm dev

# Production build locally
pnpm build && pnpm start
```

### Code Quality

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Auto-fix linting issues
pnpm lint --fix

# Format code with Prettier
pnpm format
```

### Project Structure Conventions

```
src/
├── app/              # Pages (App Router)
├── components/
│   ├── ui/          # Reusable UI primitives
│   ├── layout/      # Layout components
│   └── features/    # Feature-specific components
├── lib/
│   ├── api/         # API clients
│   ├── hooks/       # Custom React hooks
│   ├── context/     # React contexts
│   ├── types/       # TypeScript types
│   └── utils/       # Utility functions
└── config/          # Configuration files
```

## Adding New Features

### 1. Create API Client

```typescript
// src/lib/api/newResource.ts
export class NewResourceApi {
  constructor(private client: ApiClient) {}

  async list(): Promise<NewResource[]> {
    return this.client.get('/newresource/list');
  }
}
```

### 2. Create SWR Hook

```typescript
// src/lib/hooks/useNewResource.ts
export function useNewResources() {
  const { data, error, isLoading, mutate } = useSWR(
    '/newresource/list',
    () => newResourceApi.list()
  );

  return {
    resources: data || [],
    isLoading,
    error,
    mutate
  };
}
```

### 3. Create Component

```typescript
// src/components/features/NewResourceList.tsx
export function NewResourceList() {
  const { resources, isLoading } = useNewResources();

  if (isLoading) return <Loading />;

  return (
    <div>
      {resources.map(resource => (
        <Card key={resource.id}>{resource.name}</Card>
      ))}
    </div>
  );
}
```

## Common Tasks

### Adding shadcn/ui Component

```bash
pnpm dlx shadcn-ui@latest add [component]
```

### Adding New Dependency

```bash
# Production dependency
pnpm add [package]

# Development dependency
pnpm add -D [package]
```

### Creating New Page

```bash
# Create page directory
mkdir -p src/app/new-page

# Create page.tsx
touch src/app/new-page/page.tsx
```

## TypeScript Guidelines

- **Strict mode enabled** - no `any` types
- **Explicit return types** for functions
- **Interface over type** for object shapes
- **Enum for constants** with multiple values

## Component Guidelines

- **Functional components** - use React.FC or explicit return types
- **Props interface** - define for all components
- **Default exports** for pages, named exports for components
- **Accessibility** - ARIA labels, semantic HTML
- **Responsive** - mobile-first design

## API Integration

All API calls go through Oathkeeper (port 4455):

```typescript
// ✅ Correct
await apiClient.get('/users/list');

// ❌ Wrong - don't call backend directly
await axios.get('http://localhost:9000/users/list');
```

## State Management

- **SWR** for server state (data fetching)
- **React Context** for global UI state (tenant selection)
- **useState** for local component state
- **zustand** for complex client state (if needed)

## Testing

### Unit Tests

```bash
pnpm test
```

### E2E Tests

```bash
pnpm test:e2e
```

## Debugging

### Dev Tools

- **React DevTools** browser extension
- **Next.js DevTools** (built-in)
- **TypeScript** language server in VS Code

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill
```

**Build errors:**
```bash
rm -rf .next node_modules
pnpm install
pnpm build
```

**Type errors:**
```bash
pnpm type-check
```

## Performance

- **Static Generation (SSG)** for pages when possible
- **Image Optimization** using Next.js Image component
- **Bundle Analysis** using @next/bundle-analyzer
- **Lazy Loading** for heavy components

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

## Documentation

- Update README.md for major changes
- Add JSDoc comments for complex functions
- Update this guide for new patterns

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [SWR Documentation](https://swr.vercel.app/)
- [Ory Documentation](https://www.ory.sh/docs)

---

**Last Updated**: 2025-01-15
