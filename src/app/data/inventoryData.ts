// Mock inventory data for the dashboard
export interface InventoryItem {
  id: string;
  productName: string;
  category: string;
  warehouse: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastRestocked: string;
  monthYear: string;
}

export const inventoryData: InventoryItem[] = [
  // Electronics - Warehouse A
  { id: '1', productName: 'Laptop Pro 15"', category: 'Electronics', warehouse: 'Warehouse A', supplier: 'Tech Corp', quantity: 145, unitPrice: 1200, totalValue: 174000, stockStatus: 'In Stock', lastRestocked: '2026-03-15', monthYear: '2026-03' },
  { id: '2', productName: 'Wireless Mouse', category: 'Electronics', warehouse: 'Warehouse A', supplier: 'Tech Corp', quantity: 320, unitPrice: 25, totalValue: 8000, stockStatus: 'In Stock', lastRestocked: '2026-03-10', monthYear: '2026-03' },
  { id: '3', productName: 'USB-C Cable', category: 'Electronics', warehouse: 'Warehouse A', supplier: 'Cable Co', quantity: 580, unitPrice: 15, totalValue: 8700, stockStatus: 'In Stock', lastRestocked: '2026-03-20', monthYear: '2026-03' },
  { id: '4', productName: 'Keyboard Mechanical', category: 'Electronics', warehouse: 'Warehouse A', supplier: 'Tech Corp', quantity: 89, unitPrice: 80, totalValue: 7120, stockStatus: 'In Stock', lastRestocked: '2026-02-28', monthYear: '2026-02' },
  { id: '5', productName: 'Monitor 27"', category: 'Electronics', warehouse: 'Warehouse A', supplier: 'Display Inc', quantity: 45, unitPrice: 350, totalValue: 15750, stockStatus: 'Low Stock', lastRestocked: '2026-03-05', monthYear: '2026-03' },
  
  // Furniture - Warehouse B
  { id: '6', productName: 'Office Chair', category: 'Furniture', warehouse: 'Warehouse B', supplier: 'Furniture Plus', quantity: 230, unitPrice: 180, totalValue: 41400, stockStatus: 'In Stock', lastRestocked: '2026-03-12', monthYear: '2026-03' },
  { id: '7', productName: 'Standing Desk', category: 'Furniture', warehouse: 'Warehouse B', supplier: 'Furniture Plus', quantity: 67, unitPrice: 450, totalValue: 30150, stockStatus: 'In Stock', lastRestocked: '2026-03-08', monthYear: '2026-03' },
  { id: '8', productName: 'Filing Cabinet', category: 'Furniture', warehouse: 'Warehouse B', supplier: 'Office Supplies Ltd', quantity: 120, unitPrice: 200, totalValue: 24000, stockStatus: 'In Stock', lastRestocked: '2026-02-25', monthYear: '2026-02' },
  { id: '9', productName: 'Bookshelf', category: 'Furniture', warehouse: 'Warehouse B', supplier: 'Furniture Plus', quantity: 35, unitPrice: 120, totalValue: 4200, stockStatus: 'Low Stock', lastRestocked: '2026-03-01', monthYear: '2026-03' },
  { id: '10', productName: 'Conference Table', category: 'Furniture', warehouse: 'Warehouse B', supplier: 'Furniture Plus', quantity: 15, unitPrice: 800, totalValue: 12000, stockStatus: 'Low Stock', lastRestocked: '2026-01-15', monthYear: '2026-01' },
  
  // Stationery - Warehouse C
  { id: '11', productName: 'Notebook A4', category: 'Stationery', warehouse: 'Warehouse C', supplier: 'Office Supplies Ltd', quantity: 1200, unitPrice: 3, totalValue: 3600, stockStatus: 'In Stock', lastRestocked: '2026-03-18', monthYear: '2026-03' },
  { id: '12', productName: 'Pen Set', category: 'Stationery', warehouse: 'Warehouse C', supplier: 'Office Supplies Ltd', quantity: 850, unitPrice: 5, totalValue: 4250, stockStatus: 'In Stock', lastRestocked: '2026-03-22', monthYear: '2026-03' },
  { id: '13', productName: 'Sticky Notes', category: 'Stationery', warehouse: 'Warehouse C', supplier: 'Paper World', quantity: 450, unitPrice: 2, totalValue: 900, stockStatus: 'In Stock', lastRestocked: '2026-03-14', monthYear: '2026-03' },
  { id: '14', productName: 'Stapler', category: 'Stationery', warehouse: 'Warehouse C', supplier: 'Office Supplies Ltd', quantity: 180, unitPrice: 8, totalValue: 1440, stockStatus: 'In Stock', lastRestocked: '2026-02-20', monthYear: '2026-02' },
  { id: '15', productName: 'Paper Clips Box', category: 'Stationery', warehouse: 'Warehouse C', supplier: 'Paper World', quantity: 25, unitPrice: 4, totalValue: 100, stockStatus: 'Low Stock', lastRestocked: '2026-03-02', monthYear: '2026-03' },
  
  // Hardware - Warehouse A
  { id: '16', productName: 'Drill Machine', category: 'Hardware', warehouse: 'Warehouse A', supplier: 'Tools Pro', quantity: 78, unitPrice: 150, totalValue: 11700, stockStatus: 'In Stock', lastRestocked: '2026-03-11', monthYear: '2026-03' },
  { id: '17', productName: 'Hammer Set', category: 'Hardware', warehouse: 'Warehouse A', supplier: 'Tools Pro', quantity: 145, unitPrice: 35, totalValue: 5075, stockStatus: 'In Stock', lastRestocked: '2026-03-16', monthYear: '2026-03' },
  { id: '18', productName: 'Screwdriver Kit', category: 'Hardware', warehouse: 'Warehouse A', supplier: 'Tools Pro', quantity: 220, unitPrice: 25, totalValue: 5500, stockStatus: 'In Stock', lastRestocked: '2026-03-19', monthYear: '2026-03' },
  { id: '19', productName: 'Power Saw', category: 'Hardware', warehouse: 'Warehouse A', supplier: 'Industrial Gear', quantity: 32, unitPrice: 280, totalValue: 8960, stockStatus: 'Low Stock', lastRestocked: '2026-02-10', monthYear: '2026-02' },
  { id: '20', productName: 'Tool Box', category: 'Hardware', warehouse: 'Warehouse A', supplier: 'Tools Pro', quantity: 95, unitPrice: 60, totalValue: 5700, stockStatus: 'In Stock', lastRestocked: '2026-03-07', monthYear: '2026-03' },
  
  // Apparel - Warehouse B
  { id: '21', productName: 'Safety Vest', category: 'Apparel', warehouse: 'Warehouse B', supplier: 'SafeWear Inc', quantity: 340, unitPrice: 20, totalValue: 6800, stockStatus: 'In Stock', lastRestocked: '2026-03-13', monthYear: '2026-03' },
  { id: '22', productName: 'Work Boots', category: 'Apparel', warehouse: 'Warehouse B', supplier: 'SafeWear Inc', quantity: 125, unitPrice: 85, totalValue: 10625, stockStatus: 'In Stock', lastRestocked: '2026-03-09', monthYear: '2026-03' },
  { id: '23', productName: 'Hard Hat', category: 'Apparel', warehouse: 'Warehouse B', supplier: 'SafeWear Inc', quantity: 280, unitPrice: 30, totalValue: 8400, stockStatus: 'In Stock', lastRestocked: '2026-03-17', monthYear: '2026-03' },
  { id: '24', productName: 'Safety Gloves', category: 'Apparel', warehouse: 'Warehouse B', supplier: 'Industrial Gear', quantity: 520, unitPrice: 12, totalValue: 6240, stockStatus: 'In Stock', lastRestocked: '2026-03-21', monthYear: '2026-03' },
  { id: '25', productName: 'Work Jacket', category: 'Apparel', warehouse: 'Warehouse B', supplier: 'SafeWear Inc', quantity: 18, unitPrice: 65, totalValue: 1170, stockStatus: 'Low Stock', lastRestocked: '2026-01-20', monthYear: '2026-01' },
  
  // Cleaning - Warehouse C
  { id: '26', productName: 'Cleaning Solution', category: 'Cleaning', warehouse: 'Warehouse C', supplier: 'Clean Pro', quantity: 380, unitPrice: 8, totalValue: 3040, stockStatus: 'In Stock', lastRestocked: '2026-03-15', monthYear: '2026-03' },
  { id: '27', productName: 'Mop & Bucket', category: 'Cleaning', warehouse: 'Warehouse C', supplier: 'Clean Pro', quantity: 95, unitPrice: 22, totalValue: 2090, stockStatus: 'In Stock', lastRestocked: '2026-03-10', monthYear: '2026-03' },
  { id: '28', productName: 'Trash Bags', category: 'Cleaning', warehouse: 'Warehouse C', supplier: 'Paper World', quantity: 560, unitPrice: 6, totalValue: 3360, stockStatus: 'In Stock', lastRestocked: '2026-03-20', monthYear: '2026-03' },
  { id: '29', productName: 'Disinfectant Spray', category: 'Cleaning', warehouse: 'Warehouse C', supplier: 'Clean Pro', quantity: 42, unitPrice: 10, totalValue: 420, stockStatus: 'Low Stock', lastRestocked: '2026-02-15', monthYear: '2026-02' },
  { id: '30', productName: 'Floor Cleaner', category: 'Cleaning', warehouse: 'Warehouse C', supplier: 'Clean Pro', quantity: 0, unitPrice: 15, totalValue: 0, stockStatus: 'Out of Stock', lastRestocked: '2026-01-10', monthYear: '2026-01' },
  
  // Additional items for better analytics
  { id: '31', productName: 'Tablet 10"', category: 'Electronics', warehouse: 'Warehouse A', supplier: 'Tech Corp', quantity: 67, unitPrice: 450, totalValue: 30150, stockStatus: 'In Stock', lastRestocked: '2026-03-23', monthYear: '2026-03' },
  { id: '32', productName: 'Headphones', category: 'Electronics', warehouse: 'Warehouse C', supplier: 'Tech Corp', quantity: 210, unitPrice: 55, totalValue: 11550, stockStatus: 'In Stock', lastRestocked: '2026-03-24', monthYear: '2026-03' },
  { id: '33', productName: 'Desk Lamp', category: 'Furniture', warehouse: 'Warehouse B', supplier: 'Furniture Plus', quantity: 155, unitPrice: 35, totalValue: 5425, stockStatus: 'In Stock', lastRestocked: '2026-03-12', monthYear: '2026-03' },
  { id: '34', productName: 'Calculator', category: 'Stationery', warehouse: 'Warehouse C', supplier: 'Office Supplies Ltd', quantity: 88, unitPrice: 15, totalValue: 1320, stockStatus: 'In Stock', lastRestocked: '2026-03-18', monthYear: '2026-03' },
  { id: '35', productName: 'Paint Roller', category: 'Hardware', warehouse: 'Warehouse A', supplier: 'Tools Pro', quantity: 165, unitPrice: 18, totalValue: 2970, stockStatus: 'In Stock', lastRestocked: '2026-03-14', monthYear: '2026-03' },
];

export const categories = Array.from(new Set(inventoryData.map(item => item.category)));
export const warehouses = Array.from(new Set(inventoryData.map(item => item.warehouse)));
export const suppliers = Array.from(new Set(inventoryData.map(item => item.supplier)));
export const stockStatuses = Array.from(new Set(inventoryData.map(item => item.stockStatus)));
