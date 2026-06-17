import { useEffect, useMemo, useRef, useState } from "react";

type OperationType = {
  prefix: string;
  label: string;
};

type ProductItem = {
  brand: string;
  product: string;
};

type OperationItem = {
  id: string;
  maskedId: string;
  label: string;
  city: string;
  brand: string;
  product: string;
  createdAt: Date;
};

const ONE_HOUR = 60 * 60 * 1000;

const OPERATION_TYPES: OperationType[] = [
  { prefix: "ORD", label: "طلب جديد" },
  { prefix: "PAY", label: "دفع ناجح" },
  { prefix: "SHP", label: "بوليصة شحن" },
  { prefix: "INV", label: "فاتورة صادرة" },
  { prefix: "CART", label: "إضافة للسلة" },
  { prefix: "CHK", label: "بدء الدفع" },
  { prefix: "PKG", label: "جاهز للتغليف" },
  { prefix: "STK", label: "مخزون منخفض" },
  { prefix: "CPN", label: "كوبون مستخدم" },
  { prefix: "RET", label: "طلب استرجاع" },
  { prefix: "FUL", label: "تم التجهيز" },
  { prefix: "DLV", label: "تم التسليم" },
];

const CITIES = [
  "الرياض",
  "جدة",
  "مكة",
  "المدينة",
  "الدمام",
  "الخبر",
  "الطائف",
  "أبها",
  "بريدة",
  "تبوك",
  "الأحساء",
  "حائل",
  "نجران",
  "جازان",
  "ينبع",
  "الخرج",
  "الجبيل",
  "سكاكا",
  "عرعر",
  "حفر الباطن",
];

const PRODUCTS: ProductItem[] = [
  { brand: "Apple", product: "AirPods Pro" },
  { brand: "Apple", product: "iPhone" },
  { brand: "Apple", product: "Apple Watch" },
  { brand: "Samsung", product: "Galaxy Buds" },
  { brand: "Samsung", product: "Galaxy Watch" },
  { brand: "Sony", product: "PlayStation 5" },
  { brand: "Sony", product: "WH-1000XM5" },
  { brand: "Nike", product: "Air Force 1" },
  { brand: "Nike", product: "Air Jordan 1" },
  { brand: "adidas", product: "Samba OG" },
  { brand: "adidas", product: "Gazelle" },
  { brand: "Dyson", product: "Airwrap" },
  { brand: "Dyson", product: "Supersonic" },
  { brand: "Nespresso", product: "Vertuo" },
  { brand: "Logitech", product: "MX Master" },
  { brand: "Anker", product: "PowerCore" },
  { brand: "Bose", product: "QuietComfort" },
  { brand: "LEGO", product: "Technic" },
  { brand: "Garmin", product: "Venu 3" },
  { brand: "Garmin", product: "Forerunner 265" },
  { brand: "Hugo Boss", product: "ساعة رجالية" },
  { brand: "عبدالصمد القرشي", product: "دهن عود" },
  { brand: "عبدالصمد القرشي", product: "مسك" },
  { brand: "العربية للعود", product: "عود فاخر" },
  { brand: "العربية للعود", product: "معطر شعر" },
  { brand: "نخبة العود", product: "بخور" },
  { brand: "سلالات", product: "بن شلشلي إثيوبيا" },
  { brand: "سلالات", product: "بن إليدا بنما" },
  { brand: "خطوة جمل", product: "بن إثيوبيا" },
  { brand: "خطوة جمل", product: "قهوة سعودية" },
  { brand: "إكسير بن", product: "خلطة جنوبية" },
  { brand: "3Bean", product: "بن برازيلي" },
  { brand: "بريهانت", product: "بن سعودي" },
  { brand: "جازان", product: "بن جيزان" },
  { brand: "مانوكا هيلث", product: "عسل مانوكا" },
  { brand: "ديور", product: "عطر سوفاج" },
  { brand: "شانيل", product: "عطر بلو" },
  { brand: "توم فورد", product: "عطر أسود" },
  { brand: "كارتييه", product: "ساعة تانكر" },
];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateOperationId(prefix: string): string {
  const number = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${number}`;
}

function maskLast3Digits(value: string): string {
  return value.replace(/\d{3}$/, "***");
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function buildUniqueKey(
  operation: OperationType,
  product: ProductItem,
  city: string
): string {
  return `${operation.prefix}:${operation.label}:${product.brand}:${product.product}:${city}`;
}

function cleanupRecentKeys(
  recentKeys: Map<string, number>,
  now: number
): void {
  for (const [key, timestamp] of recentKeys.entries()) {
    if (now - timestamp > ONE_HOUR) {
      recentKeys.delete(key);
    }
  }
}

function createOperation(
  recentKeys: Map<string, number>,
  lastItem?: OperationItem
): OperationItem {
  const now = Date.now();

  cleanupRecentKeys(recentKeys, now);

  let attempt = 0;

  while (attempt < 300) {
    const operation = randomItem(OPERATION_TYPES);
    const product = randomItem(PRODUCTS);
    const city = randomItem(CITIES);

    const key = buildUniqueKey(operation, product, city);

    const sameAsLast =
      lastItem &&
      lastItem.label === operation.label &&
      lastItem.product === product.product &&
      lastItem.city === city;

    const repeatedRecently = recentKeys.has(key);

    if (!repeatedRecently && !sameAsLast) {
      recentKeys.set(key, now);

      const id = generateOperationId(operation.prefix);

      return {
        id,
        maskedId: maskLast3Digits(id),
        label: operation.label,
        city,
        brand: product.brand,
        product: product.product,
        createdAt: new Date(),
      };
    }

    attempt++;
  }

  const operation = randomItem(OPERATION_TYPES);
  const product = randomItem(PRODUCTS);
  const city = randomItem(CITIES);
  const id = generateOperationId(operation.prefix);

  return {
    id,
    maskedId: maskLast3Digits(id),
    label: operation.label,
    city,
    brand: product.brand,
    product: product.product,
    createdAt: new Date(),
  };
}

export default function OperationFeed() {
  const recentKeysRef = useRef<Map<string, number>>(new Map());

  const initialItems = useMemo(() => {
    const items: OperationItem[] = [];

    for (let i = 0; i < 8; i++) {
      const lastItem = items[0];
      const item = createOperation(recentKeysRef.current, lastItem);
      items.unshift(item);
    }

    return items;
  }, []);

  const [items, setItems] = useState<OperationItem[]>(initialItems);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setItems((currentItems) => {
        const nextItem = createOperation(
          recentKeysRef.current,
          currentItems[0]
        );

        return [nextItem, ...currentItems].slice(0, 10);
      });
    }, 3500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      dir="rtl"
      className="flex w-full max-w-md flex-col h-full rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm mx-auto"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950">
            لوحة العمليات
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            أرقام العمليات مشفرة لحماية الخصوصية
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          مباشر
        </span>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {items.map((item) => (
          <div
            key={`${item.maskedId}-${item.createdAt.getTime()}`}
            className="grid grid-cols-[72px_1fr_auto] items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-2.5 py-2"
          >
            <span className="font-mono text-xs font-semibold text-neutral-700">
              {item.maskedId}
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-xs text-neutral-900">
                <span className="font-semibold">{item.label}</span>
                <span className="text-neutral-400">·</span>
                <span>{item.city}</span>
                <span className="text-neutral-400">·</span>
                <span className="truncate">
                  {item.brand} {item.product}
                </span>
              </div>
            </div>

            <span className="text-xs text-neutral-400">
              {formatTime(item.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
