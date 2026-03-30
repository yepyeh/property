import type { OwnerAccount } from "./auth";
import type { Listing } from "../data/listings";

export interface ComparableInsight {
  slug: string;
  title: string;
  priceLabel: string;
  locationLabel: string;
  reasons: string[];
}

export interface ListingInsights {
  free: {
    comparableCount: number;
    districtMedianLabel: string;
    averagePricePerSqmLabel: string;
    pricingPositionLabel: string;
    rangeLabel: string;
    demandLabel: string;
  };
  premium: {
    pricingBandLabel: string;
    percentileLabel: string;
    narrative: string;
    comparableListings: ComparableInsight[];
  };
}

export interface AreaGuideInsights {
  key: string;
  country: string;
  city: string;
  district?: string;
  listingCount: number;
  free: {
    priceBandLabel: string;
    demandLabel: string;
    marketPaceLabel: string;
    bestFor: string[];
    topPropertyTypes: string[];
    topDistricts: string[];
  };
  premium: {
    pricingNarrative: string;
    renterVsBuyerLabel: string;
    topComparables: ComparableInsight[];
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function formatAmount(value: number, unit: string) {
  return `${formatNumber(value)} ${unit}`;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function percentileRank(target: number, values: number[]) {
  if (!values.length) return 50;
  const lower = values.filter((value) => value <= target).length;
  return Math.round((lower / values.length) * 100);
}

function slugifyPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function scoreComparable(target: Listing, candidate: Listing) {
  let score = 0;
  if (candidate.country === target.country) score += 2;
  if (candidate.city === target.city) score += 4;
  if (candidate.district === target.district) score += 5;
  if (candidate.type === target.type) score += 4;
  if (candidate.intent === target.intent) score += 3;
  if ((candidate.saleMode || "private-sale") === (target.saleMode || "private-sale")) score += 2;
  score -= Math.abs(candidate.beds - target.beds);
  score -= Math.abs(candidate.area - target.area) / 35;
  score -= Math.abs(candidate.numericPrice - target.numericPrice) / Math.max(target.numericPrice, 1);
  return score;
}

function buildComparableReasons(target: Listing, candidate: Listing) {
  const reasons: string[] = [];
  if (candidate.district === target.district) reasons.push("same district");
  if (candidate.type === target.type) reasons.push("same property type");
  if (candidate.beds === target.beds) reasons.push("same bedroom count");
  if (Math.abs(candidate.area - target.area) <= 20) reasons.push("similar floor area");
  if (!reasons.length) reasons.push("same city market");
  return reasons.slice(0, 3);
}

function getComparableListings(target: Listing, listings: Listing[]) {
  return listings
    .filter((candidate) => candidate.slug !== target.slug && candidate.intent === target.intent)
    .sort((a, b) => scoreComparable(target, b) - scoreComparable(target, a))
    .slice(0, 12);
}

function getDemandLabel(comparables: Listing[]) {
  if (!comparables.length) return "Limited local demand data yet.";
  const averageSaves = comparables.reduce((sum, listing) => sum + listing.stats.saves, 0) / comparables.length;
  const averageEnquiries = comparables.reduce((sum, listing) => sum + listing.stats.enquiries, 0) / comparables.length;

  if (averageEnquiries >= 6 || averageSaves >= 18) {
    return "High buyer interest in comparable inventory.";
  }

  if (averageEnquiries >= 3 || averageSaves >= 10) {
    return "Steady interest across comparable listings.";
  }

  return "Demand looks selective rather than frantic in this pocket.";
}

function getMarketPaceLabel(listings: Listing[]) {
  if (!listings.length) return "New market pocket";
  const avgViews = listings.reduce((sum, listing) => sum + listing.stats.views24h, 0) / listings.length;
  if (avgViews >= 85) return "Fast-moving market";
  if (avgViews >= 55) return "Active market";
  if (avgViews >= 30) return "Steady market";
  return "Selective market";
}

function getAreaBestFor(listings: Listing[]) {
  const types = new Set<string>();
  const intents = new Set<string>();
  for (const listing of listings) {
    intents.add(listing.intent);
    if (listing.type === "Condo" || listing.type === "Apartment") types.add("urban buyers and renters");
    if (listing.type === "Villa" || listing.type === "House") types.add("families");
    if (listing.type === "Land") types.add("longer-hold investors");
    if (listing.saleMode === "auction") types.add("auction-led opportunities");
  }
  if (intents.has("rent")) types.add("relocation and move-in-ready search");
  if (intents.has("buy")) types.add("buyers comparing long-term value");
  return Array.from(types).slice(0, 4);
}

function getTopPropertyTypes(listings: Listing[]) {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    counts.set(listing.type, (counts.get(listing.type) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);
}

function getTopDistricts(listings: Listing[]) {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    counts.set(listing.district, (counts.get(listing.district) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([district]) => district);
}

function getPriceBandLabel(listings: Listing[]) {
  const values = listings.map((listing) => listing.numericPrice).filter(Boolean);
  if (!values.length) return "Market band still forming";
  return `${formatAmount(Math.min(...values), listings[0].priceUnit)} to ${formatAmount(Math.max(...values), listings[0].priceUnit)}`;
}

function getRenterVsBuyerLabel(listings: Listing[]) {
  const buyCount = listings.filter((listing) => listing.intent === "buy").length;
  const rentCount = listings.filter((listing) => listing.intent === "rent").length;
  if (buyCount > rentCount * 1.3) return "Buy-side supply dominates here.";
  if (rentCount > buyCount * 1.3) return "Rental-led inventory dominates here.";
  return "Buy and rent supply are both active here.";
}

function getAreaPricingNarrative(areaLabel: string, listings: Listing[]) {
  const pace = getMarketPaceLabel(listings).toLowerCase();
  const topTypes = getTopPropertyTypes(listings);
  const bestFor = getAreaBestFor(listings);
  return `${areaLabel} looks like a ${pace} with ${topTypes.join(", ").toLowerCase()} doing most of the visible supply work. It is strongest for ${bestFor.slice(0, 2).join(" and ")}.`;
}

function getPricingPositionLabel(target: Listing, medianPrice: number) {
  if (!medianPrice) return "Comparable pricing data is still thin.";
  const ratio = target.numericPrice / medianPrice;
  if (ratio <= 0.92) return "Priced below the local comparable median.";
  if (ratio >= 1.08) return "Priced above the local comparable median.";
  return "Priced close to the local comparable median.";
}

function getPremiumNarrative(target: Listing, percentile: number) {
  if (percentile <= 30) {
    return `${target.title} is landing in the cheaper end of the comparable set. Check condition and fit, because it may be a value entry point.`;
  }
  if (percentile >= 70) {
    return `${target.title} is landing in the upper end of the comparable set. Buyers should expect stronger positioning, finish quality, or scarcity to justify it.`;
  }
  return `${target.title} is sitting in the middle of the comparable market. The decision will come down to trust, layout quality, and location fit more than price alone.`;
}

export function buildListingInsights(target: Listing, listings: Listing[]): ListingInsights {
  const comparables = getComparableListings(target, listings);
  const priceValues = comparables.map((listing) => listing.numericPrice).filter(Boolean);
  const perSqmValues = comparables
    .filter((listing) => listing.area > 0)
    .map((listing) => listing.numericPrice / listing.area);

  const medianPrice = median(priceValues);
  const avgPerSqm = perSqmValues.length ? perSqmValues.reduce((sum, value) => sum + value, 0) / perSqmValues.length : 0;
  const percentile = percentileRank(target.numericPrice, priceValues);
  const lowerBand = priceValues.length ? Math.min(...priceValues) : 0;
  const upperBand = priceValues.length ? Math.max(...priceValues) : 0;

  return {
    free: {
      comparableCount: comparables.length,
      districtMedianLabel: medianPrice ? formatAmount(medianPrice, target.priceUnit) : "Not enough local comparables yet",
      averagePricePerSqmLabel: avgPerSqm ? `${formatAmount(avgPerSqm, target.priceUnit)} / m2` : "Not enough area data yet",
      pricingPositionLabel: getPricingPositionLabel(target, medianPrice),
      rangeLabel: lowerBand && upperBand ? `${formatAmount(lowerBand, target.priceUnit)} to ${formatAmount(upperBand, target.priceUnit)}` : "Range still forming",
      demandLabel: getDemandLabel(comparables),
    },
    premium: {
      pricingBandLabel: lowerBand && upperBand ? `${formatAmount(lowerBand, target.priceUnit)} to ${formatAmount(upperBand, target.priceUnit)}` : "Comparable band unavailable",
      percentileLabel: `${percentile}th percentile against local comparables`,
      narrative: getPremiumNarrative(target, percentile),
      comparableListings: comparables.slice(0, 3).map((listing) => ({
        slug: listing.slug,
        title: listing.title,
        priceLabel: listing.priceLabel,
        locationLabel: `${listing.ward}, ${listing.district}, ${listing.city}`,
        reasons: buildComparableReasons(target, listing),
      })),
    },
  };
}

export function buildAreaGuideInsights(country: string, city: string, listings: Listing[], district?: string): AreaGuideInsights {
  const areaListings = listings.filter((listing) =>
    listing.country === country &&
    listing.city === city &&
    (!district || listing.district === district)
  );

  const areaLabel = district ? `${district}, ${city}` : city;
  const topComparables = areaListings
    .slice()
    .sort((a, b) => (b.stats.saves + b.stats.enquiries) - (a.stats.saves + a.stats.enquiries))
    .slice(0, 3)
    .map((listing) => ({
      slug: listing.slug,
      title: listing.title,
      priceLabel: listing.priceLabel,
      locationLabel: `${listing.ward}, ${listing.district}, ${listing.city}`,
      reasons: buildComparableReasons(areaListings[0] || listing, listing),
    }));

  return {
    key: district ? `${slugifyPart(country)}/${slugifyPart(city)}/${slugifyPart(district)}` : `${slugifyPart(country)}/${slugifyPart(city)}`,
    country,
    city,
    district,
    listingCount: areaListings.length,
    free: {
      priceBandLabel: getPriceBandLabel(areaListings),
      demandLabel: getDemandLabel(areaListings),
      marketPaceLabel: getMarketPaceLabel(areaListings),
      bestFor: getAreaBestFor(areaListings),
      topPropertyTypes: getTopPropertyTypes(areaListings),
      topDistricts: district ? [] : getTopDistricts(areaListings),
    },
    premium: {
      pricingNarrative: getAreaPricingNarrative(areaLabel, areaListings),
      renterVsBuyerLabel: getRenterVsBuyerLabel(areaListings),
      topComparables,
    },
  };
}

export function getGuideMarkets(listings: Listing[]) {
  const cityMap = new Map<string, { country: string; city: string }>();
  const districtMap = new Map<string, { country: string; city: string; district: string }>();

  for (const listing of listings) {
    cityMap.set(`${listing.country}::${listing.city}`, { country: listing.country, city: listing.city });
    districtMap.set(`${listing.country}::${listing.city}::${listing.district}`, {
      country: listing.country,
      city: listing.city,
      district: listing.district,
    });
  }

  return {
    cities: [...cityMap.values()].sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city)),
    districts: [...districtMap.values()].sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city) || a.district.localeCompare(b.district)),
  };
}

export function matchGuideCity(countrySlug: string, citySlug: string, listings: Listing[]) {
  const { cities } = getGuideMarkets(listings);
  return cities.find((entry) => slugifyPart(entry.country) === countrySlug && slugifyPart(entry.city) === citySlug) || null;
}

export function matchGuideDistrict(countrySlug: string, citySlug: string, districtSlug: string, listings: Listing[]) {
  const { districts } = getGuideMarkets(listings);
  return districts.find((entry) =>
    slugifyPart(entry.country) === countrySlug &&
    slugifyPart(entry.city) === citySlug &&
    slugifyPart(entry.district) === districtSlug
  ) || null;
}

export function hasPremiumInsightsAccess(viewer?: OwnerAccount | null) {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  return ["paid", "promoted", "premium", "enterprise", "concierge"].includes(viewer.plan_tier);
}
