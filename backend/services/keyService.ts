import crypto from 'crypto';
import { db } from '../db/database';
import { DigitalKey, ProductVariant } from '../models/types';

export class KeyService {
  public static getStockCount(variantId: string): number {
    return db.digitalKeys.filter(
      k => k.variantId === variantId && !k.isUsed && k.status === 'ACTIVE'
    ).length;
  }

  public static syncVariantStock(variantId: string): number {
    const count = this.getStockCount(variantId);
    const variant = db.productVariants.find(v => v.id === variantId);
    if (variant) {
      variant.stockCount = count;
      db.save();
    }
    return count;
  }

  public static allocateKey(
    userId: string,
    variant: ProductVariant,
    orderId: string,
    purchaseSource: 'API' | 'WEB' = 'WEB'
  ): DigitalKey {
    // Find an active, unused key strictly matching the requested variant ID
    const availableKey = db.digitalKeys.find(
      k => k.variantId === variant.id && !k.isUsed && k.status === 'ACTIVE' && !k.assignedUserId
    );

    if (!availableKey) {
      const product = db.products.find(p => p.id === variant.productId) || { id: variant.productId, name: 'Gaming Product' };
      return this.generateFallbackKey(userId, product, variant, orderId, 'NEXA', purchaseSource);
    }

    return this.assignKeyToUser(availableKey, userId, orderId, variant.durationHours, purchaseSource);
  }

  private static assignKeyToUser(
    key: DigitalKey,
    userId: string,
    orderId: string,
    durationHours: number,
    purchaseSource: 'API' | 'WEB' = 'WEB'
  ): DigitalKey {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + durationHours * 3600 * 1000);
    const product = db.products.find(p => p.id === key.productId);

    key.isUsed = false;
    key.assignedUserId = userId;
    key.assignedOrderId = orderId;
    key.assignedAt = now.toISOString();
    key.expiresAt = expiryDate.toISOString();
    key.status = 'ACTIVE';
    key.purchaseSource = purchaseSource;
    key.purchaseSourceLabel = purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website';
    key.productName = key.productName || product?.name || 'Gaming Digital Key';
    key.gameName = key.gameName || product?.game || 'FREEFIRE';
    const variantObj = db.productVariants.find(v => v.id === key.variantId);
    key.durationLabel = key.durationLabel || variantObj?.durationLabel || '1 Day';

    this.syncVariantStock(key.variantId);
    db.save();
    return key;
  }

  public static generateKeys(productId: string, variantId: string, count: number, prefix: string = 'NEXA'): DigitalKey[] {
    const created: DigitalKey[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const code = `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const key: DigitalKey = {
        id: `KEY-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`,
        productId,
        variantId,
        keyCode: code,
        isUsed: false,
        status: 'ACTIVE',
        createdAt: now,
      };
      created.push(key);
      db.digitalKeys.push(key);
    }

    this.syncVariantStock(variantId);
    db.save();
    return created;
  }

  public static importBulkKeys(productId: string, variantId: string, rawText: string): { importedCount: number; keys: DigitalKey[] } {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const imported: DigitalKey[] = [];
    const now = new Date().toISOString();

    for (const line of lines) {
      if (db.digitalKeys.some(k => k.keyCode === line)) continue;

      const key: DigitalKey = {
        id: `KEY-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        productId,
        variantId,
        keyCode: line,
        isUsed: false,
        status: 'ACTIVE',
        createdAt: now,
      };
      imported.push(key);
      db.digitalKeys.push(key);
    }

    this.syncVariantStock(variantId);
    db.saveSync();
    return { importedCount: imported.length, keys: imported };
  }

  public static generateFallbackKey(
    userId: string,
    product: { id: string; name: string },
    variant: ProductVariant,
    orderId: string,
    prefix?: string,
    purchaseSource: 'API' | 'WEB' = 'WEB'
  ): DigitalKey {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (variant.durationHours || 24) * 3600 * 1000);
    const randomBlock1 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const randomBlock2 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const cleanPrefix = (product.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || prefix || 'NX');
    const durationTag = (variant.durationLabel.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || '1D');
    const keyCode = `${cleanPrefix}-${durationTag}-${randomBlock1}-${randomBlock2}`;

    const key: DigitalKey = {
      id: `KEY-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      gameName: (product as any).game || 'FREEFIRE',
      durationLabel: variant.durationLabel,
      keyCode,
      isUsed: false,
      assignedUserId: userId,
      assignedOrderId: orderId,
      assignedAt: now.toISOString(),
      expiresAt: expiryDate.toISOString(),
      status: 'ACTIVE',
      purchaseSource,
      purchaseSourceLabel: purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website',
      createdAt: now.toISOString(),
    };

    db.digitalKeys.push(key);
    this.syncVariantStock(variant.id);
    db.saveSync();
    return key;
  }
}
