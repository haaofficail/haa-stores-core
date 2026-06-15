import { ArrowRight } from 'lucide-react';

type Article = {
  id: string;
  category: string;
  date: string;
  title: string;
  href: string;
};

/**
 * JournalSection — the "Stories of Fragrance" / "From the Journal" block.
 * Three articles in a row, each with a small image-like area, a category
 * eyebrow, a date, a title, and a "Read article" link.
 *
 * For the demo we use the same SVG decorative pattern as the hero fallback
 * (gradient + brand mark) so the layout reads as a real journal without
 * requiring real photography.
 */
const ARTICLES: Article[] = [
  {
    id: 'ingredients',
    category: 'INGREDIENTS',
    date: 'MAY 8, 2026',
    title: 'فن العطور بالحمضيات',
    href: '/s/demo-perfumes/journal/ingredients',
  },
  {
    id: 'guides',
    category: 'GUIDES',
    date: 'APR 22, 2026',
    title: 'كيف تجد عطرك المميز',
    href: '/s/demo-perfumes/journal/guides',
  },
  {
    id: 'behind',
    category: 'BEHIND THE SCENES',
    date: 'MAR 11, 2026',
    title: 'داخل ورشتنا: الحرف والشغف',
    href: '/s/demo-perfumes/journal/behind',
  },
];

function JournalThumbnail() {
  return (
    <div
      className="aspect-[4/3] w-full overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, var(--lux-bg, #FAF7F1) 0%, var(--lux-image-frame, #F7EFE6) 50%, var(--lux-bg, #FAF7F1) 100%)',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full opacity-50"
        preserveAspectRatio="xMidYMid meet"
      >
        <circle cx="50" cy="50" r="36" stroke="var(--lux-primary, #B88A3D)" strokeWidth="0.5" strokeDasharray="1.5 3" fill="none" />
        <ellipse cx="50" cy="62" rx="22" ry="8" fill="var(--lux-primary, #B88A3D)" opacity="0.2" />
        <path
          d="M50 28C44 28 40 32 40 38C40 44 50 64 50 64C50 64 60 44 60 38C60 32 56 28 50 28Z"
          fill="var(--lux-primary, #B88A3D)"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}

export default function JournalSection() {
  return (
    <section
      className="mx-auto w-full max-w-[var(--container-max-width,1440px)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      aria-labelledby="journal-heading"
    >
      <div className="mb-6 flex items-baseline justify-between gap-4 sm:mb-8">
        <div>
          <p
            className="mb-2 text-[10px] font-light uppercase tracking-[0.3em]"
            style={{ color: 'var(--lux-primary, #B88A3D)' }}
          >
            From the Journal
          </p>
          <h2
            id="journal-heading"
            className="text-2xl font-light tracking-tight sm:text-3xl lg:text-4xl"
            style={{
              color: 'var(--lux-text, #2B2520)',
              fontFamily: 'theme-serif, serif',
            }}
          >
            Stories of Fragrance
          </h2>
        </div>
        <a
          href="/s/demo-perfumes/journal"
          className="hidden text-[10px] font-light uppercase tracking-[0.2em] transition-opacity hover:opacity-70 sm:inline-flex sm:items-center sm:gap-1.5"
          style={{ color: 'var(--lux-primary, #B88A3D)' }}
        >
          View All Articles
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {ARTICLES.map((article) => (
          <a
            key={article.id}
            href={article.href}
            className="group block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
            aria-label={`${article.title} — ${article.date}`}
          >
            <JournalThumbnail />
            <div className="mt-4 flex flex-col gap-1">
              <p
                className="text-[10px] font-light uppercase tracking-[0.2em]"
                style={{ color: 'var(--lux-primary, #B88A3D)' }}
              >
                {article.category}
                <span className="ms-2" style={{ color: 'var(--lux-muted, #756B61)' }}>
                  · {article.date}
                </span>
              </p>
              <h3
                className="text-base font-light leading-snug sm:text-lg"
                style={{
                  color: 'var(--lux-text, #2B2520)',
                  fontFamily: 'theme-serif, serif',
                }}
              >
                {article.title}
              </h3>
              <span
                className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.2em] transition-opacity group-hover:opacity-70"
                style={{ color: 'var(--lux-primary, #B88A3D)' }}
              >
                Read Article
                <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
