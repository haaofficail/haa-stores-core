import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary-500/20 bg-primary-50 text-primary-500',
        secondary: 'border-neutral-200 bg-neutral-100 text-neutral-900',
        destructive: 'border-danger/20 bg-danger-subtle text-danger',
        success: 'border-success/20 bg-success-subtle text-success-text',
        warning: 'border-warning/20 bg-warning-subtle text-warning-text',
        outline: 'border-neutral-200 text-neutral-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
