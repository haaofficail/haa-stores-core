export interface PolicyGeneratorInput {
  storeName: string;
  legalName?: string;
  commercialRegistrationNumber?: string;
  vatNumber?: string;
  supportEmail?: string;
  supportPhone?: string;
  businessAddress?: string;
  paymentMethods?: string[];
  shippingMethods?: string[];
  shippingFee?: number;
  freeShippingThreshold?: number;
  deliveryMinDays?: number;
  deliveryMaxDays?: number;
  returnWindowDays?: number | null;
  refundProcessingDays?: number;
  excludedReturnCategories?: string[];
  carriers?: string[];
  privacyContactEmail?: string;
  delayCancellationNotice?: string | null;
}

export interface GeneratedPolicy {
  type: string;
  title: string;
  content: string;
  warnings: string[];
}

export interface PolicyGenerationResult {
  policies: GeneratedPolicy[];
  globalWarnings: string[];
  errors: string[];
}

function warn(msg: string): string {
  return msg;
}

export class SaudiPolicyGenerator {
  generate(input: PolicyGeneratorInput): PolicyGenerationResult {
    const globalWarnings: string[] = [];
    const errors: string[] = [];

    if (!input.commercialRegistrationNumber) {
      globalWarnings.push(warn('رقم السجل التجاري غير مُدخل — يُنصح بإضافته في السياسات.'));
    }
    if (!input.vatNumber) {
      globalWarnings.push(warn('الرقم الضريبي غير مُدخل — يُنصح بإضافته إذا كان التاجر خاضعًا للضريبة.'));
    }
    if (!input.supportEmail) {
      globalWarnings.push(warn('بريد الدعم الفني غير مُدخل — يُنصح بإضافته.'));
    }
    if (!input.legalName) {
      globalWarnings.push(warn('الاسم القانوني غير مُدخل — يُنصح بإضافته.'));
    }

    if (input.returnWindowDays !== null && input.returnWindowDays !== undefined && input.returnWindowDays < 7) {
      errors.push('مدة الاسترجاع يجب أن تكون 7 أيام على الأقل وفق نظام التجارة الإلكترونية السعودي.');
    }

    if (input.deliveryMaxDays && input.deliveryMaxDays > 15 && !input.delayCancellationNotice) {
      globalWarnings.push(warn('مدة التسليم تتجاوز 15 يومًا — يُنصح بتحديد سياسة إشعار الإلغاء عند التأخير.'));
    }

    const policies: GeneratedPolicy[] = [
      this.generatePrivacy(input, globalWarnings),
      this.generateTerms(input, globalWarnings),
      this.generateShipping(input, globalWarnings),
      this.generateReturns(input, errors, globalWarnings),
      this.generateAbout(input, globalWarnings),
    ];

    return { policies, globalWarnings, errors };
  }

  private generatePrivacy(input: PolicyGeneratorInput, _warnings: string[]): GeneratedPolicy {
    const policyWarnings: string[] = [];
    const storeName = input.storeName || 'المتجر';
    const contactEmail = input.privacyContactEmail || input.supportEmail || 'support@example.com';

    const content = `سياسة الخصوصية — ${storeName}

آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}

1. نطاق السياسة
تنطبق هذه السياسة على جميع البيانات الشخصية التي تجمعها ${storeName} ("نحن") من خلال المتجر الإلكتروني.

2. البيانات التي نجمعها
نقوم بجمع البيانات التالية:
- بيانات الطلب: الاسم الكامل، البريد الإلكتروني، رقم الجوال، العنوان.
- بيانات الدفع: تُعالج عبر مزود الخدمة المعتمد (لا نخزّن بيانات البطاقة).
- بيانات الاستخدام: سجلات الزيارة وسجلات التصفح لتحسين تجربة التسوق.

3. أغراض الاستخدام
نستخدم البيانات لأغراض: معالجة الطلبات والتوصيل؛ التواصل بشأن الطلب والدعم الفني؛ تحسين الخدمات وتجربة التسوق؛ الامتثال للأنظمة المعمول بها في المملكة العربية السعودية.

4. مشاركة البيانات
قد نشارك البيانات مع مزودي الخدمة اللازمين مثل: بوابات الدفع المعتمدة؛ شركات الشحن والتوصيل؛ مزودي استضافة البيانات. لا نبيع البيانات الشخصية لأطراف ثالثة.

5. الأمان
نستخدم تدابير أمنية وتقنية مناسبة لحماية البيانات الشخصية من الوصول غير المصرح به. مع ذلك، لا يوجد نظام إلكتروني آمن بنسبة 100%.

6. حقوق صاحب البيانات
لديك الحق في: الوصول إلى بياناتك؛ تصحيح أي بيانات غير صحيحة؛ طلب حذف بياناتك. يُرد على الطلبات خلال 30 يومًا.

7. مدة الاحتفاظ
نحتفظ بالبيانات طوال مدة نشاط حسابك في المتجر plus 5 سنوات بعد آخر ت交易 للامتثال القانوني.

8. التواصل
للاستفسارات: ${contactEmail}`;

    if (!input.supportEmail && !input.privacyContactEmail) {
      policyWarnings.push('بريد الدعم غير مُدخل — تم استخدام بريد افتراضي.');
    }

    return { type: 'privacy', title: `سياسة الخصوصية — ${storeName}`, content, warnings: policyWarnings };
  }

