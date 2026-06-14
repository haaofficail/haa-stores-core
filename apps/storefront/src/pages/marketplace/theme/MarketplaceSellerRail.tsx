import { Link } from 'react-router-dom';
import { BadgeCheck, Store } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import type { HaaMarketplaceProduct } from '@/lib/api';

export function MarketplaceSellerRail({ stores }: { stores: HaaMarketplaceProduct['store'][] }) {
  if (stores.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-black">متاجر مختارة</h2>
        <Link to="/marketplace/sellers" className="text-[10px] font-bold text-primary-500 hover:text-primary-600 transition-colors duration-200">عرض الكل</Link>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {stores.map((store) => (
          <Link key={store.slug} to={`/marketplace/sellers/${store.slug}`} className="inline-flex min-h-[44px] min-w-[150px] shrink-0 items-center gap-1.5 rounded-xl bg-primary-50 px-2 py-1.5 text-xs font-bold text-primary-600 shadow-sm transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 hover:bg-primary-100 hover:shadow-lg hover:shadow-primary-500/10">
            <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-[6px] bg-white">
              {store.logoUrl ? <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" /> : <Icon icon={Store} size="2xs" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-black">{store.name}</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#16a34a]">
                <Icon icon={BadgeCheck} size="2xs" />
                موثوق
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
