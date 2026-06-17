import 'dotenv/config';
import { createDbClient } from '../index.js';
import * as s from '../schema/index.js';
import { hashPassword } from '@haa/auth-core';
import { eq, and } from 'drizzle-orm';

async function seed() {
  const db = createDbClient();
  console.log('🌱 Seeding database...');

  const now = new Date();

  const existingPlans = await db.select().from(s.subscriptionPlans).limit(1);
  if (existingPlans.length === 0) {
    const plansData = [
      { name: 'Starter (مجاني)', code: 'starter', description: 'الخطة الأساسية المجانية', priceMonthly: '0', priceAnnual: '0', productLimit: 10, staffLimit: 1, storageLimitMb: 100, orderLimit: -1, trialDays: 0, sortOrder: 1 },
      { name: 'Growth (نمو)', code: 'growth', description: 'خطة النمو للشركات الصغيرة', priceMonthly: '99', priceAnnual: '950.40', productLimit: 100, staffLimit: 3, storageLimitMb: 1024, orderLimit: -1, trialDays: 14, sortOrder: 2 },
      { name: 'Professional (احتراف)', code: 'professional', description: 'خطة احترافية للشركات المتوسطة', priceMonthly: '249', priceAnnual: '2390.40', productLimit: 500, staffLimit: 10, storageLimitMb: 5120, orderLimit: -1, trialDays: 14, sortOrder: 3 },
      { name: 'Business (أعمال)', code: 'business', description: 'خطة الأعمال الشاملة', priceMonthly: '499', priceAnnual: '4790.40', productLimit: -1, staffLimit: -1, storageLimitMb: 20480, orderLimit: -1, trialDays: 14, sortOrder: 4 },
    ];
    for (const plan of plansData) {
      await db.insert(s.subscriptionPlans).values(plan as any);
    }
    console.log(`  ✓ ${plansData.length} Subscription Plans created`);
  }

  const existingTenant = await db.select().from(s.tenants).where(eq(s.tenants.slug, 'haa-stores')).limit(1);
  if (existingTenant.length > 0) {
    const [store] = await db.select().from(s.stores).where(eq(s.stores.slug, 'haa-demo')).limit(1);
    if (store) {
      const existingSub = await db.select().from(s.merchantSubscriptions).where(eq(s.merchantSubscriptions.storeId, store.id)).limit(1);
      if (existingSub.length === 0) {
        const [starterPlan] = await db.select().from(s.subscriptionPlans).where(eq(s.subscriptionPlans.code, 'starter')).limit(1);
        if (starterPlan) {
          await db.insert(s.merchantSubscriptions).values({
            storeId: store.id,
            planId: starterPlan.id,
            status: 'active',
            billingCycle: 'monthly',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
            trialEnd: null,
          });
          console.log('  ✓ Store assigned to Starter plan');
        }
      }
    }
    console.log('  ✓ Seed data already exists, skipping');

    // ── Notification Templates (always seeded) ──────────
    const templates = [
      { code: 'order_created', name: 'طلب جديد', channel: 'email', subjectTemplate: 'طلب جديد #{{orderNumber}}', bodyTemplate: 'تم استلام طلب جديد رقم {{orderNumber}} بقيمة {{total}} ر.س\n{{fulfillmentSummary}}\n\n{{itemsList}}' },
      { code: 'payment_success', name: 'دفع ناجح', channel: 'email', subjectTemplate: 'تم الدفع #{{orderNumber}}', bodyTemplate: 'تم تأكيد الدفع للطلب رقم {{orderNumber}} بقيمة {{amount}} ر.س\n{{fulfillmentSummary}}\n{{giftSummary}}\n\n{{itemsList}}' },
      { code: 'payment_failed', name: 'فشل الدفع', channel: 'email', subjectTemplate: 'فشل الدفع #{{orderNumber}}', bodyTemplate: 'فشلت عملية الدفع للطلب رقم {{orderNumber}}' },
      { code: 'shipping_update', name: 'تحديث الشحن', channel: 'email', subjectTemplate: 'تحديث الشحن #{{orderNumber}}', bodyTemplate: 'تم تحديث حالة الشحن للطلب رقم {{orderNumber}} إلى {{status}}' },
      { code: 'low_stock', name: 'مخزون منخفض', channel: 'email', subjectTemplate: 'تنبيه مخزون منخفض', bodyTemplate: 'المنتج {{productName}} وصل إلى حد المخزون المنخفض ({{stock}})' },
      { code: 'abandoned_cart', name: 'سلة متروكة', channel: 'email', subjectTemplate: 'سلتك في انتظارك', bodyTemplate: 'لاحظنا أن لديك سلعة في سلتك. أكمل طلبك الآن!' },
      { code: 'order_ready_for_pickup', name: 'الطلب جاهز للاستلام', channel: 'email', subjectTemplate: 'طلبك جاهز للاستلام #{{orderNumber}}', bodyTemplate: 'طلبك رقم {{orderNumber}} جاهز للاستلام من فرع {{branchName}} 🎉\n\nيرجى التوجه إلى الفرع لاستلام طلبك.' },
      { code: 'order_picked_up', name: 'تم استلام الطلب', channel: 'email', subjectTemplate: 'تم استلام الطلب #{{orderNumber}}', bodyTemplate: 'تم استلام طلبك رقم {{orderNumber}} من فرع {{branchName}}.\n\nشكرًا لتسوقك معنا!' },
    ];
    for (const tpl of templates) {
      await db.insert(s.notificationTemplates).values(tpl).onConflictDoNothing();
    }
    console.log(`  ✓ ${templates.length} Notification Templates created`);

    console.log('\n✅ Seed completed successfully (idempotent skip)');
    console.log('\n📋 Login credentials:');
    console.log('   haa-demo:         customer.haa-demo@example.com / Test@123456');
    console.log('   demo-perfumes:    customer.perfumes@example.com / Test@123456');
    process.exit(0);
  }

  // ── Tenant ──────────────────────────────────────────
  const [tenant] = await db.insert(s.tenants).values({
    name: 'هاء للمتاجر',
    slug: 'haa-stores',
    email: 'info@haa-stores.com',
    phone: '966500000000',
  }).returning();
  console.log(`  ✓ Tenant created: ${tenant.name}`);

  // ── User ────────────────────────────────────────────
  const passwordHash = await hashPassword('Test@123456');
  const [adminUser] = await db.insert(s.users).values({
    name: 'مسؤول المنصة',
    email: 'admin@example.com',
    passwordHash,
    phone: '966500000000',
    isAdmin: true,
  }).returning();
  console.log(`  ✓ Admin user created: ${adminUser.email}`);

  // ── Demo Merchant for haa-demo (admin access) ───────
  const [haaDemoMerchant] = await db.insert(s.users).values({
    name: 'تاجر هاء التجريبي',
    email: 'merchant.haa-demo@example.com',
    passwordHash,
    phone: '966500000001',
  }).returning();
  console.log(`  ✓ haa-demo merchant user created: ${haaDemoMerchant.email}`);

  // ── Demo Customer for haa-demo (storefront only) ────
  const [haaDemoCustomer] = await db.insert(s.users).values({
    name: 'عميل هاء التجريبي',
    email: 'customer.haa-demo@example.com',
    passwordHash,
    phone: '966500000002',
  }).returning();
  console.log(`  ✓ haa-demo customer user created: ${haaDemoCustomer.email}`);

  // ── Demo Merchant for demo-perfumes (admin access) ──
  const [perfumeDemoMerchant] = await db.insert(s.users).values({
    name: 'تاجر العطور التجريبي',
    email: 'merchant.perfumes@example.com',
    passwordHash,
    phone: '966500000011',
  }).returning();
  console.log(`  ✓ demo-perfumes merchant user created: ${perfumeDemoMerchant.email}`);

  // ── Demo Customer for demo-perfumes (storefront only) ──
  const [perfumeDemoCustomer] = await db.insert(s.users).values({
    name: 'عميل العطور التجريبي',
    email: 'customer.perfumes@example.com',
    passwordHash,
    phone: '966500000012',
  }).returning();
  console.log(`  ✓ demo-perfumes customer user created: ${perfumeDemoCustomer.email}`);

  // ── Tenant-User (merchants are tenant owners) ───────
  await db.insert(s.tenantUsers).values([
    { tenantId: tenant.id, userId: haaDemoMerchant.id, role: 'owner' },
    { tenantId: tenant.id, userId: perfumeDemoMerchant.id, role: 'owner' },
  ]);

  // ── Store ───────────────────────────────────────────
  const [store] = await db.insert(s.stores).values({
    tenantId: tenant.id,
    name: 'متجر هاء التجريبي',
    slug: 'haa-demo',
    description: 'متجر تجريبي يعرض منتجات متنوعة من إلكترونيات وملابس ومستلزمات المنزل',
    email: 'store@haa-demo.com',
    phone: '966500000002',
    primaryColor: '#58a1e2',
    backgroundColor: '#ffffff',
    isDemo: true,
    demoProfile: 'main',
    demoSeedVersion: '2026-06-initial-v1',
    publishStatus: 'published',
    policies: {
      about: 'متجر هاء التجريبي هو متجر إلكتروني سعودي يقدم تشكيلة واسعة من المنتجات عالية الجودة',
      privacy: 'نحترم خصوصية عملائنا ونلتزم بحماية بياناتهم الشخصية',
      returns: 'يمكن إرجاع المنتجات خلال 14 يومًا من تاريخ الاستلام بشرط أن تكون بحالتها الأصلية',
      shipping: 'نوفر الشحن لجميع مدن المملكة عبر شركات شحن موثوقة',
      terms: 'باستخدامك للمتجر فإنك توافق على هذه الشروط والأحكام',
      contact: 'يمكنك التواصل معنا عبر البريد الإلكتروني أو الهاتف',
    },
  }).returning();
  console.log(`  ✓ Store created: ${store.slug}`);

  // ── Store Settings ──────────────────────────────────
  await db.insert(s.storeSettings).values({
    storeId: store.id,
  });

  // ── Subscription Plans ──────────────────────────────
  const plansData = [
    { name: 'Starter (مجاني)', code: 'starter', description: 'الخطة الأساسية المجانية', priceMonthly: '0', priceAnnual: '0', productLimit: 10, staffLimit: 1, storageLimitMb: 100, orderLimit: -1, trialDays: 0, sortOrder: 1 },
    { name: 'Growth (نمو)', code: 'growth', description: 'خطة النمو للشركات الصغيرة', priceMonthly: '99', priceAnnual: '950.40', productLimit: 100, staffLimit: 3, storageLimitMb: 1024, orderLimit: -1, trialDays: 14, sortOrder: 2 },
    { name: 'Professional (احتراف)', code: 'professional', description: 'خطة احترافية للشركات المتوسطة', priceMonthly: '249', priceAnnual: '2390.40', productLimit: 500, staffLimit: 10, storageLimitMb: 5120, orderLimit: -1, trialDays: 14, sortOrder: 3 },
    { name: 'Business (أعمال)', code: 'business', description: 'خطة الأعمال الشاملة', priceMonthly: '499', priceAnnual: '4790.40', productLimit: -1, staffLimit: -1, storageLimitMb: 20480, orderLimit: -1, trialDays: 14, sortOrder: 4 },
  ];

  const planRecords: { id: number; code: string }[] = [];
  for (const plan of plansData) {
    const [row] = await db.insert(s.subscriptionPlans).values(plan as any).returning();
    planRecords.push({ id: row.id, code: row.code });
  }
  console.log(`  ✓ ${plansData.length} Subscription Plans created`);

  // ── Store Subscription ──────────────────────────────
  const starterPlan = planRecords.find(p => p.code === 'starter')!;
  await db.insert(s.merchantSubscriptions).values({
    storeId: store.id,
    planId: starterPlan.id,
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
    trialEnd: null,
  });
  console.log('  ✓ Store assigned to Starter plan');

  // ── Categories ─────────────────────────────────────
  const catData = [
    { name: 'إلكترونيات', slug: 'electronics', desc: 'أجهزة إلكترونية وكهربائية', order: 1, parent: null },
    { name: 'هواتف', slug: 'phones', desc: 'هواتف ذكية وأجهزة لوحية', order: 1, parent: 'electronics' },
    { name: 'لابتوبات', slug: 'laptops', desc: 'لابتوبات وأجهزة كمبيوتر', order: 2, parent: 'electronics' },
    { name: 'إكسسوارات', slug: 'accessories', desc: 'إكسسوارات إلكترونية', order: 3, parent: 'electronics' },
    { name: 'ملابس', slug: 'clothing', desc: 'ملابس وأزياء للرجال والنساء والأطفال', order: 2, parent: null },
    { name: 'رجالي', slug: 'mens', desc: 'ملابس رجالية', order: 1, parent: 'clothing' },
    { name: 'نسائي', slug: 'womens', desc: 'ملابس نسائية', order: 2, parent: 'clothing' },
    { name: 'أطفال', slug: 'kids-clothing', desc: 'ملابس أطفال', order: 3, parent: 'clothing' },
    { name: 'منزل ومطبخ', slug: 'home-kitchen', desc: 'منتجات المنزل والمطبخ', order: 3, parent: null },
    { name: 'أثاث', slug: 'furniture', desc: 'أثاث منزلي', order: 1, parent: 'home-kitchen' },
    { name: 'أجهزة منزلية', slug: 'home-appliances', desc: 'أجهزة كهربائية منزلية', order: 2, parent: 'home-kitchen' },
    { name: 'أدوات مطبخ', slug: 'kitchen-tools', desc: 'أدوات وأواني المطبخ', order: 3, parent: 'home-kitchen' },
    { name: 'عناية وجمال', slug: 'beauty-care', desc: 'منتجات العناية الشخصية والتجميل', order: 4, parent: null },
    { name: 'عطور', slug: 'perfumes', desc: 'عطور ومستحضرات تجميل', order: 1, parent: 'beauty-care' },
    { name: 'عناية بالبشرة', slug: 'skincare', desc: 'منتجات العناية بالبشرة', order: 2, parent: 'beauty-care' },
    { name: 'أطفال', slug: 'kids', desc: 'منتجات وألعاب للأطفال', order: 5, parent: null },
    { name: 'ألعاب', slug: 'toys', desc: 'ألعاب أطفال', order: 1, parent: 'kids' },
    { name: 'مستلزمات أطفال', slug: 'baby-gear', desc: 'مستلزمات الرضع والأطفال', order: 2, parent: 'kids' },
    { name: 'مكتبة', slug: 'library', desc: 'كتب وقرطاسية', order: 6, parent: null },
    { name: 'قرطاسية', slug: 'office-supplies', desc: 'أدوات مكتبية وقرطاسية', order: 1, parent: 'library' },
    { name: 'رياضة', slug: 'sports', desc: 'مستلزمات الرياضة واللياقة', order: 7, parent: null },
    { name: 'معدات رياضية', slug: 'sports-equipment', desc: 'أجهزة ومعدات رياضية', order: 1, parent: 'sports' },
    { name: 'ملابس رياضية', slug: 'activewear', desc: 'ملابس وأحذية رياضية', order: 2, parent: 'sports' },
  ];
  const cats: Record<string, { name: string; slug: string; desc: string; order: number; parent: string | null; id: number }> = {};
  const insertedCatSlugs: string[] = [];
  while (insertedCatSlugs.length < catData.length) {
    for (const c of catData) {
      if (insertedCatSlugs.includes(c.slug)) continue;
      if (c.parent && !insertedCatSlugs.includes(c.parent)) continue;
      const [row] = await db.insert(s.categories).values({
        storeId: store.id, name: c.name, slug: c.slug, description: c.desc,
        parentId: c.parent ? cats[c.parent]?.id ?? null : null,
        showInHome: true, showInMenu: true, sortOrder: c.order,
      }).returning();
      cats[c.slug] = { ...c, id: row.id };
      insertedCatSlugs.push(c.slug);
    }
  }
  console.log(`  ✓ ${catData.length} Categories created (with subcategories)`);

  // ── Products ────────────────────────────────────────
  const productsData = [
    { name: 'سماعة بلوتوث لاسلكية', slug: 'wireless-bluetooth-headphones', price: '199', cmp: '299', cat: 'electronics', sku: 'ELC-001', stock: 50, weight: 250, len: 16, wid: 8, hei: 4, fragile: false, desc: 'سماعة بلوتوث لاسلكية عالية الجودة مع عزل للضوضاء وتقنية HD، تدوم البطارية حتى 20 ساعة' },
    { name: 'ساعة ذكية رياضية', slug: 'smart-watch', price: '599', cmp: '799', cat: 'electronics', sku: 'ELC-002', stock: 30, weight: 80, len: 5, wid: 4, hei: 1, fragile: false, desc: 'ساعة ذكية رياضية متعددة الوظائف مع مراقبة معدل ضربات القلب وعداد الخطى ومقاومة الماء' },
    { name: 'شاحن متنقل 10000mAh', slug: 'power-bank-10000', price: '89', cmp: null, cat: 'electronics', sku: 'ELC-003', stock: 100, weight: 200, len: 10, wid: 6, hei: 2, fragile: false, desc: 'شاحن متنقل سعة 10000mAh مع منفذي USB ومنفذ Type-C، شحن سريع وآمن' },
    { name: 'سماعة أذن لاسلكية', slug: 'wireless-earbuds', price: '149', cmp: '199', cat: 'electronics', sku: 'ELC-004', stock: 75, weight: 50, len: 6, wid: 5, hei: 3, fragile: false, desc: 'سماعة أذن لاسلكية بتقنية بلوتوث 5.3 مع علبة شحن محمولة' },
    { name: 'كاميرا مراقبة منزلية', slug: 'home-camera', price: '349', cmp: '449', cat: 'electronics', sku: 'ELC-005', stock: 25, weight: 300, len: 12, wid: 8, hei: 8, fragile: true, desc: 'كاميرا مراقبة منزلية ذكية بدقة 1080p مع رؤية ليلية وتقنية AI' },
    { name: 'تيشيرت قطني', slug: 'cotton-t-shirt', price: '79', cmp: null, cat: 'clothing', sku: 'CLT-001', stock: 200, weight: 150, len: 30, wid: 20, hei: 2, fragile: false, desc: 'تيشيرت قطني 100% مريح وناعم، مناسب للاستخدام اليومي، متعدد الألوان' },
    { name: 'حقيبة ظهر عصرية', slug: 'modern-backpack', price: '249', cmp: '329', cat: 'clothing', sku: 'CLT-002', stock: 40, weight: 400, len: 45, wid: 30, hei: 15, fragile: false, desc: 'حقيبة ظهر عصرية عملية، مقاومة للماء بجيوب متعددة تناسب العمل والسفر' },
    { name: 'جاكيت شتوي رجالي', slug: 'winter-jacket', price: '399', cmp: '599', cat: 'clothing', sku: 'CLT-003', stock: 35, weight: 800, len: 55, wid: 40, hei: 5, fragile: false, desc: 'جاكيت شتوي رجالي دافئ ومريح، مصنوع من خامات عالية الجودة مع بطانة صوفية' },
    { name: 'طقم قدور جرانيت 10 قطع', slug: 'granite-pot-set', price: '449', cmp: '599', cat: 'home-kitchen', sku: 'HOM-001', stock: 15, weight: 5000, len: 50, wid: 40, hei: 30, fragile: true, desc: 'طقم قدور جرانيت 10 قطع عالي الجودة، توزيع مثالي للحرارة، مناسب لجميع المواقد' },
    { name: 'مفرش طاولة معقم', slug: 'table-cover-set', price: '129', cmp: null, cat: 'home-kitchen', sku: 'HOM-002', stock: 60, weight: 300, len: 35, wid: 25, hei: 3, fragile: false, desc: 'مفرش طاولة معقم مع 6 مفارش فردية، سهل التنظيف ومناسب للاستخدام اليومي' },
    { name: 'مكتبة منزلية 3 أرفف', slug: 'home-bookshelf-3', price: '329', cmp: '399', cat: 'home-kitchen', sku: 'HOM-003', stock: 20, weight: 8000, len: 90, wid: 30, hei: 100, fragile: true, desc: 'مكتبة منزلية 3 أرفف عملية، تصميم عصري يناسب أي ديكور منزلي' },
    { name: 'خلاط كهربائي', slug: 'electric-blender', price: '179', cmp: null, cat: 'home-kitchen', sku: 'HOM-004', stock: 45, weight: 1500, len: 25, wid: 20, hei: 40, fragile: true, desc: 'خلاط كهربائي بقوة 500 واط، 2 سرعة، مع وعاء زجاجي سعة 1.5 لتر' },
    { name: 'كريم مرطب للوجه', slug: 'face-moisturizer', price: '89', cmp: null, cat: 'beauty-care', sku: 'BEA-001', stock: 120, weight: 100, len: 6, wid: 6, hei: 8, fragile: false, desc: 'كريم مرطب للوجه بخلاصة الصبار وفيتامين E، مناسب لجميع أنواع البشرة' },
    { name: 'عطر فرنسي فاخر 50ml', slug: 'french-perfume-50', price: '299', cmp: '449', cat: 'beauty-care', sku: 'BEA-002', stock: 40, weight: 150, len: 5, wid: 5, hei: 12, fragile: true, desc: 'عطر فرنسي فاخر برائحة زهرية خشبية، يدوم طويلاً، عبوة 50 مل' },
    { name: 'طقم ألعاب تعليمية للأطفال', slug: 'educational-toys-set', price: '149', cmp: null, cat: 'kids', sku: 'KID-001', stock: 60, weight: 500, len: 30, wid: 20, hei: 10, fragile: false, desc: 'طقم ألعاب تعليمية للأطفال من 3-6 سنوات، ينمي المهارات الحركية والذهنية' },
    { name: 'حقيبة مدرسية للأطفال', slug: 'kids-school-bag', price: '119', cmp: '159', cat: 'kids', sku: 'KID-002', stock: 80, weight: 350, len: 35, wid: 25, hei: 12, fragile: false, desc: 'حقيبة مدرسية مريحة للأطفال مع رسومات كرتونية، خفيفة الوزن ومقاومة للماء' },
    { name: 'كتاب تطوير الذات', slug: 'self-development-book', price: '69', cmp: null, cat: 'library', sku: 'BOK-001', stock: 150, weight: 300, len: 22, wid: 15, hei: 2, fragile: false, desc: 'كتاب تطوير الذات وبناء الشخصية، يقدم استراتيجيات عملية للنجاح في الحياة' },
    { name: 'مفكرة يومية', slug: 'daily-planner', price: '45', cmp: null, cat: 'library', sku: 'BOK-002', stock: 200, weight: 200, len: 21, wid: 15, hei: 1, fragile: false, desc: 'مفكرة يومية منظمة مع تقويم وأقسام للملاحظات والأهداف' },
    { name: 'حذاء رياضي رجالي', slug: 'sports-shoes', price: '349', cmp: '499', cat: 'sports', sku: 'SPT-001', stock: 45, weight: 800, len: 32, wid: 20, hei: 12, fragile: false, desc: 'حذاء رياضي رجالي مريح، نعل مبطن لتقليل الصدمات، مناسب للجري والمشي' },
    { name: 'حبل قفز قابل للتعديل', slug: 'jump-rope', price: '39', cmp: null, cat: 'sports', sku: 'SPT-002', stock: 120, weight: 150, len: 25, wid: 10, hei: 3, fragile: false, desc: 'حبل قفز قابل للتعديل مع مقابض مبطنة، مثالي للتمارين المنزلية' },
  ];

  // ── Brands ─────────────────────────────────────────
  const brandsData = [
    { name: 'سامسونج', slug: 'samsung', logo: 'https://placehold.co/100x100/1428a0/ffffff?text=Samsung', desc: 'إلكترونيات سامسونج', sortOrder: 1 },
    { name: 'أبل', slug: 'apple', logo: 'https://placehold.co/100x100/000000/ffffff?text=Apple', desc: 'منتجات أبل', sortOrder: 2 },
    { name: 'نايك', slug: 'nike', logo: 'https://placehold.co/100x100/ea1d2c/ffffff?text=Nike', desc: 'ملابس وأحذية رياضية', sortOrder: 3 },
    { name: 'سيروم', slug: 'serum', logo: 'https://placehold.co/100x100/0d8b4d/ffffff?text=Serum', desc: 'منتجات العناية بالبشرة', sortOrder: 4 },
    { name: 'سوني', slug: 'sony', logo: 'https://placehold.co/100x100/7b2d8e/ffffff?text=Sony', desc: 'إلكترونيات سوني', sortOrder: 5 },
  ];
  const brandRecords: Record<string, number> = {};
  for (const b of brandsData) {
    const [row] = await db.insert(s.brands).values({
      storeId: store.id, name: b.name, slug: b.slug, logo: b.logo,
      description: b.desc, sortOrder: b.sortOrder, isActive: true,
    }).returning();
    brandRecords[b.slug] = row.id;
  }
  console.log(`  ✓ ${brandsData.length} Brands created`);

  // ── Tags ────────────────────────────────────────────
  const tagsData = [
    { name: 'تخفيضات', slug: 'sale', color: '#ef4444', sortOrder: 1 },
    { name: 'جديد', slug: 'new', color: '#22c55e', sortOrder: 2 },
    { name: 'الأكثر مبيعاً', slug: 'bestseller', color: '#f59e0b', sortOrder: 3 },
    { name: 'مخزون محدود', slug: 'limited', color: '#ec4899', sortOrder: 4 },
    { name: 'توصيل مجاني', slug: 'free-shipping', color: '#3b82f6', sortOrder: 5 },
    { name: 'حصري', slug: 'exclusive', color: '#a855f7', sortOrder: 6 },
    { name: 'عرض خاص', slug: 'special-offer', color: '#f97316', sortOrder: 7 },
    { name: 'موسمي', slug: 'seasonal', color: '#14b8a6', sortOrder: 8 },
  ];
  const tagRecords: Record<string, number> = {};
  for (const t of tagsData) {
    const [row] = await db.insert(s.tags).values({
      storeId: store.id, name: t.name, slug: t.slug, color: t.color, sortOrder: t.sortOrder,
    }).returning();
    tagRecords[t.slug] = row.id;
  }
  console.log(`  ✓ ${tagsData.length} Tags created`);

  // ── Product-Tag assignments ─────────────────────────
  const productTagAssignments: Record<string, string[]> = {
    'wireless-bluetooth-headphones': ['new', 'bestseller'],
    'smart-watch': ['new', 'bestseller', 'sale'],
    'power-bank-10000': ['sale'],
    'wireless-earbuds': ['new', 'free-shipping'],
    'home-camera': ['new', 'exclusive'],
    'cotton-t-shirt': ['bestseller'],
    'modern-backpack': ['sale', 'free-shipping'],
    'winter-jacket': ['seasonal', 'limited'],
    'granite-pot-set': ['bestseller'],
    'face-moisturizer': ['new', 'exclusive'],
    'french-perfume-50': ['special-offer', 'sale'],
    'sports-shoes': ['new', 'bestseller', 'sale'],
    'jump-rope': ['free-shipping', 'sale'],
  };

  const brandMapBySlug: Record<string, string | undefined> = {
    'wireless-bluetooth-headphones': 'samsung',
    'smart-watch': 'samsung',
    'power-bank-10000': 'sony',
    'wireless-earbuds': 'sony',
    'home-camera': 'samsung',
    'cotton-t-shirt': undefined,
    'modern-backpack': undefined,
    'winter-jacket': undefined,
    'granite-pot-set': undefined,
    'table-cover-set': undefined,
    'home-bookshelf-3': undefined,
    'electric-blender': undefined,
    'face-moisturizer': 'serum',
    'french-perfume-50': undefined,
    'educational-toys-set': undefined,
    'kids-school-bag': undefined,
    'self-development-book': undefined,
    'daily-planner': undefined,
    'sports-shoes': 'nike',
    'jump-rope': 'nike',
  };

  const demoStats: Record<string, { rating: number; reviewCount: number; salesCount: number }> = {
    'wireless-bluetooth-headphones':     { rating: 4, reviewCount: 128, salesCount: 2340 },
    'smart-watch':                       { rating: 5, reviewCount: 312, salesCount: 4560 },
    'power-bank-10000':                  { rating: 3, reviewCount: 45,  salesCount: 890 },
    'wireless-earbuds':                  { rating: 4, reviewCount: 89,  salesCount: 1670 },
    'home-camera':                       { rating: 4, reviewCount: 67,  salesCount: 1230 },
    'cotton-t-shirt':                    { rating: 3, reviewCount: 210, salesCount: 5120 },
    'modern-backpack':                   { rating: 5, reviewCount: 156, salesCount: 2890 },
    'winter-jacket':                     { rating: 4, reviewCount: 93,  salesCount: 780 },
    'granite-pot-set':                   { rating: 5, reviewCount: 278, salesCount: 3450 },
    'table-cover-set':                   { rating: 3, reviewCount: 34,  salesCount: 560 },
    'home-bookshelf-3':                  { rating: 4, reviewCount: 112, salesCount: 1450 },
    'electric-blender':                  { rating: 4, reviewCount: 198, salesCount: 2780 },
    'face-moisturizer':                  { rating: 5, reviewCount: 445, salesCount: 6780 },
    'french-perfume-50':                 { rating: 5, reviewCount: 267, salesCount: 1890 },
    'educational-toys-set':              { rating: 4, reviewCount: 78,  salesCount: 920 },
    'kids-school-bag':                   { rating: 3, reviewCount: 56,  salesCount: 1340 },
    'self-development-book':             { rating: 4, reviewCount: 334, salesCount: 4560 },
    'daily-planner':                     { rating: 2, reviewCount: 23,  salesCount: 340 },
    'sports-shoes':                      { rating: 5, reviewCount: 423, salesCount: 7890 },
    'jump-rope':                         { rating: 4, reviewCount: 167, salesCount: 3450 },
  };

  const productRecords: Record<string, { id: number; price: string }> = {};
  for (const p of productsData) {
    const stats = demoStats[p.slug] ?? { rating: null, reviewCount: 0, salesCount: 0 };
    const [product] = await db.insert(s.products).values({
      storeId: store.id,
      name: p.name,
      slug: p.slug,
      description: p.desc,
      status: 'active',
      type: 'physical',
      price: p.price,
      compareAtPrice: p.cmp,
      sku: p.sku,
      stockQuantity: p.stock,
      trackInventory: true,
      weightGrams: p.weight,
      lengthCm: String(p.len),
      widthCm: String(p.wid),
      heightCm: String(p.hei),
      requiresShipping: true,
      isFragile: p.fragile,
      brandId: brandMapBySlug[p.slug] ? brandRecords[brandMapBySlug[p.slug]!] ?? null : null,
      seoTitle: `${p.name} - متجر هاء التجريبي`,
      seoDescription: `${p.desc.substring(0, 150)}`,
      rating: stats.rating,
      reviewCount: stats.reviewCount,
      salesCount: stats.salesCount,
    }).returning();
    productRecords[p.slug] = { id: product.id, price: p.price };

    await db.insert(s.productCategories).values({
      productId: product.id,
      categoryId: cats[p.cat].id,
    });

    const productTags = productTagAssignments[p.slug];
    if (productTags?.length) {
      await db.insert(s.productTags).values(
        productTags.map(tagSlug => ({ productId: product.id, tagId: tagRecords[tagSlug] }))
      );
    }

    await db.insert(s.productImages).values({
      productId: product.id,
      url: `https://placehold.co/600x600/e2e8f0/64748b?text=${encodeURIComponent(p.name)}`,
      alt: p.name,
      sortOrder: 0,
    });

    // Add a second image for some products
    if (['smart-watch', 'granite-pot-set', 'winter-jacket'].includes(p.slug)) {
      await db.insert(s.productImages).values({
        productId: product.id,
        url: `https://placehold.co/600x600/f0f0f0/64748b?text=${encodeURIComponent(p.name)}+2`,
        alt: `${p.name} - صورة إضافية`,
        sortOrder: 1,
      });
    }
  }
  console.log(`  ✓ ${productsData.length} Products created`);

  // ── Customers ───────────────────────────────────────
  const customerData = [
    { name: 'سارة الأحمد', phone: '966511111111', email: 'sara@example.com' },
    { name: 'محمد الغامدي', phone: '966522222222', email: 'mohammed@example.com' },
    { name: 'نورة القحطاني', phone: '966533333333', email: 'noura@example.com' },
    { name: 'فهد العنزي', phone: '966544444444', email: 'fahad@example.com' },
    { name: 'ريم الشمري', phone: '966555555555', email: 'reem@example.com' },
    { name: 'عبدالله المالكي', phone: '966566666666', email: 'abdullah@example.com' },
  ];

  const customerRecords: { id: number; name: string; phone: string }[] = [];
  for (const c of customerData) {
    const [customer] = await db.insert(s.customers).values({
      storeId: store.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
    }).returning();
    customerRecords.push(customer);

    await db.insert(s.customerAddresses).values({
      customerId: customer.id,
      label: 'المنزل',
      street: 'شارع الملك فهد',
      district: 'حي النرجس',
      city: ['الرياض', 'جدة', 'الدمام', 'الرياض', 'جدة', 'الخبر'][customerRecords.length - 1],
      country: 'Saudi Arabia',
      isDefault: true,
    });
  }
  console.log(`  ✓ ${customerData.length} Customers created`);

  // ── Shipping Setup (must be before orders/shipments) ──
  const [manualProvider] = await db.insert(s.shippingProviders).values({
    name: 'شحن يدوي',
    code: 'manual',
    isActive: true,
  }).returning();

  const [fixedMethod] = await db.insert(s.shippingMethods).values({
    storeId: store.id,
    name: 'شحن عادي',
    type: 'city_based',
    isActive: true,
    sortOrder: 1,
    estimatedDeliveryDays: '3-7 أيام عمل',
  }).returning();

  const [freeMethod] = await db.insert(s.shippingMethods).values({
    storeId: store.id,
    name: 'شحن مجاني',
    type: 'free_above',
    isActive: true,
    sortOrder: 2,
    estimatedDeliveryDays: '3-7 أيام عمل',
  }).returning();

  const [pickupMethod] = await db.insert(s.shippingMethods).values({
    storeId: store.id,
    name: 'استلام من المتجر',
    type: 'local_pickup',
    isActive: true,
    sortOrder: 3,
    estimatedDeliveryDays: 'فوري',
  }).returning();

  const [zoneRiyadh] = await db.insert(s.shippingZones).values({
    storeId: store.id,
    name: 'منطقة الرياض',
    cities: ['الرياض', 'الدرعية', 'المجمعة', 'الخرج', 'الدوادمي'],
    isActive: true,
  }).returning();

  const [zoneJeddah] = await db.insert(s.shippingZones).values({
    storeId: store.id,
    name: 'منطقة جدة',
    cities: ['جدة', 'مكة', 'الطائف', 'القنفذة'],
    isActive: true,
  }).returning();

  const [zoneDammam] = await db.insert(s.shippingZones).values({
    storeId: store.id,
    name: 'المنطقة الشرقية',
    cities: ['الدمام', 'الخبر', 'الظهران', 'الأحساء', 'القطيف', 'حفر الباطن'],
    isActive: true,
  }).returning();

  await db.insert(s.shippingRates).values([
    { shippingMethodId: fixedMethod.id, shippingZoneId: zoneRiyadh.id, baseRate: '20.00', estimatedDaysMin: 3, estimatedDaysMax: 5 },
    { shippingMethodId: fixedMethod.id, shippingZoneId: zoneJeddah.id, baseRate: '30.00', estimatedDaysMin: 3, estimatedDaysMax: 7 },
    { shippingMethodId: fixedMethod.id, shippingZoneId: zoneDammam.id, baseRate: '30.00', estimatedDaysMin: 3, estimatedDaysMax: 7 },
    { shippingMethodId: freeMethod.id, shippingZoneId: zoneRiyadh.id, baseRate: '0', freeAboveAmount: '300.00' },
    { shippingMethodId: freeMethod.id, shippingZoneId: zoneJeddah.id, baseRate: '0', freeAboveAmount: '300.00' },
    { shippingMethodId: freeMethod.id, shippingZoneId: zoneDammam.id, baseRate: '0', freeAboveAmount: '300.00' },
    { shippingMethodId: pickupMethod.id, shippingZoneId: zoneRiyadh.id, baseRate: '0' },
    { shippingMethodId: pickupMethod.id, shippingZoneId: zoneJeddah.id, baseRate: '0' },
    { shippingMethodId: pickupMethod.id, shippingZoneId: zoneDammam.id, baseRate: '0' },
  ]);
  console.log('  ✓ Shipping setup created (3 methods, 3 zones, 9 rates)');

  // ── Orders ──────────────────────────────────────────
  const orderStates = [
    { status: 'completed', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', daysAgo: 10, customer: 0, items: [0, 1], city: 'الرياض' },
    { status: 'completed', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', daysAgo: 7, customer: 1, items: [5, 6], city: 'جدة' },
    { status: 'shipped', paymentStatus: 'paid', fulfillmentStatus: 'unfulfilled', daysAgo: 3, customer: 2, items: [2], city: 'الدمام' },
    { status: 'processing', paymentStatus: 'paid', fulfillmentStatus: 'unfulfilled', daysAgo: 1, customer: 3, items: [8, 11], city: 'الرياض' },
    { status: 'confirmed', paymentStatus: 'unpaid', fulfillmentStatus: 'unfulfilled', daysAgo: 0, customer: 4, items: [12, 13], city: 'جدة' },
    { status: 'cancelled', paymentStatus: 'unpaid', fulfillmentStatus: 'unfulfilled', daysAgo: 5, customer: 5, items: [16], city: 'الخبر' },
    { status: 'returned', paymentStatus: 'refunded', fulfillmentStatus: 'returned', daysAgo: 12, customer: 0, items: [3], city: 'الرياض' },
  ];

  const getSlugByIndex = (i: number) => productsData[i].slug;

  for (let oi = 0; oi < orderStates.length; oi++) {
    const os = orderStates[oi];
    const orderDate = new Date(now.getTime() - os.daysAgo * 86400000);
    const orderNumber = `HAA-${String(1000 + oi).padStart(4, '0')}`;

    // Calculate totals
    let subtotal = 0;
    const orderItems: { productId: number; name: string; sku: string; quantity: number; unitPrice: string; totalPrice: string }[] = [];
    for (const idx of os.items) {
      const p = productsData[idx];
      const price = p.price;
      const qty = oi === 4 && idx === 12 ? 2 : 1; // double quantity for one item
      const total = Number(price) * qty;
      subtotal += total;
      orderItems.push({
        productId: productRecords[p.slug].id,
        name: p.name,
        sku: p.sku,
        quantity: qty,
        unitPrice: price,
        totalPrice: String(total),
      });
    }

    const shippingCost = oi === 0 ? '20' : oi === 1 ? '30' : '20';
    const total = subtotal + Number(shippingCost);

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
        street: 'شارع الملك فهد',
        district: 'حي النرجس',
        city: os.city,
        country: 'Saudi Arabia',
      },
      shippingMethodId: 1,
      shippingCost,
      subtotal: String(subtotal),
      total: String(total),
      paidAmount: os.paymentStatus === 'paid' || os.paymentStatus === 'refunded' ? String(total) : '0',
      paymentMethod: os.paymentStatus === 'unpaid' ? null : oi === 1 ? 'bank_transfer' : 'fake_card_success',
      completedAt: os.status === 'completed' ? orderDate : null,
      cancelledAt: os.status === 'cancelled' ? orderDate : null,
      createdAt: orderDate,
      updatedAt: orderDate,
    }).returning();

    // Order items
    for (const item of orderItems) {
      await db.insert(s.orderItems).values({
        orderId: order.id,
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }

    // Status history
    const statusFlows: Record<string, string[]> = {
      completed: ['draft', 'confirmed', 'processing', 'shipped', 'completed'],
      shipped: ['draft', 'confirmed', 'processing', 'shipped'],
      processing: ['draft', 'confirmed', 'processing'],
      confirmed: ['draft', 'confirmed'],
      cancelled: ['draft', 'confirmed', 'cancelled'],
      returned: ['draft', 'confirmed', 'processing', 'shipped', 'completed', 'returned'],
    };

    const flow = statusFlows[os.status] || ['draft'];
    for (let si = 0; si < flow.length; si++) {
      const isLast = si === flow.length - 1;
      await db.insert(s.orderStatusHistory).values({
        orderId: order.id,
        fromStatus: si === 0 ? null : flow[si - 1],
        toStatus: flow[si],
        changedByUserId: isLast && os.status === 'completed' ? haaDemoMerchant.id : null,
        createdAt: new Date(orderDate.getTime() + si * 3600000),
      });
    }

    // Checkout session for completed or in-progress orders
    if (os.status !== 'cancelled' && os.status !== 'returned') {
      await db.insert(s.checkoutSessions).values({
        storeId: store.id,
        cartId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        status: 'completed',
        customerName: customerRecords[os.customer].name,
        customerPhone: customerRecords[os.customer].phone,
        customerEmail: customerData[os.customer].email,
        shippingAddress: {
          street: 'شارع الملك فهد',
          district: 'حي النرجس',
          city: os.city,
          country: 'Saudi Arabia',
        },
        shippingMethodId: 1,
        shippingCost,
        subtotal: String(subtotal),
        total: String(total),
        paymentMethod: oi === 1 ? 'bank_transfer' : 'fake_card_success',
        paymentStatus: os.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        completedAt: orderDate,
        createdAt: orderDate,
      });
    }

    // Wallet entries for completed/paid orders (use default wallet account)
    if (os.paymentStatus === 'paid' || os.paymentStatus === 'refunded') {
      const walletAccts = await db.select().from(s.walletAccounts).where(eq(s.walletAccounts.storeId, store.id)).limit(1);
      if (walletAccts.length > 0) {
        const wa = walletAccts[0];
        const amt = os.paymentStatus === 'refunded' ? `-${String(total)}` : String(total);
        const platFee = (Number(total) * 0.02).toFixed(2);

        await db.insert(s.walletEntries).values({
          storeId: store.id,
          walletAccountId: wa.id,
          type: 'sale_credit',
          direction: 'credit',
          amount: amt,
          balanceBefore: '0',
          balanceAfter: amt,
          status: 'completed',
          referenceType: 'order',
          referenceId: order.id,
          description: os.paymentStatus === 'refunded'
            ? `استرجاع الطلب ${orderNumber}`
            : `مبيعات الطلب ${orderNumber}`,
          createdAt: orderDate,
        });

        if (os.paymentStatus === 'paid') {
          await db.insert(s.walletEntries).values({
            storeId: store.id,
            walletAccountId: wa.id,
            type: 'platform_fee',
            direction: 'debit',
            amount: platFee,
            balanceBefore: '0',
            balanceAfter: `-${platFee}`,
            status: 'completed',
            referenceType: 'order',
            referenceId: order.id,
            description: `رسوم منصة عن الطلب ${orderNumber}`,
            createdAt: orderDate,
          });
        }
      }
    }

    // Shipments for shipped/delivered orders
    if (os.fulfillmentStatus === 'fulfilled' || os.status === 'shipped') {
      const trackingNumber = os.city === 'الرياض' ? 'SPL-2024-0001' : os.city === 'جدة' ? 'SPL-2024-0002' : 'SPL-2024-0003';
      const [shipment] = await db.insert(s.shipments).values({
        storeId: store.id,
        orderId: order.id,
        shippingMethodId: 1,
        provider: 'manual',
        status: os.fulfillmentStatus === 'fulfilled' ? 'delivered' : 'shipped',
        carrierName: 'ساعي',
        trackingNumber,
        trackingUrl: `https://splonline.com.sa/tracking/${trackingNumber}`,
        shippingCost: shippingCost,
        customerFee: shippingCost,
        recipientName: customerRecords[os.customer].name,
        recipientPhone: customerRecords[os.customer].phone,
        address: {
          street: 'شارع الملك فهد',
          district: 'حي النرجس',
          city: os.city,
          country: 'Saudi Arabia',
        },
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
  console.log(`  ✓ ${orderStates.length} Orders created with items, status history, and tracking`);

  // ── Coupons ─────────────────────────────────────────
  const couponsData = [
    { code: 'SAVE10', name: 'خصم 10 ريال', desc: 'خصم 10 ريال على أي طلب', type: 'fixed', value: '10', minAmount: '50', maxUses: 100, used: 2, active: true, startDaysAgo: 30, endDaysAgo: null },
    { code: 'PERCENT20', name: 'خصم 20%', desc: 'خصم 20% على جميع المنتجات بحد أقصى 50 ريال', type: 'percentage', value: '20', minAmount: '100', maxUses: 50, used: 5, maxDiscount: '50', active: true, startDaysAgo: 15, endDaysAgo: null },
    { code: 'FREESHIP', name: 'شحن مجاني', desc: 'شحن مجاني للطلبات فوق 200 ريال', type: 'free_shipping', value: '0', minAmount: '200', maxUses: 30, used: 1, active: true, startDaysAgo: 7, endDaysAgo: null },
    { code: 'EXPIRED50', name: 'كود منتهي', desc: 'كان يمنح خصم 50%', type: 'percentage', value: '50', minAmount: null, maxUses: null, used: 10, active: false, startDaysAgo: 90, endDaysAgo: 10 },
  ];

  for (const c of couponsData) {
    await db.insert(s.coupons).values({
      storeId: store.id,
      code: c.code,
      name: c.name,
      description: c.desc,
      type: c.type,
      value: c.value,
      maxDiscountAmount: c.maxDiscount || null,
      minOrderAmount: c.minAmount || null,
      maxUses: c.maxUses || null,
      usedCount: c.used,
      startsAt: new Date(now.getTime() - c.startDaysAgo * 86400000),
      expiresAt: c.endDaysAgo ? new Date(now.getTime() - c.endDaysAgo * 86400000) : new Date(now.getTime() + 365 * 86400000),
      isActive: c.active,
    });
  }
  console.log(`  ✓ ${couponsData.length} Coupons created`);

  // ── Promotions ─────────────────────────────────────
  const promotionsData = [
    { name: 'تخفيضات الصيف', desc: 'خصم 15% على جميع الإلكترونيات', type: 'percentage', value: '15', appliesTo: 'category', appliesToId: cats['electronics'].id, startDaysAgo: 20, endDays: 30, active: true },
    { name: 'عروض العودة للمدارس', desc: 'خصم 10% على مستلزمات الأطفال والمكتبة', type: 'percentage', value: '10', appliesTo: 'category', appliesToId: cats['kids'].id, startDaysAgo: 5, endDays: 25, active: true },
  ];

  for (const p of promotionsData) {
    await db.insert(s.promotions).values({
      storeId: store.id,
      name: p.name,
      description: p.desc,
      type: p.type,
      value: p.value,
      appliesTo: p.appliesTo,
      appliesToId: p.appliesToId,
      startsAt: new Date(now.getTime() - p.startDaysAgo * 86400000),
      endsAt: new Date(now.getTime() + p.endDays * 86400000),
      isActive: p.active,
    });
  }
  console.log(`  ✓ ${promotionsData.length} Promotions created`);

  // ── Store Policies ──────────────────────────────────
  const policiesData = [
    { type: 'about', title: 'عن المتجر', content: 'مرحباً بكم في متجر هاء التجريبي. نحن متجر إلكتروني سعودي نقدم تشكيلة واسعة من المنتجات عالية الجودة في مجالات الإلكترونيات والملابس ومنتجات المنزل والعناية الشخصية والأطفال والمكتبة والرياضة.\n\nنحن نؤمن بأن التسوق الإلكتروني يجب أن يكون سهلاً وآمناً وممتعاً، ولهذا نعمل جاهدين لنقدم أفضل تجربة تسوق لعملائنا الكرام.' },
    { type: 'privacy', title: 'سياسة الخصوصية', content: 'نحن في متجر هاء التجريبي نلتزم بحماية خصوصية عملائنا. جميع المعلومات الشخصية التي تشاركونها معنا تُستخدم فقط لتحسين تجربة التسوق الخاصة بكم.\n\nنحن لا نشارك معلوماتكم مع أطراف ثالثة دون موافقتكم الصريحة، ونستخدم أحدث تقنيات التشفير لحماية بياناتكم.' },
    { type: 'returns', title: 'سياسة الاسترجاع والاستبدال', content: 'يمكنك إرجاع أي منتج خلال 14 يوماً من تاريخ الاستلام، بشرط أن يكون المنتج في حالته الأصلية ولم يتم استخدامه.\n\nلإرجاع منتج، يرجى التواصل معنا عبر البريد الإلكتروني أو الهاتف وسنقوم بترتيب عملية الإرجاع. سيتم رد المبلغ خلال 5-7 أيام عمل بعد استلام المنتج.' },
    { type: 'shipping', title: 'سياسة الشحن والتوصيل', content: 'نوفر الشحن لجميع مدن المملكة العربية السعودية عبر شركات شحن موثوقة. مدة التوصيل تتراوح بين 3-7 أيام عمل حسب المنطقة.\n\nالشحن مجاني للطلبات التي تتجاوز قيمتها 300 ريال سعودي. يمكنك تتبع طلبك باستخدام رقم التتبع الذي نرسله لك بعد تأكيد الشحن.' },
    { type: 'terms', title: 'الشروط والأحكام', content: 'باستخدامك لهذا المتجر، فإنك توافق على هذه الشروط والأحكام. نحتفظ بالحق في تحديث هذه الشروط في أي وقت دون إشعار مسبق.\n\nجميع الأسعار معروضة بالريال السعودي وتشمل ضريبة القيمة المضافة. الأسعار قابلة للتغيير دون إشعار مسبق.' },
  ];

  for (const pol of policiesData) {
    await db.insert(s.storePolicies).values({
      storeId: store.id,
      type: pol.type,
      title: pol.title,
      content: pol.content,
      isPublished: true,
    });
  }
  console.log(`  ✓ ${policiesData.length} Store Policies created`);

  // ── Wallet Account ─────────────────────────────────
  await db.insert(s.walletAccounts).values({
    storeId: store.id,
    balance: '0',
    pendingBalance: '0',
    availableBalance: '0',
  }).returning();
  console.log('  ✓ Wallet account created');

  // ── Abandoned Carts (checkout sessions) ────────────
  // Create 2 abandoned checkout sessions (pending status, old)
  const abandonedCities = ['الرياض', 'جدة'];
  for (let ai = 0; ai < 2; ai++) {
    const abandonedDate = new Date(now.getTime() - (ai === 0 ? 5 : 2) * 86400000);
    await db.insert(s.checkoutSessions).values({
      storeId: store.id,
      cartId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      status: 'pending',
      customerName: customerData[3 + ai].name,
      customerPhone: customerData[3 + ai].phone,
      customerEmail: customerData[3 + ai].email,
      shippingAddress: {
        street: 'شارع الملك فهد',
        city: abandonedCities[ai],
        country: 'Saudi Arabia',
      },
      shippingMethodId: 1,
      shippingCost: ai === 0 ? '20' : '30',
      subtotal: ai === 0 ? '199' : '448',
      total: ai === 0 ? '219' : '478',
      paymentMethod: null,
      paymentStatus: 'unpaid',
      expiresAt: new Date(abandonedDate.getTime() + 7 * 86400000),
      createdAt: abandonedDate,
    });
  }
  console.log('  ✓ 2 Abandoned carts created');

  // ── Update customer stats ──────────────────────────
  for (let ci = 0; ci < customerRecords.length; ci++) {
    const customerOrders = orderStates.filter(o => o.customer === ci);
    const orderIds = customerOrders.map((_, oi) => orderStates.filter((_, idx) => oi === idx).length > 0);
    const customerTotal = customerOrders.reduce((sum, os) => {
      let s = 0;
      for (const idx of os.items) s += Number(productsData[idx].price);
      return sum + s;
    }, 0);
    await db.update(s.customers)
      .set({
        totalOrders: customerOrders.length,
        totalSpent: String(customerTotal),
      })
      .where(eq(s.customers.id, customerRecords[ci].id));
  }

  // ── Permissions & Roles ────────────────────────────
  const allPermissionNames = [
    'products:read', 'products:create', 'products:update', 'products:delete',
    'orders:read', 'orders:create', 'orders:update_status',
    'customers:read', 'customers:create', 'customers:update',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'brands:read', 'brands:create', 'brands:update', 'brands:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'coupons:read', 'coupons:create', 'coupons:update', 'coupons:delete',
    'reports:read',
    'settings:read', 'settings:update',
    'wallet:read', 'wallet:request_payout',
    'exports:create',
    'imports:create',
    'compliance:read', 'compliance:write', 'compliance:submit', 'compliance:documents',
  ];
  const permissionRecords: { id: number; name: string }[] = [];
  for (const pn of allPermissionNames) {
    const [rec] = await db.insert(s.permissions).values({ name: pn, label: pn }).returning();
    permissionRecords.push(rec);
  }
  const [adminRole] = await db.insert(s.roles).values({
    storeId: store.id,
    name: 'admin',
    description: 'مدير المتجر — صلاحيات كاملة',
  }).returning();
  for (const p of permissionRecords) {
    await db.insert(s.rolePermissions).values({ roleId: adminRole.id, permissionId: p.id });
  }
  await db.insert(s.userStoreRoles).values({ userId: haaDemoMerchant.id, storeId: store.id, roleId: adminRole.id });
  console.log(`  ✓ ${permissionRecords.length} Permissions, 1 Role, ${permissionRecords.length} role-permission assignments, 1 user-store-role`);

  // ── Notification Templates ─────────────────────────
  const templates = [
    { code: 'order_created', name: 'طلب جديد', channel: 'email', subjectTemplate: 'طلب جديد #{{orderNumber}}', bodyTemplate: 'تم استلام طلب جديد رقم {{orderNumber}} بقيمة {{total}} ر.س\n{{fulfillmentSummary}}\n\n{{itemsList}}' },
    { code: 'payment_success', name: 'دفع ناجح', channel: 'email', subjectTemplate: 'تم الدفع #{{orderNumber}}', bodyTemplate: 'تم تأكيد الدفع للطلب رقم {{orderNumber}} بقيمة {{amount}} ر.س\n{{fulfillmentSummary}}\n{{giftSummary}}\n\n{{itemsList}}' },
    { code: 'payment_failed', name: 'فشل الدفع', channel: 'email', subjectTemplate: 'فشل الدفع #{{orderNumber}}', bodyTemplate: 'فشلت عملية الدفع للطلب رقم {{orderNumber}}' },
    { code: 'shipping_update', name: 'تحديث الشحن', channel: 'email', subjectTemplate: 'تحديث الشحن #{{orderNumber}}', bodyTemplate: 'تم تحديث حالة الشحن للطلب رقم {{orderNumber}} إلى {{status}}' },
    { code: 'low_stock', name: 'مخزون منخفض', channel: 'email', subjectTemplate: 'تنبيه مخزون منخفض', bodyTemplate: 'المنتج {{productName}} وصل إلى حد المخزون المنخفض ({{stock}})' },
    { code: 'abandoned_cart', name: 'سلة متروكة', channel: 'email', subjectTemplate: 'سلتك في انتظارك', bodyTemplate: 'لاحظنا أن لديك سلعة في سلتك. أكمل طلبك الآن!' },
  ];
  for (const tpl of templates) {
    await db.insert(s.notificationTemplates).values(tpl).onConflictDoNothing();
  }
  console.log(`  ✓ ${templates.length} Notification Templates created`);

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   haa-demo merchant:    merchant.haa-demo@example.com / Test@123456 (admin)');
  console.log('   haa-demo customer:    customer.haa-demo@example.com / Test@123456 (storefront)');
  console.log('   demo-perfumes merchant: merchant.perfumes@example.com / Test@123456 (admin)');
  console.log('   demo-perfumes customer: customer.perfumes@example.com / Test@123456 (storefront)');
  console.log('\n📦 Store URL: /s/haa-demo');
  console.log('📊 Reports:   /merchant/dashboard/reports');
  console.log('🏷️ Coupons:   /merchant/dashboard/coupons');
  console.log('📋 Policies:  /s/haa-demo/policies');
  console.log(`\n🧪 ${productsData.length} Products | ${customerData.length} Customers | ${orderStates.length} Orders | ${couponsData.length} Coupons | ${promotionsData.length} Promotions | ${brandsData.length} Brands | ${tagsData.length} Tags`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
