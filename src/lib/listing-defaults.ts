export function buildInitialListingPresentation(intent: string, saleMode = "private-sale") {
  return {
    status: saleMode === "auction" ? "Auction inventory" : intent === "rent" ? "Move-in ready" : "New to market",
    tone: "sea",
    tags: [saleMode === "auction" ? "Auction listing" : intent === "rent" ? "Rental listing" : "For sale", "Direct owner listing"],
    features: saleMode === "auction"
      ? ["Timed auction", "Dashboard managed", "Buyer due diligence"]
      : ["Direct owner contact", "Dashboard managed", "7-day free trial"],
    ownerRole: "Owner",
    ownerResponseTime: "~20 minutes",
    ownerVerified: 0,
  };
}
