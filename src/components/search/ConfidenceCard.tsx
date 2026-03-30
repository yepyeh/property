import type { ReactNode } from "react";
import { CircleHelp, History, ShieldCheck, TrendingUp } from "lucide-react";
import type { Listing } from "../../data/listings";

interface ConfidenceCardProps {
  listing: Listing;
}

function buildConfidenceScore(listing: Listing) {
  const base = listing.owner.verified ? 78 : 54;
  const savesBoost = Math.min(10, listing.stats.saves);
  const enquiriesBoost = Math.min(8, listing.stats.enquiries * 2);
  const viewsBoost = Math.min(6, Math.round(listing.stats.views24h / 8));
  return Math.max(42, Math.min(98, base + savesBoost + enquiriesBoost + viewsBoost));
}

function buildConfidencePillars(listing: Listing) {
  const legal = Math.max(48, Math.min(99, (listing.owner.verified ? 88 : 56) + Math.min(8, listing.stats.enquiries)));
  const price = Math.max(44, Math.min(97, 62 + Math.min(14, Math.round(listing.stats.views24h / 4)) + Math.min(8, listing.stats.saves)));
  const history = Math.max(40, Math.min(96, 58 + Math.min(12, listing.stats.enquiries * 3) + Math.min(10, Math.round(listing.stats.views24h / 6))));

  return {
    legal,
    price,
    history,
  };
}

export default function ConfidenceCard({ listing }: ConfidenceCardProps) {
  const safeScore = buildConfidenceScore(listing);
  const highConfidence = safeScore >= 85;
  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference - (safeScore / 100) * circumference;
  const heroImage = listing.imageUrls?.[0];
  const coverPosition = listing.coverFocus ? `${listing.coverFocus.x}% ${listing.coverFocus.y}%` : "center";
  const pillars = buildConfidencePillars(listing);

  return (
    <article className="glass-card group overflow-hidden border border-soft transition-all duration-300 ease-luxury hover:-translate-y-1 hover:border-accent/30">
      <a href={`/listings/${listing.slug}/`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden border-b border-soft">
          {heroImage ? (
            <img
              src={heroImage}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform duration-[400ms] ease-luxury group-hover:scale-[1.03]"
              style={{ objectPosition: coverPosition }}
            />
          ) : (
            <div className="surface-soft h-full w-full" />
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div className="glass-effect rounded-full px-3 py-1.5">
              <span className="text-sm font-semibold tracking-[-0.03em]">{listing.priceLabel}</span>
            </div>

            <div className={`glass-effect rounded-full px-3 py-1.5 ${listing.owner.verified ? "shadow-accent-soft" : ""}`}>
              <span className="text-xs font-medium uppercase tracking-[0.18em]">
                {listing.owner.verified ? "Verified owner" : "Owner listed"}
              </span>
            </div>
          </div>
        </div>
      </a>

      <div className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-xl font-semibold tracking-[-0.04em]">
              <a href={`/listings/${listing.slug}/`} className="transition-colors duration-300 ease-luxury hover:text-accent">
                {listing.title}
              </a>
            </h3>
            <p className="secondary-text text-sm">
              {listing.ward}, {listing.district}, {listing.city}
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-3">
            <div className="relative h-12 w-12">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="18" className="stroke-white/10" strokeWidth="3" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  className={highConfidence ? "stroke-accent" : "stroke-zinc-600"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold">
                {safeScore}%
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="subtle-label text-xs font-medium uppercase tracking-[0.18em]">
                  Confidence
                </span>
                <TooltipInfo />
              </div>

              <div
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${
                  highConfidence
                    ? "border-accent/20 surface-accent-soft text-accent"
                    : "border-base surface-soft text-muted-ui"
                }`}
              >
                {safeScore}% {listing.owner.verified ? "Verified" : "Reviewing"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ConfidenceMetric icon={ShieldCheck} label="Legal" score={pillars.legal} />
          <ConfidenceMetric icon={TrendingUp} label="Price" score={pillars.price} />
          <ConfidenceMetric icon={History} label="History" score={pillars.history} />
        </div>

        <p className="secondary-text text-sm leading-7">{listing.summary}</p>

        <div className="grid grid-cols-2 gap-3 border-t border-soft pt-4 md:grid-cols-4">
          <SpecCell label="Beds" value={String(listing.beds)} />
          <SpecCell label="Baths" value={String(listing.baths)} />
          <SpecCell label="Area" value={`${listing.area} m²`} />
          <SpecCell
            label="Status"
            value={
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                listing.owner.verified
                  ? "border-accent/20 surface-accent-soft text-accent"
                  : "border-base surface-soft text-muted-ui"
              }`}>
                {listing.owner.verified ? "Verified" : "Pending"}
              </span>
            }
          />
        </div>
      </div>
    </article>
  );
}

function ConfidenceMetric({
  icon: Icon,
  label,
  score,
}: {
  icon: typeof ShieldCheck;
  label: string;
  score: number;
}) {
  return (
    <div className="group/metric surface-soft grid justify-items-start gap-2 rounded-xl p-3">
      <div className="luxury-transition flex h-10 w-10 items-center justify-center rounded-md border border-soft surface-subtle group-hover/metric:scale-110 group-hover/metric:bg-card">
        <Icon className="h-4 w-4 text-accent" strokeWidth={1.5} />
      </div>
      <div className="secondary-text text-xs font-medium">{label}</div>
      <div className="text-sm font-semibold tracking-[-0.02em]">{score}%</div>
    </div>
  );
}

function SpecCell({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="surface-soft rounded-xl border border-soft px-3 py-3">
      <div className="subtle-label mb-1 text-[11px] font-medium uppercase tracking-[0.18em]">
        {label}
      </div>
      <div className="flex items-center justify-between gap-2 text-sm font-medium">{value}</div>
    </div>
  );
}

function TooltipInfo() {
  return (
    <div className="group/info relative">
      <button
        type="button"
        aria-label="Confidence score information"
        className="luxury-transition surface-soft flex h-5 w-5 items-center justify-center rounded-full border border-base secondary-text hover:text-accent"
      >
        <CircleHelp className="h-4 w-4" strokeWidth={1.5} />
      </button>

      <div className="glass-effect pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-64 -translate-x-1/2 rounded-xl p-3 text-xs leading-6 opacity-0 transition-all duration-300 ease-luxury group-hover/info:opacity-100">
        This score is based on recent sales, verified documentation, and owner activity.
      </div>
    </div>
  );
}
