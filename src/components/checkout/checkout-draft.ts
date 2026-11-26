import { z } from "zod";
import { currentDeliverySelection } from "@/lib/delivery-selection";
import { cardTypeSchema, paymentMethodSchema } from "@/lib/schemas/order";

const draftSchema = z.object({
  name: z.string().max(80), phone: z.string().max(30), email: z.string().max(120),
  addressSelection: z.string().max(1000).optional(),
  address: z.record(z.string(), z.union([z.string().max(200), z.number().finite()])),
  when: z.enum(["now", "schedule"]), dateKey: z.string().max(32), slotIso: z.string().max(64),
  method: paymentMethodSchema.nullable(), changeFor: z.string().max(40), notes: z.string().max(280),
  cardType: cardTypeSchema.optional(),
  cutlery: z.boolean().optional(),
  deliveryInstructions: z.string().max(280).optional(),
});
export type CheckoutDraft = z.infer<typeof draftSchema>;
const storageKey = (userId: string, slug: string) => `menzu-checkout-draft:${userId}:${slug}`;

export function loadCheckoutDraft(userId: string, slug: string): CheckoutDraft | null {
  try {
    const result = draftSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey(userId, slug)) ?? "null"));
    return result.success ? result.data : null;
  } catch { return null; }
}

export function saveCheckoutDraft(userId: string, slug: string, draft: CheckoutDraft): void {
  try { sessionStorage.setItem(storageKey(userId, slug), JSON.stringify(draftSchema.parse({ ...draft, ...(currentDeliverySelection() ? { addressSelection: currentDeliverySelection() } : {}) }))); } catch { /* Storage blocked: keep the current form in memory. */ }
}

export function clearCheckoutDraft(userId: string, slug: string): void {
  try { sessionStorage.removeItem(storageKey(userId, slug)); } catch { /* Navigation must still succeed. */ }
}

export function canRestoreDraftAddress(draft: CheckoutDraft): boolean {
  return (draft.addressSelection ?? "") === currentDeliverySelection();
}
