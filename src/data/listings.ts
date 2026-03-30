import { generatedSeaListings } from "./generated-sea-listings";

export type ListingIntent = "buy" | "rent";
export type ListingType = "Villa" | "Condo" | "Townhouse" | "Apartment" | "Land" | "House";
export type ListingTone = "sea" | "sun" | "forest" | "night" | "clay" | "sky";
export type ListingSaleMode = "private-sale" | "auction";

export interface ListingNeighborhood {
  headline: string;
  commute: string;
  nearby: string[];
  trustSignals: string[];
}

export interface ListingLocation {
  lat: number;
  lng: number;
  precisionLabel: string;
}

export interface Listing {
  slug: string;
  title: string;
  country: string;
  city: string;
  district: string;
  ward: string;
  type: ListingType;
  intent: ListingIntent;
  priceLabel: string;
  numericPrice: number;
  priceUnit: string;
  beds: number;
  baths: number;
  area: number;
  status: string;
  tone: ListingTone;
  summary: string;
  description: string;
  tags: string[];
  features: string[];
  owner: {
    name: string;
    role: string;
    responseTime: string;
    verified: boolean;
  };
  stats: {
    views24h: number;
    saves: number;
    enquiries: number;
  };
  location?: ListingLocation;
  neighborhood?: ListingNeighborhood;
  imageKeys?: string[];
  imageUrls?: string[];
  coverFocus?: {
    x: number;
    y: number;
  };
  commerce?: {
    planType: "free_trial" | "paid" | "promoted";
    trialEndsAt?: string | null;
    paidUntil?: string | null;
    promotedUntil?: string | null;
  };
  saleMode?: ListingSaleMode;
  auction?: {
    startsAt?: string | null;
    endsAt?: string | null;
    startingPriceLabel?: string | null;
    reservePriceLabel?: string | null;
    terms?: string | null;
    phase: "scheduled" | "live" | "ended";
  };
}

export function getAuctionPhase(auction?: Listing["auction"]) {
  if (!auction) return undefined;
  const now = Date.now();
  const startsAt = auction.startsAt ? new Date(auction.startsAt).getTime() : Number.NEGATIVE_INFINITY;
  const endsAt = auction.endsAt ? new Date(auction.endsAt).getTime() : Number.POSITIVE_INFINITY;
  if (startsAt > now) return "scheduled" as const;
  if (endsAt > now) return "live" as const;
  return "ended" as const;
}

