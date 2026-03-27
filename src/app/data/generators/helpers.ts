// Seeded random number generator for deterministic data
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Create a global seeded random instance
const rng = seededRandom(42);

export function random(): number {
  return rng();
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals: number = 2): number {
  return Number((random() * (max - min) + min).toFixed(decimals));
}

export function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

export function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = randomInt(min, Math.min(max, arr.length));
  const shuffled = [...arr].sort(() => random() - 0.5);
  return shuffled.slice(0, count);
}

export function weightedRandom<T>(items: { value: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let r = random() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

export function generateId(prefix: string, num: number, padLength: number = 3): string {
  return `${prefix}-${String(num).padStart(padLength, '0')}`;
}

export function randomDate(from: string, to: string): string {
  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  const randomTime = fromTime + random() * (toTime - fromTime);
  return new Date(randomTime).toISOString().split('T')[0];
}

export function randomTime(): string {
  // Pharmacy hours: weighted towards 9 AM - 9 PM
  const hour = weightedRandom([
    { value: 8, weight: 2 },
    { value: 9, weight: 8 },
    { value: 10, weight: 12 },
    { value: 11, weight: 15 },
    { value: 12, weight: 10 },
    { value: 13, weight: 8 },
    { value: 14, weight: 10 },
    { value: 15, weight: 12 },
    { value: 16, weight: 14 },
    { value: 17, weight: 15 },
    { value: 18, weight: 12 },
    { value: 19, weight: 10 },
    { value: 20, weight: 8 },
    { value: 21, weight: 4 },
  ]);
  const minute = randomInt(0, 59);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function randomBatchNumber(prefix: string): string {
  const year = randomFromArray(['24', '25', '26']);
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const seq = String(randomInt(1, 999)).padStart(3, '0');
  return `${prefix}${year}${month}${seq}`;
}

export function randomGSTIN(stateCode: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  let pan = '';
  for (let i = 0; i < 3; i++) pan += chars[randomInt(0, 25)];
  pan += chars[randomInt(0, 25)]; // entity type
  pan += chars[randomInt(0, 25)];
  for (let i = 0; i < 4; i++) pan += digits[randomInt(0, 9)];
  pan += chars[randomInt(0, 25)];
  return `${stateCode}${pan}1Z${digits[randomInt(0, 9)]}`;
}

export function randomPhone(): string {
  const prefix = randomFromArray(['98', '97', '96', '95', '94', '93', '91', '90', '88', '87', '86', '85']);
  let num = prefix;
  for (let i = 0; i < 8; i++) num += randomInt(0, 9);
  return num;
}

export function randomInvoiceNumber(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(5, '0')}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    months.push(current.toISOString().split('T')[0].substring(0, 7));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

export function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
