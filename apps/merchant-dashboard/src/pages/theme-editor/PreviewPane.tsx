import { useEffect, useRef, useState } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

type DeviceView = 'desktop' | 'tablet' | 'mobile';

interface Props {
  storeSlug: string;
  storefrontUrl: string;
  loading: boolean;
  editorCollapsed: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onIframeLoad: () => void;
  deviceView: DeviceView;
  setDeviceView: (v: DeviceView) => void;
}

/**
 * PreviewPane — responsive iframe stage extracted verbatim from ThemeEditor.tsx.
 * Behavior + layout are unchanged.
 */
export function PreviewPane({
  storeSlug, storefrontUrl, loading, editorCollapsed,
  iframeRef, onIframeLoad, deviceView, setDeviceView,
}: Props) {
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const [previewPaneSize, setPreviewPaneSize] = useState({ width: 0, height: 0 });
  const [desktopZoom, setDesktopZoom] = useState<'fit' | 'actual'>('fit');

  useEffect(() => {
    if (loading) return;
    const pane = previewPaneRef.current;
    if (!pane) return;
    const updateSize = () => setPreviewPaneSize({ width: pane.clientWidth, height: pane.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [loading, editorCollapsed]);

  const deviceViewport = {
    desktop: { width: 1280, minHeight: 720 },
    tablet: { width: 768, minHeight: 900 },
    mobile: { width: 375, minHeight: 812 },
  }[deviceView];
  const stageWidth = Math.max(0, previewPaneSize.width - 32);
  const stageHeight = Math.max(0, previewPaneSize.height - 32);
  const isPreviewMeasured = stageWidth > 0 && stageHeight > 0;
  const fitScale = stageWidth > 0 && stageHeight > 0
    ? Math.min(1, stageWidth / deviceViewport.width, stageHeight / deviceViewport.minHeight)
    : 0;
  const previewScale = deviceView === 'desktop' && desktopZoom === 'actual' ? 1 : fitScale;
  const frameWidth = deviceViewport.width * previewScale;
  const frameHeight = Math.max(deviceViewport.minHeight * previewScale, stageHeight);
  const iframeHeight = previewScale > 0 ? Math.max(deviceViewport.minHeight, frameHeight / previewScale) : deviceViewport.minHeight;

  return (
    <div className="flex-1 min-w-0 min-h-0 bg-neutral-100 flex flex-col">
      <div className="h-12 flex items-center justify-center gap-1 bg-white border-b border-neutral-200 shrink-0 px-2">
        <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
          {[
            { id: 'desktop', icon: Monitor, label: 'سطح المكتب' },
            { id: 'tablet', icon: Tablet, label: 'الجهاز اللوحي' },
            { id: 'mobile', icon: Smartphone, label: 'الجوال' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDeviceView(id as DeviceView)}
              className={`min-h-11 min-w-11 p-2 rounded-md transition-all ${deviceView === id ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
              aria-label={`عرض المعاينة على ${label}`}
              aria-pressed={deviceView === id}
              title={`عرض المعاينة على ${label}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        {deviceView === 'desktop' && (
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5 ms-2">
            <button
              type="button"
              onClick={() => setDesktopZoom('fit')}
              className={`min-h-11 px-3 py-1 rounded-md text-xs font-medium transition-all ${desktopZoom === 'fit' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              aria-label="ملاءمة معاينة سطح المكتب"
              aria-pressed={desktopZoom === 'fit'}
              title="ملاءمة معاينة سطح المكتب"
            >
              ملاءمة
            </button>
            <button
              type="button"
              onClick={() => setDesktopZoom('actual')}
              className={`min-h-11 px-3 py-1 rounded-md text-xs font-medium transition-all ${desktopZoom === 'actual' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              aria-label="عرض معاينة سطح المكتب بنسبة 100%"
              aria-pressed={desktopZoom === 'actual'}
              title="عرض معاينة سطح المكتب بنسبة 100%"
            >
              100%
            </button>
          </div>
        )}
      </div>
      <div
        ref={previewPaneRef}
        className={`flex-1 min-h-0 p-4 ${deviceView === 'desktop' && desktopZoom === 'actual' ? 'overflow-auto' : 'overflow-hidden'}`}
        dir={deviceView === 'desktop' ? 'ltr' : 'rtl'}
      >
        {storeSlug && isPreviewMeasured ? (
          deviceView === 'desktop' ? (
            <div
              className="mx-auto overflow-hidden shrink-0"
              style={{ width: frameWidth, height: frameHeight }}
              dir="ltr"
            >
              <div
                className="origin-top-left shadow-xl border border-neutral-200 bg-white"
                style={{ width: deviceViewport.width, height: iframeHeight, transform: `scale(${previewScale})` }}
              >
                <iframe
                  ref={iframeRef}
                  src={`${storefrontUrl}/s/${storeSlug}?preview=1`}
                  className="w-full border-0 bg-white"
                  style={{ height: iframeHeight }}
                  title="معاينة حية"
                  onLoad={onIframeLoad}
                />
              </div>
            </div>
          ) : (
            <div
              className="mx-auto shadow-2xl rounded-3xl overflow-hidden border-8 border-neutral-800 shrink-0"
              style={{ width: frameWidth, height: frameHeight }}
              dir="ltr"
            >
              <div className="origin-top-left bg-white" style={{ width: deviceViewport.width, height: iframeHeight, transform: `scale(${previewScale})` }}>
                <iframe
                  ref={iframeRef}
                  src={`${storefrontUrl}/s/${storeSlug}?preview=1`}
                  className="w-full border-0 bg-white"
                  style={{ height: iframeHeight }}
                  title="معاينة حية"
                  onLoad={onIframeLoad}
                />
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
            جاري تحميل المعاينة...
          </div>
        )}
      </div>
    </div>
  );
}
