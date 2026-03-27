import type { DispatchEntry } from '../types';
import { generateId, randomFromArray, randomInt, addDays, weightedRandom } from '../generators/helpers';
import { b2bOrders } from './b2bOrders';
import { customers } from '../seed/customers';

const TRANSPORTERS = [
  'Blue Dart Express', 'DTDC Courier', 'Delhivery', 'Safexpress',
  'Gati KWE', 'Professional Couriers', 'Ecom Express', 'XpressBees'
];

function generateDispatchEntries(): DispatchEntry[] {
  const entries: DispatchEntry[] = [];
  let idx = 1;

  const dispatchableOrders = b2bOrders.filter(o =>
    o.status === 'Dispatched' || o.status === 'Delivered'
  );

  for (const order of dispatchableOrders) {
    const customer = customers.find(c => c.id === order.customerId);
    const dispatchDate = order.orderDate; // dispatch on order date or +1-2 days
    const transporter = randomFromArray(TRANSPORTERS);

    entries.push({
      id: generateId('DSP', idx++, 4),
      b2bSalesOrderId: order.id,
      locationId: order.locationId,
      dispatchDate: addDays(dispatchDate, randomInt(0, 2)),
      transporterName: transporter,
      trackingNumber: `${transporter.substring(0, 2).toUpperCase()}${randomInt(100000000, 999999999)}`,
      status: order.status === 'Delivered' ? 'Delivered' :
        weightedRandom([
          { value: 'Dispatched' as const, weight: 30 },
          { value: 'In Transit' as const, weight: 50 },
          { value: 'Packed' as const, weight: 20 },
        ]),
      deliveryDate: order.status === 'Delivered' ? order.deliveryDate : '',
      customerName: customer?.name || 'Unknown',
      city: customer?.city || '',
    });
  }

  return entries;
}

export const dispatchEntries = generateDispatchEntries();
