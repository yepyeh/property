import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type IntentOption = "buy" | "list" | "explore" | null;

const AREAS = [
  "Thao Dien",
  "Thu Duc City",
  "District 1",
  "District 2",
  "Binh Thanh",
  "Phu My Hung",
  "An Phu",
  "Tay Ho",
  "Hoan Kiem",
  "My An",
];

const slideTransition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1] as const,
};

const slideVariants = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
};

export default function ProgressiveDiscoveryOnboarding() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [intent, setIntent] = useState<IntentOption>(null);
  const [neighborhood, setNeighborhood] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState("");

  const filteredAreas = useMemo(() => {
    const query = neighborhood.trim().toLowerCase();
    if (!query) return AREAS.slice(0, 5);
    return AREAS.filter((area) => area.toLowerCase().includes(query)).slice(0, 5);
  }, [neighborhood]);

  const canContinue = step === 1 ? Boolean(intent) : Boolean(selectedSuggestion || neighborhood.trim());

  useEffect(() => {
    if (step !== 3) return;

    const nextNeighborhood = encodeURIComponent(selectedSuggestion || neighborhood.trim());
    const timeout = window.setTimeout(() => {
      if (intent === "buy") {
        window.location.href = `/listings/?intent=buy&city=${nextNeighborhood}`;
        return;
      }

      if (intent === "list") {
        window.location.href = `/submit-listing/?city=${nextNeighborhood}`;
        return;
      }

      window.location.href = `/guides/vietnam/ho-chi-minh-city/?focus=${nextNeighborhood}`;
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [step, intent, neighborhood, selectedSuggestion]);

  const handleContinue = () => {
    if (step === 1 && intent) setStep(2);
    if (step === 2 && (selectedSuggestion || neighborhood.trim())) setStep(3);
  };

  const selectArea = (area: string) => {
    setNeighborhood(area);
    setSelectedSuggestion(area);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell flex min-h-screen items-center justify-center py-xl">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.section
                key="step-1"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="glass-card panel-min-h mx-auto flex flex-col justify-between p-l md:p-xl"
              >
                <div className="space-y-8">
                  <div className="space-y-3">
                    <span className="subtle-label inline-flex rounded-full border border-base px-3 py-1">
                      Step 1
                    </span>
                    <div className="space-y-2">
                      <h1 className="title-tight text-3xl font-semibold md:text-5xl">
                        What brings you here?
                      </h1>
                      <p className="secondary-text max-w-xl text-sm leading-7 md:text-base">
                        Start with intent. The product should adapt around what you need rather than forcing
                        everyone through one generic property journey.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <IntentCard
                      active={intent === "buy"}
                      title="I'm looking to buy"
                      description="Search seriously, compare clearly, and move toward a confident decision."
                      onClick={() => setIntent("buy")}
                    />
                    <IntentCard
                      active={intent === "list"}
                      title="I'm listing a property"
                      description="Launch with stronger positioning, better trust, and a cleaner owner workflow."
                      onClick={() => setIntent("list")}
                    />
                    <IntentCard
                      active={intent === "explore"}
                      title="I'm just exploring"
                      description="Browse the market, understand neighborhoods, and learn what feels right."
                      onClick={() => setIntent("explore")}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-8">
                  <ContinueButton disabled={!canContinue} onClick={handleContinue} />
                </div>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section
                key="step-2"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="glass-card panel-min-h mx-auto flex flex-col justify-between p-l md:p-xl"
              >
                <div className="space-y-8">
                  <div className="space-y-3">
                    <span className="subtle-label inline-flex rounded-full border border-base px-3 py-1">
                      Step 2
                    </span>
                    <div className="space-y-2">
                      <h2 className="title-tight text-3xl font-semibold md:text-5xl">
                        What is your dream neighborhood?
                      </h2>
                      <p className="secondary-text max-w-xl text-sm leading-7 md:text-base">
                        Give us a starting point. We will shape the first view around a place that already
                        feels relevant.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="surface-soft rounded-xl border border-base p-2">
                      <div className="luxury-transition flex items-center gap-3 rounded-lg border border-transparent px-4 py-4 focus-within:border-accent/30 focus-within:bg-card">
                        <span className="secondary-text">⌕</span>
                        <input
                          value={neighborhood}
                          onChange={(e) => {
                            setNeighborhood(e.target.value);
                            setSelectedSuggestion("");
                          }}
                          placeholder="Search an area, district, or neighborhood"
                          className="input-luxury border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus:ring-0"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {filteredAreas.map((area) => {
                        const active = (selectedSuggestion || neighborhood) === area;
                        return (
                          <motion.button
                            key={area}
                            type="button"
                            whileTap={{ scale: 0.99 }}
                            onClick={() => selectArea(area)}
                            className={`luxury-transition flex items-center justify-between rounded-lg border px-4 py-4 text-left ${
                              active
                                ? "border-accent/40 surface-accent-soft"
                                : "border-base surface-soft text-muted-ui hover:bg-card"
                            }`}
                          >
                            <span className="font-medium">{area}</span>
                            <motion.span
                              animate={{ scale: active ? 1.08 : 1 }}
                              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                              className={`text-sm ${active ? "text-accent" : "secondary-text"}`}
                            >
                              {active ? "Selected" : "Suggested"}
                            </motion.span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-8">
                  <ContinueButton disabled={!canContinue} onClick={handleContinue} />
                </div>
              </motion.section>
            )}

            {step === 3 && (
              <motion.section
                key="step-3"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="glass-card panel-min-h mx-auto flex flex-col justify-center p-l md:p-xl"
              >
                <div className="mx-auto w-full max-w-xl space-y-8">
                  <div className="space-y-3 text-center">
                    <span className="subtle-label inline-flex rounded-full border border-base px-3 py-1">
                      Step 3
                    </span>
                    <h2 className="title-tight text-3xl font-semibold md:text-5xl">
                      Generating Your Personalized View...
                    </h2>
                    <p className="secondary-text text-sm leading-7 md:text-base">
                      Pulling together a calmer starting point around{" "}
                      <span>{selectedSuggestion || neighborhood}</span>.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[0, 1, 2].map((row) => (
                      <div
                        key={row}
                        className="surface-soft rounded-xl border border-base p-5"
                      >
                        <SkeletonLine className="mb-4 h-4 w-24" />
                        <SkeletonLine className="mb-3 h-6 w-2/3" />
                        <SkeletonLine className="mb-6 h-4 w-full" />
                        <div className="grid grid-cols-3 gap-3">
                          <SkeletonLine className="h-24 w-full rounded-2xl" />
                          <SkeletonLine className="h-24 w-full rounded-2xl" />
                          <SkeletonLine className="h-24 w-full rounded-2xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function IntentCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className={`group luxury-transition w-full rounded-lg border p-5 text-left ${
        active
          ? "border-accent/40 surface-accent-soft"
          : "border-base surface-soft hover:bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h3 className="title-snug text-lg font-medium">{title}</h3>
          <p className="secondary-text max-w-xl text-sm leading-7">{description}</p>
        </div>
        <motion.div
          animate={{ scale: active ? 1.08 : 1 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full border ${
            active
              ? "border-accent/40 surface-accent-soft text-accent"
              : "border-base surface-soft secondary-text"
          }`}
        >
          →
        </motion.div>
      </div>
    </motion.button>
  );
}

function ContinueButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`btn-primary action-min-w ${disabled ? "cursor-not-allowed opacity-40 grayscale" : "opacity-100"}`}
    >
      Continue
    </button>
  );
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.32, 0.7, 0.32] }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={`bg-white/10 ${className}`}
    />
  );
}
