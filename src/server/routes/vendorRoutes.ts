import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const vendorRouter = Router();

// GET /api/vendors - List all vendors
vendorRouter.get('/', async (_req, res) => {
  try {
    const vendors = await (prisma as any).vendor.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(vendors);
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET /api/vendors/withdrawals - List all withdrawal requests
vendorRouter.get('/withdrawals', async (_req, res) => {
  try {
    const withdrawals = await (prisma as any).withdrawalRequest.findMany({
      orderBy: { requestedAt: 'desc' }
    });
    
    // Attach vendor information for UI convenience
    const vendors = await (prisma as any).vendor.findMany();
    const vendorMap = new Map(vendors.map((v: any) => [v.id, v]));

    const enriched = withdrawals.map((w: any) => {
      const v: any = vendorMap.get(w.vendorId);
      return {
        ...w,
        vendorName: v?.storeName || 'Unknown Shop',
        ownerName: v?.ownerName || (v?.firstName ? `${v?.firstName || ''} ${v?.lastName || ''}`.trim() : 'Unknown Owner'),
        vendorEmail: v?.email || '',
        vendorPhone: v?.phone || w.contactNumber || '',
        vendorLogo: v?.logo || '',
        vendorAddress: v?.address || ''
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Failed to fetch withdrawals:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// GET /api/vendors/withdrawals/:id - Single withdrawal detail
vendorRouter.get('/withdrawals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await (prisma as any).withdrawalRequest.findUnique({
      where: { id }
    });
    if (!item) {
      res.status(404).json({ error: 'Withdrawal request not found' });
      return;
    }

    const vendor = await (prisma as any).vendor.findUnique({
      where: { id: item.vendorId }
    });

    res.json({
      ...item,
      vendor
    });
  } catch (error) {
    console.error('Failed to fetch withdrawal detail:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal request' });
  }
});

// POST /api/vendors/withdrawals/:id/status - Update withdrawal status
vendorRouter.post('/withdrawals/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body; // 'approved' | 'rejected' | 'pending'
    
    const existing = await (prisma as any).withdrawalRequest.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Withdrawal not found' });
      return;
    }

    const updated = await (prisma as any).withdrawalRequest.update({
      where: { id },
      data: {
        status,
        notes: notes !== undefined ? notes : existing.notes,
        decidedAt: status !== 'pending' ? new Date() : null
      }
    });

    // If approved, update vendor wallet & withdrawn amounts
    if (status === 'approved' && existing.status !== 'approved') {
      const vendor = await (prisma as any).vendor.findUnique({ where: { id: existing.vendorId } });
      if (vendor) {
        await (prisma as any).vendor.update({
          where: { id: vendor.id },
          data: {
            walletBalance: Math.max(0, (vendor.walletBalance || 0) - existing.amount),
            totalWithdrawn: (vendor.totalWithdrawn || 0) + existing.amount
          }
        });
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Failed to update withdrawal status:', error);
    res.status(500).json({ error: 'Failed to update withdrawal status' });
  }
});

// GET /api/vendors/:id - Get vendor details
vendorRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await (prisma as any).vendor.findUnique({
      where: { id }
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }
    res.json(vendor);
  } catch (error) {
    console.error('Failed to fetch vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// POST /api/vendors - Create vendor
vendorRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    if (!data.storeName || !data.email || !data.phone) {
      res.status(400).json({ error: 'Store name, email, and phone number are required' });
      return;
    }

    const slug = data.slug || data.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const ownerName = data.ownerName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.storeName;

    const vendor = await (prisma as any).vendor.create({
      data: {
        id: data.id || undefined,
        storeName: data.storeName,
        slug,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        ownerName,
        email: data.email,
        phone: data.phone,
        gender: data.gender || 'Male',
        password: data.password || '',
        logo: data.logo || null,
        banner: data.banner || null,
        ownerPhoto: data.ownerPhoto || null,
        description: data.description || null,
        address: data.address || null,
        district: data.district || 'Dhaka',
        commissionRate: data.commissionRate !== undefined ? Number(data.commissionRate) : 8.0,
        deliveryCharge: data.deliveryCharge !== undefined ? Number(data.deliveryCharge) : 40.0,
        orderPrefix: data.orderPrefix || 'RC',
        productsCount: data.productsCount !== undefined ? Number(data.productsCount) : 0,
        ordersCount: data.ordersCount !== undefined ? Number(data.ordersCount) : 0,
        totalSales: data.totalSales !== undefined ? Number(data.totalSales) : 0.0,
        walletBalance: data.walletBalance !== undefined ? Number(data.walletBalance) : 0.0,
        totalWithdrawn: data.totalWithdrawn !== undefined ? Number(data.totalWithdrawn) : 0.0,
        rating: data.rating !== undefined ? Number(data.rating) : 0.0,
        isOpen: data.isOpen !== undefined ? Boolean(data.isOpen) : true,
        status: data.status || 'active',
        payoutMethod: data.payoutMethod || 'bKash Merchant',
        payoutAccount: data.payoutAccount || null
      }
    });

    res.status(201).json(vendor);
  } catch (error: any) {
    console.error('Failed to create vendor:', error);
    res.status(500).json({ error: error.message || 'Failed to create vendor' });
  }
});

// PUT /api/vendors/:id - Update vendor
vendorRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await (prisma as any).vendor.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const ownerName = data.ownerName || (data.firstName || data.lastName ? `${data.firstName || ''} ${data.lastName || ''}`.trim() : existing.ownerName);

    const vendor = await (prisma as any).vendor.update({
      where: { id },
      data: {
        storeName: data.storeName !== undefined ? data.storeName : existing.storeName,
        slug: data.slug !== undefined ? data.slug : existing.slug,
        firstName: data.firstName !== undefined ? data.firstName : existing.firstName,
        lastName: data.lastName !== undefined ? data.lastName : existing.lastName,
        ownerName,
        email: data.email !== undefined ? data.email : existing.email,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        gender: data.gender !== undefined ? data.gender : existing.gender,
        password: data.password !== undefined && data.password !== '' ? data.password : existing.password,
        logo: data.logo !== undefined ? data.logo : existing.logo,
        banner: data.banner !== undefined ? data.banner : existing.banner,
        ownerPhoto: data.ownerPhoto !== undefined ? data.ownerPhoto : existing.ownerPhoto,
        description: data.description !== undefined ? data.description : existing.description,
        address: data.address !== undefined ? data.address : existing.address,
        district: data.district !== undefined ? data.district : existing.district,
        commissionRate: data.commissionRate !== undefined ? Number(data.commissionRate) : existing.commissionRate,
        deliveryCharge: data.deliveryCharge !== undefined ? Number(data.deliveryCharge) : existing.deliveryCharge,
        orderPrefix: data.orderPrefix !== undefined ? data.orderPrefix : existing.orderPrefix,
        productsCount: data.productsCount !== undefined ? Number(data.productsCount) : existing.productsCount,
        ordersCount: data.ordersCount !== undefined ? Number(data.ordersCount) : existing.ordersCount,
        totalSales: data.totalSales !== undefined ? Number(data.totalSales) : existing.totalSales,
        walletBalance: data.walletBalance !== undefined ? Number(data.walletBalance) : existing.walletBalance,
        totalWithdrawn: data.totalWithdrawn !== undefined ? Number(data.totalWithdrawn) : existing.totalWithdrawn,
        rating: data.rating !== undefined ? Number(data.rating) : existing.rating,
        isOpen: data.isOpen !== undefined ? Boolean(data.isOpen) : existing.isOpen,
        status: data.status !== undefined ? data.status : existing.status,
        payoutMethod: data.payoutMethod !== undefined ? data.payoutMethod : existing.payoutMethod,
        payoutAccount: data.payoutAccount !== undefined ? data.payoutAccount : existing.payoutAccount
      }
    });

    res.json(vendor);
  } catch (error: any) {
    console.error('Failed to update vendor:', error);
    res.status(500).json({ error: error.message || 'Failed to update vendor' });
  }
});

// DELETE /api/vendors/:id - Delete vendor
vendorRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).vendor.delete({
      where: { id }
    });
    // Also clean up any withdrawal requests
    await (prisma as any).withdrawalRequest.deleteMany({
      where: { vendorId: id }
    });
    res.json({ success: true, message: 'Vendor removed successfully' });
  } catch (error: any) {
    console.error('Failed to delete vendor:', error);
    res.status(500).json({ error: error.message || 'Failed to delete vendor' });
  }
});
