import { type ProductOption, type ProductVariant } from '@/lib/product-validation';

export function generateVariantsFromOptions(
  opts: ProductOption[],
  existingVariants: ProductVariant[],
): ProductVariant[] {
  if (!opts.length || opts.some(o => !o.values.length)) return [];
  const combinations: Record<string, string>[] = opts.reduce<Record<string, string>[]>(
    (acc, opt) => {
      if (!acc.length) return opt.values.map(v => ({ [opt.name]: v }));
      return acc.flatMap(combo => opt.values.map(v => ({ ...combo, [opt.name]: v })));
    }, []
  );
  const existingMap = new Map(existingVariants.map(v => [JSON.stringify(v.options), v]));
  return combinations.map(combo => {
    const key = JSON.stringify(combo);
    const existing = existingMap.get(key);
    return {
      name: opts.map(o => combo[o.name]).join(' / '),
      sku: existing?.sku ?? '',
      price: existing?.price ?? '',
      stockQuantity: existing?.stockQuantity ?? 0,
      isActive: existing?.isActive ?? true,
      options: { ...combo },
    };
  });
}
