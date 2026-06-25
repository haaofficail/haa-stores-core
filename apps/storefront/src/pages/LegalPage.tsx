import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- pre-existing lucide usages; PR #181 only adds legal-entity import. Lucide→<Icon> migration tracked separately.
import { ArrowRight, FileText, Calendar, Clock } from 'lucide-react';
import { PLATFORM_LEGAL_ENTITY } from '@haa/shared';

interface LegalDocumentSection {
  // Stable anchor id for deep-linking from TOC / external references.
  // Optional for backward compatibility with other documents on this page.
  id?: string;
  title: string;
  content: string;
}

interface LegalDocument {
  id: string;
  slug: string;
  title: string;
  description?: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalDocumentSection[];
}

const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  terms: {
    id: 'platform_terms', slug: 'terms',
    title: 'شروط استخدام المنصة للتجار',
    version: '1.0.0', effectiveDate: '2025-01-01', lastUpdated: '2025-01-15',
    sections: [
      { title: '1. التعريفات', content: 'باستخدامك لمنصة "ها متاجر" ("المنصة")، أنت ("التاجر") توافق على الشروط التالية. "المنصة" هي خدمة تقنية توفر أدوات لإدارة المتاجر الإلكترونية. "التاجر" هو الشخص الطبيعي أو الاعتباري الذي يسجل في المنصة لإدارة متجر إلكتروني.' },
      { title: '2. طبيعة الخدمة', content: 'المنصة توفر أدوات تقنية لإدارة المتاجر الإلكترونية ولا تُعد بائعًا للمنتجات المعروضة من التجار. المنصة ليست طرفًا في أي صفقة بيع بين التاجر والعميل إلا إذا نصت صراحة على ذلك.' },
      { title: '3. مسؤوليات التاجر', content: 'التاجر مسؤول عن: صحته التجارية والقانونية؛ الامتثال للأنظمة السعودية حسب نشاطه؛ المنتجات المعروضة وأسعارها ووصفها؛ الشحن والتوصيل والاسترجاع؛ الفواتير والضرائب والرسوم الجمركية إن وجدت؛ الحصول على التراخيص اللازمة لبيع منتجاته.' },
      { title: '4. مسؤوليات المنصة', content: 'المنصة مسؤولة عن: توفير الخدمة التقنية بشكل مستقر؛ حماية بيانات التاجر وفق سياسة الخصوصية؛ دعم التاجر فنيًا حسب باقة الاشتراك.' },
      { title: '5. التعليق والتقييد', content: 'تحتفظ المنصة بحق تعليق أو تقييد أو إيقاف المتجر عند: المخالفة الفعلية أو المشتبه بها لأنظمة المملكة العربية السعودية؛ الإبلاغ الموثق عن منتجات مخالفة أو مزيفة؛ عدم سداد الرسوم المستحقة؛ أي أفعال تُلحق ضررًا بالمنصة أو المستخدمين.' },
      { title: '6. الإشعارات والتنبيهات', content: 'تُرسل جميع الإشعارات الرسمية عبر البريد الإلكتروني المسجل في المنصة أو من خلال لوحة التحكم. يتحمل التاجر مسؤولية مراجعة الإشعارات بانتظام.' },
      { title: '7. تعديل الشروط', content: 'تحتفظ المنصة بحق تعديل هذه الشروط في أي وقت مع إشعار مسبق لا يقل عن 30 يومًا. استمرار استخدامك للمنصة بعد دخول التعديلات حيز التنفيذ يُعد قبولًا لها.' },
      { title: '8. القانون الواجب التطبيق', content: 'يخضع هذا الاتفاق لقوانين المملكة العربية السعودية. أي نزاع يُحل وديًا أولًا، ثم عبر الجهات المختصة في المملكة.' },
    ],
  },
  // Canonical platform privacy policy.
  // Source-of-truth grounded:
  //   - PII inventory   ← packages/db/src/schema/{users,customers,orders,audit}.ts
  //   - Right-to-withdraw ← migration 0086_customers_email_opt_out.sql (PDPL Art. 18)
  //   - Legal entity     ← packages/shared/src/legal/platform-entity.ts
  //   - Contact email    ← packages/commerce-core/src/contact-channels.ts
  //   - Sub-processors   ← packages/payment-providers/* + packages/shipping-core/oto*
  // Effective + lastUpdated reflect the publication date of this canonical revision.
  privacy: {
    id: 'platform_privacy',
    slug: 'privacy',
    title: 'سياسة الخصوصية',
    description:
      'كيف نجمع بياناتك الشخصية ونستخدمها ونحميها على منصة "ها متاجر"، وحقوقك بموجب نظام حماية البيانات الشخصية السعودي (PDPL) والائحة العامة الأوروبية لحماية البيانات (GDPR).',
    version: '2.0.0',
    effectiveDate: '2026-06-25',
    lastUpdated: '2026-06-25',
    sections: [
      {
        id: 'intro',
        title: '1. مقدمة',
        content:
          'تُوضّح هذه السياسة كيفية معالجة منصة "ها متاجر" ("المنصة"، "نحن") للبيانات الشخصية الخاصة بزوّار الموقع والعملاء النهائيين الذين يستخدمون متاجر التجار المُستضافة على المنصة، والتجار الذين يديرون متاجرهم من خلالها. تنطبق هذه السياسة بدءًا من تاريخ النفاذ المُبيَّن أعلاه (2026-06-25)، وتسري على جميع الخدمات المُقدَّمة عبر النطاقات المملوكة للمنصة وعلى متاجر التجار المُستضافة عليها. تكمّل هذه السياسة — ولا تُلغي — سياسات الخصوصية الخاصة بكل تاجر فيما يخص بيانات عملائه. تخضع المعالجة لأحكام نظام حماية البيانات الشخصية الصادر بالمرسوم الملكي رقم م/19 (PDPL) ولوائحه التنفيذية، ولأحكام اللائحة العامة الأوروبية لحماية البيانات (GDPR) حيث ينطبق نطاقها الإقليمي.',
      },
      {
        id: 'legal-entity',
        title: '2. الكيان القانوني والمسؤول عن البيانات',
        content:
          'تُشغَّل المنصة بواسطة مؤسسة حرف الهاء التجارية، وهي مؤسسة مُسجَّلة في المملكة العربية السعودية بموجب السجل التجاري رقم 7038798612، صادر بتاريخ 2024-04-08. وتكون المؤسسة هي "المُتحكم في البيانات" (Data Controller) فيما يخص البيانات التي تجمعها المنصة لأغراضها الخاصة، و"المُعالج" (Data Processor) فيما يخص بيانات عملاء التجار التي تُعالَج نيابةً عنهم — وفق ما تُفصِّله اتفاقية معالجة البيانات (Data Processing Agreement) المنفصلة.',
      },
      {
        id: 'data-collected',
        title: '3. البيانات التي نجمعها',
        content:
          'نُقصر جمع البيانات على ما يلزم فعلاً لتشغيل الخدمة:\n• عند إنشاء حسابك على المنصة (تاجر): الاسم الكامل، البريد الإلكتروني، رقم الجوال (اختياري)، وكلمة المرور المُخزَّنة دائماً على شكل بصمة مُجزَّأة وغير قابلة للعكس (hash) — لا نُخزِّن كلمة المرور النصية أبداً.\n• عند إنشاء طلب لدى أحد متاجر المنصة (عميل نهائي): اسمك ورقم جوالك، وعنوان البريد الإلكتروني (اختياري)، وعنوان الشحن (الشارع، الحي، المدينة، الرمز البريدي، الدولة)، وعنوان الفوترة، ورقم الطلب وعناصره، وقيمته الإجمالية، وطريقة الدفع المختارة. لا نُخزِّن في أي وقت أرقام بطاقاتك الكاملة ولا رمز التحقق (CVV) ولا تاريخ الانتهاء — تذهب هذه البيانات مباشرةً إلى بوابة الدفع المختارة وفق معايير PCI-DSS.\n• بيانات الجلسة الفنية: عنوان IP الخاص بالطلب لأغراض الأمان والكشف عن الاحتيال، ومعرّف المتصفح (User-Agent)، ووقت الزيارة. تُخزَّن هذه البيانات في سجلات التدقيق وتُحتفظ بحدّ ما يلزم للأغراض الأمنية.\n• تحليلات الاستخدام الاختيارية: قد يُفعِّل التاجر إعدادات تحليلات أداء متجره (زيارات الصفحات، الإحالات، سلوك السلّة) في إعدادات متجره؛ ولا تُجمع هذه البيانات إلا إذا فعَّل التاجر ذلك صراحةً.\n• بيانات الموافقة على التسويق: نُسجِّل حالة موافقتك على استقبال رسائل التسويق عبر البريد والواتساب وتاريخ هذه الموافقة وتاريخ سحبها إن سحبتها، وذلك تنفيذاً للمادة 18 من نظام PDPL.',
      },
      {
        id: 'purposes',
        title: '4. لماذا نجمع هذه البيانات (أساس المعالجة)',
        content:
          'نُعالج بياناتك للأغراض التالية فحسب، ولكل غرض أساس قانوني واضح:\n• تنفيذ الطلب وتوصيله: تنفيذ العقد بينك وبين التاجر.\n• إصدار الفواتير الضريبية وحفظها وفق متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA): التزام قانوني.\n• الامتثال لنظام حماية البيانات الشخصية ولأنظمة التجارة الإلكترونية: التزام قانوني.\n• إثبات ملكية الحساب ومنع الاحتيال (سجلات تسجيل الدخول، تحقق البريد عبر OTP، عنوان IP): المصلحة المشروعة وحماية الأمن.\n• التواصل التشغيلي بشأن طلبك وحسابك (تأكيد الطلب، إشعارات الشحن، تنبيهات الأمان): تنفيذ العقد.\n• التسويق عبر البريد أو الواتساب: فقط بعد موافقتك الصريحة، ولك حق سحبها في أي وقت.\n• تحسين الخدمة عبر مقاييس مُجمَّعة لا تُعرِّفك شخصياً: المصلحة المشروعة.',
      },
      {
        id: 'sharing',
        title: '5. مع من نشارك البيانات',
        content:
          'لا نبيع بياناتك الشخصية لأي طرف ثالث، ولا نُؤجِّرها، ولا نستخدمها لأغراض إعلانية خارج المنصة. نشاركها فقط في الحدود التالية ومع الجهات التالية:\n• مزوّدو بوابات الدفع: Geidea وMoyasar للمدفوعات الإلكترونية، وTabby وTamara لخدمات التقسيط — تنتقل بيانات الدفع مباشرةً إلى البوابة المعنية وفق معايير PCI-DSS.\n• شركات الشحن والتوصيل: شركة OTO ومن تتعاقد معه من ناقلين محليين، لتوصيل اسم العميل وعنوانه ورقم جواله لأجل التسليم فحسب.\n• مزوّد البريد الإلكتروني التشغيلي: لإرسال رسائل تأكيد الطلب وتنبيهات الأمان من بريد المنصة الرسمي.\n• مزوّد الاستضافة السحابية: لتشغيل خوادم التطبيق وقواعد البيانات (راجع قسم التحويلات الدولية أدناه).\n• الجهات الحكومية المختصة: عند صدور أمر قضائي أو طلب رسمي ملزم بموجب أنظمة المملكة العربية السعودية فحسب.\nلا تُشارَك بياناتك لأي غرض آخر دون موافقتك الصريحة.',
      },
      {
        id: 'retention',
        title: '6. مدة الاحتفاظ بالبيانات',
        content:
          'نلتزم بمدد الاحتفاظ التالية:\n• الطلبات والفواتير الضريبية: عشر (10) سنوات من تاريخ إصدار الفاتورة، التزاماً بمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA) وأنظمة الاحتفاظ بالسجلات التجارية.\n• سجلات التدقيق (Audit Logs) للعمليات الحساسة: عشر (10) سنوات لأغراض الامتثال وكشف الاحتيال.\n• بيانات الحسابات المُلغاة: 90 يوماً من تاريخ طلب الإلغاء كفترة استرداد، ثم تُؤرشَف بيانات الحساب ويُحتفَظ منها فقط بما تستلزمه الأنظمة المالية والضريبية، ويُحذف الباقي.\n• حالات سحب الموافقة (Opt-out): نحتفظ بسِجِلّ سحب الموافقة نفسه (التاريخ والمصدر) إلى أجل غير مُسمَّى لإثبات احترامنا لحقك، لا لأي غرض تسويقي.\n• البيانات التحليلية المُجمَّعة وغير المُعرِّفة شخصياً: قد تُحتفَظ بشكل مُجمَّع دون ربطها بشخصك.',
      },
      {
        id: 'pdpl-rights',
        title: '7. حقوقك بموجب نظام حماية البيانات الشخصية (PDPL)',
        content:
          'يمنحك نظام حماية البيانات الشخصية السعودي مجموعة من الحقوق، نتعهَّد بتمكينك من ممارستها مجاناً وبشكل ميسَّر، والاستجابة لطلبك خلال ثلاثين (30) يوماً كحدٍّ أقصى:\n• حق العلم وأخذ المعلومة (المادة 4): معرفة الأساس القانوني والغرض من معالجة بياناتك.\n• حق الوصول إلى بياناتك (المادة 4): الحصول على نسخة من بياناتك الشخصية المُعالَجة.\n• حق طلب تصحيح البيانات (المادة 5): إصلاح أي معلومة غير دقيقة أو غير مكتملة.\n• حق طلب إتلاف البيانات (المادة 6): محو بياناتك متى زال الغرض من معالجتها، بشرط عدم تعارض ذلك مع التزاماتنا القانونية (مثل حفظ الفواتير).\n• حق نقل البيانات (المادة 7): استلام نسخة من بياناتك بصيغة مُهيكلة قابلة للقراءة آلياً.\n• حق سحب الموافقة (المادة 18): إلغاء الاشتراك من رسائل التسويق في أي وقت عبر رابط "إلغاء الاشتراك" المرفق في أسفل كل رسالة تسويقية، أو بإبلاغنا مباشرةً عبر بريد التواصل الرسمي. سحب الموافقة لا يؤثر على مشروعية المعالجة السابقة.\n• حق تقديم الشكوى: لك الحق في تقديم شكوى للهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) إذا رأيت أن معالجتنا تخالف النظام.',
      },
      {
        id: 'cookies',
        title: '8. ملفات تعريف الارتباط (Cookies)',
        content:
          'نستخدم نوعين من ملفات تعريف الارتباط:\n• ملفات ضرورية لتشغيل الموقع: تحفظ جلسة دخولك، وسلَّة الشراء، وتفضيلات اللغة والاتجاه — لا يمكن تعطيلها لأنها شرط لعمل الخدمة.\n• ملفات اختيارية للتحليلات: تُفعَّل فقط إذا اختار التاجر تشغيل التحليلات في إعدادات متجره، ولك حق رفضها من إعدادات متصفحك.\nلا نستخدم ملفات تعقُّب من شبكات إعلانية خارجية.',
      },
      {
        id: 'security',
        title: '9. أمان البيانات',
        content:
          'نطبّق ضوابط فنية وتنظيمية متعدِّدة الطبقات لحماية بياناتك:\n• تشفير النقل عبر TLS لجميع الاتصالات بين متصفِّحك وخوادمنا.\n• تجزئة كلمات المرور باستخدام خوارزميات تجزئة أحادية الاتجاه (one-way hash)، فلا يستطيع أحدٌ — ولا نحن — استرجاع كلمتك الأصلية.\n• فصل الصلاحيات داخل قاعدة البيانات بحيث لا يصل التاجر إلا إلى بيانات متجره فقط (multi-tenant isolation).\n• سجلات تدقيق كاملة لكل عملية حسّاسة، تُوثِّق منفِّذ العملية ووقتها وعنوان IP.\n• مراجعات أمنية دورية واختبارات اختراق على المسارات الحرجة.\nمع ذلك، لا يوجد نظام آمن بنسبة 100%، ونلتزم بإبلاغك فور اكتشاف أي خرق يطال بياناتك.',
      },
      {
        id: 'international-transfers',
        title: '10. التحويلات الدولية للبيانات',
        content:
          'تُستضاف خوادم المنصة حالياً على بنية تحتية قد تتضمَّن مواقع جغرافية خارج المملكة العربية السعودية. عند نقل بياناتك خارج المملكة، نتخذ الضمانات التالية وفق المادة 29 من نظام حماية البيانات الشخصية: التحقق من تمتُّع البلد المُستقبِل بمستوى حماية ملائم، وتوقيع اتفاقيات تعاقدية ملزمة مع مزوّدي الاستضافة تضمن سرية البيانات وأمنها، وقَصْر النقل على الحدِّ اللازم لتشغيل الخدمة. عند توافر بنية استضافة محلية كاملة، تُنقَل البيانات إليها وفق خطة معلَنة مسبقاً.',
      },
      {
        id: 'breach-notification',
        title: '11. الإشعار في حال خرق البيانات',
        content:
          'في حال اكتشاف خرق أمني يُحتمَل أن يؤثِّر على بياناتك الشخصية، نتعهَّد بما يلي تنفيذاً لمتطلبات نظام حماية البيانات الشخصية:\n• إبلاغك دون تأخير غير مبرَّر، وفي مدة لا تتجاوز اثنتين وسبعين (72) ساعة من اكتشاف الخرق.\n• إبلاغ الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) خلال المدة النظامية.\n• إيضاح طبيعة الخرق ونطاقه، والبيانات المتأثِّرة، والإجراءات المُتَّخذة لاحتوائه، والخطوات الموصى بها لحماية حسابك.',
      },
      {
        id: 'changes',
        title: '12. تحديث السياسة',
        content:
          'قد نُعدِّل هذه السياسة لمواكبة تطوير الخدمة أو لتعديلات تنظيمية جديدة. عند إجراء تغيير جوهري، نُخطرك مسبقاً بمدة لا تقل عن ثلاثين (30) يوماً عبر البريد الإلكتروني المُسجَّل في حسابك أو إشعار بارز داخل المنصة. التغييرات غير الجوهرية (تصحيح صياغة، تحديث رابط، توضيح فقرة) تنشَر مباشرةً مع رفع تاريخ "آخر تحديث" في أعلى هذه الصفحة. استمرارك في استخدام الخدمة بعد دخول التعديل حيز النفاذ يُعد قبولاً منك للنسخة المُعدَّلة.',
      },
      {
        id: 'contact',
        title: '13. التواصل بشأن بياناتك',
        content:
          'لممارسة أيٍّ من حقوقك أعلاه، أو للاستفسار عن هذه السياسة، أو للإبلاغ عن مخاوف تتعلَّق بالخصوصية، يُمكنك مراسلتنا على البريد الرسمي:\nhello@haastores.com\nالمُرسَل إليه: مؤسسة حرف الهاء التجارية — مسؤول حماية البيانات.\nالسجل التجاري: 7038798612.\nنردُّ على جميع الطلبات المُتعلِّقة بحقوق أصحاب البيانات خلال 30 يوماً من استلامها كحدٍّ أقصى. وفي حال لم تتلقَّ رداً مُرضياً، يحقُّ لك التواصل مع الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) لتقديم شكواك.',
      },
    ],
  },
  'data-processing': {
    id: 'platform_dpa', slug: 'data-processing',
    title: 'اتفاقية معالجة البيانات',
    version: '1.0.0', effectiveDate: '2025-01-01', lastUpdated: '2025-01-15',
    sections: [
      { title: '1. التعريفات', content: '"المنصة" هي مقدم الخدمة ومعالج البيانات. "التاجر" هو مسؤول عن مشروعية جمع بيانات عملائه. "بيانات العملاء" هي البيانات الشخصية التي يجمعها التاجر من عملائه عبر المتجر.' },
      { title: '2. دور المنصة', content: 'تتصرف المنصة كمعالج بيانات عند معالجة بيانات العملاء نيابة عن التاجر لأغراض: معالجة الطلبات والدفع؛ إرسال الإشعارات związанныه بالطلبات؛ توفير الدعم الفني.' },
      { title: '3. دور التاجر', content: 'التاجر هو المسؤول الأول والأخير عن: مشروعية جمع بيانات عملائه؛ الحصول على موافقة العملاء حيث يطلب ذلك النظام؛ الرد على طلبات الوصول والحذف من العملاء.' },
      { title: '4. القيود على الاستخدام', content: 'يُمنع: استخدام بيانات العملاء لأغراض غير متعلقة بالطلبات؛ مشاركة بيانات العملاء مع أطراف ثالثة بدون موافقة؛ نقل البيانات خارج المملكة بدون ضمانات مناسبة؛ استخدام البيانات في أنشطة احتيالية.' },
      { title: '5. الحذف والتصدير', content: 'عند إنهاء العلاقة: تحذف المنصة بيانات العملاء خلال 90 يومًا ما لم يطلب التاجر تصديرها أولًا. يحتفظ التاجر بنسخة من بياناته. لا تحذف سجلات التدقيق المطلوبة قانونيًا.' },
      { title: '6. البلاغات الأمنية', content: 'يُبلَّغ التاجر فورًا عن أي خرق أمني يطال بيانات العملاء خلال 72 ساعة من اكتشافه. تُقدم تفاصيل الخرق وتأثيره وإجراءات المعالجة.' },
      { title: '7. مزودو الخدمة الفرعيون', content: 'المنصة تستخدم مزودي خدمة فرعيين لخدمات محدودة (استضافة، معالجة دفع). يخضع جميع المزودين لاتفاقيات سرية ومنع مشاركة.' },
    ],
  },
  'prohibited-products': {
    id: 'platform_prohibited', slug: 'prohibited-products',
    title: 'سياسة المنتجات المحظورة',
    version: '1.0.0', effectiveDate: '2025-01-01', lastUpdated: '2025-01-15',
    sections: [
      { title: '1. المنتجات المقلدة والمزيفة', content: 'يُحظر بيع: المنتجات المقلدة لعلامات تجارية مسجلة؛ المنتجات المغشوشة؛ النسخ غير المصرح بها؛ أي منتج يوحي بأنه منتج أصلي وهو ليس كذلك.' },
      { title: '2. المنتجات غير المرخصة', content: 'يُحظر بيع: المنتجات التي تتطلب ترخيصًا مسبقًا ولا يملكه التاجر؛ الأدوية أو المنتجات الطبية دون ترخيص من الجهات المختصة؛ الأسلحة والذخائر؛ التبغ والمشروبات الكحولية.' },
      { title: '3. المنتجات الخطرة والمقيدة', content: 'يُحظر بيع: المواد الكيميائية الخطرة؛ المتفجرات والمواد القابلة للاشتعال؛ المنتجات التي تشكل خطورة على السلامة العامة؛ الأجهزة غير المتوافقة مع المعايير السعودية.' },
      { title: '4. المنتجات المخالفة للأنظمة', content: 'يُحظر بيع: أي منتج مخالف لأنظمة التجارة الإلكترونية السعودية؛ المنتجات المضرة بالأخلاق العامة؛ المحتوى الإباحي؛ المنتجات التي تنتهك خصوصية الآخرين.' },
      { title: '5. الإجراءات عند المخالفة', content: 'عند اكتشاف منتج محظور: يتم تعليق المنتج فورًا؛ يُخطر التاجر خلال 24 ساعة؛ يُطلب إزالة المنتج خلال 72 ساعة؛ في حالة الإعادة: يتم تعليق المتجر. تُسجَّل جميع الإجراءات في سجل التدقيق.' },
      { title: '6. الطعن والتظلم', content: 'للتاجر حق تقديم طعن خلال 15 يومًا من تاريخ الإشعار. تتم مراجعة الطعن من فريق مستقل خلال 10 أيام عمل.' },
    ],
  },
  takedown: {
    id: 'platform_takedown', slug: 'takedown',
    title: 'سياسة البلاغات والإزالة',
    version: '1.0.0', effectiveDate: '2025-01-01', lastUpdated: '2025-01-15',
    sections: [
      { title: '1. تقديم البلاغ', content: 'يمكن لأي شخص تقديم بلاغ عبر: البريد الإلكتروني: report@haa.sa؛ نموذج البلاغ في المنصة. يجب أن يتضمن البلاغ: وصف واضح للمخالفة؛ دعم بالصور أو المستندات؛ معلومات المبلّغ (اختياري للمجهول).' },
      { title: '2. المعلومات المطلوبة', content: 'يجب أن يتضمن البلاغ: عنوان المتجر أو رابط المنتج؛ وصف المخالفة بدقة؛ أي أدلة داعمة (صور، لقطات شاشة)؛ معلومات الاتصال للمتابعة (اختياري).' },
      { title: '3. آلية المراجعة', content: 'تتم مراجعة البلاغات خلال 5 أيام عمل. يُخطر المبلّغ بالنتيجة عبر البريد الإلكتروني. تتم المراجعة من فريق متخصص غير طرف في النزاع.' },
      { title: '4. صلاحية الإزالة والتعليق', content: 'تحتفظ المنصة بحق: تعليق منتج مُبلَّغ عنه أثناء المراجعة؛ إزالة منتج عند تأكيد المخالفة؛ تعليق متكرر عند الإعادة. لا تتم الإزالة إلا بعد مراجعة chuyênية.' },
      { title: '5. حق التاجر', content: 'للتاجر حق: الرد على البلاغ خلال 72 ساعة من الإشعار؛ تقديم مستندات داعمة؛ طلب مراجعة إضافية؛ الطعن على القرار خلال 15 يومًا.' },
      { title: '6. التسجيل والتوثيق', content: 'تُسجَّل جميع إجراءات البلاغات والإزالة في سجل التدقيق: تاريخ البلاغ، المحتوى، القرار المتخذ، التاريخ، المبررات. تُحتفظ بالسجلات لمدة 5 سنوات.' },
    ],
  },
};

