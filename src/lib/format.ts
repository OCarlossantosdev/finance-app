/**
 * Formata um número como moeda brasileira (BRL).
 * Usa Intl.NumberFormat para garantir consistência em qualquer runtime.
 *
 * @param value  — O valor numérico a ser formatado
 * @param opts   — Opções de formatação
 * @returns      — String formatada (ex: "R$ 1.234,56")
 */
export function formatCurrency(
  value: number,
  opts?: { showSymbol?: boolean; compact?: boolean }
): string {
  const { showSymbol = true, compact = false } = opts ?? {};

  if (compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: showSymbol ? 'currency' : 'decimal',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return formatter.format(value);
  }

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(value);
}
