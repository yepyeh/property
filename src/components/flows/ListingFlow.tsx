import { motion } from "framer-motion";
import {
  BedDouble,
  Bath,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Home,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import FlowContainer, { type FlowStepDefinition } from "./FlowContainer";

type ListingFlowDraft = {
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

const defaultDraft: ListingFlowDraft = {
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

const addressSuggestions = [
  "An Khanh, Thu Duc City, Ho Chi Minh City",
  "Thao Dien, Thu Duc City, Ho Chi Minh City",
  "Tay Ho, Hanoi",
  "Phu My Hung, District 7, Ho Chi Minh City",
  "My An, Da Nang",
];

const propertyTypes = ["Condo", "Villa", "Townhouse", "Apartment", "House", "Land"];

const steps: FlowStepDefinition[] = [
  {
    id: "basics",
    title: "Start with the foundations",
    context: "We only need the address and property type first. This gives the listing a market route and starts the card preview immediately.",
  },
  {
    id: "stats",
    title: "Set the commercial facts",
    context: "Beds, baths, area, and price shape how buyers filter and compare. Keep this precise and easy to trust.",
  },
  {
    id: "story",
    title: "Tell the story like a concierge would",
    context: "We will draft the description around the buyer’s likely decision path, then you can refine the tone in your own words.",
  },
  {
    id: "proof",
    title: "Add the proof that reduces hesitation",
    context: "Verification and supporting documentation increase buyer confidence. Strong trust signals reduce friction before the first conversation.",
  },
  {
    id: "review",
    title: "Publish with confidence",
    context: "Review the full story, confirm the proof, and launch a listing that already feels considered before it goes live.",
  },
];

interface ListingFlowProps {
  createdSlug?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export default function ListingFlow({
  createdSlug,
  ownerName = "",
  ownerEmail = "",
  ownerPhone = "",
}: ListingFlowProps) {
  const [draft, setDraft] = useState<ListingFlowDraft>({
    ...defaultDraft,
    ownerName,
    ownerEmail,
    ownerPhone,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [publishState, setPublishState] = useState<"idle" | "publishing">("idle");
  const [addressQuery, setAddressQuery] = useState("");
  const autoAdvanceTimer = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      const response = await fetch("/api/flow-drafts?flowType=listing_publish");
      if (!response.ok) {
        setHydrated(true);
        return;
      }
      const data = await response.json();
      setDraft((current) => ({
        ...current,
        ...(data.draft || {}),
        ownerName: data.draft?.ownerName || current.ownerName,
        ownerEmail: data.draft?.ownerEmail || current.ownerEmail,
        ownerPhone: data.draft?.ownerPhone || current.ownerPhone,
      }));
      const loadedAddress = [data.draft?.ward, data.draft?.district, data.draft?.city].filter(Boolean).join(", ");
      if (loadedAddress) setAddressQuery(loadedAddress);
      setHydrated(true);
    };

    loadDraft();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = window.setTimeout(async () => {
      await fetch("/api/flow-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowType: "listing_publish",
          payload: draft,
        }),
      }).catch(() => null);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    }, 500);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [draft, hydrated]);

  const canAdvance = useMemo(() => {
    if (currentStep === 0) {
      return Boolean(draft.city && draft.district && draft.propertyType);
    }
    if (currentStep === 1) {
      return Boolean(draft.priceLabel && draft.numericPrice && draft.beds > 0 && draft.baths > 0 && draft.area > 0);
    }
    if (currentStep === 2) {
      return Boolean(draft.summary && draft.description);
    }
    if (currentStep === 3) {
      return draft.documentNames.length > 0;
    }
    return true;
  }, [currentStep, draft]);

  const queueAutoAdvance = () => {
    if (autoAdvanceTimer.current) window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = window.setTimeout(() => {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    }, 300);
  };

  const updateDraft = <K extends keyof ListingFlowDraft>(key: K, value: ListingFlowDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const applyAddress = (value: string) => {
    setAddressQuery(value);
    const parts = value.split(",").map((item) => item.trim()).filter(Boolean);
    const ward = parts[0] || "";
    const district = parts[1] || "";
    const city = parts[2] || parts[1] || "";
    setDraft((current) => ({ ...current, ward, district, city }));
  };

  const increment = (key: "beds" | "baths" | "area", delta: number) => {
    setDraft((current) => ({
      ...current,
      [key]: Math.max(key === "area" ? 20 : 0, Number(current[key]) + delta),
    }));
  };

  const generateDescription = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/listings/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          propertyType: draft.propertyType,
          country: draft.country,
          city: draft.city,
          district: draft.district,
          ward: draft.ward,
          area: draft.area,
          beds: draft.beds,
          baths: draft.baths,
          summary: draft.summary,
          neighborhoodHeadline: draft.neighborhoodHeadline,
          commuteNotes: draft.commuteNotes,
          uniqueSellingPoints: draft.features,
          trustSignals: draft.trustSignals,
        }),
      });
      if (!response.ok) return;
      const data = await response.json();
      const text = String(data.description || "");
      updateDraft("description", "");
      for (const char of text) {
        setDraft((current) => ({ ...current, description: `${current.description}${char}` }));
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => window.setTimeout(resolve, 8));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const publishListing = async () => {
    setPublishState("publishing");
    try {
      const response = await fetch("/api/flow-drafts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowType: "listing_publish", payload: draft }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
    } finally {
      setPublishState("idle");
    }
  };

  const previewTitle = draft.title || `${draft.propertyType} in ${draft.district || draft.city || "the right location"}`;

  return (
    <div className="space-y-6">
      {createdSlug ? (
        <div className="glass-card border-accent/20 surface-accent-soft p-4 text-sm">
          Listing created successfully. New slug: <code>{createdSlug}</code>.
        </div>
      ) : null}

      <FlowContainer
        steps={steps}
        currentStep={currentStep}
        nextDisabled={!canAdvance || publishState === "publishing"}
        nextLabel={currentStep === steps.length - 1 ? "Publish with Confidence" : "Continue"}
        onBack={currentStep > 0 ? () => setCurrentStep((step) => Math.max(0, step - 1)) : undefined}
        onNext={currentStep === steps.length - 1 ? publishListing : () => setCurrentStep((step) => Math.min(step + 1, steps.length - 1))}
        statusLabel={saveState === "saving" ? "Saving draft..." : saveState === "saved" ? "Draft saved" : `Step ${currentStep + 1} of ${steps.length}`}
        summary={
          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-soft surface-soft">
              <div className="ratio-photo surface-subtle" />
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="title-snug text-lg font-semibold">{previewTitle}</div>
                    <div className="secondary-text mt-1 text-sm">
                      {[draft.ward, draft.district, draft.city].filter(Boolean).join(", ") || "Location pending"}
                    </div>
                  </div>
                  <div className="surface-accent-soft rounded-full border border-accent/20 px-3 py-1 text-sm font-semibold text-accent-ui">
                    {draft.priceLabel || "Price pending"}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-soft pt-4 text-sm">
                  <PreviewMetric icon={BedDouble} label="Beds" value={String(draft.beds)} />
                  <PreviewMetric icon={Bath} label="Baths" value={String(draft.baths)} />
                  <PreviewMetric icon={Home} label="Area" value={`${draft.area} m²`} />
                </div>
              </div>
            </div>

            <div className="secondary-text text-sm leading-7">
              The preview updates live so the owner sees value immediately instead of typing into a dead form.
            </div>
          </div>
        }
      >
        {currentStep === 0 ? (
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-medium">Where is the property?</label>
              <div className="rounded-xl border border-accent/20 surface-soft p-1 shadow-accent-soft">
                <div className="flex items-center gap-3 rounded-lg px-4 py-4">
                  <MapPin className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  <input
                    value={addressQuery}
                    onChange={(event) => setAddressQuery(event.target.value)}
                    className="input-luxury border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus:ring-0"
                    placeholder="Start with the district, ward, or full address"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {addressSuggestions
                  .filter((option) => !addressQuery || option.toLowerCase().includes(addressQuery.toLowerCase()))
                  .slice(0, 4)
                  .map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => applyAddress(option)}
                      className="luxury-transition rounded-xl border border-soft surface-soft px-4 py-4 text-left text-sm hover:border-base hover:bg-card"
                    >
                      {option}
                    </button>
                  ))}
              </div>
            </div>

          <div className="space-y-3">
              <label className="text-sm font-medium">What kind of property is it?</label>
              <div className="grid gap-3 md:grid-cols-3">
                {propertyTypes.map((type) => {
                  const active = draft.propertyType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        updateDraft("propertyType", type);
                        if ((draft.city || addressQuery) && draft.district) queueAutoAdvance();
                      }}
                      className={`luxury-transition rounded-xl border px-4 py-4 text-left ${
                        active
                          ? "border-accent/30 surface-accent-soft"
                          : "border-soft surface-soft text-muted-ui hover:border-base hover:bg-card"
                      }`}
                    >
                      <div className="font-medium">{type}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
              <StepperStat label="Beds" value={draft.beds} onDecrease={() => increment("beds", -1)} onIncrease={() => increment("beds", 1)} />
              <StepperStat label="Baths" value={draft.baths} onDecrease={() => increment("baths", -1)} onIncrease={() => increment("baths", 1)} />
              <StepperStat label="Area" suffix="m²" value={draft.area} onDecrease={() => increment("area", -10)} onIncrease={() => increment("area", 10)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Price label"
                value={draft.priceLabel}
                onChange={(value) => updateDraft("priceLabel", value)}
                placeholder="9.5B VND"
                icon={Wallet}
              />
              <Field
                label="Numeric price"
                value={draft.numericPrice}
                onChange={(value) => updateDraft("numericPrice", value)}
                placeholder="9500000000"
                icon={Wallet}
              />
            </div>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Listing title"
                value={draft.title}
                onChange={(value) => updateDraft("title", value)}
                placeholder="Modern river-view condo in Thu Duc"
                icon={Home}
              />
              <Field
                label="Short summary"
                value={draft.summary}
                onChange={(value) => updateDraft("summary", value)}
                placeholder="High-floor condo with stronger finish quality and direct access into the core."
                multiline
              />
            </div>

            <div className="surface-subtle rounded-xl border border-soft p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="subtle-label">
                    Optimized for High-Intent Buyers
                  </p>
                  <p className="secondary-text mt-1 text-sm leading-7">
                    Generate the first editorial pass, then edit it until it sounds exactly right.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={isGenerating}
                  className={`luxury-transition inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium ${
                    isGenerating
                      ? "border-accent/30 surface-soft shadow-accent-soft"
                      : "border-base surface-soft text-muted-ui hover:border-accent/30 hover:text-white"
                  }`}
                >
                  {isGenerating ? <LoaderCircle className="h-5 w-5 animate-spin text-accent" strokeWidth={1.5} /> : <Sparkles className="h-5 w-5 text-accent" strokeWidth={1.5} />}
                  <span>Generate Description</span>
                </button>
              </div>

              <textarea
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                rows={8}
                className={`input-luxury story-min-h font-medium leading-8 ${
                  isGenerating ? "border-accent/30" : "border-soft focus:border-accent/30 focus:shadow-accent-soft"
                }`}
                placeholder="The AI draft will appear here."
              />
            </div>
          </div>
        ) : null}

        {currentStep === 3 ? (
          <div className="space-y-6">
            <div className="surface-soft rounded-xl border border-dashed border-base p-8 text-center">
              <div className="surface-subtle mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-soft">
                <FileCheck2 className="h-6 w-6 text-accent" strokeWidth={1.5} />
              </div>
              <h3 className="title-snug mt-4 text-xl font-semibold">
                Drag and drop legal documentation
              </h3>
              <p className="secondary-text mt-2 text-sm leading-7">
                Verified documents increase buyer interest by 40%. Add the core proof now so the listing feels safer before the first conversation.
              </p>
              <label className="luxury-transition mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border border-base surface-soft px-5 py-2.5 text-sm font-medium text-muted-ui hover:border-base hover:bg-card hover:text-white">
                <ImagePlus className="h-5 w-5 text-accent" strokeWidth={1.5} />
                <span>Choose documents</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []).map((file) => file.name);
                    updateDraft("documentNames", files);
                  }}
                />
              </label>
            </div>

            <div className="grid gap-3">
              {draft.documentNames.length === 0 ? (
                <div className="surface-soft secondary-text rounded-xl border border-soft px-4 py-4 text-sm">
                  No documents attached yet.
                </div>
              ) : (
                draft.documentNames.map((name) => (
                  <div key={name} className="surface-soft flex items-center justify-between rounded-xl border border-soft px-4 py-4 text-sm">
                    <span>{name}</span>
                    <CheckCircle2 className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {currentStep === 4 ? (
          <div className="space-y-8">
            <div className="surface-soft rounded-xl border border-soft p-6 md:p-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="subtle-label">Review</p>
                  <h2 className="title-tighter text-3xl font-semibold">{previewTitle}</h2>
                  <p className="secondary-text text-sm leading-7">
                    {[draft.ward, draft.district, draft.city, draft.country].filter(Boolean).join(", ")}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <ReviewBlock label="Commercial facts" value={`${draft.priceLabel || "Pending"} · ${draft.beds} bd · ${draft.baths} ba · ${draft.area} m²`} />
                  <ReviewBlock label="Trust" value={draft.documentNames.length > 0 ? `${draft.documentNames.length} documents attached` : "Documentation pending"} />
                  <ReviewBlock label="Contact" value={draft.ownerName || "Owner details pending"} />
                </div>

                <div className="surface-subtle rounded-xl border border-soft p-5">
                  <p className="text-base font-medium leading-8">{draft.description || "Description pending."}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </FlowContainer>
    </div>
  );
}

function PreviewMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="secondary-text flex items-center gap-2">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
        <span className="subtle-label">{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function StepperStat({
  label,
  value,
  suffix,
  onIncrease,
  onDecrease,
}: {
  label: string;
  value: number;
  suffix?: string;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <div className="surface-soft rounded-xl border border-soft p-5">
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <button type="button" onClick={onDecrease} className="luxury-transition surface-subtle flex h-11 w-11 items-center justify-center rounded-full border border-base text-muted-ui hover:bg-card hover:text-white">
          <Minus className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="text-center">
          <div className="title-tight text-3xl font-semibold">
            {value}
            {suffix ? <span className="secondary-text ml-1 text-base">{suffix}</span> : null}
          </div>
        </div>
        <button type="button" onClick={onIncrease} className="luxury-transition surface-subtle flex h-11 w-11 items-center justify-center rounded-full border border-base text-muted-ui hover:bg-card hover:text-white">
          <Plus className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  icon?: typeof MapPin;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="luxury-transition rounded-xl border border-base surface-soft px-4 py-3 shadow-accent-soft focus-within:border-accent/30">
        <div className="flex items-start gap-3">
          {Icon ? <Icon className="mt-1 h-5 w-5 shrink-0 text-accent" strokeWidth={1.5} /> : null}
          {multiline ? (
            <textarea
              rows={4}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="input-luxury border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus:ring-0"
              placeholder={placeholder}
            />
          ) : (
            <input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="input-luxury border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus:ring-0"
              placeholder={placeholder}
            />
          )}
        </div>
      </div>
    </label>
  );
}

function ReviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-soft rounded-xl border border-soft p-4">
      <div className="subtle-label">{label}</div>
      <div className="mt-2 text-sm font-medium leading-7">{value}</div>
    </div>
  );
}
