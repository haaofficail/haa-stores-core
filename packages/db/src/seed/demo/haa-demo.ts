import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { createDbClient } from '../../index.js';
import * as s from '../../schema/index.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
const hashPassword = (pw: string) => bcrypt.hash(pw, 12);

const DEMO_SLUG = 'haa-demo';
const DEMO_SEED_VERSION = '2026-06-main-demo-v1';

async function seedHaaDemo() {
  const db = createDbClient();
  console.log('🌱 Seeding haa-demo store (Demo Store System v1)...');

  const now = new Date();

  const [store] = await db.select()
    .from(s.stores)
    .where(and(
      eq(s.stores.slug, DEMO_SLUG),
      eq(s.stores.isDemo, true),
      eq(s.stores.demoSeedVersion, DEMO_SEED_VERSION),
    ))
    .limit(1);

  if (store) {
    console.log(`  ✓ haa-demo already seeded with version ${DEMO_SEED_VERSION}, skipping`);
    process.exit(0);
  }

  const [existingStore] = await db.select().from(s.stores).where(eq(s.stores.slug, DEMO_SLUG)).limit(1);

  if (!existingStore) {
    console.error('  ❌ haa-demo store not found. Run the main seed first.');
    process.exit(1);
  }

  await db.update(s.stores).set({
    isDemo: true,
    demoProfile: 'main',
    demoSeedVersion: DEMO_SEED_VERSION,
  }).where(eq(s.stores.id, existingStore.id));
  console.log(`  ✓ haa-demo updated: isDemo=true, demoProfile=main, seed=${DEMO_SEED_VERSION}`);

  const storeId = existingStore.id;

  // ── Demo Users (create or upsert) ───────────────────
  const passwordHash = await hashPassword('Test@123456');

  // Merchant user (admin access)
  let [haaDemoMerchant] = await db.select().from(s.users).where(eq(s.users.email, 'merchant.haa-demo@example.com')).limit(1);
  if (!haaDemoMerchant) {
    [haaDemoMerchant] = await db.insert(s.users).values({
      name: 'تاجر هاء التجريبي',
      email: 'merchant.haa-demo@example.com',
      passwordHash,
      phone: '966500000001',
    }).returning();
    console.log(`  ✓ haa-demo merchant user created: ${haaDemoMerchant.email}`);
  } else {
    console.log(`  ✓ haa-demo merchant user exists: ${haaDemoMerchant.email}`);
  }

  // Customer user (storefront only)
  let [haaDemoCustomer] = await db.select().from(s.users).where(eq(s.users.email, 'customer.haa-demo@example.com')).limit(1);
  if (!haaDemoCustomer) {
    [haaDemoCustomer] = await db.insert(s.users).values({
      name: 'عميل هاء التجريبي',
      email: 'customer.haa-demo@example.com',
      passwordHash,
      phone: '966500000002',
    }).returning();
    console.log(`  ✓ haa-demo customer user created: ${haaDemoCustomer.email}`);
  } else {
    console.log(`  ✓ haa-demo customer user exists: ${haaDemoCustomer.email}`);
  }

  // ── Update store settings with all features enabled ──
  const allFeatures = {
    imageLightbox: true, stickyCart: true, trustBadges: true,
    badgeMaroof: true, badgeSaudiBusinessCenter: true, badgeSaudiMade: true,
    reviews: true, shareButton: true, deliveryEstimate: true,
    sizeGuide: true, alsoBought: true, recentlyViewed: true,
    priceAlert: true, giftWrap: true, sendAsGift: true,
    pickup: true, stockBar: true, liveViewers: true, compareBadges: true,
  };

  const [existingSettings] = await db.select()
    .from(s.storeSettings)
    .where(eq(s.storeSettings.storeId, storeId))
    .limit(1);

  const themeConfig = {
    preset: 'luxury-showcase',
    themeKey: 'luxury-showcase',
  };

  if (existingSettings) {
    await db.update(s.storeSettings).set({
      productFeatures: allFeatures as any,
      themeConfig: themeConfig as any,
      updatedAt: now,
    }).where(eq(s.storeSettings.id, existingSettings.id));
    console.log('  ✓ Store settings updated with all features enabled and luxury-showcase theme');
  } else {
    await db.insert(s.storeSettings).values({
      storeId,
      productFeatures: allFeatures as any,
      themeConfig: themeConfig as any,
    });
    console.log('  ✓ Store settings created with all features enabled and luxury-showcase theme');
  }

  // ── Categories (idempotent) ──
  const catDefs = [
    { name: 'إلكترونيات', slug: 'electronics', desc: 'أجهزة إلكترونية وملحقاتها', img: 'https://placehold.co/600x400/E8E8E8/7A4E3A?text=إلكترونيات' },
    { name: 'ملابس', slug: 'clothing', desc: 'أزياء وملابس للرجال والنساء والأطفال', img: 'https://placehold.co/600x400/E8E8E8/7A4E3A?text=ملابس' },
    { name: 'منزل ومطبخ', slug: 'home-kitchen', desc: 'أدوات منزلية ومطبخية', img: 'https://placehold.co/600x400/E8E8E8/7A4E3A?text=منزل' },
    { name: 'جمال وعناية', slug: 'beauty-care', desc: 'منتجات العناية بالبشرة والشعر', img: 'https://placehold.co/600x400/E8E8E8/7A4E3A?text=جمال' },
    { name: 'رياضة', slug: 'sports', desc: 'مستلزمات رياضية', img: 'https://placehold.co/600x400/E8E8E8/7A4E3A?text=رياضة' },
    { name: 'ألعاب وترفيه', slug: 'toys', desc: 'ألعاب وترفيه للجميع', img: 'https://placehold.co/600x400/E8E8E8/7A4E3A?text=ألعاب' },
    { name: 'هدايا', slug: 'gifts', desc: 'هدايا ومنتجات مناسبة للمناسبات', img: 'https://placehold.co/600x400/E8E8E8/7A4E3A?text=هدايا' },
    { name: 'عروض خاصة', slug: 'special-offers', desc: 'عروض وتخفيضات حصرية', img: 'https://placehold.co/600x400/E8E8E8/7A4E3A?text=عروض' },
  ];

  const existingCats = await db.select().from(s.categories).where(eq(s.categories.storeId, storeId));
  const existingCatSlugs = new Set(existingCats.map(c => c.slug));
  const catRecords: Record<string, { id: number }> = {};

  for (const cd of catDefs) {
    if (existingCatSlugs.has(cd.slug)) {
      catRecords[cd.slug] = existingCats.find(c => c.slug === cd.slug)!;
    } else {
      const [c] = await db.insert(s.categories).values({
        storeId, name: cd.name, slug: cd.slug,
        description: cd.desc, imageUrl: cd.img,
        sortOrder: catDefs.indexOf(cd),
      }).returning();
      catRecords[cd.slug] = c;
    }
  }
  console.log(`  ✓ ${catDefs.length} Categories synced`);

  // ── Brands (idempotent) ──
  const brandDefs = [
    { name: 'تيك برو', slug: 'techpro', desc: 'أجهزة إلكترونية حديثة', logo: 'https://placehold.co/200x200/E8E8E8/333?text=TP' },
    { name: 'فاشن لاين', slug: 'fashionline', desc: 'أزياء عصرية', logo: 'https://placehold.co/200x200/E8E8E8/333?text=FL' },
    { name: 'هوم كير', slug: 'homecare', desc: 'منتجات منزلية', logo: 'https://placehold.co/200x200/E8E8E8/333?text=HC' },
  ];

  const existingBrands = await db.select().from(s.brands).where(eq(s.brands.storeId, storeId));
  const existingBrandSlugs = new Set(existingBrands.map(b => b.slug));
  const brandRecords: Record<string, { id: number }> = {};

  for (const bd of brandDefs) {
    if (existingBrandSlugs.has(bd.slug)) {
      brandRecords[bd.slug] = existingBrands.find(b => b.slug === bd.slug)!;
    } else {
      const [b] = await db.insert(s.brands).values({
        storeId, name: bd.name, slug: bd.slug,
        description: bd.desc, logo: bd.logo,
      }).returning();
      brandRecords[bd.slug] = b;
    }
  }
  console.log(`  ✓ ${brandDefs.length} Brands synced`);

  // ── Tags (idempotent) ──
  const tagDefs = [
    { name: 'جديد', slug: 'new', color: '#3B82F6' },
    { name: 'أكثر مبيعاً', slug: 'bestseller', color: '#B89B5E' },
    { name: 'تخفيض', slug: 'sale', color: '#DC2626' },
    { name: 'هدية', slug: 'gift', color: '#B89B5E' },
    { name: 'ممتاز', slug: 'premium', color: '#7A4E3A' },
    { name: 'موسمي', slug: 'seasonal', color: '#2D6A4F' },
    { name: 'حصري', slug: 'exclusive', color: '#8B4513' },
    { name: 'متوفر', slug: 'in-stock', color: '#16A34A' },
  ];

  const existingTags = await db.select().from(s.tags).where(eq(s.tags.storeId, storeId));
  const existingTagSlugs = new Set(existingTags.map(t => t.slug));
  const tagRecords: Record<string, { id: number }> = {};

  for (const td of tagDefs) {
    if (existingTagSlugs.has(td.slug)) {
      tagRecords[td.slug] = existingTags.find(t => t.slug === td.slug)!;
    } else {
      const [t] = await db.insert(s.tags).values({
        storeId, name: td.name, slug: td.slug, color: td.color,
      }).returning();
      tagRecords[td.slug] = t;
    }
  }
  console.log(`  ✓ ${tagDefs.length} Tags synced`);

  // ── Products (idempotent) ──
  const existingProducts = await db.select().from(s.products).where(eq(s.products.storeId, storeId));
  const existingProductSlugs = new Set(existingProducts.map(p => p.slug));

  const productsData = [
    { name: 'سماعات بلوتوث لاسلكية', slug: 'bluetooth-earphones', desc: 'سماعات بلوتوث عالية الجودة مع علبة شحن', price: '149', compare: '249', sku: 'HD-BT-001', stock: 50, cat: 'electronics', brand: 'techpro', tags: ['new', 'bestseller'], rating: 5, reviews: 128, sales: 3400 },
    { name: 'ساعة ذكية رياضية', slug: 'smart-watch', desc: 'ساعة ذكية مقاومة للماء مع مراقبة النبض', price: '299', compare: '499', sku: 'HD-SW-002', stock: 30, cat: 'electronics', brand: 'techpro', tags: ['new', 'premium'], rating: 4, reviews: 85, sales: 1200 },
    { name: 'تيشيرت قطني رجالي', slug: 'cotton-t-shirt', desc: 'تيشيرت قطني مريح مناسب لجميع الأوقات', price: '59', compare: null, sku: 'HD-CT-003', stock: 100, cat: 'clothing', brand: 'fashionline', tags: ['in-stock'], rating: 4, reviews: 200, sales: 5000 },
    { name: 'فستان سهرة نسائي', slug: 'evening-dress', desc: 'فستان سهرة أنيق بتصميم عصري', price: '199', compare: '349', sku: 'HD-ED-004', stock: 20, cat: 'clothing', brand: 'fashionline', tags: ['premium', 'seasonal'], rating: 5, reviews: 45, sales: 890 },
    { name: 'طقم قدور ستانلس ستيل', slug: 'cookware-set', desc: 'طقم قدور ستانلس ستيل مكون من 7 قطع', price: '249', compare: '399', sku: 'HD-CW-005', stock: 15, cat: 'home-kitchen', brand: 'homecare', tags: ['bestseller', 'gift'], rating: 5, reviews: 312, sales: 2100 },
    { name: 'مكنسة روبوت ذكية', slug: 'robot-vacuum', desc: 'مكنسة روبوت ذكية تعمل بالأوامر الصوتية', price: '599', compare: '899', sku: 'HD-RV-006', stock: 10, cat: 'home-kitchen', brand: 'techpro', tags: ['new', 'premium', 'exclusive'], rating: 4, reviews: 67, sales: 450 },
    { name: 'كريم ترطيب للوجه', slug: 'face-moisturizer', desc: 'كريم ترطيب يومي غني بفيتامين E', price: '79', compare: '129', sku: 'HD-FM-007', stock: 60, cat: 'beauty-care', brand: null, tags: ['in-stock'], rating: 4, reviews: 180, sales: 3200 },
    { name: 'عطر زهري نسائي', slug: 'floral-perfume', desc: 'عطر زهري منعش يدوم طويلاً', price: '89', compare: '159', sku: 'HD-FP-008', stock: 40, cat: 'beauty-care', brand: null, tags: ['bestseller', 'gift'], rating: 5, reviews: 220, sales: 4100 },
    { name: 'حذاء رياضي رجالي', slug: 'running-shoes', desc: 'حذاء رياضي مريح للجري والمشي', price: '179', compare: '279', sku: 'HD-RS-009', stock: 35, cat: 'sports', brand: 'fashionline', tags: ['sale', 'bestseller'], rating: 4, reviews: 95, sales: 1800 },
    { name: 'دمبلز قابل للتعديل', slug: 'adjustable-dumbbells', desc: 'مجموعة دمبلز قابلة للتعديل 2-20 كجم', price: '349', compare: '549', sku: 'HD-AD-010', stock: 12, cat: 'sports', brand: null, tags: ['premium'], rating: 5, reviews: 55, sales: 670 },
  ];

  let productsAdded = 0;
  for (const pd of productsData) {
    if (existingProductSlugs.has(pd.slug)) continue;
    const [prod] = await db.insert(s.products).values({
      storeId, name: pd.name, slug: pd.slug, description: pd.desc,
      status: 'active', type: 'physical',
      price: pd.price, compareAtPrice: pd.compare,
      sku: pd.sku, stockQuantity: pd.stock, trackInventory: true,
      weightGrams: 100, requiresShipping: true, isFragile: false,
      rating: pd.rating, reviewCount: pd.reviews, salesCount: pd.sales,
      haaMarketplaceEnabled: true,
      haaMarketplaceReviewStatus: 'approved',
    }).returning();

    if (catRecords[pd.cat]) {
      await db.insert(s.productCategories).values({ productId: prod.id, categoryId: catRecords[pd.cat].id }).onConflictDoNothing();
    }

    if (pd.brand && brandRecords[pd.brand]) {
      await db.update(s.products).set({ brandId: brandRecords[pd.brand].id }).where(eq(s.products.id, prod.id));
    }

    for (const tagSlug of pd.tags) {
      if (tagRecords[tagSlug]) {
        await db.insert(s.productTags).values({ productId: prod.id, tagId: tagRecords[tagSlug].id }).onConflictDoNothing();
      }
    }

    await db.insert(s.productImages).values({
      productId: prod.id, url: `https://placehold.co/600x600/E8E8E8/333?text=${encodeURIComponent(pd.name)}`,
      sortOrder: 0,
    });

    productsAdded++;
  }

  // Enable marketplace for all haa-demo products (existing + new)
  await db.update(s.products).set({
    haaMarketplaceEnabled: true,
    haaMarketplaceReviewStatus: 'approved',
  }).where(and(
    eq(s.products.storeId, storeId),
    eq(s.products.haaMarketplaceEnabled, false),
  ));
  const finalProductCount = existingProducts.length + productsAdded;
  console.log(`  ✓ ${finalProductCount} Products (${productsAdded} new)`);

  // ── Coupons (idempotent) ──
  const existingCouponsCount = (await db.select().from(s.coupons).where(eq(s.coupons.storeId, storeId))).length;
  if (existingCouponsCount === 0) {
    const couponsData = [
      { code: 'WELCOME10', name: 'خصم ترحيب 10%', type: 'percentage', value: '10', minOrderAmount: '100', maxUses: 100, usedCount: 0, startsAt: now, expiresAt: new Date(now.getTime() + 365 * 86400000) },
      { code: 'SAVE50', name: 'خصم 50 ريال', type: 'fixed', value: '50', minOrderAmount: '200', maxUses: 50, usedCount: 0, startsAt: now, expiresAt: new Date(now.getTime() + 180 * 86400000) },
      { code: 'FREESHIP', name: 'توصيل مجاني', type: 'free_shipping', value: '0', minOrderAmount: '150', maxUses: 200, usedCount: 0, startsAt: now, expiresAt: new Date(now.getTime() + 90 * 86400000) },
      { code: 'DEMO20', name: 'خصم تجريبي 20%', type: 'percentage', value: '20', minOrderAmount: '50', maxUses: 1000, usedCount: 0, startsAt: now, expiresAt: new Date(now.getTime() + 365 * 86400000) },
    ];
    for (const c of couponsData) {
      await db.insert(s.coupons).values({ storeId, ...c });
    }
    console.log(`  ✓ ${couponsData.length} Coupons created`);
  } else {
    console.log(`  ✓ ${existingCouponsCount} Coupons already exist, skipped`);
  }

  // ── Promotions (idempotent) ──
  const existingPromosCount = (await db.select().from(s.promotions).where(eq(s.promotions.storeId, storeId))).length;
  if (existingPromosCount === 0) {
    const promoData = [
      { name: 'تخفيضات الصيف', description: 'خصم يصل إلى 30% على منتجات مختارة', type: 'percentage', value: '30', minOrderAmount: '100', isActive: true, startsAt: now, endsAt: new Date(now.getTime() + 60 * 86400000) },
      { name: 'توصيل مجاني', description: 'توصيل مجاني للطلبات فوق 150 ريال', type: 'free_shipping', value: '0', minOrderAmount: '150', isActive: true, startsAt: now, endsAt: new Date(now.getTime() + 30 * 86400000) },
    ];
    for (const p of promoData) {
      await db.insert(s.promotions).values({ storeId, ...p });
    }
    console.log(`  ✓ ${promoData.length} Promotions created`);
  } else {
    console.log(`  ✓ ${existingPromosCount} Promotions already exist, skipped`);
  }

  // ── Store Policies (idempotent) ──
  const existingPolicies = await db.select().from(s.storePolicies).where(eq(s.storePolicies.storeId, storeId));
  if (existingPolicies.length === 0) {
    const policies = [
      { type: 'about', title: 'عن المتجر', content: 'متجر هاء التجريبي هو متجر إلكتروني تجريبي يعرض منتجات متنوعة في مجالات الإلكترونيات والملابس والأدوات المنزلية ومنتجات العناية. هذا المتجر لأغراض العرض والتجربة فقط.' },
      { type: 'privacy', title: 'سياسة الخصوصية', content: 'نحترم خصوصية عملائنا ونلتزم بحماية بياناتهم الشخصية.' },
      { type: 'returns', title: 'سياسة الإرجاع', content: 'يمكن إرجاع المنتجات خلال 7 أيام من تاريخ الاستلام بشرط أن تكون بحالتها الأصلية.' },
      { type: 'shipping', title: 'سياسة الشحن', content: 'نوفر الشحن لجميع مدن المملكة عبر شركات شحن موثوقة. مدة التوصيل من 1-5 أيام عمل.' },
      { type: 'terms', title: 'الشروط والأحكام', content: 'باستخدامك للمتجر فإنك توافق على هذه الشروط والأحكام.' },
    ];
    for (const p of policies) {
      await db.insert(s.storePolicies).values({ storeId, ...p });
    }
    console.log(`  ✓ ${policies.length} Store Policies created`);
  } else {
    console.log(`  ✓ ${existingPolicies.length} Store Policies already exist, skipped`);
  }

  // ── Shipping Methods (idempotent) ──
  const existingMethods = await db.select().from(s.shippingMethods).where(eq(s.shippingMethods.storeId, storeId));
  if (existingMethods.length === 0) {
    const methodsData = [
      { name: 'توصيل عادي', type: 'flat', estimatedDeliveryDays: '1-3', sortOrder: 1 },
      { name: 'توصيل سريع', type: 'flat', estimatedDeliveryDays: 'same-day', sortOrder: 2 },
      { name: 'توصيل خارج الرياض', type: 'flat', estimatedDeliveryDays: '2-5', sortOrder: 3 },
    ];
    for (const md of methodsData) {
      await db.insert(s.shippingMethods).values({
        storeId, ...md, isActive: true,
      });
    }
    console.log(`  ✓ ${methodsData.length} Shipping methods created`);
  } else {
    console.log(`  ✓ ${existingMethods.length} Shipping methods already exist, skipped`);
  }

  // ── Shipping Zones (idempotent) ──
  const existingZones = await db.select().from(s.shippingZones).where(eq(s.shippingZones.storeId, storeId));
  if (existingZones.length === 0) {
    const zoneData = [
      { name: 'الرياض', cities: ['الرياض'] },
      { name: 'بقية المناطق', cities: ['جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'أبها', 'تبوك', 'بريدة', 'حائل', 'نجران', 'جازان', 'الطائف'] },
    ];
    for (const zd of zoneData) {
      await db.insert(s.shippingZones).values({ storeId, ...zd });
    }
    console.log(`  ✓ ${zoneData.length} Shipping zones created`);
  } else {
    console.log(`  ✓ ${existingZones.length} Shipping zones already exist, skipped`);
  }

  // ── Shipping Rates (idempotent) — must run after methods AND zones exist ──
  const allMethods = await db.select().from(s.shippingMethods).where(eq(s.shippingMethods.storeId, storeId));
  const allZones = await db.select().from(s.shippingZones).where(eq(s.shippingZones.storeId, storeId));
  const zoneRiyadh = allZones.find((z) => z.name === 'الرياض');
  const zoneOther = allZones.find((z) => z.name === 'بقية المناطق');
  const methodRegular = allMethods.find((m) => m.name === 'توصيل عادي');
  const methodExpress = allMethods.find((m) => m.name === 'توصيل سريع');
  const methodOther = allMethods.find((m) => m.name === 'توصيل خارج الرياض');
  if (zoneRiyadh && methodRegular) {
    const existingRates = await db.select().from(s.shippingRates).where(eq(s.shippingRates.shippingZoneId, zoneRiyadh.id)).limit(1);
    if (existingRates.length === 0) {
      await db.insert(s.shippingRates).values([
        ...(methodRegular ? [{ shippingMethodId: methodRegular.id, shippingZoneId: zoneRiyadh.id, baseRate: '15.00', estimatedDaysMin: 1, estimatedDaysMax: 3 }] : []),
        ...(methodExpress ? [{ shippingMethodId: methodExpress.id, shippingZoneId: zoneRiyadh.id, baseRate: '35.00', estimatedDaysMin: 0, estimatedDaysMax: 1 }] : []),
        ...(zoneOther && methodRegular ? [{ shippingMethodId: methodRegular.id, shippingZoneId: zoneOther.id, baseRate: '25.00', estimatedDaysMin: 2, estimatedDaysMax: 5 }] : []),
        ...(zoneOther && methodOther ? [{ shippingMethodId: methodOther.id, shippingZoneId: zoneOther.id, baseRate: '25.00', estimatedDaysMin: 2, estimatedDaysMax: 5 }] : []),
      ]);
      console.log('  ✓ Shipping rates created');
    } else {
      console.log('  ✓ Shipping rates already exist, skipped');
    }
  }

  // ── Pickup Location (idempotent) ──
  const existingPickups = await db.select().from(s.pickupLocations).where(eq(s.pickupLocations.storeId, storeId));
  if (existingPickups.length === 0) {
    await db.insert(s.pickupLocations).values({
      storeId,
      nameAr: 'مقر هاء الرئيسي',
      nameEn: 'Haa Main Office',
      address: 'الرياض، حي العليا، شارع التخصصي',
      phone: '966500000002',
      hours: { sat: '9ص-9م', sun: '9ص-9م', mon: '9ص-9م', tue: '9ص-9م', wed: '9ص-9م', thu: '9ص-9م', fri: 'مغلق' },
      instructions: 'يمكن الاستلام من 9 صباحًا إلى 9 مساءً',
      isActive: true,
    });
    console.log('  ✓ Pickup location created');
  } else {
    console.log(`  ✓ ${existingPickups.length} Pickup locations already exist, skipped`);
  }

  // ── Wallet Account (idempotent) ──
  const existingWallet = await db.select().from(s.walletAccounts).where(eq(s.walletAccounts.storeId, storeId));
  if (existingWallet.length === 0) {
    await db.insert(s.walletAccounts).values({
      storeId, balance: '0', pendingBalance: '0',
      availableBalance: '0', totalSales: '0',
      totalFees: '0', totalPayouts: '0',
    });
    console.log('  ✓ Wallet account created');
  } else {
    console.log('  ✓ Wallet account already exists');
  }

  // ── Merchant Subscription (idempotent) ──
  const existingSub = await db.select().from(s.merchantSubscriptions).where(eq(s.merchantSubscriptions.storeId, storeId)).limit(1);
  if (existingSub.length === 0) {
    const [plan] = await db.select().from(s.subscriptionPlans).where(eq(s.subscriptionPlans.code, 'business')).limit(1);
    if (plan) {
      await db.insert(s.merchantSubscriptions).values({
        storeId: storeId, planId: plan.id,
        status: 'active', billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });
      console.log('  ✓ Store assigned to Business plan');
    }
  } else {
    console.log('  ✓ Subscription already exists');
  }

  // ── Admin Role & Demo User Assignment (idempotent) ──
  const allPermissionNames = [
    'products:read', 'products:write', 'products:delete',
    'orders:read', 'orders:write', 'orders:delete',
    'customers:read', 'customers:write',
    'categories:read', 'categories:write',
    'brands:read', 'brands:write',
    'coupons:read', 'coupons:write',
    'promotions:read', 'promotions:write',
    'shipping:read', 'shipping:write',
    'payments:read', 'payments:write',
    'settings:read', 'settings:write',
    'reports:read', 'analytics:read',
  ];

  const permissionRecords: { id: number }[] = [];
  for (const pn of allPermissionNames) {
    let [rec] = await db.select().from(s.permissions).where(eq(s.permissions.name, pn)).limit(1);
    if (!rec) {
      [rec] = await db.insert(s.permissions).values({ name: pn, label: pn }).onConflictDoNothing().returning();
    }
    if (rec) permissionRecords.push(rec);
  }

  const existingAdminRole = await db.select().from(s.roles).where(and(eq(s.roles.storeId, storeId), eq(s.roles.name, 'admin'))).limit(1);
  let adminRole = existingAdminRole[0];
  if (!adminRole) {
    [adminRole] = await db.insert(s.roles).values({
      storeId, name: 'admin', description: 'مدير المتجر — صلاحيات كاملة',
    }).returning();
    for (const p of permissionRecords) {
      await db.insert(s.rolePermissions).values({ roleId: adminRole.id, permissionId: p.id });
    }
  }

  // Assign admin role to merchant only (NOT customer)
  if (haaDemoMerchant) {
    const existingUserRole = await db.select().from(s.userStoreRoles).where(and(eq(s.userStoreRoles.userId, haaDemoMerchant.id), eq(s.userStoreRoles.storeId, storeId))).limit(1);
    if (!existingUserRole[0]) {
      await db.insert(s.userStoreRoles).values({ userId: haaDemoMerchant.id, storeId, roleId: adminRole.id });
    }
  }

  // Ensure customer does NOT have admin role
  if (haaDemoCustomer) {
    const existingCustomerRole = await db.select().from(s.userStoreRoles).where(and(eq(s.userStoreRoles.userId, haaDemoCustomer.id), eq(s.userStoreRoles.storeId, storeId))).limit(1);
    if (existingCustomerRole[0]) {
      await db.delete(s.userStoreRoles).where(and(eq(s.userStoreRoles.userId, haaDemoCustomer.id), eq(s.userStoreRoles.storeId, storeId)));
    }
  }

  console.log('\n✅ haa-demo seeded successfully!');
  console.log(`\n📦 Store URL: /s/${DEMO_SLUG}`);
  console.log(`📋 Demo Profile: main`);
  console.log(`📋 Seed Version: ${DEMO_SEED_VERSION}`);
  console.log('\n📋 Login credentials (haa-demo):');
  console.log('   Merchant (admin): merchant.haa-demo@example.com / Test@123456');
  console.log('   Customer (storefront): customer.haa-demo@example.com / Test@123456');
  process.exit(0);
}

seedHaaDemo().catch((err) => {
  console.error('❌ haa-demo seed failed:', err);
  process.exit(1);
});
