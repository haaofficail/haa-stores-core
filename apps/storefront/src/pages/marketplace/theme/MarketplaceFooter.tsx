import { Link } from 'react-router-dom';
import { useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import { Mail, Phone } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { usePlatformBrand } from '@/hooks/usePlatformBrand';
import { PaymentLogoImg, getPaymentLogosByCategory } from '@/components/ui/trust-badges';

const footerLinks = [
  { title: 'روابط مهمة', links: [
    { label: 'من نحن', to: '#' },
    { label: 'تواصل معنا', to: '#' },
    { label: 'سياسة الخصوصية', to: '#' },
    { label: 'الشروط والأحكام', to: '#' },
  ]},
  { title: 'خدمة العملاء', links: [
    { label: 'الاستبدال والاسترجاع', to: '#' },
    { label: 'الشحن والتوصيل', to: '#' },
    { label: 'تتبع الطلب', to: '/marketplace/orders' },
    { label: 'الأسئلة الشائعة', to: '#' },
  ]},
];

export function MarketplaceFooter() {
  const [logoError, setLogoError] = useState(false);
  const { platformLogoUrl } = usePlatformBrand();
  const showLogo = !!platformLogoUrl && !logoError;

  return (
    <footer className="mt-auto border-t border-gray-100 bg-white">
      {/* Payment Logos */}
      <div className="border-b border-gray-100">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap">
            {getPaymentLogosByCategory('LOCAL_PAYMENT_METHOD').map(logo => (
              <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />
            ))}
            {getPaymentLogosByCategory('CARD_NETWORK').map(logo => (
              <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />
            ))}
            {getPaymentLogosByCategory('DIGITAL_WALLET').map(logo => (
              <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />
            ))}
            {getPaymentLogosByCategory('BNPL_PROVIDER').map(logo => (
              <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          {/* Brand */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center gap-2.5">
              {showLogo ? (
                <img key={platformLogoUrl} src={platformLogoUrl!} alt="سوق هاء" className="platform-logo h-8 w-auto" onError={() => setLogoError(true)} />
              ) : (
                <div className="flex items-center gap-2">
                  <img src="/assets/haa-logo.png" alt="سوق هاء" className="h-5 w-auto" />
                  <span className="text-base font-bold text-black">سوق هاء</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              سوق عام تسويقي يجمع المنتجات المختارة من متاجر هاء ستورز في مكان واحد.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <h4 className="text-sm font-bold text-black mb-2">{group.title}</h4>
              <ul className="space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-gray-500 hover:text-primary-500 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-sm font-bold text-black">تواصل معنا</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-500">
                <Icon icon={Mail} size="xs" className="text-gray-400" />
                info@haastores.com
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-500">
                <Icon icon={Phone} size="xs" className="text-gray-400" />
                +966 800 000 0000
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-2">
          <p className="text-xs text-gray-400 text-center">
            &copy; {new Date().getFullYear()} سوق هاء. جميع الحقوق محفوظة.
            {' '}· سوق هاء منصة وسيطة · البائع في كل طلبية هو المتجر صاحب المنتج.
            <span className="mx-1.5">&middot;</span>
            <span>مدعوم بواسطة <a href="https://haastores.com" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600 transition-colors">هاء ستورز</a></span>
          </p>
        </div>
      </div>
    </footer>
  );
}
