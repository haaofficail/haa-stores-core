export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  name: string;
  sku: string;
  price: string;
  stockQuantity: number;
  isActive: boolean;
  options: Record<string, string>;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  status: string;
  type: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  sku: string;
  barcode: string;
  stockQuantity: number | string;
  trackInventory: boolean;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  requiresShipping: boolean;
  isFragile: boolean;
  giftWrapAvailable: boolean;
  giftWrapPriceOverride: string;
  seoTitle: string;
  seoDescription: string;
  categoryIds: number[];
  brandId?: number;
  tagIds?: number[];
  hasVariants: boolean;
  options: ProductOption[];
  variants: ProductVariant[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateProduct(form: ProductFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!form.name || form.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'name_required' });
  }

  if (!form.slug || form.slug.trim().length === 0) {
    errors.push({ field: 'slug', message: 'slug_required' });
  } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
    errors.push({ field: 'slug', message: 'slug_invalid' });
  }

  const price = Number(form.price);
  if (form.price === '' || isNaN(price)) {
    errors.push({ field: 'price', message: 'price_required' });
  } else if (price < 0) {
    errors.push({ field: 'price', message: 'price_negative' });
  }

  if (form.compareAtPrice !== '' && form.compareAtPrice !== undefined) {
    const compareAt = Number(form.compareAtPrice);
    if (!isNaN(compareAt) && compareAt < 0) {
      errors.push({ field: 'compareAtPrice', message: 'price_negative' });
    } else if (!isNaN(compareAt) && price >= 0 && compareAt < price) {
      errors.push({ field: 'compareAtPrice', message: 'compare_less_than_price' });
    }
  }

  if (form.cost !== '' && form.cost !== undefined) {
    const cost = Number(form.cost);
    if (!isNaN(cost) && cost < 0) {
      errors.push({ field: 'cost', message: 'price_negative' });
    }
  }

  const stock = Number(form.stockQuantity);
  if (isNaN(stock) || stock < 0) {
    errors.push({ field: 'stockQuantity', message: 'stock_negative' });
  }

  if (form.weightGrams !== '' && form.weightGrams !== undefined) {
    const weight = Number(form.weightGrams);
    if (!isNaN(weight) && weight < 0) {
      errors.push({ field: 'weightGrams', message: 'weight_negative' });
    }
  }

  if (form.seoTitle && form.seoTitle.length > 60) {
    errors.push({ field: 'seoTitle', message: 'seo_title_too_long' });
  }

  if (form.seoDescription && form.seoDescription.length > 160) {
    errors.push({ field: 'seoDescription', message: 'seo_description_too_long' });
  }

  return errors;
}

export function getWarnings(form: ProductFormData): string[] {
  const warnings: string[] = [];

  if (form.requiresShipping && (!form.weightGrams || form.weightGrams === '' || Number(form.weightGrams) === 0)) {
    warnings.push('shipping_no_weight');
  }

  if (form.trackInventory && Number(form.stockQuantity) === 0) {
    warnings.push('zero_stock');
  }

  return warnings;
}
