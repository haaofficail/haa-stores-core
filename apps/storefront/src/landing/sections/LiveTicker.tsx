/**
 * LiveTicker — scrolling "live activity" feed strip
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 3/13).
 * Renders a horizontally-scrolling marquee of recent merchant signups,
 * store launches, sales, and milestone achievements.
 * Uses a duplicated LIVE_EVENTS array for seamless infinite scroll.
 */
import { StoreContainer } from '@/components/ui';
import type { TFn } from './types';

export interface LiveEvent {
  city: string;
  action: string;
  item?: string;
  merchant?: string;
  time: string;
}

const LIVE_EVENTS: LiveEvent[] = [
  /* سجّل كتاجر */
  { city: 'الدمام', action: 'سجّل كتاجر', time: 'الآن', merchant: 'فهد' },
  { city: 'جدة', action: 'سجّل كتاجر', time: 'قبل دقيقة', merchant: 'سارة' },
  { city: 'الرياض', action: 'سجّل كتاجر', time: 'قبل ٣ دقائق', merchant: 'عبدالله' },
  { city: 'مكة', action: 'سجّل كتاجر', time: 'قبل ٥ دقائق', merchant: 'بدر' },
  { city: 'المدينة', action: 'سجّل كتاجر', time: 'قبل ٧ دقائق', merchant: 'حصة' },
  { city: 'الخبر', action: 'سجّل كتاجر', time: 'قبل ١٠ دقائق', merchant: 'ناصر' },
  { city: 'أبها', action: 'سجّل كتاجر', time: 'قبل ١٢ دقيقة', merchant: 'سعد' },
  { city: 'حائل', action: 'سجّل كتاجر', time: 'قبل ١٥ دقيقة', merchant: 'نوف' },
  { city: 'تبوك', action: 'سجّل كتاجر', time: 'قبل ٢٠ دقيقة', merchant: 'ماجد' },
  { city: 'بريدة', action: 'سجّل كتاجر', time: 'قبل ٢٥ دقيقة', merchant: 'عبير' },

  /* أطلق متجره */
  { city: 'الرياض', action: 'أطلق متجره', time: 'الآن', merchant: 'محمد' },
  { city: 'جدة', action: 'أطلق متجره', time: 'الآن', merchant: 'نورة' },
  { city: 'الدمام', action: 'أطلق متجره', time: 'قبل ٣ دقائق', merchant: 'خالد' },
  { city: 'الخبر', action: 'أطلق متجره', time: 'قبل ٨ دقائق', merchant: 'راشد' },
  { city: 'تبوك', action: 'أطلق متجره', time: 'قبل ١١ دقيقة', merchant: 'ماجد' },
  { city: 'بريدة', action: 'أطلق متجره', time: 'قبل ١٤ دقيقة', merchant: 'ليلى' },
  { city: 'الطائف', action: 'أطلق متجره', time: 'قبل ١٨ دقيقة', merchant: 'سلمان' },
  { city: 'الأحساء', action: 'أطلق متجره', time: 'قبل ٢٢ دقيقة', merchant: 'هند' },

  /* باع منتج */
  { city: 'جدة', action: 'باع منتج', item: 'عطر خشب العود', time: 'الآن', merchant: 'أحمد' },
  { city: 'الرياض', action: 'باع منتج', item: 'قهوة سعودية', time: 'قبل دقيقة', merchant: 'منى' },
  { city: 'مكة', action: 'باع منتج', item: 'تمور فاخرة', time: 'قبل ٤ دقائق', merchant: 'هند' },
  { city: 'الدمام', action: 'باع منتج', item: 'بخور عود', time: 'قبل ٦ دقائق', merchant: 'فيصل' },
  { city: 'المدينة', action: 'باع منتج', item: 'ورد طبيعي', time: 'قبل ٩ دقائق', merchant: 'ليلى' },
  { city: 'الأحساء', action: 'باع منتج', item: 'شنطة سفر', time: 'قبل ١٣ دقيقة', merchant: 'نورة' },
  { city: 'ينبع', action: 'باع منتج', item: 'سماعة لاسلكية', time: 'قبل ١٦ دقيقة', merchant: 'ماجد' },
  { city: 'الجبيل', action: 'باع منتج', item: 'سبحة كهرمان', time: 'قبل ١٩ دقيقة', merchant: 'فهد' },
  { city: 'القصيم', action: 'باع منتج', item: 'طقم شاهي', time: 'قبل ٢٢ دقيقة', merchant: 'سارة' },
  { city: 'حفر الباطن', action: 'باع منتج', item: 'دباديب كبيرة', time: 'قبل ٢٥ دقيقة', merchant: 'عبدالله' },
  { city: 'خميس مشيط', action: 'باع منتج', item: 'عطر ورد', time: 'قبل ٢٨ دقيقة', merchant: 'بدر' },
  { city: 'جازان', action: 'باع منتج', item: 'محفظة رجالية', time: 'قبل ٣٢ دقيقة', merchant: 'لينة' },
  { city: 'نجران', action: 'باع منتج', item: 'جاكيت شتوي', time: 'قبل ٣٦ دقيقة', merchant: 'حصة' },
  { city: 'عرعر', action: 'باع منتج', item: 'شموع معطرة', time: 'قبل ٤٢ دقيقة', merchant: 'ناصر' },

  /* حصل على أول طلب */
  { city: 'الرياض', action: 'حصل على أول طلب', time: 'قبل ٣ دقائق', merchant: 'سعد' },
  { city: 'جدة', action: 'حصل على أول طلب', time: 'قبل ٨ دقائق', merchant: 'نوف' },
  { city: 'أبها', action: 'حصل على أول طلب', time: 'قبل ١٦ دقيقة', merchant: 'خالد' },
  { city: 'القطيف', action: 'حصل على أول طلب', time: 'قبل ٢٧ دقيقة', merchant: 'سارة' },

  /* أضاف منتجاً جديداً */
  { city: 'مكة', action: 'أضاف منتجاً جديداً', item: 'ساعة كاجوال', time: 'قبل ٥ دقائق', merchant: 'فيصل' },
  { city: 'الخبر', action: 'أضاف منتجاً جديداً', item: 'كريم عناية', time: 'قبل ٩ دقائق', merchant: 'عبير' },
  { city: 'بريدة', action: 'أضاف منتجاً جديداً', item: 'شموع معطرة', time: 'قبل ١٥ دقيقة', merchant: 'حصة' },
  { city: 'الطائف', action: 'أضاف منتجاً جديداً', item: 'لوحة فنية', time: 'قبل ٢١ دقيقة', merchant: 'نورة' },
  { city: 'حائل', action: 'أضاف منتجاً جديداً', item: 'ساعة كاجوال', time: 'قبل ٢٧ دقيقة', merchant: 'سلمان' },
  { city: 'نجران', action: 'أضاف منتجاً جديداً', item: 'حقيبة جلدية', time: 'قبل ٣٣ دقيقة', merchant: 'راشد' },
  { city: 'الباحة', action: 'أضاف منتجاً جديداً', item: 'دباديب كبيرة', time: 'قبل ٤٠ دقيقة', merchant: 'ماجد' },

  /* فعّل بوابة مدى */
  { city: 'مكة', action: 'فعّل بوابة مدى', time: 'قبل ٥ دقائق', merchant: 'عبدالله' },
  { city: 'ينبع', action: 'فعّل بوابة مدى', time: 'قبل ١٢ دقيقة', merchant: 'ماجد' },
  { city: 'تبوك', action: 'فعّل بوابة مدى', time: 'قبل ٢٠ دقيقة', merchant: 'سعد' },
  { city: 'عرعر', action: 'فعّل بوابة مدى', time: 'قبل ٣٠ دقيقة', merchant: 'ناصر' },
  { city: 'سكاكا', action: 'فعّل بوابة مدى', time: 'قبل ٤٥ دقيقة', merchant: 'بدر' },

  /* فعّل الشحن المدمج */
  { city: 'المدينة', action: 'فعّل الشحن المدمج', time: 'قبل ٧ دقائق', merchant: 'محمد' },
  { city: 'الأحساء', action: 'فعّل الشحن المدمج', time: 'قبل ١٨ دقيقة', merchant: 'هند' },
  { city: 'سكاكا', action: 'فعّل الشحن المدمج', time: 'قبل ٣٥ دقيقة', merchant: 'عبدالله' },
  { city: 'القطيف', action: 'فعّل الشحن المدمج', time: 'قبل ٤٨ دقيقة', merchant: 'ليلى' },

  /* جدّد الباقة السنوية */
  { city: 'الرياض', action: 'جدّد الباقة السنوية', time: 'قبل ١٠ دقائق', merchant: 'أحمد' },
  { city: 'الخبر', action: 'جدّد الباقة السنوية', time: 'قبل ٢٢ دقيقة', merchant: 'نورة' },
  { city: 'جدة', action: 'جدّد الباقة السنوية', time: 'قبل ٣٨ دقيقة', merchant: 'فيصل' },

  /* إنجازات (حقق أول مبيعة / ١٠٠ طلب / مبيعات ١٠ آلاف) */
  { city: 'الرياض', action: 'حقق أول مبيعة', time: 'قبل ٤ دقائق', merchant: 'نوف' },
  { city: 'جدة', action: 'حقق ١٠٠ طلب', time: 'قبل ١١ دقيقة', merchant: 'محمد' },
  { city: 'الدمام', action: 'حقق مبيعات ١٠ آلاف', time: 'قبل ٢٤ دقيقة', merchant: 'أحمد' },
  { city: 'الخبر', action: 'حقق أول مبيعة', time: 'قبل ٣١ دقيقة', merchant: 'عبير' },
  { city: 'حائل', action: 'حقق ١٠٠ طلب', time: 'قبل ٣٩ دقيقة', merchant: 'فهد' },

  /* نال تقييم ٥ نجوم */
  { city: 'جدة', action: 'نال تقييم ٥ نجوم', time: 'قبل ٦ دقائق', merchant: 'سعد' },
  { city: 'مكة', action: 'نال تقييم ٥ نجوم', time: 'قبل ١٧ دقيقة', merchant: 'لينة' },
  { city: 'الطائف', action: 'نال تقييم ٥ نجوم', time: 'قبل ٢٦ دقيقة', merchant: 'خالد' },
  { city: 'أبها', action: 'نال تقييم ٥ نجوم', time: 'قبل ٣٦ دقيقة', merchant: 'فهد' },

  /* انضم للبرنامج الذهبي */
  { city: 'الرياض', action: 'انضم للبرنامج الذهبي', time: 'قبل ١٣ دقيقة', merchant: 'منى' },
  { city: 'جدة', action: 'انضم للبرنامج الذهبي', time: 'قبل ٢٩ دقيقة', merchant: 'خالد' },
  { city: 'حائل', action: 'انضم للبرنامج الذهبي', time: 'قبل ٤٠ دقيقة', merchant: 'سارة' },
  { city: 'الخبر', action: 'انضم للبرنامج الذهبي', time: 'قبل ٥٠ دقيقة', merchant: 'نوف' },

  /* فعّل نطاق مخصص */
  { city: 'الرياض', action: 'فعّل نطاق مخصص', time: 'قبل دقيقتين', merchant: 'راشد' },
  { city: 'الدمام', action: 'فعّل نطاق مخصص', time: 'قبل ٢٣ دقيقة', merchant: 'سلمان' },
  { city: 'ينبع', action: 'فعّل نطاق مخصص', time: 'قبل ٣٤ دقيقة', merchant: 'نوف' },

  /* أصدر أول شحنة */
  { city: 'جدة', action: 'أصدر أول شحنة', item: 'عطر خشب العود', time: 'قبل دقيقة', merchant: 'ماجد' },
  { city: 'الرياض', action: 'أصدر أول شحنة', item: 'ساعة كاجوال', time: 'قبل ١٤ دقيقة', merchant: 'هند' },
  { city: 'المدينة', action: 'أصدر أول شحنة', item: 'حقيبة جلدية', time: 'قبل ٢٨ دقيقة', merchant: 'فيصل' },
  { city: 'الدمام', action: 'أصدر أول شحنة', item: 'قهوة سعودية', time: 'قبل ٤٤ دقيقة', merchant: 'عبير' },
];

export function LiveTicker({ t }: { t: TFn }) {
  return (
    <section className="relative py-6 sm:py-8" aria-label="نشاط مباشر">
      <StoreContainer>
        <div className="flex items-center gap-3 overflow-hidden rounded-2xl border border-white/30 bg-white/40 px-4 py-3 shadow-sm backdrop-blur-xl">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
            <span className="h-1.5 w-1.5 animate-pulse motion-reduce:animate-none rounded-full bg-success" />
            {t('landing.ticker.label', 'نشاط مباشر')}
          </span>
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="inline-flex animate-carousel gap-6 shrink-0" style={{ paddingInlineStart: '10px' }}>
              {[...LIVE_EVENTS, ...LIVE_EVENTS].map((e, i) => (
                <span key={i} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{e.merchant} · {e.city}</span>
                  <span>·</span>
                  <span>{e.action}</span>
                  {e.item && (
                    <>
                      <span>·</span>
                      <span className="text-text-tertiary">{e.item}</span>
                    </>
                  )}
                  <span className="text-2xs text-text-tertiary">· {e.time}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </StoreContainer>
    </section>
  );
}
