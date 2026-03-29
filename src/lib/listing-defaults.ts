export function buildInitialListingPresentation(intent: string) {
  return {
    status: intent === "rent" ? "Move-in ready" : "New to market",
    tone: "sea",
    tags: [intent === "rent" ? "Rental listing" : "For sale", "Direct owner listing"],
    features: ["Direct owner contact", "Dashboard managed", "7-day free trial"],
    ownerRole: "Owner",
    ownerResponseTime: "~20 minutes",
    ownerVerified: 0,
  };
}
