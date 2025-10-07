/**
 * Multi-tenancy demo application
 */

import express, { Express, Request, Response } from 'express';
import userRouter from './routes/user';
import categoryRouter from './routes/category';
import productRouter from './routes/product';
import roleRouter from './routes/role';
import metadataRouter from './routes/metadata';
import { contextMiddleware } from './middleware/context';
import { errorHandler } from './middleware/error-handler';
import { HealthResponse } from './types/responses';

const app: Express = express();
const PORT = process.env.PORT || 9000;

// ==================== GLOBAL MIDDLEWARE ====================

app.use(express.json());

// Logging middleware
app.use((req: Request, _res: Response, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== HEALTH CHECK ====================

app.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    service: 'multi-tenancy-demo',
    version: '2.0.0',
    apis: ['users', 'products', 'categories', 'roles'],
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// ==================== API ROUTES ====================

// Metadata endpoint (no auth required - public metadata)
app.use('/metadata', metadataRouter);

app.use('/users', contextMiddleware, userRouter);
app.use('/products', contextMiddleware, productRouter);
app.use('/categories', contextMiddleware, categoryRouter);
app.use('/roles', contextMiddleware, roleRouter);

// ==================== API DOCUMENTATION ====================

app.get('/api-docs', (_req: Request, res: Response) => {
  res.json({
    service: 'multi-tenancy-demo',
    version: '2.0.0',
    description: 'Simple multi-tenancy demo with 4 core APIs',
    endpoints: {
      health: {
        path: '/health',
        method: 'GET',
        description: 'Health check endpoint',
      },
      users: {
        list: { path: '/users/list', method: 'GET', description: 'List all users' },
        get: { path: '/users/get/:id', method: 'GET', description: 'Get user by ID' },
        create: { path: '/users/create', method: 'POST', description: 'Create new user' },
        update: { path: '/users/update/:id', method: 'PUT', description: 'Update user' },
        delete: { path: '/users/delete/:id', method: 'DELETE', description: 'Delete user' },
      },
      products: {
        list: { path: '/products/list', method: 'GET', description: 'List all products' },
        get: { path: '/products/get/:id', method: 'GET', description: 'Get product by ID' },
        create: { path: '/products/create', method: 'POST', description: 'Create new product' },
        update: {
          path: '/products/update/:id',
          method: 'PUT',
          description: 'Update product',
        },
        delete: {
          path: '/products/delete/:id',
          method: 'DELETE',
          description: 'Delete product',
        },
      },
      categories: {
        list: { path: '/categories/list', method: 'GET', description: 'List all categories' },
        get: { path: '/categories/get/:id', method: 'GET', description: 'Get category by ID' },
        create: {
          path: '/categories/create',
          method: 'POST',
          description: 'Create new category',
        },
        update: {
          path: '/categories/update/:id',
          method: 'PUT',
          description: 'Update category',
        },
        delete: {
          path: '/categories/delete/:id',
          method: 'DELETE',
          description: 'Delete category',
        },
      },
      roles: {
        list: {
          path: '/roles/list',
          method: 'GET',
          description: 'List all roles from memory',
        },
        get: {
          path: '/roles/get/:roleName',
          method: 'GET',
          description: 'Get role by name from memory',
        },
        create: {
          path: '/roles/create',
          method: 'POST',
          description: 'Create new role in memory',
        },
        update: {
          path: '/roles/update/:roleName',
          method: 'PUT',
          description: 'Update role in memory',
        },
        delete: {
          path: '/roles/delete/:roleName',
          method: 'DELETE',
          description: 'Delete role from memory',
        },
      },
    },
    headers: {
      'x-tenant-id': 'Optional - Tenant identifier (required for tenant-scoped operations)',
      'x-user-id': 'Optional - User identifier (defaults to mock-user)',
      'x-user-email': 'Optional - User email (defaults to mock@example.com)',
      'x-keto-namespace':
        'Optional - Keto namespace (defaults to simple-rbac)',
    },
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      health: 'GET /health',
      apiDocs: 'GET /api-docs',
      users: 'GET|POST|PUT|DELETE /users/{list|get/:id|create|update/:id|delete/:id}',
      products:
        'GET|POST|PUT|DELETE /products/{list|get/:id|create|update/:id|delete/:id}',
      categories:
        'GET|POST|PUT|DELETE /categories/{list|get/:id|create|update/:id|delete/:id}',
      roles:
        'GET|POST|PUT|DELETE /roles/{list|get/:roleName|create|update/:roleName|delete/:roleName}',
    },
  });
});

// Global error handler
app.use(errorHandler);

// ==================== SERVER STARTUP ====================

app.listen(PORT, () => {
  console.log('🚀 Multi-Tenancy Demo Server Started');
  console.log('====================================');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log('');
  console.log('🔧 Core APIs:');
  console.log('  👥 Users:      /users/{list|get/:id|create|update/:id|delete/:id}');
  console.log('  📦 Products:   /products/{list|get/:id|create|update/:id|delete/:id}');
  console.log(
    '  📂 Categories: /categories/{list|get/:id|create|update/:id|delete/:id}'
  );
  console.log(
    '  🔐 Roles:      /roles/{list|get/:roleName|create|update/:roleName|delete/:roleName}'
  );
  console.log('');
  console.log('📋 Example Usage:');
  console.log(`  curl -H "x-tenant-id: tenant-a" http://localhost:${PORT}/users/list`);
  console.log(`  curl -H "x-tenant-id: tenant-a" http://localhost:${PORT}/products/list`);
  console.log(
    `  curl -X POST -H "Content-Type: application/json" -H "x-tenant-id: tenant-a" \\`
  );
  console.log(`       -d '{"name":"Test Product","price":99.99}' \\`);
  console.log(`       http://localhost:${PORT}/products/create`);
  console.log('');
});

export default app;
