import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base — shared by ALL variants
  //
  // Easing + duration ported verbatim from the public landing page
  // (staging.haastores.com) so every Button in the dashboard inherits
  // the same Apple-grade motion curve as the marketing CTA. The
  // explicit transition-property list (over `transition-all`) keeps
  // layout/sizing changes off the GPU compositor.
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'font-medium select-none cursor-pointer',
    'transition-[background-color,box-shadow,transform,opacity] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
    // Focus: WCAG-compliant ring matching the landing CTA focus style
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500',
    'disabled:pointer-events-none disabled:opacity-40',
    // Active press matches landing CTA tactile feedback (0.98 scale).
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        // ── Primary — filled brand blue ──
        // hover darkens one step + subtle 1px lift to mirror the
        // landing primary CTA (shadow-md + -translate-y-[1px])
        default:
          'bg-primary-500 text-white shadow-sm hover:bg-primary-700 hover:shadow-md hover:-translate-y-[1px]',

        // ── Destructive — red delete/danger action ──
        destructive:
          'bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md hover:-translate-y-[1px]',

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
      // Sizes are aligned to the live landing page tokens
      // (staging.haastores.com) so opt-in call-sites get pixel-parity
      // with the public marketing CTA stack:
      //
      //   - `cta` is the landing primary CTA: 48px tall, 24px x-padding,
      //     14px label @ 600 weight, 12px radius (rounded-xl).
      //   - `sm`  matches the landing pill nav button: 32px tall,
      //     16px x-padding, 12px label, 8px radius.
      //   - `icon` is bumped to 44x44 to satisfy WCAG 2.5.5 touch
      //     target floor (locked by tests/merchant-touch-targets).
      size: {
        default: 'h-11 px-5 text-sm rounded-xl',
        cta:     'h-12 px-6 text-sm font-semibold rounded-xl',
        sm:      'h-9 px-4 text-xs font-semibold rounded-lg',
        lg:      'h-12 px-6 text-base rounded-xl',
        icon:    'h-11 w-11 rounded-xl',
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
