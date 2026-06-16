// LowStockList — the compact "مخزون منخفض" list extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 11).
//
// Renders up to 3 products that are running low, each with a
// quick "+1" button to bump the stock. The actual stock-update
// API call is delegated back to the parent via onUpdateStock so
// the loading state can be tracked in the parent's updatingStock
// setter.
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl
// - header: alert icon + title + red count badge + optional "view all"
// - each row: red-50 bg, red-100 border, name + count + +1 button
// - the +1 button is disabled while the parent marks that product
//   as currently updating

import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { TFunction } from "i18next";

export type LowStockProduct = {
  id: number;
  name: string;
  stockQuantity: number;
};

type Props = {
  products: LowStockProduct[];
  updatingStockId: number | null;
  onUpdateStock: (productId: number, newStock: number) => void;
  t: TFunction;
};

export function LowStockList({
  products,
  updatingStockId,
  onUpdateStock,
  t,
}: Props) {
  const navigate = useNavigate();
  if (products.length === 0) return null;
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm sm:text-base text-neutral-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>{t("dashboard.lowStock", "مخزون منخفض")}</span>
          <span className="text-[11px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
            {products.length}
          </span>
        </h3>
        {products.length > 3 && (
          <button
            onClick={() => navigate("/products")}
            className="text-xs font-bold text-blue-600"
          >
            {t("common.viewAll", "عرض الكل")}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {products.slice(0, 3).map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-2.5 rounded-xl border border-red-100 bg-red-50/50"
          >
            <span className="text-sm font-medium text-neutral-900 truncate flex-1 min-w-0">
              {p.name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-red-600 tabular-nums">
                {t("stock.pieces", "{{count}}").replace(
                  "{{count}}",
                  String(p.stockQuantity),
                )}
              </span>
              <button
                onClick={() =>
                  onUpdateStock(p.id, (p.stockQuantity || 0) + 1)
                }
                disabled={updatingStockId === p.id}
                className="px-2 py-0.5 text-[11px] font-bold text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
              >
                +1
              </button>
              {updatingStockId === p.id && (
                <span className="text-xs text-neutral-400">...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
