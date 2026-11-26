import "server-only";

/**
 * Taxa de pagamento online do Menzu, em pontos-base (350 = 3,5%). Regra comercial definida pelo proprietário.
 * Cobrada em toda venda paga online, fixa para todos os restaurantes. No split do Asaas o percentual
 * incide sobre o valor líquido (netValue), depois das tarifas do gateway.
 */
export const PLATFORM_ONLINE_FEE_BPS = 350;

/** Converte pontos-base no percentual aceito pelo Asaas (`percentualValue`). */
export function onlineFeePercent(bps: number = PLATFORM_ONLINE_FEE_BPS): number {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new RangeError("Taxa inválida.");
  return bps / 100;
}

