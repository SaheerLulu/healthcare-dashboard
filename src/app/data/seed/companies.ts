import type { CompanyMaster } from '../types';
import { generateId, randomGSTIN, randomPhone } from '../generators/helpers';
import { COMPANY_DATA } from '../generators/pharmaConstants';

function generateCompanies(): CompanyMaster[] {
  return COMPANY_DATA.map((data, i) => ({
    id: generateId('CMP', i + 1),
    name: data.name,
    shortName: data.shortName,
    type: data.type as CompanyMaster['type'],
    gstNumber: randomGSTIN(data.stateCode),
    dlNumber: `DL-${data.stateCode}-${String(i + 1).padStart(4, '0')}`,
    contactPerson: `${data.contactPerson}`,
    phone: randomPhone(),
    email: `contact@${data.shortName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    address: data.address,
    city: data.city,
    state: data.state,
    creditDays: data.creditDays,
    isActive: true,
  }));
}

export const companies = generateCompanies();
