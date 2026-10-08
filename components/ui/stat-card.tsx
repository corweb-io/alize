import type { ReactNode } from "react";
import Link from "next/link";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconClassName?: string;
  href?: string;
  valueClassName?: string;
  /** Small secondary line under the value. */
  hint?: ReactNode;
  hintClassName?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  iconClassName = "bg-teal-700 text-white",
  href,
  valueClassName = "text-[#1a454f] dark:text-teal-50",
  hint,
  hintClassName = "text-stone-500 dark:text-stone-400",
}: StatCardProps) {
  const content = (
    <div className="flex items-center gap-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconClassName}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
          {label}
        </p>
        <p className={`text-2xl font-semibold tracking-tight ${valueClassName}`}>
          {value}
        </p>
        {hint && <p className={`mt-0.5 text-xs ${hintClassName}`}>{hint}</p>}
      </div>
    </div>
  );

  const className =
    "block overflow-hidden rounded-xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-teal-900/5 ring-1 ring-teal-900/5 backdrop-blur-sm transition-all hover:shadow-xl hover:ring-teal-700/20 dark:border-stone-700/80 dark:bg-stone-900/90 dark:ring-teal-500/10";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
