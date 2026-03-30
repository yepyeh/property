import { createListing } from "./listings";
import type { ListingInput } from "./marketplace-types";
import type { D1Like } from "./runtime";

export type ListingFlowDraft = {
  title: string;
  intent: "buy" | "rent";
  country: string;
  city: string;
  district: string;
  ward: string;
  propertyType: string;
  saleMode: "private-sale" | "auction";
  priceLabel: string;
  numericPrice: string;
  priceUnit: string;
  beds: number;
  baths: number;
  area: number;
  statusLabel: string;
  tone: string;
  summary: string;
  description: string;
  features: string;
  neighborhoodHeadline: string;
  commuteNotes: string;
  trustSignals: string;
  nearbyPlaces: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerRole: string;
  ownerResponseTime: string;
  ownerVerified: boolean;
  documentNames: string[];
};

export const DEFAULT_LISTING_FLOW_DRAFT: ListingFlowDraft = {
  title: "",
  intent: "buy",
  country: "Vietnam",
  city: "",
  district: "",
  ward: "",
  propertyType: "Condo",
  saleMode: "private-sale",
  priceLabel: "",
  numericPrice: "",
  priceUnit: "VND",
  beds: 2,
  baths: 2,
  area: 90,
  statusLabel: "",
  tone: "sea",
  summary: "",
  description: "",
  features: "",
  neighborhoodHeadline: "",
  commuteNotes: "",
  trustSignals: "",
  nearbyPlaces: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerRole: "",
  ownerResponseTime: "~15 minutes",
  ownerVerified: false,
  documentNames: [],
};

const FLOW_TYPE_LISTING = "listing_publish";

function parseJsonList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeDraftPayload(payload?: Partial<ListingFlowDraft> | null): ListingFlowDraft {
  const source = payload || {};
  return {
    ...DEFAULT_LISTING_FLOW_DRAFT,
    ...source,
    intent: source.intent === "rent" ? "rent" : "buy",
    saleMode: source.saleMode === "auction" ? "auction" : "private-sale",
    beds: Number(source.beds) || DEFAULT_LISTING_FLOW_DRAFT.beds,
    baths: Number(source.baths) || DEFAULT_LISTING_FLOW_DRAFT.baths,
    area: Number(source.area) || DEFAULT_LISTING_FLOW_DRAFT.area,
    numericPrice: String(source.numericPrice || ""),
    documentNames: Array.isArray(source.documentNames)
      ? source.documentNames.map((item) => String(item).trim()).filter(Boolean)
      : [],
    ownerVerified: Boolean(source.ownerVerified),
  };
}

export async function getFlowDraft(db: D1Like, ownerUserId: number, flowType = FLOW_TYPE_LISTING) {
  const row = await db
    .prepare(`SELECT payload_json FROM flow_drafts WHERE owner_user_id = ? AND flow_type = ? LIMIT 1`)
    .bind(ownerUserId, flowType)
    .first<{ payload_json: string }>();

  if (!row?.payload_json) {
    return DEFAULT_LISTING_FLOW_DRAFT;
  }

  try {
    return sanitizeDraftPayload(JSON.parse(row.payload_json));
  } catch {
    return DEFAULT_LISTING_FLOW_DRAFT;
  }
}

export async function saveFlowDraft(
  db: D1Like,
  ownerUserId: number,
  payload: Partial<ListingFlowDraft>,
  flowType = FLOW_TYPE_LISTING
) {
  const current = await getFlowDraft(db, ownerUserId, flowType);
  const next = sanitizeDraftPayload({ ...current, ...payload });
  const title = next.title.trim() || `${next.propertyType} draft`;

  await db
    .prepare(
      `INSERT INTO flow_drafts (owner_user_id, flow_type, title, payload_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(owner_user_id, flow_type)
       DO UPDATE SET title = excluded.title, payload_json = excluded.payload_json, status = 'draft', updated_at = CURRENT_TIMESTAMP`
    )
    .bind(ownerUserId, flowType, title, JSON.stringify(next))
    .run();

  return next;
}

export async function clearFlowDraft(db: D1Like, ownerUserId: number, flowType = FLOW_TYPE_LISTING) {
  await db
    .prepare(`DELETE FROM flow_drafts WHERE owner_user_id = ? AND flow_type = ?`)
    .bind(ownerUserId, flowType)
    .run();
}

export function mapDraftToListingInput(draft: ListingFlowDraft, ownerUserId: number): ListingInput {
  return {
    title: draft.title.trim(),
    country: draft.country.trim(),
    city: draft.city.trim(),
    district: draft.district.trim(),
    ward: draft.ward.trim(),
    propertyType: draft.propertyType.trim(),
    intent: draft.intent,
    saleMode: draft.saleMode,
    priceLabel: draft.priceLabel.trim(),
    numericPrice: Number(draft.numericPrice || 0),
    priceUnit: draft.priceUnit.trim() || "VND",
    beds: Number(draft.beds || 0),
    baths: Number(draft.baths || 0),
    area: Number(draft.area || 0),
    statusLabel: draft.statusLabel.trim(),
    tone: draft.tone.trim() || "sea",
    summary: draft.summary.trim(),
    description: draft.description.trim(),
    features: parseJsonList(draft.features),
    neighborhoodHeadline: draft.neighborhoodHeadline.trim(),
    commuteNotes: draft.commuteNotes.trim(),
    trustSignals: parseJsonList(draft.trustSignals),
    nearbyPlaces: parseJsonList(draft.nearbyPlaces),
    ownerName: draft.ownerName.trim(),
    ownerEmail: draft.ownerEmail.trim(),
    ownerPhone: draft.ownerPhone.trim(),
    ownerRole: draft.ownerRole.trim(),
    ownerResponseTime: draft.ownerResponseTime.trim(),
    ownerVerified: draft.ownerVerified ? 1 : 0,
    ownerUserId,
  };
}

export async function publishDraftListing(db: D1Like, ownerUserId: number, draft: ListingFlowDraft) {
  const slug = await createListing(db, mapDraftToListingInput(draft, ownerUserId));
  await clearFlowDraft(db, ownerUserId, FLOW_TYPE_LISTING);
  return slug;
}
