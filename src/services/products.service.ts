// Products service — commercial offers sold by either a teacher or an
// organization. Unified table backs single classes, credit packs and monthly
// subscriptions. Credit-bearing products (packs, subs) grant N credits to
// the buyer's wallet on purchase, and 1 credit is consumed per booking.

import { supabase } from './supabase/client';
import {
  OwnerRef,
  OwnerType,
  Product,
  ProductEligibility,
  ProductKind,
} from '../types/domain';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

const productCache = new Map<string, Product>();
const eligibilityCache = new Map<string, ProductEligibility>();

function rowToProduct(r: any): Product {
  return {
    id: r.id,
    ownerType: r.owner_type as OwnerType,
    ownerId: r.owner_id,
    name: r.name,
    description: r.description ?? '',
    kind: r.kind as ProductKind,
    price: Number(r.price ?? 0),
    creditsGranted: r.credits_granted ?? undefined,
    billingInterval: r.billing_interval ?? undefined,
    validityDays: r.validity_days ?? undefined,
    active: !!r.active,
    createdAt: r.created_at,
  };
}

function rowToEligibility(r: any): ProductEligibility {
  return {
    id: r.id,
    productId: r.product_id,
    classId: r.class_id ?? undefined,
  };
}

export const productsService = {
  async load(): Promise<void> {
    const [{ data: products, error: e1 }, { data: elig, error: e2 }] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('product_eligibility').select('*'),
    ]);
    if (e1) { console.warn('load products:', e1.message); return; }
    if (e2) { console.warn('load eligibility:', e2.message); return; }
    productCache.clear();
    eligibilityCache.clear();
    (products ?? []).forEach((r: any) => productCache.set(r.id, rowToProduct(r)));
    (elig ?? []).forEach((r: any) => eligibilityCache.set(r.id, rowToEligibility(r)));
    notify();
  },

  getById(id: string): Product | undefined {
    return productCache.get(id);
  },

  listForOwner(owner: OwnerRef, opts?: { onlyActive?: boolean }): Product[] {
    const onlyActive = opts?.onlyActive ?? true;
    return Array.from(productCache.values())
      .filter((p) => p.ownerType === owner.type && p.ownerId === owner.id)
      .filter((p) => (onlyActive ? p.active : true))
      .sort((a, b) => a.price - b.price);
  },

  // Classes covered by a product. Empty array result means "all classes of
  // the owner" (an all-access subscription) — callers should interpret it
  // that way.
  eligibleClassIds(productId: string): string[] {
    return Array.from(eligibilityCache.values())
      .filter((e) => e.productId === productId && e.classId)
      .map((e) => e.classId!);
  },

  // Is the given class covered by this product ? True if the product has no
  // explicit eligibility rows (= all-access) OR the class is listed.
  coversClass(productId: string, classId: string): boolean {
    const eligRows = Array.from(eligibilityCache.values()).filter((e) => e.productId === productId);
    if (eligRows.length === 0) return true;
    return eligRows.some((e) => e.classId === classId);
  },

  async create(input: {
    owner: OwnerRef;
    name: string;
    description?: string;
    kind: ProductKind;
    price: number;
    creditsGranted?: number;
    billingInterval?: 'monthly';
    validityDays?: number;
    eligibleClassIds?: string[]; // empty = all-access
  }): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        owner_type: input.owner.type,
        owner_id: input.owner.id,
        name: input.name,
        description: input.description ?? '',
        kind: input.kind,
        price: input.price,
        credits_granted: input.creditsGranted ?? null,
        billing_interval: input.billingInterval ?? null,
        validity_days: input.validityDays ?? null,
        active: true,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Création produit échouée');

    const product = rowToProduct(data);
    productCache.set(product.id, product);

    // Insert eligibility rows if the caller restricted to some classes.
    if (input.eligibleClassIds && input.eligibleClassIds.length > 0) {
      const rows = input.eligibleClassIds.map((cid) => ({
        product_id: product.id,
        class_id: cid,
      }));
      const { data: eligRows, error: eligErr } = await supabase
        .from('product_eligibility')
        .insert(rows)
        .select();
      if (eligErr) console.warn('eligibility insert:', eligErr.message);
      (eligRows ?? []).forEach((r: any) => eligibilityCache.set(r.id, rowToEligibility(r)));
    }

    notify();
    return product;
  },

  async update(id: string, patch: Partial<Omit<Product, 'id' | 'ownerType' | 'ownerId' | 'createdAt'>>): Promise<void> {
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.kind !== undefined) payload.kind = patch.kind;
    if (patch.price !== undefined) payload.price = patch.price;
    if (patch.creditsGranted !== undefined) payload.credits_granted = patch.creditsGranted;
    if (patch.billingInterval !== undefined) payload.billing_interval = patch.billingInterval;
    if (patch.validityDays !== undefined) payload.validity_days = patch.validityDays;
    if (patch.active !== undefined) payload.active = patch.active;

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Mise à jour produit échouée');
    productCache.set(data.id, rowToProduct(data));
    notify();
  },

  async deactivate(id: string): Promise<void> {
    return this.update(id, { active: false });
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