  private generateTerms(input: PolicyGeneratorInput, _warnings: string[]): GeneratedPolicy {
    const storeName = input.storeName || 'المتجر';
    const legalName = input.legalName || storeName;

    const content = `شروط استخدام المتجر — ${storeName}

آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}

1. التعريفات
باستخدامك لمتجر ${storeName} ("المتجر")، أنت ("العميل") توافق على الشروط التالية.

2. طبيعة الخدمة
المتجر إلكتروني تديره ${legalName}. المنتجات المعروضة للبيع من قبل المتجر مباشرة.

3. الطلبات والأسعار
جميع الأسعار المُعلنة بالريال السعودي وتشمل الضريبة إذا كان المتجر خاضعًا لها. يحق للمتجر تعديل الأسعار قبل تأكيد الطلب.

4. الدفع
تُقبل طرق الدفع المُعلمة في صفحة الدفع. تتم المعالجة عبر بوابات دفع معتمدة وآمنة.

5. الشحن والتوصيل
تتم أوقات التوصيل وفق ما هو مُعلن في سياسة الشحن. يتحمل العميل تكلفة الشحن ما لم يُنص على خلاف ذلك.

6. الاسترجاع والاسترداد
يحق للعميل إرجاع المنتج خلال المدة المحددة في سياسة الاسترجاع. يجب أن يكون المنتج في حالته الأصلية.

7. المسؤولية
المتجر مسؤول عن المنتجات المُعلنة ومواصفاتها. لا يتحمل المتجر المسؤولية عن أي استخدام غير مقصود للمنتج.

8. القانون الواجب التطبيق
يخضع هذا الاتفاق لقوانين المملكة العربية السعودية.`;

    return { type: 'terms', title: `شروط الاستخدام — ${storeName}`, content, warnings: [] };
  }

  private generateShipping(input: PolicyGeneratorInput, _warnings: string[]): GeneratedPolicy {
    const storeName = input.storeName || 'المتجر';
    const policyWarnings: string[] = [];
    const deliveryMin = input.deliveryMinDays || 1;
    const deliveryMax = input.deliveryMaxDays || 5;
    const shippingFee = input.shippingFee ?? 0;
    const freeThreshold = input.freeShippingThreshold;
    const methods = input.shippingMethods?.join('، ') || 'الشحن العادي';
    const carriers = input.carriers?.join('، ') || 'شركات الشحن المعتمدة';

    const content = `سياسة الشحن والتوصيل — ${storeName}

آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}

1. أوقات التوصيل
الوقت المتوقع للتوصيل: ${deliveryMin} إلى ${deliveryMax} أيام عمل (باستثناء أيام الجمعة والعطلات الرسمية).

2. تكلفة الشحن
${shippingFee > 0 ? `رسوم الشحن: ${shippingFee} ريال سعودي.` : 'شحن مجاني على جميع الطلبات.'}
${freeThreshold ? `شحن مجاني للطلبات التي تتجاوز ${freeThreshold} ريال سعودي.` : ''}

3. طرق الشحن
يتم الشحن عبر: ${methods}.
الشركات المُستخدمة: ${carriers}.

4. التتبع
يتم إرسال رقم التتبع عبر البريد الإلكتروني أو الجوال بعد شحن الطلب.

5. التأخير
في حالة التأخر عن الوقت المتوقع، سيتم إشعارك فورًا. يحق لك إلغاء الطلب إذا تجاوز التأخير المدة المحددة مع إشعار.

6. العنوان
يجب أن يكون عنوان التوصيل دقيقًا وكمالياً. لا يتحمل المتجر مسؤولية التأخير الناتج عن عنوان غير صحيح.`;

    if (deliveryMax > 15) {
      policyWarnings.push('مدة التسليم تتجاوز 15 يومًا — يُنصح بتحديد سياسة إشعار الإلغاء.');
    }

    return { type: 'shipping', title: `سياسة الشحن — ${storeName}`, content, warnings: policyWarnings };
  }

