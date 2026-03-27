import type { StockQuant } from '../types';
import { generateId, randomInt, randomFloat, randomFromArray, randomBatchNumber, randomDate, round2, random } from '../generators/helpers';
import { products } from '../seed/products';
import { locations } from '../seed/locations';

function generateStockQuants(): StockQuant[] {
  const quants: StockQuant[] = [];
  let idx = 1;

  // For each product, create 2-5 stock quants across locations
  for (const product of products) {
    const numQuants = randomInt(2, 5);
    const usedLocations = new Set<string>();

    for (let q = 0; q < numQuants; q++) {
      // Pick a location, prefer retail stores (first 5)
      let loc = randomFromArray(locations);
      // Allow same product at same location with different batches

      const batchPrefix = product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const batchNumber = randomBatchNumber(batchPrefix);

      // Manufacturing date 6-24 months ago
      const mfgDate = randomDate('2024-06-01', '2025-12-01');
      // Expiry = mfg + shelf life
      const expiryDate = new Date(mfgDate);
      expiryDate.setMonth(expiryDate.getMonth() + product.shelfLifeMonths);
      const expiryStr = expiryDate.toISOString().split('T')[0];

      // Most products should have adequate stock, some low, some critical, some zero
      const stockRoll = random();
      let qtyOnHand: number;
      if (stockRoll < 0.05) qtyOnHand = 0; // 5% out of stock
      else if (stockRoll < 0.15) qtyOnHand = randomInt(1, Math.max(1, Math.floor(product.reorderLevel * 0.3))); // 10% critical
      else if (stockRoll < 0.25) qtyOnHand = randomInt(Math.floor(product.reorderLevel * 0.3), product.reorderLevel); // 10% low
      else if (stockRoll < 0.9) qtyOnHand = randomInt(product.reorderLevel, product.maxStock); // 65% adequate
      else qtyOnHand = randomInt(product.maxStock, Math.floor(product.maxStock * 1.5)); // 10% overstocked

      const reserved = qtyOnHand > 10 ? randomInt(0, Math.floor(qtyOnHand * 0.1)) : 0;

      quants.push({
        id: generateId('SQ', idx++),
        productId: product.id,
        locationId: loc.id,
        batchNumber,
        expiryDate: expiryStr,
        manufacturingDate: mfgDate,
        quantityOnHand: qtyOnHand,
        quantityReserved: reserved,
        quantityAvailable: qtyOnHand - reserved,
        purchasePrice: product.purchasePrice,
        mrp: product.mrp,
        landingCost: round2(product.purchasePrice * 1.03), // 3% landing cost
        lastMovementDate: randomDate('2025-12-01', '2026-03-25'),
      });
    }
  }

  return quants;
}

export const stockQuants = generateStockQuants();
