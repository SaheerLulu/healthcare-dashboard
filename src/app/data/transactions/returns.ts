import type { SalesReturn, SalesReturnLine, PurchaseReturn, PurchaseReturnLine, ReturnReason } from '../types';
import { generateId, randomInt, randomFromArray, randomDate, addDays, weightedRandom, round2, random, randomBatchNumber } from '../generators/helpers';
import { products } from '../seed/products';
import { locations } from '../seed/locations';
import { posOrders, posOrderLines } from './posOrders';
import { b2bOrders, b2bOrderLines } from './b2bOrders';
import { purchaseOrders, purchaseOrderLines } from './purchaseOrders';
import { suppliers } from '../seed/suppliers';

const RETURN_REASONS: { value: ReturnReason; weight: number }[] = [
  { value: 'Expired', weight: 15 },
  { value: 'Damaged', weight: 20 },
  { value: 'Wrong Product', weight: 15 },
  { value: 'Quality Issue', weight: 15 },
  { value: 'Customer Request', weight: 20 },
  { value: 'Near Expiry', weight: 10 },
  { value: 'Recall', weight: 5 },
];

function generateSalesReturns(): { returns: SalesReturn[]; lines: SalesReturnLine[] } {
  const returns: SalesReturn[] = [];
  const lines: SalesReturnLine[] = [];
  let retIdx = 1;
  let lineIdx = 1;

  // 50 POS returns
  const completedPOS = posOrders.filter(o => o.status === 'completed');
  for (let i = 0; i < 50; i++) {
    const order = randomFromArray(completedPOS);
    const orderLines = posOrderLines.filter(l => l.posOrderId === order.id);
    if (orderLines.length === 0) continue;

    const returnDate = addDays(order.orderDate, randomInt(1, 30));
    const reason = weightedRandom(RETURN_REASONS);
    const status = weightedRandom<SalesReturn['status']>([
      { value: 'Processed', weight: 60 },
      { value: 'Approved', weight: 20 },
      { value: 'Pending', weight: 15 },
      { value: 'Rejected', weight: 5 },
    ]);

    // Return 1-2 lines from the order
    const numReturnLines = randomInt(1, Math.min(2, orderLines.length));
    let totalAmt = 0;
    let totalGst = 0;

    for (let l = 0; l < numReturnLines; l++) {
      const origLine = orderLines[l];
      const returnQty = randomInt(1, origLine.quantity);
      const lineTotal = round2(origLine.sellingPrice * returnQty * (1 - origLine.discount / 100));
      const gstAmt = round2(lineTotal * origLine.gstRate / (100 + origLine.gstRate));
      totalAmt += lineTotal;
      totalGst += gstAmt;

      lines.push({
        id: generateId('SRL', lineIdx++, 4),
        salesReturnId: generateId('SR', retIdx, 4),
        productId: origLine.productId,
        batchNumber: origLine.batchNumber,
        quantity: returnQty,
        unitPrice: origLine.sellingPrice,
        gstRate: origLine.gstRate,
        gstAmount: gstAmt,
        lineTotal,
        isResaleable: reason !== 'Expired' && reason !== 'Damaged' && random() > 0.3,
      });
    }

    returns.push({
      id: generateId('SR', retIdx++, 4),
      originalOrderId: order.id,
      originalOrderType: 'POS',
      customerId: order.customerId,
      locationId: order.locationId,
      returnDate,
      reason,
      status,
      totalAmount: round2(totalAmt),
      gstAmount: round2(totalGst),
      netRefund: round2(totalAmt),
    });
  }

  // 30 B2B returns
  const deliveredB2B = b2bOrders.filter(o => o.status === 'Delivered');
  for (let i = 0; i < 30; i++) {
    const order = randomFromArray(deliveredB2B);
    const orderLines = b2bOrderLines.filter(l => l.b2bSalesOrderId === order.id);
    if (orderLines.length === 0) continue;

    const returnDate = addDays(order.orderDate, randomInt(5, 45));
    const reason = weightedRandom(RETURN_REASONS);
    const status = weightedRandom<SalesReturn['status']>([
      { value: 'Processed', weight: 50 },
      { value: 'Approved', weight: 25 },
      { value: 'Pending', weight: 20 },
      { value: 'Rejected', weight: 5 },
    ]);

    const numReturnLines = randomInt(1, Math.min(3, orderLines.length));
    let totalAmt = 0;
    let totalGst = 0;

    for (let l = 0; l < numReturnLines; l++) {
      const origLine = orderLines[l];
      const returnQty = randomInt(1, Math.min(10, origLine.quantity));
      const taxableAmt = round2(origLine.unitPrice * returnQty * (1 - origLine.discount / 100));
      const gstAmt = round2(taxableAmt * origLine.gstRate / 100);
      const lineTotal = round2(taxableAmt + gstAmt);
      totalAmt += lineTotal;
      totalGst += gstAmt;

      lines.push({
        id: generateId('SRL', lineIdx++, 4),
        salesReturnId: generateId('SR', retIdx, 4),
        productId: origLine.productId,
        batchNumber: origLine.batchNumber,
        quantity: returnQty,
        unitPrice: origLine.unitPrice,
        gstRate: origLine.gstRate,
        gstAmount: gstAmt,
        lineTotal,
        isResaleable: reason !== 'Expired' && reason !== 'Damaged' && random() > 0.3,
      });
    }

    returns.push({
      id: generateId('SR', retIdx++, 4),
      originalOrderId: order.id,
      originalOrderType: 'B2B',
      customerId: order.customerId,
      locationId: order.locationId,
      returnDate,
      reason,
      status,
      totalAmount: round2(totalAmt),
      gstAmount: round2(totalGst),
      netRefund: round2(totalAmt),
    });
  }

  return { returns, lines };
}

