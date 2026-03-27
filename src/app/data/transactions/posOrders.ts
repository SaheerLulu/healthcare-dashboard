import type { POSOrder, POSOrderLine } from '../types';
import { generateId, randomInt, randomFloat, randomFromArray, randomDate, randomTime, weightedRandom, round2, randomBatchNumber, random } from '../generators/helpers';
import { products } from '../seed/products';
import { customers } from '../seed/customers';
import { doctors } from '../seed/doctors';
import { locations } from '../seed/locations';

function generatePOSOrders(): { orders: POSOrder[]; lines: POSOrderLine[] } {
  const orders: POSOrder[] = [];
  const lines: POSOrderLine[] = [];
  let orderIdx = 1;
  let lineIdx = 1;

  // Retail locations only (first 5)
  const retailLocations = locations.filter(l => l.type === 'Retail Store');
  // Retail customers (Walk-in + Regular)
  const retailCustomers = customers.filter(c => c.type === 'Walk-in' || c.type === 'Regular');

  const months = [
    '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09',
    '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'
  ];

  for (const month of months) {
    const numOrders = randomInt(75, 95); // ~85 per month = ~1020 total
    for (let o = 0; o < numOrders; o++) {
      const [year, mon] = month.split('-');
      const orderDate = randomDate(`${month}-01`, `${month}-${mon === '02' ? '28' : '30'}`);
      const orderTime = randomTime();
      const location = randomFromArray(retailLocations);
      const customer = randomFromArray(retailCustomers);
      const doctor = random() < 0.6 ? randomFromArray(doctors) : null;

      const paymentMode = weightedRandom<POSOrder['paymentMode']>([
        { value: 'Cash', weight: 40 },
        { value: 'UPI', weight: 30 },
        { value: 'Card', weight: 20 },
        { value: 'Credit', weight: 10 },
      ]);

      const numLines = weightedRandom([
        { value: 1, weight: 20 },
        { value: 2, weight: 30 },
        { value: 3, weight: 25 },
        { value: 4, weight: 15 },
        { value: 5, weight: 10 },
      ]);

      let subtotal = 0;
      let totalGst = 0;
      let totalDiscount = 0;
      const usedProductIds = new Set<string>();
      const orderLines: POSOrderLine[] = [];

      for (let l = 0; l < numLines; l++) {
        let product = randomFromArray(products);
        while (usedProductIds.has(product.id)) product = randomFromArray(products);
        usedProductIds.add(product.id);

        const qty = weightedRandom([
          { value: 1, weight: 40 },
          { value: 2, weight: 25 },
          { value: 3, weight: 15 },
          { value: 4, weight: 10 },
          { value: 5, weight: 5 },
          { value: randomInt(6, 10), weight: 5 },
        ]);

        const sellingPrice = product.mrp; // POS sells at MRP
        const discountPct = random() < 0.3 ? randomFloat(2, 10) : 0;
        const discountAmt = round2(sellingPrice * qty * discountPct / 100);
        // GST is inclusive in MRP for POS
        const taxableValue = round2((sellingPrice * qty - discountAmt) * 100 / (100 + product.gstRate));
        const gstAmt = round2(sellingPrice * qty - discountAmt - taxableValue);
        const lineTotal = round2(sellingPrice * qty - discountAmt);

        subtotal += lineTotal;
        totalGst += gstAmt;
        totalDiscount += discountAmt;

        const batchPrefix = product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');

        orderLines.push({
          id: generateId('POSL', lineIdx++, 5),
          posOrderId: generateId('POS', orderIdx, 5),
          productId: product.id,
          batchNumber: randomBatchNumber(batchPrefix),
          quantity: qty,
          mrp: product.mrp,
          sellingPrice,
          discount: discountPct,
          gstRate: product.gstRate,
          gstAmount: gstAmt,
          lineTotal,
          costPrice: product.purchasePrice,
        });
      }

      lines.push(...orderLines);

      const roundOff = round2(Math.round(subtotal) - subtotal);
      const netAmount = round2(subtotal + roundOff);
      const isCancelled = random() < 0.02; // 2% cancellation rate

      orders.push({
        id: generateId('POS', orderIdx++, 5),
        locationId: location.id,
        customerId: customer.id,
        doctorId: doctor ? doctor.id : '',
        orderDate,
        orderTime,
        subtotal: round2(subtotal),
        discountAmount: round2(totalDiscount),
        gstAmount: round2(totalGst),
        roundOff,
        netAmount,
        paymentMode,
        status: isCancelled ? 'cancelled' : 'completed',
      });
    }
  }

  return { orders, lines };
}

const result = generatePOSOrders();
export const posOrders = result.orders;
export const posOrderLines = result.lines;
