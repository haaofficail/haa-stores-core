import { useStorefrontTheme } from '@/hooks/useTheme';
import { getStorefrontThemeComponents, resolveStorefrontThemeKey } from '@haa/storefront-themes';
import ProductCard from '@/components/product-card/ProductCard';
import type { ComponentProps } from 'react';

type ProductCardProps = ComponentProps<typeof ProductCard>;

export default function ThemedProductCard(props: ProductCardProps) {
  const themeConfig = useStorefrontTheme();
  const runtimeKey = resolveStorefrontThemeKey(themeConfig?.themeKey || themeConfig?.preset);
  const runtimeComponents = getStorefrontThemeComponents(runtimeKey);
  const RuntimeProductCard = runtimeComponents?.ProductCard;

  if (RuntimeProductCard) {
    return <RuntimeProductCard {...props} />;
  }

  // Fallback: canonical ProductCard (theme-aware via useStorefrontTheme).
  return <ProductCard {...props} />;
}