function generatePurchaseReturns(): { returns: PurchaseReturn[]; lines: PurchaseReturnLine[] } {
  const returns: PurchaseReturn[] = [];
  const lines: PurchaseReturnLine[] = [];
  let retIdx = 1;
  let lineIdx = 1;

  const receivedPOs = purchaseOrders.filter(o => o.status === 'Received');

  for (let i = 0; i < 40; i++) {
    const po = randomFromArray(receivedPOs);
    const poLines = purchaseOrderLines.filter(l => l.purchaseOrderId === po.id);
    if (poLines.length === 0) continue;

    const returnDate = addDays(po.actualDeliveryDate || po.orderDate, randomInt(1, 15));
    const reason = weightedRandom<ReturnReason>([
      { value: 'Damaged', weight: 30 },
      { value: 'Near Expiry', weight: 25 },
      { value: 'Quality Issue', weight: 20 },
      { value: 'Wrong Product', weight: 15 },
      { value: 'Expired', weight: 10 },
    ]);

    const status = weightedRandom<PurchaseReturn['status']>([
      { value: 'Credited', weight: 50 },
      { value: 'Dispatched', weight: 20 },
      { value: 'Confirmed', weight: 20 },
      { value: 'Draft', weight: 10 },
    ]);

    const numReturnLines = randomInt(1, Math.min(2, poLines.length));
    let totalAmt = 0;
    let totalGst = 0;

    for (let l = 0; l < numReturnLines; l++) {
      const origLine = poLines[l];
      const returnQty = randomInt(1, Math.min(10, origLine.orderedQuantity));
      const taxableAmt = round2(origLine.unitPrice * returnQty);
      const gstAmt = round2(taxableAmt * origLine.gstRate / 100);
      const lineTotal = round2(taxableAmt + gstAmt);
      totalAmt += lineTotal;
      totalGst += gstAmt;

      lines.push({
        id: generateId('PRL', lineIdx++, 4),
        purchaseReturnId: generateId('PR', retIdx, 4),
        productId: origLine.productId,
        batchNumber: origLine.batchNumber,
        quantity: returnQty,
        unitPrice: origLine.unitPrice,
        gstRate: origLine.gstRate,
        gstAmount: gstAmt,
        lineTotal,
      });
    }

    returns.push({
      id: generateId('PR', retIdx++, 4),
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      locationId: po.locationId,
      returnDate,
      reason,
      status,
      totalAmount: round2(totalAmt),
      gstAmount: round2(totalGst),
      creditNoteNumber: status === 'Credited' ? `CN-${String(retIdx).padStart(5, '0')}` : '',
    });
  }

  return { returns, lines };
}

const salesResult = generateSalesReturns();
export const salesReturns = salesResult.returns;
export const salesReturnLines = salesResult.lines;

const purchaseResult = generatePurchaseReturns();
export const purchaseReturns = purchaseResult.returns;
export const purchaseReturnLines = purchaseResult.lines;
