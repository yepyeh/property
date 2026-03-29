import type { Listing } from "../data/listings";

export interface NotificationPreferences {
  user_id: number;
  email_enabled: number;
  in_app_enabled: number;
  cadence: "daily" | "weekly";
  listing_expiry: number;
  enquiry_activity: number;
  billing_events: number;
  saved_search_matches: number;
  saved_listing_updates: number;
  created_at?: string;
  updated_at?: string;
}

export interface ListingRow {
  id: number;
  slug: string;
  title: string;
  city: string;
  district: string;
  ward: string;
  property_type: string;
  intent: string;
  price_label: string;
  numeric_price: number;
  price_unit: string;
  beds: number;
  baths: number;
  area: number;
  status: string;
  tone: string;
  summary: string;
  description: string;
  tags: string;
  features: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_role: string;
  owner_response_time: string;
  owner_verified: number;
  owner_user_id: number | null;
  plan_type: string;
  trial_ends_at: string | null;
  paid_until: string | null;
  promoted_until: string | null;
  views_24h: number;
  saves: number;
  enquiries: number;
  image_keys: string;
  neighborhood_headline: string | null;
  commute_notes: string | null;
  nearby_places: string;
  trust_signals: string;
  lat: number | null;
  lng: number | null;
  location_precision_label: string | null;
  created_at: string;
}

export interface ListingInput {
  title: string;
  city: string;
  district: string;
  ward: string;
  propertyType: string;
  intent: string;
  priceLabel: string;
  numericPrice: number;
  priceUnit: string;
  beds: number;
  baths: number;
  area: number;
  statusLabel?: string;
  tone?: string;
  summary: string;
  description: string;
  tags?: string[];
  features?: string[];
  neighborhoodHeadline?: string;
  commuteNotes?: string;
  nearbyPlaces?: string[];
  trustSignals?: string[];
  lat?: number | null;
  lng?: number | null;
  locationPrecisionLabel?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerRole?: string;
  ownerResponseTime?: string;
  ownerVerified?: number;
  ownerUserId?: number | null;
}

export interface EnquiryInput {
  listingSlug: string;
  listingTitle: string;
  applicantName: string;
  contact: string;
  message: string;
  preferredTime: string;
  applicantUserId?: number | null;
}

export interface ListingFilters {
  intent?: string;
  city?: string;
  district?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  sort?: string;
}

export interface SavedSearchInput {
  userId: number;
  name: string;
  filters: ListingFilters;
}

export interface ListingPlanUpdateInput {
  listingSlug: string;
  planType: "free_trial" | "paid" | "promoted";
  paidDays?: number;
  promotedDays?: number;
}

export interface PaymentRecordInput {
  stripeSessionId: string;
  stripePaymentIntentId?: string | null;
  listingSlug: string;
  ownerUserId?: number | null;
  ownerEmail?: string | null;
  planType: "paid" | "promoted";
  amount: number;
  currency: string;
  status: string;
  paidAt?: string | null;
}

export interface ExpiryNotification {
  listingSlug: string;
  listingTitle: string;
  level: "info" | "warning" | "critical";
  category: "trial" | "paid" | "promoted";
  message: string;
  ctaLabel: string;
  planType: string;
  dueAt: string;
}

export interface SavedSearchRecord {
  id: number;
  name: string;
  route_query: string;
  filters_json: string;
  last_result_count: number;
  created_at: string;
  updated_at: string;
  filters?: ListingFilters;
  new_result_count?: number;
  freshness_label?: string;
}

export interface SavedListingRecord {
  id: number;
  listing_slug: string;
  created_at: string;
  updated_at?: string;
  buyer_state?: "saved" | "finalist" | "contacted" | "follow_up";
  follow_up_on?: string | null;
  buyer_note?: string | null;
  collection_name?: string | null;
  listing?: Listing | null;
}

export interface ExpiryEmailDeliveryRecord {
  event_key: string;
  owner_email: string;
  listing_slug: string;
  listing_title: string;
  category: string;
  level: string;
  due_at: string;
  status: string;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface InboxNotificationRecord {
  id: number;
  event_key: string;
  user_id: number;
  category: string;
  title: string;
  message: string;
  href: string | null;
  level: "info" | "warning" | "critical";
  read_at: string | null;
  created_at: string;
}

export interface ExpiryEmailCandidate extends ExpiryNotification {
  ownerUserId: number | null;
  ownerEmail: string;
}
