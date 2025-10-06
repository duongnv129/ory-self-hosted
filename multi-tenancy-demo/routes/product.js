const express = require('express');

const router = express.Router();

// Mock products data store
let mockProducts = [
  { id: 1, name: 'Product A', category: 'Electronics', price: 299.99, tenantId: 'tenant-a' },
  { id: 2, name: 'Product B', category: 'Books', price: 19.99, tenantId: 'tenant-a' },
  { id: 3, name: 'Product C', category: 'Clothing', price: 59.99, tenantId: 'tenant-b' }
];

// ==================== PRODUCT ENDPOINTS ====================

// List all products
router.get('/list', (req, res) => {
  // Filter by tenant if specified
  const tenantProducts = req.tenantId ?
    mockProducts.filter(p => p.tenantId === req.tenantId) :
    mockProducts;

  res.json({
    message: 'Products listed successfully (mock)',
    data: tenantProducts,
    count: tenantProducts.length,
    tenantId: req.tenantId,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

// Get specific product
router.get('/get/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = mockProducts.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({
      error: 'Product not found',
      productId: productId
    });
  }

  res.json({
    message: `Product ${productId} retrieved successfully (mock)`,
    data: product,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

// Create new product
router.post('/create', (req, res) => {
  const { name, category, price } = req.body;

  if (!name) {
    return res.status(400).json({
      error: 'Product name is required'
    });
  }

  const newProduct = {
    id: Math.max(...mockProducts.map(p => p.id), 0) + 1,
    name: name,
    category: category || 'General',
    price: price || 0,
    tenantId: req.tenantId || null, // null for Simple RBAC (global), specific ID for Tenant RBAC
    createdAt: new Date().toISOString()
  };

  mockProducts.push(newProduct);

  res.status(201).json({
    message: 'Product created successfully (mock)',
    data: newProduct,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

// Update existing product
router.put('/update/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const productIndex = mockProducts.findIndex(p => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({
      error: 'Product not found',
      productId: productId
    });
  }

  const { name, category, price } = req.body;
  const existingProduct = mockProducts[productIndex];

  const updatedProduct = {
    ...existingProduct,
    name: name || existingProduct.name,
    category: category || existingProduct.category,
    price: price !== undefined ? price : existingProduct.price,
    updatedAt: new Date().toISOString()
  };

  mockProducts[productIndex] = updatedProduct;

  res.json({
    message: `Product ${productId} updated successfully (mock)`,
    data: updatedProduct,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

// Delete product
router.delete('/delete/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const productIndex = mockProducts.findIndex(p => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({
      error: 'Product not found',
      productId: productId
    });
  }

  const deletedProduct = mockProducts.splice(productIndex, 1)[0];

  res.json({
    message: `Product ${productId} deleted successfully (mock)`,
    data: deletedProduct,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

module.exports = router;
