import { AnimatePresence, motion } from "framer-motion";
import {
  BookmarkPlus,
  Building2,
  DollarSign,
  Home,
  Landmark,
  Map,
  MapPin,
  Search,
  BedDouble,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Listing } from "../../data/listings";
import ConfidenceCard from "./ConfidenceCard";

type FilterState = {
  intent: string;
  country: string;
  city: string;
  district: string;
  propertyType: string;
  saleMode: string;
  beds: string;
  minPrice: string;
  maxPrice: string;
};

interface PremiumSearchResultsPageProps {
  initialListings: Listing[];
  initialFilters: FilterState;
  countries: string[];
  cities: string[];
  districts: string[];
  isSignedIn: boolean;
}

const PROPERTY_TYPES = ["Any property", "Condo", "Villa", "Townhouse", "Apartment", "House", "Land"];
const dropdownTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as const,
};

const SALE_MODE_LABEL_TO_QUERY: Record<string, string> = {
  Auction: "auction",
  "Private sale": "private-sale",
};

export default function PremiumSearchResultsPage({
  initialListings,
  initialFilters,
  countries,
  cities,
  districts,
  isSignedIn,
}: PremiumSearchResultsPageProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const visibleCards = useMemo(() => initialListings.slice(0, 12), [initialListings]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (filters.intent) params.set("intent", filters.intent);
    if (filters.country) params.set("country", filters.country);
    if (filters.city) params.set("city", filters.city);
    if (filters.district) params.set("district", filters.district);
    const propertyTypes = splitCsv(filters.propertyType);
    const saleModes = splitCsv(filters.saleMode)
      .map((value) => SALE_MODE_LABEL_TO_QUERY[value] || value)
      .filter(Boolean);
    const beds = splitCsv(filters.beds);
    if (propertyTypes.length > 0) params.set("propertyType", propertyTypes.join(","));
    if (saleModes.length > 0) params.set("saleMode", saleModes.join(","));
    if (beds.length > 0) params.set("beds", beds.join(","));
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    window.location.href = `/listings/?${params.toString()}`;
  };

  const clearFilters = () => {
    window.location.href = "/listings/";
  };

  return (
    <div className="space-y-xl md:space-y-24">
      <section className="glass-card overflow-visible">
        <div className="border-b border-soft px-l py-xl">
          <div className="mb-l max-w-3xl space-y-s">
            <span className="inline-flex rounded-full border border-white/10 px-s py-xs text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Search results
            </span>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Search property with less noise and stronger buyer signals.
            </h1>
            <p className="secondary-text max-w-2xl text-sm leading-7 md:text-base">
              The results surface should feel decisive and clean: stronger filters, cleaner cards,
              and less portal clutter between intent and action.
            </p>
          </div>

          <div className="mb-6 space-y-2">
            <span className="subtle-label">
              Refine the shortlist
            </span>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
              Filter with intent, not clutter.
            </h2>
          </div>

          <div className="grid gap-m md:grid-cols-2 xl:grid-cols-4">
            <GlassSelect label="Country" icon={Landmark} value={filters.country || "All countries"} options={["All countries", ...countries]} onChange={(value) => updateFilter("country", value === "All countries" ? "" : value)} />
            <GlassSelect label="City" icon={Building2} value={filters.city || "All cities"} options={["All cities", ...cities]} onChange={(value) => updateFilter("city", value === "All cities" ? "" : value)} />
            <GlassSelect label="District" icon={MapPin} value={filters.district || "Any district"} options={["Any district", ...districts]} onChange={(value) => updateFilter("district", value === "Any district" ? "" : value)} />
            <MultiGlassSelect
              label="Property Type"
              icon={Home}
              values={splitCsv(filters.propertyType)}
              options={PROPERTY_TYPES.filter((option) => option !== "Any property").map((option) => ({ value: option, label: option }))}
              placeholder="Any property"
              onChange={(values) => updateFilter("propertyType", values.join(","))}
            />
            <MultiGlassSelect
              label="Sale mode"
              icon={Search}
              values={splitCsv(filters.saleMode)}
              options={[
                { value: "Private sale", label: "Private sale" },
                { value: "Auction", label: "Auction" },
              ]}
              placeholder="Any mode"
              onChange={(values) => updateFilter("saleMode", values.join(","))}
            />
            <MultiGlassSelect
              label="Beds"
              icon={BedDouble}
              values={splitCsv(filters.beds)}
              options={[
                { value: "1", label: "1 bed" },
                { value: "2", label: "2 bed" },
                { value: "3", label: "3 bed" },
                { value: "4", label: "4 bed" },
                { value: "5", label: "5+ bed" },
              ]}
              placeholder="Any beds"
              onChange={(values) => updateFilter("beds", values.join(","))}
            />
            <GlassInput label="Min price" icon={DollarSign} value={filters.minPrice} onChange={(value) => updateFilter("minPrice", value)} placeholder="0" />
            <GlassInput label="Max price" icon={DollarSign} value={filters.maxPrice} onChange={(value) => updateFilter("maxPrice", value)} placeholder="1000000" />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleSearch} className="btn-primary">
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-300 ease-luxury hover:border-white/15 hover:bg-white/[0.03] hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="surface-soft flex flex-col gap-m border-t border-soft px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="secondary-text text-sm">
            {initialListings.length} live {initialListings.length === 1 ? "listing" : "listings"} in the current filter set.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={isSignedIn ? "/account/inbox" : "/login"}
              className="luxury-transition rounded-full border border-base px-5 py-2.5 text-sm font-medium text-muted-ui hover:bg-card hover:text-white"
            >
              Track Enquiries
            </a>
            <a
              href={isSignedIn ? "/submit-listing/" : "/signup?role=owner"}
              className="luxury-transition rounded-full border border-base px-5 py-2.5 text-sm font-medium text-muted-ui hover:bg-card hover:text-white"
            >
              Post Listing
            </a>
          </div>
        </div>
      </section>

      {initialListings.length === 0 ? (
        <section className="space-y-l py-xl md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <span className="subtle-label mb-3 inline-flex rounded-full border border-base px-3 py-1">
              0 listings
            </span>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">
              There are no listings for this filter set yet.
            </h3>
            <p className="secondary-text mt-4 text-sm leading-7 md:text-base">
              Widen the criteria, change the area, or save this view so the platform can help you
              return when relevant supply appears.
            </p>
          </div>

          <div className="grid gap-m md:grid-cols-2">
            <ActionCard
              icon={BookmarkPlus}
              title="Save this search"
              description="Keep this filter combination and return when stronger supply appears."
              ctaLabel={isSignedIn ? "Open dashboard" : "Sign in to save"}
              href={isSignedIn ? "/buyer/dashboard/" : "/login"}
            />
            <ActionCard
              icon={Map}
              title="Map View"
              description="See the filtered listings on a live map."
              ctaLabel="Open map view"
              href="#"
            />
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="subtle-label text-xs font-medium uppercase tracking-[0.18em]">Confidence-led results</p>
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                Listings with stronger trust signals first.
              </h3>
            </div>
            <p className="secondary-text max-w-xl text-sm leading-7">
              These cards prioritize trust, clarity, and direct comparability so buyers can shortlist with less noise.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
            {visibleCards.map((listing) => (
              <ConfidenceCard key={listing.slug} listing={listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GlassInput({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="subtle-label block">
        {label}
      </span>
      <div className="glass-effect group luxury-transition flex items-center gap-3 rounded-xl px-4 py-3.5 hover:border-base hover:bg-card">
        <Icon className="h-5 w-5 shrink-0 secondary-text transition-colors duration-300 ease-luxury group-hover:text-accent" strokeWidth={1.5} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input-luxury w-full border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus:ring-0"
          inputMode="numeric"
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function GlassSelect({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.findIndex((option) => option === value)));
      setOpen(true);
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, option: string) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index + 1) % options.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index - 1 + options.length) % options.length);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(option);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <span className="subtle-label mb-2 block">
        {label}
      </span>

      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group glass-effect luxury-transition flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left ${
          open
            ? "border-accent/30 shadow-accent-soft"
            : "hover:border-base hover:bg-card"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 secondary-text transition-colors duration-300 ease-luxury group-hover:text-accent" strokeWidth={1.5} />
          <span className="truncate text-sm">{value}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={dropdownTransition} className="secondary-text ml-3 transition-colors duration-300 ease-luxury group-hover:text-accent">
          <ChevronIcon />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button type="button" aria-label={`Close ${label}`} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={dropdownTransition}
              className="glass-effect absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl p-2"
            >
              <div className="max-h-64 overflow-auto" role="listbox" aria-label={label}>
                {options.map((option) => {
                  const active = option === value;
                  return (
                    <button
                      key={option}
                      type="button"
                      ref={(element) => {
                        optionRefs.current[indexOfOption(options, option)] = element;
                      }}
                      onClick={() => {
                        onChange(option);
                        setOpen(false);
                      }}
                      onKeyDown={(event) => handleOptionKeyDown(event, indexOfOption(options, option), option)}
                      role="option"
                      aria-selected={active}
                      className={`luxury-transition flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm ${
                        active
                          ? "surface-accent-soft text-white"
                          : "text-muted-ui hover:bg-card hover:text-white"
                      }`}
                    >
                      <span>{option}</span>
                      {active ? <span className="text-xs font-medium text-accent">Selected</span> : null}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function indexOfOption(options: string[], option: string) {
  return options.findIndex((entry) => entry === option);
}

function MultiGlassSelect({
  label,
  icon: Icon,
  values,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  icon: LucideIcon;
  values: string[];
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const valueSet = new Set(values);
  const summary = values.length > 0
    ? options.filter((option) => valueSet.has(option.value)).map((option) => option.label).join(", ")
    : placeholder;

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const toggleValue = (value: string) => {
    const next = valueSet.has(value) ? values.filter((entry) => entry !== value) : [...values, value];
    onChange(next);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(0);
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, value: string) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index + 1) % options.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index - 1 + options.length) % options.length);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleValue(value);
    }
  };

  return (
    <div className="relative">
      <span className="subtle-label mb-2 block">
        {label}
      </span>

      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group glass-effect luxury-transition flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left ${
          open
            ? "border-accent/30 shadow-accent-soft"
            : "hover:border-base hover:bg-card"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 secondary-text transition-colors duration-300 ease-luxury group-hover:text-accent" strokeWidth={1.5} />
          <span className={`truncate text-sm ${values.length > 0 ? "" : "secondary-text"}`}>{summary}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={dropdownTransition} className="secondary-text ml-3 transition-colors duration-300 ease-luxury group-hover:text-accent">
          <ChevronIcon />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button type="button" aria-label={`Close ${label}`} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={dropdownTransition}
              className="glass-effect absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl p-2"
            >
              <div className="max-h-64 overflow-auto" role="listbox" aria-label={label} aria-multiselectable="true">
                {options.map((option, index) => {
                  const active = valueSet.has(option.value);
                  return (
                    <button
                      key={option.value}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      type="button"
                      onClick={() => toggleValue(option.value)}
                      onKeyDown={(event) => handleOptionKeyDown(event, index, option.value)}
                      role="option"
                      aria-selected={active}
                      className={`luxury-transition flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm ${
                        active
                          ? "surface-accent-soft text-white"
                          : "text-muted-ui hover:bg-card hover:text-white"
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className={`text-xs font-medium ${active ? "text-accent" : "secondary-text"}`}>
                        {active ? "Selected" : "Toggle"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="block">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActionCard({
  icon,
  title,
  description,
  ctaLabel,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}) {
  const Icon = icon;
  return (
    <article className="glass-card group flex h-full flex-col justify-between p-6 md:p-7">
      <div className="space-y-4">
        <div className="surface-soft luxury-transition flex h-11 w-11 items-center justify-center rounded-full border border-base text-zinc-600 group-hover:text-accent">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h4 className="text-xl font-semibold tracking-[-0.04em] text-white">{title}</h4>
          <p className="secondary-text text-sm leading-7">{description}</p>
        </div>
      </div>
      <div className="pt-8">
        <a
          href={href}
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-300 ease-luxury hover:text-accent"
        >
          {ctaLabel}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}
