// CategoryPieChart — order distribution pie chart extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 4).
//
// Renders a donut-style pie chart (innerRadius=50, outerRadius=80) of
// order counts grouped by status, with a top-5 status legend to the
// right. Falls back to a neutral empty state when there's no data.
//
// Visual fidelity preserved 1:1:
// - container: col-span-2, bg-white/80, blur backdrop, white border
// - pie: 50/50 center, 50/80 inner/outer radius, 3px padding angle
// - colors: cycles CHART_COLORS by index (already in constants.ts)
// - legend: top-5 slice, 2.5x2.5 colored dot, label + count
// - empty state: 200px height, neutral-400 text, "no orders" message

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ShoppingBag } from "lucide-react";
import type { TFunction } from "i18next";
import { CHART_COLORS } from "./constants";
import { MerchantEmptyState } from "@/components/ui/MerchantEmptyState";

type Props = {
  orderStatusDist: Array<{ status: string; count: number }>;
  t: TFunction;
};

export function CategoryPieChart({ orderStatusDist, t }: Props) {
  return (
    <div className="col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-5">
      <h3 className="font-bold text-base text-neutral-900 mb-3">
        {t("dashboard.orderDistribution", "توزيع الطلبات")}
      </h3>
      {orderStatusDist.length > 0 ? (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="55%" height={200}>
            <PieChart>
              <Pie
                data={orderStatusDist}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                nameKey="status"
              >
                {orderStatusDist.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
                formatter={(value: any, name: any) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {orderStatusDist.slice(0, 5).map((item, i) => (
              <div
                key={item.status}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
                <span className="flex-1 text-neutral-600">
                  {t(`orders.status_${item.status}`)}
                </span>
                <span className="font-bold text-neutral-900">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <MerchantEmptyState
          icon={ShoppingBag}
          title={t("dashboard.noOrders", "لا توجد طلبات")}
          compact
        />
      )}
    </div>
  );
}
