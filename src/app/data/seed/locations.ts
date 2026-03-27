import type { Location } from '../types';
import { generateId, randomGSTIN } from '../generators/helpers';
import { LOCATION_DATA } from '../generators/pharmaConstants';

function generateLocations(): Location[] {
  return LOCATION_DATA.map((data, i) => ({
    id: generateId('LOC', i + 1),
    name: data.name,
    type: data.type as Location['type'],
    address: data.address,
    city: data.city,
    state: data.state,
    dlNumber: `DL-KA-${String(2000 + i).padStart(4, '0')}`,
    gstNumber: randomGSTIN('29'),
    isActive: true,
  }));
}

export const locations = generateLocations();
