import imageCompression from 'browser-image-compression';

/**
 * Compresses a browser File to stay within maxSizeMB.
 * Returns the original file unchanged if it already fits.
 */
export async function compressImage(
  file: File,
  maxSizeMB = 5,
  maxWidthOrHeight = 2048,
): Promise<File> {
  if (file.size <= maxSizeMB * 1024 * 1024) return file;
  return imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: true });
}
