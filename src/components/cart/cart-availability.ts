import type { PublicProduct } from "@/server/queries/public-menu";
import type { CartLine } from "@/stores/cart";

export function cartProductOrderable(product: PublicProduct): boolean {
  return product.available && (!product.variants.length || product.variants.some((variant) => variant.available)) && product.addonGroups.every((group) => group.minSelect <= group.maxSelect && group.options.filter((option) => option.available).reduce((sum, option) => sum + option.maxQuantity, 0) >= group.minSelect);
}

export function cartLineIssue(line: CartLine, product: PublicProduct | undefined): string | null {
  if (!product?.available) return "Indisponível no cardápio atual. Remova ou escolha outro produto.";
  if (product.variants.length || line.variantId) {
    if (!product.variants.some((variant) => variant.id === line.variantId && variant.available)) return "A opção escolhida não está disponível. Edite o produto.";
  }
  const options = new Map(product.addonGroups.flatMap((group) => group.options.map((option) => [option.id, option] as const)));
  if (line.addons.some((addon) => { const option = options.get(addon.optionId); return !option?.available || addon.quantity > option.maxQuantity; })) return "Um adicional mudou ou está indisponível. Edite o produto.";
  for (const group of product.addonGroups) {
    const quantity = line.addons.filter((addon) => group.options.some((option) => option.id === addon.optionId)).reduce((sum, addon) => sum + addon.quantity, 0);
    if (quantity < group.minSelect || quantity > group.maxSelect) return "As opções deste produto mudaram. Revise a personalização.";
  }
  return null;
}
