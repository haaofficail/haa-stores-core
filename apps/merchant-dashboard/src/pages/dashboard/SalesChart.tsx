// SalesChart — the area chart showing last-30-days sales extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 3).
//
// Renders an AreaChart with a single sales line, a tooltip showing the
// localized date and SAR-formatted value, and a small "total/orders"
// header.
//
// Visual fidelity is preserved 1:1 with the original inline JSX:
// - container: col-span-3, bg-white/80, blur backdrop, white border
// - area gradient: indigo (#6366f1) with 0.2 -> 0 alpha stops
// - tooltip: rounded 12px, slate border, 13px font, locale-aware labels
// - empty state: 220px height, neutral-400 text, "no sales data" message
// - RTL: tickFormatter + labelFormatter use i18n.language to pick the
//   right locale, mirroring the original behavior.

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import type { TFunction } from "i18next";
import { formatNumber } from "@/lib/utils";
import { MerchantEmptyState } from "@/components/ui/MerchantEmptyState";

type Props = {
  // The full sales response from reportsApi.salesSummary().
  // Only `salesByDay`, `totalSales`, and `totalOrders` are used.
  salesData: any;
  t: TFunction;
  i18nLanguage: string;
};

export function SalesChart({ salesData, t, i18nLanguage }: Props) {
  return (
    <div className="col-span-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base text-neutral-900">
          {t("dashboard.salesLast30Days", "المبيعات (آخر ٣٠ يوم)")}
        </h3>
        {salesData && (
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />{" "}
              {t("common.total", "الإجمالي:")}{" "}
              {formatNumber(salesData.totalSales ?? 0)}{" "}
              {t("common.sar", "ر.س")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />{" "}
              {t("common.totalOrders", "الطلبات:")}{" "}
              {salesData.totalOrders ?? 0}
            </span>
          </div>
        )}
      </div>
      {salesData?.salesByDay?.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={salesData.salesByDay}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="salesGrad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString(
                  i18nLanguage === "ar" ? "ar-SA" : i18nLanguage,
                  { day: "numeric", month: "short" },
                )
              }
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 13,
              }}
              formatter={(value: any) => [
                formatNumber(value) + " " + t("common.sar", "ر.س"),
                t("common.sales", "المبيعات"),
              ]}
              labelFormatter={(d: string) =>
                new Date(d).toLocaleDateString(
                  i18nLanguage === "ar" ? "ar-SA" : i18nLanguage,
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )
              }
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#salesGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <MerchantEmptyState
          icon={TrendingUp}
          title={t("dashboard.noSalesData", "لا توجد بيانات مبيعات كافية")}
          compact
        />
      )}
    </div>
  );
}

// Default export for React.lazy() dynamic import (Round 3 - recharts
// bundle reduction). The named export is kept for static imports elsewhere.
export default SalesChart;
