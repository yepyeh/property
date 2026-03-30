import { motion } from "framer-motion";
import type { ReactNode } from "react";

export interface FlowStepDefinition {
  id: string;
  title: string;
  context: string;
}

interface FlowContainerProps {
  steps: FlowStepDefinition[];
  currentStep: number;
  summary: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  backLabel?: string;
  statusLabel?: string;
}

export default function FlowContainer({
  steps,
  currentStep,
  summary,
  children,
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
  backLabel = "Back",
  statusLabel,
}: FlowContainerProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <div className="mb-8">
          <div className="h-px overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-[#98ff98]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              <div className="glass-card p-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                      Live preview
                    </p>
                    <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
                      Your listing is taking shape
                    </h2>
                  </div>
                  {summary}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="space-y-3">
                  {steps.map((step, index) => {
                    const active = index === currentStep;
                    const complete = index < currentStep;
                    return (
                      <div
                        key={step.id}
                        className={`rounded-2xl border px-4 py-3 transition-all duration-300 ease-luxury ${
                          active
                            ? "border-[#98ff98]/20 bg-white/[0.04] opacity-100"
                            : complete
                              ? "border-white/5 bg-white/[0.02] opacity-80"
                              : "border-white/5 bg-transparent opacity-40"
                        }`}
                      >
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                          Step {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">{step.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <section className="glass-card p-6 md:p-8">
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {statusLabel || `Step ${currentStep + 1} of ${steps.length}`}
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  {steps[currentStep].title}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
                  {steps[currentStep].context}
                </p>
              </div>

              <div>{children}</div>

              <div className="flex flex-col gap-3 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-300 ease-luxury hover:border-white/15 hover:bg-white/[0.03] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!onBack}
                >
                  {backLabel}
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  className="btn-primary min-w-[180px] justify-center disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={Boolean(nextDisabled) || !onNext}
                >
                  {nextLabel}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
