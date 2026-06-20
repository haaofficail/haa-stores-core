import type { ComponentType } from 'react';

export interface HomePageProps {
  store: any;
  slug: string;
  theme: any;
  products: any[];
  categories: any[];
  sections: any[];
  onAddToCart: (product: any) => Promise<void>;
}

export interface ProductPageProps {
  store: any;
  product: any;
  slug: string;
  theme: any;
  features: Record<string, boolean> | null;
  quantity: number;
  selectedOptions: Record<string, string>;
  alsoBought: any[];
  relatedProducts: any[];
  crossSellProducts: any[];
  storeGiftOptions: any | null;
  paymentMethods: any[];
  sizeGuide: any | null;
  giftWrap: boolean;
  sendAsGift: boolean;
  giftMessage: string;
  detailsOpen: boolean;
  showFullDesc: boolean;
  sizeGuideOpen: boolean;
  onQuantityChange: (v: number) => void;
  onGiftWrapChange: (v: boolean) => void;
  onSendAsGiftChange: (v: boolean) => void;
  onGiftMessageChange: (v: string) => void;
  onDetailsOpenChange: (v: boolean) => void;
  onShowFullDescChange: (v: boolean) => void;
  onSizeGuideOpenChange: (v: boolean) => void;
  onOptionChange: (name: string, value: string) => void;
  onAddToCart: () => Promise<void>;
  onBuyNow: () => Promise<void>;
  onShare: () => Promise<void>;
  effectivePrice: string;
  effectiveCompareAtPrice: string | undefined;
  effectiveStockQuantity: number;
  hasOptions: boolean;
  isOutOfStock: boolean;
  maxQuantity: number;
  hasDiscount: boolean;
  countdownEnd: number;
  discountPercent: number;
  isLowStock: boolean;
  hasDimensions: boolean | number;
  hasWeight: boolean;
  isFreeShipping: boolean;
  showSizeGuide: boolean;
  hasElectronicPayment: boolean;
  watcherCount: number | null;
  adding: boolean;
  buying: boolean;
  added: boolean;
  cartReady?: boolean;
  giftWrapPriceDisplay: number | null;
  recentlyViewed?: Array<{ id: number; name: string; slug: string; image: string }>;
}

export interface StorefrontThemeComponents {
  HomePage: ComponentType<HomePageProps>;
  ProductPage: ComponentType<ProductPageProps>;

  ProductCard: ComponentType<{
    product: any;
    slug: string;
    onAddToCart?: (product: any) => Promise<void>;
    compact?: boolean;
    productCardSize?: number;
  }>;

  Header: ComponentType;
  Footer: ComponentType;
}

export interface StorefrontThemeManifest {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  version: string;
  author: string;
}

export interface StorefrontThemeRegistration {
  manifest: StorefrontThemeManifest;
  components: StorefrontThemeComponents;
}
