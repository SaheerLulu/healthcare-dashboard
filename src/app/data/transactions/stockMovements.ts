import type { StockMovement } from '../types';
import { generateId, randomInt } from '../generators/helpers';
import { purchaseOrders, purchaseOrderLines } from './purchaseOrders';
import { posOrders, posOrderLines } from './posOrders';
import { b2bOrders, b2bOrderLines } from './b2bOrders';
import { salesReturns, salesReturnLines } from './returns';
import { purchaseReturns, purchaseReturnLines } from './returns';

function generateStockMovements(): StockMovement[] {
  const movements: StockMovement[] = [];
  let idx = 1;
  let runningBalance: Record<string, number> = {};

  function getBalance(key: string): number {
    return runningBalance[key] || randomInt(50, 300);
  }

  function updateBalance(key: string, change: number): number {
    const current = getBalance(key);
    const newBal = Math.max(0, current + change);
    runningBalance[key] = newBal;
    return newBal;
  }

  // Purchase IN movements
  for (const po of purchaseOrders) {
    if (po.status === 'Received' || po.status === 'Partial') {
      const poLines = purchaseOrderLines.filter(l => l.purchaseOrderId === po.id);
      for (const line of poLines) {
        if (line.receivedQuantity > 0) {
          const key = `${line.productId}-${po.locationId}`;
          const balAfter = updateBalance(key, line.receivedQuantity);
          movements.push({
            id: generateId('SM', idx++, 5),
            productId: line.productId,
            locationId: po.locationId,
            batchNumber: line.batchNumber,
            movementType: 'IN',
            referenceId: po.id,
            referenceType: 'Purchase',
            quantityChange: line.receivedQuantity,
            balanceAfter: balAfter,
            movementDate: po.actualDeliveryDate || po.orderDate,
            notes: `Purchase received from ${po.supplierId}`,
          });
        }
      }
    }
  }

  // POS Sale OUT movements
  for (const order of posOrders) {
    if (order.status === 'completed') {
      const orderLines = posOrderLines.filter(l => l.posOrderId === order.id);
      for (const line of orderLines) {
        const key = `${line.productId}-${order.locationId}`;
        const balAfter = updateBalance(key, -line.quantity);
        movements.push({
          id: generateId('SM', idx++, 5),
          productId: line.productId,
          locationId: order.locationId,
          batchNumber: line.batchNumber,
          movementType: 'OUT',
          referenceId: order.id,
          referenceType: 'POS Sale',
          quantityChange: -line.quantity,
          balanceAfter: balAfter,
          movementDate: order.orderDate,
          notes: 'POS retail sale',
        });
      }
    }
  }

  // B2B Sale OUT movements
  for (const order of b2bOrders) {
    if (order.status === 'Delivered' || order.status === 'Dispatched') {
      const orderLines = b2bOrderLines.filter(l => l.b2bSalesOrderId === order.id);
      for (const line of orderLines) {
        const key = `${line.productId}-${order.locationId}`;
        const balAfter = updateBalance(key, -line.quantity);
        movements.push({
          id: generateId('SM', idx++, 5),
          productId: line.productId,
          locationId: order.locationId,
          batchNumber: line.batchNumber,
          movementType: 'OUT',
          referenceId: order.id,
          referenceType: 'B2B Sale',
          quantityChange: -line.quantity,
          balanceAfter: balAfter,
          movementDate: order.orderDate,
          notes: `B2B sale to ${order.customerId}`,
        });
      }
    }
  }

  // Sales Return IN movements
  for (const ret of salesReturns) {
    if (ret.status === 'Processed' || ret.status === 'Approved') {
      const retLines = salesReturnLines.filter(l => l.salesReturnId === ret.id);
      for (const line of retLines) {
        if (line.isResaleable) {
          const key = `${line.productId}-${ret.locationId}`;
          const balAfter = updateBalance(key, line.quantity);
          movements.push({
            id: generateId('SM', idx++, 5),
            productId: line.productId,
            locationId: ret.locationId,
            batchNumber: line.batchNumber,
            movementType: 'IN',
            referenceId: ret.id,
            referenceType: 'Sales Return',
            quantityChange: line.quantity,
            balanceAfter: balAfter,
            movementDate: ret.returnDate,
            notes: `Sales return - ${ret.reason}`,
          });
        }
      }
    }
  }

  // Purchase Return OUT movements
  for (const ret of purchaseReturns) {
    if (ret.status === 'Dispatched' || ret.status === 'Credited') {
      const retLines = purchaseReturnLines.filter(l => l.purchaseReturnId === ret.id);
      for (const line of retLines) {
        const key = `${line.productId}-${ret.locationId}`;
        const balAfter = updateBalance(key, -line.quantity);
        movements.push({
          id: generateId('SM', idx++, 5),
          productId: line.productId,
          locationId: ret.locationId,
          batchNumber: line.batchNumber,
          movementType: 'OUT',
          referenceId: ret.id,
          referenceType: 'Purchase Return',
          quantityChange: -line.quantity,
          balanceAfter: balAfter,
          movementDate: ret.returnDate,
          notes: `Purchase return - ${ret.reason}`,
        });
      }
    }
  }

  // Sort by date
  movements.sort((a, b) => a.movementDate.localeCompare(b.movementDate));

  return movements;
}

export const stockMovements = generateStockMovements();
