// RecentSoldProducts — the "آخر المنتجات المباعة" card extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 12).
//
// Renders the list of items sold in recent orders. Each item shows
// the product image (or placeholder), name, quantity, line total,
// order number, and a "X minutes ago" timestamp. Falls back to a
// neutral empty state when there's nothing to show.
//
// Visual fidelity preserved 1:1:
// - container: col-span-3, bg-white/80, blur backdrop, white border,
//   rounded-2xl, overflow-hidden
// - header: title + view-all button (border-b separator)
// - each row: 12x12 image, name, meta (quantity + total + order #),
//   time-ago on the right
// - empty state: 6px padding, neutral-100 icon box, neutral-400 text

import { useNavigate } from "react-router-dom";
import { ShoppingCart, Image as ImageIcon } from "lucide-react";
import type { TFunction } from "i18next";
import { handleImageError, formatCurrency } from "@/lib/utils";
import { formatTimeAgo } from "./constants";

type RecentItem = {
  id: number;
  productId?: number;
  name: string;
  quantity: number;
  totalPrice: string | number;
  productThumbUrl?: string;
  productImageUrl?: string;
};

type RecentOrder = {
  id: number;
  orderNumber: string;
  createdAt: string;
  items?: RecentItem[];
};

type Props = {
  orders: RecentOrder[];
  t: TFunction;
};

export function RecentSoldProducts({ orders, t }: Props) {
  const navigate = useNavigate();
  return (
    <div className="col-span-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <h3 className="font-bold text-base text-neutral-900">
          {t("dashboard.recentSoldProducts", "آخر المنتجات المباعة")}
        </h3>
        <button
          className="text-sm text-blue-600 hover:text-blue-700 font-bold"
          onClick={() => navigate("/orders")}
        >
          {t("common.viewAll", "عرض الكل")}
        </button>
      </div>
      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-6">
            <div className="inline-flex p-3 rounded-xl bg-neutral-100 mb-2">
              <ShoppingCart className="h-6 w-6 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">
              {t("dashboard.noProductsSold", "لا توجد منتجات مباعة بعد")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {orders.flatMap((order) =>
              (order.items ?? []).map((item) => (
                <div
                  key={`${order.id}-${item.id}`}
                  className="flex items-center gap-3 py-3 px-2 hover:bg-neutral-50 rounded-xl transition-colors"
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                    {item.productThumbUrl || item.productImageUrl ? (
                      <img
                        src={item.productThumbUrl || item.productImageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-neutral-300">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-neutral-400">
                        {t("common.quantity", "العدد:")} {item.quantity}
                      </span>
                      <span className="text-xs text-neutral-300">•</span>
                      <span className="text-xs text-neutral-500 font-medium">
                        {formatCurrency(item.totalPrice)}{" "}
                        {t("common.sar", "ر.س")}
                      </span>
                      <span className="text-xs text-neutral-300">•</span>
                      <span className="text-xs text-neutral-400">
                        {order.orderNumber}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {formatTimeAgo(t, order.createdAt)}
                  </span>
                </div>
              )),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
