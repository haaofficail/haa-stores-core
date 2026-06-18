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
  isPersistent: boolean;
}

function generateCorrelationId(): string {
  return 'req_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Detect whether this is a transient HMR/dev-server error vs. a persistent
 * production bug. If the same fingerprint has been caught 3+ times in the
 * last 60 seconds, we mark the error as persistent and show a more
 * actionable message ("contact support"). Otherwise we treat it as
 * transient and ask the user to reload (typical Vite HMR issue).
 */
function detectPersistent(errorMessage: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = `errorboundary:transient:${errorMessage.slice(0, 60)}`;
    const now = Date.now();
    const stored = window.sessionStorage.getItem(key);
    const recent = stored ? JSON.parse(stored) : [];
    recent.push(now);
    const cutoff = now - 60_000;
    const recentOnly = recent.filter((t: number) => t > cutoff);
    window.sessionStorage.setItem(key, JSON.stringify(recentOnly));
    return recentOnly.length >= 3;
  } catch {
    return false;
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, correlationId: '', isPersistent: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      correlationId: generateCorrelationId(),
      isPersistent: detectPersistent(error.message),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const correlationId = this.state.correlationId || generateCorrelationId();
    const errorCode = this.props.errorCode || 'DASH-001';

    console.error(`[ErrorBoundary] ${errorCode} | ${correlationId}`, error, info.componentStack);

    const BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

    // Extract the top frame of the stack (filename:line) for debugging
    const firstFrame = (info.componentStack || '').split('\n')[1]?.trim() ?? null;

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
        isPersistent: this.state.isPersistent,
        componentFrame: firstFrame,
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
      const isPersistent = this.state.isPersistent;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-50" dir="rtl">
          <div className="bg-white rounded-3xl shadow-card p-8 max-w-sm text-center space-y-3">
            <svg className="h-12 w-12 mx-auto text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h2 className="text-lg font-bold text-neutral-900">
              {isPersistent
                ? 'نواجه مشكلة في تحميل لوحة التحكم'
                : 'تعذر تحميل هذا الجزء من لوحة التحكم'}
            </h2>
            <p className="text-sm text-neutral-500">
              {isPersistent
                ? 'يبدو أن المشكلة متكررة. يرجى إعادة تحميل الصفحة، وإذا استمرت تواصل مع الدعم.'
                : 'يرجى إعادة تحميل الصفحة. إذا استمرت المشكلة، قد يكون هناك خطأ مؤقت في الخادم.'}
            </p>
            <p className="text-xs text-neutral-400">
              رمز الخطأ: {errorCode}
              <br />
              رقم التتبع: {correlationId}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                تحديث الصفحة
              </button>
              <a
                href="/dashboard"
                className="px-4 py-2 text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
              >
                العودة للرئيسية
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
