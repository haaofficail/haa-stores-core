import { ReportsService } from './reports.js';
import { ProductsService } from './products.js';
import { AbandonedCartsService } from './abandoned-carts.js';
import { CouponsService } from './coupons.js';
import { CustomersService } from './customers.js';
import { WalletLedger } from '@haa/wallet-core';
import { responseLibrary } from './ai-response-library.js';
import fs from 'fs';
import path from 'path';

export interface AiAgentRequest {
  prompt: string;
  context?: Record<string, unknown>;
  action?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}


export interface AiAgentResponse {
  text: string;
  suggestions?: string[];
  actions?: Array<{ label: string; action: string; params?: Record<string, unknown> }>;
  confidence?: number;
}

export interface AiAgentProvider {
  readonly name: string;
  readonly isAvailable: boolean;
  generate(request: AiAgentRequest): Promise<AiAgentResponse>;
}

export class MockAiAgentProvider implements AiAgentProvider {
  readonly name = 'Mock AI Agent';
  readonly isAvailable = true;

  async generate(request: AiAgentRequest): Promise<AiAgentResponse> {
    const mockResponses: Record<string, AiAgentResponse> = {
      'daily_summary': {
        text: 'ملخص أداء اليوم: 12 طلب جديد، إجمالي المبيعات 2,450 ر.س. المنتجات الأكثر مبيعًا: سماعات بلوتوث (5)، قميص قطني (3). لا توجد طلبات متأخرة.',
        suggestions: ['مراجعة المنتجات منخفضة المخزون', 'تفعيل عرض على المنتجات الأكثر مبيعًا'],
        actions: [{ label: 'عرض المنتجات منخفضة المخزون', action: 'navigate', params: { path: '/products' } }],
      },
      'weekly_summary': {
        text: 'ملخص الأسبوع: 68 طلب، 14,320 ر.س مبيعات. نمو 12% عن الأسبوع الماضي. أفضل يوم: الخميس (15 طلب).',
        suggestions: ['زيادة المخزون للمنتجات الرائجة', 'مراجعة أداء الكوبونات'],
      },
      'sales_decline': {
        text: 'تحليل انخفاض المبيعات: لاحظت انخفاض بنسبة 8% هذا الأسبوع. الأسباب المحتملة: منتجين رئيسيين نفد مخزونهم، منافس أطلق عرضًا مشابهًا. أقترح: إعادة تخزين المنتجات النافدة وتفعيل كوبون خصم 10%.',
        suggestions: ['إنشاء كوبون خصم 10%', 'إعادة تخزين المنتجات النافدة'],
        actions: [{ label: 'إنشاء كوبون', action: 'navigate', params: { path: '/coupons' } }],
      },
      'product_suggestions': {
        text: 'اقتراحات لتحسين منتجاتك: أضف صور أكثر وضوحًا للمنتجات. أوصافك الحالية قصيرة — إضافة تفاصيل أكثر يزيد المبيعات بنسبة تصل إلى 20%. أضف كلمات مفتاحية في وصف المنتج.',
        suggestions: ['تحديث صور المنتجات', 'كتابة أوصاف أطول', 'إضافة كلمات مفتاحية'],
      },
      'product_title': {
        text: 'سماعة بلوتوث لاسلكية مع عازل ضوضاء - جودة صوت عالية - بطارية 30 ساعة',
        confidence: 0.85,
      },
      'product_description': {
        text: 'سماعة بلوتوث احترافية بتقنية عزل الضوضاء النشط. استمتع بصوت نقي وعميق مع بطارية تدوم حتى 30 ساعة متواصلة. تصميم مريح وقابل للطي، مثالي للعمل والسفر والرياضة. تدعم الاتصال بجهازين في نفس الوقت.',
        confidence: 0.88,
      },
      'promotion_ideas': {
        text: 'عرض مقترح: خصم 20% على جميع منتجات الإلكترونيات + شحن مجاني للطلبات فوق 200 ر.س. وقت العرض: 3 أيام (الخميس-السبت).',
        suggestions: ['تفعيل العرض لمدة 3 أيام', 'إرسال إشعار للعملاء'],
      },
      'abandoned_cart_analysis': {
        text: 'تحليل السلات المتروكة: 8 سلات متروكة هذا الأسبوع بقيمة 1,840 ر.س. السبب الأكثر شيوعًا: تكلفة الشحن (3 سلات)، عدم وجود كوبون (2). أقترح: تفعيل شحن مجاني للطلبات فوق 150 ر.س.',
        suggestions: ['تفعيل شحن مجاني', 'إرسال تذكير للعملاء'],
      },
      'wallet_explanation': {
        text: 'محفظتك حاليًا: إجمالي المبيعات 14,320 ر.س، رسوم المنصة (2%) 286 ر.س، صافي مستحقاتك 14,034 ر.س. باقة Starter الخاصة بك تغطي حتى 10 منتجات — لديك 8 منتجات نشطة حاليًا.',
      },
      'generate_products': {
        text: JSON.stringify([
          { name: 'سماعات بلوتوث لاسلكية', price: 149.99, sku: 'BT-001', stockQuantity: 50, description: 'سماعة بلوتوث بتقنية عزل الضوضاء وجودة صوت عالية' },
          { name: 'حافظة جوال سيليكون', price: 39.99, sku: 'CP-001', stockQuantity: 100, description: 'حافظة سيليكون مرنة متوافقة مع جميع الموديلات' },
          { name: 'شاحن سريع 65W', price: 89.99, sku: 'CH-001', stockQuantity: 30, description: 'شاحن سريع مع منفذين USB-C يدعم الشحن السريع' },
          { name: 'ساعة ذكية رياضية', price: 299.99, sku: 'SW-001', stockQuantity: 25, description: 'ساعة ذكية مقاومة للماء مع مراقبة النبض والسعرات' },
          { name: 'حقيبة ظهر عصرية', price: 199.99, sku: 'BP-001', stockQuantity: 40, description: 'حقيبة ظهر عملية بتصميم عصري ومقاومة للماء' },
        ]),
        confidence: 0.9,
        suggestions: ['مراجعة المنتجات المقترحة', 'تعديل الأسعار حسب هامش الربح'],
        actions: [{ label: 'عرض المنتجات', action: 'navigate', params: { path: '/products' } }],
      },
    };

    const key = request.action || 'daily_summary';
    return mockResponses[key] || {
      text: 'عذرًا، لا أستطيع معالجة هذا الطلب حاليًا. يرجى المحاولة لاحقًا.',
      confidence: 0.3,
    };
  }
}

