import type { Doctor } from '../types';
import { generateId, randomPhone, randomFromArray, randomInt } from '../generators/helpers';
import { INDIAN_FIRST_NAMES, INDIAN_LAST_NAMES, DOCTOR_SPECIALIZATIONS } from '../generators/pharmaConstants';

function generateDoctors(): Doctor[] {
  const hospitals = ['Apollo Hospital', 'Fortis Healthcare', 'Manipal Hospital', 'Columbia Asia', 'Narayana Health', 'Private Practice', 'Private Practice', 'KIMS Hospital', 'Private Practice', 'Aster CMI'];

  return Array.from({ length: 25 }, (_, i) => {
    const firstName = randomFromArray(INDIAN_FIRST_NAMES);
    const lastName = randomFromArray(INDIAN_LAST_NAMES);
    const spec = randomFromArray(DOCTOR_SPECIALIZATIONS);
    return {
      id: generateId('DOC', i + 1),
      name: `Dr. ${firstName} ${lastName}`,
      specialization: spec,
      registrationNumber: `KMC-${randomInt(10000, 99999)}`,
      hospital: randomFromArray(hospitals),
      phone: randomPhone(),
    };
  });
}

export const doctors = generateDoctors();