  private generateReturns(input: PolicyGeneratorInput, errors: string[], _warnings: string[]): GeneratedPolicy {
    const storeName = input.storeName || 'المتجر';
    const returnDays = input.returnWindowDays;
    const refundDays = input.refundProcessingDays || 7;
    const excluded = input.excludedReturnCategories?.join('، ') || '';

    if (returnDays === null || returnDays === undefined) {
      return {
        type: 'returns',
        title: `سياسة الاسترجاع — ${storeName}`,
        content: '',
        warnings: ['لا يمكن توليد سياسة استرجاع كاملة — مدة الإرجاع غير محددة.'],
      };
    }

    if (returnDays < 7) {
      errors.push('مدة الاسترجاع يجب أن تكون 7 أيام على الأقل وفق نظام التجارة الإلكترونية السعودي.');
      return {
        type: 'returns',
        title: `سياسة الاسترجاع — ${storeName}`,
        content: '',
        warnings: ['مدة الإرجاع أقل من 7 أيام — غير متوافقة مع النظام.'],
      };
    }

    const content = `سياسة الاسترجاع والاسترداد — ${storeName}

آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}

1. مدة الإرجاع
يحق للعميل إرجاع المنتج خلال ${returnDays} يومًا من تاريخ الاستلام.

2. شروط الإرجاع
- يجب أن يكون المنتج في حالته الأصلية وغير مستخدم.
- يجب إرفاق الفاتورة أو إثبات الشراء.
- يجب أن يكون المنتج في عبوته الأصلية${excluded ? `، ما عدا المنتجات التالية: ${excluded}` : ''}.

3. عملية الإرجاع
- يتواصل الععميل مع خدمة العملاء لطلب الإرجاع.
- يتم مراجعة الطلب خلال 3 أيام عمل.
- في حالة الموافقة: يتم استلام المنتج وإعادة المبلغ خلال ${refundDays} أيام عمل.
- في حالة الرفض: يتم إشعار العميل بالأسباب.

4. الاسترداد
يتم استرداد المبلغ بنفس طريقة الدفع الأصلية.

5. المنتجات المستثناة
${excluded || 'المنتجات القابلة للفساد، المنتجات الشخصية، المنتجات المفتوحة وغير المغلقة.'}

6. التكاليف
يتحمل العميل تكلفة الشحن في حالة الإرجاع除非 كان السبب خطأ في المنتج.`;

    return { type: 'returns', title: `سياسة الاسترجاع — ${storeName}`, content, warnings: [] };
  }

  private generateAbout(input: PolicyGeneratorInput, _warnings: string[]): GeneratedPolicy {
    const storeName = input.storeName || 'المتجر';
    const legalName = input.legalName || storeName;
    const cr = input.commercialRegistrationNumber;
    const address = input.businessAddress || '';

    const content = `عن المتجر — ${storeName}

${legalName}
${cr ? `رقم السجل التجاري: ${cr}` : ''}
${address ? `العنوان: ${address}` : ''}

${storeName} هو متجر إلكتروني متخصص في تقديم المنتجات والخدمات لعملائنا في المملكة العربية السعودية. نسعى لتقديم تجربة تسوق مميزة مع ضمان جودة المنتجات والخدمة.

رسالتنا
تقديم منتجات عالية الجودة بأسعار تنافسية مع خدمة عملاء متميزة.

قيمنا
- الجودة: نختار منتجاتنا بعناية.
- الشفافية: أسعار واضحة ولا تكاليف مخفية.
- رضا العميل: رضاكم هو أولويتنا.
- الامتثال: نلتزم بالأنظمة المعمول بها في المملكة العربية السعودية.

تواصل معنا
${input.supportEmail ? `البريد الإلكتروني: ${input.supportEmail}` : ''}
${input.supportPhone ? `الجوال: ${input.supportPhone}` : ''}`;

    return { type: 'about', title: `عن المتجر — ${storeName}`, content, warnings: [] };
  }
}
