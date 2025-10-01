const express = require('express');

// Import route modules
const usersRouter = require('./routes/users');
const categoryRouter = require('./routes/category');
const productRouter = require('./routes/product');

// Import middleware modules
const { contextMiddleware } = require('./middleware/context');

const app = express();
const PORT = process.env.PORT || 9000;

// Global middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'multi-tenancy-demo',
    version: '2.0.0',
    apis: ['users', 'products', 'categories'],
    timestamp: new Date().toISOString()
  });
});

app.use('/users', contextMiddleware, usersRouter);
app.use('/products', contextMiddleware, productRouter);
app.use('/categories', contextMiddleware, categoryRouter);

// ===== API DOCUMENTATION ENDPOINT =====

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    service: 'multi-tenancy-demo',
    version: '2.0.0',
    description: 'Simple multi-tenancy demo with 3 core APIs',
    endpoints: {
      health: {
        path: '/health',
        method: 'GET',
        description: 'Health check endpoint'
      },
      users: {
        list: { path: '/users/list', method: 'GET', description: 'List all users' },
        get: { path: '/users/get/:id', method: 'GET', description: 'Get user by ID' },
        create: { path: '/users/create', method: 'POST', description: 'Create new user' },
        update: { path: '/users/update/:id', method: 'PUT', description: 'Update user' },
        delete: { path: '/users/delete/:id', method: 'DELETE', description: 'Delete user' }
      },
      products: {
        list: { path: '/products/list', method: 'GET', description: 'List all products' },
        get: { path: '/products/get/:id', method: 'GET', description: 'Get product by ID' },
        create: { path: '/products/create', method: 'POST', description: 'Create new product' },
        update: { path: '/products/update/:id', method: 'PUT', description: 'Update product' },
        delete: { path: '/products/delete/:id', method: 'DELETE', description: 'Delete product' }
      },
      categories: {
        list: { path: '/categories/list', method: 'GET', description: 'List all categories' },
        get: { path: '/categories/get/:id', method: 'GET', description: 'Get category by ID' },
        create: { path: '/categories/create', method: 'POST', description: 'Create new category' },
        update: { path: '/categories/update/:id', method: 'PUT', description: 'Update category' },
        delete: { path: '/categories/delete/:id', method: 'DELETE', description: 'Delete category' }
      }
    },
    headers: {
      'x-tenant-id': 'Required - Tenant identifier',
      'x-user-id': 'Optional - User identifier',
      'x-user-email': 'Optional - User email'
    }
  });
});

// ===== ERROR HANDLING =====

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      health: 'GET /health',
      apiDocs: 'GET /api-docs',
      users: 'GET|POST|PUT|DELETE /users/{list|get/:id|create|update/:id|delete/:id}',
      products: 'GET|POST|PUT|DELETE /products/{list|get/:id|create|update/:id|delete/:id}',
      categories: 'GET|POST|PUT|DELETE /categories/{list|get/:id|create|update/:id|delete/:id}'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ===== SERVER STARTUP =====

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
  console.log('  📂 Categories: /categories/{list|get/:id|create|update/:id|delete/:id}');
  console.log('');
  console.log('📋 Example Usage:');
  console.log(`  curl -H "x-tenant-id: tenant-a" http://localhost:${PORT}/users/list`);
  console.log(`  curl -H "x-tenant-id: tenant-a" http://localhost:${PORT}/products/list`);
  console.log(`  curl -X POST -H "Content-Type: application/json" -H "x-tenant-id: tenant-a" \\`);
  console.log(`       -d '{"name":"Test Product","price":99.99}' \\`);
  console.log(`       http://localhost:${PORT}/products/create`);
  console.log('');
});

module.exports = app;
