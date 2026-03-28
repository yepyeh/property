interface R2BucketLike {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{
    body: ReadableStream | null;
    httpMetadata?: { contentType?: string };
  } | null>;
}

interface RuntimeLike {
  env?: {
    LISTING_IMAGES?: R2BucketLike;
  };
}

export function getImageBucket(runtime?: RuntimeLike | null) {
  return runtime?.env?.LISTING_IMAGES;
}

export function makeImageKey(listingSlug: string, filename: string) {
  const safeName = filename.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
  return `${listingSlug}/${Date.now()}-${safeName}`;
}
