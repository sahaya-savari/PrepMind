import { PropsWithChildren } from 'react';
import { motion } from 'framer-motion';

type SectionContainerProps = PropsWithChildren<{
  title: string;
  badge: string;
  description?: string;
}>;

function SectionContainer({ title, badge, description, children }: SectionContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-midnight-accent">
          {badge}
        </span>
        <div className="h-px flex-1 bg-midnight-border" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink-primary tracking-tight">
          {title}
        </h2>
        {description && <p className="text-ink-secondary text-sm max-w-2xl">{description}</p>}
      </div>
      {children}
    </motion.div>
  );
}

export default SectionContainer;