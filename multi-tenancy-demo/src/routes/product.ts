/**
 * Product routes - In-memory product management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { storageService } from '../app';
import { CreateProductRequest, UpdateProductRequest } from '../types/models';
import { ValidationError, NotFoundError } from '../types/errors';

const router: Router = Router();

/**
 * List all products
 */
router.get('/list', (req: Request, res: Response) => {
  const products = storageService.getProducts(req.tenantId);

  res.json({
    message: 'Products listed successfully (mock)',
    data: products,
    count: products.length,
    tenantId: req.tenantId,
    context: {
      userId: req.userId,
      tenantId: req.tenantId,
    },
  });
});

/**
 * Get specific product
 */
router.get('/get/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseInt(req.params.id!, 10);

    if (isNaN(productId)) {
      throw new ValidationError('Invalid product ID');
    }

    const product = storageService.getProductById(productId);

    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    res.json({
      message: `Product ${productId} retrieved successfully (mock)`,
      data: product,
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
 * Create new product
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category, price }: CreateProductRequest = req.body;

    if (!name) {
      throw new ValidationError('Product name is required');
    }

    const product = await storageService.createProduct(
      name,
      category || 'General',
      price || 0,
      req.tenantId
    );

    res.status(201).json({
      message: 'Product created successfully (mock)',
      data: product,
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
 * Update product
 */
router.put('/update/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseInt(req.params.id!, 10);
    const { name, category, price }: UpdateProductRequest = req.body;

    if (isNaN(productId)) {
      throw new ValidationError('Invalid product ID');
    }

    const product = await storageService.updateProduct(productId, { name, category, price });

    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    res.json({
      message: `Product ${productId} updated successfully (mock)`,
      data: product,
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
 * Delete product
 */
router.delete('/delete/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseInt(req.params.id!, 10);

    if (isNaN(productId)) {
      throw new ValidationError('Invalid product ID');
    }

    const product = await storageService.deleteProduct(productId);

    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    res.json({
      message: `Product ${productId} deleted successfully (mock)`,
      data: product,
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
