import { motion } from "framer-motion";

interface KpiCardProps {
  title: string;
  value: string;
  delta: string;
}

export function KpiCard({ title, value, delta }: KpiCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card-surface p-4"
    >
      <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{title}</p>
      <h3 className="mt-2 font-heading text-2xl font-bold">{value}</h3>
      <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{delta}</p>
    </motion.article>
  );
}
