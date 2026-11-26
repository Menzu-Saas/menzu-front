import type { QuoteAddress } from "@/components/cart/use-quote";
export function deliveryAddressKey(address: Partial<QuoteAddress>): string {
  return [address.cep?.replace(/\D/g,""), address.street, address.number, address.complement, address.city, address.state]
    .map((value) => (value ?? "").trim().toLocaleLowerCase("pt-BR")).join("|");
}
