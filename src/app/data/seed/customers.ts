import type { Customer } from '../types';
import { generateId, randomPhone, randomGSTIN, randomFromArray, randomInt, random } from '../generators/helpers';
import { INDIAN_FIRST_NAMES, INDIAN_LAST_NAMES, INDIAN_CITIES_STATES } from '../generators/pharmaConstants';

function generateCustomers(): Customer[] {
  const customers: Customer[] = [];
  let idx = 1;

  // 25 Walk-in customers
  for (let i = 0; i < 25; i++) {
    const city = randomFromArray(INDIAN_CITIES_STATES);
    customers.push({
      id: generateId('CUS', idx++),
      name: `${randomFromArray(INDIAN_FIRST_NAMES)} ${randomFromArray(INDIAN_LAST_NAMES)}`,
      type: 'Walk-in',
      phone: randomPhone(),
      email: '',
      gstNumber: '',
      dlNumber: '',
      address: '',
      city: city.city,
      creditLimit: 0,
      creditDays: 0,
      outstandingBalance: 0,
      loyaltyPoints: randomInt(0, 500),
      isActive: true,
    });
  }

  // 15 Regular customers
  for (let i = 0; i < 15; i++) {
    const city = randomFromArray(INDIAN_CITIES_STATES);
    const firstName = randomFromArray(INDIAN_FIRST_NAMES);
    const lastName = randomFromArray(INDIAN_LAST_NAMES);
    customers.push({
      id: generateId('CUS', idx++),
      name: `${firstName} ${lastName}`,
      type: 'Regular',
      phone: randomPhone(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      gstNumber: '',
      dlNumber: '',
      address: `${randomInt(1, 500)}, ${randomFromArray(['1st Cross', '2nd Main', '3rd Block', '4th Stage', 'MG Road'])}`,
      city: city.city,
      creditLimit: 0,
      creditDays: 0,
      outstandingBalance: 0,
      loyaltyPoints: randomInt(500, 5000),
      isActive: true,
    });
  }

  // 8 B2B Hospital customers
  const hospitalNames = ['Apollo Hospital', 'Fortis Healthcare', 'Manipal Hospital', 'Columbia Asia', 'Narayana Health', 'Max Healthcare', 'KIMS Hospital', 'Aster CMI'];
  for (let i = 0; i < 8; i++) {
    const city = randomFromArray(INDIAN_CITIES_STATES);
    customers.push({
      id: generateId('CUS', idx++),
      name: hospitalNames[i],
      type: 'B2B-Hospital',
      phone: randomPhone(),
      email: `pharmacy@${hospitalNames[i].toLowerCase().replace(/[^a-z]/g, '')}.com`,
      gstNumber: randomGSTIN(city.stateCode),
      dlNumber: `DL-${city.stateCode}-HOSP-${String(i + 1).padStart(3, '0')}`,
      address: `${randomInt(1, 100)}, Hospital Road`,
      city: city.city,
      creditLimit: randomFromArray([200000, 300000, 500000, 1000000]),
      creditDays: randomFromArray([30, 45, 60]),
      outstandingBalance: randomInt(10000, 200000),
      loyaltyPoints: 0,
      isActive: true,
    });
  }

  // 7 B2B Clinic customers
  const clinicPrefixes = ['LifeCare', 'MedPlus', 'HealthFirst', 'CarePoint', 'WellBeing', 'PrimeCare', 'VitalCare'];
  for (let i = 0; i < 7; i++) {
    const city = randomFromArray(INDIAN_CITIES_STATES);
    customers.push({
      id: generateId('CUS', idx++),
      name: `${clinicPrefixes[i]} Clinic`,
      type: 'B2B-Clinic',
      phone: randomPhone(),
      email: `orders@${clinicPrefixes[i].toLowerCase()}.com`,
      gstNumber: randomGSTIN(city.stateCode),
      dlNumber: '',
      address: `${randomInt(1, 300)}, ${randomFromArray(['Commercial Street', 'Market Road', 'Main Road'])}`,
      city: city.city,
      creditLimit: randomFromArray([50000, 100000, 150000]),
      creditDays: randomFromArray([15, 30]),
      outstandingBalance: randomInt(5000, 50000),
      loyaltyPoints: 0,
      isActive: true,
    });
  }

  // 5 B2B Pharmacy customers
  const pharmacyNames = ['MedPlus Pharmacy', 'Apollo Pharmacy Chain', 'NetMeds Wholesale', 'PharmEasy Bulk', 'Wellness Forever'];
  for (let i = 0; i < 5; i++) {
    const city = randomFromArray(INDIAN_CITIES_STATES);
    customers.push({
      id: generateId('CUS', idx++),
      name: pharmacyNames[i],
      type: 'B2B-Pharmacy',
      phone: randomPhone(),
      email: `bulk@${pharmacyNames[i].toLowerCase().replace(/[^a-z]/g, '').substring(0, 10)}.com`,
      gstNumber: randomGSTIN(city.stateCode),
      dlNumber: `DL-${city.stateCode}-PH-${String(i + 1).padStart(3, '0')}`,
      address: `${randomInt(1, 200)}, Pharma Complex`,
      city: city.city,
      creditLimit: randomFromArray([100000, 200000, 500000]),
      creditDays: randomFromArray([30, 45, 60]),
      outstandingBalance: randomInt(20000, 150000),
      loyaltyPoints: 0,
      isActive: true,
    });
  }

  return customers;
}

export const customers = generateCustomers();
