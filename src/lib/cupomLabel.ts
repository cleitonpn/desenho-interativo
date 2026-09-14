/** Campaign fixed discounts are stored in reais, unlike shop prices in cents. */
export function cupomLabel(c: { type: string; value: number }): string {
  if (c.type === 'percent') return Number.isFinite(c.value) ? `${c.value.toLocaleString('pt-BR')}% de desconto` : 'Desconto percentual';
  if (c.type === 'fixed') return Number.isFinite(c.value) ? `${c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto` : 'Desconto em reais';
  return c.type === 'gift' ? 'Brinde' : 'Benefício especial';
}
