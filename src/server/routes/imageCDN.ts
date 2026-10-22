import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const imageRouter = Router();

imageRouter.get('/*', async (req, res) => {
  try {
    // The path requested (e.g. /cdn/uploads/123.jpg)
    const filepath = decodeURIComponent(req.path).replace(/^\//, '');
    const w = parseInt(req.query.w as string);
    const q = parseInt(req.query.q as string) || 80;
    const format = (req.query.format as string) || 'webp';

    const originalPath = path.join(process.cwd(), 'public', filepath);
    const distPath = path.join(process.cwd(), 'dist', filepath);
    
    // Check if file exists in public or dist
    let sourcePath = '';
    if (fs.existsSync(originalPath)) sourcePath = originalPath;
    else if (fs.existsSync(distPath)) sourcePath = distPath;
    
    if (!sourcePath) {
      return res.status(404).send('Image not found');
    }

    // If no resize is requested, just send the original file with long-term cache headers
    if (!w && !req.query.format) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(sourcePath);
    }

    const cacheDir = path.join(process.cwd(), 'public', '.cache', 'img');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Create a safe cache filename
    const hash = Buffer.from(filepath).toString('base64').replace(/[/+=]/g, '');
    const cachedFilename = `${hash}-${w || 'orig'}w-q${q}.${format}`;
    const cachedPath = path.join(cacheDir, cachedFilename);

    if (fs.existsSync(cachedPath)) {
      res.setHeader('Content-Type', `image/${format}`);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(cachedPath);
    }

    let transformer = sharp(sourcePath);
    
    if (w) {
      transformer = transformer.resize(w, null, { withoutEnlargement: true });
    }
    
    if (format === 'webp') {
      transformer = transformer.webp({ quality: q });
    } else if (format === 'avif') {
      transformer = transformer.avif({ quality: q });
    } else if (format === 'png') {
      transformer = transformer.png({ quality: q });
    } else {
      transformer = transformer.jpeg({ quality: q });
    }

    const data = await transformer.toBuffer();
    
    // Cache the output
    fs.writeFileSync(cachedPath, data);

    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(data);
  } catch (error) {
    console.error('Image CDN error:', error);
    res.status(500).send('Error processing image');
  }
});

export { imageRouter };
