import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const supplierRouter = Router();

// GET all suppliers with optional search and status filter
supplierRouter.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const where: any = {};

    if (status !== undefined && status !== 'all') {
      where.status = status === 'true' || status === '1' || status === 'active';
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { address: { contains: q } },
        { companyName: { contains: q } }
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(suppliers);
  } catch (error: any) {
    console.error('Failed to fetch suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers', details: error.message });
  }
});

// GET single supplier by ID
supplierRouter.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id }
    });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch supplier', details: error.message });
  }
});

// POST create supplier
supplierRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      profilePhoto,
      address,
      purchasesCount,
      totalPurchasedAmount,
      balance,
      status,
      companyName,
      suppliedProducts,
      notes
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Full Name and Phone Number are required' });
    }

    const cleanPhone = String(phone).trim().replace(/\s+/g, '');

    const existing = await prisma.supplier.findUnique({
      where: { phone: cleanPhone }
    });

    if (existing) {
      return res.status(400).json({ error: 'A supplier with this phone number already exists' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        id: req.body.id || `supp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: String(name).trim(),
        phone: cleanPhone,
        email: email ? String(email).trim() : null,
        profilePhoto: profilePhoto || null,
        address: address ? String(address).trim() : null,
        purchasesCount: purchasesCount !== undefined ? Number(purchasesCount) : 0,
        totalPurchasedAmount: totalPurchasedAmount !== undefined ? Number(totalPurchasedAmount) : 0,
        balance: balance !== undefined ? Number(balance) : (totalPurchasedAmount !== undefined ? Number(totalPurchasedAmount) : 0),
        status: status !== undefined ? (typeof status === 'boolean' ? status : status === 'active' || status === 1) : true,
        companyName: companyName ? String(companyName).trim() : null,
        suppliedProducts: suppliedProducts ? String(suppliedProducts).trim() : null,
        notes: notes ? String(notes).trim() : null
      }
    });

    res.status(201).json(supplier);
  } catch (error: any) {
    console.error('Failed to create supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier', details: error.message });
  }
});

// PUT update supplier (with auto-create if not found)
supplierRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      profilePhoto,
      address,
      purchasesCount,
      totalPurchasedAmount,
      balance,
      status,
      companyName,
      suppliedProducts,
      notes
    } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (phone !== undefined) data.phone = String(phone).trim().replace(/\s+/g, '');
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (profilePhoto !== undefined) data.profilePhoto = profilePhoto || null;
    if (address !== undefined) data.address = address ? String(address).trim() : null;
    if (purchasesCount !== undefined) data.purchasesCount = Number(purchasesCount);
    if (totalPurchasedAmount !== undefined) data.totalPurchasedAmount = Number(totalPurchasedAmount);
    if (balance !== undefined) data.balance = Number(balance);
    if (status !== undefined) data.status = typeof status === 'boolean' ? status : (status === 'active' || status === 1);
    if (companyName !== undefined) data.companyName = companyName ? String(companyName).trim() : null;
    if (suppliedProducts !== undefined) data.suppliedProducts = suppliedProducts ? String(suppliedProducts).trim() : null;
    if (notes !== undefined) data.notes = notes ? String(notes).trim() : null;

    const existing = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!existing) {
      // If record does not exist yet, create it gracefully
      const cleanPhone = data.phone || (phone ? String(phone).trim().replace(/\s+/g, '') : `017${Date.now().toString().slice(-8)}`);
      const newSupplier = await prisma.supplier.create({
        data: {
          id,
          name: data.name || 'Supplier',
          phone: cleanPhone,
          email: data.email || null,
          profilePhoto: data.profilePhoto || null,
          address: data.address || null,
          purchasesCount: data.purchasesCount !== undefined ? data.purchasesCount : 0,
          totalPurchasedAmount: data.totalPurchasedAmount !== undefined ? data.totalPurchasedAmount : 0,
          balance: data.balance !== undefined ? data.balance : 0,
          status: data.status !== undefined ? data.status : true,
          companyName: data.companyName || null,
          suppliedProducts: data.suppliedProducts || null,
          notes: data.notes || null
        }
      });
      return res.status(201).json(newSupplier);
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier', details: error.message });
  }
});

// DELETE supplier
supplierRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.supplier.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier', details: error.message });
  }
});
