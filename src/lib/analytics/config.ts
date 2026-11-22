/** Only allow typical GA4 / Meta id characters so values are safe in script snippets. */
function sanitizePublicId(raw: string) {
  const value = raw.trim();
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : "";
}

/** Public measurement IDs — empty when unset (safe no-op). Never invent IDs. */
export function gaMeasurementId() {
  return sanitizePublicId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "");
}

export function metaPixelId() {
  return sanitizePublicId(process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "");
}

export function analyticsConfigured() {
  return Boolean(gaMeasurementId() || metaPixelId());
}
