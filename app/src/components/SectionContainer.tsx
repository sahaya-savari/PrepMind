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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{badge}</span>
        <div className="h-px flex-1 bg-gray-800" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {description && <p className="text-gray-300 text-sm max-w-2xl">{description}</p>}
      </div>
      {children}
    </motion.div>
  );
}

export default SectionContainer;