export class OllamaAiAgentProvider implements AiAgentProvider {
  readonly name = 'Ollama AI Agent';
  readonly isAvailable = !!(process.env.OLLAMA_URL && process.env.OLLAMA_MODEL);

  async generate(request: AiAgentRequest): Promise<AiAgentResponse> {
    const url = `${process.env.OLLAMA_URL}/api/chat`;
    const model = process.env.OLLAMA_MODEL || 'llama3';

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { 
        role: 'system', 
        content: 'أنت مساعد ذكي خبير في التجارة الإلكترونية السعودية. ردودك يجب أن تكون باللغة العربية، مهنية، مباشرة، ومفيدة للتاجر.' 
      },
    ];

    if (request.history) {
      messages.push(...request.history);
    }

    messages.push({ 
      role: 'user', 
      content: request.prompt 
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });
// ...

      if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);

      const data = await response.json() as { message: { content: string } };
      return {
        text: data.message.content,
        confidence: 0.9,
      };
    } catch (error) {
      console.error('Ollama AI Agent Error:', error);
      return {
        text: 'عذرًا، واجهت مشكلة في الاتصال بنموذج الذكاء الاصطناعي المحلي. يرجى التأكد من تشغيل Ollama.',
        confidence: 0,
      };
    }
  }
}

export class AiCommerceAgent {
  constructor(
    private provider: AiAgentProvider = (new OllamaAiAgentProvider()).isAvailable ? new OllamaAiAgentProvider() : new MockAiAgentProvider(),
    private reportsService = new ReportsService(),
    private productsService = new ProductsService(),
    private abandonedCartsService = new AbandonedCartsService(),
    private couponsService = new CouponsService(),
    private customersService = new CustomersService(),
    private walletLedger = new WalletLedger()
  ) {}

