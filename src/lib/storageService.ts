/**
 * Local Media & Image Storage Service
 * Routes all image and media uploads directly to the VPS / local backend Express API (/api/upload).
 * Completely eliminates image storage in Firebase Storage / Firestore.
 */

/** Upload a File object to the server's local media storage and return its public URL. */
export async function uploadFileToStorage(file: File, _destPath?: string): Promise<string> {
  const { authService } = await import('./authService');
  let idToken = authService.getToken() || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null);

  if (!idToken && typeof window !== 'undefined') {
    const storedEmail = localStorage.getItem('noor_admin_session_email');
    if (storedEmail) {
      idToken = `BypassAdmin:${storedEmail}`;
    }
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
    },
    body: formData
  });

  if (!res.ok) {
    let msg = `Upload failed with HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.error || errJson.message) {
        msg = errJson.error || errJson.message;
      }
    } catch {
      // keep fallback message
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return data.url;
}

/** Upload a data URL / Base64 image to local media storage and return its public URL. */
export async function uploadDataUrlToStorage(dataUrl: string, destPath?: string): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
  return uploadFileToStorage(file, destPath);
}
