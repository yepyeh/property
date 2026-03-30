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
    <div className="min-h-screen bg-background">
      <div className="page-shell py-l md:py-xl">
        <div className="mb-8">
          <div className="h-px overflow-hidden rounded-full border-base surface-subtle">
            <motion.div
              className="h-full bg-accent"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>

        <div className="flow-layout">
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              <div className="glass-card p-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="subtle-label">
                      Live preview
                    </p>
                    <h2 className="title-tight text-xl font-semibold">
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
                        className={`rounded-xl border px-4 py-3 transition-all duration-300 ease-luxury ${
                          active
                            ? "border-accent/20 surface-accent-soft opacity-100"
                            : complete
                              ? "border-soft surface-soft opacity-80"
                              : "border-soft bg-transparent opacity-40"
                        }`}
                      >
                        <p className="subtle-label">
                          Step {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-medium">{step.title}</p>
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
                <p className="subtle-label">
                  {statusLabel || `Step ${currentStep + 1} of ${steps.length}`}
                </p>
                <h1 className="title-tighter text-3xl font-semibold md:text-5xl">
                  {steps[currentStep].title}
                </h1>
                <p className="secondary-text max-w-3xl text-sm leading-7 md:text-base">
                  {steps[currentStep].context}
                </p>
              </div>

              <div>{children}</div>

              <div className="flex flex-col gap-3 border-t border-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={onBack}
                  className="luxury-transition control-min-h inline-flex items-center justify-center rounded-full border border-base px-m py-s text-sm font-medium text-muted-ui hover:bg-card hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!onBack}
                >
                  {backLabel}
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  className="btn-primary cta-min-w justify-center disabled:cursor-not-allowed disabled:opacity-40"
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