  private async checkResponseLibrary(prompt: string, storeId: number): Promise<AiAgentResponse | null> {
    const normalizedPrompt = prompt.toLowerCase().trim();
    
    for (const template of responseLibrary) {
      const isMatch = template.patterns.some(pattern => pattern.test(normalizedPrompt));
      if (isMatch) {
        if (template.type === 'static') {
          return {
            text: template.response as string,
            confidence: 1,
          };
        } else {
          const dynamicResponse = await (template.response as (context: Record<string, unknown>) => Promise<string> | string)({
            storeId,
            productsService: this.productsService,
            reportsService: this.reportsService,
            customersService: this.customersService,
            walletLedger: this.walletLedger,
          });
          return {
            text: dynamicResponse,
            confidence: 1,
          };
        }
      }
    }
    
    return null; // No match found in library
  }

  private async generateResponseWithData(_prompt: string, action: string, data: unknown, context: Record<string, unknown>): Promise<AiAgentResponse> {
    const enrichedPrompt = `
أنت "Haa AI"، محلل متجر إلكتروني سعودي متخصص. مهمتك تحليل البيانات التالية وإعطاء رد مختصر بلغة عربية فصحى سليمة.

📊 البيانات الحقيقية للمتجر:
${JSON.stringify(data, null, 2)}

⚠️ قواعد صارمة:
1. استخدم فقط الأرقام والبيانات أعلاه. لا تخترع نصائح عامة.
2. الرد يجب أن يكون 3 جمل كحد أقصى.
3. لغة عربية فصحى سليمة. ممنوع:
   - الأخطاء الإملائية (مثل: "بلاطوثر" ← الصحيح: "بلوتوث")
   - الترجمة الحرفية من الإنجليزية
   - الكلمات الدخيلة غير المفهومة
4. استخدم مصطلحات تجارية سعودية صحيحة: "مبيعات" وليس "سيلز"، "طلبات" وليس "أوردرات"، "توصيل" وليس "دليفري".
5. لا تستخدم أي لغة غير العربية.
6. لا مقدمات طويلة. ابدأ بالتحليل مباشرة.

📝 مثال جيد:
"مبيعاتك هذا الأسبوع 5,200 ر.س (↑12%). أحسنت! المنتج الأكثر مبيعاً هو السماعات. أنصحك بزيادة مخزونها."

🚫 مثال سيء (ممنوع):
"البيانات الإحصائية تظهر أن الطلب والبيع في الموقع قد زاد بشكل كبير..."
`;


    return this.provider.generate({
      prompt: enrichedPrompt,
      action: action,
      context: context,
    });
  }

  async getDailySummary(storeId: number): Promise<AiAgentResponse> {
    const data = await this.reportsService.salesSummary(storeId);
    return this.generateResponseWithData('daily_summary', 'daily_summary', data, { storeId });
  }

