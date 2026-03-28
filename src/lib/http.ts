export function sanitizeInternalRedirect(input: string | null | undefined, fallback = "/") {
  const value = String(input || "").trim();
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;

  try {
    const url = new URL(value, "https://property-app.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function appendQueryFlag(path: string, key: string, value = "1") {
  const safePath = sanitizeInternalRedirect(path, "/");
  const separator = safePath.includes("?") ? "&" : "?";
  return `${safePath}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
