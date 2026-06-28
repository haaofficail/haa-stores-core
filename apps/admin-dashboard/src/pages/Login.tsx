/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useState } from 'react';
import { adminApi } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/ui/icon';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminApi.login(email, password);
      localStorage.setItem('admin_token', result.token);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || t('login.failed', 'البريد الإلكتروني أو كلمة المرور غير صحيحة'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-ios-icon bg-primary-600 flex items-center justify-center mb-4 shadow-md">
            <span className="text-2xl font-bold text-white">ه</span>
          </div>
          <h1 className="text-title2 font-bold text-gray-900 tracking-tight">هاء متاجر</h1>
          <p className="text-footnote text-gray-500 mt-1">لوحة تحكم المنصة</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-card px-8 py-8">
          <h2 className="text-headline font-semibold text-gray-900 mb-6 text-center">تسجيل الدخول</h2>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg mb-5 text-footnote">
              <Icon name="AlertCircle" size="xs" className="text-red-500 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-footnote font-medium text-gray-700 mb-1.5">
                {t('login.email', 'البريد الإلكتروني')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-body text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-footnote font-medium text-gray-700 mb-1.5">
                {t('login.password', 'كلمة المرور')}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-body text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2.5 rounded-lg text-body font-semibold hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('login.loggingIn', 'جاري الدخول...')}
                </span>
              ) : t('login.loginButton', 'دخول')}
            </button>
          </form>
        </div>

        <p className="text-center text-caption1 text-gray-400 mt-6">
          هاء متاجر · منصة التجارة الإلكترونية
        </p>
      </div>
    </div>
  );
}
