export interface PropertyNarrativeInput {
  title?: string;
  propertyType?: string;
  location: {
    country?: string;
    city?: string;
    district?: string;
    ward?: string;
  };
  area?: number;
  beds?: number;
  baths?: number;
  summary?: string;
  neighborhoodHeadline?: string;
  commuteNotes?: string;
  uniqueSellingPoints?: string[];
  trustSignals?: string[];
}

function joinReadable(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildLocationLabel(input: PropertyNarrativeInput) {
  return [input.location.ward, input.location.district, input.location.city, input.location.country]
    .filter(Boolean)
    .join(", ");
}

function inferVibe(input: PropertyNarrativeInput) {
  const usp = [...(input.uniqueSellingPoints || []), input.neighborhoodHeadline || "", input.summary || ""]
    .join(" ")
    .toLowerCase();

  if (usp.includes("river") || usp.includes("waterfront") || usp.includes("sea")) {
    return "A calmer, light-filled home with a stronger sense of retreat";
  }
  if (usp.includes("family") || usp.includes("school") || usp.includes("park")) {
    return "A composed family home designed around daily ease";
  }
  if (usp.includes("investor") || usp.includes("core") || usp.includes("metro")) {
    return "A well-positioned city home with a sharper practical edge";
  }
  return "A well-balanced home with a more considered feel than typical local stock";
}

function inferContext(input: PropertyNarrativeInput) {
  const location = buildLocationLabel(input);
  const areaText = input.area ? `${Math.round(input.area)} m²` : "";
  const bedText = input.beds ? `${input.beds}-bedroom` : "";
  const typeText = input.propertyType ? input.propertyType.toLowerCase() : "home";
  const introBits = [bedText, typeText, areaText].filter(Boolean);
  const intro = introBits.length > 0 ? `${joinReadable(introBits)} in ${location || "a strong local position"}` : `home in ${location || "a strong local position"}`;

  const usps = (input.uniqueSellingPoints || []).slice(0, 3);
  const trust = (input.trustSignals || []).slice(0, 2);

  const lifestyleSentence = input.commuteNotes
    ? `It is especially well suited to buyers who value ${input.commuteNotes.charAt(0).toLowerCase()}${input.commuteNotes.slice(1)}.`
    : usps.length > 0
      ? `It is especially well suited to buyers looking for ${joinReadable(usps).toLowerCase()}.`
      : `It is especially well suited to buyers looking for a cleaner balance of comfort, access, and long-term usability.`;

  const supportSentence = input.neighborhoodHeadline
    ? `${input.neighborhoodHeadline} ${trust.length > 0 ? `That is reinforced by ${joinReadable(trust).toLowerCase()}.` : ""}`.trim()
    : usps.length > 0
      ? `The layout and setting stand out through ${joinReadable(usps).toLowerCase()}.`
      : `${intro.charAt(0).toUpperCase()}${intro.slice(1)} gives buyers a more credible alternative to generic portal inventory.`;

  return { intro, lifestyleSentence, supportSentence };
}

export function buildPropertyNarrativePrompt(input: PropertyNarrativeInput) {
  const location = buildLocationLabel(input) || "the surrounding area";
  const usps = (input.uniqueSellingPoints || []).join(", ") || "the strongest differentiators in the home and its setting";
  const trustSignals = (input.trustSignals || []).join(", ") || "verified documents and owner responsiveness";

  return {
    system: "You are a premium real estate copywriter. Write warm, sophisticated, concise property copy that feels editorial and trustworthy, never robotic or salesy.",
    user: [
      "Transform the raw listing data into a compelling narrative.",
      "Structure:",
      "1. The Hook: one sentence about the vibe of the home.",
      "2. The Context: two sentences on lifestyle benefits and daily use.",
      "3. The Confidence Signal: one closing sentence explaining why the property is a smart, vetted decision.",
      "Tone: sophisticated, warm, concise, trustworthy.",
      `Location: ${location}`,
      `Area: ${input.area || "not provided"} m²`,
      `Beds: ${input.beds || "not provided"}`,
      `Baths: ${input.baths || "not provided"}`,
      `Property type: ${input.propertyType || "not provided"}`,
      `Unique selling points: ${usps}`,
      `Trust signals: ${trustSignals}`,
      input.summary ? `Existing summary: ${input.summary}` : "",
      input.neighborhoodHeadline ? `Neighborhood headline: ${input.neighborhoodHeadline}` : "",
      input.commuteNotes ? `Commute notes: ${input.commuteNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function generatePropertyNarrativeDraft(input: PropertyNarrativeInput) {
  const vibe = inferVibe(input);
  const { intro, lifestyleSentence, supportSentence } = inferContext(input);

  const hook = `${vibe}, this ${intro} immediately feels more assured than a generic listing.`;
  const contextA = lifestyleSentence;
  const contextB = supportSentence;
  const confidence = input.trustSignals && input.trustSignals.length > 0
    ? `This listing is backed by our document and seller-review process, with ${joinReadable(input.trustSignals.slice(0, 2)).toLowerCase()} helping buyers move with more confidence.`
    : "This listing is backed by our document and seller-review process, giving serious buyers a clearer and more trustworthy route into due diligence.";

  return {
    description: [hook, contextA, contextB, confidence].join(" "),
    prompt: buildPropertyNarrativePrompt(input),
  };
}
