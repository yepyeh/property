export type ListingIntent = "buy" | "rent";
export type ListingType = "Villa" | "Condo" | "Townhouse" | "Apartment" | "Land" | "House";
export type ListingTone = "sea" | "sun" | "forest" | "night" | "clay" | "sky";

export interface Listing {
  slug: string;
  title: string;
  city: string;
  district: string;
  ward: string;
  type: ListingType;
  intent: ListingIntent;
  priceLabel: string;
  numericPrice: number;
  priceUnit: "VND" | "VND / month";
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
  imageKeys?: string[];
  imageUrls?: string[];
}

export const listings: Listing[] = [
  {
    slug: "riverside-family-villa-thu-duc",
    title: "Riverside family villa",
    city: "Ho Chi Minh City",
    district: "Thu Duc City",
    ward: "Thao Dien",
    type: "Villa",
    intent: "buy",
    priceLabel: "15.8B VND",
    numericPrice: 15.8,
    priceUnit: "VND",
    beds: 4,
    baths: 5,
    area: 380,
    status: "Verified owner",
    tone: "sea",
    summary: "Large family villa with river views, private garden, and direct access to international schools.",
    description:
      "Designed for households that want space without leaving the city core, this villa balances privacy, natural light, and fast access to Thu Thiem and District 1.",
    tags: ["Riverfront", "Family home", "Pet friendly"],
    features: ["Private garden", "Home office", "Pool deck", "Covered parking"],
    owner: {
      name: "Linh Tran",
      role: "Owner",
      responseTime: "~12 minutes",
      verified: true,
    },
    stats: {
      views24h: 214,
      saves: 38,
      enquiries: 11,
    },
  },
  {
    slug: "district-1-skyline-apartment",
    title: "District 1 skyline apartment",
    city: "Ho Chi Minh City",
    district: "District 1",
    ward: "Ben Nghe",
    type: "Condo",
    intent: "buy",
    priceLabel: "8.2B VND",
    numericPrice: 8.2,
    priceUnit: "VND",
    beds: 2,
    baths: 2,
    area: 96,
    status: "High demand",
    tone: "sun",
    summary: "High-floor condo for buyers who want a central address and clean, modern interiors.",
    description:
      "This unit is aimed at urban professionals and investors who want a polished residence close to offices, dining, and walkable city energy.",
    tags: ["City view", "Investor ready", "Walkable"],
    features: ["Balcony", "Gym access", "Concierge", "Smart lock"],
    owner: {
      name: "Ngoc Pham",
      role: "Exclusive seller",
      responseTime: "~6 minutes",
      verified: true,
    },
    stats: {
      views24h: 301,
      saves: 54,
      enquiries: 18,
    },
  },
  {
    slug: "remote-work-townhouse-da-nang",
    title: "Remote-work townhouse",
    city: "Da Nang",
    district: "Hai Chau",
    ward: "Binh Hien",
    type: "Townhouse",
    intent: "buy",
    priceLabel: "6.7B VND",
    numericPrice: 6.7,
    priceUnit: "VND",
    beds: 3,
    baths: 3,
    area: 210,
    status: "New this week",
    tone: "forest",
    summary: "Bright townhouse with a dedicated studio floor and calm, work-from-home-friendly layout.",
    description:
      "Built for hybrid families and remote operators, the plan separates entertaining space from deep-work areas while staying near central Da Nang amenities.",
    tags: ["Work-from-home", "New listing", "Flexible layout"],
    features: ["Studio floor", "Rooftop terrace", "Fiber internet", "Storage room"],
    owner: {
      name: "Minh Ho",
      role: "Owner",
      responseTime: "~18 minutes",
      verified: true,
    },
    stats: {
      views24h: 127,
      saves: 19,
      enquiries: 7,
    },
  },
  {
    slug: "minimalist-rental-flat-district-7",
    title: "Minimalist rental flat",
    city: "Ho Chi Minh City",
    district: "District 7",
    ward: "Tan Phu",
    type: "Apartment",
    intent: "rent",
    priceLabel: "28M VND / month",
    numericPrice: 28,
    priceUnit: "VND / month",
    beds: 2,
    baths: 2,
    area: 88,
    status: "Move-in ready",
    tone: "sky",
    summary: "A calm, furnished rental aimed at expats and couples who want a clean move-in-ready home.",
    description:
      "The listing is positioned for renters who want immediate livability, strong building management, and a quiet upgrade from generic serviced apartments.",
    tags: ["Furnished", "Rent", "Expat friendly"],
    features: ["Washer/dryer", "Resident pool", "Parking", "Pet considered"],
    owner: {
      name: "Hanh Vu",
      role: "Property manager",
      responseTime: "~9 minutes",
      verified: true,
    },
    stats: {
      views24h: 192,
      saves: 24,
      enquiries: 13,
    },
  },
  {
    slug: "garden-courtyard-house-hanoi",
    title: "Garden courtyard house",
    city: "Hanoi",
    district: "Tay Ho",
    ward: "Quang An",
    type: "House",
    intent: "buy",
    priceLabel: "12.4B VND",
    numericPrice: 12.4,
    priceUnit: "VND",
    beds: 4,
    baths: 4,
    area: 320,
    status: "Quiet lane",
    tone: "clay",
    summary: "Refined family house with a soft courtyard center and easy access to West Lake.",
    description:
      "This is for buyers who want more warmth and calm than tower living can offer, while still keeping the social and school network of Tay Ho.",
    tags: ["West Lake", "Courtyard", "Family"],
    features: ["Inner courtyard", "Custom kitchen", "Guest suite", "Bike storage"],
    owner: {
      name: "Bao Nguyen",
      role: "Owner",
      responseTime: "~15 minutes",
      verified: true,
    },
    stats: {
      views24h: 143,
      saves: 31,
      enquiries: 8,
    },
  },
  {
    slug: "new-build-condo-thu-thiem",
    title: "New-build condo in Thu Thiem",
    city: "Ho Chi Minh City",
    district: "Thu Duc City",
    ward: "An Khanh",
    type: "Condo",
    intent: "buy",
    priceLabel: "9.6B VND",
    numericPrice: 9.6,
    priceUnit: "VND",
    beds: 3,
    baths: 2,
    area: 118,
    status: "Launch pricing",
    tone: "night",
    summary: "New-build condo focused on lifestyle buyers who want design-led common areas and future upside.",
    description:
      "A modern launch inventory unit for buyers who care about commute time, skyline views, and a stronger amenity package than older stock.",
    tags: ["New home", "Launch price", "Skyline"],
    features: ["Club lounge", "Kids room", "EV parking", "River promenade"],
    owner: {
      name: "Thu Thiem Sales Desk",
      role: "Developer team",
      responseTime: "~4 minutes",
      verified: true,
    },
    stats: {
      views24h: 329,
      saves: 61,
      enquiries: 22,
    },
  },
];

export function getListingBySlug(slug: string) {
  return listings.find((listing) => listing.slug === slug);
}

export function getFeaturedListings() {
  return listings.slice(0, 3);
}
