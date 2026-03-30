interface R2BucketLike {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{
    body: ReadableStream | null;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete(key: string): Promise<unknown>;
}

interface RuntimeLike {
  env?: {
    LISTING_IMAGES?: R2BucketLike;
  };
}

export function getImageBucket(runtime?: RuntimeLike | null) {
  return runtime?.env?.LISTING_IMAGES;
}

export function makeImageKey(listingSlug: string, filename: string, extension = "webp") {
  const baseName = filename.replace(/\.[^.]+$/, "");
  const safeName = baseName.toLowerCase().replace(/[^a-z0-9\-_]+/g, "-").replace(/^-+|-+$/g, "") || "listing-image";
  return `${listingSlug}/${Date.now()}-${safeName}.${extension}`;
}

const INTERIOR_REFERENCE_IMAGES = [
  "naomi-hebert-mp0bgas-d1c-unsplash.webp",
  "francesca-tosolini-thkjamco3qe-unsplash.webp",
  "minh-pham-7pcfuybp-p8-unsplash.webp",
  "rhema-kallianpur-jbj-_hw2yag-unsplash.webp",
  "scott-lorsch-cqvdb3bvmcy-unsplash.webp",
  "vita-vilcina-ktoid0fljqu-unsplash.webp",
];

const EXTERIOR_REFERENCE_IMAGES = [
  "patrick-perkins-3wyldrjxh-e-unsplash.webp",
  "john-fornander-y3_ahhrxuby-unsplash.webp",
  "allphoto-bangkok-ni4ac1katrc-unsplash.webp",
  "webaliser-_tptxzd9moo-unsplash.webp",
  "douglas-sheppard-9ryfg8swrvo-unsplash.webp",
  "ross-joyner-tx6dbimwbv0-unsplash.webp",
];

const PREMIUM_REFERENCE_IMAGES = [
  "becca-tapert-ugak0qtrphm-unsplash.webp",
  "don-kaveen-4llhjhyxqvk-unsplash.webp",
  "patrick-perkins-irivzala4pi-unsplash.webp",
  "alejandra-cifre-gonzalez-ylyn5r4vxca-unsplash.webp",
  "frames-for-your-heart-2d4laqalbda-unsplash.webp",
  "reilly-nicholls-fsrh8cn_3wo-unsplash.webp",
];

const LAND_REFERENCE_IMAGES = [
  "huy-nguyen-ab-q9lwcvv8-unsplash.webp",
  "derrick-brooks-ke8m-uh2nvo-unsplash.webp",
  "douglas-sheppard-9ryfg8swrvo-unsplash.webp",
  "webaliser-_tptxzd9moo-unsplash.webp",
];

function hashSlug(value: string) {
  return Array.from(value).reduce((accumulator, character) => ((accumulator * 31) + character.charCodeAt(0)) >>> 0, 7);
}

function rotatePool(pool: string[], seed: number, count = 3) {
  return Array.from({ length: Math.min(count, pool.length) }, (_, index) => pool[(seed + index) % pool.length]).map(
    (name) => `/photography/${name}`
  );
}

export function getFallbackListingImageUrls(input: { slug: string; type?: string; saleMode?: string | null }) {
  const seed = hashSlug(input.slug);
  const pool =
    input.saleMode === "auction"
      ? PREMIUM_REFERENCE_IMAGES
      : input.type === "Land"
        ? LAND_REFERENCE_IMAGES
        : input.type === "House" || input.type === "Townhouse"
          ? EXTERIOR_REFERENCE_IMAGES
          : input.type === "Villa"
            ? PREMIUM_REFERENCE_IMAGES
            : INTERIOR_REFERENCE_IMAGES;

  return rotatePool(pool, seed % pool.length);
}
