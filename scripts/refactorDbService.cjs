const fs = require('fs');

const filePath = './src/lib/dbService.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetBlock = `  // --- Book Orders Management ---
  async getBookOrders(): Promise<BookOrder[]> {
    if (isFirebaseEnabled && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'book_orders'));
        const orders: BookOrder[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as BookOrder;
          if (data.id !== 'ORD-2026-001') {
            orders.push({ ...data, id: docSnap.id });
          }
        });
        setLocalData('noor_book_orders', orders);
        return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'book_orders');
      }
    }`;

const replacement = `  // --- Book Orders Management ---
  _ordersCache: null as { data: BookOrder[]; timestamp: number } | null,
  
  async getBookOrders(forceRefresh = false): Promise<BookOrder[]> {
    if (!forceRefresh && this._ordersCache && (Date.now() - this._ordersCache.timestamp < 10000)) {
      return this._ordersCache.data;
    }

    if (isFirebaseEnabled && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'book_orders'));
        const orders: BookOrder[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as BookOrder;
          if (data.id !== 'ORD-2026-001') {
            orders.push({ ...data, id: docSnap.id });
          }
        });
        setLocalData('noor_book_orders', orders);
        const sortedOrders = orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this._ordersCache = { data: sortedOrders, timestamp: Date.now() };
        return sortedOrders;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'book_orders');
      }
    }`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacement);
  
  // also replace any writes to invalidate cache
  content = content.replace(
    /const orders = await this\.getBookOrders\(\);/g,
    'const orders = await this.getBookOrders();\n    this._ordersCache = null; // invalidate cache'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('Replaced successfully');
} else {
  console.log('Target block not found');
}
