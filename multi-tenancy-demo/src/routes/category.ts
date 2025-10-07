/**
 * Category routes - In-memory category management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { StorageService } from '../services/storage.service';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../types/models';
import { ValidationError, NotFoundError } from '../types/errors';

const router: Router = Router();
const storage = new StorageService();

/**
 * List all categories
 */
router.get('/list', (req: Request, res: Response) => {
  const categories = storage.getCategories(req.tenantId);

  res.json({
    message: 'Categories listed successfully (mock)',
    data: categories,
    count: categories.length,
    tenantId: req.tenantId,
    context: {
      userId: req.userId,
      tenantId: req.tenantId,
    },
  });
});

/**
 * Get specific category
 */
router.get('/get/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = parseInt(req.params.id!, 10);

    if (isNaN(categoryId)) {
      throw new ValidationError('Invalid category ID');
    }

    const category = storage.getCategoryById(categoryId);

    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    res.json({
      message: `Category ${categoryId} retrieved successfully (mock)`,
      data: category,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new category
 */
router.post('/create', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as CreateCategoryRequest;

    if (!name) {
      throw new ValidationError('Category name is required');
    }

    const category = storage.createCategory(
      name,
      description || 'No description provided',
      req.tenantId
    );

    res.status(201).json({
      message: 'Category created successfully (mock)',
      data: category,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update existing category
 */
router.put('/update/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = parseInt(req.params.id!, 10);

    if (isNaN(categoryId)) {
      throw new ValidationError('Invalid category ID');
    }

    const { name, description } = req.body as UpdateCategoryRequest;

    const category = storage.updateCategory(categoryId, { name, description });

    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    res.json({
      message: `Category ${categoryId} updated successfully (mock)`,
      data: category,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete category
 */
router.delete('/delete/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = parseInt(req.params.id!, 10);

    if (isNaN(categoryId)) {
      throw new ValidationError('Invalid category ID');
    }

    const category = storage.deleteCategory(categoryId);

    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    res.json({
      message: `Category ${categoryId} deleted successfully (mock)`,
      data: category,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
