// Shared building blocks for the IA W2 section hubs (Marketing,
// Sales, Finance, Catalog). Each hub is "overview + KPIs + tool
// cards" — the same skeleton extracted here so a future section
// (Insights, Content, etc.) can drop in without copy-pasting.
//
// The hubs use Promise.allSettled in their data load: when one
// downstream API is down, only that card degrades to "—" instead
// of blocking the whole page.

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function HubHeader({
  tagIcon,
  tagLabel,
  title,
  description,
}: {
  tagIcon: ReactNode;
  tagLabel: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {tagIcon}
        <span className="text-sm font-medium text-primary-600">{tagLabel}</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{title}</h1>
      <p className="text-neutral-500 text-base mt-2 leading-relaxed max-w-2xl">
        {description}
      </p>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number | null;
  trend?: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
        {value ?? '—'}
      </p>
      {trend && <p className="text-xs text-neutral-400 mt-1">{trend}</p>}
    </div>
  );
}

export function MetricGrid({
  loading,
  count = 4,
  children,
}: {
  loading: boolean;
  count?: number;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {loading
        ? Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))
        : children}
    </div>
  );
}

export function HubCard({
  icon: Icon,
  iconClass,
  title,
  description,
  to,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  description: string;
  to: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="group block bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3.5 rounded-2xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowLeft className="h-4 w-4 text-neutral-300 group-hover:text-primary-500 transition-colors" />
      </div>
      <h3 className="font-bold text-neutral-900 text-base mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 mb-3 leading-relaxed">{description}</p>
      <span className="text-sm font-semibold text-primary-600 group-hover:text-primary-700">
        {cta}
      </span>
    </Link>
  );
}
