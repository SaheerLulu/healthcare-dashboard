import type { PurchaseOrder, PurchaseOrderLine } from '../types';
import { generateId, randomInt, randomFloat, randomFromArray, randomDate, addDays, weightedRandom, round2, randomBatchNumber, random } from '../generators/helpers';
import { products } from '../seed/products';
import { suppliers } from '../seed/suppliers';
import { locations } from '../seed/locations';

function generatePurchaseOrders(): { orders: PurchaseOrder[]; lines: PurchaseOrderLine[] } {
  const orders: PurchaseOrder[] = [];
  const lines: PurchaseOrderLine[] = [];
  let orderIdx = 1;
  let lineIdx = 1;

  // Generate ~250 POs across 12 months (Apr 2025 - Mar 2026)
  const months = [
    '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09',
    '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'
  ];

  for (const month of months) {
    const numOrders = randomInt(18, 24); // ~20 per month
    for (let o = 0; o < numOrders; o++) {
      const supplier = randomFromArray(suppliers);
      const location = randomFromArray(locations.slice(0, 7)); // not returns center
      const [year, mon] = month.split('-');
      const orderDate = randomDate(`${month}-01`, `${month}-${mon === '02' ? '28' : '30'}`);
      const expectedDelivery = addDays(orderDate, supplier.leadTimeDays);

      // Actual delivery: on time 75%, late 25%
      const lateDays = random() < 0.75 ? randomInt(-2, 2) : randomInt(3, 15);
      const actualDelivery = addDays(expectedDelivery, lateDays);

      // Status distribution
      const status = month === '2026-03'
        ? weightedRandom([
            { value: 'Draft' as const, weight: 10 },
            { value: 'Confirmed' as const, weight: 15 },
            { value: 'Partial' as const, weight: 5 },
            { value: 'Received' as const, weight: 65 },
            { value: 'Cancelled' as const, weight: 5 },
          ])
        : weightedRandom([
            { value: 'Received' as const, weight: 85 },
            { value: 'Cancelled' as const, weight: 5 },
            { value: 'Confirmed' as const, weight: 5 },
            { value: 'Partial' as const, weight: 5 },
          ]);

      // Generate 3-8 line items
      const numLines = randomInt(3, 8);
      const selectedProducts = [];
      const usedProductIds = new Set<string>();
      for (let l = 0; l < numLines; l++) {
        let product = randomFromArray(products);
        while (usedProductIds.has(product.id)) {
          product = randomFromArray(products);
        }
        usedProductIds.add(product.id);
        selectedProducts.push(product);
      }

      let poTotal = 0;
      let poGst = 0;
      let poDiscount = 0;

      const poLines: PurchaseOrderLine[] = selectedProducts.map((product) => {
        const qty = randomInt(10, 200);
        const received = status === 'Received' ? qty : status === 'Partial' ? randomInt(0, qty) : status === 'Cancelled' ? 0 : 0;
        const freeQty = random() < 0.3 ? randomInt(1, Math.max(1, Math.floor(qty * 0.1))) : 0;
        const unitPrice = product.purchasePrice;
        const discountPct = randomFloat(0, 15);
        const discountedPrice = round2(unitPrice * (1 - discountPct / 100));
        const taxableAmount = round2(discountedPrice * qty);
        const gstAmt = round2(taxableAmount * product.gstRate / 100);
        const lineTotal = round2(taxableAmount + gstAmt);

        poTotal += taxableAmount;
        poGst += gstAmt;
        poDiscount += round2(unitPrice * qty * discountPct / 100);

        const batchPrefix = product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const expiryDate = new Date(orderDate);
        expiryDate.setMonth(expiryDate.getMonth() + product.shelfLifeMonths);

        return {
          id: generateId('POL', lineIdx++),
          purchaseOrderId: generateId('PO', orderIdx, 4),
          productId: product.id,
          batchNumber: randomBatchNumber(batchPrefix),
          expiryDate: expiryDate.toISOString().split('T')[0],
          orderedQuantity: qty,
          receivedQuantity: received,
          freeQuantity: freeQty,
          unitPrice,
          discount: discountPct,
          gstRate: product.gstRate,
          gstAmount: gstAmt,
          lineTotal,
        };
      });

      lines.push(...poLines);

      // Payment status
      const paymentStatus = status === 'Cancelled' ? 'Pending' as const :
        status === 'Received' ? weightedRandom([
          { value: 'Paid' as const, weight: 60 },
          { value: 'Partial' as const, weight: 20 },
          { value: 'Pending' as const, weight: 20 },
        ]) : 'Pending' as const;

      orders.push({
        id: generateId('PO', orderIdx++, 4),
        supplierId: supplier.id,
        locationId: location.id,
        orderDate,
        expectedDeliveryDate: expectedDelivery,
        actualDeliveryDate: status === 'Received' || status === 'Partial' ? actualDelivery : '',
        status,
        totalAmount: round2(poTotal),
        gstAmount: round2(poGst),
        netAmount: round2(poTotal + poGst),
        discountAmount: round2(poDiscount),
        invoiceNumber: status !== 'Draft' ? `INV-${supplier.name.substring(0, 3).toUpperCase()}-${String(orderIdx).padStart(5, '0')}` : '',
        paymentStatus,
        paymentDueDate: addDays(orderDate, supplier.creditDays),
      });
    }
  }

  return { orders, lines };
}

const result = generatePurchaseOrders();
export const purchaseOrders = result.orders;
export const purchaseOrderLines = result.lines;
