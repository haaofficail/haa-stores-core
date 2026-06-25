/* eslint-disable @typescript-eslint/no-explicit-any -- pre-existing
 * `any` types for shaping dynamic insert rows. Tracked separately;
 * not in scope for the cross-store isolation P0. */
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { createDbClient } from '../../index.js';
import * as s from '../../schema/index.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
const hashPassword = (pw: string) => bcrypt.hash(pw, 12);

const DEMO_SLUG = 'demo-perfumes';
const DEMO_SEED_VERSION = '2026-06-perfume-v1';

async function seedPerfumeDemo() {
  const db = createDbClient();
  console.log('🌱 Seeding perfume demo store...');

  const now = new Date();

  // Check if demo store already exists with this seed version (idempotent)
  const [existingStore] = await db.select()
    .from(s.stores)
    .where(and(
      eq(s.stores.slug, DEMO_SLUG),
      eq(s.stores.isDemo, true),
      eq(s.stores.demoSeedVersion, DEMO_SEED_VERSION),
    ))
    .limit(1);

  if (existingStore) {
    console.log(`  ✓ Perfume demo store already exists with seed version ${DEMO_SEED_VERSION}, skipping`);
    process.exit(0);
  }

  // If store exists but with different seed version, just update version (non-destructive)
  const [oldStore] = await db.select().from(s.stores).where(eq(s.stores.slug, DEMO_SLUG)).limit(1);
  if (oldStore) {
    console.log(`  ⚠ Perfume demo store exists with older version, updating seed version (non-destructive)...`);
    await db.update(s.stores).set({
      demoSeedVersion: DEMO_SEED_VERSION,
      updatedAt: now,
    }).where(eq(s.stores.id, oldStore.id));
    console.log(`  ✓ Store seed version updated to ${DEMO_SEED_VERSION}`);
    // Continue with upsert: existing data stays, only missing data gets added
  }

  // Get tenant
  const [tenant] = await db.select().from(s.tenants).where(eq(s.tenants.slug, 'haa-stores')).limit(1);
  if (!tenant) {
    console.error('❌ Tenant haa-stores not found. Run the main seed first.');
    return;
  }

  // ── Demo Users (create or upsert) ───────────────────
  const passwordHash = await hashPassword('Test@123456');

  // Merchant user (admin access)
  let [perfumeDemoMerchant] = await db.select().from(s.users).where(eq(s.users.email, 'merchant.perfumes@example.com')).limit(1);
  if (!perfumeDemoMerchant) {
    [perfumeDemoMerchant] = await db.insert(s.users).values({
      name: 'تاجر العطور التجريبي',
      email: 'merchant.perfumes@example.com',
      passwordHash,
      phone: '966500000011',
    }).returning();
    console.log(`  ✓ demo-perfumes merchant user created: ${perfumeDemoMerchant.email}`);
  } else {
    console.log(`  ✓ demo-perfumes merchant user exists: ${perfumeDemoMerchant.email}`);
  }

  // Customer user (storefront only)
  let [perfumeDemoCustomer] = await db.select().from(s.users).where(eq(s.users.email, 'customer.perfumes@example.com')).limit(1);
  if (!perfumeDemoCustomer) {
    [perfumeDemoCustomer] = await db.insert(s.users).values({
      name: 'عميل العطور التجريبي',
      email: 'customer.perfumes@example.com',
      passwordHash,
      phone: '966500000012',
    }).returning();
    console.log(`  ✓ demo-perfumes customer user created: ${perfumeDemoCustomer.email}`);
  } else {
    console.log(`  ✓ demo-perfumes customer user exists: ${perfumeDemoCustomer.email}`);
  }

  // ── Store (create or use existing) ──────────────────
  const [existingBySlug] = oldStore
    ? [oldStore]
    : await db.select().from(s.stores).where(eq(s.stores.slug, DEMO_SLUG)).limit(1);

  let store: { id: number; slug: string };
  if (existingBySlug) {
    store = existingBySlug;
    await db.update(s.stores).set({
      demoSeedVersion: DEMO_SEED_VERSION,
      updatedAt: now,
      isDemo: true,
      demoProfile: 'perfume',
    }).where(eq(s.stores.id, store.id));
    console.log(`  ✓ Using existing perfume demo store (id=${store.id})`);
  } else {
    const [created] = await db.insert(s.stores).values({
      tenantId: tenant.id,
      name: 'عطور هاء الفاخرة',
      slug: DEMO_SLUG,
      description: 'متجر تجريبي فاخر للعطور والعود والبخور والزيوت العطرية والهدايا',
      email: 'perfume-demo@haa-stores.com',
      phone: '966500000010',
      primaryColor: '#7A4E3A',
      backgroundColor: '#FAF8F6',
      isDemo: true,
      demoProfile: 'perfume',
      demoSeedVersion: DEMO_SEED_VERSION,
      status: 'active',
      isActive: true,
      publishStatus: 'published',
      city: 'الرياض',
      district: 'حي العليا',
      policies: {
        about: 'عطور هاء الفاخرة هو متجر إلكتروني تجريبي متخصص في أجود أنواع العطور الشرقية والغربية والعود والبخور والزيوت العطرية الفاخرة.',
        privacy: 'نحترم خصوصية عملائنا ونلتزم بحماية بياناتهم الشخصية.',
        returns: 'يمكن إرجاع المنتجات خلال 7 أيام من تاريخ الاستلام بشرط أن تكون بحالتها الأصلية.',
        shipping: 'نوفر الشحن لجميع مدن المملكة عبر شركات شحن موثوقة.',
        terms: 'باستخدامك للمتجر فإنك توافق على هذه الشروط والأحكام.',
        contact: 'يمكنك التواصل معنا عبر البريد الإلكتروني أو الهاتف.',
      },
    }).returning();
    store = created;
    console.log(`  ✓ Perfume demo store created: ${store.slug}`);
  }

  // ── Tenant-User (perfume merchant scoped to THIS store) ─────
  // Audit P0 (2026-06-25): membership MUST carry storeId so this
  // merchant does NOT appear in the haa-demo store's Employees view
  // even though both share the same tenant.
  if (perfumeDemoMerchant) {
    const [existingMembership] = await db.select()
      .from(s.tenantUsers)
      .where(and(
        eq(s.tenantUsers.tenantId, tenant.id),
        eq(s.tenantUsers.userId, perfumeDemoMerchant.id),
        eq(s.tenantUsers.storeId, store.id),
      ))
      .limit(1);
    if (!existingMembership) {
      await db.insert(s.tenantUsers).values({
        tenantId: tenant.id,
        storeId: store.id,
        userId: perfumeDemoMerchant.id,
        role: 'owner',
      });
      console.log(`  ✓ Perfume merchant membership created (storeId=${store.id})`);
    }
  }

  // ── Store Settings (luxury-showcase theme, idempotent) ──
  const [existingSettings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, store.id)).limit(1);
  if (!existingSettings) {
  await db.insert(s.storeSettings).values({
    storeId: store.id,
    defaultCurrency: 'SAR',
    locale: 'ar-SA',
    direction: 'rtl',
    timezone: 'Asia/Riyadh',
    orderPrefix: 'PRF-',
    themeConfig: {
      preset: 'luxury-showcase',
      themeKey: 'luxury-showcase',
      background: { mode: 'single' },
      header: {
        announcementText: '🌿 متجر تجريبي — جميع المنتجات لأغراض العرض والتجربة',
      },
      footer: {
        companyDescription: 'عطور هاء الفاخرة — متجر تجريبي للعطور والبخور والزيوت العطرية',
      },
    },
    productFeatures: {
      imageLightbox: true,
      stickyCart: true,
      trustBadges: true,
      badgeMaroof: true,
      badgeSaudiBusinessCenter: true,
      badgeSaudiMade: true,
      reviews: true,
      shareButton: true,
      deliveryEstimate: true,
      sizeGuide: true,
      alsoBought: true,
      recentlyViewed: true,
      priceAlert: true,
      giftWrap: true,
      sendAsGift: true,
      pickup: true,
      stockBar: true,
      liveViewers: true,
      compareBadges: true,
    },
    lowStockThreshold: 5,
    giftWrapDefaultPrice: '15',
    giftMessageMaxLength: 250,
    giftWrapInstructions: 'تغليف هدايا فاخر بشريط ذهبي',
    pickupInstructions: 'يمكن الاستلام من 4 مساءً إلى 10 مساءً',
    preparationTime: 1,
    preparationTimeEnabled: true,
  });
    console.log('  ✓ Store settings created with luxury-showcase theme');
  } else {
    console.log('  ✓ Store settings already exist, skipped');
  }

  // ── Subscription (idempotent) ───────────────────────
  const [existingSub] = await db.select().from(s.merchantSubscriptions).where(eq(s.merchantSubscriptions.storeId, store.id)).limit(1);
  if (!existingSub) {
    const [starterPlan] = await db.select().from(s.subscriptionPlans).where(eq(s.subscriptionPlans.code, 'starter')).limit(1);
    if (starterPlan) {
      await db.insert(s.merchantSubscriptions).values({
        storeId: store.id,
        planId: starterPlan.id,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(now.getTime() + 365 * 86400000),
        trialEnd: null,
      });
      console.log('  ✓ Store assigned to subscription');
    }
  } else {
    console.log('  ✓ Subscription already exists');
  }

  // ── Tags ────────────────────────────────────────────
  const tagsData = [
    { name: 'الأكثر مبيعاً', slug: 'bestseller', color: '#B89B5E', sortOrder: 1 },
    { name: 'جديد', slug: 'new', color: '#7A4E3A', sortOrder: 2 },
    { name: 'عرض خاص', slug: 'special-offer', color: '#8B1A1A', sortOrder: 3 },
    { name: 'مخزون محدود', slug: 'limited', color: '#D4A017', sortOrder: 4 },
    { name: 'هدية', slug: 'gift', color: '#B89B5E', sortOrder: 5 },
    { name: 'فاخر', slug: 'luxury', color: '#7A4E3A', sortOrder: 6 },
    { name: 'موسمي', slug: 'seasonal', color: '#2D6A4F', sortOrder: 7 },
    { name: 'حصري', slug: 'exclusive', color: '#8B4513', sortOrder: 8 },
  ];
  const tagRecords: Record<string, number> = {};
  const existingTags = await db.select().from(s.tags).where(eq(s.tags.storeId, store.id));
  const existingTagSlugs = new Set(existingTags.map((t) => t.slug));
  for (const t of tagsData) {
    if (existingTagSlugs.has(t.slug)) {
      tagRecords[t.slug] = existingTags.find((et) => et.slug === t.slug)!.id;
      continue;
    }
    const [row] = await db.insert(s.tags).values({
      storeId: store.id, name: t.name, slug: t.slug, color: t.color, sortOrder: t.sortOrder,
    }).returning();
    tagRecords[t.slug] = row.id;
  }
  console.log(`  ✓ ${tagsData.length} Tags created`);

  // ── Categories ──────────────────────────────────────
  const catDefs = [
    { name: 'عطور رجالية', slug: 'mens-perfumes', desc: 'عطور رجالية فاخرة', order: 1 },
    { name: 'عطور نسائية', slug: 'womens-perfumes', desc: 'عطور نسائية راقية', order: 2 },
    { name: 'عطور للجنسين', slug: 'unisex-perfumes', desc: 'عطور تناسب الرجال والنساء', order: 3 },
    { name: 'عود وبخور', slug: 'oud-incense', desc: 'دهن عود طبيعي وبخور فاخر', order: 4 },
    { name: 'زيوت عطرية', slug: 'perfume-oils', desc: 'زيوت عطرية مركزة', order: 5 },
    { name: 'أطقم هدايا', slug: 'gift-sets', desc: 'أطقم هدايا فاخرة', order: 6 },
    { name: 'عروض خاصة', slug: 'special-offers', desc: 'عروض وتخفيضات حصرية', order: 7 },
    { name: 'الأكثر مبيعاً', slug: 'best-sellers', desc: 'المنتجات الأكثر طلباً', order: 8 },
  ];
  const cats: Record<string, number> = {};
  const existingCats = await db.select().from(s.categories).where(eq(s.categories.storeId, store.id));
  const existingCatSlugs = new Set(existingCats.map((c) => c.slug));
  for (const c of catDefs) {
    if (existingCatSlugs.has(c.slug)) {
      cats[c.slug] = existingCats.find((ec) => ec.slug === c.slug)!.id;
      continue;
    }
    const [row] = await db.insert(s.categories).values({
      storeId: store.id, name: c.name, slug: c.slug, description: c.desc,
      isActive: true, showInHome: true, showInMenu: true, sortOrder: c.order,
    }).returning();
    cats[c.slug] = row.id;
  }
  console.log(`  ✓ ${catDefs.length} Categories created`);

  // ── Products ────────────────────────────────────────
  interface ProductDef {
    name: string; slug: string; desc: string; shortDesc: string;
    price: string; cmp: string | null; cost: string; sku: string; barcode?: string;
    stock: number; cat: string; weight: number; fragile: boolean; featured: boolean;
    rating: number; reviewCount: number; salesCount: number;
    tags: string[]; size: string; concentration: string; longevity: string;
    notes: string; origin: string;
    giftWrapAvailable: boolean; eligibleForCOD: boolean;
  }

  const productsData: ProductDef[] = [
    { name: 'مسك الغروب', slug: 'musk-al-ghoroub', desc: 'عطر مسك الغروب الفاخر يمزج بين نفحات المسك الأبيض والعنبر الدافئ مع لمسات من زهرة البرتقال. يدوم طويلاً ويمنحك حضوراً ساحراً.', shortDesc: 'عطر مسك شرقي فاخر مع نفحات العنبر والبرتقال', price: '299', cmp: '449', cost: '120', sku: 'PRF-MG-001', barcode: '6281001001011', stock: 50, cat: 'mens-perfumes', weight: 150, fragile: true, featured: true, rating: 5, reviewCount: 89, salesCount: 1240, tags: ['bestseller', 'luxury'], size: '75ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'مسك أبيض، عنبر، زهرة برتقال', origin: 'الإمارات العربية المتحدة', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'عود الرياض', slug: 'oud-riyadh', desc: 'دهن عود الرياض الفاخر المستخلص من أشجار العود النادرة في جنوب شرق آسيا. رائحة خشبية دافئة مع لمسات دخانية فاخرة.', shortDesc: 'دهن عود طبيعي فاخر برائحة خشبية دافئة', price: '599', cmp: '799', cost: '250', sku: 'PRF-OR-002', stock: 25, cat: 'oud-incense', weight: 30, fragile: true, featured: true, rating: 5, reviewCount: 156, salesCount: 890, tags: ['bestseller', 'luxury', 'limited'], size: '12ml', concentration: 'Parfum Oil', longevity: 'عالي جداً', notes: 'عود كمبودي، جاوي، زعفران', origin: 'كمبوديا', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'ورد الطائف الفاخر', slug: 'taif-rose-luxury', desc: 'عطر ورد الطائف الفاخر المستوحى من ورود الطائف العطرية. مزيج رائع من الورد الطائفي مع نفحات المسك والعنبر.', shortDesc: 'عطر ورد طائفي فاخر مع المسك والعنبر', price: '449', cmp: '649', cost: '180', sku: 'PRF-TR-003', stock: 35, cat: 'womens-perfumes', weight: 100, fragile: true, featured: true, rating: 5, reviewCount: 234, salesCount: 1890, tags: ['bestseller', 'luxury', 'gift'], size: '50ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'ورد طائفي، مسك أبيض، عنبر، فانيليا', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'ليل المخمل', slug: 'velvet-night', desc: 'عطر ليلي فاخر بنفحات غامضة وجذابة. مزيج من خشب الصندل والعنبر الأسود مع لمسة من الفانيليا.', shortDesc: 'عطر ليلي فاخر بخشب الصندل والعنبر', price: '349', cmp: '499', cost: '140', sku: 'PRF-VN-004', stock: 40, cat: 'womens-perfumes', weight: 100, fragile: true, featured: false, rating: 4, reviewCount: 78, salesCount: 670, tags: ['new', 'luxury'], size: '50ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'خشب صندل، عنبر أسود، فانيليا، ياسمين', origin: 'فرنسا', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'عنبر شرقي', slug: 'oriental-amber', desc: 'عطر عنبر شرقي تقليدي بنفحات دافئة وحسية. مزيج من العنبر الفاخر والعود والمسك.', shortDesc: 'عطر عنبر شرقي دافئ مع العود والمسك', price: '399', cmp: null, cost: '160', sku: 'PRF-OA-005', stock: 30, cat: 'unisex-perfumes', weight: 75, fragile: true, featured: false, rating: 4, reviewCount: 112, salesCount: 980, tags: ['bestseller', 'luxury'], size: '50ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'عنبر، عود، مسك، زعفران', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'نسيم الصباح', slug: 'morning-breeze', desc: 'عطر نسيم الصباح المنعش بنفحات الحمضيات المنعشة والأزهار البيضاء. مثالي للاستخدام اليومي.', shortDesc: 'عطر منعش بنفحات حمضيات وأزهار بيضاء', price: '249', cmp: '349', cost: '100', sku: 'PRF-MB-006', stock: 60, cat: 'unisex-perfumes', weight: 100, fragile: true, featured: false, rating: 4, reviewCount: 67, salesCount: 540, tags: ['new', 'special-offer'], size: '75ml', concentration: 'Eau de Toilette', longevity: 'متوسط', notes: 'برغموت، جريب فروت، زهرة بيضاء، مسك', origin: 'فرنسا', giftWrapAvailable: false, eligibleForCOD: true },
    { name: 'سمو العود', slug: 'oud-sumo', desc: 'عطر سمو العود الفاخر يجمع بين عمق العود الكمبودي ونفحات الزعفران والورد البلغاري.', shortDesc: 'عطر عود فاخر مع الزعفران والورد البلغاري', price: '799', cmp: '999', cost: '320', sku: 'PRF-OS-007', stock: 15, cat: 'oud-incense', weight: 50, fragile: true, featured: true, rating: 5, reviewCount: 198, salesCount: 760, tags: ['bestseller', 'luxury', 'limited', 'exclusive'], size: '30ml', concentration: 'Parfum Oil', longevity: 'عالي جداً', notes: 'عود كمبودي، زعفران، ورد بلغاري، عنبر', origin: 'كمبوديا', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'زهرة بيضاء', slug: 'white-flower', desc: 'عطر زهرة بيضاء أنثوي رقيق بنفحات الياسمين والغاردينيا والمسك الأبيض.', shortDesc: 'عطر أنثوي رقيق بالياسمين والغاردينيا', price: '279', cmp: '399', cost: '110', sku: 'PRF-WF-008', stock: 45, cat: 'womens-perfumes', weight: 75, fragile: true, featured: false, rating: 4, reviewCount: 145, salesCount: 1230, tags: ['bestseller', 'gift'], size: '50ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'ياسمين، غاردينيا، مسك أبيض، فريزيا', origin: 'فرنسا', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'خشب الصندل الملكي', slug: 'royal-sandalwood', desc: 'عطر خشب الصندل الملكي الفاخر بنفحات خشبية دافئة ممزوجة بالعنبر والعود.', shortDesc: 'عطر خشب صندل فاخر مع العنبر والعود', price: '499', cmp: '699', cost: '200', sku: 'PRF-RS-009', stock: 20, cat: 'mens-perfumes', weight: 100, fragile: true, featured: true, rating: 4, reviewCount: 89, salesCount: 430, tags: ['luxury', 'exclusive'], size: '50ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'خشب صندل، عنبر، عود، جلد', origin: 'الهند', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'بخور المجالس', slug: 'majlis-incense', desc: 'بخور المجلس الفاخر برائحة العود والعنبر والمسك. بخور عربي تقليدي للمناسبات والمجالس.', shortDesc: 'بخور فاخر برائحة العود والعنبر', price: '89', cmp: null, cost: '35', sku: 'PRF-MI-010', barcode: '6281001001028', stock: 100, cat: 'oud-incense', weight: 200, fragile: false, featured: false, rating: 4, reviewCount: 312, salesCount: 3450, tags: ['bestseller', 'gift'], size: '100g', concentration: '', longevity: '', notes: 'عود، عنبر، مسك، زعفران', origin: 'المملكة العربية السعودية', giftWrapAvailable: false, eligibleForCOD: true },
    { name: 'زيت مسك نقي', slug: 'pure-musk-oil', desc: 'زيت مسك نقي مركز من أجود أنواع المسك الطبيعي. يدوم طويلاً ويمنحك رائحة منعشة.', shortDesc: 'زيت مسك نقي مركز طبيعي', price: '149', cmp: '199', cost: '60', sku: 'PRF-PM-011', stock: 80, cat: 'perfume-oils', weight: 20, fragile: true, featured: false, rating: 5, reviewCount: 267, salesCount: 2890, tags: ['bestseller', 'gift'], size: '12ml', concentration: 'Parfum Oil', longevity: 'عالي جداً', notes: 'مسك نقي، عنبر', origin: 'الإمارات العربية المتحدة', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'مجموعة هدية فاخرة', slug: 'luxury-gift-set', desc: 'طقم هدايا فاخر يضم عطراً فاخراً 50مل مع دهن عود 6مل وبخور فاخر. في علبة هدايا أنيقة.', shortDesc: 'طقم هدايا عطر وعود وبخور في علبة فاخرة', price: '899', cmp: '1199', cost: '360', sku: 'PRF-LG-012', stock: 10, cat: 'gift-sets', weight: 500, fragile: true, featured: true, rating: 5, reviewCount: 56, salesCount: 320, tags: ['gift', 'luxury', 'exclusive', 'limited'], size: '', concentration: '', longevity: '', notes: 'عطر فاخر، دهن عود، بخور', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: false },
    { name: 'رذاذ مفارش فاخر', slug: 'luxury-linen-spray', desc: 'رذاذ معطر للمفارش والغرف برائحة المسك والعنبر الفاخرة. يمنح منزلك أجواء من الفخامة.', shortDesc: 'رذاذ معطر للمفارش برائحة المسك والعنبر', price: '79', cmp: null, cost: '30', sku: 'PRF-LL-013', stock: 120, cat: 'unisex-perfumes', weight: 200, fragile: false, featured: false, rating: 4, reviewCount: 45, salesCount: 560, tags: ['new', 'gift'], size: '200ml', concentration: '', longevity: '', notes: 'مسك، عنبر، زهور بيضاء', origin: 'المملكة العربية السعودية', giftWrapAvailable: false, eligibleForCOD: true },
    { name: 'توليفة العيد', slug: 'eid-blend', desc: 'عطر توليفة العيد المميز بنفحات العود والزعفران والورد. عطر احتفالي فاخر.', shortDesc: 'عطر احتفالي بالعود والزعفران والورد', price: '529', cmp: '749', cost: '210', sku: 'PRF-EB-014', stock: 20, cat: 'mens-perfumes', weight: 75, fragile: true, featured: false, rating: 5, reviewCount: 123, salesCount: 780, tags: ['seasonal', 'luxury', 'gift'], size: '50ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'عود، زعفران، ورد بلغاري، عنبر', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'لمسة فانيلا', slug: 'vanilla-touch', desc: 'عطر لمسة فانيلا الدافئ والحلو بنفحات الفانيليا المدغشقرية مع الكراميل والمسك الأبيض.', shortDesc: 'عطر دافئ بالفانيليا والكراميل', price: '269', cmp: '379', cost: '105', sku: 'PRF-VT-015', stock: 55, cat: 'womens-perfumes', weight: 75, fragile: true, featured: false, rating: 4, reviewCount: 178, salesCount: 1560, tags: ['bestseller', 'gift'], size: '50ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'فانيليا مدغشقر، كراميل، مسك أبيض', origin: 'فرنسا', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'عطر الورد والعنبر', slug: 'rose-amber', desc: 'عطر الورد والعنبر الفاخر يجمع بين نفحات الورد الدمشقي والعنبر الدافئ.', shortDesc: 'عطر ورد دمشقي مع عنبر دافئ', price: '379', cmp: '549', cost: '150', sku: 'PRF-RA-016', stock: 30, cat: 'unisex-perfumes', weight: 75, fragile: true, featured: true, rating: 5, reviewCount: 201, salesCount: 1670, tags: ['bestseller', 'luxury'], size: '50ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'ورد دمشقي، عنبر، خشب الصندل', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'دهن عود خاص', slug: 'special-oud-oil', desc: 'دهن عود خاص فاخر من أجود أنواع العود الهندي الأسامي. رائحة عميقة ودخانية.', shortDesc: 'دهن عود هندي أسامي فاخر', price: '1299', cmp: '1699', cost: '520', sku: 'PRF-SO-017', stock: 8, cat: 'oud-incense', weight: 15, fragile: true, featured: true, rating: 5, reviewCount: 67, salesCount: 210, tags: ['luxury', 'exclusive', 'limited'], size: '6ml', concentration: 'Parfum Oil 100%', longevity: 'عالي جداً', notes: 'عود أسامي هندي, عنبر', origin: 'الهند', giftWrapAvailable: true, eligibleForCOD: false },
    { name: 'عطر سينيشر للجنسين', slug: 'signature-unisex', desc: 'عطر Signature الفريد للجنسين بنفحات الحمضيات المنعشة والتوابل الدافئة والأخشاب.', shortDesc: 'عطر للجنسين بنفحات حمضية وخشبية', price: '429', cmp: '599', cost: '170', sku: 'PRF-SU-018', stock: 35, cat: 'unisex-perfumes', weight: 100, fragile: true, featured: false, rating: 4, reviewCount: 91, salesCount: 670, tags: ['new', 'luxury'], size: '75ml', concentration: 'Eau de Parfum', longevity: 'عالي', notes: 'برغموت، زعفران، خشب أرز، مسك', origin: 'فرنسا', giftWrapAvailable: true, eligibleForCOD: true },
    { name: 'عطر سفر 30ml', slug: 'travel-perfume-30', desc: 'عطر بحجم السفر مناسب للحقيبة، برائحة المسك والعنبر المنعشة. زجاجة عملية للسفر.', shortDesc: 'عطر بحجم السفر 30مل برائحة المسك والعنبر', price: '159', cmp: '199', cost: '65', sku: 'PRF-TP-019', stock: 80, cat: 'mens-perfumes', weight: 50, fragile: true, featured: false, rating: 4, reviewCount: 34, salesCount: 450, tags: ['new', 'special-offer'], size: '30ml', concentration: 'Eau de Toilette', longevity: 'متوسط', notes: 'مسك، عنبر، حمضيات', origin: 'المملكة العربية السعودية', giftWrapAvailable: false, eligibleForCOD: true },
    { name: 'عطر كوليكتور فاخر', slug: 'collector-luxury', desc: 'عطر Collector الإصدار المحدود. عطر فاخر بنفحات نادرة من العود الملكي والعنبر الأسود.', shortDesc: 'إصدار محدود - عطر فاخر بالعود والعنبر', price: '1499', cmp: '1999', cost: '600', sku: 'PRF-CL-020', barcode: '6281001001035', stock: 5, cat: 'mens-perfumes', weight: 100, fragile: true, featured: true, rating: 5, reviewCount: 23, salesCount: 89, tags: ['luxury', 'exclusive', 'limited'], size: '50ml', concentration: 'Extrait de Parfum', longevity: 'عالي جداً', notes: 'عود ملكي، عنبر أسود، زعفران، جلد', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: false },
    { name: 'مجموعة العروس', slug: 'bridal-set', desc: 'طقم هدايا العروس الفاخر يضم عطراً نسائياً ودهن عود وزيت مسك. في علبة هدايا أنيقة.', shortDesc: 'طقم هدايا العروس عطر وعود ومسك', price: '699', cmp: '949', cost: '280', sku: 'PRF-BS-021', stock: 12, cat: 'gift-sets', weight: 400, fragile: true, featured: true, rating: 5, reviewCount: 89, salesCount: 340, tags: ['gift', 'luxury', 'seasonal'], size: '', concentration: '', longevity: '', notes: 'عطر نسائي، دهن عود، زيت مسك', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: false },
    { name: 'صندوق هدايا العود', slug: 'oud-gift-box', desc: 'صندوق هدايا العود الفاخر يضم 3 أنواع من دهن العود: كمبودي وهندي وجاوي. هدية مثالية.', shortDesc: 'صندوق 3 أنواع دهن عود فاخر', price: '1099', cmp: '1499', cost: '440', sku: 'PRF-OGB-022', stock: 7, cat: 'gift-sets', weight: 200, fragile: true, featured: false, rating: 5, reviewCount: 45, salesCount: 180, tags: ['gift', 'luxury', 'exclusive'], size: '', concentration: '', longevity: '', notes: 'عود كمبودي، هندي، جاوي', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: false },
    { name: 'بخور فاخر 100g', slug: 'luxury-incense-100g', desc: 'بخور فاخر عالي الجودة برائحة العود الملكي والعنبر. مناسب للمجالس والمناسبات.', shortDesc: 'بخور فاخر برائحة العود والعنبر 100 جرام', price: '129', cmp: '169', cost: '50', sku: 'PRF-LI-023', stock: 90, cat: 'oud-incense', weight: 100, fragile: false, featured: false, rating: 4, reviewCount: 234, salesCount: 2780, tags: ['bestseller', 'gift'], size: '100g', concentration: '', longevity: '', notes: 'عود ملكي، عنبر، مسك', origin: 'المملكة العربية السعودية', giftWrapAvailable: false, eligibleForCOD: true },
    { name: 'زيت عطر مركز', slug: 'concentrated-oil', desc: 'زيت عطر مركز فاخر بتركيز عالٍ يدوم طويلاً. برائحة العود والمسك والعنبر.', shortDesc: 'زيت عطر مركز بتركيز عالٍ', price: '199', cmp: '279', cost: '80', sku: 'PRF-CO-024', stock: 65, cat: 'perfume-oils', weight: 15, fragile: true, featured: false, rating: 4, reviewCount: 156, salesCount: 1890, tags: ['bestseller', 'special-offer'], size: '10ml', concentration: 'Parfum Oil', longevity: 'عالي جداً', notes: 'عود، مسك، عنبر', origin: 'المملكة العربية السعودية', giftWrapAvailable: true, eligibleForCOD: true },
  ];

  const productRecords: Record<string, { id: number; price: string }> = {};
  for (const p of productsData) {
    const [product] = await db.insert(s.products).values({
      storeId: store.id,
      name: p.name,
      slug: p.slug,
      description: p.desc,
      status: 'active',
      type: 'physical',
      price: p.price,
      compareAtPrice: p.cmp,
      cost: p.cost,
      sku: p.sku,
      barcode: p.barcode ?? null,
      stockQuantity: p.stock,
      trackInventory: true,
      weightGrams: p.weight,
      requiresShipping: true,
      isFragile: p.fragile,
      giftWrapAvailable: p.giftWrapAvailable,
      rating: p.rating,
      reviewCount: p.reviewCount,
      salesCount: p.salesCount,
      haaMarketplaceEnabled: true,
      haaMarketplaceReviewStatus: 'approved',
    }).returning();
    productRecords[p.slug] = { id: product.id, price: p.price };

    // Product-category
    await db.insert(s.productCategories).values({
      productId: product.id,
      categoryId: cats[p.cat],
    });

    // Product tags
    if (p.tags.length) {
      await db.insert(s.productTags).values(
        p.tags.map(tagSlug => ({ productId: product.id, tagId: tagRecords[tagSlug] }))
      );
    }

    // Product image
    await db.insert(s.productImages).values({
      productId: product.id,
      url: `https://placehold.co/600x600/FAF8F6/7A4E3A?text=${encodeURIComponent(p.name)}`,
      alt: p.name,
      sortOrder: 0,
    });

    // Second image for some products
    if (['musk-al-ghoroub', 'oud-riyadh', 'taif-rose-luxury', 'luxury-gift-set', 'royal-sandalwood', 'bridal-set', 'oud-gift-box', 'special-oud-oil'].includes(p.slug)) {
      await db.insert(s.productImages).values({
        productId: product.id,
        url: `https://placehold.co/600x600/F5F0EC/7A4E3A?text=${encodeURIComponent(p.name)}+2`,
        alt: `${p.name} - صورة إضافية`,
        sortOrder: 1,
      });
    }
  }
  console.log(`  ✓ ${productsData.length} Products created with images`);

  // ── Brands (idempotent) ─────────────────────────────
  const brandsData = [
    { name: 'هاء للعطور', slug: 'haa-perfumes', logo: 'https://placehold.co/100x100/7A4E3A/FAF8F6?text=Haa', desc: 'عطور هاء الفاخرة', sortOrder: 1 },
    { name: 'عطور فرنسية', slug: 'french-perfumes', logo: 'https://placehold.co/100x100/1F1A17/FAF8F6?text=FP', desc: 'عطور فرنسية مستوردة', sortOrder: 2 },
    { name: 'دهن العود', slug: 'oud-house', logo: 'https://placehold.co/100x100/B89B5E/1F1A17?text=Oud', desc: 'دهن عود طبيعي', sortOrder: 3 },
  ];
  const brandRecords: Record<string, number> = {};
  const existingBrands = await db.select().from(s.brands).where(eq(s.brands.storeId, store.id));
  const existingBrandSlugs = new Set(existingBrands.map((b) => b.slug));
  for (const b of brandsData) {
    if (existingBrandSlugs.has(b.slug)) {
      brandRecords[b.slug] = existingBrands.find((eb) => eb.slug === b.slug)!.id;
      continue;
    }
    const [row] = await db.insert(s.brands).values({
      storeId: store.id, name: b.name, slug: b.slug, logo: b.logo,
      description: b.desc, sortOrder: b.sortOrder, isActive: true,
    }).returning();
    brandRecords[b.slug] = row.id;
  }
  console.log(`  ✓ ${brandsData.length} Brands synced`);

  // ── Customers ───────────────────────────────────────
  const customerData = [
    { name: 'نورة الشهري', phone: '966511111111', email: 'nora@example.com', city: 'الرياض', street: 'شارع التحلية', district: 'حي السفارات' },
    { name: 'سارة الحربي', phone: '966522222222', email: 'sarah@example.com', city: 'جدة', street: 'شارع الأمير سلطان', district: 'حي الشاطئ' },
    { name: 'مشاعل القحطاني', phone: '966533333333', email: 'mashaal@example.com', city: 'الدمام', street: 'شارع الملك سعود', district: 'حي الفيصلية' },
    { name: 'هند المطيري', phone: '966544444444', email: 'hind@example.com', city: 'مكة', street: 'شارع أجياد', district: 'الروضة' },
    { name: 'الجوهرة العتيبي', phone: '966555555555', email: 'johara@example.com', city: 'المدينة', street: 'شارع أبو بكر الصديق', district: 'العنبرية' },
    { name: 'لينا الغامدي', phone: '966566666666', email: 'lina@example.com', city: 'الرياض', street: 'شارع التخصصي', district: 'حي النزهة' },
    { name: 'عهود الزهراني', phone: '966577777777', email: 'ahoud@example.com', city: 'جدة', street: 'شارع فلسطين', district: 'حي الحمراء' },
    { name: 'نوف الدوسري', phone: '966588888888', email: 'nouf@example.com', city: 'الدمام', street: 'شارع الظهران', district: 'حي المزروعية' },
  ];
  const customerRecords: { id: number; name: string; phone: string }[] = [];
  for (const c of customerData) {
    const [customer] = await db.insert(s.customers).values({
      storeId: store.id, name: c.name, phone: c.phone, email: c.email,
    }).returning();
    customerRecords.push(customer);

    await db.insert(s.customerAddresses).values({
      customerId: customer.id, label: 'المنزل', street: c.street,
      district: c.district, city: c.city, country: 'Saudi Arabia', isDefault: true,
    });
  }
  console.log(`  ✓ ${customerData.length} Customers created`);

  // ── Shipping Setup (idempotent) ─────────────────────
  const existingShippingMethods = await db.select().from(s.shippingMethods).where(eq(s.shippingMethods.storeId, store.id));
  const existingMethodNames = new Set(existingShippingMethods.map((m) => m.name));

  async function getOrCreateMethod(name: string, data: Partial<typeof s.shippingMethods.$inferInsert> & { name: string }) {
    if (existingMethodNames.has(name)) {
      const existing = existingShippingMethods.find((m) => m.name === name)!;
      return existing;
    }
    const [created] = await db.insert(s.shippingMethods).values({ storeId: store.id, ...data } as any).returning();
    return created;
  }

  const regularMethod = await getOrCreateMethod('توصيل عادي', { name: 'توصيل عادي', type: 'city_based', isActive: true, sortOrder: 1, estimatedDeliveryDays: '3-5 أيام عمل' });
  const expressMethod = await getOrCreateMethod('توصيل سريع', { name: 'توصيل سريع', type: 'city_based', isActive: true, sortOrder: 2, estimatedDeliveryDays: '1-2 أيام عمل' });
  const pickupMethod = await getOrCreateMethod('استلام من الفرع', { name: 'استلام من الفرع', type: 'local_pickup', isActive: true, sortOrder: 3, estimatedDeliveryDays: 'فوري' });
  const freeMethod = await getOrCreateMethod('توصيل مجاني', { name: 'توصيل مجاني', type: 'free_above', isActive: true, sortOrder: 4, estimatedDeliveryDays: '3-5 أيام عمل' });

  const existingZones = await db.select().from(s.shippingZones).where(eq(s.shippingZones.storeId, store.id));
  const existingZoneNames = new Set(existingZones.map((z) => z.name));

  async function getOrCreateZone(name: string, cities: string[]) {
    if (existingZoneNames.has(name)) {
      return existingZones.find((z) => z.name === name)!;
    }
    const [created] = await db.insert(s.shippingZones).values({ storeId: store.id, name, cities, isActive: true }).returning();
    return created;
  }

  const zoneRiyadh = await getOrCreateZone('منطقة الرياض', ['الرياض', 'الدرعية', 'المجمعة', 'الخرج']);
  const zoneKsa = await getOrCreateZone('بقية المملكة', ['جدة', 'مكة', 'الدمام', 'المدينة', 'الطائف', 'تبوك', 'حائل', 'القصيم', 'أبها', 'جازان', 'نجران', 'الباحة', 'الحدود الشمالية', 'الجوف']);

  // Rates are zone+method specific; only create if none exist for this zone
  const existingRates = await db.select().from(s.shippingRates).where(eq(s.shippingRates.shippingZoneId, zoneRiyadh.id)).limit(1);
  if (existingRates.length === 0) {
    await db.insert(s.shippingRates).values([
      { shippingMethodId: regularMethod.id, shippingZoneId: zoneRiyadh.id, baseRate: '18.00', estimatedDaysMin: 3, estimatedDaysMax: 5 },
      { shippingMethodId: regularMethod.id, shippingZoneId: zoneKsa.id, baseRate: '25.00', estimatedDaysMin: 3, estimatedDaysMax: 5 },
      { shippingMethodId: expressMethod.id, shippingZoneId: zoneRiyadh.id, baseRate: '39.00', estimatedDaysMin: 1, estimatedDaysMax: 2 },
      { shippingMethodId: expressMethod.id, shippingZoneId: zoneKsa.id, baseRate: '49.00', estimatedDaysMin: 1, estimatedDaysMax: 2 },
      { shippingMethodId: freeMethod.id, shippingZoneId: zoneRiyadh.id, baseRate: '0', freeAboveAmount: '299.00' },
      { shippingMethodId: freeMethod.id, shippingZoneId: zoneKsa.id, baseRate: '0', freeAboveAmount: '299.00' },
      { shippingMethodId: pickupMethod.id, shippingZoneId: zoneRiyadh.id, baseRate: '0' },
      { shippingMethodId: pickupMethod.id, shippingZoneId: zoneKsa.id, baseRate: '0' },
    ]);
  }
  console.log('  ✓ Shipping setup synced');

  // ── Pickup Location (idempotent) ────────────────────
  const existingPickups = await db.select().from(s.pickupLocations).where(eq(s.pickupLocations.storeId, store.id)).limit(1);
  if (existingPickups.length === 0) {
    await db.insert(s.pickupLocations).values({
      storeId: store.id, nameAr: 'معرض عطور هاء - الرياض', nameEn: 'Haa Perfumes - Riyadh',
      address: 'الرياض، حي العليا، شارع الأمير محمد بن عبدالعزيز',
      phone: '966500000010', hours: { sat: '4م-10م', sun: '4م-10م', mon: '4م-10م', tue: '4م-10م', wed: '4م-10م', thu: '4م-10م', fri: 'مغلق' },
      instructions: 'يمكن الاستلام من 4 مساءً إلى 10 مساءً', isActive: true,
    });
    console.log('  ✓ Pickup location created');
  } else {
    console.log('  ✓ Pickup location already exists');
  }

  // ── Orders ──────────────────────────────────────────
  const orderStates = [
    { status: 'completed', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', daysAgo: 8, customer: 0, items: [0, 10], city: 'الرياض', paymentMethod: 'fake_card_success', shipMethod: 'regular', shipCost: '18' },
    { status: 'shipped', paymentStatus: 'paid', fulfillmentStatus: 'unfulfilled', daysAgo: 3, customer: 1, items: [2, 14], city: 'جدة', paymentMethod: 'tabby_installments', shipMethod: 'express', shipCost: '49' },
    { status: 'processing', paymentStatus: 'paid', fulfillmentStatus: 'unfulfilled', daysAgo: 1, customer: 2, items: [6], city: 'الدمام', paymentMethod: 'tamara_installments', shipMethod: 'express', shipCost: '49' },
    { status: 'confirmed', paymentStatus: 'unpaid', fulfillmentStatus: 'unfulfilled', daysAgo: 0, customer: 3, items: [11, 21], city: 'مكة', paymentMethod: 'cash_on_delivery', shipMethod: 'regular', shipCost: '25' },
    { status: 'pending_payment', paymentStatus: 'unpaid', fulfillmentStatus: 'unfulfilled', daysAgo: 0, customer: 4, items: [3, 7], city: 'المدينة', paymentMethod: 'bank_transfer', shipMethod: 'regular', shipCost: '25' },
    { status: 'delivered', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', daysAgo: 12, customer: 5, items: [1], city: 'الرياض', paymentMethod: 'fake_card_success', shipMethod: 'regular', shipCost: '18' },
    { status: 'ready_for_shipping', paymentStatus: 'paid', fulfillmentStatus: 'unfulfilled', daysAgo: 0, customer: 5, items: [15, 23], city: 'الرياض', paymentMethod: 'moyasar_mada', shipMethod: 'regular', shipCost: '18' },
    { status: 'ready_for_pickup', paymentStatus: 'paid', fulfillmentStatus: 'unfulfilled', daysAgo: 0, customer: 6, items: [8], city: 'جدة', paymentMethod: 'fake_card_success', shipMethod: 'pickup', shipCost: '0' },
    { status: 'picked_up', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', daysAgo: 5, customer: 6, items: [12, 18], city: 'جدة', paymentMethod: 'cash_on_delivery', shipMethod: 'pickup', shipCost: '0' },
    { status: 'cancelled', paymentStatus: 'unpaid', fulfillmentStatus: 'unfulfilled', daysAgo: 7, customer: 7, items: [19], city: 'الدمام', paymentMethod: 'cash_on_delivery', shipMethod: 'regular', shipCost: '25' },
    { status: 'payment_failed', paymentStatus: 'failed', fulfillmentStatus: 'unfulfilled', daysAgo: 2, customer: 3, items: [5, 13], city: 'مكة', paymentMethod: 'fake_card_failed', shipMethod: 'regular', shipCost: '25' },
    { status: 'refunded', paymentStatus: 'refunded', fulfillmentStatus: 'returned', daysAgo: 15, customer: 1, items: [9], city: 'جدة', paymentMethod: 'fake_card_success', shipMethod: 'regular', shipCost: '25' },
  ];

  for (let oi = 0; oi < orderStates.length; oi++) {
    const os = orderStates[oi];
    const orderDate = new Date(now.getTime() - os.daysAgo * 86400000);
    const orderNumber = `PRF-${String(2000 + oi).padStart(4, '0')}`;

    let subtotal = 0;
    const orderItems: { productId: number; name: string; sku: string; quantity: number; unitPrice: string; totalPrice: string }[] = [];
    for (const idx of os.items) {
      const p = productsData[idx];
      const qty = (oi === 3 && idx === 11) ? 1 : 1;
      const total = Number(p.price) * qty;
      subtotal += total;
      orderItems.push({
        productId: productRecords[p.slug].id,
        name: p.name,
        sku: p.sku,
        quantity: qty,
        unitPrice: p.price,
        totalPrice: String(total),
      });
    }

    const shippingCost = os.shipCost;
    const couponDiscount = (oi === 0 || oi === 3) ? 25 : 0;
    const total = Math.max(0, subtotal + Number(shippingCost) - couponDiscount);

    const [order] = await db.insert(s.orders).values({
      storeId: store.id,
      customerId: customerRecords[os.customer].id,
      orderNumber,
      status: os.status,
      paymentStatus: os.paymentStatus,
      fulfillmentStatus: os.fulfillmentStatus,
      customerName: customerRecords[os.customer].name,
      customerPhone: customerRecords[os.customer].phone,
      customerEmail: customerData[os.customer].email,
      shippingAddress: {
        street: customerData[os.customer].street,
        district: customerData[os.customer].district,
        city: os.city,
        country: 'Saudi Arabia',
      },
      shippingMethodId: os.shipMethod === 'regular' ? regularMethod.id : os.shipMethod === 'express' ? expressMethod.id : os.shipMethod === 'pickup' ? pickupMethod.id : freeMethod.id,
      shippingCost: String(shippingCost),
      subtotal: String(subtotal),
      total: String(total),
      paidAmount: os.paymentStatus === 'paid' || os.paymentStatus === 'refunded' ? String(total) : '0',
      paymentMethod: os.paymentMethod === 'pickup' ? 'cash_on_delivery' : os.paymentMethod,
      couponCode: couponDiscount > 0 ? (oi === 0 ? 'GIFT25' : 'LUXURY15') : null,
      couponDiscount: couponDiscount > 0 ? String(couponDiscount) : null,
      notes: os.status === 'payment_failed' ? 'فشلت عملية الدفع. يرجى المحاولة مرة أخرى.' : undefined,
      metadata: { isDemoOrder: true } as any,
      cancelledAt: os.status === 'cancelled' ? orderDate : null,
      createdAt: orderDate,
      updatedAt: orderDate,
    }).returning();

    for (const item of orderItems) {
      await db.insert(s.orderItems).values({
        orderId: order.id, productId: item.productId, name: item.name,
        sku: item.sku, quantity: item.quantity,
        unitPrice: item.unitPrice, totalPrice: item.totalPrice,
      });
    }

    // Status history
    const statusFlows: Record<string, string[]> = {
      'completed': ['draft', 'confirmed', 'processing', 'shipped', 'completed'],
      'shipped': ['draft', 'confirmed', 'processing', 'shipped'],
      'processing': ['draft', 'confirmed', 'processing'],
      'confirmed': ['draft', 'confirmed'],
      'pending_payment': ['draft', 'pending_payment'],
      'delivered': ['draft', 'confirmed', 'processing', 'shipped', 'delivered'],
      'ready_for_shipping': ['draft', 'confirmed', 'processing', 'ready_to_ship'],
      'ready_for_pickup': ['draft', 'confirmed', 'processing', 'ready_for_pickup'],
      'picked_up': ['draft', 'confirmed', 'processing', 'ready_for_pickup', 'picked_up'],
      'cancelled': ['draft', 'confirmed', 'cancelled'],
      'payment_failed': ['draft', 'payment_failed'],
      'refunded': ['draft', 'confirmed', 'processing', 'shipped', 'completed', 'returned', 'refunded'],
    };

    const flow = statusFlows[os.status] || ['draft'];
    for (let si = 0; si < flow.length; si++) {
      await db.insert(s.orderStatusHistory).values({
        orderId: order.id,
        fromStatus: si === 0 ? null : flow[si - 1],
        toStatus: flow[si],
        createdAt: new Date(orderDate.getTime() + si * 3600000),
      });
    }

    // Wallet entries for completed/paid orders
    if (os.paymentStatus === 'paid' || os.paymentStatus === 'refunded') {
      const [walletAcct] = await db.select().from(s.walletAccounts).where(eq(s.walletAccounts.storeId, store.id)).limit(1);
      if (walletAcct) {
        const amt = os.paymentStatus === 'refunded' ? `-${String(total)}` : String(total);
        await db.insert(s.walletEntries).values({
          storeId: store.id, walletAccountId: walletAcct.id,
          type: 'sale_credit', direction: 'credit',
          amount: amt, balanceBefore: '0', balanceAfter: amt,
          status: 'completed', referenceType: 'order', referenceId: order.id,
          description: os.paymentStatus === 'refunded' ? `استرجاع الطلب ${orderNumber}` : `مبيعات الطلب ${orderNumber}`,
          createdAt: orderDate,
        });
      }
    }

    // Shipment tracking for shipped/delivered/picked_up
    if (os.fulfillmentStatus === 'fulfilled' || os.status === 'shipped' || os.status === 'delivered') {
      const trackingNum = `HAA-MOCK-${String(3000 + oi)}`;
      const [shipment] = await db.insert(s.shipments).values({
        storeId: store.id, orderId: order.id,
        shippingMethodId: os.shipMethod === 'regular' ? regularMethod.id : os.shipMethod === 'express' ? expressMethod.id : pickupMethod.id,
        provider: 'manual', status: os.fulfillmentStatus === 'fulfilled' ? 'delivered' : 'shipped',
        carrierName: os.shipMethod === 'express' ? 'توصيل سريع' : 'توصيل عادي',
        trackingNumber: trackingNum,
        trackingUrl: `https://track.haa-demo.com/${trackingNum}`,
        shippingCost: String(shippingCost), customerFee: String(shippingCost),
        recipientName: customerRecords[os.customer].name,
        recipientPhone: customerRecords[os.customer].phone,
        address: { street: customerData[os.customer].street, district: customerData[os.customer].district, city: os.city, country: 'Saudi Arabia' },
        shippedAt: os.daysAgo > 3 ? new Date(orderDate.getTime() - 86400000) : null,
        deliveredAt: os.fulfillmentStatus === 'fulfilled' ? orderDate : null,
        createdAt: orderDate,
      }).returning();

      if (os.fulfillmentStatus === 'fulfilled') {
        await db.insert(s.shipmentTrackingEvents).values([
          { shipmentId: shipment.id, status: 'picked_up', location: os.city, description: 'تم استلام الشحنة من المتجر', occurredAt: new Date(orderDate.getTime() - 86400000 * 3) },
          { shipmentId: shipment.id, status: 'in_transit', location: 'مركز الفرز', description: 'الشحنة في مركز الفرز', occurredAt: new Date(orderDate.getTime() - 86400000 * 2) },
          { shipmentId: shipment.id, status: 'out_for_delivery', location: os.city, description: 'الشحنة في طريقها للتوصيل', occurredAt: new Date(orderDate.getTime() - 86400000) },
          { shipmentId: shipment.id, status: 'delivered', location: os.city, description: 'تم تسليم الشحنة بنجاح', occurredAt: orderDate },
        ]);
      } else if (os.status === 'shipped') {
        await db.insert(s.shipmentTrackingEvents).values([
          { shipmentId: shipment.id, status: 'picked_up', location: os.city, description: 'تم استلام الشحنة من المتجر', occurredAt: new Date(orderDate.getTime() - 86400000) },
          { shipmentId: shipment.id, status: 'in_transit', location: 'مركز الفرز', description: 'الشحنة في مركز الفرز', occurredAt: orderDate },
        ]);
      }
    }
  }
  console.log(`  ✓ ${orderStates.length} Orders created with items and tracking`);

  // ── Coupons ─────────────────────────────────────────
  const couponsData = [
    { code: 'PERFUME10', name: 'خصم 10%', desc: 'خصم 10% على جميع منتجات المتجر بحد أقصى 50 ريال', type: 'percentage', value: '10', minAmount: '100', maxUses: 50, used: 3, maxDiscount: '50', active: true },
    { code: 'GIFT25', name: 'خصم 25 ريال', desc: 'خصم 25 ريال على أي طلب', type: 'fixed', value: '25', minAmount: '150', maxUses: 30, used: 2, active: true },
    { code: 'LUXURY15', name: 'خصم 15%', desc: 'خصم 15% على العطور الفاخرة بقيمة 200+', type: 'percentage', value: '15', minAmount: '200', maxUses: 20, used: 1, maxDiscount: '100', active: true },
    { code: 'FREESHIP', name: 'شحن مجاني', desc: 'شحن مجاني للطلبات فوق 250 ريال', type: 'free_shipping', value: '0', minAmount: '250', maxUses: 25, used: 0, active: true },
  ];
  for (const c of couponsData) {
    await db.insert(s.coupons).values({
      storeId: store.id, code: c.code, name: c.name, description: c.desc,
      type: c.type, value: c.value,
      maxDiscountAmount: (c as any).maxDiscount || null,
      minOrderAmount: c.minAmount || null,
      maxUses: c.maxUses || null, usedCount: c.used,
      startsAt: new Date(now.getTime() - 30 * 86400000),
      expiresAt: new Date(now.getTime() + 365 * 86400000),
      isActive: c.active,
    });
  }
  console.log(`  ✓ ${couponsData.length} Coupons created`);

  // ── Promotions ──────────────────────────────────────
  const promotionsData = [
    { name: 'عروض العود', desc: 'خصم 20% على جميع منتجات العود', type: 'percentage', value: '20', appliesTo: 'category', appliesToId: cats['oud-incense'] },
    { name: 'هدية مع كل طلب', desc: 'هدية عطر مصغر مع كل طلب فوق 500 ريال', type: 'fixed', value: '0', appliesTo: 'all', appliesToId: null },
    { name: 'تخفيضات العطور النسائية', desc: 'خصم 15% على العطور النسائية', type: 'percentage', value: '15', appliesTo: 'category', appliesToId: cats['womens-perfumes'] },
  ];
  for (const p of promotionsData) {
    await db.insert(s.promotions).values({
      storeId: store.id, name: p.name, description: p.desc,
      type: p.type, value: p.value,
      appliesTo: p.appliesTo, appliesToId: p.appliesToId ?? undefined,
      startsAt: new Date(now.getTime() - 15 * 86400000),
      endsAt: new Date(now.getTime() + 45 * 86400000),
      isActive: true,
    });
  }
  console.log(`  ✓ ${promotionsData.length} Promotions created`);

  // ── Store Policies ──────────────────────────────────
  const policiesData = [
    { type: 'about', title: 'من نحن', content: 'عطور هاء الفاخرة هو متجر إلكتروني تجريبي متخصص في تقديم أجود أنواع العطور الشرقية والغربية والعود والبخور والزيوت العطرية. نحرص على تقديم تجربة تسوق فاخرة لعملائنا من خلال تشكيلة منتقاة بعناية من أفضل الماركات والمنتجات العطرية.\n\nهذا المتجر هو نسخة تجريبية لأغراض العرض والتقييم.' },
    { type: 'privacy', title: 'سياسة الخصوصية', content: 'هذه السياسة خاصة بالمتجر التجريبي. نحن نلتزم بحماية بيانات زوار المتجر التجريبي. جميع البيانات المستخدمة هي بيانات وهمية لأغراض تجريبية فقط.' },
    { type: 'returns', title: 'سياسة الاستبدال والاسترجاع', content: 'في المتجر التجريبي، يمكن إرجاع المنتجات خلال 7 أيام من تاريخ الاستلام بشرط أن تكون بحالتها الأصلية ولم يتم استخدامها. للإرجاع، يرجى التواصل معنا عبر البريد الإلكتروني.' },
    { type: 'shipping', title: 'سياسة الشحن والتوصيل', content: 'نوفر الشحن لجميع مدن المملكة العربية السعودية. مدة التوصيل تتراوح بين 3-5 أيام عمل للمناطق الرئيسية. التوصيل السريع متاح في الرياض وجدة والدمام خلال 1-2 يوم عمل.\n\nالشحن مجاني للطلبات التي تتجاوز قيمتها 299 ريالاً سعودياً.' },
    { type: 'terms', title: 'الشروط والأحكام', content: 'هذا متجر تجريبي. جميع المنتجات والأسعار والبيانات هي لأغراض تجريبية وعرضية فقط. باستخدامك لهذا المتجر، فإنك توافق على أن جميع المعلومات المعروضة هي لأغراض تجريبية.' },
  ];
  for (const pol of policiesData) {
    await db.insert(s.storePolicies).values({
      storeId: store.id, type: pol.type, title: pol.title, content: pol.content, isPublished: true,
    });
  }
  console.log(`  ✓ ${policiesData.length} Store Policies created`);

  // ── Wallet Account ─────────────────────────────────
  await db.insert(s.walletAccounts).values({
    storeId: store.id, balance: '0', pendingBalance: '0', availableBalance: '0',
  });
  console.log('  ✓ Wallet account created');

  // ── Permissions & Role ─────────────────────────────
  const allPermissionNames = [
    'products:read', 'products:create', 'products:update', 'products:delete',
    'orders:read', 'orders:create', 'orders:update_status',
    'customers:read', 'customers:create', 'customers:update',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'brands:read', 'brands:create', 'brands:update', 'brands:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'coupons:read', 'coupons:create', 'coupons:update', 'coupons:delete',
    'reports:read', 'settings:read', 'settings:update',
    'wallet:read', 'wallet:request_payout',
    'exports:create', 'imports:create', 'compliance:read',
  ];
  const permissionRecords: { id: number }[] = [];
  for (const pn of allPermissionNames) {
    let [rec] = await db.select().from(s.permissions).where(eq(s.permissions.name, pn)).limit(1);
    if (!rec) {
      [rec] = await db.insert(s.permissions).values({ name: pn, label: pn }).onConflictDoNothing().returning();
    }
    if (rec) permissionRecords.push(rec);
  }
  const [adminRole] = await db.insert(s.roles).values({
    storeId: store.id, name: 'admin', description: 'مدير المتجر — صلاحيات كاملة',
  }).returning();
  for (const p of permissionRecords) {
    await db.insert(s.rolePermissions).values({ roleId: adminRole.id, permissionId: p.id });
  }
  // Assign admin role to merchant only (NOT customer)
  if (perfumeDemoMerchant) {
    const existingMerchantRole = await db.select().from(s.userStoreRoles).where(and(eq(s.userStoreRoles.userId, perfumeDemoMerchant.id), eq(s.userStoreRoles.storeId, store.id))).limit(1);
    if (!existingMerchantRole[0]) {
      await db.insert(s.userStoreRoles).values({ userId: perfumeDemoMerchant.id, storeId: store.id, roleId: adminRole.id });
    }
  }

  // Ensure customer does NOT have admin role
  if (perfumeDemoCustomer) {
    const existingCustomerRole = await db.select().from(s.userStoreRoles).where(and(eq(s.userStoreRoles.userId, perfumeDemoCustomer.id), eq(s.userStoreRoles.storeId, store.id))).limit(1);
    if (existingCustomerRole[0]) {
      await db.delete(s.userStoreRoles).where(and(eq(s.userStoreRoles.userId, perfumeDemoCustomer.id), eq(s.userStoreRoles.storeId, store.id)));
    }
  }
  console.log(`  ✓ Permissions & Role setup`);

  // ── Marketing Events (demo insights) ────────────────
  // 1. Product with high views but low conversion
  const collectorProduct = productRecords['collector-luxury'];
  for (let day = 0; day < 14; day++) {
    const eventDate = new Date(now.getTime() - day * 86400000);
    // High views
    for (let v = 0; v < 30; v++) {
      await db.insert(s.marketingEvents).values({
        storeId: store.id, eventType: 'view_product', path: '/products/collector-luxury',
        productId: collectorProduct.id, createdAt: new Date(eventDate.getTime() + v * 3600000),
        sessionId: `demo-session-collector-${day}-${v}`,
        metadata: { productId: collectorProduct.id },
      });
    }
  }

  // 2. Abandoned carts (checkout sessions)
  for (let ai = 0; ai < 3; ai++) {
    const abandonedDate = new Date(now.getTime() - (ai + 1) * 86400000);
    await db.insert(s.checkoutSessions).values({
      storeId: store.id, cartId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(),
      status: 'pending', customerName: customerData[5 + ai].name,
      customerPhone: customerData[5 + ai].phone, customerEmail: customerData[5 + ai].email,
      shippingAddress: { street: customerData[5 + ai].street, city: customerData[5 + ai].city, country: 'Saudi Arabia' },
      subtotal: '399', total: '417', paymentMethod: null, paymentStatus: 'unpaid',
      expiresAt: new Date(abandonedDate.getTime() + 7 * 86400000),
      createdAt: abandonedDate,
    });

    await db.insert(s.marketingEvents).values({
      storeId: store.id, sessionId: `demo-abandoned-${ai}`,
      eventType: 'add_to_cart', path: '/checkout',
      createdAt: abandonedDate, metadata: { cartValue: '399' },
    });
  }

  // 3. Source traffic without purchase
  for (let si = 0; si < 5; si++) {
    await db.insert(s.marketingSessions).values({
      storeId: store.id, sessionId: `demo-traffic-${si}`,
      utmSource: ['instagram', 'snapchat', 'twitter', 'google', 'tiktok'][si],
      utmMedium: 'social', landingPage: '/', firstEventAt: new Date(now.getTime() - si * 86400000),
      lastEventAt: new Date(now.getTime() - si * 86400000 + 3600000),
    });
  }

  // 4. Low stock product
  // oud-riyadh already has stock=25, but let's set a performance marker
  await db.insert(s.productPerformanceDaily).values({
    storeId: store.id, productId: productRecords['oud-riyadh'].id,
    date: new Date(now.getTime() - 86400000).toISOString().slice(0, 10), views: 45, addToCarts: 12, purchases: 3, revenue: '1797',
  });

  // 5. Promotion that needs improvement
  // The special-offers category promotion has low engagement
  await db.insert(s.marketingEvents).values({
    storeId: store.id, sessionId: 'demo-promotion-needs-work',
    eventType: 'view_category', path: '/categories/special-offers',
    createdAt: new Date(now.getTime() - 86400000),
    metadata: { categoryId: cats['special-offers'], views: 200, clicks: 5 },
  });

  console.log('  ✓ Marketing data created (high views product, abandoned carts, traffic sources, low stock)');

  console.log('\n✅ Perfume demo store seeded successfully!');
  console.log(`\n📦 Store URL: /s/${DEMO_SLUG}`);
  console.log(`📋 Demo Profile: perfume`);
  console.log(`📋 Seed Version: ${DEMO_SEED_VERSION}`);
  console.log(`\n🧪 ${productsData.length} Products | ${customerData.length} Customers | ${orderStates.length} Orders | ${couponsData.length} Coupons | ${catDefs.length} Categories`);
  process.exit(0);
}

seedPerfumeDemo().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Perfume demo seed failed:', err);
  process.exit(1);
});
