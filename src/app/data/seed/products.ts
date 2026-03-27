import type { Product } from '../types';
import { generateId, randomInt, randomFloat, randomFromArray, random } from '../generators/helpers';
import { PRODUCT_TEMPLATES } from '../generators/pharmaConstants';
import { companies } from './companies';

function generateProducts(): Product[] {
  return PRODUCT_TEMPLATES.map((template, i) => {
    const mrp = randomFloat(template.mrpRange[0], template.mrpRange[1]);
    const ptr = Number((mrp * template.ptrRatio).toFixed(2));
    const pts = Number((ptr * randomFloat(0.88, 0.95)).toFixed(2));
    const purchasePrice = Number((pts * randomFloat(0.85, 0.95)).toFixed(2));

    // Assign company - match by category preference or random
    const company = randomFromArray(companies);
    const marketer = random() > 0.7 ? randomFromArray(companies) : company;

    return {
      id: generateId('PRD', i + 1),
      name: template.name,
      genericName: template.genericName,
      molecule: template.molecule,
      category: template.category,
      subCategory: template.subCategory,
      dosageForm: template.dosageForm,
      strength: template.strength,
      packSize: template.packSize,
      packUnit: template.packUnit,
      hsnCode: template.hsnCode,
      gstRate: template.gstRate,
      drugSchedule: template.drugSchedule,
      isNarcotic: template.drugSchedule === 'X',
      requiresPrescription: template.drugSchedule !== 'OTC',
      mrp,
      purchasePrice,
      ptr,
      pts,
      companyId: company.id,
      marketerId: marketer.id,
      reorderLevel: randomInt(20, 100),
      maxStock: randomInt(300, 1000),
      shelfLifeMonths: randomFromArray([12, 18, 24, 36]),
      storageCondition: randomFromArray(['Store below 25°C', 'Store in cool dry place', 'Store below 30°C', 'Refrigerate 2-8°C']),
      isActive: true,
    };
  });
}

export const products = generateProducts();
