export function buildInitialListingPresentation(intent: string) {
  return {
    status: "Owner submitted",
    tone: "sea",
    tags: ["Owner submitted", intent === "rent" ? "Rent" : "For sale"],
    features: ["Photos pending", "Direct owner contact", "Dashboard managed", "7-day free trial"],
    ownerRole: "Owner",
    ownerResponseTime: "~30 minutes",
    ownerVerified: 0,
  };
}