// Print-friendly styles: keeps page readable when merchants or auditors print
// or save the policy as PDF. Scoped via the `legal-page-root` className so the
// rules only affect this page and don't leak into the rest of the storefront.
const PRINT_STYLES = `
@media print {
  .legal-page-root .no-print { display: none !important; }
  .legal-page-root { background: #fff !important; color: #000 !important; }
  .legal-page-root section { break-inside: avoid; page-break-inside: avoid; }
  .legal-page-root h1, .legal-page-root h2 { color: #000 !important; }
  .legal-page-root a { color: #000 !important; text-decoration: underline; }
}
.legal-page-root section[id] { scroll-margin-top: 96px; }
`;

function LegalPageContent({ doc }: { doc: LegalDocument }) {
  // SEO + share preview. We set these imperatively (no react-helmet on the
  // storefront) so the page is self-contained and doesn't add a new dep.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${doc.title} | ${PLATFORM_LEGAL_ENTITY.legalNameAr}`;

    const ensureMeta = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
        document.head.appendChild(el);
        return { el, created: true };
      }
      return { el, created: false };
    };

    const description = doc.description ?? `${doc.title} — ${PLATFORM_LEGAL_ENTITY.legalNameAr}.`;
    const tags = [
      ensureMeta('meta[name="description"]', { name: 'description', content: description }),
      ensureMeta('meta[property="og:title"]', { property: 'og:title', content: doc.title }),
      ensureMeta('meta[property="og:description"]', { property: 'og:description', content: description }),
      ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' }),
    ];
    tags.forEach((t) => t.el.setAttribute('content', t === tags[0] ? description : t.el.getAttribute('content') ?? ''));
    tags[1].el.setAttribute('content', doc.title);
    tags[2].el.setAttribute('content', description);

    return () => {
      document.title = previousTitle;
      tags.forEach((t) => { if (t.created) t.el.remove(); });
    };
  }, [doc]);

  return (
    <div
      id="storefront-scope"
      data-theme-scope="storefront"
      dir="rtl"
      lang="ar"
      className="legal-page-root container-store py-8 sm:py-12 max-w-4xl mx-auto overflow-x-hidden"
    >
      <style>{PRINT_STYLES}</style>

      <Link
        to="/"
        className="no-print inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-8"
      >
        <ArrowRight className="h-4 w-4" />
        العودة للمتجر
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center no-print">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{doc.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-text-tertiary">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                الإصدار: {doc.version}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                تاريخ النفاذ: {doc.effectiveDate}
              </span>
              <span>آخر تحديث: {doc.lastUpdated}</span>
            </div>
          </div>
        </div>
        {doc.description ? (
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">{doc.description}</p>
        ) : null}
      </header>

      <div className="mb-6 p-4 rounded-2xl bg-surface-2/50 border border-border/60">
        <p className="text-sm font-semibold text-text-primary">{PLATFORM_LEGAL_ENTITY.legalNameAr}</p>
        <p className="text-xs text-text-secondary mt-1" dir="rtl">{PLATFORM_LEGAL_ENTITY.displayLine}</p>
      </div>

      {/* Table of contents — only rendered when every section has a stable id.
          For older documents without ids we keep the previous layout exactly. */}
      {doc.sections.every((s) => !!s.id) ? (
        <nav
          aria-label="جدول المحتويات"
          className="mb-8 p-5 rounded-2xl bg-surface-2/50 border border-border/60"
        >
          <h2 className="text-sm font-bold text-text-primary mb-3">جدول المحتويات</h2>
          <ol className="space-y-1.5 text-sm text-text-secondary list-none ps-0">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="hover:text-primary-600 hover:underline transition-colors"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="space-y-6">
        {doc.sections.map((section, index) => (
          <section
            key={section.id ?? index}
            id={section.id}
            className="bg-surface-2/50 rounded-2xl p-5 sm:p-6"
          >
            <h2 className="text-lg font-bold text-text-primary mb-3">{section.title}</h2>
            {/* Preserve line-breaks in source content (bulleted lists rely on \n). */}
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-border text-center">
        <p className="text-xs text-text-tertiary">
          هذا مستند قانوني يتبع لإصدار {doc.version} بتاريخ {doc.effectiveDate}.
          في حالة أي تعارض مع النص العربي الأصلي، يُعتمد النص العربي.
        </p>
      </div>
    </div>
  );
}

export default function LegalPage() {
  const { legalSlug } = useParams<{ legalSlug: string }>();
  const doc = legalSlug ? LEGAL_DOCUMENTS[legalSlug] : undefined;

  if (!doc) {
    return (
      <div className="container-store py-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">الصفحة غير موجودة</h1>
        <p className="text-text-secondary">الوثيقة القانونية المطلوبة غير متوفرة.</p>
        <Link to="/" className="mt-4 inline-block text-primary-600 hover:underline">العودة للمتجر</Link>
      </div>
    );
  }

  return <LegalPageContent doc={doc} />;
}
