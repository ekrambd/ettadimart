import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const categoryRouter = Router();

// GET all categories
categoryRouter.get('/', async (_req, res) => {
  try {
    const items = await (prisma as any).category.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET by ID
categoryRouter.get('/:id', async (req, res) => {
  try {
    const item = await (prisma as any).category.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Category not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST create
categoryRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    if (!data.name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const item = await (prisma as any).category.create({
      data: {
        id: data.id || undefined,
        name: data.name,
        slug,
        parentId: data.parentId || null,
        description: data.description || null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        image: data.image || null,
        icon: data.icon || null,
        order: data.order !== undefined ? Number(data.order) : 0,
        subcategories: data.subcategories ? (typeof data.subcategories === 'string' ? data.subcategories : JSON.stringify(data.subcategories)) : null
      }
    });
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Failed to create category:', error);
    res.status(500).json({ error: error.message || 'Failed to create category' });
  }
});

// PUT update
categoryRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const item = await (prisma as any).category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.parentId !== undefined && { parentId: data.parentId || null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.order !== undefined && { order: Number(data.order) }),
        ...(data.subcategories !== undefined && {
          subcategories: typeof data.subcategories === 'string' ? data.subcategories : JSON.stringify(data.subcategories)
        })
      }
    });
    res.json(item);
  } catch (error: any) {
    console.error('Failed to update category:', error);
    res.status(500).json({ error: error.message || 'Failed to update category' });
  }
});

// DELETE
categoryRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Also delete any child sub-categories
    await (prisma as any).category.deleteMany({
      where: { parentId: id }
    });
    await (prisma as any).category.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Category removed successfully' });
  } catch (error: any) {
    console.error('Failed to delete category:', error);
    res.status(500).json({ error: error.message || 'Failed to delete category' });
  }
});
