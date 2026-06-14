import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryStoryBanner from '../banners/LuxuryStoryBanner';

export default function BrandStorySection({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className={`${LUXURY_THEME_CLASS}`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <LuxuryStoryBanner title={title} description={description} />
    </section>
  );
}
