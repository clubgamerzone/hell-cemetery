import { getBlob, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/firebaseConfig';

export function sanitizeStorageSegment(value, fallback = 'asset') {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

function extensionForFile(file) {
  const mimeType = String(file?.type || '').toLowerCase();
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';

  const fileName = String(file?.name || '');
  const extension = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return extension || 'png';
}

function getImageDimensions(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: null, height: null });
    };

    image.src = objectUrl;
  });
}

export async function uploadEditorImage(file, storageBasePath) {
  const extension = extensionForFile(file);
  const storagePath = `${storageBasePath}.${extension}`;
  const mimeType = file.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  const dimensions = await getImageDimensions(file);
  const objectRef = ref(storage, storagePath);

  await uploadBytes(objectRef, file, {
    contentType: mimeType,
    customMetadata: {
      uploadedVia: 'hell-cemetery-web',
    },
  });

  const imageUrl = await getDownloadURL(objectRef);

  return {
    imageUrl,
    imageStoragePath: storagePath,
    imageMimeType: mimeType,
    imageWidth: dimensions.width,
    imageHeight: dimensions.height,
    imageVersion: Date.now(),
  };
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load image for optimization.'));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Unable to optimize image.'));
      }
    }, mimeType, quality);
  });
}

async function createReducedImageBlob(sourceBlob, options = {}) {
  const image = await loadImageFromBlob(sourceBlob);
  const maxDimension = options.maxDimension || 512;
  const targetMimeType = options.mimeType || sourceBlob.type || 'image/png';
  const quality = options.quality ?? 0.86;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, targetMimeType, quality);
  return { blob, width, height };
}

export async function reduceStoredImage(storagePath, fallbackUrl, options = {}) {
  if (!storagePath) {
    throw new Error('This image has no Firebase Storage path yet. Upload it first.');
  }

  const objectRef = ref(storage, storagePath);
  let sourceBlob;

  try {
    sourceBlob = await getBlob(objectRef);
  } catch {
    if (!fallbackUrl) throw new Error('Unable to read the current Storage image.');
    const response = await fetch(fallbackUrl);
    if (!response.ok) throw new Error('Unable to read the current image URL.');
    sourceBlob = await response.blob();
  }

  const optimized = await createReducedImageBlob(sourceBlob, options);
  if (optimized.blob.size >= sourceBlob.size && optimized.width === options.currentWidth && optimized.height === options.currentHeight) {
    return {
      reduced: false,
      originalBytes: sourceBlob.size,
      optimizedBytes: optimized.blob.size,
    };
  }

  await uploadBytes(objectRef, optimized.blob, {
    contentType: optimized.blob.type || options.mimeType || sourceBlob.type || 'image/png',
    customMetadata: {
      optimizedVia: 'hell-cemetery-web',
    },
  });

  const imageUrl = await getDownloadURL(objectRef);
  return {
    reduced: optimized.blob.size < sourceBlob.size,
    originalBytes: sourceBlob.size,
    optimizedBytes: optimized.blob.size,
    imageUrl,
    imageStoragePath: storagePath,
    imageMimeType: optimized.blob.type || options.mimeType || sourceBlob.type || 'image/png',
    imageWidth: optimized.width,
    imageHeight: optimized.height,
    imageVersion: Date.now(),
  };
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
