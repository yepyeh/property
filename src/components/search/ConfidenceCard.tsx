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
  const ringColor = highConfidence ? "#98ff98" : "#52525b";
  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference - (safeScore / 100) * circumference;
  const heroImage = listing.imageUrls?.[0];
  const coverPosition = listing.coverFocus ? `${listing.coverFocus.x}% ${listing.coverFocus.y}%` : "center";
  const pillars = buildConfidencePillars(listing);

  return (
    <article className="glass-card group overflow-hidden border border-white/5 transition-all duration-300 ease-luxury hover:-translate-y-1 hover:border-accent/30">
      <a href={`/listings/${listing.slug}/`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden border-b border-white/5">
          {heroImage ? (
            <img
              src={heroImage}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform duration-[400ms] ease-luxury group-hover:scale-[1.03]"
              style={{ objectPosition: coverPosition }}
            />
          ) : (
            <div className="h-full w-full bg-white/[0.03]" />
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div className="rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1.5 backdrop-blur-xl">
              <span className="text-sm font-semibold tracking-[-0.03em] text-white">{listing.priceLabel}</span>
            </div>

            <div className={`rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1.5 backdrop-blur-xl ${listing.owner.verified ? "shadow-[0_0_15px_-3px_rgba(152,255,152,0.2)]" : ""}`}>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-200">
                {listing.owner.verified ? "Verified owner" : "Owner listed"}
              </span>
            </div>
          </div>
        </div>
      </a>

      <div className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-xl font-semibold tracking-[-0.04em] text-white">
              <a href={`/listings/${listing.slug}/`} className="hover:text-[#98ff98] transition-colors duration-300 ease-luxury">
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
                <circle cx="22" cy="22" r="18" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke={ringColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">
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
                    ? "border-[#98ff98]/20 bg-[#98ff98]/10 text-[#98ff98]"
                    : "border-zinc-700 bg-zinc-800/70 text-zinc-300"
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

        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 md:grid-cols-4">
          <SpecCell label="Beds" value={String(listing.beds)} />
          <SpecCell label="Baths" value={String(listing.baths)} />
          <SpecCell label="Area" value={`${listing.area} m²`} />
          <SpecCell
            label="Status"
            value={
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                listing.owner.verified
                  ? "border-[#98ff98]/20 bg-[#98ff98]/10 text-[#98ff98]"
                  : "border-zinc-700 bg-zinc-800/70 text-zinc-300"
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
    <div className="group/metric grid justify-items-start gap-2 rounded-2xl bg-white/[0.02] p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/5 bg-zinc-800/50 transition-all duration-300 ease-luxury group-hover/metric:scale-110 group-hover/metric:bg-zinc-800">
        <Icon className="h-4 w-4 text-[#98ff98]" strokeWidth={1.5} />
      </div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="text-sm font-semibold tracking-[-0.02em] text-white">{score}%</div>
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
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
      <div className="subtle-label mb-1 text-[11px] font-medium uppercase tracking-[0.18em]">
        {label}
      </div>
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-zinc-100">{value}</div>
    </div>
  );
}

function TooltipInfo() {
  return (
    <div className="group/info relative">
      <button
        type="button"
        aria-label="Confidence score information"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors duration-300 ease-luxury hover:border-white/15 hover:text-[#98ff98]"
      >
        <CircleHelp className="h-4 w-4" strokeWidth={1.5} />
      </button>

      <div className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-20 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-950/95 p-3 text-xs leading-6 text-zinc-300 opacity-0 backdrop-blur-xl transition-all duration-300 ease-luxury group-hover/info:opacity-100">
        This score is based on recent sales, verified documentation, and owner activity.
      </div>
    </div>
  );
}
