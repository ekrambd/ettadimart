import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const purchaseRouter = Router();

// GET /api/purchases
purchaseRouter.get('/', async (_req, res) => {
  try {
    const list = await (prisma as any).$queryRawUnsafe(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM PurchaseItem WHERE purchaseId = p.id) as itemsCount
      FROM Purchase p
      ORDER BY p.createdAt DESC
    `);
    res.json(list);
  } catch (error) {
    console.error('Failed to fetch purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// GET /api/purchases/:id
purchaseRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const purchases = await (prisma as any).$queryRawUnsafe(`
      SELECT * FROM Purchase WHERE id = ? OR purchaseNumber = ? LIMIT 1
    `, id, id);
    if (!purchases || purchases.length === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }
    const purchase = purchases[0];
    const items = await (prisma as any).$queryRawUnsafe(`
      SELECT * FROM PurchaseItem WHERE purchaseId = ?
    `, purchase.id);

    res.json({ ...purchase, items });
  } catch (error) {
    console.error('Failed to fetch purchase details:', error);
    res.status(500).json({ error: 'Failed to fetch purchase details' });
  }
});

// POST /api/purchases
purchaseRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, supplierId, supplierName, receivedDate, notes, slipImage, totalAmount, items } = req.body;
    const id = `pur-${Date.now()}`;
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const purchaseNumber = String(randNum).padStart(6, '0');
    const nowIso = new Date().toISOString();

    await (prisma as any).$executeRawUnsafe(`
      INSERT INTO Purchase (id, purchaseNumber, title, supplierId, supplierName, receivedDate, notes, slipImage, totalAmount, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `, id, purchaseNumber, title || 'New Purchase', supplierId || null, supplierName || null, receivedDate || nowIso, notes || '', slipImage || '', Number(totalAmount || 0), nowIso, nowIso);

    if (Array.isArray(items)) {
      for (const it of items) {
        const itemId = `pi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await (prisma as any).$executeRawUnsafe(`
          INSERT INTO PurchaseItem (id, purchaseId, productId, productTitle, quantity, unitPrice, totalAmount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, itemId, id, it.productId, it.productTitle || '', Number(it.quantity || 1), Number(it.unitPrice || 0), Number(it.totalAmount || 0));

        // Increment product stock
        if (it.productId) {
          await (prisma as any).$executeRawUnsafe(`
            UPDATE Product 
            SET stock = COALESCE(stock, 0) + ?,
                receivedStock = COALESCE(receivedStock, 0) + ?
            WHERE id = ?
          `, Number(it.quantity || 1), Number(it.quantity || 1), it.productId);
        }
      }
    }

    res.status(201).json({ id, purchaseNumber, title, status: 'pending' });
  } catch (error: any) {
    console.error('Failed to create purchase:', error);
    res.status(500).json({ error: error.message || 'Failed to create purchase' });
  }
});

// PUT /api/purchases/:id/mark-received
purchaseRouter.put('/:id/mark-received', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).$executeRawUnsafe(`
      UPDATE Purchase SET status = 'received', updatedAt = ? WHERE id = ?
    `, new Date().toISOString(), id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update purchase' });
  }
});

// POST /api/purchases/:id/items (Attach product)
purchaseRouter.post('/:id/items', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, productTitle, quantity, unitPrice } = req.body;

    // Find actual purchase id if purchaseNumber was provided
    const purchases = await (prisma as any).$queryRawUnsafe(`
      SELECT id FROM Purchase WHERE id = ? OR purchaseNumber = ? LIMIT 1
    `, id, id);

    if (!purchases || purchases.length === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }
    const targetPurchaseId = purchases[0].id;

    const itemId = `pi-${Date.now()}`;
    const qty = Number(quantity || 1);
    const price = Number(unitPrice || 0);
    const itemTotal = qty * price;

    await (prisma as any).$executeRawUnsafe(`
      INSERT INTO PurchaseItem (id, purchaseId, productId, productTitle, quantity, unitPrice, totalAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, itemId, targetPurchaseId, productId, productTitle || '', qty, price, itemTotal);

    await (prisma as any).$executeRawUnsafe(`
      UPDATE Purchase 
      SET totalAmount = COALESCE(totalAmount, 0) + ?, updatedAt = ?
      WHERE id = ?
    `, itemTotal, new Date().toISOString(), targetPurchaseId);

    // Update stock in Product table
    await (prisma as any).$executeRawUnsafe(`
      UPDATE Product 
      SET stock = COALESCE(stock, 0) + ?,
          receivedStock = COALESCE(receivedStock, 0) + ?
      WHERE id = ?
    `, qty, qty, productId);

    res.status(201).json({ success: true, id: itemId });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to attach product' });
  }
});

// DELETE /api/purchases/:purchaseId/items/:itemId (Remove attached item)
purchaseRouter.delete('/:purchaseId/items/:itemId', requireAdmin, async (req, res) => {
  try {
    const { purchaseId, itemId } = req.params;
    const items = await (prisma as any).$queryRawUnsafe(`
      SELECT * FROM PurchaseItem WHERE id = ?
    `, itemId);

    if (items && items.length > 0) {
      const item = items[0];
      await (prisma as any).$executeRawUnsafe(`
        DELETE FROM PurchaseItem WHERE id = ?
      `, itemId);

      await (prisma as any).$executeRawUnsafe(`
        UPDATE Purchase 
        SET totalAmount = MAX(0, COALESCE(totalAmount, 0) - ?), updatedAt = ?
        WHERE id = ? OR purchaseNumber = ?
      `, Number(item.totalAmount || 0), new Date().toISOString(), purchaseId, purchaseId);

      // Decrement stock that was added
      if (item.productId) {
        await (prisma as any).$executeRawUnsafe(`
          UPDATE Product 
          SET stock = MAX(0, COALESCE(stock, 0) - ?),
              receivedStock = MAX(0, COALESCE(receivedStock, 0) - ?)
          WHERE id = ?
        `, Number(item.quantity || 1), Number(item.quantity || 1), item.productId);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete item' });
  }
});

// ===== PURCHASE RETURNS =====
// GET /api/purchases/returns
purchaseRouter.get('/returns/list', async (_req, res) => {
  try {
    const list = await (prisma as any).$queryRawUnsafe(`
      SELECT * FROM PurchaseReturn ORDER BY createdAt DESC
    `);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase returns' });
  }
});

// POST /api/purchases/returns
purchaseRouter.post('/returns', requireAdmin, async (req, res) => {
  try {
    const { purchaseId, purchaseNumber, supplierId, supplierName, reason, itemsCount, amount, status } = req.body;
    const id = `pr-${Date.now()}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const returnNumber = `RET-${randNum}`;
    const nowIso = new Date().toISOString();

    await (prisma as any).$executeRawUnsafe(`
      INSERT INTO PurchaseReturn (id, returnNumber, purchaseId, purchaseNumber, supplierId, supplierName, reason, itemsCount, amount, status, returnDate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, id, returnNumber, purchaseId || null, purchaseNumber || null, supplierId || null, supplierName || null, reason || '', Number(itemsCount || 1), Number(amount || 0), status || 'settled', nowIso, nowIso, nowIso);

    res.status(201).json({ id, returnNumber, success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create return' });
  }
});
