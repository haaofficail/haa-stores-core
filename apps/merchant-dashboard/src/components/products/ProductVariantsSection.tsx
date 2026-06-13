import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { generateVariantsFromOptions } from '@/lib/products/variant-utils';
import type { ProductOption, ProductVariant } from '@/lib/product-validation';

interface Props {
  hasVariants: boolean;
  options: ProductOption[];
  variants: ProductVariant[];
  onHasVariantsChange: (v: boolean) => void;
  onOptionsChange: (opts: ProductOption[]) => void;
  onVariantsChange: (vars: ProductVariant[]) => void;
}

export function ProductVariantsSection({ hasVariants, options, variants, onHasVariantsChange, onOptionsChange, onVariantsChange }: Props) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={hasVariants}
          onChange={(e) => {
            if (!e.target.checked && variants.length > 0) {
              if (!window.confirm('إلغاء تفعيل الخيارات سيزيل جميع المتغيرات. هل أنت متأكد؟')) return;
            }
            onHasVariantsChange(e.target.checked);
            if (!e.target.checked) {
              onOptionsChange([]);
              onVariantsChange([]);
            }
          }}
          className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
        <span className="text-sm text-neutral-700">هذا المنتج له خيارات مثل اللون أو المقاس</span>
      </label>

      {hasVariants && (
        <>
          <div className="space-y-3">
            {options.map((opt, oi) => (
              <div key={oi} className="flex items-start gap-2 p-3 bg-neutral-50 rounded-xl">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="اسم الخيار (مثال: اللون)"
                    value={opt.name}
                    onChange={(e) => {
                      const newOpts = options.map((o, i) => i === oi ? { ...o, name: e.target.value } : o);
                      onOptionsChange(newOpts);
                      onVariantsChange(generateVariantsFromOptions(newOpts, variants));
                    }}
                    className="h-8 text-sm" />
                  <Input
                    placeholder="القيم مفصولة بفواصل (مثال: أسود، أبيض، أزرق)"
                    value={opt.values.join('، ')}
                    onChange={(e) => {
                      const newOpts = options.map((o, i) => i === oi ? { ...o, values: e.target.value.split(/[،,]\s*/).filter(Boolean) } : o);
                      onOptionsChange(newOpts);
                      onVariantsChange(generateVariantsFromOptions(newOpts, variants));
                    }}
                    className="h-8 text-sm" />
                </div>
                <button type="button"
                  onClick={() => {
                    const newOpts = options.filter((_, i) => i !== oi);
                    onOptionsChange(newOpts);
                    onVariantsChange(generateVariantsFromOptions(newOpts, variants));
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors mt-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button"
              onClick={() => onOptionsChange([...options, { name: '', values: [] }])}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" />
              إضافة خيار
            </button>
          </div>

          {variants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-right py-2 px-2 text-neutral-500 font-medium">الخيارات</th>
                    <th className="text-right py-2 px-2 text-neutral-500 font-medium">SKU</th>
                    <th className="text-right py-2 px-2 text-neutral-500 font-medium">السعر</th>
                    <th className="text-right py-2 px-2 text-neutral-500 font-medium">المخزون</th>
                    <th className="text-center py-2 px-2 text-neutral-500 font-medium">مفعّل</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, vi) => (
                    <tr key={vi} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-1.5 px-2 text-neutral-900 text-sm">{v.name}</td>
                      <td className="py-1.5 px-2">
                        <Input
                          value={v.sku}
                          onChange={(e) => {
                            const newVars = [...variants];
                            newVars[vi] = { ...newVars[vi], sku: e.target.value };
                            onVariantsChange(newVars);
                          }}
                          className="h-8 text-sm" dir="ltr" />
                      </td>
                      <td className="py-1.5 px-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.price}
                          onChange={(e) => {
                            const newVars = [...variants];
                            newVars[vi] = { ...newVars[vi], price: e.target.value };
                            onVariantsChange(newVars);
                          }}
                          className="h-8 text-sm w-24" />
                      </td>
                      <td className="py-1.5 px-2">
                        <Input
                          type="number"
                          min="0"
                          value={v.stockQuantity}
                          onChange={(e) => {
                            const newVars = [...variants];
                            newVars[vi] = { ...newVars[vi], stockQuantity: parseInt(e.target.value) || 0 };
                            onVariantsChange(newVars);
                          }}
                          className="h-8 text-sm w-20" />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <input type="checkbox" checked={v.isActive}
                          onChange={(e) => {
                            const newVars = [...variants];
                            newVars[vi] = { ...newVars[vi], isActive: e.target.checked };
                            onVariantsChange(newVars);
                          }}
                          className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-neutral-400 mt-2">
                اترك السعر فارغًا لاستخدام سعر المنتج الأساسي
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
