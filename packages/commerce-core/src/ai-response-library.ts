import { ProductsService, ReportsService, CustomersService } from './index.js';
import { WalletLedger } from '@haa/wallet-core';

export interface ResponseTemplate {
  patterns: RegExp[];
  response: string | ((ctx: { storeId: number; productsService: ProductsService; reportsService: ReportsService; customersService: CustomersService; walletLedger: WalletLedger }) => Promise<string>);
  type: 'static' | 'dynamic';
}

export const responseLibrary: ResponseTemplate[] = [
  // ── التحيات والمجاملات ──
  {
    patterns: [/^(مرحبا|اهلا|السلام عليكم|هلا|هاي|سلام)/i],
    response: 'وعليكم السلام! 👋 أنا مساعدك الذكي في هاء متاجر. كيف يمكنني مساعدتك اليوم؟',
    type: 'static',
  },
  {
    patterns: [/^شكر(ا|ن| جزيلا|لك)/i],
    response: 'العفو! 😊 أنا هنا في خدمتك دائماً.',
    type: 'static',
  },
  {
    patterns: [/^(مع السلامة|وداعا|باي|في امان الله)/i],
    response: 'مع السلامة! 👋 تمنياتي لك بالتوفيق والنجاح في متجرك.',
    type: 'static',
  },
  {
    patterns: [/^كيف حال(ك|كِ)/i],
    response: 'بخير، والحمد لله! 🌟 أنا جاهز لمساعدتك في إدارة متجرك. ما الذي تحتاجه؟',
    type: 'static',
  },

  // ── الأسئلة الحقائقية (ديناميكية) ──
  {
    patterns: [/كم (عندي|لدي|عدد) (ال)?منتج/i],
    response: async (ctx) => {
      const products = await ctx.productsService.list(ctx.storeId, { limit: 1 });
      return `لديك حاليًا ${products.total} منتج في متجرك. يمكنك إدارتها جميعاً من قسم "المنتجات".`;
    },
    type: 'dynamic',
  },
  {
    patterns: [/كم (عندي|لدي|عدد) (ال)?عميل/i],
    response: async (ctx) => {
      const customers = await ctx.customersService.list(ctx.storeId, { limit: 1 });
      return `لديك حاليًا ${customers.total} عميل مسجل في متجرك.`;
    },
    type: 'dynamic',
  },
  {
    patterns: [/كم (عندي|لدي|عدد) (ال)?طلب/i],
    response: async (ctx) => {
      const sales = await ctx.reportsService.salesSummary(ctx.storeId);
      return `إجمالي طلباتك هو ${sales.totalOrders} طلبات.`;
    },
    type: 'dynamic',
  },
  {
    patterns: [/(إجمالي|كم|مقدار) (ال)?مبيعات/i],
    response: async (ctx) => {
      const sales = await ctx.reportsService.salesSummary(ctx.storeId);
      return `إجمالي مبيعاتك هو ${sales.totalSales} ريال سعودي. متوسط قيمة الطلب: ${sales.averageOrderValue} ر.س.`;
    },
    type: 'dynamic',
  },
  {
    patterns: [/(رصيد|كم فلوس|مبلغ|فلوسي)( (ال)?محفظ(ة|تي)?)?/i],
    response: async (ctx) => {
      const wallet = await ctx.walletLedger.getSummary(ctx.storeId);
      return `رصيد محفظتك الحالي: ${wallet.balance} ر.س. الرصيد الصافي (بعد الرسوم): ${wallet.netBalance} ر.س.`;
    },
    type: 'dynamic',
  },
  {
    patterns: [/منتج(ات)? (منخفض(ة)?|نافذ(ة)?|انتهى|فارغ(ة)?)/i],
    response: async (ctx) => {
      const lowStock = await ctx.reportsService.lowStock(ctx.storeId);
      if (lowStock.length === 0) return 'جميع منتجاتك متوفرة حاليًا ولا يوجد نقص في المخزون. أحسنت! ✅';
      const items = lowStock.map((item: any) => `- ${item.name} (${item.stockQuantity} متبقي)`).join('\n');
      return `هذه المنتجات منخفضة المخزون:\n${items}\n\nأنصحك بإعادة تخزينها قريباً.`;
    },
    type: 'dynamic',
  },

  // ── أسئلة "كيف" (شرح خطوات) ──
  {
    patterns: [/كيف (أضيف|أضيف|اضيف) (منتج|سلعة)/i],
    response: 'لإضافة منتج جديد:\n1. اذهب إلى "المنتجات" من القائمة الجانبية.\n2. اضغط على زر "إضافة منتج".\n3. املأ البيانات (الاسم، السعر، الصور، الكمية).\n4. اضغط "حفظ".',
    type: 'static',
  },
  {
    patterns: [/كيف (أسوي|اسوي|اصنع) (كوبون|خصم|قسيمة)/i],
    response: 'لإنشاء كوبون خصم:\n1. اذهب إلى "الكوبونات".\n2. اضغط "كوبون جديد".\n3. أدخل الكود (مثل: SAVE10).\n4. حدد نوع الخصم (ثابت أو نسبة).\n5. اضغط "حفظ" وفعّله.',
    type: 'static',
  },
  {
    patterns: [/كيف (أشحن|اشحن|يوصل) (طلب|اوردر)/i],
    response: 'لشحن طلب:\n1. اذهب إلى "الطلبات".\n2. اختر الطلب الذي تريد شحنه.\n3. اضغط على "تغيير الحالة" واختر "قيد الشحن".\n4. أدخل رقم التتبع (إن وجد).',
    type: 'static',
  },
  {
    patterns: [/كيف (ألغي|الغي|أحذف) (طلب|اوردر)/i],
    response: 'لإلغاء طلب:\n1. اذهب إلى "الطلبات".\n2. افتح تفاصيل الطلب.\n3. اضغط "إلغاء الطلب" في الأعلى.\n4. اكتب سبب الإلغاء (اختياري).\n5. اضغط "تأكيد الإلغاء".',
    type: 'static',
  },
  {
    patterns: [/وين (ألقى|أجد|أشوف) (ال)?(طلبات|منتجات|عملاء|كوبونات)/i],
    response: 'من القائمة الجانبية على اليسار، اختر القسم الذي تبحث عنه:\n- الطلبات\n- المنتجات\n- العملاء\n- الكوبونات',
    type: 'static',
  },

  // ── قوالب إنشاء المحتوى ──
  {
    patterns: [/(اكتب|ولد|اعطني|صمم) (وصف|نص|محتوى) (ل|لـ|عن)?\s?(سماعة|سماعات)\s?(بلوتوث|لاسلكية)?/i],
    response: 'استمتع بصوت نقي وعميق مع سماعتنا اللاسلكية. تصميم أنيق يدوم طوال اليوم، وميكروفون مدمج لمكالمات واضحة. مثالية للعمل والرياضة والرحلات.',
    type: 'static',
  },
  {
    patterns: [/(اكتب|ولد|اعطني|صمم) (وصف|نص|محتوى) (ل|لـ|عن)?\s?(قميص|تيشيرت)/i],
    response: 'قميص قطني فاخر بتصميم عصري يناسب جميع الأوقات. خامة ناعمة تهوية ممتازة، وألوان ثابتة لا تبهت. متوفر بجميع المقاسات.',
    type: 'static',
  },
  {
    patterns: [/(اكتب|ولد|اعطني|صمم) (وصف|نص|محتوى) (ل|لـ|عن)?\s?(عطر|برفان)/i],
    response: 'عطر فاخر يجسد الأناقة والرقي. مزيج متناغم من الزهور والمسك يدوم طوال اليوم. إطلالة لا تُنسى في كل مناسبة.',
    type: 'static',
  },

  // ── أسئلة عامة شائعة ──
  {
    patterns: [/^(ماذا تفعل|شو بتسوي|وظيفتك|شنو انت)/i],
    response: 'أنا مساعدك الذكي في هاء متاجر! 🤖\nيمكنني:\n• إجابتك عن بيانات متجرك (مبيعات، منتجات، عملاء)\n• شرح كيفية استخدام النظام\n• كتابة محتوى تسويقي\n• اقتراح عروض وتحليلات',
    type: 'static',
  },
  {
    patterns: [/^(من انت|منو انت|مينك)/i],
    response: 'أنا "Haa AI"، المساعد الذكي الرسمي لمنصة "هاء متاجر". صُممت لأساعد التجار السعوديين في إدارة متاجرهم بسهولة وفعالية.',
    type: 'static',
  },
  {
    patterns: [/^(مساعدة|ساعدني|محتاج مساعدة)/i],
    response: 'بالتأكيد! 💪\nأخبرني بما تحتاجه:\n• "كم عندي منتج؟"\n• "كيف أضيف كوبون؟"\n• "اكتب وصف لمنتجي"',
    type: 'static',
  },
];
