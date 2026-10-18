import { Request, Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

export class ProductController {
  public static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const isReseller = authReq.user && authReq.user.role === 'RESELLER';

      const productsWithVariants = db.products
        .filter(p => p.isActive !== false)
        .map(product => {
          // Pull independent variants for this product
          const variants = db.productVariants
            .filter(v => v.productId === product.id && v.isActive !== false)
            .map(v => {
              // Real-time stock count strictly for this duration variant
              const stock = db.digitalKeys.filter(
                k => k.variantId === v.id && !k.isUsed && k.status === 'ACTIVE'
              ).length;

              const hasApiPid = Boolean(
                (v.externalPid && v.externalPid.trim()) ||
                (product.externalPid && product.externalPid.trim()) ||
                (v.externalDuration && v.externalDuration.trim())
              );

              const effectiveStock = hasApiPid ? 999 : stock > 0 ? stock : (v.stockCount ?? 15);

              return {
                ...v,
                stockCount: effectiveStock,
                displayPrice: isReseller ? v.resellerPrice : v.price,
                isAvailable: true,
              };
            });

          return {
            ...product,
            variants,
          };
        });

      res.json({ products: productsWithVariants });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch products.' });
    }
  }

  public static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = db.products.find(p => p.id === id);
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const variants = db.productVariants
        .filter(v => v.productId === product.id && v.isActive)
        .map(v => {
          const stock = db.digitalKeys.filter(
            k => k.variantId === v.id && !k.isUsed && k.status === 'ACTIVE'
          ).length;

          const hasApiPid = Boolean(
            (v.externalPid && v.externalPid.trim()) ||
            (product.externalPid && product.externalPid.trim()) ||
            (v.externalDuration && v.externalDuration.trim())
          );

          return {
            ...v,
            stockCount: hasApiPid ? 999 : stock,
            isAvailable: hasApiPid ? true : stock > 0,
          };
        });

      res.json({ product: { ...product, variants } });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch product.' });
    }
  }
}
