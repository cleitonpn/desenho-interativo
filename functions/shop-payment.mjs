import { confirmedPayment } from './shop-validation.mjs';
/** Pure transition, applied inside a Firestore transaction by the webhook. */
export function paymentTransition(order, product, payment, id, now) {
  if (!order) return {};
  if (order.paymentId && String(order.paymentId) !== id) {
    return payment.status === 'approved' ? { alert: { orderId: order.id, paymentId: id, reason: 'Pagamento adicional para o mesmo pedido', created: now } } : {};
  }
  if (['refunded', 'charged_back'].includes(payment.status)) return { order: { status: payment.status === 'refunded' ? 'reembolsado' : 'contestado', paymentId: id, updated: now } };
  if (order.paymentId || !confirmedPayment(payment, order)) return {};
  let status = 'pago', updatedProduct;
  if (!product || (product.estoque != null && product.estoque < order.quantidade)) status = 'pago_revisar_estoque';
  else if (product.estoque != null) {
    const reservas = { ...(product.reservas ?? {}) }; delete reservas[order.id];
    updatedProduct = { estoque: product.estoque - order.quantidade, reservas };
  }
  return { order: { status, paymentId: id, paidAt: now, updated: now }, product: updatedProduct };
}
