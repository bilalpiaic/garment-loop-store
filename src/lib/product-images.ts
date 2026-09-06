export const PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const MAX_PRODUCT_IMAGE_BYTES = 4.5 * 1024 * 1024;

export function extensionForImageType(type: string) {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return null;
  }
}

export function isProductImageSrc(src: string) {
  const value = src.trim();
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isLocalUploadSrc(src: string) {
  return src.startsWith("/uploads/");
}