  async getWeeklySummary(storeId: number): Promise<AiAgentResponse> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 7);
    const data = await this.reportsService.salesSummary(storeId, dateFrom.toISOString());
    return this.generateResponseWithData('weekly_summary', 'weekly_summary', data, { storeId });
  }

  async analyzeSalesDecline(storeId: number): Promise<AiAgentResponse> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const data = await this.reportsService.salesSummary(storeId, dateFrom.toISOString());
    return this.generateResponseWithData('analyze_sales_decline', 'sales_decline', data, { storeId });
  }

  async suggestProductImprovements(storeId: number, productId?: number): Promise<AiAgentResponse> {
    const products = await this.productsService.list(storeId, { limit: 10 });
    return this.generateResponseWithData('suggest_product_improvements', 'product_suggestions', products.data, { storeId, productId });
  }

  async generateProductTitle(storeId: number, context: Record<string, unknown>): Promise<AiAgentResponse> {
    return this.provider.generate({ prompt: `Generate a high-converting Arabic product title for: ${JSON.stringify(context)}`, action: 'product_title', context: { storeId, ...context } });
  }

  async generateProductDescription(storeId: number, context: Record<string, unknown>): Promise<AiAgentResponse> {
    return this.provider.generate({ prompt: `Generate a professional Arabic product description for: ${JSON.stringify(context)}`, action: 'product_description', context: { storeId, ...context } });
  }

  async generateProducts(storeId: number, context: { category?: string; count?: number }): Promise<AiAgentResponse> {
    return this.provider.generate({ prompt: `Suggest ${context.count || 5} realistic products for category ${context.category || 'general'} in the Saudi market. Return as JSON array.`, action: 'generate_products', context: { storeId, ...context } });
  }

  async suggestPromotions(storeId: number): Promise<AiAgentResponse> {
    const sales = await this.reportsService.salesSummary(storeId);
    return this.generateResponseWithData('suggest_promotions', 'promotion_ideas', sales, { storeId });
  }

  async analyzeAbandonedCarts(storeId: number): Promise<AiAgentResponse> {
    const data = await this.abandonedCartsService.list(storeId);
    return this.generateResponseWithData('analyze_abandoned_carts', 'abandoned_cart_analysis', data, { storeId });
  }

  async explainWallet(storeId: number): Promise<AiAgentResponse> {
    const data = await this.walletLedger.getSummary(storeId);
    return this.generateResponseWithData('explain_wallet', 'wallet_explanation', data, { storeId });
  }

  private async getSystemKnowledge(): Promise<string> {
    try {
      const docsDir = path.join(process.cwd(), 'docs');
      let knowledge = '';
      
      if (fs.existsSync(docsDir)) {
        const files = fs.readdirSync(docsDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            knowledge += `\n--- Document: ${file} ---\n${fs.readFileSync(path.join(docsDir, file), 'utf8')}\n`;
          }
        }
      }

      const readmePath = path.join(process.cwd(), 'README.md');
      if (fs.existsSync(readmePath)) {
        knowledge += `\n--- README ---\n${fs.readFileSync(readmePath, 'utf8')}\n`;
      }

      return knowledge;
    } catch (error) {
      console.error('Error loading system knowledge:', error);
      return '';
    }
  }

  private async answerFactualQuestion(storeId: number, prompt: string): Promise<AiAgentResponse | null> {
    const p = prompt.toLowerCase().trim();
    console.log('[AI DEBUG] Checking factual question:', p);
    
    // Product count questions
    if (p.includes('كم') && (p.includes('منتج') || p.includes('عدد المنتجات'))) {
      console.log('[AI DEBUG] Matched product count question');
      const products = await this.productsService.list(storeId, { limit: 1 });
      return {
        text: `لديك حاليًا ${products.total} منتج في متجرك.`,
        confidence: 1,
      };
    }
    
    // Customer count questions
    if (p.includes('كم') && (p.includes('عميل') || p.includes('زبون'))) {
      const customers = await new (await import('./customers.js')).CustomersService().list(storeId, { limit: 1 });
      return {
        text: `لديك حاليًا ${customers.total} عميل في متجرك.`,
        confidence: 1,
      };
    }
    
    // Order count / Sales questions
    if ((p.includes('كم') && (p.includes('طلب') || p.includes('اوردر'))) || (p.includes('مبيعات') && p.includes('كم'))) {
      const sales = await this.reportsService.salesSummary(storeId);
      return {
        text: `إجمالي طلباتك هو ${sales.totalOrders} طلبات بمبيعات قدرها ${sales.totalSales} ر.س.`,
        confidence: 1,
      };
    }
    
    // Wallet balance questions
    if (p.includes('محفظة') && (p.includes('كم') || p.includes('رصيد'))) {
      const wallet = await this.walletLedger.getSummary(storeId);
      return {
        text: `رصيد محفظتك الحالي هو ${wallet.balance} ر.س، والرصيد الصافي (بعد الرسوم) هو ${wallet.netBalance} ر.س.`,
        confidence: 1,
      };
    }
    
    // Low stock questions
    if (p.includes('مخزون') || p.includes('نفذ') || p.includes('الكمية')) {
      const lowStock = await this.reportsService.lowStock(storeId);
      if (lowStock.length === 0) {
        return { text: 'جميع منتجاتك متوفرة حاليًا ولا يوجد نقص في المخزون. أحسنت!', confidence: 1 };
      }
      const items = lowStock
        .map((item) => `- ${item.name} (${item.stockQuantity} متبقي)`)
        .join('\n');
      return {
        text: `هذه المنتجات منخفضة المخزون:\n${items}`,
        confidence: 1,
      };
    }

    return null; // Not a factual question, pass to LLM
  }

  private isHowToQuestion(prompt: string): boolean {
    const p = prompt.toLowerCase().trim();
    const howToKeywords = ['كيف', 'شرح', 'طريقة', 'استخدام', 'أستخدم', 'اعمل', 'سوي', 'مكان', 'وين', 'اين', 'توجد', 'موجود'];
    return howToKeywords.some(k => p.includes(k));
  }

  private isContentGenerationQuestion(prompt: string): boolean {
    const p = prompt.toLowerCase().trim();
    const contentKeywords = ['اكتب', 'ولد', 'أنشئ', 'صمم', 'وصف', 'عنوان', 'idea', 'write', 'generate', 'create'];
    return contentKeywords.some(k => p.includes(k));
  }

  async chat(storeId: number, prompt: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<AiAgentResponse> {
    // 1. Check the Response Library FIRST (instant, 100% accurate Arabic)
    const libraryAnswer = await this.checkResponseLibrary(prompt, storeId);
    if (libraryAnswer) {
      return libraryAnswer;
    }

    // 2. Factual questions -> Direct DB lookup (100% accurate, instant)
    const factualAnswer = await this.answerFactualQuestion(storeId, prompt);
    if (factualAnswer) {
      return factualAnswer;
    }

    // 3. Determine prompt strategy based on question type
    const isHowTo = this.isHowToQuestion(prompt);
    const isContentGen = this.isContentGenerationQuestion(prompt);
    
    let enrichedPrompt = '';
    
    if (isHowTo) {
      const knowledge = await this.getSystemKnowledge();
      enrichedPrompt = `
أنت "Haa AI"، دليل استخدام نظام "هاء متاجر".

⚠️ قواعد صارمة:
1. رد فقط بالعربية. ممنوع الإنجليزية، ممنوع الصينية، ممنوع أي لغة أخرى.
2. الرد 3 خطوات كحد أقصى. لا تطيل.
3. استخدم المعرفة أدناه. إذا لم تجد الإجابة، قل: "هذه المعلومة غير متوفرة حالياً."
4. ابدأ بالخطوات مباشرة بدون مقدمات.

المعرفة:
${knowledge}

السؤال: ${prompt}
`;
    } else if (isContentGen) {
      enrichedPrompt = `
أنت خبير تسويق سعودي متخصص في التجارة الإلكترونية.
⚠️ قواعد صارمة:
1. رد فقط باللغة العربية الفصحى السليمة. ممنوع:
   - الأخطاء الإملائية (مثل: "بلاطوثر" ← الصحيح "بلوتوث")
   - الكلمات الدخيلة (مثل: "أوردر" ← الصحيح "طلب")
   - الترجمة الحرفية
2. اكتب نصاً قصيراً ومؤثراً (جملتان كحد أقصى).
3. لغة عربية فصحى سليمة وجذابة للعميل السعودي.
4. استخدم مصطلحات تجارية صحيحة: "توصيل" وليس "دليفري"، "خصم" وليس "ديسكونت".

الطلب: ${prompt}
`;
    } else {
      enrichedPrompt = `
أنت "Haa AI"، مساعد صاحب متجر سعودي.
⚠️ قواعد صارمة:
1. رد فقط باللغة العربية الفصحى السليمة. ممنوع:
   - الأخطاء الإملائية
   - الكلمات الدخيلة
   - الترجمة الحرفية
2. رد بـ 3 جمل كحد أقصى، ودود ومباشر.
3. إذا لم تكن تعرف، قل: "عذراً، لا أملك هذه المعلومة حالياً."
4. لا مقدمات طويلة. ابدأ بالإجابة مباشرة.

السؤال: ${prompt}
`;
    }

    return this.provider.generate({
      prompt: enrichedPrompt,
      action: 'chat',
      context: { storeId },
      history: history,
    });
  }

  async executeAction(storeId: number, action: string, params: Record<string, unknown>): Promise<AiAgentResponse> {
    try {
      switch (action) {
        case 'create_coupon':
          const coupon = await this.couponsService.create(storeId, {
            code: params.code as string,
            name: params.name as string || 'AI Generated Coupon',
            description: params.description as string || 'Created by AI Agent',
            type: (params.type as 'fixed' | 'percentage' | 'free_shipping') || 'percentage',
            value: params.value as number,
          });
          return { text: `تم إنشاء الكوبون ${coupon.code} بنجاح!`, confidence: 1 };

        case 'update_product_price': {
          await this.productsService.update(storeId, params.productId as number, {
            price: params.price as number,
          });
          return { text: `تم تحديث سعر المنتج بنجاح إلى ${params.price} ر.س`, confidence: 1 };
        }
        default:
          return { text: `عذرًا، هذه العملية (${action}) غير مدعومة حاليًا.`, confidence: 0 };
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { text: `حدث خطأ أثناء تنفيذ العملية: ${msg}`, confidence: 0 };
    }
  }
}
