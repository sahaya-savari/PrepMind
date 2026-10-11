import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
}

export interface SwipeToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

/**
 * SwipeToast Component (React Bits TS-TW variant)
 * Swipeable toast alert notification with terminal accents.
 */
export const SwipeToast: React.FC<SwipeToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const icon =
            toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[var(--error)] shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-[var(--warning)] shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-[var(--info)] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[var(--positive)] shrink-0" />
            );

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              drag="x"
              dragConstraints={{ left: 0, right: 100 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 60) {
                  onDismiss(toast.id);
                }
              }}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-elevated)] shadow-xl cursor-grab active:cursor-grabbing"
            >
              {icon}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {toast.title}
                </div>
                {toast.description && (
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