function formatRelativeCountdown(targetTime: number, now = Date.now()) {
  const diffMs = Math.max(0, targetTime - now);
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.ceil(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export function getAuctionTimingLabel(auction?: Listing["auction"]) {
  if (!auction) return null;

  const now = Date.now();
  const startsAt = auction.startsAt ? new Date(auction.startsAt).getTime() : null;
  const endsAt = auction.endsAt ? new Date(auction.endsAt).getTime() : null;
  const phase = getAuctionPhase(auction);

  if (phase === "ended") {
    return "Auction ended";
  }

  if (phase === "scheduled" && startsAt) {
    return `Auction starts in ${formatRelativeCountdown(startsAt, now)}`;
  }

  if (phase === "live" && endsAt) {
    return `Auction ends in ${formatRelativeCountdown(endsAt, now)}`;
  }

  return phase === "live" ? "Auction live" : "Auction scheduled";
}

export interface AuctionTimelineStep {
  key: string;
  title: string;
  body: string;
  state: "complete" | "active" | "upcoming";
}

export function buildAuctionTimeline(auction?: Listing["auction"]) {
  if (!auction) return [] as AuctionTimelineStep[];

  const phase = getAuctionPhase(auction) || "scheduled";

  return [
    {
      key: "review",
      title: "Review the pack and inspect the property",
      body: "Check the legal pack, condition, reserve guidance, and local comparables before you commit to bidding.",
      state: phase === "scheduled" ? "active" : "complete",
    },
    {
      key: "register",
      title: "Register to bid before the window opens",
      body: "Confirm identity, funds readiness, and the route you want to use: online, telephone, or absentee proxy bidding.",
      state: phase === "scheduled" ? "active" : "complete",
    },
    {
      key: "live",
      title: "Track the live window and bid discipline",
      body: "Use your maximum as a ceiling, stay alert for extensions, and keep the platform notifications working for you.",
      state: phase === "live" ? "active" : phase === "ended" ? "complete" : "upcoming",
    },
    {
      key: "close",
      title: "Confirm the outcome and next steps",
      body: "If the lot sells, move into post-auction completion. If it passes in, watch for follow-up and unsold opportunities.",
      state: phase === "ended" ? "active" : "upcoming",
    },
  ];
}

export const listings: Listing[] = generatedSeaListings as Listing[];

export function getListingBySlug(slug: string) {
  return listings.find((listing) => listing.slug === slug);
}

export function getFeaturedListings() {
  return listings.slice(0, 6);
}

export function buildListingNeighborhoodContext(listing: Pick<Listing, "country" | "city" | "district" | "ward" | "intent" | "owner" | "stats"> & { neighborhood?: ListingNeighborhood }): ListingNeighborhood {
  if (listing.neighborhood) {
    return listing.neighborhood;
  }

  const locationLabel = [listing.ward, listing.district, listing.city, listing.country].filter(Boolean).join(", ");
  const buyerLead = listing.intent === "rent"
    ? "built around daily convenience and move-in confidence"
    : "positioned for longer-term location confidence";

  return {
    headline: `${locationLabel} is ${buyerLead}, with local services and district access doing most of the trust work for this listing.`,
    commute: "The location supports practical movement into the strongest business and lifestyle districts for the city while keeping daily services close to home.",
    nearby: [
      `${listing.district} daily services`,
      `${listing.city} retail and dining access`,
      `${listing.country} district connectivity`,
    ],
    trustSignals: [
      listing.owner.verified ? "Verified owner or operator" : "Direct owner listing",
      `${listing.stats.saves} recent saves`,
      `${listing.stats.enquiries} active buyer enquiries`,
    ],
  };
}

const fallbackLocationByCity: Record<string, ListingLocation> = {
  "Ho Chi Minh City": { lat: 10.7769, lng: 106.7009, precisionLabel: "Approximate city-level location" },
  Hanoi: { lat: 21.0285, lng: 105.8542, precisionLabel: "Approximate city-level location" },
  "Da Nang": { lat: 16.0544, lng: 108.2022, precisionLabel: "Approximate city-level location" },
  Singapore: { lat: 1.3521, lng: 103.8198, precisionLabel: "Approximate city-level location" },
  Jakarta: { lat: -6.2088, lng: 106.8456, precisionLabel: "Approximate city-level location" },
  Bangkok: { lat: 13.7563, lng: 100.5018, precisionLabel: "Approximate city-level location" },
  Manila: { lat: 14.5995, lng: 120.9842, precisionLabel: "Approximate city-level location" },
  "Kuala Lumpur": { lat: 3.139, lng: 101.6869, precisionLabel: "Approximate city-level location" },
  "Bandar Seri Begawan": { lat: 4.9031, lng: 114.9398, precisionLabel: "Approximate city-level location" },
  Yangon: { lat: 16.8409, lng: 96.1735, precisionLabel: "Approximate city-level location" },
  "Phnom Penh": { lat: 11.5564, lng: 104.9282, precisionLabel: "Approximate city-level location" },
  Vientiane: { lat: 17.9757, lng: 102.6331, precisionLabel: "Approximate city-level location" },
};

export function buildListingLocationContext(listing: Pick<Listing, "city"> & { location?: ListingLocation }): ListingLocation | undefined {
  if (listing.location) {
    return listing.location;
  }

  return fallbackLocationByCity[listing.city];
}
