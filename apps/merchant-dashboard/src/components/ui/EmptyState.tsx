// EmptyState — the canonical "you have no X yet" surface for the
// merchant dashboard. Designed to match the rest of the dashboard
// chrome (rounded-3xl, white/blur, soft shadow, primary CTA on the
// brand color). RTL-safe by default since lang=ar dir=rtl is set
// at the HTML root.
//
// Use it whenever a list / table / dashboard widget has nothing to
// show. Three slots:
//   - icon      (a Lucide component or any ReactNode)
//   - title     (the headline — e.g. "لا توجد منتجات بعد")
//   - description (one-sentence Arabic explainer)
//   - action    (optional CTA — usually a primary Button or Link)

import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-4 text-center py-16 px-6 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-card ${className ?? ''}`}
    >
      {icon && (
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-50 text-primary-600">
          {icon}
        </div>
      )}
      <div className="max-w-md space-y-1.5">
        <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
        {description && (
          <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
