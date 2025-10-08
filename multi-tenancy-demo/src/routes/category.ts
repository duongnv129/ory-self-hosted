/**
 * Category routes - In-memory category management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { storageService } from '../app';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../types/models';
import { ValidationError, NotFoundError } from '../types/errors';

const router: Router = Router();

/**
 * List all categories
 */
router.get('/list', (req: Request, res: Response) => {
  const categories = storageService.getCategories(req.tenantId);

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

    const category = storageService.getCategoryById(categoryId);

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
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description }: CreateCategoryRequest = req.body;

    if (!name || name.trim().length < 2) {
      throw new ValidationError('Category name must be at least 2 characters');
    }

    const category = await storageService.createCategory(
      name,
      description || '',
      req.tenantId
    );

    res.json({
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
router.put('/update/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = parseInt(req.params.id!, 10);

    if (isNaN(categoryId)) {
      throw new ValidationError('Invalid category ID');
    }

    const { name, description } = req.body as UpdateCategoryRequest;

    const category = await storageService.updateCategory(categoryId, { name, description });

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
router.delete('/delete/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = parseInt(req.params.id!, 10);

    if (isNaN(categoryId)) {
      throw new ValidationError('Invalid category ID');
    }

    const category = await storageService.deleteCategory(categoryId);

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
