// RecentActionableOrders — the "آخر الطلبات التي تحتاج إجراء" list
// extracted from DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 9).
//
// Renders a list of up to 3 recent orders that need merchant attention,
// each with: order number, customer, status/fulfillment/payment pills,
// total, next action, and an "open" button.
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl
// - header: title + "view all" button
// - rows: divide-y, hover bg, click-to-navigate-to-order
// - pills: status (uses orderStatusColors + arabicStatusLabels from
//   ./constants), fulfillment (violet for pickup, blue for delivery),
//   payment (amber for COD-pending, emerald for paid, neutral otherwise)

import { useNavigate } from "react-router-dom";
import type { TFunction } from "i18next";
import { formatCurrency } from "@/lib/utils";
import {
  orderStatusColors,
  arabicStatusLabels,
  arabicPaymentLabels,
  getNextActionLabel,
} from "./constants";

export type ActionableOrder = {
  id: number;
  orderNumber: string;
  customerName: string | null;
  total: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  fulfillmentType: string | null;
  source: string | null;
  createdAt: string;
};

type Props = {
  orders: ActionableOrder[];
  t: TFunction;
};

export function RecentActionableOrders({ orders, t }: Props) {
  const navigate = useNavigate();
  if (!orders || orders.length === 0) return null;
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm sm:text-base text-neutral-900">
          {t(
            "dashboard.recentActionable.title",
            "آخر الطلبات التي تحتاج إجراء",
          )}
        </h2>
        <button
          onClick={() => navigate("/orders")}
          className="text-xs font-bold text-neutral-600 hover:text-neutral-800 transition-colors"
        >
          {t("dashboard.recentActionable.viewAll", "عرض الكل")}
        </button>
      </div>
      <div className="divide-y divide-neutral-100">
        {orders.slice(0, 3).map((order) => {
          const statusLabel =
            arabicStatusLabels[order.status] || order.status;
          const statusCls =
            orderStatusColors[order.status] ||
            "bg-neutral-200 text-neutral-700";
          const payLabel =
            order.paymentMethod === "cash_on_delivery" &&
            order.paymentStatus === "pending"
              ? "COD"
              : arabicPaymentLabels[order.paymentStatus] ||
                order.paymentStatus;
          const fulfillmentLabel =
            order.fulfillmentType === "local_pickup" ? "استلام" : "توصيل";
          const nextAction = getNextActionLabel(order);
          return (
            <div
              key={order.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-neutral-50/50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
              onClick={() => navigate(`/orders?orderId=${order.id}`)}
            >
              {/* Order info: number + customer + total */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900 tabular-nums">
                    #{order.orderNumber}
                  </span>
                  <span className="text-xs text-neutral-500">·</span>
                  <span className="text-sm text-neutral-700 truncate">
                    {order.customerName || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${statusCls}`}
                  >
                    {statusLabel}
                  </span>
                  <span className="text-xs text-neutral-300">|</span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      order.fulfillmentType === "local_pickup"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-primary-100 text-primary-700"
                    }`}
                  >
                    {fulfillmentLabel}
                  </span>
                  <span className="text-xs text-neutral-300">|</span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      order.paymentMethod === "cash_on_delivery" &&
                      order.paymentStatus === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : order.paymentStatus === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {payLabel}
                  </span>
                </div>
              </div>
              {/* Total + next action */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-bold tabular-nums text-neutral-900">
                  {formatCurrency(order.total)} {t("common.sar", "ر.س")}
                </span>
                <span className="text-xs text-neutral-400">
                  {nextAction}
                </span>
              </div>
              {/* Open button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/orders?orderId=${order.id}`);
                }}
                className="text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 px-3 py-1.5 rounded-xl transition-all flex-shrink-0"
              >
                {t("dashboard.recentActionable.open", "فتح الطلب")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
