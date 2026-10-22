/**
 * Compresses an image file before storing in Firestore/localStorage
 * to avoid QuotaExceededError and Firestore 1MB document size limit.
 */
export async function compressImage(
  file: File, 
  maxDimension: number = 1200, 
  quality: number = 0.80,
  maxStringLength: number = 750000 // ~750KB limit to keep entire document well under 1MB
): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    let currentDim = maxDimension;
    let currentQuality = quality;
    let isPng = file.type === 'image/png';

    for (let attempt = 0; attempt < 6; attempt++) {
      let width = img.width;
      let height = img.height;

      if (width > currentDim || height > currentDim) {
        if (width > height) {
          height = Math.round((height * currentDim) / width);
          width = currentDim;
        } else {
          width = Math.round((width * currentDim) / height);
          height = currentDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) break;

      // Fill white background if saving as JPEG
      if (!isPng) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, currentQuality);

      if (dataUrl.length <= maxStringLength) {
        return dataUrl;
      }

      // If PNG dataURL exceeds maxStringLength (since browser toDataURL for PNG ignores quality), convert to JPEG
      if (isPng) {
        isPng = false;
      } else {
        currentDim = Math.round(currentDim * 0.8);
        currentQuality = Math.max(0.4, currentQuality - 0.1);
      }
    }

    // Emergency fallback canvas attempt
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;
    const targetDim = 1000;
    if (width > targetDim || height > targetDim) {
      if (width > height) {
        height = Math.round((height * targetDim) / width);
        width = targetDim;
      } else {
        width = Math.round((width * targetDim) / height);
        height = targetDim;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.65);
    }
    return '';
  } catch (e) {
    console.error('compressImage failed:', e);
    return '';
  }
}

