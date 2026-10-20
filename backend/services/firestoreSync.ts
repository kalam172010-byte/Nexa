import crypto from 'crypto';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, UserRole, Product, ProductVariant, DigitalKey, Order, Transaction } from '../models/types';
import { db } from '../db/database';

const PROJECT_ID = firebaseConfig.projectId || 'kalam-panel';
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || 'ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9';
const API_KEY = firebaseConfig.apiKey || 'AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const EDGE_SYNC_URL = 'https://kalamffpanel.kalamff.workers.dev/api/sync/state';

/**
 * Robust server-side Firestore + Edge Worker two-way synchronization service.
 * Ensures that any key purchased or balance deducted via external Outbound API
 * (whether hitting Cloudflare Worker or Express backend) is immediately reflected
 * in user wallet balances, My Keys, Orders, and Transaction Ledger.
 */
export class FirestoreSyncService {
  private static lastPullTime = 0;
  private static isPulling = false;
  private static autoSyncStarted = false;

  /**
   * Return all linked user document IDs for a given user account
   */
  public static getLinkedUserIds(user?: Partial<User> | null, extraId?: string): string[] {
    const ids = new Set<string>();
    if (extraId && extraId.trim()) ids.add(extraId.trim());
    if (user?.id) ids.add(user.id.trim());
    if (user?.firebaseUid) ids.add(user.firebaseUid.trim());

    const email = (user?.email || '').trim().toLowerCase();
    const apiKey = (user?.apiKey || '').trim();

    if (
      email === 'kalam172010@gmail.com' ||
      apiKey === 'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7' ||
      ids.has('USR-KALAM-172010') ||
      ids.has('tnqy7LYfgwgzYpoQGqljC4H6bKc2')
    ) {
      ids.add('USR-KALAM-172010');
      ids.add('tnqy7LYfgwgzYpoQGqljC4H6bKc2');
    }

    for (const u of db.users) {
      if (
        (email && u.email.toLowerCase() === email) ||
        (apiKey && u.apiKey && u.apiKey.trim() === apiKey)
      ) {
        ids.add(u.id);
        if (u.firebaseUid) ids.add(u.firebaseUid);
      }
    }

    return Array.from(ids).filter(Boolean);
  }

  /**
   * Start background 2.5s auto-sync loop
   */
  public static startAutoSync(): void {
    if (this.autoSyncStarted) return;
    this.autoSyncStarted = true;

    this.pullAndMergeExternalState(true).catch(() => {});
    setInterval(() => {
      this.pullAndMergeExternalState(false).catch(() => {});
    }, 2500);
  }

