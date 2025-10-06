const express = require('express');

const router = express.Router();

// Mock categories data store
let mockCategories = [
  { id: 1, name: 'Electronics', description: 'Electronic devices and gadgets', tenantId: 'tenant-a' },
  { id: 2, name: 'Books', description: 'Books and literature', tenantId: 'tenant-a' },
  { id: 3, name: 'Clothing', description: 'Apparel and accessories', tenantId: 'tenant-b' }
];

// ==================== CATEGORY ENDPOINTS ====================

// List all categories
router.get('/list', (req, res) => {
  // Filter by tenant if specified
  const tenantCategories = req.tenantId ?
    mockCategories.filter(c => c.tenantId === req.tenantId) :
    mockCategories;

  res.json({
    message: 'Categories listed successfully (mock)',
    data: tenantCategories,
    count: tenantCategories.length,
    tenantId: req.tenantId,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

// Get specific category
router.get('/get/:id', (req, res) => {
  const categoryId = parseInt(req.params.id);
  const category = mockCategories.find(c => c.id === categoryId);

  if (!category) {
    return res.status(404).json({
      error: 'Category not found',
      categoryId: categoryId
    });
  }

  res.json({
    message: `Category ${categoryId} retrieved successfully (mock)`,
    data: category,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

// Create new category
router.post('/create', (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({
      error: 'Category name is required'
    });
  }

  const newCategory = {
    id: Math.max(...mockCategories.map(c => c.id), 0) + 1,
    name: name,
    description: description || 'No description provided',
    tenantId: req.tenantId || null, // null for Simple RBAC (global), specific ID for Tenant RBAC
    createdAt: new Date().toISOString()
  };

  mockCategories.push(newCategory);

  res.status(201).json({
    message: 'Category created successfully (mock)',
    data: newCategory,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

// Update existing category
router.put('/update/:id', (req, res) => {
  const categoryId = parseInt(req.params.id);
  const categoryIndex = mockCategories.findIndex(c => c.id === categoryId);

  if (categoryIndex === -1) {
    return res.status(404).json({
      error: 'Category not found',
      categoryId: categoryId
    });
  }

  const { name, description } = req.body;
  const existingCategory = mockCategories[categoryIndex];

  const updatedCategory = {
    ...existingCategory,
    name: name || existingCategory.name,
    description: description || existingCategory.description,
    updatedAt: new Date().toISOString()
  };

  mockCategories[categoryIndex] = updatedCategory;

  res.json({
    message: `Category ${categoryId} updated successfully (mock)`,
    data: updatedCategory,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

// Delete category
router.delete('/delete/:id', (req, res) => {
  const categoryId = parseInt(req.params.id);
  const categoryIndex = mockCategories.findIndex(c => c.id === categoryId);

  if (categoryIndex === -1) {
    return res.status(404).json({
      error: 'Category not found',
      categoryId: categoryId
    });
  }

  const deletedCategory = mockCategories.splice(categoryIndex, 1)[0];

  res.json({
    message: `Category ${categoryId} deleted successfully (mock)`,
    data: deletedCategory,
    context: {
      userId: req.userId,
      tenantId: req.tenantId
    }
  });
});

module.exports = router;
