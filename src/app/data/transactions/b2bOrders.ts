import type { B2BSalesOrder, B2BSalesOrderLine } from '../types';
import { generateId, randomInt, randomFloat, randomFromArray, randomDate, addDays, weightedRandom, round2, randomBatchNumber, random } from '../generators/helpers';
import { products } from '../seed/products';
import { customers } from '../seed/customers';
import { locations } from '../seed/locations';

function generateB2BOrders(): { orders: B2BSalesOrder[]; lines: B2BSalesOrderLine[] } {
  const orders: B2BSalesOrder[] = [];
  const lines: B2BSalesOrderLine[] = [];
  let orderIdx = 1;
  let lineIdx = 1;

  const b2bCustomers = customers.filter(c => c.type.startsWith('B2B'));
  const months = [
    '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09',
    '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'
  ];

  for (const month of months) {
    const numOrders = randomInt(14, 20);
    for (let o = 0; o < numOrders; o++) {
      const [year, mon] = month.split('-');
      const orderDate = randomDate(`${month}-01`, `${month}-${mon === '02' ? '28' : '30'}`);
      const customer = randomFromArray(b2bCustomers);
      const location = randomFromArray(locations.slice(0, 7));

      // Inter-state for ~25% of orders
      const supplyType = random() < 0.25 ? 'inter' as const : 'intra' as const;

      const status = month === '2026-03'
        ? weightedRandom<B2BSalesOrder['status']>([
            { value: 'Draft', weight: 10 },
            { value: 'Confirmed', weight: 20 },
            { value: 'Dispatched', weight: 15 },
            { value: 'Delivered', weight: 50 },
            { value: 'Cancelled', weight: 5 },
          ])
        : weightedRandom<B2BSalesOrder['status']>([
            { value: 'Delivered', weight: 75 },
            { value: 'Dispatched', weight: 5 },
            { value: 'Confirmed', weight: 5 },
            { value: 'Cancelled', weight: 5 },
            { value: 'Draft', weight: 10 },
          ]);

      const numLines = randomInt(5, 15);
      const usedProductIds = new Set<string>();
      let subtotal = 0;
      let totalGst = 0;
      let totalDiscount = 0;
      const orderLines: B2BSalesOrderLine[] = [];

      for (let l = 0; l < numLines; l++) {
        let product = randomFromArray(products);
        while (usedProductIds.has(product.id)) product = randomFromArray(products);
        usedProductIds.add(product.id);

        const qty = randomInt(10, 100);
        const unitPrice = product.ptr; // B2B sells at PTR
        const discountPct = randomFloat(0, 12);
        const discountAmt = round2(unitPrice * qty * discountPct / 100);
        const taxableAmount = round2(unitPrice * qty - discountAmt);
        const gstAmt = round2(taxableAmount * product.gstRate / 100);
        const lineTotal = round2(taxableAmount + gstAmt);

        subtotal += taxableAmount;
        totalGst += gstAmt;
        totalDiscount += discountAmt;

        const batchPrefix = product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');

        orderLines.push({
          id: generateId('B2BL', lineIdx++, 5),
          b2bSalesOrderId: generateId('B2B', orderIdx, 4),
          productId: product.id,
          batchNumber: randomBatchNumber(batchPrefix),
          quantity: qty,
          unitPrice,
          discount: discountPct,
          gstRate: product.gstRate,
          gstAmount: gstAmt,
          lineTotal,
          costPrice: product.purchasePrice,
        });
      }

      lines.push(...orderLines);

      const paymentStatus = status === 'Cancelled' ? 'Pending' as const :
        status === 'Delivered' ? weightedRandom<B2BSalesOrder['paymentStatus']>([
          { value: 'Paid', weight: 50 },
          { value: 'Partial', weight: 25 },
          { value: 'Pending', weight: 25 },
        ]) : 'Pending' as const;

      const deliveryDate = status === 'Delivered' ? addDays(orderDate, randomInt(3, 10)) : '';

      orders.push({
        id: generateId('B2B', orderIdx, 4),
        customerId: customer.id,
        locationId: location.id,
        orderDate,
        deliveryDate,
        status,
        subtotal: round2(subtotal),
        discountAmount: round2(totalDiscount),
        gstAmount: round2(totalGst),
        netAmount: round2(subtotal + totalGst),
        paymentStatus,
        paymentDueDate: addDays(orderDate, customer.creditDays || 30),
        invoiceNumber: status !== 'Draft' ? `B2B-INV-${String(orderIdx).padStart(5, '0')}` : '',
        supplyType,
      });

      orderIdx++;
    }
  }

  return { orders, lines };
}

const result = generateB2BOrders();
export const b2bOrders = result.orders;
export const b2bOrderLines = result.lines;
