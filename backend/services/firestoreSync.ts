import firebaseConfig from '../../firebase-applet-config.json';
import { User, DigitalKey, Order, Transaction } from '../models/types';
import { db } from '../db/database';

const PROJECT_ID = firebaseConfig.projectId || 'kalam-panel';
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || 'ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9';
const API_KEY = firebaseConfig.apiKey || 'AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

/**
 * Robust server-side Firestore REST client for two-way synchronization.
 * Works seamlessly in Node.js, Express, and cloud containers.
 */
export class FirestoreSyncService {
  /**
   * Search Firestore for a user whose apiKey matches the provided key
   */
  public static async findUserByApiKey(apiKey: string): Promise<User | null> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) return null;

    try {
      // 1. Run structured query on users collection where apiKey == cleanKey
      const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${API_KEY}`;
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'apiKey' },
              op: 'EQUAL',
              value: { stringValue: cleanKey },
            },
          },
          limit: 1,
        },
      };

      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody),
      });

      if (!res.ok) {
        // Fallback: list users and match
        return await this.fallbackScanUsersForApiKey(cleanKey);
      }

      const results = (await res.json()) as any[];
      if (Array.isArray(results) && results.length > 0 && results[0].document) {
        const doc = results[0].document;
        return this.parseFirestoreUserDoc(doc);
      }

      return await this.fallbackScanUsersForApiKey(cleanKey);
    } catch (err) {
      console.warn('[FirestoreSync] Error querying user by apiKey:', err);
      return await this.fallbackScanUsersForApiKey(cleanKey);
    }
  }

  private static async fallbackScanUsersForApiKey(cleanKey: string): Promise<User | null> {
    try {
      const listUrl = `${FIRESTORE_BASE}/users?pageSize=100&key=${API_KEY}`;
      const res = await fetch(listUrl);
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const docs = data.documents || [];
      for (const d of docs) {
        const u = this.parseFirestoreUserDoc(d);
        if (u && u.apiKey && u.apiKey.trim() === cleanKey) {
          return u;
        }
      }
    } catch {}
    return null;
  }

  public static parseFirestoreUserDoc(doc: any): User | null {
    if (!doc || !doc.fields) return null;
    const fields = doc.fields;
    const docPath = doc.name || '';
    const id = fields.id?.stringValue || docPath.split('/').pop() || `USR-${Date.now()}`;
    const username = fields.username?.stringValue || fields.displayName?.stringValue || 'user';
    const email = fields.email?.stringValue || '';
    const role = (fields.role?.stringValue || 'USER') as any;
    const balance =
      typeof fields.balance?.doubleValue === 'number'
        ? fields.balance.doubleValue
        : typeof fields.balance?.integerValue === 'string'
        ? parseInt(fields.balance.integerValue, 10)
        : Number(fields.balance?.doubleValue || 0);
    const apiKey = fields.apiKey?.stringValue || '';
    const referralCode = fields.referralCode?.stringValue || `NX${id.slice(0, 4).toUpperCase()}`;
    const isBanned = Boolean(fields.isBanned?.booleanValue);
    const twoFactorEnabled = Boolean(fields.twoFactorEnabled?.booleanValue);

    return {
      id,
      username,
      email,
      passwordHash: '',
      role,
      balance,
      apiKey,
      referralCode,
      isBanned,
      twoFactorEnabled,
      createdAt: fields.createdAt?.stringValue || new Date().toISOString(),
      updatedAt: fields.updatedAt?.stringValue || new Date().toISOString(),
    };
  }

  /**
   * Sync user's deducted balance to Firestore in real-time
   */
  public static async syncUserBalance(userId: string, newBalance: number): Promise<void> {
    try {
      const patchUrl = `${FIRESTORE_BASE}/users/${encodeURIComponent(userId)}?updateMask.fieldPaths=balance&updateMask.fieldPaths=updatedAt&key=${API_KEY}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            balance: { doubleValue: Number(newBalance) },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
    } catch (err) {
      console.warn('[FirestoreSync] Failed to sync balance to Firestore:', err);
    }
  }

  /**
   * Sync newly purchased digital key directly into Firestore digitalKeys collection
   */
  public static async syncDigitalKey(key: DigitalKey): Promise<void> {
    try {
      const docUrl = `${FIRESTORE_BASE}/digitalKeys?documentId=${encodeURIComponent(key.id)}&key=${API_KEY}`;
      await fetch(docUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: key.id },
            productId: { stringValue: key.productId },
            variantId: { stringValue: key.variantId },
            keyCode: { stringValue: key.keyCode },
            isUsed: { booleanValue: Boolean(key.isUsed) },
            status: { stringValue: key.status },
            assignedUserId: { stringValue: key.assignedUserId || '' },
            assignedOrderId: { stringValue: key.assignedOrderId || '' },
            assignedAt: { stringValue: key.assignedAt || new Date().toISOString() },
            expiresAt: { stringValue: key.expiresAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString() },
            purchaseSource: { stringValue: key.purchaseSource || 'API' },
            purchaseSourceLabel: { stringValue: key.purchaseSourceLabel || 'Buy from API' },
            createdAt: { stringValue: key.createdAt || new Date().toISOString() },
          },
        }),
      });
    } catch (err) {
      console.warn('[FirestoreSync] Failed to sync digital key to Firestore:', err);
    }
  }

  /**
   * Sync completed Order into Firestore orders collection
   */
  public static async syncOrder(order: Order): Promise<void> {
    try {
      const docUrl = `${FIRESTORE_BASE}/orders?documentId=${encodeURIComponent(order.id)}&key=${API_KEY}`;
      await fetch(docUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: order.id },
            userId: { stringValue: order.userId },
            productId: { stringValue: order.productId },
            variantId: { stringValue: order.variantId },
            productName: { stringValue: order.productName },
            durationLabel: { stringValue: order.durationLabel },
            pricePaid: { doubleValue: Number(order.pricePaid) },
            deliveredKeyId: { stringValue: order.deliveredKeyId || order.id },
            deliveredKeyCode: { stringValue: order.deliveredKeyCode || '' },
            status: { stringValue: order.status },
            purchaseSource: { stringValue: order.purchaseSource || 'API' },
            purchaseSourceLabel: { stringValue: order.purchaseSourceLabel || 'Buy from API' },
            createdAt: { stringValue: order.createdAt || new Date().toISOString() },
          },
        }),
      });
    } catch (err) {
      console.warn('[FirestoreSync] Failed to sync order to Firestore:', err);
    }
  }

  /**
   * Sync debit Transaction into Firestore transactions collection
   */
  public static async syncTransaction(tx: Transaction): Promise<void> {
    try {
      const docUrl = `${FIRESTORE_BASE}/transactions?documentId=${encodeURIComponent(tx.id)}&key=${API_KEY}`;
      await fetch(docUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: tx.id },
            userId: { stringValue: tx.userId },
            type: { stringValue: tx.type },
            amount: { doubleValue: Number(tx.amount) },
            description: { stringValue: tx.description },
            referenceId: { stringValue: tx.referenceId || '' },
            purchaseSource: { stringValue: tx.purchaseSource || 'API' },
            purchaseSourceLabel: { stringValue: tx.purchaseSourceLabel || 'Buy from API' },
            createdAt: { stringValue: tx.createdAt || new Date().toISOString() },
          },
        }),
      });
    } catch (err) {
      console.warn('[FirestoreSync] Failed to sync transaction to Firestore:', err);
    }
  }

  /**
   * Update or ensure user document in Firestore has their current apiKey
   */
  public static async syncUserApiKey(userId: string, apiKey: string): Promise<void> {
    try {
      const patchUrl = `${FIRESTORE_BASE}/users/${encodeURIComponent(userId)}?updateMask.fieldPaths=apiKey&updateMask.fieldPaths=updatedAt&key=${API_KEY}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            apiKey: { stringValue: apiKey },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
    } catch (err) {
      console.warn('[FirestoreSync] Failed to update user apiKey in Firestore:', err);
    }
  }
}
