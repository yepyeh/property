export type ListingIntent = "buy" | "rent";
export type ListingType = "Villa" | "Condo" | "Townhouse" | "Apartment" | "Land" | "House";
export type ListingTone = "sea" | "sun" | "forest" | "night" | "clay" | "sky";

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
  location?: ListingLocation;
  neighborhood?: ListingNeighborhood;
  imageKeys?: string[];
  imageUrls?: string[];
  commerce?: {
    planType: "free_trial" | "paid" | "promoted";
    trialEndsAt?: string | null;
    paidUntil?: string | null;
    promotedUntil?: string | null;
  };
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
    status: "Signature listing",
    tone: "sea",
    summary: "Design-led riverside villa with a private garden, pool deck, and a family layout that works for school-run life in Thao Dien.",
    description:
      "This is the kind of Thao Dien house buyers ask for when they want a proper family footprint rather than another polished-but-tight villa shell. The plan gives the living level real width, the garden is large enough to use, and the river-facing orientation keeps the home bright without making it feel exposed.",
    tags: ["River-facing", "School-run ready", "Private garden"],
    features: ["Pool deck", "Family kitchen", "Home office", "Covered parking"],
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
    location: {
      lat: 10.8016,
      lng: 106.7327,
      precisionLabel: "Approximate area in Thao Dien",
    },
    neighborhood: {
      headline: "Thao Dien is still one of the strongest family districts for buyers who want international schools, lower-friction daily services, and a softer residential feel than the city core.",
      commute: "Typically 15 to 20 minutes to Thu Thiem and around 25 minutes to central District 1 outside peak traffic.",
      nearby: ["International schools", "Riverfront cafes", "Grocery and wellness services"],
      trustSignals: ["Low-rise family pocket", "Strong expat demand", "Direct school-run convenience"],
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
    status: "Central core",
    tone: "sun",
    summary: "High-floor District 1 condo with skyline views, polished common areas, and a plan that feels stronger than investor-grade stock.",
    description:
      "The unit suits buyers who genuinely plan to use the location rather than just hold it. It is walkable to the office and hospitality core, the layout is clean without feeling over-finished, and the building position makes it credible both as an owner-occupier base and as premium fallback rental stock.",
    tags: ["Skyline outlook", "Walkable core", "Investor-safe"],
    features: ["Full-height glazing", "Concierge lobby", "Resident gym", "Smart lock"],
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
    location: {
      lat: 10.7781,
      lng: 106.7046,
      precisionLabel: "Approximate area in Ben Nghe",
    },
    neighborhood: {
      headline: "Ben Nghe works for buyers who want a prestige central address with walkable dining, offices, and hotel-grade amenities close by.",
      commute: "Core District 1 access is immediate, with most business and leisure destinations reachable on foot or within a short ride.",
      nearby: ["Office core", "Premium retail", "Dining and hospitality"],
      trustSignals: ["Prime central zone", "Investor-friendly demand", "Strong rental fallback"],
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
    status: "Work-ready",
    tone: "forest",
    summary: "Flexible Da Nang townhouse with a studio floor, rooftop terrace, and a calmer layout for hybrid work households.",
    description:
      "Instead of leaning on generic 'WFH' claims, this house actually separates quiet work zones from the social parts of the plan. That matters for buyers who spend real days at home and still want central Da Nang utility, storage, and enough outdoor space to make the home feel bigger than the raw square meter count.",
    tags: ["Hybrid work", "Flexible floors", "Rooftop living"],
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
    location: {
      lat: 16.0544,
      lng: 108.2218,
      precisionLabel: "Approximate area in Hai Chau",
    },
    neighborhood: {
      headline: "Hai Chau remains one of the better urban districts for owner-occupiers who want a balanced work-home setup instead of purely tourist-led inventory.",
      commute: "Central Da Nang errands and office trips are generally short, with airport access usually within 15 minutes.",
      nearby: ["Cafes and coworking", "City administration services", "Daily retail and schools"],
      trustSignals: ["Central Da Nang utility", "Hybrid-work friendly", "Lower friction daily living"],
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
    status: "Managed rental",
    tone: "sky",
    summary: "Quiet District 7 rental with furnishing already solved, predictable building operations, and a cleaner move-in path than serviced stock.",
    description:
      "This rental is aimed at tenants who care less about flashy staging and more about whether daily life will actually be easy. Management is stable, the layout is efficient for couples or small families, and the building sits in the kind of District 7 pocket where renters can settle quickly instead of troubleshooting basics for the first month.",
    tags: ["Furnished", "Expat-friendly", "Managed building"],
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
    location: {
      lat: 10.7295,
      lng: 106.7221,
      precisionLabel: "Approximate area in Tan Phu, District 7",
    },
    neighborhood: {
      headline: "Tan Phu in District 7 suits renters who want cleaner building operations, broad retail access, and a more predictable expat-friendly lifestyle base.",
      commute: "Trips into District 1 are manageable, while most daily needs are covered within the district itself.",
      nearby: ["International retail", "Parks and family services", "F&B clusters"],
      trustSignals: ["Popular with expats", "Managed residential stock", "Stable renter demand"],
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
    status: "West Lake lane",
    tone: "clay",
    summary: "Refined Tay Ho house with a planted courtyard core, guest-ready entertaining space, and an address that feels private without going isolated.",
    description:
      "The house is for buyers who want West Lake access without living in a purely expat-facing apartment block. The courtyard does real work for light and ventilation, the kitchen and guest suite are properly sized, and the lane gives the home a quieter residential feel than much of the surrounding stock.",
    tags: ["West Lake", "Courtyard", "Family home"],
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
    location: {
      lat: 21.0662,
      lng: 105.8237,
      precisionLabel: "Approximate area in Quang An",
    },
    neighborhood: {
      headline: "Quang An remains one of Tay Ho’s stronger family pockets for buyers who want a calmer residential lane while staying close to West Lake’s social and school network.",
      commute: "Typical trips toward Ba Dinh and inner Hanoi are straightforward, while West Lake amenities stay close to home.",
      nearby: ["West Lake dining", "International school access", "Embassy and expat services"],
      trustSignals: ["Quiet residential lanes", "Consistent premium demand", "Family-oriented micro-location"],
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
    status: "New release",
    tone: "night",
    summary: "New-release Thu Thiem condo with amenity-led positioning, skyline exposure, and a cleaner long-term story than older central stock.",
    description:
      "This is a strong fit for buyers who want to enter Thu Thiem for the precinct itself, not just for a bridge-adjacent address. The newer common areas, river-facing public realm, and cleaner building systems make it feel like forward inventory rather than a compromise made for location alone.",
    tags: ["New release", "Thu Thiem", "Skyline"],
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
    location: {
      lat: 10.7826,
      lng: 106.7297,
      precisionLabel: "Approximate area in Thu Thiem",
    },
    neighborhood: {
      headline: "Thu Thiem is positioned for buyers who want future-facing inventory, newer infrastructure, and a cleaner bridge into the core than older high-density districts.",
      commute: "District 1 and the broader business core are typically within a short bridge crossing outside traffic peaks.",
      nearby: ["Riverfront public realm", "New retail clusters", "Future office and lifestyle stock"],
      trustSignals: ["New infrastructure", "Developer-led precinct", "High buyer attention"],
    },
  },
];

export function getListingBySlug(slug: string) {
  return listings.find((listing) => listing.slug === slug);
}

export function getFeaturedListings() {
  return listings.slice(0, 3);
}

export function buildListingNeighborhoodContext(listing: Pick<Listing, "city" | "district" | "ward" | "intent" | "owner" | "stats"> & { neighborhood?: ListingNeighborhood }): ListingNeighborhood {
  if (listing.neighborhood) {
    return listing.neighborhood;
  }

  const locationLabel = [listing.ward, listing.district, listing.city].filter(Boolean).join(", ");
  const buyerLead = listing.intent === "rent"
    ? "built around daily convenience and move-in confidence"
    : "positioned for longer-term location confidence";

  return {
    headline: `${locationLabel} is ${buyerLead}, with local services and district access doing most of the trust work for this listing.`,
    commute:
      listing.city === "Ho Chi Minh City"
        ? "Expect district-to-core travel rather than true walkability, with timing depending heavily on traffic peaks."
        : listing.city === "Hanoi"
          ? "The location is better read as a neighborhood base with practical city access rather than a one-stop core address."
          : "The location supports practical day-to-day movement to the main commercial parts of the city.",
    nearby: [
      `${listing.ward} local services`,
      `${listing.district} dining and daily retail`,
      `${listing.city} commuter access`,
    ],
    trustSignals: [
      listing.owner.verified ? "Verified owner or operator" : "Direct owner listing",
      `${listing.stats.saves} recent saves`,
      `${listing.stats.enquiries} active buyer enquiries`,
    ],
  };
}

const fallbackLocationByDistrict: Record<string, ListingLocation> = {
  "Thao Dien, Thu Duc City, Ho Chi Minh City": { lat: 10.8016, lng: 106.7327, precisionLabel: "Approximate area in Thao Dien" },
  "Ben Nghe, District 1, Ho Chi Minh City": { lat: 10.7781, lng: 106.7046, precisionLabel: "Approximate area in Ben Nghe" },
  "Binh Hien, Hai Chau, Da Nang": { lat: 16.0544, lng: 108.2218, precisionLabel: "Approximate area in Hai Chau" },
  "Tan Phu, District 7, Ho Chi Minh City": { lat: 10.7295, lng: 106.7221, precisionLabel: "Approximate area in Tan Phu, District 7" },
  "Quang An, Tay Ho, Hanoi": { lat: 21.0662, lng: 105.8237, precisionLabel: "Approximate area in Quang An" },
  "An Khanh, Thu Duc City, Ho Chi Minh City": { lat: 10.7826, lng: 106.7297, precisionLabel: "Approximate area in Thu Thiem" },
};

const fallbackLocationByCity: Record<string, ListingLocation> = {
  "Ho Chi Minh City": { lat: 10.7769, lng: 106.7009, precisionLabel: "Approximate city-level location" },
  Hanoi: { lat: 21.0285, lng: 105.8542, precisionLabel: "Approximate city-level location" },
  "Da Nang": { lat: 16.0544, lng: 108.2022, precisionLabel: "Approximate city-level location" },
};

export function buildListingLocationContext(listing: Pick<Listing, "city" | "district" | "ward"> & { location?: ListingLocation }): ListingLocation | undefined {
  if (listing.location) {
    return listing.location;
  }

  const exactKey = [listing.ward, listing.district, listing.city].filter(Boolean).join(", ");
  return fallbackLocationByDistrict[exactKey] || fallbackLocationByCity[listing.city];
}
