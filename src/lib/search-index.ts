import { getCollection } from "astro:content";
import type { Listing } from "../data/listings";

export interface SearchIndexEntry {
  id: string;
  kind: "listing" | "auction" | "help" | "city-guide" | "district-guide";
  title: string;
  href: string;
  locale: string;
  summary: string;
  body: string;
  tags: string[];
  meta: Record<string, string | number | boolean | null>;
}

export function buildListingIndexEntries(listings: Listing[], locale = "en") {
  return listings.map<SearchIndexEntry>((listing) => ({
    id: `listing:${listing.slug}`,
    kind: listing.saleMode === "auction" ? "auction" : "listing",
    title: listing.title,
    href: `/listings/${listing.slug}/`,
    locale,
    summary: listing.summary,
    body: [
      listing.description,
      listing.neighborhood?.headline,
      listing.neighborhood?.commute,
      ...(listing.neighborhood?.nearby || []),
      ...(listing.features || []),
      ...(listing.tags || []),
    ]
      .filter(Boolean)
      .join("\n"),
    tags: [
      listing.country,
      listing.city,
      listing.district,
      listing.ward,
      listing.type,
      listing.intent,
      listing.saleMode || "private-sale",
      ...(listing.tags || []),
    ].filter(Boolean),
    meta: {
      country: listing.country,
      city: listing.city,
      district: listing.district,
      ward: listing.ward,
      propertyType: listing.type,
      intent: listing.intent,
      saleMode: listing.saleMode || "private-sale",
      priceLabel: listing.priceLabel,
      numericPrice: listing.numericPrice,
      ownerVerified: listing.owner.verified,
      views24h: listing.stats.views24h,
      saves: listing.stats.saves,
      enquiries: listing.stats.enquiries,
    },
  }));
}

export function buildAreaGuideIndexEntries(listings: Listing[], locale = "en") {
  const cityMap = new Map<string, Listing[]>();
  const districtMap = new Map<string, Listing[]>();

  for (const listing of listings) {
    const cityKey = `${listing.country}::${listing.city}`;
    const districtKey = `${listing.country}::${listing.city}::${listing.district}`;
    cityMap.set(cityKey, [...(cityMap.get(cityKey) || []), listing]);
    districtMap.set(districtKey, [...(districtMap.get(districtKey) || []), listing]);
  }

  const cityEntries = Array.from(cityMap.entries()).map<SearchIndexEntry>(([key, entries]) => {
    const sample = entries[0];
    const slugCountry = sample.country.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const slugCity = sample.city.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return {
      id: `city-guide:${key}`,
      kind: "city-guide",
      title: `${sample.city} property guide`,
      href: `/guides/${slugCountry}/${slugCity}/`,
      locale,
      summary: `${sample.city} guide for buyers, renters, and owners with market context and inventory direction.`,
      body: entries
        .slice(0, 12)
        .map((listing) => [listing.title, listing.summary, listing.neighborhood?.headline].filter(Boolean).join(" "))
        .join("\n"),
      tags: [sample.country, sample.city, "guide", "market"],
      meta: {
        country: sample.country,
        city: sample.city,
        listingCount: entries.length,
      },
    };
  });

  const districtEntries = Array.from(districtMap.entries()).map<SearchIndexEntry>(([key, entries]) => {
    const sample = entries[0];
    const slugCountry = sample.country.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const slugCity = sample.city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const slugDistrict = sample.district.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return {
      id: `district-guide:${key}`,
      kind: "district-guide",
      title: `${sample.district} property guide`,
      href: `/guides/${slugCountry}/${slugCity}/${slugDistrict}/`,
      locale,
      summary: `${sample.district} guide with district-level context, price band, and inventory fit.`,
      body: entries
        .slice(0, 12)
        .map((listing) => [listing.title, listing.summary, listing.neighborhood?.headline].filter(Boolean).join(" "))
        .join("\n"),
      tags: [sample.country, sample.city, sample.district, "guide", "district"],
      meta: {
        country: sample.country,
        city: sample.city,
        district: sample.district,
        listingCount: entries.length,
      },
    };
  });

  return [...cityEntries, ...districtEntries];
}

export async function buildHelpIndexEntries(locale = "en") {
  const articles = await getCollection("help");
  return articles.map<SearchIndexEntry>((article) => ({
    id: `help:${article.id}`,
    kind: "help",
    title: article.data.title,
    href: `/help/${article.id}/`,
    locale,
    summary: article.data.description,
    body: typeof article.body === "string" ? article.body : "",
    tags: [article.data.category, ...article.data.audience],
    meta: {
      category: article.data.category,
      updatedAt: article.data.updatedAt,
      audience: article.data.audience.join(","),
    },
  }));
}
