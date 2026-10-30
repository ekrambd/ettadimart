import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const driverRouter = Router();

// GET all drivers (with optional search & status filter)
driverRouter.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const where: any = {};

    if (status !== undefined && status !== 'all') {
      where.status = status === 'true' || status === '1' || status === 'active';
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { vehicleType: { contains: q } }
      ];
    }

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(drivers);
  } catch (error: any) {
    console.error('Failed to fetch drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers', details: error.message });
  }
});

// GET single driver by ID
driverRouter.get('/:id', async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id }
    });
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(driver);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch driver', details: error.message });
  }
});

// POST create driver
driverRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      profilePhoto,
      gender,
      dateOfBirth,
      drivingLicense,
      vehicleType,
      password,
      status
    } = req.body;

    if (!firstName || !phone) {
      return res.status(400).json({ error: 'First Name and Phone Number are required' });
    }

    const cleanPhone = String(phone).trim().replace(/\s+/g, '');

    // Check existing phone
    const existing = await prisma.driver.findUnique({
      where: { phone: cleanPhone }
    });
    if (existing) {
      return res.status(400).json({ error: 'A driver with this phone number already exists' });
    }

    const driver = await prisma.driver.create({
      data: {
        id: req.body.id || `drv-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        firstName: String(firstName).trim(),
        lastName: lastName ? String(lastName).trim() : null,
        phone: cleanPhone,
        email: email ? String(email).trim() : null,
        profilePhoto: profilePhoto || null,
        gender: gender || 'Male',
        dateOfBirth: dateOfBirth || null,
        drivingLicense: drivingLicense ? String(drivingLicense).trim() : null,
        vehicleType: vehicleType ? String(vehicleType).trim() : null,
        password: password ? String(password) : null,
        status: status !== undefined ? Boolean(status) : true
      }
    });

    res.status(201).json(driver);
  } catch (error: any) {
    console.error('Failed to create driver:', error);
    res.status(500).json({ error: 'Failed to create driver', details: error.message });
  }
});

// PUT update driver
driverRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      email,
      profilePhoto,
      gender,
      dateOfBirth,
      drivingLicense,
      vehicleType,
      password,
      status
    } = req.body;

    const data: any = {};
    if (firstName !== undefined) data.firstName = String(firstName).trim();
    if (lastName !== undefined) data.lastName = lastName ? String(lastName).trim() : null;
    if (phone !== undefined) data.phone = String(phone).trim().replace(/\s+/g, '');
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (profilePhoto !== undefined) data.profilePhoto = profilePhoto || null;
    if (gender !== undefined) data.gender = gender;
    if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth || null;
    if (drivingLicense !== undefined) data.drivingLicense = drivingLicense ? String(drivingLicense).trim() : null;
    if (vehicleType !== undefined) data.vehicleType = vehicleType ? String(vehicleType).trim() : null;
    if (password !== undefined && password !== '') data.password = String(password);
    if (status !== undefined) data.status = Boolean(status);

    const updated = await prisma.driver.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update driver:', error);
    res.status(500).json({ error: 'Failed to update driver', details: error.message });
  }
});

// DELETE driver
driverRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.driver.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete driver:', error);
    res.status(500).json({ error: 'Failed to delete driver', details: error.message });
  }
});
