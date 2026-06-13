import { useStorefrontTheme } from '@/hooks/useTheme';
import { getStorefrontThemeComponents, resolveStorefrontThemeKey } from '@haa/storefront-themes';
import ProductCard from './ProductCard';
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

  return <ProductCard {...props} />;
}
