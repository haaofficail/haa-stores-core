import { StoreSkeleton } from '@/components/ui';

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white shadow-sm h-full flex flex-col overflow-hidden">
      <StoreSkeleton className="aspect-square rounded-none" />
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <StoreSkeleton className="h-[14px] w-1/3" />
        <StoreSkeleton className="h-4 w-full" />
        <StoreSkeleton className="h-4 w-2/3" />
        <StoreSkeleton className="h-[24px] w-1/3" />
        <StoreSkeleton className="h-5 w-1/2" />
        <div className="mt-auto pt-1">
          <StoreSkeleton className="h-[32px] w-full rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}