  /**
   * Pulls and merges keys, orders, transactions, and user balances from both
   * Firestore and the Edge Worker (/api/sync/state).
   */
  public static async pullAndMergeExternalState(force = false): Promise<void> {
    const now = Date.now();
    if (!force && (this.isPulling || now - this.lastPullTime < 800)) {
      return;
    }
    this.isPulling = true;
    this.lastPullTime = now;

    let dbChanged = false;
    const newlyDiscoveredOrderIds = new Set<string>();

    try {
      // 1. Pull state from Edge Worker (https://kalamffpanel.kalamff.workers.dev/api/sync/state)
      let edgeState: any = null;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const edgeRes = await fetch(EDGE_SYNC_URL, { signal: controller.signal });
        clearTimeout(timer);
        if (edgeRes.ok) {
          edgeState = await edgeRes.json();
        }
      } catch {}

      // 2. Pull documents from Firestore (users, digitalKeys, orders) via structuredQuery (:runQuery)
      const runColQuery = async (colName: string, limit = 200): Promise<any[]> => {
        try {
          const r = await fetch(`${FIRESTORE_BASE}:runQuery?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: colName }],
                limit,
              },
            }),
          });
          if (!r.ok) return [];
          const arr = (await r.json()) as any[];
          return Array.isArray(arr) ? arr.map(item => item?.document).filter(Boolean) : [];
        } catch {
          return [];
        }
      };

      const [fsUsersDocs, fsKeysDocs, fsOrdersDocs, fsProductsDocs, fsVariantsDocs] = await Promise.all([
        runColQuery('users', 100),
        runColQuery('digitalKeys', 200),
        runColQuery('orders', 200),
        runColQuery('products', 100),
        runColQuery('productVariants', 200),
      ]);

      // 1B. Parse and merge Firestore products & variants so products added anywhere persist and sync everywhere
      const parsedFsProducts: Product[] = [];
      for (const doc of fsProductsDocs) {
        const p = this.parseFirestoreProductDoc(doc);
        if (p) parsedFsProducts.push(p);
      }

      const parsedFsVariants: ProductVariant[] = [];
      for (const doc of fsVariantsDocs) {
        const v = this.parseFirestoreVariantDoc(doc);
        if (v) parsedFsVariants.push(v);
      }

      for (const fp of parsedFsProducts) {
        const existing = db.products.find(p => p.id === fp.id);
        if (!existing) {
          db.products.unshift(fp);
          dbChanged = true;
        } else {
          // Keep active/maintenance fields synchronized
          if (fp.name && existing.name !== fp.name) { existing.name = fp.name; dbChanged = true; }
          if (typeof fp.isActive === 'boolean' && existing.isActive !== fp.isActive) { existing.isActive = fp.isActive; dbChanged = true; }
          if (typeof fp.isUnderMaintenance === 'boolean' && existing.isUnderMaintenance !== fp.isUnderMaintenance) { existing.isUnderMaintenance = fp.isUnderMaintenance; dbChanged = true; }
          if (fp.externalPid !== undefined && existing.externalPid !== fp.externalPid) { existing.externalPid = fp.externalPid; dbChanged = true; }
        }
      }

      for (const fv of parsedFsVariants) {
        const existing = db.productVariants.find(v => v.id === fv.id);
        if (!existing) {
          db.productVariants.push(fv);
          dbChanged = true;
        } else {
          if (fv.price !== undefined && existing.price !== fv.price) { existing.price = fv.price; dbChanged = true; }
          if (fv.resellerPrice !== undefined && existing.resellerPrice !== fv.resellerPrice) { existing.resellerPrice = fv.resellerPrice; dbChanged = true; }
          if (fv.externalPid !== undefined && existing.externalPid !== fv.externalPid) { existing.externalPid = fv.externalPid; dbChanged = true; }
        }
      }

      // Merge newly discovered Edge products into db.products if present
      if (Array.isArray(edgeState?.products)) {
        for (const ep of edgeState.products) {
          if (!ep || !ep.id) continue;
          if (!db.products.some(p => p.id === ep.id)) {
            db.products.push({
              id: ep.id,
              name: ep.name || 'Gaming Panel',
              game: ep.game || 'FREEFIRE',
              description: ep.description || '',
              category: ep.category || 'FREEFIRE',
              badge: ep.badge,
              imageUrl: ep.imageUrl,
              features: ep.features,
              deviceType: ep.deviceType,
              updateFileUrl: ep.updateFileUrl,
              videoUrl: ep.videoUrl,
              externalPid: ep.externalPid,
              isActive: ep.isActive !== false,
              isUnderMaintenance: Boolean(ep.isUnderMaintenance),
              maintenanceNotice: ep.maintenanceNotice,
              createdAt: ep.createdAt || new Date().toISOString(),
            });
            dbChanged = true;
          }
          if (Array.isArray(ep.variants)) {
            for (const ev of ep.variants) {
              if (!ev || !ev.id) continue;
              if (!db.productVariants.some(v => v.id === ev.id)) {
                db.productVariants.push({
                  id: ev.id,
                  productId: ep.id,
                  durationLabel: ev.durationLabel || '1 Day',
                  durationHours: Number(ev.durationHours || 24),
                  price: Number(ev.price || 50),
                  resellerPrice: Number(ev.resellerPrice || 38),
                  stockCount: Number(ev.stockCount ?? 15),
                  externalPid: ev.externalPid,
                  externalDuration: ev.externalDuration,
                  isActive: ev.isActive !== false,
                });
                dbChanged = true;
              }
            }
          }
        }
      }

      // Parse Firestore users
      const parsedFsUsers: User[] = [];
      for (const doc of fsUsersDocs) {
        const u = this.parseFirestoreUserDoc(doc);
        if (u) parsedFsUsers.push(u);
      }

      // Merge newly discovered Firestore users into db.users so they appear in real-time in the admin panel and leaderboard
      for (const fu of parsedFsUsers) {
        if (!fu.id && !fu.email) continue;
        const linkedIds = new Set(this.getLinkedUserIds(fu));
        const existing = db.users.find(
          u =>
            (fu.id && (u.id === fu.id || u.firebaseUid === fu.id)) ||
            (fu.firebaseUid && (u.id === fu.firebaseUid || u.firebaseUid === fu.firebaseUid)) ||
            (fu.email && u.email.toLowerCase() === fu.email.toLowerCase()) ||
            linkedIds.has(u.id) ||
            (u.firebaseUid && linkedIds.has(u.firebaseUid))
        );
        if (!existing) {
          if (!fu.apiKey) {
            fu.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
          }
          db.users.push(fu);
          dbChanged = true;
        } else {
          if (fu.firebaseUid && !existing.firebaseUid) {
            existing.firebaseUid = fu.firebaseUid;
            dbChanged = true;
          }
          if (fu.username && existing.username === 'user' && fu.username !== 'user') {
            existing.username = fu.username;
            dbChanged = true;
          }
        }
      }

      // Merge newly discovered Edge users into db.users
      if (Array.isArray(edgeState?.users)) {
        for (const eu of edgeState.users) {
          if (!eu || (!eu.id && !eu.email)) continue;
          const cleanEmail = (eu.email || '').toLowerCase().trim();
          const existing = db.users.find(
            u =>
              (eu.id && (u.id === eu.id || u.firebaseUid === eu.id)) ||
              (cleanEmail && u.email.toLowerCase() === cleanEmail)
          );
          if (!existing) {
            db.users.push({
              id: eu.id,
              username: eu.username || 'user',
              email: cleanEmail || `${eu.id}@user.local`,
              passwordHash: '',
              role: eu.role || 'USER',
              balance: typeof eu.balance === 'number' ? eu.balance : 0,
              apiKey: eu.apiKey || `nexa_live_${crypto.randomBytes(16).toString('hex')}`,
              referralCode: eu.referralCode || `NX${eu.id.slice(0, 4).toUpperCase()}`,
              twoFactorEnabled: Boolean(eu.twoFactorEnabled),
              isBanned: Boolean(eu.isBanned),
              createdAt: eu.createdAt || new Date().toISOString(),
              updatedAt: eu.updatedAt || new Date().toISOString(),
            });
            dbChanged = true;
          }
        }
      }

      // Sync user profiles & balances
      for (const localUser of db.users) {
        const linkedIds = new Set(this.getLinkedUserIds(localUser));
        const matchingFsUsers = parsedFsUsers.filter(
          fu =>
            linkedIds.has(fu.id) ||
            (fu.firebaseUid && linkedIds.has(fu.firebaseUid)) ||
            (fu.email && fu.email.toLowerCase() === localUser.email.toLowerCase()) ||
            (fu.apiKey && localUser.apiKey && fu.apiKey.trim() === localUser.apiKey.trim())
        );

        const matchingEdgeUsers = Array.isArray(edgeState?.users)
          ? edgeState.users.filter(
              (eu: any) =>
                linkedIds.has(eu.id) ||
                (eu.email && String(eu.email).toLowerCase() === localUser.email.toLowerCase()) ||
                (eu.apiKey && localUser.apiKey && String(eu.apiKey).trim() === localUser.apiKey.trim())
            )
          : [];

        // Ensure primary admin account uses the unified active API key from Firestore/Edge
        if (localUser.email.toLowerCase() === 'kalam172010@gmail.com') {
          const activeKey =
            matchingEdgeUsers.find((u: any) => u.apiKey && String(u.apiKey).startsWith('nexa_live_89f4e2a1'))?.apiKey ||
            matchingFsUsers.find(u => u.apiKey && u.apiKey.startsWith('nexa_live_89f4e2a1'))?.apiKey ||
            'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7';
          if (localUser.apiKey !== activeKey) {
            localUser.apiKey = activeKey;
            dbChanged = true;
          }
        } else if (!localUser.apiKey) {
          const anyWithKey = matchingFsUsers.find(u => u.apiKey) || matchingEdgeUsers.find((u: any) => u.apiKey);
          if (anyWithKey?.apiKey) {
            localUser.apiKey = anyWithKey.apiKey;
            dbChanged = true;
          }
        }

        // Determine authoritative balance across Firestore & Edge
        const candidateBalances: number[] = [];
        for (const fu of matchingFsUsers) {
          if (typeof fu.balance === 'number' && !Number.isNaN(fu.balance)) {
            candidateBalances.push(Math.max(0, Math.round(fu.balance * 100) / 100));
          }
        }
        for (const eu of matchingEdgeUsers) {
          if (typeof eu.balance === 'number' && !Number.isNaN(eu.balance)) {
            candidateBalances.push(Math.max(0, Math.round(eu.balance * 100) / 100));
          }
        }

        if (candidateBalances.length > 0) {
          // If one of the linked documents (e.g. USR-KALAM-172010 on Edge/Firestore) was deducted below the others,
          // take the minimum positive/deducted balance among the active synced records.
          const minExternalBal = Math.min(...candidateBalances);
          const maxExternalBal = Math.max(...candidateBalances);

          // If localUser had a stale default (like 500) while Firestore had 5000 / 4850, adopt minExternalBal (4850)
          const targetBal = candidateBalances.length > 1 ? minExternalBal : maxExternalBal;
          if (Math.abs((localUser.balance || 0) - targetBal) > 0.001) {
            localUser.balance = targetBal;
            localUser.updatedAt = new Date().toISOString();
            dbChanged = true;
          }

          // If Firestore linked docs disagree with each other (e.g. tnqy7LYfgwgzYpoQGqljC4H6bKc2=5000 vs USR-KALAM-172010=4850),
          // unify all linked Firestore docs to targetBal so client listeners see the exact deducted balance
          if (matchingFsUsers.some(fu => Math.abs(fu.balance - targetBal) > 0.001)) {
            for (const lid of linkedIds) {
              const patchUrl = `${FIRESTORE_BASE}/users/${encodeURIComponent(lid)}?key=${API_KEY}`;
              fetch(patchUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: this.buildFullUserFields(lid, localUser, targetBal, localUser.apiKey),
                }),
              }).catch(() => {});
            }
          }
        }
      }

      // 3. Merge Digital Keys from Firestore
      for (const doc of fsKeysDocs) {
        const k = this.parseFirestoreKeyDoc(doc);
        if (!k || !k.keyCode) continue;
        const existing = db.digitalKeys.find(ek => ek.id === k.id || ek.keyCode === k.keyCode);
        if (!existing) {
          db.digitalKeys.unshift(k);
          dbChanged = true;
          if (k.assignedOrderId) newlyDiscoveredOrderIds.add(k.assignedOrderId);
        } else {
          if (!existing.assignedUserEmail && k.assignedUserEmail) {
            existing.assignedUserEmail = k.assignedUserEmail;
            dbChanged = true;
          }
          if (!existing.assignedApiKey && k.assignedApiKey) {
            existing.assignedApiKey = k.assignedApiKey;
            dbChanged = true;
          }
        }
      }

      // 4. Merge Digital Keys from Edge Worker
      if (Array.isArray(edgeState?.keys)) {
        for (const ek of edgeState.keys) {
          if (!ek || !ek.keyCode) continue;
          const existing = db.digitalKeys.find(k => k.id === ek.id || k.keyCode === ek.keyCode);
          if (!existing) {
            const owner = this.findLocalOwner(ek.assignedUserId, ek.assignedUserEmail, ek.assignedApiKey);
            const prod = db.products.find(p => p.id === ek.productId);
            const variant = db.productVariants.find(v => v.id === ek.variantId);
            const isApi = ek.purchaseSource === 'API' || String(ek.id || '').includes('API') || String(ek.assignedOrderId || '').startsWith('API-ORD-');
            const newKey: DigitalKey = {
              id: ek.id,
              productId: ek.productId || prod?.id || 'PROD-499177',
              variantId: ek.variantId || variant?.id || 'VAR-499189',
              productName: ek.productName || prod?.name || (ek.productId?.includes('BGMI') ? 'BGMI LOADER PRO V2' : 'KALAM VIP AIMBOT FF OB55'),
              gameName: ek.gameName || prod?.game || (ek.productId?.includes('BGMI') ? 'BGMI' : 'FREEFIRE'),
              durationLabel: ek.durationLabel || variant?.durationLabel || '1 Day',
              keyCode: ek.keyCode,
              isUsed: Boolean(ek.isUsed),
              status: ek.status || 'ACTIVE',
              assignedUserId: owner?.id || ek.assignedUserId,
              assignedUserEmail: (owner?.email || ek.assignedUserEmail || '').toLowerCase(),
              assignedApiKey: owner?.apiKey || ek.assignedApiKey || '',
              assignedOrderId: ek.assignedOrderId,
              assignedAt: ek.assignedAt || ek.createdAt || new Date().toISOString(),
              expiresAt: ek.expiresAt,
              purchaseSource: isApi ? 'API' : 'WEB',
              purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
              createdAt: ek.createdAt || new Date().toISOString(),
            };
            db.digitalKeys.unshift(newKey);
            dbChanged = true;
            if (newKey.assignedOrderId) newlyDiscoveredOrderIds.add(newKey.assignedOrderId);
            this.syncDigitalKey(newKey).catch(() => {});
          }
        }
      }

      // 5. Merge Orders from Firestore & Edge Worker
      for (const doc of fsOrdersDocs) {
        const ord = this.parseFirestoreOrderDoc(doc);
        if (!ord) continue;
        if (!db.orders.some(o => o.id === ord.id)) {
          db.orders.unshift(ord);
          dbChanged = true;
        }
      }

      if (Array.isArray(edgeState?.orders)) {
        for (const eo of edgeState.orders) {
          if (!eo || !eo.id) continue;
          if (!db.orders.some(o => o.id === eo.id)) {
            const owner = this.findLocalOwner(eo.userId, eo.userEmail, eo.apiKey);
            const isApi = eo.purchaseSource === 'API' || String(eo.id).startsWith('API-ORD-') || String(eo.id).startsWith('ORD-EXT-');
            const newOrder: Order = {
              id: eo.id,
              userId: owner?.id || eo.userId,
              userEmail: (owner?.email || eo.userEmail || '').toLowerCase(),
              apiKey: owner?.apiKey || eo.apiKey || '',
              productId: eo.productId || 'PROD-499177',
              variantId: eo.variantId || 'VAR-499189',
              productName: eo.productName || 'BGMI LOADER PRO V2',
              durationLabel: eo.durationLabel || '1 Day',
              pricePaid: Number(eo.pricePaid) || 50,
              deliveredKeyId: eo.deliveredKeyId || eo.id,
              deliveredKeyCode: eo.deliveredKeyCode || '',
              status: eo.status || 'COMPLETED',
              purchaseSource: isApi ? 'API' : 'WEB',
              purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
              createdAt: eo.createdAt || new Date().toISOString(),
            };
            db.orders.unshift(newOrder);
            dbChanged = true;
            this.syncOrder(newOrder).catch(() => {});
          }
        }
      }

      // 6. Ensure every assigned key in db.digitalKeys has a corresponding Order & Transaction
      for (const k of db.digitalKeys) {
        if (!k.assignedOrderId || !k.assignedUserId) continue;
        const owner = this.findLocalOwner(k.assignedUserId, k.assignedUserEmail, k.assignedApiKey);
        const resolvedUserId = owner?.id || k.assignedUserId;
        const resolvedEmail = (owner?.email || k.assignedUserEmail || '').toLowerCase();
        const resolvedApiKey = owner?.apiKey || k.assignedApiKey || '';

        if (owner && k.assignedUserId !== owner.id) {
          if (!k.assignedUserEmail) k.assignedUserEmail = resolvedEmail;
          if (!k.assignedApiKey) k.assignedApiKey = resolvedApiKey;
          dbChanged = true;
        }

        const hasOrder = db.orders.some(o => o.id === k.assignedOrderId || o.deliveredKeyId === k.id);
        if (!hasOrder) {
          const variant = db.productVariants.find(v => v.id === k.variantId);
          const inferredPrice = Number(variant?.price || (k.productId?.includes('BGMI') ? 150 : 50));
          const isApi = k.purchaseSource === 'API' || String(k.assignedOrderId).startsWith('API-ORD-') || String(k.id).includes('API');
          const reconstructedOrder: Order = {
            id: k.assignedOrderId,
            userId: resolvedUserId,
            userEmail: resolvedEmail,
            apiKey: resolvedApiKey,
            productId: k.productId,
            variantId: k.variantId || 'VAR-499189',
            productName: k.productName || 'VIP Gaming Panel',
            durationLabel: k.durationLabel || '1 Day',
            pricePaid: inferredPrice,
            deliveredKeyId: k.id,
            deliveredKeyCode: k.keyCode,
            status: 'COMPLETED',
            purchaseSource: isApi ? 'API' : 'WEB',
            purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
            createdAt: k.assignedAt || k.createdAt || new Date().toISOString(),
          };
          db.orders.unshift(reconstructedOrder);
          dbChanged = true;
        }

        const hasTx = db.transactions.some(t => t.referenceId === k.assignedOrderId);
        if (!hasTx) {
          const matchingOrder = db.orders.find(o => o.id === k.assignedOrderId);
          const amt = Number(matchingOrder?.pricePaid || 50);
          const isApi = k.purchaseSource === 'API' || String(k.assignedOrderId).startsWith('API-ORD-');
          const reconstructedTx: Transaction = {
            id: `TXN-${k.assignedOrderId}`,
            userId: resolvedUserId,
            userEmail: resolvedEmail,
            apiKey: resolvedApiKey,
            type: 'PURCHASE',
            amount: -Math.abs(amt),
            description: `[${isApi ? 'Buy from API' : 'Buy from Website'}] Key Purchase: ${k.productName || 'Gaming Key'} (${k.durationLabel || '1 Day'}) - Key: ${k.keyCode}`,
            referenceId: k.assignedOrderId,
            purchaseSource: isApi ? 'API' : 'WEB',
            purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
            status: 'SUCCESS',
            createdAt: k.assignedAt || k.createdAt || new Date().toISOString(),
          };
          db.transactions.unshift(reconstructedTx);
          dbChanged = true;
        }
      }

      if (dbChanged) {
        db.saveSync();
      }
    } catch (err) {
      console.warn('[FirestoreSync] pullAndMergeExternalState notice:', err);
    } finally {
      this.isPulling = false;
    }
  }

  private static findLocalOwner(userId?: string, email?: string, apiKey?: string): User | undefined {
    const cleanId = (userId || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanKey = (apiKey || '').trim();

    if (
      cleanId === 'USR-KALAM-172010' ||
      cleanId === 'tnqy7LYfgwgzYpoQGqljC4H6bKc2' ||
      cleanEmail === 'kalam172010@gmail.com' ||
      cleanKey === 'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7'
    ) {
      const adminUser = db.users.find(
        u =>
          u.email.toLowerCase() === 'kalam172010@gmail.com' ||
          u.id === 'tnqy7LYfgwgzYpoQGqljC4H6bKc2' ||
          u.id === 'USR-KALAM-172010'
      );
      if (adminUser) return adminUser;
    }

    return db.users.find(
      u =>
        (cleanId && (u.id === cleanId || u.firebaseUid === cleanId)) ||
        (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
        (cleanKey && u.apiKey && u.apiKey.trim() === cleanKey)
    );
  }

  /**
   * Search Firestore for a user whose apiKey matches the provided key
   */
  public static async findUserByApiKey(apiKey: string): Promise<User | null> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) return null;

    try {
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
          limit: 5,
        },
      };

      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody),
      });

      if (!res.ok) {
        return await this.fallbackScanUsersForApiKey(cleanKey);
      }

      const results = (await res.json()) as any[];
      const matchingUsers: User[] = [];
      if (Array.isArray(results)) {
        for (const item of results) {
          if (item?.document) {
            const parsed = this.parseFirestoreUserDoc(item.document);
            if (parsed) matchingUsers.push(parsed);
          }
        }
      }

      if (matchingUsers.length > 0) {
        // If multiple linked user docs exist for the same API key, use the minimum (most recently deducted) balance
        const minBal = Math.min(...matchingUsers.map(u => u.balance));
        const primary = matchingUsers[0];
        primary.balance = minBal;
        return primary;
      }

      return await this.fallbackScanUsersForApiKey(cleanKey);
    } catch (err) {
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
      const matching: User[] = [];
      for (const d of docs) {
        const u = this.parseFirestoreUserDoc(d);
        if (u && u.apiKey && u.apiKey.trim() === cleanKey) {
          matching.push(u);
        }
      }
      if (matching.length > 0) {
        const minBal = Math.min(...matching.map(u => u.balance));
        matching[0].balance = minBal;
        return matching[0];
      }
    } catch {}
    return null;
  }

  public static parseFirestoreProductDoc(doc: any): Product | null {
    if (!doc || !doc.fields) return null;
    const f = doc.fields;
    const docPath = doc.name || '';
    const docId = docPath.split('/').pop() || '';
    const id = f.id?.stringValue || docId;
    if (!id) return null;
    return {
      id,
      name: f.name?.stringValue || 'Gaming Panel',
      game: f.game?.stringValue || f.category?.stringValue || 'FREEFIRE',
      description: f.description?.stringValue || '',
      category: f.category?.stringValue || 'FREEFIRE',
      badge: f.badge?.stringValue || undefined,
      imageUrl: f.imageUrl?.stringValue || undefined,
      features: Array.isArray(f.features?.arrayValue?.values)
        ? f.features.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean)
        : undefined,
      deviceType: f.deviceType?.stringValue || undefined,
      updateFileUrl: f.updateFileUrl?.stringValue || undefined,
      videoUrl: f.videoUrl?.stringValue || undefined,
      externalPid: f.externalPid?.stringValue || undefined,
      isActive: f.isActive?.booleanValue !== false,
      isUnderMaintenance: Boolean(f.isUnderMaintenance?.booleanValue),
      maintenanceNotice: f.maintenanceNotice?.stringValue || undefined,
      createdAt: f.createdAt?.stringValue || new Date().toISOString(),
    };
  }

  public static parseFirestoreVariantDoc(doc: any): ProductVariant | null {
    if (!doc || !doc.fields) return null;
    const f = doc.fields;
    const docPath = doc.name || '';
    const docId = docPath.split('/').pop() || '';
    const id = f.id?.stringValue || docId;
    if (!id) return null;
    return {
      id,
      productId: f.productId?.stringValue || '',
      durationLabel: f.durationLabel?.stringValue || '1 Day',
      durationHours: typeof f.durationHours?.doubleValue === 'number'
        ? f.durationHours.doubleValue
        : parseInt(f.durationHours?.integerValue || '24', 10),
      price: typeof f.price?.doubleValue === 'number'
        ? f.price.doubleValue
        : parseInt(f.price?.integerValue || '50', 10),
      resellerPrice: typeof f.resellerPrice?.doubleValue === 'number'
        ? f.resellerPrice.doubleValue
        : parseInt(f.resellerPrice?.integerValue || '38', 10),
      stockCount: typeof f.stockCount?.integerValue === 'string'
        ? parseInt(f.stockCount.integerValue, 10)
        : Number(f.stockCount?.doubleValue || 15),
      externalPid: f.externalPid?.stringValue || undefined,
      externalDuration: f.externalDuration?.stringValue || undefined,
      isActive: f.isActive?.booleanValue !== false,
    };
  }

  public static async syncProduct(product: Product, variants?: ProductVariant[]): Promise<void> {
    try {
      const patchUrl = `${FIRESTORE_BASE}/products/${encodeURIComponent(product.id)}?key=${API_KEY}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: product.id },
            name: { stringValue: product.name },
            game: { stringValue: product.game },
            description: { stringValue: product.description || '' },
            category: { stringValue: product.category || 'FREEFIRE' },
            badge: { stringValue: product.badge || '' },
            imageUrl: { stringValue: product.imageUrl || '' },
            deviceType: { stringValue: product.deviceType || 'NONROOT' },
            updateFileUrl: { stringValue: product.updateFileUrl || '' },
            videoUrl: { stringValue: product.videoUrl || '' },
            externalPid: { stringValue: product.externalPid || '' },
            isActive: { booleanValue: product.isActive !== false },
            isUnderMaintenance: { booleanValue: Boolean(product.isUnderMaintenance) },
            maintenanceNotice: { stringValue: product.maintenanceNotice || '' },
            createdAt: { stringValue: product.createdAt || new Date().toISOString() },
          },
        }),
      });

      const varsToSync = variants || db.productVariants.filter(v => v.productId === product.id);
      for (const v of varsToSync) {
        await this.syncVariant(v);
      }

      const allProdsWithVars = db.products.map(p => ({
        ...p,
        variants: db.productVariants.filter(v => v.productId === p.id),
      }));
      fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: allProdsWithVars }),
      }).catch(() => {});
    } catch (err) {
      console.warn('[FirestoreSync] Failed to sync product to Firestore:', err);
    }
  }

  public static async deleteProductSync(productId: string): Promise<void> {
    try {
      const deleteUrl = `${FIRESTORE_BASE}/products/${encodeURIComponent(productId)}?key=${API_KEY}`;
      await fetch(deleteUrl, { method: 'DELETE' });

      const relatedVars = db.productVariants.filter(v => v.productId === productId);
      for (const v of relatedVars) {
        const varDeleteUrl = `${FIRESTORE_BASE}/productVariants/${encodeURIComponent(v.id)}?key=${API_KEY}`;
        await fetch(varDeleteUrl, { method: 'DELETE' }).catch(() => {});
      }

      const allProdsWithVars = db.products.map(p => ({
        ...p,
        variants: db.productVariants.filter(v => v.productId === p.id),
      }));
      fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: allProdsWithVars }),
      }).catch(() => {});
    } catch (err) {
      console.warn('[FirestoreSync] Failed to delete product from Firestore:', err);
    }
  }

  public static async syncVariant(variant: ProductVariant): Promise<void> {
    try {
      const patchUrl = `${FIRESTORE_BASE}/productVariants/${encodeURIComponent(variant.id)}?key=${API_KEY}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: variant.id },
            productId: { stringValue: variant.productId },
            durationLabel: { stringValue: variant.durationLabel },
            durationHours: { doubleValue: Number(variant.durationHours || 24) },
            price: { doubleValue: Number(variant.price || 50) },
            resellerPrice: { doubleValue: Number(variant.resellerPrice || 38) },
            stockCount: { integerValue: String(variant.stockCount ?? 15) },
            externalPid: { stringValue: variant.externalPid || '' },
            externalDuration: { stringValue: variant.externalDuration || '' },
            isActive: { booleanValue: variant.isActive !== false },
          },
        }),
      });

      const allProdsWithVars = db.products.map(p => ({
        ...p,
        variants: db.productVariants.filter(v => v.productId === p.id),
      }));
      fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: allProdsWithVars }),
      }).catch(() => {});
    } catch (err) {
      console.warn('[FirestoreSync] Failed to sync variant to Firestore:', err);
    }
  }

  public static async deleteVariantSync(variantId: string): Promise<void> {
    try {
      const deleteUrl = `${FIRESTORE_BASE}/productVariants/${encodeURIComponent(variantId)}?key=${API_KEY}`;
      await fetch(deleteUrl, { method: 'DELETE' });

      const allProdsWithVars = db.products.map(p => ({
        ...p,
        variants: db.productVariants.filter(v => v.productId === p.id),
      }));
      fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: allProdsWithVars }),
      }).catch(() => {});
    } catch (err) {
      console.warn('[FirestoreSync] Failed to delete variant from Firestore:', err);
    }
  }

  public static parseFirestoreUserDoc(doc: any): User | null {
    if (!doc || !doc.fields) return null;
    const fields = doc.fields;
    const docPath = doc.name || '';
    const docId = docPath.split('/').pop() || '';
    const id = fields.id?.stringValue || docId || `USR-${Date.now()}`;
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
      firebaseUid: docId && docId !== id ? docId : fields.firebaseUid?.stringValue || undefined,
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

  public static parseFirestoreKeyDoc(doc: any): DigitalKey | null {
    if (!doc || !doc.fields) return null;
    const f = doc.fields;
    const docId = (doc.name || '').split('/').pop() || '';
    const id = f.id?.stringValue || docId;
    const keyCode = f.keyCode?.stringValue || '';
    if (!keyCode) return null;

    const assignedUserId = f.assignedUserId?.stringValue || '';
    const assignedUserEmail = (f.assignedUserEmail?.stringValue || '').toLowerCase();
    const assignedApiKey = f.assignedApiKey?.stringValue || '';
    const owner = this.findLocalOwner(assignedUserId, assignedUserEmail, assignedApiKey);

    const assignedOrderId = f.assignedOrderId?.stringValue || '';
    const isApi =
      f.purchaseSource?.stringValue === 'API' ||
      assignedOrderId.startsWith('API-ORD-') ||
      assignedOrderId.startsWith('ORD-EXT-') ||
      id.includes('API') ||
      id.includes('EXT');

    return {
      id,
      productId: f.productId?.stringValue || 'PROD-499177',
      variantId: f.variantId?.stringValue || 'VAR-499189',
      productName: f.productName?.stringValue || 'Gaming Digital Key',
      gameName: f.gameName?.stringValue || 'FREEFIRE',
      durationLabel: f.durationLabel?.stringValue || '1 Day',
      keyCode,
      isUsed: Boolean(f.isUsed?.booleanValue),
      status: (f.status?.stringValue as any) || 'ACTIVE',
      assignedUserId: owner?.id || assignedUserId,
      assignedUserEmail: owner?.email?.toLowerCase() || assignedUserEmail,
      assignedApiKey: owner?.apiKey || assignedApiKey,
      assignedOrderId,
      assignedAt: f.assignedAt?.stringValue || f.createdAt?.stringValue || new Date().toISOString(),
      expiresAt: f.expiresAt?.stringValue || undefined,
      purchaseSource: isApi ? 'API' : 'WEB',
      purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
      createdAt: f.createdAt?.stringValue || new Date().toISOString(),
    };
  }

  public static parseFirestoreOrderDoc(doc: any): Order | null {
    if (!doc || !doc.fields) return null;
    const f = doc.fields;
    const docId = (doc.name || '').split('/').pop() || '';
    const id = f.id?.stringValue || docId;
    if (!id) return null;

    const rawUserId = f.userId?.stringValue || '';
    const rawEmail = (f.userEmail?.stringValue || '').toLowerCase();
    const rawApiKey = f.apiKey?.stringValue || '';
    const owner = this.findLocalOwner(rawUserId, rawEmail, rawApiKey);

    const pricePaid =
      typeof f.pricePaid?.doubleValue === 'number'
        ? f.pricePaid.doubleValue
        : typeof f.pricePaid?.integerValue === 'string'
        ? parseInt(f.pricePaid.integerValue, 10)
        : Number(f.pricePaid?.doubleValue || 50);

    const isApi =
      f.purchaseSource?.stringValue === 'API' ||
      id.startsWith('API-ORD-') ||
      id.startsWith('ORD-EXT-');

    return {
      id,
      userId: owner?.id || rawUserId,
      userEmail: owner?.email?.toLowerCase() || rawEmail,
      apiKey: owner?.apiKey || rawApiKey,
      productId: f.productId?.stringValue || 'PROD-499177',
      variantId: f.variantId?.stringValue || 'VAR-499189',
      productName: f.productName?.stringValue || 'Gaming Digital Key',
      durationLabel: f.durationLabel?.stringValue || '1 Day',
      pricePaid,
      deliveredKeyId: f.deliveredKeyId?.stringValue || id,
      deliveredKeyCode: f.deliveredKeyCode?.stringValue || '',
      status: (f.status?.stringValue as any) || 'COMPLETED',
      purchaseSource: isApi ? 'API' : 'WEB',
      purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
      createdAt: f.createdAt?.stringValue || new Date().toISOString(),
    };
  }

  /**
   * Fetch the authoritative user balance across all linked Firestore user documents
   * (user.id, user.firebaseUid, USR-KALAM-172010, and matching apiKey).
   */
  public static async getAuthoritativeBalance(user: User): Promise<number> {
    await this.pullAndMergeExternalState(false);

    const candidateIds = this.getLinkedUserIds(user);
    const balances: number[] = [];

    await Promise.all(
      candidateIds.map(async cid => {
        try {
          const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(cid)}?key=${API_KEY}`;
          const res = await fetch(url);
          if (res.ok) {
            const docData: any = await res.json();
            if (docData?.fields?.balance !== undefined) {
              const fsBal =
                typeof docData.fields.balance.doubleValue === 'number'
                  ? docData.fields.balance.doubleValue
                  : typeof docData.fields.balance.integerValue === 'string'
                  ? parseInt(docData.fields.balance.integerValue, 10)
                  : Number(docData.fields.balance.doubleValue || 0);
              if (!Number.isNaN(fsBal)) {
                balances.push(Math.max(0, Math.round(fsBal * 100) / 100));
              }
            }
          }
        } catch {}
      })
    );

    if (balances.length > 0) {
      return Math.min(...balances);
    }

    if (user.apiKey) {
      try {
        const fsUser = await this.findUserByApiKey(user.apiKey);
        if (fsUser && typeof fsUser.balance === 'number' && !Number.isNaN(fsUser.balance)) {
          return Math.max(0, Math.round(fsUser.balance * 100) / 100);
        }
      } catch {}
    }

    return Math.max(0, Math.round((user.balance || 0) * 100) / 100);
  }

  /**
   * Fetch the authoritative user role across all linked Firestore user documents
   */
  public static async getAuthoritativeRole(user: User): Promise<UserRole | null> {
    const candidateIds = this.getLinkedUserIds(user);
    const roleRank: Record<string, number> = {
      'SUPER ADMIN': 4,
      ADMIN: 3,
      RESELLER: 2,
      USER: 1,
    };
    let highestRole: UserRole = user.role || 'USER';

    await Promise.all(
      candidateIds.map(async cid => {
        try {
          const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(cid)}?key=${API_KEY}`;
          const res = await fetch(url);
          if (res.ok) {
            const docData: any = await res.json();
            const r = docData?.fields?.role?.stringValue as UserRole | undefined;
            if (r && (roleRank[r] || 1) > (roleRank[highestRole] || 1)) {
              highestRole = r;
            }
          }
        } catch {}
      })
    );

    return highestRole;
  }

  private static buildFullUserFields(docId: string, user: User | undefined, balanceOverride?: number, apiKeyOverride?: string) {
    const bal = balanceOverride !== undefined ? balanceOverride : (user?.balance ?? 0);
    const key = apiKeyOverride !== undefined ? apiKeyOverride : (user?.apiKey || '');
    const nowIso = new Date().toISOString();
    return {
      id: { stringValue: docId },
      username: { stringValue: user?.username || 'user' },
      email: { stringValue: (user?.email || '').toLowerCase() },
      role: { stringValue: user?.role || 'USER' },
      balance: { doubleValue: Math.max(0, Number(bal)) },
      apiKey: { stringValue: key },
      referralCode: { stringValue: user?.referralCode || `NX${docId.slice(0, 4).toUpperCase()}` },
      isBanned: { booleanValue: Boolean(user?.isBanned) },
      twoFactorEnabled: { booleanValue: Boolean(user?.twoFactorEnabled) },
      createdAt: { stringValue: user?.createdAt || nowIso },
      updatedAt: { stringValue: nowIso },
    };
  }

  /**
   * Sync user's balance to Firestore across ALL linked user document IDs AND push to Edge Worker
   */
  public static async syncUserBalance(userId: string, newBalance: number): Promise<void> {
    try {
      const user = db.users.find(u => u.id === userId || u.firebaseUid === userId);
      const userIdsToSync = new Set<string>(this.getLinkedUserIds(user, userId));

      await Promise.all(
        Array.from(userIdsToSync).map(async id => {
          const patchUrl = `${FIRESTORE_BASE}/users/${encodeURIComponent(id)}?key=${API_KEY}`;
          await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: this.buildFullUserFields(id, user, newBalance, user?.apiKey),
            }),
          }).catch(() => {});
        })
      );

      // Push updated balance to Edge Worker (/api/sync/state) with forceBalanceSync: true
      if (user) {
        const payloadUsers = Array.from(userIdsToSync).map(id => ({
          id,
          username: user.username,
          email: user.email,
          role: user.role,
          balance: newBalance,
          apiKey: user.apiKey,
          referralCode: user.referralCode,
          twoFactorEnabled: user.twoFactorEnabled,
          isBanned: user.isBanned,
        }));
        fetch(EDGE_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: payloadUsers, forceBalanceSync: true }),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[FirestoreSync] Failed to sync balance to Firestore:', err);
    }
  }

  /**
   * Sync complete user profile (role, balance, status, apiKey) to Firestore across ALL linked document IDs AND push to Edge Worker
   */
  public static async syncUserProfile(user: User): Promise<void> {
    try {
      const userIdsToSync = new Set<string>(this.getLinkedUserIds(user, user.id));

      await Promise.all(
        Array.from(userIdsToSync).map(async id => {
          const patchUrl = `${FIRESTORE_BASE}/users/${encodeURIComponent(id)}?key=${API_KEY}`;
          await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: this.buildFullUserFields(id, user, user.balance, user.apiKey),
            }),
          }).catch(() => {});
        })
      );

      const payloadUsers = Array.from(userIdsToSync).map(id => ({
        id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        apiKey: user.apiKey,
        referralCode: user.referralCode,
        twoFactorEnabled: user.twoFactorEnabled,
        isBanned: user.isBanned,
      }));

      fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: payloadUsers, forceBalanceSync: true }),
      }).catch(() => {});
    } catch (err) {
      console.warn('[FirestoreSync] Failed to sync user profile to Firestore:', err);
    }
  }

  /**
   * Sync newly purchased digital key directly into Firestore digitalKeys collection with full details
   */
  public static async syncDigitalKey(key: DigitalKey): Promise<void> {
    try {
      const product = db.products.find(p => p.id === key.productId);
      const variant = db.productVariants.find(v => v.id === key.variantId);
      const owner = this.findLocalOwner(key.assignedUserId, key.assignedUserEmail, key.assignedApiKey);
      const productName = key.productName || product?.name || 'Gaming Digital Key';
      const gameName = key.gameName || product?.game || 'FREEFIRE';
      const durationLabel = key.durationLabel || variant?.durationLabel || '1 Day';

      const patchUrl = `${FIRESTORE_BASE}/digitalKeys/${encodeURIComponent(key.id)}?key=${API_KEY}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: key.id },
            productId: { stringValue: key.productId },
            variantId: { stringValue: key.variantId || '' },
            productName: { stringValue: productName },
            gameName: { stringValue: gameName },
            durationLabel: { stringValue: durationLabel },
            keyCode: { stringValue: key.keyCode },
            isUsed: { booleanValue: Boolean(key.isUsed) },
            status: { stringValue: key.status || 'ACTIVE' },
            assignedUserId: { stringValue: owner?.id || key.assignedUserId || '' },
            assignedUserEmail: { stringValue: (key.assignedUserEmail || owner?.email || '').toLowerCase() },
            assignedApiKey: { stringValue: key.assignedApiKey || owner?.apiKey || '' },
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
      const owner = this.findLocalOwner(order.userId, order.userEmail, order.apiKey);
      const patchUrl = `${FIRESTORE_BASE}/orders/${encodeURIComponent(order.id)}?key=${API_KEY}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: order.id },
            userId: { stringValue: owner?.id || order.userId },
            userEmail: { stringValue: (order.userEmail || owner?.email || '').toLowerCase() },
            apiKey: { stringValue: order.apiKey || owner?.apiKey || '' },
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
   * Sync debit/credit Transaction into Firestore transactions collection
   */
  public static async syncTransaction(tx: Transaction): Promise<void> {
    try {
      const owner = this.findLocalOwner(tx.userId, tx.userEmail, tx.apiKey);
      const ruleCompatibleType = tx.type === 'PURCHASE' ? 'DEBIT' : (tx.type === 'DEPOSIT' ? 'CREDIT' : tx.type);
      const patchUrl = `${FIRESTORE_BASE}/transactions/${encodeURIComponent(tx.id)}?key=${API_KEY}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: tx.id },
            userId: { stringValue: owner?.id || tx.userId },
            userEmail: { stringValue: (tx.userEmail || owner?.email || '').toLowerCase() },
            apiKey: { stringValue: tx.apiKey || owner?.apiKey || '' },
            type: { stringValue: ruleCompatibleType },
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
   * Update or ensure user document in Firestore & Edge Worker has their current apiKey and full user profile
   */
  public static async syncUserApiKey(userId: string, apiKey: string): Promise<void> {
    try {
      const user = db.users.find(u => u.id === userId || u.firebaseUid === userId);
      const userIdsToSync = new Set<string>(this.getLinkedUserIds(user, userId));

      await Promise.all(
        Array.from(userIdsToSync).map(async id => {
          const patchUrl = `${FIRESTORE_BASE}/users/${encodeURIComponent(id)}?key=${API_KEY}`;
          await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: this.buildFullUserFields(id, user, user?.balance, apiKey),
            }),
          }).catch(() => {});
        })
      );

      if (user) {
        const payloadUsers = Array.from(userIdsToSync).map(id => ({
          id,
          username: user.username,
          email: user.email,
          role: user.role,
          balance: user.balance,
          apiKey,
          referralCode: user.referralCode,
          twoFactorEnabled: user.twoFactorEnabled,
          isBanned: user.isBanned,
        }));
        fetch(EDGE_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: payloadUsers, forceBalanceSync: true }),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[FirestoreSync] Failed to update user apiKey in Firestore:', err);
    }
  }

  /**
   * Executes an ATOMIC Firestore transaction (:commit batch write) that simultaneously:
   * 1. Deducts the product price from the specific user's balance across all linked IDs
   * 2. Writes the newly issued digital key document into digitalKeys
   * 3. Records the purchase order document in orders
   * 4. Records the purchase debit record in transactions
   */
  public static async commitAtomicKeyPurchase(params: {
    userId: string;
    newBalance: number;
    keyObjects: DigitalKey[];
    order: Order;
    transaction: Transaction;
  }): Promise<boolean> {
    const { userId, newBalance, keyObjects, order, transaction } = params;
    const commitUrl = `${FIRESTORE_BASE}:commit?key=${API_KEY}`;

    const writes: any[] = [];

    const user = db.users.find(u => u.id === userId || u.firebaseUid === userId);
    const userIdsToSync = new Set<string>(this.getLinkedUserIds(user, userId));

    for (const uid of userIdsToSync) {
      writes.push({
        update: {
          name: `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/users/${encodeURIComponent(uid)}`,
          fields: this.buildFullUserFields(uid, user, newBalance, user?.apiKey),
        },
      });
    }

    const ownerEmail = (user?.email || order.userEmail || '').toLowerCase();
    const ownerApiKey = user?.apiKey || order.apiKey || '';

    for (const key of keyObjects) {
      const product = db.products.find(p => p.id === key.productId);
      const variant = db.productVariants.find(v => v.id === key.variantId);
      writes.push({
        update: {
          name: `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/digitalKeys/${encodeURIComponent(key.id)}`,
          fields: {
            id: { stringValue: key.id },
            productId: { stringValue: key.productId },
            variantId: { stringValue: key.variantId || '' },
            productName: { stringValue: key.productName || product?.name || 'Gaming Digital Key' },
            gameName: { stringValue: key.gameName || product?.game || 'FREEFIRE' },
            durationLabel: { stringValue: key.durationLabel || variant?.durationLabel || '1 Day' },
            keyCode: { stringValue: key.keyCode },
            isUsed: { booleanValue: Boolean(key.isUsed) },
            status: { stringValue: key.status || 'ACTIVE' },
            assignedUserId: { stringValue: key.assignedUserId || userId },
            assignedUserEmail: { stringValue: (key.assignedUserEmail || ownerEmail).toLowerCase() },
            assignedApiKey: { stringValue: key.assignedApiKey || ownerApiKey },
            assignedOrderId: { stringValue: key.assignedOrderId || order.id },
            assignedAt: { stringValue: key.assignedAt || new Date().toISOString() },
            expiresAt: { stringValue: key.expiresAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString() },
            purchaseSource: { stringValue: key.purchaseSource || 'API' },
            purchaseSourceLabel: { stringValue: key.purchaseSourceLabel || 'Buy from API' },
            createdAt: { stringValue: key.createdAt || new Date().toISOString() },
          },
        },
      });
    }

    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/orders/${encodeURIComponent(order.id)}`,
        fields: {
          id: { stringValue: order.id },
          userId: { stringValue: order.userId },
          userEmail: { stringValue: (order.userEmail || ownerEmail).toLowerCase() },
          apiKey: { stringValue: order.apiKey || ownerApiKey },
          productId: { stringValue: order.productId },
          variantId: { stringValue: order.variantId },
          productName: { stringValue: order.productName },
          durationLabel: { stringValue: order.durationLabel },
          pricePaid: { doubleValue: Number(order.pricePaid) },
          deliveredKeyId: { stringValue: order.deliveredKeyId || order.id },
          deliveredKeyCode: { stringValue: order.deliveredKeyCode || '' },
          status: { stringValue: order.status || 'COMPLETED' },
          purchaseSource: { stringValue: order.purchaseSource || 'API' },
          purchaseSourceLabel: { stringValue: order.purchaseSourceLabel || 'Buy from API' },
          createdAt: { stringValue: order.createdAt || new Date().toISOString() },
        },
      },
    });

    const ruleType = transaction.type === 'PURCHASE' ? 'DEBIT' : (transaction.type === 'DEPOSIT' ? 'CREDIT' : transaction.type);
    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/transactions/${encodeURIComponent(transaction.id)}`,
        fields: {
          id: { stringValue: transaction.id },
          userId: { stringValue: transaction.userId },
          userEmail: { stringValue: (transaction.userEmail || ownerEmail).toLowerCase() },
          apiKey: { stringValue: transaction.apiKey || ownerApiKey },
          type: { stringValue: ruleType },
          amount: { doubleValue: Number(transaction.amount) },
          description: { stringValue: transaction.description },
          referenceId: { stringValue: transaction.referenceId || '' },
          purchaseSource: { stringValue: transaction.purchaseSource || 'API' },
          purchaseSourceLabel: { stringValue: transaction.purchaseSourceLabel || 'Buy from API' },
          createdAt: { stringValue: transaction.createdAt || new Date().toISOString() },
        },
      },
    });

    // Also push balance update to Edge Worker
    if (user) {
      const payloadUsers = Array.from(userIdsToSync).map(id => ({
        id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: newBalance,
        apiKey: user.apiKey,
        referralCode: user.referralCode,
        twoFactorEnabled: user.twoFactorEnabled,
        isBanned: user.isBanned,
      }));
      fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: payloadUsers, forceBalanceSync: true }),
      }).catch(() => {});
    }

    try {
      const res = await fetch(commitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes }),
      });

      if (!res.ok) {
        console.warn('[FirestoreSync] Atomic commit API returned status:', res.status, await res.text());
        return false;
      }
      return true;
    } catch (err) {
      console.error('[FirestoreSync] Error performing atomic commit:', err);
      return false;
    }
  }
}
