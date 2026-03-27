import type { Supplier } from '../types';
import { generateId, randomGSTIN, randomPhone } from '../generators/helpers';
import { SUPPLIER_DATA } from '../generators/pharmaConstants';

function generateSuppliers(): Supplier[] {
  return SUPPLIER_DATA.map((data, i) => ({
    id: generateId('SUP', i + 1),
    name: data.name,
    gstNumber: randomGSTIN(data.stateCode),
    dlNumber: `DL-${data.stateCode}-SUP-${String(i + 1).padStart(3, '0')}`,
    contactPerson: data.contactPerson,
    phone: randomPhone(),
    email: `orders@${data.name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 12)}.com`,
    address: data.address,
    city: data.city,
    state: data.state,
    creditDays: data.creditDays,
    rating: data.rating,
    leadTimeDays: data.avgLeadDays,
    isActive: true,
  }));
}

export const suppliers = generateSuppliers();
