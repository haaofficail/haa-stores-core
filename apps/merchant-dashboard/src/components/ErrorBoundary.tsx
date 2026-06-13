import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  errorCode?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  correlationId: string;
}

function generateCorrelationId(): string {
  return 'req_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, correlationId: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, correlationId: generateCorrelationId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const correlationId = this.state.correlationId || generateCorrelationId();
    const errorCode = this.props.errorCode || 'DASH-001';

    console.error(`[ErrorBoundary] ${errorCode} | ${correlationId}`, error, info.componentStack);

    const BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

    fetch(`${BASE_URL}/internal/support-errors/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorCode,
        message: error.message,
        correlationId,
        route: window.location.pathname,
        app: 'merchant-dashboard',
        origin: 'dashboard',
        handled: true,
        tags: ['error-boundary', 'react-runtime'],
      }),
    }).catch(() => {
      // Silently fail — do not cause additional errors
    });
  }

  render() {
    if (this.state.hasError) {
      const errorCode = this.props.errorCode || 'DASH-001';
      const correlationId = this.state.correlationId;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-50" dir="rtl">
          <div className="bg-white rounded-3xl shadow-card p-8 max-w-sm text-center space-y-3">
            <svg className="h-12 w-12 mx-auto text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h2 className="text-lg font-bold text-neutral-900">تعذر تحميل هذا الجزء من لوحة التحكم</h2>
            <p className="text-sm text-neutral-500">
              رمز الخطأ: {errorCode}<br />
              رقم التتبع: {correlationId}
            </p>
            <p className="text-xs text-neutral-400">
              إذا استمرت المشكلة، أرسل رقم التتبع للدعم الفني.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
