import { useState } from 'react';
import { adminApi } from '../lib/api';
import { useTranslation } from 'react-i18next';

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
      setError(err.message || t('login.failed', 'فشل تسجيل الدخول'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{t('login.title', 'لوحة الإدارة')}</h1>
        {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t('login.email', 'البريد الإلكتروني')}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">{t('login.password', 'كلمة المرور')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? t('login.loggingIn', 'جاري الدخول...') : t('login.loginButton', 'دخول')}
        </button>
      </form>
    </div>
  );
}
