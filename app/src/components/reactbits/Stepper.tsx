import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  className?: string;
}

/**
 * Stepper Component (Terminal-Dark Spec)
 * Multi-stage step flow with framer-motion and terminal-dark tokens.
 */
export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepChange,
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Header step pill track */}
      <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2 scrollbar-none">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => onStepChange(idx)}
                className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-md text-xs font-mono font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-midnight-accent text-midnight-bg font-semibold'
                      : isCompleted
                      ? 'bg-midnight-surface border border-midnight-positive text-midnight-positive'
                      : 'bg-midnight-surface border border-midnight-border text-ink-muted group-hover:border-midnight-strongBorder'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
                </div>
                <div className="hidden sm:block">
                  <div
                    className={`text-xs transition-colors ${
                      isActive
                        ? 'text-ink-primary font-semibold'
                        : 'text-ink-muted group-hover:text-ink-secondary'
                    }`}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="text-[11px] text-ink-muted hidden md:block">
                      {step.description}
                    </div>
                  )}
                </div>
              </button>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 mx-2 sm:mx-3 h-[1px] transition-colors duration-150 ${
                    idx < currentStep ? 'bg-midnight-accent/40' : 'bg-midnight-border'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content with Motion Slide */}
      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {steps[currentStep]?.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Stepper;
