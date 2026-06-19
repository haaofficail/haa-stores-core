import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base — shared by ALL variants
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'font-medium select-none cursor-pointer',
    'transition-all duration-150 ease-out',
    // Focus: ring offset creates a visible gap so the ring is clearly separate from the button
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        // ── Primary — filled brand blue ──
        // hover darkens one step; shadow lifts slightly to signal interactivity
        default:
          'bg-primary-500 text-white shadow-sm hover:bg-primary-600 hover:shadow-md',

        // ── Destructive — red delete/danger action ──
        destructive:
          'bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md',

        // ── Outline — bordered, white fill ──
        // hover: subtle gray background, border gets slightly stronger — NO blue
        outline:
          'border border-neutral-200 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900',

        // ── Secondary — muted filled ──
        // hover: goes one step darker gray — NO blue
        secondary:
          'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900',

        // ── Ghost — transparent, minimal ──
        // hover: very subtle gray wash — NO blue
        ghost:
          'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',

        // ── Link — text-only with underline ──
        link:
          'text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline',

        // ── Destructive outline — for less severe delete actions ──
        'destructive-outline':
          'border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300',
      },
      size: {
        default: 'h-9 px-4 text-sm rounded-xl',
        sm:      'h-7 px-3 text-xs rounded-lg',
        lg:      'h-10 px-5 text-sm rounded-xl',
        icon:    'h-9 w-9 rounded-xl',
        'icon-sm': 'h-7 w-7 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
